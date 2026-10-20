'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Flame,
  MapPin,
  ShoppingBag,
  Search,
  User,
  Menu,
  X,
  ChevronDown,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  Compass,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ProductItem } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/products-data';

export const Header: React.FC = () => {
  const router = useRouter();
  const { cartCount, subtotal, openCart, deliveryLocation, openLocationModal } = useCart();
  const { isAdmin, user, isPhoneVerified, openOtpModal, openAdminLogin, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Live Instant Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync catalog for instant live search
  useEffect(() => {
    fetch('/api/admin/catalog')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setCatalogProducts(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim() === ''
    ? []
    : catalogProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchOpen(false);
    const catalog = document.getElementById('catalog');
    if (catalog) {
      const catalogInput = catalog.querySelector('input') as HTMLInputElement | null;
      if (catalogInput) {
        catalogInput.value = searchQuery;
        catalogInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      catalog.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="w-full bg-[#07090e]/95 backdrop-blur-xl border-b border-amber-500/20 sticky top-0 z-40 shadow-2xl transition-all">
      {/* 1. TOP FESTIVE TICKER */}
      <div className="bg-[#05070a] text-slate-200 text-xs py-2 px-4 border-b border-amber-500/20">
        <div className="container-custom flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <p className="font-semibold truncate text-[11px] sm:text-xs text-slate-300">
              ✨ <strong className="text-amber-400 font-extrabold">Diwali 2026 Special:</strong> 35-Min Express Delivery within 7 KM of Velmala Hub • Use coupon <span className="text-amber-300 font-mono font-bold bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded">DIWALI2026</span> for 10% OFF!
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-slate-300 text-[11px] font-semibold shrink-0">
            <Link href="#delivery" className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>7 KM Radius Map</span>
            </Link>
            <Link href="#safety" className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSIR Green Certified</span>
            </Link>
            <a href="tel:919000000000" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors text-amber-300">
              <PhoneCall className="w-3 h-3 text-amber-400" />
              <span>Velmala Hub: +91 90000 00000</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER NAVBAR */}
      <div className="container-custom py-3.5 flex items-center justify-between gap-4 lg:gap-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-slate-950 shadow-spark group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <span className="font-heading text-xl lg:text-2xl font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
              N CRACKERS
            </span>
            <span className="block text-[9px] uppercase font-black tracking-wider text-amber-400">
              Hyderabad • 7 KM Local Hub
            </span>
          </div>
        </Link>

        {/* Live Instant Search Bar - Desktop */}
        <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-lg relative">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <input
              type="text"
              placeholder="Search sparklers, sky shots, flowerpots, hampers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-slate-900/90 hover:bg-slate-900 text-slate-100 placeholder-slate-400 text-xs sm:text-sm rounded-2xl pl-4 pr-11 py-2.5 border border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center transition-all shadow-sm font-bold"
              aria-label="Search Fireworks"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-1 max-h-96 overflow-y-auto">
              <div className="p-2 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                <span>Matching Fireworks ({searchResults.length})</span>
                <span className="text-amber-400">Press Enter for full results</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No fireworks found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                searchResults.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                        {product.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {product.categoryLabel} • {product.variants[0].boxQuantity}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-heading font-black text-xs text-amber-300">
                        ₹{product.variants[0].price}
                      </div>
                      {product.variants[0].originalPrice > product.variants[0].price && (
                        <div className="text-[10px] text-slate-500 line-through">
                          ₹{product.variants[0].originalPrice}
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        {/* Location Selector Pill */}
        <button
          type="button"
          onClick={openLocationModal}
          className="hidden xl:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
        >
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="max-w-[150px] truncate text-xs">
            <div className="text-[9px] text-amber-400 uppercase font-black tracking-wider">7 KM Velmala Hub</div>
            <div className="font-extrabold text-slate-200 truncate">{deliveryLocation.address}</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
        </button>

        {/* Action Controls: Track Order + User + Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Track Order Link */}
          <Link
            href="/track-order"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Track Order</span>
          </Link>

          {/* User Auth Pill / Profile */}
          <div className="relative">
            {isPhoneVerified ? (
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-900/80 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="hidden sm:inline truncate max-w-[100px]">{user?.phone || 'Customer'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={openOtpModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Login</span>
              </button>
            )}

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1">
                <Link
                  href="/track-order"
                  onClick={() => setUserDropdownOpen(false)}
                  className="block px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  My Deliveries & OTP
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-2 rounded-xl text-amber-400 hover:bg-slate-800 font-bold"
                  >
                    Admin Console
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-slate-800"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Cart Button with Glowing Count Badge */}
          <button
            type="button"
            onClick={openCart}
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm shadow-festive hover:scale-[1.02] transition-all"
            aria-label="Festive Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4 text-slate-950" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black flex items-center justify-center border border-amber-400">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">₹{subtotal}</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 3. MOBILE MENU COLLAPSIBLE */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-festive-obsidian p-4 space-y-4 animate-in slide-in-from-top-4 duration-200">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search fireworks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 placeholder-slate-400 text-xs rounded-xl pl-3 pr-9 py-2 border border-slate-700"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Location button */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openLocationModal();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-left"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-amber-400 block font-bold">7 KM Delivery Address</span>
                <span className="text-slate-200 font-extrabold truncate">{deliveryLocation.address}</span>
              </div>
            </div>
            <span className="text-amber-400 text-xs font-bold shrink-0">Change</span>
          </button>

          {/* Quick Nav Links */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
            <a
              href="#catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:text-amber-400 flex items-center gap-2"
            >
              <span>🎆 All Fireworks</span>
            </a>
            <a
              href="#combos"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:text-amber-400 flex items-center gap-2"
            >
              <span>🎁 Gift Hampers</span>
            </a>
            <Link
              href="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:text-amber-400 flex items-center gap-2"
            >
              <span>📍 Live Tracking</span>
            </Link>
            <a
              href="#safety"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:text-amber-400 flex items-center gap-2"
            >
              <span>🌿 Green Cracker</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
