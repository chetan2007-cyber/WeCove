const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const app = require('../src/app');
const College = require('../src/models/college.model');
const Vendor = require('../src/models/vendor.model');
const RateCard = require('../src/models/rateCard.model');
const Document = require('../src/models/document.model');
const Order = require('../src/models/order.model');
const PrintJob = require('../src/models/printJob.model');
const printerService = require('../src/services/printer.service');
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

const setupTestEnv = async () => {
    const college = await College.create({
        name: 'MIT Mysore',
        location: 'Belawadi',
        city: 'Mysuru',
        state: 'Karnataka'
    });

    const { user: vendorOwner, token: vendorToken } = await createTestUser({
        role: 'vendor_owner',
        isVerified: true,
        collegeId: college._id
    });

    const vendor = await Vendor.create({
        name: 'MIT Central Xerox',
        ownerId: vendorOwner._id,
        collegeId: college._id,
        address: { line1: 'Campus Ground Floor' },
        status: 'active',
        isApproved: true,
        capabilities: { colorPrinting: true }
    });

    // Rate cards: A4 70gsm B&W single: ₹2.0, double: ₹1.5; Color single: ₹10.0, double: ₹8.0
    const rateCards = [
        { paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 2.0 },
        { paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 1.5 },
        { paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'single', pricePerPage: 10.0 },
        { paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'double', pricePerPage: 8.0 }
    ];
    for (const rc of rateCards) {
        await RateCard.create({
            vendorId: vendor._id,
            ...rc,
            minPages: 1,
            maxPages: 9999
        });
    }

    const { user: student, token: studentToken } = await createTestUser({
        role: 'student',
        collegeId: college._id,
        name: 'Aarav Sharma',
        phone: '9876543210'
    });

    const { user: otherStudent, token: otherStudentToken } = await createTestUser({
        role: 'student',
        collegeId: college._id,
        name: 'Other Student',
        phone: '9123456789'
    });

    // Create a 10-page test document
    const document = await Document.create({
        userId: student._id,
        collegeId: college._id,
        name: 'Syllabus_2026.pdf',
        originalFilename: 'Syllabus_2026.pdf',
        fileSize: 10240,
        pageCount: 10,
        mimeType: 'application/pdf',
        storageKeyOriginal: 'raw/syllabus.pdf',
        processingStatus: 'completed'
    });

    return {
        college,
        vendor,
        vendorOwner,
        vendorToken,
        student,
        studentToken,
        otherStudent,
        otherStudentToken,
        document
    };
};

test('EDIT-01: Order creation initializes 60-second edit window, revision=1, and editable=true', async () => {
    const env = await setupTestEnv();

    const orderPayload = {
        type: 'print',
        vendorId: env.vendor._id.toString(),
        documentId: env.document._id.toString(),
        fulfillmentType: 'pickup',
        printSettings: {
            pageRange: 'all',
            copies: 1,
            colorMode: 'B&W',
            sides: 'single',
            pagesPerSheet: 1,
            paperSize: 'A4',
            paperType: '70gsm'
        }
    };

    const beforeTime = Date.now();
    const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send(orderPayload);

    assert.equal(res.status, 201);
    const orderData = res.body.data.order;
    assert.equal(orderData.orderRevision, 1);
    assert.equal(orderData.editable, true);
    assert.ok(orderData.editWindowEndsAt);

    const deadlineMs = new Date(orderData.editWindowEndsAt).getTime();
    // Deadline should be roughly 60 seconds (58s to 65s) after beforeTime
    const diff = deadlineMs - beforeTime;
    assert.ok(diff >= 58000 && diff <= 65000, `Deadline diff was ${diff}ms, expected ~60000ms`);
});

test('EDIT-02: Edit within window succeeds, increments revision, updates settings, recalculates price, and logs history', async () => {
    const env = await setupTestEnv();

    const order = await Order.create({
        orderNumber: 'KAMI-320001',
        userId: env.student._id,
        vendorId: env.vendor._id,
        type: 'print',
        status: 'PAID',
        fulfillmentType: 'pickup',
        pickupCode: '1234',
        subtotal: 20.0,
        platformFee: 2.0,
        total: 22.0,
        orderRevision: 1,
        editable: true,
        editWindowEndsAt: new Date(Date.now() + 50000), // 50 seconds remaining
        editHistory: []
    });

    const printJob = await PrintJob.create({
        orderId: order._id,
        documentId: env.document._id,
        copies: 1,
        pageRange: 'all',
        colorMode: 'B&W',
        sides: 'single',
        pagesPerSheet: 1,
        paperSize: 'A4',
        paperType: '70gsm',
        price: 20.0,
        originalPageCount: 10,
        finalPrintReadyPageCount: 10,
        expectedSheets: 10,
        expectedImpressions: 10,
        executionState: 'CREATED'
    });

    // Student changes to 2 copies, double-sided, 2-Up horizontal
    const editPayload = {
        printSettings: {
            copies: 2,
            sides: 'double',
            pagesPerSheet: 2,
            nUpOrientation: 'horizontal',
            pageRange: '1-6' // 6 pages -> 3 billing units per copy
        },
        notes: 'Please ensure neat printing'
    };

    const res = await request(app)
        .put(`/api/orders/${order._id}/edit`)
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send(editPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.orderRevision, 2);

    // Verify DB update
    const updatedOrder = await Order.findById(order._id);
    assert.equal(updatedOrder.orderRevision, 2);
    assert.equal(updatedOrder.notes, 'Please ensure neat printing');
    assert.equal(updatedOrder.editHistory.length, 1);
    assert.equal(updatedOrder.editHistory[0].revision, 2);
    assert.equal(updatedOrder.editHistory[0].previousPrice, 22.0);

    const updatedPj = await PrintJob.findOne({ orderId: order._id });
    assert.equal(updatedPj.copies, 2);
    assert.equal(updatedPj.sides, 'double');
    assert.equal(updatedPj.pagesPerSheet, 2);
    assert.equal(updatedPj.nUpOrientation, 'horizontal');
    assert.equal(updatedPj.sheetOrientation, 'landscape');
    assert.equal(updatedPj.pageRange, '1-6');
});

test('EDIT-03: Multiple edits within window increment revisions without restarting original deadline', async () => {
    const env = await setupTestEnv();

    const originalDeadline = new Date(Date.now() + 40000);
    const order = await Order.create({
        orderNumber: 'KAMI-320002',
        userId: env.student._id,
        vendorId: env.vendor._id,
        type: 'print',
        status: 'PAID',
        fulfillmentType: 'pickup',
        pickupCode: '2345',
        subtotal: 20.0,
        platformFee: 2.0,
        total: 22.0,
        orderRevision: 1,
        editable: true,
        editWindowEndsAt: originalDeadline,
        editHistory: []
    });

    await PrintJob.create({
        orderId: order._id,
        documentId: env.document._id,
        copies: 1,
        pageRange: 'all',
        colorMode: 'B&W',
        sides: 'single',
        pagesPerSheet: 1,
        price: 20.0,
        originalPageCount: 10,
        finalPrintReadyPageCount: 10,
        executionState: 'CREATED'
    });

    // First edit
    const res1 = await request(app)
        .put(`/api/orders/${order._id}/edit`)
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ printSettings: { copies: 2 } });
    assert.equal(res1.status, 200);
    assert.equal(res1.body.data.orderRevision, 2);

    // Second edit
    const res2 = await request(app)
        .put(`/api/orders/${order._id}/edit`)
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ printSettings: { copies: 3, sides: 'double' } });
    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.orderRevision, 3);

    // Verify deadline did NOT restart
    const finalOrder = await Order.findById(order._id);
    assert.equal(finalOrder.orderRevision, 3);
    assert.equal(finalOrder.editHistory.length, 2);
    assert.equal(finalOrder.editWindowEndsAt.getTime(), originalDeadline.getTime());
});

test('EDIT-04: Edit requested after deadline has expired is strictly rejected with 400 EDIT_WINDOW_EXPIRED', async () => {
    const env = await setupTestEnv();

    // Deadline expired 5 seconds ago
    const expiredDeadline = new Date(Date.now() - 5000);
    const order = await Order.create({
        orderNumber: 'KAMI-320003',
        userId: env.student._id,
        vendorId: env.vendor._id,
        type: 'print',
        status: 'PAID',
        fulfillmentType: 'pickup',
        pickupCode: '3456',
        subtotal: 20.0,
        platformFee: 2.0,
        total: 22.0,
        orderRevision: 1,
        editable: false,
        editWindowEndsAt: expiredDeadline,
        editHistory: []
    });

    await PrintJob.create({
        orderId: order._id,
        documentId: env.document._id,
        copies: 1,
        pageRange: 'all',
        colorMode: 'B&W',
        sides: 'single',
        pagesPerSheet: 1,
        price: 20.0,
        originalPageCount: 10,
        finalPrintReadyPageCount: 10,
        executionState: 'CREATED'
    });

    const res = await request(app)
        .put(`/api/orders/${order._id}/edit`)
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ printSettings: { copies: 5 } });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.errorCode, 'EDIT_WINDOW_EXPIRED');
    assert.match(res.body.message, /Editing time has expired/);

    // Verify order unchanged
    const orderInDb = await Order.findById(order._id);
    assert.equal(orderInDb.orderRevision, 1);
});

test('EDIT-05: Non-owner student is rejected with 403 Forbidden', async () => {
    const env = await setupTestEnv();

    const order = await Order.create({
        orderNumber: 'KAMI-320004',
        userId: env.student._id, // Owned by student
        vendorId: env.vendor._id,
        type: 'print',
        status: 'PAID',
        fulfillmentType: 'pickup',
        pickupCode: '4567',
        subtotal: 20.0,
        platformFee: 2.0,
        total: 22.0,
        orderRevision: 1,
        editable: true,
        editWindowEndsAt: new Date(Date.now() + 45000)
    });

    await PrintJob.create({
        orderId: order._id,
        documentId: env.document._id,
        copies: 1,
        executionState: 'CREATED'
    });

    // Other student tries to edit
    const res = await request(app)
        .put(`/api/orders/${order._id}/edit`)
        .set('Authorization', `Bearer ${env.otherStudentToken}`)
        .send({ printSettings: { copies: 2 } });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Not authorized/);
});

test('EDIT-06: Orders already in PRINTING, READY, or COMPLETED status reject edits with ORDER_LOCKED', async () => {
    const env = await setupTestEnv();

    const lockedStatuses = ['PRINTING', 'READY', 'COMPLETED'];
    for (const status of lockedStatuses) {
        const order = await Order.create({
            orderNumber: `KAMI-32000-${status}`,
            userId: env.student._id,
            vendorId: env.vendor._id,
            type: 'print',
            status: status,
            fulfillmentType: 'pickup',
            pickupCode: '5678',
            subtotal: 20.0,
            platformFee: 2.0,
            total: 22.0,
            orderRevision: 1,
            editable: true,
            editWindowEndsAt: new Date(Date.now() + 30000) // Window technically still has time
        });

        await PrintJob.create({
            orderId: order._id,
            documentId: env.document._id,
            copies: 1,
            executionState: 'ACCEPTED_BY_SPOOLER'
        });

        const res = await request(app)
            .put(`/api/orders/${order._id}/edit`)
            .set('Authorization', `Bearer ${env.studentToken}`)
            .send({ printSettings: { copies: 2 } });

        assert.equal(res.status, 400);
        assert.equal(res.body.errorCode, 'ORDER_LOCKED');
        assert.match(res.body.message, new RegExp(status));
    }
});

test('EDIT-07: Print dispatch during 60-second edit window is strictly blocked with ORDER_IN_EDIT_WINDOW', async () => {
    const env = await setupTestEnv();

    const order = await Order.create({
        orderNumber: 'KAMI-320005',
        userId: env.student._id,
        vendorId: env.vendor._id,
        type: 'print',
        status: 'PAID',
        fulfillmentType: 'pickup',
        pickupCode: '6789',
        subtotal: 20.0,
        platformFee: 2.0,
        total: 22.0,
        orderRevision: 1,
        editable: true,
        editWindowEndsAt: new Date(Date.now() + 35000) // 35 seconds remaining
    });

    await PrintJob.create({
        orderId: order._id,
        documentId: env.document._id,
        copies: 1,
        colorMode: 'B&W',
        sides: 'single',
        pagesPerSheet: 1,
        executionState: 'CREATED'
    });

    // Vendor attempts to dispatch printing while window is still active
    const res = await request(app)
        .post(`/api/orders/${order._id}/print`)
        .set('Authorization', `Bearer ${env.vendorToken}`)
        .send({ printerName: 'HP LaserJet' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.errorCode, 'ORDER_IN_EDIT_WINDOW');
    assert.match(res.body.message, /still within its 60-second editing window/);
});

test('EDIT-08: Print dispatch succeeds once the 60-second edit window expires', async () => {
    const env = await setupTestEnv();

    // Order whose edit window expired 2 seconds ago
    const order = await Order.create({
        orderNumber: 'KAMI-320006',
        userId: env.student._id,
        vendorId: env.vendor._id,
        type: 'print',
        status: 'PAID',
        fulfillmentType: 'pickup',
        pickupCode: '7890',
        subtotal: 20.0,
        platformFee: 2.0,
        total: 22.0,
        orderRevision: 1,
        editable: false,
        editWindowEndsAt: new Date(Date.now() - 2000)
    });

    await PrintJob.create({
        orderId: order._id,
        documentId: env.document._id,
        copies: 1,
        colorMode: 'B&W',
        sides: 'single',
        pagesPerSheet: 1,
        executionState: 'CREATED'
    });

    // Mock printer service printOrder to avoid invoking physical printer in test
    let printOrderCalled = false;
    const origPrintOrder = printerService.printOrder;
    printerService.printOrder = async (orderId, options) => {
        printOrderCalled = true;
        return {
            success: true,
            spoolerJobId: 9001,
            executionState: 'ACCEPTED_BY_SPOOLER'
        };
    };

    try {
        const res = await request(app)
            .post(`/api/orders/${order._id}/print`)
            .set('Authorization', `Bearer ${env.vendorToken}`)
            .send({});

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(printOrderCalled, true, 'Printer dispatch proceeded successfully past window check');
    } finally {
        printerService.printOrder = origPrintOrder;
    }
});
