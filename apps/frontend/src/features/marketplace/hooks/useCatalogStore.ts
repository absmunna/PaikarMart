import { useCallback, useEffect, useState } from 'react';
import type { CommerceItem } from '@/types';
import { clearStoredData, loadStoredData, saveStoredData } from '@/lib/supabase';
import { INITIAL_COMMERCE_ITEMS } from '@/data/mockData';
import { fetchCatalogResult } from '../services/catalogApiClient';

export function useCatalogStore() {
  const [commerceItems, setCommerceItems] = useState<CommerceItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);

  const refreshCatalog = useCallback(async (signal?: AbortSignal) => {
    setIsCatalogLoading(true);
    try {
      const catalogResult = await fetchCatalogResult(signal);
      if (signal?.aborted) return;

      if (catalogResult.source === 'unconfigured') {
        if (import.meta.env.PROD) {
          clearStoredData('COMMERCE');
          setCommerceItems([]);
          setCatalogNotice('Marketplace products are temporarily unavailable. Please try again later.');
          return;
        }

        const samsungSeed = INITIAL_COMMERCE_ITEMS.find((item) => item.id === 'prod_retail_brand_01');
        if (!samsungSeed) {
          throw new Error('The seeded Samsung product is missing from the initial catalog.');
        }
        const storedItems = loadStoredData('COMMERCE', INITIAL_COMMERCE_ITEMS);
        setCommerceItems(storedItems.map((item) => (
          item.id === samsungSeed.id
            ? { ...item, imageUrl: samsungSeed.imageUrl, galleryImages: samsungSeed.galleryImages }
            : item
        )));
        setCatalogNotice(null);
      } else {
        if (catalogResult.source === 'error' || catalogResult.source === 'schema_missing' || !catalogResult.schemaReady) {
          clearStoredData('COMMERCE');
          setCommerceItems([]);
          setCatalogNotice('Marketplace products are temporarily unavailable. Please try again later.');
          return;
        }

        if (catalogResult.products.length === 0) {
          clearStoredData('COMMERCE');
          setCommerceItems([]);
          setCatalogNotice(
            import.meta.env.PROD
              ? 'No retail products are available yet. Please check back soon.'
              : null
          );
          return;
        }
        setCommerceItems(catalogResult.products);
        setCatalogNotice(null);
      }
    } finally {
      if (!signal?.aborted) {
        setIsCatalogLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (commerceItems.length > 0) {
      saveStoredData('COMMERCE', commerceItems);
    }
  }, [commerceItems]);

  const addCommerceItem = useCallback((item: CommerceItem) => {
    setCommerceItems((current) => [item, ...current]);
  }, []);

  return { commerceItems, isCatalogLoading, catalogNotice, refreshCatalog, addCommerceItem };
}
