const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const collegeRoutes = require('./college.routes');
const vendorRoutes = require('./vendor.routes');
const documentRoutes = require('./document.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const stationeryRoutes = require('./stationery.routes');
const categoryRoutes = require('./category.routes');
const resaleRoutes = require('./resale.routes');
const printableResourceRoutes = require('./printableResource.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

// Mount feature routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/colleges', collegeRoutes);
router.use('/vendors', vendorRoutes);
router.use('/documents', documentRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/stationery', stationeryRoutes);
router.use('/categories', categoryRoutes);
router.use('/resale', resaleRoutes);
router.use('/study-resources', printableResourceRoutes);
router.use('/reports', reportRoutes);

// Base API route to verify the router is mounted correctly
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Kami API Router is working!'
    });
});

module.exports = router;