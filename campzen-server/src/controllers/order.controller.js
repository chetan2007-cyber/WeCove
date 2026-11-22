const fs = require('fs');
const path = require('path');
const Order = require('../models/order.model');
const OrderEvent = require('../models/orderEvent.model');
const PrintJob = require('../models/printJob.model');
const PrintSubmissionLog = require('../models/printSubmissionLog.model');
const Document = require('../models/document.model');
const Vendor = require('../models/vendor.model');
const RateCard = require('../models/rateCard.model');
const FinishingRate = require('../models/finishingRate.model');
const StationeryItem = require('../models/stationeryItem.model');
const PrintableResource = require('../models/printableResource.model');
const CreatorLedgerEntry = require('../models/creatorLedgerEntry.model');
const User = require('../models/user.model');
const { calculatePrice } = require('../services/pricing.service');
const { calculateExpectedOutput, normalizeSides } = require('../services/printDocumentBuilder.service');
const { calculateDistanceMeters } = require('./vendor.controller');
const { getEffectiveRateCards, getEffectiveFinishingRates } = require('../utils/defaultRateCards.util');
const { resolveDateRange } = require('../utils/dateFilter.util');
const informationSheetService = require('../services/informationSheet.service');
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Helper to settle creator royalty idempotently on order completion
const settleOrderRoyalty = async (order) => {
    if (!order.resourceId || !(order.creatorRoyalty > 0)) return;
    try {
        const resource = await PrintableResource.findById(order.resourceId);
        const printJob = await PrintJob.findOne({ orderId: order._id });

        if (resource && printJob) {
            const copies = printJob.copies || 1;
            const eligiblePages = resource.pageCount || 1;

            let ledger = await CreatorLedgerEntry.findOne({ orderId: order._id, printJobId: printJob._id });
            if (ledger) {
                if (ledger.status === 'PENDING') {
                    ledger.status = 'ELIGIBLE';
                    await ledger.save();

                    // Update resource aggregate counters
                    await PrintableResource.findByIdAndUpdate(resource._id, {
                        $inc: {
                            totalPrintsCount: copies,
                            totalPrintedPages: eligiblePages * copies,
                            totalRoyaltiesEarned: order.creatorRoyalty
                        }
                    });
                }
            } else {
                await CreatorLedgerEntry.create({
                    creatorId: resource.creatorId,
                    resourceId: resource._id,
                    orderId: order._id,
                    printJobId: printJob._id,
                    eligiblePages,
                    copies,
                    ratePerPage: resource.royaltyRatePerPage,
                    grossRoyalty: order.creatorRoyalty,
                    status: 'ELIGIBLE'
                });

                // Update resource aggregate counters
                await PrintableResource.findByIdAndUpdate(resource._id, {
                    $inc: {
                        totalPrintsCount: copies,
                        totalPrintedPages: eligiblePages * copies,
                        totalRoyaltiesEarned: order.creatorRoyalty
                    }
                });
            }
        }
    } catch (err) {
        if (err.code !== 11000) {
            console.error('[Royalty Ledger] Error settling royalty:', err.message);
        }
    }
};

// Helper to reverse creator royalty if order cancelled or rejected
const reverseOrderRoyalty = async (orderId) => {
    try {
        const entry = await CreatorLedgerEntry.findOne({ orderId });
        if (entry && entry.status !== 'REVERSED') {
            const wasEligible = entry.status === 'ELIGIBLE';
            entry.status = 'REVERSED';
            await entry.save();

            if (wasEligible) {
                await PrintableResource.findByIdAndUpdate(entry.resourceId, {
                    $inc: {
                        totalPrintsCount: -entry.copies,
                        totalPrintedPages: -(entry.eligiblePages * entry.copies),
                        totalRoyaltiesEarned: -entry.grossRoyalty
                    }
                });
            }
        }
    } catch (err) {
        console.error('[Royalty Ledger] Error reversing royalty:', err.message);
    }
};

// @desc    Create a new order (Print, Stationery, or Mixed)
// @route   POST /api/orders
// @access  Private (Student)
const createOrder = async (req, res, next) => {
    try {
        const {
            documentId: rawDocumentId,
            resourceId,
            vendorId,
            fulfillmentType,
            deliveryAddressId,
            pickupSlotStart,
            pickupSlotEnd,
            userLat,
            userLng,
            printSettings = {},
            stationeryItems = []
        } = req.body;

        if (!vendorId) {
            return res.status(400).json({ success: false, message: 'Vendor ID is required' });
        }

        let documentId = rawDocumentId;
        let studyResource = null;
        let creatorRoyalty = 0;

        if (resourceId) {
            const PrintableResource = require('../models/printableResource.model');
            studyResource = await PrintableResource.findById(resourceId);
            if (!studyResource || studyResource.moderationStatus !== 'PUBLISHED') {
                return res.status(404).json({
                    success: false,
                    message: 'Study resource not found or not published'
                });
            }

            // Enforce strict college visibility check for printing orders
            if (req.user?.role !== 'admin') {
                const isCreator = req.user && studyResource.creatorId.toString() === req.user.id.toString();
                if (!isCreator) {
                    const visType = studyResource.visibilityType || 'MY_COLLEGE_ONLY';
                    const userCollegeId = req.user?.collegeId?.toString();
                    const resCollegeId = studyResource.collegeId?._id?.toString() || studyResource.collegeId?.toString();

                    if (visType === 'MY_COLLEGE_ONLY') {
                        if (resCollegeId && (!userCollegeId || resCollegeId !== userCollegeId)) {
                            return res.status(404).json({
                                success: false,
                                message: 'Study resource not found or not published'
                            });
                        }
                    } else if (visType === 'SELECTED_COLLEGES') {
                        const isEligible = userCollegeId && Array.isArray(studyResource.visibleCollegeIds) &&
                            studyResource.visibleCollegeIds.some(col => {
                                const cId = col._id ? col._id.toString() : col.toString();
                                return cId === userCollegeId;
                            });
                        if (!isEligible) {
                            return res.status(404).json({
                                success: false,
                                message: 'Study resource not found or not published'
                            });
                        }
                    }
                }
            }

            documentId = studyResource.documentId;
        }

        const hasPrintJob = Boolean(documentId);
        const hasStationery = Array.isArray(stationeryItems) && stationeryItems.length > 0;

        if (!hasPrintJob && !hasStationery) {
            return res.status(400).json({
                success: false,
                message: 'Order must contain either a document to print or stationery items'
            });
        }

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vendor ID. Google discovery places and external businesses are not orderable on CampZen.'
            });
        }

        const vendor = await Vendor.findById(vendorId).populate('ownerId', 'isVerified role');
        const isOwnerVerified = vendor?.ownerId && vendor.ownerId.isVerified === true && (vendor.ownerId.role === 'vendor_owner' || vendor.ownerId.role === 'admin');
        if (!vendor || vendor.status !== 'active' || vendor.isApproved !== true || (vendor.source !== 'KAMI' && vendor.source !== 'CAMPZEN') || !isOwnerVerified) {
            return res.status(404).json({
                success: false,
                message: 'This shop is not an active CampZen partner and cannot accept orders.'
            });
        }

        // Authoritative 1 km radius revalidation
        if (userLat !== undefined && userLng !== undefined) {
            const uLat = parseFloat(userLat);
            const uLng = parseFloat(userLng);
            if (!isNaN(uLat) && !isNaN(uLng)) {
                let vLng, vLat;
                if (vendor.location && Array.isArray(vendor.location.coordinates) && vendor.location.coordinates.length === 2) {
                    [vLng, vLat] = vendor.location.coordinates;
                } else if (vendor.address?.lat && vendor.address?.lng) {
                    vLat = vendor.address.lat;
                    vLng = vendor.address.lng;
                }
                if (vLat !== undefined && vLng !== undefined) {
                    const distanceMeters = calculateDistanceMeters(uLat, uLng, vLat, vLng);
                    if (distanceMeters > 1000) {
                        return res.status(400).json({
                            success: false,
                            message: `Selected shop is ${distanceMeters}m away, which exceeds the authoritative 1 km radius limit.`
                        });
                    }
                }
            }
        }

        // Helper to count distinct pages from range string
        const countPagesFromRange = (rangeStr, totalPages) => {
            if (!rangeStr || rangeStr === 'all') return totalPages;
            const pages = new Set();
            const segments = rangeStr.split(',');
            for (const seg of segments) {
                const trimmed = seg.trim();
                if (trimmed.includes('-')) {
                    const [start, end] = trimmed.split('-').map(Number);
                    for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
                        pages.add(p);
                    }
                } else {
                    const p = Number(trimmed);
                    if (p >= 1 && p <= totalPages) pages.add(p);
                }
            }
            return pages.size || totalPages;
        };

        // 1. Process Print Job if present
        let pricingResult = null;
        let document = null;
        if (hasPrintJob) {
            document = await Document.findById(documentId);
            if (!document || document.isDeleted) {
                return res.status(404).json({ success: false, message: 'Document not found' });
            }

            // If not a marketplace study resource, verify document ownership
            if (!studyResource && document.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Not authorized to print this document' });
            }

            if (document.processingStatus !== 'completed') {
                return res.status(400).json({ success: false, message: 'Document is still processing' });
            }

            const rawCopies = printSettings.copies !== undefined ? Number(printSettings.copies) : 1;
            if (!Number.isInteger(rawCopies) || rawCopies < 1 || rawCopies > 500) {
                return res.status(400).json({ success: false, message: 'Copies must be an integer between 1 and 500' });
            }
            let normalizedSides;
            try {
                normalizedSides = normalizeSides(printSettings.sides || 'single');
            } catch (sideErr) {
                return res.status(400).json({ success: false, message: sideErr.message });
            }

            const requestedColorMode = printSettings.colorMode || 'B&W';
            const requestsColor = requestedColorMode === 'Color'
                || requestedColorMode === 'Mixed'
                || printSettings.colorSelectionType === 'all';
            if (requestsColor && vendor.capabilities?.colorPrinting === false) {
                return res.status(400).json({
                    success: false,
                    message: `Selected shop '${vendor.name}' only supports Black & White printing. Switch color mode to B&W or select a color shop.`
                });
            }

            const availableRateCards = await getEffectiveRateCards(vendorId);
            const availableFinishingRates = await getEffectiveFinishingRates(vendorId);

            try {
                pricingResult = calculatePrice({
                    documentPageCount: document.pageCount,
                    pageRange: printSettings.pageRange || 'all',
                    copies: rawCopies,
                    colorMode: printSettings.colorMode || 'B&W',
                    colorSelectionType: printSettings.colorSelectionType || 'none',
                    colorPages: printSettings.colorPages || '',
                    colorPageCount: printSettings.colorPageCount || 0,
                    sides: normalizedSides === 'duplexshort' ? 'double' : normalizedSides,
                    paperSize: printSettings.paperSize || 'A4',
                    paperType: printSettings.paperType || '70gsm',
                    pagesPerSheet: printSettings.pagesPerSheet || 1,
                    finishingOptions: printSettings.finishing || [],
                    availableRateCards,
                    availableFinishingRates
                });
            } catch (pricingError) {
                return res.status(400).json({ success: false, message: pricingError.message });
            }

            // Authoritative creator royalty calculation for study resource
            if (studyResource) {
                const copies = printSettings.copies || 1;
                const eligibleContentPages = countPagesFromRange(printSettings.pageRange, document.pageCount);
                creatorRoyalty = Number((eligibleContentPages * copies * studyResource.royaltyRatePerPage).toFixed(2));
            }
        }

        // 2. Process Stationery Items if present
        const processedStationery = [];
        let stationerySubtotal = 0;

        if (hasStationery) {
            for (const itemRequest of stationeryItems) {
                const itemDoc = await StationeryItem.findById(itemRequest.itemId);
                if (!itemDoc || !itemDoc.isAvailable) {
                    return res.status(404).json({
                        success: false,
                        message: `Stationery item '${itemRequest.itemId}' not found or unavailable`
                    });
                }

                const qty = itemRequest.quantity && itemRequest.quantity > 0 ? Number(itemRequest.quantity) : 1;
                if (itemDoc.stock < qty) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for '${itemDoc.name}'. Only ${itemDoc.stock} available.`
                    });
                }

                const lineSubtotal = itemDoc.price * qty;

                // Atomic deduction: conditional update guarantees stock >= qty in the database
                const updatedItem = await StationeryItem.findOneAndUpdate(
                    { _id: itemDoc._id, isAvailable: true, stock: { $gte: qty } },
                    { $inc: { stock: -qty, salesCount: qty } },
                    { returnDocument: 'after' }
                );

                if (!updatedItem) {
                    // Rollback any items already deducted in this order loop
                    for (const prev of processedStationery) {
                        await StationeryItem.findByIdAndUpdate(prev.itemId, {
                            $inc: { stock: prev.quantity, salesCount: -prev.quantity }
                        });
                    }
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for '${itemDoc.name}'. Only ${itemDoc.stock} available.`
                    });
                }

                stationerySubtotal += lineSubtotal;

                processedStationery.push({
                    itemId: itemDoc._id,
                    name: itemDoc.name,
                    price: itemDoc.price,
                    quantity: qty,
                    subtotal: lineSubtotal
                });
            }
        }

        // 3. Determine Order Type and Subtotals
        let orderType = 'print';
        if (studyResource) {
            orderType = 'mixed'; // Or print
        } else if (hasPrintJob && hasStationery) {
            orderType = 'mixed';
        } else if (hasStationery) {
            orderType = 'stationery';
        }

        const printSubtotal = pricingResult ? pricingResult.total : 0;
        const totalSubtotal = printSubtotal + stationerySubtotal;
        const platformFee = 2.00; // Flat ₹2 platform convenience fee
        const deliveryFee = (fulfillmentType === 'delivery' && vendor.delivery?.isAvailable) ? (vendor.delivery.fee || 0) : 0;

        // Authoritative scheduling surcharge calculation & slot revalidation
        let calculatedSchedulingFee = 0;
        if (pickupSlotStart) {
            const slotStartDate = new Date(pickupSlotStart);
            const now = new Date();
            // Reject stale/past slots with 5-minute network latency tolerance
            if (slotStartDate.getTime() < now.getTime() - 5 * 60000) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected pickup slot is no longer available. Please select a valid upcoming slot.'
                });
            }

            const isTomorrowOrLater = slotStartDate.getDate() !== now.getDate() || slotStartDate.getMonth() !== now.getMonth();
            if (isTomorrowOrLater) {
                calculatedSchedulingFee = vendor.schedulingFee?.nextDayFee || 15;
            }
        }

        const finalTotal = totalSubtotal + creatorRoyalty + platformFee + deliveryFee + calculatedSchedulingFee;

        // 4. Generate unique Order Number & Initialize 60-Second Editing Window
        const orderNumber = `CZ-${Math.floor(100000 + Math.random() * 900000)}`;
        const now = new Date();
        const editWindowEndsAt = new Date(now.getTime() + 60 * 1000);

        const order = await Order.create({
            orderNumber,
            userId: req.user.id,
            vendorId,
            type: orderType,
            fulfillmentType: fulfillmentType || 'pickup',
            pickupSlotStart: pickupSlotStart ? new Date(pickupSlotStart) : undefined,
            pickupSlotEnd: pickupSlotEnd ? new Date(pickupSlotEnd) : undefined,
            estimatedReadyAt: pickupSlotStart ? new Date(pickupSlotStart) : undefined,
            deliveryAddressId: fulfillmentType === 'delivery' ? deliveryAddressId : undefined,
            subtotal: totalSubtotal,
            creatorRoyalty,
            resourceId: studyResource ? studyResource._id : undefined,
            platformFee,
            deliveryFee,
            schedulingFee: calculatedSchedulingFee,
            total: finalTotal,
            status: 'PAYMENT_PENDING',
            stationeryItems: processedStationery,
            editWindowEndsAt,
            orderRevision: 1,
            printEligibleAt: editWindowEndsAt,
            editable: true
        });

        // 5. Create PrintJob linked to this Order if print was included
        let printJob = null;
        if (hasPrintJob) {
            const isMixedColor = printSettings.colorSelectionType === 'custom' || (pricingResult?.colorPagesCount > 0 && pricingResult?.bwPagesCount > 0);
            const resolvedCopies = printSettings.copies !== undefined ? Number(printSettings.copies) : 1;
            const resolvedSides = normalizeSides(printSettings.sides || 'single');
            const expectedOut = calculateExpectedOutput({
                finalPrintReadyPageCount: pricingResult.billingUnitsPerCopy || document.pageCount || 1,
                copies: resolvedCopies,
                sides: resolvedSides
            });
            const docVersionId = `${document._id}:${document.storageKeyOriginal || 'raw'}:${document.updatedAt ? new Date(document.updatedAt).getTime() : 0}`;

            const pagesPerSheet = [1, 2, 4].includes(Number(printSettings.pagesPerSheet)) ? Number(printSettings.pagesPerSheet) : 1;
            const nUpOrientation = pagesPerSheet > 1
                ? ((printSettings.nUpOrientation || printSettings.orientation || 'horizontal').toLowerCase() === 'vertical' ? 'vertical' : 'horizontal')
                : 'none';
            const sheetOrientation = pagesPerSheet === 1
                ? ((printSettings.orientation || 'portrait').toLowerCase() === 'landscape' ? 'landscape' : 'portrait')
                : (nUpOrientation === 'horizontal' ? 'landscape' : 'portrait');

            printJob = await PrintJob.create({
                documentId,
                orderId: order._id,
                ...printSettings,
                copies: resolvedCopies,
                sides: resolvedSides === 'duplexshort' ? 'double' : resolvedSides,
                colorMode: isMixedColor ? 'Mixed' : (printSettings.colorMode || 'B&W'),
                colorSelectionType: printSettings.colorSelectionType || 'none',
                colorPages: printSettings.colorPages || '',
                colorPageCount: pricingResult?.colorPagesCount || 0,
                bwPageCount: pricingResult?.bwPagesCount || 0,
                pagesPerSheet,
                nUpOrientation,
                sheetOrientation,
                price: pricingResult.total,
                executionState: 'CREATED',
                documentVersionId: docVersionId,
                originalPageCount: document.pageCount,
                finalPrintReadyPageCount: expectedOut.pagesPerCopy,
                expectedSheets: expectedOut.expectedSheets,
                expectedImpressions: expectedOut.expectedImpressions
            });

            printJob.submissionIdempotencyKey = `pj_${printJob._id}`;

            // 5a. Automatically generate authoritative first Information Sheet (1-5 pgs: Plain, 6+ pgs: Creative)
            try {
                const sheetInfo = await informationSheetService.generateAndSaveInformationSheet({
                    order: {
                        ...order.toObject(),
                        userName: req.user ? (req.user.name || req.user.displayName) : undefined,
                        userPhone: req.user ? req.user.phone : undefined,
                        userUSN: req.user ? (req.user.usn || req.user.studentId || req.user.rollNumber) : undefined,
                        collegeName: req.user ? req.user.collegeName : undefined,
                        vendorName: vendor ? (vendor.shopName || vendor.name) : undefined
                    },
                    document,
                    printJob
                });
                printJob.informationSheetType = sheetInfo.sheetType;
                printJob.informationSheetKey = sheetInfo.relativeKey;

                order.informationSheetType = sheetInfo.sheetType;
                order.informationSheetKey = sheetInfo.relativeKey;
                order.informationSheetGeneratedAt = new Date();
                await order.save();
            } catch (sheetErr) {
                console.error('[InformationSheet] Error generating information sheet on order creation:', sheetErr.message);
            }

            await printJob.save();

            // 5b. If this print order is for a marketplace study resource, record PENDING creator royalty ledger entry
            if (studyResource && creatorRoyalty > 0) {
                try {
                    const copies = printSettings.copies || 1;
                    const eligiblePages = countPagesFromRange(printSettings.pageRange, document.pageCount);
                    await CreatorLedgerEntry.create({
                        creatorId: studyResource.creatorId,
                        resourceId: studyResource._id,
                        orderId: order._id,
                        printJobId: printJob._id,
                        eligiblePages,
                        copies,
                        ratePerPage: studyResource.royaltyRatePerPage,
                        grossRoyalty: creatorRoyalty,
                        status: 'PENDING'
                    });
                } catch (ledgerErr) {
                    if (ledgerErr.code !== 11000) {
                        console.error('[Royalty Ledger] Error creating pending royalty:', ledgerErr.message);
                    }
                }
            }
        }

        // 6. Create Audit Event
        await OrderEvent.create({
            orderId: order._id,
            fromStatus: null,
            toStatus: 'PAYMENT_PENDING',
            actorId: req.user.id,
            note: `${orderType.toUpperCase()} order generated, awaiting payment`
        });

        res.status(201).json({
            success: true,
            data: {
                order,
                printJob,
                pricingBreakdown: pricingResult,
                stationeryBreakdown: processedStationery
            }
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get logged in student's orders
// @route   GET /api/orders
// @access  Private (Student)
const getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('vendorId', 'name address')
            .populate('resourceId', 'title subject pageCount language creatorId');

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get order details with timeline and print specs
// @route   GET /api/orders/:id
// @access  Private (Student Owner, Assigned Vendor, or Admin)
const getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('vendorId', 'name address')
            .populate('userId', 'name phone addresses')
            .populate('resourceId', 'title subject pageCount language creatorId');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // Authorization check: User must be student owner, assigned vendor, or admin
        const isStudentOwner = order.userId._id.toString() === req.user.id.toString();
        const vendor = await Vendor.findOne({
            _id: order.vendorId._id,
            $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }]
        });
        const isAssignedVendor = !!vendor;
        const isAdmin = req.user.role === 'admin';

        if (!isStudentOwner && !isAssignedVendor && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
        }

        const printJob = await PrintJob.findOne({ orderId: order._id }).populate('documentId', 'originalFilename mimeType pageCount');
        const timeline = await OrderEvent.find({ orderId: order._id }).sort({ createdAt: 1 });
        const submissionLogs = printJob
            ? await PrintSubmissionLog.find({ printJobId: printJob._id }).sort({ attemptNumber: -1 }).limit(5).lean()
            : [];

        res.status(200).json({
            success: true,
            data: {
                order,
                printJob,
                timeline,
                submissionLogs
            }
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get vendor's order intake with advanced date, search, status, archive filtering & pagination
// @route   GET /api/orders/vendor
// @access  Private (Vendor Owner / Staff / Admin)
const getVendorOrders = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(
            req.user.role === 'admin' && req.query.vendorId
                ? { _id: req.query.vendorId }
                : { $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }] }
        );
        if (!vendor && req.user.role !== 'admin') {
            return res.status(404).json({ success: false, message: 'Vendor shop not found' });
        }

        const query = vendor ? { vendorId: vendor._id } : {};

        // 1. Status Filter
        if (req.query.status) {
            const rawStatus = String(req.query.status).trim();
            const upper = rawStatus.toUpperCase();
            if (upper === 'ALL') {
                // Match all statuses
            } else if (upper === 'NEW') {
                query.status = { $in: ['PAID', 'SENT_TO_SHOP'] };
            } else if (upper === 'PRINTING') {
                query.status = { $in: ['PRINTING', 'FINISHING'] };
            } else if (upper === 'COMPLETED' || upper === 'DONE') {
                query.status = 'COMPLETED';
            } else {
                query.status = rawStatus;
            }
        } else if (req.query.isArchived === 'true') {
            // Archived query without explicit status: include all statuses (e.g. COMPLETED)
        } else {
            // Default active intake queue
            query.status = { $in: ['PAID', 'SENT_TO_SHOP', 'ACCEPTED', 'PRINTING', 'FINISHING', 'READY'] };
        }

        // 2. Archive Visibility Filter
        if (req.query.isArchived === 'true') {
            query.isArchived = true;
        } else if (req.query.isArchived === 'all') {
            // Include both archived and non-archived
        } else {
            // Default: strictly hide archived orders from active lists
            query.isArchived = { $ne: true };
        }

        // 3. Date-based Filtering (IST Timezone Boundary Handling)
        if (req.query.datePreset || req.query.startDate || req.query.endDate) {
            try {
                const dateRange = resolveDateRange({
                    datePreset: req.query.datePreset,
                    startDate: req.query.startDate,
                    endDate: req.query.endDate
                });
                if (dateRange) {
                    const dateFilter = {};
                    if (dateRange.startUTC) dateFilter.$gte = dateRange.startUTC;
                    if (dateRange.endUTC) dateFilter.$lte = dateRange.endUTC;
                    if (Object.keys(dateFilter).length > 0) {
                        query.createdAt = dateFilter;
                    }
                }
            } catch (dateErr) {
                return res.status(400).json({ success: false, message: dateErr.message });
            }
        }

        // 4. Search Filter (orderNumber, student name, student phone)
        if (req.query.search && String(req.query.search).trim()) {
            const searchStr = String(req.query.search).trim();
            const matchedUsers = await User.find({
                $or: [
                    { name: { $regex: searchStr, $options: 'i' } },
                    { phone: { $regex: searchStr, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = matchedUsers.map(u => u._id);

            query.$or = [
                { orderNumber: { $regex: searchStr, $options: 'i' } },
                { userId: { $in: userIds } }
            ];
        }

        // 5. Pagination
        const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limitNum = req.query.limit === 'all' ? 0 : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = limitNum > 0 ? (page - 1) * limitNum : 0;

        const total = await Order.countDocuments(query);

        let ordersQuery = Order.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'name phone')
            .populate('resourceId', 'title subject pageCount language creatorId');

        if (limitNum > 0) {
            ordersQuery = ordersQuery.skip(skip).limit(limitNum);
        }

        const orders = await ordersQuery;

        res.status(200).json({
            success: true,
            count: orders.length,
            total,
            page,
            totalPages: limitNum > 0 ? (Math.ceil(total / limitNum) || 1) : 1,
            data: orders
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Safely archive completed orders from the active list
// @route   POST /api/orders/vendor/archive-completed
// @access  Private (Vendor Owner / Admin)
const archiveCompletedOrders = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(
            req.user.role === 'admin' && req.body.vendorId
                ? { _id: req.body.vendorId }
                : { ownerId: req.user.id }
        );
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor shop not found or unauthorized' });
        }

        // Build archive query strictly for COMPLETED and unarchived orders belonging to this shop
        const archiveQuery = {
            vendorId: vendor._id,
            status: 'COMPLETED',
            isArchived: { $ne: true }
        };

        // Support date-scoped archiving (e.g. "Archive today's completed orders" or "Last 7 days")
        const body = req.body || {};
        const query = req.query || {};
        const datePreset = body.datePreset || query.datePreset;
        const startDate = body.startDate || query.startDate;
        const endDate = body.endDate || query.endDate;

        if (datePreset || startDate || endDate) {
            try {
                const dateRange = resolveDateRange({ datePreset, startDate, endDate });
                if (dateRange) {
                    const dateFilter = {};
                    if (dateRange.startUTC) dateFilter.$gte = dateRange.startUTC;
                    if (dateRange.endUTC) dateFilter.$lte = dateRange.endUTC;
                    if (Object.keys(dateFilter).length > 0) {
                        archiveQuery.createdAt = dateFilter;
                    }
                }
            } catch (dateErr) {
                return res.status(400).json({ success: false, message: dateErr.message });
            }
        }

        // Count eligible orders
        const eligibleCount = await Order.countDocuments(archiveQuery);
        if (eligibleCount === 0) {
            return res.status(200).json({
                success: true,
                message: 'No eligible completed orders found to archive',
                count: 0
            });
        }

        // Generate unique archive batch reference
        const archiveBatchId = `BATCH_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Atomically update all matching orders
        const result = await Order.updateMany(
            archiveQuery,
            {
                $set: {
                    isArchived: true,
                    archivedAt: new Date(),
                    archivedBy: req.user.id,
                    archiveBatchId
                }
            }
        );

        console.log(`[Archive] Vendor '${vendor.name}' (${vendor._id}) archived ${result.modifiedCount} orders (batch: ${archiveBatchId}) by user ${req.user.id}`);

        res.status(200).json({
            success: true,
            message: `Successfully archived ${result.modifiedCount} completed order${result.modifiedCount === 1 ? '' : 's'}`,
            count: result.modifiedCount,
            archivedCount: result.modifiedCount,
            batchId: archiveBatchId,
            archivedAt: new Date()
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Restore an archived completed order back to the active list
// @route   POST /api/orders/vendor/:id/restore
// @access  Private (Vendor Owner / Admin)
const restoreArchivedOrder = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(
            req.user.role === 'admin'
                ? {}
                : { ownerId: req.user.id }
        );
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor shop not found' });
        }

        const order = await Order.findOne({
            _id: req.params.id,
            vendorId: vendor._id
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found for this vendor shop' });
        }

        if (!order.isArchived) {
            return res.status(200).json({
                success: true,
                message: 'Order is already in the active list',
                data: order
            });
        }

        // Restore without altering status, payment, or financial records
        order.isArchived = false;
        order.archivedAt = null;
        order.archivedBy = null;
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order restored to active history successfully',
            data: order
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Vendor Owner / Staff / Admin)
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        const orderId = req.params.id;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const vendor = await Vendor.findOne({
            _id: order.vendorId,
            $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }]
        });

        if (!vendor && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
        }

        // Validate allowed state transitions
        const ALLOWED_TRANSITIONS = {
            'PAID': ['ACCEPTED', 'PRINTING', 'REJECTED'],
            'SENT_TO_SHOP': ['ACCEPTED', 'PRINTING', 'REJECTED'],
            'ACCEPTED': ['PRINTING', 'REJECTED'],
            'PRINTING': ['FINISHING', 'READY'],
            'FINISHING': ['READY'],
            'READY': ['OUT_FOR_DELIVERY', 'COMPLETED'],
            'OUT_FOR_DELIVERY': ['COMPLETED']
        };

        const allowed = ALLOWED_TRANSITIONS[order.status];
        if (req.user.role !== 'admin' && (!allowed || !allowed.includes(status))) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition from '${order.status}' to '${status}'`
            });
        }

        const oldStatus = order.status;

        // Print execution lifecycle coordination (idempotent, never double-dispatches on ACCEPTED -> PRINTING)
        if (status === 'PRINTING') {
            const linkedPrintJob = await PrintJob.findOne({ orderId: order._id });
            const linkedDoc = linkedPrintJob ? await Document.findById(linkedPrintJob.documentId) : null;
            const sourceFilePath = linkedDoc?.storageKeyOriginal
                ? path.join(__dirname, '../../uploads', linkedDoc.storageKeyOriginal)
                : null;
            const hasPhysicalFile = Boolean(sourceFilePath && fs.existsSync(sourceFilePath));

            if (linkedPrintJob && hasPhysicalFile) {
                try {
                    const printerService = require('../services/printer.service');
                    const printResult = await printerService.printOrder(order._id, { skipOrderEvent: true, actorId: req.user.id });
                    if (printResult && printResult.success === false) {
                        const failStatus = printResult.errorCode === 'PRINTER_OFFLINE' || printResult.errorCode === 'PRINTER_HARDWARE_ALERT' ? 503 : 409;
                        return res.status(failStatus).json({
                            success: false,
                            errorCode: printResult.errorCode || 'PRINT_BLOCKED',
                            message: printResult.message || 'Print job could not be dispatched to printer'
                        });
                    }
                    const refreshedOrder = await Order.findById(order._id);
                    if (refreshedOrder) order.status = refreshedOrder.status;
                } catch (pErr) {
                    const errStatus = pErr.code === 'PRINTER_OFFLINE' || pErr.code === 'PRINTER_HARDWARE_ALERT'
                        ? 503
                        : (pErr.code && pErr.code.startsWith('INCOMPATIBLE_')) ? 409 : 400;
                    return res.status(errStatus).json({
                        success: false,
                        errorCode: pErr.code || 'PRINT_FAILED',
                        message: pErr.message
                    });
                }
            }
            if (order.status !== 'PRINTING') {
                order.status = 'PRINTING';
                await order.save();
            }
        } else {
            order.status = status;
            await order.save();

            if (status === 'ACCEPTED') {
                await PrintJob.findOneAndUpdate(
                    { orderId: order._id, executionState: { $in: ['CREATED', 'VALIDATED'] } },
                    { $set: { executionState: 'READY_FOR_AGENT' } }
                );
            } else if (status === 'REJECTED') {
                try {
                    const printerService = require('../services/printer.service');
                    await printerService.cancelPrintJob(order._id);
                } catch (cErr) {
                    console.warn(`[AutoPrint] Rejection print cancel notice:`, cErr.message);
                }
            }
        }

        await OrderEvent.create({
            orderId: order._id,
            fromStatus: oldStatus,
            toStatus: status,
            actorId: req.user.id,
            note: note || `Status updated by vendor`
        });

        // Settle or reverse creator royalties based on final state transition
        if (status === 'COMPLETED') {
            await settleOrderRoyalty(order);
        } else if (['REJECTED', 'CANCELLED'].includes(status)) {
            await reverseOrderRoyalty(order._id);
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify student pickup code at vendor counter
// @route   POST /api/orders/:id/pickup
// @access  Private (Vendor Owner / Staff / Admin)
const verifyPickup = async (req, res, next) => {
    try {
        const { pickupCode } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const vendor = await Vendor.findOne({
            _id: order.vendorId,
            $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }]
        });

        if (!vendor && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to complete this order' });
        }

        if (order.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Order has already been picked up and completed' });
        }

        if (order.status !== 'READY') {
            return res.status(400).json({ success: false, message: `Order is not ready for pickup (current status: ${order.status})` });
        }

        if (!pickupCode || order.pickupCode !== pickupCode.toString()) {
            return res.status(400).json({ success: false, message: 'Invalid pickup code' });
        }

        order.status = 'COMPLETED';
        await order.save();

        await OrderEvent.create({
            orderId: order._id,
            fromStatus: 'READY',
            toStatus: 'COMPLETED',
            actorId: req.user.id,
            note: 'Order successfully picked up by student'
        });

        // If this order printed a marketplace study resource, idempotently settle creator royalty
        await settleOrderRoyalty(order);

        res.status(200).json({ success: true, message: 'Pickup verified and order marked as completed!', data: order });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel order (Student or Admin)
// @route   POST /api/orders/:id/cancel
// @access  Private (Student Owner or Admin)
const cancelOrder = async (req, res, next) => {
    try {
        const { reason } = req.body || {};
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const isOwner = order.userId.toString() === req.user.id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
        }

        const CANCELLABLE_STATUSES = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'SENT_TO_SHOP'];
        if (!isAdmin && !CANCELLABLE_STATUSES.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled in '${order.status}' status. Please contact shop.`
            });
        }

        const oldStatus = order.status;
        order.status = 'CANCELLED';
        await order.save();

        // Release stationery stock if reserved
        if (Array.isArray(order.stationeryItems)) {
            for (const item of order.stationeryItems) {
                await StationeryItem.findByIdAndUpdate(item.itemId, {
                    $inc: { stock: item.quantity, salesCount: -item.quantity }
                });
            }
        }

        // Cancel linked PrintJob if not yet submitted (or attempt spooler cancel cleanly)
        let printCancellation = null;
        try {
            const printerService = require('../services/printer.service');
            printCancellation = await printerService.cancelPrintJob(order._id);
        } catch (cErr) {
            console.warn('[CancelOrder] Print job cancel notice:', cErr.message);
        }

        // Reverse royalty ledger entry
        await reverseOrderRoyalty(order._id);

        await OrderEvent.create({
            orderId: order._id,
            fromStatus: oldStatus,
            toStatus: 'CANCELLED',
            actorId: req.user.id,
            note: reason || 'Order cancelled by user'
        });

        res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order, printCancellation });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// Shared vendor ownership check for print endpoints
const verifyOrderVendorAccess = async (orderId, user) => {
    const order = await Order.findById(orderId);
    if (!order) return { errorStatus: 404, errorMessage: 'Order not found' };
    if (user.role === 'admin') return { order };
    const vendor = await Vendor.findOne({
        _id: order.vendorId,
        $or: [{ ownerId: user.id }, { staffIds: user.id }]
    });
    if (!vendor) return { errorStatus: 403, errorMessage: 'Not authorized to manage printing for this order' };
    return { order, vendor };
};

// @desc    Get Safe Print Preview & printer capability check before physical submission
// @route   GET /api/orders/:id/print-preview
// @access  Private (Vendor Owner / Staff / Admin)
const printPreviewController = async (req, res) => {
    try {
        const access = await verifyOrderVendorAccess(req.params.id, req.user);
        if (access.errorStatus) {
            return res.status(access.errorStatus).json({ success: false, message: access.errorMessage });
        }
        const printerService = require('../services/printer.service');
        const preview = await printerService.getPrintPreview(req.params.id, req.query.printerName || null);
        // Strip internal filesystem path before returning to client
        const { prepared, ...safePreview } = preview;
        res.status(200).json({ success: true, data: safePreview });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Trigger physical printer directly & idempotently for this order
// @route   POST /api/orders/:id/print
// @access  Private (Vendor Owner / Staff / Admin)
const printOrderController = async (req, res) => {
    try {
        const access = await verifyOrderVendorAccess(req.params.id, req.user);
        if (access.errorStatus) {
            return res.status(access.errorStatus).json({ success: false, message: access.errorMessage });
        }
        const printerService = require('../services/printer.service');
        const result = await printerService.printOrder(req.params.id, {
            printerName: req.body?.printerName || null,
            actorId: req.user.id
        });
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        const status = error.code === 'PRINTER_OFFLINE' || error.code === 'PRINTER_HARDWARE_ALERT'
            ? 503
            : (error.code && error.code.startsWith('INCOMPATIBLE_')) ? 409 : 400;
        res.status(status).json({ success: false, errorCode: error.code || 'PRINT_FAILED', message: error.message });
    }
};

// @desc    Vendor confirms physical sheet output matches the production ticket
// @route   POST /api/orders/:id/print-confirm-qc
// @access  Private (Vendor Owner / Staff / Admin)
const confirmPhysicalPrintController = async (req, res) => {
    try {
        const access = await verifyOrderVendorAccess(req.params.id, req.user);
        if (access.errorStatus) {
            return res.status(access.errorStatus).json({ success: false, message: access.errorMessage });
        }
        const printerService = require('../services/printer.service');
        const printJob = await printerService.confirmPhysicalPrint(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: printJob, message: 'Physical print output verified by vendor.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Reconcile print job state with Windows Spooler after network/agent interruption
// @route   POST /api/orders/:id/print-reconcile
// @access  Private (Vendor Owner / Staff / Admin)
const reconcilePrintJobController = async (req, res) => {
    try {
        const access = await verifyOrderVendorAccess(req.params.id, req.user);
        if (access.errorStatus) {
            return res.status(access.errorStatus).json({ success: false, message: access.errorMessage });
        }
        const printerService = require('../services/printer.service');
        const result = await printerService.reconcilePrintJob(req.params.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Explicit vendor retry after resolving failure or verifying tray has no print output
// @route   POST /api/orders/:id/print-retry
// @access  Private (Vendor Owner / Staff / Admin)
const retryPrintJobController = async (req, res) => {
    try {
        const access = await verifyOrderVendorAccess(req.params.id, req.user);
        if (access.errorStatus) {
            return res.status(access.errorStatus).json({ success: false, message: access.errorMessage });
        }
        const printerService = require('../services/printer.service');
        const result = await printerService.retryPrintJob(req.params.id, {
            forceAfterPhysicalCheck: Boolean(req.body?.forceAfterPhysicalCheck),
            printerName: req.body?.printerName || null,
            actorId: req.user.id
        });
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, errorCode: error.code || 'RETRY_FAILED', message: error.message });
    }
};

// @desc    Download or view the authoritative Information Sheet for an order
// @route   GET /api/orders/:id/information-sheet
// @access  Private (Student Owner, Assigned Vendor, or Admin)
const getInformationSheetController = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('userId', 'name phone usn displayName');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const isStudentOwner = order.userId && (order.userId._id ? order.userId._id.toString() : order.userId.toString()) === req.user.id;
        const vendor = await Vendor.findOne({
            _id: order.vendorId,
            $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }]
        });
        const isAssignedVendor = !!vendor;
        const isAdmin = req.user.role === 'admin';

        if (!isStudentOwner && !isAssignedVendor && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to access this information sheet' });
        }

        let key = order.informationSheetKey;
        let absPath = key ? path.join(UPLOADS_DIR, key) : null;

        // If not already generated on disk, generate on demand
        if (!absPath || !fs.existsSync(absPath)) {
            const printJob = await PrintJob.findOne({ orderId: order._id });
            const document = printJob ? await Document.findById(printJob.documentId) : null;
            if (!printJob || !document) {
                return res.status(404).json({ success: false, message: 'No print document associated with this order' });
            }
            const sheetInfo = await informationSheetService.generateAndSaveInformationSheet({
                order: {
                    ...order.toObject(),
                    userName: order.userId ? (order.userId.name || order.userId.displayName) : undefined,
                    userPhone: order.userId ? order.userId.phone : undefined,
                    userUSN: order.userId ? (order.userId.usn || order.userId.rollNumber) : undefined,
                    vendorName: vendor ? (vendor.shopName || vendor.name) : undefined
                },
                document,
                printJob
            });
            key = sheetInfo.relativeKey;
            absPath = sheetInfo.absolutePath;
            order.informationSheetType = sheetInfo.sheetType;
            order.informationSheetKey = key;
            order.informationSheetGeneratedAt = new Date();
            await order.save();
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="information-sheet-${order.orderNumber || order._id}.pdf"`);
        const stream = fs.createReadStream(absPath);
        stream.pipe(res);
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Edit order settings within authoritative 60-second window
// @route   PUT /api/orders/:id/edit
// @access  Private (Student Owner)
const editOrderController = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // 1. Authorization: Only the ordering student or admin can edit
        if (order.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this order' });
        }

        // 2. Strict backend deadline enforcement (authoritative server time)
        const now = Date.now();
        const deadline = order.editWindowEndsAt ? new Date(order.editWindowEndsAt).getTime() : 0;
        if (now >= deadline) {
            return res.status(400).json({
                success: false,
                errorCode: 'EDIT_WINDOW_EXPIRED',
                message: 'Editing time has expired. Your order can no longer be modified.'
            });
        }

        // 3. State verification: Reject if already locked, in production, or cancelled
        if (['PRINTING', 'FINISHING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                errorCode: 'ORDER_LOCKED',
                message: `Order #${order.orderNumber} is already in state '${order.status}' and cannot be modified.`
            });
        }

        const printJob = await PrintJob.findOne({ orderId: order._id });
        if (!printJob) {
            return res.status(400).json({ success: false, message: 'No print job associated with this order' });
        }

        const previousPrice = order.total;
        const { printSettings, notes, documentId } = req.body;

        let document = await Document.findById(documentId || printJob.documentId);
        if (!document || document.isDeleted) {
            return res.status(400).json({ success: false, message: 'Invalid or missing document for edit' });
        }

        // Merge incoming settings with existing print job settings
        const pagesPerSheet = [1, 2, 4].includes(Number(printSettings?.pagesPerSheet))
            ? Number(printSettings.pagesPerSheet)
            : printJob.pagesPerSheet;
        const nUpOrientation = pagesPerSheet > 1
            ? ((printSettings?.nUpOrientation || printSettings?.orientation || printJob.nUpOrientation || 'horizontal').toLowerCase() === 'vertical' ? 'vertical' : 'horizontal')
            : 'none';
        const sheetOrientation = pagesPerSheet === 1
            ? ((printSettings?.orientation || printJob.orientation || 'portrait').toLowerCase() === 'landscape' ? 'landscape' : 'portrait')
            : (nUpOrientation === 'horizontal' ? 'landscape' : 'portrait');

        const updatedSettings = {
            pageRange: printSettings?.pageRange !== undefined ? printSettings.pageRange : printJob.pageRange,
            copies: printSettings?.copies !== undefined ? Number(printSettings.copies) : printJob.copies,
            colorMode: printSettings?.colorMode || printJob.colorMode,
            colorSelectionType: printSettings?.colorSelectionType || printJob.colorSelectionType,
            colorPages: printSettings?.colorPages !== undefined ? printSettings.colorPages : printJob.colorPages,
            sides: printSettings?.sides ? normalizeSides(printSettings.sides) : printJob.sides,
            paperSize: printSettings?.paperSize || printJob.paperSize || 'A4',
            paperType: '70gsm',
            pagesPerSheet,
            nUpOrientation,
            sheetOrientation,
            finishing: printSettings?.finishing || printJob.finishing || []
        };

        // Recalculate pricing
        const vendor = await Vendor.findById(order.vendorId);
        const effectiveRateCards = await getEffectiveRateCards(vendor._id);
        const effectiveFinishingRates = await getEffectiveFinishingRates(vendor._id);

        const pricingResult = calculatePrice({
            documentPageCount: document.pageCount,
            pageRange: updatedSettings.pageRange,
            copies: updatedSettings.copies,
            colorMode: updatedSettings.colorMode,
            colorSelectionType: updatedSettings.colorSelectionType,
            colorPages: updatedSettings.colorPages,
            sides: updatedSettings.sides,
            paperSize: updatedSettings.paperSize,
            paperType: updatedSettings.paperType,
            pagesPerSheet: updatedSettings.pagesPerSheet,
            finishingOptions: updatedSettings.finishing,
            availableRateCards: effectiveRateCards,
            availableFinishingRates: effectiveFinishingRates
        });

        // Recalculate order totals
        const printSubtotal = pricingResult.total;
        const stationerySubtotal = order.stationeryItems?.reduce((sum, item) => sum + item.subtotal, 0) || 0;
        const totalSubtotal = printSubtotal + stationerySubtotal;
        const platformFee = order.platformFee || 2.0;
        const deliveryFee = order.deliveryFee || 0;
        const schedulingFee = order.schedulingFee || 0;
        const creatorRoyalty = order.creatorRoyalty || 0;
        const newTotal = totalSubtotal + creatorRoyalty + platformFee + deliveryFee + schedulingFee;

        // Apply atomic changes to PrintJob
        const expectedOut = calculateExpectedOutput({
            finalPrintReadyPageCount: pricingResult.billingUnitsPerCopy || document.pageCount || 1,
            copies: updatedSettings.copies,
            sides: updatedSettings.sides
        });

        printJob.documentId = document._id;
        printJob.pageRange = updatedSettings.pageRange;
        printJob.copies = updatedSettings.copies;
        printJob.sides = updatedSettings.sides === 'duplexshort' ? 'double' : updatedSettings.sides;
        printJob.colorMode = updatedSettings.colorMode;
        printJob.colorSelectionType = updatedSettings.colorSelectionType;
        printJob.colorPages = updatedSettings.colorPages;
        printJob.colorPageCount = pricingResult.colorPagesCount || 0;
        printJob.bwPageCount = pricingResult.bwPagesCount || 0;
        printJob.pagesPerSheet = updatedSettings.pagesPerSheet;
        printJob.nUpOrientation = updatedSettings.nUpOrientation;
        printJob.sheetOrientation = updatedSettings.sheetOrientation;
        printJob.paperType = '70gsm';
        printJob.finishing = updatedSettings.finishing;
        printJob.price = pricingResult.total;
        printJob.finalPrintReadyPageCount = expectedOut.pagesPerCopy;
        printJob.expectedSheets = expectedOut.expectedSheets;
        printJob.expectedImpressions = expectedOut.expectedImpressions;
        printJob.executionState = 'CREATED';

        // Update Order
        const nextRevision = (order.orderRevision || 1) + 1;
        order.orderRevision = nextRevision;
        order.subtotal = totalSubtotal;
        order.total = newTotal;
        if (notes !== undefined) {
            order.notes = notes;
        }

        order.editHistory.push({
            revision: nextRevision,
            editedAt: new Date(),
            changes: req.body,
            previousPrice,
            revisedPrice: newTotal
        });

        // Regenerate Information Sheet with updated settings
        const sheetInfo = await informationSheetService.generateAndSaveInformationSheet({
            order: {
                ...order.toObject(),
                userName: req.user ? (req.user.name || req.user.displayName) : undefined,
                userPhone: req.user ? req.user.phone : undefined,
                userUSN: req.user ? (req.user.usn || req.user.studentId || req.user.rollNumber) : undefined,
                collegeName: req.user ? req.user.collegeName : undefined,
                vendorName: vendor ? (vendor.shopName || vendor.name) : undefined
            },
            document,
            printJob
        });

        order.informationSheetType = sheetInfo.sheetType;
        order.informationSheetKey = sheetInfo.relativeKey;
        order.informationSheetGeneratedAt = new Date();
        printJob.informationSheetType = sheetInfo.sheetType;
        printJob.informationSheetKey = sheetInfo.relativeKey;

        await order.save();
        await printJob.save();

        // Audit Event
        await OrderEvent.create({
            orderId: order._id,
            fromStatus: order.status,
            toStatus: order.status,
            actorId: req.user.id,
            note: `Order revision #${nextRevision} saved within editing window. Total: ₹${newTotal}`
        });

        const remainingSeconds = Math.max(0, Math.ceil((new Date(order.editWindowEndsAt).getTime() - Date.now()) / 1000));

        return res.status(200).json({
            success: true,
            message: `Order revision #${nextRevision} saved successfully.`,
            data: {
                order,
                printJob,
                pricing: pricingResult,
                orderRevision: nextRevision,
                editWindowRemainingSeconds: remainingSeconds
            }
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    createOrder,
    editOrderController,
    getMyOrders,
    getOrderById,
    getVendorOrders,
    archiveCompletedOrders,
    restoreArchivedOrder,
    updateOrderStatus,
    verifyPickup,
    cancelOrder,
    printPreviewController,
    printOrderController,
    confirmPhysicalPrintController,
    reconcilePrintJobController,
    retryPrintJobController,
    getInformationSheetController
};