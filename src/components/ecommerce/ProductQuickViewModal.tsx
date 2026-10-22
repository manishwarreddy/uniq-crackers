'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Star, ShieldCheck, Volume2, Wind, Clock, ArrowUpCircle, ShoppingBag, Plus, Minus, CheckCircle, ExternalLink } from 'lucide-react';
import { ProductItem, CartItem } from '@/types';

interface ProductQuickViewModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (product) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const currentVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;
  const discountPercent = Math.round(
    ((currentVariant.originalPrice - currentVariant.price) / currentVariant.originalPrice) * 100
  );

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart({
      productId: product.id,
      variantId: currentVariant.id,
      name: product.name,
      variantName: currentVariant.name,
      boxQuantity: currentVariant.boxQuantity,
      price: currentVariant.price,
      originalPrice: currentVariant.originalPrice,
      image: product.image,
      quantity: quantity,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="quickview-title">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
      />

      <div className="relative w-full max-w-3xl bg-festive-surface text-slate-100 rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/80 text-white hover:bg-amber-500 hover:text-slate-950 transition-colors border border-white/10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Visual Showcase Side */}
          <div className="relative aspect-square md:aspect-auto bg-slate-950 min-h-[300px]">
            <Image
              src={product.image}
              alt={product.imageAlt || product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-festive-surface via-transparent to-black/40" />

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
              <span className="px-3 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Low Smoke Selection
              </span>
              {discountPercent > 0 && (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-xs">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Details & Controls Side */}
          <div className="p-6 flex flex-col justify-between max-h-[85vh] overflow-y-auto gap-4 bg-festive-surface">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  {product.categoryLabel}
                </span>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-300">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{product.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({product.reviewsCount} reviews)</span>
                </div>
              </div>

              <h2 id="quickview-title" className="font-heading font-black text-xl sm:text-2xl text-white">
                {product.name}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                {product.description}
              </p>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 gap-2 my-4 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Decibel Sound</div>
                    <div className="font-bold text-slate-200 truncate">{product.soundDecibel}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Smoke Control</div>
                    <div className="font-bold text-slate-200 truncate">{product.smokeLevel}</div>
                  </div>
                </div>

                {product.durationSeconds && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Duration</div>
                      <div className="font-bold text-slate-200">{product.durationSeconds} Seconds</div>
                    </div>
                  </div>
                )}

                {product.heightFeet && (
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Aerial Altitude</div>
                      <div className="font-bold text-slate-200">{product.heightFeet} Feet</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Variant Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  Select Pack Configuration:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {product.variants.map((v, idx) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantIndex(idx)}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        selectedVariantIndex === idx
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40 shadow-spark'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{v.name}</div>
                      <div className="text-[11px] text-slate-400">{v.boxQuantity}</div>
                      <div className="text-xs font-black text-amber-400 mt-1">₹{v.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Safety Instructions */}
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Diwali Safety Instructions</span>
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {product.safetyTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Add to Cart CTA */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white font-heading">
                    ₹{currentVariant.price}
                  </span>
                  {currentVariant.originalPrice > currentVariant.price && (
                    <span className="text-xs text-slate-500 line-through">
                      ₹{currentVariant.originalPrice}
                    </span>
                  )}
                </div>

                {/* Stepper */}
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-1 text-slate-400 hover:text-amber-400 disabled:opacity-30"
                    disabled={quantity <= 1 || isOutOfStock}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-1 text-slate-400 hover:text-amber-400 disabled:opacity-30"
                    disabled={isOutOfStock}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isOutOfStock}
                  className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-festive transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isOutOfStock
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-current" />
                  <span>{isOutOfStock ? 'Sold Out' : `Add • ₹${currentVariant.price * quantity}`}</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <Link
                  href={`/product/${product.slug}`}
                  onClick={onClose}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>View Complete Specifications & Safety Info</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
