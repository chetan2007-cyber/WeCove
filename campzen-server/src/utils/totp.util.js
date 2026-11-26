const crypto = require('crypto');

/**
 * Standard RFC 6238 Time-Based One-Time Password (TOTP) Utility
 * Uses native Node.js crypto (HMAC-SHA1, 30s time window, 6-digit output).
 */

function generateSecret() {
    return crypto.randomBytes(20).toString('hex');
}

function generateTotp(secretHex, timeStep = 30) {
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', Buffer.from(secretHex, 'hex')).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
}

function verifyTotp(inputCode, secretHex, window = 1, timeStep = 30) {
    if (!inputCode || typeof inputCode !== 'string' || inputCode.length !== 6) {
        return false;
    }
    const epoch = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(epoch / timeStep);

    for (let i = -window; i <= window; i++) {
        const counter = currentCounter + i;
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(counter));

        const hmac = crypto.createHmac('sha1', Buffer.from(secretHex, 'hex')).update(timeBuffer).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary =
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);

        const expectedCode = (binary % 1000000).toString().padStart(6, '0');
        if (crypto.timingSafeEqual(Buffer.from(inputCode), Buffer.from(expectedCode))) {
            return true;
        }
    }
    return false;
}

function generateRecoveryCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
        const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
        codes.push(`${part1}-${part2}`);
    }
    return codes;
}

module.exports = {
    generateSecret,
    generateTotp,
    verifyTotp,
    generateRecoveryCodes
};
