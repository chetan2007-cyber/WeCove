const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const College = require('../src/models/college.model');
const Category = require('../src/models/category.model');
const Document = require('../src/models/document.model');
const PrintableResource = require('../src/models/printableResource.model');
const StudentListing = require('../src/models/studentListing.model');
const MarketplaceReport = require('../src/models/marketplaceReport.model');
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

test('Marketplace Reporting: Submit report and execute admin takedown/suspension', async () => {
    const college = await College.create({
        name: 'University of Science & Tech',
        location: 'Main Campus',
        city: 'City',
        state: 'State'
    });

    const { user: studentReporter, token: reporterToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: creator, token: creatorToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: admin, token: adminToken } = await createTestUser({ role: 'admin' });

    const category = await Category.create({
        name: 'Revision Notes',
        slug: 'revision-notes',
        applicableListingTypes: ['PRINTABLE_RESOURCE', 'STUDENT_RESALE'],
        isActive: true
    });

    const document = await Document.create({
        userId: creator._id,
        originalFilename: 'commercial_textbook_scan.pdf',
        mimeType: 'application/pdf',
        storageKeyOriginal: 'scan.pdf',
        pageCount: 50,
        fileSize: 1048576,
        processingStatus: 'completed'
    });

    const resource = await PrintableResource.create({
        creatorId: creator._id,
        documentId: document._id,
        categoryId: category._id,
        title: 'Copyrighted Textbook Chapter Scans',
        description: 'Direct scan of textbook',
        pageCount: 50,
        previewPages: [1, 2],
        royaltyRatePerPage: 0.10,
        rightsDeclaration: { hasAccepted: true, statement: 'I scanned it' },
        moderationStatus: 'PUBLISHED'
    });

    // 1. Student reports the resource for copyright violation
    const reportRes = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
            targetType: 'PRINTABLE_RESOURCE',
            targetId: resource._id,
            reason: 'COPYRIGHT_VIOLATION',
            description: 'This is a copyrighted publisher textbook scan without authorization.'
        });

    assert.strictEqual(reportRes.status, 201);
    assert.strictEqual(reportRes.body.success, true);
    const report = reportRes.body.data;
    assert.strictEqual(report.status, 'PENDING');

    // 2. Admin inspects reports
    const adminGetRes = await request(app)
        .get('/api/reports?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(adminGetRes.status, 200);
    assert.strictEqual(adminGetRes.body.count, 1);

    // 3. Admin resolves report and suspends listing
    const resolveRes = await request(app)
        .put(`/api/reports/${report._id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            status: 'RESOLVED',
            actionTaken: 'LISTING_SUSPENDED',
            adminNotes: 'Copyright infringement confirmed. Publisher textbook chapter.'
        });

    assert.strictEqual(resolveRes.status, 200);
    assert.strictEqual(resolveRes.body.data.actionTaken, 'LISTING_SUSPENDED');

    // 4. Resource is now SUSPENDED and removed from marketplace discovery
    const checkResource = await PrintableResource.findById(resource._id);
    assert.strictEqual(checkResource.moderationStatus, 'SUSPENDED');

    const publicMarketRes = await request(app).get('/api/study-resources');
    assert.strictEqual(publicMarketRes.body.count, 0);
});

test('Marketplace Reporting: Report student resale listing and delist upon moderation', async () => {
    const college = await College.create({
        name: 'Engineering College',
        location: 'Campus',
        city: 'City',
        state: 'State'
    });

    const { user: buyer, token: buyerToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: seller } = await createTestUser({ role: 'student', collegeId: college._id });
    const { token: adminToken } = await createTestUser({ role: 'admin' });

    const category = await Category.create({
        name: 'Instruments',
        slug: 'instruments',
        applicableListingTypes: ['STUDENT_RESALE'],
        isActive: true
    });

    const listing = await StudentListing.create({
        sellerId: seller._id,
        collegeId: college._id,
        categoryId: category._id,
        title: 'Broken Drafter Claimed Like New',
        description: 'Damaged scale with cracked hinge',
        price: 300,
        condition: 'LIKE_NEW',
        status: 'ACTIVE'
    });

    // 1. Buyer reports resale listing
    const reportRes = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
            targetType: 'STUDENT_RESALE',
            targetId: listing._id,
            reason: 'MISREPRESENTED_CONDITION',
            description: 'Item is cracked and broken, not like new.'
        });

    assert.strictEqual(reportRes.status, 201);
    const report = reportRes.body.data;
    assert.strictEqual(report.targetType, 'STUDENT_RESALE');

    // 2. Admin resolves report with LISTING_SUSPENDED
    const resolveRes = await request(app)
        .put(`/api/reports/${report._id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            status: 'RESOLVED',
            actionTaken: 'LISTING_SUSPENDED',
            adminNotes: 'Misrepresented condition confirmed'
        });

    assert.strictEqual(resolveRes.status, 200);

    // 3. Resale listing is now DELISTED
    const updatedListing = await StudentListing.findById(listing._id);
    assert.strictEqual(updatedListing.status, 'DELISTED');
});
