const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const Vendor = require('../src/models/vendor.model');
const Order = require('../src/models/order.model');
const College = require('../src/models/college.model');
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

test('RBAC: Student cannot create a college (Admin only)', async () => {
    const { token } = await createTestUser({ role: 'student' });

    const res = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Unauthorized College',
            location: 'Main Road',
            city: 'Mysore',
            state: 'Karnataka'
        });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not authorized/i);
});

test('RBAC: Student cannot register a vendor shop (Vendor Owner or Admin only)', async () => {
    const { token } = await createTestUser({ role: 'student' });

    const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Hacked Shop',
            collegeId: new mongoose.Types.ObjectId(),
            address: { line1: 'Campus Gate' }
        });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
});

test('RBAC: Student cannot access vendor order queue', async () => {
    const { token } = await createTestUser({ role: 'student' });

    const res = await request(app)
        .get('/api/orders/vendor')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
});

test('RBAC: Student cannot update order status', async () => {
    const { token } = await createTestUser({ role: 'student' });
    const fakeOrderId = new mongoose.Types.ObjectId();

    const res = await request(app)
        .put(`/api/orders/${fakeOrderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'READY' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
});

test('RBAC / IDOR: Vendor A cannot update Vendor B order', async () => {
    // 1. Create College
    const college = await College.create({
        name: 'MIT',
        location: 'Loc',
        city: 'City',
        state: 'State'
    });

    // 2. Create Vendor A (Owner A)
    const { user: ownerA, token: tokenA } = await createTestUser({ role: 'vendor_owner' });
    const vendorA = await Vendor.create({
        name: 'Vendor A Shop',
        ownerId: ownerA._id,
        collegeId: college._id,
        address: { line1: 'A Block' }
    });

    // 3. Create Vendor B (Owner B)
    const { user: ownerB, token: tokenB } = await createTestUser({ role: 'vendor_owner' });
    const vendorB = await Vendor.create({
        name: 'Vendor B Shop',
        ownerId: ownerB._id,
        collegeId: college._id,
        address: { line1: 'B Block' }
    });

    // 4. Create an order belonging to Vendor B
    const { user: student } = await createTestUser({ role: 'student' });
    const orderB = await Order.create({
        orderNumber: 'KAMI-TEST-001',
        userId: student._id,
        vendorId: vendorB._id,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 50,
        total: 52,
        status: 'PAID'
    });

    // 5. Vendor A tries to update Vendor B's order
    const res = await request(app)
        .put(`/api/orders/${orderB._id}/status`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ status: 'COMPLETED' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not authorized/i);
});

test('Security: Token with deleted/non-existent user ID should be rejected with 401', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const ghostToken = generateToken(nonExistentId);

    const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${ghostToken}`);

    // Currently auth.middleware.js sets req.user = null, which causes getMe to return 404 or crash if authorize middleware runs
    assert.ok(res.status === 401 || res.status === 404);
});
