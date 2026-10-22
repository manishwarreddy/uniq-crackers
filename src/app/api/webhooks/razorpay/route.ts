import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { verifyRazorpayWebhookSignature, validatePaymentDetails } from '@/lib/payment-security';

/**
 * Official Razorpay Webhook Handler
 * 
 * Cryptographically verifies incoming signatures in `X-Razorpay-Signature` using
 * the server-side `RAZORPAY_WEBHOOK_SECRET` on the unparsed raw request body.
 * Guarantees idempotent event processing, amount/currency matching, and safe state transitions.
 */
export async function POST(request: Request) {
  try {
    // 1. Read raw body text for signature calculation
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // 2. Cryptographic Signature Verification
    const isValidSignature = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      return NextResponse.json(
        createErrorResponse('INVALID_SIGNATURE', 'Invalid Razorpay webhook signature.'),
        { status: 400 }
      );
    }

    // 3. Parse JSON payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(createErrorResponse('INVALID_JSON', 'Malformed webhook JSON payload.'), {
        status: 400,
      });
    }

    const eventType = event.event;
    const eventId = event.event_id || `${eventType}-${event.payload?.payment?.entity?.id || Date.now()}`;

    // 4. Idempotency Check: Prevent duplicate webhook processing
    if (ServerStore.isWebhookProcessed(eventId)) {
      return NextResponse.json(
        createSuccessResponse({
          status: 'ALREADY_PROCESSED',
          message: 'Razorpay webhook event has already been processed.',
          eventId,
        })
      );
    }

    const paymentEntity = event.payload?.payment?.entity;
    const refundEntity = event.payload?.refund?.entity;

    // Identify target order
    const orderNumber =
      paymentEntity?.notes?.orderNumber ||
      refundEntity?.notes?.orderNumber ||
      paymentEntity?.notes?.order_number;

    const gatewayOrderId = paymentEntity?.order_id;

    const allOrders = ServerStore.getOrders();
    const matchedOrder = allOrders.find(
      (o) =>
        (orderNumber && o.orderNumber.toUpperCase() === String(orderNumber).trim().toUpperCase()) ||
        (gatewayOrderId && o.gatewayOrderId === gatewayOrderId)
    );

    if (!matchedOrder) {
      // Record event as processed so orphaned events do not cause retries
      ServerStore.recordProcessedWebhook(eventId);
      return NextResponse.json(
        createErrorResponse('ORDER_NOT_FOUND', `No internal order matching Razorpay event ${eventId}.`),
        { status: 404 }
      );
    }

    // 5. Handle Payment Captured / Order Paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const amountInRupees = Number(paymentEntity.amount) / 100;
      const currency = paymentEntity.currency || 'INR';

      // Strict amount and currency validation
      const validation = validatePaymentDetails(matchedOrder.totalAmount, amountInRupees, currency);
      if (!validation.isValid) {
        ServerStore.recordPaymentFailure(
          matchedOrder.orderNumber,
          validation.error || 'Amount mismatch',
          { gateway: 'RAZORPAY', transactionId: paymentEntity.id, status: 'AMOUNT_MISMATCH' }
        );
        ServerStore.recordProcessedWebhook(eventId);
        return NextResponse.json(
          createErrorResponse('AMOUNT_MISMATCH', validation.error || 'Payment amount mismatch.'),
          { status: 400 }
        );
      }

      // Verify and capture payment
      const captureResult = ServerStore.verifyAndCapturePayment(matchedOrder.orderNumber, {
        gateway: 'RAZORPAY',
        transactionId: paymentEntity.id,
        gatewayOrderId: paymentEntity.order_id,
        amount: amountInRupees,
        currency,
        rawWebhookData: { eventId, method: paymentEntity.method },
      });

      ServerStore.recordProcessedWebhook(eventId);
      return NextResponse.json(
        createSuccessResponse({
          verified: true,
          orderNumber: matchedOrder.orderNumber,
          paymentStatus: 'PAID',
          transactionId: paymentEntity.id,
        })
      );
    }

    // 6. Handle Payment Failed
    if (eventType === 'payment.failed') {
      const failureReason =
        paymentEntity?.error_description ||
        paymentEntity?.error_reason ||
        'Payment failed on gateway.';
      ServerStore.recordPaymentFailure(matchedOrder.orderNumber, failureReason, {
        gateway: 'RAZORPAY',
        transactionId: paymentEntity?.id,
      });
      ServerStore.recordProcessedWebhook(eventId);
      return NextResponse.json(
        createSuccessResponse({
          status: 'PAYMENT_FAILED_RECORDED',
          orderNumber: matchedOrder.orderNumber,
          reason: failureReason,
        })
      );
    }

    // 7. Handle Refund Processed
    if (eventType === 'refund.processed') {
      const refundAmountInRupees = Number(refundEntity?.amount || 0) / 100;
      ServerStore.recordPaymentRefund(matchedOrder.orderNumber, refundAmountInRupees, refundEntity?.id || 'N/A');
      ServerStore.recordProcessedWebhook(eventId);
      return NextResponse.json(
        createSuccessResponse({
          status: 'REFUND_RECORDED',
          orderNumber: matchedOrder.orderNumber,
          refundAmount: refundAmountInRupees,
        })
      );
    }

    // Mark event processed for any other Razorpay event types
    ServerStore.recordProcessedWebhook(eventId);
    return NextResponse.json(createSuccessResponse({ status: 'EVENT_ACKNOWLEDGED', eventType }));
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('WEBHOOK_PROCESSING_ERROR', err.message), {
      status: 500,
    });
  }
}

export async function GET() {
  return NextResponse.json(
    createSuccessResponse({
      service: 'Uniq Crackers Razorpay Gateway Webhook Endpoint',
      status: 'ACTIVE_SECURED',
      signatureHeader: 'X-Razorpay-Signature',
      endpoint: '/api/webhooks/razorpay',
    })
  );
}
