import { useCallback, useEffect, useState } from 'react';
import type { CartItem, CommerceItem } from '@/types';
import {
  loadPersistedCart,
  savePersistedCart,
  useGuestCartTabSync,
} from '@/shared/hooks/useGuestSessionPersistence';

export interface UseCartStoreOptions {
  initialPromoCode?: string;
  onTrackCartAdd?: (product: CommerceItem, quantity: number, isWholesale: boolean) => void;
  onTrackBuyNow?: (product: CommerceItem, quantity: number, isWholesale: boolean) => void;
  onOpenCart?: () => void;
}

export function useCartStore({
  initialPromoCode = '',
  onTrackCartAdd,
  onTrackBuyNow,
  onOpenCart,
}: UseCartStoreOptions = {}) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadPersistedCart());
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>(initialPromoCode);

  useEffect(() => {
    savePersistedCart(cartItems);
  }, [cartItems]);

  useGuestCartTabSync(setCartItems);

  const handleAddToCart = useCallback(
    (
      product: CommerceItem,
      quantity = 1,
      isWholesale = false,
      specialInstructions?: string
    ) => {
      onTrackCartAdd?.(product, quantity, isWholesale);
      setCartItems((prev) => {
        const existing = prev.find(
          (i) => i.product.id === product.id && i.isWholesale === isWholesale
        );
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id && i.isWholesale === isWholesale
              ? {
                  ...i,
                  quantity: i.quantity + quantity,
                  specialInstructions: specialInstructions || i.specialInstructions,
                }
              : i
          );
        }
        return [...prev, { product, quantity, isWholesale, specialInstructions }];
      });
    },
    [onTrackCartAdd]
  );

  const handleBuyNow = useCallback(
    (
      product: CommerceItem,
      quantity = 1,
      isWholesale = false,
      specialInstructions?: string
    ) => {
      onTrackBuyNow?.(product, quantity, isWholesale);
      handleAddToCart(product, quantity, isWholesale, specialInstructions);
      onOpenCart?.();
    },
    [onTrackBuyNow, handleAddToCart, onOpenCart]
  );

  const handleUpdateCartQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (!item) return prev;

      if (quantity <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }

      let nextQty = quantity;
      if (item.isWholesale) {
        const moq = item.product.minWholesaleQty || 20;
        if (nextQty < moq) {
          nextQty = moq;
        }
      }

      return prev.map((i) => (i.product.id === productId ? { ...i, quantity: nextQty } : i));
    });
  }, []);

  const handleRemoveCartItem = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setAppliedPromoCode('');
  }, []);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return {
    cartItems,
    cartCount,
    appliedPromoCode,
    setAppliedPromoCode,
    handleAddToCart,
    handleBuyNow,
    handleUpdateCartQuantity,
    handleRemoveCartItem,
    handleClearCart,
  };
}
