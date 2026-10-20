'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Flame,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface OrderItemSummary {
  name: string;
  variantName?: string;
  quantity: number;
  price: number;
}

interface SavedOrder {
  id?: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItemSummary[];
  totalAmount?: number;
  total?: number;
  paymentMethod: string;
  deliveryAddress: string;
  distanceKm?: number;
  deliveryOtp?: string;
  createdAt: string;
  status: string;
}

export default function TrackOrderPage() {
  const { user, isPhoneVerified } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SavedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch orders from API and localStorage
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setOrders(data.data);
        setSelectedOrder(data.data[0]);
      } else {
        const stored = localStorage.getItem('n_crackers_orders');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
            setSelectedOrder(parsed[0]);
          }
        }
      }
    } catch {
      const stored = localStorage.getItem('n_crackers_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          setSelectedOrder(parsed[0]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user.phone, isPhoneVerified]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toUpperCase();
    if (!query) return;

    const cleanDigits = query.replace(/[^\d]/g, '');
    const found = orders.find((o) => {
      const matchOrder = o.orderNumber.toUpperCase().includes(query);
      const matchPhone =
        cleanDigits.length >= 4 &&
        o.customerPhone?.replace(/[^\d]/g, '').includes(cleanDigits);
      return matchOrder || matchPhone;
    });

    if (found) {
      setSelectedOrder(found);
    } else {
      alert(`No order found matching "${searchInput}". Check recent orders list below.`);
    }
  };

  const getOrderStatusStep = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PLACED':
        return 1;
      case 'CONFIRMED':
        return 2;
      case 'PREPARING':
      case 'READY_FOR_DELIVERY':
        return 2;
      case 'OUT_FOR_DELIVERY':
      case 'DELIVERY_AGENT_ASSIGNED':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 2;
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
            Live Order Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Doorstep delivery progress, rider assignment, and 4-digit verification OTP from our Velmala central dispatch counter.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-festive-surface p-5 sm:p-7 rounded-3xl border border-amber-500/20 shadow-2xl">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order ID (e.g. NC-2026-8492) or 10-Digit Mobile Number"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-2xl focus:outline-none focus:border-amber-500 text-white placeholder-slate-400 font-bold"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-festive transition-all shrink-0"
            >
              Track Order
            </button>
          </form>
        </div>

        {/* Selected Order Live Tracking Card */}
        {selectedOrder ? (
          <div className="bg-festive-surface rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Order Details
                </span>
                <div className="font-heading font-black text-2xl text-white flex items-center gap-2">
                  <span>#{selectedOrder.orderNumber}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                    {selectedOrder.status || 'CONFIRMED'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()} at{' '}
                  {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Delivery Verification OTP Badge */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right">
                <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                  Doorstep Delivery OTP
                </div>
                <div className="font-mono text-3xl font-black text-amber-400 tracking-widest">
                  {selectedOrder.deliveryOtp || '4829'}
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Give to delivery rider on arrival
                </div>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="py-4">
              {(() => {
                const currentStep = getOrderStatusStep(selectedOrder.status);
                return (
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                    <div className="space-y-2">
                      <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-500'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-slate-200">Order Confirmed</div>
                    </div>

                    <div className="space-y-2">
                      <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-500'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-slate-200">Packed at Velmala</div>
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

            {/* Delivery Rider & Destination Card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Dispatch Executive</span>
                <div className="font-bold text-white flex items-center gap-2 text-sm">
                  <span>Raju Sharma (Velmala Local Fleet)</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href="tel:919000000000"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Delivery Partner</span>
                  </a>

                  <a
                    href={`https://wa.me/919000000000?text=${encodeURIComponent(`Hi, I am checking status of my N Crackers Order #${selectedOrder.orderNumber}`)}`}
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
                <span>Total Bill ({selectedOrder.paymentMethod})</span>
                <span className="text-xl text-amber-400 font-heading">
                  ₹{selectedOrder.totalAmount || selectedOrder.total}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-festive-surface rounded-3xl border border-slate-800 space-y-4">
            <Package className="w-12 h-12 text-slate-500 mx-auto" />
            <div>
              <h3 className="font-heading font-black text-base text-white">
                No active orders found
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Search with your Order Number or verified 10-digit mobile number to view live doorstep tracking.
              </p>
            </div>
            <Link
              href="/#catalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-spark"
            >
              <span>Explore Fireworks Catalog</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>
          </div>
        )}

        {/* All Recent Orders Quick Picker */}
        {orders.length > 1 && (
          <div className="bg-festive-surface p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Your Recent Orders ({orders.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {orders.map((o) => (
                <button
                  key={o.orderNumber}
                  onClick={() => setSelectedOrder(o)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                    selectedOrder?.orderNumber === o.orderNumber
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
                  }`}
                >
                  #{o.orderNumber}
                </button>
              ))}
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
            href="tel:919000000000"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-slate-950 transition-colors shrink-0 shadow-sm"
          >
            Call Dispatch Helpdesk
          </a>
        </div>
      </div>
    </div>
  );
}
