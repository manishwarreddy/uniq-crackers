'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, MapPin, Tag, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { CartItem, DeliveryLocationState } from '@/types';
import { Button } from '@/components/ui/Button';
import { STORE_DEFAULTS } from '@/lib/constants';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (variantId: string, delta: number) => void;
  onRemoveItem: (variantId: string) => void;
  deliveryLocation: DeliveryLocationState;
  onChangeLocation: () => void;
  onCheckoutSuccess: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  deliveryLocation,
  onChangeLocation,
  onCheckoutSuccess,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const isFreeDelivery = subtotal >= STORE_DEFAULTS.DEFAULT_FREE_DELIVERY_THRESHOLD;
  const deliveryFee = deliveryLocation.isDeliverable ? (isFreeDelivery ? 0 : deliveryLocation.deliveryFee) : 0;
  
  let discount = 0;
  if (appliedCoupon === 'DIWALI2026') {
    discount = Math.min(subtotal * 0.1, 300); // 10% up to 300
  } else if (appliedCoupon === 'VELMALA50') {
    discount = 50;
  }

  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const cleaned = couponCode.trim().toUpperCase();
    if (cleaned === 'DIWALI2026' || cleaned === 'VELMALA50') {
      setAppliedCoupon(cleaned);
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon. Try "DIWALI2026" or "VELMALA50"');
    }
  };

  const handleProceedCheckout = async () => {
    if (!deliveryLocation.isDeliverable) {
      alert("We cannot deliver outside our 7 km Velmala boundary. Please change your delivery address.");
      return;
    }
    if (subtotal < STORE_DEFAULTS.MIN_ORDER_VALUE) {
      alert(`Minimum order value is ₹${STORE_DEFAULTS.MIN_ORDER_VALUE}. Please add more items.`);
      return;
    }

    setIsSubmitting(true);
    // Simulating safe server order placement validation with 15-min reservation hold
    setTimeout(() => {
      setIsSubmitting(false);
      setOrderConfirmed(true);
      setTimeout(() => {
        onCheckoutSuccess();
        setOrderConfirmed(false);
        onClose();
      }, 2500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-amber-500/20 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Your Festive Cart
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500">
                {items.reduce((acc, i) => acc + i.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery Zone Status Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span className="truncate max-w-[210px]">{deliveryLocation.address}</span>
              </div>
              <button
                type="button"
                onClick={onChangeLocation}
                className="text-amber-500 hover:underline font-bold text-[11px] shrink-0"
              >
                Change Pin
              </button>
            </div>

            {deliveryLocation.isDeliverable ? (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-medium pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Within 7 km Zone ({deliveryLocation.distanceKm.toFixed(1)} km from Velmala)
                </span>
                <span className="font-bold">
                  {isFreeDelivery ? 'FREE Delivery' : `₹${deliveryFee} Delivery`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-festive-crimson dark:text-red-400 text-[11px] font-semibold pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Outside 7 km zone ({deliveryLocation.distanceKm.toFixed(1)} km away). Cannot checkout.</span>
              </div>
            )}
          </div>

          {/* Cart Body */}
          {orderConfirmed ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-xl font-black text-slate-900 dark:text-white">
                Festive Order Placed!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Your inventory is reserved. Our local dispatch team at Velmala hub is preparing your order for fast delivery.
              </p>
              <div className="text-xs font-semibold text-amber-500">
                Delivery OTP will be shared upon dispatch.
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Your Cart is Empty
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Explore our certified green sparklers, high-altitude aerial shots, and grand Diwali gift hampers.
              </p>
              <Button variant="festive" size="sm" onClick={onClose}>
                Browse Diwali Catalog
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        {item.boxQuantity}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        ₹{item.price * item.quantity}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.variantId, -1)}
                          className="p-1 text-slate-500 hover:text-amber-500"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.variantId, 1)}
                          className="p-1 text-slate-500 hover:text-amber-500"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.variantId)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Coupon Form */}
              <div className="pt-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Coupon Code (DIWALI2026)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white uppercase font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white hover:bg-amber-500 transition-colors"
                  >
                    Apply
                  </button>
                </form>
                {couponError && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1">{couponError}</p>
                )}
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
                    <span>Coupon &apos;{appliedCoupon}&apos; Applied!</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drawer Footer / Bill Summary */}
          {items.length > 0 && !orderConfirmed && (
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Festive Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Local Velmala Delivery (7 km)</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {!deliveryLocation.isDeliverable
                      ? 'N/A'
                      : isFreeDelivery
                      ? 'FREE'
                      : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Amount</span>
                  <span className="text-xl text-amber-500 font-heading">₹{grandTotal}</span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <Button
                variant="festive"
                size="lg"
                disabled={!deliveryLocation.isDeliverable || isSubmitting}
                onClick={handleProceedCheckout}
                className="w-full font-bold shadow-spark"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {isSubmitting
                  ? 'Reserving Inventory...'
                  : !deliveryLocation.isDeliverable
                  ? 'Location Outside 7 KM'
                  : 'Confirm Order (COD / UPI)'}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>15-Min Inventory Hold • Safe Local Delivery</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
