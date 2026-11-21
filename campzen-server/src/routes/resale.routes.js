const express = require('express');
const {
    getResaleListings,
    getResaleListingById,
    createResaleListing,
    updateResaleListing,
    delistResaleListing,
    reserveResaleListing,
    verifyResaleHandover,
    cancelResaleReservation,
    getMyResaleListings,
    getMyResalePurchases
} = require('../controllers/resale.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');

const router = express.Router();

// Marketplace browsing (with campus visibility filtering)
router.get('/listings', optionalProtect, getResaleListings);
router.get('/listings/:id', optionalProtect, getResaleListingById);

// Protected student seller & buyer operations
router.post('/listings', protect, createResaleListing);
router.put('/listings/:id', protect, updateResaleListing);
router.delete('/listings/:id', protect, delistResaleListing);

// Campus handover & reservation lifecycle
router.post('/listings/:id/reserve', protect, reserveResaleListing);
router.post('/transactions/:id/verify-handover', protect, verifyResaleHandover);
router.post('/transactions/:id/cancel', protect, cancelResaleReservation);

// Student dashboard
router.get('/my/listings', protect, getMyResaleListings);
router.get('/my/purchases', protect, getMyResalePurchases);

module.exports = router;
