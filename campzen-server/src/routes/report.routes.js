const express = require('express');
const {
    submitReport,
    getReports,
    resolveReport
} = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, submitReport);
router.get('/', protect, authorize('admin'), getReports);
router.put('/:id/resolve', protect, authorize('admin'), resolveReport);

module.exports = router;
