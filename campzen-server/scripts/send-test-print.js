require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const printerService = require('../src/services/printer.service');

async function generateAndPrintTestPage() {
    const args = process.argv.slice(2);
    const isSingle = args.includes('--single');
    const isDuplex = !isSingle; // default to duplex test if not explicitly single
    const sideMode = isDuplex ? 'double' : 'single';

    const targetPrinter = process.env.PRINTER_NAME || 'HP LaserJet MFP M72625-M72630 PCL 6';

    console.log(`📄 [1/3] Generating Kami HP LaserJet Calibration Sheet (${sideMode.toUpperCase()} MODE)...`);

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Helper to draw a calibration page
    const renderPage = (pageNumber, totalPages, labelSide) => {
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();

        // Border
        page.drawRectangle({
            x: 30,
            y: 30,
            width: width - 60,
            height: height - 60,
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 1.5,
        });

        // Banner
        page.drawRectangle({
            x: 32,
            y: height - 110,
            width: width - 64,
            height: 78,
            color: rgb(0.89, 0.27, 0.22), // Kami Vermilion #E44537
        });

        // Header Text
        page.drawText('KAMI CAMPUS PRINTING', {
            x: 50,
            y: height - 65,
            size: 24,
            font: fontBold,
            color: rgb(1, 1, 1),
        });

        page.drawText(`HARDWARE CALIBRATION TEST - PAGE ${pageNumber} OF ${totalPages} (${labelSide.toUpperCase()})`, {
            x: 50,
            y: height - 90,
            size: 11,
            font: fontRegular,
            color: rgb(1, 1, 1),
        });

        // Metadata box
        let yPos = height - 150;
        const drawRow = (label, val) => {
            page.drawText(label, { x: 50, y: yPos, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(val, { x: 220, y: yPos, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
            yPos -= 22;
        };

        drawRow('Target Printer:', targetPrinter);
        drawRow('Print Mode:', isDuplex ? 'Double-Sided (Duplex / Long-Edge)' : 'Single-Sided (Simplex)');
        drawRow('Paper Media:', '70 GSM Plain A4 Paper');
        drawRow('Sheet Side:', `${labelSide} (Page ${pageNumber})`);
        drawRow('Timestamp:', new Date().toLocaleString());
        drawRow('Status:', 'ONLINE & TEST DISPATCHED VIA AUTO-SPOOLER');

        // Divider Line
        yPos -= 10;
        page.drawLine({
            start: { x: 50, y: yPos },
            end: { x: width - 50, y: yPos },
            thickness: 1,
            color: rgb(0.7, 0.7, 0.7),
        });

        // Quality & Grayscale section
        yPos -= 30;
        page.drawText('PRINT QUALITY & DUPLEX ALIGNMENT VERIFICATION', {
            x: 50,
            y: yPos,
            size: 13,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
        });

        yPos -= 18;
        page.drawText(`Calibration pattern for HP LaserJet MFP M72625 [Side: ${labelSide}]:`, {
            x: 50,
            y: yPos,
            size: 9.5,
            font: fontRegular,
            color: rgb(0.4, 0.4, 0.4),
        });

        // Grayscale Bars
        yPos -= 35;
        const barWidth = (width - 100 - 30) / 4;
        const shades = [
            { label: '100% Black', val: 0.0 },
            { label: '75% Gray', val: 0.25 },
            { label: '50% Gray', val: 0.5 },
            { label: '25% Gray', val: 0.75 },
        ];

        shades.forEach((shade, i) => {
            const x = 50 + i * (barWidth + 10);
            page.drawRectangle({
                x,
                y: yPos - 30,
                width: barWidth,
                height: 30,
                color: rgb(shade.val, shade.val, shade.val),
            });
            page.drawText(shade.label, {
                x,
                y: yPos - 45,
                size: 9,
                font: fontRegular,
                color: rgb(0.2, 0.2, 0.2),
            });
        });

        // Text sharpness test
        yPos -= 85;
        page.drawText('ALIGNMENT & FONT SHARPNESS SAMPLES', {
            x: 50,
            y: yPos,
            size: 13,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
        });

        yPos -= 20;
        page.drawText('Font 12pt: The quick brown fox jumps over the lazy dog. 1234567890', {
            x: 50,
            y: yPos,
            size: 12,
            font: fontRegular,
            color: rgb(0.1, 0.1, 0.1),
        });

        yPos -= 18;
        page.drawText(`Font 10pt: Automatic student queue order dispatching verified. ${labelSide} side check.`, {
            x: 50,
            y: yPos,
            size: 10,
            font: fontRegular,
            color: rgb(0.2, 0.2, 0.2),
        });

        yPos -= 16;
        page.drawText('Font 8pt: Kami Print Station Hardware Bridge | HP LaserJet MFP M72625 PCL 6 | Ready', {
            x: 50,
            y: yPos,
            size: 8,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3),
        });

        // Bottom Footer
        page.drawRectangle({
            x: 50,
            y: 50,
            width: width - 100,
            height: 40,
            color: rgb(0.95, 0.95, 0.95),
        });

        const footerMessage = isDuplex
            ? `DUPLEX CHECK: This is Page ${pageNumber} (${labelSide}). Verify both Page 1 and Page 2 are on 1 physical sheet!`
            : `SINGLE-SIDED CHECK: Printed cleanly on a single side.`;

        page.drawText(footerMessage, {
            x: 60,
            y: 68,
            size: 9,
            font: fontBold,
            color: rgb(0.15, 0.68, 0.38), // Green
        });
    };

    // Render Page 1
    renderPage(1, isDuplex ? 2 : 1, isDuplex ? 'Front Side' : 'Single Side');

    // If duplex, render Page 2 (Back Side)
    if (isDuplex) {
        renderPage(2, 2, 'Back Side');
    }

    const pdfBytes = await pdfDoc.save();
    const testPdfPath = path.join(__dirname, 'test-calibration-page.pdf');
    fs.writeFileSync(testPdfPath, pdfBytes);
    console.log(`✅ [2/3] Test PDF generated: ${testPdfPath} (${isDuplex ? '2 Pages' : '1 Page'})`);

    // Dispatch via printerService.printDirect
    console.log(`🖨️ [3/3] Sending to "${targetPrinter}" spooler with sides="${sideMode}"...`);
    const result = await printerService.printDirect(testPdfPath, {
        printer: targetPrinter,
        sides: sideMode,
        paperSize: 'A4',
        monochrome: true
    });

    console.log(`🎉 [SUCCESS] Test print job sent to "${targetPrinter}" successfully!`);
    console.log(`   Mode: ${isDuplex ? 'Double-Sided (Duplex)' : 'Single-Sided (Simplex)'}`);
    console.log(`   The printer should feed and print now.`);
}

generateAndPrintTestPage().catch((err) => {
    console.error('❌ [ERROR] Print dispatch failed:', err.message);
});
