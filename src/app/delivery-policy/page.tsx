import React from 'react';
import Link from 'next/link';
import { Truck, MapPin, Clock, ShieldCheck, CheckCircle2, AlertTriangle, PhoneCall, ArrowLeft } from 'lucide-react';
import { STORE_DEFAULTS, DELIVERY_PRICING_SLABS } from '@/lib/constants';

export const metadata = {
  title: 'Delivery & Shipping Policy | Uniq Crackers Hyderabad',
  description: 'Learn about our 7 KM local delivery radius from Velmala Hub, delivery fee slabs, 30-45 minute express times, and 4-digit handover PIN.',
};

export default function DeliveryPolicyPage() {
  return (
    <div className="min-h-screen bg-festive-obsidian text-slate-100 py-12 sm:py-16">
      <div className="container-custom max-w-4xl space-y-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Fireworks Catalog</span>
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-amber-500/20 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Local Express Dispatch</span>
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white">
            Delivery Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Last Updated: October 2026 • 35-Min Express Doorstep Delivery within 7 KM
          </p>
          <p className="text-xs text-slate-300">
            <strong>{STORE_DEFAULTS.NAME}</strong> operates a dedicated local fulfillment hub at Velmala Village, Hyderabad (502300). This policy details our 7 km service radius, distance slabs, delivery timing, and package handover protocols.
          </p>
        </div>

        {/* Operational Notice Box */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-amber-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Operational Dispatch Notice</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            This is a draft business policy describing our active local delivery configuration. It does not constitute formal legal counsel. [Legal Entity / Formal Registration: To be finalized by store owner].
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1: The 7 KM Delivery Boundary */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>1. Configured 7 KM Delivery Radius &amp; Hub Center</span>
            </h2>
            <p>
              Due to local transport guidelines and to guarantee rapid 30–45 minute delivery, our delivery service is strictly geofenced within a <strong>{STORE_DEFAULTS.DEFAULT_RADIUS_KM} KM radius</strong> from our central dispatch location:
            </p>
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-white">Central Dispatch Hub Location:</div>
              <div>{STORE_DEFAULTS.CENTER_LOCATION.ADDRESS}</div>
              <div className="text-amber-400 font-mono text-[11px]">
                Coordinates: {STORE_DEFAULTS.CENTER_LOCATION.LATITUDE}° N, {STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE}° E • Plus Code: {STORE_DEFAULTS.CENTER_LOCATION.PLUS_CODE}
              </div>
            </div>
            <p>
              Localities serviced include: <strong>Velmala Village</strong>, <strong>Tellapur</strong> (My Home Bhooja / Main Road), <strong>Kollur</strong> (ORR Exit 2), <strong>Mokila</strong> (Green Meadows &amp; Villas), <strong>Osman Nagar</strong>, <strong>Edulanagulapally</strong>, and neighboring residential gated communities within 7 km.
            </p>
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
              <strong>Out-of-Area Policy:</strong> If a customer provides an address or GPS pin situated beyond 7.0 km, our application immediately rejects the order with the exact system message: <span className="font-bold text-white">&quot;We don&apos;t deliver to your location&quot;</span>.
            </div>
          </section>

          {/* Section 2: Order Values & Distance Fee Slabs */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. Delivery Fee Slabs &amp; Minimum Order Value</span>
            </h2>
            <p>
              Our delivery charges are based on server-verified distance slabs from our Velmala Hub center, rather than an arbitrary flat fee:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DELIVERY_PRICING_SLABS.map((slab) => (
                <div key={slab.label} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{slab.minKm} km to {slab.maxKm} km</div>
                  <div className="text-sm font-black text-white">{slab.label}</div>
                  <div className="text-base font-black text-amber-400 pt-1">₹{slab.fee}</div>
                </div>
              ))}
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300 pt-2">
              <li>
                <strong>Minimum Order Value:</strong> The minimum shopping cart merchandise value is <strong>₹{STORE_DEFAULTS.MIN_ORDER_VALUE}</strong>. Orders below this threshold cannot be placed.
              </li>
              <li>
                <strong>Free Express Delivery:</strong> All orders with a merchandise subtotal of <strong>₹{STORE_DEFAULTS.DEFAULT_FREE_DELIVERY_THRESHOLD} or higher</strong> receive <strong>100% Free Express Delivery</strong> (the delivery fee is automatically set to ₹0).
              </li>
            </ul>
          </section>

          {/* Section 3: Delivery Times & Operating Hours */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>3. Delivery Timelines &amp; Operating Hours</span>
            </h2>
            <p>
              Our dedicated delivery fleet operates during the festive period from <strong>8:00 AM to 10:00 PM IST</strong>. Standard deliveries within the 7 km perimeter typically arrive at your doorstep in <strong>30 to 45 minutes</strong> after order confirmation.
            </p>
            <p>
              During peak Diwali rush hours, road traffic at ORR Exit 2 and Tellapur junctions may result in minor delays. You can view real-time delivery milestones on our <Link href="/track-order" className="text-amber-400 underline font-bold">Track Order Live</Link> portal.
            </p>
          </section>

          {/* Section 4: 4-Digit Handover PIN Verification */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>4. 4-Digit Delivery PIN Verification Protocol</span>
            </h2>
            <p>
              To ensure safety and prevent unauthorized receipt of pyrotechnic merchandise:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-300">
              <li>When your order is placed, a unique, cryptographically generated <strong>4-digit Delivery PIN</strong> is created.</li>
              <li>This PIN is displayed privately on your order tracking page and included in your order confirmation.</li>
              <li>Upon arrival, our delivery rider will request this 4-digit PIN before releasing the fireworks package.</li>
              <li>Packages will not be left at unattended gates, security checkpoints, or common areas without explicit PIN confirmation by an adult.</li>
            </ol>
          </section>

          {/* Section 5: Transit Safety & Weather Protocol */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>5. Pyrotechnic Transit Safety</span>
            </h2>
            <p>
              All fireworks orders are transported in moisture-resistant, fire-retardant outer containers. Riders are strictly prohibited from smoking, using open flames, or carrying flammable accelerants during transit. In the event of heavy rain or severe thunderstorms, dispatches may be paused briefly until safe road conditions resume.
            </p>
            <div className="pt-2 text-xs text-slate-400">
              For delivery status queries, please contact our dispatch counter at <strong>{STORE_DEFAULTS.SUPPORT_PHONE}</strong>.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
