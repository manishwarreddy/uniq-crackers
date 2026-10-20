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
}

/**
 * Utility to generate WhatsApp Notification Link & API Payload
 */
export function buildWhatsAppOrderMessage(payload: WhatsAppNotificationPayload): string {
  const itemList = payload.items
    .map((i) => `• ${i.name} (${i.variantName}) x${i.quantity} - ₹${i.price * i.quantity}`)
    .join('\n');

  return (
    `🚨 *NEW ORDER RECEIVED - N CRACKERS* 🚨\n\n` +
    `*Order No:* #${payload.orderNumber}\n` +
    `*Customer:* ${payload.customerName}\n` +
    `*Phone:* ${payload.customerPhone}\n\n` +
    `📍 *Delivery Location:* ${payload.deliveryAddress}\n` +
    `📏 *Distance from Hub:* ${payload.distanceKm.toFixed(1)} KM (Velmala)\n\n` +
    `🛒 *Ordered Items:*\n${itemList}\n\n` +
    `💵 *Total Amount:* ₹${payload.totalAmount}\n` +
    `💳 *Payment Method:* ${payload.paymentMethod}\n\n` +
    `⏰ *Status:* READY FOR DISPATCH`
  );
}

export function getWhatsAppDirectUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
