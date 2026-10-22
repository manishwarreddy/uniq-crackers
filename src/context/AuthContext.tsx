'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  loginAsAdmin: (passcode: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>({
    userId: 'guest-shopper',
    name: 'Customer',
    phone: '',
    isPhoneVerified: false,
    role: 'CUSTOMER',
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasscodePrompt, setAdminPasscodePrompt] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  // Check server-side admin session on mount
  const checkAdminSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/admin/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.authenticated) {
          setIsAdmin(true);
          setUser((prev) => ({
            ...prev,
            role: 'ADMIN',
            name: data.data.user?.name || 'Store Administrator',
            userId: data.data.user?.userId || 'admin-super-01',
          }));
          return true;
        }
      }
    } catch {
      // offline or unauthenticated
    }
    setIsAdmin(false);
    return false;
  }, []);

  useEffect(() => {
    // 1. Verify admin session with server
    checkAdminSession();

    // 2. Restore customer details from localStorage (customers only, never trust admin role from storage)
    try {
      const stored = localStorage.getItem('n_crackers_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setUser((prev) => ({
            ...prev,
            userId: parsed.userId || 'customer-local',
            name: parsed.name || 'Customer',
            phone: parsed.phone || '',
            isPhoneVerified: Boolean(parsed.isPhoneVerified),
            // Always default to CUSTOMER from localStorage - server session alone dictates ADMIN
            role: prev.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
          }));
        }
      }
    } catch {
      // ignore storage error
    }
  }, [checkAdminSession]);

  const saveCustomerProfile = (u: AuthUser) => {
    setUser(u);
    try {
      // Never store ADMIN role in localStorage
      const safeToStore = {
        userId: u.userId,
        name: u.name,
        phone: u.phone,
        isPhoneVerified: u.isPhoneVerified,
        role: 'CUSTOMER',
      };
      localStorage.setItem('n_crackers_auth', JSON.stringify(safeToStore));
    } catch {
      // ignore
    }
  };

  const loginAsAdmin = async (passcode: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsAdmin(true);
        setUser({
          userId: data.data?.user?.userId || 'admin-super-01',
          name: data.data?.user?.name || 'Store Administrator',
          phone: '',
          isPhoneVerified: true,
          role: 'ADMIN',
        });
        setAdminPasscodePrompt(false);
        return { success: true };
      }

      setIsAdmin(false);
      return {
        success: false,
        message: data.error?.message || 'Invalid administrator credentials. Access denied.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Connection error during authentication.',
      };
    }
  };

  const setCustomerSession = (name: string, phone: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
    saveCustomerProfile({
      userId: `cust-${Date.now()}`,
      name: name.trim() || 'Valued Customer',
      phone: cleanPhone,
      isPhoneVerified: false, // Guest checkout session: phone is present but unverified
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
          message: data.data?.message || 'OTP sent successfully.',
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
          name: data.data?.name || name || 'Customer',
          phone: data.data?.phone || phone,
          isPhoneVerified: true,
          role: 'CUSTOMER',
        };
        saveCustomerProfile(verifiedUser);
        setIsOtpModalOpen(false);
        return { success: true, message: data.data?.message || 'Phone number verified!' };
      } else {
        return {
          success: false,
          message: data.error?.message || 'OTP verification failed. Please check the SMS and try again.',
        };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error verifying OTP.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST' });
    } catch {}

    setIsAdmin(false);
    saveCustomerProfile({
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
        isAdmin,
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
