export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';

export async function GET() {
  try {
    const config = await ServerStore.getFeaturedConfigAsync();
    return NextResponse.json(createSuccessResponse(config), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('GET_FEATURED_ERROR', err.message), { status: 500 });
  }
}

