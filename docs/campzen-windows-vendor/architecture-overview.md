# 1. CampZen Platform Architecture Overview (Windows Vendor & Xerox Printing)

**Product**: CampZen  
**Company / Publisher**: WeCove.in (`https://wecove.in`)  
**Architecture Transition**: Deprecated Vendor Mobile App &rarr; Dedicated Windows Vendor Desktop Application + Native Xerox Spooler Agent  
**Date**: November 26, 2026  
**Status**: APPROVED & IMPLEMENTED  

---

## 1. High-Level System Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    CAMPZEN PLATFORM                                      |
+-----------------------------------------------------------------------------------------+
       |                                                                   |
       v                                                                   v
+-----------------------------+                             +-----------------------------+
|   CAMPZEN STUDENT APP       |                             |   WECOVE.IN WEB PLATFORM    |
|   (Android APK v1.0.0)      |                             |   (React 18 / Vite / CDN)   |
|   - Queue-Free Orders       |                             |   - APK & Desktop Downloads |
|   - 60s Edit Window         |                             |   - Institutional Portals   |
|   - Keystore SecureStore    |                             |   - _redirects SPA Support  |
+-----------------------------+                             +-----------------------------+
               |                                                           |
               +-----------------------------+-----------------------------+
                                             |
                                             v  HTTPS (api.wecove.in)
                        +-----------------------------------------+
                        |            CAMPZEN BACKEND              |
                        |      (Node.js / Express / Render)       |
                        |   - Order Engine & 60s Timer Mutex      |
                        |   - Dynamic Availability Engine         |
                        |   - Resend HTTPS Email (otp@wecove.in)  |
                        |   - Company Admin API (/api/admin)      |
                        |   - Tamper-Resistant Audit Trail        |
                        +-----------------------------------------+
                                             |
                                             v  TLS 1.3
                        +-----------------------------------------+
                        |            MONGODB ATLAS                |
                        |     (campzen_production Database)       |
                        |   - 100% Data Fidelity (19 collections) |
                        |   - Verified Indexing & Session TTL     |
                        +-----------------------------------------+
                                             |
                                             v  Encrypted Agent Token / Polling
+-----------------------------------------------------------------------------------------+
|                         PHYSICAL PRINT SHOP (WINDOWS PC)                                |
|                                                                                         |
|  +-------------------------------------+     +---------------------------------------+  |
|  |   CAMPZEN VENDOR DESKTOP APP        |     |     CAMPZEN PRINT AGENT               |  |
|  |   (CampZenVendor.exe / C# / Win32)  |     |     (Windows Background Service)      |  |
|  |   - Full Keyboard & Mouse UI        |     |     - Starts with Windows (Silent)    |  |
|  |   - Order Intake & Rejection Modals |<--->|     - DPAPI Encrypted Credentials     |  |
|  |   - Spooler Real-Time Monitor       | IPC |     - 30s Heartbeat (Sets Shop OPEN)  |  |
|  |   - Xerox Capability Inspection     |     |     - Auto-Spool Past 60s Deadline    |  |
|  |   - Private Company Admin Portal    |     |     - 100% Headless (No UI required)  |  |
|  +-------------------------------------+     +---------------------------------------+  |
|                                                                  |                      |
|                                                                  v  GDI / Spooler       |
|                                              +---------------------------------------+  |
|                                              |      WINDOWS PRINT SPOOLER            |  |
|                                              |      (spoolsv.exe / winspool.drv)     |  |
|                                              +---------------------------------------+  |
|                                                                  |                      |
|                                                                  v  LAN (TCP/IP 9100)   |
|                                              +---------------------------------------+  |
|                                              |     XEROX / HP MULTIFUNCTION MACHINE  |  |
|                                              |     (Xerox AltaLink / HP MFP M72625)  |  |
|                                              |     - Info Sheet Released FIRST       |  |
|                                              |     - Duplex / Color / N-Up Execution |  |
|                                              +---------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Key Architecture Principles

1. **Physical Shop Reality**: Campus print shops use Windows 10/11 desktop towers connected via Ethernet to commercial Xerox and HP multifunction printing machines. Mobile vendor interfaces resulted in missed orders and manual re-typing.
2. **Headless Reliability**: The vendor does **not** need to keep the desktop dashboard open for orders to print. The background service (`campzen-agent`) starts with Windows, maintains heartbeat, claims ready jobs past the 60-second student edit window, and releases them directly to the Windows Spooler.
3. **Information Sheet Priority**: Every print package enforces strict sequencing: the student information sheet (Plain for 1-5 pages, Creative college-themed for 6+ pages) is generated and spooled **first**, before the main document.
4. **Authoritative Shop Availability**: A shop is marked `OPEN` in the mobile app only when:
   - The shop is within its configured weekly business hours.
   - The vendor has not manually paused or closed the counter.
   - The Windows Print Agent has delivered a heartbeat within the last 90 seconds.
   If the computer is switched off or disconnected, the shop automatically becomes `OFFLINE`.
5. **Private Company Administration**: Discreetly located at the bottom of the Settings tab, strictly gated to `wecove.in@gmail.com` with bcrypt password verification and TOTP RFC 6238 Multi-Factor Authentication.
