const mongoose = require('mongoose');

const printableResourceSchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator ID is required']
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: [true, 'Underlying document is required']
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College'
    },
    visibilityType: {
        type: String,
        enum: ['MY_COLLEGE_ONLY', 'SELECTED_COLLEGES', 'ALL_COLLEGES'],
        default: 'MY_COLLEGE_ONLY'
    },
    visibleCollegeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College'
    }],
    title: {
        type: String,
        required: [true, 'Resource title is required'],
        trim: true,
        maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
        type: String,
        required: [true, 'Resource description is required'],
        trim: true,
        maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    course: { type: String, trim: true },
    department: { type: String, trim: true },
    semester: { type: Number, min: 1, max: 12 },
    subject: { type: String, trim: true },
    language: { type: String, default: 'English', trim: true },
    pageCount: {
        type: Number,
        required: [true, 'Page count is required'],
        min: [1, 'Resource must have at least 1 page']
    },
    previewPages: [{
        type: Number,
        min: 1
    }],
    royaltyRatePerPage: {
        type: Number,
        default: 0.10,
        min: [0, 'Royalty rate cannot be negative']
    },
    rightsDeclaration: {
        hasAccepted: {
            type: Boolean,
            required: [true, 'Copyright and rights declaration acceptance is required']
        },
        agreedAt: {
            type: Date,
            default: Date.now
        },
        statement: {
            type: String,
            required: [true, 'Rights statement is required']
        }
    },
    moderationStatus: {
        type: String,
        enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'SUSPENDED', 'ARCHIVED'],
        default: 'DRAFT'
    },
    moderationNotes: { type: String, trim: true },
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: { type: Date },
    totalPrintsCount: { type: Number, default: 0, min: 0 },
    totalPrintedPages: { type: Number, default: 0, min: 0 },
    totalRoyaltiesEarned: { type: Number, default: 0, min: 0 },
    listingType: {
        type: String,
        enum: ['PRINTABLE_RESOURCE'],
        default: 'PRINTABLE_RESOURCE'
    }
}, {
    timestamps: true
});

// Indexes for search, discovery, and fast moderation lookup
printableResourceSchema.index({ visibilityType: 1, visibleCollegeIds: 1 });
printableResourceSchema.index({ moderationStatus: 1, categoryId: 1, createdAt: -1 });
printableResourceSchema.index({ creatorId: 1, moderationStatus: 1 });
printableResourceSchema.index({ title: 'text', description: 'text', subject: 'text', department: 'text' });

module.exports = mongoose.model('PrintableResource', printableResourceSchema);
