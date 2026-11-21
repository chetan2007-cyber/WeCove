/**
 * Kami - Authoritative OTP & Security Utilities
 */

const crypto = require('crypto');

const OTP_SECRET_SALT = process.env.OTP_SALT || 'kami_otp_production_salt_2026';

/**
 * Generate a random 6-digit numeric OTP code
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash an OTP using SHA-256 with server-side salt
 */
const hashOTP = (otp) => {
    if (!otp) return '';
    return crypto
        .createHash('sha256')
        .update(`${otp}:${OTP_SECRET_SALT}`)
        .digest('hex');
};

/**
 * Verify whether an entered OTP matches the stored hash using constant-time comparison
 */
const verifyOTPHash = (enteredOtp, storedHash) => {
    if (!enteredOtp || !storedHash) return false;
    const computedHash = hashOTP(enteredOtp);
    try {
        const bufferA = Buffer.from(computedHash, 'hex');
        const bufferB = Buffer.from(storedHash, 'hex');
        if (bufferA.length !== bufferB.length) return false;
        return crypto.timingSafeEqual(bufferA, bufferB);
    } catch {
        return computedHash === storedHash;
    }
};

/**
 * Mask an email address for privacy (e.g. "chetan@example.com" -> "c***n@example.com")
 */
const maskEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [name, domain] = parts;
    if (name.length <= 2) {
        return `${name[0]}*@${domain}`;
    }
    return `${name[0]}${'*'.repeat(Math.max(3, name.length - 2))}${name[name.length - 1]}@${domain}`;
};

module.exports = {
    generateOTP,
    hashOTP,
    verifyOTPHash,
    maskEmail
};
