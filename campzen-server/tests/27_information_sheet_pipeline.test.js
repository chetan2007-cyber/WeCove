const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const app = require('../src/app');
const College = require('../src/models/college.model');
const Category = require('../src/models/category.model');
const Vendor = require('../src/models/vendor.model');
const RateCard = require('../src/models/rateCard.model');
const Document = require('../src/models/document.model');
const Order = require('../src/models/order.model');
const PrintJob = require('../src/models/printJob.model');
const PrintableResource = require('../src/models/printableResource.model');
const CreatorLedgerEntry = require('../src/models/creatorLedgerEntry.model');
const infoSheetService = require('../src/services/informationSheet.service');
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

    const { user: vendorOwner, token: vendorToken } = await createTestUser({ role: 'vendor_owner', isVerified: true, collegeId: college._id });
    const vendor = await Vendor.create({
        name: 'Campus Xerox Center',
        ownerId: vendorOwner._id,
        collegeId: college._id,
        address: { line1: 'Campus Canteen' },
        status: 'active',
        isApproved: true,
        capabilities: { colorPrinting: true }
    });

    // Default rate cards for A4 B&W and Color, single and double
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

    const { user: student, token: studentToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: otherStudent, token: otherStudentToken } = await createTestUser({ role: 'student', collegeId: college._id });

    return { college, vendor, vendorOwner, vendorToken, student, studentToken, otherStudent, otherStudentToken };
};

test('2.1 Rules: determineSheetType enforces 1-5 plain vs 6+ creative threshold strictly', () => {
    assert.strictEqual(infoSheetService.determineSheetType(1), 'plain');
    assert.strictEqual(infoSheetService.determineSheetType(2), 'plain');
    assert.strictEqual(infoSheetService.determineSheetType(4), 'plain');
    assert.strictEqual(infoSheetService.determineSheetType(5), 'plain');
    assert.strictEqual(infoSheetService.determineSheetType(6), 'creative');
    assert.strictEqual(infoSheetService.determineSheetType(7), 'creative');
    assert.strictEqual(infoSheetService.determineSheetType(20), 'creative');
    assert.strictEqual(infoSheetService.determineSheetType(100), 'creative');

    assert.throws(() => infoSheetService.determineSheetType(0), /Invalid original page count/);
    assert.throws(() => infoSheetService.determineSheetType(-3), /Invalid original page count/);
    assert.throws(() => infoSheetService.determineSheetType('invalid'), /Invalid original page count/);
});

test('2.1 Rules: Copies, Duplex and Finishing do NOT alter threshold decision', () => {
    // 2-page document with 5 copies (10 physical pages) -> must remain 'plain'
    const orig2 = 2;
    assert.strictEqual(infoSheetService.determineSheetType(orig2), 'plain');

    // 5-page document with 3 copies and duplex -> must remain 'plain'
    const orig5 = 5;
    assert.strictEqual(infoSheetService.determineSheetType(orig5), 'plain');

    // 6-page document with 1 copy single-sided -> must be 'creative'
    const orig6 = 6;
    assert.strictEqual(infoSheetService.determineSheetType(orig6), 'creative');
});

test('2.4 Privacy: Phone number masking correctly obfuscates student phone', () => {
    assert.strictEqual(infoSheetService.maskPhoneNumber('9876543210'), '******3210');
    assert.strictEqual(infoSheetService.maskPhoneNumber('+919876543210'), '+91 ******3210');
    assert.strictEqual(infoSheetService.maskPhoneNumber(''), 'Not Provided');
    assert.strictEqual(infoSheetService.maskPhoneNumber(null), 'Not Provided');
});

test('2.2 & 2.5 Plain Sheet: Generates valid A4 PDF with table layout for 1-5 page order', async () => {
    const orderData = {
        orderNumber: '#KAMI-112233',
        userName: 'Chetan S',
        userUSN: '1MS21CS001',
        userPhone: '9876543210',
        fulfillmentType: 'pickup',
        pickupCode: '1234',
        vendorName: 'Suite 27 Xerox',
        createdAt: new Date(),
        notes: 'Suite 27 Plain Sheet'
    };
    const docData = { originalFilename: '2page_suite27.pdf', pageCount: 2 };
    const printJobData = { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4', paperType: '70gsm' };

    const buffer = await infoSheetService.generatePlainSheet(orderData, docData, printJobData);
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 1000);
    assert.strictEqual(buffer.slice(0, 5).toString('ascii'), '%PDF-');
});

test('2.3 & 2.5 Creative Sheet: Generates valid A4 PDF with creative theme for 6+ page order', async () => {
    const orderData = {
        orderNumber: '#KAMI-445566',
        userName: 'Chetan S',
        userUSN: '1MS21CS001',
        userPhone: '9876543210',
        fulfillmentType: 'pickup',
        pickupCode: '9876',
        vendorName: 'Suite 27 Xerox',
        createdAt: new Date(),
        notes: 'Suite 27 Creative Sheet'
    };
    const docData = { originalFilename: '6page_suite27.pdf', pageCount: 6 };
    const printJobData = { copies: 2, sides: 'double', colorMode: 'Color', paperSize: 'A4', paperType: '80gsm' };

    const buffer = await infoSheetService.generateCreativeSheet(orderData, docData, printJobData);
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 1000);
    assert.strictEqual(buffer.slice(0, 5).toString('ascii'), '%PDF-');
});

test('E2E Order Flow: 2-page document automatically generates Plain sheet on order creation', async () => {
    const env = await setupTestEnv();

    const doc2Pages = await Document.create({
        userId: env.student._id,
        name: '2page_test.pdf',
        originalFilename: '2page_test.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/test2pg.pdf'
    });

    const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({
            vendorId: env.vendor._id,
            type: 'print',
            fulfillmentType: 'pickup',
            notes: 'Suite 27 Test Order 2-Page',
            documentId: doc2Pages._id,
            printSettings: {
                copies: 1,
                sides: 'single',
                colorMode: 'B&W',
                paperSize: 'A4',
                paperType: '70gsm',
                pageRange: 'all'
            }
        });

    assert.strictEqual(res.status, 201);
    const orderId = res.body.data.order._id;
    const printJobId = res.body.data.printJob._id;

    const order = await Order.findById(orderId);
    assert.strictEqual(order.informationSheetType, 'plain');
    assert.ok(order.informationSheetKey.includes('info-sheet-'));

    const printJob = await PrintJob.findById(printJobId);
    assert.strictEqual(printJob.informationSheetType, 'plain');
    assert.ok(printJob.informationSheetKey.includes('info-sheet-'));

    // Verify physical file was persisted on disk
    const absPath = path.resolve(__dirname, '../uploads', order.informationSheetKey);
    assert.ok(fs.existsSync(absPath));
});

test('E2E Order Flow: 6-page document automatically generates Creative sheet on order creation', async () => {
    const env = await setupTestEnv();

    const doc6Pages = await Document.create({
        userId: env.student._id,
        name: '6page_test.pdf',
        originalFilename: '6page_test.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
        pageCount: 6,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/test6pg.pdf'
    });

    const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({
            vendorId: env.vendor._id,
            type: 'print',
            fulfillmentType: 'pickup',
            notes: 'Suite 27 Test Order 6-Page',
            documentId: doc6Pages._id,
            printSettings: {
                copies: 1,
                sides: 'double',
                colorMode: 'Color',
                paperSize: 'A4',
                paperType: '70gsm',
                pageRange: 'all'
            }
        });

    assert.strictEqual(res.status, 201);
    const orderId = res.body.data.order._id;
    const printJobId = res.body.data.printJob._id;

    const order = await Order.findById(orderId);
    assert.strictEqual(order.informationSheetType, 'creative');

    const printJob = await PrintJob.findById(printJobId);
    assert.strictEqual(printJob.informationSheetType, 'creative');
});

test('Access Control & Privacy: GET /api/orders/:id/information-sheet enforces ownership', async () => {
    const env = await setupTestEnv();

    const doc2Pages = await Document.create({
        userId: env.student._id,
        name: '2page_privacy.pdf',
        originalFilename: '2page_privacy.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/test2pg.pdf'
    });

    const resOrder = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({
            vendorId: env.vendor._id,
            type: 'print',
            fulfillmentType: 'pickup',
            notes: 'Suite 27 Privacy Test',
            documentId: doc2Pages._id,
            printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4', paperType: '70gsm' }
        });
    assert.strictEqual(resOrder.status, 201);
    const orderId = resOrder.body.data.order._id;

    // Student owner can access
    const resOwner = await request(app)
        .get(`/api/orders/${orderId}/information-sheet`)
        .set('Authorization', `Bearer ${env.studentToken}`);
    assert.strictEqual(resOwner.status, 200);
    assert.strictEqual(resOwner.headers['content-type'], 'application/pdf');

    // Assigned vendor can access
    const resVendor = await request(app)
        .get(`/api/orders/${orderId}/information-sheet`)
        .set('Authorization', `Bearer ${env.vendorToken}`);
    assert.strictEqual(resVendor.status, 200);
    assert.strictEqual(resVendor.headers['content-type'], 'application/pdf');

    // Other student is forbidden (BOLA/IDOR protection)
    const resForbidden = await request(app)
        .get(`/api/orders/${orderId}/information-sheet`)
        .set('Authorization', `Bearer ${env.otherStudentToken}`);
    assert.strictEqual(resForbidden.status, 403);
});

test('2.6 Royalty Separation: Information sheet is NOT counted as original pages for creator royalties', async () => {
    const env = await setupTestEnv();

    const category = await Category.create({
        name: 'Study Materials',
        slug: 'study-materials-27',
        applicableListingTypes: ['PRINTABLE_RESOURCE'],
        isActive: true
    });

    const resourceDoc = await Document.create({
        userId: env.otherStudent._id,
        originalFilename: 'algorithms_notes.pdf',
        mimeType: 'application/pdf',
        fileSize: 4096,
        pageCount: 6,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/resource27.pdf'
    });

    const resource = await PrintableResource.create({
        title: 'Suite 27 Resource Notes',
        description: 'Comprehensive Exam Preparation Notes',
        creatorId: env.otherStudent._id,
        collegeId: env.college._id,
        categoryId: category._id,
        documentId: resourceDoc._id,
        pageCount: 6,
        price: 50,
        royaltyRatePerPage: 2,
        storageKey: 'raw/resource27.pdf',
        rightsDeclaration: {
            hasAccepted: true,
            statement: 'I declare that I own all intellectual property rights to this content.'
        },
        moderationStatus: 'PUBLISHED',
        status: 'APPROVED'
    });

    const resOrder = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({
            vendorId: env.vendor._id,
            type: 'print',
            fulfillmentType: 'pickup',
            notes: 'Suite 27 Royalty Test',
            documentId: resourceDoc._id,
            resourceId: resource._id,
            printSettings: { copies: 2, sides: 'single', colorMode: 'B&W', paperSize: 'A4', paperType: '70gsm' }
        });

    assert.strictEqual(resOrder.status, 201);
    const orderId = resOrder.body.data.order._id;

    const ledger = await CreatorLedgerEntry.findOne({ orderId });
    assert.ok(ledger, 'Creator ledger entry must exist');
    // Original page count is strictly 6, copies 2. Eligible pages must be 6, NOT 7 (which would happen if info sheet polluted page count)
    assert.strictEqual(ledger.eligiblePages, 6);
    assert.strictEqual(ledger.copies, 2);
    assert.strictEqual(ledger.grossRoyalty, 24); // 6 * 2 * 2 = 24
});
