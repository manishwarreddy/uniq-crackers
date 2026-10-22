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

    const settings = ServerStore.getDeliverySettings();
    return NextResponse.json(createSuccessResponse(settings));
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('GET_SETTINGS_ERROR', err.message), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json();
    const {
      adminWhatsAppNumber,
      freeDeliveryThreshold,
      maxRadiusKm,
      centerLatitude,
      centerLongitude,
      centerAddress,
      slabs,
      smsApiKey,
    } = body;

    const updated = ServerStore.updateDeliverySettings({
      adminWhatsAppNumber: adminWhatsAppNumber ? adminWhatsAppNumber.replace(/[^\d]/g, '').slice(-10) : undefined,
      freeDeliveryThreshold: freeDeliveryThreshold !== undefined ? Number(freeDeliveryThreshold) : undefined,
      maxRadiusKm: maxRadiusKm !== undefined ? Number(maxRadiusKm) : undefined,
      centerLatitude: centerLatitude !== undefined ? Number(centerLatitude) : undefined,
      centerLongitude: centerLongitude !== undefined ? Number(centerLongitude) : undefined,
      centerAddress: centerAddress !== undefined ? String(centerAddress).trim() : undefined,
      smsApiKey: smsApiKey !== undefined ? smsApiKey.trim() : undefined,
      slabs: Array.isArray(slabs) ? slabs : undefined,
    });

    return NextResponse.json(createSuccessResponse(updated));
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('UPDATE_SETTINGS_ERROR', err.message), { status: 500 });
  }
}
