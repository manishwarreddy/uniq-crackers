import { OrderStatus, VALID_ORDER_TRANSITIONS } from '@/types';

export class OrderService {
  /**
   * Validates whether an order status transition is allowed by the state machine
   */
  static isValidTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  /**
   * Generates formatted order number e.g. UC-2026-XXXX
   */
  static generateOrderNumber(): string {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `UC-${new Date().getFullYear()}-${randomHex}`;
  }

  /**
   * Generates secure 4-digit numeric delivery OTP
   */
  static generateDeliveryOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
