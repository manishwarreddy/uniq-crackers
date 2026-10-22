import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ServerStore } from '@/lib/server-store';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { ProductDetailClient } from '@/components/ecommerce/ProductDetailClient';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export function generateMetadata({ params }: ProductPageProps): Metadata {
  const product =
    ServerStore.getProductById(params.slug) ||
    INITIAL_PRODUCTS.find((p) => p.slug === params.slug || p.id === params.slug);

  if (!product) {
    return {
      title: 'Product Not Found | Uniq Crackers',
      description: 'The requested celebratory firework product could not be found.',
    };
  }

  return {
    title: `${product.name} | Uniq Crackers Hyderabad`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const product =
    ServerStore.getProductById(params.slug) ||
    INITIAL_PRODUCTS.find((p) => p.slug === params.slug || p.id === params.slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
