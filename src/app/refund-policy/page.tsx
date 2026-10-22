import React from 'react';
import Link from 'next/link';
import { RotateCcw, AlertOctagon, CheckCircle2, Clock, PhoneCall, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import { STORE_DEFAULTS } from '@/lib/constants';

export const metadata = {
  title: 'Cancellation & Refund Policy | Uniq Crackers Hyderabad',
  description: 'Understand the cancellation window, non-returnable fireworks policy, and verified refund timelines at Uniq Crackers.',
};

export default function RefundPolicyPage() {
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
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Customer Assurances &amp; Order Policies</span>
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Last Updated: October 2026 • Effective for Diwali 2026 Deliveries
          </p>
          <p className="text-xs text-slate-300">
            At <strong>{STORE_DEFAULTS.NAME}</strong>, we strive to deliver factory-fresh, safe fireworks directly to your doorstep in the 7 KM Velmala zone. Because fireworks are hazardous materials, strict safety regulations govern their cancellation, return, and refund.
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-amber-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Operational Notice</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            This is a draft business policy outlining the operational rules for order cancellations and refunds from our Velmala Hub counter. It does not constitute formal legal counsel. [Legal Entity / Formal Registration: To be finalized by store owner].
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Order Cancellation Window */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>1. Order Cancellation Window</span>
            </h2>
            <p>
              Due to our fast 30–45 minute local dispatch turnaround from Velmala Hub, cancellation windows are strictly time-sensitive:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
              <li>
                <strong>Allowed Cancellation Stage:</strong> You may cancel your order free of charge while its status is <strong>&quot;PENDING_REVIEW&quot;</strong> or <strong>&quot;CONFIRMED&quot;</strong> before it has been packed and handed over to our delivery rider. To cancel, call or WhatsApp our dispatch counter immediately at <strong>{STORE_DEFAULTS.SUPPORT_PHONE}</strong> with your Order ID (e.g. UC-2026-XXXX).
              </li>
              <li>
                <strong>Dispatched Orders:</strong> Once an order transitions to <strong>&quot;OUT_FOR_DELIVERY&quot;</strong> or a rider has left our hub with your secured fireworks container, cancellation is <strong>no longer possible</strong> due to transport safety restrictions and allocated rider transit costs.
              </li>
            </ul>
          </section>

          {/* Section 2: Non-Returnable Pyrotechnic Goods Policy */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>2. Non-Returnable Policy for Fireworks</span>
            </h2>
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs leading-relaxed">
              ⚠️ <strong>Statutory Pyrotechnic Transport Rule:</strong> Under Indian explosive safety regulations, pyrotechnic crackers, sparklers, and aerial fireworks are classified as hazardous combustible goods. Once a package has been accepted and verified via your 4-digit Delivery PIN, <strong>items cannot be returned, exchanged, or taken back into transit</strong>.
            </div>
            <p>
              We urge all customers to inspect the outer seal, box packaging, and item quantities in the presence of our delivery rider prior to sharing the 4-digit Delivery PIN.
            </p>
          </section>

          {/* Section 3: Damaged or Missing Items */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>3. Damaged in Transit or Missing Items</span>
            </h2>
            <p>
              In the rare event that a package suffers severe outer transit damage or an item from your order is missing upon opening:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-300">
              <li>Notify our Velmala dispatch helpdesk within <strong>2 hours of delivery</strong>.</li>
              <li>Send clear photographs of the delivered package, product boxes, and invoice via WhatsApp to <strong>{STORE_DEFAULTS.SUPPORT_PHONE}</strong>.</li>
              <li>Our dispatch manager will investigate the rider dispatch log. Verified missing or transit-damaged items will be replaced via priority express dispatch or refunded accordingly.</li>
            </ol>
          </section>

          {/* Section 4: Verified Refund Processing & Timelines */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>4. Verified Refund Processing &amp; Provider Timelines</span>
            </h2>
            <p>
              All approved refunds are audited against server transaction logs and returned strictly to the original source of payment:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
              <li>
                <strong>Instant UPI QR Orders:</strong> Refunds are credited back to the bank account linked with the verified 12-digit UPI UTR number provided at checkout. Refund timing is subject to the actual banking partner and NPCI settlement cycle (typically <strong>3 to 7 business days</strong>).
              </li>
              <li>
                <strong>Cards &amp; NetBanking Orders:</strong> Refunds are initiated through the payment gateway partner directly to the originating credit/debit card or net banking account. The actual posting timeline depends on your card-issuing bank (typically <strong>5 to 7 business days</strong>).
              </li>
              <li>
                <strong>Cash on Delivery (COD):</strong> Because payment occurs physically at the doorstep upon package inspection, there are no advance funds to refund if cancelled prior to handover.
              </li>
              <li>
                <strong>Zero Cash Refunds:</strong> We never issue physical cash refunds for transactions completed through UPI or online payment gateways.
              </li>
            </ul>
          </section>

          {/* Section 5: Support & Contact */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>5. How to Initiate a Cancellation or Refund Request</span>
            </h2>
            <p>
              To report an issue or request an order cancellation, contact our Velmala dispatch center with your <strong>Order Number (e.g. UC-2026-XXXX)</strong>:
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href={`tel:${STORE_DEFAULTS.SUPPORT_PHONE.replace(/[^\d]/g, '')}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Helpline: {STORE_DEFAULTS.SUPPORT_PHONE}</span>
              </a>
              <a
                href={`mailto:${STORE_DEFAULTS.SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Email: {STORE_DEFAULTS.SUPPORT_EMAIL}</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
