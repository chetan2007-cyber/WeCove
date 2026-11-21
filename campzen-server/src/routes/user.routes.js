const express = require('express');
const {
    getMe,
    updateMe,
    deleteMe,
    getOnboardingStatus,
    updateOnboardingStatus,
    resetOnboardingTutorial
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply 'protect' middleware to all routes in this file
router.use(protect);

router.get('/me', getMe);
router.put('/me', updateMe);
router.delete('/me', deleteMe);

// Onboarding status and interactive walkthrough tutorial routes
router.get('/onboarding-status', getOnboardingStatus);
router.post('/onboarding-status', updateOnboardingStatus);
router.post('/reset-tutorial', resetOnboardingTutorial);

module.exports = router;