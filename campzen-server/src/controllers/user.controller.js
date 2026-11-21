const User = require('../models/user.model');

// @desc    Get current logged in user
const getMe = async (req, res, next) => {
    try {
        // req.user is set by our protect middleware
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user details
const updateMe = async (req, res, next) => {
    try {
        const {
            name, email, addresses, collegeId, studentId, fcmTokens,
            printPreferences, course, department, year, semester
        } = req.body;

        const fieldsToUpdate = {};
        if (name) fieldsToUpdate.name = name;
        if (email) fieldsToUpdate.email = email;
        if (addresses) fieldsToUpdate.addresses = addresses;
        if (collegeId) fieldsToUpdate.collegeId = collegeId;
        if (studentId) fieldsToUpdate.studentId = studentId;
        if (course) fieldsToUpdate.course = course;
        if (department) fieldsToUpdate.department = department;
        if (year !== undefined) fieldsToUpdate.year = Number(year);
        if (semester !== undefined) fieldsToUpdate.semester = Number(semester);
        if (fcmTokens) fieldsToUpdate.fcmTokens = fcmTokens;
        if (printPreferences !== undefined) fieldsToUpdate.printPreferences = printPreferences;

        // 2. Update the user document
        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            returnDocument: 'after',
            runValidators: true // Ensure Mongoose validates the new data (e.g. email format)
        });

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// @desc    Permanently delete account and data
// @route   DELETE /api/users/me
// @access  Private
const deleteMe = async (req, res, next) => {
    try {
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Password confirmation is required to delete your account'
            });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password. Account deletion cancelled.'
            });
        }

        const userId = user._id;

        // Clean up associated user records from database
        try {
            const Document = require('../models/document.model');
            await Document.deleteMany({ userId });
        } catch (e) {
            console.warn('[DeleteAccount] Cleaned documents warning:', e.message);
        }

        try {
            const StudentListing = require('../models/studentListing.model');
            await StudentListing.deleteMany({ sellerId: userId });
        } catch (e) {
            console.warn('[DeleteAccount] Cleaned listings warning:', e.message);
        }

        // Remove user document
        await User.findByIdAndDelete(userId);

        console.log(`🗑️ [Account Deleted] User ${user.email || user.phone} (${userId}) removed permanently from database.`);

        res.status(200).json({
            success: true,
            message: 'Your account and data have been permanently deleted.'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user onboarding tutorial status
// @route   GET /api/users/onboarding-status
// @access  Private
const getOnboardingStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const status = user.onboardingStatus || 'NOT_STARTED';
        const shouldShowTutorial = status === 'NOT_STARTED';

        res.status(200).json({
            success: true,
            data: {
                onboardingStatus: status,
                shouldShowTutorial,
                onboardingVersion: user.onboardingVersion || 1,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user onboarding status (COMPLETED or SKIPPED)
// @route   POST /api/users/onboarding-status
// @access  Private
const updateOnboardingStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['COMPLETED', 'SKIPPED', 'IN_PROGRESS'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid onboarding status. Must be COMPLETED, SKIPPED, or IN_PROGRESS.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    onboardingStatus: status,
                    onboardingCompletedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        res.status(200).json({
            success: true,
            data: {
                onboardingStatus: user.onboardingStatus,
                onboardingCompletedAt: user.onboardingCompletedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset tutorial (for manual "App Tour" option in settings/help)
// @route   POST /api/users/reset-tutorial
// @access  Private
const resetOnboardingTutorial = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { onboardingStatus: 'NOT_STARTED' } },
            { returnDocument: 'after' }
        );
        res.status(200).json({
            success: true,
            message: 'Tutorial reset successfully. The walkthrough will appear on next home view.',
            data: { onboardingStatus: user.onboardingStatus }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMe,
    updateMe,
    deleteMe,
    getOnboardingStatus,
    updateOnboardingStatus,
    resetOnboardingTutorial
};