'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Flame,
  Sparkles,
  ShieldCheck,
  MapPin,
  Clock,
  Award,
  Search,
  ArrowRight,
  Star,
  CheckCircle2,
  AlertTriangle,
  Gift,
  HelpCircle,
  ChevronDown,
  Navigation,
  Check,
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { ProductItem } from '@/types';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/ecommerce/ProductCard';
import { ProductQuickViewModal } from '@/components/ecommerce/ProductQuickViewModal';
import { Button } from '@/components/ui/Button';
import { STORE_DEFAULTS, DELIVERY_PRICING_SLABS } from '@/lib/constants';

const CATEGORIES = [
  { id: 'all', label: 'All Fireworks' },
  { id: 'sparklers', label: 'Sparklers & Phooljhadi' },
  { id: 'skyshots', label: 'Aerial Sky Shots' },
  { id: 'flowerpots', label: 'Flower Pots & Anars' },
  { id: 'chakkars', label: 'Ground Chakkars' },
  { id: 'hampers', label: 'Festive Hampers' },
  { id: 'electronic', label: 'Electronic Crackers' },
];

const CUSTOMER_REVIEWS = [
  {
    name: 'Rajesh Varma',
    location: 'Tellapur, Hyderabad',
    rating: 5,
    date: '2 days ago',
    comment:
      'The 7 km delivery is super fast! Received my Golden Sparklers and 30-shot cake in Velmala within 35 minutes. Zero smoke irritation and very vibrant fireworks.',
  },
  {
    name: 'Sneha Reddy',
    location: 'Kollur ORR Township',
    rating: 5,
    date: 'Yesterday',
    comment:
      'We loved the Velmala Royale Family Hamper. Perfect assortment for kids and adults. Clean green cracker certification QR was verifiable on the box.',
  },
  {
    name: 'Vikram Joshi',
    location: 'Mokila Villas',
    rating: 5,
    date: '3 days ago',
    comment:
      'The delivery OTP verification system gave us high trust. Paid via UPI QR on delivery. Best fireworks experience in West Hyderabad.',
  },
];

const FAQS = [
  {
    q: 'How does the 7 KM local delivery work?',
    a: 'N Crackers operates a dedicated local fulfillment hub at Velmala, Hyderabad (502300). We calculate exact spherical distance using the Haversine algorithm. If your delivery address falls within 7.0 KM, our local fleet delivers within 30-45 minutes. Addresses beyond 7.0 KM are rejected to ensure swift dispatch times.',
  },
  {
    q: 'Are all fireworks certified Green Crackers?',
    a: 'Yes, 100%. All products in our catalog are manufactured under strict licenses from PESO and CSIR-NEERI. They contain no barium salts and release 70% to 80% less smoke compared to conventional crackers. Each box includes an authentic CSIR-NEERI QR code you can scan.',
  },
  {
    q: 'What payment options are available?',
    a: 'We accept Cash on Delivery (COD), UPI Intent / QR scan on arrival, and Razorpay online payments. For COD, our delivery agent will confirm receipt via an OTP sent to your phone upon arrival.',
  },
  {
    q: 'What is the 15-Minute Inventory Hold?',
    a: 'During peak festival rush, hundreds of orders are placed simultaneously. When you initiate checkout, our database immediately places an atomic 15-minute reservation on your selected fireworks so no other customer can buy your reserved boxes.',
  },
];

export default function HomePage() {
  const {
    addItem,
    deliveryLocation,
    openLocationModal,
    openCart,
  } = useCart();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Filter & Sort Catalog
  const filteredProducts = useMemo(() => {
    return INITIAL_PRODUCTS.filter((prod) => {
      const matchCat = activeCategory === 'all' || prod.category === activeCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.variants[0].price - b.variants[0].price;
      if (sortBy === 'price-desc') return b.variants[0].price - a.variants[0].price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [activeCategory, searchQuery, sortBy]);

  // Featured Mega Hamper for spotlight section
  const spotlightHamper = INITIAL_PRODUCTS.find((p) => p.id === 'prod-hamper-05') || INITIAL_PRODUCTS[0];

  return (
    <div className="space-y-16 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center overflow-hidden bg-slate-950">
        {/* Background Visual Banner with Festive Overlay */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero_fireworks.jpg"
            alt="Diwali fireworks bursting over Hyderabad night sky"
            fill
            priority
            className="object-cover object-center opacity-45 scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/60" />
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-slate-950/40 to-slate-950" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-festive-crimson/20 border border-amber-500/30 text-amber-400 text-xs font-bold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                <span>Diwali 2026 Collection Live • Factory Direct Pricing</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                India&apos;s Most Radiant <br />
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-festive-ruby bg-clip-text text-transparent">
                  Green Fireworks
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Handcrafted low-smoke sparklers, sky cakes, crackling anars, and grand family hampers.
                Dispatched directly from our <strong>Velmala, Hyderabad</strong> fulfillment center with
                guaranteed local delivery within our <strong>7 KM geofence</strong>.
              </p>

              {/* Trust Features Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% CSIR Green</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>7 KM Fast Dispatch</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                  <Award className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span>Up to 40% OFF</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a href="#catalog">
                  <Button
                    variant="festive"
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="font-bold shadow-spark"
                  >
                    Explore Diwali Catalog
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={openLocationModal}
                  leftIcon={<MapPin className="w-4 h-4 text-amber-400" />}
                  className="font-bold bg-slate-900/80 text-white border-amber-500/40 hover:bg-slate-800"
                >
                  Verify My 7 KM Location
                </Button>
              </div>
            </div>

            {/* Right Quick Delivery Location Check Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-amber-500/30 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-heading font-bold text-sm text-white">
                        7 KM Delivery Geofence Check
                      </h2>
                      <p className="text-[11px] text-slate-400">Hub: Velmala (F6GQ+7PW, 502300)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Radius: 7 KM
                  </span>
                </div>

                {/* Current Location Result Card */}
                <div
                  className={`p-4 rounded-2xl border text-xs transition-all ${
                    deliveryLocation.isDeliverable
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/40 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {deliveryLocation.isDeliverable ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">{deliveryLocation.address}</span>
                      </div>
                      <div className="text-[11px] opacity-80">
                        Distance: <strong>{deliveryLocation.distanceKm.toFixed(2)} km</strong> from Velmala Center
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                        deliveryLocation.isDeliverable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {deliveryLocation.isDeliverable ? 'Eligible' : 'Outside Zone'}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-current/20 flex items-center justify-between text-[11px] font-semibold">
                    <span>{deliveryLocation.zoneLabel}</span>
                    <span className="font-bold text-white">
                      {deliveryLocation.isDeliverable
                        ? `Delivery Fee: ₹${deliveryLocation.deliveryFee}`
                        : "We don't deliver to your location"}
                    </span>
                  </div>
                </div>

                {/* Change Location Action */}
                <button
                  type="button"
                  onClick={openLocationModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-400" />
                  <span>Test Nearby Locality or Use GPS</span>
                </button>

                {/* Quick Slabs Reminder */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>0-2 km: ₹40</span>
                  <span>2-4 km: ₹70</span>
                  <span>4-7 km: ₹120</span>
                  <span className="text-amber-400 font-bold">&gt;7 km: Ineligible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FESTIVE MEGA HAMPER SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 border border-amber-500/30 overflow-hidden shadow-2xl p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual Box */}
            <div className="lg:col-span-5 relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 shadow-spark">
              <Image
                src={spotlightHamper.image}
                alt={spotlightHamper.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-festive-crimson text-white shadow-md">
                  SAVE ₹1,500
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white bg-slate-950/70 backdrop-blur-md p-2 rounded-xl">
                <span>⭐ {spotlightHamper.rating} Rating (215 Reviews)</span>
                <span className="text-emerald-400 font-bold">In Stock at Velmala</span>
              </div>
            </div>

            {/* Content & Ordering */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 uppercase tracking-widest">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>DIWALI DHAMAKA FAMILY BOX</span>
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white">
                {spotlightHamper.name}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The ultimate festive pyrotechnic collection for the whole family. Contains 35 premium
                CSIR-NEERI green cracker units including a 12-Shot Aerial Cake, 20 Sparklers, 6 Giant Color
                Anars, 10 Ground Spinners, Safety Firing Torch, and 2 Traditional Clay Diyas.
              </p>

              {/* Items Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs py-1">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200">
                  <strong>1x 12-Shot Cake</strong> (Aerial)
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200">
                  <strong>20x Sparklers</strong> (24K Gold)
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200">
                  <strong>6x Giant Anars</strong> (Flower Pots)
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200">
                  <strong>10x Chakkars</strong> (Deluxe)
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200">
                  <strong>2x Clay Diyas</strong> (Traditional)
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200">
                  <strong>Safety Torch</strong> (Included)
                </div>
              </div>

              {/* Price & Add to Cart */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white font-heading">
                    ₹{spotlightHamper.variants[0].price}
                  </span>
                  <span className="text-base text-slate-400 line-through">
                    ₹{spotlightHamper.variants[0].originalPrice}
                  </span>
                </div>

                <Button
                  variant="festive"
                  size="lg"
                  onClick={() =>
                    addItem({
                      productId: spotlightHamper.id,
                      variantId: spotlightHamper.variants[0].id,
                      name: spotlightHamper.name,
                      variantName: spotlightHamper.variants[0].name,
                      boxQuantity: spotlightHamper.variants[0].boxQuantity,
                      price: spotlightHamper.variants[0].price,
                      originalPrice: spotlightHamper.variants[0].originalPrice,
                      image: spotlightHamper.image,
                      quantity: 1,
                    })
                  }
                  className="font-bold shadow-spark"
                >
                  Add Grand Box to Cart
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setQuickViewProduct(spotlightHamper)}
                  className="text-white border-slate-700 hover:bg-slate-800"
                >
                  View Contents
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MASTER CATALOG SECTION */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CERTIFIED GREEN FIREWORKS CATALOG</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
              Celebrate in Full Glory
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              All items are tested for safety, low smoke emission, and authentic festive sparkle.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search crackers, cakes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2.5 px-3.5 rounded-2xl text-xs bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-spark scale-105'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
            <p className="text-sm font-bold text-white">No fireworks matched your search &quot;{searchQuery}&quot;.</p>
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onAddToCart={(item) => addItem(item)}
                onQuickView={(p) => setQuickViewProduct(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. GREEN CRACKERS & SAFETY TRUST BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                ENVIRONMENTALLY RESPONSIBLE CELEBRATION
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl font-black text-white">
                What Makes Our Crackers 100% Green?
              </h3>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-5 h-5" />
              <span>Certified by CSIR-NEERI & PESO</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                70%
              </div>
              <h4 className="font-bold text-white text-sm">Reduced Smoke Emission</h4>
              <p className="text-slate-400 leading-relaxed">
                Formulated with eco-friendly chemical oxidizers that slash particulate matter (PM 2.5) by up to 70%.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                0%
              </div>
              <h4 className="font-bold text-white text-sm">Barium Nitrate Free</h4>
              <p className="text-slate-400 leading-relaxed">
                Free of toxic barium salts, lead, mercury, and arsenic in strict compliance with Supreme Court directives.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                📱
              </div>
              <h4 className="font-bold text-white text-sm">QR Code Verifiable</h4>
              <p className="text-slate-400 leading-relaxed">
                Download the official CSIR-NEERI Green QR Scanner app to verify manufacturing lab certificates instantly.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                🐾
              </div>
              <h4 className="font-bold text-white text-sm">Pet & Child Gentle</h4>
              <p className="text-slate-400 leading-relaxed">
                Decibel sound ratings clearly indicated on all boxes with zero shock impact on pets and senior citizens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VERIFIED CUSTOMER REVIEWS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
            TESTED & TRUSTED BY THOUSANDS
          </span>
          <h3 className="font-heading text-3xl font-black text-white">
            Customer Reviews from Hyderabad
          </h3>
          <p className="text-xs text-slate-400">
            Real feedback from verified buyers across Velmala, Tellapur, and Kollur.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CUSTOMER_REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{rev.name}</div>
                  <div className="text-[11px] text-slate-500">{rev.location}</div>
                </div>
                <span className="text-[10px] text-slate-500">{rev.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h3 className="font-heading text-3xl font-black text-white">
            Got Questions? We Have Answers.
          </h3>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm text-white hover:text-amber-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick View Modal */}
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(item) => addItem(item)}
      />
    </div>
  );
}
