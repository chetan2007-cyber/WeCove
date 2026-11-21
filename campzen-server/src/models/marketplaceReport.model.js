const mongoose = require('mongoose');

const marketplaceReportSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reporter ID is required']
    },
    targetType: {
        type: String,
        enum: ['STUDENT_RESALE', 'PRINTABLE_RESOURCE', 'VENDOR_PRODUCT'],
        required: [true, 'Target listing type is required']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Target listing ID is required']
    },
    reason: {
        type: String,
        enum: [
            'COPYRIGHT_VIOLATION',
            'MISREPRESENTED_CONDITION',
            'ACADEMIC_DISHONESTY',
            'PROHIBITED_ITEM',
            'SPAM',
            'POOR_PRINT_QUALITY',
            'OTHER'
        ],
        required: [true, 'Report reason is required']
    },
    description: {
        type: String,
        required: [true, 'Report description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
        type: String,
        enum: ['PENDING', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED'],
        default: 'PENDING'
    },
    actionTaken: {
        type: String,
        enum: ['NONE', 'LISTING_SUSPENDED', 'LISTING_REMOVED', 'WARNING_ISSUED'],
        default: 'NONE'
    },
    adminNotes: {
        type: String,
        trim: true
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

marketplaceReportSchema.index({ targetType: 1, targetId: 1, status: 1 });
marketplaceReportSchema.index({ reporterId: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplaceReport', marketplaceReportSchema);
