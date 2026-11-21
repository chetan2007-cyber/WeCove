const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB, createTestUser } = require('./helpers/test-db');

before(async () => {
    await connectTestDB();
});

after(async () => {
    await closeTestDB();
});

test('Performance: Critical endpoints respond within acceptable SLA thresholds', async () => {
    const { token } = await createTestUser();

    // 1. Health check SLA (< 100ms)
    const t0 = performance.now();
    const healthRes = await request(app).get('/api/health');
    const healthDuration = performance.now() - t0;
    assert.equal(healthRes.status, 200);
    assert.ok(healthDuration < 200, `Health check took ${healthDuration.toFixed(2)}ms (expected < 200ms)`);

    // 2. Colleges list SLA (< 200ms)
    const t1 = performance.now();
    const collegeRes = await request(app).get('/api/colleges');
    const collegeDuration = performance.now() - t1;
    assert.equal(collegeRes.status, 200);
    assert.ok(collegeDuration < 300, `College list took ${collegeDuration.toFixed(2)}ms (expected < 300ms)`);

    // 3. Vendors list with pagination SLA (< 300ms)
    const t2 = performance.now();
    const vendorRes = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${token}`);
    const vendorDuration = performance.now() - t2;
    assert.equal(vendorRes.status, 200);
    assert.ok(vendorDuration < 400, `Vendor list took ${vendorDuration.toFixed(2)}ms (expected < 400ms)`);

    // 4. Repeated requests memory check (50 consecutive requests)
    const initialMem = process.memoryUsage().heapUsed;
    for (let i = 0; i < 50; i++) {
        await request(app).get('/api/health');
    }
    const finalMem = process.memoryUsage().heapUsed;
    const memDiffMB = (finalMem - initialMem) / (1024 * 1024);

    // Memory growth should not exceed 25MB for 50 lightweight requests
    assert.ok(memDiffMB < 25, `Memory grew by ${memDiffMB.toFixed(2)}MB over 50 requests`);
});
