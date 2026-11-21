const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/test-db');
const { getDevOutbox, clearDevOutbox } = require('../src/services/email.service');
const { hashOTP } = require('../src/utils/otp');

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
    clearDevOutbox();
});

after(async () => {
    await closeTestDB();
});

test('EMAIL OTP FLOW: Full journey from signup to verified login', async () => {
    const email = 'chetan@example.com';
    const password = 'password123';

    // 1. SIGNUP: Student enters details
    const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
            name: 'Chetan Sharma',
            email,
            password,
            college: 'MIT Mysuru'
        });

    assert.equal(signupRes.status, 201);
    assert.equal(signupRes.body.success, true);
    assert.equal(signupRes.body.requiresVerification, true);
    assert.equal(signupRes.body.isVerified, false);
    // CRITICAL: NO token should be issued on signup
    assert.equal(signupRes.body.token, undefined);

    // Verify DB state: User is unverified and has hashed OTP
    const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt');
    assert.ok(user);
    assert.equal(user.isVerified, false);
    assert.equal(user.collegeName, 'MIT Mysuru');
    assert.ok(user.otpHash);
    assert.ok(user.otpExpiresAt);

    // Verify email was dispatched to student
    const outbox = getDevOutbox();
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].to, email);
    // Extract the simulated OTP from email content
    const otpMatch = outbox[0].text.match(/\b\d{6}\b/);
    assert.ok(otpMatch);
    const generatedOtp = otpMatch[0];

    // Verify hash matches
    assert.equal(hashOTP(generatedOtp), user.otpHash);

    // 2. LOGIN BEFORE VERIFICATION: Must be rejected
    const unverifiedLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
            email,
            password
        });

    assert.equal(unverifiedLoginRes.status, 403);
    assert.equal(unverifiedLoginRes.body.success, false);
    assert.equal(unverifiedLoginRes.body.isUnverified, true);
    assert.equal(unverifiedLoginRes.body.email, email);
    assert.match(unverifiedLoginRes.body.message, /verify your email/i);
    assert.equal(unverifiedLoginRes.body.token, undefined);

    // 3. OTP VERIFICATION: Incorrect OTP must fail cleanly
    const wrongOtpRes = await request(app)
        .post('/api/auth/verify-email')
        .send({
            email,
            otp: '000000'
        });

    assert.equal(wrongOtpRes.status, 400);
    assert.equal(wrongOtpRes.body.success, false);
    assert.match(wrongOtpRes.body.message, /incorrect verification code/i);

    // 4. OTP VERIFICATION: Correct OTP succeeds
    const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({
            email,
            otp: generatedOtp
        });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.isVerified, true);
    // CRITICAL: Must NOT auto-login or return token
    assert.equal(verifyRes.body.token, undefined);

    // Verify DB state: isVerified = true, OTP fields unset
    const verifiedUser = await User.findOne({ email }).select('+otpHash');
    assert.equal(verifiedUser.isVerified, true);
    assert.equal(verifiedUser.otpHash, undefined);

    // 5. LOGIN AFTER VERIFICATION: Normal login succeeds and returns JWT
    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
            email,
            password
        });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    assert.ok(loginRes.body.token);
    assert.equal(loginRes.body.user.email, email);
    assert.equal(loginRes.body.user.isVerified, true);
});

test('EMAIL OTP FLOW: Resend OTP cooldown and invalidation of old OTP', async () => {
    const email = 'resend_test@example.com';

    await request(app)
        .post('/api/auth/signup')
        .send({
            name: 'Resend Tester',
            email,
            password: 'password123'
        });

    const firstOtp = getDevOutbox()[0].text.match(/\b\d{6}\b/)[0];

    // Immediate resend must hit 60-second cooldown (429 Too Many Requests)
    const cooldownRes = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email });

    assert.equal(cooldownRes.status, 429);
    assert.equal(cooldownRes.body.success, false);
    assert.match(cooldownRes.body.message, /wait/i);

    // Fast-forward cooldown by modifying otpLastSentAt
    await User.findOneAndUpdate(
        { email },
        { otpLastSentAt: new Date(Date.now() - 65 * 1000) }
    );

    // Resend after cooldown expires
    const resendRes = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email });

    assert.equal(resendRes.status, 200);
    assert.equal(resendRes.body.success, true);

    const outbox = getDevOutbox();
    assert.equal(outbox.length, 2);
    const secondOtp = outbox[1].text.match(/\b\d{6}\b/)[0];

    // The old OTP must be invalidated
    const oldVerifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({
            email,
            otp: firstOtp
        });
    assert.equal(oldVerifyRes.status, 400);

    // The new OTP must work
    const newVerifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({
            email,
            otp: secondOtp
        });
    assert.equal(newVerifyRes.status, 200);
    assert.equal(newVerifyRes.body.isVerified, true);
});

test('EMAIL OTP FLOW: Expired OTP is rejected', async () => {
    const email = 'expired_test@example.com';

    await request(app)
        .post('/api/auth/signup')
        .send({
            name: 'Expired Tester',
            email,
            password: 'password123'
        });

    const otp = getDevOutbox()[0].text.match(/\b\d{6}\b/)[0];

    // Expire the OTP in DB
    await User.findOneAndUpdate(
        { email },
        { otpExpiresAt: new Date(Date.now() - 1000) }
    );

    const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({
            email,
            otp
        });

    assert.equal(verifyRes.status, 400);
    assert.match(verifyRes.body.message, /expired/i);
});

test('EMAIL OTP FLOW: Maximum failed attempts locking', async () => {
    const email = 'max_attempts@example.com';

    await request(app)
        .post('/api/auth/signup')
        .send({
            name: 'Brute Force Tester',
            email,
            password: 'password123'
        });

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
        const res = await request(app)
            .post('/api/auth/verify-email')
            .send({
                email,
                otp: '111111'
            });
        assert.equal(res.status, 400);
    }

    // 6th attempt should state maximum attempts exceeded
    const res6 = await request(app)
        .post('/api/auth/verify-email')
        .send({
            email,
            otp: '111111'
        });

    assert.equal(res6.status, 400);
    assert.match(res6.body.message, /maximum/i);
});

test('EMAIL OTP FLOW: Duplicate verified signup rejected, unverified retry allowed', async () => {
    const email = 'dup_test@example.com';

    // 1. First signup
    await request(app)
        .post('/api/auth/signup')
        .send({
            name: 'User 1',
            email,
            password: 'password123'
        });

    // 2. Retry signup while unverified: Allowed (updates and resends OTP)
    const retryRes = await request(app)
        .post('/api/auth/signup')
        .send({
            name: 'User 1 Renamed',
            email,
            password: 'newpassword456'
        });
    assert.equal(retryRes.status, 201);
    assert.equal(retryRes.body.requiresVerification, true);

    const latestOtp = getDevOutbox()[1].text.match(/\b\d{6}\b/)[0];

    // 3. Verify user
    await request(app)
        .post('/api/auth/verify-email')
        .send({
            email,
            otp: latestOtp
        });

    // 4. Duplicate signup after verified: Must be rejected
    const dupRes = await request(app)
        .post('/api/auth/signup')
        .send({
            name: 'User 1 Again',
            email,
            password: 'password123'
        });

    assert.equal(dupRes.status, 400);
    assert.match(dupRes.body.message, /already registered/i);
});
