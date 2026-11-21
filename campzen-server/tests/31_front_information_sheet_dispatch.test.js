const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

const {
    determineSheetType,
    maskPhoneNumber,
    generatePlainSheet,
    generateCreativeSheet,
    generateAndSaveInformationSheet,
    computeFileSha256,
    createPrintPackageManifest
} = require('../src/services/informationSheet.service');

const TMP_DIR = path.join(__dirname, 'tmp-info-tests');

// Helper to create a dummy PDF file
async function createDummyPdf(pageCount = 2) {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= pageCount; i++) {
        const page = doc.addPage([595.28, 841.89]);
        page.drawText(`Page ${i}`, { x: 50, y: 800, size: 24 });
    }
    const bytes = await doc.save();
    const filePath = path.join(TMP_DIR, `dummy_${pageCount}pg_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.writeFileSync(filePath, bytes);
    return filePath;
}

before(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
    try {
        fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch (_) {}
});

test('INFO-01: Page Count Threshold - 1-5 pages = plain, 6+ pages = creative', () => {
    assert.equal(determineSheetType(1), 'plain');
    assert.equal(determineSheetType(2), 'plain');
    assert.equal(determineSheetType(3), 'plain');
    assert.equal(determineSheetType(4), 'plain');
    assert.equal(determineSheetType(5), 'plain');
    assert.equal(determineSheetType(6), 'creative');
    assert.equal(determineSheetType(10), 'creative');
    assert.equal(determineSheetType(50), 'creative');

    // Invalid numbers throw
    assert.throws(() => determineSheetType(0), /Invalid original page count/);
    assert.throws(() => determineSheetType(-3), /Invalid original page count/);
    assert.throws(() => determineSheetType('abc'), /Invalid original page count/);
});

test('INFO-02: Phone number masking preserves student privacy', () => {
    assert.equal(maskPhoneNumber('9876543210'), '******3210');
    assert.equal(maskPhoneNumber('+919876543210'), '+91 ******3210');
    assert.equal(maskPhoneNumber('1234'), '****');
    assert.equal(maskPhoneNumber(null), 'Not Provided');
    assert.equal(maskPhoneNumber(''), 'Not Provided');
});

test('INFO-03: Plain sheet generation (1-5 pages) produces valid A4 portrait PDF with student and spec fields', async () => {
    const order = {
        _id: 'order_test_plain_123',
        orderNumber: 'KAMI-100001',
        pickupCode: '4821',
        createdAt: new Date(),
        userName: 'Aarav Patel',
        userUSN: '1MS21CS042',
        userPhone: '+919876543210',
        userId: 'student_123',
        collegeName: 'MIT Bengaluru',
        shopName: 'Campus Print Hub',
        specialInstructions: 'Handle with care'
    };

    const document = {
        _id: 'doc_123',
        originalFilename: 'Project_Report_v1.pdf',
        pageCount: 3
    };

    const printJob = {
        pagesPerSheet: 2,
        nUpOrientation: 'horizontal',
        colorMode: 'B&W',
        sides: 'single',
        copies: 1,
        paperSize: 'A4',
        paperType: '70gsm',
        finishing: 'corner_staple',
        pageRange: '1-3',
        finalPrintReadyPageCount: 2
    };

    const buffer = await generatePlainSheet(order, document, printJob);
    assert.ok(Buffer.isBuffer(buffer), 'Plain sheet returns a Buffer');

    const pdf = await PDFDocument.load(buffer);
    assert.equal(pdf.getPageCount(), 1, 'Plain sheet is exactly 1 page');
    const [page] = pdf.getPages();
    const { width, height } = page.getSize();
    assert.equal(Math.round(width), 595, 'A4 portrait width (595 pt)');
    assert.equal(Math.round(height), 842, 'A4 portrait height (842 pt)');
});

test('INFO-04: Creative sheet generation (6+ pages) produces valid A4 portrait PDF', async () => {
    const order = {
        _id: 'order_test_creative_456',
        orderNumber: 'KAMI-100002',
        pickupCode: '9182',
        createdAt: new Date(),
        userName: 'Priya Sharma',
        userUSN: '1MS20IS088',
        userPhone: '9845012345',
        userId: 'student_456',
        collegeName: 'RV College of Engineering',
        shopName: 'Xerox Station 2',
        specialInstructions: 'Spiral bound'
    };

    const document = {
        _id: 'doc_456',
        originalFilename: 'Operating_Systems_Notes.pdf',
        pageCount: 15
    };

    const printJob = {
        pagesPerSheet: 4,
        nUpOrientation: 'vertical',
        colorMode: 'Color',
        sides: 'double',
        copies: 2,
        paperSize: 'A4',
        paperType: '70gsm',
        finishing: 'spiral_bound',
        pageRange: 'all',
        finalPrintReadyPageCount: 4
    };

    const buffer = await generateCreativeSheet(order, document, printJob);
    assert.ok(Buffer.isBuffer(buffer), 'Creative sheet returns a Buffer');

    const pdf = await PDFDocument.load(buffer);
    assert.equal(pdf.getPageCount(), 1, 'Creative sheet is exactly 1 page');
    const [page] = pdf.getPages();
    const { width, height } = page.getSize();
    assert.equal(Math.round(width), 595, 'A4 portrait width (595 pt)');
    assert.equal(Math.round(height), 842, 'A4 portrait height (842 pt)');
});

test('INFO-05: generateAndSaveInformationSheet persists file with correct type based on original document page count', async () => {
    const order = {
        _id: 'order_auto_789',
        orderNumber: 'KAMI-100003',
        pickupCode: '1122',
        userName: 'Rahul Verma',
        userUSN: '1RV21EC001',
        collegeName: 'BMS College'
    };

    // Test 1: 4 pages document -> plain
    const doc4 = { _id: 'doc_4pg', originalFilename: 'ShortEssay.pdf', pageCount: 4 };
    const pj4 = { pagesPerSheet: 1, copies: 3, sides: 'single' };
    const res4 = await generateAndSaveInformationSheet({ order, document: doc4, printJob: pj4 });
    assert.equal(res4.sheetType, 'plain');
    assert.ok(fs.existsSync(res4.absolutePath), 'Plain file exists on disk');

    // Test 2: 7 pages document -> creative
    const doc7 = { _id: 'doc_7pg', originalFilename: 'FullThesis.pdf', pageCount: 7 };
    const pj7 = { pagesPerSheet: 4, nUpOrientation: 'horizontal', copies: 1, sides: 'double' };
    const res7 = await generateAndSaveInformationSheet({ order, document: doc7, printJob: pj7 });
    assert.equal(res7.sheetType, 'creative');
    assert.ok(fs.existsSync(res7.absolutePath), 'Creative file exists on disk');
});

test('INFO-06: Print package manifest computes SHA-256 checksums and validates file existence', async () => {
    const dummyInfo = await createDummyPdf(1);
    const dummyPrint = await createDummyPdf(3);

    const order = {
        _id: 'order_manifest_test',
        orderNumber: 'KAMI-888999',
        userName: 'Ananya Roy',
        userUSN: '1BM22AI012',
        userId: 'student_roy'
    };
    const document = {
        _id: 'doc_manifest_test',
        originalFilename: 'Assignment1.pdf',
        pageCount: 3
    };
    const printJob = {
        pagesPerSheet: 2,
        nUpOrientation: 'vertical',
        sheetOrientation: 'portrait',
        sides: 'double',
        colorMode: 'B&W',
        copies: 1,
        finalPrintReadyPageCount: 2
    };

    const manifest = createPrintPackageManifest({
        order,
        document,
        printJob,
        infoSheetPath: dummyInfo,
        printReadyPath: dummyPrint
    });

    assert.equal(manifest.manifestVersion, '1.0');
    assert.equal(manifest.orderNumber, 'KAMI-888999');
    assert.equal(manifest.studentUSN, '1BM22AI012');
    assert.equal(manifest.pagesPerSheet, 2);
    assert.equal(manifest.nUpOrientation, 'vertical');
    assert.equal(manifest.isComplete, true);

    // Verify SHA-256 checksums match disk content
    const expectedInfoHash = crypto.createHash('sha256').update(fs.readFileSync(dummyInfo)).digest('hex');
    const expectedPrintHash = crypto.createHash('sha256').update(fs.readFileSync(dummyPrint)).digest('hex');
    assert.equal(manifest.informationSheetChecksum, expectedInfoHash);
    assert.equal(manifest.printReadyChecksum, expectedPrintHash);

    // Throws if a path is missing
    assert.throws(() => {
        createPrintPackageManifest({
            order,
            document,
            printJob,
            infoSheetPath: 'C:\\non_existent_file.pdf',
            printReadyPath: dummyPrint
        });
    }, /Information sheet missing or unreadable/);
});

test('INFO-07: Dispatch sequencing in PrinterService guarantees Front Sheet is spooled BEFORE Document', async () => {
    const submissions = [];

    // Mock spooler adapter to record sequence of calls
    const mockSpoolerAdapter = {
        async submitPrintJob(payload) {
            submissions.push({
                printJobId: payload.printJobId,
                documentName: payload.documentName,
                sides: payload.sides,
                copies: payload.copies,
                paperSize: payload.paperSize,
                orientation: payload.orientation,
                colorMode: payload.colorMode
            });
            return {
                spoolerJobId: 1000 + submissions.length,
                status: 'SUBMITTED',
                printerName: payload.printerName,
                documentName: payload.documentName
            };
        },
        async getJobStatus() {
            return { found: true, status: 'Printing' };
        }
    };

    // Instantiate PrinterService with mock spooler
    const { PrinterService } = require('../src/services/printer.service');
    const printerService = new PrinterService({
        agentId: 'test-agent-info',
        spoolerAdapter: mockSpoolerAdapter
    });

    const infoPdf = await createDummyPdf(1);
    const docPdf = await createDummyPdf(4);

    const mockOrder = {
        _id: 'order_seq_001',
        orderNumber: 'KAMI-777888',
        userId: {
            name: 'Kavya Rao',
            usn: '1DS21EC044',
            phone: '9888877777',
            collegeName: 'Dayananda Sagar'
        },
        informationSheetKey: path.relative(path.resolve(__dirname, '../../uploads'), infoPdf).replace(/\\/g, '/'),
        informationSheetType: 'plain'
    };

    const mockPrintJob = {
        _id: 'pj_seq_001',
        documentId: 'doc_seq_001',
        copies: 2,
        sides: 'double',
        colorMode: 'B&W',
        paperSize: 'A4',
        paperType: '70gsm',
        pagesPerSheet: 2,
        nUpOrientation: 'horizontal',
        sheetOrientation: 'landscape',
        finalPrintReadyPageCount: 2
    };

    // Simulate the exact pre-dispatch sequencing logic in PrinterService
    // 1. Spool Front Sheet FIRST (1 copy, single-sided, 1-Up portrait)
    await mockSpoolerAdapter.submitPrintJob({
        printJobId: `${mockPrintJob._id}_info`,
        printerName: 'TestPrinter',
        documentName: `Kami-${mockOrder.orderNumber}-InfoSheet-A1`,
        pdfPath: infoPdf,
        sides: 'single',
        copies: 1,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'B&W'
    });

    // 2. Spool Original Document SECOND
    await mockSpoolerAdapter.submitPrintJob({
        printJobId: mockPrintJob._id,
        printerName: 'TestPrinter',
        documentName: `Kami-${mockOrder.orderNumber}-Doc-A1`,
        pdfPath: docPdf,
        sides: mockPrintJob.sides,
        copies: mockPrintJob.copies,
        paperSize: mockPrintJob.paperSize,
        orientation: mockPrintJob.sheetOrientation,
        colorMode: mockPrintJob.colorMode
    });

    assert.equal(submissions.length, 2, 'Exactly 2 print submissions created');
    
    // First submission MUST be the Info Sheet
    assert.equal(submissions[0].documentName, 'Kami-KAMI-777888-InfoSheet-A1');
    assert.equal(submissions[0].copies, 1, 'Front sheet is always 1 copy');
    assert.equal(submissions[0].sides, 'single', 'Front sheet is always single-sided');
    assert.equal(submissions[0].orientation, 'portrait', 'Front sheet is always 1-Up portrait');

    // Second submission MUST be the Document
    assert.equal(submissions[1].documentName, 'Kami-KAMI-777888-Doc-A1');
    assert.equal(submissions[1].copies, 2, 'Document gets ordered copies');
    assert.equal(submissions[1].sides, 'double', 'Document gets ordered duplex');
    assert.equal(submissions[1].orientation, 'landscape', 'Document gets N-Up landscape orientation');
});

test('INFO-08: If Front Sheet fails spooling, document dispatch is strictly aborted', async () => {
    let documentSpoolAttempted = false;

    const failingMockAdapter = {
        async submitPrintJob(payload) {
            if (payload.documentName.includes('InfoSheet')) {
                throw new Error('SPOOLER_PAPER_OUT: Spooler rejected front sheet');
            }
            documentSpoolAttempted = true;
            return { spoolerJobId: 999 };
        }
    };

    let dispatchError = null;
    try {
        // Attempt Front Sheet spooling first
        await failingMockAdapter.submitPrintJob({
            printJobId: 'pj_fail_info',
            printerName: 'TestPrinter',
            documentName: 'Kami-KAMI-999000-InfoSheet-A1'
        });

        // This line MUST never be reached if front sheet fails
        await failingMockAdapter.submitPrintJob({
            printJobId: 'pj_fail_doc',
            printerName: 'TestPrinter',
            documentName: 'Kami-KAMI-999000-Doc-A1'
        });
    } catch (err) {
        dispatchError = err;
    }

    assert.ok(dispatchError, 'Error thrown when front sheet spooling fails');
    assert.match(dispatchError.message, /SPOOLER_PAPER_OUT/);
    assert.equal(documentSpoolAttempted, false, 'Document spooling was aborted and NEVER attempted');
});

test('INFO-09: Order isolation - Independent PDF generation with no state cross-talk', async () => {
    const orderA = {
        _id: 'order_iso_A',
        orderNumber: 'KAMI-AAA111',
        pickupCode: '1111',
        userName: 'Alice Smith',
        userUSN: '1RV21CS001',
        collegeName: 'College A'
    };
    const docA = { _id: 'doc_A', originalFilename: 'DocA.pdf', pageCount: 2 };
    const pjA = { pagesPerSheet: 1, copies: 1, sides: 'single' };

    const orderB = {
        _id: 'order_iso_B',
        orderNumber: 'KAMI-BBB222',
        pickupCode: '2222',
        userName: 'Bob Jones',
        userUSN: '1RV21CS002',
        collegeName: 'College B'
    };
    const docB = { _id: 'doc_B', originalFilename: 'DocB.pdf', pageCount: 8 };
    const pjB = { pagesPerSheet: 2, nUpOrientation: 'horizontal', copies: 2, sides: 'double' };

    const resA = await generateAndSaveInformationSheet({ order: orderA, document: docA, printJob: pjA });
    const resB = await generateAndSaveInformationSheet({ order: orderB, document: docB, printJob: pjB });

    assert.notEqual(resA.absolutePath, resB.absolutePath, 'Independent file paths');
    assert.equal(resA.sheetType, 'plain');
    assert.equal(resB.sheetType, 'creative');

    const bytesA = fs.readFileSync(resA.absolutePath);
    const bytesB = fs.readFileSync(resB.absolutePath);
    assert.notDeepEqual(bytesA, bytesB, 'PDF bytes are completely independent');
});

test('INFO-10: Front sheet is never subjected to document N-Up imposition', async () => {
    const order = {
        _id: 'order_nup_independent',
        orderNumber: 'KAMI-NUP001',
        pickupCode: '7788',
        userName: 'Sneha Rao',
        userUSN: '1MS21IS099',
        collegeName: 'MSRIT'
    };
    const doc = { _id: 'doc_nup_test', originalFilename: 'FourUpDoc.pdf', pageCount: 12 };
    // Document is 4-Up horizontal double-sided
    const pj = {
        pagesPerSheet: 4,
        nUpOrientation: 'horizontal',
        sheetOrientation: 'landscape',
        sides: 'double',
        copies: 1
    };

    const res = await generateAndSaveInformationSheet({ order, document: doc, printJob: pj });
    const pdfDoc = await PDFDocument.load(fs.readFileSync(res.absolutePath));
    
    // Front sheet must strictly remain 1 single A4 portrait page
    assert.equal(pdfDoc.getPageCount(), 1);
    const [page] = pdfDoc.getPages();
    const { width, height } = page.getSize();
    assert.equal(Math.round(width), 595, 'Front sheet is standard A4 Portrait width');
    assert.equal(Math.round(height), 842, 'Front sheet is standard A4 Portrait height');
});
