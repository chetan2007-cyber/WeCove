const mongoose = require('mongoose');

// Sub-schema for finishing options like binding or lamination
const finishingSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['spiral_binding', 'comb_binding', 'hardbound', 'stapling', 'lamination', 'none'],
        required: true
    },
    coverStyle: { type: String },
    price: { type: Number, default: 0 }
});

const printJobSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: [true, 'Document reference is required']
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    pageRange: {
        type: String,
        default: 'all',
        validate: [
            {
                // 1st Validator: Check basic format using Regex
                validator: function (v) {
                    return /^(all|\d+(-\d+)?(\s*,\s*\d+(-\d+)?)*)$/.test(v ? v.trim() : '');
                },
                message: props => `${props.value} is not a valid page range format!`
            },
            {
                // 2nd Validator: Check logical range (start <= end)
                validator: function (v) {
                    if (!v || v === 'all') return true;
                    const segments = v.split(',');
                    for (let segment of segments) {
                        if (segment.includes('-')) {
                            const [start, end] = segment.split('-').map(Number);
                            if (start > end) return false;
                        }
                    }
                    return true;
                },
                message: props => `Invalid logical range in ${props.value}. Start page must be less than or equal to end page.`
            }
        ]
    },
    copies: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Must print at least 1 copy']
    },
    colorMode: { type: String, enum: ['B&W', 'Color', 'Mixed'], default: 'B&W' },
    colorSelectionType: { type: String, enum: ['none', 'custom', 'all'], default: 'none' },
    colorPages: { type: String, default: '' },
    colorPageCount: { type: Number, default: 0 },
    bwPageCount: { type: Number, default: 0 },
    sides: { type: String, enum: ['single', 'double'], default: 'single' },
    paperSize: { type: String, enum: ['A4', 'A3', 'Legal'], default: 'A4' },
    paperType: { type: String, enum: ['70gsm', '80gsm', '100gsm', 'glossy'], default: '70gsm' },
    pagesPerSheet: { type: Number, enum: [1, 2, 4, 8], default: 1 },
    nUpOrientation: { type: String, enum: ['horizontal', 'vertical', 'none'], default: 'none' },
    sheetOrientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    collate: { type: Boolean, default: true },
    excludedPages: [{ type: Number }],
    pageRotations: { type: Map, of: Number, default: {} },
    fitToPrintableArea: { type: Boolean, default: false },
    finishing: [finishingSchema],
    price: { type: Number, default: 0 },
    jobTicketKey: { type: String },
    printPackageManifest: { type: mongoose.Schema.Types.Mixed },

    // Authoritative Print Execution & Idempotency Tracking
    executionState: {
        type: String,
        enum: [
            'CREATED',
            'VALIDATED',
            'READY_FOR_AGENT',
            'SUBMITTING',
            'ACCEPTED_BY_SPOOLER',
            'PRINT_STATUS_PENDING',
            'PRINTED_PENDING_QC',
            'COMPLETED',
            'SUBMISSION_FAILED',
            'PRINTER_OFFLINE',
            'CANCELLED',
            'RECONCILIATION_REQUIRED'
        ],
        default: 'CREATED',
        index: true
    },
    documentVersionId: { type: String },
    submissionIdempotencyKey: { type: String, unique: true, sparse: true },
    submissionCount: { type: Number, default: 0 },
    activeLeaseId: { type: String },
    leaseExpiresAt: { type: Date },
    agentId: { type: String },
    printerId: { type: String },
    spoolerJobId: { type: Number },
    spoolerDocumentName: { type: String },
    spoolerStatus: { type: String },
    originalPageCount: { type: Number },
    finalPrintReadyPageCount: { type: Number },
    expectedSheets: { type: Number },
    expectedImpressions: { type: Number },
    printReadyStorageKey: { type: String },
    informationSheetType: { type: String, enum: ['plain', 'creative', 'none'] },
    informationSheetKey: { type: String },
    appliedSettings: {
        copies: Number,
        sides: String,
        duplexMode: String,
        colorMode: String,
        paperSize: String,
        paperType: String,
        pageRange: String,
        orientation: String,
        dmCopies: Number,
        dmDuplex: Number,
        printerDefaultDuplexDisabled: Boolean
    },
    submittedAt: { type: Date },
    acceptedBySpoolerAt: { type: Date },
    completedAt: { type: Date },
    lastErrorCode: { type: String },
    lastErrorMessage: { type: String },
    reconciliationNote: { type: String },
    vendorConfirmed: { type: Boolean, default: false },
    vendorConfirmedAt: { type: Date },
    vendorConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

module.exports = mongoose.model('PrintJob', printJobSchema);