'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, DeliveryLocationState } from '@/types';
import { STORE_DEFAULTS } from '@/lib/constants';
import { getDeliveryPricingForDistance } from '@/lib/geo';
import { getLiveDeliveryLocation } from '@/lib/location-service';

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, delta: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  deliveryLocation: DeliveryLocationState;
  setDeliveryLocation: (loc: DeliveryLocationState) => void;
  confirmDeliveryLocation: (loc: DeliveryLocationState) => void;
  isDetectingLocation: boolean;
  locationError: string | null;
  setLocationError: (err: string | null) => void;
  autoDetectLocation: () => Promise<DeliveryLocationState | null>;
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const DEFAULT_LOCATION: DeliveryLocationState = (() => {
  const dist = 0.0;
  const pricing = getDeliveryPricingForDistance(dist);
  return {
    address: 'Velmala Village Center, Hyderabad 502300',
    latitude: STORE_DEFAULTS.CENTER_LOCATION.LATITUDE,
    longitude: STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE,
    pincode: '502300',
    distanceKm: dist,
    isDeliverable: true,
    deliveryFee: pricing.fee,
    zoneLabel: pricing.label,
    confirmed: false,
  };
})();

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocationState>(DEFAULT_LOCATION);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load cart from localStorage if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem('n_crackers_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
      const savedLoc = localStorage.getItem('n_crackers_location');
      if (savedLoc) {
        setDeliveryLocation(JSON.parse(savedLoc));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const confirmDeliveryLocation = (loc: DeliveryLocationState) => {
    const updated = { ...loc, confirmed: true };
    setDeliveryLocation(updated);
    try {
      localStorage.setItem('n_crackers_location', JSON.stringify(updated));
    } catch {}
  };

  const autoDetectLocation = async (): Promise<DeliveryLocationState | null> => {
    setIsDetectingLocation(true);
    setLocationError(null);
    try {
      const live = await getLiveDeliveryLocation();
      const detected: DeliveryLocationState = {
        address: live.address,
        latitude: live.latitude,
        longitude: live.longitude,
        pincode: live.pincode,
        distanceKm: live.distanceKm,
        isDeliverable: live.isDeliverable,
        deliveryFee: live.deliveryFee,
        zoneLabel: live.zoneLabel,
        confirmed: false, // Customer confirms delivery address
      };
      setDeliveryLocation(detected);
      setIsDetectingLocation(false);
      return detected;
    } catch (err: any) {
      setIsDetectingLocation(false);
      const msg = err.message || 'Could not acquire GPS position. Please select or search your locality.';
      setLocationError(msg);
      return null;
    }
  };

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('n_crackers_cart', JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('n_crackers_location', JSON.stringify(deliveryLocation));
    } catch {
      // Ignore
    }
  }, [deliveryLocation]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const addItem = (newItem: CartItem) => {
    if (newItem.stock !== undefined && newItem.stock <= 0) {
      showToast(`⚠️ Sorry, "${newItem.name}" is currently out of stock.`);
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.variantId === newItem.variantId);
      if (idx > -1) {
        const currentItem = prev[idx];
        const maxStock = newItem.stock ?? currentItem.stock;
        const currentQty = currentItem.quantity;

        if (maxStock !== undefined && currentQty >= maxStock) {
          showToast(`⚠️ Maximum available stock (${maxStock}) already in cart!`);
          return prev;
        }

        const newQty = maxStock !== undefined ? Math.min(maxStock, currentQty + newItem.quantity) : currentQty + newItem.quantity;
        const updated = [...prev];
        updated[idx] = {
          ...currentItem,
          stock: maxStock,
          quantity: newQty,
        };
        showToast(
          newQty < currentQty + newItem.quantity
            ? `⚠️ Added max available (${maxStock}) "${newItem.name}" to cart!`
            : `✨ Added "${newItem.name}" to cart!`
        );
        return updated;
      }

      const initialQty = newItem.stock !== undefined ? Math.min(newItem.stock, newItem.quantity) : newItem.quantity;
      showToast(`✨ Added "${newItem.name}" to cart!`);
      return [...prev, { ...newItem, quantity: initialQty }];
    });
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setItems((prev) => {
      const target = prev.find((i) => i.variantId === variantId);
      if (target && delta > 0 && target.stock !== undefined && target.quantity >= target.stock) {
        showToast(`⚠️ Cannot order more than available stock (${target.stock} units).`);
        return prev;
      }

      return prev
        .map((item) => {
          if (item.variantId === variantId) {
            const maxStock = item.stock ?? Infinity;
            const newQty = delta > 0 ? Math.min(maxStock, item.quantity + delta) : item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        subtotal,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        deliveryLocation,
        setDeliveryLocation,
        confirmDeliveryLocation,
        isDetectingLocation,
        locationError,
        setLocationError,
        autoDetectLocation,
        isLocationModalOpen,
        openLocationModal: () => setIsLocationModalOpen(true),
        closeLocationModal: () => setIsLocationModalOpen(false),
        toastMessage,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
