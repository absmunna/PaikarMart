import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { SponsoredFeedCard } from '@/components/shared/SponsoredFeedCard';

interface AdMobBannerProps {
  format?: 'banner' | 'leaderboard' | 'native';
  variant?: 'vercel' | 'supabase' | 'render';
  className?: string;
}

const AD_VARIANTS = {
  vercel: {
    tag: 'Local picks',
    tagBn: 'স্থানীয় পছন্দ',
    title: 'Find good things from trusted local sellers',
    titleBn: 'বিশ্বস্ত স্থানীয় বিক্রেতার পণ্য খুঁজুন',
    desc: 'Everyday finds, handmade goods and shops around you.',
    descBn: 'নিত্যপ্রয়োজনীয় পণ্য, হাতে তৈরি জিনিস ও কাছের দোকান দেখুন।',
    url: '/hub/marketplace'
  },
  supabase: {
    tag: 'Verified shops',
    tagBn: 'যাচাইকৃত দোকান',
    title: 'Shop with confidence',
    titleBn: 'নিশ্চিন্তে কেনাকাটা করুন',
    desc: 'Discover shops with clear seller details and helpful reviews.',
    descBn: 'বিক্রেতার তথ্য ও ক্রেতার মতামত দেখে দোকান বেছে নিন।',
    url: '/hub/marketplace'
  },
  render: {
    tag: 'Nearby services',
    tagBn: 'কাছের সেবা',
    title: 'Find a trusted service nearby',
    titleBn: 'কাছাকাছি বিশ্বস্ত সেবা খুঁজুন',
    desc: 'Browse local professionals for everyday jobs and repairs.',
    descBn: 'দৈনন্দিন কাজ ও মেরামতের জন্য স্থানীয় পেশাজীবী দেখুন।',
    url: '/services'
  }
};

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ variant = 'vercel', className = '' }) => {
  const [dismissed, setDismissed] = React.useState(false);
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const ad = AD_VARIANTS[variant] || AD_VARIANTS.vercel;

  if (dismissed) return null;

  return (
    <SponsoredFeedCard
      label={isBn ? 'স্থানীয় মার্কেটপ্লেস' : 'Local marketplace'}
      onDismiss={() => setDismissed(true)}
      dismissLabel={isBn ? 'সুপারিশটি বন্ধ করুন' : 'Dismiss recommendation'}
      className={className}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-[var(--pm-accent)]">
          {isBn ? ad.tagBn : ad.tag}
        </p>
        <h3 className="text-[15px] font-black leading-snug text-[var(--pm-text)]">
          {isBn ? ad.titleBn : ad.title}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--pm-muted)]">
          {isBn ? ad.descBn : ad.desc}
        </p>
      </div>
      <div className="flex justify-end">
        <Link
          to={ad.url}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--pm-accent)] px-4 text-xs font-bold text-[var(--pm-accent-fg)] transition-colors hover:bg-[var(--pm-accent-hover)]"
        >
          <span>{isBn ? 'দেখুন' : 'Explore'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SponsoredFeedCard>
  );
};
