const MarketplaceReport = require('../models/marketplaceReport.model');
const PrintableResource = require('../models/printableResource.model');
const StudentListing = require('../models/studentListing.model');
const StationeryItem = require('../models/stationeryItem.model');
const mongoose = require('mongoose');

// @desc    Submit a report for copyright violation, misrepresented item, etc.
// @route   POST /api/reports
// @access  Private
const submitReport = async (req, res, next) => {
    try {
        const { targetType, targetId, reason, description } = req.body;

        if (!targetType || !targetId || !reason || !description) {
            return res.status(400).json({
                success: false,
                message: 'targetType, targetId, reason, and description are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({ success: false, message: 'Invalid targetId format' });
        }

        // Verify target existence
        let exists = false;
        if (targetType === 'PRINTABLE_RESOURCE') {
            exists = await PrintableResource.findById(targetId);
        } else if (targetType === 'STUDENT_RESALE') {
            exists = await StudentListing.findById(targetId);
        } else if (targetType === 'VENDOR_PRODUCT') {
            exists = await StationeryItem.findById(targetId);
        }

        if (!exists) {
            return res.status(404).json({ success: false, message: 'Reported item not found' });
        }

        const report = await MarketplaceReport.create({
            reporterId: req.user.id,
            targetType,
            targetId,
            reason,
            description: description.trim(),
            status: 'PENDING'
        });

        res.status(201).json({
            success: true,
            message: 'Report submitted for moderation review',
            data: report
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get reports list (Admin)
// @route   GET /api/reports
// @access  Private (Admin)
const getReports = async (req, res, next) => {
    try {
        const { status, targetType, reason } = req.query;
        const query = {};
        if (status) query.status = status;
        if (targetType) query.targetType = targetType;
        if (reason) query.reason = reason;

        const reports = await MarketplaceReport.find(query)
            .sort({ createdAt: -1 })
            .populate('reporterId', 'name email role');

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Resolve or dismiss report (Admin)
// @route   PUT /api/reports/:id/resolve
// @access  Private (Admin)
const resolveReport = async (req, res, next) => {
    try {
        const { status, actionTaken, adminNotes } = req.body;
        const report = await MarketplaceReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        report.status = status || 'RESOLVED';
        report.actionTaken = actionTaken || 'NONE';
        report.adminNotes = adminNotes || undefined;
        report.resolvedBy = req.user.id;
        report.resolvedAt = new Date();

        // Enforce moderation action on target
        if (actionTaken === 'LISTING_SUSPENDED' || actionTaken === 'LISTING_REMOVED') {
            if (report.targetType === 'PRINTABLE_RESOURCE') {
                await PrintableResource.findByIdAndUpdate(report.targetId, {
                    $set: { moderationStatus: 'SUSPENDED', moderationNotes: adminNotes }
                });
            } else if (report.targetType === 'STUDENT_RESALE') {
                await StudentListing.findByIdAndUpdate(report.targetId, {
                    $set: { status: 'DELISTED' }
                });
            } else if (report.targetType === 'VENDOR_PRODUCT') {
                await StationeryItem.findByIdAndUpdate(report.targetId, {
                    $set: { isAvailable: false }
                });
            }
        }

        await report.save();

        res.status(200).json({
            success: true,
            message: `Report resolved with action: ${report.actionTaken}`,
            data: report
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    submitReport,
    getReports,
    resolveReport
};
