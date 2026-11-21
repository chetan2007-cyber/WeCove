const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const College = require('../src/models/college.model');
const Category = require('../src/models/category.model');
const Vendor = require('../src/models/vendor.model');
const RateCard = require('../src/models/rateCard.model');
const Document = require('../src/models/document.model');
const PrintableResource = require('../src/models/printableResource.model');
const CreatorLedgerEntry = require('../src/models/creatorLedgerEntry.model');
const Order = require('../src/models/order.model');
const Payment = require('../src/models/payment.model');
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

const setupResourceTestEnv = async () => {
    const college = await College.create({
        name: 'State Tech University',
        location: 'Campus',
        city: 'Mysuru',
        state: 'Karnataka'
    });

    const { user: creator, token: creatorToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: buyer, token: buyerToken } = await createTestUser({ role: 'student', collegeId: college._id });
    const { user: admin, token: adminToken } = await createTestUser({ role: 'admin' });

    const { user: vendorOwner, token: vendorToken } = await createTestUser({ role: 'vendor_owner', isVerified: true });
    const vendor = await Vendor.create({
        name: 'Campus Rapid Xerox',
        ownerId: vendorOwner._id,
        collegeId: college._id,
        address: { line1: 'Gate 2' },
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
        pricePerPage: 2.00
    });

    const category = await Category.create({
        name: 'Handwritten Notes',
        slug: 'handwritten-notes',
        applicableListingTypes: ['PRINTABLE_RESOURCE'],
        isActive: true
    });

    // Create a processed document for creator
    const document = await Document.create({
        userId: creator._id,
        originalFilename: 'compiler_design_notes.pdf',
        mimeType: 'application/pdf',
        storageKeyOriginal: 'test-compiler-design.pdf',
        pageCount: 5,
        fileSize: 10240,
        processingStatus: 'completed'
    });

    return {
        college,
        creator,
        creatorToken,
        buyer,
        buyerToken,
        admin,
        adminToken,
        vendorOwner,
        vendorToken,
        vendor,
        category,
        document
    };
};

test('Printable Resource Lifecycle: Upload -> Moderation -> Discovery', async () => {
    const env = await setupResourceTestEnv();

    // 1. Creator submits study resource with rights declaration
    const createRes = await request(app)
        .post('/api/study-resources')
        .set('Authorization', `Bearer ${env.creatorToken}`)
        .send({
            documentId: env.document._id,
            categoryId: env.category._id,
            title: 'Complete Compiler Design Module 1-3 Notes',
            description: 'Handwritten, clear diagrams, includes Lex & Yacc examples',
            subject: 'Compiler Design',
            department: 'Computer Science',
            semester: 6,
            previewPages: [1, 2],
            royaltyRatePerPage: 0.20,
            rightsDeclaration: {
                hasAccepted: true,
                statement: 'I am the sole author of these handwritten notes.'
            }
        });

    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.success, true);
    const resource = createRes.body.data;
    assert.strictEqual(resource.moderationStatus, 'SUBMITTED');
    assert.strictEqual(resource.royaltyRatePerPage, 0.20);
    assert.strictEqual(resource.pageCount, 5);

    // 2. Unapproved resource is NOT discoverable in public marketplace
    const publicBeforeRes = await request(app).get('/api/study-resources');
    assert.strictEqual(publicBeforeRes.status, 200);
    assert.strictEqual(publicBeforeRes.body.count, 0);

    // 3. Admin moderates and publishes the resource
    const moderateRes = await request(app)
        .put(`/api/study-resources/${resource._id}/moderate`)
        .set('Authorization', `Bearer ${env.adminToken}`)
        .send({
            action: 'PUBLISH',
            notes: 'High quality notes, clear diagrams verified'
        });

    assert.strictEqual(moderateRes.status, 200);
    assert.strictEqual(moderateRes.body.data.moderationStatus, 'PUBLISHED');

    // 4. Now discoverable in campus marketplace by peers
    const publicAfterRes = await request(app)
        .get('/api/study-resources?subject=Compiler')
        .set('Authorization', `Bearer ${env.buyerToken}`);
    assert.strictEqual(publicAfterRes.status, 200);
    assert.strictEqual(publicAfterRes.body.count, 1);
    assert.strictEqual(publicAfterRes.body.data[0].title, 'Complete Compiler Design Module 1-3 Notes');
});

test('Original File Protection: Sample Preview Permitted, Full File Blocked', async () => {
    const env = await setupResourceTestEnv();

    const resource = await PrintableResource.create({
        creatorId: env.creator._id,
        documentId: env.document._id,
        categoryId: env.category._id,
        title: 'Microprocessors Revision Notes',
        description: 'Complete 8086 summary',
        pageCount: 5,
        previewPages: [1, 2],
        royaltyRatePerPage: 0.20,
        rightsDeclaration: { hasAccepted: true, statement: 'Original notes' },
        moderationStatus: 'PUBLISHED'
    });

    // 1. Buyer attempts to download full original PDF -> FORBIDDEN (403)
    const downloadRes = await request(app)
        .get(`/api/documents/${env.document._id}/file`)
        .set('Authorization', `Bearer ${env.buyerToken}`);
    assert.strictEqual(downloadRes.status, 403);

    // 2. Buyer attempts to preview non-permitted page (page 4) -> FORBIDDEN (403)
    const page4Res = await request(app)
        .get(`/api/documents/${env.document._id}/pages/4/preview`)
        .set('Authorization', `Bearer ${env.buyerToken}`);
    assert.strictEqual(page4Res.status, 403);
});

test('End-to-End Resource Print Order & Creator Royalty Ledger Settlement', async () => {
    const env = await setupResourceTestEnv();

    const resource = await PrintableResource.create({
        creatorId: env.creator._id,
        collegeId: env.college._id,
        documentId: env.document._id,
        categoryId: env.category._id,
        title: 'Database Systems Formula Sheet',
        description: 'SQL queries and relational algebra cheat sheet',
        pageCount: 5,
        previewPages: [1, 2],
        royaltyRatePerPage: 0.20,
        rightsDeclaration: { hasAccepted: true, statement: 'Original notes' },
        moderationStatus: 'PUBLISHED'
    });

    // Buyer places a print order for this published resource:
    // 5 pages * 2 copies = 10 pages printed.
    // Vendor charge: 10 * ₹2 = ₹20.00
    // Creator royalty: 5 pages * 2 copies * ₹0.20 = ₹2.00
    // Platform fee: ₹2.00
    // Expected order total: 20 + 2 + 2 = ₹24.00
    const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.buyerToken}`)
        .send({
            resourceId: resource._id,
            vendorId: env.vendor._id,
            fulfillmentType: 'pickup',
            printSettings: {
                copies: 2,
                colorMode: 'B&W',
                paperSize: 'A4',
                paperType: '70gsm',
                sides: 'single'
            }
        });

    assert.strictEqual(orderRes.status, 201);
    const order = orderRes.body.data.order;
    assert.strictEqual(order.creatorRoyalty, 2.00);
    assert.strictEqual(order.total, 24.00);
    assert.strictEqual(order.resourceId.toString(), resource._id.toString());

    // 1b. Immediately after order creation, CreatorLedgerEntry is PENDING
    const pendingLedger = await CreatorLedgerEntry.findOne({ orderId: order._id });
    assert.ok(pendingLedger, 'Expected CreatorLedgerEntry recorded upon order creation');
    assert.strictEqual(pendingLedger.status, 'PENDING');
    assert.strictEqual(pendingLedger.grossRoyalty, 2.00);

    // 1c. Creator dashboard shows PENDING royalties
    const pendingDashRes = await request(app)
        .get('/api/study-resources/my/royalties')
        .set('Authorization', `Bearer ${env.creatorToken}`);
    assert.strictEqual(pendingDashRes.status, 200);
    assert.strictEqual(pendingDashRes.body.data.totalPendingRoyalty, 2.00);
    assert.strictEqual(pendingDashRes.body.data.totalEligibleRoyalty, 0.00);

    // 1d. Vendor order queue has resourceId populated
    const vendorQueueRes = await request(app)
        .get('/api/orders/vendor?status=all')
        .set('Authorization', `Bearer ${env.vendorToken}`);
    assert.strictEqual(vendorQueueRes.status, 200);
    const vendorOrder = vendorQueueRes.body.data.find(o => o._id.toString() === order._id.toString());
    assert.ok(vendorOrder, 'Vendor order must be present in queue');
    assert.ok(vendorOrder.resourceId, 'Resource must be populated in vendor queue');
    assert.strictEqual(vendorOrder.resourceId.title, 'Database Systems Formula Sheet');

    // 1e. Vendor assigned to this order is authorized to access document file
    const vendorDocRes = await request(app)
        .get(`/api/documents/${env.document._id}/file`)
        .set('Authorization', `Bearer ${env.vendorToken}`);
    // Should NOT be 403 Forbidden (may be 404 if physical mock file doesn't exist on disk, but access is allowed)
    assert.notStrictEqual(vendorDocRes.status, 403, 'Assigned vendor should have authorized access to document');

    // 2. Payment Webhook succeeds
    const payment = await Payment.create({
        orderId: order._id,
        userId: env.buyer._id,
        gateway: 'mock',
        gatewayPaymentId: `pay_${Date.now()}`,
        amount: order.total,
        status: 'pending'
    });

    const webhookRes = await request(app)
        .post('/api/payments/webhook')
        .send({
            gatewayPaymentId: payment.gatewayPaymentId,
            status: 'successful'
        });
    assert.strictEqual(webhookRes.status, 200);

    const paidOrder = await Order.findById(order._id);
    assert.strictEqual(paidOrder.status, 'PAID');
    assert.ok(paidOrder.pickupCode, 'Expected pickup code generated upon payment');

    // 3. Shop accepts and marks ready
    await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${env.vendorToken}`)
        .send({ status: 'ACCEPTED' });

    await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${env.vendorToken}`)
        .send({ status: 'PRINTING' });

    await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${env.vendorToken}`)
        .send({ status: 'READY' });

    // 4. Shop verifies pickup code at counter -> Order COMPLETED
    const pickupRes = await request(app)
        .post(`/api/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${env.vendorToken}`)
        .send({ pickupCode: paidOrder.pickupCode });

    assert.strictEqual(pickupRes.status, 200);
    assert.strictEqual(pickupRes.body.data.status, 'COMPLETED');

    // 5. Creator Ledger Entry has transitioned to ELIGIBLE
    const ledger = await CreatorLedgerEntry.findOne({ orderId: order._id });
    assert.ok(ledger, 'Expected CreatorLedgerEntry recorded');
    assert.strictEqual(ledger.creatorId.toString(), env.creator._id.toString());
    assert.strictEqual(ledger.grossRoyalty, 2.00);
    assert.strictEqual(ledger.eligiblePages, 5);
    assert.strictEqual(ledger.copies, 2);
    assert.strictEqual(ledger.status, 'ELIGIBLE');

    // 6. Creator Dashboard reflects accurate royalty earnings
    const royaltyDashRes = await request(app)
        .get('/api/study-resources/my/royalties')
        .set('Authorization', `Bearer ${env.creatorToken}`);

    assert.strictEqual(royaltyDashRes.status, 200);
    assert.strictEqual(royaltyDashRes.body.data.totalPendingRoyalty, 0.00);
    assert.strictEqual(royaltyDashRes.body.data.totalEligibleRoyalty, 2.00);
    assert.strictEqual(royaltyDashRes.body.data.totalPrintsCount, 2);
    assert.strictEqual(royaltyDashRes.body.data.totalPrintedPages, 10);
    assert.strictEqual(royaltyDashRes.body.data.ledgerEntries.length, 1);
});

test('Creator Royalty Lifecycle: PENDING -> REVERSED on Order Cancellation', async () => {
    const env = await setupResourceTestEnv();

    const resource = await PrintableResource.create({
        creatorId: env.creator._id,
        collegeId: env.college._id,
        documentId: env.document._id,
        categoryId: env.category._id,
        title: 'Operating Systems Quick Notes',
        description: 'Process synchronization and memory management cheat sheet',
        pageCount: 5,
        previewPages: [1, 2],
        royaltyRatePerPage: 0.20,
        rightsDeclaration: { hasAccepted: true, statement: 'Original notes' },
        moderationStatus: 'PUBLISHED'
    });

    // 1. Buyer places order
    const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${env.buyerToken}`)
        .send({
            resourceId: resource._id,
            vendorId: env.vendor._id,
            fulfillmentType: 'pickup',
            printSettings: { copies: 1, colorMode: 'B&W', paperSize: 'A4', paperType: '70gsm', sides: 'single' }
        });

    assert.strictEqual(orderRes.status, 201);
    const order = orderRes.body.data.order;

    // Check pending ledger entry
    const initialLedger = await CreatorLedgerEntry.findOne({ orderId: order._id });
    assert.strictEqual(initialLedger.status, 'PENDING');

    // 2. Buyer cancels the order before fulfillment
    const cancelRes = await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${env.buyerToken}`)
        .send({ reason: 'Placed order by mistake' });

    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.data.status, 'CANCELLED');

    // 3. Ledger entry has been REVERSED
    const reversedLedger = await CreatorLedgerEntry.findOne({ orderId: order._id });
    assert.strictEqual(reversedLedger.status, 'REVERSED');

    // 4. Creator Dashboard shows 0 pending and 0 eligible
    const dashRes = await request(app)
        .get('/api/study-resources/my/royalties')
        .set('Authorization', `Bearer ${env.creatorToken}`);

    assert.strictEqual(dashRes.status, 200);
    assert.strictEqual(dashRes.body.data.totalPendingRoyalty, 0.00);
    assert.strictEqual(dashRes.body.data.totalEligibleRoyalty, 0.00);
    assert.strictEqual(dashRes.body.data.totalPrintsCount, 0);
});
