const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { execFile } = require('child_process');
const PrintJob = require('../models/printJob.model');
const PrintSubmissionLog = require('../models/printSubmissionLog.model');
const Document = require('../models/document.model');
const Order = require('../models/order.model');
const OrderEvent = require('../models/orderEvent.model');
const {
    buildPrintReadyPdf,
    calculateExpectedOutput,
    normalizeSides
} = require('./printDocumentBuilder.service');
const informationSheetService = require('./informationSheet.service');

const SCRIPTS_DIR = path.join(__dirname, '../../scripts');
const WIN_PRINT_SCRIPT = fs.existsSync(path.join(SCRIPTS_DIR, 'campzen-win-print.ps1'))
    ? path.join(SCRIPTS_DIR, 'campzen-win-print.ps1')
    : path.join(SCRIPTS_DIR, 'kami-win-print.ps1');
const RENDER_PAGES_SCRIPT = path.join(SCRIPTS_DIR, 'render_print_pages.py');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function execFileAsync(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { maxBuffer: 20 * 1024 * 1024, ...options }, (err, stdout, stderr) => {
            if (err) {
                err.stdout = stdout;
                err.stderr = stderr;
                return reject(err);
            }
            resolve({ stdout, stderr });
        });
    });
}

async function runPythonRender(pdfPath, outputDir, colorMode, colorOutputIndices = []) {
    const colorCsv = Array.isArray(colorOutputIndices) ? colorOutputIndices.join(',') : '';
    const attempts = [
        { cmd: 'py', args: ['-3', RENDER_PAGES_SCRIPT, pdfPath, outputDir, colorMode, colorCsv] },
        { cmd: 'python', args: [RENDER_PAGES_SCRIPT, pdfPath, outputDir, colorMode, colorCsv] },
        { cmd: 'python3', args: [RENDER_PAGES_SCRIPT, pdfPath, outputDir, colorMode, colorCsv] }
    ];

    let lastErr = null;
    for (const attempt of attempts) {
        try {
            const { stdout } = await execFileAsync(attempt.cmd, attempt.args);
            const parsed = JSON.parse(stdout.trim());
            if (!parsed.success) {
                throw new Error(parsed.error || 'Failed to render PDF pages');
            }
            return parsed;
        } catch (err) {
            lastErr = err;
        }
    }
    throw new Error(`Python page renderer failed: ${lastErr ? lastErr.message : 'No Python interpreter found'}`);
}

/**
 * Default Windows Spooler Adapter backed by explicit PrintTicket -> DEVMODE -> Win32 StartDocW.
 */
function createWindowsSpoolerAdapter() {
    return {
        isMock: false,

        async getPrinters() {
            try {
                const ptp = require('pdf-to-printer');
                return await ptp.getPrinters();
            } catch {
                return [];
            }
        },

        async getCapabilities(printerName) {
            if (process.platform !== 'win32') {
                return { exists: false, error: 'Windows print bridge requires win32 host' };
            }
            const { stdout } = await execFileAsync('powershell', [
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-File', WIN_PRINT_SCRIPT,
                '-Action', 'capabilities',
                '-PrinterName', printerName
            ]);
            return JSON.parse(stdout.trim());
        },

        async submitPrintJob(jobSpec) {
            if (process.platform !== 'win32') {
                throw new Error('Windows print bridge requires win32 host');
            }

            const renderDir = path.join(os.tmpdir(), 'campzen-print-render', `${jobSpec.printJobId}_${Date.now()}`);
            const configPath = path.join(renderDir, 'job-config.json');

            try {
                const rendered = await runPythonRender(
                    jobSpec.pdfPath,
                    renderDir,
                    jobSpec.colorMode,
                    jobSpec.colorOutputIndices
                );

                // For Mixed color jobs printed on a color-capable printer, individual pages were already
                // rendered as pure Grayscale vs RGB PNGs, so we instruct the printer driver to allow Color.
                const driverColorMode = jobSpec.colorMode === 'Mixed' ? 'Color' : jobSpec.colorMode;

                const configPayload = {
                    documentName: jobSpec.documentName,
                    sides: jobSpec.sides,
                    copies: jobSpec.copies,
                    paperSize: jobSpec.paperSize,
                    orientation: jobSpec.orientation,
                    colorMode: driverColorMode,
                    collate: jobSpec.collate !== false,
                    fitToPrintableArea: Boolean(jobSpec.fitToPrintableArea),
                    pageImageFiles: rendered.files
                };

                fs.writeFileSync(configPath, JSON.stringify(configPayload, null, 2), 'utf8');

                const { stdout } = await execFileAsync('powershell', [
                    '-NoProfile',
                    '-ExecutionPolicy', 'Bypass',
                    '-File', WIN_PRINT_SCRIPT,
                    '-Action', 'print',
                    '-PrinterName', jobSpec.printerName,
                    '-ConfigPath', configPath
                ]);

                return JSON.parse(stdout.trim());
            } finally {
                // Clean up temporary rendered page PNGs/config without touching uploads/
                try {
                    fs.rmSync(renderDir, { recursive: true, force: true });
                } catch (_) {
                    // Best-effort cleanup
                }
            }
        },

        async getJobStatus(printerName, jobId, documentName) {
            if (process.platform !== 'win32') {
                return { found: false };
            }
            const args = [
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-File', WIN_PRINT_SCRIPT,
                '-Action', 'job-status',
                '-PrinterName', printerName
            ];
            if (jobId) args.push('-JobId', String(jobId));
            if (documentName) args.push('-DocumentName', documentName);
            const { stdout } = await execFileAsync('powershell', args);
            return JSON.parse(stdout.trim());
        },

        async cancelJob(printerName, jobId, documentName) {
            if (process.platform !== 'win32') {
                return { cancelled: false, found: false, reason: 'UNSUPPORTED_PLATFORM' };
            }
            const args = [
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-File', WIN_PRINT_SCRIPT,
                '-Action', 'cancel-job',
                '-PrinterName', printerName
            ];
            if (jobId) args.push('-JobId', String(jobId));
            if (documentName) args.push('-DocumentName', documentName);
            const { stdout } = await execFileAsync('powershell', args);
            return JSON.parse(stdout.trim());
        }
    };
}

/**
 * Virtual spooler adapter used automatically when NODE_ENV === 'test' (unless overridden)
 * so automated tests never emit real physical paper.
 */
function createVirtualTestSpoolerAdapter() {
    let nextJobId = 1000;
    const jobs = new Map();

    return {
        isMock: true,
        submittedJobs: [],

        async getPrinters() {
            return [{ name: process.env.PRINTER_NAME || 'HP LaserJet MFP M72625-M72630 PCL 6' }];
        },

        async getCapabilities(printerName) {
            return {
                exists: true,
                printerName,
                isOffline: false,
                isInError: false,
                isOutOfPaper: false,
                isPaperJammed: false,
                hasPaperProblem: false,
                needUserIntervention: false,
                queueStatus: 'None',
                numberOfJobs: 0,
                supportsColor: false,
                supportsGrayscale: true,
                supportsSimplex: true,
                supportsDuplexLong: true,
                supportsDuplexShort: true,
                hasJobDuplexPrinterDefault: true,
                hasJobEcoType: true,
                defaultHasPrinterDuplexOn: false,
                supportedPaperSizes: ['A4', 'A3', 'Legal', 'Letter']
            };
        },

        async submitPrintJob(jobSpec) {
            const jobId = nextJobId++;
            const dmDuplex = jobSpec.sides === 'double' ? 2 : jobSpec.sides === 'duplexshort' ? 3 : 1;
            const entry = {
                success: true,
                printerName: jobSpec.printerName,
                spoolerJobId: jobId,
                spoolerDocumentName: jobSpec.documentName,
                pagesSubmitted: jobSpec.expectedPagesPerCopy,
                dmCopies: jobSpec.copies,
                dmDuplex,
                duplexMode: dmDuplex === 2 ? 'psk:TwoSidedLongEdge' : dmDuplex === 3 ? 'psk:TwoSidedShortEdge' : 'psk:OneSided',
                printerDefaultDuplexDisabled: true,
                ecoDefaultDisabled: true,
                driverVerified: true,
                spec: jobSpec
            };
            jobs.set(jobId, {
                found: true,
                jobId,
                name: jobSpec.documentName,
                jobStatus: 'Printed',
                isSpooling: false,
                isPrinting: false,
                isPrinted: true,
                isPaused: false,
                isDeleting: false,
                isDeleted: false,
                isOffline: false,
                isPaperOut: false,
                isInError: false,
                numberOfPages: jobSpec.expectedPagesPerCopy * jobSpec.copies,
                numberOfPagesPrinted: jobSpec.expectedPagesPerCopy * jobSpec.copies
            });
            this.submittedJobs.push(entry);
            return entry;
        },

        async getJobStatus(_printerName, jobId, documentName) {
            if (jobId && jobs.has(jobId)) {
                return jobs.get(jobId);
            }
            if (documentName) {
                for (const j of jobs.values()) {
                    if (j.name === documentName) return j;
                }
            }
            return { found: false };
        },

        async cancelJob(_printerName, jobId) {
            if (jobId && jobs.has(jobId)) {
                const job = jobs.get(jobId);
                if (job.isPrinted) {
                    return { cancelled: false, found: true, reason: 'ALREADY_PRINTED', message: 'Job already finished printing.' };
                }
                jobs.delete(jobId);
                return { cancelled: true, found: true, wasAlreadyPrinting: false, message: 'Cancelled in spooler.' };
            }
            return { cancelled: false, found: false, reason: 'NOT_IN_SPOOLER', message: 'Job not found in spooler.' };
        }
    };
}

/**
 * Service to dispatch and reconcile print jobs with explicit per-job DEVMODE settings and strict idempotency.
 */
class PrinterService {
    constructor() {
        this.defaultPrinterName = process.env.PRINTER_NAME || 'HP LaserJet MFP M72625-M72630 PCL 6';
        this.agentId = `campzen-agent-${os.hostname()}-${process.pid}`;
        this.inFlightOrders = new Set();
        this.watcherInterval = null;
        this._isWatcherPolling = false;
        this.spoolerAdapter = this._resolveDefaultAdapter();
    }

    _resolveDefaultAdapter() {
        if (process.env.NODE_ENV === 'test' && process.env.KAMI_ENABLE_HARDWARE_PRINT !== 'true') {
            return createVirtualTestSpoolerAdapter();
        }
        return createWindowsSpoolerAdapter();
    }

    setSpoolerAdapter(adapter) {
        this.spoolerAdapter = adapter || this._resolveDefaultAdapter();
    }

    resetSpoolerAdapter() {
        this.spoolerAdapter = this._resolveDefaultAdapter();
    }

    getPrinterName(customPrinterName = null) {
        return customPrinterName || process.env.PRINTER_NAME || this.defaultPrinterName || 'HP LaserJet MFP M72625-M72630 PCL 6';
    }

    resolveSideOption(sides) {
        const normalized = normalizeSides(sides);
        if (normalized === 'double') return 'duplex';
        if (normalized === 'duplexshort') return 'duplexshort';
        return 'simplex';
    }

    async getPrinters() {
        try {
            return await this.spoolerAdapter.getPrinters();
        } catch (error) {
            console.error('[PrinterService] Error getting printers:', error.message);
            return [];
        }
    }

    /**
     * Validate requested print job configuration against physical printer capabilities.
     * Never silently substitutes SINGLE <-> DOUBLE or unsupported Color/PaperSize.
     */
    validatePrinterCompatibility(capabilities, printJob) {
        const incompatibilities = [];

        if (!capabilities || !capabilities.exists) {
            incompatibilities.push({
                code: 'PRINTER_NOT_FOUND',
                message: capabilities?.error || 'Configured printer was not found on this host.'
            });
            return { compatible: false, printerAvailable: false, incompatibilities };
        }

        if (capabilities.isOffline) {
            incompatibilities.push({
                code: 'PRINTER_OFFLINE',
                message: `Printer "${capabilities.printerName}" is currently offline.`
            });
        }
        if (capabilities.isOutOfPaper || capabilities.isPaperJammed || capabilities.hasPaperProblem || capabilities.isInError || capabilities.needUserIntervention) {
            incompatibilities.push({
                code: 'PRINTER_HARDWARE_ALERT',
                message: `Printer "${capabilities.printerName}" has a hardware alert (${capabilities.queueStatus || 'Error'}).`
            });
        }

        const sides = normalizeSides(printJob.sides || 'single');
        if (sides === 'single' && capabilities.supportsSimplex === false) {
            incompatibilities.push({
                code: 'INCOMPATIBLE_SIMPLEX',
                message: `Printer "${capabilities.printerName}" does not support single-sided printing.`
            });
        }
        if (sides === 'double' && capabilities.supportsDuplexLong === false) {
            incompatibilities.push({
                code: 'INCOMPATIBLE_DUPLEX',
                message: `Printer "${capabilities.printerName}" does not support double-sided printing.`
            });
        }
        if (sides === 'duplexshort' && capabilities.supportsDuplexShort === false) {
            incompatibilities.push({
                code: 'INCOMPATIBLE_DUPLEX_SHORT',
                message: `Printer "${capabilities.printerName}" does not support short-edge duplex printing.`
            });
        }

        const colorMode = printJob.colorMode || 'B&W';
        const wantsColor = colorMode === 'Color' || colorMode === 'Mixed';
        if (wantsColor && capabilities.supportsColor === false) {
            incompatibilities.push({
                code: 'INCOMPATIBLE_COLOR_MODE',
                message: `Printer "${capabilities.printerName}" is monochrome-only and cannot print ${colorMode} jobs.`
            });
        }

        const paperSize = printJob.paperSize || 'A4';
        if (Array.isArray(capabilities.supportedPaperSizes) && capabilities.supportedPaperSizes.length > 0 && !capabilities.supportedPaperSizes.includes(paperSize)) {
            incompatibilities.push({
                code: 'INCOMPATIBLE_PAPER_SIZE',
                message: `Printer "${capabilities.printerName}" does not support paper size "${paperSize}".`
            });
        }

        return {
            compatible: incompatibilities.length === 0,
            printerAvailable: !capabilities.isOffline && !capabilities.isInError,
            incompatibilities
        };
    }

    /**
     * Build safe structured diagnostics log (strictly excluding PII, tokens, credentials, and raw doc content).
     */
    emitDiagnosticsLog(payload) {
        const safeLog = {
            timestamp: new Date().toISOString(),
            orderId: payload.orderId ? String(payload.orderId) : null,
            printJobId: payload.printJobId ? String(payload.printJobId) : null,
            documentVersionId: payload.documentVersionId || null,
            requestedCopies: payload.requestedCopies,
            requestedSides: payload.requestedSides,
            requestedColorMode: payload.requestedColorMode,
            requestedPaperSize: payload.requestedPaperSize,
            requestedPaperType: payload.requestedPaperType,
            pageRange: payload.pageRange,
            originalPageCount: payload.originalPageCount,
            finalPrintReadyPageCount: payload.finalPrintReadyPageCount,
            expectedSheets: payload.expectedSheets,
            expectedImpressions: payload.expectedImpressions,
            submissionCount: payload.submissionCount,
            idempotencyKey: payload.idempotencyKey || null,
            agentId: this.agentId,
            printerId: payload.printerId || null,
            spoolerJobId: payload.spoolerJobId ?? null,
            submittedAt: payload.submittedAt || null,
            spoolerStatus: payload.spoolerStatus || null,
            errorCode: payload.errorCode || null,
            vendorConfirmed: Boolean(payload.vendorConfirmed)
        };
        console.log('[PrintDiagnostics]', JSON.stringify(safeLog));
        return safeLog;
    }

    /**
     * Prepare (or load cached) 1-copy print-ready PDF and return authoritative Safe Print Preview metadata.
     */
    async getPrintPreview(orderId, customPrinterName = null) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Order not found');

        const printJob = await PrintJob.findOne({ orderId: order._id });
        if (!printJob) throw new Error('Print job details not found for this order');

        const doc = await Document.findById(printJob.documentId);
        if (!doc || !doc.storageKeyOriginal) {
            throw new Error('Document or file storage key not found');
        }

        const sourcePath = path.join(UPLOADS_DIR, doc.storageKeyOriginal);
        const readyRelKey = path.join('print-ready', `${printJob._id}.pdf`);
        const readyAbsPath = path.join(UPLOADS_DIR, readyRelKey);

        const prepared = await buildPrintReadyPdf({
            sourcePath,
            printJob,
            outputPath: readyAbsPath
        });

        const targetPrinter = this.getPrinterName(customPrinterName);
        const capabilities = await this.spoolerAdapter.getCapabilities(targetPrinter);
        const validation = this.validatePrinterCompatibility(capabilities, printJob);

        // Persist validated metadata snapshot on PrintJob without altering submission counts or active leases
        const docVersionId = `${doc._id}:${doc.storageKeyOriginal}:${doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0}`;
        const nextState = printJob.executionState === 'CREATED'
            ? (['PAID', 'SENT_TO_SHOP', 'ACCEPTED'].includes(order.status) ? 'READY_FOR_AGENT' : 'VALIDATED')
            : printJob.executionState;

        await PrintJob.findByIdAndUpdate(printJob._id, {
            $set: {
                documentVersionId: docVersionId,
                originalPageCount: prepared.originalPageCount,
                finalPrintReadyPageCount: prepared.finalPrintReadyPageCount,
                expectedSheets: prepared.expectedSheets,
                expectedImpressions: prepared.expectedImpressions,
                printReadyStorageKey: readyRelKey,
                executionState: nextState
            }
        });

        return {
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            printJobId: printJob._id,
            executionState: nextState,
            submissionCount: printJob.submissionCount || 0,
            spoolerJobId: printJob.spoolerJobId || null,
            spoolerStatus: printJob.spoolerStatus || null,
            vendorConfirmed: Boolean(printJob.vendorConfirmed),
            requestedSettings: {
                documentPages: prepared.originalPageCount,
                printablePages: prepared.finalPrintReadyPageCount,
                copies: prepared.copies,
                colorMode: printJob.colorMode || 'B&W',
                sides: prepared.sides === 'double' ? 'DOUBLE-SIDED' : prepared.sides === 'duplexshort' ? 'DOUBLE-SIDED (SHORT EDGE)' : 'SINGLE-SIDED',
                rawSides: prepared.sides,
                paperSize: printJob.paperSize || 'A4',
                paperType: printJob.paperType || '70gsm',
                pageRange: printJob.pageRange || 'all',
                orientation: printJob.orientation || 'portrait',
                pagesPerSheet: printJob.pagesPerSheet || 1
            },
            expectedOutput: {
                expectedImpressions: prepared.expectedImpressions,
                expectedSheets: prepared.expectedSheets
            },
            printer: {
                printerName: targetPrinter,
                exists: Boolean(capabilities.exists),
                isOffline: Boolean(capabilities.isOffline),
                queueStatus: capabilities.queueStatus || 'Unknown',
                supportsColor: Boolean(capabilities.supportsColor),
                supportsDuplex: Boolean(capabilities.supportsDuplexLong),
                supportsSimplex: Boolean(capabilities.supportsSimplex),
                defaultHasPrinterDuplexOn: Boolean(capabilities.defaultHasPrinterDuplexOn)
            },
            compatible: validation.compatible,
            incompatibilities: validation.incompatibilities,
            prepared
        };
    }

    /**
     * Direct print helper for calibration scripts (not tied to DB Orders).
     */
    async printDirect(filePath, options = {}) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`);
        }
        const targetPrinter = this.getPrinterName(options.printer);
        const sides = normalizeSides(options.sides || options.side || 'single');
        const copies = Number(options.copies || 1);
        const colorMode = options.colorMode || (options.monochrome === false ? 'Color' : 'B&W');

        const prepared = await buildPrintReadyPdf({
            sourcePath: filePath,
            printJob: {
                copies,
                sides,
                colorMode,
                paperSize: options.paperSize || 'A4',
                pageRange: options.pages || 'all',
                pagesPerSheet: 1
            },
            outputPath: path.join(os.tmpdir(), `campzen-direct-${Date.now()}.pdf`)
        });

        try {
            const capabilities = await this.spoolerAdapter.getCapabilities(targetPrinter);
            const validation = this.validatePrinterCompatibility(capabilities, {
                sides,
                colorMode,
                paperSize: options.paperSize || 'A4'
            });
            if (!validation.compatible) {
                throw new Error(validation.incompatibilities.map((i) => i.message).join('; '));
            }

            const result = await this.spoolerAdapter.submitPrintJob({
                printJobId: `direct_${Date.now()}`,
                printerName: targetPrinter,
                documentName: `CampZen-Direct-${path.basename(filePath)}`,
                pdfPath: prepared.outputPath,
                sides,
                copies: prepared.copies,
                paperSize: options.paperSize || 'A4',
                orientation: options.orientation || 'portrait',
                colorMode,
                colorOutputIndices: prepared.colorOutputIndices,
                expectedPagesPerCopy: prepared.finalPrintReadyPageCount,
                collate: options.collate !== false,
                fitToPrintableArea: Boolean(options.fitToPrintableArea || options.scale === 'fit')
            });

            if (!result.success) {
                throw new Error(result.message || result.errorCode || 'Direct print submission failed');
            }

            return {
                success: true,
                printer: targetPrinter,
                file: path.basename(filePath),
                side: this.resolveSideOption(sides),
                copies: prepared.copies,
                spoolerJobId: result.spoolerJobId,
                dmCopies: result.dmCopies,
                dmDuplex: result.dmDuplex
            };
        } finally {
            try {
                fs.rmSync(prepared.outputPath, { force: true });
            } catch (_) {}
        }
    }

    /**
     * Authoritative, idempotent print execution for an Order.
     * Guarantees at most ONE spooler submission per logical PrintJob unless explicitly reconciled & retried.
     */
    async printOrder(orderId, optionsOrPrinterName = null) {
        const options = typeof optionsOrPrinterName === 'string'
            ? { printerName: optionsOrPrinterName }
            : (optionsOrPrinterName || {});

        const orderKey = String(orderId);
        if (this.inFlightOrders.has(orderKey)) {
            return {
                success: true,
                deduplicated: true,
                inProgress: true,
                message: 'Print submission already in progress for this order.'
            };
        }

        this.inFlightOrders.add(orderKey);
        try {
            const order = await Order.findById(orderId);
            if (!order) throw new Error('Order not found');

            if (['CANCELLED', 'REJECTED', 'EXPIRED', 'REFUNDED'].includes(order.status)) {
                throw new Error(`Cannot print order #${order.orderNumber} because its status is ${order.status}.`);
            }

            // Authoritative 60-second editing window lock
            if (process.env.KAMI_ALLOW_TEST_AUTOPRINT !== 'true' && order.editWindowEndsAt && Date.now() < new Date(order.editWindowEndsAt).getTime()) {
                const remainingSec = Math.max(1, Math.ceil((new Date(order.editWindowEndsAt).getTime() - Date.now()) / 1000));
                const err = new Error(`Order #${order.orderNumber} is still within its 60-second editing window (${remainingSec}s remaining). Print dispatch unlocks after editing deadline.`);
                err.code = 'ORDER_IN_EDIT_WINDOW';
                throw err;
            }

            const existingPrintJob = await PrintJob.findOne({ orderId: order._id });
            if (!existingPrintJob) {
                throw new Error('Print job details not found for this order');
            }

            if (existingPrintJob.executionState === 'CANCELLED') {
                throw new Error(`Print job for order #${order.orderNumber} was cancelled before submission.`);
            }

            // Deduplicate already-submitted or completed jobs
            if (['ACCEPTED_BY_SPOOLER', 'PRINT_STATUS_PENDING', 'PRINTED_PENDING_QC', 'COMPLETED'].includes(existingPrintJob.executionState)) {
                return {
                    success: true,
                    deduplicated: true,
                    alreadySubmitted: true,
                    executionState: existingPrintJob.executionState,
                    spoolerJobId: existingPrintJob.spoolerJobId,
                    submissionCount: existingPrintJob.submissionCount,
                    status: order.status,
                    message: `Order #${order.orderNumber} was already submitted (Spooler Job #${existingPrintJob.spoolerJobId}).`
                };
            }

            if (existingPrintJob.executionState === 'RECONCILIATION_REQUIRED') {
                return {
                    success: false,
                    reconciliationRequired: true,
                    executionState: 'RECONCILIATION_REQUIRED',
                    message: `Order #${order.orderNumber} requires spooler reconciliation before any retry.`
                };
            }

            if (existingPrintJob.executionState === 'SUBMITTING') {
                const isExpired = existingPrintJob.leaseExpiresAt && existingPrintJob.leaseExpiresAt.getTime() < Date.now();
                if (!isExpired) {
                    return {
                        success: true,
                        deduplicated: true,
                        inProgress: true,
                        executionState: 'SUBMITTING',
                        message: `Order #${order.orderNumber} is currently being submitted.`
                    };
                }
                // Lease expired (crashed prior agent): escalate to reconciliation rather than blind duplicate print
                await PrintJob.findByIdAndUpdate(existingPrintJob._id, {
                    $set: {
                        executionState: 'RECONCILIATION_REQUIRED',
                        reconciliationNote: 'Previous print submission lease expired before completion; reconcile with spooler before retrying.'
                    }
                });
                return {
                    success: false,
                    reconciliationRequired: true,
                    executionState: 'RECONCILIATION_REQUIRED',
                    message: `Previous submission lease expired; reconcile order #${order.orderNumber} with spooler.`
                };
            }

            if (['SUBMISSION_FAILED', 'PRINTER_OFFLINE'].includes(existingPrintJob.executionState) && !options.isExplicitRetry) {
                return {
                    success: false,
                    executionState: existingPrintJob.executionState,
                    errorCode: existingPrintJob.lastErrorCode,
                    message: existingPrintJob.lastErrorMessage || `Order #${order.orderNumber} failed prior submission and requires explicit retry.`
                };
            }

            // Pre-flight PDF generation & hardware capability validation BEFORE claiming submission
            const targetPrinter = this.getPrinterName(options.printerName);
            const preview = await this.getPrintPreview(order._id, targetPrinter);
            const prepared = preview.prepared;

            if (!preview.compatible) {
                const firstErr = preview.incompatibilities[0] || { code: 'INCOMPATIBLE_PRINTER', message: 'Printer incompatible' };
                const failState = firstErr.code === 'PRINTER_OFFLINE' || firstErr.code === 'PRINTER_HARDWARE_ALERT'
                    ? 'PRINTER_OFFLINE'
                    : 'SUBMISSION_FAILED';

                await PrintJob.findByIdAndUpdate(existingPrintJob._id, {
                    $set: {
                        executionState: failState,
                        printerId: targetPrinter,
                        lastErrorCode: firstErr.code,
                        lastErrorMessage: firstErr.message
                    }
                });

                this.emitDiagnosticsLog({
                    orderId: order._id,
                    printJobId: existingPrintJob._id,
                    documentVersionId: existingPrintJob.documentVersionId,
                    requestedCopies: prepared.copies,
                    requestedSides: prepared.sides,
                    requestedColorMode: existingPrintJob.colorMode,
                    requestedPaperSize: existingPrintJob.paperSize,
                    requestedPaperType: existingPrintJob.paperType,
                    pageRange: existingPrintJob.pageRange,
                    originalPageCount: prepared.originalPageCount,
                    finalPrintReadyPageCount: prepared.finalPrintReadyPageCount,
                    expectedSheets: prepared.expectedSheets,
                    expectedImpressions: prepared.expectedImpressions,
                    submissionCount: existingPrintJob.submissionCount || 0,
                    printerId: targetPrinter,
                    spoolerStatus: failState,
                    errorCode: firstErr.code
                });

                const err = new Error(firstErr.message);
                err.code = firstErr.code;
                throw err;
            }

            // Atomic lease claim: only ONE caller can transition from READY_FOR_AGENT/VALIDATED/CREATED -> SUBMITTING
            const leaseId = crypto.randomUUID();
            const leaseExpiresAt = new Date(Date.now() + 120000);
            const baseKey = existingPrintJob.submissionIdempotencyKey || `pj_${existingPrintJob._id}`;
            const nextAttemptNum = (existingPrintJob.submissionCount || 0) + 1;
            const logIdempotencyKey = nextAttemptNum === 1 ? baseKey : `${baseKey}_retry_${nextAttemptNum}`;
            const spoolerDocumentName = `CampZen-${order.orderNumber}-${existingPrintJob._id.toString().slice(-6)}-A${nextAttemptNum}`;

            const allowedClaimStates = options.isExplicitRetry
                ? ['CREATED', 'VALIDATED', 'READY_FOR_AGENT', 'SUBMISSION_FAILED', 'PRINTER_OFFLINE', 'RECONCILIATION_REQUIRED']
                : ['CREATED', 'VALIDATED', 'READY_FOR_AGENT'];

            const claimed = await PrintJob.findOneAndUpdate(
                {
                    _id: existingPrintJob._id,
                    executionState: { $in: allowedClaimStates }
                },
                {
                    $set: {
                        executionState: 'SUBMITTING',
                        submissionIdempotencyKey: baseKey,
                        activeLeaseId: leaseId,
                        leaseExpiresAt,
                        agentId: this.agentId,
                        printerId: targetPrinter,
                        spoolerDocumentName,
                        submittedAt: new Date(),
                        lastErrorCode: null,
                        lastErrorMessage: null
                    },
                    $inc: { submissionCount: 1 }
                },
                { returnDocument: 'after' }
            );

            if (!claimed) {
                // Lost race to another concurrent caller
                const fresh = await PrintJob.findById(existingPrintJob._id);
                return {
                    success: true,
                    deduplicated: true,
                    alreadySubmitted: true,
                    executionState: fresh ? fresh.executionState : 'SUBMITTING',
                    spoolerJobId: fresh ? fresh.spoolerJobId : null,
                    message: `Order #${order.orderNumber} was already claimed for printing.`
                };
            }

            // Persist PrintSubmissionLog BEFORE calling spooler so crash-recovery always has an audit anchor
            let submissionLog;
            try {
                submissionLog = await PrintSubmissionLog.create({
                    printJobId: claimed._id,
                    orderId: order._id,
                    idempotencyKey: logIdempotencyKey,
                    attemptNumber: claimed.submissionCount,
                    agentId: this.agentId,
                    printerId: targetPrinter,
                    spoolerDocumentName,
                    executionState: 'SUBMITTING',
                    requestedConfig: {
                        copies: prepared.copies,
                        sides: prepared.sides,
                        colorMode: claimed.colorMode || 'B&W',
                        paperSize: claimed.paperSize || 'A4',
                        paperType: claimed.paperType || '70gsm',
                        pageRange: claimed.pageRange || 'all',
                        orientation: claimed.orientation || 'portrait',
                        originalPageCount: prepared.originalPageCount,
                        finalPrintReadyPageCount: prepared.finalPrintReadyPageCount,
                        expectedSheets: prepared.expectedSheets,
                        expectedImpressions: prepared.expectedImpressions
                    }
                });
            } catch (logErr) {
                if (logErr.code === 11000) {
                    return {
                        success: true,
                        deduplicated: true,
                        alreadySubmitted: true,
                        message: `Duplicate submission blocked by idempotency key ${logIdempotencyKey}.`
                    };
                }
                throw logErr;
            }

            // 1. Ensure authoritative Information Sheet exists and is validated on disk
            let infoSheetKey = order.informationSheetKey || claimed.informationSheetKey;
            let infoSheetAbsPath = infoSheetKey ? path.join(UPLOADS_DIR, infoSheetKey) : null;
            if (!infoSheetAbsPath || !fs.existsSync(infoSheetAbsPath)) {
                const documentDoc = await Document.findById(claimed.documentId);
                if (!documentDoc) {
                    throw new Error('Document record not found for information sheet generation.');
                }
                const sheetInfo = await informationSheetService.generateAndSaveInformationSheet({
                    order: {
                        ...order.toObject(),
                        userName: order.userId?.name,
                        userPhone: order.userId?.phone,
                        userUSN: order.userId?.usn || order.userId?.studentId,
                        collegeName: order.userId?.collegeName
                    },
                    document: documentDoc,
                    printJob: claimed
                });
                infoSheetKey = sheetInfo.relativeKey;
                infoSheetAbsPath = sheetInfo.absolutePath;
                order.informationSheetKey = infoSheetKey;
                order.informationSheetType = sheetInfo.sheetType;
                order.informationSheetGeneratedAt = new Date();
                await order.save();
                claimed.informationSheetKey = infoSheetKey;
                claimed.informationSheetType = sheetInfo.sheetType;
            }

            // 2. Build and validate internal print package manifest
            const documentRecord = await Document.findById(claimed.documentId);
            const packageManifest = informationSheetService.createPrintPackageManifest({
                order,
                document: documentRecord,
                printJob: claimed,
                infoSheetPath: infoSheetAbsPath,
                printReadyPath: prepared.outputPath
            });
            claimed.printPackageManifest = packageManifest;
            await claimed.save();

            // 3. Spool the Information Sheet FIRST (1 copy, simplex, standard A4 1-Up portrait)
            const infoSpoolerDocName = `CampZen-${order.orderNumber}-InfoSheet-A${nextAttemptNum}`;
            try {
                await this.spoolerAdapter.submitPrintJob({
                    printJobId: `${claimed._id}_info`,
                    printerName: targetPrinter,
                    documentName: infoSpoolerDocName,
                    pdfPath: infoSheetAbsPath,
                    sides: 'single',
                    copies: 1,
                    paperSize: 'A4',
                    orientation: 'portrait',
                    colorMode: claimed.informationSheetType === 'creative' ? 'Color' : 'B&W',
                    colorOutputIndices: claimed.informationSheetType === 'creative' ? [1] : [],
                    expectedPagesPerCopy: 1,
                    collate: false,
                    fitToPrintableArea: false
                });
            } catch (infoErr) {
                console.error('[PrinterService] Failed to spool front information sheet:', infoErr.message);
                let foundInSpooler = null;
                try {
                    foundInSpooler = await this.spoolerAdapter.getJobStatus(targetPrinter, 0, infoSpoolerDocName);
                } catch (_) {}

                const nextFailState = (foundInSpooler && foundInSpooler.found)
                    ? 'RECONCILIATION_REQUIRED'
                    : (infoErr.code === 'PRINTER_OFFLINE' ? 'PRINTER_OFFLINE' : 'SUBMISSION_FAILED');

                await PrintJob.findByIdAndUpdate(claimed._id, {
                    $set: {
                        executionState: nextFailState,
                        activeLeaseId: null,
                        leaseExpiresAt: null,
                        spoolerJobId: foundInSpooler?.jobId || null,
                        spoolerStatus: foundInSpooler?.jobStatus || 'ERROR',
                        lastErrorCode: infoErr.code || 'INFO_SHEET_SUBMIT_ERROR',
                        lastErrorMessage: infoErr.message
                    }
                });

                throw new Error(`Front Information Sheet dispatch failed: ${infoErr.message}. Original document printing blocked.`);
            }

            // 4. Submit original document to Spooler Adapter with explicit DEVMODE parameters
            let spoolerResult;
            const docOrientation = prepared.sheetOrientation || claimed.sheetOrientation || claimed.orientation || 'portrait';
            try {
                spoolerResult = await this.spoolerAdapter.submitPrintJob({
                    printJobId: claimed._id.toString(),
                    printerName: targetPrinter,
                    documentName: spoolerDocumentName,
                    pdfPath: prepared.outputPath,
                    sides: prepared.sides,
                    copies: prepared.copies,
                    paperSize: claimed.paperSize || 'A4',
                    orientation: docOrientation,
                    colorMode: claimed.colorMode || 'B&W',
                    colorOutputIndices: prepared.colorOutputIndices,
                    expectedPagesPerCopy: prepared.finalPrintReadyPageCount,
                    collate: claimed.collate !== false,
                    fitToPrintableArea: Boolean(claimed.fitToPrintableArea)
                });
            } catch (submitErr) {
                // If process crashed/errored mid-submission, inspect spooler before marking safe to retry
                let foundInSpooler = null;
                try {
                    foundInSpooler = await this.spoolerAdapter.getJobStatus(targetPrinter, 0, spoolerDocumentName);
                } catch (_) {}

                const nextFailState = (foundInSpooler && foundInSpooler.found)
                    ? 'RECONCILIATION_REQUIRED'
                    : (submitErr.code === 'PRINTER_OFFLINE' ? 'PRINTER_OFFLINE' : 'SUBMISSION_FAILED');

                await PrintJob.findByIdAndUpdate(claimed._id, {
                    $set: {
                        executionState: nextFailState,
                        activeLeaseId: null,
                        leaseExpiresAt: null,
                        spoolerJobId: foundInSpooler?.jobId || null,
                        spoolerStatus: foundInSpooler?.jobStatus || 'ERROR',
                        lastErrorCode: submitErr.code || 'SPOOLER_SUBMIT_ERROR',
                        lastErrorMessage: submitErr.message
                    }
                });

                await PrintSubmissionLog.findByIdAndUpdate(submissionLog._id, {
                    $set: {
                        executionState: nextFailState,
                        spoolerJobId: foundInSpooler?.jobId || null,
                        spoolerStatus: foundInSpooler?.jobStatus || 'ERROR',
                        errorCode: submitErr.code || 'SPOOLER_SUBMIT_ERROR',
                        errorMessage: submitErr.message,
                        finishedAt: new Date()
                    }
                });

                this.emitDiagnosticsLog({
                    orderId: order._id,
                    printJobId: claimed._id,
                    documentVersionId: claimed.documentVersionId,
                    requestedCopies: prepared.copies,
                    requestedSides: prepared.sides,
                    requestedColorMode: claimed.colorMode,
                    requestedPaperSize: claimed.paperSize,
                    requestedPaperType: claimed.paperType,
                    pageRange: claimed.pageRange,
                    originalPageCount: prepared.originalPageCount,
                    finalPrintReadyPageCount: prepared.finalPrintReadyPageCount,
                    expectedSheets: prepared.expectedSheets,
                    expectedImpressions: prepared.expectedImpressions,
                    submissionCount: claimed.submissionCount,
                    idempotencyKey: logIdempotencyKey,
                    printerId: targetPrinter,
                    spoolerJobId: foundInSpooler?.jobId || null,
                    submittedAt: claimed.submittedAt,
                    spoolerStatus: nextFailState,
                    errorCode: submitErr.code || 'SPOOLER_SUBMIT_ERROR'
                });

                throw submitErr;
            }

            if (!spoolerResult || !spoolerResult.success) {
                const errCode = spoolerResult?.errorCode || 'DRIVER_REJECTED';
                const failState = errCode === 'PRINTER_OFFLINE' ? 'PRINTER_OFFLINE' : 'SUBMISSION_FAILED';
                const errMsg = spoolerResult?.message || 'Printer spooler rejected the print job';

                await PrintJob.findByIdAndUpdate(claimed._id, {
                    $set: {
                        executionState: failState,
                        activeLeaseId: null,
                        leaseExpiresAt: null,
                        spoolerStatus: failState,
                        lastErrorCode: errCode,
                        lastErrorMessage: errMsg
                    }
                });

                await PrintSubmissionLog.findByIdAndUpdate(submissionLog._id, {
                    $set: {
                        executionState: failState,
                        spoolerStatus: failState,
                        errorCode: errCode,
                        errorMessage: errMsg,
                        finishedAt: new Date()
                    }
                });

                const rejErr = new Error(errMsg);
                rejErr.code = errCode;
                throw rejErr;
            }

            // Accepted by Windows Spooler with verified DEVMODE!
            // Transition PrintJob to PRINTED_PENDING_QC so UI never falsely marks physical output complete
            // without vendor confirmation.
            const finalSpoolerState = 'PRINTED_PENDING_QC';
            const acceptedAt = new Date();
            const appliedSettings = {
                copies: prepared.copies,
                sides: prepared.sides,
                duplexMode: spoolerResult.duplexMode,
                colorMode: claimed.colorMode || 'B&W',
                paperSize: claimed.paperSize || 'A4',
                paperType: claimed.paperType || '70gsm',
                pageRange: claimed.pageRange || 'all',
                orientation: claimed.orientation || 'portrait',
                dmCopies: spoolerResult.dmCopies,
                dmDuplex: spoolerResult.dmDuplex,
                printerDefaultDuplexDisabled: Boolean(spoolerResult.printerDefaultDuplexDisabled)
            };

            await PrintJob.findByIdAndUpdate(claimed._id, {
                $set: {
                    executionState: finalSpoolerState,
                    activeLeaseId: null,
                    leaseExpiresAt: null,
                    spoolerJobId: spoolerResult.spoolerJobId,
                    spoolerStatus: 'ACCEPTED_BY_SPOOLER',
                    acceptedBySpoolerAt: acceptedAt,
                    appliedSettings
                }
            });

            await PrintSubmissionLog.findByIdAndUpdate(submissionLog._id, {
                $set: {
                    executionState: 'ACCEPTED_BY_SPOOLER',
                    spoolerJobId: spoolerResult.spoolerJobId,
                    spoolerStatus: 'ACCEPTED_BY_SPOOLER',
                    appliedDriverConfig: {
                        dmCopies: spoolerResult.dmCopies,
                        dmDuplex: spoolerResult.dmDuplex,
                        printerDefaultDuplexDisabled: Boolean(spoolerResult.printerDefaultDuplexDisabled),
                        ecoDefaultDisabled: Boolean(spoolerResult.ecoDefaultDisabled),
                        driverVerified: Boolean(spoolerResult.driverVerified)
                    },
                    finishedAt: new Date()
                }
            });

            // Transition Order to PRINTING if not already
            if (['PAID', 'SENT_TO_SHOP', 'ACCEPTED'].includes(order.status)) {
                const prevStatus = order.status;
                order.status = 'PRINTING';
                await order.save();

                if (!options.skipOrderEvent) {
                    await OrderEvent.create({
                        orderId: order._id,
                        fromStatus: prevStatus,
                        toStatus: 'PRINTING',
                        actorId: options.actorId || order.userId,
                        note: `Submitted to ${targetPrinter} (Spooler Job #${spoolerResult.spoolerJobId})`
                    });
                }
            }

            this.emitDiagnosticsLog({
                orderId: order._id,
                printJobId: claimed._id,
                documentVersionId: claimed.documentVersionId,
                requestedCopies: prepared.copies,
                requestedSides: prepared.sides,
                requestedColorMode: claimed.colorMode,
                requestedPaperSize: claimed.paperSize,
                requestedPaperType: claimed.paperType,
                pageRange: claimed.pageRange,
                originalPageCount: prepared.originalPageCount,
                finalPrintReadyPageCount: prepared.finalPrintReadyPageCount,
                expectedSheets: prepared.expectedSheets,
                expectedImpressions: prepared.expectedImpressions,
                submissionCount: claimed.submissionCount,
                idempotencyKey: logIdempotencyKey,
                printerId: targetPrinter,
                spoolerJobId: spoolerResult.spoolerJobId,
                submittedAt: claimed.submittedAt,
                spoolerStatus: 'ACCEPTED_BY_SPOOLER',
                vendorConfirmed: false
            });

            return {
                success: true,
                deduplicated: false,
                orderNumber: order.orderNumber,
                status: order.status,
                executionState: finalSpoolerState,
                spoolerJobId: spoolerResult.spoolerJobId,
                spoolerDocumentName,
                submissionCount: claimed.submissionCount,
                appliedSettings,
                expectedOutput: {
                    expectedImpressions: prepared.expectedImpressions,
                    expectedSheets: prepared.expectedSheets
                },
                message: `Accepted by Windows Spooler (Job #${spoolerResult.spoolerJobId}) on ${targetPrinter}. Verify physical output.`
            };
        } finally {
            this.inFlightOrders.delete(orderKey);
        }
    }

    /**
     * Reconcile an interrupted, ambiguous, or in-flight print submission against the Windows Spooler.
     */
    async reconcilePrintJob(orderId) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Order not found');

        const printJob = await PrintJob.findOne({ orderId: order._id });
        if (!printJob) throw new Error('Print job not found');

        const printerName = this.getPrinterName(printJob.printerId);
        const spoolerInfo = await this.spoolerAdapter.getJobStatus(
            printerName,
            printJob.spoolerJobId || 0,
            printJob.spoolerDocumentName || ''
        );

        let newState = printJob.executionState;
        let note = '';

        if (spoolerInfo && spoolerInfo.found) {
            if (spoolerInfo.isPrinted) {
                newState = 'PRINTED_PENDING_QC';
                note = `Reconciled: Spooler Job #${spoolerInfo.jobId} completed spooling; awaiting vendor physical QC.`;
            } else if (spoolerInfo.isInError || spoolerInfo.isPaperOut || spoolerInfo.isOffline) {
                newState = 'PRINTER_OFFLINE';
                note = `Reconciled: Spooler Job #${spoolerInfo.jobId} stalled (${spoolerInfo.jobStatus}).`;
            } else {
                newState = 'PRINT_STATUS_PENDING';
                note = `Reconciled: Spooler Job #${spoolerInfo.jobId} active in spooler (${spoolerInfo.jobStatus}).`;
            }

            await PrintJob.findByIdAndUpdate(printJob._id, {
                $set: {
                    executionState: newState,
                    spoolerJobId: spoolerInfo.jobId,
                    spoolerStatus: spoolerInfo.jobStatus,
                    activeLeaseId: null,
                    leaseExpiresAt: null,
                    reconciliationNote: note
                }
            });
        } else if (printJob.spoolerJobId) {
            newState = 'PRINTED_PENDING_QC';
            note = `Job #${printJob.spoolerJobId} already left Windows spooler. Vendor must inspect output tray before retrying.`;
            await PrintJob.findByIdAndUpdate(printJob._id, {
                $set: {
                    executionState: newState,
                    spoolerStatus: 'LEFT_SPOOLER',
                    activeLeaseId: null,
                    leaseExpiresAt: null,
                    reconciliationNote: note
                }
            });
        } else if (printJob.executionState === 'SUBMITTING') {
            newState = 'RECONCILIATION_REQUIRED';
            note = 'Submission was interrupted before spooler acknowledgement was recorded. Check printer tray before retrying.';
            await PrintJob.findByIdAndUpdate(printJob._id, {
                $set: {
                    executionState: newState,
                    spoolerStatus: 'UNKNOWN',
                    activeLeaseId: null,
                    leaseExpiresAt: null,
                    reconciliationNote: note
                }
            });
        }

        return {
            orderId: order._id,
            printJobId: printJob._id,
            executionState: newState,
            spoolerFound: Boolean(spoolerInfo?.found),
            spoolerJobId: spoolerInfo?.jobId || printJob.spoolerJobId || null,
            spoolerStatus: spoolerInfo?.jobStatus || printJob.spoolerStatus || 'UNKNOWN',
            reconciliationNote: note
        };
    }

    /**
     * Explicit vendor-initiated retry after resolving failure or verifying previous job did NOT physically print.
     */
    async retryPrintJob(orderId, { forceAfterPhysicalCheck = false, printerName = null, actorId = null } = {}) {
        const printJob = await PrintJob.findOne({ orderId });
        if (!printJob) throw new Error('Print job not found');

        if (printJob.executionState === 'RECONCILIATION_REQUIRED' && !forceAfterPhysicalCheck) {
            throw new Error('Must verify physical output tray did NOT print and pass forceAfterPhysicalCheck=true to retry.');
        }

        if (['ACCEPTED_BY_SPOOLER', 'PRINT_STATUS_PENDING', 'PRINTED_PENDING_QC', 'COMPLETED'].includes(printJob.executionState) && !forceAfterPhysicalCheck) {
            throw new Error(`Job is in state ${printJob.executionState}. Confirm physical tray is missing output before reprinting.`);
        }

        return this.printOrder(orderId, {
            isExplicitRetry: true,
            printerName,
            actorId
        });
    }

    /**
     * Record vendor physical QC verification after inspecting output sheets.
     */
    async confirmPhysicalPrint(orderId, userId) {
        const printJob = await PrintJob.findOneAndUpdate(
            { orderId },
            {
                $set: {
                    vendorConfirmed: true,
                    vendorConfirmedAt: new Date(),
                    vendorConfirmedBy: userId,
                    executionState: 'COMPLETED',
                    completedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );
        if (!printJob) throw new Error('Print job not found');
        return printJob;
    }

    /**
     * Cancel print job before submission, or honestly report spooler cancellation result if already submitted.
     */
    async cancelPrintJob(orderId) {
        const printJob = await PrintJob.findOne({ orderId });
        if (!printJob) return { cancelled: true, hadPrintJob: false, message: 'No print job linked.' };

        if (['CREATED', 'VALIDATED', 'READY_FOR_AGENT', 'SUBMISSION_FAILED', 'PRINTER_OFFLINE'].includes(printJob.executionState)) {
            await PrintJob.findByIdAndUpdate(printJob._id, {
                $set: {
                    executionState: 'CANCELLED',
                    spoolerStatus: 'CANCELLED_BEFORE_SUBMISSION'
                }
            });
            return {
                cancelled: true,
                beforeSubmission: true,
                executionState: 'CANCELLED',
                message: 'Print job cancelled before spooler submission. Zero pages printed.'
            };
        }

        if (['SUBMITTING', 'ACCEPTED_BY_SPOOLER', 'PRINT_STATUS_PENDING'].includes(printJob.executionState)) {
            const printerName = this.getPrinterName(printJob.printerId);
            const spoolCancel = await this.spoolerAdapter.cancelJob(
                printerName,
                printJob.spoolerJobId || 0,
                printJob.spoolerDocumentName || ''
            );

            if (spoolCancel.cancelled && !spoolCancel.wasAlreadyPrinting) {
                await PrintJob.findByIdAndUpdate(printJob._id, {
                    $set: {
                        executionState: 'CANCELLED',
                        spoolerStatus: 'CANCELLED_IN_SPOOLER'
                    }
                });
            }

            return {
                cancelled: Boolean(spoolCancel.cancelled && !spoolCancel.wasAlreadyPrinting),
                beforeSubmission: false,
                wasAlreadyPrinting: Boolean(spoolCancel.wasAlreadyPrinting),
                spoolerResult: spoolCancel,
                message: spoolCancel.message
            };
        }

        return {
            cancelled: false,
            beforeSubmission: false,
            executionState: printJob.executionState,
            message: `Job is already in state ${printJob.executionState} and cannot be cancelled cleanly.`
        };
    }

    /**
     * Background auto-print watcher (only active when AUTO_PRINT_ENABLED === 'true').
     * Strictly claims ONE READY_FOR_AGENT PrintJob atomically per cycle with zero double-dispatch.
     */
    startAutoPrintWatcher(intervalMs = 4000) {
        const allowWatcher =
            (process.env.NODE_ENV !== 'test' || process.env.KAMI_ALLOW_TEST_AUTOPRINT === 'true') &&
            process.env.AUTO_PRINT_ENABLED === 'true';

        if (!allowWatcher) {
            console.log('🤖 [AutoPrint Worker] Disabled (vendor confirmation mode active). Set AUTO_PRINT_ENABLED=true to enable.');
            return;
        }
        if (this.watcherInterval) return;

        console.log(`🤖 [AutoPrint Worker] Background Auto-Print watcher active (checking every ${intervalMs / 1000}s)...`);

        this.watcherInterval = setInterval(async () => {
            if (this._isWatcherPolling) return;
            this._isWatcherPolling = true;
            try {
                // Query ready PrintJobs directly in FIFO order so failed/incompatible older jobs never starve newer orders
                const readyJobs = await PrintJob.find({
                    executionState: { $in: ['CREATED', 'VALIDATED', 'READY_FOR_AGENT'] }
                }).sort({ createdAt: 1 }).limit(20);

                for (const pj of readyJobs) {
                    if (!pj.orderId) continue;
                    const orderToPrint = await Order.findOne({
                        _id: pj.orderId,
                        status: { $in: ['PAID', 'SENT_TO_SHOP', 'ACCEPTED'] },
                        $or: [
                            { editWindowEndsAt: { $exists: false } },
                            { editWindowEndsAt: null },
                            { editWindowEndsAt: { $lte: new Date() } }
                        ]
                    });
                    if (orderToPrint) {
                        console.log(`⚡ [AutoPrint Worker] Auto-dispatching Order #${orderToPrint.orderNumber} (PrintJob ${pj._id})...`);
                        await this.printOrder(orderToPrint._id);
                        break;
                    }
                }
            } catch (err) {
                // Prevent unhandled background rejection
            } finally {
                this._isWatcherPolling = false;
            }
        }, intervalMs);
    }

    stopAutoPrintWatcher() {
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }
    }
}

const instance = new PrinterService();
instance.PrinterService = PrinterService;
instance.createVirtualTestSpoolerAdapter = createVirtualTestSpoolerAdapter;
instance.createWindowsSpoolerAdapter = createWindowsSpoolerAdapter;

module.exports = instance;
