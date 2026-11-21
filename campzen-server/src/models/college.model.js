const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'College name is required'], trim: true },
    location: { type: String, required: [true, 'Location/Address is required'] },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    domain: { type: String, trim: true }, // e.g., 'mitmysore.in' (used to auto-verify student emails later)
    isActive: { type: Boolean, default: true } // Allows turning off a campus temporarily
}, {
    timestamps: true
});

module.exports = mongoose.model('College', collegeSchema);