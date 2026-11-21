const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const College = require('../src/models/college.model');
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

test('GET /api/colleges - Public endpoint returns only active colleges', async () => {
    await College.create({
        name: 'Active College',
        location: 'Campus A',
        city: 'Mysuru',
        state: 'Karnataka',
        isActive: true
    });
    await College.create({
        name: 'Inactive College',
        location: 'Campus B',
        city: 'Mysuru',
        state: 'Karnataka',
        isActive: false
    });

    const res = await request(app).get('/api/colleges');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].name, 'Active College');
});

test('POST /api/colleges - Admin can create a new college', async () => {
    const { token } = await createTestUser({ role: 'admin' });

    const res = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'NIE Mysore',
            location: 'Mananthavadi Road',
            city: 'Mysuru',
            state: 'Karnataka',
            domain: 'nie.ac.in'
        });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'NIE Mysore');
});

test('POST /api/colleges - Missing required name should return 400', async () => {
    const { token } = await createTestUser({ role: 'admin' });

    const res = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${token}`)
        .send({
            location: 'Only Location'
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
});
