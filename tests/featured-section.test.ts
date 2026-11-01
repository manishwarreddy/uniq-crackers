import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerStore } from '../src/lib/server-store';
import { GET as getPublicFeatured } from '../src/app/api/featured/route';
import { GET as getAdminFeatured, POST as postAdminFeatured } from '../src/app/api/admin/featured/route';
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from '../src/lib/server-auth';
import { fetchFeaturedSectionFromSupabase, syncFeaturedSectionToSupabase } from '../src/lib/supabase-sync';
import { FeaturedSectionConfig, DEFAULT_FEATURED_CONFIG } from '../src/types';

// Ensure test environment secrets
process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'uniqcrackers_admin_session_secret_key_2026_diwali';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'UniqAdmin@2026#Velmala';

function createAdminRequest(url: string, method = 'GET', body?: any): Request {
  const token = createAdminSessionToken({
    userId: 'admin-01',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `${ADMIN_COOKIE_NAME}=${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function createUnauthenticatedRequest(url: string, method = 'GET', body?: any): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('1. Public /api/featured returns active featured section config', async () => {
  const res = await getPublicFeatured();
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data);
  assert.equal(typeof json.data.isEnabled, 'boolean');
  assert.ok(json.data.productId);
});

test('2. Unauthenticated request to /api/admin/featured is rejected with 401', async () => {
  const reqGet = createUnauthenticatedRequest('http://localhost:3000/api/admin/featured', 'GET');
  const resGet = await getAdminFeatured(reqGet);
  assert.equal(resGet.status, 401);

  const reqPost = createUnauthenticatedRequest('http://localhost:3000/api/admin/featured', 'POST', {
    isEnabled: false,
  });
  const resPost = await postAdminFeatured(reqPost);
  assert.equal(resPost.status, 401);
});

test('3. Authenticated admin GET /api/admin/featured returns config and catalog products', async () => {
  const req = createAdminRequest('http://localhost:3000/api/admin/featured', 'GET');
  const res = await getAdminFeatured(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data);
  assert.ok(Array.isArray(json.products));
  assert.ok(json.products.length > 0);
});

test('4. Authenticated admin POST /api/admin/featured updates settings and persists to Supabase', async () => {
  const customConfig: Partial<FeaturedSectionConfig> = {
    isEnabled: true,
    heading: 'Grand Mega Festive Spotlight',
    subtitle: 'Handpicked Fireworks by Uniq Crackers',
    productId: 'prod-hamper-05',
    productTitle: 'Royal Hyderabad Celebration Hamper',
    productDescription: 'Exclusive luxury hamper with 35 smoke-reduced fireworks units.',
    badgeText: 'Limited Festive Special',
    promotionalLabel: 'Save Flat 30% This Season',
    displayOrder: 1,
    buttonText: 'Claim Your Celebration Box',
  };

  const req = createAdminRequest('http://localhost:3000/api/admin/featured', 'POST', customConfig);
  const res = await postAdminFeatured(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.heading, 'Grand Mega Festive Spotlight');
  assert.equal(json.data.productTitle, 'Royal Hyderabad Celebration Hamper');
  assert.equal(json.data.buttonText, 'Claim Your Celebration Box');

  // Verify ServerStore returns updated config
  const storedConfig = await ServerStore.getFeaturedConfigAsync();
  assert.equal(storedConfig.heading, 'Grand Mega Festive Spotlight');
  assert.equal(storedConfig.productTitle, 'Royal Hyderabad Celebration Hamper');

  // Verify public /api/featured route returns updated config
  const publicRes = await getPublicFeatured();
  const publicJson = await publicRes.json();
  assert.equal(publicJson.data.heading, 'Grand Mega Festive Spotlight');
  assert.equal(publicJson.data.productTitle, 'Royal Hyderabad Celebration Hamper');
});

test('5. Admin can change displayed product to a different catalog product', async () => {
  const allProducts = await ServerStore.getProductsAsync();
  assert.ok(allProducts.length > 0, 'Catalog must contain products');
  const targetProduct = allProducts.find((p) => p.id !== 'prod-hamper-05') || allProducts[0];

  const updatedConfig: Partial<FeaturedSectionConfig> = {
    isEnabled: true,
    heading: 'Special Featured Spotlight',
    productId: targetProduct.id,
    productTitle: `${targetProduct.name} - Special Edition`,
    productDescription: 'Exclusive featured item spotlight with festival pricing.',
    badgeText: 'Blockbuster Deal',
    promotionalLabel: 'Wholesale Price Direct from Sivakasi',
    buttonText: 'Add to Cart',
  };

  const req = createAdminRequest('http://localhost:3000/api/admin/featured', 'POST', updatedConfig);
  const res = await postAdminFeatured(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.productId, targetProduct.id);
  assert.equal(json.data.productTitle, `${targetProduct.name} - Special Edition`);

  // Verify catalog product data was preserved and NOT mutated
  const verifiedProducts = await ServerStore.getProductsAsync();
  const verifiedProduct = verifiedProducts.find((p) => p.id === targetProduct.id);
  assert.ok(verifiedProduct, `Product ${targetProduct.id} should exist in catalog`);
  assert.equal(verifiedProduct.name, targetProduct.name, 'Original catalog product name must not be changed');
});

test('6. Admin can disable the featured section', async () => {
  const req = createAdminRequest('http://localhost:3000/api/admin/featured', 'POST', {
    isEnabled: false,
  });
  const res = await postAdminFeatured(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.isEnabled, false);

  const publicRes = await getPublicFeatured();
  const publicJson = await publicRes.json();
  assert.equal(publicJson.data.isEnabled, false);
});

test('7. Restore default featured hamper configuration for clean state', async () => {
  const req = createAdminRequest('http://localhost:3000/api/admin/featured', 'POST', DEFAULT_FEATURED_CONFIG);
  const res = await postAdminFeatured(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.isEnabled, true);
  assert.equal(json.data.productId, 'prod-hamper-05');
});
