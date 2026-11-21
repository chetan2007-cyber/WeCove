const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const College = require('../src/models/college.model');
const Category = require('../src/models/category.model');
const Document = require('../src/models/document.model');
const StudentListing = require('../src/models/studentListing.model');
const PrintableResource = require('../src/models/printableResource.model');
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

const setupMultiCollegeEnv = async () => {
    const college1 = await College.create({
        name: 'National Institute of Technology Surathkal',
        location: 'Surathkal',
        city: 'Mangaluru',
        state: 'Karnataka'
    });

    const college2 = await College.create({
        name: 'Indian Institute of Technology Dharwad',
        location: 'Dharwad',
        city: 'Dharwad',
        state: 'Karnataka'
    });

    const college3 = await College.create({
        name: 'BITS Pilani Goa Campus',
        location: 'Zuarinagar',
        city: 'Goa',
        state: 'Goa'
    });

    const { user: studentA_c1, token: tokenA_c1 } = await createTestUser({ role: 'student', collegeId: college1._id });
    const { user: studentB_c1, token: tokenB_c1 } = await createTestUser({ role: 'student', collegeId: college1._id });
    const { user: studentC_c2, token: tokenC_c2 } = await createTestUser({ role: 'student', collegeId: college2._id });
    const { user: studentD_c3, token: tokenD_c3 } = await createTestUser({ role: 'student', collegeId: college3._id });
    const { user: admin, token: tokenAdmin } = await createTestUser({ role: 'admin' });

    const resaleCategory = await Category.create({
        name: 'Engineering Electronics',
        slug: 'engineering-electronics',
        applicableListingTypes: ['STUDENT_RESALE'],
        isActive: true
    });

    const notesCategory = await Category.create({
        name: 'Lecture Summaries',
        slug: 'lecture-summaries',
        applicableListingTypes: ['PRINTABLE_RESOURCE'],
        isActive: true
    });

    // Sample document for study resource creation
    const docA = await Document.create({
        userId: studentA_c1._id,
        originalFilename: 'digital_signal_processing.pdf',
        mimeType: 'application/pdf',
        storageKeyOriginal: 'test-dsp-notes.pdf',
        pageCount: 12,
        fileSize: 20480,
        processingStatus: 'completed'
    });

    return {
        college1,
        college2,
        college3,
        studentA_c1,
        tokenA_c1,
        studentB_c1,
        tokenB_c1,
        studentC_c2,
        tokenC_c2,
        studentD_c3,
        tokenD_c3,
        admin,
        tokenAdmin,
        resaleCategory,
        notesCategory,
        docA
    };
};

// =========================================================================
// TEST SUITE: CAMPUS VISIBILITY & ISOLATION FOR STUDENT RESALE LISTINGS
// =========================================================================

test('Resale Visibility: MY_COLLEGE_ONLY is isolated strictly to seller campus', async () => {
    const env = await setupMultiCollegeEnv();

    // Student A (College 1) lists an item with MY_COLLEGE_ONLY
    const createRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Casio fx-991EX ClassWiz Calculator',
            description: 'Sparingly used in 1st year, working solar panel',
            categoryId: env.resaleCategory._id,
            condition: 'LIKE_NEW',
            price: 850,
            visibilityType: 'MY_COLLEGE_ONLY'
        });

    assert.equal(createRes.status, 201);
    const listingId = createRes.body.data._id;
    assert.equal(createRes.body.data.visibilityType, 'MY_COLLEGE_ONLY');

    // 1. Peer Student B at College 1 discovers it in feed
    const feedResB = await request(app)
        .get('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(feedResB.status, 200);
    assert.equal(feedResB.body.count, 1);
    assert.equal(feedResB.body.data[0]._id, listingId);

    // Peer Student B at College 1 fetches direct ID -> 200 OK
    const getByIdResB = await request(app)
        .get(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(getByIdResB.status, 200);
    assert.equal(getByIdResB.body.data.title, 'Casio fx-991EX ClassWiz Calculator');

    // 2. Student C at College 2 DOES NOT see it in feed
    const feedResC = await request(app)
        .get('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(feedResC.status, 200);
    assert.equal(feedResC.body.count, 0);

    // Student C at College 2 direct ID lookup returns 404 (isolation masking)
    const getByIdResC = await request(app)
        .get(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(getByIdResC.status, 404);

    // 3. Unauthenticated request does not see it and gets 404 on direct lookup
    const feedAnon = await request(app).get('/api/resale/listings');
    assert.equal(feedAnon.status, 200);
    assert.equal(feedAnon.body.count, 0);

    const getByIdAnon = await request(app).get(`/api/resale/listings/${listingId}`);
    assert.equal(getByIdAnon.status, 404);

    // 4. Listing Creator (Student A) and Admin CAN always access it by ID
    const getOwner = await request(app)
        .get(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenA_c1}`);
    assert.equal(getOwner.status, 200);

    const getAdmin = await request(app)
        .get(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenAdmin}`);
    assert.equal(getAdmin.status, 200);
});

test('Resale Visibility: SELECTED_COLLEGES is visible only to chosen campuses', async () => {
    const env = await setupMultiCollegeEnv();

    // Student A (College 1) lists item visible to College 1 & College 2
    const createRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Drafter & Engineering Graphics Kit',
            description: 'Complete minidrafter with clamp and scale',
            categoryId: env.resaleCategory._id,
            condition: 'GOOD',
            price: 500,
            visibilityType: 'SELECTED_COLLEGES',
            visibleCollegeIds: [env.college1._id.toString(), env.college2._id.toString()]
        });

    assert.equal(createRes.status, 201);
    const listingId = createRes.body.data._id;
    assert.equal(createRes.body.data.visibilityType, 'SELECTED_COLLEGES');

    // Student B at College 1 -> can see
    const feedB = await request(app)
        .get('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(feedB.body.count, 1);

    const getB = await request(app)
        .get(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(getB.status, 200);

    // Student C at College 2 -> can see
    const feedC = await request(app)
        .get('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(feedC.body.count, 1);

    const getC = await request(app)
        .get(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(getC.status, 200);

    // Student D at College 3 -> CANNOT see (0 in feed, 404 by ID)
    const feedD = await request(app)
        .get('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenD_c3}`);
    assert.equal(feedD.body.count, 0);

    const getD = await request(app)
        .get(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenD_c3}`);
    assert.equal(getD.status, 404);
});

test('Resale Visibility: ALL_COLLEGES is globally accessible across all campuses and public', async () => {
    const env = await setupMultiCollegeEnv();

    const createRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Microelectronic Circuits Sedra Smith 8th Edition',
            description: 'Hardcover textbook, no markings inside',
            categoryId: env.resaleCategory._id,
            condition: 'LIKE_NEW',
            price: 1200,
            visibilityType: 'ALL_COLLEGES'
        });

    assert.equal(createRes.status, 201);
    const listingId = createRes.body.data._id;

    // College 1, College 2, College 3, and anonymous all see it
    const resCol1 = await request(app).get(`/api/resale/listings/${listingId}`).set('Authorization', `Bearer ${env.tokenB_c1}`);
    const resCol2 = await request(app).get(`/api/resale/listings/${listingId}`).set('Authorization', `Bearer ${env.tokenC_c2}`);
    const resCol3 = await request(app).get(`/api/resale/listings/${listingId}`).set('Authorization', `Bearer ${env.tokenD_c3}`);
    const resAnon = await request(app).get(`/api/resale/listings/${listingId}`);

    assert.equal(resCol1.status, 200);
    assert.equal(resCol2.status, 200);
    assert.equal(resCol3.status, 200);
    assert.equal(resAnon.status, 200);
});

test('Resale Validation: Rejects SELECTED_COLLEGES when visibleCollegeIds is empty or invalid', async () => {
    const env = await setupMultiCollegeEnv();

    const invalidRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Defective Validation Check',
            description: 'Should fail',
            categoryId: env.resaleCategory._id,
            condition: 'GOOD',
            price: 100,
            visibilityType: 'SELECTED_COLLEGES',
            visibleCollegeIds: []
        });

    assert.equal(invalidRes.status, 400);
    assert.match(invalidRes.body.message, /select at least one/i);
});

// =========================================================================
// TEST SUITE: CAMPUS VISIBILITY & ISOLATION FOR STUDY NOTES / RESOURCES
// =========================================================================

test('Study Notes Visibility: MY_COLLEGE_ONLY restricts discovery and direct ID lookup', async () => {
    const env = await setupMultiCollegeEnv();

    // Student A uploads study note with MY_COLLEGE_ONLY
    const createRes = await request(app)
        .post('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            documentId: env.docA._id,
            categoryId: env.notesCategory._id,
            title: 'Signals & Systems Midsem Exam Summary',
            description: 'Handwritten chapter summaries and previous 3 years solved questions',
            subject: 'Signals & Systems',
            department: 'ECE',
            visibilityType: 'MY_COLLEGE_ONLY',
            rightsDeclaration: {
                hasAccepted: true,
                statement: 'I confirm these notes are my original academic work.'
            }
        });

    assert.equal(createRes.status, 201);
    const resourceId = createRes.body.data._id;

    // Admin approves and publishes the note
    const approveRes = await request(app)
        .put(`/api/study-resources/${resourceId}/moderate`)
        .set('Authorization', `Bearer ${env.tokenAdmin}`)
        .send({
            action: 'PUBLISH',
            notes: 'Approved high-quality student notes'
        });
    assert.equal(approveRes.status, 200);

    // 1. Peer Student B at College 1 can see in feed and fetch by ID
    const feedB = await request(app)
        .get('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(feedB.status, 200);
    assert.equal(feedB.body.count, 1);
    assert.equal(feedB.body.data[0]._id, resourceId);

    const getB = await request(app)
        .get(`/api/study-resources/${resourceId}`)
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(getB.status, 200);
    assert.equal(getB.body.data.title, 'Signals & Systems Midsem Exam Summary');

    // 2. Student C at College 2 CANNOT see in feed and gets 404 on direct lookup
    const feedC = await request(app)
        .get('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(feedC.body.count, 0);

    const getC = await request(app)
        .get(`/api/study-resources/${resourceId}`)
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(getC.status, 404);

    // 3. Anonymous request gets 404
    const getAnon = await request(app).get(`/api/study-resources/${resourceId}`);
    assert.equal(getAnon.status, 404);
});

test('Study Notes Validation: Requires explicit rights and copyright declaration', async () => {
    const env = await setupMultiCollegeEnv();

    const createRes = await request(app)
        .post('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            documentId: env.docA._id,
            categoryId: env.notesCategory._id,
            title: 'Notes Without Rights Declaration',
            description: 'Missing copyright acceptance',
            rightsDeclaration: {
                hasAccepted: false,
                statement: ''
            }
        });

    assert.equal(createRes.status, 400);
    assert.match(createRes.body.message, /educational distribution rights/i);
});

// =========================================================================
// TEST SUITE: MANAGEMENT & DELISTING / ARCHIVING LIFECYCLE
// =========================================================================

test('Management: Student can delist resale item and archive study notes', async () => {
    const env = await setupMultiCollegeEnv();

    // 1. Create and delist resale item
    const resaleRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Item to Delist',
            description: 'Will be deleted by seller',
            categoryId: env.resaleCategory._id,
            condition: 'GOOD',
            price: 300,
            visibilityType: 'ALL_COLLEGES'
        });
    const resaleId = resaleRes.body.data._id;

    const delistResale = await request(app)
        .delete(`/api/resale/listings/${resaleId}`)
        .set('Authorization', `Bearer ${env.tokenA_c1}`);
    assert.equal(delistResale.status, 200);

    // Feed should no longer return delisted item
    const feedResale = await request(app).get('/api/resale/listings');
    assert.equal(feedResale.body.count, 0);

    // 2. Create and archive study resource
    const resourceRes = await request(app)
        .post('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            documentId: env.docA._id,
            categoryId: env.notesCategory._id,
            title: 'Notes to Archive',
            description: 'Will be archived by creator',
            rightsDeclaration: {
                hasAccepted: true,
                statement: 'I declare rights.'
            }
        });
    const resourceId = resourceRes.body.data._id;

    // Delist / archive study resource
    const archiveNotes = await request(app)
        .delete(`/api/study-resources/${resourceId}`)
        .set('Authorization', `Bearer ${env.tokenA_c1}`);
    assert.equal(archiveNotes.status, 200);
    assert.equal(archiveNotes.body.data.moderationStatus, 'ARCHIVED');

    // Feed should omit archived resource
    const feedNotes = await request(app).get('/api/study-resources');
    assert.equal(feedNotes.body.count, 0);
});

test('Update Visibility: Seller can change resale listing visibility scope', async () => {
    const env = await setupMultiCollegeEnv();

    // 1. Create with MY_COLLEGE_ONLY
    const createRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Drafting Compass Set',
            description: 'Brass precision compass',
            categoryId: env.resaleCategory._id,
            condition: 'LIKE_NEW',
            price: 250,
            visibilityType: 'MY_COLLEGE_ONLY'
        });
    const listingId = createRes.body.data._id;

    // Student C at College 2 cannot see it initially
    const feedC_initial = await request(app)
        .get('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(feedC_initial.body.count, 0);

    // 2. Seller updates visibility to SELECTED_COLLEGES ([College 1, College 2])
    const updateRes = await request(app)
        .put(`/api/resale/listings/${listingId}`)
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            visibilityType: 'SELECTED_COLLEGES',
            visibleCollegeIds: [env.college1._id.toString(), env.college2._id.toString()]
        });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.visibilityType, 'SELECTED_COLLEGES');

    // Now Student C at College 2 can see it
    const feedC_updated = await request(app)
        .get('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(feedC_updated.body.count, 1);
    assert.equal(feedC_updated.body.data[0]._id, listingId);
});

test('Update Visibility: Creator can update study notes visibility scope and metadata', async () => {
    const env = await setupMultiCollegeEnv();

    // 1. Create study resource with MY_COLLEGE_ONLY
    const createRes = await request(app)
        .post('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            documentId: env.docA._id,
            categoryId: env.notesCategory._id,
            title: 'Microprocessors & Microcontrollers Handout',
            description: '8051 and 8086 summary notes',
            visibilityType: 'MY_COLLEGE_ONLY',
            rightsDeclaration: {
                hasAccepted: true,
                statement: 'I am the author.'
            }
        });
    const resourceId = createRes.body.data._id;

    // 2. Creator updates title and expands visibility to ALL_COLLEGES
    const updateRes = await request(app)
        .put(`/api/study-resources/${resourceId}`)
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Microprocessors & Microcontrollers Complete Guide',
            visibilityType: 'ALL_COLLEGES'
        });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.title, 'Microprocessors & Microcontrollers Complete Guide');
    assert.equal(updateRes.body.data.visibilityType, 'ALL_COLLEGES');

    // 3. Admin publishes note
    await request(app)
        .put(`/api/study-resources/${resourceId}/moderate`)
        .set('Authorization', `Bearer ${env.tokenAdmin}`)
        .send({ action: 'PUBLISH' });

    // Now Student C at College 2 can discover it
    const feedC = await request(app)
        .get('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(feedC.body.count, 1);
});

test('Phase 6 Isolation: Out-of-scope student cannot reserve another college resale item', async () => {
    const env = await setupMultiCollegeEnv();

    // Student A at College 1 lists an item with MY_COLLEGE_ONLY
    const createRes = await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'Lab Apron & Safety Goggles',
            description: 'Chemistry 1st year practicals',
            categoryId: env.resaleCategory._id,
            condition: 'GOOD',
            price: 200,
            visibilityType: 'MY_COLLEGE_ONLY'
        });
    const listingId = createRes.body.data._id;

    // Student C at College 2 attempts to reserve it -> 404 Not Found
    const reserveRes = await request(app)
        .post(`/api/resale/listings/${listingId}/reserve`)
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(reserveRes.status, 404);
    assert.match(reserveRes.body.message, /not found/i);

    // Peer Student B at College 1 CAN reserve it -> 201 Created
    const reservePeer = await request(app)
        .post(`/api/resale/listings/${listingId}/reserve`)
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(reservePeer.status, 201);
});

test('Phase 6 Isolation: Out-of-scope student cannot order/print another college study note', async () => {
    const env = await setupMultiCollegeEnv();
    const Vendor = require('../src/models/vendor.model');
    const RateCard = require('../src/models/rateCard.model');

    // Setup vendor at College 1
    const { user: vendorOwner } = await createTestUser({ role: 'vendor_owner', isVerified: true });
    const vendor = await Vendor.create({
        name: 'NITK Campus Xerox',
        ownerId: vendorOwner._id,
        collegeId: env.college1._id,
        address: { line1: 'Shopping Complex' },
        status: 'active',
        isApproved: true,
        source: 'KAMI'
    });

    await RateCard.create({
        vendorId: vendor._id,
        paperSize: 'A4',
        paperType: '70gsm',
        colorMode: 'B&W',
        sides: 'single',
        minPages: 1,
        maxPages: 9999,
        pricePerPage: 1.50
    });

    // Student A at College 1 uploads study note with MY_COLLEGE_ONLY
    const createRes = await request(app)
        .post('/api/study-resources')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            documentId: env.docA._id,
            categoryId: env.notesCategory._id,
            title: 'DSP Convolution Solved Examples',
            description: 'Step by step convolution',
            visibilityType: 'MY_COLLEGE_ONLY',
            rightsDeclaration: {
                hasAccepted: true,
                statement: 'I am the author.'
            }
        });
    const resourceId = createRes.body.data._id;

    // Admin publishes note
    await request(app)
        .put(`/api/study-resources/${resourceId}/moderate`)
        .set('Authorization', `Bearer ${env.tokenAdmin}`)
        .send({ action: 'PUBLISH' });

    // Student C at College 2 attempts to print it -> 404 Not Found
    const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.tokenC_c2}`)
        .send({
            resourceId,
            vendorId: vendor._id,
            printSettings: {
                copies: 1,
                colorMode: 'B&W',
                sides: 'single',
                paperSize: 'A4'
            }
        });
    assert.equal(orderRes.status, 404);
    assert.match(orderRes.body.message, /not found/i);

    // Peer Student B at College 1 CAN order/print it -> 201 Created
    const peerOrder = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.tokenB_c1}`)
        .send({
            resourceId,
            vendorId: vendor._id,
            printSettings: {
                copies: 1,
                colorMode: 'B&W',
                sides: 'single',
                paperSize: 'A4'
            }
        });
    assert.equal(peerOrder.status, 201);
});

test('Phase 6 Isolation: Text search and category filters are strictly college scoped', async () => {
    const env = await setupMultiCollegeEnv();

    // Student A at College 1 creates unique titled item
    await request(app)
        .post('/api/resale/listings')
        .set('Authorization', `Bearer ${env.tokenA_c1}`)
        .send({
            title: 'RareQuantumMechanicsHardcoverBook123',
            description: 'Very rare textbook',
            categoryId: env.resaleCategory._id,
            condition: 'LIKE_NEW',
            price: 999,
            visibilityType: 'MY_COLLEGE_ONLY'
        });

    // Student B at College 1 searches -> finds 1 match
    const searchPeer = await request(app)
        .get('/api/resale/listings?search=RareQuantumMechanicsHardcoverBook123')
        .set('Authorization', `Bearer ${env.tokenB_c1}`);
    assert.equal(searchPeer.body.count, 1);

    // Student C at College 2 searches exact title -> finds 0 matches
    const searchOther = await request(app)
        .get('/api/resale/listings?search=RareQuantumMechanicsHardcoverBook123')
        .set('Authorization', `Bearer ${env.tokenC_c2}`);
    assert.equal(searchOther.body.count, 0);

    // Anonymous searches exact title -> finds 0 matches
    const searchAnon = await request(app)
        .get('/api/resale/listings?search=RareQuantumMechanicsHardcoverBook123');
    assert.equal(searchAnon.body.count, 0);
});

