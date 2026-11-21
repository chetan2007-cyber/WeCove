const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PDFDocument, degrees } = require('pdf-lib');

const PAPER_DIMENSIONS = {
    A4: { width: 595.28, height: 841.89 },
    A3: { width: 841.89, height: 1190.55 },
    Legal: { width: 612.0, height: 1008.0 },
    Letter: { width: 612.0, height: 792.0 }
};

/**
 * Parse a page range specification ('all' or '1, 3-5') into an ordered list of 1-based page numbers.
 * Never duplicates pages across copies.
 */
function parsePageRangeList(pageRange, totalPages) {
    if (!totalPages || totalPages < 1) {
        throw new Error(`Invalid total page count: ${totalPages}`);
    }

    const raw = (pageRange || 'all').toString().trim();
    if (!raw || raw.toLowerCase() === 'all') {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const seen = new Set();
    const segments = raw.split(',');

    for (const seg of segments) {
        const trimmed = seg.trim();
        if (!trimmed) continue;

        if (trimmed.includes('-')) {
            const parts = trimmed.split('-').map((s) => Number(s.trim()));
            if (parts.length !== 2 || !Number.isInteger(parts[0]) || !Number.isInteger(parts[1])) {
                throw new Error(`Invalid page range segment: "${trimmed}"`);
            }
            const [start, end] = parts;
            if (start < 1 || start > end) {
                throw new Error(`Invalid logical range "${trimmed}": start must be >= 1 and <= end`);
            }
            if (end > totalPages) {
                throw new Error(`Page range "${trimmed}" exceeds document page count (${totalPages})`);
            }
            for (let p = start; p <= end; p++) {
                if (!seen.has(p)) {
                    seen.add(p);
                    pages.push(p);
                }
            }
        } else {
            const pageNum = Number(trimmed);
            if (!Number.isInteger(pageNum) || pageNum < 1) {
                throw new Error(`Invalid page number: "${trimmed}"`);
            }
            if (pageNum > totalPages) {
                throw new Error(`Page ${pageNum} exceeds document page count (${totalPages})`);
            }
            if (!seen.has(pageNum)) {
                seen.add(pageNum);
                pages.push(pageNum);
            }
        }
    }

    if (pages.length === 0) {
        throw new Error('No printable pages resolved from page range');
    }

    return pages;
}

/**
 * Resolve final ordered list of 1-based original document pages to print for ONE copy.
 */
function resolveSelectedPages(originalPageCount, pageRange = 'all', excludedPages = []) {
    const rawRange = (pageRange || 'all').toString().trim();
    let pages = parsePageRangeList(rawRange, originalPageCount);

    // When pageRange is 'all', apply excludedPages filter if present.
    // (When custom pageRange is already specified, exclusions are already encoded in the range,
    //  unless someone still passed excludedPages on 'all'.)
    if (rawRange.toLowerCase() === 'all' && Array.isArray(excludedPages) && excludedPages.length > 0) {
        const excludedSet = new Set(excludedPages.map(Number));
        pages = pages.filter((p) => !excludedSet.has(p));
    }

    if (pages.length === 0) {
        throw new Error('All pages were excluded; nothing left to print');
    }

    return pages;
}

/**
 * Resolve which 1-based output page indices in the 1-copy print-ready PDF should be printed in Color.
 */
function resolveColorOutputIndices({ colorMode, colorSelectionType, colorPages, selectedOriginalPages, pagesPerSheet = 1 }) {
    const outputPageCount = Math.ceil(selectedOriginalPages.length / pagesPerSheet);

    if (colorMode === 'Color' || colorSelectionType === 'all') {
        return Array.from({ length: outputPageCount }, (_, i) => i + 1);
    }

    if ((colorMode === 'Mixed' || colorSelectionType === 'custom') && colorPages && colorPages.trim() !== '') {
        const maxOrigPage = Math.max(...selectedOriginalPages);
        const colorOrigSet = new Set(parsePageRangeList(colorPages, maxOrigPage));
        const outputColorIndices = [];

        for (let outIdx = 0; outIdx < outputPageCount; outIdx++) {
            const slice = selectedOriginalPages.slice(outIdx * pagesPerSheet, (outIdx + 1) * pagesPerSheet);
            if (slice.some((origPage) => colorOrigSet.has(origPage))) {
                outputColorIndices.push(outIdx + 1);
            }
        }
        return outputColorIndices;
    }

    return [];
}

/**
 * Normalize copies and sides and compute authoritative sheet & impression totals.
 */
function calculateExpectedOutput({ finalPrintReadyPageCount, copies = 1, sides = 'single' }) {
    const parsedCopies = Number(copies);
    if (!Number.isInteger(parsedCopies) || parsedCopies < 1 || parsedCopies > 500) {
        throw new Error(`Invalid copies value: ${copies}. Must be an integer between 1 and 500.`);
    }

    const normalizedSides = normalizeSides(sides);
    const impressionsPerCopy = Number(finalPrintReadyPageCount);
    const sheetsPerCopy = normalizedSides === 'double'
        ? Math.ceil(impressionsPerCopy / 2)
        : impressionsPerCopy;

    return {
        copies: parsedCopies,
        sides: normalizedSides,
        pagesPerCopy: impressionsPerCopy,
        sheetsPerCopy,
        expectedImpressions: impressionsPerCopy * parsedCopies,
        expectedSheets: sheetsPerCopy * parsedCopies
    };
}

function normalizeSides(sides) {
    const val = (sides || 'single').toString().trim().toLowerCase();
    if (['double', 'duplex', 'duplexlong', 'two-sided', 'twosidedlongedge'].includes(val)) {
        return 'double';
    }
    if (['duplexshort', 'twosidedshortedge'].includes(val)) {
        return 'duplexshort';
    }
    if (['single', 'simplex', 'one-sided', 'onesided'].includes(val)) {
        return 'single';
    }
    throw new Error(`Unsupported sides value: "${sides}". Expected 'single' or 'double'.`);
}

/**
 * Convert Word (.docx/.doc) or Image (.jpg/.jpeg/.png) into a clean PDF if source is not already PDF.
 */
async function ensureSourcePdf(inputPath, paperSize = 'A4') {
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Source file does not exist on disk: ${path.basename(inputPath)}`);
    }

    const lower = inputPath.toLowerCase();
    if (lower.endsWith('.pdf')) {
        return inputPath;
    }

    if (/\.docx?$/i.test(inputPath)) {
        const pdfPath = inputPath.replace(/\.docx?$/i, '.pdf');
        if (fs.existsSync(pdfPath)) {
            return pdfPath;
        }

        const psCmd = `
            $word = New-Object -ComObject Word.Application
            $word.Visible = $false
            $doc = $word.Documents.Open('${inputPath.replace(/\\/g, '\\\\')}')
            $doc.SaveAs([ref]'${pdfPath.replace(/\\/g, '\\\\')}', [ref]17)
            $doc.Close()
            $word.Quit()
        `;
        execSync(`powershell -NoProfile -Command "${psCmd.replace(/\n/g, '; ')}"`, { stdio: 'ignore' });
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`Failed to convert Word document to PDF: ${path.basename(inputPath)}`);
        }
        return pdfPath;
    }

    if (/\.(jpe?g|png)$/i.test(inputPath)) {
        const pdfPath = inputPath.replace(/\.(jpe?g|png)$/i, '.pdf');
        if (fs.existsSync(pdfPath)) {
            return pdfPath;
        }

        const imgBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.create();
        const img = lower.endsWith('.png')
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);
        const dims = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;
        const page = pdfDoc.addPage([dims.width, dims.height]);
        const margin = 20;
        const availW = dims.width - margin * 2;
        const availH = dims.height - margin * 2;
        const scale = Math.min(availW / img.width, availH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        page.drawImage(img, {
            x: (dims.width - drawW) / 2,
            y: (dims.height - drawH) / 2,
            width: drawW,
            height: drawH
        });
        fs.writeFileSync(pdfPath, await pdfDoc.save());
        return pdfPath;
    }

    throw new Error(`Unsupported file format for printing: ${path.extname(inputPath)}`);
}

/**
 * Build an authoritative 1-copy print-ready PDF matching the validated PrintJob configuration.
 * Copies are NEVER expanded inside this PDF — copies are controlled solely via the printer driver's Copies attribute.
 */
async function buildPrintReadyPdf({ sourcePath, printJob, outputPath }) {
    const paperSize = printJob.paperSize || 'A4';
    const pdfSourcePath = await ensureSourcePdf(sourcePath, paperSize);
    const srcBytes = fs.readFileSync(pdfSourcePath);
    const srcPdf = await PDFDocument.load(srcBytes, { ignoreEncryption: false });

    const originalPageCount = srcPdf.getPageCount();
    const selectedPages = resolveSelectedPages(
        originalPageCount,
        printJob.pageRange || 'all',
        printJob.excludedPages || []
    );

    const pagesPerSheet = [1, 2, 4].includes(Number(printJob.pagesPerSheet))
        ? Number(printJob.pagesPerSheet)
        : 1;

    const rotationsMap = printJob.pageRotations instanceof Map
        ? Object.fromEntries(printJob.pageRotations)
        : (printJob.pageRotations || {});

    const outPdf = await PDFDocument.create();
    const dims = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;

    let nUpOrientation = 'none';
    let sheetOrientation = 'portrait';
    let cols = 1;
    let rows = 1;
    let sheetWidth = dims.width;
    let sheetHeight = dims.height;

    if (pagesPerSheet === 1) {
        nUpOrientation = 'none';
        sheetOrientation = (printJob.orientation || 'portrait').toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
        if (sheetOrientation === 'landscape') {
            sheetWidth = dims.height;
            sheetHeight = dims.width;
        } else {
            sheetWidth = dims.width;
            sheetHeight = dims.height;
        }

        const zeroBased = selectedPages.map((p) => p - 1);
        const copiedPages = await outPdf.copyPages(srcPdf, zeroBased);
        for (let i = 0; i < copiedPages.length; i++) {
            const origPageNum = selectedPages[i];
            const page = copiedPages[i];
            const extraRot = Number(rotationsMap[String(origPageNum)] || 0);
            if (extraRot) {
                const currentRot = page.getRotation().angle || 0;
                page.setRotation(degrees((currentRot + extraRot) % 360));
            }
            outPdf.addPage(page);
        }
    } else {
        const rawOrient = (printJob.nUpOrientation || printJob.orientation || 'horizontal').toLowerCase();
        nUpOrientation = rawOrient === 'vertical' ? 'vertical' : 'horizontal';

        if (pagesPerSheet === 2) {
            if (nUpOrientation === 'horizontal') {
                // 2-Up Horizontal: 1 row, 2 columns on Landscape sheet. Page 1 left, Page 2 right.
                sheetOrientation = 'landscape';
                sheetWidth = dims.height;
                sheetHeight = dims.width;
                cols = 2;
                rows = 1;
            } else {
                // 2-Up Vertical: 2 rows, 1 column on Portrait sheet. Page 1 top, Page 2 bottom.
                sheetOrientation = 'portrait';
                sheetWidth = dims.width;
                sheetHeight = dims.height;
                cols = 1;
                rows = 2;
            }
        } else if (pagesPerSheet === 4) {
            cols = 2;
            rows = 2;
            if (nUpOrientation === 'horizontal') {
                // 4-Up Horizontal: 2x2 grid on Landscape sheet.
                sheetOrientation = 'landscape';
                sheetWidth = dims.height;
                sheetHeight = dims.width;
            } else {
                // 4-Up Vertical: 2x2 grid on Portrait sheet.
                sheetOrientation = 'portrait';
                sheetWidth = dims.width;
                sheetHeight = dims.height;
            }
        }

        const zeroBased = selectedPages.map((p) => p - 1);
        const embeddedPages = await outPdf.embedPages(zeroBased.map((idx) => srcPdf.getPage(idx)));

        for (let i = 0; i < embeddedPages.length; i += pagesPerSheet) {
            const sheet = outPdf.addPage([sheetWidth, sheetHeight]);
            const cellW = sheetWidth / cols;
            const cellH = sheetHeight / rows;
            const padding = 10;

            for (let slot = 0; slot < pagesPerSheet && (i + slot) < embeddedPages.length; slot++) {
                const emb = embeddedPages[i + slot];
                const col = slot % cols;
                const row = Math.floor(slot / cols);
                const availW = Math.max(10, cellW - padding * 2);
                const availH = Math.max(10, cellH - padding * 2);
                const scale = Math.min(availW / emb.width, availH / emb.height);
                const drawW = emb.width * scale;
                const drawH = emb.height * scale;
                const x = col * cellW + (cellW - drawW) / 2;
                const y = sheetHeight - (row + 1) * cellH + (cellH - drawH) / 2;
                sheet.drawPage(emb, { x, y, width: drawW, height: drawH });
            }
        }
    }

    const finalPrintReadyPageCount = outPdf.getPageCount();
    const expectedLogicalCount = Math.ceil(selectedPages.length / pagesPerSheet);
    if (finalPrintReadyPageCount !== expectedLogicalCount) {
        throw new Error(
            `Print-ready PDF page count invariant violated: expected ${expectedLogicalCount}, got ${finalPrintReadyPageCount}`
        );
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const outBytes = await outPdf.save();
    fs.writeFileSync(outputPath, outBytes);

    const colorOutputIndices = resolveColorOutputIndices({
        colorMode: printJob.colorMode || 'B&W',
        colorSelectionType: printJob.colorSelectionType || 'none',
        colorPages: printJob.colorPages || '',
        selectedOriginalPages: selectedPages,
        pagesPerSheet
    });

    const expectedOutput = calculateExpectedOutput({
        finalPrintReadyPageCount,
        copies: printJob.copies || 1,
        sides: printJob.sides || 'single'
    });

    return {
        outputPath,
        originalPageCount,
        selectedPages,
        finalPrintReadyPageCount,
        colorOutputIndices,
        sheetOrientation,
        nUpOrientation,
        ...expectedOutput
    };
}

module.exports = {
    PAPER_DIMENSIONS,
    parsePageRangeList,
    resolveSelectedPages,
    resolveColorOutputIndices,
    calculateExpectedOutput,
    normalizeSides,
    ensureSourcePdf,
    buildPrintReadyPdf
};
