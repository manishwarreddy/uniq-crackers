'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  MapPin,
  ShieldCheck,
  Search,
  ArrowRight,
  Star,
  CheckCircle2,
  Gift,
  ChevronDown,
  Check,
  Truck,
  Flame,
  Award,
  Tag,
  Copy,
  MessageCircle,
  ShoppingBag,
  Compass,
  Navigation,
  AlertCircle,
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { ProductItem } from '@/types';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/ecommerce/ProductCard';
import { ProductQuickViewModal } from '@/components/ecommerce/ProductQuickViewModal';
import { getLiveDeliveryLocation, LiveLocationResult } from '@/lib/location-service';
import { getDeliveryPricingForDistance } from '@/lib/geo';

const CATEGORY_CARDS = [
  {
    id: 'sparklers',
    name: 'Sparklers & Phooljhadi',
    desc: 'Golden & electric star showers',
    icon: '✨',
    count: 'Sparklers',
    image: '/images/sparklers.jpg',
  },
  {
    id: 'flowerpots',
    name: 'Flower Pots & Anars',
    desc: 'Tri-color fountains & Ashoka pots',
    icon: '🪴',
    count: 'Fountains',
    image: '/images/colour_koti.jpg',
  },
  {
    id: 'chakkars',
    name: 'Ground Chakkars',
    desc: 'High-speed spinning wheels',
    icon: '🌀',
    count: 'Chakkars',
    image: '/images/chakkar.jpg',
  },
  {
    id: 'sound',
    name: 'Sound Crackers & Bombs',
    desc: 'Laxmi crackers, 555 bombs & walas',
    icon: '💥',
    count: 'Laxmi & Bombs',
    image: '/images/sound_crackers.jpg',
  },
  {
    id: 'rockets',
    name: 'Sky Rockets',
    desc: 'Whistling & 2-sound sky rockets',
    icon: '🚀',
    count: 'Rockets',
    image: '/images/sky_rockets.jpg',
  },
  {
    id: 'skyshots',
    name: 'Aerial Sky Shots',
    desc: 'Multi-shot sky cakes & repeaters',
    icon: '🎆',
    count: 'Sky Shots',
    image: '/images/skyshots.jpg',
  },
  {
    id: 'novelty',
    name: 'Fancy Novelties',
    desc: 'Peacocks, butterflies & sirens',
    icon: '🦚',
    count: 'Novelties',
    image: '/images/novelty_fireworks.jpg',
  },
  {
    id: 'hampers',
    name: 'Diwali Gift Hampers',
    desc: 'Complete family celebration boxes',
    icon: '🎁',
    count: 'Hampers',
    image: '/images/hamper.jpg',
  },
];

const LOCAL_COMMUNITIES = [
  { name: 'Tellapur', dist: '3.8 km', eta: '25-35 mins', popular: true, lat: 17.468, lng: 78.291, pincode: '502032' },
  { name: 'Kollur', dist: '4.2 km', eta: '30-40 mins', popular: true, lat: 17.4852, lng: 78.241, pincode: '502300' },
  { name: 'Velmala Hub', dist: '0.0 km', eta: '15-20 mins', popular: true, lat: 17.5029, lng: 78.2573, pincode: '502300' },
  { name: 'Mokila', dist: '5.6 km', eta: '35-45 mins', popular: false, lat: 17.472, lng: 78.205, pincode: '501203' },
  { name: 'Osman Nagar', dist: '6.2 km', eta: '35-45 mins', popular: false, lat: 17.452, lng: 78.285, pincode: '500019' },
  { name: 'Edulanagulapally', dist: '4.9 km', eta: '30-40 mins', popular: false, lat: 17.491, lng: 78.232, pincode: '502300' },
];

const LOCAL_REVIEWS = [
  {
    id: 1,
    name: 'Deepak Varma',
    community: 'Tellapur (My Home Bhooja)',
    rating: 5,
    tag: 'Community Feedback',
    date: 'Diwali Celebration',
    title: 'Delivered in 32 minutes flat!',
    comment:
      'Ordered aerial sky cakes and golden sparklers for our society party. The 7 KM delivery was fast, and the 4-digit doorstep OTP handoff was seamless. Noticeably lower smoke levels!',
  },
  {
    id: 2,
    name: 'Pooja Reddy',
    community: 'Velmala (Near ORR Exit 2)',
    rating: 5,
    tag: 'Community Feedback',
    date: 'Recent Celebration',
    title: 'Mesmerizing 30-Shot Aerial Cake',
    comment:
      'Cleaner burning fireworks with beautiful colors reaching well over 100 feet. The delivery rider was very polite and punctual.',
  },
  {
    id: 3,
    name: 'Rajesh Kumar',
    community: 'Kollur (Exit 2)',
    rating: 5,
    tag: 'Community Feedback',
    date: 'Family Event',
    title: 'Best family hamper we ever bought',
    comment:
      'The Grand Royale Hamper had everything — huge chakkars, bright anars, and sparklers for the kids. Paid through UPI QR at the door seamlessly. Wholesale factory prices right in Hyderabad.',
  },
  {
    id: 4,
    name: 'Dr. Sneha Rao',
    community: 'Mokila (Green Meadows)',
    rating: 5,
    tag: 'Community Feedback',
    date: 'Neighborhood Festive Order',
    title: 'Noticeably reduced smoke output',
    comment:
      'With elderly parents at home, low smoke fireworks were an essential requirement. Uniq Crackers delivered barium-free products with minimal residue. Highly recommended!',
  },
];

const FAQS = [
  {
    q: 'How does the 7 KM local delivery work?',
    a: 'We fulfill orders directly from our Velmala central hub (502300) to homes within a 7 km radius (Tellapur, Kollur, Mokila, Velmala, Osman Nagar, and Edulanagulapally). Our dedicated riders deliver in 30 to 45 minutes.',
  },
  {
    q: 'How are these fireworks formulated for reduced smoke?',
    a: 'All fireworks in our catalog are selected from licensed manufacturers utilizing reduced smoke formulations without added barium salts, resulting in significantly lower particulate emissions for safer neighborhood celebrations.',
  },
  {
    q: 'What is the minimum order value and delivery fee?',
    a: 'The minimum order amount is ₹500. Orders above ₹3,000 qualify for 100% Free Express Delivery! For orders below ₹3,000 within our 7 KM radius, local dispatch fees are based on distance slabs: ₹40 (0–2 km), ₹70 (2–4 km), and ₹120 (4–7 km). Deliveries outside 7 km are not serviced.',
  },
  {
    q: 'What payment methods do you support?',
    a: 'We offer Cash on Delivery (COD), instant doorstep UPI QR payment upon delivery (Google Pay, PhonePe, Paytm), and online checkout.',
  },
  {
    q: 'How does doorstep delivery work?',
    a: 'Our dispatch team delivers your fireworks package directly to your doorstep in 30-45 minutes across the 7 KM radius of Velmala with live order tracking and WhatsApp updates.',
  },
];

export default function HomePage() {
  const { addItem, setDeliveryLocation, openLocationModal } = useCart();

  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [selectedHubCommunity, setSelectedHubCommunity] = useState('Tellapur');
  const [isDetectingLiveGps, setIsDetectingLiveGps] = useState(false);
  const [liveGpsError, setLiveGpsError] = useState<string | null>(null);
  const [liveLocationData, setLiveLocationData] = useState<LiveLocationResult | null>(null);

  const handleDetectLiveLocation = async () => {
    setIsDetectingLiveGps(true);
    setLiveGpsError(null);
    try {
      const live = await getLiveDeliveryLocation();
      setIsDetectingLiveGps(false);
      setLiveLocationData(live);
      setSelectedHubCommunity('LIVE_GPS');
      setDeliveryLocation({
        address: live.address,
        latitude: live.latitude,
        longitude: live.longitude,
        pincode: live.pincode,
        distanceKm: live.distanceKm,
        isDeliverable: live.isDeliverable,
        deliveryFee: live.deliveryFee,
        zoneLabel: live.zoneLabel,
      });
    } catch (err: any) {
      setIsDetectingLiveGps(false);
      setLiveGpsError(err.message || 'Could not acquire GPS position. Please pick a locality below.');
    }
  };

  // Dynamically sync products from admin catalog API
  useEffect(() => {
    fetch('/api/admin/catalog')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setProducts(data.data);
        }
      })
      .catch(() => {
        // Fallback to INITIAL_PRODUCTS
      });
  }, []);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2200);
  };

  // Filter & Sort Catalog
  const filteredProducts = useMemo(() => {
    return products
      .filter((prod) => {
        const matchCat = activeCategory === 'all' || prod.category === activeCategory;
        const matchSearch =
          searchQuery.trim() === '' ||
          prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prod.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.variants[0].price - b.variants[0].price;
        if (sortBy === 'price-desc') return b.variants[0].price - a.variants[0].price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, activeCategory, searchQuery, sortBy]);

  const spotlightHamper = products.find((p) => p.id === 'prod-hamper-05') || products[0];

  return (
    <div className="space-y-16 lg:space-y-24 pb-20 bg-festive-obsidian text-slate-100 min-h-screen">
      {/* 1. HERO SECTION - LUXURIOUS HYDERABAD FESTIVE FLAGSHIP */}
      <section className="relative text-white pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-amber-500/20 overflow-hidden bg-[#07090e]">
        {/* Ambient Glows & Background Artwork */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/hero_lux_bg.jpg"
            alt="Diwali golden lights celebration"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-15 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07090e]/80 via-[#07090e]/95 to-[#07090e]" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 right-10 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-7 text-left">
              {/* Premium Festive Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 text-amber-300 border border-amber-500/40 backdrop-blur-xl shadow-spark">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Diwali 2026 Collection • Low Smoke Formulation</span>
              </div>

              {/* Headline */}
              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-white">
                Celebrate Brighter. <br />
                <span className="gold-shimmer">
                  Shop Festive Fireworks.
                </span>
              </h1>

              {/* Sub-headline */}
              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Direct from our <strong>Velmala central hub</strong> to your doorstep in <strong>30–45 minutes</strong> across Tellapur, Kollur, Mokila & surrounding 7 KM radius. Reduced smoke formulations, no added barium salts, and wholesale factory prices.
              </p>

              {/* One-Click Community Quick Bar with Live Location */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/35 backdrop-blur-md space-y-3.5 max-w-xl shadow-2xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-extrabold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Check Instant Delivery to Your Locality:</span>
                  </span>
                  <span className="text-emerald-400 text-[11px] font-extrabold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Hub Open & Active
                  </span>
                </div>

                {/* Primary Live Location Button & Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Live GPS Button */}
                  <button
                    type="button"
                    onClick={handleDetectLiveLocation}
                    disabled={isDetectingLiveGps}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm ${
                      selectedHubCommunity === 'LIVE_GPS'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-spark scale-105 ring-2 ring-emerald-400/60'
                        : 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <Navigation className={`w-3.5 h-3.5 text-amber-400 ${isDetectingLiveGps ? 'animate-spin' : ''}`} />
                    <span>
                      {isDetectingLiveGps
                        ? 'Detecting Live GPS Pin...'
                        : selectedHubCommunity === 'LIVE_GPS'
                        ? '✓ Live GPS Active'
                        : '📍 Use Live Location'}
                    </span>
                  </button>

                  {/* Locality Pills */}
                  {LOCAL_COMMUNITIES.map((comm) => {
                    const isSelected = selectedHubCommunity === comm.name;
                    return (
                      <button
                        key={comm.name}
                        type="button"
                        onClick={() => {
                          setSelectedHubCommunity(comm.name);
                          setLiveLocationData(null);
                          setLiveGpsError(null);
                          const pricing = getDeliveryPricingForDistance(parseFloat(comm.dist));
                          setDeliveryLocation({
                            address: `${comm.name}, Hyderabad ${comm.pincode}`,
                            latitude: comm.lat,
                            longitude: comm.lng,
                            pincode: comm.pincode,
                            distanceKm: parseFloat(comm.dist),
                            isDeliverable: pricing.isDeliverable,
                            deliveryFee: pricing.fee,
                            zoneLabel: pricing.label,
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-spark font-extrabold scale-105'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                        }`}
                      >
                        <span>{comm.name}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-slate-900 font-black' : 'text-amber-400'}`}>
                          ({comm.dist})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Error Banner */}
                {liveGpsError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{liveGpsError}</span>
                  </div>
                )}

                {/* Live Location Feedback Banner */}
                {selectedHubCommunity === 'LIVE_GPS' && liveLocationData && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                    liveLocationData.isDeliverable
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-white truncate">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{liveLocationData.address}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                        liveLocationData.isDeliverable ? 'bg-emerald-400 text-slate-950' : 'bg-rose-500 text-white'
                      }`}>
                        {liveLocationData.isDeliverable ? '✓ 30-45 Mins Express' : 'Outside 7 KM'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] opacity-90 pt-1 border-t border-current/15">
                      <span>
                        Distance from Velmala Hub: <strong>{liveLocationData.distanceKm.toFixed(1)} KM</strong>
                        {liveLocationData.accuracy && (
                          <span className="text-amber-300 font-medium ml-2">
                            • GPS Accuracy: ±{liveLocationData.accuracy}m
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={openLocationModal}
                        className="text-amber-300 hover:text-amber-200 underline font-bold"
                      >
                        Adjust Pin
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/#catalog"
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-festive transition-all inline-flex items-center gap-2 hover:scale-105"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-950" />
                  <span>Shop Fireworks Catalog</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </Link>

                <Link
                  href="/#combos"
                  className="px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 font-extrabold text-sm border border-amber-500/40 backdrop-blur-md transition-all inline-flex items-center gap-2 hover:border-amber-400"
                >
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span>Diwali Family Hampers</span>
                </Link>
              </div>

              {/* Inline Trust Metric Badges */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-300 max-w-xl">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Low Smoke</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>35-Min Express</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Factory Rates</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Direct Delivery</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl bg-slate-950 group">
                <Image
                  src="/images/hero_fireworks.jpg"
                  alt="Diwali celebration fireworks in Hyderabad"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-festive-obsidian via-transparent to-black/30" />

                {/* Floating Hub Status Pill */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <div className="px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/40 text-[11px] font-extrabold text-amber-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live 7 KM Hub: Velmala Center</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-[10px] uppercase tracking-wider shadow-lg">
                    Diwali 2026
                  </span>
                </div>

                {/* Bottom Card Info Overlay */}
                <div className="absolute bottom-4 inset-x-4 p-4 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading font-black text-sm text-white flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span>Ready for Express Dispatch</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Delivering to Tellapur, Kollur, Mokila & Velmala
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40">
                      ⚡ 35 Mins
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Min Order: ₹500</span>
                    <span className="text-amber-400 font-bold">Free delivery over ₹3,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FESTIVE PROMOTION RIBBON (COUPON & FREE DELIVERY) */}
      <section className="container-custom">
        <div className="bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-rose-600/30 rounded-3xl p-5 sm:p-6 text-white border border-amber-500/40 backdrop-blur-xl shadow-festive flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shrink-0 shadow-spark text-slate-950 font-bold">
              <Tag className="w-7 h-7" />
            </div>
            <div>
              <div className="font-heading font-black text-base sm:text-xl tracking-tight text-white flex items-center gap-2 justify-center md:justify-start">
                <span>Diwali Festival Offer: Flat 10% OFF on All Fireworks!</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase">
                  Limited Rush
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Plus 100% Free Express Delivery on orders above ₹3,000 within 7 KM of Velmala Hub.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyCoupon('DIWALI2026')}
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-100 font-mono font-black text-xs sm:text-sm flex items-center gap-2.5 border border-amber-500/40 shadow-spark transition-all active:scale-95"
            >
              <span className="text-amber-400 tracking-wider">DIWALI2026</span>
              {copiedCoupon ? (
                <span className="text-emerald-400 font-sans font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Copied!
                </span>
              ) : (
                <span className="text-slate-400 font-sans font-bold flex items-center gap-1 hover:text-white">
                  <Copy className="w-4 h-4" /> Copy Code
                </span>
              )}
            </button>
            <a
              href="#catalog"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-sm"
            >
              Claim Deals
            </a>
          </div>
        </div>
      </section>

      {/* 3. CURATED FESTIVE CATEGORIES SHOWCASE */}
      <section id="categories" className="container-custom space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-800/80 pb-4 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curated Festive Collections</span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-white">
              Shop Fireworks by Category
            </h2>
          </div>
          <button
            onClick={() => {
              setActiveCategory('all');
              const el = document.getElementById('catalog');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`text-xs font-black px-4 py-2 rounded-xl border transition-all ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-spark'
                : 'text-slate-300 border-slate-800 hover:border-amber-500/50 bg-slate-900/60'
            }`}
          >
            Show All Fireworks ({products.length})
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
          {CATEGORY_CARDS.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  const catalogEl = document.getElementById('catalog');
                  catalogEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`group relative overflow-hidden rounded-3xl border text-left transition-all duration-300 bg-festive-surface hover:border-amber-500/60 hover:shadow-festive hover:-translate-y-1 ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-spark bg-festive-cardDark'
                    : 'border-slate-800/80'
                }`}
              >
                {/* Category Photo */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-festive-surface via-festive-surface/40 to-transparent" />
                  <span className="absolute top-2 left-2 w-8 h-8 rounded-xl bg-slate-950/80 backdrop-blur-md flex items-center justify-center text-sm shadow-md border border-white/10">
                    {cat.icon}
                  </span>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-amber-500/90 text-slate-950 text-[10px] font-black">
                    {cat.count}
                  </span>
                </div>

                {/* Card Title & Desc */}
                <div className="p-3.5 space-y-1">
                  <h3
                    className={`font-heading font-black text-xs sm:text-sm line-clamp-1 transition-colors ${
                      isSelected ? 'text-amber-400' : 'text-white group-hover:text-amber-300'
                    }`}
                  >
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{cat.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. MAIN PRODUCT CATALOG GRID */}
      <section id="catalog" className="container-custom space-y-6 scroll-mt-24">
        {/* Catalog Filter & Sort Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-2xl sm:text-3xl text-white">
                Featured Fireworks Collection
              </h2>
              {activeCategory !== 'all' && (
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                  {CATEGORY_CARDS.find((c) => c.id === activeCategory)?.name || activeCategory}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Curated low-smoke fireworks for safe, vibrant Diwali celebrations in Hyderabad.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-72">
              <label htmlFor="home-catalog-search" className="sr-only">
                Search catalog fireworks
              </label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="home-catalog-search"
                type="text"
                placeholder="Search catalog fireworks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900 border border-slate-700/80 rounded-2xl focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-400 shadow-sm"
              />
            </div>

            <label htmlFor="home-catalog-sort" className="sr-only">
              Sort fireworks catalog
            </label>
            <select
              id="home-catalog-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2.5 px-3 text-xs bg-slate-900 border border-slate-700/80 rounded-2xl font-bold text-slate-200 focus:outline-none focus:border-amber-500 shadow-sm cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* 4-COLUMN PRODUCT GRID */}
        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-3xl border border-amber-500/20">
              🎆
            </div>
            <p className="text-base font-bold text-white">
              No products found matching &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try searching for sparklers, sky shots, flowerpots, or gift hampers.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="mt-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 px-5 py-2.5 rounded-xl transition-all shadow-spark"
            >
              Reset Filters & Show All
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(item) => addItem(item)}
                onQuickView={(p) => setQuickViewProduct(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. FESTIVE SPOTLIGHT COMBO - LUXURY HAMPER SHOWCASE */}
      <section id="combos" className="container-custom">
        <div className="bg-gradient-to-br from-festive-surface via-slate-900 to-festive-surface text-white rounded-3xl border border-amber-500/30 p-6 sm:p-10 lg:p-12 shadow-2xl overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* Hamper Image Box */}
            <div className="lg:col-span-5 relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border border-amber-500/20 shadow-2xl group">
              <Image
                src={spotlightHamper.image}
                alt={spotlightHamper.name}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <span className="absolute top-4 left-4 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-lg border border-white/20">
                Diwali Signature Hamper
              </span>
            </div>

            {/* Hamper Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>Complete Family Celebration Assortment</span>
              </div>

              <h2 className="font-heading font-black text-2xl sm:text-4xl text-white leading-tight">
                {spotlightHamper.name}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                The ultimate family celebration package! Features <strong>35 premier firework units</strong>: 12-Shot Aerial Cake, 20 Long Golden Sparklers, 6 Tri-Color Anars, 10 High-Speed Chakkars, and safety accessories. Formulated for safe, smoke-reduced celebrations.
              </p>

              {/* Pricing Display */}
              <div className="flex items-baseline gap-4 pt-2">
                <span className="text-3xl sm:text-4xl font-black text-white font-heading">
                  ₹{spotlightHamper.variants[0].price}
                </span>
                <span className="text-base text-slate-500 line-through">
                  ₹{spotlightHamper.variants[0].originalPrice}
                </span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/40">
                  Save ₹{spotlightHamper.variants[0].originalPrice - spotlightHamper.variants[0].price} (30% OFF)
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  type="button"
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
                      stock: spotlightHamper.variants[0].stock,
                    })
                  }
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm shadow-festive transition-all hover:scale-105 flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-950" />
                  <span>Add Hamper to Cart</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuickViewProduct(spotlightHamper)}
                  className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition-colors"
                >
                  View Pack Contents
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE 7 KM VELMALA DELIVERY HUB EXPLORER */}
      <section id="delivery" className="container-custom">
        <div className="bg-festive-surface rounded-3xl border border-amber-500/30 p-6 sm:p-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                <Compass className="w-4 h-4" />
                <span>Velmala Central Hub • Coordinates 17.5029° N, 78.2573° E</span>
              </div>
              <h2 className="font-heading font-black text-2xl sm:text-3xl text-white">
                Strict 7 KM Local Delivery Geofence
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                We fulfill orders within a verified 7 KM radius from our Velmala hub using Haversine calculation to guarantee rapid 30 to 45-minute doorstep arrival.
              </p>
            </div>

            <button
              type="button"
              onClick={openLocationModal}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs sm:text-sm shrink-0 shadow-spark hover:scale-105 transition-all"
            >
              Pinpoint Exact Location
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LOCAL_COMMUNITIES.map((c) => (
              <div
                key={c.name}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-base text-white">{c.name}</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    Eligible ({c.dist})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Estimated Doorstep ETA:</span>
                  <span className="text-amber-400 font-bold">{c.eta}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Doorstep OTP handoff • Cash & UPI accepted
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. LOW SMOKE & FESTIVE SAFETY STANDARDS */}
      <section id="safety" className="container-custom">
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-10 space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              Safety & Environmental Responsibility
            </span>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-white">
              Low-Smoke Formulations & Safety Standards
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Celebrate Diwali with vibrant lights while keeping neighborhood air cleaner. All fireworks comply with community safety standards and reduced emission requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <h3 className="font-heading font-bold text-white text-base">Reduced Particulate Smoke</h3>
              <p className="text-slate-400 leading-relaxed text-xs">
                Specially formulated using dust-suppression compounds that noticeably reduce particulate emissions without diminishing visual brightness.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <Award className="w-8 h-8 text-amber-400" />
              <h3 className="font-heading font-bold text-white text-base">Zero Added Barium Salts</h3>
              <p className="text-slate-400 leading-relaxed text-xs">
                Manufactured without hazardous barium nitrate compounds or toxic heavy metals for cleaner, safer family festivities.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-blue-400" />
              <h3 className="font-heading font-bold text-white text-base">Safety Tested Packaging</h3>
              <p className="text-slate-400 leading-relaxed text-xs">
                Equipped with durable bases, secure safety fuses, and clear outdoor ignition directions on every carton.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. COMMUNITY FEEDBACK & EXPERIENCES */}
      <section className="container-custom space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-800 pb-4 gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Customer & Community Feedback</span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-white">
              Loved by Hyderabad Families
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sample feedback and celebration highlights from residential communities in Tellapur, Velmala, Kollur & Mokila.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {LOCAL_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="bg-festive-surface rounded-3xl border border-slate-800/80 p-5 space-y-3 hover:border-amber-500/40 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {review.tag}
                </span>
              </div>

              <h3 className="font-heading font-bold text-sm text-white line-clamp-1">
                &ldquo;{review.title}&rdquo;
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                {review.comment}
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{review.name}</div>
                  <div className="text-[11px] text-slate-400">{review.community}</div>
                </div>
                <div className="text-[10px] text-slate-500">{review.date}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="container-custom max-w-4xl space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400">
            Got questions about our 7 KM delivery radius, doorstep OTP, or green crackers?
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-festive-surface rounded-2xl border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm text-white hover:text-amber-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* DISCREET FLOATING WHATSAPP BUTTON (BOTTOM-RIGHT) */}
      <div className="fixed bottom-6 right-6 z-30">
        <a
          href="https://wa.me/919000000000?text=Hi%20Uniq%20Crackers,%20I%20want%20to%20inquire%20about%20Diwali%20fireworks%20and%20express%20delivery"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xl hover:scale-105 transition-all border border-emerald-400/40"
          aria-label="WhatsApp Support"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span className="hidden sm:inline">WhatsApp Help</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        </a>
      </div>

      {/* Quick View Modal */}
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(item) => addItem(item)}
      />
    </div>
  );
}
