'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Flame,
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
  AlertCircle,
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
  MapPin,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProductItem, OrderStatus } from '@/types';
import { AdminNotification, ServerOrder } from '@/lib/server-store';

const FESTIVE_IMAGE_PRESETS = [
  { label: 'Golden Sparklers', url: '/images/sparklers.jpg', category: 'sparklers' },
  { label: 'Aerial Sky Shots', url: '/images/skyshots.jpg', category: 'skyshots' },
  { label: 'Flower Pots / Anar', url: '/images/anar.jpg', category: 'flowerpots' },
  { label: 'Ground Chakkars', url: '/images/chakkar.jpg', category: 'chakkars' },
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

export default function AdminPage() {
  const { isAdmin, logout, loginAsAdmin } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'notifications' | 'products' | 'manage_prices' | 'orders' | 'discounts' | 'whatsapp'>('notifications');

  // Notifications & Realtime State
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const prevNotifIdsRef = useRef<Set<string>>(new Set());

  // Product Form State
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('sparklers');
  const [productVariantName, setProductVariantName] = useState('Standard Pack');
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
  const [adminPhone, setAdminPhone] = useState('+91 90000 00000');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Catalog State for Price Editing
  const [liveProducts, setLiveProducts] = useState<ProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [editMrpValue, setEditMrpValue] = useState<string>('');
  const [editStockValue, setEditStockValue] = useState<string>('');

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

  // Fetch Live Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch {}
  };

  // Fetch Live Catalog
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/catalog');
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

  // Initial and recurring sync
  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      fetchOrders();
      fetchProducts();

      // Poll every 5 seconds for incoming orders and WhatsApp alerts
      const interval = setInterval(() => {
        fetchNotifications();
        fetchOrders();
      }, 5000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, soundEnabled]);

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (loginAsAdmin(passcode)) {
      setPasscode('');
    } else {
      setAuthError('Invalid passcode. Default is "admin123"');
    }
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 6 * 1024 * 1024) {
      alert('Photo is larger than 6MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProductImage(reader.result);
        setPhotoPreview(reader.result);
        showStatus('📸 Photo uploaded and previewed successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Product with photo and complete specs
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice) {
      alert('Please fill product name and price');
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
      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        showStatus(`🎉 Product "${productName}" with photo added to Live Catalog!`);
        setProductName('');
        setProductPrice('');
        setProductMrp('');
        setProductDescription('');
        fetchProducts();
        setActiveTab('manage_prices');
      } else {
        alert('Failed to add product: ' + data.error?.message);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Error adding product: ' + err.message);
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
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('✅ Price updated successfully!');
        setEditingPriceId(null);
        fetchProducts();
      } else {
        alert('Failed to update price: ' + data.error?.message);
      }
    } catch (err: any) {
      alert('Error updating price: ' + err.message);
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
        showStatus('🗑️ Product removed from store catalog');
        fetchProducts();
      }
    } catch (err: any) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderNumber: string, status: OrderStatus) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, status }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`🚚 Order #${orderNumber} marked as ${status}!`);
        fetchOrders();
      }
    } catch (err: any) {
      alert('Error updating order status: ' + err.message);
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
        <div className="max-w-md w-full bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="font-heading font-extrabold text-2xl text-white">
              Administrator Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Restricted management area to add products, photos, review live orders, and dispatch WhatsApp alerts.
            </p>
          </div>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Admin Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode (admin123)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:border-amber-500 text-white font-mono"
                autoFocus
              />
              {authError && (
                <p className="text-xs font-bold text-rose-500 mt-1">{authError}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Default password: <code className="text-amber-400 font-mono">admin123</code>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-colors"
            >
              Unlock Administrator Portal
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
            onClick={() => setActiveTab('discounts')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'discounts'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Coupons</span>
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
            <span>WhatsApp Settings</span>
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

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Mark All as Read
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
                          <div className="font-bold text-slate-900 text-sm mt-0.5">{notif.customerName}</div>
                          <div className="font-mono text-emerald-700 font-bold mt-0.5">
                            {notif.customerPhone}
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
                          <a
                            href={`https://wa.me/${notif.customerPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hello ${notif.customerName}, regarding your N Crackers Order #${notif.orderNumber}:`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                          >
                            <span>WhatsApp Customer</span>
                          </a>

                          {/* Call Customer Action */}
                          <a
                            href={`tel:${notif.customerPhone.replace(/[^\d]/g, '')}`}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                          >
                            <PhoneCall className="w-3 h-3 text-amber-600" />
                            <span>Call</span>
                          </a>
                        </div>

                        <div className="flex items-center gap-2">
                          {matchingOrder && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-400 font-bold text-[11px]">Status:</span>
                              <select
                                value={matchingOrder.status}
                                onChange={(e) => handleUpdateOrderStatus(notif.orderNumber, e.target.value as OrderStatus)}
                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800"
                              >
                                <option value="CONFIRMED">CONFIRMED</option>
                                <option value="PREPARING">PREPARING</option>
                                <option value="READY_FOR_DELIVERY">READY FOR PICKUP</option>
                                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                                <option value="DELIVERED">DELIVERED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </div>
                          )}

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
                          <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized />
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
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold">Price (₹)</span>
                              <input
                                type="number"
                                value={editPriceValue}
                                onChange={(e) => setEditPriceValue(e.target.value)}
                                className="w-20 p-2 text-xs border border-amber-500 rounded-xl font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">MRP (₹)</span>
                              <input
                                type="number"
                                value={editMrpValue}
                                onChange={(e) => setEditMrpValue(e.target.value)}
                                className="w-20 p-2 text-xs border border-slate-200 rounded-xl"
                              />
                            </div>
                            <button
                              onClick={() => handleUpdatePrice(p.id, mainVariant.id)}
                              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              title="Save New Price"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className="p-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                            >
                              ✕
                            </button>
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
                            </div>

                            <button
                              onClick={() => {
                                setEditingPriceId(p.id);
                                setEditPriceValue(String(mainVariant.price));
                                setEditMrpValue(String(mainVariant.originalPrice));
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Price</span>
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

        {/* TAB 4: ALL CUSTOMER ORDERS MASTER LIST */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-slate-900">
                  All Customer Orders ({orders.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Master fulfillment register with 10-digit customer mobile numbers, delivery OTPs & statuses.
                </p>
              </div>
              <button
                onClick={fetchOrders}
                className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Orders</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No orders recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <div key={order.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-slate-900">
                          #{order.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {order.paymentMethod}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px]">
                          Doorstep OTP: {order.deliveryOtp}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Customer</span>
                        <strong className="text-slate-900">{order.customerName}</strong>
                        <div className="font-mono text-emerald-700 font-bold">{order.customerPhone}</div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block">Address</span>
                        <div className="truncate text-slate-700">{order.deliveryAddress}</div>
                        <span className="text-slate-400 text-[10px]">{order.distanceKm} km from Hub</span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">Total Amount</span>
                          <span className="font-heading font-extrabold text-base text-amber-600">
                            ₹{order.totalAmount}
                          </span>
                        </div>

                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.orderNumber, e.target.value as OrderStatus)}
                          className="p-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PREPARING">PREPARING</option>
                          <option value="READY_FOR_DELIVERY">READY FOR PICKUP</option>
                          <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COUPONS */}
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
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full sm:w-80 text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono leading-relaxed space-y-3">
                <div className="text-amber-400 font-bold font-sans flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Live Formatted WhatsApp Alert Template:</span>
                </div>
                <div className="whitespace-pre-wrap text-[11px] text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {`🚨 *NEW ORDER RECEIVED - N CRACKERS* 🚨\n\n*Order No:* #NC-2026-8492\n*Customer:* Valued Customer\n*Phone:* ${adminPhone}\n\n📍 *Delivery Location:* Near Ramalayam, Velmala, Hyderabad 502300\n📏 *Distance from Hub:* 1.2 KM (Velmala)\n\n🛒 *Ordered Items:*\n• Aura Luxe 24K Golden Sparklers x2 - ₹598\n• Royal Galaxy 30-Shot Aerial Cake x1 - ₹1450\n\n💵 *Total Amount:* ₹2048\n💳 *Payment Method:* COD / UPI\n\n⏰ *Status:* READY FOR DISPATCH`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
