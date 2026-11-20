import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CommerceItem } from '@/types';

const COMPARE_STORAGE_KEY = 'paikarmart_compare_ids_v1';
export const MAX_COMPARE_ITEMS = 4;

interface ProductComparisonContextValue {
  compareItems: CommerceItem[];
  compareIds: string[];
  isCompareModalOpen: boolean;
  limitNotice: string | null;
  maxItems: number;
  isCompared: (productId: string) => boolean;
  toggleCompare: (product: CommerceItem) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  openCompareModal: () => void;
  closeCompareModal: () => void;
  dismissLimitNotice: () => void;
}

const DEFAULT_CONTEXT: ProductComparisonContextValue = {
  compareItems: [],
  compareIds: [],
  isCompareModalOpen: false,
  limitNotice: null,
  maxItems: MAX_COMPARE_ITEMS,
  isCompared: () => false,
  toggleCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  openCompareModal: () => {},
  closeCompareModal: () => {},
  dismissLimitNotice: () => {},
};

const ProductComparisonContext = createContext<ProductComparisonContextValue>(DEFAULT_CONTEXT);

function loadStoredCompareEntries(): CommerceItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE_ITEMS) : [];
  } catch {
    return [];
  }
}

interface ProductComparisonProviderProps {
  catalogItems: CommerceItem[];
  children: React.ReactNode;
}

export const ProductComparisonProvider: React.FC<ProductComparisonProviderProps> = ({
  catalogItems,
  children,
}) => {
  const [selectedSnapshots, setSelectedSnapshots] = useState<CommerceItem[]>(() =>
    loadStoredCompareEntries()
  );
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(selectedSnapshots));
    } catch {
      // Ignore storage quota/private mode errors
    }
  }, [selectedSnapshots]);

  // Keep compared items hydrated with latest live catalog data (price, stock, specs)
  const compareItems = useMemo(() => {
    if (catalogItems.length === 0) return selectedSnapshots;
    const byId = new Map(catalogItems.map((item) => [item.id, item]));
    return selectedSnapshots.map((snapshot) => byId.get(snapshot.id) || snapshot);
  }, [catalogItems, selectedSnapshots]);

  const compareIds = useMemo(
    () => compareItems.map((item) => item.id),
    [compareItems]
  );

  const isCompared = useCallback(
    (productId: string) => compareIds.includes(productId),
    [compareIds]
  );

  const toggleCompare = useCallback((product: CommerceItem) => {
    setLimitNotice(null);
    setSelectedSnapshots((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        const next = prev.filter((item) => item.id !== product.id);
        if (next.length < 2) {
          setIsCompareModalOpen(false);
        }
        return next;
      }
      if (prev.length >= MAX_COMPARE_ITEMS) {
        setLimitNotice(`You can compare up to ${MAX_COMPARE_ITEMS} products side by side.`);
        return prev;
      }
      return [...prev, product];
    });
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setLimitNotice(null);
    setSelectedSnapshots((prev) => {
      const next = prev.filter((item) => item.id !== productId);
      if (next.length < 2) {
        setIsCompareModalOpen(false);
      }
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setLimitNotice(null);
    setSelectedSnapshots([]);
    setIsCompareModalOpen(false);
  }, []);

  const openCompareModal = useCallback(() => {
    if (compareItems.length >= 2) {
      setIsCompareModalOpen(true);
    }
  }, [compareItems.length]);

  const closeCompareModal = useCallback(() => {
    setIsCompareModalOpen(false);
  }, []);

  const dismissLimitNotice = useCallback(() => {
    setLimitNotice(null);
  }, []);

  useEffect(() => {
    if (!limitNotice || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => setLimitNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [limitNotice]);

  const value = useMemo<ProductComparisonContextValue>(
    () => ({
      compareItems,
      compareIds,
      isCompareModalOpen,
      limitNotice,
      maxItems: MAX_COMPARE_ITEMS,
      isCompared,
      toggleCompare,
      removeFromCompare,
      clearCompare,
      openCompareModal,
      closeCompareModal,
      dismissLimitNotice,
    }),
    [
      compareItems,
      compareIds,
      isCompareModalOpen,
      limitNotice,
      isCompared,
      toggleCompare,
      removeFromCompare,
      clearCompare,
      openCompareModal,
      closeCompareModal,
      dismissLimitNotice,
    ]
  );

  return (
    <ProductComparisonContext.Provider value={value}>
      {children}
    </ProductComparisonContext.Provider>
  );
};

export function useProductComparison(): ProductComparisonContextValue {
  return useContext(ProductComparisonContext);
}
