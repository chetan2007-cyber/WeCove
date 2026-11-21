const mongoose = require('mongoose');

const creatorLedgerEntrySchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator ID is required']
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrintableResource',
        required: [true, 'Resource ID is required']
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'Order reference is required']
    },
    printJobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrintJob',
        required: [true, 'PrintJob reference is required']
    },
    eligiblePages: {
        type: Number,
        required: [true, 'Eligible content pages count is required'],
        min: [1, 'Must have at least 1 eligible page']
    },
    copies: {
        type: Number,
        required: [true, 'Copies count is required'],
        min: [1, 'Must have at least 1 copy']
    },
    ratePerPage: {
        type: Number,
        required: [true, 'Royalty rate per page is required'],
        min: 0
    },
    grossRoyalty: {
        type: Number,
        required: [true, 'Gross royalty amount is required'],
        min: 0
    },
    status: {
        type: String,
        enum: ['PENDING', 'ELIGIBLE', 'PROCESSING', 'PAID', 'REVERSED', 'ON_HOLD'],
        default: 'ELIGIBLE'
    },
    settlementReference: {
        type: String,
        trim: true
    },
    settledAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Idempotency: each print job for a resource can generate at most ONE royalty ledger entry
creatorLedgerEntrySchema.index({ resourceId: 1, printJobId: 1 }, { unique: true });
creatorLedgerEntrySchema.index({ creatorId: 1, status: 1, createdAt: -1 });
creatorLedgerEntrySchema.index({ orderId: 1 });

module.exports = mongoose.model('CreatorLedgerEntry', creatorLedgerEntrySchema);
