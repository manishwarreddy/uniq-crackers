'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Tag,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Lock,
  MessageSquare,
  ExternalLink,
  Clock,
  Gift,
  AlertCircle,
} from 'lucide-react';
import { CartItem, DeliveryLocationState } from '@/types';
import { STORE_DEFAULTS } from '@/lib/constants';
import { PaymentModal, PaymentCompletionData } from '@/components/ecommerce/PaymentModal';
import { useAuth } from '@/context/AuthContext';

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
  const { user, isPhoneVerified, openOtpModal } = useAuth();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // 15-Minute Inventory Reservation Timer
  const [holdSeconds, setHoldSeconds] = useState(900); // 15 mins

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeOrderNumber, setActiveOrderNumber] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    deliveryOtp: string;
    whatsappUrl: string;
    adminPhone?: string;
    totalAmount: number;
    paymentMethod?: string;
    paymentStatus?: string;
    upiUtr?: string;
  } | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && holdSeconds > 0) {
      timer = setInterval(() => setHoldSeconds((prev) => (prev > 0 ? prev - 1 : 900)), 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, holdSeconds]);

  // Live Auto-Poll UPI Payment Status
  useEffect(() => {
    if (
      !confirmedOrder ||
      confirmedOrder.paymentMethod !== 'UPI_QR' ||
      confirmedOrder.paymentStatus === 'PAID'
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/orders?orderNumber=${encodeURIComponent(confirmedOrder.orderNumber)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const remoteOrder = json.data;
            if (remoteOrder.paymentStatus === 'PAID' || remoteOrder.status === 'ACCEPTED') {
              setConfirmedOrder((prev) => (prev ? { ...prev, paymentStatus: 'PAID' } : prev));
            }
          }
        }
      } catch {
        // network polling silent fail
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [confirmedOrder]);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const originalSubtotal = items.reduce((acc, item) => acc + (item.originalPrice || item.price * 1.3) * item.quantity, 0);

  const freeDeliveryThreshold = STORE_DEFAULTS.DEFAULT_FREE_DELIVERY_THRESHOLD || 3000;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const freeDeliveryGap = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  const deliveryFee = deliveryLocation.isDeliverable ? (isFreeDelivery ? 0 : deliveryLocation.deliveryFee) : 0;

  let discount = 0;
  if (appliedCoupon === 'DIWALI2026') {
    discount = Math.min(Math.round(subtotal * 0.1), 300); // 10% up to 300
  } else if (appliedCoupon === 'VELMALA50') {
    discount = 50;
  }

  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);
  const totalSavings = Math.round(originalSubtotal - grandTotal);

  const handleApplyCoupon = (codeToApply?: string) => {
    setCouponError(null);
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (code === 'DIWALI2026' || code === 'VELMALA50') {
      setAppliedCoupon(code);
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon. Try "DIWALI2026" or "VELMALA50"');
    }
  };

  const handleOpenPayment = () => {
    setCheckoutError(null);
    if (!deliveryLocation.isDeliverable) {
      setCheckoutError("We don't deliver to your location. Please select an address within our 7 KM Velmala Hub delivery zone.");
      return;
    }
    if (subtotal < STORE_DEFAULTS.MIN_ORDER_VALUE) {
      setCheckoutError(`Minimum order value is ₹${STORE_DEFAULTS.MIN_ORDER_VALUE}. Please add more items to your cart.`);
      return;
    }

    if (!user.phone) {
      openOtpModal();
      return;
    }

    const orderNum = `UC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveOrderNumber(orderNum);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentCompleted = async (paymentData: PaymentCompletionData) => {
    setIsPaymentModalOpen(false);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: user.name || 'Valued Customer',
          customerPhone: user.phone,
          deliveryAddress: deliveryLocation.address,
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude,
          distanceKm: deliveryLocation.distanceKm,
          subtotal,
          deliveryFee,
          discountAmount: discount,
          totalAmount: grandTotal,
          paymentMethod: paymentData.method,
          upiUtr: paymentData.upiUtr,
          items,
          couponCode: appliedCoupon,
        }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success && data.data?.order) {
        const orderData = data.data.order;
        const finalOrderNumber = orderData.orderNumber || activeOrderNumber;
        try {
          localStorage.setItem('uniq_last_order', finalOrderNumber);
          const existing = JSON.parse(localStorage.getItem('uniq_customer_orders') || '[]');
          existing.unshift(orderData);
          localStorage.setItem('uniq_customer_orders', JSON.stringify(existing));

          if (data.data.orderAccessToken) {
            const tokens = JSON.parse(localStorage.getItem('uniq_order_tokens') || '{}');
            tokens[finalOrderNumber] = data.data.orderAccessToken;
            localStorage.setItem('uniq_order_tokens', JSON.stringify(tokens));
          }
        } catch {}

        setConfirmedOrder({
          orderNumber: finalOrderNumber,
          deliveryOtp: orderData.deliveryOtp || '',
          whatsappUrl: data.data.whatsappUrl || '',
          adminPhone: data.data.adminPhone || STORE_DEFAULTS.SUPPORT_PHONE,
          totalAmount: orderData.totalAmount || grandTotal,
          paymentMethod: paymentData.method,
          paymentStatus: orderData.paymentStatus || (paymentData.method === 'UPI_QR' ? 'AWAITING_VERIFICATION' : 'PENDING_COD'),
          upiUtr: paymentData.upiUtr,
        });
        setOrderConfirmed(true);
        onCheckoutSuccess();
      } else {
        setCheckoutError(data.error?.message || data.message || 'Failed to place order. Please check your phone number and cart.');
      }
    } catch {
      setIsSubmitting(false);
      setCheckoutError('Network error placing order. Please check your connection and try again.');
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-festive-surface text-slate-100 border-l border-amber-500/20 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-black text-white">
                Your Festive Cart
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {items.reduce((acc, i) => acc + i.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 15-Minute Reservation Urgency Strip */}
          {items.length > 0 && !orderConfirmed && (
            <div className="bg-amber-500/10 px-4 py-2 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Festive Inventory Hold:</span>
              </span>
              <span className="font-mono text-amber-400 font-black">
                {formatTimer(holdSeconds)} mins
              </span>
            </div>
          )}

          {/* Free Delivery Meter */}
          {items.length > 0 && !orderConfirmed && (
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400" />
                  {isFreeDelivery ? (
                    <span className="text-emerald-400 font-extrabold">🎉 Congratulations! FREE Delivery Unlocked!</span>
                  ) : (
                    <span>Add ₹{freeDeliveryGap} more for <strong className="text-amber-400">FREE Delivery</strong></span>
                  )}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {Math.round(freeDeliveryProgress)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Customer Login Banner if not signed in */}
          {!user.phone && !orderConfirmed && items.length > 0 && (
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>10-Digit Mobile</strong> for instant WhatsApp order alerts.
                </span>
              </div>
              <button
                type="button"
                onClick={openOtpModal}
                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shrink-0 transition-colors shadow-sm"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Delivery Zone Status Card */}
          <div className="p-3.5 bg-slate-900/40 border-b border-slate-800 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate max-w-[210px]">{deliveryLocation.address}</span>
              </div>
              <button
                type="button"
                onClick={onChangeLocation}
                className="text-amber-400 hover:underline font-extrabold text-[11px] shrink-0"
              >
                Change Pin
              </button>
            </div>

            {deliveryLocation.isDeliverable ? (
              <div className="flex items-center justify-between text-emerald-400 text-[11px] font-semibold pt-0.5">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Within 7 km Zone ({deliveryLocation.distanceKm.toFixed(1)} km from Velmala Hub)
                </span>
                <span className="font-extrabold text-amber-300">
                  {isFreeDelivery ? 'FREE Delivery' : `₹${deliveryFee} Delivery`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-semibold pt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>We don&apos;t deliver to your location ({deliveryLocation.distanceKm.toFixed(1)} km away).</span>
              </div>
            )}
          </div>

          {/* Cart Body */}
          {orderConfirmed && confirmedOrder ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce border border-emerald-500/30">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-black text-2xl text-white">
                  Festive Order Placed!
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Your fireworks inventory is reserved. Our Velmala hub dispatch team has received your order.
                </p>
              </div>

              {/* Order Info Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    #{confirmedOrder.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total Paid/Payable:</span>
                  <span className="font-black text-white text-base">
                    ₹{confirmedOrder.totalAmount}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Verified Mobile:</span>
                  <span className="font-mono font-bold text-slate-200">
                    +91 {user.phone}
                  </span>
                </div>
                {confirmedOrder.paymentMethod && (
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Payment:</span>
                    <span className="font-bold text-right">
                      {confirmedOrder.paymentMethod === 'UPI_QR' ? (
                        <span className="text-amber-400">
                          UPI {confirmedOrder.upiUtr ? `(UTR: ${confirmedOrder.upiUtr})` : ''}
                        </span>
                      ) : confirmedOrder.paymentMethod === 'COD' ? (
                        <span className="text-emerald-400">Cash on Delivery (Doorstep)</span>
                      ) : (
                        <span className="text-sky-400">Cards / NetBanking</span>
                      )}
                    </span>
                  </div>
                )}
                {confirmedOrder.paymentMethod === 'UPI_QR' && (
                  confirmedOrder.paymentStatus === 'PAID' ? (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/50 text-emerald-200 text-xs flex items-center gap-3 text-left animate-in zoom-in-95 duration-300 shadow-spark">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/30 border border-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-bounce" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-heading font-black text-white text-xs">
                          🎉 Payment Confirmed &amp; Verified!
                        </div>
                        <div className="text-[10px] text-emerald-300 leading-snug">
                          Verified by Teja Reddy Sheri. Your order is accepted and being packed at Velmala Hub!
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                          <span>Awaiting Bank Verification</span>
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        </div>
                        <div className="text-[10px] text-slate-300 leading-snug">
                          Matching UTR credit in Axis Bank. Screen will auto-update the instant verified!
                        </div>
                      </div>
                    </div>
                  )
                )}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1 text-center">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-amber-400">
                    Doorstep Delivery Verification OTP
                  </div>
                  <div className="font-mono text-3xl font-black text-amber-400 tracking-widest py-1">
                    {confirmedOrder.deliveryOtp}
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Please provide this 4-digit code to the delivery rider upon arrival.
                  </p>
                </div>
              </div>

              {/* Multi-channel Notification Notice for Store Admin */}
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Admin WhatsApp Alert Dispatched</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-500/30">
                    Store Support
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Our central store administrator at Velmala hub has received the order alert with your delivery coordinates, contact info, and item list for immediate packing.
                </p>

                {confirmedOrder.whatsappUrl && (
                  <a
                    href={confirmedOrder.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open WhatsApp Chat with Store Support</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </a>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href={`/track-order?order=${confirmedOrder.orderNumber}`}
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs text-center transition-all shadow-spark"
                >
                  Track Live Order Status (#{confirmedOrder.orderNumber})
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setOrderConfirmed(false);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs text-center transition-colors border border-slate-800"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-black text-xl text-white">
                Your Cart is Empty
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Explore our certified green sparklers, high-altitude aerial shots, and grand Diwali gift hampers.
              </p>
              <Link
                href="/#catalog"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-spark hover:scale-105 transition-all inline-block"
              >
                Browse Diwali Catalog
              </Link>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm"
                >
                  <Link
                    href={`/product/${item.productId}`}
                    onClick={onClose}
                    className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-700 hover:border-amber-500 transition-colors"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/product/${item.productId}`}
                        onClick={onClose}
                        className="font-bold text-xs text-white truncate hover:text-amber-300 transition-colors block"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[10px] text-amber-400 font-medium">
                        {item.boxQuantity}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="font-black text-sm text-white">
                        ₹{item.price * item.quantity}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-2 py-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.variantId, -1)}
                          className="p-1 text-slate-400 hover:text-amber-400"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-200 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.variantId, 1)}
                          className="p-1 text-slate-400 hover:text-amber-400"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.variantId)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Quick Clickable Coupon Chips */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>Available Festive Coupons:</span>
                  <span className="text-amber-400 font-normal">Click to apply</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon('DIWALI2026')}
                    className={`flex-1 p-2.5 rounded-xl text-left border text-[11px] font-bold transition-all ${
                      appliedCoupon === 'DIWALI2026'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-spark'
                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <div className="font-mono font-black">DIWALI2026</div>
                    <div className="text-[10px] font-normal opacity-90">10% OFF on order</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyCoupon('VELMALA50')}
                    className={`flex-1 p-2.5 rounded-xl text-left border text-[11px] font-bold transition-all ${
                      appliedCoupon === 'VELMALA50'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-spark'
                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <div className="font-mono font-black">VELMALA50</div>
                    <div className="text-[10px] font-normal opacity-90">Flat ₹50 Local Off</div>
                  </button>
                </div>

                {/* Custom Coupon Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleApplyCoupon();
                  }}
                  className="flex gap-2 pt-1"
                >
                  <div className="relative flex-1">
                    <label htmlFor="cart-coupon-input" className="sr-only">
                      Festive Coupon Code
                    </label>
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="cart-coupon-input"
                      type="text"
                      placeholder="Or enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white uppercase font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
                  >
                    Apply
                  </button>
                </form>

                {couponError && (
                  <p className="text-[10px] text-rose-400 font-semibold">{couponError}</p>
                )}
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-500/30">
                    <span>Coupon &apos;{appliedCoupon}&apos; Applied!</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drawer Footer / Bill Summary */}
          {items.length > 0 && !orderConfirmed && (
            <div className="p-5 border-t border-slate-800 bg-slate-950/80 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Items MRP Total</span>
                  <span className="text-slate-500 line-through">₹{Math.round(originalSubtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-white">
                  <span>Special Selling Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Local Velmala Delivery (7 km)</span>
                  <span className="font-bold text-amber-400">
                    {!deliveryLocation.isDeliverable
                      ? 'N/A'
                      : isFreeDelivery
                      ? 'FREE'
                      : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>Total Amount</span>
                  <span className="text-2xl text-amber-400 font-heading font-black">₹{grandTotal}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="text-center pt-1 text-[11px] font-black text-emerald-300 bg-emerald-950/80 py-1.5 rounded-xl border border-emerald-500/40">
                    ✨ Total Savings on this Festive Order: ₹{totalSavings}!
                  </div>
                )}
              </div>

              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutError(null)}
                    className="text-rose-400 hover:text-white p-1"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Checkout Action Button */}
              <button
                type="button"
                disabled={!deliveryLocation.isDeliverable || isSubmitting}
                onClick={handleOpenPayment}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-festive hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>
                  {isSubmitting
                    ? 'Confirming Order & Alerting Admin...'
                    : !deliveryLocation.isDeliverable
                    ? "We don't deliver to your location"
                    : !isPhoneVerified
                    ? 'Login with Mobile & Verify OTP'
                    : 'Proceed to Payment (UPI / COD)'}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>15-Min Inventory Hold • Instant WhatsApp &amp; Portal Alerts</span>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-0.5">
                By ordering, you agree to our{' '}
                <Link href="/terms" onClick={onClose} className="text-amber-400 underline hover:text-amber-300">Terms</Link>
                {', '}
                <Link href="/delivery-policy" onClick={onClose} className="text-amber-400 underline hover:text-amber-300">7 KM Delivery</Link>
                {' & '}
                <Link href="/refund-policy" onClick={onClose} className="text-amber-400 underline hover:text-amber-300">Refund Policy</Link>.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instant Payment Gateway Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        grandTotal={grandTotal}
        orderNumber={activeOrderNumber}
        customerName={user.name || 'Valued Customer'}
        customerPhone={user.phone ? `+91 ${user.phone}` : STORE_DEFAULTS.SUPPORT_PHONE}
        onPaymentComplete={handlePaymentCompleted}
      />
    </div>
  );
};
