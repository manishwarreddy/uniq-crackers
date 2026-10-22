import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateDeliveryLocation } from '@/lib/geo';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { ServerStore } from '@/lib/server-store';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius: searchParams.get('radius') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid latitude or longitude parameters', parsed.error.format()),
        { status: 400 }
      );
    }

    const { lat, lng, radius } = parsed.data;
    const settings = ServerStore.getDeliverySettings();
    const result = validateDeliveryLocation(
      { latitude: lat, longitude: lng },
      radius || settings.maxRadiusKm,
      undefined,
      settings.slabs
    );

    return NextResponse.json(createSuccessResponse(result));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', errorMessage),
      { status: 500 }
    );
  }
}
