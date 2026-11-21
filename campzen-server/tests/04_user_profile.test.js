const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
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

test('GET /api/users/me - Returns authenticated user profile', async () => {
    const { token, user } = await createTestUser({ name: 'Aarav Patel', role: 'student' });

    const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Aarav Patel');
    assert.equal(res.body.data.role, 'student');
    assert.equal(res.body.data.password, undefined); // Password must NEVER be returned
});

test('PUT /api/users/me - Updates user name and address', async () => {
    const { token, user } = await createTestUser();

    const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Updated Name',
            addresses: [{ line1: 'Room 402, Ganga Hostel', label: 'hostel', isDefault: true }]
        });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Updated Name');
    assert.equal(res.body.data.addresses.length, 1);
    assert.equal(res.body.data.addresses[0].line1, 'Room 402, Ganga Hostel');
});

test('Security / Privilege Escalation: Student cannot escalate role to admin via profile update', async () => {
    const { token, user } = await createTestUser({ role: 'student' });

    const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
            role: 'admin'
        });

    assert.equal(res.status, 200);
    // User in DB must remain 'student'
    const updatedUser = await User.findById(user._id);
    assert.equal(updatedUser.role, 'student');
});

test('PUT /api/users/me - Rejects invalid email format', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
            email: 'not-an-email'
        });

    // Should return 400 validation error, not 500
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
});
