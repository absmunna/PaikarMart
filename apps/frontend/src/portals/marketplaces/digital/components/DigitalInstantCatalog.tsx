import React, { useMemo, useState } from 'react';
import { Check, Gamepad2, Key, Laptop, Search, ShoppingBag, Video, Zap } from 'lucide-react';
import { CommerceItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface DigitalSkuItem {
  id: string;
  title: string;
  titleBn: string;
  category: 'Subscription' | 'License Key' | 'Software' | 'In-Game';
  deliveryLabel: string;
  deliveryLabelBn: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  description: string;
  imageUrl: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DIGITAL_INSTANT_SKUS: DigitalSkuItem[] = [
  {
    id: 'dig_ott_stream_4k',
    title: '4K Ultra HD Streaming Pass (1 Month)',
    titleBn: '৪কে আল্ট্রা এইচডি স্ট্রিমিং পাস (১ মাস)',
    category: 'Subscription',
    deliveryLabel: 'Instant Auto-Delivery',
    deliveryLabelBn: 'তাৎক্ষণিক ডেলিভারি',
    price: 350,
    originalPrice: 450,
    rating: 4.9,
    reviewsCount: 1200,
    description: 'Verified private profile access with instant account activation PIN delivered to your order hub.',
    imageUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=600&q=80',
    icon: Video,
  },
  {
    id: 'dig_win11_pro_key',
    title: 'Windows 11 Pro Retail Activation Key',
    titleBn: 'উইন্ডোজ ১১ প্রো রিটেইল অ্যাক্টিভেশন কী',
    category: 'License Key',
    deliveryLabel: 'Instant Key Delivery',
    deliveryLabelBn: 'তাৎক্ষণিক কী ডেলিভারি',
    price: 850,
    originalPrice: 1200,
    rating: 4.8,
    reviewsCount: 850,
    description: 'Official 25-character retail license key with lifetime device binding and invoice support.',
    imageUrl: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=600&q=80',
    icon: Key,
  },
  {
    id: 'dig_design_suite_pro',
    title: 'Creative Cloud Pro Suite (3 Months)',
    titleBn: 'ক্রিয়েটিভ ক্লাউড প্রো স্যুইট (৩ মাস)',
    category: 'Software',
    deliveryLabel: 'Verified Activation (< 30m)',
    deliveryLabelBn: '৩০ মিনিটে অ্যাক্টিভেশন',
    price: 2500,
    originalPrice: 3200,
    rating: 4.7,
    reviewsCount: 430,
    description: 'Full creative suite license assigned directly to your workspace email with cloud storage.',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    icon: Laptop,
  },
  {
    id: 'dig_gaming_uc_660',
    title: 'Mobile Arena 660 UC Top-Up Voucher',
    titleBn: 'মোবাইল এরিনা ৬৬০ ইউসি টপ-আপ ভাউচার',
    category: 'In-Game',
    deliveryLabel: 'Instant UID Top-Up',
    deliveryLabelBn: 'তাৎক্ষণিক টপ-আপ',
    price: 950,
    originalPrice: 1050,
    rating: 4.9,
    reviewsCount: 2100,
    description: 'Direct player ID voucher redeemable instantly with zero region lock.',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    icon: Gamepad2,
  },
];

interface DigitalInstantCatalogProps {
  onAddToCart: (item: CommerceItem, quantity: number, isWholesale: boolean) => void;
}

export const DigitalInstantCatalog: React.FC<DigitalInstantCatalogProps> = ({ onAddToCart }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [selectedType, setSelectedType] = useState<'all' | DigitalSkuItem['category']>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [addedId, setAddedId] = useState<string | null>(null);

  const visibleSkus = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return DIGITAL_INSTANT_SKUS.filter((sku) => {
      if (selectedType !== 'all' && sku.category !== selectedType) return false;
      if (!q) return true;
      return (
        sku.title.toLowerCase().includes(q) ||
        sku.titleBn.toLowerCase().includes(q) ||
        sku.category.toLowerCase().includes(q)
      );
    });
  }, [selectedType, filterQuery]);

  const handleAddDigitalSku = (sku: DigitalSkuItem) => {
    const item: CommerceItem = {
      id: sku.id,
      storeId: 'vendor_paikarmart_digital',
      storeName: 'PaikarMart Digital Vault',
      type: 'retail',
      tradeMode: 'retail',
      subCategory: 'online',
      title: isBn ? sku.titleBn : sku.title,
      description: sku.description,
      price: sku.price,
      originalPrice: sku.originalPrice,
      shippingFee: 0,
      rating: sku.rating,
      reviewsCount: sku.reviewsCount,
      deliveryEta: sku.deliveryLabel,
      imageUrl: sku.imageUrl,
      category: 'Digital Goods',
      inStock: true,
    };
    onAddToCart(item, 1, false);
    setAddedId(sku.id);
    window.setTimeout(() => setAddedId((prev) => (prev === sku.id ? null : prev)), 1800);
  };

  return (
    <section className="rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[var(--pm-text)]">
              {isBn ? 'ইনস্ট্যান্ট ডিজিটাল পাস, লাইসেন্স ও টপ-আপ' : 'Instant Subscriptions, Keys & Top-Ups'}
            </h3>
            <p className="text-[11px] text-[var(--pm-muted)]">
              {isBn ? 'কোনো শিপিং ফি ছাড়াই সরাসরি ডিজিটাল ডেলিভারি' : 'Zero shipping fee with instant license and digital delivery'}
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--pm-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={isBn ? 'কী, সফটওয়্যার বা পাস খুঁজুন...' : 'Search keys, OTT, software...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] focus:outline-hidden focus:border-[var(--pm-accent)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'Subscription', 'License Key', 'Software', 'In-Game'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedType(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              selectedType === cat
                ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-transparent'
                : 'bg-[var(--pm-surface)] text-[var(--pm-muted)] border-[var(--pm-border)] hover:text-[var(--pm-text)]'
            }`}
          >
            {cat === 'all' ? (isBn ? 'সব ডিজিটাল' : 'All Digital') : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {visibleSkus.map((sku) => {
          const Icon = sku.icon;
          const isAdded = addedId === sku.id;
          return (
            <div
              key={sku.id}
              className="p-3.5 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] transition-all flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-center justify-center text-[var(--pm-accent)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--pm-muted)]">
                    {sku.category} · ★ {sku.rating}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[var(--pm-text)] line-clamp-2">
                    {isBn ? sku.titleBn : sku.title}
                  </h4>
                  <p className="text-[11px] text-[var(--pm-success)] font-semibold mt-1">
                    {isBn ? sku.deliveryLabelBn : sku.deliveryLabel}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--pm-border)] flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-mono tabular-nums font-black text-[var(--pm-text)]">
                    ৳{sku.price.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums line-through text-[var(--pm-muted)] ml-1.5">
                    ৳{sku.originalPrice.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddDigitalSku(sku)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    isAdded
                      ? 'bg-[var(--pm-success)] text-white'
                      : 'bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)]'
                  }`}
                >
                  {isAdded ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                  <span>{isAdded ? (isBn ? 'যুক্ত হয়েছে' : 'Added') : (isBn ? 'কিনুন' : 'Add')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
