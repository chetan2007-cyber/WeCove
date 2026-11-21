const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
const RateCard = require('../src/models/rateCard.model');
const FinishingRate = require('../src/models/finishingRate.model');
const RateAuditLog = require('../src/models/rateAuditLog.model');
const College = require('../src/models/college.model');
const Order = require('../src/models/order.model');
const PrintJob = require('../src/models/printJob.model');
const Document = require('../src/models/document.model');
const { connectTestDB, clearTestDB, closeTestDB, createTestUser } = require('./helpers/test-db');
const { getEffectiveRateCards, getEffectiveFinishingRates } = require('../src/utils/defaultRateCards.util');

let college;

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
    college = await College.create({
        name: 'IIT Delhi',
        location: 'Hauz Khas',
        city: 'New Delhi',
        state: 'Delhi'
    });
});

after(async () => {
    await closeTestDB();
});

async function setupVendor(ownerProps = {}) {
    const { user, token } = await createTestUser({ role: 'vendor_owner', ...ownerProps });
    const vendor = await Vendor.create({
        name: `${user.name} Print Hub`,
        ownerId: user._id,
        collegeId: college._id,
        address: { line1: 'Academic Block B' },
        location: { type: 'Point', coordinates: [77.1925, 28.5450] },
        status: 'active'
    });
    return { user, token, vendor };
}

// TEST A1: Load existing rate cards
test('TEST A1: Load existing rate cards returns vendor-specific rates', async () => {
    const { token } = await setupVendor();
    const res = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.some(r => r.paperSize === 'A4'));
});

// TEST A2: Edit existing B&W rate
test('TEST A2: Edit existing B&W rate updates rate card and logs audit', async () => {
    const { user, token, vendor } = await setupVendor();
    const initialRates = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`);

    const bwRate = initialRates.body.data.find(r => r.paperSize === 'A4' && r.colorMode === 'B&W' && r.sides === 'single');
    assert.ok(bwRate, 'A4 B&W single rate must exist');

    const res = await request(app)
        .put(`/api/vendors/rate-cards/${bwRate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pricePerPage: 2.50 });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.pricePerPage, 2.5);

    // Verify DB update
    const updated = await RateCard.findById(bwRate._id);
    assert.equal(updated.pricePerPage, 2.5);

    // Verify RateAuditLog
    const audit = await RateAuditLog.findOne({ rateId: bwRate._id, action: 'UPDATE' });
    assert.ok(audit, 'Audit log entry must be created');
    assert.equal(audit.rateType, 'print');
    assert.equal(audit.changedBy.toString(), user._id.toString());
    assert.equal(audit.previousValue.pricePerPage, bwRate.pricePerPage);
    assert.equal(audit.newValue.pricePerPage, 2.5);
});

// TEST A3: Edit Color rate
test('TEST A3: Edit a colour rate updates correctly in database', async () => {
    const { token } = await setupVendor();
    const initialRates = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`);

    const colorRate = initialRates.body.data.find(r => r.paperSize === 'A4' && r.colorMode === 'Color' && r.sides === 'single');
    assert.ok(colorRate);

    const res = await request(app)
        .put(`/api/vendors/rate-cards/${colorRate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pricePerPage: 12.0 });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.pricePerPage, 12.0);
});

// TEST A4: Edit Finishing rate
test('TEST A4: Edit a finishing rate updates price and logs audit', async () => {
    const { user, token } = await setupVendor();
    const initialFinishing = await request(app)
        .get('/api/vendors/finishing-rates')
        .set('Authorization', `Bearer ${token}`);

    const spiral = initialFinishing.body.data.find(f => f.finishingType === 'spiral_binding');
    assert.ok(spiral);

    const res = await request(app)
        .put(`/api/vendors/finishing-rates/${spiral._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 35.0 });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.price, 35.0);

    const audit = await RateAuditLog.findOne({ rateId: spiral._id, action: 'UPDATE' });
    assert.ok(audit);
    assert.equal(audit.rateType, 'finishing');
    assert.equal(audit.changedBy.toString(), user._id.toString());
    assert.equal(audit.previousValue.price, spiral.price);
    assert.equal(audit.newValue.price, 35.0);
});

// TEST A5: Add new supported printing rate
test('TEST A5: Add a new supported printing rate creates rate and audit', async () => {
    const { token, vendor } = await setupVendor();
    const res = await request(app)
        .post('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
            paperSize: 'Legal',
            paperType: 'glossy',
            colorMode: 'Color',
            sides: 'single',
            pricePerPage: 25.0
        });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.pricePerPage, 25.0);
    assert.equal(res.body.data.paperType, 'glossy');

    const audit = await RateAuditLog.findOne({ rateId: res.body.data._id, action: 'CREATE' });
    assert.ok(audit);
});

// TEST A6: Add supported finishing service rate
test('TEST A6: Add or update finishing rate creates rate card', async () => {
    const { token } = await setupVendor();
    const res = await request(app)
        .post('/api/vendors/finishing-rates')
        .set('Authorization', `Bearer ${token}`)
        .send({
            finishingType: 'lamination',
            price: 20.0
        });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.finishingType, 'lamination');
    assert.equal(res.body.data.price, 20.0);
});

// TEST A7: Reject negative price
test('TEST A7: Enter negative price is rejected with 400 Bad Request', async () => {
    const { token } = await setupVendor();
    const res = await request(app)
        .post('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
            paperSize: 'A4',
            paperType: '70gsm',
            colorMode: 'B&W',
            sides: 'single',
            pricePerPage: -5.0
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /negative/i);
});

// TEST A8: Reject invalid price / invalid options
test('TEST A8: Enter invalid price string or unsupported paper size is rejected', async () => {
    const { token } = await setupVendor();
    const res1 = await request(app)
        .post('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
            paperSize: 'A4',
            paperType: '70gsm',
            colorMode: 'B&W',
            sides: 'single',
            pricePerPage: 'free'
        });
    assert.equal(res1.status, 400);

    const res2 = await request(app)
        .post('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
            paperSize: 'B5', // unsupported
            paperType: '70gsm',
            colorMode: 'B&W',
            sides: 'single',
            pricePerPage: 5.0
        });
    assert.equal(res2.status, 400);
    assert.match(res2.body.message, /invalid paper size/i);
});

// TEST A9: Uniqueness validation
test('TEST A9: Attempt duplicate rate combination on update is rejected', async () => {
    const { token } = await setupVendor();
    const initialRates = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`);

    const card1 = initialRates.body.data[0];
    const card2 = initialRates.body.data[1];

    // Attempt to edit card2 to have exact same configuration as card1
    const res = await request(app)
        .put(`/api/vendors/rate-cards/${card2._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
            paperSize: card1.paperSize,
            paperType: card1.paperType,
            colorMode: card1.colorMode,
            sides: card1.sides,
            minPages: card1.minPages
        });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /already exists/i);
});

// TEST A10: Deactivate a rate and verify it is excluded from active quotes
test('TEST A10: Deactivated rate is excluded from effective student quotes', async () => {
    const { token, vendor } = await setupVendor();
    const initialRates = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`);

    const bwRate = initialRates.body.data.find(r => r.paperSize === 'A4' && r.colorMode === 'B&W' && r.sides === 'single');
    assert.ok(bwRate);

    // Deactivate rate
    const res = await request(app)
        .put(`/api/vendors/rate-cards/${bwRate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isActive, false);

    // Verify RateAuditLog has action DEACTIVATE
    const audit = await RateAuditLog.findOne({ rateId: bwRate._id, action: 'DEACTIVATE' });
    assert.ok(audit, 'Audit log DEACTIVATE must be recorded');

    // Verify getEffectiveRateCards excludes deactivated rate
    const effective = await getEffectiveRateCards(vendor._id);
    const matched = effective.find(r =>
        r.paperSize === bwRate.paperSize &&
        r.colorMode === bwRate.colorMode &&
        r.sides === bwRate.sides &&
        r.paperType === bwRate.paperType
    );
    assert.equal(matched, undefined, 'Deactivated rate must not appear in effective rates for student quote');
});

// TEST A11: Vendor A cannot edit Vendor B's rate card
test('TEST A11: Vendor A attempts to edit Vendor B rate is rejected with 404', async () => {
    const vendorA = await setupVendor({ name: 'Vendor A' });
    const vendorB = await setupVendor({ name: 'Vendor B' });

    const ratesB = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${vendorB.token}`);

    const targetRate = ratesB.body.data[0];

    // Vendor A tries to edit Vendor B's rate
    const res = await request(app)
        .put(`/api/vendors/rate-cards/${targetRate._id}`)
        .set('Authorization', `Bearer ${vendorA.token}`)
        .send({ pricePerPage: 99.0 });

    assert.equal(res.status, 404);
    assert.match(res.body.message, /not found/i);

    // Confirm Vendor B's rate is unchanged
    const unchanged = await RateCard.findById(targetRate._id);
    assert.equal(unchanged.pricePerPage, targetRate.pricePerPage);
});

// TEST A12: Historical pricing protection
test('TEST A12: Historical paid order retains its original price after vendor updates rate card', async () => {
    const { user: vendorOwner, token, vendor } = await setupVendor();
    const { user: student, token: studentToken } = await createTestUser({ role: 'student' });

    // 1. Create document
    const doc = await Document.create({
        userId: student._id,
        filename: 'thesis.pdf',
        originalFilename: 'thesis.pdf',
        storageKeyOriginal: 'test-thesis.pdf',
        pageCount: 10,
        fileSize: 10240,
        mimeType: 'application/pdf',
        processingStatus: 'completed'
    });

    // 2. Initial rate is ₹2.0 / page -> 10 pages * ₹2 = ₹20 + ₹2 fee = ₹22
    const initialRates = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`);
    const bwRate = initialRates.body.data.find(r => r.paperSize === 'A4' && r.paperType === '70gsm' && r.colorMode === 'B&W' && r.sides === 'single');
    assert.equal(bwRate.pricePerPage, 2.0);

    // Place order
    const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            vendorId: vendor._id,
            documentId: doc._id,
            fulfillmentType: 'pickup',
            printSettings: {
                paperSize: 'A4',
                paperType: '70gsm',
                colorMode: 'B&W',
                sides: 'single',
                copies: 1
            }
        });

    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.data.order._id;
    const originalTotal = orderRes.body.data.order.total;
    assert.equal(originalTotal, 22); // 10*2 + 2 platform fee

    // Mark as PAID
    await Order.findByIdAndUpdate(orderId, { status: 'PAID' });

    // 3. Vendor now increases rate to ₹5.00 / page
    await request(app)
        .put(`/api/vendors/rate-cards/${bwRate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pricePerPage: 5.0 });

    // 4. Verify existing paid order still has original total ₹22!
    const existingOrder = await Order.findById(orderId);
    assert.equal(existingOrder.total, 22, 'Historical order total must not be mutated');

    const printJob = await PrintJob.findOne({ orderId });
    assert.equal(printJob.price, 20, 'PrintJob snapshot price must not be mutated');

    // 5. New order by student should now use new rate: 10 * ₹5 = ₹50 + ₹2 = ₹52
    const newOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            vendorId: vendor._id,
            documentId: doc._id,
            fulfillmentType: 'pickup',
            printSettings: {
                paperSize: 'A4',
                paperType: '70gsm',
                colorMode: 'B&W',
                sides: 'single',
                copies: 1
            }
        });

    assert.equal(newOrderRes.status, 201);
    assert.equal(newOrderRes.body.data.order.total, 52, 'New order must use the updated rate ₹5/page');
});
