'use client';

import React, { useState } from 'react';
import {
  QrCode,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Banknote,
  X,
  ArrowRight,
  Copy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export interface PaymentCompletionData {
  method: 'UPI_QR' | 'COD' | 'RAZORPAY';
  upiUtr?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  onPaymentComplete: (data: PaymentCompletionData) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  orderNumber,
  customerName,
  customerPhone,
  onPaymentComplete,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'UPI_QR' | 'COD' | 'RAZORPAY'>('UPI_QR');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiUtr, setUpiUtr] = useState('');
  const [utrError, setUtrError] = useState<string | null>(null);
  const [showUtrHelp, setShowUtrHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [gatewayConfig, setGatewayConfig] = useState<{
    razorpayAvailable: boolean;
    razorpayKeyId: string | null;
  }>({
    razorpayAvailable: false,
    razorpayKeyId: null,
  });

  React.useEffect(() => {
    fetch('/api/payment/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setGatewayConfig({
            razorpayAvailable: Boolean(data.data.razorpayAvailable),
            razorpayKeyId: data.data.razorpayKeyId || null,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [qrMode, setQrMode] = useState<'official' | 'dynamic'>('official');

  if (!isOpen) return null;

  const upiId = 'tejareddysheri72-3@okaxis';
  const payeeName = 'Teja Reddy Sheri';
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`;
  const dynamicQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(upiPayUrl)}`;
  const officialScannerImageUrl = '/images/upi_qr.jpg';

  const cleanUtr = upiUtr.replace(/[^\d]/g, '').slice(0, 12);
  const isUtrComplete = cleanUtr.length === 12;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirm = () => {
    setUtrError(null);

    if (selectedMethod === 'UPI_QR') {
      if (cleanUtr.length !== 12) {
        setUtrError('Please enter the exact 12-digit UPI Reference Number (UTR) from your payment receipt.');
        return;
      }

      setIsSubmitting(true);
      onPaymentComplete({
        method: 'UPI_QR',
        upiUtr: cleanUtr,
      });
      setIsSubmitting(false);
      return;
    }

    if (selectedMethod === 'COD') {
      setIsSubmitting(true);
      onPaymentComplete({
        method: 'COD',
      });
      setIsSubmitting(false);
      return;
    }

    if (selectedMethod === 'RAZORPAY') {
      if (!gatewayConfig.razorpayAvailable) {
        setSelectedMethod('UPI_QR');
        return;
      }
      setIsSubmitting(true);
      onPaymentComplete({
        method: 'RAZORPAY',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="relative w-full max-w-lg bg-festive-surface text-slate-100 rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close payment modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-1 border border-amber-500/30">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 id="payment-modal-title" className="font-heading font-black text-xl sm:text-2xl text-white">
            Complete Order Payment
          </h2>
          <p className="text-xs text-slate-400">
            Order <strong className="text-amber-300">#{orderNumber}</strong> • Total Payable:{' '}
            <strong className="text-white font-black text-base">₹{grandTotal}</strong>
          </p>
          <div className="flex items-center justify-center gap-2 pt-0.5">
            <span className="px-3 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[11px]">
              {customerName}
            </span>
            <span className="px-3 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[11px] flex items-center gap-1">
              <span>✓</span>
              <span>+91 {customerPhone}</span>
            </span>
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedMethod('UPI_QR');
              setUtrError(null);
            }}
            className={`py-2.5 px-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
              selectedMethod === 'UPI_QR'
                ? 'bg-amber-500 text-slate-950 font-black shadow-spark'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Instant UPI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMethod('COD');
              setUtrError(null);
            }}
            className={`py-2.5 px-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
              selectedMethod === 'COD'
                ? 'bg-amber-500 text-slate-950 font-black shadow-spark'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Cash on Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMethod('RAZORPAY');
              setUtrError(null);
            }}
            className={`py-2.5 px-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
              selectedMethod === 'RAZORPAY'
                ? 'bg-amber-500 text-slate-950 font-black shadow-spark'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cards / NetBanking</span>
          </button>
        </div>

        {/* 1. INSTANT UPI FLOW WITH MANDATORY UTR */}
        {selectedMethod === 'UPI_QR' && (
          <div className="space-y-4">
            {/* Step 1: Scan & Pay Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
                <span className="text-amber-400 uppercase text-[10px] tracking-wider font-extrabold flex items-center gap-1">
                  <span>Step 1: Scan &amp; Pay via UPI</span>
                </span>
                <span className="font-mono text-emerald-400 font-extrabold text-sm">₹{grandTotal}</span>
              </div>

              {/* Payee Verification Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Verified Payee: <strong className="text-white font-extrabold">Teja Reddy Sheri</strong></span>
              </div>

              {/* QR Mode Switcher */}
              <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setQrMode('official')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    qrMode === 'official'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Official GPay Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('dynamic')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    qrMode === 'dynamic'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Auto-fill ₹{grandTotal} QR
                </button>
              </div>

              {/* QR Image Display */}
              <div className="relative mx-auto bg-white p-2 rounded-2xl border-2 border-amber-500/40 shadow-2xl flex items-center justify-center overflow-hidden max-w-[240px]">
                {qrMode === 'official' ? (
                  /* Official Google Pay Scanner uploaded by store owner */
                  <div className="w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={officialScannerImageUrl}
                      alt="Teja Reddy Sheri Official GPay Scanner"
                      className="w-full h-auto object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  /* Dynamic QR with pre-filled amount */
                  <div className="relative w-48 h-48 flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dynamicQrImageUrl}
                      alt={`Scan to Pay ₹${grandTotal} to Teja Reddy Sheri`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* UPI ID + Deep Link */}
              <div className="space-y-2 pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-amber-300">
                  <span>UPI ID: {upiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-amber-400 hover:text-white font-sans text-[11px] flex items-center gap-1 transition-colors"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? (
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="underline">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct UPI App Intent Trigger (Mobile) */}
                <div>
                  <a
                    href={upiPayUrl}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open in GPay / PhonePe / Paytm / CRED</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-400">
                  Accepts Google Pay, PhonePe, Paytm, BHIM, CRED &amp; all UPI apps.
                </p>
              </div>
            </div>

            {/* Step 2: Mandatory 12-Digit UTR Input */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="upi-utr-input" className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <span>Step 2: Enter 12-Digit UPI Ref / UTR No.</span>
                  <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowUtrHelp(!showUtrHelp)}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Where is UTR?</span>
                </button>
              </div>

              {showUtrHelp && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-300 leading-relaxed space-y-1 animate-in fade-in duration-150">
                  <div className="font-bold text-white">How to find your 12-digit UPI UTR Number:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li><strong>Google Pay:</strong> Open payment &gt; look for <em>UPI transaction ID</em> (12 digits).</li>
                    <li><strong>PhonePe:</strong> Open transaction history &gt; look for <em>UTR</em> or <em>Bank Ref No</em>.</li>
                    <li><strong>Paytm:</strong> View payment receipt &gt; copy the 12-digit <em>UPI Ref No</em>.</li>
                  </ul>
                </div>
              )}

              <div className="relative">
                <input
                  id="upi-utr-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  placeholder="Enter 12-digit UTR (e.g. 428190283741)"
                  value={cleanUtr}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/[^\d]/g, '').slice(0, 12);
                    setUpiUtr(onlyNums);
                    if (utrError) setUtrError(null);
                  }}
                  className="w-full px-4 py-3 text-sm font-mono font-bold tracking-widest bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-white placeholder:text-slate-500 placeholder:font-sans placeholder:tracking-normal"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold ${isUtrComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {cleanUtr.length}/12
                </span>
              </div>

              {utrError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{utrError}</span>
                </div>
              )}

              {isUtrComplete && !utrError && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Valid 12-digit UPI reference format ready for bank verification.</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                🛡️ <strong>Anti-Fraud Protection:</strong> Your order will be placed under <em>Pending Bank Verification</em>. Our Velmala counter verifies the credit before allocating crackers stock.
              </div>
            </div>
          </div>
        )}

        {/* 2. CASH ON DELIVERY (DOORSTEP) */}
        {selectedMethod === 'COD' && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 text-left">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Cash on Doorstep Delivery</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pay <strong>₹{grandTotal}</strong> directly in cash or through our rider&apos;s handheld UPI scanner upon arriving at your address in the 7 KM Velmala zone.
            </p>
            <div className="p-3.5 rounded-xl bg-emerald-950/80 text-emerald-300 text-xs font-medium border border-emerald-500/40 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Advance Payment Required</span>
              </div>
              <p className="text-[11px] text-slate-300">
                You will receive a 4-digit doorstep delivery PIN upon confirmation to verify package handover.
              </p>
            </div>
          </div>
        )}

        {/* 3. CARDS / NETBANKING */}
        {selectedMethod === 'RAZORPAY' && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 text-left">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>Cards &amp; NetBanking Checkout</span>
            </div>
            {gatewayConfig.razorpayAvailable ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                Supports Visa, MasterCard, RuPay, HDFC/ICICI/SBI NetBanking, and credit card EMI options via Razorpay.
              </p>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Gateway Setup In Progress</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Card &amp; NetBanking gateway is currently awaiting merchant dashboard credentials (<code className="text-amber-300 font-mono text-[10px]">RAZORPAY_KEY_SECRET</code>).
                </p>
                <p className="text-[11px] text-amber-400 font-bold">
                  👉 For immediate 35-min delivery from our Velmala Hub, please choose Instant UPI QR or Cash on Delivery below.
                </p>
              </div>
            )}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
              ⚡ <strong>Diwali Express Tip:</strong> Instant UPI QR and Cash on Delivery are verified instantly for priority dispatch.
            </div>
          </div>
        )}

        {/* Submit Action Button */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isSubmitting || (selectedMethod === 'UPI_QR' && !isUtrComplete)}
            onClick={handleConfirm}
            className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-festive ${
              selectedMethod === 'UPI_QR' && !isUtrComplete
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-spark cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <span>Placing Order &amp; Verifying...</span>
            ) : selectedMethod === 'UPI_QR' ? (
              isUtrComplete ? (
                <>
                  <span>Submit Order with UTR #{cleanUtr}</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              ) : (
                <span>Enter 12-Digit UTR to Place Order ({cleanUtr.length}/12)</span>
              )
            ) : selectedMethod === 'COD' ? (
              <>
                <span>Confirm Cash on Delivery (₹{grandTotal})</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            ) : gatewayConfig.razorpayAvailable ? (
              <>
                <span>Proceed with Cards / NetBanking (₹{grandTotal})</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            ) : (
              <>
                <span>Switch to Instant UPI QR (₹{grandTotal})</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-slate-400 hover:text-white font-semibold py-1.5 transition-colors"
          >
            Return to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
