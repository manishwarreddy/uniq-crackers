'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const { user, isPhoneVerified, loginCustomer, logout } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user.phone) {
      setPhone(user.phone);
    }
    if (user.name && user.name !== 'Customer' && user.name !== 'Valued Customer') {
      setName(user.name);
    }
  }, [user]);

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
      router.push(redirectUrl);
    } else {
      setErrorMsg(result.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background festive glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to store navigation */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store</span>
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          Diwali 2026 Special
        </span>
      </div>

      <div className="relative w-full max-w-md bg-festive-surface border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-spark">
            <Sparkles className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-white">
            Customer Login
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Sign in with your name and phone number to enjoy instant checkout and real-time order tracking.
          </p>
        </div>

        {/* If user is already logged in, show status & quick actions */}
        {isPhoneVerified && user.phone ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-bold text-emerald-400">Logged In</div>
                <div className="font-bold text-white text-sm truncate">{user.name}</div>
                <div className="text-xs font-mono text-slate-400">+91 {user.phone}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link
                href={redirectUrl}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-spark transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-slate-950" />
                <span>Continue Shopping</span>
              </Link>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch Account / Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label htmlFor="login-page-name" className="block text-xs font-bold text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-page-name"
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
              <label htmlFor="login-page-phone" className="block text-xs font-bold text-slate-300 mb-1.5">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 shrink-0">
                  <span className="text-base leading-none">🇮🇳</span>
                  <span>+91</span>
                </div>
                <div className="relative flex-1">
                  <input
                    id="login-page-phone"
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
        )}

        {/* Security Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instant Access • Safe &amp; Secure Customer Session</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
