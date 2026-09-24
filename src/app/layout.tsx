import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="flex flex-col min-h-screen festive-radial-bg">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
