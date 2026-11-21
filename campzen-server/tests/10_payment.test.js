const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
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

const setupTestOrder = async () => {
    const college = await College.create({
        name: 'MIT',
        location: 'Belawadi',
        city: 'Mysuru',
        state: 'Karnataka'
    });
    const { user: owner } = await createTestUser({ role: 'vendor_owner' });
    const vendor = await Vendor.create({
        name: 'Print Shop',
        ownerId: owner._id,
        collegeId: college._id,
        address: { line1: 'Gate 1' }
    });
    const { user: student, token: studentToken } = await createTestUser({ role: 'student' });
    const order = await Order.create({
        orderNumber: 'KAMI-PAY-001',
        userId: student._id,
        vendorId: vendor._id,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 50,
        platformFee: 2,
        total: 52,
        status: 'PAYMENT_PENDING'
    });

    return { order, student, studentToken };
};

test('POST /api/payments/mock-intent - Successfully creates payment intent for pending order', async () => {
    const { order, studentToken } = await setupTestOrder();

    const res = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId: order._id });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.gatewayPaymentId);
    assert.equal(res.body.data.amount, 52);
    assert.equal(res.body.data.status, 'pending');
});

test('POST /api/payments/mock-intent - Rejects intent when order is already PAID', async () => {
    const { order, studentToken } = await setupTestOrder();
    await Order.findByIdAndUpdate(order._id, { status: 'PAID' });

    const res = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId: order._id });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not pending payment/i);
});

test('POST /api/payments/webhook - Processes successful payment and updates order to PAID', async () => {
    const { order, studentToken } = await setupTestOrder();

    const intentRes = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId: order._id });

    const gatewayPaymentId = intentRes.body.data.gatewayPaymentId;

    const webhookRes = await request(app)
        .post('/api/payments/webhook')
        .send({
            gatewayPaymentId,
            status: 'successful',
            method: 'UPI'
        });

    assert.equal(webhookRes.status, 200);
    assert.equal(webhookRes.body.success, true);
    assert.match(webhookRes.body.message, /Webhook processed/i);

    // Verify Order is now PAID
    const updatedOrder = await Order.findById(order._id);
    assert.equal(updatedOrder.status, 'PAID');

    // Verify Payment document is updated
    const payment = await Payment.findOne({ gatewayPaymentId });
    assert.equal(payment.status, 'successful');
    assert.equal(payment.method, 'UPI');
    assert.ok(payment.paidAt);

    // Verify OrderEvent was logged
    const event = await OrderEvent.findOne({ orderId: order._id, toStatus: 'PAID' });
    assert.ok(event);
});

test('POST /api/payments/webhook - Idempotency: Duplicate webhook calls do not duplicate side effects', async () => {
    const { order, studentToken } = await setupTestOrder();

    const intentRes = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId: order._id });

    const gatewayPaymentId = intentRes.body.data.gatewayPaymentId;

    // Call 1
    const res1 = await request(app)
        .post('/api/payments/webhook')
        .send({ gatewayPaymentId, status: 'successful', method: 'UPI' });
    assert.equal(res1.status, 200);

    // Call 2 (Duplicate)
    const res2 = await request(app)
        .post('/api/payments/webhook')
        .send({ gatewayPaymentId, status: 'successful', method: 'UPI' });
    assert.equal(res2.status, 200);
    assert.match(res2.body.message, /already processed/i);

    // Call 3 (Duplicate)
    const res3 = await request(app)
        .post('/api/payments/webhook')
        .send({ gatewayPaymentId, status: 'successful', method: 'UPI' });
    assert.equal(res3.status, 200);
    assert.match(res3.body.message, /already processed/i);

    // Exactly 1 'PAID' OrderEvent should exist
    const paidEvents = await OrderEvent.find({ orderId: order._id, toStatus: 'PAID' });
    assert.equal(paidEvents.length, 1);
});

test('POST /api/payments/webhook - Rejects non-existent gateway payment ID with 404', async () => {
    const res = await request(app)
        .post('/api/payments/webhook')
        .send({
            gatewayPaymentId: 'mock_pay_nonexistent',
            status: 'successful'
        });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
});
