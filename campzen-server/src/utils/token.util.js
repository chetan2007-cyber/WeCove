const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Access token lifetime: 30 minutes
const ACCESS_TOKEN_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '30m';
// Refresh token lifetime: 30 days
const REFRESH_TOKEN_DAYS = 30;

/**
 * Generate short-lived JWT Access Token
 */
const generateAccessToken = (user) => {
    const payload = {
        id: user._id ? user._id.toString() : user.id,
        role: user.role
    };
    return jwt.sign(payload, process.env.JWT_SECRET || 'campzen_jwt_secret_2026', {
        expiresIn: ACCESS_TOKEN_EXPIRE
    });
};

/**
 * Generate cryptographically secure random refresh token string (64 hex chars)
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * SHA-256 hash of refresh token for safe database persistence
 */
const hashRefreshToken = (token) => {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Calculate expiration Date for a refresh token (30 days from now)
 */
const getRefreshTokenExpiry = () => {
    const d = new Date();
    d.setDate(d.getDate() + REFRESH_TOKEN_DAYS);
    return d;
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiry,
    REFRESH_TOKEN_DAYS
};
