const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
    label: { type: String, enum: ['home', 'hostel', 'department', 'other'], default: 'other' },
    line1: { type: String, required: true },
    landmark: String,
    isDefault: { type: Boolean, default: false }
});

const printPreferencesSchema = new mongoose.Schema({
    colorMode: { type: String, enum: ['B&W', 'Color'], default: 'B&W' },
    sides: { type: String, enum: ['single', 'double'], default: 'single' },
    paperType: { type: String, enum: ['70gsm', '80gsm', '100gsm'], default: '70gsm' },
    isSaved: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Name is required'], trim: true },
    phone: {
        type: String,
        sparse: true,
        unique: true,
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        sparse: true
    },
    password: {
        type: String,
        minlength: [6, 'Password must be at least 6 characters'],
        select: false,
        validate: {
            validator: function (v) {
                // If not a Google OAuth user, password is required
                if (!this.googleId && !v) {
                    return false;
                }
                return true;
            },
            message: 'Password is required'
        }
    },
    googleId: { type: String, sparse: true, unique: true },
    avatar: { type: String },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    collegeName: { type: String, trim: true },
    studentId: { type: String, trim: true },
    course: { type: String, trim: true },
    department: { type: String, trim: true },
    year: { type: Number, min: 1, max: 6 },
    semester: { type: Number, min: 1, max: 12 },
    isVerified: { type: Boolean, default: false },
    role: {
        type: String,
        enum: ['student', 'vendor_owner', 'vendor_staff', 'provider', 'admin'],
        default: 'student'
    },
    addresses: [addressSchema],
    printPreferences: { type: printPreferencesSchema, default: null },
    fcmTokens: [{ type: String }],
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    onboardingStatus: {
        type: String,
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
        default: 'NOT_STARTED'
    },
    onboardingVersion: { type: Number, default: 1 },
    onboardingCompletedAt: { type: Date },
    status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    isPhoneVerified: { type: Boolean, default: false },
    otpCode: { type: String, select: false },
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    otpLastSentAt: { type: Date }
}, { timestamps: true });

// Hash password before saving to the database
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify passwords during login
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);