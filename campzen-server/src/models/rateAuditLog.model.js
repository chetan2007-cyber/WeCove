const mongoose = require('mongoose');

const rateAuditLogSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: [true, 'Vendor ID is required'],
        index: true
    },
    rateType: {
        type: String,
        enum: ['print', 'finishing'],
        required: true,
        index: true
    },
    rateId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'ACTIVATE'],
        required: true
    },
    previousValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    effectiveAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

rateAuditLogSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('RateAuditLog', rateAuditLogSchema);
