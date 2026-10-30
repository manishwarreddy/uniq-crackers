import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { ProductItem, ProductVariantOption } from '@/types';
import type { ServerOrder } from '@/lib/server-store';
import { INITIAL_PRODUCTS } from '@/lib/products-data';

/**
 * Tests the connection to Supabase and verifies permissions.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  details?: {
    tablesOk: boolean;
    storageOk: boolean;
    productCount?: number;
    orderCount?: number;
  };
}> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      message: 'Supabase credentials are not configured in environment variables.',
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      connected: false,
      message: 'Failed to initialize Supabase client.',
    };
  }

  try {
    // 1. Test database access (products table)
    const { count: productCount, error: prodErr } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .limit(1);

    if (prodErr) {
      return {
        connected: false,
        message: `Database error querying 'products' table: ${prodErr.message}. Make sure supabase/schema.sql has been run in your SQL Editor.`,
      };
    }

    // 2. Test database access (orders table)
    const { count: orderCount, error: orderErr } = await supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .limit(1);

    if (orderErr) {
      return {
        connected: false,
        message: `Database error querying 'orders' table: ${orderErr.message}. Make sure supabase/schema.sql has been run in your SQL Editor.`,
      };
    }

    // 3. Test storage bucket access
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    const hasProductBucket = Boolean(buckets?.some((b) => b.id === 'product-images' || b.name === 'product-images'));

    return {
      connected: true,
      message: 'Supabase connection verified successfully!',
      details: {
        tablesOk: true,
        storageOk: !bucketErr && hasProductBucket,
        productCount: productCount ?? 0,
        orderCount: orderCount ?? 0,
      },
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Supabase connection failed: ${err?.message || 'Unknown network error'}`,
    };
  }
}

/**
 * Ensures the dedicated 'product-images' storage bucket exists and is public.
 */
export async function ensureProductImagesBucket(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && buckets) {
      const exists = buckets.some((b) => b.id === 'product-images' || b.name === 'product-images');
      if (exists) return true;
    }

    const { error: createErr } = await supabase.storage.createBucket('product-images', {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });

    if (createErr && !createErr.message?.toLowerCase().includes('already exists')) {
      console.warn('[SUPABASE STORAGE] Could not create bucket product-images:', createErr.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[SUPABASE STORAGE] Error verifying/creating product-images bucket:', err);
    return false;
  }
}

/**
 * Ensures the dedicated 'payment-screenshots' storage bucket exists and is strictly private.
 * NEVER public: payment screenshots contain sensitive customer UTRs and bank account information.
 */
export async function ensurePaymentScreenshotsBucket(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && buckets) {
      const exists = buckets.some((b) => b.id === 'payment-screenshots' || b.name === 'payment-screenshots');
      if (exists) return true;
    }

    const { error: createErr } = await supabase.storage.createBucket('payment-screenshots', {
      public: false, // Strictly PRIVATE
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (createErr && !createErr.message?.toLowerCase().includes('already exists')) {
      console.warn('[SUPABASE STORAGE] Could not create bucket payment-screenshots:', createErr.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[SUPABASE STORAGE] Error verifying/creating payment-screenshots bucket:', err);
    return false;
  }
}

const VALID_CAT_IDS = new Set([
  'sparklers', 'skyshots', 'flowerpots', 'chakkars',
  'sound', 'rockets', 'novelty', 'hampers', 'electronic'
]);

/**
 * Syncs a single product and its variants to Supabase.
 */
export async function syncProductToSupabase(product: ProductItem): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const safeCategory = product.category || 'sparklers';
    const safeCategoryId = VALID_CAT_IDS.has(safeCategory) ? safeCategory : null;

    // 1. Upsert product
    const { error: prodErr } = await supabase.from('products').upsert(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: safeCategory,
        category_id: safeCategoryId,
        category_label: product.categoryLabel,
        description: product.description,
        image: product.image,
        image_alt: product.imageAlt,
        rating: product.rating || 5.0,
        reviews_count: product.reviewsCount || 1,
        is_green_certified: product.isGreenCertified !== false,
        sound_decibel: product.soundDecibel,
        smoke_level: product.smokeLevel,
        duration_seconds: product.durationSeconds,
        height_feet: product.heightFeet,
        featured: Boolean(product.featured),
        best_seller: Boolean(product.bestSeller),
        badge_text: product.badgeText,
        safety_tips: product.safetyTips || [],
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (prodErr) {
      console.warn('[SUPABASE SYNC] Failed to upsert product:', prodErr.message);
      return false;
    }

    // 2. Upsert variants
    if (product.variants && product.variants.length > 0) {
      const variantRows = product.variants.map((v) => ({
        id: v.id,
        product_id: product.id,
        name: v.name,
        sku: v.sku || `SKU-${product.id}-${v.id}`,
        price: v.price,
        original_price: v.originalPrice || null,
        box_quantity: v.boxQuantity,
        stock: v.stock,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: varErr } = await supabase
        .from('product_variants')
        .upsert(variantRows, { onConflict: 'id' });

      if (varErr) {
        console.warn('[SUPABASE SYNC] Failed to upsert variants:', varErr.message);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('[SUPABASE SYNC] Error syncing product to Supabase:', err);
    return false;
  }
}

/**
 * Extracts storage path from a Supabase storage URL.
 */
export function extractStoragePath(imageUrl: string, bucket = 'product-images'): string | null {
  if (!imageUrl) return null;
  const marker = `/${bucket}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx !== -1) {
    const rawPath = imageUrl.slice(idx + marker.length);
    return rawPath.split('?')[0];
  }
  return null;
}

/**
 * Deletes an image from the Supabase Storage bucket.
 */
export async function deleteImageFromSupabaseStorage(imageUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const storagePath = extractStoragePath(imageUrl, 'product-images');
  if (!storagePath) {
    return false;
  }

  try {
    const { error } = await supabase.storage.from('product-images').remove([storagePath]);
    if (error) {
      console.warn('[SUPABASE STORAGE] Error removing image:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[SUPABASE STORAGE] Error deleting image:', err);
    return false;
  }
}

/**
 * Deletes a product from Supabase and cleans up its stored image.
 */
export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    // 1. Fetch product to clean up storage image if applicable
    const { data: prod } = await supabase
      .from('products')
      .select('image')
      .eq('id', productId)
      .maybeSingle();

    if (prod?.image) {
      await deleteImageFromSupabaseStorage(prod.image);
    }

    // 2. Delete product record from table
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      console.warn('[SUPABASE SYNC] Failed to delete product:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[SUPABASE SYNC] Error deleting product from Supabase:', err);
    return false;
  }
}

/**
 * Directly removes a product's image from Supabase Storage and updates the product row in Supabase.
 */
export async function deleteProductImageInSupabase(
  productId: string,
  fallbackImage = '/images/sparklers.jpg',
  additionalImageUrl?: string
): Promise<{ success: boolean; notFound?: boolean; oldImage?: string; message: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase is not configured' };
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, message: 'Supabase admin client unavailable' };
  }

  try {
    // 1. Fetch current product image directly from Supabase
    const { data: prod, error: fetchErr } = await supabase
      .from('products')
      .select('id, image')
      .eq('id', productId)
      .maybeSingle();

    if (fetchErr) {
      console.warn('[SUPABASE SYNC] Failed to fetch product for image deletion:', fetchErr.message);
    }

    const currentImage = prod?.image;

    // 2. If it is stored in Supabase Storage, delete the storage object
    if (currentImage && currentImage !== fallbackImage) {
      await deleteImageFromSupabaseStorage(currentImage);
    }
    if (additionalImageUrl && additionalImageUrl !== fallbackImage && additionalImageUrl !== currentImage) {
      await deleteImageFromSupabaseStorage(additionalImageUrl);
    }

    if (!prod) {
      return { success: false, notFound: true, message: 'Product not found in Supabase' };
    }

    // 3. Update the product row in Supabase with the fallback image
    const { error: updateErr } = await supabase
      .from('products')
      .update({
        image: fallbackImage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateErr) {
      console.warn('[SUPABASE SYNC] Failed to update product image in Supabase:', updateErr.message);
      return { success: false, notFound: false, message: updateErr.message };
    }

    return { success: true, oldImage: currentImage, message: 'Image deleted from Supabase.' };
  } catch (err: any) {
    console.warn('[SUPABASE SYNC] Error in deleteProductImageInSupabase:', err);
    return { success: false, message: err?.message || 'Error deleting product image' };
  }
}

let isCatalogSeeding = false;
let isCatalogSeeded = false;

/**
 * Ensures all initial catalog products exist in Supabase without overwriting existing data.
 */
export async function ensureCatalogSeededInSupabase(
  initialProducts: ProductItem[] = INITIAL_PRODUCTS,
  excludedIds: Set<string> = new Set()
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  if (isCatalogSeeded || isCatalogSeeding) return true;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  isCatalogSeeding = true;
  try {
    const { data: existingRows, error } = await supabase
      .from('products')
      .select('id');

    if (error) {
      console.warn('[SUPABASE SEED] Failed to check existing products:', error.message);
      isCatalogSeeding = false;
      return false;
    }

    const existingIdSet = new Set((existingRows || []).map((r: any) => r.id));

    const missingProducts = initialProducts.filter(
      (p) => !existingIdSet.has(p.id) && !excludedIds.has(p.id)
    );

    if (missingProducts.length === 0) {
      isCatalogSeeded = true;
      isCatalogSeeding = false;
      return true;
    }

    const productRows = missingProducts.map((product) => {
      const safeCategory = product.category || 'sparklers';
      const safeCategoryId = VALID_CAT_IDS.has(safeCategory) ? safeCategory : null;
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: safeCategory,
        category_id: safeCategoryId,
        category_label: product.categoryLabel,
        description: product.description,
        image: product.image,
        image_alt: product.imageAlt,
        rating: product.rating || 5.0,
        reviews_count: product.reviewsCount || 1,
        is_green_certified: product.isGreenCertified !== false,
        sound_decibel: product.soundDecibel,
        smoke_level: product.smokeLevel,
        duration_seconds: product.durationSeconds,
        height_feet: product.heightFeet,
        featured: Boolean(product.featured),
        best_seller: Boolean(product.bestSeller),
        badge_text: product.badgeText,
        safety_tips: product.safetyTips || [],
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    });

    const variantRows = missingProducts.flatMap((product) =>
      (product.variants || []).map((v) => ({
        id: v.id,
        product_id: product.id,
        name: v.name,
        sku: v.sku || `SKU-${product.id}-${v.id}`,
        price: v.price,
        original_price: v.originalPrice || null,
        box_quantity: v.boxQuantity,
        stock: v.stock,
        is_active: true,
        updated_at: new Date().toISOString(),
      }))
    );

    const { error: pErr } = await supabase.from('products').upsert(productRows, { onConflict: 'id' });
    if (pErr) {
      console.warn('[SUPABASE SEED] Error upserting products:', pErr.message);
    }
    const { error: vErr } = await supabase.from('product_variants').upsert(variantRows, { onConflict: 'id' });
    if (vErr) {
      console.warn('[SUPABASE SEED] Error upserting variants:', vErr.message);
    }

    isCatalogSeeded = true;
    isCatalogSeeding = false;
    return true;
  } catch (err) {
    console.warn('[SUPABASE SEED] Error in ensureCatalogSeededInSupabase:', err);
    isCatalogSeeding = false;
    return false;
  }
}

/**
 * Syncs an order to Supabase.
 */
export async function syncOrderToSupabase(order: ServerOrder): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const basePayload: any = {
    id: order.id,
    order_number: order.orderNumber,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    delivery_address: order.deliveryAddress,
    distance_km: order.distanceKm,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    discount_amount: order.discountAmount,
    total_amount: order.totalAmount,
    payment_method: String(order.paymentMethod),
    payment_status: order.paymentStatus,
    payment_gateway: order.paymentGateway,
    payment_transaction_id: order.paymentTransactionId,
    gateway_order_id: order.gatewayOrderId,
    status: String(order.status),
    delivery_otp: order.deliveryOtp,
    delivery_otp_verified: Boolean(order.deliveryOtpVerified),
    items: order.items,
    status_history: order.statusHistory || [],
    assigned_agent_id: order.assignedAgentId,
    assigned_agent_name: order.assignedAgentName,
    assigned_agent_phone: order.assignedAgentPhone,
    order_access_token: order.orderAccessToken,
    stock_restored: Boolean(order.stockRestored),
    upi_utr: order.upiUtr,
    rejection_reason: order.rejectionReason,
    rejection_note: order.rejectionNote,
    is_deleted: Boolean(order.isDeleted),
    updated_at: new Date().toISOString(),
  };

  const extendedPayload: any = {
    ...basePayload,
    payment_screenshot: order.paymentScreenshot,
    payment_screenshot_uploaded_at: order.paymentScreenshotUploadedAt,
    payment_rejection_reason: order.paymentRejectionReason,
  };

  try {
    // Attempt full upsert including screenshot proof fields
    const { error } = await supabase.from('orders').upsert(extendedPayload, { onConflict: 'id' });

    if (!error) return true;

    // If error indicates column does not exist on Supabase, fallback gracefully to basePayload
    if (error.message?.includes('does not exist')) {
      const { error: fallbackErr } = await supabase.from('orders').upsert(basePayload, { onConflict: 'id' });
      if (fallbackErr) {
        console.warn('[SUPABASE SYNC] Fallback sync failed:', fallbackErr.message);
        return false;
      }
      return true;
    }

    console.warn('[SUPABASE SYNC] Failed to sync order:', error.message);
    return false;
  } catch (err) {
    console.warn('[SUPABASE SYNC] Error syncing order to Supabase:', err);
    return false;
  }
}

/**
 * Loads products from Supabase into memory format.
 */
export async function fetchProductsFromSupabase(): Promise<ProductItem[] | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data: productsData, error: prodErr } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (prodErr || !productsData || productsData.length === 0) {
      return null;
    }

    const items: ProductItem[] = productsData.map((row: any) => {
      const variants: ProductVariantOption[] = (row.product_variants || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        originalPrice: v.original_price ? Number(v.original_price) : Math.round(Number(v.price) * 1.35),
        boxQuantity: v.box_quantity || '1 Box Unit',
        stock: Number(v.stock),
      }));

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        category: row.category_id || 'sparklers',
        categoryLabel: row.category_label || 'Festive Fireworks',
        description: row.description || '',
        image: row.image,
        imageAlt: row.image_alt || row.name,
        rating: Number(row.rating || 5.0),
        reviewsCount: Number(row.reviews_count || 1),
        isGreenCertified: row.is_green_certified !== false,
        soundDecibel: row.sound_decibel || 'Moderate',
        smokeLevel: row.smoke_level || 'Low Smoke',
        durationSeconds: row.duration_seconds || undefined,
        heightFeet: row.height_feet || undefined,
        featured: Boolean(row.featured),
        bestSeller: Boolean(row.best_seller),
        badgeText: row.badge_text,
        safetyTips: Array.isArray(row.safety_tips) && row.safety_tips.length > 0
          ? row.safety_tips
          : [
              'Store in a cool, dry place away from heat or open flame.',
              'Always ignite outdoors under responsible adult supervision.',
              'Keep a bucket of clean water or sand ready nearby.',
            ],
        variants: variants.length > 0 ? variants : [
          {
            id: `var-${row.id}`,
            name: 'Standard Box',
            sku: `SKU-${row.id.slice(-6)}`,
            price: 500,
            originalPrice: 650,
            boxQuantity: '1 Box Unit',
            stock: 50,
          },
        ],
      };
    });

    return items;
  } catch (err) {
    console.warn('[SUPABASE SYNC] Error fetching products:', err);
    return null;
  }
}
