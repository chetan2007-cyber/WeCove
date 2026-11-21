const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Document = require('../models/document.model');
const Order = require('../models/order.model');
const OrderEvent = require('../models/orderEvent.model');

// Extracted into a separate function so we can test it immediately without waiting for midnight
const cleanupExpiredDocuments = async () => {
    console.log('[Cron] Starting expired document cleanup...');
    try {
        const now = new Date();
        // Find documents where the expiration date has passed and they aren't already marked deleted
        const expiredDocs = await Document.find({ expiresAt: { $lt: now }, isDeleted: false });

        let deletedCount = 0;
        for (const doc of expiredDocs) {
            // 1. Physically delete the file from the disk
            const filePath = path.join(__dirname, '../../uploads', doc.storageKeyOriginal);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // 2. Mark as deleted in the database (Soft delete)
            doc.isDeleted = true;
            await doc.save();
            deletedCount++;
        }
        console.log(`[Cron] Cleanup complete. Deleted ${deletedCount} expired document(s).`);
    } catch (error) {
        console.error('[Cron] Document cleanup failed:', error.message);
    }
};

const cancelStaleOrders = async () => {
    console.log('[Cron] Checking for stale unpaid orders...');
    try {
        // Find orders older than 24 hours that are still pending payment
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const staleOrders = await Order.find({
            status: 'PAYMENT_PENDING',
            createdAt: { $lt: yesterday }
        });

        let cancelledCount = 0;
        for (const order of staleOrders) {
            order.status = 'CANCELLED';
            order.cancelledReason = 'Payment timeout (24h)';
            await order.save();

            await OrderEvent.create({
                orderId: order._id,
                fromStatus: 'PAYMENT_PENDING',
                toStatus: 'CANCELLED',
                actorId: order.userId, // System automated action, mapped to the user
                note: 'System auto-cancelled due to 24h payment timeout'
            });
            cancelledCount++;
        }
        console.log(`[Cron] Stale order check complete. Cancelled ${cancelledCount} order(s).`);
    } catch (error) {
        console.error('[Cron] Stale order check failed:', error.message);
    }
};

const startCronJobs = () => {
    // Run every night at Midnight (0 0 * * *)
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running nightly maintenance tasks...');
        await cleanupExpiredDocuments();
        await cancelStaleOrders();
    });
    console.log('✅ Background Cron Jobs initialized.');
};

module.exports = { startCronJobs, cleanupExpiredDocuments, cancelStaleOrders };