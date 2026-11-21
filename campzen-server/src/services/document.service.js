const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const Document = require('../models/document.model');

const { execFile } = require('child_process');

/**
 * Execute Python document analyzer
 */
const runPythonAnalysis = (filePath, previewDir) => {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, '../../scripts/analyze_document.py');

        const tryRun = (commands) => {
            if (commands.length === 0) {
                console.warn('[Document Service] All Python execution attempts failed.');
                return resolve(null);
            }

            const { cmd, extraArgs } = commands[0];
            const args = [...extraArgs, scriptPath, filePath];
            if (previewDir) args.push(previewDir);

            execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err) {
                    return tryRun(commands.slice(1));
                }
                try {
                    const parsed = JSON.parse(stdout);
                    if (parsed.error) {
                        console.warn('[Document Service] Python analyzer returned error:', parsed.error);
                        return resolve(null);
                    }
                    resolve(parsed);
                } catch (parseErr) {
                    console.warn('[Document Service] Failed to parse analyzer output:', parseErr.message);
                    tryRun(commands.slice(1));
                }
            });
        };

        tryRun([
            { cmd: 'py', extraArgs: ['-3.14'] },
            { cmd: 'py', extraArgs: ['-3'] },
            { cmd: 'python', extraArgs: [] },
            { cmd: 'python3', extraArgs: [] }
        ]);
    });
};

const processDocument = async (documentId) => {
    try {
        // 1. Mark as processing
        const doc = await Document.findByIdAndUpdate(
            documentId,
            { processingStatus: 'processing', 'analysis.status': 'analyzing' },
            { returnDocument: 'after' }
        );
        if (!doc) throw new Error('Document not found');

        const filePath = path.join(__dirname, '../../uploads', doc.storageKeyOriginal);
        const previewDir = path.join(__dirname, '../../uploads/previews', documentId.toString());

        // 2. Process based on file type
        if (doc.mimeType === 'application/pdf') {
            // First run real Python AI / deterministic document analyzer
            const analysisResult = await runPythonAnalysis(filePath, previewDir);

            let pageCount = 1;
            let qualityFlags = [];

            if (analysisResult && analysisResult.status === 'completed') {
                pageCount = analysisResult.totalPages;

                if (analysisResult.blankPages?.length > 0) qualityFlags.push('blank_pages_detected');
                if (analysisResult.duplicateGroups?.length > 0) qualityFlags.push('duplicate_pages_detected');
                if (analysisResult.qualityIssues?.length > 0) qualityFlags.push('low_res_detected');
                if (analysisResult.rotationIssues?.length > 0) qualityFlags.push('rotation_detected');
                if (analysisResult.marginWarnings?.length > 0) qualityFlags.push('margin_warnings');

                await Document.findByIdAndUpdate(documentId, {
                    pageCount,
                    processingStatus: 'completed',
                    qualityFlags,
                    analysis: {
                        ...analysisResult,
                        analyzedAt: new Date(),
                        status: 'completed'
                    }
                });
                console.log(`[Document Service] AI Analyzed ${doc.originalFilename}: ${pageCount} pages, ${qualityFlags.length} flags.`);
            } else {
                // Graceful fallback to pdf-lib page extraction
                const fileBuffer = fs.readFileSync(filePath);
                const pdfDoc = await PDFDocument.load(fileBuffer);
                pageCount = pdfDoc.getPageCount();

                await Document.findByIdAndUpdate(documentId, {
                    pageCount,
                    processingStatus: 'completed',
                    'analysis.status': 'failed'
                });
                console.log(`[Document Service] Processed ${doc.originalFilename} (Fallback to pdf-lib): ${pageCount} pages.`);
            }
        } else {
            // For images/docs, default to 1 page
            await Document.findByIdAndUpdate(documentId, {
                pageCount: 1,
                processingStatus: 'completed',
                'analysis.status': 'completed',
                'analysis.totalPages': 1
            });
            console.log(`[Document Service] Processed ${doc.originalFilename} (Defaulted to 1 page).`);
        }
    } catch (error) {
        console.error(`[Document Service] Error processing document ${documentId}:`, error.message);
        await Document.findByIdAndUpdate(documentId, {
            processingStatus: 'failed',
            'analysis.status': 'failed'
        });
    }
};

module.exports = { processDocument };