const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./helpers/test-db');

before(async () => {
    await connectTestDB();
});

after(async () => {
    await closeTestDB();
});

test('GET /api - Base router returns welcome message', async () => {
    const res = await request(app).get('/api');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Kami API Router is working!');
});

test('GET /api/health - Returns API and database health status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.api, 'running');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.timestamp);
});

test('GET /api/undefined-route-12345 - Returns 404 Route not found', async () => {
    const res = await request(app).get('/api/undefined-route-12345');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Route not found');
});
