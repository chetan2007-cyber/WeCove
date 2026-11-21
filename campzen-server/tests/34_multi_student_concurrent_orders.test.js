const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const {
    determineSheetType,
    generateAndSaveInformationSheet,
    createPrintPackageManifest
} = require('../src/services/informationSheet.service');

const {
    buildPrintReadyPdf,
    calculateExpectedOutput
} = require('../src/services/printDocumentBuilder.service');

const TMP_DIR = path.join(__dirname, 'tmp-concurrent-tests');

// Helper to generate a PDF of arbitrary page count
async function createTestPdf(pageCount, label = 'Doc') {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= pageCount; i++) {
        const page = doc.addPage([595.28, 841.89]);
        page.drawText(`${label} - Page ${i} of ${pageCount}`, { x: 50, y: 780, size: 20 });
    }
    const bytes = await doc.save();
    const filePath = path.join(TMP_DIR, `${label}_${pageCount}pg_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
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

test('CONC-01: 3 simultaneous student orders with mixed N-Up settings generate isolated PDFs and manifests', async () => {
    const studentOrders = [
        {
            student: { name: 'Student 1', usn: '1MS21CS001', phone: '9876500001', collegeName: 'College A' },
            pages: 2, // Plain sheet expected
            copies: 1,
            pagesPerSheet: 1,
            nUpOrientation: 'none',
            sides: 'single'
        },
        {
            student: { name: 'Student 2', usn: '1MS21CS002', phone: '9876500002', collegeName: 'College B' },
            pages: 4, // Plain sheet expected
            copies: 2,
            pagesPerSheet: 2,
            nUpOrientation: 'horizontal',
            sides: 'double'
        },
        {
            student: { name: 'Student 3', usn: '1MS21CS003', phone: '9876500003', collegeName: 'College C' },
            pages: 8, // Creative sheet expected
            copies: 1,
            pagesPerSheet: 4,
            nUpOrientation: 'vertical',
            sides: 'single'
        }
    ];

    // Concurrently process all 3 orders
    const results = await Promise.all(studentOrders.map(async (so, index) => {
        const orderId = `order_conc3_${index + 1}`;
        const orderNumber = `KAMI-30000${index + 1}`;
        const srcPath = await createTestPdf(so.pages, `Student_${index + 1}`);

        // 1. Build Print-Ready PDF
        const outDocPath = path.join(TMP_DIR, `ready_${orderId}.pdf`);
        const built = await buildPrintReadyPdf({
            sourcePath: srcPath,
            printJob: {
                pagesPerSheet: so.pagesPerSheet,
                nUpOrientation: so.nUpOrientation,
                orientation: 'portrait',
                copies: so.copies,
                sides: so.sides
            },
            outputPath: outDocPath
        });

        // 2. Build Information Sheet
        const infoRes = await generateAndSaveInformationSheet({
            order: {
                _id: orderId,
                orderNumber,
                userName: so.student.name,
                userUSN: so.student.usn,
                userPhone: so.student.phone,
                collegeName: so.student.collegeName,
                pickupCode: `400${index + 1}`
            },
            document: {
                _id: `doc_${orderId}`,
                originalFilename: `student_doc_${index + 1}.pdf`,
                pageCount: so.pages
            },
            printJob: {
                pagesPerSheet: so.pagesPerSheet,
                nUpOrientation: so.nUpOrientation,
                sheetOrientation: built.sheetOrientation,
                sides: so.sides,
                copies: so.copies,
                colorMode: 'B&W',
                finalPrintReadyPageCount: built.finalPrintReadyPageCount
            }
        });

        // 3. Create Manifest
        const manifest = createPrintPackageManifest({
            order: {
                _id: orderId,
                orderNumber,
                userName: so.student.name,
                userUSN: so.student.usn
            },
            document: {
                _id: `doc_${orderId}`,
                originalFilename: `student_doc_${index + 1}.pdf`,
                pageCount: so.pages
            },
            printJob: {
                pagesPerSheet: so.pagesPerSheet,
                nUpOrientation: so.nUpOrientation,
                sheetOrientation: built.sheetOrientation,
                sides: so.sides,
                copies: so.copies,
                colorMode: 'B&W',
                finalPrintReadyPageCount: built.finalPrintReadyPageCount
            },
            infoSheetPath: infoRes.absolutePath,
            printReadyPath: outDocPath
        });

        return { orderId, orderNumber, so, built, infoRes, manifest, outDocPath };
    }));

    // Verify each order is isolated
    assert.equal(results.length, 3);

    // Verify order 1: 2 pages -> plain sheet, 1-Up
    assert.equal(results[0].infoRes.sheetType, 'plain');
    assert.equal(results[0].built.finalPrintReadyPageCount, 2);
    assert.equal(results[0].manifest.informationSheetType, 'plain');

    // Verify order 2: 4 pages -> plain sheet, 2-Up horizontal -> landscape
    assert.equal(results[1].infoRes.sheetType, 'plain');
    assert.equal(results[1].built.finalPrintReadyPageCount, 2);
    assert.equal(results[1].built.sheetOrientation, 'landscape');
    assert.equal(results[1].manifest.informationSheetType, 'plain');

    // Verify order 3: 8 pages -> creative sheet, 4-Up vertical -> portrait
    assert.equal(results[2].infoRes.sheetType, 'creative');
    assert.equal(results[2].built.finalPrintReadyPageCount, 2);
    assert.equal(results[2].built.sheetOrientation, 'portrait');
    assert.equal(results[2].manifest.informationSheetType, 'creative');

    // Verify all file paths and hashes are strictly unique
    const filePaths = results.map(r => r.infoRes.absolutePath);
    const uniquePaths = new Set(filePaths);
    assert.equal(uniquePaths.size, 3, 'All 3 information sheet paths are distinct');

    const hashes = results.map(r => r.manifest.informationSheetChecksum);
    const uniqueHashes = new Set(hashes);
    assert.equal(uniqueHashes.size, 3, 'All 3 information sheet checksums are distinct');
});

test('CONC-02: 10 concurrent student submissions maintain complete isolation and zero cross-bleed', async () => {
    const orders = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent_order_${i + 1}`,
        studentName: `Student ${i + 1}`,
        usn: `1MS22CS${String(i + 1).padStart(3, '0')}`,
        pageCount: (i % 2 === 0) ? 3 : 7, // Alternating 3 pages (plain) and 7 pages (creative)
        pagesPerSheet: (i % 3 === 0) ? 4 : (i % 2 === 0 ? 2 : 1),
        orientation: (i % 2 === 0) ? 'horizontal' : 'vertical'
    }));

    const results = await Promise.all(orders.map(async (o) => {
        const srcPath = await createTestPdf(o.pageCount, `Batch10_${o.id}`);
        const outPath = path.join(TMP_DIR, `batch10_ready_${o.id}.pdf`);

        const built = await buildPrintReadyPdf({
            sourcePath: srcPath,
            printJob: {
                pagesPerSheet: o.pagesPerSheet,
                nUpOrientation: o.orientation,
                orientation: 'portrait',
                copies: 1,
                sides: 'single'
            },
            outputPath: outPath
        });

        const info = await generateAndSaveInformationSheet({
            order: {
                _id: o.id,
                orderNumber: `KAMI-${o.id}`,
                userName: o.studentName,
                userUSN: o.usn,
                collegeName: 'VTU Bengaluru',
                pickupCode: `${1000 + orders.indexOf(o)}`
            },
            document: {
                _id: `doc_${o.id}`,
                originalFilename: `${o.id}.pdf`,
                pageCount: o.pageCount
            },
            printJob: {
                pagesPerSheet: o.pagesPerSheet,
                nUpOrientation: o.orientation,
                sheetOrientation: built.sheetOrientation,
                sides: 'single',
                copies: 1,
                colorMode: 'B&W',
                finalPrintReadyPageCount: built.finalPrintReadyPageCount
            }
        });

        return { order: o, built, info };
    }));

    assert.equal(results.length, 10);
    results.forEach(({ order, info }) => {
        const expectedType = order.pageCount <= 5 ? 'plain' : 'creative';
        assert.equal(info.sheetType, expectedType, `Order with ${order.pageCount} pages got correct sheet type`);
        assert.ok(fs.existsSync(info.absolutePath), 'Info sheet file exists');
    });
});
