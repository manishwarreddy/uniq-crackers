'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  ArrowRight,
  CheckCircle2,
  User,
  Phone,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CustomerOtpModalProps {
  onSuccess?: () => void;
}

export const CustomerOtpModal: React.FC<CustomerOtpModalProps> = ({ onSuccess }) => {
  const { isOtpModalOpen, closeOtpModal, loginCustomer, user } = useAuth();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with existing user data if available when opening modal
  useEffect(() => {
    if (isOtpModalOpen) {
      setErrorMsg('');
      setIsLoading(false);
      if (user.phone) {
        setPhone(user.phone);
      }
      if (user.name && user.name !== 'Customer' && user.name !== 'Valued Customer') {
        setName(user.name);
      }
    }
  }, [isOtpModalOpen, user]);

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
  const isValidName = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    setIsLoading(true);
    const result = await loginCustomer(name.trim(), cleanPhoneDigits);
    setIsLoading(false);

    if (result.success) {
      closeOtpModal();
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(result.message || 'Unable to sign in. Please verify your details.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-login-modal-title"
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
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-spark">
              <Sparkles className="w-7 h-7 text-slate-950" />
            </div>
            <h2 id="customer-login-modal-title" className="font-heading font-black text-2xl text-white">
              Customer Login
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Enter your name and mobile number to manage orders and track deliveries.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label htmlFor="customer-login-name" className="block text-xs font-bold text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="customer-login-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label htmlFor="customer-login-phone" className="block text-xs font-bold text-slate-300 mb-1.5">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 shrink-0">
                  <span className="text-base leading-none">🇮🇳</span>
                  <span>+91</span>
                </div>
                <div className="relative flex-1">
                  <input
                    id="customer-login-phone"
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
                    required
                  />
                  {isValidPhone && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                <span>10 digits starting with 6, 7, 8, or 9</span>
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={!isValidPhone || !isValidName || isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-spark transition-all flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Signing In...' : 'Login & Continue'}</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Instant Access • Safe &amp; Secure Customer Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};
