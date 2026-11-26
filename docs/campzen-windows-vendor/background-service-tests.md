# 7. Background Service Test & Reliability Matrix

**Test Harness**: Windows Task Termination & Interruption Simulation  
**Target Process**: `node agent.js --run` / `CampZenPrintAgent`  
**Status**: ALL 5 TESTS PASSED (100%)  

---

## Test Results

| Test ID | Test Scenario | Expected Outcome | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BGS-01** | Silent Boot Startup | Starts without console window | Spawns hidden via VBScript wrapper | **PASS** |
| **BGS-02** | Process Kill & Recovery | Relaunches cleanly without duplicate jobs | Restarts, verifies pending queue idempotently | **PASS** |
| **BGS-03** | Network Disconnection | Retries heartbeat with exponential backoff | Backend marks shop OFFLINE; reconnects automatically | **PASS** |
| **BGS-04** | Spooler Crash Recovery | Re-queries spooler status without resubmitting | Identifies existing Windows Job ID; prevents re-print | **PASS** |
| **BGS-05** | Closed UI Window | Prints incoming jobs while UI is closed | Spooled order CZ-20261126-001 with dashboard closed | **PASS** |
