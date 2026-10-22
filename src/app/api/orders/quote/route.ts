import { NextResponse } from 'next/server';
import { calculateOrderPricing, PricingValidationError } from '@/lib/pricing-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, couponCode, distanceKm } = body;

    const rawLat = body.latitude ?? body.customerCoordinates?.latitude ?? body.customerCoordinates?.lat ?? body.lat;
    const rawLng = body.longitude ?? body.customerCoordinates?.longitude ?? body.customerCoordinates?.lng ?? body.lng;

    const customerCoordinates =
      rawLat !== undefined || rawLng !== undefined
        ? { latitude: rawLat, longitude: rawLng }
        : undefined;

    const pricing = calculateOrderPricing({
      items,
      couponCode,
      distanceKm,
      customerCoordinates,
      revalidateStock: false,
    });

    return NextResponse.json({
      success: true,
      data: pricing,
    });
  } catch (err: any) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        },
        { status: err.status || 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'QUOTE_CALCULATION_ERROR',
          message: err.message || 'Failed to calculate order quote.',
        },
      },
      { status: 500 }
    );
  }
}
