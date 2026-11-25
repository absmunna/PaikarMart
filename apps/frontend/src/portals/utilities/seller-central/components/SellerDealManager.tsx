import React, { useEffect, useState } from 'react';
import { Flame, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { CommerceItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  FlashDealEntry,
  loadSellerFlashDeals,
  SELLER_FLASH_DEALS_STORAGE_KEY,
} from '@/features/marketplace/components/FlashDealsSection';

interface SellerDealManagerProps {
  products: CommerceItem[];
  storeId?: string;
  storeName?: string;
}

export const SellerDealManager: React.FC<SellerDealManagerProps> = ({
  products,
  storeId = 'seller_store',
  storeName = 'Verified Store',
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [deals, setDeals] = useState<FlashDealEntry[]>(() => {
    try {
      const raw = localStorage.getItem(SELLER_FLASH_DEALS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [durationHours, setDurationHours] = useState<number>(6);
  const [totalStock, setTotalStock] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProductId && products[0]?.id) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const persistDeals = (nextDeals: FlashDealEntry[]) => {
    setDeals(nextDeals);
    try {
      localStorage.setItem(SELLER_FLASH_DEALS_STORAGE_KEY, JSON.stringify(nextDeals));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Ignore storage quota warnings in private browsing
    }
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const product = products.find((p) => p.id === selectedProductId) || products[0];
    if (!product) {
      setErrorMsg(isBn ? 'ডিল তৈরি করতে প্রথমে অন্তত একটি প্রোডাক্ট যোগ করুন।' : 'Add a product to your catalog first before creating a Flash Deal.');
      return;
    }

    const clampedDiscount = Math.min(75, Math.max(5, Number(discountPercent) || 15));
    const clampedHours = Math.min(72, Math.max(1, Number(durationHours) || 6));
    const originalPrice = product.originalPrice && product.originalPrice > product.price ? product.originalPrice : product.price;
    const dealPrice = Math.max(1, Math.round(originalPrice * (1 - clampedDiscount / 100)));

    const entry: FlashDealEntry = {
      id: `deal_${Date.now()}`,
      productId: product.id,
      title: product.title,
      category: product.category || 'Retail',
      storeId: product.storeId || storeId,
      storeName: product.storeName || storeName,
      imageUrl: product.imageUrl,
      dealPrice,
      originalPrice,
      discountPercent: clampedDiscount,
      soldCount: 0,
      totalStock: Math.max(1, Number(totalStock) || 25),
      endsAt: new Date(Date.now() + clampedHours * 3600 * 1000).toISOString(),
      isActive: true,
    };

    persistDeals([entry, ...deals]);
    setIsCreating(false);
  };

  const handleToggleActive = (id: string) => {
    persistDeals(
      deals.map((d) => (d.id === id ? { ...d, isActive: d.isActive === false } : d))
    );
  };

  const handleDeleteDeal = (id: string) => {
    persistDeals(deals.filter((d) => d.id !== id));
  };

  const activeCount = loadSellerFlashDeals().length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--pm-card)] p-4 sm:p-5 rounded-2xl border border-[var(--pm-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--pm-text)]">
              {isBn ? 'ফ্ল্যাশ ডিল ও প্রোমোশন ম্যানেজার' : 'Seller Flash Deal Manager'}
            </h4>
            <p className="text-xs text-[var(--pm-muted)]">
              {isBn
                ? `সক্রিয় ডিল: ${activeCount}টি — প্রকাশিত ডিল সাথে সাথে মার্কেটপ্লেসে দেখাবে`
                : `${activeCount} active deals synced live to Retail & Brand Shops`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating((prev) => !prev)}
          className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isCreating ? (isBn ? 'বন্ধ করুন' : 'Close') : (isBn ? 'নতুন ফ্ল্যাশ ডিল' : 'Launch Flash Deal')}</span>
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 rounded-xl bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-xs font-semibold text-[var(--pm-danger)]">
          {errorMsg}
        </div>
      )}

      {isCreating && (
        <form onSubmit={handleCreateDeal} className="bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-2xl p-4 sm:p-5 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'পণ্য নির্বাচন করুন' : 'Select Catalog Product'}
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (৳{p.price.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'ছাড় (%)' : 'Discount %'}</label>
                <input
                  type="number"
                  min={5}
                  max={75}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-mono font-bold text-[var(--pm-text)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'ঘণ্টা' : 'Hours'}</label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-mono font-bold text-[var(--pm-text)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'স্টক' : 'Cap'}</label>
                <input
                  type="number"
                  min={1}
                  value={totalStock}
                  onChange={(e) => setTotalStock(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-mono font-bold text-[var(--pm-text)]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--pm-muted)] hover:text-[var(--pm-text)] cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
            >
              {isBn ? 'ডিল প্রকাশ করুন' : 'Publish Deal'}
            </button>
          </div>
        </form>
      )}

      {deals.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[var(--pm-surface)] border border-dashed border-[var(--pm-border)] text-center space-y-1">
          <p className="text-xs font-bold text-[var(--pm-text)]">
            {isBn ? 'এখনো কোনো কাস্টম ফ্ল্যাশ ডিল তৈরি হয়নি' : 'No custom seller Flash Deals launched yet'}
          </p>
          <p className="text-[11px] text-[var(--pm-muted)]">
            {isBn ? 'ওপরের বাটনে ক্লিক করে সীমিত সময়ের ডিসকাউন্ট চালু করুন।' : 'Click "Launch Flash Deal" above to feature a discounted SKU in the marketplace.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="p-4 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={deal.imageUrl || '/src/assets/images/paikarmart_fresh_grocery_1794489814176.jpg'}
                  alt={deal.title}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--pm-border)]"
                />
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-[var(--pm-text)] truncate">{deal.title}</h5>
                  <p className="text-[11px] font-mono tabular-nums text-[var(--pm-muted)]">
                    ৳{deal.dealPrice.toLocaleString()} <span className="line-through">৳{deal.originalPrice.toLocaleString()}</span> · -{deal.discountPercent}%
                  </p>
                  <p className={`text-[10px] font-bold ${deal.isActive !== false ? 'text-[var(--pm-success)]' : 'text-[var(--pm-muted)]'}`}>
                    {deal.isActive !== false ? (isBn ? 'লাইভ চলছে' : 'Active Live') : (isBn ? 'বিরতিতে আছে' : 'Paused')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActive(deal.id)}
                  title={deal.isActive !== false ? 'Pause deal' : 'Resume deal'}
                  className="p-2 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] text-[var(--pm-text)] cursor-pointer"
                >
                  {deal.isActive !== false ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDeal(deal.id)}
                  title="Delete deal"
                  className="p-2 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] hover:border-rose-500 text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
