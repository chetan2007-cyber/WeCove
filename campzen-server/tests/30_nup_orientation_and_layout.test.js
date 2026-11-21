const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const {
    PAPER_DIMENSIONS,
    buildPrintReadyPdf,
    calculateExpectedOutput,
    resolveColorOutputIndices
} = require('../src/services/printDocumentBuilder.service');

const TMP_DIR = path.join(__dirname, 'tmp-nup-tests');

// Helper to create a multi-page dummy test PDF
async function createDummyPdf(pageCount = 4) {
    const pdfDoc = await PDFDocument.create();
    for (let i = 1; i <= pageCount; i++) {
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
        page.drawText(`Original Document Page ${i}`, { x: 50, y: 800, size: 24 });
    }
    const pdfBytes = await pdfDoc.save();
    const filePath = path.join(TMP_DIR, `dummy_${pageCount}pg_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.writeFileSync(filePath, pdfBytes);
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

test('N-UP 01: 1-Up (Standard) - One original document page per printed side', async () => {
    const srcPdf = await createDummyPdf(2);
    const outPdf = path.join(TMP_DIR, `out_1up_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pagesPerSheet: 1,
            orientation: 'portrait',
            copies: 1,
            sides: 'single'
        },
        outputPath: outPdf
    });

    assert.equal(result.finalPrintReadyPageCount, 2);
    assert.equal(result.sheetOrientation, 'portrait');
    assert.equal(result.nUpOrientation, 'none');

    const generatedBytes = fs.readFileSync(outPdf);
    const loadedDoc = await PDFDocument.load(generatedBytes);
    assert.equal(loadedDoc.getPageCount(), 2);

    const firstPageSize = loadedDoc.getPage(0).getSize();
    assert.ok(Math.abs(firstPageSize.width - PAPER_DIMENSIONS.A4.width) < 1.0);
    assert.ok(Math.abs(firstPageSize.height - PAPER_DIMENSIONS.A4.height) < 1.0);
});

test('N-UP 02: 2-Up Horizontal - Two pages side-by-side on Landscape output sheet (1 row × 2 cols)', async () => {
    const srcPdf = await createDummyPdf(2);
    const outPdf = path.join(TMP_DIR, `out_2up_h_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pagesPerSheet: 2,
            nUpOrientation: 'horizontal',
            copies: 1,
            sides: 'single'
        },
        outputPath: outPdf
    });

    // 2 pages on 2-Up = 1 output sheet
    assert.equal(result.finalPrintReadyPageCount, 1);
    assert.equal(result.sheetOrientation, 'landscape');
    assert.equal(result.nUpOrientation, 'horizontal');

    const generatedBytes = fs.readFileSync(outPdf);
    const loadedDoc = await PDFDocument.load(generatedBytes);
    assert.equal(loadedDoc.getPageCount(), 1);

    const sheetSize = loadedDoc.getPage(0).getSize();
    // Landscape A4: width is height of A4, height is width of A4
    assert.ok(Math.abs(sheetSize.width - PAPER_DIMENSIONS.A4.height) < 1.0, `Width expected ~841.89, got ${sheetSize.width}`);
    assert.ok(Math.abs(sheetSize.height - PAPER_DIMENSIONS.A4.width) < 1.0, `Height expected ~595.28, got ${sheetSize.height}`);
});

test('N-UP 03: 2-Up Vertical - Two pages stacked on Portrait output sheet (2 rows × 1 col)', async () => {
    const srcPdf = await createDummyPdf(2);
    const outPdf = path.join(TMP_DIR, `out_2up_v_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pagesPerSheet: 2,
            nUpOrientation: 'vertical',
            copies: 1,
            sides: 'single'
        },
        outputPath: outPdf
    });

    // 2 pages on 2-Up = 1 output sheet
    assert.equal(result.finalPrintReadyPageCount, 1);
    assert.equal(result.sheetOrientation, 'portrait');
    assert.equal(result.nUpOrientation, 'vertical');

    const generatedBytes = fs.readFileSync(outPdf);
    const loadedDoc = await PDFDocument.load(generatedBytes);
    assert.equal(loadedDoc.getPageCount(), 1);

    const sheetSize = loadedDoc.getPage(0).getSize();
    // Portrait A4: width 595.28, height 841.89
    assert.ok(Math.abs(sheetSize.width - PAPER_DIMENSIONS.A4.width) < 1.0, `Width expected ~595.28, got ${sheetSize.width}`);
    assert.ok(Math.abs(sheetSize.height - PAPER_DIMENSIONS.A4.height) < 1.0, `Height expected ~841.89, got ${sheetSize.height}`);
});

test('N-UP 04: 4-Up Horizontal - Four pages in 2×2 grid on Landscape output sheet', async () => {
    const srcPdf = await createDummyPdf(4);
    const outPdf = path.join(TMP_DIR, `out_4up_h_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pagesPerSheet: 4,
            nUpOrientation: 'horizontal',
            copies: 1,
            sides: 'single'
        },
        outputPath: outPdf
    });

    // 4 pages on 4-Up = 1 output sheet
    assert.equal(result.finalPrintReadyPageCount, 1);
    assert.equal(result.sheetOrientation, 'landscape');
    assert.equal(result.nUpOrientation, 'horizontal');

    const generatedBytes = fs.readFileSync(outPdf);
    const loadedDoc = await PDFDocument.load(generatedBytes);
    assert.equal(loadedDoc.getPageCount(), 1);

    const sheetSize = loadedDoc.getPage(0).getSize();
    assert.ok(Math.abs(sheetSize.width - PAPER_DIMENSIONS.A4.height) < 1.0);
    assert.ok(Math.abs(sheetSize.height - PAPER_DIMENSIONS.A4.width) < 1.0);
});

test('N-UP 05: 4-Up Vertical - Four pages in 2×2 grid on Portrait output sheet', async () => {
    const srcPdf = await createDummyPdf(4);
    const outPdf = path.join(TMP_DIR, `out_4up_v_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pagesPerSheet: 4,
            nUpOrientation: 'vertical',
            copies: 1,
            sides: 'single'
        },
        outputPath: outPdf
    });

    // 4 pages on 4-Up = 1 output sheet
    assert.equal(result.finalPrintReadyPageCount, 1);
    assert.equal(result.sheetOrientation, 'portrait');
    assert.equal(result.nUpOrientation, 'vertical');

    const generatedBytes = fs.readFileSync(outPdf);
    const loadedDoc = await PDFDocument.load(generatedBytes);
    assert.equal(loadedDoc.getPageCount(), 1);

    const sheetSize = loadedDoc.getPage(0).getSize();
    assert.ok(Math.abs(sheetSize.width - PAPER_DIMENSIONS.A4.width) < 1.0);
    assert.ok(Math.abs(sheetSize.height - PAPER_DIMENSIONS.A4.height) < 1.0);
});

test('N-UP 06: Odd page count - 3 pages on 2-Up Horizontal yields 2 sheets with blank slot 4', async () => {
    const srcPdf = await createDummyPdf(3);
    const outPdf = path.join(TMP_DIR, `out_2up_odd_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pagesPerSheet: 2,
            nUpOrientation: 'horizontal',
            copies: 1,
            sides: 'single'
        },
        outputPath: outPdf
    });

    // 3 pages on 2-Up = ceil(3/2) = 2 output sheets
    assert.equal(result.finalPrintReadyPageCount, 2);
    const loadedDoc = await PDFDocument.load(fs.readFileSync(outPdf));
    assert.equal(loadedDoc.getPageCount(), 2);
});

test('N-UP 07: Custom Page Range - Only selected pages imposed (e.g. pages 2-4 of 5-page doc)', async () => {
    const srcPdf = await createDummyPdf(5);
    const outPdf = path.join(TMP_DIR, `out_custom_range_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pageRange: '2-4',
            pagesPerSheet: 2,
            nUpOrientation: 'vertical',
            copies: 1,
            sides: 'single'
        },
        outputPath: outPdf
    });

    // Range '2-4' = 3 pages -> ceil(3/2) = 2 output sheets
    assert.equal(result.originalPageCount, 5);
    assert.deepEqual(result.selectedPages, [2, 3, 4]);
    assert.equal(result.finalPrintReadyPageCount, 2);
});

test('N-UP 08: Colour ranges - Output sheet color indices properly mapped for N-Up', () => {
    // 6 original pages: pages 3 and 4 have color.
    // 2-Up printing -> sheet 1 has orig pgs 1, 2 (B&W).
    //                  sheet 2 has orig pgs 3, 4 (COLOR).
    //                  sheet 3 has orig pgs 5, 6 (B&W).
    const colorIndices = resolveColorOutputIndices({
        colorMode: 'Mixed',
        colorSelectionType: 'custom',
        colorPages: '3-4',
        selectedOriginalPages: [1, 2, 3, 4, 5, 6],
        pagesPerSheet: 2
    });

    assert.deepEqual(colorIndices, [2]);
});

test('N-UP 09: Duplex + N-Up Math - Correct physical sheets and impressions calculated', () => {
    // 8 original pages, 2-Up printing = 4 print-ready pages per copy.
    // Duplex printing: 4 pages / 2 = 2 physical sheets per copy.
    // 3 copies: 4 * 3 = 12 impressions, 2 * 3 = 6 physical sheets.
    const output = calculateExpectedOutput({
        finalPrintReadyPageCount: 4,
        copies: 3,
        sides: 'double'
    });

    assert.equal(output.copies, 3);
    assert.equal(output.sides, 'double');
    assert.equal(output.pagesPerCopy, 4);
    assert.equal(output.sheetsPerCopy, 2);
    assert.equal(output.expectedImpressions, 12);
    assert.equal(output.expectedSheets, 6);
});

test('N-UP 10: Multiple copies - Copies applied exactly once via driver without inflating PDF', async () => {
    const srcPdf = await createDummyPdf(4);
    const outPdf = path.join(TMP_DIR, `out_copies_${Date.now()}.pdf`);

    const result = await buildPrintReadyPdf({
        sourcePath: srcPdf,
        printJob: {
            pagesPerSheet: 4,
            nUpOrientation: 'horizontal',
            copies: 5, // 5 copies
            sides: 'single'
        },
        outputPath: outPdf
    });

    // Print-ready PDF is strictly 1 copy (1 page for 4-up of 4 pages)
    assert.equal(result.finalPrintReadyPageCount, 1);
    assert.equal(result.expectedImpressions, 5); // 1 pg * 5 copies = 5 impressions
    assert.equal(result.expectedSheets, 5);      // 1 sheet * 5 copies = 5 sheets

    const loadedDoc = await PDFDocument.load(fs.readFileSync(outPdf));
    assert.equal(loadedDoc.getPageCount(), 1); // Not multiplied inside PDF!
});
