const StudentListing = require('../models/studentListing.model');
const ResaleTransaction = require('../models/resaleTransaction.model');
const Category = require('../models/category.model');
const College = require('../models/college.model');
const mongoose = require('mongoose');

// Helper: Build college visibility filter based on requesting user
const buildResaleVisibilityFilter = (user) => {
    if (user?.role === 'admin') {
        return {};
    }

    const conditions = [];

    // Owner can always see their own listings
    if (user) {
        conditions.push({ sellerId: user._id || user.id });
    }

    // Public across all campuses
    conditions.push({ visibilityType: 'ALL_COLLEGES' });

    // College-specific scopes
    const userCollegeId = user?.collegeId?._id || user?.collegeId;
    if (userCollegeId) {
        conditions.push({
            $or: [
                { visibilityType: 'MY_COLLEGE_ONLY', collegeId: userCollegeId },
                { visibilityType: { $exists: false }, collegeId: userCollegeId }, // backwards compatibility
                { visibilityType: 'SELECTED_COLLEGES', visibleCollegeIds: userCollegeId }
            ]
        });
    }

    return { $or: conditions };
};

// @desc    Get all active student resale listings with campus and category filters
// @route   GET /api/resale/listings
// @access  Public / Optional Auth
const getResaleListings = async (req, res, next) => {
    try {
        const { collegeId, categoryId, condition, search, minPrice, maxPrice, status } = req.query;

        const baseQuery = {
            status: status || 'ACTIVE'
        };

        if (collegeId && mongoose.Types.ObjectId.isValid(collegeId)) {
            baseQuery.collegeId = collegeId;
        }

        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            // Include children categories if parent was selected
            const children = await Category.find({ parentId: categoryId });
            const catIds = [categoryId, ...children.map(c => c._id)];
            baseQuery.categoryId = { $in: catIds };
        }

        if (condition) {
            baseQuery.condition = condition.toUpperCase();
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            baseQuery.price = {};
            if (minPrice !== undefined) baseQuery.price.$gte = Number(minPrice);
            if (maxPrice !== undefined) baseQuery.price.$lte = Number(maxPrice);
        }

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            baseQuery.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { brand: searchRegex },
                { modelNumber: searchRegex },
                { 'academicTags.subject': searchRegex }
            ];
        }

        // Apply server-side college visibility rules
        const visibilityFilter = buildResaleVisibilityFilter(req.user);
        const finalQuery = Object.keys(visibilityFilter).length > 0
            ? { $and: [baseQuery, visibilityFilter] }
            : baseQuery;

        const listings = await StudentListing.find(finalQuery)
            .sort({ createdAt: -1 })
            .populate('sellerId', 'name avatar collegeName department year')
            .populate('categoryId', 'name slug icon')
            .populate('collegeId', 'name location city')
            .populate('visibleCollegeIds', 'name city');

        res.status(200).json({
            success: true,
            count: listings.length,
            data: listings
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single resale listing details
// @route   GET /api/resale/listings/:id
// @access  Public / Optional Auth
const getResaleListingById = async (req, res, next) => {
    try {
        const listing = await StudentListing.findById(req.params.id)
            .populate('sellerId', 'name avatar collegeName department year course')
            .populate('categoryId', 'name slug icon')
            .populate('collegeId', 'name location city')
            .populate('visibleCollegeIds', 'name city');

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Resale listing not found' });
        }

        // Enforce strict college visibility check
        if (req.user?.role !== 'admin') {
            const isSeller = req.user && (
                listing.sellerId._id?.toString() === req.user.id?.toString() ||
                listing.sellerId.toString() === req.user.id?.toString()
            );

            if (!isSeller) {
                const visType = listing.visibilityType || 'MY_COLLEGE_ONLY';
                const userCollegeId = req.user?.collegeId?.toString();
                const listingCollegeId = listing.collegeId?._id?.toString() || listing.collegeId?.toString();

                if (visType === 'MY_COLLEGE_ONLY') {
                    if (!userCollegeId || listingCollegeId !== userCollegeId) {
                        return res.status(404).json({ success: false, message: 'Resale listing not found' });
                    }
                } else if (visType === 'SELECTED_COLLEGES') {
                    const isEligible = userCollegeId && Array.isArray(listing.visibleCollegeIds) &&
                        listing.visibleCollegeIds.some(col => {
                            const cId = col._id ? col._id.toString() : col.toString();
                            return cId === userCollegeId;
                        });
                    if (!isEligible) {
                        return res.status(404).json({ success: false, message: 'Resale listing not found' });
                    }
                }
            }
        }

        // Increment views count atomically
        await StudentListing.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });

        res.status(200).json({
            success: true,
            data: listing
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create student resale listing
// @route   POST /api/resale/listings
// @access  Private (Student)
const createResaleListing = async (req, res, next) => {
    try {
        const {
            title,
            description,
            categoryId,
            condition,
            price,
            quantity = 1,
            images = [],
            brand,
            modelNumber,
            preferredHandover,
            pickupLocation,
            academicTags,
            collegeId,
            visibilityType = 'MY_COLLEGE_ONLY',
            visibleCollegeIds = []
        } = req.body;

        if (!title || !description || !categoryId || !condition || price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, categoryId, condition, and price are required'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category || !category.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Selected category is invalid or inactive'
            });
        }

        if (!category.applicableListingTypes.includes('STUDENT_RESALE')) {
            return res.status(400).json({
                success: false,
                message: `Category '${category.name}' does not permit student resale listings`
            });
        }

        const validCollegeId = collegeId || req.user.collegeId;
        if (!validCollegeId) {
            return res.status(400).json({
                success: false,
                message: 'Please associate a college campus with this listing'
            });
        }

        // Validate visibility scope
        let effectiveVisibleCollegeIds = [];
        if (visibilityType === 'MY_COLLEGE_ONLY') {
            effectiveVisibleCollegeIds = [validCollegeId];
        } else if (visibilityType === 'SELECTED_COLLEGES') {
            if (!Array.isArray(visibleCollegeIds) || visibleCollegeIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select at least one eligible college for this listing'
                });
            }
            // Ensure selected colleges exist and are active
            const validColleges = await College.find({ _id: { $in: visibleCollegeIds }, isActive: true });
            if (validColleges.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'None of the selected colleges are valid active campuses'
                });
            }
            effectiveVisibleCollegeIds = validColleges.map(c => c._id);
        } else if (visibilityType === 'ALL_COLLEGES') {
            effectiveVisibleCollegeIds = [];
        }

        const listing = await StudentListing.create({
            sellerId: req.user.id,
            collegeId: validCollegeId,
            categoryId: category._id,
            visibilityType,
            visibleCollegeIds: effectiveVisibleCollegeIds,
            title: title.trim(),
            description: description.trim(),
            condition: condition.toUpperCase(),
            price: Number(price),
            quantity: Math.max(1, Number(quantity) || 1),
            images,
            brand: brand ? brand.trim() : undefined,
            modelNumber: modelNumber ? modelNumber.trim() : undefined,
            preferredHandover: preferredHandover || 'in_person_campus',
            pickupLocation: pickupLocation ? pickupLocation.trim() : undefined,
            academicTags: academicTags || {},
            status: 'ACTIVE',
            listingType: 'STUDENT_RESALE'
        });

        res.status(201).json({
            success: true,
            data: listing
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update resale listing
// @route   PUT /api/resale/listings/:id
// @access  Private (Listing Owner)
const updateResaleListing = async (req, res, next) => {
    try {
        const listing = await StudentListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        if (listing.sellerId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this listing' });
        }

        if (listing.status === 'SOLD') {
            return res.status(400).json({ success: false, message: 'Cannot edit an already sold item' });
        }

        const allowedFields = [
            'title', 'description', 'condition', 'price', 'images',
            'brand', 'modelNumber', 'preferredHandover', 'pickupLocation', 'academicTags'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                listing[field] = req.body[field];
            }
        });

        if (req.body.categoryId) {
            const cat = await Category.findById(req.body.categoryId);
            if (cat && cat.isActive && cat.applicableListingTypes.includes('STUDENT_RESALE')) {
                listing.categoryId = cat._id;
            }
        }

        // Update visibility scope if requested
        if (req.body.visibilityType !== undefined) {
            const allowedVisibility = ['MY_COLLEGE_ONLY', 'SELECTED_COLLEGES', 'ALL_COLLEGES'];
            if (!allowedVisibility.includes(req.body.visibilityType)) {
                return res.status(400).json({ success: false, message: 'Invalid visibilityType' });
            }
            listing.visibilityType = req.body.visibilityType;
            if (listing.visibilityType === 'MY_COLLEGE_ONLY') {
                listing.visibleCollegeIds = [listing.collegeId];
            } else if (listing.visibilityType === 'SELECTED_COLLEGES') {
                const targetColleges = req.body.visibleCollegeIds || listing.visibleCollegeIds;
                if (!Array.isArray(targetColleges) || targetColleges.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please select at least one eligible college for this listing'
                    });
                }
                const validColleges = await College.find({ _id: { $in: targetColleges }, isActive: true });
                if (validColleges.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'None of the selected colleges are valid active campuses'
                    });
                }
                listing.visibleCollegeIds = validColleges.map(c => c._id);
            } else if (listing.visibilityType === 'ALL_COLLEGES') {
                listing.visibleCollegeIds = [];
            }
        } else if (req.body.visibleCollegeIds !== undefined && listing.visibilityType === 'SELECTED_COLLEGES') {
            if (!Array.isArray(req.body.visibleCollegeIds) || req.body.visibleCollegeIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select at least one eligible college for this listing'
                });
            }
            const validColleges = await College.find({ _id: { $in: req.body.visibleCollegeIds }, isActive: true });
            if (validColleges.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'None of the selected colleges are valid active campuses'
                });
            }
            listing.visibleCollegeIds = validColleges.map(c => c._id);
        }

        await listing.save();

        res.status(200).json({
            success: true,
            data: listing
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delist / soft-delete resale listing
// @route   DELETE /api/resale/listings/:id
// @access  Private (Listing Owner or Admin)
const delistResaleListing = async (req, res, next) => {
    try {
        const listing = await StudentListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        if (listing.sellerId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delist this item' });
        }

        listing.status = 'DELISTED';
        await listing.save();

        res.status(200).json({
            success: true,
            message: 'Listing successfully delisted'
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reserve a resale item for campus handover
// @route   POST /api/resale/listings/:id/reserve
// @access  Private (Buyer)
const reserveResaleListing = async (req, res, next) => {
    try {
        const listingId = req.params.id;
        const buyerId = req.user.id;

        const listing = await StudentListing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        if (listing.sellerId.toString() === buyerId.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot reserve your own item' });
        }

        // Enforce strict college visibility check for buyer
        if (req.user?.role !== 'admin') {
            const visType = listing.visibilityType || 'MY_COLLEGE_ONLY';
            const userCollegeId = req.user?.collegeId?.toString();
            const listingCollegeId = listing.collegeId?._id?.toString() || listing.collegeId?.toString();

            if (visType === 'MY_COLLEGE_ONLY') {
                if (!userCollegeId || listingCollegeId !== userCollegeId) {
                    return res.status(404).json({ success: false, message: 'Listing not found' });
                }
            } else if (visType === 'SELECTED_COLLEGES') {
                const isEligible = userCollegeId && Array.isArray(listing.visibleCollegeIds) &&
                    listing.visibleCollegeIds.some(col => {
                        const cId = col._id ? col._id.toString() : col.toString();
                        return cId === userCollegeId;
                    });
                if (!isEligible) {
                    return res.status(404).json({ success: false, message: 'Listing not found' });
                }
            }
        }

        // Generate 4-digit handover verification code
        const handoverCode = Math.floor(1000 + Math.random() * 9000).toString();

        // ATOMIC RESERVATION: Only succeeds if status is currently ACTIVE
        const updatedListing = await StudentListing.findOneAndUpdate(
            { _id: listingId, status: 'ACTIVE', quantity: { $gte: 1 } },
            {
                $set: {
                    status: 'RESERVED',
                    quantity: 0
                }
            },
            { returnDocument: 'after' }
        );

        if (!updatedListing) {
            return res.status(400).json({
                success: false,
                message: 'This item is no longer available or is already reserved by another student'
            });
        }

        const transaction = await ResaleTransaction.create({
            listingId,
            sellerId: listing.sellerId,
            buyerId,
            price: listing.price,
            handoverCode,
            handoverLocation: listing.pickupLocation || 'Campus Quad / Library Entrance',
            handoverNotes: req.body?.notes || 'Please verify physical condition before confirming handover',
            paymentMethod: req.body?.paymentMethod || 'CASH_ON_HANDOVER',
            status: 'RESERVED'
        });

        // Link transaction to listing
        updatedListing.activeReservationId = transaction._id;
        await updatedListing.save();

        res.status(201).json({
            success: true,
            message: 'Item reserved successfully! Meet the seller on campus and share your handover code once inspected.',
            data: {
                transaction,
                listing: updatedListing
            }
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify handover and complete resale transaction
// @route   POST /api/resale/transactions/:id/verify-handover
// @access  Private (Seller)
const verifyResaleHandover = async (req, res, next) => {
    try {
        const { handoverCode } = req.body || {};
        const transaction = await ResaleTransaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (transaction.sellerId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the seller can verify the handover code' });
        }

        if (transaction.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Transaction is already completed' });
        }

        if (transaction.status !== 'RESERVED') {
            return res.status(400).json({ success: false, message: `Cannot complete transaction with status '${transaction.status}'` });
        }

        if (!handoverCode || transaction.handoverCode !== handoverCode.toString().trim()) {
            return res.status(400).json({ success: false, message: 'Invalid handover verification code' });
        }

        transaction.status = 'COMPLETED';
        transaction.completedAt = new Date();
        await transaction.save();

        // Mark listing as permanently SOLD
        await StudentListing.findByIdAndUpdate(transaction.listingId, {
            $set: { status: 'SOLD' }
        });

        res.status(200).json({
            success: true,
            message: 'Campus handover verified! Sale successfully completed.',
            data: transaction
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Cancel resale reservation
// @route   POST /api/resale/transactions/:id/cancel
// @access  Private (Buyer or Seller)
const cancelResaleReservation = async (req, res, next) => {
    try {
        const { reason } = req.body || {};
        const transaction = await ResaleTransaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const isBuyer = transaction.buyerId.toString() === req.user.id.toString();
        const isSeller = transaction.sellerId.toString() === req.user.id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isBuyer && !isSeller && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel this transaction' });
        }

        if (transaction.status !== 'RESERVED') {
            return res.status(400).json({ success: false, message: 'Only active reservations can be cancelled' });
        }

        transaction.status = 'CANCELLED';
        transaction.cancelledAt = new Date();
        transaction.cancelledReason = reason || (isBuyer ? 'Cancelled by buyer' : 'Cancelled by seller');
        await transaction.save();

        // Atomically restore listing to ACTIVE status
        await StudentListing.findByIdAndUpdate(transaction.listingId, {
            $set: {
                status: 'ACTIVE',
                quantity: 1,
                activeReservationId: null
            }
        });

        res.status(200).json({
            success: true,
            message: 'Reservation cancelled. Item is back on the marketplace.',
            data: transaction
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get logged in student's own resale listings
// @route   GET /api/resale/my/listings
// @access  Private (Student)
const getMyResaleListings = async (req, res, next) => {
    try {
        const listings = await StudentListing.find({ sellerId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('categoryId', 'name slug icon')
            .populate('activeReservationId');

        res.status(200).json({
            success: true,
            count: listings.length,
            data: listings
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get logged in student's resale purchases / reservations
// @route   GET /api/resale/my/purchases
// @access  Private (Student)
const getMyResalePurchases = async (req, res, next) => {
    try {
        const purchases = await ResaleTransaction.find({ buyerId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('listingId')
            .populate('sellerId', 'name avatar phone');

        res.status(200).json({
            success: true,
            count: purchases.length,
            data: purchases
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getResaleListings,
    getResaleListingById,
    createResaleListing,
    updateResaleListing,
    delistResaleListing,
    reserveResaleListing,
    verifyResaleHandover,
    cancelResaleReservation,
    getMyResaleListings,
    getMyResalePurchases
};
