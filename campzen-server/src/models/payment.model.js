const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gateway: {
        type: String,
        enum: ['razorpay', 'stripe', 'wallet', 'cash', 'mock'],
        default: 'mock'
    },
    gatewayPaymentId: { type: String }, // The ID returned by Razorpay/Stripe
    method: { type: String }, // UPI, Credit Card, Netbanking
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
        type: String,
        enum: ['pending', 'successful', 'failed', 'refunded'],
        default: 'pending'
    },
    failureReason: { type: String },
    paidAt: { type: Date }
}, {
    timestamps: true
});

paymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);