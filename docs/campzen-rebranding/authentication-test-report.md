# 8. Authentication & Persistence Test Report

**Test Suite**: `test_auth_persistence.js`  
**Target Environment**: `campzen_production` on MongoDB Atlas  
**Date**: November 25, 2026  
**Result**: 5 of 5 Tests PASSED (100%)  

---

## Test Results Matrix

| Test Case | Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST 1** | User Login & Session Creation | Returns access token + refresh token; stores SHA-256 hash in DB | Both tokens issued; Session verified in `campzen_production` | **PASS** |
| **TEST 2** | Session Refresh & Rotation | Refreshes access token and rotates refresh token; old token marked replaced | New token pair issued; DB reflects updated hash | **PASS** |
| **TEST 3** | Replay Detection (Attack Simulation)| Presenting previously rotated refresh token triggers security rejection | HTTP 401 Unauthorized; session flagged | **PASS** |
| **TEST 4** | Explicit User Logout | Revokes session document in MongoDB | Session marked `isRevoked: true` | **PASS** |
| **TEST 5** | Refresh After Logout | Attempting to refresh with revoked token is rejected | HTTP 401 Unauthorized | **PASS** |

---

## Offline & Process Termination Verification
- App killed via Android task manager: Launching app hydrates user profile from SecureStore without requiring login.
- Device placed in Airplane mode: App displays cached dashboard without logging out.
