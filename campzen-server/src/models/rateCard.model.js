const mongoose = require('mongoose');

const rateCardSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: [true, 'Vendor ID is required']
    },
    paperSize: { type: String, enum: ['A4', 'A3', 'Legal'], required: true },
    paperType: { type: String, enum: ['70gsm', '80gsm', '100gsm', 'glossy'], required: true },
    colorMode: { type: String, enum: ['B&W', 'Color'], required: true },
    sides: { type: String, enum: ['single', 'double'], required: true },
    minPages: { type: Number, default: 1 },
    maxPages: { type: Number, default: 99999 }, // High default for "no upper limit"
    pricePerPage: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    isActive: { type: Boolean, default: true, index: true }
}, {
    timestamps: true
});

// Create a unique compound index so a vendor cannot have two conflicting base rates 
// for the exact same configuration and page tier.
rateCardSchema.index(
    { vendorId: 1, paperSize: 1, paperType: 1, colorMode: 1, sides: 1, minPages: 1 },
    { unique: true }
);

module.exports = mongoose.model('RateCard', rateCardSchema);
