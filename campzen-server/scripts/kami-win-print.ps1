param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("capabilities", "print", "job-status", "find-job", "cancel-job")]
    [string]$Action,

    [Parameter(Mandatory = $true)]
    [string]$PrinterName,

    [string]$ConfigPath = "",
    [int]$JobId = 0,
    [string]$DocumentName = ""
)

$ErrorActionPreference = "Stop"

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Printing;
using System.Printing.Interop;
using System.Runtime.InteropServices;
using System.Text;
using System.Xml;

public class KamiWinPrintBridge
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFOW
    {
        public int cbSize;
        public string lpszDocName;
        public string lpszOutput;
        public string lpszDatatype;
        public uint fwType;
    }

    [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr CreateDCW(string pwszDriver, string pwszDevice, string pwszPort, IntPtr pdm);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern int StartDocW(IntPtr hdc, ref DOCINFOW lpdi);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern int EndDoc(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern int AbortDoc(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern int StartPage(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern int EndPage(IntPtr hdc);

    [DllImport("gdi32.dll")]
    public static extern int GetDeviceCaps(IntPtr hdc, int nIndex);

    const int HORZRES = 8;
    const int VERTRES = 10;
    const int PHYSICALWIDTH = 110;
    const int PHYSICALHEIGHT = 111;
    const int PHYSICALOFFSETX = 112;
    const int PHYSICALOFFSETY = 113;

    public static string JsonEscape(string s)
    {
        if (s == null) return "null";
        var sb = new StringBuilder("\"");
        foreach (char c in s)
        {
            switch (c)
            {
                case '\\': sb.Append("\\\\"); break;
                case '\"': sb.Append("\\\""); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (c < 32) sb.AppendFormat("\\u{0:X4}", (int)c);
                    else sb.Append(c);
                    break;
            }
        }
        sb.Append("\"");
        return sb.ToString();
    }

    public static PrintQueue ResolvePrintQueue(LocalPrintServer server, string printerName)
    {
        foreach (var pq in server.GetPrintQueues(new[] { EnumeratedPrintQueueTypes.Local, EnumeratedPrintQueueTypes.Connections }))
        {
            if (string.Equals(pq.Name, printerName, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(pq.FullName, printerName, StringComparison.OrdinalIgnoreCase))
            {
                pq.Refresh();
                return pq;
            }
        }
        return null;
    }

    public static string GetCapabilitiesJson(string printerName)
    {
        using (var server = new LocalPrintServer())
        using (var pq = ResolvePrintQueue(server, printerName))
        {
            if (pq == null)
            {
                return "{\"exists\":false,\"error\":\"Printer not found on host\"}";
            }

            string capsXml = "";
            using (var sr = new StreamReader(pq.GetPrintCapabilitiesAsXml()))
            {
                capsXml = sr.ReadToEnd();
            }

            var doc = new XmlDocument();
            doc.LoadXml(capsXml);
            var nsmgr = new XmlNamespaceManager(doc.NameTable);
            nsmgr.AddNamespace("psf", "http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework");
            nsmgr.AddNamespace("psk", "http://schemas.microsoft.com/windows/2003/08/printing/printschemakeywords");

            bool supportsColor = doc.SelectSingleNode("//psf:Feature[@name='psk:PageOutputColor']/psf:Option[@name='psk:Color']", nsmgr) != null;
            bool supportsGrayscale = doc.SelectSingleNode("//psf:Feature[@name='psk:PageOutputColor']/psf:Option[@name='psk:Grayscale' or @name='psk:Monochrome']", nsmgr) != null;
            bool supportsSimplex = doc.SelectSingleNode("//psf:Feature[@name='psk:JobDuplexAllDocumentsContiguously']/psf:Option[@name='psk:OneSided']", nsmgr) != null;
            bool supportsDuplexLong = doc.SelectSingleNode("//psf:Feature[@name='psk:JobDuplexAllDocumentsContiguously']/psf:Option[@name='psk:TwoSidedLongEdge']", nsmgr) != null;
            bool supportsDuplexShort = doc.SelectSingleNode("//psf:Feature[@name='psk:JobDuplexAllDocumentsContiguously']/psf:Option[@name='psk:TwoSidedShortEdge']", nsmgr) != null;

            var paperList = new List<string>();
            if (doc.SelectSingleNode("//psf:Feature[@name='psk:PageMediaSize']/psf:Option[@name='psk:ISOA4']", nsmgr) != null) paperList.Add("\"A4\"");
            if (doc.SelectSingleNode("//psf:Feature[@name='psk:PageMediaSize']/psf:Option[@name='psk:ISOA3']", nsmgr) != null) paperList.Add("\"A3\"");
            if (doc.SelectSingleNode("//psf:Feature[@name='psk:PageMediaSize']/psf:Option[@name='psk:NorthAmericaLegal']", nsmgr) != null) paperList.Add("\"Legal\"");
            if (doc.SelectSingleNode("//psf:Feature[@name='psk:PageMediaSize']/psf:Option[@name='psk:NorthAmericaLetter']", nsmgr) != null) paperList.Add("\"Letter\"");

            bool hasJobDuplexPrinterDefault = capsXml.Contains("JobDuplexPrinterDefault");
            bool hasJobEcoType = capsXml.Contains("JobEcoType");

            string defaultTicketXml = "";
            using (var sr = new StreamReader(pq.UserPrintTicket.GetXmlStream()))
            {
                defaultTicketXml = sr.ReadToEnd();
            }
            bool defaultHasPrinterDuplexOn = defaultTicketXml.Contains("JobDuplexPrinterDefault") &&
                                             System.Text.RegularExpressions.Regex.IsMatch(defaultTicketXml, @"JobDuplexPrinterDefault[^>]*>\s*<psf:Option\s+name=""ns0000:On""");

            return string.Format(
                "{{\"exists\":true,\"printerName\":{0},\"isOffline\":{1},\"isInError\":{2},\"isOutOfPaper\":{3},\"isPaperJammed\":{4},\"hasPaperProblem\":{5},\"needUserIntervention\":{6},\"queueStatus\":{7},\"numberOfJobs\":{8},\"supportsColor\":{9},\"supportsGrayscale\":{10},\"supportsSimplex\":{11},\"supportsDuplexLong\":{12},\"supportsDuplexShort\":{13},\"hasJobDuplexPrinterDefault\":{14},\"hasJobEcoType\":{15},\"defaultHasPrinterDuplexOn\":{16},\"supportedPaperSizes\":[{17}]}}",
                JsonEscape(pq.Name),
                pq.IsOffline ? "true" : "false",
                pq.IsInError ? "true" : "false",
                pq.IsOutOfPaper ? "true" : "false",
                pq.IsPaperJammed ? "true" : "false",
                pq.HasPaperProblem ? "true" : "false",
                pq.NeedUserIntervention ? "true" : "false",
                JsonEscape(pq.QueueStatus.ToString()),
                pq.NumberOfJobs,
                supportsColor ? "true" : "false",
                supportsGrayscale ? "true" : "false",
                supportsSimplex ? "true" : "false",
                supportsDuplexLong ? "true" : "false",
                supportsDuplexShort ? "true" : "false",
                hasJobDuplexPrinterDefault ? "true" : "false",
                hasJobEcoType ? "true" : "false",
                defaultHasPrinterDuplexOn ? "true" : "false",
                string.Join(",", paperList)
            );
        }
    }

    public static string PrintJobWithExplicitDevMode(
        string printerName,
        string documentName,
        string sides,
        int copies,
        string paperSize,
        string orientation,
        string colorMode,
        bool collate,
        bool fitToPrintableArea,
        string[] pageImageFiles
    )
    {
        if (copies < 1 || copies > 500)
            throw new ArgumentException("Copies must be between 1 and 500.");
        if (pageImageFiles == null || pageImageFiles.Length == 0)
            throw new ArgumentException("At least one rendered page image is required.");

        using (var server = new LocalPrintServer())
        using (var pq = ResolvePrintQueue(server, printerName))
        {
            if (pq == null)
                return "{\"success\":false,\"errorCode\":\"PRINTER_NOT_FOUND\",\"message\":\"Printer not found on host\"}";

            if (pq.IsOffline)
                return "{\"success\":false,\"errorCode\":\"PRINTER_OFFLINE\",\"message\":\"Printer is offline\"}";
            if (pq.IsOutOfPaper || pq.IsPaperJammed || pq.HasPaperProblem || pq.IsInError || pq.NeedUserIntervention)
                return "{\"success\":false,\"errorCode\":\"PRINTER_ERROR\",\"message\":" + JsonEscape("Printer hardware alert: " + pq.QueueStatus.ToString()) + "}";

            string capsXml;
            using (var sr = new StreamReader(pq.GetPrintCapabilitiesAsXml()))
            {
                capsXml = sr.ReadToEnd();
            }

            bool hasJobDuplexPrinterDefault = capsXml.Contains("JobDuplexPrinterDefault");
            bool hasJobEcoType = capsXml.Contains("JobEcoType");
            bool supportsColor = capsXml.Contains("<psf:Feature name=\"psk:PageOutputColor\"") && capsXml.Contains("name=\"psk:Color\"");
            bool supportsDuplexLong = capsXml.Contains("psk:TwoSidedLongEdge");
            bool supportsDuplexShort = capsXml.Contains("psk:TwoSidedShortEdge");
            bool supportsSimplex = capsXml.Contains("psk:OneSided");

            string normSides = (sides ?? "single").Trim().ToLowerInvariant();
            string pskDuplex;
            short expectedDmDuplex;
            if (normSides == "double" || normSides == "duplex" || normSides == "duplexlong")
            {
                if (!supportsDuplexLong)
                    return "{\"success\":false,\"errorCode\":\"INCOMPATIBLE_DUPLEX\",\"message\":\"Printer does not support double-sided printing\"}";
                pskDuplex = "psk:TwoSidedLongEdge";
                expectedDmDuplex = 2;
            }
            else if (normSides == "duplexshort")
            {
                if (!supportsDuplexShort)
                    return "{\"success\":false,\"errorCode\":\"INCOMPATIBLE_DUPLEX\",\"message\":\"Printer does not support short-edge duplex printing\"}";
                pskDuplex = "psk:TwoSidedShortEdge";
                expectedDmDuplex = 3;
            }
            else
            {
                if (!supportsSimplex)
                    return "{\"success\":false,\"errorCode\":\"INCOMPATIBLE_SIMPLEX\",\"message\":\"Printer does not support single-sided printing\"}";
                pskDuplex = "psk:OneSided";
                expectedDmDuplex = 1;
            }

            string normColor = (colorMode ?? "B&W").Trim();
            bool wantsColor = normColor.Equals("Color", StringComparison.OrdinalIgnoreCase) || normColor.Equals("Mixed", StringComparison.OrdinalIgnoreCase);
            if (wantsColor && !supportsColor)
            {
                return "{\"success\":false,\"errorCode\":\"INCOMPATIBLE_COLOR_MODE\",\"message\":" + JsonEscape("Selected printer '" + pq.Name + "' is monochrome-only and cannot execute Color/Mixed print jobs.") + "}";
            }

            string pskColor = wantsColor ? "psk:Color" : "psk:Grayscale";
            string pskOrientation = string.Equals(orientation, "landscape", StringComparison.OrdinalIgnoreCase) ? "psk:Landscape" : "psk:Portrait";
            string pskCollate = collate ? "psk:Collated" : "psk:Uncollated";

            string pskPaper = "psk:ISOA4";
            string normPaper = (paperSize ?? "A4").Trim().ToLowerInvariant();
            if (normPaper == "a3") pskPaper = "psk:ISOA3";
            else if (normPaper == "legal") pskPaper = "psk:NorthAmericaLegal";
            else if (normPaper == "letter") pskPaper = "psk:NorthAmericaLetter";

            if (!capsXml.Contains(pskPaper))
            {
                return "{\"success\":false,\"errorCode\":\"INCOMPATIBLE_PAPER_SIZE\",\"message\":" + JsonEscape("Selected printer does not support paper size: " + paperSize) + "}";
            }

            // Construct a clean, fresh per-job PrintTicket (NEVER reusing previous job state)
            var sb = new StringBuilder();
            sb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            sb.Append("<psf:PrintTicket xmlns:psf=\"http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework\" ");
            sb.Append("xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ");
            sb.Append("xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" version=\"1\" ");
            sb.Append("xmlns:ns0000=\"http://schemas.microsoft.com/windows/2003/08/printing/SAMSUNGPRINTER\" ");
            sb.Append("xmlns:psk=\"http://schemas.microsoft.com/windows/2003/08/printing/printschemakeywords\">");
            if (hasJobDuplexPrinterDefault)
                sb.Append("<psf:Feature name=\"ns0000:JobDuplexPrinterDefault\"><psf:Option name=\"ns0000:Off\" /></psf:Feature>");
            sb.Append("<psf:Feature name=\"psk:JobDuplexAllDocumentsContiguously\"><psf:Option name=\"" + pskDuplex + "\" /></psf:Feature>");
            if (hasJobEcoType)
                sb.Append("<psf:Feature name=\"ns0000:JobEcoType\"><psf:Option name=\"ns0000:None\" /></psf:Feature>");
            sb.Append("<psf:Feature name=\"psk:DocumentCollate\"><psf:Option name=\"" + pskCollate + "\" /></psf:Feature>");
            sb.Append("<psf:Feature name=\"psk:PageOrientation\"><psf:Option name=\"" + pskOrientation + "\" /></psf:Feature>");
            sb.Append("<psf:Feature name=\"psk:PageMediaSize\"><psf:Option name=\"" + pskPaper + "\" /></psf:Feature>");
            sb.Append("<psf:Feature name=\"psk:PageOutputColor\"><psf:Option name=\"" + pskColor + "\" /></psf:Feature>");
            sb.Append("<psf:ParameterInit name=\"psk:JobCopiesAllDocuments\"><psf:Value xsi:type=\"xsd:integer\">" + copies + "</psf:Value></psf:ParameterInit>");
            sb.Append("</psf:PrintTicket>");

            byte[] devModeBytes;
            short actualDmCopies;
            short actualDmDuplex;
            bool printerDefaultDisabled = !hasJobDuplexPrinterDefault;
            bool ecoDefaultDisabled = !hasJobEcoType;

            using (var conv = new PrintTicketConverter(pq.Name, 1))
            using (var ms = new MemoryStream(Encoding.UTF8.GetBytes(sb.ToString())))
            {
                var explicitTicket = new PrintTicket(ms);
                devModeBytes = conv.ConvertPrintTicketToDevMode(explicitTicket, BaseDevModeType.PrinterDefault);
                var roundTrip = conv.ConvertDevModeToPrintTicket(devModeBytes);
                string rtXml;
                using (var sr = new StreamReader(roundTrip.GetXmlStream()))
                {
                    rtXml = sr.ReadToEnd();
                }

                actualDmCopies = BitConverter.ToInt16(devModeBytes, 86);
                actualDmDuplex = BitConverter.ToInt16(devModeBytes, 94);

                if (hasJobDuplexPrinterDefault)
                {
                    printerDefaultDisabled = System.Text.RegularExpressions.Regex.IsMatch(rtXml, @"JobDuplexPrinterDefault[^>]*>\s*<psf:Option\s+name=""ns0000:Off""");
                }
                if (hasJobEcoType)
                {
                    ecoDefaultDisabled = System.Text.RegularExpressions.Regex.IsMatch(rtXml, @"JobEcoType[^>]*>\s*<psf:Option\s+name=""ns0000:None""");
                }

                // Pre-submission DEVMODE verification guard
                if (actualDmCopies != copies)
                {
                    return "{\"success\":false,\"errorCode\":\"DEVMODE_COPIES_MISMATCH\",\"message\":" + JsonEscape("Driver DEVMODE dmCopies mismatch: expected " + copies + ", got " + actualDmCopies) + "}";
                }
                if (actualDmDuplex != expectedDmDuplex)
                {
                    return "{\"success\":false,\"errorCode\":\"DEVMODE_DUPLEX_MISMATCH\",\"message\":" + JsonEscape("Driver DEVMODE dmDuplex mismatch: expected " + expectedDmDuplex + ", got " + actualDmDuplex) + "}";
                }
                if (!printerDefaultDisabled)
                {
                    return "{\"success\":false,\"errorCode\":\"DRIVER_DUPLEX_OVERRIDE_FAILED\",\"message\":\"Driver refused to disable JobDuplexPrinterDefault for explicit simplex/duplex control.\"}";
                }
            }

            IntPtr pDevMode = Marshal.AllocHGlobal(devModeBytes.Length);
            IntPtr hdc = IntPtr.Zero;
            int spoolerJobId = 0;
            bool docStarted = false;

            try
            {
                Marshal.Copy(devModeBytes, 0, pDevMode, devModeBytes.Length);
                hdc = CreateDCW("WINSPOOL", pq.Name, null, pDevMode);
                if (hdc == IntPtr.Zero)
                {
                    return "{\"success\":false,\"errorCode\":\"CREATE_DC_FAILED\",\"message\":\"CreateDCW failed with Win32 error " + Marshal.GetLastWin32Error() + "\"}";
                }

                var di = new DOCINFOW
                {
                    cbSize = Marshal.SizeOf(typeof(DOCINFOW)),
                    lpszDocName = documentName,
                    lpszOutput = null,
                    lpszDatatype = null,
                    fwType = 0
                };

                spoolerJobId = StartDocW(hdc, ref di);
                if (spoolerJobId <= 0)
                {
                    return "{\"success\":false,\"errorCode\":\"START_DOC_FAILED\",\"message\":\"StartDocW failed with Win32 error " + Marshal.GetLastWin32Error() + "\"}";
                }
                docStarted = true;

                int horzRes = GetDeviceCaps(hdc, HORZRES);
                int vertRes = GetDeviceCaps(hdc, VERTRES);
                int physW = GetDeviceCaps(hdc, PHYSICALWIDTH);
                int physH = GetDeviceCaps(hdc, PHYSICALHEIGHT);
                int offX = GetDeviceCaps(hdc, PHYSICALOFFSETX);
                int offY = GetDeviceCaps(hdc, PHYSICALOFFSETY);

                for (int i = 0; i < pageImageFiles.Length; i++)
                {
                    string imgPath = pageImageFiles[i];
                    if (!File.Exists(imgPath))
                    {
                        AbortDoc(hdc);
                        docStarted = false;
                        return "{\"success\":false,\"errorCode\":\"PAGE_IMAGE_MISSING\",\"message\":" + JsonEscape("Missing rendered page: " + imgPath) + "}";
                    }

                    if (StartPage(hdc) <= 0)
                    {
                        AbortDoc(hdc);
                        docStarted = false;
                        return "{\"success\":false,\"errorCode\":\"START_PAGE_FAILED\",\"message\":\"StartPage failed on page " + (i + 1) + "\"}";
                    }

                    using (var g = Graphics.FromHdc(hdc))
                    using (var img = Image.FromFile(imgPath))
                    {
                        g.PageUnit = GraphicsUnit.Pixel;
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;

                        float targetW = fitToPrintableArea ? horzRes : physW;
                        float targetH = fitToPrintableArea ? vertRes : physH;
                        float originX = fitToPrintableArea ? 0f : -offX;
                        float originY = fitToPrintableArea ? 0f : -offY;

                        float scale = Math.Min(targetW / img.Width, targetH / img.Height);
                        float drawW = img.Width * scale;
                        float drawH = img.Height * scale;
                        float x = originX + (targetW - drawW) / 2f;
                        float y = originY + (targetH - drawH) / 2f;
                        g.DrawImage(img, x, y, drawW, drawH);
                    }

                    if (EndPage(hdc) <= 0)
                    {
                        AbortDoc(hdc);
                        docStarted = false;
                        return "{\"success\":false,\"errorCode\":\"END_PAGE_FAILED\",\"message\":\"EndPage failed on page " + (i + 1) + "\"}";
                    }
                }

                if (EndDoc(hdc) <= 0)
                {
                    return "{\"success\":false,\"errorCode\":\"END_DOC_FAILED\",\"message\":\"EndDoc failed with Win32 error " + Marshal.GetLastWin32Error() + "\"}";
                }
                docStarted = false;

                return string.Format(
                    "{{\"success\":true,\"printerName\":{0},\"spoolerJobId\":{1},\"spoolerDocumentName\":{2},\"pagesSubmitted\":{3},\"dmCopies\":{4},\"dmDuplex\":{5},\"duplexMode\":{6},\"printerDefaultDuplexDisabled\":{7},\"ecoDefaultDisabled\":{8},\"driverVerified\":true}}",
                    JsonEscape(pq.Name),
                    spoolerJobId,
                    JsonEscape(documentName),
                    pageImageFiles.Length,
                    actualDmCopies,
                    actualDmDuplex,
                    JsonEscape(pskDuplex),
                    printerDefaultDisabled ? "true" : "false",
                    ecoDefaultDisabled ? "true" : "false"
                );
            }
            catch (Exception ex)
            {
                if (docStarted && hdc != IntPtr.Zero)
                {
                    try { AbortDoc(hdc); } catch {}
                }
                return "{\"success\":false,\"errorCode\":\"WIN_PRINT_EXCEPTION\",\"message\":" + JsonEscape(ex.Message) + "}";
            }
            finally
            {
                if (hdc != IntPtr.Zero) DeleteDC(hdc);
                Marshal.FreeHGlobal(pDevMode);
            }
        }
    }

    private static string SerializeJobInfo(PrintSystemJobInfo job)
    {
        return string.Format(
            "{{\"found\":true,\"jobId\":{0},\"name\":{1},\"jobStatus\":{2},\"isSpooling\":{3},\"isPrinting\":{4},\"isPrinted\":{5},\"isPaused\":{6},\"isDeleting\":{7},\"isDeleted\":{8},\"isOffline\":{9},\"isPaperOut\":{10},\"isInError\":{11},\"numberOfPages\":{12},\"numberOfPagesPrinted\":{13}}}",
            job.JobIdentifier,
            JsonEscape(job.Name),
            JsonEscape(job.JobStatus.ToString()),
            job.IsSpooling ? "true" : "false",
            job.IsPrinting ? "true" : "false",
            job.IsPrinted ? "true" : "false",
            job.IsPaused ? "true" : "false",
            job.IsDeleting ? "true" : "false",
            job.IsDeleted ? "true" : "false",
            job.IsOffline ? "true" : "false",
            job.IsPaperOut ? "true" : "false",
            job.IsInError ? "true" : "false",
            job.NumberOfPages,
            job.NumberOfPagesPrinted
        );
    }

    public static string GetJobStatusJson(string printerName, int jobId, string documentName)
    {
        using (var server = new LocalPrintServer())
        using (var pq = ResolvePrintQueue(server, printerName))
        {
            if (pq == null) return "{\"found\":false,\"error\":\"Printer not found\"}";
            foreach (var job in pq.GetPrintJobInfoCollection())
            {
                if ((jobId > 0 && job.JobIdentifier == jobId) ||
                    (!string.IsNullOrEmpty(documentName) && string.Equals(job.Name, documentName, StringComparison.OrdinalIgnoreCase)))
                {
                    job.Refresh();
                    return SerializeJobInfo(job);
                }
            }
            return "{\"found\":false}";
        }
    }

    public static string CancelSpoolerJobJson(string printerName, int jobId, string documentName)
    {
        using (var server = new LocalPrintServer())
        using (var pq = ResolvePrintQueue(server, printerName))
        {
            if (pq == null) return "{\"cancelled\":false,\"reason\":\"PRINTER_NOT_FOUND\"}";
            foreach (var job in pq.GetPrintJobInfoCollection())
            {
                if ((jobId > 0 && job.JobIdentifier == jobId) ||
                    (!string.IsNullOrEmpty(documentName) && string.Equals(job.Name, documentName, StringComparison.OrdinalIgnoreCase)))
                {
                    job.Refresh();
                    if (job.IsPrinted)
                    {
                        return "{\"cancelled\":false,\"found\":true,\"reason\":\"ALREADY_PRINTED\",\"message\":\"Job already finished printing in spooler.\"}";
                    }
                    bool wasPrinting = job.IsPrinting;
                    job.Cancel();
                    pq.Commit();
                    return string.Format(
                        "{{\"cancelled\":true,\"found\":true,\"wasAlreadyPrinting\":{0},\"message\":{1}}}",
                        wasPrinting ? "true" : "false",
                        JsonEscape(wasPrinting ? "Cancel requested in spooler, but printer had already started printing." : "Cancelled in Windows spooler before printing.")
                    );
                }
            }
            return "{\"cancelled\":false,\"found\":false,\"reason\":\"NOT_IN_SPOOLER\",\"message\":\"Job is no longer in Windows spooler (may have already dispatched to printer device).\"}";
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies @(
    "C:\Windows\Microsoft.Net\assembly\GAC_64\System.Printing\v4.0_4.0.0.0__31bf3856ad364e35\System.Printing.dll",
    "C:\Windows\Microsoft.Net\assembly\GAC_MSIL\ReachFramework\v4.0_4.0.0.0__31bf3856ad364e35\ReachFramework.dll",
    "System.Drawing.dll",
    "System.Xml.dll"
)

switch ($Action) {
    "capabilities" {
        [KamiWinPrintBridge]::GetCapabilitiesJson($PrinterName)
    }
    "print" {
        if (-not $ConfigPath -or -not (Test-Path $ConfigPath)) {
            Write-Output '{"success":false,"errorCode":"MISSING_CONFIG","message":"Job config JSON file not found"}'
            exit 1
        }
        $cfg = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json
        $imgFiles = @($cfg.pageImageFiles)
        [KamiWinPrintBridge]::PrintJobWithExplicitDevMode(
            $PrinterName,
            [string]$cfg.documentName,
            [string]$cfg.sides,
            [int]$cfg.copies,
            [string]$cfg.paperSize,
            [string]$cfg.orientation,
            [string]$cfg.colorMode,
            [bool]$cfg.collate,
            [bool]$cfg.fitToPrintableArea,
            $imgFiles
        )
    }
    "job-status" {
        [KamiWinPrintBridge]::GetJobStatusJson($PrinterName, $JobId, $DocumentName)
    }
    "find-job" {
        [KamiWinPrintBridge]::GetJobStatusJson($PrinterName, $JobId, $DocumentName)
    }
    "cancel-job" {
        [KamiWinPrintBridge]::CancelSpoolerJobJson($PrinterName, $JobId, $DocumentName)
    }
}
