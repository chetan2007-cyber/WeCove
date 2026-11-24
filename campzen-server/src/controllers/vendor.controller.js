const Vendor = require('../models/vendor.model');
const RateCard = require('../models/rateCard.model');
const FinishingRate = require('../models/finishingRate.model');
const RateAuditLog = require('../models/rateAuditLog.model');
const paginate = require('../utils/pagination.util');
const { seedDefaultRatesForVendor } = require('../utils/defaultRateCards.util');

const ALLOWED_PAPER_SIZES = ['A4', 'A3', 'Legal'];
const ALLOWED_PAPER_TYPES = ['70gsm', '80gsm', '100gsm', 'glossy'];
const ALLOWED_COLOR_MODES = ['B&W', 'Color'];
const ALLOWED_SIDES = ['single', 'double'];
const ALLOWED_FINISHING_TYPES = ['spiral_binding', 'comb_binding', 'hardbound', 'stapling', 'lamination'];

// @desc    Register a new vendor shop
// @route   POST /api/vendors
// @access  Private/Vendor Owner
const createVendor = async (req, res, next) => {
    try {
        // Prevent a single user from creating multiple shops in the MVP
        const existingVendor = await Vendor.findOne({ ownerId: req.user.id });
        if (existingVendor) {
            return res.status(400).json({ success: false, message: 'You already have a registered shop.' });
        }

        // Attach the authenticated user's ID as the owner
        const vendorData = { ...req.body, ownerId: req.user.id };
        if (!vendorData.operatingHours) {
            vendorData.operatingHours = { open: '09:00', close: '18:00', daysOpen: [0, 1, 2, 3, 4, 5, 6] };
        } else if (!vendorData.operatingHours.daysOpen || vendorData.operatingHours.daysOpen.length === 0) {
            vendorData.operatingHours.daysOpen = [0, 1, 2, 3, 4, 5, 6];
        }

        const vendor = await Vendor.create(vendorData);
        await seedDefaultRatesForVendor(vendor._id);
        res.status(201).json({ success: true, data: vendor });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get vendor's own shop details
// @route   GET /api/vendors/me
// @access  Private/Vendor Owner or Staff
const getMyVendor = async (req, res, next) => {
    try {
        // Find shop where user is owner or staff
        let vendor = await Vendor.findOne({
            $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }]
        }).populate('collegeId', 'name');

        if (!vendor) {
            // Auto-provision shop for vendor owner or admin if not found
            if (['vendor_owner', 'vendor_staff', 'admin'].includes(req.user.role)) {
                const College = require('../models/college.model');
                const defaultCollege = (await College.findOne({ isActive: true })) || (await College.findOne({}));
                vendor = await Vendor.create({
                    name: `${req.user.name || 'Campus'}'s Print Shop`,
                    ownerId: req.user.id,
                    collegeId: defaultCollege ? defaultCollege._id : undefined,
                    address: {
                        line1: 'Campus Print Station',
                        landmark: 'Home Desk'
                    },
                    location: {
                        type: 'Point',
                        coordinates: [76.6669, 12.3615]
                    },
                    operatingHours: {
                        open: '08:00',
                        close: '22:00',
                        daysOpen: [0, 1, 2, 3, 4, 5, 6]
                    },
                    status: 'active',
                    queueInfo: {
                        isAcceptingOrders: true,
                        maxOrdersPerHour: 50
                    }
                });

                try {
                    await seedDefaultRatesForVendor(vendor._id);
                } catch (seedErr) {
                    console.warn('[getMyVendor] Rate card seed warning:', seedErr.message);
                }

                if (defaultCollege) {
                    vendor.collegeId = defaultCollege;
                }
            } else {
                return res.status(404).json({ success: false, message: 'Shop not found' });
            }
        }

        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update vendor's own shop details (hours, capacity, capabilities, queue status)
// @route   PUT /api/vendors/me
// @access  Private/Vendor Owner or Admin
const updateMyVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ ownerId: req.user.id });
        if (!vendor && req.user.role !== 'admin') {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }

        const allowedUpdates = [
            'name', 'address', 'operatingHours', 'capacity',
            'capabilities', 'delivery', 'schedulingFee', 'queueInfo'
        ];

        const targetVendor = vendor || await Vendor.findById(req.body.vendorId);
        if (!targetVendor) return res.status(404).json({ success: false, message: 'Shop not found' });

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                targetVendor[field] = req.body[field];
            }
        });

        await targetVendor.save();
        res.status(200).json({ success: true, data: targetVendor });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// Utility: Calculate Haversine distance in meters
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

// Utility: Check if shop is currently open based on local day and operating hours
const isShopOpenNow = (operatingHours) => {
    if (!operatingHours) return true;
    const now = new Date();
    const currentDay = now.getDay();
    if (operatingHours.daysOpen && operatingHours.daysOpen.length > 0) {
        if (!operatingHours.daysOpen.includes(currentDay)) {
            return false;
        }
    }
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = (operatingHours.open || '09:00').split(':').map(Number);
    const [closeH, closeM] = (operatingHours.close || '18:00').split(':').map(Number);
    const openTotal = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM;
    return currentMinutes >= openTotal && currentMinutes < closeTotal;
};

// @desc    List / search vendors with filters, 1km geospatial radius, and live queue
// @route   GET /api/vendors
// @access  Private
const getVendors = async (req, res, next) => {
    try {
        const { collegeId, search, colorPrinting, binding, lat, lng } = req.query;
        const Order = require('../models/order.model');

        // Authoritative partner rule: Genuine KAMI vendor, active, and approved
        let query = {
            status: 'active',
            isApproved: true,
            source: 'KAMI'
        };

        if (collegeId) query.collegeId = collegeId;
        if (search) query.name = { $regex: search, $options: 'i' };
        if (colorPrinting === 'true') query['capabilities.colorPrinting'] = true;
        if (binding) query['capabilities.bindingTypes'] = binding;

        let userLat = null;
        let userLng = null;

        // Authoritative 1 km rule enforcement via MongoDB geospatial index
        if (lat !== undefined && lng !== undefined) {
            const parsedLat = parseFloat(lat);
            const parsedLng = parseFloat(lng);
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                userLat = parsedLat;
                userLng = parsedLng;
                const radiusInRadians = 1000 / 6378137; // 1000 meters in radians
                query.location = {
                    $geoWithin: {
                        $centerSphere: [[parsedLng, parsedLat], radiusInRadians] // GeoJSON [longitude, latitude]
                    }
                };
            }
        }

        const paginatedData = await paginate(Vendor, query, req.query);
        const vendors = paginatedData.results;

        // Populate owner to ensure owner account verification is genuine
        const populatedVendors = await Vendor.populate(vendors, {
            path: 'ownerId',
            select: 'name email role isVerified'
        });

        // Strict authoritative eligibility rule:
        // Must be active, approved, genuine KAMI source, and owned by a verified vendor_owner or admin
        const eligibleVendors = populatedVendors.filter(v => {
            const owner = v.ownerId;
            return (
                v.status === 'active' &&
                v.isApproved === true &&
                v.source === 'KAMI' &&
                owner &&
                owner.isVerified === true &&
                (owner.role === 'vendor_owner' || owner.role === 'admin')
            );
        });

        // Fetch live queue counts for returned eligible vendors
        const vendorIds = eligibleVendors.map(v => v._id);
        const activeQueueAgg = await Order.aggregate([
            {
                $match: {
                    vendorId: { $in: vendorIds },
                    status: { $in: ['ACCEPTED', 'PRINTING', 'FINISHING'] }
                }
            },
            {
                $group: {
                    _id: '$vendorId',
                    count: { $sum: 1 }
                }
            }
        ]);
        const queueMap = {};
        activeQueueAgg.forEach(item => {
            queueMap[item._id.toString()] = item.count;
        });

        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        // Enrich vendors with distance, open status, queue, ready time, and 7-day "New on Kami" badge
        const enrichedVendors = eligibleVendors.map(v => {
            const vObj = v.toObject ? v.toObject() : v;
            let distance = null;
            if (userLat !== null && userLng !== null) {
                let vLat = null;
                let vLng = null;
                if (vObj.location && Array.isArray(vObj.location.coordinates) && vObj.location.coordinates.length === 2) {
                    // GeoJSON format is [longitude, latitude]
                    [vLng, vLat] = vObj.location.coordinates;
                } else if (vObj.address?.lat !== undefined && vObj.address?.lng !== undefined) {
                    vLat = vObj.address.lat;
                    vLng = vObj.address.lng;
                }

                if (vLat !== null && vLng !== null && !isNaN(vLat) && !isNaN(vLng) && (vLat !== 0 || vLng !== 0)) {
                    distance = calculateDistanceMeters(userLat, userLng, vLat, vLng);
                }
            }

            const activeQueueCount = queueMap[vObj._id.toString()] || 0;
            const isOpen = isShopOpenNow(vObj.operatingHours);
            const ppm = vObj.capacity?.pagesPerMinute || 30;
            const machines = vObj.capacity?.machineCount || 1;
            const queueWaitMin = Math.ceil((activeQueueCount * 15) / machines);
            const readyDate = new Date(Date.now() + queueWaitMin * 60000);
            const readyTimeFormatted = readyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // 7-day "New on Kami" badge: Strictly less than 7 days from partner activation
            const activationDate = vObj.partnerActivatedAt || vObj.createdAt;
            const activationTime = new Date(activationDate).getTime();
            const ageMs = now - activationTime;
            const isNewPartner = !isNaN(activationTime) && ageMs >= 0 && ageMs < SEVEN_DAYS_MS;

            return {
                ...vObj,
                isCampZenPartner: true,
                isKamiPartner: true,
                orderable: true,
                isNewPartner,
                partnerActivatedAt: activationDate,
                distance, // In meters (authoritative)
                isOpen,
                activeQueueCount,
                estimatedReadyFrom: readyTimeFormatted
            };
        });

        if (userLat !== null && userLng !== null) {
            enrichedVendors.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }

        // Discover and deduplicate Google Places within 1 km
        let discoveredGooglePlaces = [];
        if (userLat !== null && userLng !== null) {
            try {
                const { discoverGooglePlaces, deduplicatePlaces } = require('../services/googlePlaces.service');
                const rawGooglePlaces = await discoverGooglePlaces({
                    lat: userLat,
                    lng: userLng,
                    radius: 1000,
                    query: search || ''
                });
                discoveredGooglePlaces = deduplicatePlaces(rawGooglePlaces, enrichedVendors);
            } catch (placesErr) {
                console.warn('[VendorController] Google places discovery failed gracefully:', placesErr.message);
                discoveredGooglePlaces = [];
            }
        }

        res.status(200).json({
            success: true,
            count: enrichedVendors.length,
            pagination: paginatedData.pagination,
            data: enrichedVendors,
            campzenVendors: enrichedVendors,
            kamiVendors: enrichedVendors,
            googlePlaces: discoveredGooglePlaces
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single vendor details with rate cards and live queue
// @route   GET /api/vendors/:id
// @access  Private
const getVendorById = async (req, res, next) => {
    try {
        const Order = require('../models/order.model');
        const vendor = await Vendor.findById(req.params.id)
            .populate('collegeId', 'name')
            .populate('ownerId', 'name email role isVerified');

        if (!vendor || vendor.status !== 'active' || vendor.isApproved !== true || vendor.source !== 'KAMI' || !vendor.ownerId?.isVerified) {
            return res.status(404).json({ success: false, message: 'Print shop not found or is not an active Kami partner.' });
        }

        const activeQueueCount = await Order.countDocuments({
            vendorId: vendor._id,
            status: { $in: ['ACCEPTED', 'PRINTING', 'FINISHING'] }
        });
        const isOpen = isShopOpenNow(vendor.operatingHours);
        let rateCards = await RateCard.find({ vendorId: vendor._id });
        let finishingRates = await FinishingRate.find({ vendorId: vendor._id });
        if (rateCards.length === 0) {
            await seedDefaultRatesForVendor(vendor._id);
            rateCards = await RateCard.find({ vendorId: vendor._id });
            finishingRates = await FinishingRate.find({ vendorId: vendor._id });
        }

        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const activationDate = vendor.partnerActivatedAt || vendor.createdAt;
        const activationTime = new Date(activationDate).getTime();
        const ageMs = now - activationTime;
        const isNewPartner = !isNaN(activationTime) && ageMs >= 0 && ageMs < SEVEN_DAYS_MS;

        res.status(200).json({
            success: true,
            data: {
                ...vendor.toObject(),
                isCampZenPartner: true,
                isKamiPartner: true,
                orderable: true,
                isNewPartner,
                partnerActivatedAt: activationDate,
                isOpen,
                activeQueueCount,
                rateCards,
                finishingRates
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get real-time scheduling slots, shop hours, queue workload & surcharges
// @route   GET /api/vendors/:id/availability
// @access  Private
const getVendorScheduleAndAvailability = async (req, res, next) => {
    try {
        const Order = require('../models/order.model');
        const vendor = await Vendor.findById(req.params.id).populate('ownerId', 'isVerified');
        if (!vendor || vendor.status !== 'active' || vendor.isApproved !== true || vendor.source !== 'KAMI' || !vendor.ownerId?.isVerified) {
            return res.status(404).json({ success: false, message: 'Print shop is not currently accepting orders' });
        }

        const { date, pageCount = 10, copies = 1 } = req.query;
        const now = new Date();
        const targetDate = date ? new Date(date) : new Date();

        const isToday = targetDate.toDateString() === now.toDateString();
        const isTomorrow = !isToday && targetDate > now;

        const dayOfWeek = targetDate.getDay();
        const rawDays = vendor.operatingHours?.daysOpen;
        const daysOpen = (Array.isArray(rawDays) && rawDays.length > 0)
            ? rawDays
            : [0, 1, 2, 3, 4, 5, 6];
        const isOpenDay = daysOpen.includes(dayOfWeek);

        const schedulingFee = isTomorrow ? (vendor.schedulingFee?.nextDayFee || 15) : 0;
        const schedulingFeeReason = isTomorrow
            ? 'Next-day pickup includes a small holding and priority scheduling fee.'
            : null;

        if (!isOpenDay) {
            return res.status(200).json({
                success: true,
                data: {
                    vendorId: vendor._id,
                    vendorName: vendor.name,
                    date: targetDate.toISOString().split('T')[0],
                    isToday,
                    isTomorrow,
                    isOpenDay: false,
                    operatingHours: vendor.operatingHours,
                    message: 'Shop is closed on this day.',
                    slots: [],
                    schedulingFee
                }
            });
        }

        // Active queue calculation
        const activeOrders = await Order.find({
            vendorId: vendor._id,
            status: { $in: ['ACCEPTED', 'PRINTING', 'FINISHING'] }
        });
        const activeQueueCount = activeOrders.length;
        const ppm = vendor.capacity?.pagesPerMinute || 30;
        const machines = vendor.capacity?.machineCount || 1;
        const effectiveThroughput = ppm * machines;

        const queueWaitMinutes = activeQueueCount * 4;
        const jobPrintMinutes = Math.max(2, Math.ceil((Number(pageCount) * Number(copies)) / effectiveThroughput));
        const totalWaitMinutes = queueWaitMinutes + jobPrintMinutes;

        // Operating hours parsing
        const [openH, openM] = (vendor.operatingHours?.open || '09:00').split(':').map(Number);
        const [closeH, closeM] = (vendor.operatingHours?.close || '18:00').split(':').map(Number);

        let earliestReadyTime;
        if (isToday) {
            earliestReadyTime = new Date(now.getTime() + totalWaitMinutes * 60000);
        } else {
            earliestReadyTime = new Date(targetDate);
            earliestReadyTime.setHours(openH, openM + jobPrintMinutes, 0, 0);
        }

        // Generate discrete slots (15-minute intervals)
        const slots = [];
        const slotCursor = new Date(targetDate);
        slotCursor.setHours(openH, openM, 0, 0);

        const slotCloseLimit = new Date(targetDate);
        slotCloseLimit.setHours(closeH, closeM, 0, 0);

        while (slotCursor < slotCloseLimit) {
            const nextCursor = new Date(slotCursor.getTime() + 15 * 60000);
            const hours = slotCursor.getHours();
            const minutes = slotCursor.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedHours = hours % 12 || 12;
            const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
            const timeLabel = `${formattedHours}:${formattedMinutes} ${ampm}`;

            let isAvailable = true;
            let unavailableReason = null;

            if (isToday) {
                if (slotCursor <= now) {
                    isAvailable = false;
                    unavailableReason = 'Time slot has passed';
                } else if (slotCursor < earliestReadyTime) {
                    isAvailable = false;
                    unavailableReason = `Shop queue processing; earliest ready at ${earliestReadyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                }
            }

            slots.push({
                slotId: slotCursor.toISOString(),
                timeLabel,
                startTime: slotCursor.toISOString(),
                endTime: nextCursor.toISOString(),
                isAvailable,
                unavailableReason
            });

            slotCursor.setTime(nextCursor.getTime());
        }

        res.status(200).json({
            success: true,
            data: {
                vendorId: vendor._id,
                vendorName: vendor.name,
                date: targetDate.toISOString().split('T')[0],
                isToday,
                isTomorrow,
                isOpenDay: true,
                operatingHours: vendor.operatingHours,
                activeQueueCount,
                queueWaitMinutes: totalWaitMinutes,
                earliestReadyTime: earliestReadyTime.toISOString(),
                earliestReadyTimeFormatted: earliestReadyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                schedulingFee,
                schedulingFeeReason,
                slots
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a new print rate card for shop
// @route   POST /api/vendors/rate-cards
// @access  Private/Vendor Owner or Admin
const addRateCard = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(req.user.role === 'admin' ? {} : { ownerId: req.user.id });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const { paperSize, paperType, colorMode, sides, minPages = 1, maxPages = 99999, pricePerPage, isActive } = req.body;

        // Validation
        if (!ALLOWED_PAPER_SIZES.includes(paperSize)) {
            return res.status(400).json({ success: false, message: `Invalid paper size. Supported: ${ALLOWED_PAPER_SIZES.join(', ')}` });
        }
        if (!ALLOWED_PAPER_TYPES.includes(paperType)) {
            return res.status(400).json({ success: false, message: `Invalid paper type. Supported: ${ALLOWED_PAPER_TYPES.join(', ')}` });
        }
        if (!ALLOWED_COLOR_MODES.includes(colorMode)) {
            return res.status(400).json({ success: false, message: `Invalid color mode. Supported: ${ALLOWED_COLOR_MODES.join(', ')}` });
        }
        if (!ALLOWED_SIDES.includes(sides)) {
            return res.status(400).json({ success: false, message: `Invalid print sides. Supported: ${ALLOWED_SIDES.join(', ')}` });
        }

        const priceNum = Number(pricePerPage);
        if (pricePerPage === undefined || pricePerPage === null || isNaN(priceNum) || priceNum < 0) {
            return res.status(400).json({ success: false, message: 'Price per page must be a non-negative number' });
        }

        const minPagesNum = Number(minPages) || 1;
        const maxPagesNum = Number(maxPages) || 99999;
        if (minPagesNum < 1 || maxPagesNum < minPagesNum) {
            return res.status(400).json({ success: false, message: 'Invalid page range (minPages must be >= 1 and <= maxPages)' });
        }

        const existingRateCard = await RateCard.findOne({
            vendorId: vendor._id,
            paperSize,
            paperType,
            colorMode,
            sides,
            minPages: minPagesNum
        });

        const previousValue = existingRateCard ? existingRateCard.toObject() : null;
        const action = existingRateCard ? 'UPDATE' : 'CREATE';

        const rateCard = await RateCard.findOneAndUpdate(
            {
                vendorId: vendor._id,
                paperSize,
                paperType,
                colorMode,
                sides,
                minPages: minPagesNum
            },
            {
                vendorId: vendor._id,
                paperSize,
                paperType,
                colorMode,
                sides,
                minPages: minPagesNum,
                maxPages: maxPagesNum,
                pricePerPage: Number(priceNum.toFixed(2)),
                isActive: isActive !== undefined ? Boolean(isActive) : true
            },
            { upsert: true, new: true, runValidators: true }
        );

        // Record Rate Audit Log
        await RateAuditLog.create({
            vendorId: vendor._id,
            rateType: 'print',
            rateId: rateCard._id,
            action,
            previousValue,
            newValue: rateCard.toObject(),
            changedBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: existingRateCard ? 'Print rate updated successfully' : 'Print rate added successfully',
            data: rateCard
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Edit an existing print rate card by ID
// @route   PUT /api/vendors/rate-cards/:id
// @access  Private/Vendor Owner or Admin
const updateRateCard = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(req.user.role === 'admin' ? {} : { ownerId: req.user.id });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const rateCard = await RateCard.findOne({
            _id: req.params.id,
            vendorId: vendor._id
        });

        if (!rateCard) {
            return res.status(404).json({ success: false, message: 'Rate card not found' });
        }

        const previousValue = rateCard.toObject();
        const { paperSize, paperType, colorMode, sides, minPages, maxPages, pricePerPage, isActive } = req.body;

        if (pricePerPage !== undefined) {
            const priceNum = Number(pricePerPage);
            if (isNaN(priceNum) || priceNum < 0) {
                return res.status(400).json({ success: false, message: 'Price per page must be a non-negative number' });
            }
            rateCard.pricePerPage = Number(priceNum.toFixed(2));
        }

        if (paperSize !== undefined) {
            if (!ALLOWED_PAPER_SIZES.includes(paperSize)) {
                return res.status(400).json({ success: false, message: `Invalid paper size. Supported: ${ALLOWED_PAPER_SIZES.join(', ')}` });
            }
            rateCard.paperSize = paperSize;
        }

        if (paperType !== undefined) {
            if (!ALLOWED_PAPER_TYPES.includes(paperType)) {
                return res.status(400).json({ success: false, message: `Invalid paper type. Supported: ${ALLOWED_PAPER_TYPES.join(', ')}` });
            }
            rateCard.paperType = paperType;
        }

        if (colorMode !== undefined) {
            if (!ALLOWED_COLOR_MODES.includes(colorMode)) {
                return res.status(400).json({ success: false, message: `Invalid color mode. Supported: ${ALLOWED_COLOR_MODES.join(', ')}` });
            }
            rateCard.colorMode = colorMode;
        }

        if (sides !== undefined) {
            if (!ALLOWED_SIDES.includes(sides)) {
                return res.status(400).json({ success: false, message: `Invalid print sides. Supported: ${ALLOWED_SIDES.join(', ')}` });
            }
            rateCard.sides = sides;
        }

        if (minPages !== undefined) {
            const minNum = Number(minPages);
            if (isNaN(minNum) || minNum < 1) {
                return res.status(400).json({ success: false, message: 'minPages must be at least 1' });
            }
            rateCard.minPages = minNum;
        }

        if (maxPages !== undefined) {
            const maxNum = Number(maxPages);
            if (isNaN(maxNum) || maxNum < rateCard.minPages) {
                return res.status(400).json({ success: false, message: 'maxPages cannot be less than minPages' });
            }
            rateCard.maxPages = maxNum;
        }

        let isAction = 'UPDATE';
        if (isActive !== undefined) {
            const nextActive = Boolean(isActive);
            if (rateCard.isActive !== nextActive) {
                isAction = nextActive ? 'ACTIVATE' : 'DEACTIVATE';
            }
            rateCard.isActive = nextActive;
        }

        // Validate compound uniqueness if configuration changed
        const conflict = await RateCard.findOne({
            _id: { $ne: rateCard._id },
            vendorId: vendor._id,
            paperSize: rateCard.paperSize,
            paperType: rateCard.paperType,
            colorMode: rateCard.colorMode,
            sides: rateCard.sides,
            minPages: rateCard.minPages
        });

        if (conflict) {
            return res.status(400).json({
                success: false,
                message: 'A rate card with this exact print configuration already exists.'
            });
        }

        await rateCard.save();

        // Record Rate Audit Log
        await RateAuditLog.create({
            vendorId: vendor._id,
            rateType: 'print',
            rateId: rateCard._id,
            action: isAction,
            previousValue,
            newValue: rateCard.toObject(),
            changedBy: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Print rate updated successfully',
            data: rateCard
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete rate card for shop
// @route   DELETE /api/vendors/rate-cards/:id
// @access  Private/Vendor Owner or Admin
const deleteRateCard = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(req.user.role === 'admin' ? {} : { ownerId: req.user.id });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const rateCard = await RateCard.findOneAndDelete({
            _id: req.params.id,
            vendorId: vendor._id
        });

        if (!rateCard) {
            return res.status(404).json({ success: false, message: 'Rate card not found' });
        }

        // Record Rate Audit Log
        await RateAuditLog.create({
            vendorId: vendor._id,
            rateType: 'print',
            rateId: rateCard._id,
            action: 'DELETE',
            previousValue: rateCard.toObject(),
            newValue: null,
            changedBy: req.user.id
        });

        res.status(200).json({ success: true, message: 'Rate card removed successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get rate cards for shop
// @route   GET /api/vendors/rate-cards
// @access  Private/Vendor Owner or Staff or Admin
const getRateCards = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({
            $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }]
        });
        if (!vendor && req.user.role !== 'admin') return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const vendorId = vendor ? vendor._id : req.query.vendorId;
        const filter = { vendorId };
        if (req.query.activeOnly === 'true') {
            filter.isActive = { $ne: false };
        }

        let rateCards = await RateCard.find(filter).sort({ paperSize: 1, colorMode: 1, sides: 1, paperType: 1 });
        if (rateCards.length === 0 && !req.query.activeOnly) {
            await seedDefaultRatesForVendor(vendorId);
            rateCards = await RateCard.find(filter).sort({ paperSize: 1, colorMode: 1, sides: 1, paperType: 1 });
        }
        res.status(200).json({ success: true, count: rateCards.length, data: rateCards });
    } catch (error) {
        next(error);
    }
};

// @desc    Add or upsert finishing rate for shop
// @route   POST /api/vendors/finishing-rates
// @access  Private/Vendor Owner or Admin
const addFinishingRate = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(req.user.role === 'admin' ? {} : { ownerId: req.user.id });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const { finishingType, price, isActive } = req.body;

        if (!ALLOWED_FINISHING_TYPES.includes(finishingType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid finishing service. Supported: ${ALLOWED_FINISHING_TYPES.join(', ')}`
            });
        }

        const priceNum = Number(price);
        if (price === undefined || price === null || isNaN(priceNum) || priceNum < 0) {
            return res.status(400).json({ success: false, message: 'Finishing price must be a non-negative number' });
        }

        const existingFinishingRate = await FinishingRate.findOne({
            vendorId: vendor._id,
            finishingType
        });

        const previousValue = existingFinishingRate ? existingFinishingRate.toObject() : null;
        const action = existingFinishingRate ? 'UPDATE' : 'CREATE';

        const finishingRate = await FinishingRate.findOneAndUpdate(
            {
                vendorId: vendor._id,
                finishingType
            },
            {
                vendorId: vendor._id,
                finishingType,
                price: Number(priceNum.toFixed(2)),
                isActive: isActive !== undefined ? Boolean(isActive) : true
            },
            { upsert: true, new: true, runValidators: true }
        );

        // Record Rate Audit Log
        await RateAuditLog.create({
            vendorId: vendor._id,
            rateType: 'finishing',
            rateId: finishingRate._id,
            action,
            previousValue,
            newValue: finishingRate.toObject(),
            changedBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: existingFinishingRate ? 'Finishing rate updated successfully' : 'Finishing rate added successfully',
            data: finishingRate
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Edit an existing finishing rate by ID
// @route   PUT /api/vendors/finishing-rates/:id
// @access  Private/Vendor Owner or Admin
const updateFinishingRate = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(req.user.role === 'admin' ? {} : { ownerId: req.user.id });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const finishingRate = await FinishingRate.findOne({
            _id: req.params.id,
            vendorId: vendor._id
        });

        if (!finishingRate) {
            return res.status(404).json({ success: false, message: 'Finishing rate not found' });
        }

        const previousValue = finishingRate.toObject();
        const { price, isActive } = req.body;

        if (price !== undefined) {
            const priceNum = Number(price);
            if (isNaN(priceNum) || priceNum < 0) {
                return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
            }
            finishingRate.price = Number(priceNum.toFixed(2));
        }

        let isAction = 'UPDATE';
        if (isActive !== undefined) {
            const nextActive = Boolean(isActive);
            if (finishingRate.isActive !== nextActive) {
                isAction = nextActive ? 'ACTIVATE' : 'DEACTIVATE';
            }
            finishingRate.isActive = nextActive;
        }

        await finishingRate.save();

        // Record Rate Audit Log
        await RateAuditLog.create({
            vendorId: vendor._id,
            rateType: 'finishing',
            rateId: finishingRate._id,
            action: isAction,
            previousValue,
            newValue: finishingRate.toObject(),
            changedBy: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Finishing rate updated successfully',
            data: finishingRate
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete finishing rate for shop
// @route   DELETE /api/vendors/finishing-rates/:id
// @access  Private/Vendor Owner or Admin
const deleteFinishingRate = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne(req.user.role === 'admin' ? {} : { ownerId: req.user.id });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const finishingRate = await FinishingRate.findOneAndDelete({
            _id: req.params.id,
            vendorId: vendor._id
        });

        if (!finishingRate) {
            return res.status(404).json({ success: false, message: 'Finishing rate not found' });
        }

        // Record Rate Audit Log
        await RateAuditLog.create({
            vendorId: vendor._id,
            rateType: 'finishing',
            rateId: finishingRate._id,
            action: 'DELETE',
            previousValue: finishingRate.toObject(),
            newValue: null,
            changedBy: req.user.id
        });

        res.status(200).json({ success: true, message: 'Finishing rate removed successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get finishing rates for shop
// @route   GET /api/vendors/finishing-rates
// @access  Private/Vendor Owner or Staff or Admin
const getFinishingRates = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({
            $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }]
        });
        if (!vendor && req.user.role !== 'admin') return res.status(404).json({ success: false, message: 'Vendor shop not found' });

        const vendorId = vendor ? vendor._id : req.query.vendorId;
        const filter = { vendorId };
        if (req.query.activeOnly === 'true') {
            filter.isActive = { $ne: false };
        }

        let finishingRates = await FinishingRate.find(filter).sort({ finishingType: 1 });
        if (finishingRates.length === 0 && !req.query.activeOnly) {
            await seedDefaultRatesForVendor(vendorId);
            finishingRates = await FinishingRate.find(filter).sort({ finishingType: 1 });
        }
        res.status(200).json({ success: true, count: finishingRates.length, data: finishingRates });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createVendor,
    getMyVendor,
    updateMyVendor,
    getVendors,
    getVendorById,
    getVendorScheduleAndAvailability,
    addRateCard,
    updateRateCard,
    deleteRateCard,
    getRateCards,
    addFinishingRate,
    updateFinishingRate,
    deleteFinishingRate,
    getFinishingRates,
    calculateDistanceMeters,
    isShopOpenNow
};