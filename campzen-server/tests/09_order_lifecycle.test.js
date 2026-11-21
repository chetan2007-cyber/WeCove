const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
const College = require('../src/models/college.model');
const Document = require('../src/models/document.model');
const RateCard = require('../src/models/rateCard.model');
const Order = require('../src/models/order.model');
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

const setupOrderPrerequisites = async () => {
    const college = await College.create({
        name: 'MIT Mysore',
        location: 'Belawadi',
        city: 'Mysuru',
        state: 'Karnataka'
    });

    const { user: vendorOwner, token: vendorToken } = await createTestUser({ role: 'vendor_owner' });
    const vendor = await Vendor.create({
        name: 'Campus Xerox Center',
        ownerId: vendorOwner._id,
        collegeId: college._id,
        address: { line1: 'Campus Canteen' },
        status: 'active',
        delivery: { isAvailable: true, fee: 10 }
    });

    await RateCard.create({
        vendorId: vendor._id,
        paperSize: 'A4',
        paperType: '70gsm',
        colorMode: 'B&W',
        sides: 'single',
        minPages: 1,
        maxPages: 9999,
        pricePerPage: 2.00
    });

    const { user: student, token: studentToken } = await createTestUser({ role: 'student' });
    const document = await Document.create({
        userId: student._id,
        originalFilename: 'assignment.pdf',
        mimeType: 'application/pdf',
        storageKeyOriginal: 'test-assignment.pdf',
        fileSize: 1024,
        pageCount: 10,
        processingStatus: 'completed'
    });

    return { college, vendor, vendorOwner, vendorToken, student, studentToken, document };
};

test('POST /api/orders - Student successfully creates a print order with calculated pricing', async () => {
    const { vendor, studentToken, document } = await setupOrderPrerequisites();

    const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            documentId: document._id,
            vendorId: vendor._id,
            fulfillmentType: 'pickup',
            printSettings: {
                pageRange: 'all',
                copies: 2,
                colorMode: 'B&W',
                sides: 'single',
                paperSize: 'A4',
                paperType: '70gsm',
                pagesPerSheet: 1
            }
        });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.order);
    assert.equal(res.body.data.order.status, 'PAYMENT_PENDING');
    assert.match(res.body.data.order.orderNumber, /^KAMI-/);
    assert.equal(res.body.data.order.subtotal, 40);
    assert.equal(res.body.data.order.platformFee, 2);
    assert.equal(res.body.data.order.deliveryFee, 0);
    assert.equal(res.body.data.order.total, 42);

    const events = await OrderEvent.find({ orderId: res.body.data.order._id });
    assert.equal(events.length, 1);
    assert.equal(events[0].toStatus, 'PAYMENT_PENDING');
});

test('GET /api/orders and GET /api/orders/:id - Student retrieves order history and single order details', async () => {
    const { vendor, studentToken, document } = await setupOrderPrerequisites();

    const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            documentId: document._id,
            vendorId: vendor._id,
            fulfillmentType: 'pickup',
            printSettings: { copies: 1 }
        });
    const orderId = createRes.body.data.order._id;

    // 1. List student orders
    const listRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.count, 1);
    assert.equal(listRes.body.data[0]._id.toString(), orderId.toString());

    // 2. Retrieve single order
    const getRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.order._id.toString(), orderId.toString());
    assert.ok(getRes.body.data.printJob);
    assert.ok(getRes.body.data.timeline.length >= 1);
});

test('IDOR Security: Student B cannot view Student A order', async () => {
    const { vendor, studentToken, document } = await setupOrderPrerequisites();
    const { token: studentBToken } = await createTestUser({ role: 'student' });

    const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            documentId: document._id,
            vendorId: vendor._id,
            fulfillmentType: 'pickup',
            printSettings: { copies: 1 }
        });
    const orderId = createRes.body.data.order._id;

    const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${studentBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not authorized/i);
});

test('Order Workflow: Vendor transitions order and verifies counter pickup OTP', async () => {
    const { vendor, vendorToken, studentToken, document } = await setupOrderPrerequisites();

    const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            documentId: document._id,
            vendorId: vendor._id,
            fulfillmentType: 'pickup',
            printSettings: { copies: 1 }
        });
    const orderId = createRes.body.data.order._id;

    // Simulate payment webhook completion: sets status = PAID and generates pickupCode
    await Order.findByIdAndUpdate(orderId, {
        status: 'PAID',
        pickupCode: '4321'
    });

    // 1. Vendor marks as PRINTING
    const printRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'PRINTING', note: 'Machine 2 started' });
    assert.equal(printRes.status, 200);
    assert.equal(printRes.body.data.status, 'PRINTING');

    // 2. Attempt invalid transition (PRINTING -> COMPLETED directly)
    const invalidRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'COMPLETED' });
    assert.equal(invalidRes.status, 400);
    assert.match(invalidRes.body.message, /invalid status transition/i);

    // 3. Mark as READY
    const readyRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'READY', note: 'Counter ready' });
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.body.data.status, 'READY');

    // 4. Submit wrong pickup code
    const wrongCodeRes = await request(app)
        .post(`/api/orders/${orderId}/pickup`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ pickupCode: '0000' });
    assert.equal(wrongCodeRes.status, 400);
    assert.match(wrongCodeRes.body.message, /invalid pickup code/i);

    // 5. Submit valid pickup code
    const validCodeRes = await request(app)
        .post(`/api/orders/${orderId}/pickup`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ pickupCode: '4321' });
    assert.equal(validCodeRes.status, 200);
    assert.equal(validCodeRes.body.data.status, 'COMPLETED');

    // 6. Attempt pickup again (should reject duplicate pickup)
    const duplicatePickupRes = await request(app)
        .post(`/api/orders/${orderId}/pickup`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ pickupCode: '4321' });
    assert.equal(duplicatePickupRes.status, 400);
    assert.match(duplicatePickupRes.body.message, /already been picked up/i);
});
