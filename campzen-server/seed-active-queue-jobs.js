require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/user.model');
const Vendor = require('./src/models/vendor.model');
const Order = require('./src/models/order.model');
const PrintJob = require('./src/models/printJob.model');
const OrderEvent = require('./src/models/orderEvent.model');
const Document = require('./src/models/document.model');

async function seedQueueJobs() {
  console.log('--- Seeding Live Production Queue Jobs for Vendor Dashboard ---');
  await connectDB();

  const vendor = await Vendor.findOne({ name: 'Keshava Stationery & Xerox' });
  let student = await User.findOne({ role: 'student' });
  if (!student) {
    student = await User.create({
      name: 'Ananya Rao',
      email: 'ananya.student@mitmysore.in',
      phone: '9845112233',
      password: 'StudentPassword123!',
      role: 'student',
      isVerified: true
    });
  }

  let doc = await Document.findOne({ processingStatus: 'completed', isDeleted: false });
  if (!doc) {
    doc = await Document.create({
      userId: student._id,
      originalFilename: 'Final_Year_Project_Report.pdf',
      mimeType: 'application/pdf',
      storageKeyOriginal: 'real-dummy.pdf',
      fileSize: 102400,
      pageCount: 32,
      processingStatus: 'completed'
    });
  }

  // Create Job A: PAID (Incoming Intake)
  const orderA = await Order.create({
    orderNumber: `KMI${Math.floor(2000 + Math.random() * 8000)}`,
    userId: student._id,
    vendorId: vendor._id,
    type: 'print',
    status: 'PAID',
    subtotal: 48,
    platformFee: 2,
    deliveryFee: 0,
    schedulingFee: 0,
    total: 50,
    fulfillmentType: 'pickup',
    pickupCode: '4392',
    estimatedReadyAt: new Date(Date.now() + 45 * 60000)
  });

  await PrintJob.create({
    documentId: doc._id,
    orderId: orderA._id,
    pageRange: '1-24',
    copies: 2,
    colorMode: 'Color',
    sides: 'double',
    paperSize: 'A4',
    paperType: '80gsm',
    pagesPerSheet: 1,
    collate: true,
    finishing: [{ type: 'spiral_binding', price: 25 }],
    price: 48
  });

  await OrderEvent.create({
    orderId: orderA._id,
    fromStatus: 'PAYMENT_PENDING',
    toStatus: 'PAID',
    actorId: student._id,
    note: 'Payment confirmed online via UPI'
  });

  // Create Job B: ACCEPTED (Next in line)
  const orderB = await Order.create({
    orderNumber: `KMI${Math.floor(2000 + Math.random() * 8000)}`,
    userId: student._id,
    vendorId: vendor._id,
    type: 'print',
    status: 'ACCEPTED',
    subtotal: 18,
    platformFee: 2,
    deliveryFee: 0,
    schedulingFee: 0,
    total: 20,
    fulfillmentType: 'pickup',
    pickupCode: '9120',
    estimatedReadyAt: new Date(Date.now() + 25 * 60000)
  });

  await PrintJob.create({
    documentId: doc._id,
    orderId: orderB._id,
    pageRange: 'all',
    copies: 1,
    colorMode: 'B&W',
    sides: 'single',
    paperSize: 'A4',
    paperType: '70gsm',
    pagesPerSheet: 1,
    collate: true,
    finishing: [{ type: 'stapling', price: 5 }],
    price: 18
  });

  await OrderEvent.create({
    orderId: orderB._id,
    fromStatus: 'PAID',
    toStatus: 'ACCEPTED',
    actorId: vendor.ownerId,
    note: 'Accepted by operator; queued for printer'
  });

  // Create Job C: PRINTING (Currently running on Machine 1)
  const orderC = await Order.create({
    orderNumber: `KMI${Math.floor(2000 + Math.random() * 8000)}`,
    userId: student._id,
    vendorId: vendor._id,
    type: 'print',
    status: 'PRINTING',
    subtotal: 30,
    platformFee: 2,
    deliveryFee: 0,
    schedulingFee: 0,
    total: 32,
    fulfillmentType: 'pickup',
    pickupCode: '1734',
    estimatedReadyAt: new Date(Date.now() + 10 * 60000)
  });

  await PrintJob.create({
    documentId: doc._id,
    orderId: orderC._id,
    pageRange: '1-15',
    copies: 1,
    colorMode: 'Color',
    sides: 'single',
    paperSize: 'A4',
    paperType: '80gsm',
    pagesPerSheet: 1,
    collate: true,
    finishing: [],
    price: 30
  });

  await OrderEvent.create({
    orderId: orderC._id,
    fromStatus: 'ACCEPTED',
    toStatus: 'PRINTING',
    actorId: vendor.ownerId,
    note: 'Production allocated and running on Machine 1'
  });

  console.log(`✅ Seeded Job A (PAID/Intake): #${orderA.orderNumber}`);
  console.log(`✅ Seeded Job B (ACCEPTED/Next): #${orderB.orderNumber}`);
  console.log(`✅ Seeded Job C (PRINTING/Now): #${orderC.orderNumber}`);

  await mongoose.connection.close();
  console.log('--- Done! ---');
  process.exit(0);
}

seedQueueJobs().catch((err) => {
  console.error(err);
  process.exit(1);
});
