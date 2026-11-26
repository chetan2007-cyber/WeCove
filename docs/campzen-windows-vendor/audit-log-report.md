# 11. Tamper-Resistant Platform Audit Log Report

**Model**: `AuditLog` (`auditLog.model.js`)  
**Storage**: MongoDB Atlas `campzen_production`  
**Status**: ACTIVE & LOGGING (PASS)  

---

## 1. Audit Schema Fields
- `actorId`: ObjectId of executing user
- `actorEmail`: Email address
- `role`: Role at time of execution (`admin`, `vendor_owner`, `system`)
- `action`: Canonical event identifier (`ADMIN_LOGIN_SUCCESS`, `ADMIN_UPDATE_VENDOR_STATUS`, etc.)
- `targetType`: Target domain (`VENDOR`, `ORDER`, `PRINT_JOB`, `ADMIN_AUTH`)
- `targetId`: Associated resource ID
- `reason`: Mandatory human explanation for administrative interventions
- `diff`: Before and after state capture
- `ipAddress` & `userAgent`: Network forensic telemetry

---

## 2. Sample Recorded Audit Events
- `26 Nov 19:30:26` — `wecove.in@gmail.com` &rarr; `ADMIN_PROVISION_BOOTSTRAP` &rarr; `SUCCESS`
- `26 Nov 19:28:48` — `system` &rarr; `ADMIN_LOGIN_UNAUTHORIZED_EMAIL` &rarr; `FAILURE`
- `26 Nov 19:26:35` — `wecove.in@gmail.com` &rarr; `ADMIN_LOGIN_INCORRECT_PASSWORD` &rarr; `FAILURE`
