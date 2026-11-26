const express = require('express');
const {
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
    registerShopDevice,
    agentHeartbeat,
    getAgentPendingJobs,
    updateAgentJobStatus,
    toggleShopAvailability,
    updateBusinessHours,
    saveConfiguredPrinters
} = require('../controllers/vendor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

// Student Route: Search all shops (Allowed for all logged-in roles)
router.get('/', getVendors);

// Vendor Routes: Manage own shop (Protected by Role)
router.post('/', authorize('vendor_owner', 'admin'), createVendor);
router.get('/me', authorize('vendor_owner', 'vendor_staff', 'admin'), getMyVendor);
router.put('/me', authorize('vendor_owner', 'admin'), updateMyVendor);

// Vendor Rate Cards & Finishing Rates
router.post('/rate-cards', authorize('vendor_owner', 'admin'), addRateCard);
router.put('/rate-cards', authorize('vendor_owner', 'admin'), addRateCard);
router.get('/rate-cards', authorize('vendor_owner', 'vendor_staff', 'admin'), getRateCards);
router.put('/rate-cards/:id', authorize('vendor_owner', 'admin'), updateRateCard);
router.delete('/rate-cards/:id', authorize('vendor_owner', 'admin'), deleteRateCard);

router.post('/finishing-rates', authorize('vendor_owner', 'admin'), addFinishingRate);
router.put('/finishing-rates', authorize('vendor_owner', 'admin'), addFinishingRate);
router.get('/finishing-rates', authorize('vendor_owner', 'vendor_staff', 'admin'), getFinishingRates);
router.put('/finishing-rates/:id', authorize('vendor_owner', 'admin'), updateFinishingRate);
router.delete('/finishing-rates/:id', authorize('vendor_owner', 'admin'), deleteFinishingRate);

// Windows Vendor Desktop & Print Agent Endpoints
router.post('/devices/register', authorize('vendor_owner', 'admin'), registerShopDevice);
router.post('/agent/heartbeat', authorize('vendor_owner', 'vendor_staff', 'admin'), agentHeartbeat);
router.get('/agent/pending-jobs', authorize('vendor_owner', 'vendor_staff', 'admin'), getAgentPendingJobs);
router.post('/agent/jobs/:id/status', authorize('vendor_owner', 'vendor_staff', 'admin'), updateAgentJobStatus);
router.post('/availability/toggle', authorize('vendor_owner', 'admin'), toggleShopAvailability);
router.put('/business-hours', authorize('vendor_owner', 'admin'), updateBusinessHours);
router.post('/printers', authorize('vendor_owner', 'vendor_staff', 'admin'), saveConfiguredPrinters);

// Public / Student Shop Details & Availability (placed after named subroutes)
router.get('/:id/availability', getVendorScheduleAndAvailability);
router.get('/:id', getVendorById);

module.exports = router;
