# Testing Guide — Kami Backend

This guide explains how to configure, run, and extend the automated test suite for the Kami backend.

---

## 1. Prerequisites

- **Node.js**: v20+ (tested on Node v24.14.0)
- **MongoDB**: Local MongoDB instance running on `127.0.0.1:27017`

---

## 2. Environment Configuration

Tests run in an isolated test environment using `.env.test`.

Configuration present in `.env.test`:
```ini
PORT=5001
NODE_ENV=test
MONGO_URI=mongodb://127.0.0.1:27017/kami_test
JWT_SECRET=test_super_secret_jwt_key_for_testing_only_12345
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=mock_google_client_id_for_testing
```

> **Safety Guarantee**: The test database is strictly `kami_test`. Production or development databases are never touched.

---

## 3. Running Tests

### Run Full Test Suite
```bash
npm test
```
*Executes all 15 test suites sequentially (`--test-concurrency=1`) using Node's native high-performance test runner.*

### Run Tests with Code Coverage
```bash
npm run test:coverage
```
*Generates line, branch, and function coverage metrics across all controllers, services, models, and routes.*

### Run a Single Test Suite
```bash
node --test tests/01_startup_health.test.js
node --test tests/09_order_lifecycle.test.js
node --test tests/13_e2e_full_journey.test.js
```

---

## 4. Test Suite Structure

```
server/
├── tests/
│   ├── helpers/
│   │   └── test-db.js                # Database connection, clearing, and user seeding utilities
│   ├── 01_startup_health.test.js     # Health endpoint, base router, 404 handler
│   ├── 02_auth.test.js               # Registration, login, OTP lifecycle, token validation
│   ├── 03_rbac_security.test.js      # Role-based access control, privilege escalation, cross-tenant isolation
│   ├── 04_user_profile.test.js       # Profile retrieval, updates, address management
│   ├── 05_college.test.js            # College creation by admin, public listing
│   ├── 06_vendor.test.js             # Shop creation, rate cards, finishing rates, search & pagination
│   ├── 07_document.test.js           # File uploads, MIME validation, background processing, IDOR
│   ├── 08_pricing.test.js            # Pricing engine unit tests, volume tier slabs, finishing rates
│   ├── 09_order_lifecycle.test.js    # Print orders, status transitions, vendor queues, pickup OTP
│   ├── 10_payment.test.js            # Mock payment intents, webhook callbacks, idempotency
│   ├── 11_concurrency_race.test.js   # Parallel payment webhooks race condition validation
│   ├── 12_cron_cleanup.test.js       # Expired document physical deletion, stale order auto-cancellation
│   ├── 13_e2e_full_journey.test.js   # Realistic student-to-vendor lifecycle & negative scenarios
│   ├── 14_security_audit.test.js     # NoSQL injection, malformed JSON, forged tokens, path traversal
│   └── 15_performance.test.js        # SLA response times and memory stability checks
```
