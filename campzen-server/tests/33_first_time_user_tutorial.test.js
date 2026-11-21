const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/user.model');
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

const setupUsers = async () => {
    const college = await College.create({
        name: 'Tutorial Test College',
        location: 'Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka'
    });

    const { user: student, token: studentToken } = await createTestUser({
        role: 'student',
        collegeId: college._id,
        name: 'New Student User',
        phone: '9988776655'
    });

    const { user: vendorUser, token: vendorToken } = await createTestUser({
        role: 'vendor_owner',
        collegeId: college._id,
        name: 'New Vendor Owner',
        phone: '9911223344'
    });

    return { college, student, studentToken, vendorUser, vendorToken };
};

test('TUT-01: Newly registered user has default onboardingStatus = NOT_STARTED', async () => {
    const env = await setupUsers();
    const userInDb = await User.findById(env.student._id);
    assert.equal(userInDb.onboardingStatus, 'NOT_STARTED');
    assert.equal(userInDb.onboardingVersion, 1);
});

test('TUT-02: GET /api/users/onboarding-status returns shouldShowTutorial = true for NOT_STARTED', async () => {
    const env = await setupUsers();

    const res = await request(app)
        .get('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.onboardingStatus, 'NOT_STARTED');
    assert.equal(res.body.data.shouldShowTutorial, true);
    assert.equal(res.body.data.role, 'student');
});

test('TUT-03: POST /api/users/onboarding-status with COMPLETED updates status and persists timestamp', async () => {
    const env = await setupUsers();

    const res = await request(app)
        .post('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ status: 'COMPLETED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.onboardingStatus, 'COMPLETED');
    assert.ok(res.body.data.onboardingCompletedAt);

    // Verify in DB
    const dbUser = await User.findById(env.student._id);
    assert.equal(dbUser.onboardingStatus, 'COMPLETED');
    assert.ok(dbUser.onboardingCompletedAt);
});

test('TUT-04: After completion, subsequent GET returns shouldShowTutorial = false across device reloads', async () => {
    const env = await setupUsers();

    // Mark completed
    await request(app)
        .post('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ status: 'COMPLETED' });

    // Subsequent app launch
    const res = await request(app)
        .get('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.onboardingStatus, 'COMPLETED');
    assert.equal(res.body.data.shouldShowTutorial, false);
});

test('TUT-05: POST /api/users/onboarding-status with SKIPPED prevents future tutorial auto-popups', async () => {
    const env = await setupUsers();

    const res = await request(app)
        .post('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ status: 'SKIPPED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.onboardingStatus, 'SKIPPED');

    const checkRes = await request(app)
        .get('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`);

    assert.equal(checkRes.body.data.shouldShowTutorial, false);
});

test('TUT-06: Invalid onboarding status returns HTTP 400', async () => {
    const env = await setupUsers();

    const res = await request(app)
        .post('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ status: 'UNKNOWN_STATUS' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Invalid onboarding status/);
});

test('TUT-07: POST /api/users/reset-tutorial resets onboardingStatus to NOT_STARTED for manual App Tour', async () => {
    const env = await setupUsers();

    // User first completed the tutorial
    await request(app)
        .post('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`)
        .send({ status: 'COMPLETED' });

    // User taps "Replay App Tour" in settings
    const resetRes = await request(app)
        .post('/api/users/reset-tutorial')
        .set('Authorization', `Bearer ${env.studentToken}`);

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.data.onboardingStatus, 'NOT_STARTED');

    // Next home visit will show the tutorial
    const statusRes = await request(app)
        .get('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.studentToken}`);

    assert.equal(statusRes.body.data.shouldShowTutorial, true);
});

test('TUT-08: Vendor user receives vendor-specific role in onboarding status', async () => {
    const env = await setupUsers();

    const res = await request(app)
        .get('/api/users/onboarding-status')
        .set('Authorization', `Bearer ${env.vendorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.onboardingStatus, 'NOT_STARTED');
    assert.equal(res.body.data.shouldShowTutorial, true);
    assert.equal(res.body.data.role, 'vendor_owner');
});

test('TUT-09: Migration logic marks existing accounts as COMPLETED to protect legacy users', async () => {
    // Create legacy accounts directly in DB without onboardingStatus (simulating pre-rollout state)
    const college = await College.create({
        name: 'Legacy College',
        location: 'Mysuru',
        city: 'Mysuru',
        state: 'Karnataka'
    });

    const legacyStudent = await User.create({
        phone: '9900112233',
        name: 'Legacy Student',
        role: 'student',
        collegeId: college._id,
        isVerified: true,
        createdAt: new Date('2025-01-01T00:00:00Z')
    });

    const legacyVendor = await User.create({
        phone: '9900112244',
        name: 'Legacy Vendor',
        role: 'vendor_owner',
        collegeId: college._id,
        isVerified: true,
        createdAt: new Date('2025-01-01T00:00:00Z')
    });

    // Run migration update query
    const rolloutTimestamp = new Date();
    await User.updateMany(
        {
            $or: [
                { onboardingStatus: { $exists: false } },
                { onboardingStatus: null },
                { onboardingStatus: 'NOT_STARTED' }
            ],
            createdAt: { $lte: rolloutTimestamp }
        },
        {
            $set: {
                onboardingStatus: 'COMPLETED',
                onboardingVersion: 1,
                onboardingCompletedAt: new Date()
            }
        }
    );

    const migratedStudent = await User.findById(legacyStudent._id);
    const migratedVendor = await User.findById(legacyVendor._id);

    assert.equal(migratedStudent.onboardingStatus, 'COMPLETED');
    assert.equal(migratedVendor.onboardingStatus, 'COMPLETED');
});
