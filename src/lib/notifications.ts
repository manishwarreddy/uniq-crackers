import { ServerOrder, ServerStore } from '@/lib/server-store';
import { dispatchWhatsAppApiMessage, getWhatsAppDirectUrl } from '@/lib/whatsapp';

export interface WhatsAppDispatchResult {
  automatedDelivery: {
    attempted: boolean;
    configured: boolean;
    success: boolean;
    error?: string;
  };
  shareLink: string;
}

export interface CustomerNotificationResult {
  success: boolean;
  channel: 'sms' | 'logged';
  message: string;
  idempotentSkip?: boolean;
}

/**
 * Helper to dispatch WhatsApp message to Admin or Delivery Agent.
 * Distinguishes an automated WhatsApp delivery (Meta WhatsApp Cloud API)
 * from a manual click-to-chat WhatsApp share link (https://wa.me/...).
 * Does NOT fake delivery success if automated credentials are not configured.
 */
export async function dispatchWhatsAppWithFallback(
  targetPhone: string,
  messageText: string
): Promise<WhatsAppDispatchResult> {
  const shareLink = getWhatsAppDirectUrl(targetPhone, messageText);
  const hasCredentials = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );

  if (!hasCredentials) {
    return {
      automatedDelivery: {
        attempted: false,
        configured: false,
        success: false,
        error: 'Meta WhatsApp Cloud API credentials (WHATSAPP_ACCESS_TOKEN) not configured. Share link generated.',
      },
      shareLink,
    };
  }

  try {
    const apiResult = await dispatchWhatsAppApiMessage(targetPhone, messageText);
    return {
      automatedDelivery: {
        attempted: true,
        configured: true,
        success: apiResult.success,
        error: apiResult.error,
      },
      shareLink,
    };
  } catch (err: any) {
    return {
      automatedDelivery: {
        attempted: true,
        configured: true,
        success: false,
        error: err.message || 'Error executing WhatsApp API dispatch',
      },
      shareLink,
    };
  }
}

/* =========================================================================
 * 1. CUSTOMER NOTIFICATIONS
 * Customer notifications are sent via SMS / in-app log notices.
 * PER REQUIREMENT 13: WhatsApp notifications should go ONLY to the admin and
 * assigned delivery agents, NOT customers, unless explicitly instructed.
 * ========================================================================= */

async function sendCustomerSmsNotice(
  phone: string,
  customerName: string,
  orderNumber: string,
  messageText: string
): Promise<CustomerNotificationResult> {
  const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
  const smsApiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;

  if (smsApiKey) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: smsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: messageText,
          language: 'english',
          flash: 0,
          numbers: cleanPhone,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.return) {
        return { success: true, channel: 'sms', message: messageText };
      }
    } catch {
      // Fallback to logged notice
    }
  }

  // Safe development & store audit transactional log notice
  console.log(
    `\n📢 [CUSTOMER NOTIFICATION via SMS/LOG]\n` +
      `To: +91 ${cleanPhone} (${customerName})\n` +
      `Order: #${orderNumber}\n` +
      `Message: ${messageText}\n`
  );

  return { success: true, channel: 'logged', message: messageText };
}

/**
 * Customer: Order confirmation notification
 */
export async function notifyCustomerOrderConfirmed(
  order: ServerOrder
): Promise<CustomerNotificationResult> {
  const key = `notif:${order.orderNumber}:customer_confirmed`;
  if (ServerStore.hasNotificationBeenSent(key)) {
    return { success: true, channel: 'logged', message: '', idempotentSkip: true };
  }

  const messageText = `🎉 Uniq Crackers: Order #${order.orderNumber} placed successfully! Total: ₹${order.totalAmount}. Track status at /track-order?order=${order.orderNumber}`;
  const res = await sendCustomerSmsNotice(
    order.customerPhone,
    order.customerName,
    order.orderNumber,
    messageText
  );
  ServerStore.recordNotificationSent(key);
  return res;
}

/**
 * Customer: Order status change notification (Accepted, Rejected, etc.)
 */
export async function notifyCustomerOrderStatus(
  order: ServerOrder,
  newStatus: string,
  reason?: string
): Promise<CustomerNotificationResult> {
  const key = `notif:${order.orderNumber}:customer_status_${newStatus}`;
  if (ServerStore.hasNotificationBeenSent(key)) {
    return { success: true, channel: 'logged', message: '', idempotentSkip: true };
  }

  let messageText = '';
  if (newStatus === 'ACCEPTED') {
    messageText = `🎉 Great news! Your Uniq Crackers order #${order.orderNumber} has been accepted and is being prepared for dispatch. Total: ₹${order.totalAmount}. Track at /track-order?order=${order.orderNumber}`;
  } else if (newStatus === 'REJECTED') {
    messageText = `Notice: Your Uniq Crackers order #${order.orderNumber} could not be accepted. Reason: ${reason || 'Store review criteria'}.${
      order.paymentStatus === 'REFUND_PENDING'
        ? ' Your refund has been marked as pending and will be processed back to your original payment method.'
        : ''
    }`;
  } else {
    messageText = `Uniq Crackers Order #${order.orderNumber} status update: ${newStatus}.`;
  }

  const res = await sendCustomerSmsNotice(
    order.customerPhone,
    order.customerName,
    order.orderNumber,
    messageText
  );
  ServerStore.recordNotificationSent(key);
  return res;
}

/**
 * Customer: Out for delivery notification
 */
export async function notifyCustomerOutForDelivery(
  order: ServerOrder
): Promise<CustomerNotificationResult> {
  const key = `notif:${order.orderNumber}:customer_out_for_delivery`;
  if (ServerStore.hasNotificationBeenSent(key)) {
    return { success: true, channel: 'logged', message: '', idempotentSkip: true };
  }

  const messageText = `🛵 Uniq Crackers: Your order #${order.orderNumber} is OUT FOR DELIVERY! Our rider is en route to ${order.deliveryAddress}. Keep your verification OTP handy upon doorstep arrival.`;
  const res = await sendCustomerSmsNotice(
    order.customerPhone,
    order.customerName,
    order.orderNumber,
    messageText
  );
  ServerStore.recordNotificationSent(key);
  return res;
}

/**
 * Customer: Delivery completion notification
 */
export async function notifyCustomerDeliveryCompleted(
  order: ServerOrder
): Promise<CustomerNotificationResult> {
  const key = `notif:${order.orderNumber}:customer_delivered`;
  if (ServerStore.hasNotificationBeenSent(key)) {
    return { success: true, channel: 'logged', message: '', idempotentSkip: true };
  }

  const messageText = `✨ Uniq Crackers: Order #${order.orderNumber} has been successfully delivered! Have a joyful and safe Diwali celebration with your green crackers!`;
  const res = await sendCustomerSmsNotice(
    order.customerPhone,
    order.customerName,
    order.orderNumber,
    messageText
  );
  ServerStore.recordNotificationSent(key);
  return res;
}

/**
 * Customer: Order cancellation notification
 */
export async function notifyCustomerOrderCancelled(
  order: ServerOrder,
  reason?: string
): Promise<CustomerNotificationResult> {
  const key = `notif:${order.orderNumber}:customer_cancelled`;
  if (ServerStore.hasNotificationBeenSent(key)) {
    return { success: true, channel: 'logged', message: '', idempotentSkip: true };
  }

  const messageText = `Uniq Crackers: Your order #${order.orderNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`;
  const res = await sendCustomerSmsNotice(
    order.customerPhone,
    order.customerName,
    order.orderNumber,
    messageText
  );
  ServerStore.recordNotificationSent(key);
  return res;
}

/* =========================================================================
 * 2. ADMIN NOTIFICATIONS (WhatsApp + In-Store Dashboard)
 * ========================================================================= */

function getAdminWhatsAppNumber(): string {
  const settings = ServerStore.getDeliverySettings();
  return (
    process.env.ADMIN_WHATSAPP_PHONE ||
    process.env.ADMIN_PHONE ||
    settings.adminWhatsAppNumber ||
    '9000000000'
  );
}

/**
 * Admin: New order notification
 */
export async function notifyAdminNewOrder(
  order: ServerOrder
): Promise<WhatsAppDispatchResult & { idempotentSkip?: boolean }> {
  const key = `notif:${order.orderNumber}:admin_new_order`;
  const adminPhone = getAdminWhatsAppNumber();

  const itemList = (order.items || [])
    .map((i) => `• ${i.name} (${i.variantName}) x${i.quantity} = ₹${i.price * i.quantity}`)
    .join('\n');

  const messageText =
    `🚨 *NEW ORDER RECEIVED - UNIQ CRACKERS VELMALA HUB* 🚨\n\n` +
    `*Order ID:* #${order.orderNumber}\n` +
    `*Customer:* ${order.customerName}\n` +
    `*Customer Mobile:* ${order.customerPhone}\n\n` +
    `📍 *Delivery Address:* ${order.deliveryAddress}\n` +
    `📏 *Distance:* ${(order.distanceKm || 0).toFixed(1)} KM\n\n` +
    `🛒 *Items Ordered:*\n${itemList}\n\n` +
    `💰 *Total Bill:* ₹${order.totalAmount}\n` +
    `💳 *Payment:* ${order.paymentMethod}` +
    (order.upiUtr ? ` (UTR: ${order.upiUtr})\n⚠️ *Payment Note:* Verify credit before dispatch!\n` : `\n`) +
    `⏰ *Status:* ${order.status}`;

  if (ServerStore.hasNotificationBeenSent(key)) {
    return {
      automatedDelivery: { attempted: false, configured: false, success: false },
      shareLink: getWhatsAppDirectUrl(adminPhone, messageText),
      idempotentSkip: true,
    };
  }

  const result = await dispatchWhatsAppWithFallback(adminPhone, messageText);
  ServerStore.recordNotificationSent(key);
  return result;
}

/**
 * Admin: Verified payment receipt notification
 */
export async function notifyAdminPaymentVerified(
  order: ServerOrder,
  amount: number,
  upiUtr?: string
): Promise<WhatsAppDispatchResult & { idempotentSkip?: boolean }> {
  const key = `notif:${order.orderNumber}:admin_payment_verified:${upiUtr || 'verified'}`;
  const adminPhone = getAdminWhatsAppNumber();

  const messageText =
    `💳 *PAYMENT VERIFIED - UNIQ CRACKERS* 💳\n\n` +
    `*Order ID:* #${order.orderNumber}\n` +
    `*Amount Received:* ₹${amount}\n` +
    (upiUtr ? `*Transaction Reference (UTR):* ${upiUtr}\n` : '') +
    `*Customer:* ${order.customerName} (${order.customerPhone})\n` +
    `Order is ready for review and packing.`;

  if (ServerStore.hasNotificationBeenSent(key)) {
    return {
      automatedDelivery: { attempted: false, configured: false, success: false },
      shareLink: getWhatsAppDirectUrl(adminPhone, messageText),
      idempotentSkip: true,
    };
  }

  const result = await dispatchWhatsAppWithFallback(adminPhone, messageText);
  ServerStore.recordNotificationSent(key);
  return result;
}

/**
 * Admin: Order cancellation notification
 */
export async function notifyAdminOrderCancelled(
  order: ServerOrder,
  cancelledBy: string,
  reason?: string
): Promise<WhatsAppDispatchResult & { idempotentSkip?: boolean }> {
  const key = `notif:${order.orderNumber}:admin_cancelled`;
  const adminPhone = getAdminWhatsAppNumber();

  const messageText =
    `⚠️ *ORDER CANCELLED - UNIQ CRACKERS* ⚠️\n\n` +
    `*Order ID:* #${order.orderNumber}\n` +
    `*Cancelled By:* ${cancelledBy}\n` +
    (reason ? `*Reason:* ${reason}\n` : '') +
    `*Customer:* ${order.customerName} (${order.customerPhone})\n` +
    `*Reserved stock restored to inventory automatically.*`;

  if (ServerStore.hasNotificationBeenSent(key)) {
    return {
      automatedDelivery: { attempted: false, configured: false, success: false },
      shareLink: getWhatsAppDirectUrl(adminPhone, messageText),
      idempotentSkip: true,
    };
  }

  const result = await dispatchWhatsAppWithFallback(adminPhone, messageText);
  ServerStore.recordNotificationSent(key);
  return result;
}

/* =========================================================================
 * 3. DELIVERY AGENT NOTIFICATIONS (WhatsApp)
 * ========================================================================= */

/**
 * Delivery Agent: Task assigned notification
 */
export async function notifyDeliveryAgentAssigned(
  order: ServerOrder,
  agentPhone: string,
  agentName: string
): Promise<WhatsAppDispatchResult & { idempotentSkip?: boolean }> {
  const cleanPhone = agentPhone.replace(/[^\d]/g, '').slice(-10);
  const key = `notif:${order.orderNumber}:agent_assigned:${cleanPhone}`;

  const messageText =
    `🛵 *NEW DELIVERY TASK ASSIGNED - UNIQ CRACKERS* 🛵\n\n` +
    `Hello ${agentName},\nYou have been assigned a new delivery task:\n\n` +
    `*Order ID:* #${order.orderNumber}\n` +
    `*Customer Name:* ${order.customerName}\n` +
    `*Customer Phone:* ${order.customerPhone}\n` +
    `*Delivery Address:* ${order.deliveryAddress}\n` +
    `*Distance:* ${(order.distanceKm || 0).toFixed(1)} KM\n` +
    `*Bill Amount:* ₹${order.totalAmount} (${
      order.paymentMethod === 'COD'
        ? 'COLLECT CASH ON DELIVERY'
        : 'PREPAID - DO NOT COLLECT CASH'
    })\n\n` +
    `🔑 Customer has a doorstep verification OTP that must be verified on delivery.`;

  if (ServerStore.hasNotificationBeenSent(key)) {
    return {
      automatedDelivery: { attempted: false, configured: false, success: false },
      shareLink: getWhatsAppDirectUrl(cleanPhone, messageText),
      idempotentSkip: true,
    };
  }

  const result = await dispatchWhatsAppWithFallback(cleanPhone, messageText);
  ServerStore.recordNotificationSent(key);
  return result;
}

/**
 * Delivery Agent: Status changed notification
 */
export async function notifyDeliveryAgentStatusChange(
  order: ServerOrder,
  agentPhone: string,
  newStatus: string
): Promise<WhatsAppDispatchResult & { idempotentSkip?: boolean }> {
  const cleanPhone = agentPhone.replace(/[^\d]/g, '').slice(-10);
  const key = `notif:${order.orderNumber}:agent_status_${newStatus}:${cleanPhone}`;

  const messageText =
    `📦 *DELIVERY TASK STATUS UPDATE - UNIQ CRACKERS* 📦\n\n` +
    `*Order ID:* #${order.orderNumber}\n` +
    `*Updated Status:* ${newStatus}\n` +
    `*Customer:* ${order.customerName} (${order.customerPhone})\n` +
    `*Address:* ${order.deliveryAddress}`;

  if (ServerStore.hasNotificationBeenSent(key)) {
    return {
      automatedDelivery: { attempted: false, configured: false, success: false },
      shareLink: getWhatsAppDirectUrl(cleanPhone, messageText),
      idempotentSkip: true,
    };
  }

  const result = await dispatchWhatsAppWithFallback(cleanPhone, messageText);
  ServerStore.recordNotificationSent(key);
  return result;
}

/**
 * Delivery Agent: Order cancelled notification
 */
export async function notifyDeliveryAgentOrderCancelled(
  order: ServerOrder,
  agentPhone: string
): Promise<WhatsAppDispatchResult & { idempotentSkip?: boolean }> {
  const cleanPhone = agentPhone.replace(/[^\d]/g, '').slice(-10);
  const key = `notif:${order.orderNumber}:agent_cancelled:${cleanPhone}`;

  const messageText =
    `🛑 *DELIVERY TASK CANCELLED - UNIQ CRACKERS* 🛑\n\n` +
    `*Order ID:* #${order.orderNumber}\n` +
    `This order has been cancelled. Please do not dispatch or return package to the Velmala Hub dispatch counter.`;

  if (ServerStore.hasNotificationBeenSent(key)) {
    return {
      automatedDelivery: { attempted: false, configured: false, success: false },
      shareLink: getWhatsAppDirectUrl(cleanPhone, messageText),
      idempotentSkip: true,
    };
  }

  const result = await dispatchWhatsAppWithFallback(cleanPhone, messageText);
  ServerStore.recordNotificationSent(key);
  return result;
}
