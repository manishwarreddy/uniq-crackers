import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { isRazorpayConfigured } from '@/lib/payment-security';
import { getOrderAuthContext } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderNumber } = body;

    if (!orderNumber) {
      return NextResponse.json(
        createErrorResponse('MISSING_ORDER_NUMBER', 'orderNumber is required.'),
        { status: 400 }
      );
    }

    const cleanNum = String(orderNumber).trim().toUpperCase();
    const order = ServerStore.getOrderById(cleanNum);
    if (!order) {
      return NextResponse.json(
        createErrorResponse('ORDER_NOT_FOUND', `Order #${cleanNum} not found.`),
        { status: 404 }
      );
    }

    // Verify caller authorization
    const authContext = getOrderAuthContext(request, order);
    if (!authContext.isAdmin && !authContext.isCustomerOwner && !authContext.isOrderTokenHolder) {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', 'You are not authorized to initialize payment for this order.'),
        { status: 403 }
      );
    }

    const { configured, keyId } = isRazorpayConfigured();
    if (!configured || !keyId) {
      return NextResponse.json(
        createErrorResponse(
          'GATEWAY_NOT_CONFIGURED',
          'Razorpay payment gateway is awaiting merchant API credentials. Please select Instant UPI QR or Cash on Delivery.'
        ),
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const amountInPaise = Math.round(order.totalAmount * 100);

    // Call official Razorpay Orders API
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: cleanNum,
        notes: {
          orderNumber: cleanNum,
          customerPhone: order.customerPhone,
        },
      }),
    });

    if (!razorpayRes.ok) {
      const errData = await razorpayRes.json();
      return NextResponse.json(
        createErrorResponse('GATEWAY_ERROR', errData.error?.description || 'Failed to create gateway order.'),
        { status: 502 }
      );
    }

    const rzpOrder = await razorpayRes.json();

    // Link gateway order ID to internal order
    order.gatewayOrderId = rzpOrder.id;

    return NextResponse.json(
      createSuccessResponse({
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId,
        orderNumber: cleanNum,
      })
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('ORDER_CREATION_FAILED', err.message), {
      status: 500,
    });
  }
}
