const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const INFO_SHEETS_DIR = path.join(UPLOADS_DIR, 'info-sheets');

// Ensure directory exists
if (!fs.existsSync(INFO_SHEETS_DIR)) {
    fs.mkdirSync(INFO_SHEETS_DIR, { recursive: true });
}

/**
 * Determine the authoritative information sheet type based strictly on original document page count.
 * 1–5 pages: 'plain'
 * 6+ pages: 'creative'
 *
 * @param {number} originalPageCount
 * @returns {'plain' | 'creative'}
 */
function determineSheetType(originalPageCount) {
    const pages = Number(originalPageCount);
    if (!Number.isInteger(pages) || pages < 1) {
        throw new Error(`Invalid original page count for sheet type determination: ${originalPageCount}`);
    }
    return pages <= 5 ? 'plain' : 'creative';
}

/**
 * Mask student phone number for privacy preservation.
 * e.g., '9876543210' -> '******3210', '+919876543210' -> '+91 ******3210'
 */
function maskPhoneNumber(phone) {
    if (!phone) return 'Not Provided';
    const clean = phone.toString().trim();
    if (clean.length <= 4) return '****';
    const visibleSuffix = clean.slice(-4);
    if (clean.startsWith('+')) {
        const countryCode = clean.slice(0, 3);
        return `${countryCode} ******${visibleSuffix}`;
    }
    return `******${visibleSuffix}`;
}

/**
 * Format timestamp into clean human-readable IST string.
 */
function formatDateIST(dateInput) {
    try {
        const d = dateInput ? new Date(dateInput) : new Date();
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) + ' IST';
    } catch {
        return new Date().toISOString();
    }
}

/**
 * Safe single-line string truncation for PDF layout bounds.
 */
function truncateText(text, maxChars = 60) {
    if (!text) return 'None';
    const s = text.toString().trim();
    return s.length > maxChars ? s.slice(0, maxChars - 3) + '...' : s;
}

/**
 * Generate a Plain Information Sheet (1 to 5 original document pages).
 * Design requirements:
 * - Clean white background, crisp black text.
 * - Table-based structured layout.
 * - Kami branding.
 * - Masked phone number, student name, USN.
 * - Complete order, document, print specs, finishing, and vendor information.
 * - A4 format (595.28 x 841.89 pt).
 */
async function generatePlainSheet(orderData, docData, printJobData) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // Standard A4 points
    const { width, height } = page.getSize();

    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Color palette - Clean monochrome with subtle charcoal and Kami red accent
    const colorBlack = rgb(0.1, 0.1, 0.1);
    const colorCharcoal = rgb(0.3, 0.3, 0.3);
    const colorLightGray = rgb(0.92, 0.92, 0.92);
    const colorBorder = rgb(0.75, 0.75, 0.75);
    const colorWhite = rgb(1, 1, 1);
    const colorKamiRed = rgb(0.79, 0.16, 0.16);

    const margin = 40;
    const contentWidth = width - (margin * 2);

    // Outer border
    page.drawRectangle({
        x: margin,
        y: margin,
        width: contentWidth,
        height: height - (margin * 2),
        borderWidth: 1,
        borderColor: colorBorder,
        color: colorWhite
    });

    // Top Kami brand bar
    page.drawRectangle({
        x: margin,
        y: height - margin - 6,
        width: contentWidth,
        height: 6,
        color: colorKamiRed
    });

    // Header block
    let curY = height - margin - 35;
    page.drawText('KAMI', {
        x: margin + 15,
        y: curY,
        size: 22,
        font: fontBold,
        color: colorKamiRed
    });

    page.drawText('ORDER INFORMATION SHEET', {
        x: margin + 80,
        y: curY + 2,
        size: 14,
        font: fontBold,
        color: colorBlack
    });

    page.drawText('STANDARD DISPATCH · 1–5 ORIGINAL PAGES TIER', {
        x: margin + 80,
        y: curY - 14,
        size: 8,
        font: fontRegular,
        color: colorCharcoal
    });

    // Order number pill on the right
    const orderNo = orderData.orderNumber || `#KAMI-${orderData._id ? orderData._id.toString().slice(-6).toUpperCase() : 'PENDING'}`;
    const orderPillWidth = 140;
    page.drawRectangle({
        x: width - margin - orderPillWidth - 15,
        y: curY - 14,
        width: orderPillWidth,
        height: 28,
        color: colorLightGray,
        borderWidth: 1,
        borderColor: colorBorder
    });

    page.drawText('ORDER REF', {
        x: width - margin - orderPillWidth - 5,
        y: curY + 2,
        size: 7,
        font: fontBold,
        color: colorCharcoal
    });

    page.drawText(orderNo, {
        x: width - margin - orderPillWidth - 5,
        y: curY - 9,
        size: 10,
        font: fontBold,
        color: colorBlack
    });

    // Divider line
    curY -= 30;
    page.drawLine({
        start: { x: margin + 15, y: curY },
        end: { x: width - margin - 15, y: curY },
        thickness: 1,
        color: colorBorder
    });

    // Helper to draw section header
    const drawSectionHeader = (title, yPos) => {
        page.drawRectangle({
            x: margin + 15,
            y: yPos - 18,
            width: contentWidth - 30,
            height: 20,
            color: colorLightGray
        });
        page.drawText(title, {
            x: margin + 25,
            y: yPos - 13,
            size: 9,
            font: fontBold,
            color: colorBlack
        });
        return yPos - 25;
    };

    // Helper to draw a table row with two columns
    const drawTableRow = (label, value, yPos, isAlternate = false) => {
        const rowHeight = 22;
        if (isAlternate) {
            page.drawRectangle({
                x: margin + 15,
                y: yPos - rowHeight,
                width: contentWidth - 30,
                height: rowHeight,
                color: rgb(0.97, 0.97, 0.97)
            });
        }
        page.drawText(label, {
            x: margin + 25,
            y: yPos - 15,
            size: 9,
            font: fontBold,
            color: colorCharcoal
        });
        page.drawText(truncateText(value, 55), {
            x: margin + 190,
            y: yPos - 15,
            size: 9,
            font: fontRegular,
            color: colorBlack
        });
        // Bottom border
        page.drawLine({
            start: { x: margin + 15, y: yPos - rowHeight },
            end: { x: width - margin - 15, y: yPos - rowHeight },
            thickness: 0.5,
            color: colorBorder
        });
        return yPos - rowHeight;
    };

    // --- Section 1: STUDENT & FULFILLMENT ---
    curY = drawSectionHeader('1. CUSTOMER & FULFILLMENT DETAILS', curY - 15);
    const studentName = orderData.userName || (orderData.userId && (orderData.userId.name || orderData.userId.displayName)) || 'Student';
    const studentUSN = orderData.userUSN || (orderData.userId && (orderData.userId.usn || orderData.userId.rollNumber)) || 'Not Provided';
    const studentPhone = maskPhoneNumber(orderData.userPhone || (orderData.userId && orderData.userId.phone));
    const fulfillment = (orderData.fulfillmentType || 'pickup').toUpperCase();
    const pickupCode = orderData.pickupCode ? `OTP: ${orderData.pickupCode}` : 'Issued upon payment';
    const orderDate = formatDateIST(orderData.createdAt);

    curY = drawTableRow('Student Name', studentName, curY, false);
    curY = drawTableRow('USN / College ID', studentUSN, curY, true);
    curY = drawTableRow('Contact (Masked)', studentPhone, curY, false);
    const collegeName = orderData.collegeName || (orderData.userId && orderData.userId.collegeName) || 'Kami Campus Center';
    curY = drawTableRow('Campus / College', collegeName, curY, true);
    curY = drawTableRow('Fulfillment Method', `${fulfillment} · ${pickupCode}`, curY, false);
    curY = drawTableRow('Order Placed At', orderDate, curY, true);

    // --- Section 2: DOCUMENT & PRINT SPECIFICATIONS ---
    curY = drawSectionHeader('2. DOCUMENT & PRINT SPECIFICATIONS', curY - 15);
    const docTitle = docData.originalFilename || docData.name || 'Student_Document.pdf';
    const origPages = `${docData.pageCount || printJobData.originalPageCount || 1} pages (Original)`;
    const selectedRange = `${printJobData.pageRange || 'all'} (${printJobData.finalPrintReadyPageCount || docData.pageCount || 1} printable pages)`;
    const copies = `${printJobData.copies || 1} copy (${printJobData.expectedImpressions || printJobData.copies || 1} impressions)`;
    const sides = (printJobData.sides === 'double' || printJobData.sides === 'duplexshort') ? 'DOUBLE-SIDED (Duplex)' : 'SINGLE-SIDED (Simplex)';
    const colorMode = (printJobData.colorMode || 'B&W').toUpperCase();
    const colorPages = printJobData.colorPages ? `Color Pages: ${printJobData.colorPages}` : (colorMode === 'COLOR' ? 'All pages in color' : 'None');
    const nUpLayout = Number(printJobData.pagesPerSheet) > 1
        ? `${printJobData.pagesPerSheet}-Up (${(printJobData.nUpOrientation || 'horizontal').toUpperCase()})`
        : '1-Up (Standard)';
    const paper = `${printJobData.paperSize || 'A4'} · ${printJobData.paperType || '70gsm'} Standard (${printJobData.sheetOrientation || printJobData.orientation || 'portrait'})`;

    curY = drawTableRow('Document Name', docTitle, curY, false);
    curY = drawTableRow('Original Document Pages', origPages, curY, true);
    curY = drawTableRow('Selected Page Range', selectedRange, curY, false);
    curY = drawTableRow('Quantity / Copies', copies, curY, true);
    curY = drawTableRow('Sides Configuration', sides, curY, false);
    curY = drawTableRow('Color Setting', `${colorMode} (${colorPages})`, curY, true);
    curY = drawTableRow('Pages Per Sheet / Layout', nUpLayout, curY, false);
    curY = drawTableRow('Paper Specification', paper, curY, true);

    // --- Section 3: FINISHING & SHOP ---
    curY = drawSectionHeader('3. FINISHING, INSTRUCTIONS & VENDOR', curY - 15);
    let finishingDesc = 'None';
    if (Array.isArray(printJobData.finishing) && printJobData.finishing.length > 0) {
        finishingDesc = printJobData.finishing.map(f => f.type.replace(/_/g, ' ').toUpperCase()).join(', ');
    }
    const shopName = orderData.vendorName || (orderData.vendorId && (orderData.vendorId.shopName || orderData.vendorId.name)) || 'Kami Partner Print Center';
    const studentNotes = orderData.notes ? truncateText(orderData.notes, 50) : 'None';

    curY = drawTableRow('Finishing Options', finishingDesc, curY, false);
    curY = drawTableRow('Print Center / Shop', shopName, curY, true);
    curY = drawTableRow('Student Instructions', studentNotes, curY, false);

    // --- Verification Box for Shop Operator ---
    curY -= 20;
    page.drawRectangle({
        x: margin + 15,
        y: curY - 45,
        width: contentWidth - 30,
        height: 45,
        borderWidth: 1,
        borderColor: colorBorder,
        color: rgb(0.99, 0.99, 0.99)
    });

    page.drawText('OPERATOR QUALITY CHECKLIST:', {
        x: margin + 25,
        y: curY - 15,
        size: 8,
        font: fontBold,
        color: colorCharcoal
    });

    page.drawText('[  ] Page count verified  [  ] Correct duplex/simplex  [  ] Color accuracy checked  [  ] Remove this sheet before binding if specified', {
        x: margin + 25,
        y: curY - 32,
        size: 7.5,
        font: fontRegular,
        color: colorBlack
    });

    // --- Footer Notice ---
    const footerY = margin + 20;
    page.drawLine({
        start: { x: margin + 15, y: footerY + 18 },
        end: { x: width - margin - 15, y: footerY + 18 },
        thickness: 0.5,
        color: colorBorder
    });

    page.drawText('Kami Campus Reprographics System · Production & Identification Component', {
        x: margin + 15,
        y: footerY + 6,
        size: 7.5,
        font: fontBold,
        color: colorCharcoal
    });

    page.drawText('Keep attached to document until student counter handover · Masked PII compliant', {
        x: margin + 15,
        y: footerY - 5,
        size: 7,
        font: fontRegular,
        color: colorCharcoal
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
}

/**
 * Generate a Creative Information Sheet (6 or more original document pages).
 * Design requirements:
 * - Visually engaging, college-tailored creative layout.
 * - Academic Survival & College Hustle themes.
 * - Clean high-contrast typography and borders that look great in Color and print crisp in B&W.
 * - Prominent Order Card, Pickup Code Badge, Specs Grid, and Relatable Student Banner.
 * - Masked phone number, student name, USN.
 * - A4 format (595.28 x 841.89 pt).
 */
async function generateCreativeSheet(orderData, docData, printJobData) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // Standard A4 points
    const { width, height } = page.getSize();

    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Color palette - Modern bold crimson, deep navy/charcoal, high-contrast borders
    const colorBlack = rgb(0.08, 0.08, 0.08);
    const colorCharcoal = rgb(0.25, 0.25, 0.28);
    const colorKamiRed = rgb(0.82, 0.16, 0.16);
    const colorDarkNavy = rgb(0.1, 0.15, 0.25);
    const colorCardBg = rgb(0.96, 0.96, 0.98);
    const colorWhite = rgb(1, 1, 1);
    const colorAccentBorder = rgb(0.3, 0.3, 0.35);

    const margin = 35;
    const contentWidth = width - (margin * 2);

    // Modern Double Geometric Border
    page.drawRectangle({
        x: margin,
        y: margin,
        width: contentWidth,
        height: height - (margin * 2),
        borderWidth: 2,
        borderColor: colorBlack,
        color: colorWhite
    });

    page.drawRectangle({
        x: margin + 5,
        y: margin + 5,
        width: contentWidth - 10,
        height: height - (margin * 2) - 10,
        borderWidth: 0.75,
        borderColor: colorAccentBorder,
        color: colorWhite
    });

    // Top Header Banner
    const bannerHeight = 80;
    const bannerY = height - margin - bannerHeight - 5;
    page.drawRectangle({
        x: margin + 5,
        y: bannerY,
        width: contentWidth - 10,
        height: bannerHeight,
        color: colorDarkNavy
    });

    // Brand Label
    page.drawText('KAMI', {
        x: margin + 25,
        y: bannerY + 45,
        size: 26,
        font: fontBold,
        color: colorWhite
    });

    page.drawText('CAMPUS PRINT DISPATCH // ACADEMIC SURVIVAL EDITION', {
        x: margin + 110,
        y: bannerY + 52,
        size: 10,
        font: fontBold,
        color: rgb(0.9, 0.9, 0.9)
    });

    page.drawText('6+ Original Pages Personal Cover · Printed for High-Yield Performance', {
        x: margin + 110,
        y: bannerY + 38,
        size: 8,
        font: fontRegular,
        color: rgb(0.75, 0.8, 0.88)
    });

    // Order Badge on Banner
    const orderNo = orderData.orderNumber || `#KAMI-${orderData._id ? orderData._id.toString().slice(-6).toUpperCase() : 'VIP'}`;
    page.drawRectangle({
        x: width - margin - 170,
        y: bannerY + 20,
        width: 145,
        height: 40,
        color: colorKamiRed
    });

    page.drawText('DISPATCH ID', {
        x: width - margin - 160,
        y: bannerY + 46,
        size: 7.5,
        font: fontBold,
        color: colorWhite
    });

    page.drawText(orderNo, {
        x: width - margin - 160,
        y: bannerY + 28,
        size: 13,
        font: fontBold,
        color: colorWhite
    });

    // --- Humor / Motivational Hero Banner ---
    let curY = bannerY - 20;
    const quoteBoxHeight = 55;
    page.drawRectangle({
        x: margin + 20,
        y: curY - quoteBoxHeight,
        width: contentWidth - 40,
        height: quoteBoxHeight,
        color: colorCardBg,
        borderWidth: 1.5,
        borderColor: colorBlack
    });

    // Fun quote banner
    page.drawText('[!] ACADEMIC SURVIVAL NOTICE:', {
        x: margin + 35,
        y: curY - 20,
        size: 9.5,
        font: fontBold,
        color: colorKamiRed
    });

    page.drawText('Document contains high-density study material. 100% submission ready.', {
        x: margin + 35,
        y: curY - 34,
        size: 9,
        font: fontBold,
        color: colorBlack
    });

    page.drawText('Warning: Side effects may include finishing assignments on time and sudden exam confidence.', {
        x: margin + 35,
        y: curY - 47,
        size: 8,
        font: fontRegular,
        color: colorCharcoal
    });

    curY -= (quoteBoxHeight + 25);

    // --- 4 Large Stat Pills (Pages, Copies, Sides, Mode) ---
    const pillCount = 4;
    const pillGap = 10;
    const pillTotalWidth = contentWidth - 40;
    const pillWidth = (pillTotalWidth - (pillGap * (pillCount - 1))) / pillCount;
    const pillHeight = 50;

    const stats = [
        { label: 'ORIGINAL PAGES', val: `${docData.pageCount || printJobData.originalPageCount || 6} Pgs` },
        { label: 'PRINT COPIES', val: `${printJobData.copies || 1} Copy` },
        { label: 'SIDES', val: (printJobData.sides === 'double' || printJobData.sides === 'duplexshort') ? 'DUPLEX' : 'SIMPLEX' },
        { label: 'PAGES / SHEET', val: Number(printJobData.pagesPerSheet) > 1 ? `${printJobData.pagesPerSheet}-Up ${(printJobData.nUpOrientation || 'H').toUpperCase().slice(0, 1)}` : '1-Up' }
    ];

    stats.forEach((st, idx) => {
        const pillX = margin + 20 + idx * (pillWidth + pillGap);
        page.drawRectangle({
            x: pillX,
            y: curY - pillHeight,
            width: pillWidth,
            height: pillHeight,
            color: colorWhite,
            borderWidth: 1.5,
            borderColor: colorBlack
        });
        page.drawText(st.label, {
            x: pillX + 10,
            y: curY - 18,
            size: 7,
            font: fontBold,
            color: colorCharcoal
        });
        page.drawText(st.val, {
            x: pillX + 10,
            y: curY - 38,
            size: 12,
            font: fontBold,
            color: colorBlack
        });
    });

    curY -= (pillHeight + 25);

    // --- Two Column Cards: Student Profile & Pickup Code ---
    const colWidth = (contentWidth - 50) / 2;
    const cardHeight = 115;

    // Left Card: Student Info
    page.drawRectangle({
        x: margin + 20,
        y: curY - cardHeight,
        width: colWidth,
        height: cardHeight,
        color: colorCardBg,
        borderWidth: 1,
        borderColor: colorAccentBorder
    });

    page.drawText('STUDENT INTEL', {
        x: margin + 32,
        y: curY - 20,
        size: 9,
        font: fontBold,
        color: colorDarkNavy
    });

    const studentName = orderData.userName || (orderData.userId && (orderData.userId.name || orderData.userId.displayName)) || 'Student Scholar';
    const studentUSN = orderData.userUSN || (orderData.userId && (orderData.userId.usn || orderData.userId.rollNumber)) || 'Verified Campus ID';
    const studentPhone = maskPhoneNumber(orderData.userPhone || (orderData.userId && orderData.userId.phone));

    page.drawText('Student:', { x: margin + 32, y: curY - 40, size: 8, font: fontBold, color: colorCharcoal });
    page.drawText(truncateText(studentName, 26), { x: margin + 80, y: curY - 40, size: 9, font: fontBold, color: colorBlack });

    page.drawText('USN / ID:', { x: margin + 32, y: curY - 60, size: 8, font: fontBold, color: colorCharcoal });
    page.drawText(truncateText(studentUSN, 26), { x: margin + 80, y: curY - 60, size: 9, font: fontRegular, color: colorBlack });

    page.drawText('Contact:', { x: margin + 32, y: curY - 80, size: 8, font: fontBold, color: colorCharcoal });
    page.drawText(studentPhone, { x: margin + 80, y: curY - 80, size: 9, font: fontRegular, color: colorBlack });

    page.drawText('Ordered At:', { x: margin + 32, y: curY - 100, size: 8, font: fontBold, color: colorCharcoal });
    page.drawText(formatDateIST(orderData.createdAt), { x: margin + 80, y: curY - 100, size: 7.5, font: fontRegular, color: colorCharcoal });

    // Right Card: Counter Pickup Box
    const rightCardX = margin + 30 + colWidth;
    page.drawRectangle({
        x: rightCardX,
        y: curY - cardHeight,
        width: colWidth,
        height: cardHeight,
        color: colorCardBg,
        borderWidth: 1,
        borderColor: colorAccentBorder
    });

    page.drawText('COUNTER PICKUP CODE', {
        x: rightCardX + 15,
        y: curY - 20,
        size: 9,
        font: fontBold,
        color: colorDarkNavy
    });

    page.drawText('Show this code to shop staff at pickup:', {
        x: rightCardX + 15,
        y: curY - 35,
        size: 7.5,
        font: fontRegular,
        color: colorCharcoal
    });

    const pickupOtp = orderData.pickupCode || 'PAID';
    // Draw 4 distinct digits or code boxes
    const otpDigits = pickupOtp.split('');
    const digitBoxWidth = 32;
    const digitBoxGap = 8;
    const totalOtpWidth = (digitBoxWidth * otpDigits.length) + (digitBoxGap * (otpDigits.length - 1));
    const otpStartX = rightCardX + (colWidth - totalOtpWidth) / 2;

    otpDigits.forEach((digit, i) => {
        const bx = otpStartX + i * (digitBoxWidth + digitBoxGap);
        page.drawRectangle({
            x: bx,
            y: curY - 85,
            width: digitBoxWidth,
            height: 38,
            color: colorWhite,
            borderWidth: 1.5,
            borderColor: colorBlack
        });
        page.drawText(digit, {
            x: bx + 10,
            y: curY - 73,
            size: 18,
            font: fontBold,
            color: colorKamiRed
        });
    });

    page.drawText('Fulfillment: Counter Pickup / Verified Handover', {
        x: rightCardX + 15,
        y: curY - 102,
        size: 7.5,
        font: fontRegular,
        color: colorCharcoal
    });

    curY -= (cardHeight + 25);

    // --- Document Specifications Table ---
    page.drawText('PRODUCTION SPECIFICATIONS & FINISHING', {
        x: margin + 22,
        y: curY,
        size: 10,
        font: fontBold,
        color: colorDarkNavy
    });

    curY -= 12;

    const specsTableHeight = 130;
    page.drawRectangle({
        x: margin + 20,
        y: curY - specsTableHeight,
        width: contentWidth - 40,
        height: specsTableHeight,
        color: colorWhite,
        borderWidth: 1,
        borderColor: colorAccentBorder
    });

    const docTitle = docData.originalFilename || docData.name || 'Campus_Resource_Document.pdf';
    let finishingDesc = 'None';
    if (Array.isArray(printJobData.finishing) && printJobData.finishing.length > 0) {
        finishingDesc = printJobData.finishing.map(f => f.type.replace(/_/g, ' ').toUpperCase()).join(', ');
    }
    const shopName = orderData.vendorName || (orderData.vendorId && (orderData.vendorId.shopName || orderData.vendorId.name)) || 'Kami Campus Reprographics Partner';
    const nUpText = Number(printJobData.pagesPerSheet) > 1
        ? `${printJobData.pagesPerSheet}-Up (${(printJobData.nUpOrientation || 'horizontal').toUpperCase()})`
        : '1-Up Standard';
    const paperSpec = `${printJobData.paperSize || 'A4'} · Standard 70gsm (${printJobData.sheetOrientation || printJobData.orientation || 'portrait'})`;
    const campusName = orderData.collegeName || (orderData.userId && orderData.userId.collegeName) || 'Kami Campus Center';

    const specRows = [
        ['Document Name', truncateText(docTitle, 55)],
        ['Page Range & Count', `${printJobData.pageRange || 'all'} (${printJobData.finalPrintReadyPageCount || docData.pageCount || 1} printable pages)`],
        ['Pages Per Sheet / N-Up', nUpText],
        ['Paper & Orientation', paperSpec],
        ['Finishing Option', finishingDesc],
        ['Print Partner & Campus', `${truncateText(shopName, 26)} · ${truncateText(campusName, 24)}`],
        ['Student Notes', orderData.notes ? truncateText(orderData.notes, 55) : 'None']
    ];

    let rowY = curY - 18;
    specRows.forEach(([lbl, val], rIdx) => {
        page.drawText(lbl, { x: margin + 32, y: rowY, size: 7.5, font: fontBold, color: colorCharcoal });
        page.drawText(val, { x: margin + 140, y: rowY, size: 8, font: fontRegular, color: colorBlack });
        if (rIdx < specRows.length - 1) {
            page.drawLine({
                start: { x: margin + 20, y: rowY - 5 },
                end: { x: width - margin - 20, y: rowY - 5 },
                thickness: 0.5,
                color: rgb(0.88, 0.88, 0.88)
            });
        }
        rowY -= 17;
    });

    curY -= (specsTableHeight + 25);

    // --- Footer Notice & Checklist ---
    const footerY = margin + 25;
    page.drawRectangle({
        x: margin + 20,
        y: footerY,
        width: contentWidth - 40,
        height: 48,
        color: colorCardBg,
        borderWidth: 1,
        borderColor: colorAccentBorder
    });

    page.drawText('QUALITY & PRIVACY SAFEGUARD', {
        x: margin + 32,
        y: footerY + 32,
        size: 8,
        font: fontBold,
        color: colorBlack
    });

    page.drawText('Keep this cover sheet on top of the document stack until delivery. Remove before binding if specified.', {
        x: margin + 32,
        y: footerY + 18,
        size: 7.5,
        font: fontRegular,
        color: colorCharcoal
    });

    page.drawText('Kami Cloud Print • Powered by Students, Built for Campus Excellence', {
        x: margin + 32,
        y: footerY + 6,
        size: 7,
        font: fontBold,
        color: colorKamiRed
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
}

/**
 * Main coordinator function to generate and persist the Information Sheet.
 *
 * @param {Object} params
 * @param {Object} params.order - Mongoose Order document or plain object
 * @param {Object} params.document - Mongoose Document or plain object
 * @param {Object} params.printJob - Mongoose PrintJob or plain object
 * @returns {Promise<{ sheetType: 'plain' | 'creative', relativeKey: string, absolutePath: string }>}
 */
async function generateAndSaveInformationSheet({ order, document, printJob }) {
    if (!order || !document || !printJob) {
        throw new Error('generateAndSaveInformationSheet requires order, document, and printJob');
    }

    const origPageCount = Number(document.pageCount || printJob.originalPageCount || 1);
    const sheetType = determineSheetType(origPageCount);

    let pdfBuffer;
    if (sheetType === 'plain') {
        pdfBuffer = await generatePlainSheet(order, document, printJob);
    } else {
        pdfBuffer = await generateCreativeSheet(order, document, printJob);
    }

    const orderIdStr = order._id ? order._id.toString() : (order.orderNumber || Date.now().toString());
    const relativeKey = path.join('info-sheets', `info-sheet-${orderIdStr}.pdf`).replace(/\\/g, '/');
    const absolutePath = path.join(UPLOADS_DIR, relativeKey);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, pdfBuffer);

    return {
        sheetType,
        relativeKey,
        absolutePath,
        buffer: pdfBuffer
    };
}

/**
 * Computes SHA-256 hash of a file on disk.
 */
function computeFileSha256(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found for checksum: ${filePath}`);
    }
    const fileBuffer = fs.readFileSync(filePath);
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Generate an internal print package manifest and validate integrity.
 */
function createPrintPackageManifest({ order, document, printJob, infoSheetPath, printReadyPath }) {
    if (!order || !document || !printJob) {
        throw new Error('createPrintPackageManifest requires order, document, and printJob');
    }
    if (!infoSheetPath || !fs.existsSync(infoSheetPath)) {
        throw new Error(`Information sheet missing or unreadable at: ${infoSheetPath}`);
    }
    if (!printReadyPath || !fs.existsSync(printReadyPath)) {
        throw new Error(`Print-ready document missing or unreadable at: ${printReadyPath}`);
    }

    const infoSheetChecksum = computeFileSha256(infoSheetPath);
    const printReadyChecksum = computeFileSha256(printReadyPath);

    return {
        manifestVersion: '1.0',
        orderId: order._id,
        orderNumber: order.orderNumber,
        studentId: order.userId?._id || order.userId,
        studentName: order.userName || order.userId?.name || 'Student',
        studentUSN: order.userUSN || order.userId?.usn || order.userId?.studentId || 'Not Provided',
        documentId: document._id,
        documentName: document.originalFilename || document.name,
        originalPageCount: Number(document.pageCount || printJob.originalPageCount || 1),
        selectedPageRange: printJob.pageRange || 'all',
        finalPrintReadyPageCount: Number(printJob.finalPrintReadyPageCount || 1),
        copies: Number(printJob.copies || 1),
        pagesPerSheet: Number(printJob.pagesPerSheet || 1),
        nUpOrientation: printJob.nUpOrientation || (Number(printJob.pagesPerSheet) > 1 ? 'horizontal' : 'none'),
        sheetOrientation: printJob.sheetOrientation || printJob.orientation || 'portrait',
        sides: printJob.sides || 'single',
        colorMode: printJob.colorMode || 'B&W',
        paperSize: printJob.paperSize || 'A4',
        paperType: printJob.paperType || '70gsm',
        informationSheetType: determineSheetType(Number(document.pageCount || printJob.originalPageCount || 1)),
        informationSheetPath: infoSheetPath,
        informationSheetChecksum: infoSheetChecksum,
        printReadyPath: printReadyPath,
        printReadyChecksum: printReadyChecksum,
        isComplete: true,
        generatedAt: new Date()
    };
}

module.exports = {
    determineSheetType,
    maskPhoneNumber,
    formatDateIST,
    generatePlainSheet,
    generateCreativeSheet,
    generateAndSaveInformationSheet,
    computeFileSha256,
    createPrintPackageManifest,
    INFO_SHEETS_DIR
};
