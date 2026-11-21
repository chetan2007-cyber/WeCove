const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const app = require('../src/app');
const Document = require('../src/models/document.model');
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

test('POST /api/documents/upload - Rejects upload when no file is attached', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /no file provided/i);
});

test('POST /api/documents/upload - Rejects invalid file format (e.g. .txt)', async () => {
    const { token } = await createTestUser();
    const badFilePath = path.resolve(__dirname, '../badfile.txt');

    const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', badFilePath);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid file type/i);
});

test('POST /api/documents/upload - Successfully uploads valid PDF and processes page count', async () => {
    const { token } = await createTestUser();
    const pdfPath = path.resolve(__dirname, '../real-dummy.pdf');

    const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfPath);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data._id);
    assert.equal(res.body.data.originalFilename, 'real-dummy.pdf');

    const docId = res.body.data._id;

    // Wait for async background processing to complete
    let processedDoc = null;
    for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 200));
        processedDoc = await Document.findById(docId);
        if (processedDoc && processedDoc.processingStatus === 'completed') break;
    }

    assert.equal(processedDoc?.processingStatus, 'completed');
    assert.ok(processedDoc.pageCount >= 1);
});

test('GET /api/documents/:id - Owner can fetch document metadata', async () => {
    const { user, token } = await createTestUser();
    const doc = await Document.create({
        userId: user._id,
        originalFilename: 'notes.pdf',
        mimeType: 'application/pdf',
        storageKeyOriginal: 'notes-123.pdf',
        fileSize: 2048,
        pageCount: 5,
        processingStatus: 'completed'
    });

    const res = await request(app)
        .get(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.originalFilename, 'notes.pdf');
    assert.equal(res.body.data.pageCount, 5);
});

test('IDOR Security: User B cannot access User A document metadata', async () => {
    const { user: userA } = await createTestUser();
    const { token: userBToken } = await createTestUser();

    const doc = await Document.create({
        userId: userA._id,
        originalFilename: 'private_thesis.pdf',
        mimeType: 'application/pdf',
        storageKeyOriginal: 'private-123.pdf',
        fileSize: 4096,
        processingStatus: 'completed'
    });

    const res = await request(app)
        .get(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not authorized/i);
});
