import React from 'react';
import {
  MarketplaceCategoryPortal,
  MarketplacePortalBaseProps,
} from '@/portals/marketplaces/shared/MarketplaceCategoryPortal';
import { DigitalInstantCatalog } from '@/portals/marketplaces/digital/components/DigitalInstantCatalog';

const DIGITAL_KEYWORDS = ['electronics', 'digital', 'mobile', 'phone', 'tablet', 'computer', 'laptop', 'accessory', 'accessories', 'gadget', 'earbuds', 'charger', 'usb'];

export const DigitalGoodsPortal: React.FC<MarketplacePortalBaseProps> = (props) => (
  <MarketplaceCategoryPortal
    {...props}
    config={{
      portalId: 'digital',
      badgeEn: 'Marketplace Hub · Digital Goods',
      badgeBn: 'মার্কেটপ্লেস হাব · ডিজিটাল পণ্য',
      titleEn: 'Digital Goods & Electronics',
      titleBn: 'ডিজিটাল পণ্য ও ইলেকট্রনিক্স',
      subtitleEn: 'Smartphones, laptops, gadgets, OTT subscriptions, and instant software license keys.',
      subtitleBn: 'মোবাইল, কম্পিউটার, গ্যাজেট, OTT সাবস্ক্রিপশন ও সফটওয়্যার লাইসেন্স কী এক জায়গায়।',
      accentGradient: 'from-cyan-600 to-blue-700',
      topSlot: <DigitalInstantCatalog onAddToCart={props.onAddToCart} />,
      itemMatcher: (item) => {
        const text = `${item.category || ''} ${item.title} ${item.description || ''}`.toLowerCase();
        return DIGITAL_KEYWORDS.some((kw) => text.includes(kw));
      },
    }}
  />
);
