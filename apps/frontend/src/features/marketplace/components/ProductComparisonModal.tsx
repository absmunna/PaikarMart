import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  PackageCheck,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import type { CommerceItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProductComparison } from '@/features/marketplace/hooks/useProductComparison';

interface CompareTrayBarProps {
  className?: string;
}

export const CompareTrayBar: React.FC<CompareTrayBarProps> = ({ className = '' }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const {
    compareItems,
    maxItems,
    limitNotice,
    removeFromCompare,
    clearCompare,
    openCompareModal,
    dismissLimitNotice,
  } = useProductComparison();

  if (compareItems.length === 0 && !limitNotice) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-3xl pointer-events-none ${className}`}
    >
      <div className="pointer-events-auto bg-[var(--pm-card)]/95 backdrop-blur-xl text-[var(--pm-text)] border border-[var(--pm-border-strong)] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-2xl space-y-2.5 animate-slide-up">
        {limitNotice && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[var(--pm-warning-soft)] border border-[var(--pm-warning)]/30 text-[11px] font-semibold text-[var(--pm-warning)]">
            <span>{limitNotice}</span>
            <button
              type="button"
              onClick={dismissLimitNotice}
              aria-label="Dismiss limit notice"
              className="p-0.5 hover:opacity-80 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {compareItems.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] text-xs font-black shrink-0">
                <Scale className="w-3.5 h-3.5" />
                <span>
                  {compareItems.length}/{maxItems}
                </span>
              </div>

              {compareItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] shrink-0 max-w-[170px]"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-7 h-7 rounded-lg object-cover shrink-0 bg-[var(--pm-card)]"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[var(--pm-text)] truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-[var(--pm-accent)] leading-none">
                      ৳{item.price.toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCompare(item.id)}
                    aria-label={`Remove ${item.title} from comparison`}
                    className="p-1 rounded-lg text-[var(--pm-muted)] hover:text-[var(--pm-danger)] hover:bg-[var(--pm-card)] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={clearCompare}
                className="px-3 py-2 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface)] hover:bg-[var(--pm-card-hover)] text-[var(--pm-muted)] hover:text-[var(--pm-text)] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'মুছুন' : 'Clear'}</span>
              </button>

              <button
                type="button"
                disabled={compareItems.length < 2}
                onClick={openCompareModal}
                className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--pm-accent-fg)] text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>
                  {compareItems.length < 2
                    ? isBn
                      ? 'আরও ১টি পণ্য বাছুন'
                      : 'Pick 1 More'
                    : isBn
                    ? `তুলনা করুন (${compareItems.length})`
                    : `Compare (${compareItems.length})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ProductComparisonModalProps {
  onAddToCart: (product: CommerceItem, quantity?: number, isWholesale?: boolean) => void;
}

interface ComparisonRow {
  key: string;
  label: string;
  values: Array<{
    display: React.ReactNode;
    rawCompareValue: string;
    isHighlight?: boolean;
  }>;
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  onAddToCart,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const navigate = useNavigate();
  const {
    compareItems,
    isCompareModalOpen,
    removeFromCompare,
    clearCompare,
    closeCompareModal,
  } = useProductComparison();

  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isCompareModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCompareModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCompareModalOpen, closeCompareModal]);

  const lowestPrice = useMemo(
    () =>
      compareItems.length > 0
        ? Math.min(...compareItems.map((item) => item.price))
        : 0,
    [compareItems]
  );

  const highestRating = useMemo(
    () =>
      compareItems.length > 0
        ? Math.max(...compareItems.map((item) => item.rating || 0))
        : 0,
    [compareItems]
  );

  const allSpecKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of compareItems) {
      if (item.specifications && typeof item.specifications === 'object') {
        for (const k of Object.keys(item.specifications)) {
          const val = item.specifications[k];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            keys.add(k);
          }
        }
      }
    }
    return Array.from(keys);
  }, [compareItems]);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    const rows: ComparisonRow[] = [
      {
        key: 'price',
        label: isBn ? 'মূল্য' : 'Price',
        values: compareItems.map((item) => {
          const isBestPrice = item.price === lowestPrice && compareItems.length > 1;
          const discountPct =
            item.originalPrice && item.originalPrice > item.price
              ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
              : 0;
          return {
            rawCompareValue: String(item.price),
            isHighlight: isBestPrice,
            display: (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-sm font-mono font-black ${
                      isBestPrice ? 'text-[var(--pm-success)]' : 'text-[var(--pm-text)]'
                    }`}
                  >
                    ৳{item.price.toLocaleString()}
                  </span>
                  {isBestPrice && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--pm-success-soft)] text-[var(--pm-success)] text-[10px] font-bold">
                      {isBn ? 'সেরা দাম' : 'Lowest'}
                    </span>
                  )}
                </div>
                {discountPct > 0 && item.originalPrice && (
                  <p className="text-[11px] text-[var(--pm-muted)]">
                    <span className="line-through">৳{item.originalPrice.toLocaleString()}</span>{' '}
                    <span className="text-[var(--pm-success)] font-semibold">-{discountPct}%</span>
                  </p>
                )}
              </div>
            ),
          };
        }),
      },
      {
        key: 'rating',
        label: isBn ? 'ক্রেতা রেটিং' : 'Rating & Reviews',
        values: compareItems.map((item) => {
          const rating = item.rating || 0;
          const isTopRated = rating === highestRating && rating > 0 && compareItems.length > 1;
          return {
            rawCompareValue: `${rating.toFixed(1)}_${item.reviewsCount || 0}`,
            isHighlight: isTopRated,
            display: (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  {rating > 0 ? rating.toFixed(1) : 'New'}
                </span>
                <span className="text-[11px] text-[var(--pm-muted)]">
                  ({item.reviewsCount || 0})
                </span>
                {isTopRated && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-[10px] font-bold">
                    {isBn ? 'সেরা রেটিং' : 'Top Rated'}
                  </span>
                )}
              </div>
            ),
          };
        }),
      },
      {
        key: 'tradeMode',
        label: isBn ? 'ট্রেড মোড ও MOQ' : 'Trade Mode & MOQ',
        values: compareItems.map((item) => {
          const isWholesale = item.tradeMode === 'wholesale' || item.type === 'wholesale';
          const moq = isWholesale ? item.minWholesaleQty || 20 : 1;
          return {
            rawCompareValue: `${isWholesale ? 'wholesale' : 'retail'}_${moq}`,
            display: (
              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--pm-text)] block">
                  {isWholesale ? (isBn ? 'পাইকারি (B2B)' : 'Wholesale (B2B)') : isBn ? 'রিটেইল (B2C)' : 'Retail (B2C)'}
                </span>
                <span className="text-[11px] font-mono text-[var(--pm-muted)] block">
                  MOQ: {moq} {moq > 1 ? 'pcs' : 'unit'}
                </span>
                {isWholesale && item.wholesaleTiers && item.wholesaleTiers.length > 0 && (
                  <p className="text-[10px] text-[var(--pm-accent)] font-semibold">
                    {item.wholesaleTiers
                      .slice(0, 2)
                      .map((t) => `${t.minQty}+ @ ৳${t.pricePerUnit}`)
                      .join(' · ')}
                  </p>
                )}
              </div>
            ),
          };
        }),
      },
      {
        key: 'brand',
        label: isBn ? 'ব্র্যান্ড' : 'Brand',
        values: compareItems.map((item) => {
          const brand = item.brand || 'Generic';
          return {
            rawCompareValue: brand,
            display: <span className="text-xs font-semibold text-[var(--pm-text)]">{brand}</span>,
          };
        }),
      },
      {
        key: 'category',
        label: isBn ? 'ক্যাটাগরি' : 'Category',
        values: compareItems.map((item) => ({
          rawCompareValue: item.category || 'General',
          display: <span className="text-xs text-[var(--pm-text)]">{item.category || 'General'}</span>,
        })),
      },
      {
        key: 'store',
        label: isBn ? 'বিক্রেতা / স্টোর' : 'Seller / Store',
        values: compareItems.map((item) => ({
          rawCompareValue: item.storeName,
          display: (
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--pm-text)]">
              <span className="truncate">{item.storeName}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--pm-accent)] shrink-0" />
            </div>
          ),
        })),
      },
      {
        key: 'stock',
        label: isBn ? 'স্টক অবস্থা' : 'Availability',
        values: compareItems.map((item) => ({
          rawCompareValue: item.inStock ? 'in_stock' : 'out_of_stock',
          display: (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold ${
                item.inStock ? 'text-[var(--pm-success)]' : 'text-[var(--pm-danger)]'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              {item.inStock ? (isBn ? 'স্টকে আছে' : 'In Stock') : isBn ? 'স্টক শেষ' : 'Out of Stock'}
            </span>
          ),
        })),
      },
      {
        key: 'delivery',
        label: isBn ? 'ডেলিভারি সময়' : 'Delivery ETA',
        values: compareItems.map((item) => {
          const text = item.proximityDistance
            ? `${item.deliveryEta} · ${item.proximityDistance}`
            : item.deliveryEta || '1-2 Days';
          return {
            rawCompareValue: text,
            display: (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--pm-text)]">
                <Truck className="w-3.5 h-3.5 text-[var(--pm-muted)] shrink-0" />
                {text}
              </span>
            ),
          };
        }),
      },
    ];

    if (compareItems.some((item) => item.warrantyLabel || (item.highlights && item.highlights.length > 0))) {
      rows.push({
        key: 'highlights',
        label: isBn ? 'ওয়ারেন্টি ও হাইলাইটস' : 'Warranty & Highlights',
        values: compareItems.map((item) => {
          const text =
            item.warrantyLabel ||
            (item.highlights && item.highlights.length > 0 ? item.highlights.slice(0, 2).join(' · ') : '—');
          return {
            rawCompareValue: text,
            display: <span className="text-xs text-[var(--pm-muted)]">{text}</span>,
          };
        }),
      });
    }

    for (const specKey of allSpecKeys) {
      rows.push({
        key: `spec_${specKey}`,
        label: specKey,
        values: compareItems.map((item) => {
          const val = item.specifications?.[specKey];
          const text = val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—';
          return {
            rawCompareValue: text,
            display: (
              <span className={`text-xs ${text === '—' ? 'text-[var(--pm-muted)]' : 'text-[var(--pm-text)] font-medium'}`}>
                {text}
              </span>
            ),
          };
        }),
      });
    }

    if (!onlyDifferences) return rows;

    return rows.filter((row) => {
      const normalized = new Set(row.values.map((v) => v.rawCompareValue.toLowerCase()));
      return normalized.size > 1;
    });
  }, [allSpecKeys, compareItems, highestRating, isBn, lowestPrice, onlyDifferences]);

  if (!isCompareModalOpen || compareItems.length < 2) {
    return null;
  }

  const handleQuickAdd = (item: CommerceItem) => {
    const isWholesale = item.tradeMode === 'wholesale' || item.type === 'wholesale';
    const qty = isWholesale ? item.minWholesaleQty || 20 : 1;
    onAddToCart(item, qty, isWholesale);
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    window.setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={isBn ? 'পণ্যের তুলনা টেবিল' : 'Product comparison table'}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCompareModal();
      }}
    >
      <div className="w-full max-w-6xl max-h-[92vh] bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--pm-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--pm-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--pm-text)]">
                {isBn ? 'পাশাপাশি পণ্যের তুলনা' : 'Side-by-Side Product Comparison'}
              </h2>
              <p className="text-xs text-[var(--pm-muted)]">
                {isBn
                  ? `${compareItems.length}টি পণ্যের স্পেসিফিকেশন, মূল্য ও রেটিং তুলনা`
                  : `Comparing specs, pricing, and ratings across ${compareItems.length} selected items`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyDifferences}
                onChange={(e) => setOnlyDifferences(e.target.checked)}
                className="accent-[var(--pm-accent)] rounded cursor-pointer"
              />
              <span>{isBn ? 'শুধু পার্থক্য দেখুন' : 'Differences Only'}</span>
            </label>

            <button
              type="button"
              onClick={clearCompare}
              className="px-3 py-1.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] hover:border-[var(--pm-danger)] text-xs font-bold text-[var(--pm-muted)] hover:text-[var(--pm-danger)] transition-colors cursor-pointer"
            >
              {isBn ? 'সব মুছুন' : 'Clear All'}
            </button>

            <button
              type="button"
              onClick={closeCompareModal}
              aria-label="Close product comparison"
              className="p-2 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] hover:bg-[var(--pm-card-hover)] text-[var(--pm-text)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--pm-border)] bg-[var(--pm-card)]">
                <th className="w-40 sm:w-48 p-4 align-bottom sticky left-0 z-20 bg-[var(--pm-surface)] border-r border-[var(--pm-border)]">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--pm-muted)] block">
                    {isBn ? 'তুলনার বিষয়' : 'Specification'}
                  </span>
                </th>

                {compareItems.map((item) => (
                  <th
                    key={item.id}
                    className="p-4 align-top min-w-[190px] border-r last:border-r-0 border-[var(--pm-border)]"
                  >
                    <div className="space-y-2.5">
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--pm-surface)] border border-[var(--pm-border)]">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                          onClick={() => {
                            closeCompareModal();
                            navigate(`/hub/marketplace/product/${item.id}`);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeFromCompare(item.id)}
                          aria-label={`Remove ${item.title}`}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            closeCompareModal();
                            navigate(`/hub/marketplace/product/${item.id}`);
                          }}
                          className="text-xs sm:text-sm font-black text-[var(--pm-text)] hover:text-[var(--pm-accent)] text-left line-clamp-2 cursor-pointer"
                        >
                          {item.title}
                        </button>
                        <p className="text-[11px] font-medium text-[var(--pm-muted)] truncate">
                          {item.storeName}
                        </p>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {comparisonRows.length > 0 ? (
                comparisonRows.map((row, rowIndex) => (
                  <tr
                    key={row.key}
                    className={`border-b border-[var(--pm-border)] ${
                      rowIndex % 2 === 0 ? 'bg-[var(--pm-card)]' : 'bg-[var(--pm-surface)]/45'
                    }`}
                  >
                    <th className="p-3.5 sm:p-4 text-xs font-bold text-[var(--pm-muted)] align-top sticky left-0 z-10 bg-[var(--pm-surface)] border-r border-[var(--pm-border)]">
                      {row.label}
                    </th>
                    {row.values.map((cell, idx) => (
                      <td
                        key={`${row.key}_${compareItems[idx].id}`}
                        className={`p-3.5 sm:p-4 align-top border-r last:border-r-0 border-[var(--pm-border)] ${
                          cell.isHighlight ? 'bg-[var(--pm-success-soft)]/35' : ''
                        }`}
                      >
                        {cell.display}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={compareItems.length + 1}
                    className="p-10 text-center text-xs font-semibold text-[var(--pm-muted)]"
                  >
                    {isBn
                      ? 'নির্বাচিত পণ্যগুলোর মধ্যে কোনো পার্থক্য পাওয়া যায়নি।'
                      : 'All compared attributes match across the selected items.'}
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="bg-[var(--pm-surface)]">
                <th className="p-4 text-xs font-bold text-[var(--pm-muted)] sticky left-0 z-10 bg-[var(--pm-surface)] border-r border-[var(--pm-border)]">
                  {isBn ? 'অ্যাকশন' : 'Actions'}
                </th>
                {compareItems.map((item) => {
                  const isAdded = addedIds[item.id];
                  return (
                    <td
                      key={`action_${item.id}`}
                      className="p-4 border-r last:border-r-0 border-[var(--pm-border)]"
                    >
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(item)}
                          disabled={!item.inStock}
                          className="w-full py-2 px-3 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] disabled:opacity-50 text-[var(--pm-accent-fg)] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{isBn ? 'কার্টে যোগ হয়েছে' : 'Added'}</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{isBn ? 'কার্টে নিন' : 'Add to Cart'}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closeCompareModal();
                            navigate(`/hub/marketplace/product/${item.id}`);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-card)] hover:border-[var(--pm-accent)] text-[var(--pm-text)] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{isBn ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
