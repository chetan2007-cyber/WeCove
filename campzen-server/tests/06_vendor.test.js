const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
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

test('POST /api/vendors - Vendor owner can create shop', async () => {
    const college = await College.create({
        name: 'Test College',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { user, token } = await createTestUser({ role: 'vendor_owner' });

    const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Campus Print Shop',
            collegeId: college._id,
            address: { line1: 'Gate 2' },
            capabilities: {
                colorPrinting: true,
                paperSizes: ['A4', 'A3'],
                bindingTypes: ['spiral', 'stapling']
            }
        });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Campus Print Shop');
    assert.equal(res.body.data.ownerId, user._id.toString());
});

test('POST /api/vendors - Prevents owner from creating multiple shops in MVP', async () => {
    const college = await College.create({
        name: 'Test College',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { token } = await createTestUser({ role: 'vendor_owner' });

    // First shop
    await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Shop 1',
            collegeId: college._id,
            address: { line1: 'Gate 1' }
        });

    // Attempt second shop
    const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Shop 2',
            collegeId: college._id,
            address: { line1: 'Gate 2' }
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already have a registered shop/i);
});

test('GET /api/vendors/me - Returns own vendor shop', async () => {
    const college = await College.create({
        name: 'Test College',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { user, token } = await createTestUser({ role: 'vendor_owner' });
    await Vendor.create({
        name: 'My Custom Shop',
        ownerId: user._id,
        collegeId: college._id,
        address: { line1: 'Main Building' }
    });

    const res = await request(app)
        .get('/api/vendors/me')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'My Custom Shop');
    assert.equal(res.body.data.collegeId.name, 'Test College');
});

test('GET /api/vendors - Paginated list and filters for students', async () => {
    const college = await College.create({
        name: 'Test College',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { user: owner1 } = await createTestUser({ role: 'vendor_owner' });
    const { user: owner2 } = await createTestUser({ role: 'vendor_owner' });

    await Vendor.create({
        name: 'Alpha Xerox',
        ownerId: owner1._id,
        collegeId: college._id,
        address: { line1: 'Loc 1' },
        status: 'active',
        capabilities: { colorPrinting: true }
    });

    await Vendor.create({
        name: 'Beta Xerox',
        ownerId: owner2._id,
        collegeId: college._id,
        address: { line1: 'Loc 2' },
        status: 'active',
        capabilities: { colorPrinting: false }
    });

    const { token } = await createTestUser({ role: 'student' });

    // Filter by colorPrinting
    const res = await request(app)
        .get('/api/vendors?colorPrinting=true')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].name, 'Alpha Xerox');
    assert.equal(res.body.pagination.total, 1);
});

test('POST & GET /api/vendors/rate-cards - Vendor can configure rate cards', async () => {
    const college = await College.create({
        name: 'Test College',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { user, token } = await createTestUser({ role: 'vendor_owner' });
    await Vendor.create({
        name: 'Print Hub',
        ownerId: user._id,
        collegeId: college._id,
        address: { line1: 'Hub Gate' }
    });

    // 1. Add Rate Card
    const postRes = await request(app)
        .post('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
            paperSize: 'A4',
            paperType: '70gsm',
            colorMode: 'B&W',
            sides: 'single',
            minPages: 1,
            maxPages: 50,
            pricePerPage: 2.00
        });

    assert.equal(postRes.status, 201);
    assert.equal(postRes.body.success, true);
    assert.equal(postRes.body.data.pricePerPage, 2.00);

    // 2. Fetch Rate Cards
    const getRes = await request(app)
        .get('/api/vendors/rate-cards')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.count, 1);
    assert.equal(getRes.body.data[0].paperSize, 'A4');
});

test('POST & GET /api/vendors/finishing-rates - Vendor can configure finishing rates', async () => {
    const college = await College.create({
        name: 'Test College',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });
    const { user, token } = await createTestUser({ role: 'vendor_owner' });
    await Vendor.create({
        name: 'Print Hub',
        ownerId: user._id,
        collegeId: college._id,
        address: { line1: 'Hub Gate' }
    });

    // 1. Add Finishing Rate
    const postRes = await request(app)
        .post('/api/vendors/finishing-rates')
        .set('Authorization', `Bearer ${token}`)
        .send({
            finishingType: 'spiral_binding',
            price: 35.00
        });

    assert.equal(postRes.status, 201);
    assert.equal(postRes.body.success, true);
    assert.equal(postRes.body.data.price, 35.00);

    // 2. Fetch Finishing Rates
    const getRes = await request(app)
        .get('/api/vendors/finishing-rates')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.count, 1);
    assert.equal(getRes.body.data[0].finishingType, 'spiral_binding');
});

