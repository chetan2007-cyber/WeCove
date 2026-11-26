const express = require('express');
const {
    adminLogin,
    getPlatformOverview,
    getVendors,
    updateVendorStatus,
    getAllOrders,
    getPrintAgents,
    getPlatformHealth,
    getAuditLogs,
    inspectVendorSupport
} = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/admin.middleware');

const router = express.Router();

// Public Admin Login (Rate-limited, Allowlist enforced)
router.post('/auth/login', adminLogin);

// Protected Admin Routes (Require valid admin token & email allowlist)
router.use(requireAdmin);

router.get('/overview', getPlatformOverview);
router.get('/vendors', getVendors);
router.put('/vendors/:id/status', updateVendorStatus);
router.get('/vendors/:id/inspect', inspectVendorSupport);
router.get('/orders', getAllOrders);
router.get('/agents', getPrintAgents);
router.get('/health', getPlatformHealth);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
