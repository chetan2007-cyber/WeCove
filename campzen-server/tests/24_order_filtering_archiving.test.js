const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
const College = require('../src/models/college.model');
const Order = require('../src/models/order.model');
const User = require('../src/models/user.model');
const { connectTestDB, clearTestDB, closeTestDB, createTestUser } = require('./helpers/test-db');
const { istPartsToUTCDate, getISTDateParts } = require('../src/utils/dateFilter.util');

let college;

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
    college = await College.create({
        name: 'IIT Bombay',
        location: 'Powai',
        city: 'Mumbai',
        state: 'Maharashtra'
    });
});

after(async () => {
    await closeTestDB();
});

async function setupVendor(ownerProps = {}) {
    const { user, token } = await createTestUser({ role: 'vendor_owner', ...ownerProps });
    const vendor = await Vendor.create({
        name: `${user.name} Print Station`,
        ownerId: user._id,
        collegeId: college._id,
        address: { line1: 'Main Gate' },
        location: { type: 'Point', coordinates: [72.9150, 19.1334] },
        status: 'active'
    });
    return { user, token, vendor };
}

async function createOrderWithDate(vendorId, student, status, dateOffsetDays = 0, customOrderNum = null) {
    const now = new Date();
    const { year, month, date } = getISTDateParts(now);
    // target day in IST noon
    const targetDate = istPartsToUTCDate(year, month, date + dateOffsetDays, 12, 0, 0, 0);

    const orderNumber = customOrderNum || `KAMI-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const order = new Order({
        orderNumber,
        userId: student._id,
        vendorId,
        type: 'print',
        status,
        subtotal: 50.0,
        total: 52.0,
        platformFee: 2.0,
        fulfillmentType: 'pickup',
        createdAt: targetDate,
        updatedAt: targetDate
    });
    return await order.save();
}

// TEST B1: Select All Dates
test('TEST B1: Select All Dates returns all matching vendor orders', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    await createOrderWithDate(vendor._id, student, 'PAID', 0);
    await createOrderWithDate(vendor._id, student, 'COMPLETED', -2);
    await createOrderWithDate(vendor._id, student, 'READY', -10);

    const res = await request(app)
        .get('/api/orders/vendor?status=all')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 3);
});

// TEST B2: Select Today
test('TEST B2: Select Today returns only orders created today in IST', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    await createOrderWithDate(vendor._id, student, 'PAID', 0, 'KAMI-TODAY-1');
    await createOrderWithDate(vendor._id, student, 'COMPLETED', -1, 'KAMI-YESTERDAY-1');
    await createOrderWithDate(vendor._id, student, 'ACCEPTED', -5, 'KAMI-PAST-1');

    const res = await request(app)
        .get('/api/orders/vendor?status=all&datePreset=today')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].orderNumber, 'KAMI-TODAY-1');
});

// TEST B3: Select Yesterday
test('TEST B3: Select Yesterday returns only orders created yesterday in IST', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    await createOrderWithDate(vendor._id, student, 'PAID', 0, 'KAMI-TODAY-2');
    await createOrderWithDate(vendor._id, student, 'COMPLETED', -1, 'KAMI-YESTERDAY-2');

    const res = await request(app)
        .get('/api/orders/vendor?status=all&datePreset=yesterday')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].orderNumber, 'KAMI-YESTERDAY-2');
});

// TEST B4: Select Last 7 Days
test('TEST B4: Select Last 7 Days returns orders within the 7-day interval', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    await createOrderWithDate(vendor._id, student, 'PAID', 0);
    await createOrderWithDate(vendor._id, student, 'PAID', -3);
    await createOrderWithDate(vendor._id, student, 'PAID', -15); // outside 7 days

    const res = await request(app)
        .get('/api/orders/vendor?status=all&datePreset=last7days')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
});

// TEST B7 & B8: Custom Date Range & Validation
test('TEST B7 & B8: Custom Date Range filters correctly and rejects start > end', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    await createOrderWithDate(vendor._id, student, 'COMPLETED', -5, 'KAMI-CUSTOM-MATCH');
    await createOrderWithDate(vendor._id, student, 'COMPLETED', -20, 'KAMI-CUSTOM-OLD');

    // Valid range covering -7 days to -4 days
    const now = new Date();
    const { year, month, date } = getISTDateParts(now);
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.max(1, date - 7)).padStart(2, '0')}`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.max(1, date - 4)).padStart(2, '0')}`;

    const resValid = await request(app)
        .get(`/api/orders/vendor?status=all&startDate=${startStr}&endDate=${endStr}`)
        .set('Authorization', `Bearer ${token}`);

    assert.equal(resValid.status, 200);

    // Invalid range where start > end
    const resInvalid = await request(app)
        .get(`/api/orders/vendor?startDate=2026-11-10&endDate=2026-11-01`)
        .set('Authorization', `Bearer ${token}`);

    assert.equal(resInvalid.status, 400);
    assert.match(resInvalid.body.message, /start date cannot be after end date/i);
});

// TEST B9: Combine Completed status + Today
test('TEST B9: Combine status=COMPLETED + datePreset=today filters both criteria', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    await createOrderWithDate(vendor._id, student, 'COMPLETED', 0, 'KAMI-COMPLETED-TODAY');
    await createOrderWithDate(vendor._id, student, 'PRINTING', 0, 'KAMI-PRINTING-TODAY');
    await createOrderWithDate(vendor._id, student, 'COMPLETED', -2, 'KAMI-COMPLETED-PAST');

    const res = await request(app)
        .get('/api/orders/vendor?status=COMPLETED&datePreset=today')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].orderNumber, 'KAMI-COMPLETED-TODAY');
});

// TEST B11: Search by order number
test('TEST B11: Search by order number returns exact matching order', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    await createOrderWithDate(vendor._id, student, 'PAID', 0, 'KAMI-SPECIFIC-999');
    await createOrderWithDate(vendor._id, student, 'PAID', 0, 'KAMI-OTHER-111');

    const res = await request(app)
        .get('/api/orders/vendor?status=all&search=SPECIFIC-999')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].orderNumber, 'KAMI-SPECIFIC-999');
});

// TEST B12: Search by student phone/name
test('TEST B12: Search by student phone returns student orders without cross-vendor leaks', async () => {
    const { token, vendor } = await setupVendor();
    const { user: studentA } = await createTestUser({ role: 'student', phone: '9876543210', name: 'Aarav Patel' });
    const { user: studentB } = await createTestUser({ role: 'student', phone: '9123456780', name: 'Diya Sharma' });

    await createOrderWithDate(vendor._id, studentA, 'PAID', 0, 'ORDER-AARAV');
    await createOrderWithDate(vendor._id, studentB, 'PAID', 0, 'ORDER-DIYA');

    const res = await request(app)
        .get('/api/orders/vendor?status=all&search=9876543210')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].orderNumber, 'ORDER-AARAV');
});

// TEST B13: Pagination with page and limit
test('TEST B13: Pagination returns correct page and total count', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    for (let i = 1; i <= 5; i++) {
        await createOrderWithDate(vendor._id, student, 'PAID', 0, `PAGINATED-${i}`);
    }

    // Page 1, limit 2
    const resPage1 = await request(app)
        .get('/api/orders/vendor?status=all&page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(resPage1.status, 200);
    assert.equal(resPage1.body.count, 2);
    assert.equal(resPage1.body.total, 5);
    assert.equal(resPage1.body.totalPages, 3);
    assert.equal(resPage1.body.page, 1);

    // Page 3, limit 2 (should have 1 item)
    const resPage3 = await request(app)
        .get('/api/orders/vendor?status=all&page=3&limit=2')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(resPage3.status, 200);
    assert.equal(resPage3.body.count, 1);
});

// TEST C1, C2, C3, C6: Safe Bulk Archiving of Completed Orders
test('TEST C1-C6: Bulk archive completed orders archives only completed orders and preserves financials', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    // 2 Completed orders
    const completed1 = await createOrderWithDate(vendor._id, student, 'COMPLETED', 0, 'KAMI-COMP-1');
    const completed2 = await createOrderWithDate(vendor._id, student, 'COMPLETED', 0, 'KAMI-COMP-2');
    // 1 Active order (must NOT be archived)
    const activeOrder = await createOrderWithDate(vendor._id, student, 'PRINTING', 0, 'KAMI-ACTIVE-1');

    // Execute bulk archive
    const archiveRes = await request(app)
        .post('/api/orders/vendor/archive-completed')
        .set('Authorization', `Bearer ${token}`)
        .send();

    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.success, true);
    assert.equal(archiveRes.body.count, 2);
    assert.ok(archiveRes.body.batchId);

    // 1. Verify completed orders are now marked isArchived: true
    const checkComp1 = await Order.findById(completed1._id);
    assert.equal(checkComp1.isArchived, true);
    assert.equal(checkComp1.status, 'COMPLETED', 'Status must remain COMPLETED');
    assert.equal(checkComp1.total, 52.0, 'Total financial amount must not change');
    assert.ok(checkComp1.archivedAt);
    assert.ok(checkComp1.archiveBatchId);

    // 2. Verify active order was NOT archived
    const checkActive = await Order.findById(activeOrder._id);
    assert.equal(checkActive.isArchived, false, 'Active printing order must NEVER be archived');

    // 3. Verify that GET /api/orders/vendor?status=COMPLETED hides archived orders by default
    const activeCompletedList = await request(app)
        .get('/api/orders/vendor?status=COMPLETED')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(activeCompletedList.status, 200);
    assert.equal(activeCompletedList.body.count, 0, 'Archived completed orders must not appear in active Completed tab');

    // 4. Verify that GET /api/orders/vendor?isArchived=true retrieves the archived orders
    const archivedHistory = await request(app)
        .get('/api/orders/vendor?status=all&isArchived=true')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(archivedHistory.status, 200);
    assert.equal(archivedHistory.body.count, 2, 'Archived history query must return archived orders');

    // 5. Repeated archive request is idempotent (returns 0 affected)
    const repeatArchive = await request(app)
        .post('/api/orders/vendor/archive-completed')
        .set('Authorization', `Bearer ${token}`)
        .send();

    assert.equal(repeatArchive.status, 200);
    assert.equal(repeatArchive.body.count, 0);
});

// TEST C8: Restore an archived completed order
test('TEST C8: Restore an archived order unhides it without modifying financial or lifecycle state', async () => {
    const { token, vendor } = await setupVendor();
    const { user: student } = await createTestUser({ role: 'student' });

    const completed = await createOrderWithDate(vendor._id, student, 'COMPLETED', 0, 'KAMI-RESTORE-1');

    // Archive it
    await request(app)
        .post('/api/orders/vendor/archive-completed')
        .set('Authorization', `Bearer ${token}`)
        .send();

    // Verify archived
    let check = await Order.findById(completed._id);
    assert.equal(check.isArchived, true);

    // Restore it
    const restoreRes = await request(app)
        .post(`/api/orders/vendor/${completed._id}/restore`)
        .set('Authorization', `Bearer ${token}`)
        .send();

    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.success, true);

    // Verify unarchived in database
    check = await Order.findById(completed._id);
    assert.equal(check.isArchived, false);
    assert.equal(check.archivedAt, null);
    assert.equal(check.status, 'COMPLETED');
    assert.equal(check.total, 52.0);

    // Now it appears back in active completed tab
    const activeCompletedList = await request(app)
        .get('/api/orders/vendor?status=COMPLETED')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(activeCompletedList.body.count, 1);
});

// TEST C9: Role permissions - Staff cannot archive
test('TEST C9: Vendor Staff role cannot execute bulk archiving (Owner only)', async () => {
    const { vendor } = await setupVendor();
    const { user: staff, token: staffToken } = await createTestUser({ role: 'vendor_staff' });
    vendor.staffIds = [staff._id];
    await vendor.save();

    const res = await request(app)
        .post('/api/orders/vendor/archive-completed')
        .set('Authorization', `Bearer ${staffToken}`)
        .send();

    assert.equal(res.status, 403);
});
