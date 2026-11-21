const express = require('express');
const { getColleges, createCollege } = require('../controllers/college.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', getColleges);
router.post('/', protect, authorize('admin'), createCollege);

module.exports = router;