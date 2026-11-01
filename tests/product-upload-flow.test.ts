import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as handleUploadPost } from '../src/app/api/admin/upload/route';
import { POST as handleCatalogPost, GET as handleCatalogGet } from '../src/app/api/admin/catalog/route';
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from '../src/lib/server-auth';
import { ServerStore } from '../src/lib/server-store';
import { isSupabaseConfigured, getSupabaseAdmin } from '../src/lib/supabase';

function createAdminRequest(url: string, method = 'POST', body?: any): NextRequest {
  const token = createAdminSessionToken({
    userId: 'admin-01',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `${ADMIN_COOKIE_NAME}=${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('1. Admin Upload: GET_SIGNED_URL requires valid admin authentication', async () => {
  // Unauthorized request (no cookie)
  const reqUnauth = new NextRequest('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'GET_SIGNED_URL', fileName: 'test.jpg' }),
  });

  const resUnauth = await handleUploadPost(reqUnauth);
  assert.equal(resUnauth.status, 401, 'Unauthorized GET_SIGNED_URL should return 401');
});

test('2. Admin Upload: GET_SIGNED_URL generates pre-signed upload URL for Supabase Storage', async () => {
  const req = createAdminRequest('http://localhost:3000/api/admin/upload', 'POST', {
    action: 'GET_SIGNED_URL',
    fileName: 'anar-special-box.jpg',
    contentType: 'image/jpeg',
  });

  const res = await handleUploadPost(req);
  assert.equal(res.status, 200, 'GET_SIGNED_URL should succeed with 200');
  const data = await res.json();

  if (isSupabaseConfigured()) {
    assert.equal(data.success, true, 'Should report success when Supabase is configured');
    assert.ok(data.signedUrl && data.signedUrl.startsWith('http'), 'Should return signed upload URL');
    assert.ok(data.path && data.path.startsWith('products/'), 'Should return storage file path');
    assert.ok(data.token, 'Should return upload token');
    assert.ok(data.publicUrl && data.publicUrl.includes('/storage/v1/object/public/product-images/'), 'Should return public storage URL');
  } else {
    assert.equal(data.storage, 'local', 'Should report local fallback when Supabase is not configured');
  }
});

test('3. Admin Catalog: Handles malformed body with readable JSON message instead of non-JSON error', async () => {
  const token = createAdminSessionToken({
    userId: 'admin-01',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  const reqMalformed = new NextRequest('http://localhost:3000/api/admin/catalog', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `${ADMIN_COOKIE_NAME}=${token}`,
    },
    body: '{ malformed json payload ',
  });

  const res = await handleCatalogPost(reqMalformed);
  assert.equal(res.status, 400, 'Malformed body should return 400');
  const body = await res.json();
  assert.equal(body.success, false, 'Should return success = false');
  assert.equal(body.error.code, 'INVALID_JSON', 'Should return INVALID_JSON code');
  assert.ok(body.error.message.includes('JSON'), 'Error message should be human-readable JSON');
});

test('4. End-to-End: Admin publishes product with image URL and verifies in catalog & storefront', async () => {
  const uniqueName = `Festive Special Rocket ${Date.now().toString().slice(-4)}`;
  const testImageUrl = 'https://dldhiedtofgmgjaetxzl.supabase.co/storage/v1/object/public/product-images/products/sample-test.jpg';

  const addReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'POST', {
    action: 'ADD_PRODUCT',
    payload: {
      name: uniqueName,
      category: 'rockets',
      variantName: 'Pack of 10',
      boxQuantity: '10 Rockets Box',
      price: 650,
      originalPrice: 850,
      description: 'Hand-crafted eco-friendly sky rockets tested for direct upload flow.',
      stock: 45,
      image: testImageUrl,
      soundDecibel: 'Moderate',
      smokeLevel: 'Low Smoke',
      isGreenCertified: true,
      featured: true,
    },
  });

  const addRes = await handleCatalogPost(addReq);
  assert.equal(addRes.status, 200, 'Publishing product should return 200');
  const addBody = await addRes.json();
  assert.equal(addBody.success, true, 'ADD_PRODUCT must succeed');
  assert.equal(addBody.data.name, uniqueName, 'Product name must match');
  assert.equal(addBody.data.image, testImageUrl, 'Image URL must be preserved');
  const createdId = addBody.data.id;
  const createdSlug = addBody.data.slug;

  // 1. Verify in admin live catalog
  const catalogReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const catalogRes = await handleCatalogGet(catalogReq);
  const catalogBody = await catalogRes.json();
  assert.equal(catalogBody.success, true, 'Catalog GET must succeed');
  const foundInCatalog = catalogBody.data.find((p: any) => p.id === createdId);
  assert.ok(foundInCatalog, 'Created product must appear in Admin Live Catalog');
  assert.equal(foundInCatalog.image, testImageUrl, 'Image URL must match in Live Catalog');
  assert.equal(foundInCatalog.variants[0].price, 650, 'Price must match');

  // 2. Verify in storefront lookup
  const storeProduct = ServerStore.getProductById(createdId) || ServerStore.getProductById(createdSlug);
  assert.ok(storeProduct, 'Product must be accessible on Storefront via ID or slug');
  assert.equal(storeProduct.name, uniqueName, 'Storefront product name must match');
  assert.equal(storeProduct.variants[0].stock, 45, 'Storefront product stock must match');

  // 3. Clean up test product
  await ServerStore.deleteProduct(createdId);
  const afterDelete = ServerStore.getProductById(createdId);
  assert.equal(afterDelete, undefined, 'Cleaned up product must not exist');
});

