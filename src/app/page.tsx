'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  ShieldCheck,
  MapPin,
  Compass,
  CheckCircle2,
  XCircle,
  Layers,
  Database,
  Lock,
  Cpu,
  RefreshCw,
  Bell,
  CreditCard,
  Truck,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { STORE_DEFAULTS } from '@/lib/constants';
import { validateDeliveryLocation, GeofenceCheckResult } from '@/lib/geo';
import { formatINR } from '@/lib/utils';

export default function HomePage() {
  // Geofence interactive verification state
  const [latInput, setLatInput] = useState<string>('17.502900');
  const [lngInput, setLngInput] = useState<string>('78.257300');
  const [geoResult, setGeoResult] = useState<GeofenceCheckResult | null>(() =>
    validateDeliveryLocation({
      latitude: 17.5029,
      longitude: 78.2573,
    })
  );

  const testLocations = [
    { name: 'Velmala Center (Store Hub)', lat: 17.5029, lng: 78.2573, note: 'Center Point (0.0 km)' },
    { name: 'Kollur ORR Junction', lat: 17.4862, lng: 78.2321, note: 'Within Zone (~3.3 km)' },
    { name: 'Tellapur Township', lat: 17.4611, lng: 78.2882, note: 'Within Zone (~5.6 km)' },
    { name: 'Shankarpally Road', lat: 17.5350, lng: 78.2050, note: 'Within Zone (~6.7 km)' },
    { name: 'Gachibowli Stadium', lat: 17.4475, lng: 78.3498, note: 'Outside Zone (~11.5 km)' },
    { name: 'Secunderabad Station', lat: 17.4399, lng: 78.5017, note: 'Outside Zone (~27.0 km)' },
  ];

  const handleTestLocation = (lat: number, lng: number) => {
    setLatInput(lat.toFixed(6));
    setLngInput(lng.toFixed(6));
    const res = validateDeliveryLocation({ latitude: lat, longitude: lng });
    setGeoResult(res);
  };

  const handleManualCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      setGeoResult(validateDeliveryLocation({ latitude: lat, longitude: lng }));
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Phase 0 Master Project Architecture & Foundation</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Lighting Celebrations with <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-festive-crimson bg-clip-text text-transparent">
                High-Speed Local Delivery
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>N Crackers</strong> is engineered for high-concurrency festival demand,
              supporting 1,500+ registered customers, 100–250 curated green cracker products, live
              GPS dispatch, and a strict <strong>7 km geofenced delivery radius</strong> from our Velmala hub.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <a href="#geofence-inspector">
                <Button
                  variant="festive"
                  size="lg"
                  leftIcon={<Compass className="w-5 h-5" />}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Test 7 KM Geofence Engine
                </Button>
              </a>

              <Link href="/api/health" target="_blank">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Cpu className="w-5 h-5 text-slate-500" />}
                  rightIcon={<ExternalLink className="w-4 h-4 text-slate-400" />}
                >
                  Inspect Health API
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Geofence & Haversine Distance Engine Verification */}
      <section id="geofence-inspector" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-amber-500/30 shadow-festive">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="festive">Core Requirement #4 & #5</Badge>
                <span className="text-xs font-semibold text-slate-400">Haversine Great-Circle Algorithm</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white mt-1">
                7 KM Local Geofence & Delivery Engine
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configured Store Hub: <strong>{STORE_DEFAULTS.CENTER_LOCATION.ADDRESS}</strong> ({STORE_DEFAULTS.CENTER_LOCATION.LATITUDE}, {STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE})
              </p>
            </div>

            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 shrink-0">
              <MapPin className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Strict Max Radius</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">7.0 Kilometers</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
            {/* Left: Interactive Input & Quick Locality Presets */}
            <div className="lg:col-span-7 space-y-6">
              <h4 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>1. Select or Enter Coordinates</span>
              </h4>

              {/* Quick Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {testLocations.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleTestLocation(loc.lat, loc.lng)}
                    className="flex flex-col text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 hover:bg-amber-500/5 transition-all text-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500">
                        {loc.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      {loc.note}
                    </span>
                  </button>
                ))}
              </div>

              {/* Manual Input Form */}
              <form onSubmit={handleManualCheck} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Custom Coordinate Verification (Customer GPS / Map Pin Simulation)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Customer Latitude"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    placeholder="e.g. 17.502900"
                  />
                  <Input
                    label="Customer Longitude"
                    value={lngInput}
                    onChange={(e) => setLngInput(e.target.value)}
                    placeholder="e.g. 78.257300"
                  />
                </div>
                <Button type="submit" variant="festive" size="sm" className="w-full">
                  Compute Haversine Distance & Delivery Eligibility
                </Button>
              </form>
            </div>

            {/* Right: Realtime Calculation Output */}
            <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Geofence Verification Result
                  </span>
                  {geoResult?.isDeliverable ? (
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Deliverable
                    </Badge>
                  ) : (
                    <Badge variant="error" size="sm">
                      <XCircle className="w-3.5 h-3.5" /> Out of Zone
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Distance from Velmala Hub:</span>
                    <span className="text-2xl font-black font-heading text-amber-400">
                      {geoResult?.distanceKm ?? 0} KM
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Maximum Allowed Radius:</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {geoResult?.maxRadiusKm} KM
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Distance-Based Delivery Fee:</span>
                    <span className="text-base font-bold text-emerald-400">
                      {geoResult?.isDeliverable ? formatINR(geoResult.deliveryFee) : 'N/A'}
                    </span>
                  </div>
                </div>

                {geoResult && (
                  <Alert
                    variant={geoResult.isDeliverable ? 'success' : 'error'}
                    title={geoResult.isDeliverable ? 'Delivery Service Available' : "We don't deliver to your location"}
                    className="mt-4"
                  >
                    {geoResult.message}
                  </Alert>
                )}
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="font-semibold text-slate-300">Phase 0 Architecture Contract:</p>
                <p>
                  Checkout and order placement are strictly blocked server-side whenever
                  coordinates exceed the configured radius.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Master Architecture Modules Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="festive">Scalable Master Design</Badge>
          <h2 className="text-3xl font-heading font-black text-slate-900 dark:text-white">
            Architected for High-Rush Concurrency
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Every core domain is structured to handle Diwali festival spikes without overselling or downtime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module 1: Relational DB & Prisma */}
          <Card festiveBorder>
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                <Database className="w-5 h-5" />
              </div>
              <CardTitle>PostgreSQL Relational Schema</CardTitle>
              <CardDescription>
                Full schema generated with Prisma ORM v5.22 covering 20+ domain entities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>• Normalized tables with foreign keys and compound indexes.</p>
              <p>• Strict inventory locking and order tracking audit tables.</p>
              <p>• Migration strategy ready for zero-downtime schema evolution.</p>
            </CardContent>
          </Card>

          {/* Module 2: Inventory & Concurrency */}
          <Card festiveBorder>
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
                <RefreshCw className="w-5 h-5" />
              </div>
              <CardTitle>Inventory Concurrency & Hold</CardTitle>
              <CardDescription>
                Order Created → Inventory Reserved → Order Confirmed → Inventory Deducted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>• 15-minute TTL temporary inventory reservation on checkout.</p>
              <p>• Row-level isolation & atomic decrement prevents overselling.</p>
              <p>• Automatic TTL reservation release on expiration or cancellation.</p>
            </CardContent>
          </Card>

          {/* Module 3: State Machine & Order Lifecycle */}
          <Card festiveBorder>
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <CardTitle>Controlled Order State Machine</CardTitle>
              <CardDescription>
                10 distinct order statuses with strict transition matrices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>• Placed → Confirmed → Preparing → Ready → Out for Delivery → Delivered.</p>
              <p>• Immutable status history with user attribution & timestamps.</p>
              <p>• 4-digit Delivery OTP verification to finalize handoff.</p>
            </CardContent>
          </Card>

          {/* Module 4: Live GPS & Realtime Dispatch */}
          <Card festiveBorder>
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                <Truck className="w-5 h-5" />
              </div>
              <CardTitle>Live GPS Delivery Dispatch</CardTitle>
              <CardDescription>
                Active-only tracking session lifecycle with agent duty controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>• Duty status: Online, Offline, On Break, On Delivery.</p>
              <p>• Privacy enforced: GPS updates tracked ONLY during active delivery.</p>
              <p>• Intelligent assignment algorithm scoring distance & active load.</p>
            </CardContent>
          </Card>

          {/* Module 5: Payments & Idempotency */}
          <Card festiveBorder>
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <CardTitle>Payments & Webhook Idempotency</CardTitle>
              <CardDescription>
                Razorpay, Direct UPI, and Cash on Delivery (COD) architecture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>• Server-side HMAC signature verification on webhooks.</p>
              <p>• Unique idempotency keys prevent double charging or replay attacks.</p>
              <p>• Zero trust on browser callbacks for order fulfillment.</p>
            </CardContent>
          </Card>

          {/* Module 6: WhatsApp & Security Boundaries */}
          <Card festiveBorder>
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2">
                <Bell className="w-5 h-5" />
              </div>
              <CardTitle>Role-Based Ops & Notifications</CardTitle>
              <CardDescription>
                Strict RBAC and isolated WhatsApp operational messaging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>• WhatsApp alerts strictly for Super Admin & Delivery Agent dispatch.</p>
              <p>• Customers receive in-app and SMS updates (no spam policy).</p>
              <p>• Server-enforced role hierarchy: Super Admin, Admin, Staff, Agent, Customer.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Design System Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <Badge variant="neutral">Design System Foundation</Badge>
            <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white mt-1">
              Festive UI Component System
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vibrant amber/gold festive gradients, glow shadows, micro-interactions, and accessible controls.
            </p>
          </div>

          {/* Buttons showcase */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Button Tokens</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="festive" size="md">Festive Glow Action</Button>
              <Button variant="primary" size="md">Primary Navy</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="outline" size="md">Amber Outline</Button>
              <Button variant="danger" size="md">Danger</Button>
              <Button variant="festive" size="md" isLoading>Loading State</Button>
            </div>
          </div>

          {/* Badges showcase */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status Badges</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="festive">Diwali 2026 Special</Badge>
              <Badge variant="success">Confirmed (Paid)</Badge>
              <Badge variant="warning">Preparing Dispatch</Badge>
              <Badge variant="info">Out for Delivery</Badge>
              <Badge variant="error">Cancelled</Badge>
              <Badge variant="neutral">Guest Session</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Phase 0 Completion Acceptance Summary */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span className="font-heading font-bold text-slate-900 dark:text-white">
                Phase 0 Foundation Ready for Phase 1
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL Prisma Schema, Geofence Engine,
              Role-based Guards, and Security foundations are all fully configured and validated.
            </p>
          </div>
          <Link href="/api/health">
            <Button variant="festive" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Verify API /api/health
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
