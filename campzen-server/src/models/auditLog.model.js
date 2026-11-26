const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actorEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['admin', 'vendor_owner', 'vendor_staff', 'system'],
        required: true
    },
    action: {
        type: String,
        required: true,
        trim: true
    },
    targetType: {
        type: String,
        enum: ['VENDOR', 'ORDER', 'USER', 'PRINT_JOB', 'RATE_CARD', 'SYSTEM_CONFIG', 'ADMIN_AUTH'],
        required: true
    },
    targetId: {
        type: String,
        default: null
    },
    reason: {
        type: String,
        trim: true,
        default: 'Operational action'
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    diff: {
        before: { type: mongoose.Schema.Types.Mixed, default: null },
        after: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILURE', 'WARNING'],
        default: 'SUCCESS'
    }
}, {
    timestamps: true
});

// Indexes for fast searching in the Admin Panel
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorEmail: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
