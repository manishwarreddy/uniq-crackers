'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductItem } from '@/types';
import {
  Star,
  ShieldCheck,
  Truck,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/ecommerce/ProductCard';

export function ProductDetailClient({ product }: { product: ProductItem }) {
  const { addItem } = useCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'safety' | 'reviews'>('overview');
  const [addedEffect, setAddedEffect] = useState(false);

  const currentVariant = product.variants?.[selectedVariantIndex] || product.variants?.[0];
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;
  const discountPercent =
    currentVariant?.originalPrice && currentVariant.originalPrice > currentVariant.price
      ? Math.round(((currentVariant.originalPrice - currentVariant.price) / currentVariant.originalPrice) * 100)
      : 0;

  const relatedProducts = INITIAL_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: currentVariant.id,
      name: product.name,
      variantName: currentVariant.name,
      boxQuantity: currentVariant.boxQuantity,
      price: currentVariant.price,
      originalPrice: currentVariant.originalPrice,
      image: product.image,
      quantity,
    });
    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 2000);
  };

  return (
    <div className="min-h-screen bg-festive-obsidian text-slate-100 py-8 sm:py-12">
      <div className="container-custom space-y-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-amber-400 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <Link href="/#catalog" className="hover:text-amber-400 transition-colors">Catalog</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-amber-400 truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Main Product Showcase Grid */}
        <div className="bg-festive-surface rounded-3xl border border-amber-500/20 shadow-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Gallery Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 group">
              <Image
                src={product.image}
                alt={product.imageAlt || product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {discountPercent > 0 && (
                <span className="absolute top-4 left-4 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg border border-white/20">
                  {discountPercent}% OFF
                </span>
              )}
              <span className="absolute top-4 right-4 bg-emerald-950/90 text-emerald-300 font-bold text-[11px] px-3.5 py-1 rounded-full border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Low Smoke Formulation
              </span>
            </div>

            {/* Thumbnail Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Smoke Emission</span>
                <span className="text-xs font-bold text-white">{product.smokeLevel || 'Reduced Smoke'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Sound Level</span>
                <span className="text-xs font-bold text-white">{product.soundDecibel || 'Safe Range'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Duration</span>
                <span className="text-xs font-bold text-white">{product.durationSeconds ? `${product.durationSeconds}s` : 'Festive Sparkle'}</span>
              </div>
            </div>
          </div>

          {/* Details & Action Column */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30">
                  {product.categoryLabel}
                </span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <strong className="text-white">{product.rating.toFixed(1)}</strong> ({product.reviewsCount} customer reviews)
                </span>
              </div>

              <h1 className="font-heading font-black text-2xl sm:text-4xl text-white leading-tight">
                {product.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {product.description}
              </p>

              {/* Variant Selector */}
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Select Pack Configuration:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {product.variants.map((v: any, idx: number) => {
                    const isVarOutOfStock = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantIndex(idx)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                          selectedVariantIndex === idx
                            ? 'border-amber-500 bg-amber-500/20 ring-1 ring-amber-500/40 text-amber-200'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-white">{v.name}</div>
                          {isVarOutOfStock && (
                            <span className="text-[10px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{v.boxQuantity}</div>
                        <div className="text-xs font-black text-amber-400 mt-1">₹{v.price}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Tag Box */}
              <div className="pt-4 border-t border-slate-800 flex items-baseline gap-4">
                <span className="text-3xl sm:text-4xl font-black text-white font-heading">
                  ₹{currentVariant.price}
                </span>
                {currentVariant.originalPrice > currentVariant.price && (
                  <span className="text-base text-slate-500 line-through">
                    ₹{currentVariant.originalPrice}
                  </span>
                )}
                {currentVariant.originalPrice > currentVariant.price && (
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/40">
                    Save ₹{currentVariant.originalPrice - currentVariant.price}
                  </span>
                )}
                {isOutOfStock && (
                  <span className="text-xs font-bold text-rose-400 bg-rose-950/80 px-3 py-1 rounded-lg border border-rose-500/40">
                    Sold Out
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Stepper & Add to Cart */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center border border-slate-800 rounded-2xl bg-slate-900 p-2 w-full sm:w-auto justify-between">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="p-1.5 text-slate-400 hover:text-amber-400 disabled:opacity-30"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={isOutOfStock}
                    className="p-1.5 text-slate-400 hover:text-amber-400 disabled:opacity-30"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-festive transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isOutOfStock
                      ? 'bg-slate-800 text-slate-400'
                      : addedEffect
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-current" />
                  <span>
                    {isOutOfStock
                      ? 'Currently Out of Stock'
                      : addedEffect
                      ? 'Added to Cart!'
                      : `Add to Cart • ₹${currentVariant.price * quantity}`}
                  </span>
                </button>
              </div>

              {/* Express Delivery Information */}
              <div className="grid grid-cols-2 gap-3 pt-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Velmala Hub 7 KM Delivery (35 Mins)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Doorstep OTP • Cash & UPI</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Product Information */}
        <div className="bg-festive-surface rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-800 pb-3" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                activeTab === 'overview'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Product Specifications
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'safety'}
              onClick={() => setActiveTab('safety')}
              className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                activeTab === 'safety'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Safety Instructions
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'reviews'}
              onClick={() => setActiveTab('reviews')}
              className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                activeTab === 'reviews'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Customer Reviews ({product.reviewsCount})
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Crafted for vibrant festive illumination with cleaner-burning formulations designed to reduce smoke emissions during celebration.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-white">Reduced Particulate Smoke</div>
                  <div className="text-xs text-slate-400">Features dust-suppression compounds that produce less dense airborne residue.</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-white">No Added Barium Salts</div>
                  <div className="text-xs text-slate-400">Manufactured without hazardous barium nitrate compounds for family safety.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                Recommended Safety Protocols:
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                {product.safetyTips?.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>Keep a bucket of clean water or sand nearby during celebration.</span>
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20">
                <div className="text-3xl font-black text-amber-400 font-heading">
                  {product.rating.toFixed(1)}
                </div>
                <div className="text-xs text-slate-300">
                  <div className="flex items-center gap-1 text-amber-400">
                    {'★'.repeat(Math.round(product.rating))}
                  </div>
                  <span>Sample community feedback from local celebrations in Tellapur & Kollur.</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Rajesh V. (Tellapur)</span>
                    <span className="text-slate-400">Community Feedback</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    &quot;Delivered directly from the Velmala hub in 35 minutes. Very bright fireworks and noticeably less smoke!&quot;
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Sowmya K. (Kollur)</span>
                    <span className="text-slate-400">Community Feedback</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    &quot;Clean packaging and timely delivery. Great visual effects for family celebrations.&quot;
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* You May Also Like Recommendations */}
        <div className="space-y-4">
          <h2 className="font-heading font-black text-xl text-white">
            More Popular Fireworks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={(item) => addItem(item)}
                onQuickView={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
