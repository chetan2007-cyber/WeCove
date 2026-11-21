const mongoose = require('mongoose');

/**
 * Persistent audit & reconciliation log for every physical print submission attempt.
 * Strictly stores technical print parameters and spooler identifiers (no PII or document content).
 */
const printSubmissionLogSchema = new mongoose.Schema({
    printJobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrintJob',
        required: true,
        index: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true
    },
    attemptNumber: {
        type: Number,
        required: true,
        min: 1
    },
    agentId: { type: String, required: true },
    printerId: { type: String, required: true },
    spoolerDocumentName: { type: String },
    spoolerJobId: { type: Number, default: null },
    executionState: { type: String, required: true },
    requestedConfig: {
        copies: Number,
        sides: String,
        colorMode: String,
        paperSize: String,
        paperType: String,
        pageRange: String,
        orientation: String,
        originalPageCount: Number,
        finalPrintReadyPageCount: Number,
        expectedSheets: Number,
        expectedImpressions: Number
    },
    appliedDriverConfig: {
        dmCopies: Number,
        dmDuplex: Number,
        printerDefaultDuplexDisabled: Boolean,
        ecoDefaultDisabled: Boolean,
        driverVerified: Boolean
    },
    spoolerStatus: { type: String },
    errorCode: { type: String },
    errorMessage: { type: String },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('PrintSubmissionLog', printSubmissionLogSchema);
