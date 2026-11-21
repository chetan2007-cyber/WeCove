const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const app = require('../src/app');
const { connectTestDB, clearTestDB, closeTestDB, createTestUser } = require('./helpers/test-db');
const College = require('../src/models/college.model');
const Vendor = require('../src/models/vendor.model');
const Document = require('../src/models/document.model');
const Order = require('../src/models/order.model');
const PrintJob = require('../src/models/printJob.model');
const PrintSubmissionLog = require('../src/models/printSubmissionLog.model');
const printerService = require('../src/services/printer.service');
const {
    parsePageRangeList,
    resolveSelectedPages,
    resolveColorOutputIndices,
    calculateExpectedOutput,
    normalizeSides,
    buildPrintReadyPdf
} = require('../src/services/printDocumentBuilder.service');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function createSamplePdfFile(filename, pageCount) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const filePath = path.join(UPLOADS_DIR, filename);
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    for (let i = 1; i <= pageCount; i++) {
        const page = pdfDoc.addPage([595.28, 841.89]);
        page.drawText(`TEST PAGE ${i} OF ${pageCount}`, { x: 60, y: 760, size: 18, font, color: rgb(0, 0, 0) });
    }
    fs.writeFileSync(filePath, await pdfDoc.save());
    return filePath;
}

async function setupShopAndOrder({ pageCount = 2, copies = 1, sides = 'single', colorMode = 'B&W', colorSelectionType = 'none', colorPages = '', pageRange = 'all', excludedPages = [] } = {}) {
    const college = await College.create({
        name: `Print Test College ${Date.now()}`,
        location: 'Block A',
        city: 'Mysuru',
        state: 'Karnataka'
    });
    const { user: vendorOwner, token: vendorToken } = await createTestUser({ role: 'vendor_owner' });
    const vendor = await Vendor.create({
        name: 'Test Print Center',
        ownerId: vendorOwner._id,
        collegeId: college._id,
        address: { line1: 'Main Road' },
        capabilities: { colorPrinting: true, paperSizes: ['A4', 'A3', 'Legal'] }
    });
    const { user: student, token: studentToken } = await createTestUser({ role: 'student', collegeId: college._id });

    const filename = `test-print-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const filePath = await createSamplePdfFile(filename, pageCount);

    const doc = await Document.create({
        userId: student._id,
        originalFilename: filename,
        mimeType: 'application/pdf',
        storageKeyOriginal: filename,
        fileSize: fs.statSync(filePath).size,
        pageCount,
        processingStatus: 'completed'
    });

    const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            documentId: doc._id,
            vendorId: vendor._id,
            fulfillmentType: 'pickup',
            printSettings: {
                copies,
                sides,
                colorMode,
                colorSelectionType,
                colorPages,
                pageRange,
                excludedPages,
                paperSize: 'A4',
                paperType: '70gsm',
                pagesPerSheet: 1
            }
        });

    assert.equal(createRes.status, 201, `Order creation failed: ${JSON.stringify(createRes.body)}`);
    const order = createRes.body.data.order;
    const printJob = createRes.body.data.printJob;

    // Complete mock payment
    const intentRes = await request(app)
        .post('/api/payments/mock-intent')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ orderId: order._id });
    assert.equal(intentRes.status, 201);

    const webhookRes = await request(app)
        .post('/api/payments/webhook')
        .send({ gatewayPaymentId: intentRes.body.data.gatewayPaymentId, status: 'successful', method: 'UPI' });
    assert.equal(webhookRes.status, 200);

    // Fast-forward edit window so test fixture order is immediately eligible for print execution
    await Order.findByIdAndUpdate(order._id, {
        $set: {
            editWindowEndsAt: new Date(Date.now() - 1000),
            editable: false
        }
    });

    return { vendor, vendorToken, student, studentToken, doc, filePath, order, printJob };
}

test.before(async () => {
    await connectTestDB();
});

test.beforeEach(async () => {
    await clearTestDB();
    printerService.resetSpoolerAdapter();
});

test.after(async () => {
    printerService.stopAutoPrintWatcher();
    await clearTestDB();
    await closeTestDB();
});

test('Unit: Page range parsing, exclusions, sides normalization, and expected sheets/impressions', () => {
    assert.deepEqual(parsePageRangeList('all', 4), [1, 2, 3, 4]);
    assert.deepEqual(parsePageRangeList('1, 3-4', 5), [1, 3, 4]);
    assert.throws(() => parsePageRangeList('3-1', 5), /Invalid logical range/);
    assert.throws(() => parsePageRangeList('1-10', 4), /exceeds document page count/);

    assert.deepEqual(resolveSelectedPages(4, 'all', [2]), [1, 3, 4]);
    assert.equal(normalizeSides('single'), 'single');
    assert.equal(normalizeSides('double'), 'double');
    assert.equal(normalizeSides('duplex'), 'double');
    assert.throws(() => normalizeSides('triple'), /Unsupported sides/);

    const singleOut = calculateExpectedOutput({ finalPrintReadyPageCount: 2, copies: 1, sides: 'single' });
    assert.equal(singleOut.expectedSheets, 2);
    assert.equal(singleOut.expectedImpressions, 2);

    const doubleOddOut = calculateExpectedOutput({ finalPrintReadyPageCount: 3, copies: 2, sides: 'double' });
    assert.equal(doubleOddOut.sheetsPerCopy, 2);
    assert.equal(doubleOddOut.expectedSheets, 4);
    assert.equal(doubleOddOut.expectedImpressions, 6);

    const colorIndices = resolveColorOutputIndices({
        colorMode: 'Mixed',
        colorSelectionType: 'custom',
        colorPages: '2',
        selectedOriginalPages: [1, 2, 3, 4],
        pagesPerSheet: 1
    });
    assert.deepEqual(colorIndices, [2]);
});

test('Validation: Reject invalid copies (0, negative, decimal) on order creation', async () => {
    const college = await College.create({ name: 'Val College', location: 'C1', city: 'Mysuru', state: 'KA' });
    const { user: vo } = await createTestUser({ role: 'vendor_owner' });
    const vendor = await Vendor.create({ name: 'Val Shop', ownerId: vo._id, collegeId: college._id, address: { line1: 'Road' } });
    const { user: st, token } = await createTestUser({ role: 'student', collegeId: college._id });
    const filename = `val-${Date.now()}.pdf`;
    const fp = await createSamplePdfFile(filename, 2);
    const doc = await Document.create({
        userId: st._id,
        originalFilename: filename,
        mimeType: 'application/pdf',
        storageKeyOriginal: filename,
        fileSize: fs.statSync(fp).size,
        pageCount: 2,
        processingStatus: 'completed'
    });

    for (const badCopies of [0, -2, 1.5]) {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                documentId: doc._id,
                vendorId: vendor._id,
                fulfillmentType: 'pickup',
                printSettings: { copies: badCopies, sides: 'single' }
            });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /Copies must be an integer/i);
    }
    fs.rmSync(fp, { force: true });
});

test('TEST A: Exact Reproduction (2 pages, 1 copy, SINGLE-SIDED, B&W) produces 1 submission, 2-page PDF, dmCopies=1, dmDuplex=1', async () => {
    const adapter = printerService.createVirtualTestSpoolerAdapter();
    printerService.setSpoolerAdapter(adapter);

    const { vendorToken, order, filePath } = await setupShopAndOrder({
        pageCount: 2,
        copies: 1,
        sides: 'single',
        colorMode: 'B&W'
    });

    // Safe Print Preview check
    const previewRes = await request(app)
        .get(`/api/orders/${order._id}/print-preview`)
        .set('Authorization', `Bearer ${vendorToken}`);
    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.body.data.compatible, true);
    assert.equal(previewRes.body.data.requestedSettings.copies, 1);
    assert.equal(previewRes.body.data.requestedSettings.sides, 'SINGLE-SIDED');
    assert.equal(previewRes.body.data.expectedOutput.expectedImpressions, 2);
    assert.equal(previewRes.body.data.expectedOutput.expectedSheets, 2);

    // Confirm Print
    const printRes = await request(app)
        .post(`/api/orders/${order._id}/print`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({});
    assert.equal(printRes.status, 200);
    assert.equal(printRes.body.data.deduplicated, false);
    assert.equal(printRes.body.data.appliedSettings.copies, 1);
    assert.equal(printRes.body.data.appliedSettings.dmCopies, 1);
    assert.equal(printRes.body.data.appliedSettings.dmDuplex, 1); // DMDUP_SIMPLEX

    // Verify 2 submissions to spooler (Info Sheet first, then Document) & PDF page count == 2
    assert.equal(adapter.submittedJobs.length, 2);
    const infoSubmitted = adapter.submittedJobs[0];
    assert.equal(infoSubmitted.dmCopies, 1);
    assert.equal(infoSubmitted.dmDuplex, 1);
    const submitted = adapter.submittedJobs[1];
    assert.equal(submitted.dmCopies, 1);
    assert.equal(submitted.dmDuplex, 1);
    assert.equal(submitted.pagesSubmitted, 2);
    const readyPdf = await PDFDocument.load(fs.readFileSync(submitted.spec.pdfPath));
    assert.equal(readyPdf.getPageCount(), 2, 'Print-ready PDF must contain strictly 2 pages');

    // Verify PrintJob execution state is PRINTED_PENDING_QC until vendor confirms physical output
    const pj = await PrintJob.findOne({ orderId: order._id });
    assert.equal(pj.executionState, 'PRINTED_PENDING_QC');
    assert.equal(pj.submissionCount, 1);
    assert.equal(pj.vendorConfirmed, false);

    // Vendor confirms physical output
    const qcRes = await request(app)
        .post(`/api/orders/${order._id}/print-confirm-qc`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({});
    assert.equal(qcRes.status, 200);
    assert.equal(qcRes.body.data.executionState, 'COMPLETED');
    assert.equal(qcRes.body.data.vendorConfirmed, true);

    fs.rmSync(filePath, { force: true });
    if (pj.printReadyStorageKey) fs.rmSync(path.join(UPLOADS_DIR, pj.printReadyStorageKey), { force: true });
});

test('TEST B & C: 2 copies single-sided & 1 copy double-sided NEVER duplicate PDF pages', async () => {
    const adapter = printerService.createVirtualTestSpoolerAdapter();
    printerService.setSpoolerAdapter(adapter);

    // TEST B: 2 pages, 2 copies, single
    const caseB = await setupShopAndOrder({ pageCount: 2, copies: 2, sides: 'single' });
    const resB = await request(app)
        .post(`/api/orders/${caseB.order._id}/print`)
        .set('Authorization', `Bearer ${caseB.vendorToken}`)
        .send({});
    assert.equal(resB.status, 200);
    assert.equal(adapter.submittedJobs.length, 2);
    assert.equal(adapter.submittedJobs[1].dmCopies, 2);
    assert.equal(adapter.submittedJobs[1].dmDuplex, 1);
    assert.equal(adapter.submittedJobs[1].pagesSubmitted, 2);

    // TEST C: 2 pages, 1 copy, double
    const caseC = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'double' });
    const resC = await request(app)
        .post(`/api/orders/${caseC.order._id}/print`)
        .set('Authorization', `Bearer ${caseC.vendorToken}`)
        .send({});
    assert.equal(resC.status, 200);
    assert.equal(adapter.submittedJobs.length, 4);
    assert.equal(adapter.submittedJobs[3].dmCopies, 1);
    assert.equal(adapter.submittedJobs[3].dmDuplex, 2); // TwoSidedLongEdge
    assert.equal(resC.body.data.expectedOutput.expectedSheets, 1);

    fs.rmSync(caseB.filePath, { force: true });
    fs.rmSync(caseC.filePath, { force: true });
});

test('TEST J & Concurrency: Repeated events and simultaneous print calls produce strictly ONE spooler submission', async () => {
    const adapter = printerService.createVirtualTestSpoolerAdapter();
    printerService.setSpoolerAdapter(adapter);

    const { vendorToken, order, filePath } = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'single' });

    // Transition PAID -> ACCEPTED -> PRINTING, plus concurrent POST /print calls
    await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'ACCEPTED' });

    assert.equal(adapter.submittedJobs.length, 0, 'ACCEPTED must NOT dispatch physical print');

    const results = await Promise.all([
        printerService.printOrder(order._id),
        printerService.printOrder(order._id),
        request(app).post(`/api/orders/${order._id}/print`).set('Authorization', `Bearer ${vendorToken}`).send({}),
        request(app).post(`/api/orders/${order._id}/print`).set('Authorization', `Bearer ${vendorToken}`).send({})
    ]);

    assert.equal(adapter.submittedJobs.length, 2, 'Concurrent & duplicate submissions must execute strictly ONCE (1 info sheet + 1 doc)');
    const pj = await PrintJob.findOne({ orderId: order._id });
    assert.equal(pj.submissionCount, 1);
    const logs = await PrintSubmissionLog.find({ printJobId: pj._id });
    assert.equal(logs.length, 1);

    // Subsequent transition to PRINTING via status endpoint also must not duplicate
    await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'PRINTING' });
    assert.equal(adapter.submittedJobs.length, 2);

    fs.rmSync(filePath, { force: true });
    assert.ok(results.length === 4);
});

test('TEST I: Crash / interrupted submission requires reconciliation and blocks automatic duplicate print', async () => {
    const baseAdapter = printerService.createVirtualTestSpoolerAdapter();
    let crashOnce = true;
    const crashingAdapter = {
        ...baseAdapter,
        async submitPrintJob(jobSpec) {
            const accepted = await baseAdapter.submitPrintJob(jobSpec);
            if (crashOnce) {
                crashOnce = false;
                throw new Error('Simulated network drop after spooler acceptance');
            }
            return accepted;
        }
    };
    printerService.setSpoolerAdapter(crashingAdapter);

    const { vendorToken, order, filePath } = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'single' });

    const firstRes = await request(app)
        .post(`/api/orders/${order._id}/print`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({});
    assert.equal(firstRes.status, 400);

    // PrintJob must be RECONCILIATION_REQUIRED (found in spooler!) and NEVER auto-retried
    const pjAfterCrash = await PrintJob.findOne({ orderId: order._id });
    assert.equal(pjAfterCrash.executionState, 'RECONCILIATION_REQUIRED');
    assert.equal(baseAdapter.submittedJobs.length, 1);

    // Calling printOrder again must NOT create a second spooler submission!
    const dupRes = await printerService.printOrder(order._id);
    assert.equal(dupRes.reconciliationRequired, true);
    assert.equal(baseAdapter.submittedJobs.length, 1);

    // Reconcile detects the job actually printed in spooler
    const recRes = await request(app)
        .post(`/api/orders/${order._id}/print-reconcile`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({});
    assert.equal(recRes.status, 200);
    assert.equal(recRes.body.data.spoolerFound, true);
    assert.equal(recRes.body.data.executionState, 'PRINTED_PENDING_QC');

    fs.rmSync(filePath, { force: true });
});

test('TEST M & Capability Validation: Blocks Color/Mixed on mono printer; preserves page order & grayscale/RGB split on color printer', async () => {
    const monoAdapter = printerService.createVirtualTestSpoolerAdapter();
    printerService.setSpoolerAdapter(monoAdapter);

    // Mixed job on monochrome-only printer must fail incompatibility pre-flight with 409
    const mixedOrder = await setupShopAndOrder({
        pageCount: 4,
        copies: 1,
        sides: 'single',
        colorMode: 'Mixed',
        colorSelectionType: 'custom',
        colorPages: '2'
    });

    const monoFail = await request(app)
        .post(`/api/orders/${mixedOrder.order._id}/print`)
        .set('Authorization', `Bearer ${mixedOrder.vendorToken}`)
        .send({});
    assert.equal(monoFail.status, 409);
    assert.equal(monoFail.body.errorCode, 'INCOMPATIBLE_COLOR_MODE');
    assert.equal(monoAdapter.submittedJobs.length, 0);

    // Switch to color-capable printer adapter
    const colorAdapter = printerService.createVirtualTestSpoolerAdapter();
    colorAdapter.getCapabilities = async (printerName) => ({
        ...(await monoAdapter.getCapabilities(printerName)),
        supportsColor: true
    });
    printerService.setSpoolerAdapter(colorAdapter);

    const retryColorRes = await request(app)
        .post(`/api/orders/${mixedOrder.order._id}/print-retry`)
        .set('Authorization', `Bearer ${mixedOrder.vendorToken}`)
        .send({ forceAfterPhysicalCheck: false });
    assert.equal(retryColorRes.status, 200);
    assert.equal(colorAdapter.submittedJobs.length, 2);
    const job = colorAdapter.submittedJobs[1];
    assert.equal(job.pagesSubmitted, 4);
    assert.equal(job.dmCopies, 1);
    assert.equal(job.dmDuplex, 1);
    assert.deepEqual(job.spec.colorOutputIndices, [2]);

    fs.rmSync(mixedOrder.filePath, { force: true });
});

test('TEST P & Q: Pre-submission cancellation prevents printing; Printer Offline enters PRINTER_OFFLINE and recovers cleanly', async () => {
    const adapter = printerService.createVirtualTestSpoolerAdapter();
    let offline = true;
    const flakyAdapter = {
        ...adapter,
        async getCapabilities(name) {
            const base = await adapter.getCapabilities(name);
            return { ...base, isOffline: offline, queueStatus: offline ? 'Offline' : 'None' };
        }
    };
    printerService.setSpoolerAdapter(flakyAdapter);

    // TEST P: Cancel before submission
    const cancelCase = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'single' });
    const cancelRes = await request(app)
        .post(`/api/orders/${cancelCase.order._id}/cancel`)
        .set('Authorization', `Bearer ${cancelCase.studentToken}`)
        .send({ reason: 'Wrong file' });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.printCancellation.beforeSubmission, true);
    assert.equal(cancelRes.body.printCancellation.cancelled, true);
    await assert.rejects(() => printerService.printOrder(cancelCase.order._id), /cancelled/i);
    assert.equal(adapter.submittedJobs.length, 0);

    // TEST Q: Printer offline -> PRINTER_OFFLINE, zero spooler jobs, then recover cleanly
    const offlineCase = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'single' });
    const offRes = await request(app)
        .post(`/api/orders/${offlineCase.order._id}/print`)
        .set('Authorization', `Bearer ${offlineCase.vendorToken}`)
        .send({});
    assert.equal(offRes.status, 503);
    assert.equal(offRes.body.errorCode, 'PRINTER_OFFLINE');
    assert.equal(adapter.submittedJobs.length, 0);

    // Printer comes back online -> safe vendor retry succeeds once
    offline = false;
    const recoverRes = await request(app)
        .post(`/api/orders/${offlineCase.order._id}/print-retry`)
        .set('Authorization', `Bearer ${offlineCase.vendorToken}`)
        .send({});
    assert.equal(recoverRes.status, 200);
    assert.equal(adapter.submittedJobs.length, 2);

    fs.rmSync(cancelCase.filePath, { force: true });
    fs.rmSync(offlineCase.filePath, { force: true });
});

test('Color Guard: Monochrome shop rejects Color order at creation and PUT /status PRINTING refuses incompatible print without status flip', async () => {
    const adapter = printerService.createVirtualTestSpoolerAdapter();
    printerService.setSpoolerAdapter(adapter);

    const college = await College.create({
        name: `Mono Guard College ${Date.now()}`,
        location: 'Block B',
        city: 'Mysuru',
        state: 'Karnataka'
    });
    const { user: vo, token: vendorToken } = await createTestUser({ role: 'vendor_owner' });
    const monoVendor = await Vendor.create({
        name: 'Mono Only Xerox',
        ownerId: vo._id,
        collegeId: college._id,
        address: { line1: 'Floor 1' },
        capabilities: { colorPrinting: false, paperSizes: ['A4'] }
    });
    const { user: student, token: studentToken } = await createTestUser({ role: 'student', collegeId: college._id });

    const filename = `mono-guard-${Date.now()}.pdf`;
    const filePath = await createSamplePdfFile(filename, 2);
    const doc = await Document.create({
        userId: student._id,
        originalFilename: filename,
        mimeType: 'application/pdf',
        storageKeyOriginal: filename,
        fileSize: fs.statSync(filePath).size,
        pageCount: 2,
        processingStatus: 'completed'
    });

    // 1. Monochrome shop rejects Color order at checkout time
    const blockedCreateRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            documentId: doc._id,
            vendorId: monoVendor._id,
            fulfillmentType: 'pickup',
            printSettings: { copies: 1, sides: 'single', colorMode: 'Color', colorSelectionType: 'all', paperSize: 'A4', paperType: '70gsm' }
        });
    assert.equal(blockedCreateRes.status, 400);
    assert.match(blockedCreateRes.body.message, /Black & White/i);

    // 2. If a Color order was placed against a color-capable shop whose printer is actually mono, PUT /status PRINTING must fail 409 without flipping order status
    const colorShopSetup = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'single', colorMode: 'Color', colorSelectionType: 'all' });
    const statusAttempt = await request(app)
        .put(`/api/orders/${colorShopSetup.order._id}/status`)
        .set('Authorization', `Bearer ${colorShopSetup.vendorToken}`)
        .send({ status: 'PRINTING' });
    assert.equal(statusAttempt.status, 409);
    assert.equal(statusAttempt.body.errorCode, 'INCOMPATIBLE_COLOR_MODE');
    const unchangedOrder = await Order.findById(colorShopSetup.order._id);
    assert.equal(unchangedOrder.status, 'PAID');
    assert.equal(adapter.submittedJobs.length, 0);

    fs.rmSync(filePath, { force: true });
    fs.rmSync(colorShopSetup.filePath, { force: true });
});

test('Auto-Print Mode: Payment webhook & watcher auto-dispatch strictly ONCE with simplex DEVMODE and no starvation', async () => {
    const adapter = printerService.createVirtualTestSpoolerAdapter();
    printerService.setSpoolerAdapter(adapter);

    const prevAllow = process.env.KAMI_ALLOW_TEST_AUTOPRINT;
    const prevAutoPay = process.env.AUTO_PRINT_ON_PAYMENT;
    const prevAutoWatch = process.env.AUTO_PRINT_ENABLED;

    process.env.KAMI_ALLOW_TEST_AUTOPRINT = 'true';
    process.env.AUTO_PRINT_ON_PAYMENT = 'true';
    process.env.AUTO_PRINT_ENABLED = 'true';

    const cleanupPaths = [];
    try {
        // 1. Payment webhook auto-dispatches immediately once
        const paidOrder = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'single' });
        cleanupPaths.push(paidOrder.filePath);

        // Wait briefly for unawaited printOrder in paymentWebhook to settle
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline && adapter.submittedJobs.length < 2) {
            await new Promise((r) => setTimeout(r, 50));
        }

        assert.equal(adapter.submittedJobs.length, 2, 'Auto-print on payment must dispatch strictly once (Info Sheet + Document)');
        assert.equal(adapter.submittedJobs[1].dmCopies, 1);
        assert.equal(adapter.submittedJobs[1].dmDuplex, 1);

        const freshOrder = await Order.findById(paidOrder.order._id);
        assert.equal(freshOrder.status, 'PRINTING');
        const freshPj = await PrintJob.findById(paidOrder.printJob._id);
        assert.equal(freshPj.executionState, 'PRINTED_PENDING_QC');
        assert.equal(freshPj.submissionCount, 1);

        // 2. Starting background auto-print watcher must NOT re-print the already submitted job
        // AND must pick up a missed PAID order without starvation
        process.env.AUTO_PRINT_ON_PAYMENT = 'false';
        const missedOrder = await setupShopAndOrder({ pageCount: 2, copies: 1, sides: 'single' });
        cleanupPaths.push(missedOrder.filePath);
        assert.equal(adapter.submittedJobs.length, 2, 'No auto-dispatch on payment when AUTO_PRINT_ON_PAYMENT=false');

        printerService.startAutoPrintWatcher(100);
        const deadline2 = Date.now() + 5000;
        while (Date.now() < deadline2 && adapter.submittedJobs.length < 4) {
            await new Promise((r) => setTimeout(r, 50));
        }
        assert.equal(adapter.submittedJobs.length, 4, 'Watcher must print missed READY_FOR_AGENT order once without duplicating order #1');
    } finally {
        printerService.stopAutoPrintWatcher();
        if (prevAllow === undefined) delete process.env.KAMI_ALLOW_TEST_AUTOPRINT; else process.env.KAMI_ALLOW_TEST_AUTOPRINT = prevAllow;
        if (prevAutoPay === undefined) delete process.env.AUTO_PRINT_ON_PAYMENT; else process.env.AUTO_PRINT_ON_PAYMENT = prevAutoPay;
        if (prevAutoWatch === undefined) delete process.env.AUTO_PRINT_ENABLED; else process.env.AUTO_PRINT_ENABLED = prevAutoWatch;
        for (const p of cleanupPaths) fs.rmSync(p, { force: true });
    }
});
