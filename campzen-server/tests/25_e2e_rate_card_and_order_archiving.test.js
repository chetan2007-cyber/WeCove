const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const College = require('../src/models/college.model');
const Vendor = require('../src/models/vendor.model');
const RateCard = require('../src/models/rateCard.model');
const FinishingRate = require('../src/models/finishingRate.model');
const Order = require('../src/models/order.model');
const PrintJob = require('../src/models/printJob.model');
const Document = require('../src/models/document.model');
const RateAuditLog = require('../src/models/rateAuditLog.model');
const { connectTestDB, clearTestDB, closeTestDB, createTestUser } = require('./helpers/test-db');
const { getISTDateParts, istPartsToUTCDate } = require('../src/utils/dateFilter.util');

let college;
let ownerUser;
let ownerToken;
let vendor;
let studentUser;
let studentToken;

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearTestDB();

    college = await College.create({
        name: 'IIT Kharagpur Campus',
        location: 'Campus West',
        city: 'Kharagpur',
        state: 'West Bengal'
    });

    const ownerRes = await createTestUser({ role: 'vendor_owner', name: 'Vendor Owner' });
    ownerUser = ownerRes.user;
    ownerToken = ownerRes.token;

    vendor = await Vendor.create({
        name: 'Campus Central Reprographics',
        ownerId: ownerUser._id,
        collegeId: college._id,
        address: { line1: 'Library Complex Room 101' },
        location: { type: 'Point', coordinates: [87.3119, 22.3149] },
        status: 'active'
    });

    // Seed default rates
    await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${ownerToken}`);

    await request(app)
        .get('/api/vendors/finishing-rates')
        .set('Authorization', `Bearer ${ownerToken}`);

    const studentRes = await createTestUser({ role: 'student', name: 'Arjun Student' });
    studentUser = studentRes.user;
    studentToken = studentRes.token;
});

after(async () => {
    await closeTestDB();
});

test('E2E TEST 1: Vendor modifies print rate and finishing rate with audit log', async () => {
    const ratesRes = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ratesRes.status, 200);

    const a4BwSingle = ratesRes.body.data.find(
        rc => rc.paperSize === 'A4' && rc.colorMode === 'B&W' && rc.sides === 'single' && rc.paperType === '70gsm'
    );
    assert.ok(a4BwSingle);

    // Edit price from default to 2.25
    const updateRateRes = await request(app)
        .put(`/api/vendors/rate-cards/${a4BwSingle._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
            pricePerPage: 2.25,
            isActive: true
        });
    assert.equal(updateRateRes.status, 200);
    assert.equal(updateRateRes.body.data.pricePerPage, 2.25);

    // Edit spiral binding finishing rate to 35.00
    const finishingRes = await request(app)
        .get('/api/vendors/finishing-rates')
        .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(finishingRes.status, 200);

    const spiral = finishingRes.body.data.find(f => f.finishingType === 'spiral_binding');
    assert.ok(spiral);

    const updateFinishRes = await request(app)
        .put(`/api/vendors/finishing-rates/${spiral._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
            price: 35.00,
            isActive: true
        });
    assert.equal(updateFinishRes.status, 200);
    assert.equal(updateFinishRes.body.data.price, 35.00);

    // Check audit log contains both events
    const auditLogs = await RateAuditLog.find({ vendorId: vendor._id });
    assert.equal(auditLogs.length, 2);
    assert.ok(auditLogs.some(l => l.rateType === 'print' && l.newValue.pricePerPage === 2.25));
    assert.ok(auditLogs.some(l => l.rateType === 'finishing' && l.newValue.price === 35.00));
});

test('E2E TEST 2: Date filters, search, bulk archiving and restoring workflow', async () => {
    const doc = await Document.create({
        userId: studentUser._id,
        originalFilename: 'Thesis_Final.pdf',
        storageKeyOriginal: 'thesis-key-1',
        mimeType: 'application/pdf',
        fileSize: 1024000,
        pageCount: 10
    });

    const now = new Date();
    const { year, month, date } = getISTDateParts(now);
    const todayUTC = istPartsToUTCDate(year, month, date, 12, 0, 0, 0);

    // Create completed Order 1 (Today)
    const order1 = await Order.create({
        orderNumber: 'ORD-KGP-101',
        userId: studentUser._id,
        vendorId: vendor._id,
        type: 'print',
        status: 'COMPLETED',
        subtotal: 57.50,
        platformFee: 2.00,
        deliveryFee: 0,
        schedulingFee: 0,
        total: 59.50,
        fulfillmentType: 'pickup',
        isArchived: false,
        createdAt: todayUTC
    });

    await PrintJob.create({
        orderId: order1._id,
        documentId: doc._id,
        pageRange: '1-10',
        copies: 1,
        colorMode: 'B&W',
        sides: 'single',
        paperSize: 'A4',
        paperType: '70gsm',
        price: 57.50
    });

    // Create completed Order 2 (Today)
    const order2 = await Order.create({
        orderNumber: 'ORD-KGP-102',
        userId: studentUser._id,
        vendorId: vendor._id,
        type: 'print',
        status: 'COMPLETED',
        subtotal: 35.00,
        platformFee: 2.00,
        deliveryFee: 0,
        schedulingFee: 0,
        total: 37.00,
        fulfillmentType: 'pickup',
        isArchived: false,
        createdAt: todayUTC
    });

    // 1. Filter by status=COMPLETED&datePreset=today
    const todayRes = await request(app)
        .get('/api/orders/vendor?status=COMPLETED&datePreset=today')
        .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(todayRes.status, 200);
    assert.equal(todayRes.body.count, 2);

    // 2. Search by order number
    const searchRes = await request(app)
        .get('/api/orders/vendor?status=all&search=ORD-KGP-101')
        .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.count, 1);
    assert.equal(searchRes.body.data[0].orderNumber, 'ORD-KGP-101');

    // 3. Bulk archive completed orders
    const archiveRes = await request(app)
        .post('/api/orders/vendor/archive-completed')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ datePreset: 'today' });
    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.archivedCount, 2);
    const batchId = archiveRes.body.batchId;
    assert.ok(batchId);

    // 4. Verify orders are hidden from active intake
    const activeRes = await request(app)
        .get('/api/orders/vendor?status=COMPLETED&isArchived=false')
        .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(activeRes.status, 200);
    assert.equal(activeRes.body.count, 0);

    // 5. Verify orders appear in archive view
    const archivedRes = await request(app)
        .get('/api/orders/vendor?isArchived=true')
        .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(archivedRes.status, 200);
    assert.equal(archivedRes.body.count, 2);
    const archivedOrder1 = archivedRes.body.data.find(o => o._id === order1._id.toString());
    assert.ok(archivedOrder1);
    assert.equal(archivedOrder1.isArchived, true);
    assert.equal(archivedOrder1.archiveBatchId, batchId);
    assert.equal(archivedOrder1.total, 59.50);

    // 6. Restore Order 1
    const restoreRes = await request(app)
        .post(`/api/orders/vendor/restore/${order1._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.data.isArchived, false);
    assert.equal(restoreRes.body.data.status, 'COMPLETED');
    assert.equal(restoreRes.body.data.total, 59.50);

    // Order 1 is back in active list
    const activeAfterRestore = await request(app)
        .get('/api/orders/vendor?status=COMPLETED&isArchived=false')
        .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(activeAfterRestore.status, 200);
    assert.equal(activeAfterRestore.body.count, 1);
    assert.equal(activeAfterRestore.body.data[0].orderNumber, 'ORD-KGP-101');

    // 7. Historical Snapshot: Update rate card and confirm Order 1 total is unchanged
    const ratesRes = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${ownerToken}`);
    const a4Card = ratesRes.body.data[0];
    await request(app)
        .put(`/api/vendors/rate-cards/${a4Card._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ pricePerPage: 99.00 });

    const freshOrder1 = await Order.findById(order1._id);
    assert.equal(freshOrder1.total, 59.50);
    assert.equal(freshOrder1.subtotal, 57.50);
    const printJob = await PrintJob.findOne({ orderId: order1._id });
    assert.equal(printJob.price, 57.50);
});
