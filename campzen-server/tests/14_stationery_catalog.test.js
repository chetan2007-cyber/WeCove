const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
const College = require('../src/models/college.model');
const StationeryItem = require('../src/models/stationeryItem.model');
const { connectTestDB, clearTestDB, closeTestDB, createTestUser } = require('./helpers/test-db');

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

after(async () => {
    await closeTestDB();
});

test('GET /api/stationery - Browse public catalog and category filter', async () => {
    const college = await College.create({
        name: 'Test University',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { user: owner } = await createTestUser({ role: 'vendor_owner' });
    const vendor = await Vendor.create({
        name: 'Campus Stationery Hub',
        ownerId: owner._id,
        collegeId: college._id,
        address: { line1: 'Academic Block' }
    });

    await StationeryItem.create({
        vendorId: vendor._id,
        name: 'Kokuyo Washi Notebook',
        category: 'notebooks',
        price: 150,
        stock: 25,
        isAvailable: true
    });

    await StationeryItem.create({
        vendorId: vendor._id,
        name: 'Pilot G2 Gel Pen',
        category: 'pens_ink',
        price: 80,
        stock: 40,
        isAvailable: true
    });

    // 1. Fetch all
    const allRes = await request(app).get('/api/stationery');
    assert.strictEqual(allRes.status, 200);
    assert.strictEqual(allRes.body.success, true);
    assert.strictEqual(allRes.body.count, 2);

    // 2. Filter notebooks
    const catRes = await request(app).get('/api/stationery?category=notebooks');
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catRes.body.count, 1);
    assert.strictEqual(catRes.body.data[0].name, 'Kokuyo Washi Notebook');
});

test('POST /api/stationery - RBAC: Vendor can create item, Student rejected', async () => {
    const college = await College.create({
        name: 'Test University',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { user: owner, token: ownerToken } = await createTestUser({ role: 'vendor_owner' });
    const { token: studentToken } = await createTestUser({ role: 'student' });

    const vendor = await Vendor.create({
        name: 'Campus Shop',
        ownerId: owner._id,
        collegeId: college._id,
        address: { line1: 'Gate 1' }
    });

    // Vendor owner succeeds
    const createRes = await request(app)
        .post('/api/stationery')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
            vendorId: vendor._id,
            name: 'Tombow Mono Eraser',
            category: 'drafting',
            price: 60,
            stock: 30
        });

    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.success, true);
    assert.strictEqual(createRes.body.data.name, 'Tombow Mono Eraser');

    // Student rejected (403)
    const studentRes = await request(app)
        .post('/api/stationery')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            vendorId: vendor._id,
            name: 'Unauthorized Item',
            category: 'pens_ink',
            price: 10
        });

    assert.strictEqual(studentRes.status, 403);
});
