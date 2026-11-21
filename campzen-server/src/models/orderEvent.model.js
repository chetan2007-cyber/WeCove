const mongoose = require('mongoose');

const orderEventSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    fromStatus: { type: String }, // Can be null for the very first 'CREATED' event
    toStatus: { type: String, required: true },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Who triggered this change? (Student, Vendor Staff, System Admin)
        required: true
    },
    note: { type: String } // Optional context, e.g., "Paper jam, delayed by 10 mins"
}, {
    timestamps: true
});

// Index to quickly pull the timeline for a specific order
orderEventSchema.index({ orderId: 1, createdAt: 1 });

module.exports = mongoose.model('OrderEvent', orderEventSchema);