'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  Plus,
  Minus,
  ShoppingBag,
  Eye,
  Check,
  ShieldCheck,
  Heart,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ProductItem, CartItem } from '@/types';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: ProductItem;
  onAddToCart: (item: CartItem) => void;
  onQuickView: (product: ProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onQuickView,
}) => {
  const { items, updateQuantity } = useCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imgSrc, setImgSrc] = useState(product.image);

  useEffect(() => {
    setImgSrc(product.image);
  }, [product.image]);

  const currentVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;
  const isLowStock = !isOutOfStock && currentVariant.stock <= 5;
  const discountPercent = Math.round(
    ((currentVariant.originalPrice - currentVariant.price) / currentVariant.originalPrice) * 100
  );
  const savings = currentVariant.originalPrice - currentVariant.price;

  // Check if this variant is already in the cart
  const cartItem = items.find((it) => it.variantId === currentVariant.id);
  const inCartQty = cartItem?.quantity || 0;
  const isMaxStockReached = inCartQty >= currentVariant.stock;

  const handleAddToCart = () => {
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
      quantity: 1,
      stock: currentVariant.stock,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <div className="group bg-festive-surface/90 hover:bg-festive-cardDark rounded-2xl sm:rounded-3xl border border-slate-800/80 hover:border-amber-500/50 hover:shadow-festive transition-all duration-300 flex flex-col h-full justify-between overflow-hidden relative">
      {/* Product Image Stage */}
      <div
        className="relative aspect-square w-full bg-slate-950 overflow-hidden cursor-pointer"
        onClick={() => onQuickView(product)}
      >
        <Image
          src={imgSrc}
          alt={product.imageAlt || `${product.name} festive fireworks`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-108 transition-transform duration-700 opacity-95 group-hover:opacity-100"
          onError={() => {
            if (imgSrc !== '/images/sparklers.jpg') {
              setImgSrc('/images/sparklers.jpg');
            }
          }}
        />

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-festive-surface via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2 inset-x-2 sm:top-3 sm:inset-x-3 flex items-center justify-between gap-1 pointer-events-none z-10">
          {isOutOfStock ? (
            <span className="bg-rose-900/90 text-rose-200 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-xl shadow-md border border-rose-500/30">
              OUT OF STOCK
            </span>
          ) : isLowStock ? (
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-xl shadow-lg border border-amber-300 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-950 fill-amber-300 shrink-0" />
              <span>Only {currentVariant.stock} Left!</span>
            </span>
          ) : discountPercent > 0 ? (
            <span className="bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-xl shadow-md border border-white/20">
              {discountPercent}% OFF
            </span>
          ) : (
            <span className="bg-slate-900/90 text-amber-300 text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-xl border border-amber-500/30">
              FESTIVE SPECIAL
            </span>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsWishlisted(!isWishlisted);
            }}
            className={`pointer-events-auto w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shrink-0 ${
              isWishlisted
                ? 'bg-rose-500 text-white shadow-md scale-110'
                : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-white/10'
            }`}
            aria-label={`Add ${product.name} to wishlist`}
          >
            <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Bottom Feature Pill on Image */}
        <div className="absolute bottom-2 inset-x-2 sm:bottom-3 sm:inset-x-3 hidden sm:flex items-center justify-between text-[11px] font-bold pointer-events-none z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Low Smoke</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/80 text-amber-300 border border-amber-500/30 backdrop-blur-md text-[10px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>7 KM Express</span>
          </span>
        </div>

        {/* Hover Quick Preview Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className="hidden sm:flex absolute inset-x-4 bottom-12 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-300 bg-slate-900/95 hover:bg-amber-500 hover:text-slate-950 focus:bg-amber-500 focus:text-slate-950 text-white text-xs font-black py-2.5 rounded-2xl border border-amber-500/40 backdrop-blur-md shadow-2xl items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 focus:translate-y-0"
        >
          <Eye className="w-4 h-4" />
          <span>Quick Preview</span>
        </button>
      </div>

      {/* Product Body Information */}
      <div className="p-2 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3.5">
        <div className="space-y-1 sm:space-y-1.5 flex-1">
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs gap-1">
            <span className="font-extrabold text-amber-400/90 uppercase text-[9px] sm:text-[10px] tracking-wider truncate">
              {product.categoryLabel}
            </span>
            <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md sm:rounded-lg bg-amber-500/10 text-amber-300 font-bold text-[10px] sm:text-[11px] border border-amber-500/30 shrink-0">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-amber-400" />
              <span>{product.rating.toFixed(1)}</span>
              <span className="text-slate-400 text-[9px] sm:text-[10px] hidden sm:inline">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Product Title with fixed 2-line height for visual consistency */}
          <Link
            href={`/product/${product.slug}`}
            className="font-heading font-extrabold text-xs sm:text-base text-white hover:text-amber-300 transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] leading-snug block"
          >
            {product.name}
          </Link>

          {/* Clean Smoke & Decibel Specs */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-400 pt-0.5">
            <span className="font-semibold text-emerald-400/90 truncate">
              {product.smokeLevel?.replace(/\s*\(.*?\)/g, '') || 'Reduced Smoke'}
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-300 hidden sm:inline truncate">
              {product.soundDecibel?.replace(/\s*\(.*?\)/g, '') || 'Safe Sound'}
            </span>
          </div>

          {/* Variant Pack Switcher */}
          {product.variants.length > 1 && (
            <div className="space-y-1 pt-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Select Pack Size:
              </span>
              <div className="flex flex-wrap gap-1">
                {product.variants.map((v, idx) => {
                  const isSelected = selectedVariantIndex === idx;
                  const isVarOut = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantIndex(idx)}
                      className={`px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-bold transition-all text-left flex items-center justify-between gap-1 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40 shadow-sm'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{v.name}</span>
                      <span className={`font-extrabold shrink-0 ${isVarOut ? 'text-rose-400' : 'text-amber-400'}`}>
                        {isVarOut ? 'Out' : `₹${v.price}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pricing & Add to Cart Container - Always Pinned to Bottom */}
        <div className="pt-2 sm:pt-3 border-t border-slate-800/80 space-y-2 sm:space-y-3 mt-auto">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
              <span className="text-base sm:text-2xl font-black text-white font-heading tracking-tight">
                ₹{currentVariant.price}
              </span>
              {currentVariant.originalPrice > currentVariant.price && (
                <span className="text-[10px] sm:text-xs text-slate-500 line-through">
                  ₹{currentVariant.originalPrice}
                </span>
              )}
            </div>

            {savings > 0 && !isOutOfStock && (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-emerald-500/30 shrink-0">
                Save ₹{savings}
              </span>
            )}
            {isOutOfStock && (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-rose-500/30 shrink-0">
                Sold Out
              </span>
            )}
          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between gap-1">
            <span className="truncate">{currentVariant.boxQuantity}</span>
            {isOutOfStock ? (
              <span className="text-rose-400 font-bold flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="text-amber-400 font-extrabold flex items-center gap-0.5 sm:gap-1 bg-amber-500/10 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md sm:rounded-lg border border-amber-500/30 animate-pulse shrink-0">
                <AlertTriangle className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Only {currentVariant.stock} left in stock!</span>
                <span className="sm:hidden">{currentVariant.stock} left</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">In Stock ({currentVariant.stock})</span>
                <span className="sm:hidden">In Stock</span>
              </span>
            )}
          </div>

          {/* Smart Unified Cart Action Button */}
          {inCartQty > 0 ? (
            <div className="flex items-center justify-between bg-slate-900/90 border border-amber-500/50 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 shadow-spark">
              <button
                type="button"
                onClick={() => updateQuantity(currentVariant.id, -1)}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors font-bold shrink-0"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </button>

              <div className="text-center px-1">
                <span className="text-[9px] sm:text-xs text-slate-400 block -mb-0.5">In Cart</span>
                <span className="font-heading font-black text-xs sm:text-sm text-white">{inCartQty}</span>
              </div>

              <button
                type="button"
                onClick={() => updateQuantity(currentVariant.id, 1)}
                disabled={isMaxStockReached}
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors font-bold shrink-0 ${
                  isMaxStockReached
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-40'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
                title={isMaxStockReached ? `Maximum available stock (${currentVariant.stock}) reached` : 'Increase quantity'}
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-full py-2 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl font-heading font-extrabold text-[11px] sm:text-sm shadow-spark transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                isOutOfStock
                  ? 'bg-slate-800 text-slate-400'
                  : justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-festive hover:scale-[1.02]'
              }`}
            >
              {isOutOfStock ? (
                <span>Out of Stock</span>
              ) : justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">Added to Festive Cart!</span>
                  <span className="sm:hidden">Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
