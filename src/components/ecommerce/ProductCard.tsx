'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, Star, ShieldCheck, Eye, Plus, Minus, ShoppingBag, Volume2, Wind } from 'lucide-react';
import { ProductItem, CartItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const currentVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const discountPercent = Math.round(
    ((currentVariant.originalPrice - currentVariant.price) / currentVariant.originalPrice) * 100
  );

  const handleAddToCart = () => {
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
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-amber-500/20 overflow-hidden shadow-sm hover:shadow-festive transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Top Media / Visual Container */}
      <div className="relative w-full aspect-square bg-slate-950 overflow-hidden">
        <Image
          src={product.image}
          alt={product.imageAlt || product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          priority={product.featured}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.badgeText && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-spark">
              {product.badgeText}
            </span>
          )}
          {discountPercent > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-festive-crimson text-white shadow-sm w-fit">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Green Certified Seal */}
        {product.isGreenCertified && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSIR GREEN</span>
          </div>
        )}

        {/* Quick View Overlay Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40 backdrop-blur-[2px] z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onQuickView(product)}
            leftIcon={<Eye className="w-4 h-4 text-amber-400" />}
            className="bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-amber-500/40 hover:bg-amber-500 hover:text-white"
          >
            Quick View
          </Button>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 flex flex-col p-5 gap-3">
        {/* Category & Rating Row */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px]">
            {product.categoryLabel}
          </span>
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400 font-normal">({product.reviewsCount})</span>
          </div>
        </div>

        {/* Product Title */}
        <h3
          onClick={() => onQuickView(product)}
          className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 hover:text-amber-500 transition-colors cursor-pointer"
        >
          {product.name}
        </h3>

        {/* Safety & Decibel Feature Pills */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            <span className="truncate max-w-[120px]">{product.soundDecibel}</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-emerald-500" />
            <span className="truncate max-w-[110px]">{product.smokeLevel}</span>
          </div>
        </div>

        {/* Variant Selector */}
        {product.variants.length > 1 && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Select Pack Size:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {product.variants.map((v, idx) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold text-left transition-all border ${
                    selectedVariantIndex === idx
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-400'
                  }`}
                >
                  <div className="truncate">{v.name}</div>
                  <div className="text-[10px] font-normal text-slate-400">₹{v.price}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price & Quantity & CTA Row */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-heading">
                ₹{currentVariant.price}
              </span>
              {currentVariant.originalPrice > currentVariant.price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{currentVariant.originalPrice}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              ✓ In Stock (Velmala)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quantity Stepper */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1 text-slate-500 hover:text-amber-500 transition-colors disabled:opacity-30"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-1 text-slate-500 hover:text-amber-500 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <Button
              variant="festive"
              size="sm"
              onClick={handleAddToCart}
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              className="flex-1 font-bold text-xs"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
