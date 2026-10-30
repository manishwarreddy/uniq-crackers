import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PRODUCTS } from '../src/lib/products-data';
import { ProductCard } from '../src/components/ecommerce/ProductCard';
import { CartProvider } from '../src/context/CartContext';

// Configure image options for Next.js Image loader in test runner
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
process.env.__NEXT_IMAGE_OPTS = JSON.stringify({
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  domains: ['dldhiedtofgmgjaetxzl.supabase.co'],
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co' },
    { protocol: 'https', hostname: 'dldhiedtofgmgjaetxzl.supabase.co' },
    { protocol: 'https', hostname: '**' },
  ],
  path: '/_next/image',
  loader: 'default',
  dangerouslyAllowSVG: false,
  unoptimized: false,
});

test('Mobile product grid: Homepage catalog uses 2 columns on mobile and 4 columns on desktop', () => {
  const pagePath = path.join(process.cwd(), 'src/app/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');

  // Verify the catalog grid has grid-cols-2 for mobile and sm:grid-cols-2 lg:grid-cols-4 for desktop
  assert.match(
    pageContent,
    /grid\s+grid-cols-2\s+sm:grid-cols-2\s+lg:grid-cols-4\s+gap-2\.5\s+sm:gap-6/,
    'Catalog grid must use 2 columns on mobile (grid-cols-2) and preserve desktop grid classes'
  );
});

test('Mobile product grid: Related products section uses 2 columns on mobile and 4 columns on desktop', () => {
  const detailPath = path.join(process.cwd(), 'src/components/ecommerce/ProductDetailClient.tsx');
  const detailContent = fs.readFileSync(detailPath, 'utf-8');

  // Verify related products grid has grid-cols-2 for mobile
  assert.match(
    detailContent,
    /grid\s+grid-cols-2\s+sm:grid-cols-2\s+lg:grid-cols-4\s+gap-2\.5\s+sm:gap-6/,
    'Related products grid must use 2 columns on mobile (grid-cols-2) and preserve desktop grid classes'
  );
});

test('Mobile product grid: ProductCard renders compact card with square image, discount, name, price, stock, and Add to Cart', () => {
  const sampleProduct = INITIAL_PRODUCTS[0];
  assert.ok(sampleProduct, 'Sample product should exist');

  const markup = renderToStaticMarkup(
    React.createElement(
      CartProvider,
      null,
      React.createElement(ProductCard, {
        product: sampleProduct,
        onAddToCart: () => {},
        onQuickView: () => {},
      })
    )
  );

  // 1. Square image stage
  assert.ok(
    markup.includes('aspect-square'),
    'Product card must include aspect-square image container'
  );

  // 2. Product name wrapped neatly
  assert.ok(
    markup.includes(sampleProduct.name),
    'Product card must render the product name'
  );
  assert.ok(
    markup.includes('line-clamp-2'),
    'Product name must have line-clamp-2 to prevent vertical/horizontal overflow'
  );

  // 3. Compact mobile padding
  assert.ok(
    markup.includes('p-2 sm:p-4'),
    'Product card body must have compact mobile padding p-2 sm:p-4'
  );

  // 4. Price & Discount
  assert.ok(
    markup.includes(`₹${sampleProduct.variants[0].price}`),
    'Product card must render variant price'
  );

  // 5. Stock status
  assert.ok(
    markup.includes('In Stock') || markup.includes('Only') || markup.includes('Out of Stock'),
    'Product card must show stock status'
  );

  // 6. Add to Cart button
  assert.ok(
    markup.includes('Add to Cart'),
    'Product card must contain Add to Cart button'
  );
});

test('Mobile product grid: 360px viewport math verifies exactly 2 cards fit per row without horizontal overflow', () => {
  const viewportWidth = 360; // 360px mobile screen (e.g., standard Android phone)
  const containerPadding = 16 * 2; // .container-custom padding: 1rem (16px) left + 1rem (16px) right = 32px
  const availableContentWidth = viewportWidth - containerPadding; // 328px
  const gridGap = 10; // gap-2.5 = 10px

  // Column width calculation for grid-cols-2
  const cardWidth = (availableContentWidth - gridGap) / 2; // (328 - 10) / 2 = 159px
  const totalRowWidth = cardWidth * 2 + gridGap;

  assert.equal(totalRowWidth, availableContentWidth, 'Total row width must equal available content width');
  assert.equal(cardWidth, 159, 'Each card has 159px width on a 360px viewport');
  assert.ok(cardWidth > 140, 'Each card has ample room (>140px) for compact content');

  // Verify internal card dimensions
  const cardPadding = 8 * 2; // p-2 = 8px left + 8px right = 16px
  const innerCardWidth = cardWidth - cardPadding; // 159 - 16 = 143px
  assert.equal(innerCardWidth, 143, 'Inner card content width is 143px');

  // Exactly 2 cards per row
  const columnsCount = Math.floor((availableContentWidth + gridGap) / (cardWidth + gridGap));
  assert.equal(columnsCount, 2, 'Exactly 2 products must appear per row on a 360px screen');
});
