import React, { useState } from 'react';
import {
  MarketplaceCategoryPortal,
  MarketplacePortalBaseProps,
} from '@/portals/marketplaces/shared/MarketplaceCategoryPortal';

const BRAND_KEYWORDS = ['brand', 'official', 'flagship', 'warranty', 'samsung', 'apple', 'vision', 'walton', 'aarong', 'bata', 'pran', 'apex', 'akij'];

export const BrandShopsPortal: React.FC<MarketplacePortalBaseProps> = (props) => {
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  const brandOptions = [
    { id: 'all', labelEn: 'All Brands', labelBn: 'সকল ব্র্যান্ড' },
    { id: 'apple', labelEn: 'Apple', labelBn: 'অ্যাপল' },
    { id: 'samsung', labelEn: 'Samsung', labelBn: 'স্যামসাং' },
    { id: 'walton', labelEn: 'Walton', labelBn: 'ওয়ালটন' },
    { id: 'vision', labelEn: 'Vision', labelBn: 'ভিশন' },
    { id: 'bata', labelEn: 'Bata', labelBn: 'বাটা' },
    { id: 'apex', labelEn: 'Apex', labelBn: 'অ্যাপেক্স' },
    { id: 'pran', labelEn: 'Pran', labelBn: 'প্রাণ' },
    { id: 'akij', labelEn: 'Akij', labelBn: 'আকিজ' },
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 pt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-[var(--pm-muted)] shrink-0 uppercase tracking-wider">
          Brand Stores:
        </span>
        {brandOptions.map((brand) => (
          <button
            key={brand.id}
            onClick={() => setSelectedBrand(brand.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 ${
              selectedBrand === brand.id
                ? 'bg-[var(--pm-primary)] text-white shadow-md shadow-[var(--pm-primary)]/20'
                : 'bg-[var(--pm-card)] border border-[var(--pm-border)] text-[var(--pm-text)] hover:border-[var(--pm-primary)]/50'
            }`}
          >
            {brand.labelBn} ({brand.labelEn})
          </button>
        ))}
      </div>
      <MarketplaceCategoryPortal
        {...props}
        config={{
          portalId: 'brand-shops',
          badgeEn: 'Marketplace Hub · Official Brand Stores & Buybox',
          badgeBn: 'মার্কেটপ্লেস হাব · অফিশিয়াল ব্র্যান্ড স্টোর ও বাইবক্স',
          titleEn: selectedBrand === 'all' ? 'Official Brand Shops & Buybox Pricing' : `${selectedBrand.toUpperCase()} Flagship Store`,
          titleBn: selectedBrand === 'all' ? 'অফিসিয়াল ব্র্যান্ড শপ ও বাইবক্স প্রাইসিং' : `${selectedBrand.toUpperCase()} ফ্ল্যাগশিপ স্টোর`,
          subtitleEn: 'Explore verified manufacturer stores, buybox pricing, and authentic warranties.',
          subtitleBn: 'যাচাইকৃত প্রস্তুতকারক স্টোর, বাইবক্স প্রাইসিং এবং জেনুইন ওয়ারেন্টি উপভোগ করুন।',
          accentGradient: 'from-amber-600 via-rose-600 to-indigo-700',
          showFlashDeals: true,
          itemMatcher: (item) => {
            const text = `${item.badge || ''} ${item.storeName || ''} ${item.title} ${item.description || ''} ${item.brand || ''}`.toLowerCase();
            if (selectedBrand === 'all') {
              return BRAND_KEYWORDS.some((kw) => text.includes(kw));
            }
            return text.includes(selectedBrand);
          },
        }}
      />
    </div>
  );
};
