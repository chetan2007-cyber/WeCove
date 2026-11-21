const express = require('express');
const {
    getPrintableResources,
    getPrintableResourceById,
    createPrintableResource,
    updatePrintableResource,
    moderatePrintableResource,
    getMyCreatedResources,
    getCreatorRoyaltyDashboard,
    delistPrintableResource
} = require('../controllers/printableResource.controller');
const { protect, optionalProtect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public marketplace discovery (with campus visibility filtering)
router.get('/', optionalProtect, getPrintableResources);
router.get('/my/resources', protect, getMyCreatedResources);
router.get('/my/royalties', protect, getCreatorRoyaltyDashboard);
router.get('/:id', optionalProtect, getPrintableResourceById);

// Protected creator actions
router.post('/', protect, createPrintableResource);
router.put('/:id', protect, updatePrintableResource);
router.delete('/:id', protect, delistPrintableResource);

// Admin moderation
router.put('/:id/moderate', protect, authorize('admin'), moderatePrintableResource);

module.exports = router;
