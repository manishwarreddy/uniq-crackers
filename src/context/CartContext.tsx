'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, DeliveryLocationState, ProductItem } from '@/types';
import { STORE_DEFAULTS } from '@/lib/constants';
import { calculateDistanceKm, getDeliveryPricingForDistance } from '@/lib/geo';

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
  };
})();

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocationState>(DEFAULT_LOCATION);
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
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.variantId === newItem.variantId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + newItem.quantity,
        };
        return updated;
      }
      return [...prev, newItem];
    });
    showToast(`✨ Added "${newItem.name}" to cart!`);
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
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
