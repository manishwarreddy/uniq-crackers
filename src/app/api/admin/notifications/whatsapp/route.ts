import { NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { requireAdmin } from '@/lib/server-auth';
import { buildWhatsAppOrderMessage, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import { STORE_DEFAULTS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json();
    const {
      orderId,
      orderNumber,
      customerName,
      customerPhone,
      deliveryAddress,
      distanceKm,
      totalAmount,
      paymentMethod,
      items,
    } = body;

    const formattedMessage = buildWhatsAppOrderMessage({
      orderId: orderId || `ORD-${Date.now()}`,
      orderNumber: orderNumber || `NC-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customerName || 'Customer',
      customerPhone: customerPhone || '+91 90000 00000',
      deliveryAddress: deliveryAddress || STORE_DEFAULTS.CENTER_LOCATION.ADDRESS,
      distanceKm: distanceKm || 0,
      totalAmount: totalAmount || 0,
      paymentMethod: paymentMethod || 'COD',
      items: items || [],
    });

    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || '+919000000000';
    const whatsappUrl = getWhatsAppDirectUrl(adminPhone, formattedMessage);

    // In a production setup, Twilio / WhatsApp Business Cloud API would dispatch HTTP request here.
    // For local dev, we provide the formatted message payload & instant click link.
    console.log('[WHATSAPP DISPATCH ALERT]', formattedMessage);

    return NextResponse.json(
      createSuccessResponse({
        whatsappUrl,
        formattedMessage,
        adminPhone,
        dispatchedAt: new Date().toISOString(),
      })
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('WHATSAPP_NOTIFY_ERROR', err.message), { status: 500 });
  }
}
