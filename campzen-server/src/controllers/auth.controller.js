const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const { OAuth2Client } = require('google-auth-library');
const { generateOTP, hashOTP, verifyOTPHash, maskEmail } = require('../utils/otp');
const emailService = require('../services/email.service');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 10 minutes in milliseconds
const OTP_EXPIRY_MS = 10 * 60 * 1000;
// 60 seconds cooldown for resend
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
// Maximum failed verification attempts
const MAX_OTP_ATTEMPTS = 5;

// @desc    Register / Sign up a user
//          If email verification flow: creates unverified user, generates & hashes 6-digit OTP,
//          sends email, does NOT return JWT.
const signup = async (req, res, next) => {
    try {
        const {
            name, phone, email, password, role, college, collegeName, collegeId,
            requireVerification, studentId, course, department, year, semester,
            shopName, shopAddress, shopLandmark, coordinates
        } = req.body;

        // Route check: /signup or explicitly requested verification, or student/vendor registering with email
        const isEmailVerificationFlow = req.path === '/signup' || requireVerification === true || (!phone && !!email) || role === 'vendor_owner';

        if (!password || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Password is required and must be a valid string' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        if (email && typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email must be a valid string' });
        }
        if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        if (phone && (typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim()))) {
            return res.status(400).json({ success: false, message: 'Phone number must be a valid 10-digit number' });
        }

        if (name && typeof name !== 'string') {
            return res.status(400).json({ success: false, message: 'Name must be a valid string' });
        }

        const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
        const normalizedPhone = phone ? phone.trim() : undefined;

        // If email verification flow is active
        if (isEmailVerificationFlow && normalizedEmail) {
            // Check existing user by email
            const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');
            if (existingUser) {
                if (existingUser.isVerified) {
                    return res.status(400).json({
                        success: false,
                        message: 'This email address is already registered and verified. Please sign in.'
                    });
                }

                // User exists but is unverified: update details & issue fresh OTP (invalidating old)
                const otp = generateOTP();
                const otpHash = hashOTP(otp);
                const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

                existingUser.password = password; // Will be hashed by pre-save
                if (name) existingUser.name = name.trim();
                if (role) existingUser.role = role;
                if (normalizedPhone) existingUser.phone = normalizedPhone;
                if (college || collegeName) existingUser.collegeName = (college || collegeName).trim();
                if (collegeId) existingUser.collegeId = collegeId;
                if (studentId) existingUser.studentId = studentId.trim();
                if (course) existingUser.course = course.trim();
                if (department) existingUser.department = department.trim();
                if (year) existingUser.year = Number(year);
                if (semester) existingUser.semester = Number(semester);
                existingUser.otpHash = otpHash;
                existingUser.otpExpiresAt = expiresAt;
                existingUser.otpAttempts = 0;
                existingUser.otpLastSentAt = new Date();
                await existingUser.save();

                // If vendor owner, ensure Vendor document is updated/created
                if (existingUser.role === 'vendor_owner') {
                    try {
                        const Vendor = require('../models/vendor.model');
                        const College = require('../models/college.model');
                        let targetCollegeId = collegeId || existingUser.collegeId;
                        if (!targetCollegeId) {
                            const defaultCol = await College.findOne({ isActive: true });
                            if (defaultCol) targetCollegeId = defaultCol._id;
                        }
                        if (targetCollegeId) {
                            let shop = await Vendor.findOne({ ownerId: existingUser._id });
                            if (!shop) {
                                await Vendor.create({
                                    name: (shopName || `${existingUser.name}'s Print Shop`),
                                    ownerId: existingUser._id,
                                    collegeId: targetCollegeId,
                                    address: {
                                        line1: shopAddress || 'Campus Printing Complex',
                                        landmark: shopLandmark || ''
                                    },
                                    location: {
                                        type: 'Point',
                                        coordinates: coordinates || [76.6669, 12.3615]
                                    },
                                    operatingHours: {
                                        open: '09:00',
                                        close: '18:00',
                                        daysOpen: [0, 1, 2, 3, 4, 5, 6]
                                    },
                                    status: 'pending_verification'
                                });
                            } else if (shopName || shopAddress) {
                                if (shopName) shop.name = shopName.trim();
                                if (shopAddress) shop.address.line1 = shopAddress.trim();
                                if (shopLandmark) shop.address.landmark = shopLandmark.trim();
                                await shop.save();
                            }
                        }
                    } catch (vErr) {
                        console.warn('[Signup] Vendor upsert warning:', vErr.message);
                    }
                }

                // Send OTP to email
                await emailService.sendVerificationEmail(normalizedEmail, otp);

                return res.status(201).json({
                    success: true,
                    requiresVerification: true,
                    isVerified: false,
                    email: normalizedEmail,
                    message: `Verification code sent to ${maskEmail(normalizedEmail)}`
                });
            }

            // Also ensure phone isn't already taken by another verified user if phone provided
            if (normalizedPhone) {
                const phoneUser = await User.findOne({ phone: normalizedPhone });
                if (phoneUser) {
                    return res.status(400).json({ success: false, message: 'Phone number already registered' });
                }
            }

            // Create new UNVERIFIED user
            const otp = generateOTP();
            const otpHash = hashOTP(otp);
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

            const newUserData = {
                name: name ? name.trim() : (role === 'vendor_owner' ? 'Shop Owner' : 'Student'),
                email: normalizedEmail,
                password,
                role: role || 'student',
                isVerified: false,
                otpHash,
                otpExpiresAt: expiresAt,
                otpAttempts: 0,
                otpLastSentAt: new Date()
            };
            if (normalizedPhone) newUserData.phone = normalizedPhone;
            if (college || collegeName) newUserData.collegeName = (college || collegeName).trim();
            if (collegeId) newUserData.collegeId = collegeId;
            if (studentId) newUserData.studentId = studentId.trim();
            if (course) newUserData.course = course.trim();
            if (department) newUserData.department = department.trim();
            if (year) newUserData.year = Number(year);
            if (semester) newUserData.semester = Number(semester);

            const newUser = await User.create(newUserData);

            // If vendor owner, create associated Vendor shop document
            if (newUser.role === 'vendor_owner') {
                try {
                    const Vendor = require('../models/vendor.model');
                    const College = require('../models/college.model');
                    let targetCollegeId = collegeId;
                    if (!targetCollegeId) {
                        const defaultCol = await College.findOne({ isActive: true });
                        if (defaultCol) targetCollegeId = defaultCol._id;
                    }
                    if (targetCollegeId) {
                        const newShop = await Vendor.create({
                            name: (shopName || `${newUser.name}'s Print Shop`),
                            ownerId: newUser._id,
                            collegeId: targetCollegeId,
                            address: {
                                line1: shopAddress || 'Campus Printing Complex',
                                landmark: shopLandmark || ''
                            },
                            location: {
                                type: 'Point',
                                coordinates: coordinates || [76.6669, 12.3615]
                            },
                            operatingHours: {
                                open: '09:00',
                                close: '18:00',
                                daysOpen: [0, 1, 2, 3, 4, 5, 6]
                            },
                            status: 'pending_verification'
                        });
                        console.log(`🏪 [Vendor Registered] Shop "${newShop.name}" created for owner ${newUser.email}`);
                        const { seedDefaultRatesForVendor } = require('../utils/defaultRateCards.util');
                        await seedDefaultRatesForVendor(newShop._id);
                    }
                } catch (vErr) {
                    console.warn('[Signup] Could not create Vendor document:', vErr.message);
                }
            }

            // Dispatch verification email
            await emailService.sendVerificationEmail(normalizedEmail, otp);

            // Return verification requirement
            return res.status(201).json({
                success: true,
                requiresVerification: true,
                isVerified: false,
                email: newUser.email,
                message: `Account created. A 6-digit verification code has been sent to ${maskEmail(normalizedEmail)}.`
            });
        }

        // Legacy / Phone-based registration (backward compatibility for existing tests & callers)
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ success: false, message: 'Phone number is required and must be a valid string' });
        }

        const userExists = await User.findOne({ phone: normalizedPhone });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }

        const user = await User.create({
            name,
            phone: normalizedPhone,
            email: normalizedEmail,
            password,
            role,
            isVerified: true
        });
        const token = generateToken(user._id);

        res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify email using 6-digit OTP
//          Marks user account as VERIFIED. Does NOT return access token (user must log in).
const verifyEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }
        if (!otp || typeof otp !== 'string') {
            return res.status(400).json({ success: false, message: 'Verification OTP is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const trimmedOtp = otp.trim();

        if (trimmedOtp.length !== 6) {
            return res.status(400).json({ success: false, message: 'Verification code must be exactly 6 digits' });
        }

        const user = await User.findOne({ email: normalizedEmail }).select('+otpHash +otpExpiresAt +otpAttempts');
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found for this email address' });
        }

        if (user.isVerified) {
            return res.status(200).json({
                success: true,
                isVerified: true,
                message: 'Your account is already verified. Please log in.'
            });
        }

        if (!user.otpHash || !user.otpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: 'No verification code requested. Please request a new code.'
            });
        }

        // Check if maximum attempts exceeded
        if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
            await User.findByIdAndUpdate(user._id, {
                $unset: { otpHash: "", otpExpiresAt: "" }
            });
            return res.status(400).json({
                success: false,
                message: 'Maximum verification attempts exceeded. Please request a new verification code.'
            });
        }

        // Check expiration
        if (new Date() > new Date(user.otpExpiresAt)) {
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired. Please request a new one.'
            });
        }

        // Verify hash
        const isMatch = verifyOTPHash(trimmedOtp, user.otpHash);
        if (!isMatch) {
            const updatedAttempts = (user.otpAttempts || 0) + 1;
            await User.findByIdAndUpdate(user._id, { $set: { otpAttempts: updatedAttempts } });

            const remaining = MAX_OTP_ATTEMPTS - updatedAttempts;
            const message = remaining > 0
                ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                : 'Incorrect verification code. Maximum attempts reached. Please request a new code.';

            return res.status(400).json({ success: false, message });
        }

        // Success: Mark account as VERIFIED and clear OTP metadata
        await User.findByIdAndUpdate(user._id, {
            $set: { isVerified: true },
            $unset: { otpHash: "", otpExpiresAt: "", otpAttempts: "", otpLastSentAt: "" }
        });

        // If vendor owner, activate their vendor shop status
        if (user.role === 'vendor_owner') {
            try {
                const Vendor = require('../models/vendor.model');
                const now = new Date();
                const shops = await Vendor.find({ ownerId: user._id });
                for (const s of shops) {
                    s.status = 'active';
                    s.isApproved = true;
                    if (!s.partnerActivatedAt) {
                        s.partnerActivatedAt = now;
                    }
                    await s.save();
                }
                const { seedDefaultRatesForVendor } = require('../utils/defaultRateCards.util');
                for (const s of shops) {
                    await seedDefaultRatesForVendor(s._id);
                }
            } catch (vErr) {
                console.warn('[VerifyEmail] Error activating vendor shop:', vErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            isVerified: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                collegeName: user.collegeName,
                collegeId: user.collegeId,
                isVerified: true
            },
            message: 'Email verified successfully! Welcome to Kami.'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Resend email verification OTP with 60-second cooldown
const resendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select('+otpLastSentAt');

        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email address' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Account is already verified. Please sign in.' });
        }

        // Cooldown check (60 seconds)
        if (user.otpLastSentAt) {
            const timeElapsed = Date.now() - new Date(user.otpLastSentAt).getTime();
            if (timeElapsed < OTP_RESEND_COOLDOWN_MS) {
                const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeElapsed) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds}s before requesting a new code.`,
                    remainingSeconds
                });
            }
        }

        // Generate fresh OTP (old OTP invalidated)
        const newOtp = generateOTP();
        const newOtpHash = hashOTP(newOtp);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

        await User.findByIdAndUpdate(user._id, {
            $set: {
                otpHash: newOtpHash,
                otpExpiresAt: expiresAt,
                otpAttempts: 0,
                otpLastSentAt: new Date()
            }
        });

        // Send email
        await emailService.sendVerificationEmail(normalizedEmail, newOtp);

        return res.status(200).json({
            success: true,
            message: `A new 6-digit verification code has been sent to ${maskEmail(normalizedEmail)}.`
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user with email/phone & password
//          Rejects unverified accounts with 403 status and message prompting verification
const login = async (req, res, next) => {
    try {
        const { phone, email, password } = req.body;

        if ((!phone && !email) || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email or phone, and password' });
        }

        if (password && typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid credentials format' });
        }

        if (phone && typeof phone !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid credentials format' });
        }

        if (email && typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid credentials format' });
        }

        const query = email
            ? { email: email.toLowerCase().trim() }
            : { phone: phone.trim() };

        // Check for user and explicitly select the password field
        const user = await User.findOne(query).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check verification status for email accounts
        if (user.email && !user.isVerified) {
            return res.status(403).json({
                success: false,
                isUnverified: true,
                email: user.email,
                message: 'Please verify your email before logging in.'
            });
        }

        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                collegeName: user.collegeName,
                collegeId: user.collegeId,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        next(error);
    }
};

const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, message: 'Google ID token is required' });
        }

        // 1. Verify the token with Google's servers
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        // 2. Extract user payload from Google
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // 3. Find existing user, or create a new one
        let user = await User.findOne({ email });

        if (!user) {
            // First time logging in, create an account
            user = await User.create({
                name,
                email,
                googleId,
                avatar: picture,
                role: 'student',
                isVerified: true, // Google OAuth automatically verifies email
                isPhoneVerified: false
            });
        } else if (!user.googleId) {
            // User exists from a manual signup, link their Google account
            user.googleId = googleId;
            user.isVerified = true;
            if (!user.avatar) user.avatar = picture;
            await user.save();
        }

        // 4. Generate our standard Kami JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isVerified: user.isVerified,
                isPhoneVerified: user.isPhoneVerified
            }
        });

    } catch (error) {
        console.error('[Google Auth Error]', error.message);
        res.status(401).json({ success: false, message: 'Invalid Google token' });
    }
};

// Legacy authenticated phone OTP handlers
const sendOtp = async (req, res, next) => {
    try {
        const { phone } = req.body;
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ success: false, message: 'Phone number is required and must be a valid string' });
        }

        const existingUser = await User.findOne({ phone, _id: { $ne: req.user.id } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Phone number already registered to another account' });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await User.findByIdAndUpdate(req.user.id, {
            otpCode: otp,
            otpExpiresAt: expiresAt,
            phone: phone
        });

        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        next(error);
    }
};

const verifyOtp = async (req, res, next) => {
    try {
        const { otp } = req.body;
        if (!otp || typeof otp !== 'string') {
            return res.status(400).json({ success: false, message: 'OTP is required and must be a valid string' });
        }

        const user = await User.findById(req.user.id).select('+otpCode +otpExpiresAt');

        if (!user.otpCode || !user.otpExpiresAt) {
            return res.status(400).json({ success: false, message: 'No OTP requested' });
        }

        if (user.otpExpiresAt < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        if (user.otpCode !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        await User.findByIdAndUpdate(req.user.id, {
            $set: { isPhoneVerified: true },
            $unset: { otpCode: "", otpExpiresAt: "" }
        });

        res.status(200).json({ success: true, message: 'Phone number verified successfully!' });
    } catch (error) {
        next(error);
    }
};

// @desc    Initiate forgot password flow (sends 6-digit reset OTP to email)
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        const user = await User.findOne({ email: normalizedEmail }).select('+otpLastSentAt');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account registered with this email address'
            });
        }

        // 60-second cooldown check
        if (user.otpLastSentAt) {
            const timeElapsed = Date.now() - new Date(user.otpLastSentAt).getTime();
            if (timeElapsed < OTP_RESEND_COOLDOWN_MS) {
                const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeElapsed) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds}s before requesting another reset code.`,
                    remainingSeconds
                });
            }
        }

        // Generate fresh 6-digit OTP
        const otp = generateOTP();
        const otpHash = hashOTP(otp);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

        await User.findByIdAndUpdate(user._id, {
            $set: {
                otpHash,
                otpExpiresAt: expiresAt,
                otpAttempts: 0,
                otpLastSentAt: new Date()
            }
        });

        // Send reset email
        await emailService.sendPasswordResetEmail(normalizedEmail, otp);

        return res.status(200).json({
            success: true,
            email: normalizedEmail,
            message: `Password reset code sent to ${maskEmail(normalizedEmail)}.`
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP and reset password
const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }
        if (!otp || typeof otp !== 'string') {
            return res.status(400).json({ success: false, message: 'Verification code is required' });
        }
        if (!newPassword || typeof newPassword !== 'string') {
            return res.status(400).json({ success: false, message: 'New password is required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const trimmedOtp = otp.trim();

        if (trimmedOtp.length !== 6) {
            return res.status(400).json({ success: false, message: 'Verification code must be exactly 6 digits' });
        }

        const user = await User.findOne({ email: normalizedEmail }).select('+otpHash +otpExpiresAt +otpAttempts +password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found for this email address' });
        }

        if (!user.otpHash || !user.otpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: 'No active password reset request. Please request a new code.'
            });
        }

        // Check maximum failed attempts
        if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
            await User.findByIdAndUpdate(user._id, {
                $unset: { otpHash: "", otpExpiresAt: "" }
            });
            return res.status(400).json({
                success: false,
                message: 'Maximum verification attempts exceeded. Please request a new reset code.'
            });
        }

        // Check expiration
        if (new Date() > new Date(user.otpExpiresAt)) {
            return res.status(400).json({
                success: false,
                message: 'Password reset code has expired. Please request a new one.'
            });
        }

        // Verify hash
        const isMatch = verifyOTPHash(trimmedOtp, user.otpHash);
        if (!isMatch) {
            const updatedAttempts = (user.otpAttempts || 0) + 1;
            await User.findByIdAndUpdate(user._id, { $set: { otpAttempts: updatedAttempts } });

            const remaining = MAX_OTP_ATTEMPTS - updatedAttempts;
            const message = remaining > 0
                ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                : 'Incorrect code. Maximum attempts reached. Please request a new reset code.';

            return res.status(400).json({ success: false, message });
        }

        // Update password and clear OTP
        user.password = newPassword; // Handled by pre-save bcrypt hash
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        user.otpAttempts = 0;
        user.otpLastSentAt = undefined;
        user.isVerified = true; // Successfully resetting via verified email confirms the email
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Your password has been reset successfully! You can now sign in with your new password.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    verifyEmail,
    resendOtp,
    login,
    googleLogin,
    sendOtp,
    verifyOtp,
    forgotPassword,
    resetPassword
};