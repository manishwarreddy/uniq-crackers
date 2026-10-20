'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role } from '@/types';

export interface AuthUser {
  userId: string;
  name: string;
  phone?: string;
  isPhoneVerified: boolean;
  role: Role;
}

interface AuthContextType {
  user: AuthUser;
  isAdmin: boolean;
  isPhoneVerified: boolean;
  loginAsAdmin: (passcode: string) => boolean;
  logout: () => void;
  adminPasscodePrompt: boolean;
  openAdminLogin: () => void;
  closeAdminLogin: () => void;
  isOtpModalOpen: boolean;
  openOtpModal: () => void;
  closeOtpModal: () => void;
  sendOtp: (phone: string, name?: string) => Promise<{ success: boolean; otp?: string; message?: string }>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<{ success: boolean; message?: string }>;
  setCustomerSession: (name: string, phone: string) => void;
  loginAsCustomer: (name?: string, phone?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PASSCODE = 'admin123'; // Default secure passcode for store manager

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>({
    userId: 'guest-shopper',
    name: 'Customer',
    phone: '',
    isPhoneVerified: false,
    role: 'CUSTOMER',
  });
  const [adminPasscodePrompt, setAdminPasscodePrompt] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('n_crackers_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setUser({
            userId: parsed.userId || 'customer-local',
            name: parsed.name || 'Customer',
            phone: parsed.phone || '',
            isPhoneVerified: Boolean(parsed.isPhoneVerified),
            role: parsed.role || 'CUSTOMER',
          });
        }
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const saveUser = (u: AuthUser) => {
    setUser(u);
    try {
      localStorage.setItem('n_crackers_auth', JSON.stringify(u));
    } catch {
      // ignore
    }
  };

  const loginAsAdmin = (passcode: string): boolean => {
    if (passcode.trim() === ADMIN_PASSCODE) {
      saveUser({
        userId: 'admin-super-01',
        name: 'Store Administrator',
        phone: '+91 90000 00000',
        isPhoneVerified: true,
        role: 'ADMIN',
      });
      setAdminPasscodePrompt(false);
      return true;
    }
    return false;
  };

  const setCustomerSession = (name: string, phone: string) => {
    saveUser({
      userId: `cust-${Date.now()}`,
      name: name.trim() || 'Valued Customer',
      phone: phone.trim(),
      isPhoneVerified: true,
      role: 'CUSTOMER',
    });
  };

  const sendOtp = async (phone: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND_OTP', phone, name }),
      });
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          otp: data.data.otp,
          message: data.data.message,
        };
      } else {
        return {
          success: false,
          message: data.error?.message || 'Failed to send OTP. Please try again.',
        };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error sending OTP.' };
    }
  };

  const verifyOtp = async (phone: string, otp: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY_OTP', phone, otp, name }),
      });
      const data = await res.json();
      if (data.success) {
        const verifiedUser: AuthUser = {
          userId: `cust-${Date.now()}`,
          name: data.data.name || name || 'Customer',
          phone: data.data.phone,
          isPhoneVerified: true,
          role: 'CUSTOMER',
        };
        saveUser(verifiedUser);
        setIsOtpModalOpen(false);
        return { success: true, message: data.data.message };
      } else {
        return {
          success: false,
          message: data.error?.message || 'OTP verification failed. Please try again.',
        };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error verifying OTP.' };
    }
  };

  const logout = () => {
    saveUser({
      userId: 'guest-shopper',
      name: 'Customer',
      phone: '',
      isPhoneVerified: false,
      role: 'CUSTOMER',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
        isPhoneVerified: Boolean(user.isPhoneVerified && user.phone),
        loginAsAdmin,
        logout,
        adminPasscodePrompt,
        openAdminLogin: () => setAdminPasscodePrompt(true),
        closeAdminLogin: () => setAdminPasscodePrompt(false),
        isOtpModalOpen,
        openOtpModal: () => setIsOtpModalOpen(true),
        closeOtpModal: () => setIsOtpModalOpen(false),
        sendOtp,
        verifyOtp,
        setCustomerSession,
        loginAsCustomer: (name = 'Customer', phone = '') => setCustomerSession(name, phone),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
