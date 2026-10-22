export interface WhatsAppNotificationPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  distanceKm: number;
  totalAmount: number;
  paymentMethod: string;
  items: Array<{ name: string; variantName: string; quantity: number; price: number }>;
  storePhone?: string;
  deliveryOtp?: string;
  upiUtr?: string;
}

/**
 * Utility to generate WhatsApp Notification Link & API Payload for Admin
 */
export function buildWhatsAppOrderMessage(payload: WhatsAppNotificationPayload): string {
  const itemList = payload.items
    .map((i) => `• ${i.name} (${i.variantName}) x${i.quantity} = ₹${i.price * i.quantity}`)
    .join('\n');

  return (
    `🚨 *NEW ORDER RECEIVED - UNIQ CRACKERS VELMALA HUB* 🚨\n\n` +
    `*Order ID:* #${payload.orderNumber}\n` +
    `*Customer:* ${payload.customerName}\n` +
    `*Customer Mobile:* ${payload.customerPhone}\n\n` +
    `📍 *Delivery Address:* ${payload.deliveryAddress}\n` +
    `📏 *Distance from Velmala Hub:* ${payload.distanceKm.toFixed(1)} KM\n\n` +
    `🛒 *Items Ordered:*\n${itemList}\n\n` +
    `💰 *Total Bill:* ₹${payload.totalAmount}\n` +
    `💳 *Payment:* ${payload.paymentMethod}` +
    (payload.upiUtr ? ` (UTR: ${payload.upiUtr})\n⚠️ *Payment Note:* Verify UTR credit in bank before packing!\n` : `\n`) +
    (payload.deliveryOtp ? `🔑 *Doorstep Verification OTP:* ${payload.deliveryOtp}\n\n` : `\n`) +
    `⏰ *Status:* READY FOR STORE REVIEW & DISPATCH`
  );
}

export function getWhatsAppDirectUrl(phone: string, text: string): string {
  let cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Server-side Meta WhatsApp Cloud API dispatcher (if credentials configured)
 */
export async function dispatchWhatsAppApiMessage(
  targetPhone: string,
  messageText: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: 'WHATSAPP_ACCESS_TOKEN not configured' };
  }

  try {
    let cleanPhone = targetPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: messageText },
      }),
    });

    const data = await res.json();
    return { success: res.ok, error: res.ok ? undefined : JSON.stringify(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
