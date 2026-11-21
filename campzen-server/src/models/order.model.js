const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    type: {
        type: String,
        enum: ['print', 'stationery', 'project', 'mixed'],
        required: true
    },
    status: {
        type: String,
        enum: [
            'CREATED', 'PAYMENT_PENDING', 'PAID', 'SENT_TO_SHOP',
            'ACCEPTED', 'PRINTING', 'FINISHING', 'READY',
            'OUT_FOR_DELIVERY', 'COMPLETED', 'REJECTED',
            'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'EXPIRED'
        ],
        default: 'CREATED'
    },

    // Financial breakdown
    subtotal: { type: Number, required: true },
    creatorRoyalty: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    schedulingFee: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // Fulfillment details
    fulfillmentType: {
        type: String,
        enum: ['pickup', 'delivery'],
        required: true
    },
    pickupSlotStart: { type: Date },
    pickupSlotEnd: { type: Date },
    deliveryAddressId: { type: mongoose.Schema.Types.ObjectId }, // Points to a sub-doc in User
    pickupCode: { type: String }, // E.g., a 4-digit OTP generated upon payment
    estimatedReadyAt: { type: Date },

    // Study Resource reference (when printing a published marketplace resource)
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrintableResource',
        default: null
    },

    // Information Sheet Metadata (1-5 pages: Plain, 6+ pages: Creative)
    informationSheetType: {
        type: String,
        enum: ['plain', 'creative', 'none'],
        default: 'plain'
    },
    informationSheetKey: {
        type: String
    },
    informationSheetGeneratedAt: {
        type: Date
    },

    // 60-Second Order Editing Window
    editWindowEndsAt: {
        type: Date,
        index: true
    },
    orderRevision: {
        type: Number,
        default: 1
    },
    printEligibleAt: {
        type: Date,
        index: true
    },
    editable: {
        type: Boolean,
        default: true
    },
    editHistory: [{
        revision: { type: Number },
        editedAt: { type: Date, default: Date.now },
        changes: { type: mongoose.Schema.Types.Mixed },
        previousPrice: { type: Number },
        revisedPrice: { type: Number }
    }],

    notes: { type: String, trim: true, maxlength: 500 },
    cancelledReason: { type: String, trim: true },

    // Physical stationery items (for stationery & mixed orders)
    stationeryItems: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'StationeryItem', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true }
    }],

    // Archiving & Completed Order Lifecycle Management
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    },
    archivedAt: {
        type: Date
    },
    archivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    archiveBatchId: {
        type: String,
        index: true
    }
}, {
    timestamps: true
});

// Create indexes to optimize searching for a user's orders or a shop's active queue
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ vendorId: 1, isArchived: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
