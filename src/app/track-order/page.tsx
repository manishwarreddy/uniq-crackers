'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  PhoneCall,
  Search,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  XCircle,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getOrderById, getCustomerOrders, Order } from '@/services/orderService';
import { STORE_DEFAULTS } from '@/lib/constants';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isPhoneVerified } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Helper to load customer's own orders from storage + API
  const loadCustomerOrders = useCallback(async () => {
    const ordersMap = new Map<string, Order>();

    // 1. Read locally saved customer orders from this device
    if (typeof window !== 'undefined') {
      try {
        const localRaw = localStorage.getItem('uniq_customer_orders');
        if (localRaw) {
          const parsed: Order[] = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((o) => {
              if (o && o.orderNumber) ordersMap.set(o.orderNumber, o);
            });
          }
        }
      } catch (e) {
        console.warn('Error reading local customer orders:', e);
      }
    }

    // 2. If logged in with phone, fetch from API
    const activePhone = user.phone ? user.phone.replace(/[^\d]/g, '').slice(-10) : '';
    if (activePhone) {
      try {
        const apiOrders = await getCustomerOrders(activePhone);
        if (Array.isArray(apiOrders)) {
          apiOrders.forEach((o) => {
            if (o && o.orderNumber) ordersMap.set(o.orderNumber, o);
          });
        }
      } catch (e) {
        console.warn('Error fetching API orders for phone:', e);
      }
    }

    const merged = Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setCustomerOrders(merged);

    // Check URL order parameter
    const orderParam = searchParams.get('order') || searchParams.get('orderNumber');
    if (orderParam) {
      const cleanParam = orderParam.trim().toUpperCase();
      const existing = merged.find((o) => o.orderNumber.toUpperCase() === cleanParam);
      if (existing) {
        setSelectedOrder(existing);
        return;
      }

      // Fetch from API if not already in local list
      try {
        const remoteOrder = await getOrderById(cleanParam);
        if (remoteOrder) {
          setSelectedOrder(remoteOrder);
          setCustomerOrders((prev) => {
            if (!prev.some((o) => o.orderNumber === remoteOrder.orderNumber)) {
              return [remoteOrder, ...prev];
            }
            return prev;
          });
          return;
        }
      } catch {}
    }

    // Check last placed order in localStorage if no URL param
    if (typeof window !== 'undefined') {
      const lastOrderNum = localStorage.getItem('uniq_last_order');
      if (lastOrderNum) {
        const match = merged.find((o) => o.orderNumber.toUpperCase() === lastOrderNum.trim().toUpperCase());
        if (match) {
          setSelectedOrder(match);
          return;
        }
      }
    }

    // If customer has placed orders, default to most recent
    if (merged.length > 0) {
      setSelectedOrder(merged[0]);
    } else {
      setSelectedOrder(null);
    }
  }, [user.phone, searchParams]);

  useEffect(() => {
    loadCustomerOrders();
  }, [loadCustomerOrders, isPhoneVerified]);

  // Real-time live status polling for pending orders
  useEffect(() => {
    if (
      !selectedOrder ||
      (selectedOrder.status !== 'PENDING_REVIEW' && selectedOrder.status !== 'PLACED')
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await getOrderById(selectedOrder.orderNumber);
        if (updated && (updated.status !== selectedOrder.status || updated.paymentStatus !== selectedOrder.paymentStatus)) {
          setSelectedOrder(updated);
          setCustomerOrders((prev) =>
            prev.map((o) => (o.orderNumber === updated.orderNumber ? updated : o))
          );
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedOrder]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toUpperCase();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);

    // 1. Check in already loaded orders
    const cleanDigits = query.replace(/[^\d]/g, '');
    const localMatch = customerOrders.find((o) => {
      const matchOrder = o.orderNumber.toUpperCase().includes(query);
      const matchPhone =
        cleanDigits.length >= 4 &&
        o.customerPhone?.replace(/[^\d]/g, '').includes(cleanDigits);
      return matchOrder || matchPhone;
    });

    if (localMatch) {
      setSelectedOrder(localMatch);
      setIsSearching(false);
      router.replace(`/track-order?order=${localMatch.orderNumber}`);
      return;
    }

    // 2. Fetch order by Order Number from API
    try {
      const remoteOrder = await getOrderById(query);
      if (remoteOrder) {
        setSelectedOrder(remoteOrder);
        setCustomerOrders((prev) => {
          if (!prev.some((o) => o.orderNumber === remoteOrder.orderNumber)) {
            return [remoteOrder, ...prev];
          }
          return prev;
        });
        setIsSearching(false);
        router.replace(`/track-order?order=${remoteOrder.orderNumber}`);
        return;
      }
    } catch {}

    // 3. If query resembles phone, fetch orders by phone
    if (cleanDigits.length === 10) {
      try {
        const phoneOrders = await getCustomerOrders(cleanDigits);
        if (phoneOrders.length > 0) {
          setSelectedOrder(phoneOrders[0]);
          setCustomerOrders((prev) => {
            const map = new Map<string, Order>();
            prev.forEach((o) => map.set(o.orderNumber, o));
            phoneOrders.forEach((o) => map.set(o.orderNumber, o));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
          setIsSearching(false);
          router.replace(`/track-order?order=${phoneOrders[0].orderNumber}`);
          return;
        }
      } catch {}
    }

    setIsSearching(false);
    if (cleanDigits.length === 10 && !isPhoneVerified) {
      setSearchError(
        `To protect order privacy, orders for ${cleanDigits} can only be viewed after logging in with your name and mobile number. Please click "Login" in the top bar to sign in.`
      );
    } else {
      setSearchError(
        `No order found matching "${searchInput}". Please verify your Order ID (e.g. UC-2026-XXXX) or sign in with your mobile number.`
      );
    }
  };

  const getOrderStatusStep = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING_REVIEW':
      case 'PLACED':
        return 1;
      case 'ACCEPTED':
      case 'CONFIRMED':
      case 'PREPARING':
      case 'READY_FOR_DELIVERY':
      case 'READY_FOR_DISPATCH':
        return 2;
      case 'OUT_FOR_DELIVERY':
      case 'DELIVERY_AGENT_ASSIGNED':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="min-h-screen bg-festive-obsidian text-slate-100 py-10 sm:py-16">
      <div className="container-custom max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Velmala Hub • 7 KM Express Dispatch
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-white">
            Order Status Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Doorstep delivery milestones, agent assignment, and real-time status from our Velmala central dispatch counter.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-festive-surface p-5 sm:p-7 rounded-3xl border border-amber-500/20 shadow-2xl space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <label htmlFor="track-order-search" className="sr-only">
                Enter Order ID or 10-Digit Mobile Number
              </label>
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="track-order-search"
                type="text"
                placeholder="Enter Order ID (e.g. UC-2026-8492) or 10-Digit Mobile Number"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearchError(null);
                }}
                className="w-full pl-11 pr-4 py-3.5 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-2xl focus:outline-none focus:border-amber-500 text-white placeholder-slate-400 font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-festive transition-all shrink-0 flex items-center justify-center gap-2"
            >
              {isSearching ? <span>Searching...</span> : <span>Track Order</span>}
            </button>
          </form>

          {searchError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Customer Order History Tabs (Only shown if the customer has placed orders) */}
        {customerOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                Your Orders ({customerOrders.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Select an order to view live status
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  filterTab === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-festive'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>All My Orders</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                  {customerOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('PENDING_REVIEW')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  filterTab === 'PENDING_REVIEW'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-festive'
                    : 'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-950/60'
                }`}
              >
                <span>⏳ Pending Review</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-200 font-mono">
                  {customerOrders.filter((o) => o.status === 'PENDING_REVIEW' || o.status === 'PLACED').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('ACCEPTED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  filterTab === 'ACCEPTED'
                    ? 'bg-emerald-600 text-white font-black shadow-festive'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950/60'
                }`}
              >
                <span>✅ Accepted</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-200 font-mono">
                  {customerOrders.filter((o) => o.status === 'ACCEPTED' || o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY_FOR_DELIVERY' || o.status === 'READY_FOR_DISPATCH' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('REJECTED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  filterTab === 'REJECTED'
                    ? 'bg-rose-600 text-white font-black shadow-festive'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-950/60'
                }`}
              >
                <span>❌ Rejected / Cancelled</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-200 font-mono">
                  {customerOrders.filter((o) => o.status === 'REJECTED' || o.status === 'CANCELLED').length}
                </span>
              </button>
            </div>

            {/* Order Cards Selector */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {customerOrders
                .filter((o) => {
                  if (filterTab === 'PENDING_REVIEW') return o.status === 'PENDING_REVIEW' || o.status === 'PLACED';
                  if (filterTab === 'ACCEPTED') return o.status === 'ACCEPTED' || o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY_FOR_DELIVERY' || o.status === 'READY_FOR_DISPATCH' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED';
                  if (filterTab === 'REJECTED') return o.status === 'REJECTED' || o.status === 'CANCELLED';
                  return true;
                })
                .map((o) => {
                  const isSelected = selectedOrder?.orderNumber === o.orderNumber;
                  const isPending = o.status === 'PENDING_REVIEW' || o.status === 'PLACED';
                  const isAccepted = o.status === 'ACCEPTED' || o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY_FOR_DELIVERY' || o.status === 'READY_FOR_DISPATCH' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED';

                  return (
                    <button
                      key={o.orderNumber}
                      onClick={() => {
                        setSelectedOrder(o);
                        router.replace(`/track-order?order=${o.orderNumber}`);
                      }}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold border transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-festive font-black scale-102'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
                      }`}
                    >
                      <span>#{o.orderNumber}</span>
                      <span className="font-sans text-[11px] font-extrabold">₹{o.totalAmount}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase ${
                          isSelected
                            ? 'bg-black/30 text-white'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isAccepted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isPending ? 'Pending' : isAccepted ? 'Accepted' : o.status === 'CANCELLED' ? 'Cancelled' : 'Rejected'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Selected Order Live Tracking Card */}
        {selectedOrder ? (
          <div className="bg-festive-surface rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Order Details
                </span>
                <div className="font-heading font-black text-2xl text-white flex flex-wrap items-center gap-2">
                  <span>#{selectedOrder.orderNumber}</span>
                  {(selectedOrder.status === 'PENDING_REVIEW' || selectedOrder.status === 'PLACED') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-xs font-bold border border-amber-500/40">
                      Pending Review
                    </span>
                  )}
                  {selectedOrder.status === 'ACCEPTED' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 text-xs font-bold border border-blue-500/40">
                      Accepted
                    </span>
                  )}
                  {selectedOrder.status === 'PREPARING' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 text-xs font-bold border border-indigo-500/40">
                      Preparing
                    </span>
                  )}
                  {(selectedOrder.status === 'READY_FOR_DELIVERY' || selectedOrder.status === 'READY_FOR_DISPATCH') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 text-xs font-bold border border-purple-500/40">
                      Ready for Dispatch
                    </span>
                  )}
                  {(selectedOrder.status === 'OUT_FOR_DELIVERY' || selectedOrder.status === 'DELIVERY_AGENT_ASSIGNED') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-xs font-bold border border-amber-500/40">
                      Out for Delivery
                    </span>
                  )}
                  {selectedOrder.status === 'DELIVERED' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      Delivered
                    </span>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      Confirmed
                    </span>
                  )}
                  {(selectedOrder.status === 'REJECTED' || selectedOrder.status === 'CANCELLED') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 text-xs font-bold border border-rose-500/40">
                      {selectedOrder.status === 'CANCELLED' ? 'Cancelled' : 'Rejected'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()} at{' '}
                  {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Delivery Verification PIN Code (Only for active / accepted orders when authorized) */}
              {selectedOrder.status !== 'REJECTED' &&
                selectedOrder.status !== 'CANCELLED' &&
                selectedOrder.status !== 'DELIVERED' &&
                selectedOrder.deliveryOtp && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right">
                    <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                      Delivery PIN Code
                    </div>
                    <div className="font-mono text-3xl font-black text-amber-400 tracking-widest">
                      {selectedOrder.deliveryOtp}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      Provide to delivery rider on arrival
                    </div>
                  </div>
                )}
            </div>

            {/* STATUS BANNER 1: PENDING REVIEW */}
            {(selectedOrder.status === 'PENDING_REVIEW' || selectedOrder.status === 'PLACED') && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-400 text-sm">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    {selectedOrder.paymentMethod === 'UPI_QR'
                      ? '⏳ Verifying UPI Payment with Bank Statement'
                      : '⏳ Your Order is Currently Under Store Review'}
                  </span>
                </div>
                {selectedOrder.upiUtr && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/20 text-xs font-mono text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>Submitted UTR / Ref: <strong className="text-amber-400 font-bold">{selectedOrder.upiUtr}</strong></span>
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded shrink-0">Awaiting Bank Credit</span>
                  </div>
                )}
                <p className="text-slate-300 text-xs leading-relaxed">
                  {selectedOrder.paymentMethod === 'UPI_QR'
                    ? 'Our central Velmala dispatch counter is verifying your 12-digit UTR with bank records. Once the credit is confirmed, your order will be approved and fireworks packing will begin immediately.'
                    : 'Your order has been received by our store team at Velmala Central Hub. We are verifying your delivery address within our 7 KM geofence and allocating fireworks stock. Once accepted, fulfillment and packing will commence immediately.'}
                </p>
              </div>
            )}

            {/* STATUS BANNER 2: ACCEPTED ORDER CONFIRMATION */}
            {(selectedOrder.status === 'ACCEPTED' || selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'PREPARING' || selectedOrder.status === 'READY_FOR_DELIVERY' || selectedOrder.status === 'READY_FOR_DISPATCH' || selectedOrder.status === 'OUT_FOR_DELIVERY' || selectedOrder.status === 'DELIVERED') && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-black text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>🎉 Order Confirmed & Accepted by Store Admin!</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  Great news! Your cracker celebration order #{selectedOrder.orderNumber} has been approved by the store admin. Our fulfillment team is actively packing your fireworks at the Velmala Hub for doorstep dispatch.
                </p>
                {selectedOrder.acceptedAt && (
                  <div className="text-[11px] text-emerald-400 font-mono">
                    Approved at: {new Date(selectedOrder.acceptedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* STATUS BANNER 3: REJECTED / CANCELLED ORDER NOTICE WITH CLEAR REASON */}
            {(selectedOrder.status === 'REJECTED' || selectedOrder.status === 'CANCELLED') && (
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-black text-rose-400 text-base">
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{selectedOrder.status === 'CANCELLED' ? '❌ Order Cancelled' : '❌ Order Not Accepted / Rejected'}</span>
                </div>
                <div className="text-xs text-rose-200">
                  <span className="font-bold text-slate-300">
                    {selectedOrder.status === 'CANCELLED' ? 'Cancellation Reason: ' : 'Rejection Reason: '}
                  </span>
                  <span className="font-extrabold underline text-rose-300 ml-1">
                    {selectedOrder.rejectionReason || (selectedOrder.status === 'CANCELLED' ? 'Order was cancelled' : 'Order could not be verified by store counter')}
                  </span>
                </div>
                {selectedOrder.rejectionNote && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20 text-xs text-slate-200 leading-relaxed italic">
                    &ldquo;{selectedOrder.rejectionNote}&rdquo;
                  </div>
                )}
                <p className="text-slate-400 text-[11px] leading-relaxed pt-1">
                  We apologize for any inconvenience. If you believe this is an error or would like to place a new order with corrected contact or address details, please reach out directly to our Velmala Hub helpline.
                </p>
              </div>
            )}

            {/* Stepper Progress Bar (Only for non-rejected orders) */}
            {selectedOrder.status !== 'REJECTED' && selectedOrder.status !== 'CANCELLED' && (
              <div className="py-4">
                {(() => {
                  const currentStep = getOrderStatusStep(selectedOrder.status);
                  return (
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                      <div className="space-y-2">
                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-500'}`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-slate-200">
                          {selectedOrder.status === 'PENDING_REVIEW' ? 'Reviewing' : 'Order Placed'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-500'}`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-slate-200">
                          {selectedOrder.status === 'ACCEPTED' ? 'Accepted & Packed' : 'Packed at Velmala'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-amber-500 text-slate-950 shadow-spark animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div className={currentStep >= 3 ? 'text-amber-400 font-black' : 'text-slate-400'}>
                          On The Way (7 KM)
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentStep >= 4 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-500'}`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className={currentStep >= 4 ? 'text-emerald-400' : 'text-slate-400'}>
                          Doorstep Delivered
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Delivery Rider & Destination Card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Dispatch Executive</span>
                <div className="font-bold text-white flex items-center gap-2 text-sm">
                  <span>{selectedOrder.assignedAgentName || 'Velmala Dispatch Counter Team'}</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href={`tel:${STORE_DEFAULTS.SUPPORT_PHONE.replace(/[^\d]/g, '')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Delivery Partner</span>
                  </a>

                  <a
                    href={`https://wa.me/${STORE_DEFAULTS.SUPPORT_PHONE.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi Uniq Crackers, I am checking the status of my Order #${selectedOrder.orderNumber}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Helpdesk</span>
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Delivery Address</span>
                <div className="font-bold text-white flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{selectedOrder.deliveryAddress}</span>
                </div>
                <div className="text-slate-400 pt-0.5">
                  Estimated arrival time: <strong className="text-amber-300">15 - 25 minutes (Within 7 KM)</strong>
                </div>
              </div>
            </div>

            {/* Ordered Items Summary */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Fireworks Package Contents:
              </span>
              <div className="divide-y divide-slate-800 text-xs">
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{item.name}</span>
                      {item.variantName && (
                        <span className="text-slate-400 text-[11px] ml-2">({item.variantName})</span>
                      )}
                      <span className="text-amber-400 ml-2 font-bold">x{item.quantity}</span>
                    </div>
                    <span className="font-black text-white">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-sm font-black text-white">
                <div>
                  <div>Total Bill:</div>
                  <div className="text-[11px] font-normal text-slate-400">
                    Payment Method: <span className="text-amber-400 font-bold">{selectedOrder.paymentMethod === 'UPI_QR' ? 'Instant UPI' : selectedOrder.paymentMethod === 'COD' ? 'Cash on Delivery (Doorstep)' : selectedOrder.paymentMethod}</span>
                    {selectedOrder.upiUtr ? <span className="font-mono text-slate-300"> • UTR: #{selectedOrder.upiUtr}</span> : null}
                  </div>
                </div>
                <span className="text-xl text-amber-400 font-heading">
                  ₹{selectedOrder.totalAmount}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Initial State when no order has been selected or found */
          <div className="bg-festive-surface rounded-3xl border border-slate-800/80 p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Package className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="font-heading font-black text-xl sm:text-2xl text-white">
                Track Your Festive Delivery
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Enter your Order ID (from your checkout confirmation or SMS) or your 10-digit mobile number above to see real-time dispatch progress and delivery PIN.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto pt-2 text-left">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>35-Min Express</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Dedicated local dispatch from our Velmala Central Hub within 7 KM.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Secure Handover</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Every order includes a 4-digit verification PIN for safe doorstep receipt.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                  <span>Direct Helpdesk</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Instant WhatsApp and call support with the Velmala hub counter.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/#catalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-spark"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explore Fireworks Catalog</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        )}

        {/* Help Banner */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white text-xs flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold">Need assistance with your festive delivery?</div>
              <div className="text-[11px] text-slate-400">Our Velmala central dispatch counter is active from 8 AM to 10 PM.</div>
            </div>
          </div>
          <a
            href={`tel:${STORE_DEFAULTS.SUPPORT_PHONE.replace(/[^\d]/g, '')}`}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-slate-950 transition-colors shrink-0 shadow-sm"
          >
            Call Dispatch Helpdesk
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-festive-obsidian py-20 flex items-center justify-center text-amber-400 font-bold text-sm">
          Loading order status tracking...
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
