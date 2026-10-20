import { NextResponse } from 'next/server';
import { ServerStore, ServerOrder, AdminNotification } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { buildWhatsAppOrderMessage, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import { OrderStatus } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const orderNumber = searchParams.get('orderNumber');

    if (orderNumber) {
      const order = ServerStore.getOrderById(orderNumber);
      if (!order) {
        return NextResponse.json(createErrorResponse('NOT_FOUND', 'Order not found'), { status: 404 });
      }
      return NextResponse.json(createSuccessResponse(order));
    }

    const orders = ServerStore.getOrders(phone || undefined);
    return NextResponse.json(createSuccessResponse(orders));
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
      items,
      notes,
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

    // Generate Order Number & 4-digit Delivery OTP
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `NC-2026-${randCode}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const orderId = `ord-${Date.now()}`;
    const now = new Date().toISOString();

    const newOrder: ServerOrder = {
      id: orderId,
      orderNumber,
      customerName: customerName?.trim() || 'Valued Customer',
      customerPhone: `+91 ${cleanPhone}`,
      deliveryAddress: deliveryAddress || 'Velmala, Hyderabad 502300',
      distanceKm: Number(distanceKm || 1.2),
      subtotal: Number(subtotal || totalAmount),
      deliveryFee: Number(deliveryFee || 0),
      discountAmount: Number(discountAmount || 0),
      totalAmount: Number(totalAmount),
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'CAPTURED',
      status: 'CONFIRMED',
      deliveryOtp,
      items,
      createdAt: now,
      updatedAt: now,
    };

    // Save order in store
    ServerStore.createOrder(newOrder);

    // Prepare WhatsApp Message & URL for Admin notification
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || '+919000000000';
    const formattedMessage = buildWhatsAppOrderMessage({
      orderId,
      orderNumber,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      deliveryAddress: newOrder.deliveryAddress,
      distanceKm: newOrder.distanceKm,
      totalAmount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
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
      paymentMethod: newOrder.paymentMethod,
      timestamp: now,
      isRead: false,
      whatsappUrl,
      formattedMessage,
    };

    ServerStore.addNotification(notif);

    console.log(`[ORDER CREATED] #${orderNumber} | Total: ₹${totalAmount} | Admin notified via WhatsApp & Portal`);

    return NextResponse.json(
      createSuccessResponse({
        order: newOrder,
        notification: notif,
        whatsappUrl,
        formattedMessage,
      })
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('ORDER_CREATE_ERROR', err.message), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderNumber, status } = body;

    if (!orderNumber || !status) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', 'orderNumber and status are required.'),
        { status: 400 }
      );
    }

    const updated = ServerStore.updateOrderStatus(orderNumber, status as OrderStatus);
    if (!updated) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', `Order #${orderNumber} not found.`),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(updated));
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('ORDER_UPDATE_ERROR', err.message), { status: 500 });
  }
}
