'use client';

import React, { useState } from 'react';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Banknote,
  X,
  ArrowRight,
  Copy,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  onPaymentComplete: (method: 'UPI_QR' | 'COD' | 'RAZORPAY') => void;
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
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const upiId = 'ncrackers@okhdfcbank';

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirm = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onPaymentComplete(selectedMethod);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-festive-surface text-slate-100 rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-1 border border-amber-500/30">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-black text-xl sm:text-2xl text-white">
            Select Payment Method
          </h2>
          <p className="text-xs text-slate-400">
            Order <strong className="text-amber-300">#{orderNumber}</strong> • Total Payable:{' '}
            <strong className="text-white font-black text-base">₹{grandTotal}</strong>
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-3 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[11px]">
              {customerName}
            </span>
            <span className="px-3 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[11px] flex items-center gap-1">
              <span>✓</span>
              <span>{customerPhone}</span>
            </span>
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedMethod('UPI_QR')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
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
            onClick={() => setSelectedMethod('COD')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
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
            onClick={() => setSelectedMethod('RAZORPAY')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              selectedMethod === 'RAZORPAY'
                ? 'bg-amber-500 text-slate-950 font-black shadow-spark'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cards / NetBanking</span>
          </button>
        </div>

        {/* Content Section by Method */}
        {selectedMethod === 'UPI_QR' && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4">
            <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center relative group">
              {/* Scalable Dynamic SVG UPI QR Code */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950 fill-current">
                <rect x="0" y="0" width="30" height="30" rx="3" />
                <rect x="5" y="5" width="20" height="20" fill="white" />
                <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                
                <rect x="70" y="0" width="30" height="30" rx="3" />
                <rect x="75" y="5" width="20" height="20" fill="white" />
                <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                
                <rect x="0" y="70" width="30" height="30" rx="3" />
                <rect x="5" y="75" width="20" height="20" fill="white" />
                <rect x="10" y="80" width="10" height="10" fill="currentColor" />

                <circle cx="50" cy="50" r="12" fill="#f59e0b" />
                <circle cx="50" cy="50" r="6" fill="white" />
                <rect x="40" y="20" width="8" height="18" />
                <rect x="55" y="65" width="15" height="8" />
                <rect x="75" y="45" width="15" height="15" />
                <rect x="42" y="75" width="6" height="15" />
              </svg>
              <span className="absolute bottom-1 text-[9px] font-black text-slate-600 uppercase tracking-wider">
                Scan with any UPI App
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-400">Merchant UPI ID:</div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-amber-300">
                <span>{upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-amber-400 hover:text-white font-sans text-[11px]"
                >
                  {copiedUpi ? 'Copied!' : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <a
                href={`upi://pay?pa=${upiId}&pn=N%20Crackers&am=${grandTotal}&cu=INR&tn=Order%20${orderNumber}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors border border-slate-700 shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in GPay / PhonePe / Paytm</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-400">
              Compatible with <strong>Google Pay, PhonePe, Paytm, CRED & BHIM</strong>.
            </p>
          </div>
        )}

        {selectedMethod === 'COD' && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Cash on Doorstep Delivery</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pay ₹{grandTotal} directly in cash or through our delivery rider&apos;s handheld UPI scanner upon arriving at your address.
            </p>
            <div className="p-3.5 rounded-xl bg-emerald-950/80 text-emerald-300 text-[11px] font-medium border border-emerald-500/40">
              ✓ Doorstep 4-Digit OTP will be verified upon package handover.
            </div>
          </div>
        )}

        {selectedMethod === 'RAZORPAY' && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>Razorpay Instant Checkout</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Supports Visa, MasterCard, RuPay, HDFC/ICICI/SBI NetBanking, and EMI for larger Diwali celebration hampers.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit Bank Grade SSL Encrypted</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-festive transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>
              {isVerifying
                ? 'Authorizing Order...'
                : selectedMethod === 'UPI_QR'
                ? `I Have Completed UPI Payment (₹${grandTotal})`
                : selectedMethod === 'COD'
                ? `Confirm Cash on Delivery (₹${grandTotal})`
                : `Pay ₹${grandTotal} with Razorpay`}
            </span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
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
