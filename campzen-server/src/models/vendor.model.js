const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    staffIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true
    },
    address: {
        line1: { type: String, required: true },
        landmark: String,
        lat: { type: Number },
        lng: { type: Number }
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [76.6669, 12.3615],
            required: true
        }
    },
    operatingHours: {
        open: { type: String, default: '09:00' }, // 24-hour format
        close: { type: String, default: '18:00' },
        daysOpen: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] }
    },
    capacity: {
        machineCount: { type: Number, default: 1 },
        pagesPerMinute: { type: Number, default: 30 }, // Used later for ETA calculation
    },
    capabilities: {
        colorPrinting: { type: Boolean, default: true },
        paperSizes: [{ type: String, enum: ['A4', 'A3', 'Legal'], default: ['A4'] }],
        bindingTypes: [{ type: String, enum: ['spiral', 'spiral_binding', 'comb', 'comb_binding', 'tape', 'hardbound', 'stapling'], default: ['stapling'] }],
        lamination: { type: Boolean, default: false }
    },
    delivery: {
        isAvailable: { type: Boolean, default: false },
        fee: { type: Number, default: 0 }
    },
    schedulingFee: {
        nextDayFee: { type: Number, default: 15 }
    },
    queueInfo: {
        isAcceptingOrders: { type: Boolean, default: true },
        maxOrdersPerHour: { type: Number, default: 50 }
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    commissionRate: {
        type: Number,
        default: 10, // Platform take rate in percentage
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['pending_verification', 'active', 'inactive', 'suspended'],
        default: 'active'
    },
    isApproved: {
        type: Boolean,
        default: true
    },
    partnerActivatedAt: {
        type: Date
    },
    googlePlaceId: {
        type: String,
        sparse: true,
        index: true
    },
    googleMapsUrl: {
        type: String
    },
    source: {
        type: String,
        enum: ['KAMI', 'GOOGLE'],
        default: 'KAMI'
    }
}, {
    timestamps: true
});

vendorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Vendor', vendorSchema);