const mongoose = require('mongoose');

// Sub-schema for product variants
const productVariantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Variant name is required'],
        trim: true
    },
    sku: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Variant price is required'],
        min: [0, 'Price cannot be negative']
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    attributes: {
        type: Map,
        of: String,
        default: {}
    }
}, { _id: true });

const stationeryItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: [true, 'Vendor ID is required']
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    listingType: {
        type: String,
        enum: ['VENDOR_PRODUCT'],
        default: 'VENDOR_PRODUCT'
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    stock: {
        type: Number,
        default: 10,
        min: [0, 'Stock cannot be negative']
    },
    variants: [productVariantSchema],
    brand: {
        type: String,
        trim: true
    },
    images: [{
        type: String
    }],
    tags: [{
        type: String,
        trim: true
    }],
    sku: {
        type: String,
        trim: true
    },
    salesCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for fast lookup by shop, category, and text search
stationeryItemSchema.index({ vendorId: 1, categoryId: 1, isAvailable: 1 });
stationeryItemSchema.index({ vendorId: 1, isAvailable: 1, stock: 1 });
stationeryItemSchema.index({ name: 'text', description: 'text', tags: 'text', brand: 'text' });

module.exports = mongoose.model('StationeryItem', stationeryItemSchema);
