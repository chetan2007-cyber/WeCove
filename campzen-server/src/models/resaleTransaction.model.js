const mongoose = require('mongoose');

const resaleTransactionSchema = new mongoose.Schema({
    listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentListing',
        required: [true, 'Listing ID is required']
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Seller ID is required']
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Buyer ID is required']
    },
    price: {
        type: Number,
        required: [true, 'Agreed price is required'],
        min: 0
    },
    handoverCode: {
        type: String,
        required: [true, 'Handover OTP is required']
    },
    handoverLocation: {
        type: String,
        trim: true
    },
    handoverNotes: {
        type: String,
        trim: true,
        maxlength: 500
    },
    paymentMethod: {
        type: String,
        enum: ['CASH_ON_HANDOVER', 'CAMPUS_UPI'],
        default: 'CASH_ON_HANDOVER'
    },
    status: {
        type: String,
        enum: ['RESERVED', 'COMPLETED', 'CANCELLED'],
        default: 'RESERVED'
    },
    reservedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    cancelledReason: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

resaleTransactionSchema.index({ sellerId: 1, status: 1 });
resaleTransactionSchema.index({ buyerId: 1, status: 1 });
resaleTransactionSchema.index({ listingId: 1, status: 1 });

module.exports = mongoose.model('ResaleTransaction', resaleTransactionSchema);
