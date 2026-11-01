-- ==============================================================================
-- UNIQ CRACKERS — SUPABASE MASTER DATABASE SCHEMA & SECURITY POLICIES (HARDENED)
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Safe for fresh databases and existing databases (Idempotent, Non-destructive)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category lookup
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Seed authoritative catalog categories (Safe: ON CONFLICT DO NOTHING)
INSERT INTO public.categories (id, name, slug, description, image_url, sort_order)
VALUES
    ('sparklers', 'Sparklers & Phooljhadi', 'sparklers', 'Handheld celebratory sparklers with low smoke and vibrant golden sparks', '/images/sparklers.jpg', 1),
    ('skyshots', 'Aerial Sky Shots', 'skyshots', 'Multi-colour aerial repeating display shells and single shots', '/images/skyshots.jpg', 2),
    ('flowerpots', 'Flower Pots & Anars', 'flowerpots', 'Ground fountain crackers with cascading fountains and silver sparkles', '/images/colour_koti.jpg', 3),
    ('chakkars', 'Ground Chakkars', 'chakkars', 'Fast-spinning ground wheels with dazzling multi-ring fireworks', '/images/chakkar.jpg', 4),
    ('sound', 'Sound Crackers & Bombs', 'sound', 'Traditional certified sound crackers compliant with decibel norms', '/images/sound_crackers.jpg', 5),
    ('rockets', 'Sky Rockets', 'rockets', 'High-altitude whistling rockets bursting into sparkling umbrella canopies', '/images/sky_rockets.jpg', 6),
    ('novelty', 'Fancy Novelties & Spinners', 'novelty', 'Twinkling butterflies, musical sirens, and whistle spinners for kids', '/images/novelty_fireworks.jpg', 7),
    ('hampers', 'Diwali Gift Hampers', 'hampers', 'Curated family gift boxes containing assortments of all popular crackers', '/images/hamper.jpg', 8),
    ('electronic', 'Electronic Crackers', 'electronic', 'Zero-pollution LED sound simulator crackers with remote control', '/images/sparklers.jpg', 9)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. PRODUCTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'sparklers',
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    category_label TEXT DEFAULT 'Festive Fireworks',
    description TEXT,
    image TEXT NOT NULL,
    image_alt TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INT DEFAULT 1,
    is_green_certified BOOLEAN DEFAULT true,
    sound_decibel TEXT DEFAULT 'Low / Moderate',
    smoke_level TEXT DEFAULT '70% Reduced Smoke (CSIR-NEERI)',
    duration_seconds INT,
    height_feet INT,
    featured BOOLEAN DEFAULT false,
    best_seller BOOLEAN DEFAULT false,
    badge_text TEXT,
    is_active BOOLEAN DEFAULT true,
    safety_tips TEXT[] DEFAULT ARRAY['Store in a cool, dry place away from heat or open flame.', 'Always ignite outdoors under responsible adult supervision.', 'Keep a bucket of clean water or sand ready nearby.'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for existing installations
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'sparklers';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_label TEXT DEFAULT 'Festive Fireworks';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_green_certified BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sound_decibel TEXT DEFAULT 'Low / Moderate';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS smoke_level TEXT DEFAULT '70% Reduced Smoke (CSIR-NEERI)';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS height_feet INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS best_seller BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS safety_tips TEXT[] DEFAULT ARRAY['Store in a cool, dry place away from heat or open flame.', 'Always ignite outdoors under responsible adult supervision.', 'Keep a bucket of clean water or sand ready nearby.'];

-- Indexes for product queries
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);

-- ------------------------------------------------------------------------------
-- 3. PRODUCT VARIANTS & INVENTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Standard Festive Box',
    sku TEXT UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    box_quantity TEXT NOT NULL DEFAULT '1 Box Unit',
    stock INT NOT NULL DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS box_quantity TEXT NOT NULL DEFAULT '1 Box Unit';
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 50;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);

-- ------------------------------------------------------------------------------
-- 4. CUSTOMER ORDERS TABLE (HARDENED SERVER-AUTHORITATIVE MODEL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    distance_km NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    payment_gateway TEXT,
    payment_transaction_id TEXT,
    gateway_order_id TEXT,
    payment_verified_at TIMESTAMPTZ,
    payment_amount_captured NUMERIC(10, 2),
    payment_currency TEXT DEFAULT 'INR',
    payment_failure_reason TEXT,
    refund_status TEXT,
    refund_initiated_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    delivery_otp TEXT NOT NULL,
    delivery_otp_verified BOOLEAN DEFAULT false,
    delivery_otp_attempts INT DEFAULT 0,
    delivered_at TIMESTAMPTZ,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_agent_id TEXT,
    assigned_agent_name TEXT,
    assigned_agent_phone TEXT,
    order_access_token TEXT,
    stock_restored BOOLEAN DEFAULT false,
    upi_utr TEXT,
    rejection_reason TEXT,
    rejection_note TEXT,
    rejected_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    delete_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for existing installations
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_amount_captured NUMERIC(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'INR';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot_uploaded_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_otp_attempts INT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delete_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_is_deleted ON public.orders(is_deleted);

-- ------------------------------------------------------------------------------
-- 5. COUPONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE' or 'FIXED_AMOUNT'
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_amount NUMERIC(10, 2) DEFAULT 500.0,
    max_discount NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10, 2);

-- Seed initial store coupons (Safe: ON CONFLICT DO NOTHING)
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, is_active)
VALUES
    ('DIWALI2026', 'Diwali Grand Celebration Discount (10% off up to ₹300)', 'PERCENTAGE', 10.0, 500.0, 300.0, true),
    ('VELMALA50', 'Velmala Local Residents Flat Discount (₹50 off on ₹500+)', 'FIXED_AMOUNT', 50.0, 500.0, NULL, true)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. DELIVERY & STORE SETTINGS (MATCHES CODEBASE CONSTANTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    free_delivery_threshold NUMERIC(10, 2) DEFAULT 3000.0, -- Matches pricing engine (subtotal >= ₹3000 -> ₹0 fee)
    max_delivery_radius_km NUMERIC(5, 2) DEFAULT 7.0,     -- Hard limit of 7.0 km from Velmala Hub
    store_lat NUMERIC(9, 6) DEFAULT 17.502900,
    store_lng NUMERIC(9, 6) DEFAULT 78.257300,
    store_address TEXT DEFAULT 'F6GQ+7PW, Velmala, Hyderabad, Telangana 502300',
    admin_whatsapp_number TEXT DEFAULT '9000000000',
    slabs JSONB NOT NULL DEFAULT '[
        {"minKm": 0.0, "maxKm": 2.0, "fee": 40.0, "label": "0 - 2 km (Local Velmala)"},
        {"minKm": 2.0, "maxKm": 4.0, "fee": 70.0, "label": "2 - 4 km (Outer Velmala)"},
        {"minKm": 4.0, "maxKm": 7.0, "fee": 120.0, "label": "4 - 7 km (Extended Boundary)"}
    ]'::jsonb,
    is_store_open BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_settings ADD COLUMN IF NOT EXISTS admin_whatsapp_number TEXT DEFAULT '9000000000';
ALTER TABLE public.delivery_settings ADD COLUMN IF NOT EXISTS slabs JSONB NOT NULL DEFAULT '[
    {"minKm": 0.0, "maxKm": 2.0, "fee": 40.0, "label": "0 - 2 km (Local Velmala)"},
    {"minKm": 2.0, "maxKm": 4.0, "fee": 70.0, "label": "2 - 4 km (Outer Velmala)"},
    {"minKm": 4.0, "maxKm": 7.0, "fee": 120.0, "label": "4 - 7 km (Extended Boundary)"}
]'::jsonb;

-- Insert default settings row if none exists (Safe: ON CONFLICT DO NOTHING)
INSERT INTO public.delivery_settings (
    id,
    free_delivery_threshold,
    max_delivery_radius_km,
    store_lat,
    store_lng,
    store_address,
    admin_whatsapp_number,
    is_store_open
)
VALUES (
    'default',
    3000.0,
    7.0,
    17.502900,
    78.257300,
    'F6GQ+7PW, Velmala, Hyderabad, Telangana 502300',
    '9000000000',
    true
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- CATEGORIES: Public can view active categories; Service role manages
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role full access categories" ON public.categories;
CREATE POLICY "Service role full access categories" ON public.categories
    FOR ALL USING (auth.role() = 'service_role');

-- PRODUCTS: Public can view active products; Service role manages
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role full access products" ON public.products;
CREATE POLICY "Service role full access products" ON public.products
    FOR ALL USING (auth.role() = 'service_role');

-- PRODUCT VARIANTS: Public can view active variants; Service role manages
DROP POLICY IF EXISTS "Public can view active variants" ON public.product_variants;
CREATE POLICY "Public can view active variants" ON public.product_variants
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role full access variants" ON public.product_variants;
CREATE POLICY "Service role full access variants" ON public.product_variants
    FOR ALL USING (auth.role() = 'service_role');

-- COUPONS: Public can verify active coupons; Service role manages
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons" ON public.coupons
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role full access coupons" ON public.coupons;
CREATE POLICY "Service role full access coupons" ON public.coupons
    FOR ALL USING (auth.role() = 'service_role');

-- DELIVERY SETTINGS: Public can view delivery rules & center coordinates; Service role manages
DROP POLICY IF EXISTS "Public can view delivery settings" ON public.delivery_settings;
CREATE POLICY "Public can view delivery settings" ON public.delivery_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access delivery settings" ON public.delivery_settings;
CREATE POLICY "Service role full access delivery settings" ON public.delivery_settings
    FOR ALL USING (auth.role() = 'service_role');

-- ORDERS: STRICT SECURITY ISOLATION
-- CRITICAL SECURITY ENFORCEMENT:
-- 1. Direct anonymous/public insertion is STRICTLY REVOKED to eliminate price tampering,
--    forged payment status ('PAID'), unearned discounts, and inventory bypasses.
-- 2. Direct public SELECT is BLOCKED so customers cannot read other customers' orders or delivery OTPs.
-- 3. All order placement, status updates, and tracking requests flow exclusively through the Next.js
--    server API routes (/api/orders, /track-order), which validate server pricing, reserve inventory,
--    and sanitize delivery OTPs before sending data to viewers.
-- 4. Supabase access to public.orders is granted SOLELY to the backend service_role.
DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;

CREATE POLICY "Service role full access orders" ON public.orders
    FOR ALL USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKET FOR PRODUCT IMAGES
-- ------------------------------------------------------------------------------
-- Ensure product-images bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Public can view images (CDN/Web delivery)
DROP POLICY IF EXISTS "Public Access Product Images" ON storage.objects;
CREATE POLICY "Public Access Product Images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

-- Storage Policy: Only authenticated server backend (service_role) can upload and manage images
DROP POLICY IF EXISTS "Service Role Manage Product Images" ON storage.objects;
CREATE POLICY "Service Role Manage Product Images" ON storage.objects
    FOR ALL USING (bucket_id = 'product-images' AND auth.role() = 'service_role');

-- Storage Bucket for Payment Screenshots (STRICTLY PRIVATE - Never public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Only service_role backend can access private payment screenshots
DROP POLICY IF EXISTS "Service Role Manage Payment Screenshots" ON storage.objects;
CREATE POLICY "Service Role Manage Payment Screenshots" ON storage.objects
    FOR ALL USING (bucket_id = 'payment-screenshots' AND auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 9. PERMISSIONS & ROLE GRANTS
-- Configures PostgREST schema discovery and blocks unauthorized table access
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Public roles can read active catalog, active coupons, and delivery policies
GRANT SELECT ON public.categories, public.products, public.product_variants, public.coupons, public.delivery_settings TO anon, authenticated;

-- STRICT: Revoke direct orders access from public anon and authenticated roles
REVOKE ALL ON public.orders FROM anon, authenticated;

-- Grant complete management access to the backend service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ------------------------------------------------------------------------------
-- 10. FEATURED SECTION MANAGEMENT
-- Stores admin-controlled homepage spotlight showcase configuration
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.featured_section (
    id TEXT PRIMARY KEY DEFAULT 'default',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    heading TEXT,
    subtitle TEXT,
    product_id TEXT,
    product_title TEXT,
    product_description TEXT,
    badge_text TEXT,
    promotional_label TEXT,
    display_order INT DEFAULT 1,
    button_text TEXT,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.featured_section ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view featured section" ON public.featured_section;
CREATE POLICY "Public can view featured section" ON public.featured_section
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access featured section" ON public.featured_section;
CREATE POLICY "Service role full access featured section" ON public.featured_section
    FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON public.featured_section TO anon, authenticated;
GRANT ALL ON public.featured_section TO service_role;
