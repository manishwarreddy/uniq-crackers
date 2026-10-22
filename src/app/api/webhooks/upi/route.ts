import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { verifyUpiWebhookAuth, validatePaymentDetails } from '@/lib/payment-security';

/**
 * Direct Bank UPI Webhook Endpoint
 * 
 * Secure automated verification for bank SMS forwarding and direct UPI gateway updates.
 * Requires HMAC-SHA256 signature in `x-webhook-signature` or authorized Bearer secret.
 */
export async function POST(request: Request) {
  try {
    // 1. Read raw body as text for cryptographic signature verification
    const rawBody = await request.text();

    // 2. Enforce Webhook Authentication
    const isAuthorized = verifyUpiWebhookAuth(rawBody, request.headers);
    if (!isAuthorized) {
      return NextResponse.json(
        createErrorResponse(
          'UNAUTHORIZED',
          'Webhook authentication failed. Valid signature or authorization key required.'
        ),
        { status: 401 }
      );
    }

    // 3. Parse payload after authentication
    let body: any = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(createErrorResponse('INVALID_JSON', 'Malformed JSON payload.'), {
          status: 400,
        });
      }
    } else {
      body = { message: rawBody };
    }

    let utr = body.utr ? String(body.utr).trim() : '';
    let amount = body.amount ? Number(body.amount) : null;
    let orderNumber = body.orderNumber ? String(body.orderNumber).trim().toUpperCase() : '';
    const currency = body.currency ? String(body.currency).toUpperCase() : 'INR';

    // Parse structured bank SMS if forwarded
    const rawMessage = body.message || body.body || body.text || '';
    if (rawMessage && typeof rawMessage === 'string') {
      if (!utr) {
        const utrMatch = rawMessage.match(/\b(\d{12})\b/);
        if (utrMatch) {
          utr = utrMatch[1];
        }
      }
      if (!amount) {
        const amtMatch = rawMessage.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
        if (amtMatch) {
          amount = parseFloat(amtMatch[1].replace(/,/g, ''));
        }
      }
      if (!orderNumber) {
        const orderMatch = rawMessage.match(/\b(UC-2026-\d{4})\b/i);
        if (orderMatch) {
          orderNumber = orderMatch[1].toUpperCase();
        }
      }
    }

    if (!utr && !orderNumber) {
      return NextResponse.json(
        createErrorResponse('MISSING_IDENTIFIER', '12-digit UTR or orderNumber is required.'),
        { status: 400 }
      );
    }

    const eventId = utr ? `upi-utr-${utr}` : `upi-ord-${orderNumber}-${amount}`;

    // 4. Idempotency Check: Prevent duplicate webhook processing
    if (ServerStore.isWebhookProcessed(eventId)) {
      return NextResponse.json(
        createSuccessResponse({
          status: 'ALREADY_PROCESSED',
          message: 'This UPI webhook transaction has already been processed.',
          eventId,
        })
      );
    }

    // 5. Match internal order strictly by orderNumber or customer pre-submitted UTR
    const allOrders = ServerStore.getOrders();
    const matchedOrder = allOrders.find(
      (o) =>
        (orderNumber && o.orderNumber.toUpperCase() === orderNumber) ||
        (utr && o.upiUtr === utr)
    );

    if (!matchedOrder) {
      return NextResponse.json(
        createErrorResponse(
          'ORDER_NOT_FOUND',
          `No matching order found for ${orderNumber ? `Order #${orderNumber}` : `UTR ${utr}`}.`
        ),
        { status: 404 }
      );
    }

    // 6. Verify Amount and Currency against order total
    if (amount !== null && !isNaN(amount)) {
      const validation = validatePaymentDetails(matchedOrder.totalAmount, amount, currency);
      if (!validation.isValid) {
        ServerStore.recordPaymentFailure(
          matchedOrder.orderNumber,
          validation.error || 'Amount mismatch',
          { gateway: 'UPI_WEBHOOK', transactionId: utr }
        );
        return NextResponse.json(
          createErrorResponse('AMOUNT_MISMATCH', validation.error || 'Payment amount mismatch.'),
          { status: 400 }
        );
      }
    }

    // 7. Verify and capture payment in server store
    const result = ServerStore.verifyAndCapturePayment(matchedOrder.orderNumber, {
      gateway: 'UPI_WEBHOOK',
      transactionId: utr || `MANUAL-${Date.now()}`,
      amount: amount || matchedOrder.totalAmount,
      currency,
    });

    if (!result.success) {
      return NextResponse.json(
        createErrorResponse(result.error || 'VERIFICATION_FAILED', result.message),
        { status: 400 }
      );
    }

    // 8. Record event ID to ensure strict idempotency
    ServerStore.recordProcessedWebhook(eventId);

    console.log(
      `[UPI WEBHOOK VERIFIED] Order #${matchedOrder.orderNumber} successfully captured for ₹${matchedOrder.totalAmount} (UTR: ${utr})`
    );

    return NextResponse.json(
      createSuccessResponse({
        verified: true,
        orderNumber: matchedOrder.orderNumber,
        totalAmount: matchedOrder.totalAmount,
        paymentStatus: 'PAID',
        orderStatus: result.order?.status || 'ACCEPTED',
      })
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('WEBHOOK_ERROR', err.message), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    createSuccessResponse({
      service: 'Uniq Crackers Automated UPI Verification Webhook',
      status: 'ACTIVE_SECURED',
      authentication: 'HMAC-SHA256 signature (x-webhook-signature) or Bearer token required.',
      endpoint: '/api/webhooks/upi',
    })
  );
}
