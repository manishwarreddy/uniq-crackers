export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  isActive: boolean;
}

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coup-1',
    code: 'DIWALI2026',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxDiscount: 300,
    minOrderAmount: 500,
    isActive: true,
  },
  {
    id: 'coup-2',
    code: 'VELMALA50',
    discountType: 'FIXED_AMOUNT',
    discountValue: 50,
    minOrderAmount: 500,
    isActive: true,
  },
];
