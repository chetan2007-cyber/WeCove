const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { connectTestDB, clearTestDB, closeTestDB, createTestUser } = require('./helpers/test-db');

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

after(async () => {
    await closeTestDB();
});

test('POST /api/auth/register - Successfully register a new user', async () => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Priya Sharma',
            phone: '9876543210',
            email: 'priya@example.com',
            password: 'password123',
            role: 'student'
        });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.name, 'Priya Sharma');
    assert.equal(res.body.user.role, 'student');
});

test('POST /api/auth/register - Rejects duplicate phone number', async () => {
    await createTestUser({ phone: '9876543210' });

    const res = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Another User',
            phone: '9876543210',
            password: 'password123'
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already registered/i);
});

test('POST /api/auth/register - Rejects invalid phone format', async () => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Short Phone',
            phone: '12345',
            password: 'password123'
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
});

test('POST /api/auth/register - Rejects password shorter than 6 characters', async () => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Short Pass',
            phone: '9876543211',
            password: '123'
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
});

test('POST /api/auth/login - Successfully logins with valid credentials', async () => {
    await createTestUser({ phone: '9876543210', password: 'password123' });

    const res = await request(app)
        .post('/api/auth/login')
        .send({
            phone: '9876543210',
            password: 'password123'
        });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
});

test('POST /api/auth/login - Rejects invalid password', async () => {
    await createTestUser({ phone: '9876543210', password: 'password123' });

    const res = await request(app)
        .post('/api/auth/login')
        .send({
            phone: '9876543210',
            password: 'wrongpassword'
        });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid credentials/i);
});

test('POST /api/auth/login - Rejects non-existent user phone', async () => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({
            phone: '0000000000',
            password: 'password123'
        });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
});

test('POST /api/auth/google - Rejects missing idToken with 400', async () => {
    const res = await request(app)
        .post('/api/auth/google')
        .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Google ID token is required/i);
});

test('POST /api/auth/google - Rejects invalid Google token with 401', async () => {
    const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'invalid.google.jwt.token' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Invalid Google token/i);
});

test('POST /api/auth/send-otp - Successfully sends OTP for authenticated user', async () => {
    const { token, user } = await createTestUser();

    const res = await request(app)
        .post('/api/auth/send-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '9988776655' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const updatedUser = await User.findById(user._id).select('+otpCode +otpExpiresAt');
    assert.ok(updatedUser.otpCode);
    assert.ok(updatedUser.otpExpiresAt);
    assert.equal(updatedUser.phone, '9988776655');
});

test('POST /api/auth/send-otp - Rejects phone registered to another user', async () => {
    await createTestUser({ phone: '9988776655' });
    const { token } = await createTestUser({ phone: '9988776644' });

    const res = await request(app)
        .post('/api/auth/send-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '9988776655' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already registered/i);
});

test('POST /api/auth/verify-otp - Successfully verifies OTP', async () => {
    const { token, user } = await createTestUser();
    
    // Send OTP first
    await request(app)
        .post('/api/auth/send-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '9988776655' });

    const dbUser = await User.findById(user._id).select('+otpCode');
    const validOtp = dbUser.otpCode;

    const res = await request(app)
        .post('/api/auth/verify-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ otp: validOtp });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.match(res.body.message, /verified successfully/i);

    const verifiedUser = await User.findById(user._id).select('+otpCode');
    assert.equal(verifiedUser.isPhoneVerified, true);
    assert.equal(verifiedUser.otpCode, undefined);
});

test('POST /api/auth/verify-otp - Rejects invalid OTP', async () => {
    const { token } = await createTestUser();

    await request(app)
        .post('/api/auth/send-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '9988776655' });

    const res = await request(app)
        .post('/api/auth/verify-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ otp: '000000' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Invalid OTP/i);
});

test('POST /api/auth/verify-otp - Rejects expired OTP', async () => {
    const { token, user } = await createTestUser();

    await User.findByIdAndUpdate(user._id, {
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
    });

    const res = await request(app)
        .post('/api/auth/verify-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ otp: '123456' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /expired/i);
});

test('Authentication Security - Rejects unauthenticated request to protected route', async () => {
    const res = await request(app).get('/api/users/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
});

test('Authentication Security - Rejects malformed or tampered token', async () => {
    const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
});
