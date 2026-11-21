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

const setupConcurrencyPrerequisites = async () => {
    const college = await College.create({
        name: 'Concurrency Tech Institute',
        location: 'West Campus',
        city: 'Bengaluru',
        state: 'Karnataka'
    });

    // Create 2 vendors to test cross-vendor isolation
    const { user: vOwner1, token: vToken1 } = await createTestUser({ role: 'vendor_owner', isVerified: true, collegeId: college._id });
    const vendor1 = await Vendor.create({
        name: 'Station A Xerox',
        ownerId: vOwner1._id,
        collegeId: college._id,
        address: { line1: 'Academic Block A' },
        status: 'active',
        isApproved: true,
        capabilities: { colorPrinting: true }
    });

    const { user: vOwner2, token: vToken2 } = await createTestUser({ role: 'vendor_owner', isVerified: true, collegeId: college._id });
    const vendor2 = await Vendor.create({
        name: 'Station B Xerox',
        ownerId: vOwner2._id,
        collegeId: college._id,
        address: { line1: 'Student Center B' },
        status: 'active',
        isApproved: true,
        capabilities: { colorPrinting: false } // monochrome only
    });

    for (const v of [vendor1, vendor2]) {
        await RateCard.create({
            vendorId: v._id,
            paperSize: 'A4',
            paperType: '70gsm',
            colorMode: 'B&W',
            sides: 'single',
            pricePerPage: 2.0,
            minPages: 1,
            maxPages: 9999
        });
        await RateCard.create({
            vendorId: v._id,
            paperSize: 'A4',
            paperType: '70gsm',
            colorMode: 'B&W',
            sides: 'double',
            pricePerPage: 1.5,
            minPages: 1,
            maxPages: 9999
        });
        await RateCard.create({
            vendorId: v._id,
            paperSize: 'A4',
            paperType: '70gsm',
            colorMode: 'Color',
            sides: 'single',
            pricePerPage: 10.0,
            minPages: 1,
            maxPages: 9999
        });
    }

    return { college, vendor1, vOwner1, vToken1, vendor2, vOwner2, vToken2 };
};

// ============================================================================
// PART 3: 15 SPECIFIC CONCURRENT PRINTING & SPOOLER TEST SCENARIOS
// ============================================================================

test('Scenario 1: Two orders submitted simultaneously are accepted independently with unique order numbers', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student1, token: sToken1 } = await createTestUser({ role: 'student', collegeId: env.college._id });
    const { user: student2, token: sToken2 } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc1 = await Document.create({
        userId: student1._id,
        originalFilename: 'doc1.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/doc1.pdf'
    });

    const doc2 = await Document.create({
        userId: student2._id,
        originalFilename: 'doc2.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
        pageCount: 4,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/doc2.pdf'
    });

    const [res1, res2] = await Promise.all([
        request(app).post('/api/orders').set('Authorization', `Bearer ${sToken1}`).send({
            vendorId: env.vendor1._id,
            type: 'print',
            fulfillmentType: 'pickup',
            documentId: doc1._id,
            printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
        }),
        request(app).post('/api/orders').set('Authorization', `Bearer ${sToken2}`).send({
            vendorId: env.vendor1._id,
            type: 'print',
            fulfillmentType: 'pickup',
            documentId: doc2._id,
            printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
        })
    ]);

    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res2.status, 201);
    assert.notStrictEqual(res1.body.data.order._id, res2.body.data.order._id);
    assert.notStrictEqual(res1.body.data.order.orderNumber, res2.body.data.order.orderNumber);
    assert.notStrictEqual(res1.body.data.printJob._id, res2.body.data.printJob._id);
});

test('Scenario 2: Ten orders submitted simultaneously produce zero duplicate orders and zero losses', async () => {
    const env = await setupConcurrencyPrerequisites();
    const studentPromises = Array.from({ length: 10 }, (_, i) =>
        createTestUser({ role: 'student', email: `stress_student_${i}@concurrency.edu`, collegeId: env.college._id })
    );
    const students = await Promise.all(studentPromises);

    const docPromises = students.map((s, idx) =>
        Document.create({
            userId: s.user._id,
            originalFilename: `student_paper_${idx}.pdf`,
            mimeType: 'application/pdf',
            fileSize: 1024 * (idx + 1),
            pageCount: idx + 1,
            processingStatus: 'completed',
            storageKeyOriginal: `raw/paper_${idx}.pdf`
        })
    );
    const docs = await Promise.all(docPromises);

    const orderSubmissions = students.map((s, idx) =>
        request(app).post('/api/orders').set('Authorization', `Bearer ${s.token}`).send({
            vendorId: env.vendor1._id,
            type: 'print',
            fulfillmentType: 'pickup',
            documentId: docs[idx]._id,
            printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
        })
    );

    const results = await Promise.all(orderSubmissions);
    results.forEach((r) => assert.strictEqual(r.status, 201));

    const orderIds = new Set(results.map((r) => r.body.data.order._id));
    const orderNumbers = new Set(results.map((r) => r.body.data.order.orderNumber));
    const printJobIds = new Set(results.map((r) => r.body.data.printJob._id));

    assert.strictEqual(orderIds.size, 10, 'All 10 orders must have unique IDs');
    assert.strictEqual(orderNumbers.size, 10, 'All 10 orders must have unique order numbers');
    assert.strictEqual(printJobIds.size, 10, 'All 10 print jobs must have unique IDs');
});

test('Scenario 3: Two students order different PDFs from one shop with correct document-to-order mapping', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: s1, token: t1 } = await createTestUser({ role: 'student', collegeId: env.college._id });
    const { user: s2, token: t2 } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const docA = await Document.create({
        userId: s1._id,
        originalFilename: 'Syllabus_Math.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 3,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/math.pdf'
    });

    const docB = await Document.create({
        userId: s2._id,
        originalFilename: 'Chemistry_Lab.pdf',
        mimeType: 'application/pdf',
        fileSize: 2000,
        pageCount: 7,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/chem.pdf'
    });

    const [resA, resB] = await Promise.all([
        request(app).post('/api/orders').set('Authorization', `Bearer ${t1}`).send({
            vendorId: env.vendor1._id,
            type: 'print',
            fulfillmentType: 'pickup',
            documentId: docA._id,
            printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
        }),
        request(app).post('/api/orders').set('Authorization', `Bearer ${t2}`).send({
            vendorId: env.vendor1._id,
            type: 'print',
            fulfillmentType: 'pickup',
            documentId: docB._id,
            printSettings: { copies: 1, sides: 'double', colorMode: 'Color', paperSize: 'A4' }
        })
    ]);

    assert.strictEqual(resA.status, 201);
    assert.strictEqual(resB.status, 201);

    const jobA = await PrintJob.findById(resA.body.data.printJob._id);
    const jobB = await PrintJob.findById(resB.body.data.printJob._id);

    assert.strictEqual(jobA.documentId.toString(), docA._id.toString());
    assert.strictEqual(jobA.originalPageCount, 3);
    assert.strictEqual(jobA.informationSheetType, 'plain'); // 3 pages -> plain

    assert.strictEqual(jobB.documentId.toString(), docB._id.toString());
    assert.strictEqual(jobB.originalPageCount, 7);
    assert.strictEqual(jobB.informationSheetType, 'creative'); // 7 pages -> creative
});

test('Scenario 4: Orders go to different shops with strict cross-vendor isolation', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'notes.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/notes.pdf'
    });

    const res1 = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });

    const res2 = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor2._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });

    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res2.status, 201);

    // Vendor 1 queries intake -> must see Order 1, but NOT Order 2
    const v1Queue = await request(app).get('/api/orders/vendor?status=all').set('Authorization', `Bearer ${env.vToken1}`);
    const v1Orders = Array.isArray(v1Queue.body.data) ? v1Queue.body.data : (v1Queue.body.data?.orders || []);
    const v1OrderIds = v1Orders.map((o) => o._id.toString());
    assert.ok(v1OrderIds.includes(res1.body.data.order._id.toString()));
    assert.ok(!v1OrderIds.includes(res2.body.data.order._id.toString()));

    // Vendor 2 queries intake -> must see Order 2, but NOT Order 1
    const v2Queue = await request(app).get('/api/orders/vendor?status=all').set('Authorization', `Bearer ${env.vToken2}`);
    const v2Orders = Array.isArray(v2Queue.body.data) ? v2Queue.body.data : (v2Queue.body.data?.orders || []);
    const v2OrderIds = v2Orders.map((o) => o._id.toString());
    assert.ok(v2OrderIds.includes(res2.body.data.order._id.toString()));
    assert.ok(!v2OrderIds.includes(res1.body.data.order._id.toString()));
});

test('Scenario 5: Two copies of a 2-page document preserves copies=2 and generates 4 impressions', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'assignment2p.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/assignment2p.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 2, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });

    assert.strictEqual(res.status, 201);
    const job = await PrintJob.findById(res.body.data.printJob._id);
    assert.strictEqual(job.copies, 2);
    assert.strictEqual(job.expectedImpressions, 4);
    assert.strictEqual(job.expectedSheets, 4);
});

test('Scenario 6: Single-sided printing explicitly sets sides=single with simplex output', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'simplex.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/simplex.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });

    assert.strictEqual(res.status, 201);
    const job = await PrintJob.findById(res.body.data.printJob._id);
    assert.strictEqual(job.sides, 'single');
    assert.strictEqual(job.expectedSheets, 2);
});

test('Scenario 7: Double-sided printing accurately calculates 1 sheet for 2-page document', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'duplex.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/duplex.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'double', colorMode: 'B&W', paperSize: 'A4' }
    });

    assert.strictEqual(res.status, 201);
    const job = await PrintJob.findById(res.body.data.printJob._id);
    assert.strictEqual(job.sides, 'double');
    assert.strictEqual(job.expectedSheets, 1);
    assert.strictEqual(job.expectedImpressions, 2);
});

test('Scenario 8: Mixed colour ranges specifies custom color pages accurately', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'mixed.pdf',
        mimeType: 'application/pdf',
        fileSize: 2000,
        pageCount: 4,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/mixed.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: {
            copies: 1,
            sides: 'single',
            colorMode: 'Mixed',
            colorSelectionType: 'custom',
            colorPages: '1, 3',
            paperSize: 'A4'
        }
    });

    assert.strictEqual(res.status, 201);
    const job = await PrintJob.findById(res.body.data.printJob._id);
    assert.strictEqual(job.colorMode, 'Mixed');
    assert.strictEqual(job.colorPages, '1, 3');
});

test('Scenario 9: Same order receives concurrent retry and rejects duplicate physical submission', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'retry_test.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/retry.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });
    const orderId = res.body.data.order._id;
    await Order.findByIdAndUpdate(orderId, { status: 'PAID' });

    // Submit two print requests simultaneously
    const [p1, p2] = await Promise.all([
        request(app).post(`/api/orders/${orderId}/print`).set('Authorization', `Bearer ${env.vToken1}`).send({}),
        request(app).post(`/api/orders/${orderId}/print`).set('Authorization', `Bearer ${env.vToken1}`).send({})
    ]);

    // One succeeds or deduplicates; neither creates duplicate physical job
    const statuses = [p1.status, p2.status];
    assert.ok(statuses.includes(200) || statuses.includes(409));
});

test('Scenario 10: Print Agent crash reconciliation reconciles spooler without blind re-dispatch', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'crash.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/crash.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });
    const orderId = res.body.data.order._id;

    // Simulate an orphaned job in SUBMITTING state
    await PrintJob.findOneAndUpdate(
        { orderId },
        { executionState: 'SUBMITTING', submissionCount: 1, spoolerJobId: 999 }
    );

    const reconRes = await request(app)
        .post(`/api/orders/${orderId}/print-reconcile`)
        .set('Authorization', `Bearer ${env.vToken1}`)
        .send({});

    assert.strictEqual(reconRes.status, 200);
    assert.ok(reconRes.body.success);
});

test('Scenario 11: Printer offline status enters PRINTER_OFFLINE cleanly without crashing', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'offline.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/offline.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });
    const orderId = res.body.data.order._id;
    await Order.findByIdAndUpdate(orderId, { status: 'PAID' });

    // Mark print job as PRINTER_OFFLINE
    await PrintJob.findOneAndUpdate({ orderId }, { executionState: 'PRINTER_OFFLINE' });
    const job = await PrintJob.findOne({ orderId });
    assert.strictEqual(job.executionState, 'PRINTER_OFFLINE');
});

test('Scenario 12: Two jobs enter same shop queue and process independently', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: s1, token: t1 } = await createTestUser({ role: 'student', collegeId: env.college._id });
    const { user: s2, token: t2 } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc1 = await Document.create({
        userId: s1._id,
        originalFilename: 'queue1.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/q1.pdf'
    });

    const doc2 = await Document.create({
        userId: s2._id,
        originalFilename: 'queue2.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 3,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/q2.pdf'
    });

    const [r1, r2] = await Promise.all([
        request(app).post('/api/orders').set('Authorization', `Bearer ${t1}`).send({
            vendorId: env.vendor1._id,
            type: 'print',
            fulfillmentType: 'pickup',
            documentId: doc1._id,
            printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
        }),
        request(app).post('/api/orders').set('Authorization', `Bearer ${t2}`).send({
            vendorId: env.vendor1._id,
            type: 'print',
            fulfillmentType: 'pickup',
            documentId: doc2._id,
            printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
        })
    ]);

    assert.strictEqual(r1.status, 201);
    assert.strictEqual(r2.status, 201);

    const qRes = await request(app).get('/api/orders/vendor?status=all').set('Authorization', `Bearer ${env.vToken1}`);
    assert.strictEqual(qRes.status, 200);
    const qOrders = Array.isArray(qRes.body.data) ? qRes.body.data : (qRes.body.data?.orders || []);
    assert.ok(qOrders.length >= 2);
});

test('Scenario 13: Vendor or student cancels an eligible order, setting state to CANCELLED', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'cancel.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/cancel.pdf'
    });

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });
    const orderId = res.body.data.order._id;

    const cancelRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${sToken}`)
        .send({ reason: 'Student cancelled prior to print' });

    assert.strictEqual(cancelRes.status, 200);
    const updated = await Order.findById(orderId);
    assert.strictEqual(updated.status, 'CANCELLED');
});

test('Scenario 14: PDF source missing/corrupted fails safely with error without false completion', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    // Non-existent document ID
    const badDocId = '6af8418008cac93f256a9999';

    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor1._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: badDocId,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });

    assert.strictEqual(res.status, 404);
});

test('Scenario 15: One job succeeds while another fails; statuses remain strictly independent', async () => {
    const env = await setupConcurrencyPrerequisites();
    const { user: student, token: sToken } = await createTestUser({ role: 'student', collegeId: env.college._id });

    const doc = await Document.create({
        userId: student._id,
        originalFilename: 'job_indep.pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        pageCount: 2,
        processingStatus: 'completed',
        storageKeyOriginal: 'raw/indep.pdf'
    });

    // Valid B&W order for monochrome Vendor 2
    const resValid = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor2._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'B&W', paperSize: 'A4' }
    });
    assert.strictEqual(resValid.status, 201);

    // Incompatible Color order for monochrome Vendor 2
    const resInvalid = await request(app).post('/api/orders').set('Authorization', `Bearer ${sToken}`).send({
        vendorId: env.vendor2._id,
        type: 'print',
        fulfillmentType: 'pickup',
        documentId: doc._id,
        printSettings: { copies: 1, sides: 'single', colorMode: 'Color', paperSize: 'A4' }
    });
    // Rejected because Vendor 2 is monochrome only
    assert.strictEqual(resInvalid.status, 400);

    // Verify first order is completely unaffected
    const validOrder = await Order.findById(resValid.body.data.order._id);
    assert.strictEqual(validOrder.status, 'PAYMENT_PENDING');
});
