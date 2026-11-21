const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },

    // The abstracted key to find the file (e.g., local filename or S3 object key)
    storageKeyOriginal: { type: String, required: true },
    storageKeyPdf: { type: String }, // For when we convert DOCX/PPTX to PDF later

    pageCount: { type: Number },
    fileSize: { type: Number, required: true },

    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    qualityFlags: [{ type: String }], // E.g., 'low_res', 'blank_pages_detected'
    thumbnailKeys: [{ type: String }],

    analysis: {
        status: {
            type: String,
            enum: ['pending', 'analyzing', 'completed', 'failed'],
            default: 'pending'
        },
        analyzedAt: { type: Date },
        totalPages: { type: Number, default: 0 },
        colorPageCount: { type: Number, default: 0 },
        bwPageCount: { type: Number, default: 0 },

        // Deterministic analysis results
        blankPages: [{
            page: { type: Number, required: true },
            confidence: { type: Number, default: 1.0 },
            inkCoveragePercent: { type: Number, default: 0 },
            reason: { type: String }
        }],

        duplicateGroups: [{
            originalPage: { type: Number, required: true },
            duplicatePages: [{ type: Number }],
            similarityPercent: { type: Number }
        }],

        qualityIssues: [{
            page: { type: Number, required: true },
            level: { type: String, enum: ['WARNING', 'POOR'], default: 'WARNING' },
            issue: { type: String, required: true },
            estimatedDpi: { type: Number },
            detail: { type: String }
        }],

        rotationIssues: [{
            page: { type: Number, required: true },
            currentRotation: { type: Number, default: 0 },
            orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
            suggestedRotation: { type: Number, required: true },
            confidence: { type: Number }
        }],

        skewIssues: [{
            page: { type: Number, required: true },
            skewAngleDegrees: { type: Number }
        }],

        marginWarnings: [{
            page: { type: Number, required: true },
            edge: { type: String, enum: ['top', 'bottom', 'left', 'right', 'multiple'] },
            warning: { type: String },
            recommendation: { type: String }
        }],

        colorPages: [{
            page: { type: Number, required: true },
            hasColor: { type: Boolean, required: true },
            colorPixelPercent: { type: Number, default: 0 }
        }],

        // Actionable cost-saving and quality recommendations
        recommendations: [{
            type: {
                type: String,
                enum: ['COLOR_TO_BW', 'DOUBLE_SIDED', 'BLANK_EXCLUSION', 'ORIENTATION_FIX', 'QUALITY_WARNING', 'N_UP_PRINTING'],
                required: true
            },
            title: { type: String, required: true },
            description: { type: String, required: true },
            affectedPages: [{ type: Number }],
            estimatedSavings: { type: Number, default: 0 },
            action: { type: String }
        }]
    },

    expiresAt: { type: Date }, // Useful for auto-deleting old documents
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);