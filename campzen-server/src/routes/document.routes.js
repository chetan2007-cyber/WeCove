const express = require('express');
const {
    uploadDocument,
    getDocumentById,
    getMyDocuments,
    deleteDocument,
    getPagePreview,
    downloadDocumentFile
} = require('../controllers/document.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(protect);

// Document Vault: List current student documents
router.get('/', getMyDocuments);

// Upload new document
router.post('/upload', (req, res, next) => {
    const uploadSingle = upload.single('file');

    uploadSingle(req, res, function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, uploadDocument);

// Get single document metadata
router.get('/:id', getDocumentById);

// Stream / download document file
router.get('/:id/file', downloadDocumentFile);

// Rendered page preview image
router.get('/:id/pages/:pageNumber/preview', getPagePreview);

// Delete document from vault
router.delete('/:id', deleteDocument);

module.exports = router;