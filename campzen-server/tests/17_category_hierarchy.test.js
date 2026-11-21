const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const Category = require('../src/models/category.model');
const { ensureDefaultCategories } = require('../src/utils/defaultCategories.util');
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

test('Hierarchical Category Tree - Default Seeding and Tree Retrieval', async () => {
    await ensureDefaultCategories();

    // 1. Fetch flat active list
    const flatRes = await request(app).get('/api/categories');
    assert.strictEqual(flatRes.status, 200);
    assert.strictEqual(flatRes.body.success, true);
    assert.ok(flatRes.body.count > 10, 'Expected multiple categories across the hierarchy');

    // 2. Fetch hierarchical tree
    const treeRes = await request(app).get('/api/categories?tree=true');
    assert.strictEqual(treeRes.status, 200);
    assert.strictEqual(treeRes.body.success, true);
    const roots = treeRes.body.data;
    assert.ok(roots.length >= 5, 'Expected at least 5 root categories');

    const books = roots.find(r => r.slug === 'books-learning');
    assert.ok(books, 'Expected Books & Learning category');
    assert.strictEqual(books.level, 0);
    assert.ok(books.subcategories.length > 0, 'Expected Books & Learning to have subcategories');

    // Check 3rd-level hierarchy: Books & Learning -> Notes & Study Material -> Handwritten Notes
    const notesCat = books.subcategories.find(sc => sc.slug === 'notes-study-material');
    assert.ok(notesCat, 'Expected Notes & Study Material subcategory');
    assert.strictEqual(notesCat.level, 1);
    assert.ok(notesCat.subcategories.length > 0, 'Expected Notes & Study Material to have subcategories');

    const handwritten = notesCat.subcategories.find(sub => sub.slug === 'handwritten-notes');
    assert.ok(handwritten, 'Expected Handwritten Notes level 2 category');
    assert.strictEqual(handwritten.level, 2);
    assert.ok(handwritten.applicableListingTypes.includes('PRINTABLE_RESOURCE'));
});

test('Filter Categories by Listing Type and Hierarchy Level', async () => {
    await ensureDefaultCategories();

    // 1. Filter by listingType=PRINTABLE_RESOURCE
    const printableTree = await request(app).get('/api/categories?tree=true&listingType=PRINTABLE_RESOURCE');
    assert.strictEqual(printableTree.status, 200);
    const printableRoots = printableTree.body.data;
    assert.ok(printableRoots.some(r => r.slug === 'books-learning'));
    // Premium stationery has no printable resources
    assert.ok(!printableRoots.some(r => r.slug === 'premium-stationery'));

    // 2. Filter root only
    const rootRes = await request(app).get('/api/categories?parentId=root');
    assert.strictEqual(rootRes.status, 200);
    for (const cat of rootRes.body.data) {
        assert.strictEqual(cat.parentId, null);
        assert.strictEqual(cat.level, 0);
    }
});

test('Category RBAC - Admin can create/update/deactivate; Student rejected', async () => {
    const { token: studentToken } = await createTestUser({ role: 'student' });
    const { token: adminToken } = await createTestUser({ role: 'admin' });

    // 1. Student cannot create category (403)
    const studentRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
            name: 'Hacker Supplies',
            applicableListingTypes: ['VENDOR_PRODUCT']
        });
    assert.strictEqual(studentRes.status, 403);

    // 2. Admin can create root category
    const adminRootRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'Campus Merchandise',
            slug: 'campus-merchandise',
            applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
        });
    assert.strictEqual(adminRootRes.status, 201);
    const rootCat = adminRootRes.body.data;
    assert.strictEqual(rootCat.name, 'Campus Merchandise');
    assert.strictEqual(rootCat.level, 0);

    // 3. Admin creates child category
    const childRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'College Hoodies',
            parentId: rootCat._id,
            applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
        });
    assert.strictEqual(childRes.status, 201);
    const childCat = childRes.body.data;
    assert.strictEqual(childCat.slug, 'college-hoodies');
    assert.strictEqual(childCat.level, 1);
    assert.strictEqual(childCat.parentId.toString(), rootCat._id.toString());

    // 4. Duplicate slug rejected
    const dupRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'Duplicate Hoodies',
            slug: 'college-hoodies'
        });
    assert.strictEqual(dupRes.status, 400);

    // 5. Admin updates category
    const updateRes = await request(app)
        .put(`/api/categories/${childCat._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'College Hoodies & Jackets'
        });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.name, 'College Hoodies & Jackets');

    // 6. Deactivation cascades down to children
    const deleteRes = await request(app)
        .delete(`/api/categories/${rootCat._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(deleteRes.status, 200);

    const rootCheck = await Category.findById(rootCat._id);
    assert.strictEqual(rootCheck.isActive, false);

    const childCheck = await Category.findById(childCat._id);
    assert.strictEqual(childCheck.isActive, false);

    // Deactivated categories do not show in standard listing
    const activeRes = await request(app).get('/api/categories');
    assert.ok(!activeRes.body.data.some(c => c._id.toString() === rootCat._id.toString()));
});
