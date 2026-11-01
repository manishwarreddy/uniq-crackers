'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Tag,
  Package,
  CheckCircle,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Edit2,
  Trash2,
  Save,
  DollarSign,
  LogOut,
  RefreshCw,
  Bell,
  Upload,
  Camera,
  ExternalLink,
  PhoneCall,
  Volume2,
  VolumeX,
  Truck,
  CheckCircle2,
  Clock,
  X,
  XCircle,
  Filter,
  Search,
  AlertTriangle,
  Phone,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProductItem, OrderStatus } from '@/types';
import { STORE_DEFAULTS } from '@/lib/constants';
import { AdminNotification } from '@/lib/server-store';
import {
  getOrders,
  acceptOrder as serviceAcceptOrder,
  rejectOrder as serviceRejectOrder,
  deleteOrder as serviceDeleteOrder,
  deleteAllOrders as serviceDeleteAllOrders,
  Order,
  REJECTION_REASONS,
} from '@/services/orderService';

const FESTIVE_IMAGE_PRESETS = [
  { label: 'Golden Sparklers', url: '/images/sparklers.jpg', category: 'sparklers' },
  { label: 'Aerial Sky Shots', url: '/images/skyshots.jpg', category: 'skyshots' },
  { label: 'Flower Pots / Anar', url: '/images/anar.jpg', category: 'flowerpots' },
  { label: 'Colour Koti / Fountain', url: '/images/colour_koti.jpg', category: 'flowerpots' },
  { label: 'Ground Chakkars', url: '/images/chakkar.jpg', category: 'chakkars' },
  { label: 'Sound & Laxmi Crackers', url: '/images/sound_crackers.jpg', category: 'sound' },
  { label: 'Atom & Hydro Bombs', url: '/images/atom_bomb.jpg', category: 'sound' },
  { label: 'Garland & Ladi Wala', url: '/images/garland_wala.jpg', category: 'sound' },
  { label: 'Sky Rockets', url: '/images/sky_rockets.jpg', category: 'rockets' },
  { label: 'Fancy Novelty & Spinners', url: '/images/novelty_fireworks.jpg', category: 'novelty' },
  { label: 'Diwali Gift Hamper', url: '/images/hamper.jpg', category: 'hampers' },
  { label: 'Celebration Hero', url: '/images/hero_fireworks.jpg', category: 'hampers' },
];

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.1); // D6
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.6);
  } catch {}
}

function getPhoneDialLink(phone?: string | null): string {
  if (!phone || !phone.trim()) return '#';
  const cleanDigits = phone.replace(/[^\d+]/g, '');
  return `tel:${cleanDigits}`;
}

function getWhatsAppLink(phone?: string | null, customerName?: string | null, orderNumber?: string | null): string {
  if (!phone || !phone.trim()) return '#';
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  const greeting = customerName?.trim() ? `Hello ${customerName.trim()}` : 'Hello';
  const orderRef = orderNumber?.trim() ? `Order #${orderNumber.trim()}` : 'your order';
  const message = `${greeting}, regarding your Uniq Crackers ${orderRef}:`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}


async function safeJsonParse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: res.ok
        ? 'Invalid response from server'
        : `Server error (${res.status}): ${text.slice(0, 150) || res.statusText}`,
      error: {
        message: res.ok
          ? 'Invalid response from server'
          : `Server error (${res.status}): ${text.slice(0, 150) || res.statusText}`,
      },
    };
  }
}

/**
 * Client-side image processing:
 * 1. Resizes to clean square dimensions (max 1000x1000).
 * 2. Centers product with aspect ratio preservation.
 * 3. Applies solid clean white background (#FFFFFF) for consistent festive presentation.
 * 4. Compresses to high-efficiency JPEG (~100-200 KB).
 */
function processProductImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available for image processing'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = document.createElement('img');
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        try {
          const maxDim = 1000;
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          const targetSize = Math.min(Math.max(width, height), maxDim);
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context unavailable'));
          }

          // Clean pure white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetSize, targetSize);

          // Proportional scaling with padding
          const padding = Math.round(targetSize * 0.03);
          const availSize = targetSize - padding * 2;
          const scale = Math.min(availSize / width, availSize / height);
          const drawW = Math.round(width * scale);
          const drawH = Math.round(height * scale);
          const dx = Math.round((targetSize - drawW) / 2);
          const dy = Math.round((targetSize - drawH) / 2);

          ctx.drawImage(img, dx, dy, drawW, drawH);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve({ blob, dataUrl });
              } else {
                reject(new Error('Failed to encode image'));
              }
            },
            'image/jpeg',
            0.85
          );
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads product image directly to Supabase Storage via pre-signed URL:
 * - Bypasses Vercel Serverless Function 4.5MB request body limit
 * - Never passes image payload through serverless API gateway
 * - Falls back to server upload or compressed data URL if Supabase is offline
 */
async function uploadProductPhotoDirect(
  file: File,
  onProgress?: (status: string) => void
): Promise<{ url: string; preview: string; storage: 'supabase' | 'inline' }> {
  onProgress?.('🎨 Processing photo with clean white background...');
  const { blob, dataUrl } = await processProductImage(file);

  onProgress?.('🔐 Requesting secure upload authorization...');
  try {
    const signRes = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'GET_SIGNED_URL',
        fileName: file.name,
        contentType: 'image/jpeg',
      }),
    });
    const signData = await safeJsonParse(signRes);

    if (signData.success && signData.signedUrl && signData.publicUrl) {
      onProgress?.('☁️ Uploading directly to Supabase Storage CDN...');
      const putRes = await fetch(signData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      if (putRes.ok) {
        return {
          url: signData.publicUrl,
          preview: signData.publicUrl,
          storage: 'supabase',
        };
      }
    }
  } catch (err) {
    console.warn('[STORAGE] Signed URL negotiation failed:', err);
  }

  // Fallback 1: Try server upload endpoint with compressed blob (under 200KB)
  try {
    onProgress?.('📤 Uploading photo via server fallback...');
    const formData = new FormData();
    formData.append('file', blob, file.name.replace(/\.[^.]+$/, '') + '.jpg');
    const uploadRes = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    const uploadData = await safeJsonParse(uploadRes);
    if (uploadData.success && uploadData.url) {
      return {
        url: uploadData.url,
        preview: uploadData.url,
        storage: uploadData.storage || 'supabase',
      };
    }
  } catch (err) {
    console.warn('[STORAGE] Server upload fallback failed:', err);
  }

  // Fallback 2: Compressed data URL (~100KB)
  return {
    url: dataUrl,
    preview: dataUrl,
    storage: 'inline',
  };
}

export default function AdminPage() {
  const { isAdmin, logout, loginAsAdmin } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'notifications' | 'products' | 'manage_prices' | 'orders' | 'delivery' | 'discounts' | 'whatsapp'>('notifications');

  // Notifications & Realtime State
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilterTab, setOrderFilterTab] = useState<'ALL' | 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Accept / Reject / Delete Modals & Action States
  const [orderToAccept, setOrderToAccept] = useState<Order | null>(null);
  const [orderToReject, setOrderToReject] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderForDetails, setOrderForDetails] = useState<Order | null>(null);
  const [viewingScreenshotOrder, setViewingScreenshotOrder] = useState<Order | null>(null);
  const [viewingScreenshotUrl, setViewingScreenshotUrl] = useState<string | null>(null);
  const [isLoadingScreenshot, setIsLoadingScreenshot] = useState<boolean>(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllFilter, setDeleteAllFilter] = useState<'COMPLETED_OR_CANCELLED' | 'ALL' | 'OLD_ONLY'>('COMPLETED_OR_CANCELLED');
  const [deleteAllOlderThanDays, setDeleteAllOlderThanDays] = useState<number>(7);
  const [isDeletingAllOrders, setIsDeletingAllOrders] = useState(false);
  const [isDeleteAllNotifsModalOpen, setIsDeleteAllNotifsModalOpen] = useState(false);
  const [isDeletingAllNotifs, setIsDeletingAllNotifs] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [rejectionCustomNoteInput, setRejectionCustomNoteInput] = useState<string>('');
  const [isProcessingOrderAction, setIsProcessingOrderAction] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  const prevNotifIdsRef = useRef<Set<string>>(new Set());

  // Product Form State
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('sparklers');
  const [productVariantName] = useState('Standard Pack');
  const [productBoxQuantity, setProductBoxQuantity] = useState('1 Box of 10 Pieces');
  const [productPrice, setProductPrice] = useState('');
  const [productMrp, setProductMrp] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productStock, setProductStock] = useState('50');
  const [productImage, setProductImage] = useState('/images/sparklers.jpg');
  const [photoPreview, setPhotoPreview] = useState<string | null>('/images/sparklers.jpg');
  const [soundDecibel, setSoundDecibel] = useState('Low / Eco Friendly');
  const [smokeLevel, setSmokeLevel] = useState('70% Reduced Smoke');
  const [isGreenCertified, setIsGreenCertified] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrder, setMinOrder] = useState('500');

  // WhatsApp Admin Config
  const [adminPhone, setAdminPhone] = useState(STORE_DEFAULTS.SUPPORT_PHONE);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<string | null>(null);

  // Delivery Settings State
  const [slab0to2Fee, setSlab0to2Fee] = useState('40');
  const [slab2to4Fee, setSlab2to4Fee] = useState('70');
  const [slab4to7Fee, setSlab4to7Fee] = useState('120');
  const [freeDeliveryThresholdInput, setFreeDeliveryThresholdInput] = useState('3000');
  const [maxRadiusInput, setMaxRadiusInput] = useState('7.0');
  const [adminWhatsAppInput, setAdminWhatsAppInput] = useState('');
  const [smsApiKeyInput, setSmsApiKeyInput] = useState('');
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [smsTestFeedback, setSmsTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live Catalog State for Price & Offer Editing
  const [liveProducts, setLiveProducts] = useState<ProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [editMrpValue, setEditMrpValue] = useState<string>('');
  const [editOfferBadgeValue, setEditOfferBadgeValue] = useState<string>('');
  const [editStockValue, setEditStockValue] = useState<string>('');
  const [editIsActiveValue, setEditIsActiveValue] = useState<boolean>(true);
  const [editImageValue, setEditImageValue] = useState<string>('');
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState<boolean>(false);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Fetch Live Notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      if (data.success && data.data) {
        const notifs: AdminNotification[] = data.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(data.data.unreadCount || 0);

        // Check for new incoming notifications
        const currentIds = new Set(notifs.map((n) => n.id));
        const hasNew = notifs.some((n) => !prevNotifIdsRef.current.has(n.id) && !n.isRead);

        if (hasNew && prevNotifIdsRef.current.size > 0) {
          if (soundEnabled) {
            playNotificationChime();
          }
          const latest = notifs[0];
          showStatus(`🚨 NEW ORDER #${latest.orderNumber} received from ${latest.customerName} (₹${latest.totalAmount})!`);
        }

        prevNotifIdsRef.current = currentIds;
      }
    } catch {
      // ignore
    }
  };

  // Fetch Live Orders via OrderService
  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (e) {
      console.warn('Error fetching orders:', e);
    }
  };

  // Order Approval Action Handler
  const handleConfirmAcceptOrder = async () => {
    if (!orderToAccept) return;
    setIsProcessingOrderAction(true);
    try {
      const res = await serviceAcceptOrder(orderToAccept.orderNumber);
      setIsProcessingOrderAction(false);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderNumber === orderToAccept.orderNumber
              ? { ...o, status: 'ACCEPTED', acceptedAt: new Date().toISOString() }
              : o
          )
        );
        setActionSuccessToast(`🎉 Order #${orderToAccept.orderNumber} for ${orderToAccept.customerName} has been Accepted!`);
        setTimeout(() => setActionSuccessToast(null), 4000);
        setOrderToAccept(null);
        fetchOrders();
        fetchNotifications();
      } else {
        alert(res.message || 'Failed to accept order.');
      }
    } catch (err: any) {
      setIsProcessingOrderAction(false);
      alert(err.message || 'Error accepting order.');
    }
  };

  // Instant 1-Tap UPI Verification & Order Approval Handler
  const handleQuickVerifyUpi = async (order: Order) => {
    setIsProcessingOrderAction(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          action: 'VERIFY_UPI',
          upiUtr: order.upiUtr,
        }),
      });
      const data = await res.json();
      setIsProcessingOrderAction(false);
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderNumber === order.orderNumber
              ? { ...o, status: 'ACCEPTED', paymentStatus: 'PAID', acceptedAt: new Date().toISOString() }
              : o
          )
        );
        if (soundEnabled) {
          playNotificationChime();
        }
        setActionSuccessToast(`🎉 Payment of ₹${order.totalAmount} for Order #${order.orderNumber} Verified! Order Accepted.`);
        setTimeout(() => setActionSuccessToast(null), 5000);
        fetchOrders();
        fetchNotifications();
      } else {
        alert(data.message || 'Failed to verify UPI payment.');
      }
    } catch (err: any) {
      setIsProcessingOrderAction(false);
      alert(err.message || 'Error verifying UPI payment.');
    }
  };

  // Securely Fetch and View Payment Screenshot Modal
  const handleViewScreenshot = async (order: Order) => {
    setViewingScreenshotOrder(order);
    setIsLoadingScreenshot(true);
    setViewingScreenshotUrl(null);
    try {
      const res = await fetch(`/api/orders/payment-proof?orderNumber=${encodeURIComponent(order.orderNumber)}&json=true`);
      const data = await res.json();
      setIsLoadingScreenshot(false);
      if (data.success && (data.data?.signedUrl || data.data?.dataUrl)) {
        setViewingScreenshotUrl(data.data.signedUrl || data.data.dataUrl);
      } else {
        alert(data.message || 'Payment screenshot could not be loaded.');
        setViewingScreenshotOrder(null);
      }
    } catch (err: any) {
      setIsLoadingScreenshot(false);
      alert(err?.message || 'Error fetching payment screenshot.');
      setViewingScreenshotOrder(null);
    }
  };

  // Explicit Approve Payment Action
  const handleApprovePayment = async (order: Order) => {
    if (!confirm(`Confirm that you have verified ₹${order.totalAmount} in your Axis Bank / Google Pay receiving account for Order #${order.orderNumber}?`)) {
      return;
    }
    setIsProcessingOrderAction(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          action: 'APPROVE_PAYMENT',
          upiUtr: order.upiUtr,
        }),
      });
      const data = await res.json();
      setIsProcessingOrderAction(false);
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderNumber === order.orderNumber
              ? { ...o, status: 'ACCEPTED', paymentStatus: 'PAID', acceptedAt: new Date().toISOString() }
              : o
          )
        );
        if (soundEnabled) {
          playNotificationChime();
        }
        setActionSuccessToast(`🎉 Payment of ₹${order.totalAmount} for Order #${order.orderNumber} Approved & Accepted!`);
        setTimeout(() => setActionSuccessToast(null), 5000);
        fetchOrders();
        fetchNotifications();
      } else {
        alert(data.message || 'Failed to approve payment.');
      }
    } catch (err: any) {
      setIsProcessingOrderAction(false);
      alert(err.message || 'Error approving payment.');
    }
  };

  // Explicit Reject Payment Action with optional/structured reason
  const handleRejectPayment = async (order: Order) => {
    const reason = prompt(
      `Reject payment for Order #${order.orderNumber}?\nEnter rejection reason:`,
      'UPI payment credit not received in bank account'
    );
    if (reason === null) return;

    setIsProcessingOrderAction(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          action: 'REJECT_PAYMENT',
          rejectionReason: reason.trim() || 'UPI payment credit not received in bank account',
        }),
      });
      const data = await res.json();
      setIsProcessingOrderAction(false);
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderNumber === order.orderNumber
              ? { ...o, status: 'REJECTED', paymentStatus: 'PAYMENT_FAILED', rejectedAt: new Date().toISOString() }
              : o
          )
        );
        setActionSuccessToast(`Payment for Order #${order.orderNumber} Rejected. Stock has been restored.`);
        setTimeout(() => setActionSuccessToast(null), 5000);
        fetchOrders();
        fetchNotifications();
      } else {
        alert(data.message || 'Failed to reject payment.');
      }
    } catch (err: any) {
      setIsProcessingOrderAction(false);
      alert(err.message || 'Error rejecting payment.');
    }
  };

  // Order Rejection Action Handler with Mandatory Structured Reason
  const handleConfirmRejectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToReject) return;
    if (!rejectionReasonInput) {
      alert('Please select a rejection reason from the dropdown.');
      return;
    }

    setIsProcessingOrderAction(true);
    try {
      const res = await serviceRejectOrder(
        orderToReject.orderNumber,
        rejectionReasonInput,
        rejectionCustomNoteInput
      );
      setIsProcessingOrderAction(false);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderNumber === orderToReject.orderNumber
              ? {
                  ...o,
                  status: 'REJECTED',
                  rejectionReason: rejectionReasonInput,
                  rejectionNote: rejectionCustomNoteInput.trim() || undefined,
                  rejectedAt: new Date().toISOString(),
                }
              : o
          )
        );
        setActionSuccessToast(`❌ Order #${orderToReject.orderNumber} rejected (${rejectionReasonInput}).`);
        setTimeout(() => setActionSuccessToast(null), 4000);
        setOrderToReject(null);
        setRejectionReasonInput('');
        setRejectionCustomNoteInput('');
        fetchOrders();
        fetchNotifications();
      } else {
        alert(res.message || 'Failed to reject order.');
      }
    } catch (err: any) {
      setIsProcessingOrderAction(false);
      alert(err.message || 'Error rejecting order.');
    }
  };

  // Fetch Live Catalog
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`/api/admin/catalog?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setLiveProducts(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch Delivery Slabs & Hub Settings
  const fetchDeliverySettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.data) {
        const s = data.data;
        if (s.adminWhatsAppNumber) {
          setAdminPhone(`+91 ${s.adminWhatsAppNumber}`);
          setAdminWhatsAppInput(s.adminWhatsAppNumber);
        }
        if (s.smsApiKey) {
          setSmsApiKeyInput(s.smsApiKey);
        }
        if (s.freeDeliveryThreshold !== undefined) {
          setFreeDeliveryThresholdInput(String(s.freeDeliveryThreshold));
        }
        if (s.maxRadiusKm !== undefined) {
          setMaxRadiusInput(String(s.maxRadiusKm));
        }
        if (Array.isArray(s.slabs) && s.slabs.length >= 3) {
          setSlab0to2Fee(String(s.slabs[0]?.fee ?? 40));
          setSlab2to4Fee(String(s.slabs[1]?.fee ?? 70));
          setSlab4to7Fee(String(s.slabs[2]?.fee ?? 120));
        }
      }
    } catch {}
  };

  const handleSaveDeliverySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDelivery(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWhatsAppNumber: adminWhatsAppInput,
          freeDeliveryThreshold: Number(freeDeliveryThresholdInput),
          maxRadiusKm: Number(maxRadiusInput),
          smsApiKey: smsApiKeyInput.trim(),
          slabs: [
            { minKm: 0.0, maxKm: 2.0, fee: Number(slab0to2Fee), label: '0 - 2 km (Local Velmala)' },
            { minKm: 2.0, maxKm: 4.0, fee: Number(slab2to4Fee), label: '2 - 4 km (Outer Velmala)' },
            { minKm: 4.0, maxKm: Number(maxRadiusInput), fee: Number(slab4to7Fee), label: `4 - ${maxRadiusInput} km (Extended Boundary)` },
          ],
        }),
      });
      const data = await res.json();
      setIsSavingDelivery(false);
      if (data.success) {
        setAdminPhone(`+91 ${adminWhatsAppInput}`);
        showStatus('🚚 Delivery fees, SMS gateway & 7 km hub configuration saved successfully!');
      } else {
        alert('Failed to save delivery settings: ' + data.error?.message);
      }
    } catch (err: any) {
      setIsSavingDelivery(false);
      alert('Error saving delivery settings: ' + err.message);
    }
  };

  const handleTestSmsGateway = async () => {
    setIsTestingSms(true);
    setSmsTestFeedback(null);
    try {
      const targetPhone = adminWhatsAppInput || STORE_DEFAULTS.SUPPORT_PHONE.replace(/[^\d]/g, '');
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND_OTP', phone: targetPhone }),
      });
      const data = await res.json();
      setIsTestingSms(false);
      if (data.success) {
        setSmsTestFeedback({
          type: 'success',
          message: data.data?.message || '✅ Live SMS OTP dispatched. Check your phone.',
        });
      } else {
        setSmsTestFeedback({
          type: 'error',
          message: data.error?.message || '❌ SMS dispatch failed.',
        });
      }
    } catch (err: any) {
      setIsTestingSms(false);
      setSmsTestFeedback({ type: 'error', message: err.message || 'Network error testing SMS gateway.' });
    }
  };

  // Initial and recurring sync
  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      fetchOrders();
      fetchProducts();
      fetchDeliverySettings();

      // Poll every 5 seconds for incoming orders and WhatsApp alerts
      const interval = setInterval(() => {
        fetchNotifications();
        fetchOrders();
      }, 5000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, soundEnabled]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    const result = await loginAsAdmin(passcode);
    setIsLoggingIn(false);
    if (result.success) {
      setPasscode('');
    } else {
      setAuthError(result.message || 'Invalid credentials. Access denied.');
    }
  };

  // Handle Photo File Upload (Direct Supabase Storage with white background & instant preview)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Photo is larger than 15MB. Please choose a smaller photo.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const result = await uploadProductPhotoDirect(file, (msg) => {
        setPhotoUploadStatus(msg);
        showStatus(msg);
      });

      setProductImage(result.url);
      setPhotoPreview(result.preview);
      if (result.storage === 'supabase') {
        showStatus('📸 Photo uploaded to Supabase Storage with clean white background!');
      } else {
        showStatus('📸 Photo processed with clean white background!');
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      alert('Failed to process/upload photo: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingPhoto(false);
      setPhotoUploadStatus(null);
    }
  };

  // Add Product with photo and complete specs
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice) {
      alert('Please fill product name and price');
      return;
    }

    if (isUploadingPhoto) {
      alert('Please wait for photo upload and processing to complete before publishing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_PRODUCT',
          payload: {
            name: productName,
            category: productCategory,
            variantName: productVariantName,
            boxQuantity: productBoxQuantity,
            price: Number(productPrice),
            originalPrice: Number(productMrp || Math.round(Number(productPrice) * 1.35)),
            description: productDescription,
            stock: Number(productStock),
            image: productImage || photoPreview || '/images/sparklers.jpg',
            soundDecibel,
            smokeLevel,
            isGreenCertified,
            featured: isFeatured,
          },
        }),
      });
      const data = await safeJsonParse(res);
      setIsSubmitting(false);

      if (data.success) {
        showStatus(`🎉 Product "${productName}" with photo added to Live Catalog!`);
        setProductName('');
        setProductPrice('');
        setProductMrp('');
        setProductDescription('');
        setProductImage('/images/sparklers.jpg');
        setPhotoPreview('/images/sparklers.jpg');
        await fetchProducts();
        setActiveTab('manage_prices');
      } else {
        alert('Failed to add product: ' + (data.error?.message || data.message || 'Unknown error'));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Error adding product: ' + (err.message || 'Unknown error'));
    }
  };

  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Photo is larger than 15MB. Please choose a smaller photo.');
      return;
    }

    setIsUploadingEditPhoto(true);
    try {
      const result = await uploadProductPhotoDirect(file, (msg) => showStatus(msg));
      setEditImageValue(result.url);
      showStatus(
        result.storage === 'supabase'
          ? '📸 New photo uploaded to Supabase Storage with clean white background!'
          : '📸 New photo processed with clean white background!'
      );
    } catch (err: any) {
      alert('Failed to upload photo: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingEditPhoto(false);
    }
  };

  const handleDeleteProductImage = async (productId: string, currentImageUrl: string) => {
    if (!confirm('Are you sure you want to delete this product photo and reset to default?')) return;
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_IMAGE',
          payload: { productId, imageUrl: currentImageUrl },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditImageValue('/images/sparklers.jpg');
        setLiveProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, image: '/images/sparklers.jpg' } : p))
        );
        showStatus('🗑️ Product photo deleted from catalog and storage');
        await fetchProducts();
      } else {
        alert('Failed to delete image: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error deleting image: ' + err.message);
    }
  };

  const handleUpdatePrice = async (productId: string, variantId: string) => {
    if (!editPriceValue) return;

    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PRICE',
          payload: {
            productId,
            variantId,
            newPrice: Number(editPriceValue),
            newOriginalPrice: editMrpValue ? Number(editMrpValue) : undefined,
            newStock: editStockValue ? Number(editStockValue) : undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updateRes = await fetch('/api/admin/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_PRODUCT',
            payload: {
              productId,
              updates: {
                badgeText: editOfferBadgeValue.trim() || undefined,
                isActive: editIsActiveValue,
                image: editImageValue || '/images/sparklers.jpg',
              },
            },
          }),
        });
        const updateData = await updateRes.json();
        if (!updateData.success) {
          alert('Failed to update product details: ' + (updateData.error?.message || 'Unknown error'));
          return;
        }

        showStatus('✅ Product details, photo, and status updated successfully!');
        setEditingPriceId(null);
        await fetchProducts();
      } else {
        alert('Failed to update product: ' + data.error?.message);
      }
    } catch (err: any) {
      alert('Error updating product: ' + err.message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product from the live catalog?')) return;

    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_PRODUCT',
          payload: { productId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLiveProducts((prev) => prev.filter((p) => p.id !== productId));
        showStatus('🗑️ Product removed from store catalog');
        await fetchProducts();
      }
    } catch (err: any) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderNumber: string, status: OrderStatus) => {
    if (status === 'REJECTED') {
      const match = orders.find((o) => o.orderNumber === orderNumber);
      if (match) {
        setOrderToReject(match);
        setRejectionReasonInput('');
        setRejectionCustomNoteInput('');
      } else {
        alert('Please reject through the order list or provide a rejection reason.');
      }
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActionSuccessToast(`🚚 Order #${orderNumber} marked as ${status}!`);
        setTimeout(() => setActionSuccessToast(null), 4000);
        setOrders((prev) =>
          prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status } : o))
        );
        fetchOrders();
        fetchNotifications();
      } else {
        const errorMsg = data.error?.message || data.message || `Failed to update status for order #${orderNumber}.`;
        alert(`Status Update Failed: ${errorMsg}`);
        fetchOrders();
      }
    } catch (err: any) {
      alert('Error updating order status: ' + err.message);
      fetchOrders();
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete || isDeletingOrder) return;
    setIsDeletingOrder(true);
    try {
      const res = await serviceDeleteOrder(orderToDelete.orderNumber);
      setIsDeletingOrder(false);
      if (res.success) {
        const deletedNum = orderToDelete.orderNumber;
        setOrders((prev) => prev.filter((o) => o.orderNumber !== deletedNum));
        setNotifications((prev) => prev.filter((n) => n.orderNumber !== deletedNum));
        setActionSuccessToast(`🗑️ Order #${deletedNum} deleted successfully.`);
        setTimeout(() => setActionSuccessToast(null), 4000);
        setOrderToDelete(null);
        fetchOrders();
        fetchNotifications();
      } else {
        alert(res.message || 'Failed to delete order.');
      }
    } catch (err: any) {
      setIsDeletingOrder(false);
      alert(err.message || 'Error deleting order.');
    }
  };

  const handleConfirmDeleteAllOrders = async () => {
    if (isDeletingAllOrders) return;
    setIsDeletingAllOrders(true);
    try {
      const res = await serviceDeleteAllOrders({
        filter: deleteAllFilter,
        olderThanDays: deleteAllFilter === 'OLD_ONLY' ? deleteAllOlderThanDays : undefined,
        permanent: true,
      });
      setIsDeletingAllOrders(false);
      if (res.success) {
        setActionSuccessToast(`🗑️ ${res.message || 'Orders removed successfully.'}`);
        setTimeout(() => setActionSuccessToast(null), 4000);
        setIsDeleteAllModalOpen(false);
        fetchOrders();
        fetchNotifications();
      } else {
        alert(res.message || 'Failed to delete orders.');
      }
    } catch (err: any) {
      setIsDeletingAllOrders(false);
      alert(err.message || 'Error deleting orders.');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ', id }),
      });
      fetchNotifications();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' }),
      });
      fetchNotifications();
      showStatus('All notifications marked as read.');
    } catch {}
  };

  const handleConfirmDeleteAllNotifications = async () => {
    if (isDeletingAllNotifs) return;
    setIsDeletingAllNotifs(true);
    try {
      const res = await fetch('/api/admin/notifications?all=true', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      setIsDeletingAllNotifs(false);
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        setActionSuccessToast('🗑️ All live order notifications cleared successfully.');
        setTimeout(() => setActionSuccessToast(null), 4000);
        setIsDeleteAllNotifsModalOpen(false);
        fetchNotifications();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error?.message || 'Failed to clear notifications.');
      }
    } catch (err: any) {
      setIsDeletingAllNotifs(false);
      alert(err.message || 'Error clearing notifications.');
    }
  };

  const handleAddDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !discountValue) {
      alert('Please fill coupon code and discount value');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_COUPON',
          payload: {
            code: couponCode,
            discountType,
            discountValue: Number(discountValue),
            minOrderAmount: Number(minOrder),
          },
        }),
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        showStatus(`🏷️ Discount Coupon "${couponCode.toUpperCase()}" created!`);
        setCouponCode('');
        setDiscountValue('');
      } else {
        alert('Failed to add coupon: ' + data.error?.message);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Error creating discount: ' + err.message);
    }
  };

  // If NOT authenticated as Admin, show login gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-950 p-8 rounded-3xl border border-amber-500/30 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-spark">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="font-heading font-extrabold text-2xl text-white">
              Administrator Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Store operations, live catalog prices, discounts, and dispatch review.
            </p>
          </div>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Security Passcode
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="Enter administrator passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full text-xs p-3 pr-14 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:border-amber-500 text-white font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  {showPasscode ? 'Hide' : 'Show'}
                </button>
              </div>
              {authError && (
                <p className="text-xs font-bold text-rose-500 mt-1.5">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-slate-950 font-black text-xs shadow-spark transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>{isLoggingIn ? 'Verifying Credentials...' : 'Unlock Administrator Portal'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Customer Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container-custom max-w-6xl space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-spark">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900">
                  Store Admin Management
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Velmala Hub Dispatch • Photos & Products • Realtime WhatsApp & Portal Notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Alert Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playNotificationChime();
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
              title={soundEnabled ? 'Order sound alert is ON' : 'Order sound alert is MUTED'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Chime MUTED'}</span>
            </button>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Customer Store</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Live Notification Bar / Toast */}
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Incoming Alerts</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <span>{notifications.length}</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} Unread
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Total Orders</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {orders.length}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Catalog Items</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {liveProducts.length}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Total Revenue</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              ₹{orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0)}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all relative ${
              activeTab === 'notifications'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Live Order Notifications</span>
            {unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-rose-600 text-[10px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'products'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Product & Photos</span>
          </button>

          <button
            onClick={() => setActiveTab('manage_prices')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'manage_prices'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Live Catalog & Inventory ({liveProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>All Customer Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'delivery'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Delivery Charges (7 KM)</span>
          </button>

          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'discounts'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Offers & Coupons</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Dispatch</span>
          </button>
        </div>

        {/* TAB 1: LIVE ORDER NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-rose-600 animate-pulse" />
                  <span>Incoming Customer Order Alerts</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Every customer purchase instantly notifies you here and provides a direct WhatsApp dispatch message.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Mark All as Read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllNotifsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors shadow-sm"
                    title="Delete all incoming order notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Notifications</span>
                  </button>
                )}
                <button
                  onClick={fetchNotifications}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Feed</span>
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">No incoming order alerts yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When customers complete checkout, instant notifications with their 10-digit phone, address, and WhatsApp message will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => {
                  const matchingOrder = orders.find((o) => o.orderNumber === notif.orderNumber);

                  return (
                    <div
                      key={notif.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        !notif.isRead
                          ? 'bg-amber-50/40 border-amber-300 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${!notif.isRead ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`} />
                          <div className="font-mono font-extrabold text-sm text-slate-900">
                            #{notif.orderNumber}
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {notif.paymentMethod}
                          </span>
                          {!notif.isRead && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                              NEW ORDER
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 font-medium">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(notif.timestamp).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Notification Body */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 text-xs">
                        <div>
                          <div className="text-slate-400 text-[10px] font-bold uppercase">Customer Details</div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">{notif.customerName || 'Customer'}</div>
                          <div className="font-mono text-emerald-700 font-bold mt-0.5">
                            {notif.customerPhone && notif.customerPhone.trim() ? (
                              notif.customerPhone
                            ) : (
                              <span className="text-slate-400 italic font-sans font-normal text-xs">Not provided</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-400 text-[10px] font-bold uppercase">Delivery Destination</div>
                          <div className="font-medium text-slate-800 truncate mt-0.5" title={notif.deliveryAddress}>
                            {notif.deliveryAddress}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {notif.distanceKm?.toFixed(1)} KM from Velmala Hub
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-400 text-[10px] font-bold uppercase">Order Value</div>
                          <div className="font-extrabold text-amber-600 text-base mt-0.5">
                            ₹{notif.totalAmount}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {notif.itemsCount} total item(s) ordered
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Direct WhatsApp Alert Action */}
                          {notif.whatsappUrl && (
                            <a
                              href={notif.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open WhatsApp Alert</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          )}

                          {/* WhatsApp Customer Action */}
                          {notif.customerPhone && notif.customerPhone.trim() && (
                            <a
                              href={getWhatsAppLink(notif.customerPhone, notif.customerName, notif.orderNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp Customer</span>
                            </a>
                          )}

                          {/* Call Customer Action */}
                          {notif.customerPhone && notif.customerPhone.trim() && (
                            <a
                              href={getPhoneDialLink(notif.customerPhone)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                            >
                              <PhoneCall className="w-3 h-3 text-amber-600" />
                              <span>Call</span>
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Direct Accept / Reject Actions for Pending Review Orders */}
                          {matchingOrder && (matchingOrder.status === 'PENDING_REVIEW' || matchingOrder.status === 'PLACED') ? (
                            <div className="flex items-center gap-1.5">
                              {matchingOrder.paymentMethod === 'COD' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setOrderToAccept(matchingOrder)}
                                    disabled={isProcessingOrderAction}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition-all disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Accept COD Order</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOrderToReject(matchingOrder);
                                      setRejectionReasonInput('');
                                      setRejectionCustomNoteInput('');
                                    }}
                                    disabled={isProcessingOrderAction}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  {matchingOrder.paymentScreenshot && (
                                    <button
                                      type="button"
                                      onClick={() => handleViewScreenshot(matchingOrder)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs transition-colors shadow-sm"
                                      title="View payment screenshot"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Proof</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayment(matchingOrder)}
                                    disabled={isProcessingOrderAction}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition-all disabled:opacity-50"
                                    title="Approve after verifying bank credit"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve Payment</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectPayment(matchingOrder)}
                                    disabled={isProcessingOrderAction}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs transition-colors disabled:opacity-50"
                                    title="Reject payment"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                            </div>
                          ) : matchingOrder ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-400 font-bold text-[11px]">Status:</span>
                              <select
                                value={matchingOrder.status}
                                onChange={(e) => handleUpdateOrderStatus(notif.orderNumber, e.target.value as OrderStatus)}
                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800"
                              >
                                <option value="PENDING_REVIEW">Pending Review</option>
                                <option value="ACCEPTED">Accepted</option>
                                <option value="PREPARING">Preparing</option>
                                <option value="READY_FOR_DELIVERY">Ready for Dispatch</option>
                                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="REJECTED">Reject Order...</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                            </div>
                          ) : null}

                          {/* Delete Order Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const matching = orders.find((o) => o.orderNumber === notif.orderNumber);
                              if (matching) {
                                setOrderToDelete(matching);
                              } else {
                                setOrderToDelete({
                                  id: notif.orderId,
                                  orderNumber: notif.orderNumber,
                                  customerName: notif.customerName,
                                  customerPhone: notif.customerPhone,
                                  deliveryAddress: notif.deliveryAddress,
                                  distanceKm: notif.distanceKm,
                                  totalAmount: notif.totalAmount,
                                  paymentMethod: notif.paymentMethod,
                                  status: 'PENDING_REVIEW',
                                  items: [],
                                  createdAt: notif.timestamp,
                                } as any);
                              }
                            }}
                            title="Delete Order"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                          </button>

                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkNotificationRead(notif.id)}
                              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADD PRODUCT & PHOTO UPLOAD */}
        {activeTab === 'products' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-extrabold text-xl text-slate-900">
                  Add Fireworks Product with Photo
                </h2>
                <p className="text-xs text-slate-500">
                  Upload custom product photo, enter pricing, specifications, and publish instantly to storefront.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Live Storefront Sync
              </span>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-6">
              {/* PHOTO UPLOAD & PRESET SELECTOR SECTION */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-600" />
                    <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Product Photo & Imagery <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Supports JPG, PNG, WEBP (File Upload or Festive Presets)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Photo Preview Card */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48 rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-amber-400 shadow-md group">
                      {photoPreview ? (
                        <>
                          <Image
                            src={photoPreview}
                            alt="Product preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold px-3 py-1 rounded-lg bg-black/60">
                              Active Photo
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-xs font-bold">No photo selected</span>
                        </div>
                      )}
                    </div>
                    {photoPreview && photoPreview !== '/images/sparklers.jpg' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (photoPreview && photoPreview.startsWith('http')) {
                            fetch('/api/admin/upload', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ url: photoPreview }),
                            }).catch(() => {});
                          }
                          setProductImage('/images/sparklers.jpg');
                          setPhotoPreview('/images/sparklers.jpg');
                          showStatus('🗑️ Photo removed, reset to festive default');
                        }}
                        className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>

                  {/* Upload Controls & Presets */}
                  <div className="md:col-span-8 space-y-4">
                    {/* File Upload Button */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Option A: Upload Photo from Device
                      </label>
                      <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer font-bold text-xs text-slate-700 shadow-sm transition-colors">
                        <Upload className="w-4 h-4 text-amber-600" />
                        <span>Choose Image File (JPG / PNG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Option B: Choose Preset */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Option B: Or Choose Curated Festive Photo Preset
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {FESTIVE_IMAGE_PRESETS.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => {
                              setProductImage(preset.url);
                              setPhotoPreview(preset.url);
                              setProductCategory(preset.category);
                            }}
                            className={`p-2 rounded-xl text-left text-[11px] font-bold border transition-all flex items-center gap-2 ${
                              photoPreview === preset.url
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <span className="truncate">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE PRODUCT DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Title / Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50-Shot Golden Super Cake"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Category</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="sparklers">Sparklers & Phooljhadi</option>
                    <option value="skyshots">Aerial Sky Shots</option>
                    <option value="flowerpots">Flower Pots & Anars</option>
                    <option value="chakkars">Ground Chakkars</option>
                    <option value="sound">Sound Crackers & Bombs</option>
                    <option value="rockets">Sky Rockets</option>
                    <option value="novelty">Fancy Novelties & Spinners</option>
                    <option value="hampers">Diwali Gift Hampers</option>
                    <option value="electronic">Electronic Crackers</option>
                  </select>
                </div>
              </div>

              {/* PRICING & STOCK */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-extrabold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">MRP / Strikethrough Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 699"
                    value={productMrp}
                    onChange={(e) => setProductMrp(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pack / Box Quantity</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Box of 10 Pieces"
                    value={productBoxQuantity}
                    onChange={(e) => setProductBoxQuantity(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Available Stock Units</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              {/* SPECS & CERTIFICATION */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sound Decibel Level</label>
                  <input
                    type="text"
                    value={soundDecibel}
                    onChange={(e) => setSoundDecibel(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Smoke Level</label>
                  <input
                    type="text"
                    value={smokeLevel}
                    onChange={(e) => setSmokeLevel(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={isGreenCertified}
                      onChange={(e) => setIsGreenCertified(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded"
                    />
                    <span>100% Green Certified</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded"
                    />
                    <span>Featured on Home</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe colors, effects, safety details..."
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing Product & Photo...' : 'Publish Product to Live Storefront'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: MANAGE LIVE CATALOG & EDIT PRICES */}
        {activeTab === 'manage_prices' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-slate-900">
                  Live Catalog & Pricing Management
                </h2>
                <p className="text-xs text-slate-500">
                  View all products with photos, adjust prices & MRP, update inventory, or remove items.
                </p>
              </div>
              <button
                onClick={fetchProducts}
                className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Catalog</span>
              </button>
            </div>

            {isLoadingProducts ? (
              <p className="text-xs text-slate-500">Loading catalog items...</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {liveProducts.map((p) => {
                  const mainVariant = p.variants[0];
                  const isEditing = editingPriceId === p.id;

                  return (
                    <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-14 h-14 rounded-2xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                          <Image src={p.image} alt={p.name} fill sizes="56px" className="object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 line-clamp-1">{p.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.categoryLabel} • {mainVariant.boxQuantity} • Stock: <span className="font-bold text-slate-800">{mainVariant.stock}</span>
                          </div>
                          {p.badgeText && (
                            <span className="inline-block mt-1 text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {p.badgeText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-2 bg-amber-50/50 p-2.5 rounded-2xl border border-amber-200">
                            <div>
                              <span className="text-[10px] text-slate-500 block font-bold">Photo</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 shrink-0">
                                  <Image src={editImageValue || p.image} alt={p.name} fill sizes="36px" className="object-cover" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <label className="cursor-pointer text-[10px] font-bold text-amber-700 bg-white hover:bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded shadow-sm text-center">
                                    {isUploadingEditPhoto ? '...' : 'Replace'}
                                    <input type="file" accept="image/*" onChange={handleEditPhotoUpload} className="hidden" />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProductImage(p.id, editImageValue || p.image)}
                                    className="text-[9px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                                    title="Delete Photo & Reset"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block font-bold">Price (₹)</span>
                              <input
                                type="number"
                                value={editPriceValue}
                                onChange={(e) => setEditPriceValue(e.target.value)}
                                className="w-20 p-2 text-xs border border-amber-500 rounded-xl font-bold bg-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">MRP (₹)</span>
                              <input
                                type="number"
                                value={editMrpValue}
                                onChange={(e) => setEditMrpValue(e.target.value)}
                                className="w-20 p-2 text-xs border border-slate-300 rounded-xl bg-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block font-bold">Stock Units</span>
                              <input
                                type="number"
                                value={editStockValue}
                                onChange={(e) => setEditStockValue(e.target.value)}
                                className="w-20 p-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Offer Badge (e.g. 50% OFF)</span>
                              <input
                                type="text"
                                placeholder="e.g. DIWALI 40% OFF"
                                value={editOfferBadgeValue}
                                onChange={(e) => setEditOfferBadgeValue(e.target.value)}
                                className="w-32 p-2 text-xs border border-slate-300 rounded-xl bg-white uppercase font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Status</span>
                              <select
                                value={editIsActiveValue ? 'active' : 'inactive'}
                                onChange={(e) => setEditIsActiveValue(e.target.value === 'active')}
                                className="p-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                              >
                                <option value="active">Active (Visible)</option>
                                <option value="inactive">Inactive (Hidden)</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5 pt-3">
                              <button
                                onClick={() => handleUpdatePrice(p.id, mainVariant.id)}
                                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1 text-xs font-bold px-3"
                                title="Save Changes"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingPriceId(null)}
                                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="font-heading font-extrabold text-base text-slate-900">
                                ₹{mainVariant.price}
                              </span>
                              {mainVariant.originalPrice > mainVariant.price && (
                                <span className="text-xs text-slate-400 line-through block">
                                  MRP ₹{mainVariant.originalPrice}
                                </span>
                              )}
                              <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                p.isActive !== false ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                              }`}>
                                {p.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setEditingPriceId(p.id);
                                setEditPriceValue(String(mainVariant.price));
                                setEditMrpValue(String(mainVariant.originalPrice));
                                setEditOfferBadgeValue(p.badgeText || '');
                                setEditStockValue(String(mainVariant.stock));
                                setEditIsActiveValue(p.isActive !== false);
                                setEditImageValue(p.image);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Details & Price</span>
                            </button>

                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ORDER APPROVAL & REJECTION MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            {/* Action Success Toast Banner */}
            {actionSuccessToast && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{actionSuccessToast}</span>
                </div>
                <button
                  onClick={() => setActionSuccessToast(null)}
                  className="text-emerald-700 hover:text-emerald-900 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header */}
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-extrabold text-xl text-slate-900">
                    Order Approval & Rejection Management
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                    Store Operations
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review incoming cracker orders. Accept orders to initiate packing, or reject invalid orders with a structured reason.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors shadow-sm"
                  title="Remove old or all orders"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete All Orders</span>
                </button>
                <button
                  onClick={fetchOrders}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Refresh Orders</span>
                </button>
              </div>
            </div>

            {/* SUB-TABS: All, Pending Review, Accepted, Rejected */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setOrderFilterTab('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  orderFilterTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>All Orders</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] ${orderFilterTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {orders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderFilterTab('PENDING_REVIEW')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  orderFilterTab === 'PENDING_REVIEW'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>⏳ Pending Review</span>
                <span className="px-2 py-0.2 rounded-full bg-amber-200/80 text-amber-950 text-[10px] font-extrabold">
                  {orders.filter((o) => o.status === 'PENDING_REVIEW' || o.status === 'PLACED').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderFilterTab('ACCEPTED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  orderFilterTab === 'ACCEPTED'
                    ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span>✅ Accepted</span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold">
                  {orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY_FOR_DELIVERY' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderFilterTab('REJECTED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  orderFilterTab === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span>❌ Rejected</span>
                <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-900 text-[10px] font-extrabold">
                  {orders.filter((o) => o.status === 'REJECTED' || o.status === 'CANCELLED').length}
                </span>
              </button>
            </div>

            {/* SEARCH & DETAILED STATUS FILTER BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Order ID (NC-...), Customer Name, Phone (+91...), or Delivery Area..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-slate-800"
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="READY_FOR_DELIVERY">Ready for Pickup</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* ORDERS LIST */}
            {(() => {
              const filtered = orders.filter((o) => {
                // Tab Filter
                if (orderFilterTab === 'PENDING_REVIEW') {
                  const isPending = o.status === 'PENDING_REVIEW' || o.status === 'PLACED';
                  if (!isPending) return false;
                } else if (orderFilterTab === 'ACCEPTED') {
                  const isAccepted = o.status === 'ACCEPTED' || o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY_FOR_DELIVERY' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED';
                  if (!isAccepted) return false;
                } else if (orderFilterTab === 'REJECTED') {
                  const isRejected = o.status === 'REJECTED' || o.status === 'CANCELLED';
                  if (!isRejected) return false;
                }

                // Status Dropdown Filter
                if (orderStatusFilter !== 'ALL') {
                  if (o.status !== orderStatusFilter) return false;
                }

                // Search Query Filter
                if (orderSearchQuery.trim()) {
                  const q = orderSearchQuery.trim().toLowerCase();
                  const matchId = (o.orderNumber || '').toLowerCase().includes(q);
                  const matchName = (o.customerName || '').toLowerCase().includes(q);
                  const matchPhone = (o.customerPhone || '').toLowerCase().includes(q);
                  const matchAddress = (o.deliveryAddress || '').toLowerCase().includes(q);
                  if (!matchId && !matchName && !matchPhone && !matchAddress) return false;
                }

                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                    <Package className="w-10 h-10 mx-auto text-slate-300" />
                    <h3 className="font-bold text-sm text-slate-700">No Orders Found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {orderFilterTab === 'PENDING_REVIEW'
                        ? 'There are no pending review orders right now. Newly placed customer orders will appear here automatically.'
                        : orderFilterTab === 'ACCEPTED'
                        ? 'No accepted orders matching the active search or filter.'
                        : orderFilterTab === 'REJECTED'
                        ? 'No rejected orders recorded.'
                        : 'No orders match your filter criteria. Try clearing search or selecting a different tab.'}
                    </p>
                    {(orderSearchQuery || orderStatusFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setOrderSearchQuery('');
                          setOrderStatusFilter('ALL');
                          setOrderFilterTab('ALL');
                        }}
                        className="mt-2 text-xs font-bold text-amber-600 hover:underline"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filtered.map((order) => {
                    const isPending = order.status === 'PENDING_REVIEW' || order.status === 'PLACED';
                    const isAccepted = order.status === 'ACCEPTED' || order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'READY_FOR_DELIVERY' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED';
                    const isRejected = order.status === 'REJECTED' || order.status === 'CANCELLED';

                    return (
                      <div
                        key={order.id || order.orderNumber}
                        className={`p-5 rounded-2xl border transition-all space-y-4 ${
                          isPending
                            ? 'bg-amber-50/30 border-amber-300 shadow-sm'
                            : isRejected
                            ? 'bg-rose-50/20 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Top Bar: Order ID, Date, OTP, Status Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOrderForDetails(order)}
                              className="font-mono font-black text-sm text-slate-900 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Click to view full order details"
                            >
                              #{order.orderNumber}
                            </button>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {order.paymentMethod === 'UPI_QR' ? 'Instant UPI' : order.paymentMethod}
                            </span>
                            {order.upiUtr && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 font-mono font-bold text-[10px]">
                                UTR: {order.upiUtr}
                              </span>
                            )}
                            {order.paymentScreenshot && (
                              <button
                                type="button"
                                onClick={() => handleViewScreenshot(order)}
                                className="px-2.5 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                                title="View uploaded payment screenshot"
                              >
                                <Eye className="w-3 h-3 text-amber-700" />
                                <span>Screenshot</span>
                              </button>
                            )}
                            {order.deliveryOtp && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold text-[10px]">
                                Doorstep OTP: {order.deliveryOtp}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <div className="text-[11px] text-slate-400">
                              {new Date(order.createdAt).toLocaleString()}
                            </div>

                            {/* Status Badge */}
                            {isPending && (
                              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Pending Review</span>
                              </span>
                            )}
                            {isAccepted && (
                              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[11px] border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                <span>Accepted ({order.status})</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-extrabold text-[11px] border border-rose-300 flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-700" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* UPI Payment Verification Alert Banner */}
                        {order.paymentMethod === 'UPI_QR' && isPending && (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                                  ⚡ UPI Payment Verification
                                </span>
                                <span className="font-extrabold text-amber-950">
                                  Amount to verify: <strong className="text-emerald-700 text-sm font-black font-mono">₹{order.totalAmount}</strong>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-slate-700">
                                <span>Customer UTR:</span>
                                <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-amber-300 font-black text-amber-950 text-xs shadow-inner">
                                  {order.upiUtr || 'No UTR submitted'}
                                </span>

                                {order.paymentScreenshot ? (
                                  <button
                                    type="button"
                                    onClick={() => handleViewScreenshot(order)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 border border-amber-400 text-amber-950 font-extrabold text-xs transition-colors shadow-sm"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-amber-800" />
                                    <span>View Screenshot</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-500 italic">
                                    No screenshot uploaded
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-amber-900 font-semibold bg-amber-100/70 px-2 py-1 rounded-md border border-amber-200 max-w-xl">
                                ⚠️ <strong>Confirm Bank Credit:</strong> Verify ₹{order.totalAmount} credit in Axis Bank / GPay before approving. Never approve solely on screenshot or UTR.
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(order)}
                                disabled={isProcessingOrderAction}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Approve Payment</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectPayment(order)}
                                disabled={isProcessingOrderAction}
                                className="px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs transition-colors disabled:opacity-50"
                                title="Reject payment if credit not received"
                              >
                                Reject Payment
                              </button>
                            </div>
                          </div>
                        )}

                        {/* COD Order Review & Approval Banner */}
                        {order.paymentMethod === 'COD' && isPending && (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-2 border-emerald-400 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider shadow-sm">
                                  💵 Cash on Delivery (COD) Order
                                </span>
                                <span className="font-extrabold text-slate-900">
                                  Collect at doorstep: <strong className="text-emerald-700 text-sm font-black font-mono">₹{order.totalAmount}</strong>
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                Verify delivery address and customer contact. Rider will collect payment in cash or doorstep UPI upon delivery.
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setOrderToAccept(order)}
                                disabled={isProcessingOrderAction}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>✓ Accept COD Order</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderToReject(order);
                                  setRejectionReasonInput('');
                                  setRejectionCustomNoteInput('');
                                }}
                                disabled={isProcessingOrderAction}
                                className="px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs transition-colors disabled:opacity-50"
                              >
                                Reject Order
                              </button>
                            </div>
                          </div>
                        )}

                        {/* UPI Payment Verified Banner (for accepted orders) */}
                        {order.paymentMethod === 'UPI_QR' && order.paymentStatus === 'PAID' && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span className="font-bold">
                                ✓ UPI Payment Verified (₹{order.totalAmount})
                              </span>
                              {order.upiUtr && (
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-[10px] text-emerald-800 font-bold">
                                  UTR: {order.upiUtr}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded">
                              Bank Credited
                            </span>
                          </div>
                        )}

                        {/* Customer & Address Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                Customer
                              </span>
                              <strong className="text-slate-900 text-sm block">
                                {order.customerName || 'Customer'}
                              </strong>
                            </div>

                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                Mobile Number
                              </span>
                              {order.customerPhone && order.customerPhone.trim() ? (
                                <div className="space-y-1 mt-0.5">
                                  <span className="font-mono text-emerald-800 font-bold text-xs block">
                                    {order.customerPhone}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <a
                                      href={getPhoneDialLink(order.customerPhone)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] transition-colors"
                                      title={`Call ${order.customerPhone}`}
                                    >
                                      <PhoneCall className="w-3 h-3 text-emerald-700" />
                                      <span>Call</span>
                                    </a>
                                    <a
                                      href={getWhatsAppLink(order.customerPhone, order.customerName, order.orderNumber)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                                      title="Chat on WhatsApp"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs font-medium block mt-0.5">
                                  Not provided
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">
                              Delivery Address
                            </span>
                            <div className="text-slate-700 font-medium leading-relaxed">
                              {order.deliveryAddress}
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.2 rounded-md inline-block mt-0.5">
                              {order.distanceKm} KM from Velmala Hub
                            </span>
                          </div>

                          <div className="flex flex-col justify-between items-start sm:items-end text-left sm:text-right">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">
                              Order Total
                            </span>
                            <span className="font-heading font-black text-xl text-amber-600">
                              ₹{order.totalAmount}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Payment: {order.paymentMethod}
                            </span>
                          </div>
                        </div>

                        {/* Ordered Products and Quantities Breakdown */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                            Ordered Products ({order.items?.length || 0} items)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {order.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800"
                              >
                                <div className="space-y-0.5 pr-2">
                                  <strong className="block text-slate-900 text-xs">
                                    {item.name}
                                  </strong>
                                  <span className="text-[11px] text-slate-500">
                                    {item.variantName || item.boxQuantity} • Qty: <strong className="text-slate-900">{item.quantity}</strong>
                                  </span>
                                </div>
                                <span className="font-bold text-xs text-amber-700 shrink-0">
                                  ₹{item.price * item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Accepted Confirmation Notice */}
                        {isAccepted && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                Order approved and confirmed{order.acceptedAt ? ` on ${new Date(order.acceptedAt).toLocaleDateString()} at ${new Date(order.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.
                              </span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Fulfillment Active
                            </span>
                          </div>
                        )}

                        {/* Rejection Notice & Reason Details */}
                        {isRejected && (
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-rose-800">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Rejection Reason: {order.rejectionReason || 'Order Cancelled'}</span>
                            </div>
                            {order.rejectionNote && (
                              <p className="text-[11px] text-rose-700 italic bg-white/70 p-2 rounded-lg border border-rose-100">
                                &ldquo;{order.rejectionNote}&rdquo;
                              </p>
                            )}
                            <div className="text-[10px] text-rose-600">
                              Rejected on {order.rejectedAt ? new Date(order.rejectedAt).toLocaleString() : new Date(order.updatedAt || order.createdAt).toLocaleString()}
                            </div>
                          </div>
                        )}

                        {/* ACTION CONTROLS: Accept / Reject Buttons for Pending Review */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                          {isPending ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {/* ACCEPT ORDER BUTTON */}
                              <button
                                type="button"
                                onClick={() => setOrderToAccept(order)}
                                disabled={isProcessingOrderAction}
                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Accept Order</span>
                              </button>

                              {/* REJECT ORDER BUTTON */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderToReject(order);
                                  setRejectionReasonInput('');
                                  setRejectionCustomNoteInput('');
                                }}
                                disabled={isProcessingOrderAction}
                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject Order</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400">
                              {isAccepted ? 'Order Accepted • Dispatch in Progress' : 'Order Rejected • Archived'}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Order Dispatch Stage Selector (for accepted orders) */}
                            {isAccepted && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-400 font-bold text-[11px]">Dispatch Stage:</span>
                                <select
                                  value={order.status}
                                  onChange={(e) => handleUpdateOrderStatus(order.orderNumber, e.target.value as OrderStatus)}
                                  className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800"
                                >
                                  <option value="ACCEPTED">Accepted</option>
                                  <option value="PREPARING">Preparing</option>
                                  <option value="READY_FOR_DELIVERY">Ready for Dispatch</option>
                                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                                  <option value="DELIVERED">Delivered</option>
                                  <option value="CANCELLED">Cancelled</option>
                                </select>
                              </div>
                            )}

                            {/* View Full Order Details Button */}
                            <button
                              type="button"
                              onClick={() => setOrderForDetails(order)}
                              title="View Order Details"
                              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Order Details</span>
                            </button>

                            {/* Delete Order Action Button */}
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              title="Delete Order"
                              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        )}

        {/* TAB 5: DELIVERY CHARGES & 7 KM HUB SETTINGS */}
        {activeTab === 'delivery' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-600" />
                  <span>Delivery Charges & 7 KM Geofence Slabs</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Manage local delivery fee slabs, free delivery order threshold, and maximum delivery radius. Changes take effect on storefront checkout immediately.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs self-start sm:self-auto">
                Velmala Central Hub (7 KM)
              </span>
            </div>

            <form onSubmit={handleSaveDeliverySettings} className="space-y-6">
              {/* Slabs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Zone 1: Local Velmala
                  </div>
                  <div className="font-bold text-xs text-slate-800">0.0 to 2.0 KM Radius</div>
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Delivery Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={slab0to2Fee}
                      onChange={(e) => setSlab0to2Fee(e.target.value)}
                      className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Default: ₹40</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Zone 2: Outer Velmala
                  </div>
                  <div className="font-bold text-xs text-slate-800">2.0 to 4.0 KM Radius</div>
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Delivery Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={slab2to4Fee}
                      onChange={(e) => setSlab2to4Fee(e.target.value)}
                      className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Default: ₹70 (Kollur, Osman Nagar)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Zone 3: Extended Boundary
                  </div>
                  <div className="font-bold text-xs text-slate-800">4.0 to 7.0 KM Radius</div>
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Delivery Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={slab4to7Fee}
                      onChange={(e) => setSlab4to7Fee(e.target.value)}
                      className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Default: ₹120 (Tellapur, Mokila)</span>
                </div>
              </div>

              {/* Threshold & Geofence Config */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={freeDeliveryThresholdInput}
                    onChange={(e) => setFreeDeliveryThresholdInput(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Orders above this amount unlock FREE Delivery for customers.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Maximum Geofence Radius (KM)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={maxRadiusInput}
                    onChange={(e) => setMaxRadiusInput(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Orders outside this radius are blocked from checkout.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin WhatsApp Alert Mobile
                  </label>
                  <input
                    type="text"
                    value={adminWhatsAppInput}
                    onChange={(e) => setAdminWhatsAppInput(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    Target mobile for all new customer order WhatsApp alerts.
                  </span>
                </div>

                <div className="sm:col-span-3 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fast2SMS / SMS Gateway API Key (To deliver real OTP SMS to mobile phones)
                  </label>
                  <input
                    type="password"
                    placeholder="Paste Fast2SMS API key (from fast2sms.com)"
                    value={smsApiKeyInput}
                    onChange={(e) => setSmsApiKeyInput(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 mt-1.5">
                    <span>When configured, every customer login will receive real SMS OTPs directly on their mobile phone.</span>
                    <a
                      href="https://www.fast2sms.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 font-bold hover:underline"
                    >
                      Fast2SMS Portal & Wallet →
                    </a>
                  </div>

                  {/* SMS Test Trigger Button & Diagnostic Banner */}
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Instant Cellular SMS Gateway Test
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Dispatches an instant live SMS OTP to the configured admin mobile.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestSmsGateway}
                        disabled={isTestingSms}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 disabled:opacity-50"
                      >
                        {isTestingSms ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Contacting Fast2SMS...</span>
                          </>
                        ) : (
                          <>
                            <span>📲 Send Test SMS</span>
                          </>
                        )}
                      </button>
                    </div>

                    {smsTestFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                          smsTestFeedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        <span>{smsTestFeedback.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Settings are stored on server and synchronized to all active customer sessions.
                </span>
                <button
                  type="submit"
                  disabled={isSavingDelivery}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-spark transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>{isSavingDelivery ? 'Saving Settings...' : 'Save Delivery Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: OFFERS & COUPONS */}
        {activeTab === 'discounts' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-heading font-bold text-base text-slate-900">Create Discount Coupons</h2>
              <p className="text-xs text-slate-500">Create promotional discount codes for checkout</p>
            </div>

            <form onSubmit={handleAddDiscount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DIWALI500"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="PERCENTAGE">Percentage Discount (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount Discount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discount Value ({discountType === 'PERCENTAGE' ? '%' : '₹'})
                  </label>
                  <input
                    type="number"
                    placeholder={discountType === 'PERCENTAGE' ? 'e.g. 15' : 'e.g. 100'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Coupon...' : 'Create Coupon Code'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: WHATSAPP SETTINGS */}
        {activeTab === 'whatsapp' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <span>WhatsApp Admin Order Dispatch Alerts</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Configure store manager WhatsApp contact and inspect the live dispatch message template.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                Active System
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Store Admin WhatsApp Phone Number
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="w-full sm:w-80 text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const cleanDigits = adminPhone.replace(/[^\d]/g, '').slice(-10);
                      await fetch('/api/admin/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ adminWhatsAppNumber: cleanDigits }),
                      });
                      showStatus(`📲 Admin WhatsApp updated to +91 ${cleanDigits}!`);
                    }}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    Save WhatsApp Mobile
                  </button>
                  <a
                    href={`https://wa.me/91${adminPhone.replace(/[^\d]/g, '').slice(-10)}?text=${encodeURIComponent(
                      '🔔 *Uniq Crackers Test Notification*: WhatsApp dispatch alerts are operational!'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Test Open WhatsApp Chat</span>
                  </a>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono leading-relaxed space-y-3">
                <div className="text-amber-400 font-bold font-sans flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Live Formatted WhatsApp Alert Template dispatched to Admin (+91 {adminPhone.replace(/[^\d]/g, '').slice(-10)}):</span>
                </div>
                <div className="whitespace-pre-wrap text-[11px] text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {`🚨 *NEW ORDER RECEIVED - UNIQ CRACKERS VELMALA HUB* 🚨\n\n*Order ID:* #UC-2026-8492\n*Customer:* Valued Customer\n*Customer Mobile:* +91 98765 43210\n\n📍 *Delivery Address:* Near Ramalayam, Velmala, Hyderabad 502300\n📏 *Distance from Velmala Hub:* 1.2 KM\n\n🛒 *Items Ordered:*\n• Aura Luxe 24K Golden Sparklers (Pack of 10) x2 = ₹598\n• Royal Galaxy 30-Shot Aerial Cake x1 = ₹1450\n\n💰 *Total Bill:* ₹2048\n💳 *Payment:* UPI / COD\n🔑 *Doorstep Verification OTP:* 4892\n\n⏰ *Status:* READY FOR PACKING & LOCAL DISPATCH`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GLOBAL ACTION MODALS (ACCESSIBLE ACROSS ALL TABS)                         */}
        {/* ========================================================================= */}

        {/* MODAL 0: FULL ORDER DETAILS DIALOG */}
        {orderForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-extrabold text-lg text-slate-900">
                        Order #{orderForDetails.orderNumber}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {orderForDetails.paymentMethod === 'UPI_QR' ? 'Instant UPI' : orderForDetails.paymentMethod}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Placed on {new Date(orderForDetails.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderForDetails(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer & Mobile Information Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer &amp; Contact Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Customer Name:</span>
                    <strong className="text-slate-900 text-sm block mt-0.5">
                      {orderForDetails.customerName || 'Customer'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Mobile Number:</span>
                    {orderForDetails.customerPhone && orderForDetails.customerPhone.trim() ? (
                      <div className="space-y-1.5 mt-0.5">
                        <span className="font-mono text-emerald-800 font-bold text-sm block">
                          {orderForDetails.customerPhone}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={getPhoneDialLink(orderForDetails.customerPhone)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors"
                            title={`Call ${orderForDetails.customerPhone}`}
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Call</span>
                          </a>
                          <a
                            href={getWhatsAppLink(orderForDetails.customerPhone, orderForDetails.customerName, orderForDetails.orderNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs font-medium block mt-0.5">
                        Not provided
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-xs">
                  <span className="text-slate-500 block">Delivery Address:</span>
                  <div className="text-slate-800 font-medium mt-0.5 leading-relaxed">
                    {orderForDetails.deliveryAddress || 'Not provided'}
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-1">
                    {orderForDetails.distanceKm} KM from Velmala Central Hub
                  </span>
                </div>
              </div>

              {/* Order & Payment Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                  <span className="font-extrabold text-slate-900 mt-0.5 block">{orderForDetails.status}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Payment</span>
                  <span className="font-extrabold text-slate-900 mt-0.5 block">{orderForDetails.paymentMethod}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Doorstep OTP</span>
                  <span className="font-mono font-bold text-amber-900 mt-0.5 block">{orderForDetails.deliveryOtp || 'N/A'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Amount</span>
                  <span className="font-heading font-black text-amber-600 text-sm mt-0.5 block">₹{orderForDetails.totalAmount}</span>
                </div>
              </div>

              {/* UPI & Verification Details */}
              {(orderForDetails.paymentMethod === 'UPI_QR' || orderForDetails.upiUtr || orderForDetails.paymentScreenshot) && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                      <span>UPI Verification Details</span>
                      {orderForDetails.paymentStatus && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${orderForDetails.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'}`}>
                          {orderForDetails.paymentStatus}
                        </span>
                      )}
                    </span>
                    {orderForDetails.paymentScreenshot && (
                      <button
                        type="button"
                        onClick={() => handleViewScreenshot(orderForDetails)}
                        className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-extrabold text-xs transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-800" />
                        <span>View Screenshot Proof</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>
                      <span className="text-slate-500 block">Submitted UTR:</span>
                      <span className="font-mono font-bold text-slate-900">{orderForDetails.upiUtr || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Screenshot Proof:</span>
                      <span className="font-bold text-slate-900">
                        {orderForDetails.paymentScreenshot ? 'Uploaded (Private Vault)' : 'No screenshot uploaded'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Itemized Order Items */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Ordered Items ({orderForDetails.items?.length || 0})
                </span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {orderForDetails.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="space-y-0.5 pr-2">
                        <strong className="block text-slate-900">{item.name}</strong>
                        <span className="text-[11px] text-slate-500">
                          {item.variantName || item.boxQuantity} • Qty: <strong className="text-slate-900">{item.quantity}</strong> × ₹{item.price}
                        </span>
                      </div>
                      <span className="font-bold text-amber-700 shrink-0">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOrderForDetails(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: ACCEPT ORDER CONFIRMATION DIALOG */}
        {orderToAccept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl border border-emerald-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-heading font-extrabold text-xl text-slate-900">
                  Confirm Order Acceptance
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to accept Order <strong className="text-slate-900">#{orderToAccept.orderNumber}</strong>?
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <strong className="text-slate-900">{orderToAccept.customerName || 'Customer'}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mobile Number:</span>
                  {orderToAccept.customerPhone && orderToAccept.customerPhone.trim() ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-800 font-bold">{orderToAccept.customerPhone}</span>
                      <a
                        href={getPhoneDialLink(orderToAccept.customerPhone)}
                        className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title={`Call ${orderToAccept.customerPhone}`}
                      >
                        <PhoneCall className="w-3 h-3" />
                      </a>
                      <a
                        href={getWhatsAppLink(orderToAccept.customerPhone, orderToAccept.customerName, orderToAccept.orderNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="WhatsApp Customer"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Not provided</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-bold text-slate-800">{orderToAccept.paymentMethod === 'COD' ? '💵 Cash on Delivery' : orderToAccept.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Amount:</span>
                  <strong className="text-emerald-700 font-bold">₹{orderToAccept.totalAmount}</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                This will change the order status to <strong>Accepted</strong>, update customer tracking, and ready the package for local packing &amp; dispatch.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToAccept(null)}
                  disabled={isProcessingOrderAction}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAcceptOrder}
                  disabled={isProcessingOrderAction}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isProcessingOrderAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Yes, Accept Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: REJECT ORDER WITH STRUCTURED REASON DIALOG */}
        {orderToReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-slate-900">
                      Reject Order #{orderToReject.orderNumber}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {orderToReject.customerName || 'Customer'} • {orderToReject.customerPhone && orderToReject.customerPhone.trim() ? orderToReject.customerPhone : 'Not provided'} (₹{orderToReject.totalAmount})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOrderToReject(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRejectOrder} className="space-y-4">
                {/* Mandatory Rejection Reason Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-rose-500 text-slate-800"
                  >
                    <option value="">-- Choose a rejection reason --</option>
                    {REJECTION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    This reason will be recorded and shown to the customer on their order tracking screen.
                  </span>
                </div>

                {/* Custom Explanation Text Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Custom Explanation / Additional Note <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional details or notes for this rejection (e.g. 'Customer is 12 km away, outside 7 km geofence')..."
                    value={rejectionCustomNoteInput}
                    onChange={(e) => setRejectionCustomNoteInput(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-rose-500 text-slate-800"
                  />
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Rejecting an order moves it to the <strong>Rejected</strong> list and saves the reason in the store database.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOrderToReject(null)}
                    disabled={isProcessingOrderAction}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!rejectionReasonInput || isProcessingOrderAction}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isProcessingOrderAction ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Rejecting...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Confirm Order Rejection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: DELETE ORDER CONFIRMATION DIALOG */}
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-slate-900">
                      Delete Order #{orderToDelete.orderNumber}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Confirm permanent removal or archive of this order
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  disabled={isDeletingOrder}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Are you sure you want to delete Order <strong className="text-slate-900 font-mono">#{orderToDelete.orderNumber}</strong>?
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <strong className="text-slate-900">{orderToDelete.customerName || 'Customer'}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Mobile Number:</span>
                    <span className="font-mono text-slate-800 font-bold">
                      {orderToDelete.customerPhone && orderToDelete.customerPhone.trim() ? orderToDelete.customerPhone : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Amount:</span>
                    <strong className="text-emerald-700">₹{orderToDelete.totalAmount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-slate-800 uppercase">{orderToDelete.status}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Persistence &amp; Record Protection</span>
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    This order will be removed from your active order list and live notifications. Financial transaction history is archived safely for audit trails.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  disabled={isDeletingOrder}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteOrder}
                  disabled={isDeletingOrder}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingOrder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE ALL / OLD ORDERS MODAL */}
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-slate-900">
                      Delete &amp; Clear Orders
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bulk remove old, completed, or all orders from the platform
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  disabled={isDeletingAllOrders}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Select which orders you would like to remove from the system. This will clear the matching records and remove them from your active orders list and notification feed.
                </p>

                {/* Filter Options */}
                <div className="space-y-2.5">
                  {/* Option 1: Completed & Rejected Orders Only */}
                  <label
                    onClick={() => setDeleteAllFilter('COMPLETED_OR_CANCELLED')}
                    className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      deleteAllFilter === 'COMPLETED_OR_CANCELLED'
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="deleteAllFilter"
                        checked={deleteAllFilter === 'COMPLETED_OR_CANCELLED'}
                        onChange={() => setDeleteAllFilter('COMPLETED_OR_CANCELLED')}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900">
                            Completed, Delivered &amp; Cancelled Orders Only
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            Recommended Safe Cleanup
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Removes finished orders (Delivered, Rejected, Cancelled). Active and pending review orders will stay completely safe.
                        </p>
                        <div className="mt-1.5 text-[11px] font-bold text-slate-700">
                          Targets:{' '}
                          <span className="text-emerald-700 font-extrabold">
                            {orders.filter((o) => ['DELIVERED', 'REJECTED', 'CANCELLED'].includes(o.status)).length}
                          </span>{' '}
                          of {orders.length} orders
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Orders older than X days */}
                  <label
                    onClick={() => setDeleteAllFilter('OLD_ONLY')}
                    className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      deleteAllFilter === 'OLD_ONLY'
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="deleteAllFilter"
                        checked={deleteAllFilter === 'OLD_ONLY'}
                        onChange={() => setDeleteAllFilter('OLD_ONLY')}
                        className="mt-1 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900">
                            Orders Older Than Specific Days
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                            Archive Old
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Removes historical orders created more than {deleteAllOlderThanDays} day{deleteAllOlderThanDays > 1 ? 's' : ''} ago.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600">Older than:</span>
                          <select
                            value={deleteAllOlderThanDays}
                            onChange={(e) => setDeleteAllOlderThanDays(Number(e.target.value))}
                            className="p-1 px-2 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                          >
                            <option value={1}>1 Day</option>
                            <option value={3}>3 Days</option>
                            <option value={7}>7 Days</option>
                            <option value={14}>14 Days</option>
                            <option value={30}>30 Days</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Option 3: All Orders (Complete Purge) */}
                  <label
                    onClick={() => setDeleteAllFilter('ALL')}
                    className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      deleteAllFilter === 'ALL'
                        ? 'border-rose-500 bg-rose-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="deleteAllFilter"
                        checked={deleteAllFilter === 'ALL'}
                        onChange={() => setDeleteAllFilter('ALL')}
                        className="mt-1 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-rose-950">
                            Delete All Orders (Full Purge)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                            Reset All ({orders.length})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Clears every single order in the database, including pending orders. Cleans up all test orders and resets notifications.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Important Confirmation Notice</span>
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    This action deletes matching orders from server storage and clears related notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  disabled={isDeletingAllOrders}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteAllOrders}
                  disabled={isDeletingAllOrders}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingAllOrders ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Orders...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm &amp; Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE ALL LIVE ORDER NOTIFICATIONS MODAL */}
        {isDeleteAllNotifsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-slate-900">
                      Clear Order Alerts
                    </h3>
                    <p className="text-xs text-slate-500">
                      Remove all incoming order notifications from feed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteAllNotifsModalOpen(false)}
                  disabled={isDeletingAllNotifs}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Are you sure you want to delete all <strong className="text-slate-900 font-bold">{notifications.length}</strong> incoming order notification(s)?
                </p>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  This clears the live alert feed. Your actual customer order records in <strong>Tab 4 (Orders)</strong> will remain safely saved in the database.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllNotifsModalOpen(false)}
                  disabled={isDeletingAllNotifs}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAllNotifications}
                  disabled={isDeletingAllNotifs}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingAllNotifs ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Clearing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All Alerts</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: VIEW PAYMENT SCREENSHOT (SECURE PRIVATE BUCKET) */}
        {viewingScreenshotOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-3xl border border-amber-300 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-slate-900">
                      Payment Screenshot • Order #{viewingScreenshotOrder.orderNumber}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Amount: <strong className="text-emerald-700 font-bold font-mono">₹{viewingScreenshotOrder.totalAmount}</strong> • UTR:{' '}
                      <strong className="text-slate-800 font-mono">{viewingScreenshotOrder.upiUtr || 'Not provided'}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewingScreenshotOrder(null);
                    setViewingScreenshotUrl(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Screenshot Content Area */}
              <div className="flex-1 overflow-y-auto flex items-center justify-center min-h-[300px] bg-slate-950 rounded-2xl border border-slate-800 p-3 relative">
                {isLoadingScreenshot ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                    <span className="text-xs font-bold">Loading secure signed screenshot...</span>
                  </div>
                ) : viewingScreenshotUrl ? (
                  <div className="relative max-h-[60vh] flex flex-col items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingScreenshotUrl}
                      alt={`Payment proof for Order #${viewingScreenshotOrder.orderNumber}`}
                      className="max-h-[58vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-rose-400 font-bold">
                    Unable to load payment screenshot.
                  </div>
                )}
              </div>

              {/* Warning Notice & Actions */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Mandatory Manual Verification Required</span>
                </div>
                <p className="text-amber-900/90 leading-snug">
                  Screenshots and UTR numbers can be forged or recycled. Before approving, you must check your actual Axis Bank / Google Pay statement for credit of <strong>₹{viewingScreenshotOrder.totalAmount}</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {viewingScreenshotUrl ? (
                  <a
                    href={viewingScreenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Full Image</span>
                  </a>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const order = viewingScreenshotOrder;
                      setViewingScreenshotOrder(null);
                      setViewingScreenshotUrl(null);
                      handleRejectPayment(order);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs transition-colors"
                  >
                    Reject Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const order = viewingScreenshotOrder;
                      setViewingScreenshotOrder(null);
                      setViewingScreenshotUrl(null);
                      handleApprovePayment(order);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Payment</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
