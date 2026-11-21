# Kami Backend — API Test Results & Inventory

This document details every API endpoint present in the Kami backend, its parameters, authentication rules, expected responses, error behaviors, and test execution status.

---

## Endpoint Inventory & Test Matrix

| Method | Endpoint | Auth | Roles | Request Body / Query Params | Expected Status | Status |
|---|---|---|---|---|---|---|
| `GET` | `/api` | None | Public | None | `200 OK` | **PASS** |
| `GET` | `/api/health` | None | Public | None | `200 OK` | **PASS** |
| `POST` | `/api/auth/register` | None | Public | `{ name, phone, email, password, role }` | `201 Created` / `400 Bad Request` | **PASS** |
| `POST` | `/api/auth/login` | None | Public | `{ phone, password }` | `200 OK` / `401 Unauthorized` | **PASS** |
| `POST` | `/api/auth/google` | None | Public | `{ idToken }` | `200 OK` / `401 Unauthorized` | **PASS** |
| `POST` | `/api/auth/send-otp` | Bearer | Any Authenticated | `{ phone }` | `200 OK` / `400 Bad Request` | **PASS** |
| `POST` | `/api/auth/verify-otp` | Bearer | Any Authenticated | `{ otp }` | `200 OK` / `400 Bad Request` | **PASS** |
| `GET` | `/api/users/me` | Bearer | Any Authenticated | None | `200 OK` / `401 Unauthorized` | **PASS** |
| `PUT` | `/api/users/me` | Bearer | Any Authenticated | `{ name, email, addresses, collegeId, studentId }` | `200 OK` / `400 Bad Request` | **PASS** |
| `GET` | `/api/colleges` | None | Public | None | `200 OK` | **PASS** |
| `POST` | `/api/colleges` | Bearer | `admin` | `{ name, location, city, state, country, domain }` | `201 Created` / `403 Forbidden` | **PASS** |
| `GET` | `/api/vendors` | Bearer | Any Authenticated | `?collegeId=&search=&colorPrinting=&binding=&page=&limit=` | `200 OK` (Paginated) | **PASS** |
| `POST` | `/api/vendors` | Bearer | `vendor_owner`, `admin` | `{ name, collegeId, address, capabilities, delivery }` | `201 Created` / `400 Bad Request` | **PASS** |
| `GET` | `/api/vendors/me` | Bearer | `vendor_owner`, `vendor_staff`, `admin` | None | `200 OK` / `404 Not Found` | **PASS** |
| `POST` | `/api/vendors/rate-cards` | Bearer | `vendor_owner`, `admin` | `{ paperSize, paperType, colorMode, sides, minPages, maxPages, pricePerPage }` | `201 Created` / `400 Bad Request` | **PASS** |
| `GET` | `/api/vendors/rate-cards` | Bearer | `vendor_owner`, `vendor_staff`, `admin` | None | `200 OK` | **PASS** |
| `POST` | `/api/vendors/finishing-rates` | Bearer | `vendor_owner`, `admin` | `{ finishingType, price }` | `201 Created` / `400 Bad Request` | **PASS** |
| `GET` | `/api/vendors/finishing-rates` | Bearer | `vendor_owner`, `vendor_staff`, `admin` | None | `200 OK` | **PASS** |
| `POST` | `/api/documents/upload` | Bearer | Any Authenticated | `multipart/form-data` with field `file` | `201 Created` / `400 Bad Request` | **PASS** |
| `GET` | `/api/documents/:id` | Bearer | Owner, Admin | `:id` (ObjectId) | `200 OK` / `403 Forbidden` | **PASS** |
| `POST` | `/api/orders` | Bearer | Any Authenticated | `{ documentId, vendorId, fulfillmentType, printSettings }` | `201 Created` / `400 Bad Request` | **PASS** |
| `GET` | `/api/orders` | Bearer | Any Authenticated | None | `200 OK` (User's order history) | **PASS** |
| `GET` | `/api/orders/:id` | Bearer | Owner, Vendor, Admin | `:id` (OrderId) | `200 OK` / `403 Forbidden` | **PASS** |
| `GET` | `/api/orders/vendor` | Bearer | `vendor_owner`, `vendor_staff`, `admin` | None | `200 OK` (Active FIFO queue) | **PASS** |
| `PUT` | `/api/orders/:id/status` | Bearer | `vendor_owner`, `vendor_staff`, `admin` | `{ status, note }` | `200 OK` / `400 Bad Request` | **PASS** |
| `POST` | `/api/orders/:id/pickup` | Bearer | `vendor_owner`, `vendor_staff`, `admin` | `{ pickupCode }` | `200 OK` / `400 Bad Request` | **PASS** |
| `POST` | `/api/payments/mock-intent` | Bearer | Any Authenticated | `{ orderId }` | `201 Created` / `400 Bad Request` | **PASS** |
| `POST` | `/api/payments/webhook` | None | Public Gateway | `{ gatewayPaymentId, status, method }` | `200 OK` (Idempotent) | **PASS** |

---

## Detailed Test Scenarios Evaluated

### Authentication & Authorization
- **Valid Registration**: Successfully created student and vendor accounts with hashed passwords and signed JWTs.
- **Duplicate Prevention**: Accurately rejected duplicate phone numbers (`400 Bad Request`).
- **Validation**: Rejection of malformed phone numbers and passwords < 6 characters.
- **Protected Routes**: Accessing without token or with malformed token returns `401 Unauthorized`.
- **RBAC**: Non-admin roles attempting admin endpoints (e.g. creating colleges) blocked with `403 Forbidden`.
- **Privilege Escalation**: Users cannot update their role to `admin` via `PUT /api/users/me`.

### Document Pipeline
- **MIME Type Validation**: Accepted valid PDF documents; rejected `.txt` with `400 Bad Request`.
- **File Upload Limits**: Enforced 10MB file size limit.
- **Background Extraction**: Asynchronously parsed total page count using `pdf-lib` without blocking client response.
- **IDOR Protection**: Verified that User B cannot inspect metadata of User A's document (`403 Forbidden`).

### Pricing Engine
- **Volume Tiers**: Verified slab boundary calculation (tested exact boundary conditions 50 and 51 pages).
- **Page Ranges**: Verified `'all'`, `'1,3,5-7'`, and rejected `'5-2'` and ranges exceeding document length.
- **Finishing & Copies**: Verified multi-copy multiplication and correct addition of finishing charges (binding, lamination).

### Order Lifecycle & State Machine
- **Creation**: Authoritative server-side pricing; calculated platform fee (`₹2.00`), delivery fee, and print subtotal.
- **Audit Logging**: Every status change produced an immutable `OrderEvent` document.
- **Vendor State Progression**: Successfully transitioned `PAID -> PRINTING -> FINISHING -> READY -> COMPLETED`.
- **Transition Guard**: Disallowed skipping stages or reversing completed orders (`400 Bad Request`).
- **Counter Pickup**: Verified 4-digit pickup code handoff; disallowed repeated pickup on completed orders.

### Payments & Concurrency
- **Intent Generation**: Generated unique gateway intent IDs for pending orders.
- **Webhook Processing**: Validated successful payment transitions order to `PAID` and sets `paidAt`.
- **Atomic Idempotency**: 5 concurrent webhooks executing at the exact same millisecond produced exactly 1 state change and 1 audit record.
