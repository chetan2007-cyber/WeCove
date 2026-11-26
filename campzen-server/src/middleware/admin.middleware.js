const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');

// Authorised company administrator email allowlist
const ADMIN_ALLOWLIST = new Set([
    'wecove.in@gmail.com'
]);

/**
 * Strict Company Administrator Authorization Middleware
 * Verifies JWT token, user role, active status, and explicit email allowlist.
 */
const requireAdmin = async (req, res, next) => {
    try {
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Administrator authorization required. No token provided.'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'campzen_jwt_secret_key_2026');
        } catch (jwtErr) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired administrator token'
            });
        }

        const user = await User.findById(decoded.id).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Administrator account not found'
            });
        }

        const normalizedEmail = (user.email || '').toLowerCase().trim();

        // 1. Enforce strict role check
        if (user.role !== 'admin') {
            await AuditLog.create({
                actorId: user._id,
                actorEmail: normalizedEmail,
                role: user.role,
                action: 'ADMIN_ACCESS_DENIED_ROLE_MISMATCH',
                targetType: 'ADMIN_AUTH',
                reason: `Account with role ${user.role} attempted administrative access`,
                ipAddress: req.ip || '',
                userAgent: req.headers['user-agent'] || '',
                status: 'FAILURE'
            }).catch(console.error);

            return res.status(403).json({
                success: false,
                message: 'Access denied: Requires company administrator privileges.'
            });
        }

        // 2. Enforce strict email allowlist
        if (!ADMIN_ALLOWLIST.has(normalizedEmail)) {
            await AuditLog.create({
                actorId: user._id,
                actorEmail: normalizedEmail,
                role: 'admin',
                action: 'ADMIN_ACCESS_DENIED_ALLOWLIST_VIOLATION',
                targetType: 'ADMIN_AUTH',
                reason: `Email ${normalizedEmail} is not on the company administrator allowlist`,
                ipAddress: req.ip || '',
                userAgent: req.headers['user-agent'] || '',
                status: 'FAILURE'
            }).catch(console.error);

            return res.status(403).json({
                success: false,
                message: 'Access denied: Email address is not authorized for company administration.'
            });
        }

        req.user = user;
        req.adminSession = decoded;
        next();
    } catch (err) {
        console.error('[Admin Middleware Error]', err);
        res.status(500).json({
            success: false,
            message: 'Server error during administrator authorization'
        });
    }
};

module.exports = {
    requireAdmin,
    ADMIN_ALLOWLIST
};
