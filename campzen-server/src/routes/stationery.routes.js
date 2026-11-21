const express = require('express');
const {
    getStationeryItems,
    getStationeryItemById,
    createStationeryItem,
    updateStationeryItem,
    deleteStationeryItem,
    getVendorProductPerformance
} = require('../controllers/stationery.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Vendor performance metrics
router.get(
    '/vendor/:vendorId/performance',
    protect,
    authorize('vendor_owner', 'vendor_staff', 'admin'),
    getVendorProductPerformance
);

// Public routes for catalog browsing
router.get('/', getStationeryItems);
router.get('/:id', getStationeryItemById);

// Protected routes for vendor inventory management
router.post(
    '/',
    protect,
    authorize('vendor_owner', 'vendor_staff', 'admin'),
    createStationeryItem
);

router.put(
    '/:id',
    protect,
    authorize('vendor_owner', 'vendor_staff', 'admin'),
    updateStationeryItem
);

router.delete(
    '/:id',
    protect,
    authorize('vendor_owner', 'admin'),
    deleteStationeryItem
);

module.exports = router;
