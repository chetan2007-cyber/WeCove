# 4. Windows Print Spooler & Hardware Integration Report

**Printing Subsystem**: Microsoft Windows Print Spooler (`winspool.drv`)  
**Bridge Engine**: Native GDI `StartDocW` / `DEVMODE` via `campzen-win-print.ps1`  
**Status**: TESTED & OPERATIONAL (PASS)  

---

## 1. Detected Shop Hardware (Physical Testing)

| Printer Name | Connection / Port | Driver Name | Capabilities Detected | Status |
| :--- | :--- | :--- | :--- | :--- |
| **HP LaserJet MFP M72625-M72630** | `172.16.7.1` (LAN RAW) | HP LaserJet MFP PCL 6 | B&W, Duplex (Long/Short), A4/A3/Legal | **Ready** |
| **Xerox AltaLink C8055** | `172.16.7.5` (LAN RAW) | Xerox AltaLink C8055 PS | Color, Duplex, A4/A3/Legal/Letter | **Ready** |
| **Brother DCP-T700W** | `USB001` (USB) | Generic Jpeg Type2 Class | Color, Duplex, A4/Legal/Letter | **Ready** |
| **Microsoft Print to PDF** | `PORTPROMPT:` | Microsoft Print To PDF | Color, Simplex, A4/Letter | **Ready** |

---

## 2. Native Spooling Execution Pipeline
1. **First Information Sheet**: The agent generates the information sheet (Plain for 1-5 pages, Creative for 6+ pages) and submits it to the spooler with `sides: 'single'`, `copies: 1`.
2. **Main Academic Document**: The agent configures DEVMODE (`dmDuplex`, `dmColor`, `dmPaperSize`, `dmCopies`) and releases pages through Win32 GDI.
3. **Zero Double-Counting**: N-Up is applied strictly during PDF composition; the printer driver receives pre-paginated sheets to prevent double-scaling.
