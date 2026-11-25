import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { SponsoredFeedCard } from '@/components/shared/SponsoredFeedCard';

export interface AdCardData {
  id: string;
  tagEn: string;
  tagBn: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  ctaEn: string;
  ctaBn: string;
  bgGradient: string;
  discountBadge?: string;
  imageUrl?: string;
}

const SAMPLE_AD_CARDS: AdCardData[] = [
  {
    id: 'ad_1',
    tagEn: 'SPONSORED MEGA DEAL',
    tagBn: 'স্পন্সরড মেগা অফার',
    titleEn: 'Factory Direct Retail Deals — Up to 45% Off',
    titleBn: 'ফ্যাক্টরি রেটে খুচরা কেনাকাটা — ৪৫% পর্যন্ত ছাড়',
    descEn: 'Verified authentic brands with 24-hour hyperlocal delivery across Bangladesh.',
    descBn: 'সারাদেশে ২৪ ঘণ্টার মধ্যে হাইপারলোকাল হোম ডেলিভারি ও অরিজিনাল ব্র্যান্ড গ্যারান্টি।',
    ctaEn: 'Grab Offer',
    ctaBn: 'অফার নিন',
    bgGradient: 'from-blue-600 via-indigo-600 to-purple-700',
    discountBadge: '45% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=600&h=450&q=80',
  },
  {
    id: 'ad_2',
    tagEn: '24/7 PHARMACY & RX',
    tagBn: '২৪/৭ ফার্মেসি ও ওষুধ',
    titleEn: 'Instant Prescription Upload & Verified Drugs',
    titleBn: 'প্রেসক্রিপশন আপলোড করুন ও দ্রুত ওষুধ পান',
    descEn: 'Get authentic medicines delivered within 30 minutes from nearby licensed pharmacies.',
    descBn: 'নিকটস্থ লাইসেন্সপ্রাপ্ত ফার্মেসি থেকে ৩০ মিনিটে খাঁটি ওষুধ ডেলিভারি।',
    ctaEn: 'Upload Rx',
    ctaBn: 'প্রেসক্রিপশন দিন',
    bgGradient: 'from-teal-600 via-emerald-600 to-cyan-700',
    discountBadge: '30 MIN',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&h=450&q=80',
  },
  {
    id: 'ad_3',
    tagEn: 'ESCROW PROTECTION',
    tagBn: 'এসক্রো ক্যাশব্যাক',
    titleEn: 'Save 5% Instantly Paying via Escrow Wallet',
    titleBn: 'এসক্রো ওয়ালেটে পেমেন্ট করলে ৫% ইনস্ট্যান্ট সাশ্রয়',
    descEn: 'Secure milestone bookings with zero cancellation fee and verified tracking.',
    descBn: 'জিরো ক্যান্সেলেশন ফি এবং ভেরিফাইড ট্র্যাকিং সহ নিরাপদ সার্ভিস বুকিং।',
    ctaEn: 'Add Funds',
    ctaBn: 'ওয়ালেট',
    bgGradient: 'from-amber-600 via-orange-600 to-red-700',
    discountBadge: '5% CASHBACK',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&h=450&q=80',
  },
  {
    id: 'ad_4',
    tagEn: 'B2B SOURCING RFQ',
    tagBn: 'পাইকারি ডিমান্ড বোর্ড',
    titleEn: 'Post Your Product Requirement & Get Bids',
    titleBn: 'আপনার প্রয়োজনীয় পণ্যের রিকোয়েস্ট পোস্ট করুন',
    descEn: 'Let verified suppliers and wholesalers compete to give you the lowest price.',
    descBn: 'সাপ্লায়ার ও পাইকারদের কাছ থেকে সেরা মূল্যের কোটেশন সংগ্রহ করুন।',
    ctaEn: 'Post RFQ',
    ctaBn: 'পোস্ট করুন',
    bgGradient: 'from-purple-700 via-pink-700 to-slate-900',
    discountBadge: 'BEST BIDS',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&h=450&q=80',
  },
];

interface PromotionalAdCardProps {
  index: number;
  isBn: boolean;
  onCtaClick?: (adId: string) => void;
  className?: string;
}

export const PromotionalAdCard: React.FC<PromotionalAdCardProps> = ({
  index,
  isBn,
  onCtaClick,
  className = '',
}) => {
  const ad = SAMPLE_AD_CARDS[index % SAMPLE_AD_CARDS.length];

  return (
    <SponsoredFeedCard
      label={isBn ? ad.tagBn : ad.tagEn}
      className={className}
    >
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${ad.bgGradient} p-4 sm:p-5 text-white`}>
        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-slate-950/35" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>{isBn ? ad.tagBn : ad.tagEn}</span>
            </span>
            {ad.discountBadge && (
              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black text-slate-950">
                {ad.discountBadge}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black leading-tight sm:text-lg">
              {isBn ? ad.titleBn : ad.titleEn}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-white/90">
              {isBn ? ad.descBn : ad.descEn}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--pm-muted)]">
          <ShieldCheck className="h-4 w-4 text-[var(--pm-accent)]" />
          <span>{isBn ? 'স্পন্সরড অফার' : 'Sponsored offer'}</span>
          <Zap className="h-3.5 w-3.5 text-amber-500" />
        </span>
        <button
          type="button"
          onClick={() => onCtaClick?.(ad.id)}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--pm-accent)] px-4 text-xs font-bold text-[var(--pm-accent-fg)] transition-colors hover:bg-[var(--pm-accent-hover)] cursor-pointer"
        >
          <span>{isBn ? ad.ctaBn : ad.ctaEn}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </SponsoredFeedCard>
  );
};
