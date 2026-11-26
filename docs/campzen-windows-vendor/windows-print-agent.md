# 6. CampZen Print Agent Background Service Report

**Component**: Headless Background Print Worker (`campzen-print-agent`)  
**Startup Mode**: Windows Registry Run (`HKCU`) + Silent VBScript Wrapper (`campzen-agent-service.vbs`)  
**Status**: OPERATIONAL & VERIFIED (PASS)  

---

## 1. Service Operation Lifecycle
1. **Boot Initialization**: Windows boots &rarr; Registry invokes `campzen-agent-service.vbs` &rarr; spawns `node agent.js --run` with window hidden (`0`).
2. **Credential Decryption**: Reads `%APPDATA%\CampZenVendor\device-credentials.dpapi` and unprotects credentials via Windows DPAPI.
3. **Heartbeat Loop (30 Seconds)**:
   - Queries Windows Spooler via `Get-Printer`.
   - Sends payload to `POST /api/vendors/agent/heartbeat`.
   - Keeps vendor status `OPEN` on student mobile app.
4. **Order Synchronisation (5 Seconds)**:
   - Polls `GET /api/vendors/agent/pending-jobs`.
   - Identifies jobs that have passed the 60-second student editing window.
   - Downloads print package, checks SHA-256 integrity, submits to spooler.
   - Updates backend status to `SPOOLING` &rarr; `SPOOLED`.
