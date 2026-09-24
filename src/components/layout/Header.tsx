'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, MapPin, ShoppingBag, ShieldCheck, PhoneCall, Sparkles, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { STORE_DEFAULTS } from '@/lib/constants';

export const Header: React.FC = () => {
  const { cartCount, subtotal, openCart, deliveryLocation, openLocationModal } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 dark:bg-slate-950/95 border-b border-amber-500/20 shadow-sm">
      {/* Top Festive Announcement Bar */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-festive-crimson text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-200" />
        <span>Diwali 2026 Direct Delivery: Velmala Center (Strict 7 KM Delivery Zone)</span>
        <span className="hidden sm:inline">| 🌿 100% CSIR-NEERI Green Certified</span>
        <span className="hidden md:inline">| 🚚 Free Delivery Above ₹3,000</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group select-none shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-festive-crimson flex items-center justify-center shadow-spark text-white group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                N CRACKERS
              </span>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                100% Green
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Velmala Hub • Express 7 KM Local Dispatch
            </p>
          </div>
        </Link>

        {/* Dynamic Delivery Location Selector Pill */}
        <button
          type="button"
          onClick={openLocationModal}
          className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all text-left group"
        >
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="max-w-[200px] lg:max-w-[260px] truncate">
            <div className="text-[10px] text-slate-400 font-normal">Delivering to:</div>
            <div className="truncate font-bold text-slate-900 dark:text-white">
              {deliveryLocation.address}
            </div>
          </div>
          <div className="flex items-center gap-1 pl-2 border-l border-slate-300 dark:border-slate-700">
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
              deliveryLocation.isDeliverable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {deliveryLocation.distanceKm.toFixed(1)} km
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </button>

        {/* Right Navigation & Cart Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href={`tel:${STORE_DEFAULTS.SUPPORT_PHONE.replace(/\s+/g, '')}`}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-amber-500" />
            <span className="hidden lg:inline">{STORE_DEFAULTS.SUPPORT_PHONE}</span>
            <span className="lg:hidden">Support</span>
          </Link>

          {/* Interactive Cart Button */}
          <button
            type="button"
            onClick={openCart}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs transition-all shadow-sm hover:scale-[1.02]"
            aria-label="Open cart"
          >
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="hidden sm:inline text-slate-900 dark:text-white font-heading font-black">
                ₹{subtotal}
              </span>
            )}
            <span className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-festive-crimson text-white text-[11px] font-black flex items-center justify-center shadow-spark">
              {cartCount}
            </span>
          </button>

          {/* Location button for mobile */}
          <button
            type="button"
            onClick={openLocationModal}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
            aria-label="Select location"
          >
            <MapPin className="w-4 h-4 text-amber-500" />
          </button>

          <Link href="/admin">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
              className="text-xs font-bold"
            >
              <span className="hidden sm:inline">Ops Login</span>
              <span className="sm:hidden">Ops</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
