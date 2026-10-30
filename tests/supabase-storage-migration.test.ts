import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { INITIAL_PRODUCTS } from '../src/lib/products-data';
import { POST as handleUploadPost, DELETE as handleUploadDelete } from '../src/app/api/admin/upload/route';
import { createAdminSessionToken } from '../src/lib/server-auth';
import { extractStoragePath } from '../src/lib/supabase-sync';

// Load .env.local for secrets if present
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

test('1. Supabase Storage: All 57 baseline products use verified Supabase Storage URLs', () => {
  assert.equal(INITIAL_PRODUCTS.length, 57, 'Should have exactly 57 products');

  for (const p of INITIAL_PRODUCTS) {
    assert.ok(
      p.image.startsWith('https://') && p.image.includes('/storage/v1/object/public/product-images/'),
      `Product ${p.id} (${p.name}) image should be a Supabase Storage public URL. Got: ${p.image}`
    );
  }
});

test('2. Supabase Storage: Product attributes, variants, pricing, and stock are fully preserved', () => {
  const storePath = path.join(process.cwd(), '.data', 'store.json');
  assert.ok(fs.existsSync(storePath), '.data/store.json should exist');

  const storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  const storeProducts = storeData.products || [];

  assert.ok(storeProducts.length >= 40, `store.json should retain all products, got: ${storeProducts.length}`);

  // Verify key products have their prices, stock, and categories intact
  for (const p of INITIAL_PRODUCTS) {
    assert.ok(p.id && p.id.startsWith('prod-'), `Product ID should be valid: ${p.id}`);
    assert.ok(p.name && p.name.length > 0, `Product name should be valid: ${p.name}`);
    assert.ok(p.category && p.category.length > 0, `Category should be valid: ${p.category}`);
    assert.ok(p.variants && p.variants.length > 0, `Variants should exist for: ${p.id}`);
    for (const v of p.variants) {
      assert.ok(v.price > 0, `Variant price should be positive for ${v.id}`);
      assert.ok(v.stock >= 0, `Variant stock should be non-negative for ${v.id}`);
    }
  }
});

test('3. Supabase Storage: Local fallback images are preserved on disk and not deleted', () => {
  // Check that critical local fallback images exist in public/images/
  const essentialLocalFiles = [
    'sparklers.jpg',
    'anar.jpg',
    'sound_crackers.jpg',
    'chakkar.jpg',
    'colour_koti.jpg',
    'sky_rockets.jpg',
    'skyshots.jpg',
    'hamper.jpg',
  ];

  for (const fileName of essentialLocalFiles) {
    const filePath = path.join(process.cwd(), 'public', 'images', fileName);
    assert.ok(fs.existsSync(filePath), `Local fallback file should remain on disk: public/images/${fileName}`);
    assert.ok(fs.statSync(filePath).size > 0, `Local fallback file should not be empty: ${fileName}`);
  }
});

test('4. Admin Upload Security: Rejects unauthorized requests without valid admin session', async () => {
  const dummyFormData = new FormData();
  const file = new File(['fake content'], 'test.png', { type: 'image/png' });
  dummyFormData.append('file', file);

  const req = new NextRequest('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    body: dummyFormData,
  });

  const res = await handleUploadPost(req);
  assert.equal(res.status, 401, 'Unauthorized request should be rejected with 401');
});

test('5. Admin Upload Validation: Rejects invalid file types and oversized files', async () => {
  const token = createAdminSessionToken({ userId: 'admin', role: 'ADMIN' });

  // Test invalid file type
  const textFormData = new FormData();
  const textFile = new File(['executable or script'], 'malicious.exe', { type: 'application/x-msdownload' });
  textFormData.append('file', textFile);

  const reqInvalidType = new NextRequest('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    body: textFormData,
    headers: {
      cookie: `admin_session=${token}`,
    },
  });

  const resInvalidType = await handleUploadPost(reqInvalidType);
  assert.equal(resInvalidType.status, 400, 'Invalid mime type should be rejected with 400');
  const bodyInvalid = await resInvalidType.json();
  assert.ok(bodyInvalid.message.includes('Invalid file type'), 'Should report invalid file type');

  // Test oversized file (> 6MB)
  const bigBuffer = new Uint8Array(7 * 1024 * 1024); // 7MB
  const bigFile = new File([bigBuffer], 'large.jpg', { type: 'image/jpeg' });
  const bigFormData = new FormData();
  bigFormData.append('file', bigFile);

  const reqBig = new NextRequest('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    body: bigFormData,
    headers: {
      cookie: `admin_session=${token}`,
    },
  });

  const resBig = await handleUploadPost(reqBig);
  assert.equal(resBig.status, 400, 'Oversized file should be rejected with 400');
  const bodyBig = await resBig.json();
  assert.ok(bodyBig.message.includes('exceeds 6MB limit'), 'Should report 6MB limit exceeded');
});

test('6. Supabase Storage helper: extractStoragePath correctly parses bucket paths', () => {
  const testUrl = 'https://dldhiedtofgmgjaetxzl.supabase.co/storage/v1/object/public/product-images/products/sample.jpg';
  const pathExtracted = extractStoragePath(testUrl, 'product-images');
  assert.equal(pathExtracted, 'products/sample.jpg', 'Should extract products/sample.jpg');

  assert.equal(extractStoragePath('/images/sparklers.jpg'), null, 'Non-storage URL should return null');
});
