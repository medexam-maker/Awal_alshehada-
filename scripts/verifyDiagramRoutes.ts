/**
 * DIAGRAM MEDIA & ROUTE ACCEPTANCE TEST SUITE (CR-2026-11-06)
 * Tests all Section 4G Media and Admin routes using the running app instance.
 * Covers:
 * 1. upload ok
 * 2. duplicate sha256
 * 3. bad magic bytes
 * 4. oversize
 * 5. non-admin rejected
 * 6. search by name/keyword/id
 * 7. PATCH archive
 * 8. no DELETE route
 * 9. GET /api/media/:id headers
 * 10. unknown id 404
 * 11. question save rejecting an unknown/archived assetId
 */

import assert from 'assert';
import http from 'http';
import { app } from '../server';
import { generateAccessToken } from '../src/server/lib/tokenService';
import { pool } from '../src/server/db/index';

let passed = 0;
let failed = 0;

function pass(name: string) {
  console.log(`✅ [PASS] ${name}`);
  passed++;
}

function fail(name: string, err: any) {
  console.error(`❌ [FAIL] ${name}\n   ${String(err?.message || err).split('\n')[0]}`);
  failed++;
  process.exitCode = 1;
}

// Helpers for test image bytes
const pad = (head: number[], n = 64) => {
  const a = new Uint8Array(n);
  a.set(head);
  return a;
};
const PNG_VALID = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG_VALID = pad([0xff, 0xd8, 0xff, 0xe0]);
const SVG_INVALID = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

async function run() {
  console.log('--- Visual Mastery Lab: Media Library & Question Save Route Tests ---');

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Seed test admin and student users into DB for requireAuth
    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, status, token_version)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'admin@firstcertificate.sd', 'hash', 'admin', 'active', 1),
        ('00000000-0000-0000-0000-000000000002', 'student@firstcertificate.sd', 'hash', 'student', 'active', 1)
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, token_version = 1;
    `);

    // Generate auth tokens
    const adminToken = await generateAccessToken({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@firstcertificate.sd',
      role: 'admin',
      tokenVersion: 1,
    });

    const studentToken = await generateAccessToken({
      id: '00000000-0000-0000-0000-000000000002',
      email: 'student@firstcertificate.sd',
      role: 'student',
      tokenVersion: 1,
    });

    let uploadedAssetId = '';
    let uploadedSha256 = '';

    // 1. upload ok
    try {
      const b64 = Buffer.from(PNG_VALID).toString('base64');
      const res = await fetch(`${baseUrl}/api/admin/media/diagrams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Convex Lens Optics Diagram',
          fileName: 'convex_lens.png',
          mimeType: 'image/png',
          dataBase64: b64,
          keywords: ['physics', 'optics', 'lens'],
          width: 800,
          height: 400,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}: ${JSON.stringify(json)}`);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.duplicate, false);
      assert.strictEqual(json.data.name, 'Convex Lens Optics Diagram');
      assert.ok(json.data.id, 'Asset ID must be returned');
      assert.ok(json.data.sha256, 'sha256 must be returned');
      assert.strictEqual((json.data as any).data, undefined, 'Image bytes must NEVER be returned in response');

      uploadedAssetId = json.data.id;
      uploadedSha256 = json.data.sha256;
      pass('1. upload ok: valid PNG returns metadata without bytes');
    } catch (e) {
      fail('1. upload ok', e);
    }

    // 2. duplicate sha256
    try {
      const b64 = Buffer.from(PNG_VALID).toString('base64');
      const res = await fetch(`${baseUrl}/api/admin/media/diagrams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Convex Lens Duplicate Attempt',
          fileName: 'another_name.png',
          mimeType: 'image/png',
          dataBase64: b64,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.duplicate, true, 'Duplicate must be detected');
      assert.strictEqual(json.data.id, uploadedAssetId, 'Must return existing asset ID');
      pass('2. duplicate sha256: returns existing asset with duplicate: true');
    } catch (e) {
      fail('2. duplicate sha256', e);
    }

    // 3. bad magic bytes
    try {
      // Send JPG bytes declared as image/png
      const b64Mismatch = Buffer.from(JPG_VALID).toString('base64');
      const res1 = await fetch(`${baseUrl}/api/admin/media/diagrams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Mismatch',
          mimeType: 'image/png',
          dataBase64: b64Mismatch,
        }),
      });
      assert.strictEqual(res1.status, 400);

      // Send SVG (script risk)
      const b64Svg = Buffer.from(SVG_INVALID).toString('base64');
      const res2 = await fetch(`${baseUrl}/api/admin/media/diagrams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'SVG Attack',
          mimeType: 'image/svg+xml',
          dataBase64: b64Svg,
        }),
      });
      assert.strictEqual(res2.status, 400);
      pass('3. bad magic bytes: mismatched types and SVG are rejected (400)');
    } catch (e) {
      fail('3. bad magic bytes', e);
    }

    // 4. oversize (> 2MB)
    try {
      const big = new Uint8Array(2 * 1024 * 1024 + 1);
      big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = await fetch(`${baseUrl}/api/admin/media/diagrams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Oversize',
          mimeType: 'image/png',
          dataBase64: Buffer.from(big).toString('base64'),
        }),
      });
      assert.strictEqual(res.status, 400);
      pass('4. oversize: images larger than 2MB are rejected (400)');
    } catch (e) {
      fail('4. oversize', e);
    }

    // 5. non-admin rejected
    try {
      const res = await fetch(`${baseUrl}/api/admin/media/diagrams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          name: 'Student attempt',
          mimeType: 'image/png',
          dataBase64: Buffer.from(PNG_VALID).toString('base64'),
        }),
      });
      assert.strictEqual(res.status, 403, 'Non-admin must receive 403 Forbidden');
      pass('5. non-admin rejected: student role cannot access admin media upload (403)');
    } catch (e) {
      fail('5. non-admin rejected', e);
    }

    // 6. search by name/keyword/id
    try {
      // By name
      const resName = await fetch(`${baseUrl}/api/admin/media/diagrams?query=Optics`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const jsonName = await resName.json();
      assert.strictEqual(resName.status, 200);
      assert.ok(jsonName.data.some((a: any) => a.id === uploadedAssetId), 'Asset must match name search');

      // By keyword
      const resKw = await fetch(`${baseUrl}/api/admin/media/diagrams?query=physics`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const jsonKw = await resKw.json();
      assert.strictEqual(resKw.status, 200);
      assert.ok(jsonKw.data.some((a: any) => a.id === uploadedAssetId), 'Asset must match keyword search');

      // By exact id
      const resId = await fetch(`${baseUrl}/api/admin/media/diagrams?query=${uploadedAssetId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const jsonId = await resId.json();
      assert.strictEqual(resId.status, 200);
      assert.ok(jsonId.data.some((a: any) => a.id === uploadedAssetId), 'Asset must match id search');

      // GET /:id details
      const resDetail = await fetch(`${baseUrl}/api/admin/media/diagrams/${uploadedAssetId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const jsonDetail = await resDetail.json();
      assert.strictEqual(resDetail.status, 200);
      assert.strictEqual(jsonDetail.data.id, uploadedAssetId);
      assert.strictEqual(typeof jsonDetail.data.referenceCount, 'number');
      assert.ok(Array.isArray(jsonDetail.data.questionIds));

      pass('6. search by name/keyword/id and detail retrieval return referenceCount and questionIds');
    } catch (e) {
      fail('6. search by name/keyword/id', e);
    }

    // 7. PATCH archive
    try {
      const resPatch = await fetch(`${baseUrl}/api/admin/media/diagrams/${uploadedAssetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Archived Convex Lens',
          archived: true,
        }),
      });
      const jsonPatch = await resPatch.json();
      assert.strictEqual(resPatch.status, 200);
      assert.strictEqual(jsonPatch.data.status, 'archived');
      assert.ok(jsonPatch.data.archivedAt !== null, 'archivedAt must be set');
      assert.strictEqual(jsonPatch.data.name, 'Archived Convex Lens');
      pass('7. PATCH archive: sets status to archived and records archivedAt without touching bytes');
    } catch (e) {
      fail('7. PATCH archive', e);
    }

    // 8. no DELETE route
    try {
      const resDelAdmin = await fetch(`${baseUrl}/api/admin/media/diagrams/${uploadedAssetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDelAdmin.status, 404, 'DELETE on admin route must not exist (404)');

      const resDelMedia = await fetch(`${baseUrl}/api/media/${uploadedAssetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDelMedia.status, 404, 'DELETE on /api/media route must not exist (404)');
      pass('8. no DELETE route: DELETE requests are not implemented and return 404');
    } catch (e) {
      fail('8. no DELETE route', e);
    }

    // 9. GET /api/media/:id headers
    try {
      const resMedia = await fetch(`${baseUrl}/api/media/${uploadedAssetId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(resMedia.status, 200, 'Archived assets must still be served to students');
      assert.strictEqual(resMedia.headers.get('content-type'), 'image/png');
      assert.strictEqual(resMedia.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(resMedia.headers.get('content-disposition'), 'inline');
      assert.strictEqual(resMedia.headers.get('etag'), uploadedSha256);
      assert.strictEqual(resMedia.headers.get('cache-control'), 'private, max-age=31536000, immutable');

      const buf = await resMedia.arrayBuffer();
      assert.strictEqual(buf.byteLength, PNG_VALID.length);
      pass('9. GET /api/media/:id headers: correct caching, ETag, nosniff, inline, and archived asset is served');
    } catch (e) {
      fail('9. GET /api/media/:id headers', e);
    }

    // 10. unknown id 404
    try {
      const res404 = await fetch(`${baseUrl}/api/media/00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res404.status, 404, 'Unknown asset ID must return 404');
      const json404 = await res404.json();
      assert.strictEqual(json404.error.code, 'NOT_FOUND');
      pass('10. unknown id 404: non-existent asset ID returns 404 NOT_FOUND');
    } catch (e) {
      fail('10. unknown id 404', e);
    }

    // 11. question save rejecting an unknown/archived assetId
    try {
      const dummyContent = (assetId: string) => ({
        prompt: 'سؤال العدسة',
        diagram: { assetId },
        subQuestions: [
          {
            id: 'sq1',
            kind: 'locate',
            prompt: 'حدد البؤرة',
            marks: 1,
          },
          {
            id: 'sq2',
            kind: 'name',
            prompt: 'ما اسم الجزء؟',
            marks: 1,
            options: [
              { id: 'o1', text: 'عدسة محدبة' },
              { id: 'o2', text: 'مرآة' },
              { id: 'o3', text: 'منشور' },
            ],
          },
        ],
      });

      const dummyKey = {
        subAnswers: {
          sq1: { regions: [{ type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1 }] },
          sq2: { optionId: 'o1', acceptedNames: ['عدسة محدبة'] },
        },
      };

      // Test 11a: unknown assetId
      const resUnknown = await fetch(`${baseUrl}/api/admin/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          subjectSlug: 'physics',
          questionType: 'diagram_labeling',
          prompt: 'سؤال تجربة',
          content: dummyContent('00000000-0000-0000-0000-000000000000'),
          correctAnswer: dummyKey,
          allocatedMarks: 2,
        }),
      });
      assert.strictEqual(resUnknown.status, 400);
      const jsonUnknown = await resUnknown.json();
      assert.strictEqual(jsonUnknown.error.code, 'VALIDATION_ERROR');
      assert.ok(jsonUnknown.error.message.includes('does not exist'));

      // Test 11b: archived assetId
      const resArchived = await fetch(`${baseUrl}/api/admin/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          subjectSlug: 'physics',
          questionType: 'diagram_labeling',
          prompt: 'سؤال تجربة ثان',
          content: dummyContent(uploadedAssetId), // this was archived in step 7!
          correctAnswer: dummyKey,
          allocatedMarks: 2,
        }),
      });
      assert.strictEqual(resArchived.status, 400);
      const jsonArchived = await resArchived.json();
      assert.strictEqual(jsonArchived.error.code, 'VALIDATION_ERROR');
      assert.ok(jsonArchived.error.message.includes('archived'));

      pass('11. question save rejecting an unknown/archived assetId: both rejected with 400 VALIDATION_ERROR');
    } catch (e) {
      fail('11. question save rejecting an unknown/archived assetId', e);
    }

  } finally {
    server.close();
    try {
      await pool.end();
    } catch {
      // ignore
    }
  }

  console.log(`\nRoute Verification Results: ${passed} passed, ${failed} failed`);
}

run();
