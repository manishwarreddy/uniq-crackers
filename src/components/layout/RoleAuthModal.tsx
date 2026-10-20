'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, ArrowRight, KeyRound, X, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const RoleAuthModal: React.FC = () => {
  const router = useRouter();
  const { user, isAdmin, loginAsAdmin, loginAsCustomer, logout, adminPasscodePrompt, closeAdminLogin } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerEdit, setShowCustomerEdit] = useState(false);

  if (!adminPasscodePrompt) return null;

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const success = loginAsAdmin(passcode);
    if (success) {
      setPasscode('');
      closeAdminLogin();
      router.push('/admin');
    } else {
      setErrorMsg('Incorrect passcode. Default passcode is "admin123"');
    }
  };

  const handleCustomerSave = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsCustomer(customerName.trim() || 'Customer', customerPhone.trim());
    setShowCustomerEdit(false);
    closeAdminLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-festive-surface text-slate-100 rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAdminLogin}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-black text-xl text-white">
            Account & Role Access
          </h2>
          <p className="text-xs text-slate-400">
            Switch between Customer shopping experience and Administrator store management.
          </p>
        </div>

        {/* Current Role Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Current Role</div>
              <div className="font-extrabold text-white">{isAdmin ? 'Administrator (Store Manager)' : `Customer (${user.name})`}</div>
            </div>
          </div>
          {isAdmin ? (
            <button
              onClick={() => {
                logout();
                closeAdminLogin();
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-colors"
            >
              Switch to Customer
            </button>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
              Active Shopper
            </span>
          )}
        </div>

        {/* Admin Login Form if not logged in as Admin */}
        {!isAdmin && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Admin Management Login</span>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Manager Security Passcode
                </label>
                <input
                  type="password"
                  placeholder="Enter passcode (e.g. admin123)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-900 text-white font-mono"
                  autoFocus
                />
                {errorMsg && (
                  <p className="text-[11px] font-bold text-rose-400 mt-1">{errorMsg}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Hint: Use <strong className="text-amber-400 font-mono">admin123</strong> to enter admin mode.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-spark transition-all flex items-center justify-center gap-2"
              >
                <span>Unlock Admin Portal</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </form>
          </div>
        )}

        {/* Customer Profile Customization */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          {!showCustomerEdit ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Shopping as Customer</span>
              <button
                onClick={() => setShowCustomerEdit(true)}
                className="text-amber-400 font-bold hover:underline"
              >
                Edit Customer Info
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomerSave} className="space-y-2 pt-2 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Customer Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
                >
                  Save Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerEdit(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
