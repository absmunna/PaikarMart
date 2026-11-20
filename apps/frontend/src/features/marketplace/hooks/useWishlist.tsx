import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { CommerceItem } from '@/types';
import { useAuth } from '@/features/auth';
import {
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from '@/lib/firebase';

const WISHLIST_STORAGE_KEY = 'paikarmart_wishlist_v1';
const MAX_WISHLIST_ITEMS = 100;

export interface WishlistEntry {
  product: CommerceItem;
  addedAt: string;
}

interface WishlistContextValue {
  wishlistItems: CommerceItem[];
  wishlistEntries: WishlistEntry[];
  wishlistIds: string[];
  wishlistCount: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: CommerceItem) => boolean;
  addToWishlist: (product: CommerceItem) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
  getAddedAt: (productId: string) => string | undefined;
}

const DEFAULT_CONTEXT: WishlistContextValue = {
  wishlistItems: [],
  wishlistEntries: [],
  wishlistIds: [],
  wishlistCount: 0,
  isWishlisted: () => false,
  toggleWishlist: () => false,
  addToWishlist: () => {},
  removeFromWishlist: () => {},
  clearWishlist: () => {},
  getAddedAt: () => undefined,
};

const WishlistContext = createContext<WishlistContextValue>(DEFAULT_CONTEXT);

function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned || 'item_01';
}

function buildWishlistDocId(uid: string, productId: string): string {
  return sanitizeFirestoreId(`${uid}__${productId}`);
}

function isValidStoredEntry(candidate: unknown): candidate is WishlistEntry {
  if (!candidate || typeof candidate !== 'object') return false;
  const entry = candidate as Partial<WishlistEntry>;
  if (!entry.product || typeof entry.product !== 'object') return false;
  if (typeof entry.product.id !== 'string' || !entry.product.id) return false;
  if (typeof entry.product.title !== 'string') return false;
  return true;
}

function loadStoredWishlist(): WishlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStoredEntry).slice(0, MAX_WISHLIST_ITEMS);
  } catch {
    return [];
  }
}

function saveStoredWishlist(entries: WishlistEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_WISHLIST_ITEMS))
    );
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function buildWishlistPayload(uid: string, product: CommerceItem) {
  const safeUid = sanitizeFirestoreId(uid);
  const safeProductId = sanitizeFirestoreId(product.id);
  const safeDocId = buildWishlistDocId(safeUid, safeProductId);
  const safeTitle = (product.title || 'Saved Product').trim().slice(0, 200) || 'Saved Product';
  const safePrice =
    typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0
      ? Math.min(100000000, product.price)
      : 0;
  const safeImageUrl = (product.imageUrl || '').slice(0, 512);
  const safeCategory = (product.category || 'Marketplace').trim().slice(0, 80);
  const safeStoreName = (product.storeName || 'PaikarMart Seller').trim().slice(0, 120);
  const safeTradeMode: 'retail' | 'wholesale' =
    product.tradeMode === 'wholesale' || product.type === 'wholesale' ? 'wholesale' : 'retail';

  return {
    docId: safeDocId,
    data: {
      id: safeDocId,
      userId: safeUid,
      productId: safeProductId,
      productTitle: safeTitle,
      productPrice: safePrice,
      ...(safeImageUrl ? { imageUrl: safeImageUrl } : {}),
      ...(safeCategory ? { category: safeCategory } : {}),
      ...(safeStoreName ? { storeName: safeStoreName } : {}),
      tradeMode: safeTradeMode,
      createdAt: serverTimestamp(),
    },
  };
}

interface WishlistProviderProps {
  catalogItems: CommerceItem[];
  children: React.ReactNode;
}

export const WishlistProvider: React.FC<WishlistProviderProps> = ({
  catalogItems,
  children,
}) => {
  const { firebaseUser } = useAuth();
  const [entries, setEntries] = useState<WishlistEntry[]>(() => loadStoredWishlist());
  const catalogByIdRef = useRef<Map<string, CommerceItem>>(new Map());
  const remoteDocIdsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    catalogByIdRef.current = new Map(catalogItems.map((item) => [item.id, item]));
  }, [catalogItems]);

  // Persist locally on changes
  useEffect(() => {
    saveStoredWishlist(entries);
  }, [entries]);

  // Cross-tab storage sync for guests & multi-tab tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WISHLIST_STORAGE_KEY) return;
      setEntries(loadStoredWishlist());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Firestore real-time sync when signed in
  useEffect(() => {
    if (!firebaseUser?.uid || !isFirebaseConfigured()) {
      remoteDocIdsRef.current.clear();
      return;
    }

    const uid = firebaseUser.uid;
    const wishlistQuery = query(
      collection(db, 'wishlists'),
      where('userId', '==', uid)
    );

    const unsubscribe = onSnapshot(
      wishlistQuery,
      (snapshot) => {
        const nextRemoteMap = new Map<string, string>();
        const remoteEntries: WishlistEntry[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const productId = typeof data.productId === 'string' ? data.productId : '';
          if (!productId) return;
          nextRemoteMap.set(productId, docSnap.id);

          const liveCatalogItem = catalogByIdRef.current.get(productId);
          const createdAtIso =
            data.createdAt && typeof data.createdAt.toDate === 'function'
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString();

          const fallbackItem: CommerceItem = liveCatalogItem || {
            id: productId,
            storeId: 'paikarmart_store',
            storeName: typeof data.storeName === 'string' ? data.storeName : 'PaikarMart Seller',
            type: data.tradeMode === 'wholesale' ? 'wholesale' : 'retail',
            tradeMode: data.tradeMode === 'wholesale' ? 'wholesale' : 'retail',
            title: typeof data.productTitle === 'string' ? data.productTitle : 'Saved Product',
            description: '',
            price: typeof data.productPrice === 'number' ? data.productPrice : 0,
            rating: 4.8,
            reviewsCount: 1,
            deliveryEta: 'Same Day',
            imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
            category: typeof data.category === 'string' ? data.category : 'Marketplace',
            inStock: true,
          };

          remoteEntries.push({
            product: fallbackItem,
            addedAt: createdAtIso,
          });
        });

        remoteDocIdsRef.current = nextRemoteMap;

        setEntries((prevLocal) => {
          const seen = new Set(remoteEntries.map((entry) => entry.product.id));
          const merged = [...remoteEntries];

          // Push any guest-saved items not yet present in Firestore
          for (const localEntry of prevLocal) {
            if (!seen.has(localEntry.product.id)) {
              seen.add(localEntry.product.id);
              merged.push(localEntry);

              const { docId, data } = buildWishlistPayload(uid, localEntry.product);
              void setDoc(doc(db, 'wishlists', docId), data).catch((err) => {
                try {
                  handleFirestoreError(err, OperationType.CREATE, `wishlists/${docId}`);
                } catch (wrappedErr) {
                  console.warn('Wishlist sync warning:', wrappedErr);
                }
              });
            }
          }

          return merged
            .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
            .slice(0, MAX_WISHLIST_ITEMS);
        });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'wishlists');
        } catch (wrappedErr) {
          console.warn('Wishlist listener warning:', wrappedErr);
        }
      }
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  // Hydrate saved snapshots with latest live catalog metadata
  const wishlistEntries = useMemo<WishlistEntry[]>(() => {
    if (catalogItems.length === 0) return entries;
    const byId = new Map(catalogItems.map((item) => [item.id, item]));
    return entries.map((entry) => ({
      ...entry,
      product: byId.get(entry.product.id) || entry.product,
    }));
  }, [catalogItems, entries]);

  const wishlistItems = useMemo(
    () => wishlistEntries.map((entry) => entry.product),
    [wishlistEntries]
  );

  const wishlistIds = useMemo(
    () => wishlistEntries.map((entry) => entry.product.id),
    [wishlistEntries]
  );

  const wishlistIdSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  const isWishlisted = useCallback(
    (productId: string) => wishlistIdSet.has(productId),
    [wishlistIdSet]
  );

  const addToWishlist = useCallback(
    (product: CommerceItem) => {
      if (!product?.id) return;
      setEntries((prev) => {
        if (prev.some((entry) => entry.product.id === product.id)) {
          return prev;
        }
        return [{ product, addedAt: new Date().toISOString() }, ...prev].slice(
          0,
          MAX_WISHLIST_ITEMS
        );
      });

      if (firebaseUser?.uid && isFirebaseConfigured()) {
        const { docId, data } = buildWishlistPayload(firebaseUser.uid, product);
        void setDoc(doc(db, 'wishlists', docId), data).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.CREATE, `wishlists/${docId}`);
          } catch (wrappedErr) {
            console.warn('Wishlist add warning:', wrappedErr);
          }
        });
      }
    },
    [firebaseUser?.uid]
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      if (!productId) return;
      setEntries((prev) => prev.filter((entry) => entry.product.id !== productId));

      if (firebaseUser?.uid && isFirebaseConfigured()) {
        const docId =
          remoteDocIdsRef.current.get(productId) ||
          buildWishlistDocId(firebaseUser.uid, productId);
        void deleteDoc(doc(db, 'wishlists', docId)).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.DELETE, `wishlists/${docId}`);
          } catch (wrappedErr) {
            console.warn('Wishlist remove warning:', wrappedErr);
          }
        });
      }
    },
    [firebaseUser?.uid]
  );

  const toggleWishlist = useCallback(
    (product: CommerceItem): boolean => {
      if (!product?.id) return false;
      const alreadySaved = wishlistIdSet.has(product.id);
      if (alreadySaved) {
        removeFromWishlist(product.id);
        return false;
      }
      addToWishlist(product);
      return true;
    },
    [addToWishlist, removeFromWishlist, wishlistIdSet]
  );

  const clearWishlist = useCallback(() => {
    const idsToDelete = [...wishlistIds];
    setEntries([]);

    if (firebaseUser?.uid && isFirebaseConfigured() && idsToDelete.length > 0) {
      const uid = firebaseUser.uid;
      const batch = writeBatch(db);
      for (const productId of idsToDelete) {
        const docId =
          remoteDocIdsRef.current.get(productId) || buildWishlistDocId(uid, productId);
        batch.delete(doc(db, 'wishlists', docId));
      }
      void batch.commit().catch((err) => {
        try {
          handleFirestoreError(err, OperationType.DELETE, 'wishlists');
        } catch (wrappedErr) {
          console.warn('Wishlist clear warning:', wrappedErr);
        }
      });
    }
  }, [firebaseUser?.uid, wishlistIds]);

  const getAddedAt = useCallback(
    (productId: string) =>
      wishlistEntries.find((entry) => entry.product.id === productId)?.addedAt,
    [wishlistEntries]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistItems,
      wishlistEntries,
      wishlistIds,
      wishlistCount: wishlistItems.length,
      isWishlisted,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      getAddedAt,
    }),
    [
      wishlistItems,
      wishlistEntries,
      wishlistIds,
      isWishlisted,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      getAddedAt,
    ]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export function useWishlist(): WishlistContextValue {
  return useContext(WishlistContext);
}
