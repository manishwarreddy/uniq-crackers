import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Eye, FileText, PhoneCall, Mail, MapPin, ArrowLeft } from 'lucide-react';
import { STORE_DEFAULTS } from '@/lib/constants';

export const metadata = {
  title: 'Privacy Policy | Uniq Crackers Hyderabad',
  description: 'Learn how Uniq Crackers collects, uses, and protects customer information for 7 KM local delivery in Velmala, Hyderabad.',
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Customer Data Protection</span>
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Last Updated: October 2026 • Effective for the Diwali 2026 Festive Season
          </p>
          <p className="text-xs text-slate-300">
            This Privacy Policy explains how <strong>{STORE_DEFAULTS.NAME}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, protects, and discloses personal information when you use our local delivery service in Hyderabad.
          </p>
        </div>

        {/* Notice Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-amber-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Operational Dispatch Notice</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            This is a draft business policy tailored to our active e-commerce and local dispatch operations from our Velmala Hub center (502300). It is not a substitute for formal, jurisdiction-specific legal counsel. [Legal Entity / Formal Registration: To be finalized by store owner].
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>1. Information We Collect</span>
            </h2>
            <p>
              We only collect information directly necessary to confirm your customer identity, process your order, calculate delivery eligibility within our 7 km boundary, and coordinate doorstep handover:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li>
                <strong>Contact Information:</strong> Your full name (optional) and your 10-digit Indian mobile number (mandatory for mobile sign-in, OTP verification, order tracking, and rider coordination).
              </li>
              <li>
                <strong>Delivery Location &amp; Coordinates:</strong> Your doorstep address, chosen locality (e.g. Velmala, Tellapur, Kollur, Mokila, Osman Nagar, Edulanagulapally), and GPS latitude/longitude (used strictly via the Haversine formula to verify whether you fall within our 7.0 km delivery radius and calculate the slab-based delivery fee).
              </li>
              <li>
                <strong>Order &amp; Cart Details:</strong> Selected fireworks items, quantities, coupon codes applied, and total billing amounts.
              </li>
              <li>
                <strong>Payment Verification References:</strong> If paying via Instant UPI QR, we collect the 12-digit UPI Reference Number / UTR for bank credit reconciliation. If paying online, the payment gateway provides a transaction reference token. <em>We never see or store your UPI MPIN, bank passwords, or debit/credit card CVVs.</em>
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>2. Why We Collect This Information &amp; How It Is Used</span>
            </h2>
            <p>Your personal data is used solely for legitimate operational purposes:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li>
                <strong>7 KM Geofenced Dispatch:</strong> Ensuring orders are deliverable from our Velmala Central Hub and computing verified delivery fee slabs. If an address is outside 7 km, our system returns: <em>&quot;We don&apos;t deliver to your location&quot;</em>.
              </li>
              <li>
                <strong>Doorstep Handover Verification:</strong> Generating a unique 4-digit Delivery PIN for each order, ensuring pyrotechnic goods are only handed over to verified recipients.
              </li>
              <li>
                <strong>Transactional Status Updates:</strong> Dispatching SMS and WhatsApp notifications regarding order confirmation, dispatch times, live tracking links, and electronic receipts.
              </li>
              <li>
                <strong>Anti-Fraud Protection:</strong> Verifying bank credit for UPI UTRs prior to stock allocation to prevent fraudulent claims.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>3. How We Protect Your Personal Information</span>
            </h2>
            <p>
              We implement industry-standard technical and organizational security controls to safeguard your data:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li>
                <strong>Cryptographic Session Tokens:</strong> Customer authentication sessions and order lookup links use signed HMAC tokens. Unauthorized visitors cannot view your phone number, address, or order history.
              </li>
              <li>
                <strong>Zero Password Storage:</strong> Authentication is handled via time-limited 6-digit OTPs verified on our backend with cryptographic hashing, attempt limiting, and rate-limiting cooldowns.
              </li>
              <li>
                <strong>Private Customer Isolation:</strong> A customer verified under Phone A cannot query, cancel, or modify orders belonging to Phone B.
              </li>
              <li>
                <strong>No Third-Party Data Selling:</strong> We do not sell, rent, or trade your contact information to advertising networks or third-party marketing brokers.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>4. Data Retention &amp; Customer Assistance</span>
            </h2>
            <p>
              Order records are retained for statutory accounting and delivery dispute resolution during the festive season. You may contact our dispatch team at any time to inspect your active orders, correct your contact number, or request deletion of personal records after delivery completion.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href={`tel:${STORE_DEFAULTS.SUPPORT_PHONE.replace(/[^\d]/g, '')}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 hover:text-white font-bold text-xs transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Helpdesk: {STORE_DEFAULTS.SUPPORT_PHONE}</span>
              </a>
              <a
                href={`mailto:${STORE_DEFAULTS.SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email: {STORE_DEFAULTS.SUPPORT_EMAIL}</span>
              </a>
            </div>
          </section>
        </div>

        {/* Hub Location Box */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
          <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-bold">Uniq Crackers Central Dispatch Hub</strong>
            <span>{STORE_DEFAULTS.CENTER_LOCATION.ADDRESS} (Exit 2 ORR, Hyderabad 502300)</span>
            <div className="text-[11px] text-slate-400 mt-1">Operating Hours: 8:00 AM – 10:00 PM IST during Diwali</div>
          </div>
        </div>
      </div>
    </div>
  );
}
