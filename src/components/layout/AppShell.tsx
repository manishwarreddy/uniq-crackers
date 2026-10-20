'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/ecommerce/CartDrawer';
import { LocationSelectorModal } from '@/components/ecommerce/LocationSelectorModal';
import { RoleAuthModal } from '@/components/layout/RoleAuthModal';
import { CustomerOtpModal } from '@/components/auth/CustomerOtpModal';
import { Sparkles, ShoppingBag } from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    items,
    cartCount,
    subtotal,
    isCartOpen,
    openCart,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    deliveryLocation,
    setDeliveryLocation,
    isLocationModalOpen,
    openLocationModal,
    closeLocationModal,
    toastMessage,
    showToast,
  } = useCart();

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={closeCart}
        items={items}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        deliveryLocation={deliveryLocation}
        onChangeLocation={() => {
          closeCart();
          openLocationModal();
        }}
        onCheckoutSuccess={() => {
          clearCart();
          showToast('🎉 Order placed successfully! Thank you for celebrating with N Crackers.');
        }}
      />

      {/* Location Selector Modal */}
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={closeLocationModal}
        currentLocation={deliveryLocation}
        onSelectLocation={(loc) => {
          setDeliveryLocation(loc);
          showToast(`📍 Delivery location updated to ${loc.address.slice(0, 30)}...`);
        }}
      />

      {/* Role Auth Modal (Customer vs Admin) */}
      <RoleAuthModal />

      {/* Customer 10-Digit Mobile OTP Verification Modal */}
      <CustomerOtpModal />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 py-3 rounded-2xl shadow-festive border border-amber-500/30 flex items-center gap-2.5 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="md:hidden fixed bottom-4 inset-x-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={openCart}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-festive-crimson text-white px-5 py-3.5 rounded-2xl shadow-spark flex items-center justify-between font-bold text-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                {cartCount}
              </div>
              <span>View Festive Cart</span>
            </div>
            <div className="flex items-center gap-1.5 font-heading text-base font-black">
              <span>₹{subtotal}</span>
              <ShoppingBag className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      )}
    </>
  );
};
