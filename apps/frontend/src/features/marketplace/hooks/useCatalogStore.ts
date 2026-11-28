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

      if (catalogResult.source === 'unconfigured' || catalogResult.source === 'error' || catalogResult.source === 'schema_missing' || catalogResult.products.length === 0) {
        const samsungSeed = INITIAL_COMMERCE_ITEMS.find((item) => item.id === 'prod_retail_brand_01');
        const storedItems = loadStoredData('COMMERCE', INITIAL_COMMERCE_ITEMS);
        setCommerceItems(storedItems.map((item) => (
          samsungSeed && item.id === samsungSeed.id
            ? { ...item, imageUrl: samsungSeed.imageUrl, galleryImages: samsungSeed.galleryImages }
            : item
        )));
        setCatalogNotice(null);
      } else {
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
