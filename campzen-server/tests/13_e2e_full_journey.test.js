const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const app = require('../src/app');
const College = require('../src/models/college.model');
const Vendor = require('../src/models/vendor.model');
const Document = require('../src/models/document.model');
const Order = require('../src/models/order.model');
const OrderEvent = require('../src/models/orderEvent.model');
const Payment = require('../src/models/payment.model');
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

test('PHASE 35: Realistic Full Student & Vendor Journey E2E Test', async () => {
    // 1. Create College (Admin)
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const collegeRes = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'MIT Mysore Campus',
            location: 'Belawadi, PB No. 2',
            city: 'Mysuru',
            state: 'Karnataka',
            domain: 'mitmysore.in'
        });
    assert.equal(collegeRes.status, 201);
    const collegeId = collegeRes.body.data._id;

    // 2. Register & Login Student
    const studentPhone = '9876501234';
    const regRes = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Aditya Rao',
            phone: studentPhone,
            email: 'aditya@mitmysore.in',
            password: 'password123',
            role: 'student'
        });
    assert.equal(regRes.status, 201);
    const studentToken = regRes.body.token;
    const studentId = regRes.body.user.id;

    // 3. Register Vendor Owner & Shop
    const vendorPhone = '9876505678';
    const vRegRes = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Shop Owner Ramesh',
            phone: vendorPhone,
            password: 'password123',
            role: 'vendor_owner'
        });
    assert.equal(vRegRes.status, 201);
    const vendorToken = vRegRes.body.token;

    const shopRes = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
            name: 'Ramesh Fast Xerox',
            collegeId,
            address: { line1: 'Behind Library', landmark: 'Campus Ground' },
            capabilities: {
                colorPrinting: true,
                paperSizes: ['A4', 'A3'],
                bindingTypes: ['spiral_binding', 'stapling']
            },
            delivery: { isAvailable: false }
        });
    assert.equal(shopRes.status, 201);
    const vendorId = shopRes.body.data._id;

    // 4. Configure Vendor Rate Cards
    const rcRes = await request(app)
        .post('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
            paperSize: 'A4',
            paperType: '70gsm',
            colorMode: 'B&W',
            sides: 'single',
            minPages: 1,
            maxPages: 100,
            pricePerPage: 1.50
        });
    assert.equal(rcRes.status, 201);

    // 5. Configure Vendor Finishing Rates
    const frRes = await request(app)
        .post('/api/vendors/finishing-rates')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
            finishingType: 'spiral_binding',
            price: 25.00
        });
    assert.equal(frRes.status, 201);

    // 6. Student uploads real PDF document
    const pdfPath = path.resolve(__dirname, '../real-dummy.pdf');
    const uploadRes = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('file', pdfPath);

    assert.equal(uploadRes.status, 201);
    const documentId = uploadRes.body.data._id;

    // Wait for background PDF processing
    let docCheckRes;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 200));
        docCheckRes = await request(app)
            .get(`/api/documents/${documentId}`)
            .set('Authorization', `Bearer ${studentToken}`);
        if (docCheckRes.body.data && docCheckRes.body.data.processingStatus === 'completed') {
            break;
        }
    }
    assert.equal(docCheckRes.status, 200);
    assert.equal(docCheckRes.body.data.processingStatus, 'completed');
    const totalPages = docCheckRes.body.data.pageCount;
    assert.ok(totalPages >= 1);

    // 7. Student places Order: 2 copies, single side, spiral binding
    const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            documentId,
            vendorId,
            fulfillmentType: 'pickup',
            printSettings: {
                pageRange: 'all',
                copies: 2,
                colorMode: 'B&W',
                sides: 'single',
                paperSize: 'A4',
                paperType: '70gsm',
                pagesPerSheet: 1,
                finishing: [{ type: 'spiral_binding' }]
            }
        });

    assert.equal(orderRes.status, 201);
    const order = orderRes.body.data.order;
    const orderId = order._id;
    assert.equal(order.status, 'PAYMENT_PENDING');

    // Expected calculation:
    // printCost = totalPages * 1.50 * 2 copies
    // finishingCost = 25.00 * 2 copies = 50.00
    // platformFee = 2.00
    const expectedSubtotal = (totalPages * 1.50 * 2) + 50.00;
    const expectedTotal = expectedSubtotal + 2.00;
    assert.equal(order.subtotal, expectedSubtotal);
    assert.equal(order.total, expectedTotal);

    // 8. Create Payment Intent
    const intentRes = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId });
    assert.equal(intentRes.status, 201);
    const gatewayPaymentId = intentRes.body.data.gatewayPaymentId;

    // 9. Payment Webhook Callback
    const webhookRes = await request(app)
        .post('/api/payments/webhook')
        .send({
            gatewayPaymentId,
            status: 'successful',
            method: 'UPI'
        });
    assert.equal(webhookRes.status, 200);

    // 10. Student checks order: status should be PAID and pickup code assigned
    const paidOrderRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(paidOrderRes.status, 200);
    assert.equal(paidOrderRes.body.data.order.status, 'PAID');
    const pickupCode = paidOrderRes.body.data.order.pickupCode;
    assert.ok(pickupCode);

    // Fast-forward 60s editing window so vendor can print
    await Order.findByIdAndUpdate(orderId, {
        $set: {
            editWindowEndsAt: new Date(Date.now() - 1000),
            editable: false
        }
    });

    // 11. Vendor checks queue
    const queueRes = await request(app)
        .get('/api/orders/vendor')
        .set('Authorization', `Bearer ${vendorToken}`);
    assert.equal(queueRes.status, 200);
    assert.equal(queueRes.body.count, 1);
    assert.equal(queueRes.body.data[0]._id.toString(), orderId.toString());

    // 12. Vendor transitions order: PAID -> PRINTING -> FINISHING -> READY
    const step1 = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'PRINTING', note: 'Printing pages now' });
    assert.equal(step1.status, 200);

    const step2 = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'FINISHING', note: 'Spiral binding in progress' });
    assert.equal(step2.status, 200);

    const step3 = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'READY', note: 'Package at counter' });
    assert.equal(step3.status, 200);

    // 13. Student counter pickup with pickup code
    const pickupRes = await request(app)
        .post(`/api/orders/${orderId}/pickup`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ pickupCode });

    assert.equal(pickupRes.status, 200);
    assert.equal(pickupRes.body.data.status, 'COMPLETED');

    // 14. Verify final database state & audit trail
    const finalTimeline = await OrderEvent.find({ orderId }).sort({ createdAt: 1 });
    // Status progression: PAYMENT_PENDING -> PAID -> PRINTING -> FINISHING -> READY -> COMPLETED
    const statuses = finalTimeline.map(e => e.toStatus);
    assert.deepEqual(statuses, ['PAYMENT_PENDING', 'PAID', 'PRINTING', 'FINISHING', 'READY', 'COMPLETED']);
});

test('PHASE 36: Negative E2E Scenarios', async () => {
    // 0. Setup College & Vendor
    const college = await College.create({
        name: 'Negative Test College',
        location: 'Campus Ground',
        city: 'Mysuru',
        state: 'Karnataka'
    });
    const { user: vendorOwnerB, token: vendorTokenB } = await createTestUser({ role: 'vendor_owner' });
    const vendorB = await Vendor.create({
        name: 'Negative Test Shop',
        ownerId: vendorOwnerB._id,
        collegeId: college._id,
        address: { line1: 'Gate 3' }
    });

    // Scenario A: Payment Failure leaves order in PAYMENT_PENDING
    const { user: student, token: studentToken } = await createTestUser();

    const orderA = await Order.create({
        orderNumber: 'KAMI-NEG-001',
        userId: student._id,
        vendorId: vendorB._id,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 10,
        total: 12,
        status: 'PAYMENT_PENDING'
    });

    const intentRes = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId: orderA._id });

    const failWebhook = await request(app)
        .post('/api/payments/webhook')
        .send({
            gatewayPaymentId: intentRes.body.data.gatewayPaymentId,
            status: 'failed'
        });
    assert.equal(failWebhook.status, 200);

    const checkOrder = await Order.findById(orderA._id);
    assert.equal(checkOrder.status, 'PAYMENT_PENDING'); // Must not become PAID

    // Scenario B: Invalid pickup code
    const readyOrder = await Order.create({
        orderNumber: 'KAMI-NEG-002',
        userId: student._id,
        vendorId: vendorB._id,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 10,
        total: 12,
        status: 'READY',
        pickupCode: '9999'
    });

    const invalidPickup = await request(app)
        .post(`/api/orders/${readyOrder._id}/pickup`)
        .set('Authorization', `Bearer ${vendorTokenB}`)
        .send({ pickupCode: '1111' });
    assert.equal(invalidPickup.status, 400);

    // Scenario C: Cannot pickup non-ready order
    const pendingOrder = await Order.create({
        orderNumber: 'KAMI-NEG-003',
        userId: student._id,
        vendorId: vendorB._id,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 10,
        total: 12,
        status: 'PRINTING',
        pickupCode: '9999'
    });

    const notReadyPickup = await request(app)
        .post(`/api/orders/${pendingOrder._id}/pickup`)
        .set('Authorization', `Bearer ${vendorTokenB}`)
        .send({ pickupCode: '9999' });
    assert.equal(notReadyPickup.status, 400);
});
