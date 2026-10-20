'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  ShieldCheck,
  Sparkles,
  X,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Lock,
  User,
  AlertCircle,
  Copy,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CustomerOtpModalProps {
  onSuccess?: () => void;
}

export const CustomerOtpModal: React.FC<CustomerOtpModalProps> = ({ onSuccess }) => {
  const { isOtpModalOpen, closeOtpModal, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'PHONE' | 'OTP' | 'SUCCESS'>('PHONE');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset modal state when opened
  useEffect(() => {
    if (isOtpModalOpen) {
      setStep('PHONE');
      setErrorMsg('');
      setOtpDigits(['', '', '', '', '', '']);
      setDemoOtp(null);
    }
  }, [isOtpModalOpen]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      setCanResend(false);
    } else if (step === 'OTP' && resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, resendTimer]);

  if (!isOtpModalOpen) return null;

  // Validate Indian 10-digit mobile number: Starts with 6, 7, 8, or 9 and has exactly 10 digits
  const cleanPhoneDigits = phone.replace(/[^\d]/g, '');
  const isValidPhone = /^[6-9]\d{9}$/.test(cleanPhoneDigits);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    setIsLoading(true);
    const res = await sendOtp(cleanPhoneDigits, name.trim());
    setIsLoading(false);

    if (res.success) {
      setDemoOtp(res.otp || null);
      setStep('OTP');
      setResendTimer(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } else {
      setErrorMsg(res.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMsg('');
    setIsLoading(true);
    const res = await sendOtp(cleanPhoneDigits, name.trim());
    setIsLoading(false);

    if (res.success) {
      setDemoOtp(res.otp || null);
      setResendTimer(30);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setErrorMsg(res.message || 'Failed to resend OTP.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    // Only accept numbers
    const cleanVal = val.replace(/[^\d]/g, '');

    // Handle paste of full 6-digit OTP
    if (cleanVal.length >= 6) {
      const pasted = cleanVal.slice(0, 6).split('');
      setOtpDigits(pasted);
      inputRefs.current[5]?.focus();
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = cleanVal.slice(-1); // Take single character
    setOtpDigits(nextDigits);

    // Auto focus next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpDigits.join('');

    if (enteredCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    const res = await verifyOtp(cleanPhoneDigits, enteredCode, name.trim());
    setIsLoading(false);

    if (res.success) {
      setStep('SUCCESS');
      setTimeout(() => {
        closeOtpModal();
        if (onSuccess) onSuccess();
      }, 1500);
    } else {
      setErrorMsg(res.message || 'Invalid OTP code. Please verify and try again.');
    }
  };

  const fillDemoOtp = () => {
    if (demoOtp && demoOtp.length === 6) {
      setOtpDigits(demoOtp.split(''));
      setErrorMsg('');
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-festive-surface text-slate-100 rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeOtpModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: PHONE NUMBER ENTRY */}
        {step === 'PHONE' && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-slate-950 flex items-center justify-center shadow-spark">
                <Flame className="w-7 h-7 fill-slate-950 text-slate-950" />
              </div>
              <h2 className="font-heading font-black text-2xl text-white">
                Customer Mobile Login
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Sign in with your 10-digit mobile number for order dispatch, instant WhatsApp tracking, and checkout.
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your Full Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  10-Digit Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 shrink-0">
                    <span className="text-base leading-none">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '');
                        setPhone(val);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full text-xs pl-3.5 pr-10 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono font-bold"
                      autoFocus
                      required
                    />
                    {isValidPhone && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Must be valid 10 digits (starts with 6-9)</span>
                  <span className={`font-mono font-bold ${cleanPhoneDigits.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {cleanPhoneDigits.length}/10
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || cleanPhoneDigits.length !== 10}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-spark transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Sending SMS OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Secure • Instant OTP Verification</span>
            </div>
          </div>
        )}

        {/* STEP 2: OTP CODE VERIFICATION */}
        {step === 'OTP' && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="font-heading font-black text-2xl text-white">
                Enter Verification OTP
              </h2>
              <div className="text-xs text-slate-400">
                6-digit code sent to{' '}
                <strong className="text-amber-300 font-mono">
                  +91 {cleanPhoneDigits.slice(0, 5)} {cleanPhoneDigits.slice(5)}
                </strong>
                <button
                  type="button"
                  onClick={() => {
                    setStep('PHONE');
                    setErrorMsg('');
                  }}
                  className="ml-2 text-amber-400 font-bold hover:underline"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Simulated Live Gateway Notification Banner for Testing */}
            {demoOtp && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Diwali SMS Gateway Dispatch</span>
                  </span>
                  <button
                    type="button"
                    onClick={fillDemoOtp}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] transition-colors"
                  >
                    Auto-Fill OTP
                  </button>
                </div>
                <div className="font-mono text-sm tracking-widest font-extrabold text-white">
                  Verification Code: <span className="bg-slate-900 px-2 py-0.5 rounded border border-amber-500/40 text-amber-300">{demoOtp}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 text-center mb-3">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex justify-center gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black font-mono rounded-xl border border-slate-700 bg-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 text-white transition-all shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-spark transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue Shopping</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-xs font-bold text-amber-400 hover:underline transition-colors"
                  >
                    Didn&apos;t receive code? Resend OTP
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">
                    Resend OTP in <strong className="text-amber-400 font-mono">{resendTimer}s</strong>
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'SUCCESS' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-heading font-black text-2xl text-white">
              Mobile Verified!
            </h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Welcome to N Crackers. Your phone number is verified and linked to your festive shopping cart.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
