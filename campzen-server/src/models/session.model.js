const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    deviceInfo: {
        type: String,
        default: 'CampZen Student Mobile App'
    },
    ipAddress: {
        type: String,
        default: ''
    },
    isRevoked: {
        type: Boolean,
        default: false,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // Automatic TTL expiration
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
