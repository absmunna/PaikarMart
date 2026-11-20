import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Heart,
  Package,
  Scale,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import type { CommerceItem, PortalTab } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProductComparison, useWishlist } from '@/features/marketplace';

interface WishlistPortalProps {
  onAddToCart: (product: CommerceItem, quantity?: number, isWholesale?: boolean) => void;
  onBuyNow: (product: CommerceItem, quantity?: number, isWholesale?: boolean) => void;
  onSelectTab: (tab: PortalTab) => void;
}

type WishlistFilter = 'all' | 'retail' | 'wholesale' | 'in_stock';
type WishlistSort = 'recent' | 'price_low' | 'price_high' | 'rating';

export const WishlistPortal: React.FC<WishlistPortalProps> = ({
  onAddToCart,
  onBuyNow,
  onSelectTab,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const navigate = useNavigate();

  const {
    wishlistEntries,
    wishlistCount,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist();
  const { isCompared, toggleCompare } = useProductComparison();

  const [filterMode, setFilterMode] = useState<WishlistFilter>('all');
  const [sortBy, setSortBy] = useState<WishlistSort>('recent');
  const [confirmClear, setConfirmClear] = useState(false);
  const [addedFeedbackMap, setAddedFeedbackMap] = useState<Record<string, boolean>>({});
  const [bulkMovedBanner, setBulkMovedBanner] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const filtered = wishlistEntries.filter(({ product }) => {
      const isWholesale = product.tradeMode === 'wholesale' || product.type === 'wholesale';
      if (filterMode === 'retail' && isWholesale) return false;
      if (filterMode === 'wholesale' && !isWholesale) return false;
      if (filterMode === 'in_stock' && !product.inStock) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price_low') return a.product.price - b.product.price;
      if (sortBy === 'price_high') return b.product.price - a.product.price;
      if (sortBy === 'rating') return (b.product.rating || 0) - (a.product.rating || 0);
      return b.addedAt.localeCompare(a.addedAt);
    });
  }, [wishlistEntries, filterMode, sortBy]);

  const totalEstimatedValue = useMemo(
    () =>
      wishlistEntries.reduce((sum, { product }) => {
        const qty =
          product.tradeMode === 'wholesale' || product.type === 'wholesale'
            ? product.minWholesaleQty || 20
            : 1;
        return sum + product.price * qty;
      }, 0),
    [wishlistEntries]
  );

  const handleAddSingleToCart = (item: CommerceItem) => {
    const isWholesale = item.tradeMode === 'wholesale' || item.type === 'wholesale';
    const qty = isWholesale ? item.minWholesaleQty || 20 : 1;
    onAddToCart(item, qty, isWholesale);
    setAddedFeedbackMap((prev) => ({ ...prev, [item.id]: true }));
    window.setTimeout(() => {
      setAddedFeedbackMap((prev) => ({ ...prev, [item.id]: false }));
    }, 1800);
  };

  const handleMoveAllToBag = () => {
    const eligible = filteredEntries.filter(({ product }) => product.inStock !== false);
    if (eligible.length === 0) return;
    eligible.forEach(({ product }) => {
      const isWholesale = product.tradeMode === 'wholesale' || product.type === 'wholesale';
      const qty = isWholesale ? product.minWholesaleQty || 20 : 1;
      onAddToCart(product, qty, isWholesale);
    });
    setBulkMovedBanner(
      isBn
        ? `${eligible.length}টি পণ্য আপনার শপিং ব্যাগে যুক্ত করা হয়েছে।`
        : `Added ${eligible.length} saved item${eligible.length > 1 ? 's' : ''} to your shopping bag.`
    );
    window.setTimeout(() => setBulkMovedBanner(null), 3500);
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Header Summary Card */}
      <section className="rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--pm-muted)]">
              <span className="font-semibold text-rose-500 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                {isBn ? 'সংরক্ষিত পণ্য' : 'Saved for Later'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {wishlistCount} {isBn ? 'টি আইটেম' : wishlistCount === 1 ? 'item' : 'items'}
              </span>
              {wishlistCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums font-semibold text-[var(--pm-text)]">
                    {isBn ? 'মোট মূল্য' : 'Est. value'} ৳{totalEstimatedValue.toLocaleString()}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--pm-text)]">
              {isBn ? 'আমার উইশলিস্ট' : 'My Wishlist'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pm-muted)]">
              {isBn
                ? 'আপনার পছন্দের রিটেইল ও পাইকারি পণ্যগুলো সংরক্ষণ করুন এবং সুবিধামতো কার্টে যুক্ত করুন।'
                : 'Keep track of retail and wholesale products you want to compare or buy later.'}
            </p>
          </div>

          {wishlistCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleMoveAllToBag}
                className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{isBn ? 'সবগুলো ব্যাগে নিন' : 'Add All to Bag'}</span>
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-3.5 py-2 rounded-xl bg-[var(--pm-surface)] hover:bg-rose-500/10 border border-[var(--pm-border)] hover:border-rose-500/40 text-xs font-bold text-[var(--pm-muted)] hover:text-rose-500 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isBn ? 'সব মুছুন' : 'Clear All'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <span className="text-[11px] font-bold text-rose-500">
                    {isBn ? 'নিশ্চিত?' : 'Clear all?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearWishlist();
                      setConfirmClear(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {isBn ? 'হ্যাঁ' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded-lg bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] text-[11px] font-bold cursor-pointer"
                  >
                    {isBn ? 'না' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {bulkMovedBanner && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[var(--pm-success-soft)] border border-[var(--pm-success)]/30 text-xs font-semibold text-[var(--pm-success)] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{bulkMovedBanner}</span>
          </div>
        )}
      </section>

      {/* Filter & Sort Bar */}
      {wishlistCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] w-fit">
            {(
              [
                { id: 'all', labelEn: 'All Saved', labelBn: 'সবগুলো' },
                { id: 'retail', labelEn: 'Retail (B2C)', labelBn: 'খুচরা' },
                { id: 'wholesale', labelEn: 'Wholesale (B2B)', labelBn: 'পাইকারি' },
                { id: 'in_stock', labelEn: 'In Stock', labelBn: 'স্টকে আছে' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-[var(--pm-card)] text-[var(--pm-text)] shadow-xs border border-[var(--pm-border)]'
                    : 'text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
                }`}
              >
                {isBn ? tab.labelBn : tab.labelEn}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] w-fit">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--pm-muted)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as WishlistSort)}
              aria-label={isBn ? 'উইশলিস্ট সাজান' : 'Sort wishlist'}
              className="bg-transparent focus:outline-none text-xs font-bold cursor-pointer"
            >
              <option value="recent">{isBn ? 'সম্প্রতি সংরক্ষিত' : 'Recently Saved'}</option>
              <option value="price_low">{isBn ? 'কম দাম আগে' : 'Price: Low to High'}</option>
              <option value="price_high">{isBn ? 'বেশি দাম আগে' : 'Price: High to Low'}</option>
              <option value="rating">{isBn ? 'সেরা রেটিং' : 'Top Rated'}</option>
            </select>
          </div>
        </div>
      )}

      {/* Wishlist Grid or Empty States */}
      {wishlistCount === 0 ? (
        <div className="rounded-3xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-[var(--pm-text)]">
              {isBn ? 'আপনার উইশলিস্ট এখন খালি' : 'Your wishlist is empty'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--pm-muted)]">
              {isBn
                ? 'যেকোনো মার্কেটপ্লেস বা পাইকারি পণ্যের কার্ডে হার্ট আইকনে ট্যাপ করে পছন্দের পণ্য সংরক্ষণ করুন।'
                : 'Tap the heart icon on any marketplace or wholesale product card to save items here for later.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onSelectTab('commerce')}
              className="px-4 py-2.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isBn ? 'মার্কেটপ্লেস দেখুন' : 'Browse Marketplace'}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('wholesale')}
              className="px-4 py-2.5 rounded-xl bg-[var(--pm-surface)] hover:bg-[var(--pm-card-hover)] border border-[var(--pm-border)] text-[var(--pm-text)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-4 h-4 text-[var(--pm-accent)]" />
              <span>{isBn ? 'পাইকারি বাজার দেখুন' : 'Explore Wholesale'}</span>
            </button>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[var(--pm-text)]">
            {isBn ? 'এই ফিল্টারে কোনো সংরক্ষিত পণ্য নেই' : 'No saved items match this filter'}
          </p>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-xs font-bold cursor-pointer"
          >
            {isBn ? 'সব সংরক্ষিত পণ্য দেখুন' : 'Show All Saved Items'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredEntries.map(({ product, addedAt }) => {
            const isWholesale = product.tradeMode === 'wholesale' || product.type === 'wholesale';
            const compared = isCompared(product.id);
            const isAdded = Boolean(addedFeedbackMap[product.id]);

            return (
              <article
                key={product.id}
                onClick={() => navigate(`/hub/marketplace/product/${product.id}`)}
                className="rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md cursor-pointer group"
              >
                <div>
                  {/* Uniform 4:3 Media */}
                  <div className="relative aspect-[4/3] bg-[var(--pm-surface)] overflow-hidden">
                    <img
                      src={
                        product.imageUrl ||
                        '/src/assets/images/paikarmart_fresh_grocery_1794489814176.jpg'
                      }
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src =
                          '/src/assets/images/paikarmart_fresh_grocery_1794489814176.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Heart Remove Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(product.id);
                      }}
                      aria-pressed={true}
                      aria-label={isBn ? 'উইশলিস্ট থেকে সরান' : 'Remove from wishlist'}
                      title={isBn ? 'উইশলিস্ট থেকে সরান' : 'Remove from wishlist'}
                      className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 dark:bg-zinc-900/90 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>

                    {/* Compare Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompare(product);
                      }}
                      aria-pressed={compared}
                      className={`absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        compared
                          ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-transparent'
                          : 'pm-glass border-[var(--pm-border)] text-[var(--pm-text)] hover:border-[var(--pm-accent)]'
                      }`}
                    >
                      {compared ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Scale className="w-3 h-3 text-[var(--pm-accent)]" />
                      )}
                      <span>{compared ? (isBn ? 'তুলনায়' : 'Compared') : isBn ? 'তুলনা' : 'Compare'}</span>
                    </button>

                    {typeof product.rating === 'number' && (
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg pm-glass border border-[var(--pm-border)] text-amber-500 text-[11px] font-mono font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Clean Metadata & Product Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--pm-muted)] truncate">
                      <span className="font-semibold uppercase tracking-wide text-[var(--pm-text)]">
                        {isWholesale ? 'Wholesale' : product.category || 'Retail'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate flex items-center gap-1">
                        <Store className="w-3 h-3 shrink-0" />
                        {product.storeName}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--pm-text)] line-clamp-2 group-hover:text-[var(--pm-accent)] transition-colors">
                      {product.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-mono tabular-nums text-base font-black text-[var(--pm-text)]">
                        ৳{product.price.toLocaleString()}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          product.inStock !== false
                            ? 'text-[var(--pm-success)]'
                            : 'text-rose-500'
                        }`}
                      >
                        {product.inStock !== false
                          ? isBn
                            ? 'স্টকে আছে'
                            : 'In Stock'
                          : isBn
                          ? 'স্টক শেষ'
                          : 'Out of Stock'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--pm-muted)]">
                      {isBn ? 'সংরক্ষিত:' : 'Saved'}{' '}
                      {new Date(addedAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 pt-2 border-t border-[var(--pm-border)] grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddSingleToCart(product);
                    }}
                    disabled={product.inStock === false}
                    className="py-2 px-3 rounded-xl border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] hover:border-[var(--pm-accent)] text-[var(--pm-text)] hover:text-[var(--pm-accent)] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-45 cursor-pointer"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--pm-success)]" />
                        <span>{isBn ? 'যুক্ত হয়েছে' : 'Added'}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ব্যাগে নিন' : 'Add to Bag'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const qty = isWholesale ? product.minWholesaleQty || 20 : 1;
                      onBuyNow(product, qty, isWholesale);
                    }}
                    disabled={product.inStock === false}
                    className="py-2 px-3 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-45 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{isBn ? 'এখনই কিনুন' : 'Buy Now'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
