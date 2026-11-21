const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
const College = require('../src/models/college.model');
const Order = require('../src/models/order.model');
const Payment = require('../src/models/payment.model');
const OrderEvent = require('../src/models/orderEvent.model');
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

test('Concurrency: Concurrent duplicate payment webhooks are handled safely without duplicate paid events', async () => {
    const college = await College.create({
        name: 'MIT Mysore',
        location: 'Belawadi',
        city: 'Mysuru',
        state: 'Karnataka'
    });
    const { user: owner } = await createTestUser({ role: 'vendor_owner' });
    const vendor = await Vendor.create({
        name: 'Speedy Xerox',
        ownerId: owner._id,
        collegeId: college._id,
        address: { line1: 'Gate 1' }
    });
    const { user: student, token: studentToken } = await createTestUser({ role: 'student' });
    const order = await Order.create({
        orderNumber: 'KAMI-RACE-001',
        userId: student._id,
        vendorId: vendor._id,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 50,
        total: 52,
        status: 'PAYMENT_PENDING'
    });

    const intentRes = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId: order._id });

    const gatewayPaymentId = intentRes.body.data.gatewayPaymentId;

    // Send 5 concurrent webhook calls simultaneously using Promise.all
    const webhookCalls = Array.from({ length: 5 }).map(() =>
        request(app)
            .post('/api/payments/webhook')
            .send({
                gatewayPaymentId,
                status: 'successful',
                method: 'UPI'
            })
    );

    const responses = await Promise.all(webhookCalls);

    // All should succeed with 200
    for (const res of responses) {
        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
    }

    // Verify database state: order must be PAID
    const finalOrder = await Order.findById(order._id);
    assert.equal(finalOrder.status, 'PAID');

    // Only one PAID OrderEvent should exist
    const paidEvents = await OrderEvent.find({ orderId: order._id, toStatus: 'PAID' });
    assert.equal(paidEvents.length, 1);
});
