const Document = require('../models/document.model');
const { processDocument } = require('../services/document.service');

// @desc    Upload a new document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        const document = await Document.create({
            userId: req.user.id,
            originalFilename: req.file.originalname,
            mimeType: req.file.mimetype,
            storageKeyOriginal: req.file.filename,
            fileSize: req.file.size,
            expiresAt: expiryDate
        });

        // TRIGGER BACKGROUND PROCESSING
        processDocument(document._id);

        res.status(201).json({ success: true, data: document });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

const Order = require('../models/order.model');
const PrintJob = require('../models/printJob.model');
const Vendor = require('../models/vendor.model');

// Helper to check if requester is document owner, admin, or assigned vendor
const checkDocumentAccess = async (document, user) => {
    if (document.userId.toString() === user.id.toString() || user.role === 'admin') {
        return true;
    }
    if (user.role === 'vendor_owner' || user.role === 'vendor_staff') {
        const vendor = await Vendor.findOne({
            $or: [{ ownerId: user.id }, { staffIds: user.id }]
        });
        if (vendor) {
            const printJobs = await PrintJob.find({ documentId: document._id });
            if (printJobs && printJobs.length > 0) {
                const orderIds = printJobs.map(pj => pj.orderId);
                const order = await Order.findOne({ _id: { $in: orderIds }, vendorId: vendor._id });
                if (order) return true;
            }
        }
    }
    return false;
};

// @desc    Get document details by ID
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document || document.isDeleted) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Ownership / vendor assignment check
        const isAllowed = await checkDocumentAccess(document, req.user);
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: 'Not authorized to access this document' });
        }

        res.status(200).json({ success: true, data: document });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all documents uploaded by logged in student (Document Vault)
// @route   GET /api/documents
// @access  Private
const getMyDocuments = async (req, res, next) => {
    try {
        const documents = await Document.find({
            userId: req.user.id,
            isDeleted: { $ne: true }
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete document from vault (Soft delete)
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document || document.isDeleted) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        if (document.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
        }

        document.isDeleted = true;
        await document.save();

        res.status(200).json({ success: true, message: 'Document removed from vault' });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

const path = require('path');
const fs = require('fs');

// @desc    Get rendered page preview image
// @route   GET /api/documents/:id/pages/:pageNumber/preview
// @access  Private
const getPagePreview = async (req, res, next) => {
    try {
        const { id, pageNumber } = req.params;
        const pageNum = parseInt(pageNumber, 10);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, message: 'Invalid page number' });
        }

        const document = await Document.findById(id);
        if (!document || document.isDeleted) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Ownership / vendor assignment check
        let isAllowed = await checkDocumentAccess(document, req.user);
        
        // If not document owner or assigned vendor, check if this is a permitted sample page of a published resource
        if (!isAllowed) {
            const PrintableResource = require('../models/printableResource.model');
            const resource = await PrintableResource.findOne({
                documentId: document._id,
                moderationStatus: 'PUBLISHED'
            });
            if (resource && Array.isArray(resource.previewPages) && resource.previewPages.includes(pageNum)) {
                isAllowed = true;
            }
        }

        if (!isAllowed) {
            return res.status(403).json({ success: false, message: 'Not authorized to access preview for this page' });
        }

        const previewPath = path.join(__dirname, '../../uploads/previews', id, `page_${pageNum}.jpg`);
        if (fs.existsSync(previewPath)) {
            res.setHeader('Content-Type', 'image/jpeg');
            return res.sendFile(path.resolve(previewPath));
        }

        return res.status(404).json({ success: false, message: 'Preview not available for this page' });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Download / view original document PDF file
// @route   GET /api/documents/:id/file
// @access  Private
const downloadDocumentFile = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document || document.isDeleted) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const isAllowed = await checkDocumentAccess(document, req.user);
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: 'Not authorized to access this document' });
        }

        const filePath = path.join(__dirname, '../../uploads', document.storageKeyOriginal);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found on server' });
        }

        res.setHeader('Content-Type', document.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${document.originalFilename}"`);
        return res.sendFile(path.resolve(filePath));
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    uploadDocument,
    getDocumentById,
    getMyDocuments,
    deleteDocument,
    getPagePreview,
    downloadDocumentFile
};