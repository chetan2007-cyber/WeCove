const PrintableResource = require('../models/printableResource.model');
const CreatorLedgerEntry = require('../models/creatorLedgerEntry.model');
const Document = require('../models/document.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');
const College = require('../models/college.model');

// Helper: Build college visibility filter based on requesting user
const buildResourceVisibilityFilter = (user) => {
    if (user?.role === 'admin') {
        return {};
    }

    const conditions = [];

    // Creator can always see their own uploaded resources
    if (user) {
        conditions.push({ creatorId: user._id || user.id });
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

// @desc    Get all published study resources (Public marketplace)
// @route   GET /api/study-resources
// @access  Public / Optional Auth
const getPrintableResources = async (req, res, next) => {
    try {
        const { categoryId, course, department, semester, subject, search, collegeId } = req.query;

        const baseQuery = {
            moderationStatus: 'PUBLISHED'
        };

        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            const children = await Category.find({ parentId: categoryId });
            const catIds = [categoryId, ...children.map(c => c._id)];
            baseQuery.categoryId = { $in: catIds };
        }

        if (collegeId && mongoose.Types.ObjectId.isValid(collegeId)) {
            baseQuery.collegeId = collegeId;
        }

        if (course) baseQuery.course = { $regex: course, $options: 'i' };
        if (department) baseQuery.department = { $regex: department, $options: 'i' };
        if (subject) baseQuery.subject = { $regex: subject, $options: 'i' };
        if (semester) baseQuery.semester = Number(semester);

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            baseQuery.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { subject: searchRegex },
                { department: searchRegex },
                { course: searchRegex }
            ];
        }

        // Apply server-side college visibility rules
        const visibilityFilter = buildResourceVisibilityFilter(req.user);
        const finalQuery = Object.keys(visibilityFilter).length > 0
            ? { $and: [baseQuery, visibilityFilter] }
            : baseQuery;

        const resources = await PrintableResource.find(finalQuery)
            .sort({ createdAt: -1 })
            .populate('creatorId', 'name avatar collegeName department year')
            .populate('categoryId', 'name slug icon')
            .populate('collegeId', 'name city')
            .populate('visibleCollegeIds', 'name city');

        res.status(200).json({
            success: true,
            count: resources.length,
            data: resources
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single study resource details
// @route   GET /api/study-resources/:id
// @access  Public / Optional Auth
const getPrintableResourceById = async (req, res, next) => {
    try {
        const resource = await PrintableResource.findById(req.params.id)
            .populate('creatorId', 'name avatar collegeName department year course')
            .populate('categoryId', 'name slug icon')
            .populate('collegeId', 'name location city')
            .populate('visibleCollegeIds', 'name city');

        if (!resource) {
            return res.status(404).json({ success: false, message: 'Study resource not found' });
        }

        // Only creator or admin can view unpublished resources
        const isPublished = resource.moderationStatus === 'PUBLISHED';
        const isOwner = req.user && (
            resource.creatorId._id?.toString() === req.user.id?.toString() ||
            resource.creatorId.toString() === req.user.id?.toString()
        );
        const isAdmin = req.user && req.user.role === 'admin';

        if (!isPublished && !isOwner && !isAdmin) {
            return res.status(404).json({ success: false, message: 'Resource not available' });
        }

        // Enforce strict college visibility check for buyers
        if (!isAdmin && !isOwner) {
            const visType = resource.visibilityType || 'MY_COLLEGE_ONLY';
            const userCollegeId = req.user?.collegeId?.toString();
            const resourceCollegeId = resource.collegeId?._id?.toString() || resource.collegeId?.toString();

            if (visType === 'MY_COLLEGE_ONLY') {
                if (!userCollegeId || resourceCollegeId !== userCollegeId) {
                    return res.status(404).json({ success: false, message: 'Study resource not found' });
                }
            } else if (visType === 'SELECTED_COLLEGES') {
                const isEligible = userCollegeId && Array.isArray(resource.visibleCollegeIds) &&
                    resource.visibleCollegeIds.some(col => {
                        const cId = col._id ? col._id.toString() : col.toString();
                        return cId === userCollegeId;
                    });
                if (!isEligible) {
                    return res.status(404).json({ success: false, message: 'Study resource not found' });
                }
            }
        }

        res.status(200).json({
            success: true,
            data: resource
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload / create study resource
// @route   POST /api/study-resources
// @access  Private (Student)
const createPrintableResource = async (req, res, next) => {
    try {
        const {
            documentId,
            categoryId,
            title,
            description,
            course,
            department,
            semester,
            subject,
            language,
            previewPages,
            royaltyRatePerPage = 0.10,
            rightsDeclaration,
            isDraft,
            collegeId,
            visibilityType = 'MY_COLLEGE_ONLY',
            visibleCollegeIds = []
        } = req.body;

        if (!documentId || !categoryId || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'documentId, categoryId, title, and description are required'
            });
        }

        const document = await Document.findById(documentId);
        if (!document || document.isDeleted) {
            return res.status(404).json({ success: false, message: 'Underlying document not found' });
        }

        if (document.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to publish this document' });
        }

        if (document.processingStatus !== 'completed' || !document.pageCount) {
            return res.status(400).json({ success: false, message: 'Document is still processing or has invalid page count' });
        }

        const category = await Category.findById(categoryId);
        if (!category || !category.isActive) {
            return res.status(400).json({ success: false, message: 'Selected category is invalid or inactive' });
        }

        if (!category.applicableListingTypes.includes('PRINTABLE_RESOURCE')) {
            return res.status(400).json({
                success: false,
                message: `Category '${category.name}' does not permit printable study resources`
            });
        }

        if (!rightsDeclaration || !rightsDeclaration.hasAccepted) {
            return res.status(400).json({
                success: false,
                message: 'You must confirm ownership and educational distribution rights before submitting this resource'
            });
        }

        const targetCollegeId = collegeId || req.user.collegeId;

        // Validate visibility scope
        let effectiveVisibleCollegeIds = [];
        if (visibilityType === 'MY_COLLEGE_ONLY') {
            if (targetCollegeId) {
                effectiveVisibleCollegeIds = [targetCollegeId];
            }
        } else if (visibilityType === 'SELECTED_COLLEGES') {
            if (!Array.isArray(visibleCollegeIds) || visibleCollegeIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select at least one eligible college for this resource'
                });
            }
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

        // Compute valid preview pages (default to first 2 pages)
        let validPreviewPages = [1];
        if (document.pageCount >= 2) validPreviewPages.push(2);

        if (Array.isArray(previewPages) && previewPages.length > 0) {
            validPreviewPages = previewPages.filter(p => p >= 1 && p <= document.pageCount);
        }

        const initialStatus = isDraft ? 'DRAFT' : 'SUBMITTED';

        const resource = await PrintableResource.create({
            creatorId: req.user.id,
            documentId: document._id,
            categoryId: category._id,
            collegeId: targetCollegeId,
            visibilityType,
            visibleCollegeIds: effectiveVisibleCollegeIds,
            title: title.trim(),
            description: description.trim(),
            course: course ? course.trim() : undefined,
            department: department ? department.trim() : undefined,
            semester: semester ? Number(semester) : undefined,
            subject: subject ? subject.trim() : undefined,
            language: language ? language.trim() : 'English',
            pageCount: document.pageCount,
            previewPages: validPreviewPages,
            royaltyRatePerPage: Math.max(0, Number(royaltyRatePerPage) || 0.10),
            rightsDeclaration: {
                hasAccepted: true,
                agreedAt: new Date(),
                statement: rightsDeclaration.statement || 'I confirm I am the original creator or authorized distributor of these study notes.'
            },
            moderationStatus: initialStatus,
            listingType: 'PRINTABLE_RESOURCE'
        });

        res.status(201).json({
            success: true,
            data: resource
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update printable study resource details & visibility
// @route   PUT /api/study-resources/:id
// @access  Private (Creator or Admin)
const updatePrintableResource = async (req, res, next) => {
    try {
        const resource = await PrintableResource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        if (resource.creatorId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this resource' });
        }

        if (['ARCHIVED', 'SUSPENDED'].includes(resource.moderationStatus)) {
            return res.status(400).json({ success: false, message: 'Cannot edit an archived or suspended resource' });
        }

        const allowedFields = ['title', 'description', 'course', 'department', 'semester', 'subject', 'language', 'royaltyRatePerPage'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                resource[field] = req.body[field];
            }
        });

        if (req.body.categoryId) {
            const cat = await Category.findById(req.body.categoryId);
            if (cat && cat.isActive && cat.applicableListingTypes.includes('PRINTABLE_RESOURCE')) {
                resource.categoryId = cat._id;
            }
        }

        // Update visibility scope
        if (req.body.visibilityType !== undefined) {
            const allowedVisibility = ['MY_COLLEGE_ONLY', 'SELECTED_COLLEGES', 'ALL_COLLEGES'];
            if (!allowedVisibility.includes(req.body.visibilityType)) {
                return res.status(400).json({ success: false, message: 'Invalid visibilityType' });
            }
            resource.visibilityType = req.body.visibilityType;
            if (resource.visibilityType === 'MY_COLLEGE_ONLY') {
                resource.visibleCollegeIds = resource.collegeId ? [resource.collegeId] : [];
            } else if (resource.visibilityType === 'SELECTED_COLLEGES') {
                const targetColleges = req.body.visibleCollegeIds || resource.visibleCollegeIds;
                if (!Array.isArray(targetColleges) || targetColleges.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please select at least one eligible college for this resource'
                    });
                }
                const validColleges = await College.find({ _id: { $in: targetColleges }, isActive: true });
                if (validColleges.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'None of the selected colleges are valid active campuses'
                    });
                }
                resource.visibleCollegeIds = validColleges.map(c => c._id);
            } else if (resource.visibilityType === 'ALL_COLLEGES') {
                resource.visibleCollegeIds = [];
            }
        } else if (req.body.visibleCollegeIds !== undefined && resource.visibilityType === 'SELECTED_COLLEGES') {
            if (!Array.isArray(req.body.visibleCollegeIds) || req.body.visibleCollegeIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select at least one eligible college for this resource'
                });
            }
            const validColleges = await College.find({ _id: { $in: req.body.visibleCollegeIds }, isActive: true });
            if (validColleges.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'None of the selected colleges are valid active campuses'
                });
            }
            resource.visibleCollegeIds = validColleges.map(c => c._id);
        }

        await resource.save();

        res.status(200).json({
            success: true,
            data: resource
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Moderate study resource (Admin review & approval)
// @route   PUT /api/study-resources/:id/moderate
// @access  Private (Admin)
const moderatePrintableResource = async (req, res, next) => {
    try {
        const { action, notes } = req.body;
        const resourceId = req.params.id;

        const resource = await PrintableResource.findById(resourceId);
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        const ALLOWED_STATUS_MAP = {
            'APPROVE': 'APPROVED',
            'PUBLISH': 'PUBLISHED',
            'REJECT': 'REJECTED',
            'SUSPEND': 'SUSPENDED'
        };

        const targetStatus = ALLOWED_STATUS_MAP[action];
        if (!targetStatus) {
            return res.status(400).json({
                success: false,
                message: `Invalid action '${action}'. Must be APPROVE, PUBLISH, REJECT, or SUSPEND.`
            });
        }

        resource.moderationStatus = targetStatus;
        resource.moderationNotes = notes || undefined;
        resource.moderatedBy = req.user.id;
        resource.moderatedAt = new Date();
        await resource.save();

        res.status(200).json({
            success: true,
            message: `Resource status updated to ${targetStatus}`,
            data: resource
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get logged in creator's study resources
// @route   GET /api/study-resources/my/resources
// @access  Private (Student)
const getMyCreatedResources = async (req, res, next) => {
    try {
        const resources = await PrintableResource.find({ creatorId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('categoryId', 'name slug icon');

        res.status(200).json({
            success: true,
            count: resources.length,
            data: resources
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get creator royalty earnings dashboard & ledger
// @route   GET /api/study-resources/my/royalties
// @access  Private (Student)
const getCreatorRoyaltyDashboard = async (req, res, next) => {
    try {
        const creatorId = req.user.id;

        const ledgerEntries = await CreatorLedgerEntry.find({ creatorId })
            .sort({ createdAt: -1 })
            .populate('resourceId', 'title pageCount')
            .populate('orderId', 'orderNumber status createdAt');

        let totalEligibleRoyalty = 0;
        let totalPaidRoyalty = 0;
        let totalPendingRoyalty = 0;
        let totalPrintedPages = 0;
        let totalPrintsCount = 0;

        ledgerEntries.forEach(entry => {
            if (entry.status === 'ELIGIBLE') {
                totalEligibleRoyalty += entry.grossRoyalty;
                totalPrintedPages += (entry.eligiblePages * entry.copies);
                totalPrintsCount += entry.copies;
            } else if (entry.status === 'PAID') {
                totalPaidRoyalty += entry.grossRoyalty;
                totalPrintedPages += (entry.eligiblePages * entry.copies);
                totalPrintsCount += entry.copies;
            } else if (entry.status === 'PENDING') {
                totalPendingRoyalty += entry.grossRoyalty;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                totalEligibleRoyalty: Number(totalEligibleRoyalty.toFixed(2)),
                totalPaidRoyalty: Number(totalPaidRoyalty.toFixed(2)),
                totalPendingRoyalty: Number(totalPendingRoyalty.toFixed(2)),
                totalPrintsCount,
                totalPrintedPages,
                ledgerEntries
            }
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delist / archive printable study resource
// @route   DELETE /api/study-resources/:id
// @access  Private (Creator or Admin)
const delistPrintableResource = async (req, res, next) => {
    try {
        const resource = await PrintableResource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        if (resource.creatorId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delist this resource' });
        }

        resource.moderationStatus = 'ARCHIVED';
        await resource.save();

        res.status(200).json({
            success: true,
            message: 'Resource successfully archived and delisted',
            data: resource
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPrintableResources,
    getPrintableResourceById,
    createPrintableResource,
    updatePrintableResource,
    moderatePrintableResource,
    getMyCreatedResources,
    getCreatorRoyaltyDashboard,
    delistPrintableResource
};
