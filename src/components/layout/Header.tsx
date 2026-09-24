'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Flame, MapPin, ShoppingBag, ShieldCheck, PhoneCall, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { STORE_DEFAULTS } from '@/lib/constants';

export const Header: React.FC = () => {
  const [cartCount] = useState(0);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-950/90 border-b border-amber-500/20 shadow-sm">
      {/* Top Festive Announcement Bar */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        <span>Diwali 2026 Direct Delivery Center: Velmala, Hyderabad (Within 7 KM Fast Geofence)</span>
        <span className="hidden sm:inline">| Standard Sound & Eco-Certified Green Crackers</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group select-none">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-festive-crimson flex items-center justify-center shadow-spark text-white group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                N CRACKERS
              </span>
              <Badge variant="festive" size="sm" className="hidden sm:inline-flex">
                Phase 0 Verified
              </Badge>
            </div>
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Velmala Hub • 7 KM Fast Local Dispatch
            </p>
          </div>
        </Link>

        {/* Location Indicator Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-amber-500" />
          <span>Center: <strong>Velmala (502300)</strong></span>
          <span className="text-slate-400">•</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">Max 7.0 KM</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`tel:${STORE_DEFAULTS.SUPPORT_PHONE.replace(/\s+/g, '')}`}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-500 px-3 py-2 rounded-lg"
          >
            <PhoneCall className="w-4 h-4 text-amber-500" />
            <span>Support</span>
          </Link>

          <Link href="/cart">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ShoppingBag className="w-4 h-4 text-amber-500" />}
              className="relative"
            >
              <span className="hidden sm:inline">Cart</span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center ml-1">
                {cartCount}
              </span>
            </Button>
          </Link>

          <Link href="/admin">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
            >
              <span className="hidden sm:inline">Admin / Ops</span>
              <span className="sm:hidden">Ops</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
