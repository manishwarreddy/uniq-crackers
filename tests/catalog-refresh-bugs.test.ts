import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerStore } from '../src/lib/server-store';
import { GET as getCatalog, POST as postCatalog } from '../src/app/api/admin/catalog/route';
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from '../src/lib/server-auth';
import { getSupabaseAdmin, isSupabaseConfigured } from '../src/lib/supabase';
import { ProductItem } from '../src/types';
import { INITIAL_PRODUCTS } from '../src/lib/products-data';

// Configure test environment secrets
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

test('Bug 1 Regression: Deleted product photo persists across catalog refresh and page reload', async () => {
  const testProductId = `prod-custom-img-${Date.now()}`;
  const customImageUrl = 'https://dldhiedtofgmgjaetxzl.supabase.co/storage/v1/object/public/product-images/custom-sparkler-box.png';

  const testProduct: ProductItem = {
    id: testProductId,
    name: 'Regression Test Custom Sparklers',
    slug: `regression-custom-sparklers-${Date.now()}`,
    category: 'sparklers',
    categoryLabel: 'Sparklers & Phooljhadi',
    description: 'Testing image deletion persistence',
    image: customImageUrl,
    imageAlt: 'Custom sparkler image',
    rating: 5.0,
    reviewsCount: 1,
    isGreenCertified: true,
    soundDecibel: 'Low',
    smokeLevel: 'Low',
    variants: [
      {
        id: `var-${testProductId}`,
        name: 'Standard Unit',
        sku: `SKU-REG-IMG-${Date.now().toString().slice(-4)}`,
        price: 450,
        originalPrice: 600,
        boxQuantity: '1 Box',
        stock: 50,
      },
    ],
    safetyTips: ['Keep safe distance'],
  };

  // 1. Add product with custom image
  await ServerStore.addProduct(testProduct);
  const beforeDelete = ServerStore.getProductById(testProductId);
  assert.equal(beforeDelete?.image, customImageUrl, 'Product must initially have custom photo');

  // 2. Delete the product image via ServerStore.deleteProductImage
  const deleteResult = await ServerStore.deleteProductImage(testProductId, customImageUrl);
  assert.equal(deleteResult, true, 'deleteProductImage must return true');

  // Verify memory cache immediately reflects the fallback image
  const immediatelyAfterDelete = ServerStore.getProductById(testProductId);
  assert.equal(immediatelyAfterDelete?.image, '/images/sparklers.jpg', 'Image must immediately reset to default fallback');

  // 3. Simulate clicking "Refresh Catalog" (which calls getProductsAsync)
  const refreshedProducts = await ServerStore.getProductsAsync();
  const refreshedProduct = refreshedProducts.find((p) => p.id === testProductId);

  assert.ok(refreshedProduct, 'Product must remain present in catalog after refresh');
  assert.equal(
    refreshedProduct.image,
    '/images/sparklers.jpg',
    'Deleted photo must NOT reappear after Refresh Catalog'
  );

  // 4. If Supabase is configured, verify direct database record in Supabase products table
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: dbRow, error } = await supabase
        .from('products')
        .select('image')
        .eq('id', testProductId)
        .maybeSingle();

      assert.equal(error, null, 'Supabase query must succeed without errors');
      assert.ok(dbRow, 'Product row must exist in Supabase');
      assert.equal(
        dbRow.image,
        '/images/sparklers.jpg',
        'Supabase database row must have fallback image and must not restore deleted image'
      );
    }
  }

  // 5. Clean up test product
  await ServerStore.deleteProduct(testProductId);
});

test('Bug 2 Regression: Newly added products persist across catalog refresh without disappearing', async () => {
  const newProdId = `prod-custom-add-${Date.now()}`;
  const newProdName = `Brand New Sky Rocket ${Date.now().toString().slice(-4)}`;

  const newProduct: ProductItem = {
    id: newProdId,
    name: newProdName,
    slug: `new-sky-rocket-${Date.now()}`,
    category: 'rockets',
    categoryLabel: 'Sky Rockets',
    description: 'Testing new product persistence across catalog refresh',
    image: '/images/sky_rockets.jpg',
    imageAlt: newProdName,
    rating: 5.0,
    reviewsCount: 1,
    isGreenCertified: true,
    soundDecibel: 'Moderate',
    smokeLevel: 'Low',
    featured: true,
    variants: [
      {
        id: `var-${newProdId}`,
        name: 'Standard Unit',
        sku: `SKU-REG-ADD-${Date.now().toString().slice(-4)}`,
        price: 750,
        originalPrice: 990,
        boxQuantity: '1 Box Unit',
        stock: 35,
      },
    ],
    safetyTips: ['Keep safe distance outdoors'],
  };

  // 1. Add product (must be awaited so Supabase sync completes)
  const created = await ServerStore.addProduct(newProduct);
  assert.equal(created.id, newProdId, 'Product must be created with matching ID');

  // 2. Immediately call getProductsAsync (exactly what client does on "Refresh Catalog")
  // In the buggy version, a race condition caused getProductsAsync() to return Supabase rows
  // before the sync was committed, wiping out the new product from cache and disk.
  const catalogAfterImmediateRefresh = await ServerStore.getProductsAsync();
  const foundImmediate = catalogAfterImmediateRefresh.find((p) => p.id === newProdId);

  assert.ok(
    foundImmediate,
    'Newly added product must NOT disappear when Refresh Catalog is clicked immediately after adding'
  );
  assert.equal(foundImmediate.name, newProdName, 'Product name must match');
  assert.equal(foundImmediate.variants[0].price, 750, 'Variant price must match');

  // 3. Verify direct Supabase database row if Supabase is configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: dbProduct, error: prodErr } = await supabase
        .from('products')
        .select('id, name, is_active, product_variants(*)')
        .eq('id', newProdId)
        .maybeSingle();

      assert.equal(prodErr, null, 'Supabase query must not error');
      assert.ok(dbProduct, 'Product must be persisted in Supabase products table');
      assert.equal(dbProduct.is_active, true, 'Product must be active in Supabase');
      assert.ok(
        dbProduct.product_variants && dbProduct.product_variants.length > 0,
        'Variants must be persisted in Supabase product_variants table'
      );
    }
  }

  // 4. Secondary Refresh Catalog simulation
  const catalogSecondRefresh = await ServerStore.getProductsAsync();
  const foundSecond = catalogSecondRefresh.find((p) => p.id === newProdId);
  assert.ok(foundSecond, 'Product must continue to persist across repeated catalog refreshes');

  // 5. Clean up test product
  await ServerStore.deleteProduct(newProdId);
});

test('Bug 1 & 2 via Catalog API Route: End-to-end admin endpoints', async () => {
  const apiTestName = `API Route Test Cracker ${Date.now().toString().slice(-4)}`;
  const customPhotoUrl = 'https://dldhiedtofgmgjaetxzl.supabase.co/storage/v1/object/public/product-images/api-test-photo.jpg';

  // 1. Call POST /api/admin/catalog with action ADD_PRODUCT
  const addReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'POST', {
    action: 'ADD_PRODUCT',
    payload: {
      name: apiTestName,
      category: 'flowerpots',
      price: 320,
      originalPrice: 450,
      stock: 40,
      image: customPhotoUrl,
      description: 'API integration test',
    },
  });

  const addRes = await postCatalog(addReq);
  const addData = await addRes.json();
  assert.equal(addData.success, true, 'ADD_PRODUCT API must succeed');
  const createdProductId = addData.data.id;
  assert.ok(createdProductId, 'Created product must have an ID');

  // 2. Call GET /api/admin/catalog (Refresh Catalog API)
  const getReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const getRes = await getCatalog(getReq);
  const getData = await getRes.json();

  assert.equal(getData.success, true, 'GET /api/admin/catalog must succeed');
  const foundInApi = getData.data.find((p: any) => p.id === createdProductId);
  assert.ok(foundInApi, 'Newly added product must be present in GET /api/admin/catalog response');
  assert.equal(foundInApi.image, customPhotoUrl, 'Product must retain custom image initially');

  // 3. Call POST /api/admin/catalog with action DELETE_IMAGE
  const deleteImgReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'POST', {
    action: 'DELETE_IMAGE',
    payload: {
      productId: createdProductId,
      imageUrl: customPhotoUrl,
    },
  });

  const deleteImgRes = await postCatalog(deleteImgReq);
  const deleteImgData = await deleteImgRes.json();
  assert.equal(deleteImgData.success, true, 'DELETE_IMAGE API must succeed');

  // 4. Call GET /api/admin/catalog again (Refresh Catalog after image delete)
  const getReqAfterImgDelete = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const getResAfterImgDelete = await getCatalog(getReqAfterImgDelete);
  const getDataAfterImgDelete = await getResAfterImgDelete.json();

  const productAfterRefresh = getDataAfterImgDelete.data.find((p: any) => p.id === createdProductId);
  assert.ok(productAfterRefresh, 'Product must still exist after image deletion');
  assert.equal(
    productAfterRefresh.image,
    '/images/sparklers.jpg',
    'Deleted photo must NOT reappear in GET /api/admin/catalog after refresh'
  );

  // 5. Clean up via DELETE_PRODUCT API
  const deleteProdReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'POST', {
    action: 'DELETE_PRODUCT',
    payload: { productId: createdProductId },
  });
  const delRes = await postCatalog(deleteProdReq);
  const delData = await delRes.json();
  assert.equal(delData.success, true, 'DELETE_PRODUCT API must succeed');

  // Verify product does not appear in GET /api/admin/catalog after delete
  const getReqAfterDelete = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const getResAfterDelete = await getCatalog(getReqAfterDelete);
  const getDataAfterDelete = await getResAfterDelete.json();
  const productAfterDelete = getDataAfterDelete.data.find((p: any) => p.id === createdProductId);
  assert.equal(productAfterDelete, undefined, 'Deleted product must not appear after Refresh Catalog');
});


test('Bug 3: Deleting a product persists in database and never reappears on Refresh Catalog or page reload', async () => {
  const customProdId = `prod-custom-deltest-${Date.now()}`;
  const customProdName = `Deletion Test Cracker ${Date.now().toString().slice(-4)}`;

  // 1. Add product via ADD_PRODUCT API
  const addReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'POST', {
    action: 'ADD_PRODUCT',
    payload: {
      id: customProdId,
      name: customProdName,
      category: 'skyshots',
      price: 499,
      originalPrice: 699,
      stock: 25,
      description: 'Verifying deletion persistence across Refresh Catalog',
    },
  });
  const addRes = await postCatalog(addReq);
  const addData = await addRes.json();
  assert.equal(addData.success, true, 'ADD_PRODUCT must succeed');
  const prodId = addData.data.id;

  // 2. Verify product is returned in GET /api/admin/catalog
  const getReq1 = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const getRes1 = await getCatalog(getReq1);
  const getData1 = await getRes1.json();
  const foundBefore = getData1.data.find((p: any) => p.id === prodId);
  assert.ok(foundBefore, 'Product must be present before deletion');

  // 3. Delete the product via DELETE_PRODUCT API
  const delReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'POST', {
    action: 'DELETE_PRODUCT',
    payload: { productId: prodId },
  });
  const delRes = await postCatalog(delReq);
  const delData = await delRes.json();
  assert.equal(delData.success, true, 'DELETE_PRODUCT must succeed');

  // 4. Verify product disappears immediately from memory/cache
  const immediatelyAfter = ServerStore.getProductById(prodId);
  assert.equal(immediatelyAfter, undefined, 'Product must not be found in ServerStore cache immediately after delete');

  // 5. Simulate clicking Refresh Catalog (GET /api/admin/catalog)
  const refreshReq1 = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const refreshRes1 = await getCatalog(refreshReq1);
  const refreshData1 = await refreshRes1.json();
  const foundAfterRefresh1 = refreshData1.data.find((p: any) => p.id === prodId);
  assert.equal(
    foundAfterRefresh1,
    undefined,
    'Deleted product must NOT reappear after clicking Refresh Catalog'
  );

  // 6. Simulate page reload and a second Refresh Catalog
  const refreshReq2 = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const refreshRes2 = await getCatalog(refreshReq2);
  const refreshData2 = await refreshRes2.json();
  const foundAfterRefresh2 = refreshData2.data.find((p: any) => p.id === prodId);
  assert.equal(
    foundAfterRefresh2,
    undefined,
    'Deleted product must remain deleted across repeated Refresh Catalog calls'
  );

  // 7. Verify other active products continue to be returned normally
  assert.ok(refreshData2.data.length > 0, 'Active catalog products must continue to exist and work normally');
  const activeProduct = refreshData2.data.find((p: any) => p.id !== prodId);
  assert.ok(activeProduct, 'Active products must remain in catalog');
  assert.ok(activeProduct.variants.length > 0, 'Active product variants must be preserved');
  assert.ok(activeProduct.variants[0].price > 0, 'Active product prices must be preserved');

  // 8. If Supabase is configured, verify the product in Supabase has is_active = false
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: dbRow, error } = await supabase
        .from('products')
        .select('id, is_active')
        .eq('id', prodId)
        .maybeSingle();

      assert.equal(error, null, 'Supabase query must not fail');
      if (dbRow) {
        assert.equal(dbRow.is_active, false, 'Deleted product in Supabase must have is_active = false');
      }
    }
  }
});


test('Bug 3 Part 2: Deleting an initial catalog product does not get re-seeded or restored on Refresh Catalog', async () => {
  const beforeRefresh = await ServerStore.getProductsAsync();
  const initialProduct = INITIAL_PRODUCTS.find((p) => beforeRefresh.some((c) => c.id === p.id));
  assert.ok(initialProduct, 'Initial product must exist in catalog');
  const initialId = initialProduct.id;

  assert.ok(beforeRefresh.some((p) => p.id === initialId), 'Product must be in catalog initially');

  // Delete initial product
  const delReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'POST', {
    action: 'DELETE_PRODUCT',
    payload: { productId: initialId },
  });
  const delRes = await postCatalog(delReq);
  const delData = await delRes.json();
  assert.equal(delData.success, true, 'DELETE_PRODUCT must succeed');

  // Simulate Refresh Catalog (GET /api/admin/catalog)
  const refreshReq = createAdminRequest('http://localhost:3000/api/admin/catalog', 'GET');
  const refreshRes = await getCatalog(refreshReq);
  const refreshData = await refreshRes.json();
  const foundAfterRefresh = refreshData.data.find((p: any) => p.id === initialId);
  assert.equal(
    foundAfterRefresh,
    undefined,
    'Initial product must NOT be re-seeded or restored upon Refresh Catalog'
  );

  // Restore the product so catalog stays clean
  await ServerStore.addProduct(initialProduct);
  const restoredCatalog = await ServerStore.getProductsAsync();
  assert.ok(restoredCatalog.some((p) => p.id === initialId), 'Restored product must be in catalog');
});
