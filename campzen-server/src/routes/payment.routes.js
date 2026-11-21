const express = require('express');
const { createMockIntent, paymentWebhook } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/mock-intent', protect, createMockIntent);
router.post('/webhook', paymentWebhook); // Public, because the Gateway sends this, not the User!

module.exports = router;