import { NextResponse } from 'next/server';
import { ServerStore, ServerOrder, AdminNotification } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import {
  requireAdmin,
  getAdminSession,
  getDeliveryAgentSession,
  getCustomerSession,
  getOrderAuthContext,
  createOrderAccessToken,
  getOrderAccessTokenFromRequest,
  sanitizeOrderForViewer,
} from '@/lib/server-auth';
import { buildWhatsAppOrderMessage, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import { OrderStatus } from '@/types';
import { syncOrderToSupabase } from '@/lib/supabase-sync';
import { calculateOrderPricing, PricingValidationError } from '@/lib/pricing-engine';
import { calculateDistanceKm, getStoreLocation, isValidCoordinate } from '@/lib/geo';
import {
  notifyCustomerOrderConfirmed,
  notifyCustomerOrderStatus,
  notifyCustomerOutForDelivery,
  notifyCustomerDeliveryCompleted,
  notifyCustomerOrderCancelled,
  notifyAdminNewOrder,
  notifyAdminOrderCancelled,
  notifyDeliveryAgentAssigned,
  notifyDeliveryAgentOrderCancelled,
} from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const orderNumber = searchParams.get('orderNumber');

    // Case 1: Specific Order by orderNumber
    if (orderNumber) {
      const cleanNum = orderNumber.trim().toUpperCase();
      const order = ServerStore.getOrderById(cleanNum);
      if (!order) {
        return NextResponse.json(createErrorResponse('NOT_FOUND', 'Order not found'), { status: 404 });
      }

      const authContext = getOrderAuthContext(request, order);

      if (authContext.isAdmin) {
        return NextResponse.json(createSuccessResponse(sanitizeOrderForViewer(order, 'ADMIN', true)));
      }

      if (authContext.isAssignedAgent) {
        return NextResponse.json(createSuccessResponse(sanitizeOrderForViewer(order, 'DELIVERY_AGENT', true)));
      }

      if (authContext.isCustomerOwner) {
        return NextResponse.json(createSuccessResponse(sanitizeOrderForViewer(order, 'CUSTOMER', true)));
      }

      if (authContext.isOrderTokenHolder) {
        return NextResponse.json(createSuccessResponse(sanitizeOrderForViewer(order, 'ORDER_HOLDER', true)));
      }

      // If user is authenticated with a non-matching identity (e.g. Customer A requesting Customer B's order, or unassigned agent)
      if (authContext.customerSession || authContext.deliveryAgent) {
        return NextResponse.json(
          createErrorResponse('FORBIDDEN', 'You are not authorized to view this order.'),
          { status: 403 }
        );
      }

      // If unauthenticated: order ID alone is not sufficient to reveal private order info
      return NextResponse.json(
        createErrorResponse(
          'UNAUTHORIZED',
          'Authentication or order verification token required to view order details.'
        ),
        { status: 401 }
      );
    }

    // Case 2: Query by phone
    if (phone) {
      const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
      if (!cleanPhone) {
        return NextResponse.json(createErrorResponse('INVALID_PHONE', 'Invalid mobile number parameter.'), {
          status: 400,
        });
      }

      const adminSession = getAdminSession(request);
      const customerSession = getCustomerSession(request);

      const isAdmin = Boolean(adminSession);
      const isVerifiedOwner = Boolean(customerSession && customerSession.phone === cleanPhone);

      // Never trust a phone number parameter supplied by the browser without server verification
      if (!isAdmin && !isVerifiedOwner) {
        return NextResponse.json(
          createErrorResponse(
            'UNAUTHORIZED',
            'Server-side identity verification required to view customer orders.'
          ),
          { status: 401 }
        );
      }

      const rawOrders = ServerStore.getOrders(cleanPhone);
      const role = isAdmin ? 'ADMIN' : 'CUSTOMER';
      const sanitized = rawOrders.map((o) => sanitizeOrderForViewer(o, role, false));
      return NextResponse.json(createSuccessResponse(sanitized));
    }

    // Case 3: List all orders across the store
    // 3a. Administrator access
    const adminSession = getAdminSession(request);
    if (adminSession) {
      const rawOrders = ServerStore.getOrders();
      const sanitized = rawOrders.map((o) => sanitizeOrderForViewer(o, 'ADMIN', false));
      return NextResponse.json(createSuccessResponse(sanitized));
    }

    // 3b. Delivery Agent access: only return orders assigned to this agent
    const agentSession = getDeliveryAgentSession(request);
    if (agentSession) {
      const rawOrders = ServerStore.getOrders();
      const myOrders = rawOrders.filter((o) => o.assignedAgentId === agentSession.agentId);
      const sanitized = myOrders.map((o) => sanitizeOrderForViewer(o, 'DELIVERY_AGENT', false));
      return NextResponse.json(createSuccessResponse(sanitized));
    }

    // 3c. Verified Customer: return only their verified orders
    const customerSession = getCustomerSession(request);
    if (customerSession && customerSession.phone) {
      const rawOrders = ServerStore.getOrders(customerSession.phone);
      const sanitized = rawOrders.map((o) => sanitizeOrderForViewer(o, 'CUSTOMER', false));
      return NextResponse.json(createSuccessResponse(sanitized));
    }

    // 3d. Deny public access by default
    return NextResponse.json(
      createErrorResponse('UNAUTHORIZED', 'Access denied. Valid credentials or session required to list orders.'),
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('SERVER_ERROR', err.message), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      deliveryAddress,
      distanceKm,
      subtotal,
      deliveryFee,
      discountAmount,
      totalAmount,
      paymentMethod,
      upiUtr,
      items,
    } = body;

    // Validate 10-digit mobile number
    const cleanPhone = (customerPhone || '').replace(/[^\d]/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        createErrorResponse(
          'INVALID_PHONE',
          'A valid 10-digit customer mobile number is required to place an order.'
        ),
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        createErrorResponse('EMPTY_CART', 'Your cart is empty.'),
        { status: 400 }
      );
    }

    // Authoritative Server-Side Geofence & Pricing Calculation (Ignores all client-submitted prices and totals)
    let customerCoords: { latitude: number; longitude: number } | undefined = undefined;
    const rawLat = body.latitude ?? body.customerCoordinates?.latitude ?? body.customerCoordinates?.lat ?? body.lat;
    const rawLng = body.longitude ?? body.customerCoordinates?.longitude ?? body.customerCoordinates?.lng ?? body.lng;

    if (rawLat !== undefined || rawLng !== undefined) {
      if (!isValidCoordinate(rawLat, rawLng)) {
        return NextResponse.json(
          createErrorResponse(
            'INVALID_COORDINATES',
            'Invalid delivery coordinates provided. Latitude must be between -90 and 90, and longitude between -180 and 180.'
          ),
          { status: 400 }
        );
      }
      customerCoords = { latitude: Number(rawLat), longitude: Number(rawLng) };
    }

    let pricing;
    try {
      pricing = calculateOrderPricing({
        items,
        couponCode: body.couponCode,
        distanceKm: distanceKm !== undefined && distanceKm !== null ? Number(distanceKm) : undefined,
        customerCoordinates: customerCoords,
        revalidateStock: true,
      });
    } catch (err: any) {
      if (err instanceof PricingValidationError) {
        return NextResponse.json(
          createErrorResponse(err.code, err.message, err.details),
          { status: err.status || 400 }
        );
      }
      return NextResponse.json(
        createErrorResponse('PRICING_CALCULATION_ERROR', err.message || 'Pricing calculation failed.'),
        { status: 500 }
      );
    }

    // Determine final verified distance
    const finalDistanceKm = customerCoords
      ? calculateDistanceKm(getStoreLocation(), customerCoords)
      : distanceKm !== undefined && distanceKm !== null
      ? Number(distanceKm)
      : 1.2;

    // Generate Order Number & 4-digit Delivery OTP
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `UC-2026-${randCode}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const orderId = `ord-${Date.now()}`;
    const now = new Date().toISOString();

    const cleanUtrNumber = upiUtr ? String(upiUtr).replace(/[^\d]/g, '').slice(0, 12) : undefined;
    const finalPaymentMethod = paymentMethod || 'COD';

    // Verify merchant UPI configuration if customer selected UPI_QR
    if (finalPaymentMethod === 'UPI_QR') {
      let activeUpiId: string | null = null;
      if (process.env.MERCHANT_UPI_ID !== undefined) {
        const trimmed = process.env.MERCHANT_UPI_ID.trim();
        activeUpiId = trimmed.length > 0 ? trimmed : null;
      } else if (process.env.NEXT_PUBLIC_MERCHANT_UPI_ID !== undefined) {
        const trimmed = process.env.NEXT_PUBLIC_MERCHANT_UPI_ID.trim();
        activeUpiId = trimmed.length > 0 ? trimmed : null;
      } else {
        activeUpiId = 'tejareddysheri72-3@okaxis';
      }

      if (!activeUpiId) {
        return NextResponse.json(
          createErrorResponse(
            'UPI_NOT_CONFIGURED',
            'Prepaid UPI payment is currently not configured on this store. Please select Cash on Delivery (COD).'
          ),
          { status: 400 }
        );
      }
    }

    const finalPaymentStatus =
      finalPaymentMethod === 'UPI_QR'
        ? 'AWAITING_VERIFICATION'
        : finalPaymentMethod === 'COD'
        ? 'PENDING_COD'
        : 'PENDING_ONLINE';

    // Issue cryptographic order access token for the customer placing this order
    const orderAccessToken = createOrderAccessToken(orderNumber, orderId, cleanPhone);

    const newOrder: ServerOrder = {
      id: orderId,
      orderNumber,
      customerName: customerName?.trim() || 'Valued Customer',
      customerPhone: `+91 ${cleanPhone}`,
      deliveryAddress: deliveryAddress || 'Velmala, Hyderabad 502300',
      distanceKm: finalDistanceKm,
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      status: 'PENDING_REVIEW',
      statusHistory: [
        {
          status: 'PENDING_REVIEW',
          note: 'Order placed by customer and entered pending review state',
          changedBy: 'CUSTOMER',
          timestamp: now,
        },
      ],
      deliveryOtp,
      orderAccessToken,
      upiUtr: cleanUtrNumber,
      items: pricing.items,
      createdAt: now,
      updatedAt: now,
    };

    // Validate & atomically reserve stock for the verified items (prevents overselling)
    const stockReservation = ServerStore.reserveStockForOrder(pricing.items);
    if (!stockReservation.success) {
      return NextResponse.json(
        createErrorResponse('INSUFFICIENT_STOCK', stockReservation.message),
        { status: 409 }
      );
    }

    // Save order in store
    ServerStore.createOrder(newOrder);

    // Prepare WhatsApp Message & URL for Admin notification
    const settings = ServerStore.getDeliverySettings();
    const adminPhone =
      settings.adminWhatsAppNumber ||
      process.env.ADMIN_WHATSAPP_PHONE ||
      process.env.ADMIN_PHONE ||
      '9000000000';

    const formattedMessage = buildWhatsAppOrderMessage({
      orderId,
      orderNumber,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      deliveryAddress: newOrder.deliveryAddress,
      distanceKm: newOrder.distanceKm,
      totalAmount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
      deliveryOtp: newOrder.deliveryOtp,
      upiUtr: newOrder.upiUtr,
      items: items.map((i: any) => ({
        name: i.name,
        variantName: i.variantName || i.boxQuantity,
        quantity: i.quantity,
        price: i.price,
      })),
      storePhone: adminPhone,
    });

    const whatsappUrl = getWhatsAppDirectUrl(adminPhone, formattedMessage);

    // Create Admin Notification in system
    const notif: AdminNotification = {
      id: `notif-${Date.now()}`,
      orderId,
      orderNumber,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      totalAmount: newOrder.totalAmount,
      itemsCount: items.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0),
      deliveryAddress: newOrder.deliveryAddress,
      distanceKm: newOrder.distanceKm,
      paymentMethod:
        finalPaymentMethod === 'UPI_QR' && cleanUtrNumber
          ? `UPI (UTR: ${cleanUtrNumber})`
          : finalPaymentMethod,
      upiUtr: cleanUtrNumber,
      timestamp: now,
      isRead: false,
      whatsappUrl,
      formattedMessage,
    };

    ServerStore.addNotification(notif);

    // Trigger customer confirmation (SMS/logged) and admin WhatsApp notification
    notifyCustomerOrderConfirmed(newOrder).catch(() => {});
    notifyAdminNewOrder(newOrder).catch(() => {});

    // Sanitize order for the customer who just placed it
    const sanitizedOrder = sanitizeOrderForViewer(newOrder, 'ORDER_HOLDER', true);

    const response = NextResponse.json(
      createSuccessResponse({
        order: sanitizedOrder,
        orderAccessToken,
        notification: notif,
        whatsappUrl,
        adminPhone: `+91 ${adminPhone}`,
        formattedMessage,
        pricing: {
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          deliveryFee: pricing.deliveryFee,
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.totalAmount,
          appliedCoupon: pricing.appliedCoupon,
        },
      })
    );

    // Set order access token cookie for this order
    const isProd = process.env.NODE_ENV === 'production';
    const cleanOrderNum = orderNumber.replace(/[^\w]/g, '_');
    response.cookies.set(`order_token_${cleanOrderNum}`, orderAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 3600, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('ORDER_CREATE_ERROR', err.message), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      orderNumber,
      status,
      rejectionReason,
      rejectionNote,
      action,
      upiUtr,
      inputOtp,
      agentId,
      agentName,
      agentPhone,
    } = body;

    if (!orderNumber) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', 'orderNumber is required.'),
        { status: 400 }
      );
    }

    const cleanNum = String(orderNumber).trim().toUpperCase();

    // 1. Delivery OTP Verification Action Gate
    if (action === 'VERIFY_DELIVERY') {
      const adminSession = getAdminSession(request);
      const agentSession = getDeliveryAgentSession(request);

      if (!adminSession && !agentSession) {
        return NextResponse.json(
          createErrorResponse(
            'UNAUTHORIZED',
            'Delivery agent or administrator authentication required to verify delivery.'
          ),
          { status: 401 }
        );
      }

      if (!inputOtp) {
        return NextResponse.json(
          createErrorResponse('MISSING_FIELDS', 'Delivery OTP is required.'),
          { status: 400 }
        );
      }

      const order = ServerStore.getOrderById(cleanNum);
      if (!order) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', `Order #${cleanNum} not found.`),
          { status: 404 }
        );
      }

      // If delivery agent, verify order is assigned to them
      if (agentSession && (!order.assignedAgentId || order.assignedAgentId !== agentSession.agentId)) {
        return NextResponse.json(
          createErrorResponse('FORBIDDEN', 'This order is not assigned to your delivery account.'),
          { status: 403 }
        );
      }

      const result = ServerStore.verifyDeliveryOtp(cleanNum, inputOtp, agentSession?.agentId);
      if (!result.success) {
        const statusCode = result.error === 'MAX_ATTEMPTS_EXCEEDED' ? 429 : 400;
        return NextResponse.json(
          createErrorResponse(result.error || 'INVALID_OTP', result.message),
          { status: statusCode }
        );
      }

      if (result.order) {
        notifyCustomerDeliveryCompleted(result.order).catch(() => {});
      }

      const sanitized = sanitizeOrderForViewer(
        result.order,
        adminSession ? 'ADMIN' : 'DELIVERY_AGENT',
        true
      );
      return NextResponse.json(createSuccessResponse({ order: sanitized, message: result.message }));
    }

    // 2. Customer Order Cancellation Action Gate
    if (action === 'CANCEL_ORDER') {
      const adminSession = getAdminSession(request);
      const customerSession = getCustomerSession(request);
      const orderToken = getOrderAccessTokenFromRequest(request, cleanNum);

      if (!adminSession && !customerSession && !orderToken) {
        return NextResponse.json(
          createErrorResponse('UNAUTHORIZED', 'Authentication or order token required to cancel this order.'),
          { status: 401 }
        );
      }

      const order = ServerStore.getOrderById(cleanNum);
      if (!order) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', `Order #${cleanNum} not found.`),
          { status: 404 }
        );
      }

      const authContext = getOrderAuthContext(request, order);
      if (!authContext.isAdmin && !authContext.isCustomerOwner && !authContext.isOrderTokenHolder) {
        return NextResponse.json(
          createErrorResponse('FORBIDDEN', 'You are not authorized to cancel this customer order.'),
          { status: 403 }
        );
      }

      if (!authContext.canCancel) {
        return NextResponse.json(
          createErrorResponse(
            'CANNOT_CANCEL',
            `Order in status "${order.status}" cannot be cancelled. Only pending orders can be cancelled.`
          ),
          { status: 400 }
        );
      }

      // Update order status (automatically & idempotently restores reserved stock)
      const cancelResult = ServerStore.updateOrderStatus(cleanNum, 'CANCELLED', {
        changedBy: 'CUSTOMER',
        note: 'Order cancelled by customer',
      });
      const cancelledOrder = cancelResult.order || order;
      notifyCustomerOrderCancelled(cancelledOrder, 'Cancelled by customer').catch(() => {});
      notifyAdminOrderCancelled(cancelledOrder, 'Customer', 'Cancelled by customer').catch(() => {});
      if (order.assignedAgentPhone) {
        notifyDeliveryAgentOrderCancelled(cancelledOrder, order.assignedAgentPhone).catch(() => {});
      }

      const sanitized = sanitizeOrderForViewer(cancelledOrder, authContext.viewerRole, true);
      return NextResponse.json(
        createSuccessResponse({ order: sanitized, message: 'Order has been cancelled successfully.' })
      );
    }

    // 3. Delivery Agent / Admin: Start Delivery Action Gate
    if (action === 'START_DELIVERY' || status === 'OUT_FOR_DELIVERY') {
      const adminSession = getAdminSession(request);
      const agentSession = getDeliveryAgentSession(request);

      if (!adminSession && !agentSession) {
        return NextResponse.json(
          createErrorResponse('UNAUTHORIZED', 'Administrator or assigned Delivery Agent authorization required.'),
          { status: 401 }
        );
      }

      const order = ServerStore.getOrderById(cleanNum);
      if (!order) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', `Order #${cleanNum} not found.`),
          { status: 404 }
        );
      }

      if (agentSession && (!order.assignedAgentId || order.assignedAgentId !== agentSession.agentId)) {
        return NextResponse.json(
          createErrorResponse('FORBIDDEN', 'This order is not assigned to your delivery account.'),
          { status: 403 }
        );
      }

      const result = ServerStore.updateOrderStatus(cleanNum, 'OUT_FOR_DELIVERY', {
        changedBy: agentSession ? `Delivery Agent (${agentSession.name})` : 'Store Administrator',
        note: 'Order picked up and out for delivery.',
      });

      if (!result.success) {
        return NextResponse.json(
          createErrorResponse(result.error || 'INVALID_STATUS_TRANSITION', result.message),
          { status: 400 }
        );
      }

      if (result.order) {
        notifyCustomerOutForDelivery(result.order).catch(() => {});
      }

      const sanitized = sanitizeOrderForViewer(
        result.order || order,
        adminSession ? 'ADMIN' : 'DELIVERY_AGENT',
        true
      );
      return NextResponse.json(createSuccessResponse(sanitized, { message: result.message }));
    }

    // 4. All Other Actions (ASSIGN_AGENT, VERIFY_UPI, VERIFY_PAYMENT, ACCEPT_ORDER, REJECT_ORDER, etc.) require Administrator authorization
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) return errorResponse;

    const order = ServerStore.getOrderById(cleanNum);
    if (!order) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', `Order #${cleanNum} not found.`),
        { status: 404 }
      );
    }

    // Action 3: Assign Delivery Agent (Admin only)
    if (action === 'ASSIGN_AGENT') {
      if (!agentId || !agentName) {
        return NextResponse.json(
          createErrorResponse('MISSING_FIELDS', 'agentId and agentName are required to assign delivery agent.'),
          { status: 400 }
        );
      }

      if (['CANCELLED', 'REJECTED', 'DELIVERED'].includes(order.status)) {
        return NextResponse.json(
          createErrorResponse(
            'INVALID_ORDER_STATUS',
            `Cannot assign delivery agent to order with status ${order.status}.`
          ),
          { status: 400 }
        );
      }

      const updated = ServerStore.assignDeliveryAgent(cleanNum, agentId, agentName, agentPhone);
      if (!updated) {
        return NextResponse.json(
          createErrorResponse('ASSIGNMENT_FAILED', `Could not assign agent to order #${cleanNum}.`),
          { status: 400 }
        );
      }

      if (agentPhone) {
        notifyDeliveryAgentAssigned(updated, agentPhone, agentName).catch(() => {});
      }

      return NextResponse.json(createSuccessResponse(sanitizeOrderForViewer(updated, 'ADMIN', true)));
    }

    // Action 4: Approve / Verify Payment (Admin only)
    if (action === 'VERIFY_UPI' || action === 'VERIFY_PAYMENT' || action === 'APPROVE_PAYMENT') {
      const updated = ServerStore.updatePaymentStatus(cleanNum, 'PAID', upiUtr, true);
      if (updated) {
        updated.paymentVerifiedAt = new Date().toISOString();
        syncOrderToSupabase(updated).catch(() => {});
      }
      return NextResponse.json(createSuccessResponse(sanitizeOrderForViewer(updated, 'ADMIN', true)));
    }

    // Action 4b: Reject Payment (Admin only)
    if (action === 'REJECT_PAYMENT') {
      const adminSession = getAdminSession(request);
      const adminIdentity = adminSession?.userId ? `ADMIN (${adminSession.userId})` : 'Store Administrator';
      const effectiveReason =
        rejectionReason && typeof rejectionReason === 'string' && rejectionReason.trim().length > 0
          ? rejectionReason.trim()
          : 'UPI payment credit not received in bank account';

      const result = ServerStore.updateOrderStatus(cleanNum, 'REJECTED', {
        rejectionReason: effectiveReason,
        rejectionNote: rejectionNote ? String(rejectionNote).trim() : 'Payment rejected by administrator after checking receiving bank records.',
        reviewedBy: adminIdentity,
      });

      if (!result.success) {
        return NextResponse.json(
          createErrorResponse(result.error || 'REJECTION_FAILED', result.message),
          { status: 400 }
        );
      }

      if (result.order) {
        result.order.paymentStatus = 'PAYMENT_FAILED';
        result.order.paymentRejectionReason = effectiveReason;
        syncOrderToSupabase(result.order).catch(() => {});
        notifyCustomerOrderStatus(result.order, 'REJECTED', effectiveReason).catch(() => {});
      }

      return NextResponse.json(
        createSuccessResponse(sanitizeOrderForViewer(result.order, 'ADMIN', true), {
          message: 'Payment rejected. Order has been marked rejected and inventory stock restored.',
        })
      );
    }

    // Action 5: Accept / Reject / Change status (Admin only)
    let targetStatus: OrderStatus = status;
    if (action === 'ACCEPT_ORDER') targetStatus = 'ACCEPTED';
    if (action === 'REJECT_ORDER') targetStatus = 'REJECTED';
    if ((targetStatus as string) === 'READY_FOR_DISPATCH') targetStatus = 'READY_FOR_DELIVERY';

    if (!targetStatus) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', 'status or action is required.'),
        { status: 400 }
      );
    }

    // Rejection strictly requires a meaningful reason
    if (targetStatus === 'REJECTED' || action === 'REJECT_ORDER') {
      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
        return NextResponse.json(
          createErrorResponse('MISSING_REJECTION_REASON', 'A rejection reason is strictly required to reject an order.'),
          { status: 400 }
        );
      }
    }

    const adminSession = getAdminSession(request);
    const adminIdentity = adminSession?.userId ? `ADMIN (${adminSession.userId})` : 'Store Administrator';

    // Perform state transition with validation, stock restoration, refund state, and audit history
    const result = ServerStore.updateOrderStatus(cleanNum, targetStatus, {
      rejectionReason: rejectionReason ? String(rejectionReason).trim() : undefined,
      rejectionNote: rejectionNote ? String(rejectionNote).trim() : undefined,
      reviewedBy: adminIdentity,
    });

    if (!result.success) {
      const statusCode = result.error === 'ORDER_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        createErrorResponse(result.error || 'INVALID_STATE_TRANSITION', result.message),
        { status: statusCode }
      );
    }

    // Idempotency: if not duplicate request, trigger relevant status notifications
    if (!result.isDuplicate && result.order) {
      if (targetStatus === 'ACCEPTED' || targetStatus === 'REJECTED') {
        notifyCustomerOrderStatus(result.order, targetStatus, rejectionReason).catch(() => {});
      } else if (targetStatus === 'OUT_FOR_DELIVERY') {
        notifyCustomerOutForDelivery(result.order).catch(() => {});
      } else if (targetStatus === 'DELIVERED') {
        notifyCustomerDeliveryCompleted(result.order).catch(() => {});
      } else if (targetStatus === 'CANCELLED') {
        notifyCustomerOrderCancelled(result.order, rejectionReason).catch(() => {});
        notifyAdminOrderCancelled(result.order, adminIdentity, rejectionReason).catch(() => {});
        if (result.order.assignedAgentPhone) {
          notifyDeliveryAgentOrderCancelled(result.order, result.order.assignedAgentPhone).catch(() => {});
        }
      }
    }

    return NextResponse.json(
      createSuccessResponse(
        sanitizeOrderForViewer(result.order, 'ADMIN', true),
        { message: result.message }
      )
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('ORDER_UPDATE_ERROR', err.message), { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(request: Request) {
  try {
    const { session, errorResponse } = requireAdmin(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const isAll = searchParams.get('all') === 'true' || searchParams.get('deleteAll') === 'true';
    let orderNumber = searchParams.get('orderNumber');
    let permanent = searchParams.get('permanent') === 'true';
    let reason = searchParams.get('reason') || undefined;
    const filter = (searchParams.get('filter') as 'ALL' | 'COMPLETED_OR_CANCELLED' | 'OLD_ONLY') || undefined;
    const olderThanDays = searchParams.get('olderThanDays') ? Number(searchParams.get('olderThanDays')) : undefined;

    let body: any = {};
    if (!isAll && !orderNumber) {
      body = await request.json().catch(() => ({}));
      if (!body.all && !body.deleteAll) {
        orderNumber = body.orderNumber;
      }
      if (body.permanent !== undefined) permanent = Boolean(body.permanent);
      if (body.reason) reason = body.reason;
    }

    const adminIdentity = session?.userId ? `ADMIN (${session.userId})` : 'Store Administrator';

    // Bulk deletion branch
    if (isAll || body.all || body.deleteAll || orderNumber === 'ALL') {
      const result = ServerStore.deleteAllOrders({
        deletedBy: adminIdentity,
        reason: reason || body.reason,
        permanent: permanent || body.permanent !== false,
        filter: filter || body.filter || 'ALL',
        olderThanDays: olderThanDays ?? body.olderThanDays,
        restoreStock: body.restoreStock ?? true,
      });

      return NextResponse.json(
        createSuccessResponse({
          all: true,
          deletedCount: result.deletedCount,
          message: result.message,
        })
      );
    }

    if (!orderNumber || typeof orderNumber !== 'string') {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', 'orderNumber or all=true is required to delete an order.'),
        { status: 400 }
      );
    }

    const cleanNum = orderNumber.trim().toUpperCase();

    const result = ServerStore.deleteOrder(cleanNum, {
      deletedBy: adminIdentity,
      reason,
      permanent,
    });

    if (!result.success) {
      const statusCode = (result.error === 'ORDER_NOT_FOUND' || result.error === 'ALREADY_DELETED') ? 404 : 400;
      return NextResponse.json(
        createErrorResponse(result.error || 'DELETE_FAILED', result.message),
        { status: statusCode }
      );
    }

    return NextResponse.json(
      createSuccessResponse({
        orderNumber: cleanNum,
        deleted: true,
        message: result.message,
      })
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('ORDER_DELETE_ERROR', err.message), { status: 500 });
  }
}

