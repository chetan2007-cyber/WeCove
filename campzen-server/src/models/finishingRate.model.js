const mongoose = require('mongoose');

const finishingRateSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: [true, 'Vendor ID is required']
    },
    finishingType: {
        type: String,
        enum: ['spiral_binding', 'comb_binding', 'hardbound', 'stapling', 'lamination'],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// A vendor can only have one active price per finishing type
finishingRateSchema.index({ vendorId: 1, finishingType: 1 }, { unique: true });

module.exports = mongoose.model('FinishingRate', finishingRateSchema);
