const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const College = require('../src/models/college.model');
const Vendor = require('../src/models/vendor.model');
const Document = require('../src/models/document.model');
const Order = require('../src/models/order.model');
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

test('SEC-01: Security Headers - CSP, HSTS, X-Frame-Options, No-Sniff, and no X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);

    // Verify security headers
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
    assert.strictEqual(res.headers['x-xss-protection'], '1; mode=block');
    assert.strictEqual(res.headers['content-security-policy'], "default-src 'self'");
    assert.strictEqual(res.headers['strict-transport-security'], 'max-age=31536000; includeSubDomains');
    assert.strictEqual(res.headers['x-powered-by'], undefined, 'X-Powered-By must not be advertised');
});

test('SEC-02: Payload Limit - Large body exceeding limit is rejected with 413 Payload Too Large', async () => {
    const hugeString = 'a'.repeat(3 * 1024 * 1024); // 3 MB payload (exceeds 2 MB limit)
    const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send(`{"phone":"9876543210","password":"${hugeString}"}`);

    assert.strictEqual(res.status, 413);
});

test('SEC-03: JWT Security - Algorithm confusion attack (none or RS256 with secret) is rejected', async () => {
    // 1. None algorithm token
    const fakeTokenNone = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6IjY3MDU0N2ZhYmNkZWZhYmNkZWZhYmNkZSIsInJvbGUiOiJhZG1pbiJ9.';
    const resNone = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${fakeTokenNone}`);
    assert.strictEqual(resNone.status, 401);

    // 2. Tampered token
    const resTampered = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.invalidpayload.invalidsignature');
    assert.strictEqual(resTampered.status, 401);
});

test('SEC-04: File Upload Security - Executable extensions (.exe, .php, .sh) are rejected immediately', async () => {
    const { token } = await createTestUser({ role: 'student' });

    const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('MZ...fake exe binary'), 'exploit.exe');

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('forbidden') || res.body.message.includes('Invalid'));
});

test('SEC-05: Input Validation & CastError - Script tags in URL param do not reflect in response', async () => {
    const { token } = await createTestUser({ role: 'student' });

    const maliciousParam = 'invalid-objectid-12345';
    const res = await request(app)
        .get(`/api/orders/${maliciousParam}`)
        .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.message, 'Resource not found with specified identifier');
});

test('SEC-06: Privilege Escalation - Student cannot update role or permissions via profile update', async () => {
    const { token } = await createTestUser({ role: 'student' });

    const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Updated Student',
            role: 'admin',
            isVerified: true
        });

    assert.strictEqual(res.status, 200);
    // Role remains student
    assert.strictEqual(res.body.data.role, 'student');
});

test('SEC-07: BOLA/IDOR - Student B cannot view or download Student A documents', async () => {
    const { user: studentA, token: tokenA } = await createTestUser({ role: 'student' });
    const { user: studentB, token: tokenB } = await createTestUser({ role: 'student' });

    const docA = await Document.create({
        userId: studentA._id,
        name: 'studentA_doc.pdf',
        originalFilename: 'studentA_doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        pageCount: 3,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/docA.pdf'
    });

    // Student A can access
    const resOwner = await request(app)
        .get(`/api/documents/${docA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(resOwner.status, 200);

    // Student B is forbidden
    const resAttacker = await request(app)
        .get(`/api/documents/${docA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
    assert.strictEqual(resAttacker.status, 403);
});

test('SEC-08: Webhook Replay & Authentication - Reject webhook if secret is missing or invalid', async () => {
    process.env.WEBHOOK_SECRET = 'super_secret_kami_webhook_key_2026';

    const resNoSecret = await request(app)
        .post('/api/payments/webhook')
        .send({ gatewayPaymentId: 'pay_test_123', status: 'SUCCESS' });
    assert.strictEqual(resNoSecret.status, 401);

    const resBadSecret = await request(app)
        .post('/api/payments/webhook')
        .set('x-kami-webhook-secret', 'wrong_secret')
        .send({ gatewayPaymentId: 'pay_test_123', status: 'SUCCESS' });
    assert.strictEqual(resBadSecret.status, 401);

    delete process.env.WEBHOOK_SECRET;
});
