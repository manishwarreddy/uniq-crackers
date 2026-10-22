'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  ArrowRight,
  CheckCircle2,
  User,
  AlertCircle,
  Flame,
  KeyRound,
  RotateCcw,
  Edit2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CustomerOtpModalProps {
  onSuccess?: () => void;
}

export const CustomerOtpModal: React.FC<CustomerOtpModalProps> = ({ onSuccess }) => {
  const { isOtpModalOpen, closeOtpModal, setCustomerSession, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset modal state when opened
  useEffect(() => {
    if (isOtpModalOpen) {
      setErrorMsg('');
      setInfoMsg('');
      setOtp('');
      setStep('PHONE');
      setIsLoading(false);
    }
  }, [isOtpModalOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOtpModalOpen) {
        closeOtpModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOtpModalOpen, closeOtpModal]);

  if (!isOtpModalOpen) return null;

  // Validate Indian 10-digit mobile number: Starts with 6, 7, 8, or 9 and has exactly 10 digits
  const cleanPhoneDigits = phone.replace(/[^\d]/g, '');
  const isValidPhone = /^[6-9]\d{9}$/.test(cleanPhoneDigits);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    setIsLoading(true);
    const result = await sendOtp(cleanPhoneDigits, name.trim());
    setIsLoading(false);

    if (result.success) {
      setStep('OTP');
      setResendCooldown(60);
      setInfoMsg(result.message || `6-digit verification code sent to +91 ${cleanPhoneDigits}`);
    } else {
      setErrorMsg(result.message || 'Unable to send verification code. Please try again.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    const result = await verifyOtp(cleanPhoneDigits, cleanOtp, name.trim());
    setIsLoading(false);

    if (result.success) {
      closeOtpModal();
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(result.message || 'Incorrect verification code. Please check and try again.');
    }
  };

  // Fast guest checkout bypass option without phone OTP
  const handleGuestCheckout = () => {
    if (!isValidPhone) {
      setErrorMsg('A valid 10-digit mobile number is required for order delivery coordination.');
      return;
    }
    setCustomerSession(name.trim() || 'Valued Customer', cleanPhoneDigits);
    closeOtpModal();
    if (onSuccess) onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-otp-modal-title"
    >
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

        <div className="space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-slate-950 flex items-center justify-center shadow-spark">
              {step === 'PHONE' ? (
                <Flame className="w-7 h-7 fill-slate-950 text-slate-950" />
              ) : (
                <KeyRound className="w-7 h-7 text-slate-950" />
              )}
            </div>
            <h2 id="customer-otp-modal-title" className="font-heading font-black text-2xl text-white">
              {step === 'PHONE' ? 'Customer Mobile Sign In' : 'Verify Mobile Number'}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {step === 'PHONE'
                ? 'Enter your mobile number for doorstep order updates, live rider tracking, and verified checkout.'
                : `Enter the 6-digit OTP code dispatched to +91 ${cleanPhoneDigits}`}
            </p>
          </div>

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="customer-auth-name" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your Full Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="customer-auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="customer-auth-phone" className="block text-xs font-bold text-slate-300 mb-1.5">
                  10-Digit Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 shrink-0">
                    <span className="text-base leading-none">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <div className="relative flex-1">
                    <input
                      id="customer-auth-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
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
                  <span className={`font-mono font-bold ${cleanPhoneDigits.length === 10 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {cleanPhoneDigits.length}/10
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="submit"
                  disabled={!isValidPhone || isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-spark transition-all flex items-center justify-center gap-2"
                >
                  <span>{isLoading ? 'Sending Verification Code...' : 'Send Verification OTP'}</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>

                <button
                  type="button"
                  onClick={handleGuestCheckout}
                  disabled={!isValidPhone}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Fast Guest Checkout (Skip OTP)</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Verifying Mobile</span>
                  <span className="font-mono font-black text-white">+91 {cleanPhoneDigits}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('PHONE');
                    setOtp('');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              <div>
                <label htmlFor="customer-auth-otp" className="block text-xs font-bold text-slate-300 mb-1.5">
                  6-Digit OTP Code <span className="text-rose-400">*</span>
                </label>
                <input
                  id="customer-auth-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                    setOtp(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full text-center text-lg tracking-[0.35em] py-3 rounded-xl border border-slate-700 bg-slate-900 text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-black"
                  autoFocus
                  required
                />
              </div>

              {infoMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="submit"
                  disabled={otp.trim().length !== 6 || isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-spark transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>{isLoading ? 'Verifying Code...' : 'Verify & Continue'}</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={resendCooldown > 0 || isLoading}
                    className="text-amber-400 hover:text-amber-300 disabled:text-slate-500 font-bold transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP Code'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGuestCheckout}
                    className="text-slate-400 hover:text-slate-200 font-medium underline transition-colors"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Encrypted • Server-Verified Customer Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};
