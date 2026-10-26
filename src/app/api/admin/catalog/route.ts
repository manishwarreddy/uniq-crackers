import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { requireAdmin } from '@/lib/server-auth';
import { ProductItem } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'products';

    if (type === 'coupons') {
      const coupons = ServerStore.getCoupons();
      return NextResponse.json(createSuccessResponse(coupons));
    }

    const products = ServerStore.getProducts();
    return NextResponse.json(createSuccessResponse(products));
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('CATALOG_GET_ERROR', err.message), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json();
    const { action, payload } = body;

    if (action === 'ADD_PRODUCT') {
      const categoryLabels: Record<string, string> = {
        sparklers: 'Sparklers & Phooljhadi',
        skyshots: 'Aerial Sky Shots',
        flowerpots: 'Flower Pots & Anars',
        chakkars: 'Ground Chakkars',
        sound: 'Sound Crackers & Bombs',
        rockets: 'Sky Rockets',
        novelty: 'Fancy Novelties & Spinners',
        hampers: 'Diwali Gift Hampers',
        electronic: 'Electronic Crackers',
      };

      const categoryImages: Record<string, string> = {
        sparklers: '/images/sparklers.jpg',
        skyshots: '/images/skyshots.jpg',
        flowerpots: '/images/colour_koti.jpg',
        chakkars: '/images/chakkar.jpg',
        sound: '/images/sound_crackers.jpg',
        rockets: '/images/sky_rockets.jpg',
        novelty: '/images/novelty_fireworks.jpg',
        hampers: '/images/hamper.jpg',
        electronic: '/images/sparklers.jpg',
      };

      const selectedCategory = payload.category || 'sparklers';
      const cleanSlug = (payload.slug || payload.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Support uploaded photo data URL, preset, or custom URL
      const finalImage = payload.image || payload.photo || categoryImages[selectedCategory] || '/images/sparklers.jpg';

      const sellingPrice = Number(payload.price);
      const originalPrice = Number(payload.originalPrice || Math.round(sellingPrice * 1.35));

      const newProduct: ProductItem = {
        id: `prod-custom-${Date.now()}`,
        name: payload.name.trim(),
        slug: `${cleanSlug}-${Date.now().toString().slice(-4)}`,
        category: selectedCategory,
        categoryLabel: categoryLabels[selectedCategory] || 'Festive Fireworks',
        description: payload.description?.trim() || 'Premium green fireworks certified for eco-friendly Diwali celebration.',
        image: finalImage,
        imageAlt: `${payload.name} celebratory green cracker fireworks box`,
        rating: 5.0,
        reviewsCount: 1,
        isGreenCertified: payload.isGreenCertified !== false,
        soundDecibel: payload.soundDecibel || 'Low / Moderate',
        smokeLevel: payload.smokeLevel || '70% Reduced Smoke (CSIR-NEERI)',
        durationSeconds: payload.durationSeconds ? Number(payload.durationSeconds) : undefined,
        heightFeet: payload.heightFeet ? Number(payload.heightFeet) : undefined,
        featured: Boolean(payload.featured),
        bestSeller: Boolean(payload.bestSeller),
        badgeText: payload.badgeText || (payload.featured ? 'FEATURED • NEW LAUNCH' : 'GREEN CERTIFIED'),
        variants: [
          {
            id: `var-${Date.now()}`,
            name: payload.variantName || 'Standard Festive Box',
            sku: `SKU-${Date.now().toString().slice(-6)}`,
            price: sellingPrice,
            originalPrice: originalPrice,
            boxQuantity: payload.boxQuantity || '1 Box Unit',
            stock: Number(payload.stock || 50),
          },
        ],
        safetyTips: payload.safetyTips || [
          'Store in a cool and dry environment away from flammable sources',
          'Ignite strictly outdoors in open grounds under adult guidance',
          'Keep a bucket of water or sand nearby for safe quenching',
        ],
      };

      const created = ServerStore.addProduct(newProduct);
      return NextResponse.json(createSuccessResponse(created));
    }

    if (action === 'UPDATE_PRODUCT') {
      const { productId, updates } = payload;
      const updated = ServerStore.updateProduct(productId, updates);
      if (!updated) {
        return NextResponse.json(createErrorResponse('NOT_FOUND', 'Product not found'), { status: 404 });
      }
      return NextResponse.json(createSuccessResponse(updated));
    }

    if (action === 'UPDATE_PRICE') {
      const { productId, variantId, newPrice, newOriginalPrice, newStock } = payload;
      const updated = ServerStore.updateProductPrice(
        productId,
        variantId,
        Number(newPrice),
        newOriginalPrice ? Number(newOriginalPrice) : undefined,
        newStock !== undefined && newStock !== null ? Number(newStock) : undefined
      );

      if (!updated) {
        return NextResponse.json(createErrorResponse('NOT_FOUND', 'Product not found'), { status: 404 });
      }

      return NextResponse.json(createSuccessResponse(updated));
    }

    if (action === 'DELETE_PRODUCT') {
      const { productId } = payload;
      const deleted = ServerStore.deleteProduct(productId);
      return NextResponse.json(createSuccessResponse({ success: deleted, productId }));
    }

    if (action === 'ADD_COUPON') {
      const newCoupon = {
        id: `coup-${Date.now()}`,
        code: payload.code.toUpperCase().trim(),
        discountType: payload.discountType || 'PERCENTAGE',
        discountValue: Number(payload.discountValue),
        minOrderAmount: Number(payload.minOrderAmount || 500),
        maxDiscount: payload.maxDiscount ? Number(payload.maxDiscount) : undefined,
        isActive: true,
      };

      ServerStore.addCoupon(newCoupon);
      return NextResponse.json(createSuccessResponse(newCoupon));
    }

    return NextResponse.json(createErrorResponse('INVALID_ACTION', 'Action not recognized'), { status: 400 });
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('SERVER_ERROR', err.message), { status: 500 });
  }
}
