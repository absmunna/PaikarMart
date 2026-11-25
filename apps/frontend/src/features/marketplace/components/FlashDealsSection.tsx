import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Flame, ShoppingBag, Check } from 'lucide-react';
import { CommerceItem } from '@/types';

export interface FlashDealEntry {
  id: string;
  productId: string;
  title: string;
  titleBn?: string;
  category: string;
  storeId: string;
  storeName: string;
  imageUrl: string;
  dealPrice: number;
  originalPrice: number;
  discountPercent: number;
  soldCount: number;
  totalStock: number;
  endsAt: string;
  isActive?: boolean;
}

export const SELLER_FLASH_DEALS_STORAGE_KEY = 'pm_seller_flash_deals_v1';

export function loadSellerFlashDeals(): FlashDealEntry[] {
  try {
    const raw = localStorage.getItem(SELLER_FLASH_DEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((d) => d && d.isActive !== false) : [];
  } catch {
    return [];
  }
}

interface FlashDealsSectionProps {
  items: CommerceItem[];
  isBn: boolean;
  onAddToCart: (item: CommerceItem, quantity: number, isWholesale: boolean) => void;
}

export const FlashDealsSection: React.FC<FlashDealsSectionProps> = ({
  items,
  isBn,
  onAddToCart,
}) => {
  const navigate = useNavigate();
  const [addedDealId, setAddedDealId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [sellerDeals, setSellerDeals] = useState<FlashDealEntry[]>(() => loadSellerFlashDeals());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    const onStorage = () => setSellerDeals(loadSellerFlashDeals());
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const flashDeals = useMemo<FlashDealEntry[]>(() => {
    if (sellerDeals.length > 0) {
      return sellerDeals.slice(0, 4);
    }

    const retailCandidates = items
      .filter((item) => item.tradeMode !== 'wholesale' && item.type !== 'service' && item.price > 0)
      .slice(0, 3);

    const endIso = new Date(Math.ceil(Date.now() / (3600 * 1000)) * 3600 * 1000 + 4 * 3600 * 1000).toISOString();

    return retailCandidates.map((item, idx) => {
      const original = item.originalPrice && item.originalPrice > item.price
        ? item.originalPrice
        : Math.round(item.price * (1.15 + idx * 0.05));
      const discountPercent = Math.max(8, Math.round(((original - item.price) / original) * 100));
      return {
        id: `flash_${item.id}`,
        productId: item.id,
        title: item.title,
        category: item.category || 'Retail',
        storeId: item.storeId,
        storeName: item.storeName,
        imageUrl: item.imageUrl,
        dealPrice: item.price,
        originalPrice: original,
        discountPercent,
        soldCount: 18 + idx * 9,
        totalStock: 40 + idx * 10,
        endsAt: endIso,
        isActive: true,
      };
    });
  }, [items, sellerDeals]);

  if (flashDeals.length === 0) return null;

  const remainingMs = Math.max(0, new Date(flashDeals[0].endsAt).getTime() - nowMs);
  const hours = String(Math.floor(remainingMs / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((remainingMs % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  const handleAddDeal = (deal: FlashDealEntry) => {
    const matched = items.find((item) => item.id === deal.productId);
    const cartProduct: CommerceItem = matched
      ? { ...matched, price: deal.dealPrice, originalPrice: deal.originalPrice }
      : {
          id: deal.productId,
          storeId: deal.storeId,
          storeName: deal.storeName,
          type: 'retail',
          tradeMode: 'retail',
          title: deal.title,
          description: `${deal.title} — Limited-time Flash Deal`,
          price: deal.dealPrice,
          originalPrice: deal.originalPrice,
          rating: 4.9,
          reviewsCount: 24,
          deliveryEta: 'Same Day',
          imageUrl: deal.imageUrl,
          category: deal.category,
          inStock: true,
        };

    onAddToCart(cartProduct, 1, false);
    setAddedDealId(deal.id);
    window.setTimeout(() => setAddedDealId((prev) => (prev === deal.id ? null : prev)), 1800);
  };

  return (
    <section className="rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[var(--pm-text)]">
              {isBn ? 'ফ্ল্যাশ ডিলস · সীমিত সময়ের অফার' : 'Flash Deals · Limited-Time Drops'}
            </h3>
            <p className="text-[11px] text-[var(--pm-muted)]">
              {isBn ? 'ভেরিফাইড মার্চেন্টদের তাৎক্ষণিক ডিসকাউন্ট অফার' : 'Verified merchant markdowns before stock runs out'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tabular-nums font-bold text-[var(--pm-text)] bg-[var(--pm-surface)] border border-[var(--pm-border)] px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{isBn ? 'বাকি:' : 'Ends in'}</span>
          <span className="text-amber-500">{hours}:{minutes}:{seconds}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {flashDeals.slice(0, 3).map((deal) => {
          const soldPct = Math.min(96, Math.max(12, Math.round((deal.soldCount / Math.max(1, deal.totalStock)) * 100)));
          const isAdded = addedDealId === deal.id;

          return (
            <div
              key={deal.id}
              onClick={() => navigate(`/hub/marketplace/product/${deal.productId}`)}
              className="p-3 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] transition-all flex gap-3 cursor-pointer group"
            >
              <img
                src={deal.imageUrl || '/src/assets/images/paikarmart_fresh_grocery_1794489814176.jpg'}
                alt={deal.title}
                loading="lazy"
                className="w-20 h-20 rounded-xl object-cover shrink-0 bg-[var(--pm-card)] border border-[var(--pm-border)]"
              />
              <div className="min-w-0 flex-1 flex flex-col justify-between gap-1.5">
                <div>
                  <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold">
                    <span className="text-[var(--pm-muted)] truncate">{deal.storeName}</span>
                    <span className="text-amber-500 font-mono shrink-0">-{deal.discountPercent}%</span>
                  </div>
                  <h4 className="text-xs font-bold text-[var(--pm-text)] line-clamp-1 group-hover:text-[var(--pm-accent)] transition-colors">
                    {isBn && deal.titleBn ? deal.titleBn : deal.title}
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-mono tabular-nums font-black text-[var(--pm-text)]">
                      ৳{deal.dealPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums line-through text-[var(--pm-muted)]">
                      ৳{deal.originalPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--pm-border)] overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${soldPct}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddDeal(deal);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                        isAdded
                          ? 'bg-[var(--pm-success)] text-white'
                          : 'bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)]'
                      }`}
                    >
                      {isAdded ? <Check className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                      <span>{isAdded ? (isBn ? 'যুক্ত হয়েছে' : 'Added') : (isBn ? 'কার্টে নিন' : 'Claim')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
