const express = require('express');
const {
    signup,
    verifyEmail,
    resendOtp,
    login,
    googleLogin,
    sendOtp,
    verifyOtp,
    forgotPassword,
    resetPassword,
    refreshSession,
    logoutSession
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Public Authentication Routes
router.post('/signup', signup);
router.post('/register', signup);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshSession);
router.post('/logout', logoutSession);
router.get('/me', protect, (req, res) => res.status(200).json({ success: true, data: req.user }));

// Protected Routes (Legacy authenticated phone verification)
router.post('/send-otp', protect, sendOtp);
router.post('/verify-otp', protect, verifyOtp);

module.exports = router;