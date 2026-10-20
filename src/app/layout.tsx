import type { Metadata, Viewport } from 'next';
import './globals.css';


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f18805',
};

export const metadata: Metadata = {
  title: 'N Crackers — Premium Diwali Fireworks & Local Delivery Platform',
  description:
    'Production-grade e-commerce and local delivery platform for N Crackers. Centered at Velmala, Hyderabad with fast 7 KM delivery geofencing, live tracking, and verified green crackers.',
  keywords: [
    'N Crackers',
    'Diwali Crackers Hyderabad',
    'Velmala Fireworks Delivery',
    'Green Crackers Online',
    '7km Local Delivery',
  ],
  authors: [{ name: 'N Crackers Architecture Team' }],
};

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { AppShell } from '@/components/layout/AppShell';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth dark">
      <body className="flex flex-col min-h-screen bg-[#07090e] text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        <AuthProvider>
          <CartProvider>
            <AppShell>{children}</AppShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
