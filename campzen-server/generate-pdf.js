const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function createPdf() {
    const pdfDoc = await PDFDocument.create();
    for (let i = 1; i <= 3; i++) {
        const page = pdfDoc.addPage();
        page.drawText(`This is page ${i} of our test PDF!`, { x: 50, y: 700, size: 24 });
    }
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('real-dummy.pdf', pdfBytes);
    console.log('✅ Created real-dummy.pdf with 3 pages!');
}
createPdf();