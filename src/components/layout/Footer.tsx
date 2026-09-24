'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ShieldCheck, MapPin, PhoneCall, Mail, Clock, Award, Sparkles, Heart } from 'lucide-react';
import { STORE_DEFAULTS } from '@/lib/constants';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-950 text-slate-300 border-t border-amber-500/20 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Feature Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-white text-sm">100% Green Certified</h4>
              <p className="text-xs text-slate-400 mt-0.5">Approved by CSIR-NEERI & PESO with verifiable QR codes.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-white text-sm">7 KM Local Dispatch</h4>
              <p className="text-xs text-slate-400 mt-0.5">Dispatched directly from Velmala hub in under 45 minutes.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-white text-sm">Direct Factory Rates</h4>
              <p className="text-xs text-slate-400 mt-0.5">Up to 40% OFF retail prices with zero middleman markups.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-white text-sm">COD & Instant UPI</h4>
              <p className="text-xs text-slate-400 mt-0.5">Pay safely upon delivery OTP verification or via UPI QR.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-festive-crimson flex items-center justify-center text-white shadow-spark">
                <Flame className="w-6 h-6 fill-white" />
              </div>
              <span className="font-heading text-2xl font-black text-white">N CRACKERS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              N Crackers is Hyderabad&apos;s premier local fireworks platform providing genuine, environmentally responsible Green Crackers with fast doorstep delivery within 7 km of Velmala center.
            </p>
            <div className="pt-2 flex flex-col gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{STORE_DEFAULTS.CENTER_LOCATION.ADDRESS}</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{STORE_DEFAULTS.SUPPORT_PHONE} (8 AM - 11 PM)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{STORE_DEFAULTS.SUPPORT_EMAIL}</span>
              </div>
            </div>
          </div>

          {/* Fireworks Categories */}
          <div>
            <h4 className="font-heading font-bold text-white text-sm mb-4">Fireworks Range</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="#catalog" className="hover:text-amber-400 transition-colors">Golden Sparklers</Link></li>
              <li><Link href="#catalog" className="hover:text-amber-400 transition-colors">Aerial Sky Cakes</Link></li>
              <li><Link href="#catalog" className="hover:text-amber-400 transition-colors">Flower Pots (Anars)</Link></li>
              <li><Link href="#catalog" className="hover:text-amber-400 transition-colors">Zamin Chakkars</Link></li>
              <li><Link href="#catalog" className="hover:text-amber-400 transition-colors">Family Gift Hampers</Link></li>
              <li><Link href="#catalog" className="hover:text-amber-400 transition-colors">Rechargeable Electronic</Link></li>
            </ul>
          </div>

          {/* 7 KM Delivery Zones */}
          <div>
            <h4 className="font-heading font-bold text-white text-sm mb-4">7 KM Delivery Hub</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Velmala Village (0 - 2 km)</li>
              <li>Kollur ORR Township (2 - 4 km)</li>
              <li>Tellapur Border (3 - 5 km)</li>
              <li>Mokila Villas (4 - 6 km)</li>
              <li>Shankarpally Highway (5 - 7 km)</li>
              <li className="text-amber-500 font-semibold pt-1">Strict 7 KM haversine boundary</li>
            </ul>
          </div>

          {/* Safety & Compliance */}
          <div>
            <h4 className="font-heading font-bold text-white text-sm mb-4">Safety & Trust</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>CSIR-NEERI Green License</li>
              <li>PESO Safety Compliance</li>
              <li>Decibel Sound Ratings</li>
              <li>Reduced Smoke Formulations</li>
              <li>Pet Safety Tips</li>
              <li>Child Supervision Guide</li>
            </ul>
          </div>
        </div>

        {/* Legal & Safety Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <strong>Mandatory Safety Disclaimer:</strong> All fireworks supplied by N Crackers are 100% genuine Green Crackers manufactured under guidelines of the Hon&apos;ble Supreme Court of India, CSIR-NEERI, and Petroleum & Explosives Safety Organisation (PESO). Verify QR code on every packaging using the NEERI Green QR Scanner app. Firing of crackers must always be conducted outdoors under adult supervision with a bucket of water and sand nearby.
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} N Crackers. All Rights Reserved. Velmala, Hyderabad, Telangana 502300.
          </div>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-festive-crimson fill-festive-crimson" />
            <span>for a Safe & Radiant Diwali</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
