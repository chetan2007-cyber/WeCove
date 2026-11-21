const Payment = require('../models/payment.model');
const Order = require('../models/order.model');
const OrderEvent = require('../models/orderEvent.model');

// @desc    Create a payment intent (Simulated)
// @route   POST /api/payments/mock-intent
// @access  Private
const createMockIntent = async (req, res, next) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order || order.status !== 'PAYMENT_PENDING') {
            return res.status(400).json({ success: false, message: 'Invalid order or order not pending payment' });
        }

        // Create a pending payment record
        const payment = await Payment.create({
            orderId: order._id,
            userId: req.user.id,
            gateway: 'mock',
            gatewayPaymentId: `mock_pay_${Date.now()}`,
            amount: order.total,
            status: 'pending'
        });

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Handle payment gateway webhook
// @route   POST /api/payments/webhook
// @access  Public (Requires cryptographic signature or webhook secret)
const paymentWebhook = async (req, res, next) => {
    try {
        const { gatewayPaymentId, status, method } = req.body;

        // Security Check: Authenticate incoming webhook signature when secret is configured
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
        if (webhookSecret) {
            const signature = req.headers['x-razorpay-signature'] || req.headers['x-kami-webhook-secret'];
            if (!signature) {
                return res.status(401).json({ success: false, message: 'Unauthorized: Webhook signature is required' });
            }
            if (req.headers['x-razorpay-signature']) {
                const crypto = require('crypto');
                const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
                if (signature !== expectedSignature) {
                    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid signature' });
                }
            } else if (signature !== webhookSecret) {
                return res.status(401).json({ success: false, message: 'Unauthorized: Invalid webhook secret' });
            }
        }

        if (status === 'successful') {
            // Atomic update: only update if not already successful!
            const payment = await Payment.findOneAndUpdate(
                { gatewayPaymentId, status: { $ne: 'successful' } },
                {
                    $set: {
                        status: 'successful',
                        method: method || 'UPI',
                        paidAt: new Date()
                    }
                },
                { returnDocument: 'after' }
            );

            if (!payment) {
                const existing = await Payment.findOne({ gatewayPaymentId });
                if (!existing) return res.status(404).json({ success: false, message: 'Payment not found' });
                // If it already exists and is successful, return idempotent 200
                return res.status(200).json({ success: true, message: 'Webhook already processed' });
            }

            // Atomically update Order status to PAID if it's currently PAYMENT_PENDING
            const order = await Order.findOneAndUpdate(
                { _id: payment.orderId, status: 'PAYMENT_PENDING' },
                { $set: { status: 'PAID' } },
                { returnDocument: 'after' }
            );

            if (order) {
                // Generate a 4-digit pickup code for the student
                const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();
                order.pickupCode = pickupCode;
                await order.save();

                // Mark linked PrintJob READY_FOR_AGENT cleanly before recording event / auto-dispatch
                let hasReadyPrintJob = false;
                try {
                    const PrintJob = require('../models/printJob.model');
                    const pj = await PrintJob.findOne({ orderId: order._id });
                    if (pj && ['CREATED', 'VALIDATED'].includes(pj.executionState)) {
                        await PrintJob.findByIdAndUpdate(pj._id, {
                            $set: {
                                executionState: 'READY_FOR_AGENT',
                                submissionIdempotencyKey: pj.submissionIdempotencyKey || `pj_${pj._id}`
                            }
                        });
                    }
                    hasReadyPrintJob = Boolean(pj);
                } catch (pErr) {
                    console.warn('[AutoPrint] Payment PrintJob readiness error:', pErr.message);
                }

                // Create Audit Log before dispatching auto-print so timeline ordering stays exact
                await OrderEvent.create({
                    orderId: order._id,
                    fromStatus: 'PAYMENT_PENDING',
                    toStatus: 'PAID',
                    actorId: payment.userId, // Normally 'system' for webhooks, but using user for tracking
                    note: `Payment confirmed via ${payment.gateway}`
                });

                const allowAutoPrintOnPayment =
                    (process.env.NODE_ENV !== 'test' || process.env.KAMI_ALLOW_TEST_AUTOPRINT === 'true') &&
                    process.env.AUTO_PRINT_ON_PAYMENT === 'true';

                const isEditWindowOpen = process.env.KAMI_ALLOW_TEST_AUTOPRINT !== 'true' && order.editWindowEndsAt && Date.now() < new Date(order.editWindowEndsAt).getTime();
                if (hasReadyPrintJob && allowAutoPrintOnPayment && !isEditWindowOpen) {
                    const printerService = require('../services/printer.service');
                    printerService.printOrder(order._id, { actorId: payment.userId }).catch(err => {
                        console.warn('[AutoPrint] Auto-dispatch on payment notice:', err.message);
                    });
                }
            }

            return res.status(200).json({ success: true, message: 'Webhook processed' });
        } else {
            const payment = await Payment.findOneAndUpdate(
                { gatewayPaymentId },
                {
                    $set: {
                        status: 'failed',
                        failureReason: 'Simulated failure'
                    }
                },
                { returnDocument: 'after' }
            );

            if (!payment) {
                return res.status(404).json({ success: false, message: 'Payment not found' });
            }

            return res.status(200).json({ success: true, message: 'Webhook processed' });
        }
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createMockIntent, paymentWebhook };