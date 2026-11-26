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
    businessHours: {
        monday: { open: { type: String, default: '09:00' }, close: { type: String, default: '20:00' }, isOpen: { type: Boolean, default: true } },
        tuesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '20:00' }, isOpen: { type: Boolean, default: true } },
        wednesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '20:00' }, isOpen: { type: Boolean, default: true } },
        thursday: { open: { type: String, default: '09:00' }, close: { type: String, default: '20:00' }, isOpen: { type: Boolean, default: true } },
        friday: { open: { type: String, default: '09:00' }, close: { type: String, default: '20:00' }, isOpen: { type: Boolean, default: true } },
        saturday: { open: { type: String, default: '09:00' }, close: { type: String, default: '20:00' }, isOpen: { type: Boolean, default: true } },
        sunday: { open: { type: String, default: '10:00' }, close: { type: String, default: '16:00' }, isOpen: { type: Boolean, default: false } }
    },
    storeTimezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    holidayDates: [{
        type: Date
    }],
    isManuallyClosed: {
        type: Boolean,
        default: false
    },
    isTemporarilyPaused: {
        type: Boolean,
        default: false
    },
    printAgentOnline: {
        type: Boolean,
        default: false
    },
    lastAgentHeartbeat: {
        type: Date
    },
    printerAvailable: {
        type: Boolean,
        default: true
    },
    registeredDevices: [{
        deviceId: { type: String, required: true },
        deviceName: { type: String, default: 'Shop Computer' },
        agentTokenHash: { type: String, required: true },
        registeredAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date, default: Date.now },
        isRevoked: { type: Boolean, default: false }
    }],
    configuredPrinters: [{
        name: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
        port: { type: String, default: '' },
        driver: { type: String, default: '' },
        status: { type: String, default: 'Ready' },
        capabilities: { type: mongoose.Schema.Types.Mixed, default: {} },
        lastChecked: { type: Date, default: Date.now }
    }],
    capacity: {
        machineCount: { type: Number, default: 1 },
        pagesPerMinute: { type: Number, default: 30 }
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
        default: 10,
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

/**
 * Calculates real-time effective availability of the shop.
 */
vendorSchema.methods.getEffectiveAvailability = function () {
    if (!this.isApproved || this.status === 'suspended') {
        return { isAvailable: false, status: 'SUSPENDED', reason: 'Shop is currently suspended or pending approval' };
    }
    if (this.status !== 'active') {
        return { isAvailable: false, status: 'INACTIVE', reason: 'Shop account is inactive' };
    }
    if (this.isManuallyClosed) {
        return { isAvailable: false, status: 'CLOSED', reason: 'Shop has been manually closed by the operator' };
    }
    if (this.isTemporarilyPaused) {
        return { isAvailable: false, status: 'PAUSED', reason: 'Shop is temporarily paused and not accepting new orders' };
    }

    // Timezone & business hours validation (Asia/Kolkata by default)
    const tz = this.storeTimezone || 'Asia/Kolkata';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase();
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const currentTimeStr = `${hour}:${minute}`;

    const daySchedule = this.businessHours && this.businessHours[weekday];
    if (daySchedule) {
        if (!daySchedule.isOpen) {
            return { isAvailable: false, status: 'CLOSED', reason: `Shop is closed on ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}` };
        }
        if (currentTimeStr < daySchedule.open || currentTimeStr > daySchedule.close) {
            return {
                isAvailable: false,
                status: 'CLOSED',
                reason: `Shop is closed. Operating hours are ${daySchedule.open} to ${daySchedule.close}`
            };
        }
    }

    // Check holiday dates
    if (Array.isArray(this.holidayDates) && this.holidayDates.length > 0) {
        const todayIso = now.toISOString().split('T')[0];
        const isHoliday = this.holidayDates.some(h => new Date(h).toISOString().split('T')[0] === todayIso);
        if (isHoliday) {
            return { isAvailable: false, status: 'CLOSED', reason: 'Shop is closed today for an official campus holiday' };
        }
    }

    // Check Print Agent Health: must have reported a heartbeat within the last 90 seconds
    const isAgentOnline = Boolean(
        this.printAgentOnline &&
        this.lastAgentHeartbeat &&
        (Date.now() - new Date(this.lastAgentHeartbeat).getTime() <= 90000)
    );

    if (!isAgentOnline) {
        return {
            isAvailable: false,
            status: 'OFFLINE',
            reason: 'Shop print agent is currently offline. Orders cannot be automatically dispatched'
        };
    }

    return {
        isAvailable: true,
        status: 'OPEN',
        reason: 'Shop is open and actively accepting orders'
    };
};

module.exports = mongoose.model('Vendor', vendorSchema);
