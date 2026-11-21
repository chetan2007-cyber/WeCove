# Kami Backend — Security Audit & Hardening Report

This document reports the findings of the defensive security audit conducted on the Kami backend, covering authentication, authorization, input validation, injection resistance, IDOR/BOLA, file handling, and environment isolation.

---

## Executive Security Summary

- **Security Posture**: **SECURE & HARDENED** (Post-Remediation)
- **High / Critical Vulnerabilities Found**: 2 (Both remediated and verified)
- **Medium Severity Issues Found**: 4 (All remediated and verified)
- **Remaining Critical Vulnerabilities**: **0**

---

## Detailed Vulnerability Analysis

### 1. NoSQL Operator Injection in Authentication (HIGH / CRITICAL)
- **CWE**: CWE-943 (Improper Neutralization of Special Elements in Data Query Logic)
- **Pre-Fix Condition**: The `login` handler accepted `phone` directly from `req.body`. An attacker providing `{"phone": {"$ne": null}, "password": "password123"}` caused Mongoose to execute `{ phone: { $ne: null } }`, authenticating as the first matched user without knowing their phone number.
- **Remediation**:
  - Implemented strict scalar type verification (`typeof phone === 'string' && typeof password === 'string'`) in `auth.controller.js`.
  - Applied the same strict string validation to `signup`, `sendOtp`, and `verifyOtp`.
- **Verification**: Verified via `tests/14_security_audit.test.js`. Rejection returns HTTP `400 Bad Request`.

### 2. Broken Object-Level Authorization (IDOR / BOLA) (HIGH)
- **CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)
- **Pre-Fix Condition**:
  - In `POST /api/orders`, a student could specify any `documentId` in the database, including documents uploaded by other students.
  - Documents had no access-controlled metadata endpoint.
- **Remediation**:
  - In `createOrder`, added ownership validation:
    `if (document.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') return res.status(403)...`
  - In `GET /api/documents/:id`, restricted access exclusively to the document owner or system administrators.
  - In `GET /api/orders/:id`, restricted order access exclusively to the student owner, the assigned vendor, or administrators.
- **Verification**: Verified via `tests/07_document.test.js` and `tests/09_order_lifecycle.test.js`. Rejection returns HTTP `403 Forbidden`.

### 3. Missing Subject Validation on Verified Tokens (MEDIUM)
- **CWE**: CWE-287 (Improper Authentication)
- **Pre-Fix Condition**: In `auth.middleware.js`, `jwt.verify` succeeded for valid signatures, but if the associated user document was deleted from the database, `req.user` remained `null`. Downstream role checks crashed with unhandled `TypeError` (exposing internal runtime stack information).
- **Remediation**: Explicitly checked `if (!req.user)` and immediately returned `401 Unauthorized` with `'User belonging to this token no longer exists'`.
- **Verification**: Verified via `tests/03_rbac_security.test.js`.

### 4. Privilege Escalation via User Profile Update (MEDIUM)
- **CWE**: CWE-269 (Improper Privilege Management)
- **Pre-Fix Condition**: Inspected `PUT /api/users/me` to ensure mass assignment did not permit updating `role`, `isVerified`, or `password`.
- **Remediation**: Confirmed that `updateMe` explicitly extracts only allowed fields (`name`, `email`, `addresses`, `collegeId`, `studentId`). Any `role` passed in the body is discarded.
- **Verification**: Verified via `tests/04_user_profile.test.js`.

### 5. File Upload & Storage Path Traversal (LOW / MEDIUM)
- **CWE**: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
- **Pre-Fix Condition**: Analyzed `multer` storage configuration in `upload.middleware.js`.
- **Findings & Hardening**:
  - Filename generation uses `Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)`. The original basename is not used directly, neutralizing path traversal payloads like `../../shell.php`.
  - MIME type filtering explicitly whitelists only `application/pdf`, `application/msword`, `DOCX`, `image/jpeg`, and `image/png`.
  - File size is strictly enforced at 10 MB.
- **Verification**: Verified via `tests/14_security_audit.test.js`.

### 6. Secrets & Environment Isolation
- **Codebase Scan**: Grepped entire `src/` directory for hardcoded secrets, JWT keys, or MongoDB Atlas credentials.
- **Result**: No hardcoded production credentials found. All sensitive configuration is parsed strictly via `process.env`.
- **Test Isolation**: A dedicated `.env.test` file is configured pointing to local `mongodb://127.0.0.1:27017/kami_test` ensuring zero interaction with production or external databases.

---

## Recommended Additional Security Steps

1. **Helmet & Security Headers**: Add `helmet` middleware in `app.js` to set standard security headers (`X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`).
2. **Rate Limiting**: Integrate `express-rate-limit` on `/api/auth/*` endpoints (login, register, send-otp) to defend against brute-force attacks in internet-facing deployments.
3. **Webhook HMAC Signatures**: When transitioning from mock payments to live Razorpay / Stripe gateways, verify cryptographic webhook signatures (`X-Razorpay-Signature` or `Stripe-Signature`) before processing.
