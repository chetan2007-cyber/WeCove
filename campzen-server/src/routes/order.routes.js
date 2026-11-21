const express = require('express');
const {
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
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

// Student routes
router.post('/', createOrder);
router.get('/', getMyOrders);
router.put('/:id/edit', editOrderController);

// Vendor queue & intake (Vendor Owner, Staff, Admin)
router.get('/vendor', authorize('vendor_owner', 'vendor_staff', 'admin'), getVendorOrders);

// Vendor Completed Order Archiving & Restore (Owner and Admin only)
router.post('/vendor/archive-completed', authorize('vendor_owner', 'admin'), archiveCompletedOrders);
router.post('/vendor/:id/restore', authorize('vendor_owner', 'admin'), restoreArchivedOrder);
router.post('/vendor/restore/:id', authorize('vendor_owner', 'admin'), restoreArchivedOrder);

// Single order details (Protected by internal role/ownership checks)
router.get('/:id', getOrderById);
router.get('/:id/information-sheet', getInformationSheetController);

// Order fulfillment updates (Vendor Owner, Staff, Admin)
router.put('/:id/status', authorize('vendor_owner', 'vendor_staff', 'admin'), updateOrderStatus);
router.post('/:id/pickup', authorize('vendor_owner', 'vendor_staff', 'admin'), verifyPickup);
router.get('/:id/print-preview', authorize('vendor_owner', 'vendor_staff', 'admin'), printPreviewController);
router.post('/:id/print', authorize('vendor_owner', 'vendor_staff', 'admin'), printOrderController);
router.post('/:id/print-confirm-qc', authorize('vendor_owner', 'vendor_staff', 'admin'), confirmPhysicalPrintController);
router.post('/:id/print-reconcile', authorize('vendor_owner', 'vendor_staff', 'admin'), reconcilePrintJobController);
router.post('/:id/print-retry', authorize('vendor_owner', 'vendor_staff', 'admin'), retryPrintJobController);

// Cancel order (Student owner or Admin)
router.post('/:id/cancel', cancelOrder);

module.exports = router;
