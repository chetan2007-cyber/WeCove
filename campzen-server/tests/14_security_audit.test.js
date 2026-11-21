const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
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

test('Security: NoSQL Injection attempt in login is rejected', async () => {
    await createTestUser({ phone: '9876543210', password: 'password123' });

    // Attempt NoSQL operator injection: { "$ne": null }
    const res = await request(app)
        .post('/api/auth/login')
        .send({
            phone: { $ne: null },
            password: 'password123'
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
});

test('Security: Malformed JSON payload returns clean 400 Bad Request without server crash', async () => {
    const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"phone": 9876543210, "password": broken_json');

    // Should return 400, not 500
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
});

const Document = require('../src/models/document.model');

test('Security: Path traversal attempt in upload filename does not escape uploads directory', async () => {
    const { token } = await createTestUser();

    // Supertest attach with a traversal name
    const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('%PDF-1.4 dummy content'), '../../hacked.pdf');

    if (res.status === 201) {
        // Filename in storage must NOT contain path traversal characters
        assert.doesNotMatch(res.body.data.storageKeyOriginal, /\.\./);
        // Wait for background processing to settle before closing DB connection
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 100));
            const doc = await Document.findById(res.body.data._id);
            if (doc && (doc.processingStatus === 'completed' || doc.processingStatus === 'failed')) break;
        }
    }
});

test('Security: Token forgery with "none" algorithm is rejected', async () => {
    // Generate forged token with "alg": "none"
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: '65f1234567890abcdef12345', role: 'admin' })).toString('base64url');
    const forgedToken = `${header}.${payload}.`;

    const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${forgedToken}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
});

test('Security: Suspended user token is rejected with 403 Forbidden', async () => {
    const { user, token } = await createTestUser({ role: 'student', status: 'suspended' });

    const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /suspended or deactivated/i);
});

test('Security: HTTP security headers (nosniff, DENY, XSS) are present', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-xss-protection'], '1; mode=block');
});

test('Security: Webhook rejects unauthenticated requests when WEBHOOK_SECRET is active', async () => {
    process.env.WEBHOOK_SECRET = 'secure_test_webhook_secret_key_987';
    try {
        const res = await request(app)
            .post('/api/payments/webhook')
            .send({ gatewayPaymentId: 'mock_pay_123', status: 'successful' });

        assert.equal(res.status, 401);
        assert.equal(res.body.success, false);
        assert.match(res.body.message, /unauthorized/i);
    } finally {
        delete process.env.WEBHOOK_SECRET;
    }
});

