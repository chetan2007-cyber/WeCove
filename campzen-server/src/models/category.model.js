const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        required: [true, 'Category slug is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    level: {
        type: Number,
        default: 0,
        min: 0
    },
    applicableListingTypes: [{
        type: String,
        enum: ['VENDOR_PRODUCT', 'STUDENT_RESALE', 'PRINTABLE_RESOURCE'],
        required: true
    }],
    icon: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentId',
    match: { isActive: true },
    options: { sort: { displayOrder: 1, name: 1 } }
});

// Indexes for fast lookup
categorySchema.index({ parentId: 1, isActive: 1, displayOrder: 1 });
categorySchema.index({ applicableListingTypes: 1, isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);
