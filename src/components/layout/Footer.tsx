'use client';

import React from 'react';
import Link from 'next/link';
import {
  Flame,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Truck,
  Award,
  CheckCircle2,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-festive-obsidian text-slate-300 pt-16 pb-12 mt-20 border-t border-amber-500/20 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="container-custom space-y-12 relative z-10">
        {/* Top Trust & Value Proposition Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-800/80">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-black text-white text-sm">7 KM Express Delivery</h4>
              <p className="text-xs text-slate-400 mt-0.5">30-45 Mins doorstep delivery from Velmala Hub.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-black text-white text-sm">Low Smoke Selection</h4>
              <p className="text-xs text-slate-400 mt-0.5">Reduced particulate emission formulas.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-black text-white text-sm">Direct Factory Rates</h4>
              <p className="text-xs text-slate-400 mt-0.5">Wholesale prices direct to Hyderabad families.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-black text-white text-sm">Express Delivery & UPI</h4>
              <p className="text-xs text-slate-400 mt-0.5">Fast delivery with COD or instant UPI QR.</p>
            </div>
          </div>
        </div>

        {/* Multi-Column Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-slate-950 font-bold shadow-spark">
                <Flame className="w-5 h-5 fill-slate-950 text-slate-950" />
              </div>
              <span className="font-heading text-xl font-black text-white tracking-tight">UNIQ CRACKERS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Hyderabad&apos;s trusted platform for low-smoke festive crackers. Bringing light, joy, and safe festivities to Tellapur, Kollur, Mokila, and surrounding areas.
            </p>
            <div className="pt-2 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Velmala Village Center, Hyderabad 502300 (Exit 2 ORR)</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Helpline: +91 90000 00000 (9 AM – 11 PM)</span>
              </div>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="font-heading font-black text-white text-sm mb-4 text-amber-400 uppercase tracking-wider text-[11px]">
              Festive Catalog
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link href="/#catalog" className="hover:text-amber-400 transition-colors">Golden Sparklers</Link></li>
              <li><Link href="/#catalog" className="hover:text-amber-400 transition-colors">Aerial Sky Cakes</Link></li>
              <li><Link href="/#catalog" className="hover:text-amber-400 transition-colors">Flower Pots & Anars</Link></li>
              <li><Link href="/#catalog" className="hover:text-amber-400 transition-colors">Ground Chakkars</Link></li>
              <li><Link href="/#combos" className="hover:text-amber-400 transition-colors">Family Gift Hampers</Link></li>
            </ul>
          </div>

          {/* Customer Service & Policies */}
          <div>
            <h4 className="font-heading font-black text-white text-sm mb-4 text-amber-400 uppercase tracking-wider text-[11px]">
              Customer Service
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link href="/track-order" className="hover:text-amber-400 transition-colors">Track Order Live</Link></li>
              <li><Link href="/delivery-policy" className="hover:text-amber-400 transition-colors">7 KM Delivery Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-amber-400 transition-colors">Refund &amp; Cancellation</Link></li>
              <li><Link href="/safety" className="hover:text-amber-400 transition-colors">Fireworks Safety Guidelines</Link></li>
              <li><Link href="/#faq" className="hover:text-amber-400 transition-colors">Frequently Asked Questions</Link></li>
              <li><Link href="/admin" className="hover:text-amber-400 transition-colors">Store Admin &amp; Staff Portal</Link></li>
            </ul>
          </div>

          {/* Delivery Hubs Covered */}
          <div>
            <h4 className="font-heading font-black text-white text-sm mb-4 text-amber-400 uppercase tracking-wider text-[11px]">
              7 KM Hub Locations
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {['Velmala', 'Tellapur', 'Kollur', 'Mokila', 'Osman Nagar', 'Neopolis', 'Edulanagulapally', 'Nallagandla'].map((loc) => (
                <span key={loc} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                  {loc}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-emerald-400 mt-3 font-semibold">
              ⚡ Free Express Delivery on orders above ₹3,000!
            </p>
          </div>
        </div>

        {/* Bottom Copyright & Compliance */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Uniq Crackers Hyderabad. All Rights Reserved. Community Fireworks Delivery.</p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px]">
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-amber-400 transition-colors">
              Terms &amp; Conditions
            </Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-amber-400 transition-colors">
              Refund Policy
            </Link>
            <span>•</span>
            <Link href="/delivery-policy" className="hover:text-amber-400 transition-colors">
              Delivery Policy
            </Link>
            <span>•</span>
            <Link href="/safety" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
              Safety Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
