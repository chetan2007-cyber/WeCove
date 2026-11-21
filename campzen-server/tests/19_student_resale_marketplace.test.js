const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const College = require('../src/models/college.model');
const Category = require('../src/models/category.model');
const StudentListing = require('../src/models/studentListing.model');
const ResaleTransaction = require('../src/models/resaleTransaction.model');
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

const setupResaleTestEnv = async () => {
    const college = await College.create({
        name: 'National Engineering College',
        location: 'North Campus',
        city: 'Mysuru',
        state: 'Karnataka'
    });

    const { user: studentSeller, token: sellerToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: studentBuyerA, token: buyerAToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: studentBuyerB, token: buyerBToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: vendorUser, token: vendorToken } = await createTestUser({ role: 'vendor_owner', collegeId: college._id });

    const resaleCategory = await Category.create({
        name: 'Scientific Calculators',
        slug: 'scientific-calculators',
        applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE'],
        isActive: true
    });

    const vendorOnlyCategory = await Category.create({
        name: 'Bulk Print Reams',
        slug: 'bulk-print-reams',
        applicableListingTypes: ['VENDOR_PRODUCT'],
        isActive: true
    });

    return {
        college,
        studentSeller,
        sellerToken,
        studentBuyerA,
        buyerAToken,
        studentBuyerB,
        buyerBToken,
        vendorUser,
        vendorToken,
        resaleCategory,
        vendorOnlyCategory
    };
};

test('Student creates resale listing and enforces category eligibility', async () => {
    const env = await setupResaleTestEnv();

    // 1. Rejected if category does not permit STUDENT_RESALE
    const failRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.sellerToken}`)
        .send({
            title: 'Casio fx-991ES Plus',
            description: 'Used for 2 semesters, perfect working condition',
            categoryId: env.vendorOnlyCategory._id,
            condition: 'GOOD',
            price: 650,
            collegeId: env.college._id
        });
    assert.strictEqual(failRes.status, 400);
    assert.ok(failRes.body.message.includes('does not permit student resale'));

    // 2. Successful creation under valid category
    const successRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.sellerToken}`)
        .send({
            title: 'Casio fx-991ES Plus 2nd Edition',
            description: 'Used for 1 semester in Maths 1 & 2. Clear display and new battery.',
            categoryId: env.resaleCategory._id,
            condition: 'LIKE_NEW',
            price: 700,
            brand: 'Casio',
            modelNumber: 'fx-991ES Plus',
            preferredHandover: 'in_person_campus',
            pickupLocation: 'Main Library Lawn',
            collegeId: env.college._id
        });

    assert.strictEqual(successRes.status, 201);
    assert.strictEqual(successRes.body.success, true);
    assert.strictEqual(successRes.body.data.status, 'ACTIVE');
    assert.strictEqual(successRes.body.data.condition, 'LIKE_NEW');
    assert.strictEqual(successRes.body.data.sellerId.toString(), env.studentSeller._id.toString());
});

test('Student Listing RBAC: Only owner can edit/delist; Vendor cannot modify', async () => {
    const env = await setupResaleTestEnv();

    const listing = await StudentListing.create({
        sellerId: env.studentSeller._id,
        collegeId: env.college._id,
        categoryId: env.resaleCategory._id,
        title: 'Drafter & Engineering Set',
        description: 'Mini drafter with scale',
        condition: 'GOOD',
        price: 350
    });

    // Buyer A cannot edit seller listing (403)
    const buyerEditRes = await request(app)
        .put(`/api/resale/listings/${listing._id}`)
        .set('Authorization', `Bearer ${env.buyerAToken}`)
        .send({ price: 100 });
    assert.strictEqual(buyerEditRes.status, 403);

    // Vendor cannot edit student resale listing (403)
    const vendorEditRes = await request(app)
        .put(`/api/resale/listings/${listing._id}`)
        .set('Authorization', `Bearer ${env.vendorToken}`)
        .send({ price: 500 });
    assert.strictEqual(vendorEditRes.status, 403);

    // Seller updates own listing
    const sellerUpdateRes = await request(app)
        .put(`/api/resale/listings/${listing._id}`)
        .set('Authorization', `Bearer ${env.sellerToken}`)
        .send({ price: 300 });
    assert.strictEqual(sellerUpdateRes.status, 200);
    assert.strictEqual(sellerUpdateRes.body.data.price, 300);
});

test('Full Handover Lifecycle: Reserve -> OTP Verification -> Sold (with Anti-Oversell)', async () => {
    const env = await setupResaleTestEnv();

    const listing = await StudentListing.create({
        sellerId: env.studentSeller._id,
        collegeId: env.college._id,
        categoryId: env.resaleCategory._id,
        title: 'TI-84 Plus Graphing Calculator',
        description: 'Hardly used, original packaging included',
        condition: 'LIKE_NEW',
        price: 3500,
        quantity: 1,
        status: 'ACTIVE'
    });

    // Seller cannot reserve own item
    const selfReserve = await request(app)
        .post(`/api/resale/listings/${listing._id}/reserve`)
        .set('Authorization', `Bearer ${env.sellerToken}`);
    assert.strictEqual(selfReserve.status, 400);

    // Buyer A reserves item
    const reserveRes = await request(app)
        .post(`/api/resale/listings/${listing._id}/reserve`)
        .set('Authorization', `Bearer ${env.buyerAToken}`);

    assert.strictEqual(reserveRes.status, 201);
    const transaction = reserveRes.body.data.transaction;
    assert.strictEqual(transaction.status, 'RESERVED');
    assert.ok(transaction.handoverCode, 'Expected 4-digit handover verification code');

    // Listing is now RESERVED
    const checkListing = await StudentListing.findById(listing._id);
    assert.strictEqual(checkListing.status, 'RESERVED');
    assert.strictEqual(checkListing.quantity, 0);

    // Buyer B attempts to reserve same item -> REJECTED (anti-oversell)
    const buyerBReserve = await request(app)
        .post(`/api/resale/listings/${listing._id}/reserve`)
        .set('Authorization', `Bearer ${env.buyerBToken}`);
    assert.strictEqual(buyerBReserve.status, 400);

    // Seller attempts handover with invalid code -> REJECTED
    const invalidVerify = await request(app)
        .post(`/api/resale/transactions/${transaction._id}/verify-handover`)
        .set('Authorization', `Bearer ${env.sellerToken}`)
        .send({ handoverCode: '0000' });
    assert.strictEqual(invalidVerify.status, 400);

    // Buyer cannot verify handover (only seller can confirm receipt/handover)
    const buyerVerify = await request(app)
        .post(`/api/resale/transactions/${transaction._id}/verify-handover`)
        .set('Authorization', `Bearer ${env.buyerAToken}`)
        .send({ handoverCode: transaction.handoverCode });
    assert.strictEqual(buyerVerify.status, 403);

    // Seller enters correct buyer handoverCode at campus meetup
    const successVerify = await request(app)
        .post(`/api/resale/transactions/${transaction._id}/verify-handover`)
        .set('Authorization', `Bearer ${env.sellerToken}`)
        .send({ handoverCode: transaction.handoverCode });

    assert.strictEqual(successVerify.status, 200);
    assert.strictEqual(successVerify.body.data.status, 'COMPLETED');

    // Listing is permanently marked as SOLD
    const finalListing = await StudentListing.findById(listing._id);
    assert.strictEqual(finalListing.status, 'SOLD');
});

test('Reservation Cancellation reverts listing back to ACTIVE', async () => {
    const env = await setupResaleTestEnv();

    const listing = await StudentListing.create({
        sellerId: env.studentSeller._id,
        collegeId: env.college._id,
        categoryId: env.resaleCategory._id,
        title: 'Lab Coat (Size M)',
        description: 'Chemistry lab coat, clean',
        condition: 'GOOD',
        price: 200,
        quantity: 1,
        status: 'ACTIVE'
    });

    // Buyer A reserves
    const reserveRes = await request(app)
        .post(`/api/resale/listings/${listing._id}/reserve`)
        .set('Authorization', `Bearer ${env.buyerAToken}`);
    const transaction = reserveRes.body.data.transaction;

    // Buyer A cancels reservation
    const cancelRes = await request(app)
        .post(`/api/resale/transactions/${transaction._id}/cancel`)
        .set('Authorization', `Bearer ${env.buyerAToken}`)
        .send({ reason: 'Found another lab coat from roommate' });

    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.data.status, 'CANCELLED');

    // Listing is back to ACTIVE with quantity 1
    const restoredListing = await StudentListing.findById(listing._id);
    assert.strictEqual(restoredListing.status, 'ACTIVE');
    assert.strictEqual(restoredListing.quantity, 1);
    assert.strictEqual(restoredListing.activeReservationId, null);

    // Now Buyer B can reserve it
    const buyerBReserve = await request(app)
        .post(`/api/resale/listings/${listing._id}/reserve`)
        .set('Authorization', `Bearer ${env.buyerBToken}`);
    assert.strictEqual(buyerBReserve.status, 201);
});
