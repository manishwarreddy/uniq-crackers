import React from 'react';
import Link from 'next/link';
import { FileText, ShieldAlert, CheckCircle2, MapPin, PhoneCall, AlertTriangle, ArrowLeft } from 'lucide-react';
import { STORE_DEFAULTS, DELIVERY_PRICING_SLABS } from '@/lib/constants';

export const metadata = {
  title: 'Terms & Conditions | Uniq Crackers Hyderabad',
  description: 'Terms and conditions governing purchases, 7 KM local delivery, payments, and fireworks safety at Uniq Crackers.',
};

export default function TermsAndConditionsPage() {
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
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Store Agreement</span>
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white">
            Terms and Conditions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Last Updated: October 2026 • Governs Festive Orders &amp; 7 KM Express Delivery
          </p>
          <p className="text-xs text-slate-300">
            Welcome to <strong>{STORE_DEFAULTS.NAME}</strong>. By accessing our platform, adding items to your festive cart, or placing an order, you agree to comply with and be bound by the following terms and operational conditions.
          </p>
        </div>

        {/* Disclaimer Alert */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Notice Regarding Legal Terms</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            These terms represent draft business operational policies for festive fireworks sales and delivery within our Hyderabad service boundary. They do not constitute formal legal counsel. [Legal Entity / Formal Registration: To be finalized by store owner].
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>1. Eligibility &amp; Age Requirements</span>
            </h2>
            <p>
              Under applicable Indian pyrotechnic and explosive regulations, fireworks, sparklers, and celebratory crackers must only be purchased and received by adults aged <strong>18 years or older</strong>. By placing an order, you confirm that you are at least 18 years old and will ensure that all fireworks handling occurs under responsible adult supervision.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>2. 7 KM Geofenced Delivery Area &amp; Slabs</span>
            </h2>
            <p>
              To ensure rider safety and 30–45 minute delivery times, <strong>{STORE_DEFAULTS.NAME}</strong> operates strictly within a <strong>{STORE_DEFAULTS.DEFAULT_RADIUS_KM} KM radius</strong> from our central hub in Velmala Village (17.5029° N, 78.2573° E, Exit 2 ORR).
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li>
                <strong>Out-of-Area Policy:</strong> Any address or GPS location situated beyond 7.0 km cannot be serviced. The checkout system will reject the address with the exact message: <em>&quot;We don&apos;t deliver to your location&quot;</em>.
              </li>
              <li>
                <strong>Minimum Order Value:</strong> ₹{STORE_DEFAULTS.MIN_ORDER_VALUE} is required to initiate delivery.
              </li>
              <li>
                <strong>Free Delivery:</strong> Orders with a merchandise subtotal of ₹{STORE_DEFAULTS.DEFAULT_FREE_DELIVERY_THRESHOLD} or higher receive <strong>100% Free Express Delivery</strong>.
              </li>
              <li>
                <strong>Delivery Fee Slabs (for orders below ₹{STORE_DEFAULTS.DEFAULT_FREE_DELIVERY_THRESHOLD}):</strong>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DELIVERY_PRICING_SLABS.map((slab) => (
                    <div key={slab.label} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="font-bold text-white">{slab.label}</div>
                      <div className="text-amber-400 font-black mt-0.5">₹{slab.fee} dispatch fee</div>
                    </div>
                  ))}
                </div>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>3. Order Placement, 15-Minute Hold &amp; Pricing</span>
            </h2>
            <p>
              All prices shown on our website are inclusive of applicable taxes. When you initiate the checkout flow, items in your cart are temporarily reserved for <strong>15 minutes</strong> to prevent inventory overselling during peak festive hours.
            </p>
            <p>
              Prices, discounts, and coupons are verified authoritatively by our server. Manipulated client totals will be automatically rejected by our pricing engine.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>4. Payment Modes &amp; Verification Procedures</span>
            </h2>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
              <li>
                <strong>Instant UPI QR (Recommended):</strong> You scan the official QR code or open a direct UPI intent link (Google Pay, PhonePe, Paytm, CRED). You must enter the <strong>exact 12-digit UPI Reference / UTR Number</strong> from your payment receipt. The order is placed under <em>Awaiting Bank Verification</em> and will be confirmed once credit is verified by our Velmala hub counter.
              </li>
              <li>
                <strong>Cash on Delivery (COD):</strong> Available throughout the 7 KM delivery zone. Payment is collected in cash or via our rider&apos;s handheld UPI scanner upon physical arrival at your address.
              </li>
              <li>
                <strong>Cards &amp; NetBanking:</strong> Subject to third-party payment gateway uptime. All gateway transactions adhere to standard RBI two-factor authentication.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>5. 4-Digit Handover PIN &amp; Safe Receipt</span>
            </h2>
            <p>
              For security, every confirmed order is assigned a private <strong>4-digit Delivery PIN</strong> visible on your live order tracking screen. You must verbally provide this PIN to our delivery rider to verify the package handover. Pyrotechnic packages will not be left unattended at gates or doorsteps without PIN confirmation.
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>6. Safety Responsibility &amp; Limitation of Liability</span>
            </h2>
            <p>
              Fireworks are combustible materials. Customers must strictly read and adhere to our <strong>Fireworks Safety Guidelines</strong>. <strong>{STORE_DEFAULTS.NAME}</strong> and its delivery partners shall not be held liable for any bodily injury, property damage, fire accidents, or municipal noise violations resulting from negligent handling, indoor ignition, or failure to follow product warning labels.
            </p>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>7. Governing Law &amp; Dispute Resolution</span>
            </h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad / Sangareddy District, Telangana.
            </p>
            <div className="pt-2 text-xs text-slate-400">
              For operational questions or assistance, contact our dispatch helpdesk at <strong>{STORE_DEFAULTS.SUPPORT_PHONE}</strong> or <strong>{STORE_DEFAULTS.SUPPORT_EMAIL}</strong>.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
