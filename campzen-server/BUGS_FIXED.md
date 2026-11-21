# Kami Backend — Bugs Discovered & Fixed Report

This document details all bugs, logic flaws, race conditions, security vulnerabilities, and API gaps identified during the comprehensive audit and testing of the Kami backend, along with their root cause and resolution.

---

## Summary of Fixes

| ID | Category | Severity | File | Issue Summary | Status |
|---|---|---|---|---|---|
| BUG-01 | Security | **CRITICAL** | `src/controllers/auth.controller.js` | NoSQL operator injection in Login (`{ phone: { $ne: null } }`) allowed unauthorized account access | **FIXED** |
| BUG-02 | Reliability / Concurrency | **HIGH** | `src/controllers/payment.controller.js` | Webhook check-then-act race condition created duplicate `OrderEvent` logs and order transitions | **FIXED** |
| BUG-03 | Reliability | **HIGH** | `src/models/user.model.js` | Duplicate `phone` definition in schema erased 10-digit validation regex and required constraints | **FIXED** |
| BUG-04 | Auth / Reliability | **HIGH** | `src/controllers/auth.controller.js` | `googleLogin` referenced undefined `jwt` (`ReferenceError`) and schema rejected OAuth users missing password | **FIXED** |
| BUG-05 | Security / Reliability | **HIGH** | `src/middleware/auth.middleware.js` | `protect` middleware set `req.user = null` on deleted/missing IDs, causing uncaught `TypeError` crashes | **FIXED** |
| BUG-06 | Security / IDOR | **HIGH** | `src/controllers/order.controller.js` | Order creation did not enforce document ownership, allowing students to print another student's document | **FIXED** |
| BUG-07 | Authorization / RBAC | **MEDIUM** | `src/controllers/order.controller.js`, `vendor.controller.js` | Vendor staff (`vendor_staff`) could not access shop queues or update orders because checks only inspected `ownerId` | **FIXED** |
| BUG-08 | Business Logic | **MEDIUM** | `src/controllers/order.controller.js` | No status transition validation allowed arbitrary status changes (e.g. `COMPLETED` -> `PRINTING`) | **FIXED** |
| BUG-09 | Business Logic | **MEDIUM** | `src/services/pricing.service.js` | `calculatePageCount` allowed inverted ranges (`5-2`), negative counts, and ranges exceeding document pages | **FIXED** |
| BUG-10 | Data Model Inconsistency | **MEDIUM** | `src/models/vendor.model.js` | `bindingTypes` enum differed between models (`'spiral'` vs `'spiral_binding'`), causing schema validation rejections | **FIXED** |
| BUG-11 | API Contract | **MEDIUM** | Multiple Controllers | Mongoose validation errors returned unhandled HTTP 500 instead of HTTP 400 Bad Request | **FIXED** |
| BUG-12 | API Gap | **MEDIUM** | `src/routes/order.routes.js` | Students had no API endpoints to retrieve their orders (`GET /api/orders` & `GET /api/orders/:id`) | **FIXED** |
| BUG-13 | API Gap | **MEDIUM** | `src/routes/document.routes.js` | No endpoint to view document metadata (`GET /api/documents/:id`) with IDOR protection | **FIXED** |
| BUG-14 | API Gap | **MEDIUM** | `src/routes/vendor.routes.js` | Vendors had no API endpoints to configure rate cards and finishing rates via HTTP | **FIXED** |
| BUG-15 | Fulfillment | **MEDIUM** | `src/controllers/order.controller.js` | No pickup OTP verification endpoint at the vendor counter; pickupCode was never generated upon payment | **FIXED** |
| BUG-16 | DevOps / Warnings | **LOW** | `user.controller.js`, `document.service.js` | Mongoose 9 deprecation warning: `new: true` used instead of `returnDocument: 'after'` | **FIXED** |

---

## Detailed Bug Breakdown

### 1. BUG-01: NoSQL Operator Injection in Authentication
- **Symptom**: Submitting `{ "phone": { "$ne": null }, "password": "password123" }` matched the first registered user with that password, logging in without knowledge of the target phone number.
- **Root Cause**: `req.body.phone` was passed directly into `User.findOne({ phone })` without type validation.
- **Fix**: Added strict type checking in `signup`, `login`, `sendOtp`, and `verifyOtp` ensuring `typeof phone === 'string'` and `typeof password === 'string'`.

### 2. BUG-02: Payment Webhook Concurrency Race Condition
- **Symptom**: When 5 concurrent webhook calls were dispatched simultaneously for the same payment intent, 5 duplicate `OrderEvent` records were logged and the order was updated repeatedly.
- **Root Cause**: Check-then-act logic `Payment.findOne` followed by `payment.save()` allowed concurrent requests to slip past the `payment.status === 'successful'` check before any write finished.
- **Fix**: Replaced with atomic MongoDB findAndModify:
  ```javascript
  const payment = await Payment.findOneAndUpdate(
      { gatewayPaymentId, status: { $ne: 'successful' } },
      { $set: { status: 'successful', method: method || 'UPI', paidAt: new Date() } },
      { returnDocument: 'after' }
  );
  ```
  And atomically updated `Order.findOneAndUpdate({ _id: payment.orderId, status: 'PAYMENT_PENDING' }, { $set: { status: 'PAID' } })`.

### 3. BUG-03: Duplicate Schema Definition Overriding Validation
- **Symptom**: `POST /api/auth/register` accepted invalid phone numbers like `12345` without failing validation.
- **Root Cause**: In `user.model.js`, `phone` was defined on line 13 with regex validation, and then redefined on line 48 with `{ type: String, sparse: true, unique: true }`, completely overwriting the validator.
- **Fix**: Merged `phone` into a single schema property with regex validation and sparse index.

### 4. BUG-04: Google OAuth Missing Dependencies & Validation Rejection
- **Symptom**: Google OAuth login failed with `ReferenceError: jwt is not defined` and `ValidationError: Password is required`.
- **Root Cause**: `jwt` was not imported in `auth.controller.js`, `googleId` and `avatar` were absent from `user.model.js`, and password was unconditionally required.
- **Fix**: Imported `jwt`, added `googleId` and `avatar` to `userSchema`, and made password validation conditional (`if (!this.googleId && !v) return false`).

### 5. BUG-05: Missing User Check in Authentication Middleware
- **Symptom**: A valid JWT containing a deleted or non-existent user ID crashed downstream middleware and controllers with unhandled `TypeError: Cannot read properties of null`.
- **Root Cause**: `auth.middleware.js` assigned `req.user = await User.findById(decoded.id)` without checking if `req.user` existed.
- **Fix**: Added explicit check in `protect`:
  ```javascript
  if (!req.user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists' });
  }
  ```

### 6. BUG-06: Document Ownership & IDOR Vulnerability in Order Placement
- **Symptom**: Student A could submit Student B's `documentId` when placing an order.
- **Root Cause**: `createOrder` fetched the document but did not verify `document.userId.toString() === req.user.id.toString()`.
- **Fix**: Enforced ownership check: rejected with HTTP 403 if `document.userId` does not match `req.user.id`.

### 7. BUG-07: Vendor Staff Authorization Lockdown
- **Symptom**: Vendor staff members (`vendor_staff`) could not fetch shop orders or update statuses.
- **Root Cause**: `getVendorOrders` and `updateOrderStatus` performed `Vendor.findOne({ ownerId: req.user.id })`, omitting staff.
- **Fix**: Updated queries to inspect both owners and staff:
  `Vendor.findOne({ $or: [{ ownerId: req.user.id }, { staffIds: req.user.id }] })`.

### 8. BUG-08: Unvalidated Order Status Transitions
- **Symptom**: A vendor could update order status to arbitrary states or reverse completed orders back to printing.
- **Root Cause**: `updateOrderStatus` assigned `order.status = status` without lifecycle transition rules.
- **Fix**: Implemented strict transition matrix:
  - `PAID` -> `ACCEPTED`, `PRINTING`, `REJECTED`
  - `PRINTING` -> `FINISHING`, `READY`
  - `FINISHING` -> `READY`
  - `READY` -> `OUT_FOR_DELIVERY`, `COMPLETED`
  - `OUT_FOR_DELIVERY` -> `COMPLETED`

### 9. BUG-09: Unvalidated Page Ranges in Pricing Engine
- **Symptom**: Inverted page ranges (`5-2`) resulted in negative page count charges; requests with page numbers exceeding document length were allowed.
- **Root Cause**: `calculatePageCount` did not check `start <= end`, positive numbers, or document page boundaries.
- **Fix**: Hardened `calculatePageCount` with range validation, positive integer checks, and bounds checking against `totalDocPages`.

### 10. BUG-10: Inconsistent Finishing Enums Across Models
- **Symptom**: Creating a vendor shop offering `spiral_binding` failed with Mongoose enum validation error.
- **Root Cause**: `vendor.model.js` used `['spiral', 'comb']` while `finishingRate.model.js` and `printJob.model.js` used `['spiral_binding', 'comb_binding']`.
- **Fix**: Unified `vendorSchema.capabilities.bindingTypes` to support both short and canonical enum values.
