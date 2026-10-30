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
  UploadCloud,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

export interface PaymentCompletionData {
  method: 'UPI_QR' | 'COD' | 'RAZORPAY';
  upiUtr?: string;
  screenshotFile?: File;
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

  // Merchant UPI Configuration
  const [upiConfig, setUpiConfig] = useState<{
    configured: boolean;
    merchantUpiId: string | null;
    merchantName: string | null;
    shopName: string;
  }>({
    configured: true,
    merchantUpiId: 'tejareddysheri72-3@okaxis', // Existing codebase baseline
    merchantName: 'Teja Reddy Sheri',
    shopName: 'Uniq Crackers',
  });

  // UPI App Launch and Fallback Message State
  const [showFallbackMessage, setShowFallbackMessage] = useState(false);

  // Payment Screenshot State
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

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
          if (data.data.merchantUpiId !== undefined) {
            setUpiConfig({
              configured: Boolean(data.data.upiConfigured),
              merchantUpiId: data.data.merchantUpiId || null,
              merchantName: data.data.merchantName || 'Teja Reddy Sheri',
              shopName: data.data.shopName || 'Uniq Crackers',
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Cleanup object URL on unmount
  React.useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

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

  const upiId = upiConfig.merchantUpiId || 'tejareddysheri72-3@okaxis';
  const payeeName = upiConfig.merchantName || 'Teja Reddy Sheri';
  const shopName = upiConfig.shopName || 'Uniq Crackers';

  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`${shopName} Order ${orderNumber}`)}`;
  const dynamicQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(upiPayUrl)}`;
  const officialScannerImageUrl = '/images/upi_qr.jpg';

  const cleanUtr = upiUtr.replace(/[^\d]/g, '').slice(0, 12);
  const isUtrComplete = cleanUtr.length === 12;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handlePayWithUpiClick = () => {
    // Show fallback notice if no app launches within 2 seconds
    setTimeout(() => {
      setShowFallbackMessage(true);
    }, 2000);
  };

  const handleScreenshotChange = (file: File | null) => {
    setScreenshotError(null);
    if (!file) {
      setScreenshotFile(null);
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setScreenshotError('Screenshot must be 5 MB or smaller.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setScreenshotError('Please upload a valid JPG, PNG, or WebP image.');
      return;
    }

    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleConfirm = () => {
    setUtrError(null);

    if (selectedMethod === 'UPI_QR') {
      if (!upiConfig.configured || !upiConfig.merchantUpiId) {
        setUtrError('Merchant UPI ID is not configured. Please contact support or select Cash on Delivery.');
        return;
      }

      if (cleanUtr.length !== 12) {
        setUtrError('Please enter the exact 12-digit UPI Reference Number (UTR) from your payment receipt.');
        return;
      }

      setIsSubmitting(true);
      onPaymentComplete({
        method: 'UPI_QR',
        upiUtr: cleanUtr,
        screenshotFile: screenshotFile || undefined,
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
          !upiConfig.configured || !upiConfig.merchantUpiId ? (
            <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-3 animate-in fade-in duration-200">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-heading font-black text-white text-base">
                UPI Payments Not Configured
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                Merchant UPI ID has not been set up in store configuration. Please choose <strong>Cash on Delivery (Doorstep)</strong> to complete your order.
              </p>
              <button
                type="button"
                onClick={() => setSelectedMethod('COD')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-spark transition-colors inline-flex items-center gap-1.5"
              >
                <span>Switch to Cash on Delivery (COD)</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          ) : (
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

                {/* Prominent "Pay with UPI" Button for Prepaid Orders */}
                <div className="pt-2">
                  <a
                    href={upiPayUrl}
                    onClick={handlePayWithUpiClick}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-spark active:scale-[0.99]"
                  >
                    <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 shrink-0" />
                    <span>Pay ₹{grandTotal} with UPI (Google Pay / PhonePe / Paytm)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                  </a>
                </div>

                {/* Fallback notice if no UPI app opens */}
                {showFallbackMessage && (
                  <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2 text-left animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 font-black text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Did no UPI app open on your device?</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      You can scan the QR code above directly from your UPI app (Google Pay, PhonePe, Paytm, CRED) or transfer <strong className="text-white font-mono">₹{grandTotal}</strong> directly to UPI ID:
                    </p>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-700 font-mono font-bold text-amber-300 text-xs">
                      <span className="truncate pr-2">{upiId}</span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-sans font-bold transition-colors flex items-center gap-1 shrink-0"
                      >
                        {copiedUpi ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-400">
                  Accepts Google Pay, PhonePe, Paytm, BHIM, CRED &amp; all UPI apps.
                </p>
              </div>
            </div>

            {/* Step 2: 12-Digit UTR + Payment Screenshot Upload */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="upi-utr-input" className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <span>Step 2: Enter UTR &amp; Upload Screenshot</span>
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

              {/* 12-Digit UTR Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>UPI Reference Number (UTR) <span className="text-rose-400">*</span></span>
                  <span className={`font-mono ${isUtrComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {cleanUtr.length}/12
                  </span>
                </div>
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
              </div>

              {/* Payment Screenshot File Uploader */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>Payment Screenshot Proof</span>
                  <span className="text-[10px] text-amber-400/90 font-medium">Max 5MB (JPG, PNG, WebP)</span>
                </div>

                {!screenshotFile ? (
                  <label className="border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition-colors text-center">
                    <UploadCloud className="w-6 h-6 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Click to upload payment screenshot
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Take a screenshot of the successful transaction receipt
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleScreenshotChange(e.target.files?.[0] || null)}
                    />
                  </label>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {screenshotPreview ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={screenshotPreview}
                          alt="Screenshot preview"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="overflow-hidden text-left">
                        <div className="text-xs font-bold text-emerald-400 truncate">
                          {screenshotFile.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(screenshotFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to verify
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScreenshotChange(null)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950 transition-colors shrink-0"
                      title="Remove screenshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {screenshotError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{screenshotError}</span>
                  </div>
                )}
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
                🛡️ <strong>Private Storage &amp; Anti-Fraud:</strong> Screenshots are stored in an encrypted private vault. Payment remains pending until our store administrator manually verifies credit in the receiving bank account.
              </div>
            </div>
          </div>
        ))}

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
                  Card &amp; NetBanking gateway is currently undergoing scheduled maintenance.
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
            disabled={
              isSubmitting ||
              (selectedMethod === 'UPI_QR' && (!upiConfig.configured || !upiConfig.merchantUpiId || !isUtrComplete))
            }
            onClick={() => {
              if (selectedMethod === 'UPI_QR' && (!upiConfig.configured || !upiConfig.merchantUpiId)) {
                setSelectedMethod('COD');
                return;
              }
              handleConfirm();
            }}
            className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-festive ${
              selectedMethod === 'UPI_QR' && (!upiConfig.configured || !upiConfig.merchantUpiId || !isUtrComplete)
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-spark cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <span>Placing Order &amp; Verifying...</span>
            ) : selectedMethod === 'UPI_QR' ? (
              !upiConfig.configured || !upiConfig.merchantUpiId ? (
                <span>UPI Not Configured (Choose COD)</span>
              ) : isUtrComplete ? (
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
