const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
const College = require('../src/models/college.model');
const Category = require('../src/models/category.model');
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

const setupTestEnvironment = async () => {
    const college = await College.create({
        name: 'Test Tech Institute',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });

    const { user: ownerA, token: tokenA } = await createTestUser({ role: 'vendor_owner' });
    const vendorA = await Vendor.create({
        name: 'Vendor A Stationery',
        ownerId: ownerA._id,
        collegeId: college._id,
        address: { line1: 'Block A' },
        status: 'active',
        isApproved: true,
        source: 'KAMI'
    });

    const { user: ownerB, token: tokenB } = await createTestUser({ role: 'vendor_owner' });
    const vendorB = await Vendor.create({
        name: 'Vendor B Supplies',
        ownerId: ownerB._id,
        collegeId: college._id,
        address: { line1: 'Block B' },
        status: 'active',
        isApproved: true,
        source: 'KAMI'
    });

    const category = await Category.create({
        name: 'Engineering Kits',
        slug: 'engineering-kits',
        applicableListingTypes: ['VENDOR_PRODUCT'],
        isActive: true
    });

    const inactiveCat = await Category.create({
        name: 'Discontinued Items',
        slug: 'discontinued-items',
        applicableListingTypes: ['VENDOR_PRODUCT'],
        isActive: false
    });

    return { college, ownerA, tokenA, vendorA, ownerB, tokenB, vendorB, category, inactiveCat };
};

test('Vendor creates product with variants, SKU, brand, and categoryId', async () => {
    const env = await setupTestEnvironment();

    const res = await request(app)
        .post('/api/stationery')
        .set('Authorization', `Bearer ${env.tokenA}`)
        .send({
            vendorId: env.vendorA._id,
            name: 'Rotring Rapid Pro Drafting Pen',
            categoryId: env.category._id,
            brand: 'Rotring',
            sku: 'ROTR-05-BLK',
            price: 450,
            stock: 15,
            variants: [
                { name: '0.5mm Black', sku: 'ROTR-05-B', price: 450, stock: 8 },
                { name: '0.7mm Black', sku: 'ROTR-07-B', price: 470, stock: 7 }
            ],
            tags: ['drafting', 'mechanical', 'engineering']
        });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.brand, 'Rotring');
    assert.strictEqual(res.body.data.variants.length, 2);
    assert.strictEqual(res.body.data.variants[0].name, '0.5mm Black');
    assert.strictEqual(res.body.data.category, 'engineering-kits');
});

test('Vendor cannot create product in an inactive category', async () => {
    const env = await setupTestEnvironment();

    const res = await request(app)
        .post('/api/stationery')
        .set('Authorization', `Bearer ${env.tokenA}`)
        .send({
            vendorId: env.vendorA._id,
            name: 'Old Stock',
            categoryId: env.inactiveCat._id,
            price: 100
        });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
});

test('Vendor Isolation: Vendor B cannot modify or delete Vendor A product', async () => {
    const env = await setupTestEnvironment();

    const item = await StationeryItem.create({
        vendorId: env.vendorA._id,
        name: 'Casio FX-991CW',
        category: 'calculators',
        price: 1200,
        stock: 5
    });

    // Vendor B attempts to update Vendor A's product -> 403 Forbidden
    const updateRes = await request(app)
        .put(`/api/stationery/${item._id}`)
        .set('Authorization', `Bearer ${env.tokenB}`)
        .send({ price: 100 });
    assert.strictEqual(updateRes.status, 403);

    // Vendor B attempts to delete Vendor A's product -> 403 Forbidden
    const deleteRes = await request(app)
        .delete(`/api/stationery/${item._id}`)
        .set('Authorization', `Bearer ${env.tokenB}`);
    assert.strictEqual(deleteRes.status, 403);

    // Item remains untouched
    const checkItem = await StationeryItem.findById(item._id);
    assert.strictEqual(checkItem.price, 1200);
    assert.strictEqual(checkItem.isAvailable, true);
});

test('Soft Deactivation preserves document and hides from public catalog', async () => {
    const env = await setupTestEnvironment();

    const item = await StationeryItem.create({
        vendorId: env.vendorA._id,
        name: 'Graph Paper Pad',
        category: 'engineering-kits',
        price: 40,
        stock: 50,
        isAvailable: true
    });

    // Vendor A deactivates product
    const delRes = await request(app)
        .delete(`/api/stationery/${item._id}`)
        .set('Authorization', `Bearer ${env.tokenA}`);
    assert.strictEqual(delRes.status, 200);

    // Still exists in DB with isAvailable = false
    const checkItem = await StationeryItem.findById(item._id);
    assert.strictEqual(checkItem.isAvailable, false);

    // Hidden from public catalog
    const catalogRes = await request(app).get('/api/stationery');
    assert.ok(!catalogRes.body.data.some(i => i._id.toString() === item._id.toString()));
});

test('Atomic stock deduction and oversell prevention during checkout', async () => {
    const env = await setupTestEnvironment();
    const { token: studentToken } = await createTestUser({ role: 'student' });

    const item = await StationeryItem.create({
        vendorId: env.vendorA._id,
        name: 'Scientific Calculator',
        category: 'calculators',
        price: 900,
        stock: 2, // Only 2 in stock
        isAvailable: true
    });

    // Student attempts to buy 3 (more than stock) -> Rejection
    const failRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            vendorId: env.vendorA._id,
            fulfillmentType: 'pickup',
            stationeryItems: [{ itemId: item._id, quantity: 3 }]
        });
    assert.strictEqual(failRes.status, 400);

    // Student buys 2 -> Success, stock drops to 0, salesCount = 2
    const successRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            vendorId: env.vendorA._id,
            fulfillmentType: 'pickup',
            stationeryItems: [{ itemId: item._id, quantity: 2 }]
        });
    assert.strictEqual(successRes.status, 201);

    const updatedItem = await StationeryItem.findById(item._id);
    assert.strictEqual(updatedItem.stock, 0);
    assert.strictEqual(updatedItem.salesCount, 2);

    // Next order attempt fails atomically because stock is 0
    const outOfStockRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            vendorId: env.vendorA._id,
            fulfillmentType: 'pickup',
            stationeryItems: [{ itemId: item._id, quantity: 1 }]
        });
    assert.strictEqual(outOfStockRes.status, 400);
});

test('Vendor Product Performance metrics endpoint', async () => {
    const env = await setupTestEnvironment();

    await StationeryItem.create({
        vendorId: env.vendorA._id,
        name: 'Notebook 200 Pages',
        category: 'notebooks',
        price: 60,
        stock: 4, // low stock <= 5
        salesCount: 42,
        isAvailable: true
    });

    await StationeryItem.create({
        vendorId: env.vendorA._id,
        name: 'Gel Pen Blue',
        category: 'pens',
        price: 20,
        stock: 0, // out of stock
        salesCount: 150,
        isAvailable: true
    });

    const perfRes = await request(app)
        .get(`/api/stationery/vendor/${env.vendorA._id}/performance`)
        .set('Authorization', `Bearer ${env.tokenA}`);

    assert.strictEqual(perfRes.status, 200);
    assert.strictEqual(perfRes.body.success, true);
    assert.strictEqual(perfRes.body.data.lowStockCount, 2);
    assert.strictEqual(perfRes.body.data.outOfStockCount, 1);
    assert.strictEqual(perfRes.body.data.topSellers[0].name, 'Gel Pen Blue');
});
