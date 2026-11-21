const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Document = require('../src/models/document.model');
const Order = require('../src/models/order.model');
const OrderEvent = require('../src/models/orderEvent.model');
const { cleanupExpiredDocuments, cancelStaleOrders } = require('../src/services/cron.service');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/test-db');

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

after(async () => {
    await closeTestDB();
});

test('Cron: cleanupExpiredDocuments deletes physical file and marks document deleted', async () => {
    const dummyKey = `test-expired-${Date.now()}.pdf`;
    const dummyPath = path.join(__dirname, '../uploads', dummyKey);
    fs.writeFileSync(dummyPath, 'expired content');

    const doc = await Document.create({
        userId: new mongoose.Types.ObjectId(),
        originalFilename: 'old.pdf',
        mimeType: 'application/pdf',
        storageKeyOriginal: dummyKey,
        fileSize: 100,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
        isDeleted: false
    });

    await cleanupExpiredDocuments();

    // Verify physical file was removed
    assert.equal(fs.existsSync(dummyPath), false);

    // Verify database document was soft deleted
    const updatedDoc = await Document.findById(doc._id);
    assert.equal(updatedDoc.isDeleted, true);
});

test('Cron: cancelStaleOrders cancels pending orders older than 24 hours', async () => {
    const userId = new mongoose.Types.ObjectId();
    const vendorId = new mongoose.Types.ObjectId();

    // 1. Order created 25 hours ago
    const staleOrder = await Order.create({
        orderNumber: 'KAMI-STALE-001',
        userId,
        vendorId,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 50,
        total: 52,
        status: 'PAYMENT_PENDING',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000)
    });

    // 2. Fresh order created 1 hour ago
    const freshOrder = await Order.create({
        orderNumber: 'KAMI-FRESH-001',
        userId,
        vendorId,
        type: 'print',
        fulfillmentType: 'pickup',
        subtotal: 50,
        total: 52,
        status: 'PAYMENT_PENDING',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    });

    await cancelStaleOrders();

    // Verify stale order cancelled
    const updatedStale = await Order.findById(staleOrder._id);
    assert.equal(updatedStale.status, 'CANCELLED');
    assert.equal(updatedStale.cancelledReason, 'Payment timeout (24h)');

    // Verify audit event created
    const event = await OrderEvent.findOne({ orderId: staleOrder._id, toStatus: 'CANCELLED' });
    assert.ok(event);

    // Verify fresh order untouched
    const updatedFresh = await Order.findById(freshOrder._id);
    assert.equal(updatedFresh.status, 'PAYMENT_PENDING');
});
