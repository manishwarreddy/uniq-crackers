export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { requireAdmin } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const config = await ServerStore.getFeaturedConfigAsync();
    const products = await ServerStore.getProductsAsync();

    return NextResponse.json(
      {
        success: true,
        data: config,
        products,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('GET_FEATURED_ADMIN_ERROR', err.message), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        createErrorResponse('INVALID_JSON', 'Malformed or oversized JSON payload in featured config request'),
        { status: 400 }
      );
    }

    const {
      isEnabled,
      heading,
      subtitle,
      productId,
      productTitle,
      productDescription,
      badgeText,
      promotionalLabel,
      displayOrder,
      buttonText,
    } = body || {};

    const currentConfig = await ServerStore.getFeaturedConfigAsync();
    const targetProductId = (typeof productId === 'string' && productId.trim()) || currentConfig.productId || 'prod-hamper-05';

    const updated = await ServerStore.updateFeaturedConfig({
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : currentConfig.isEnabled,
      heading: heading !== undefined ? (typeof heading === 'string' && heading.trim() ? heading.trim() : 'Festive Spotlight Combo') : currentConfig.heading,
      subtitle: subtitle !== undefined ? (typeof subtitle === 'string' && subtitle.trim() ? subtitle.trim() : 'Complete Family Celebration Assortment') : currentConfig.subtitle,
      productId: targetProductId,
      productTitle: productTitle !== undefined ? (typeof productTitle === 'string' && productTitle.trim() ? productTitle.trim() : undefined) : currentConfig.productTitle,
      productDescription: productDescription !== undefined ? (typeof productDescription === 'string' && productDescription.trim() ? productDescription.trim() : undefined) : currentConfig.productDescription,
      badgeText: badgeText !== undefined ? (typeof badgeText === 'string' && badgeText.trim() ? badgeText.trim() : undefined) : currentConfig.badgeText,
      promotionalLabel: promotionalLabel !== undefined ? (typeof promotionalLabel === 'string' && promotionalLabel.trim() ? promotionalLabel.trim() : undefined) : currentConfig.promotionalLabel,
      displayOrder: displayOrder !== undefined ? Math.max(1, Number(displayOrder) || 1) : currentConfig.displayOrder,
      buttonText: buttonText !== undefined ? (typeof buttonText === 'string' && buttonText.trim() ? buttonText.trim() : 'Add Hamper to Cart') : currentConfig.buttonText,
    });

    return NextResponse.json(createSuccessResponse(updated));
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('UPDATE_FEATURED_ADMIN_ERROR', err.message), { status: 500 });
  }
}
