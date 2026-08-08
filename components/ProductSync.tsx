'use client';

import { useEffect } from 'react';
import { useProductStore } from '@/store/productStore';
import { subscribeToProducts } from '@/lib/firebase/products';

/**
 * ProductSync — global client component that subscribes to Firestore products
 * and keeps the Zustand productStore up to date.
 *
 * Mounted once in the root layout so all admin pages have access to product data
 * via useProductStore() without each page setting up its own subscription.
 */
export function ProductSync() {
  const setProducts = useProductStore((s) => s.setProducts);

  useEffect(() => {
    const unsub = subscribeToProducts((products) => {
      setProducts(products);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [setProducts]);

  return null;
}
