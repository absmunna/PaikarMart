import React, { useState } from 'react';
import { 
  Video,
  Play
} from 'lucide-react';
import { CommerceItem, CreatorContent, User } from '@/types';
import { INITIAL_CREATOR_POSTS } from '@/data/mockData';
import { AdMobBanner } from '@/design-system/components';
import { SponsoredFeedCard } from '@/components/shared/SponsoredFeedCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { CreatorContentCard } from '@/portals/community/creator-studio/components/CreatorContentCard';
import { IndustryNewsPanel } from '@/portals/community/creator-studio/components/IndustryNewsPanel';

interface CreatorPortalProps {
  currentUser: User;
  onDeductBalance: (amount: number) => boolean;
  commerceItems?: CommerceItem[];
  onAddToCart?: (item: CommerceItem) => void;
}

export const CreatorPortal: React.FC<CreatorPortalProps> = ({
  currentUser,
  onDeductBalance,
  commerceItems = [],
  onAddToCart,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [posts, setPosts] = useState<CreatorContent[]>(INITIAL_CREATOR_POSTS);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'news'>('all');

  const visiblePosts = activeTab === 'all'
    ? posts
    : posts.filter((post) => activeTab === 'video' ? Boolean(post.mediaUrl) : !post.mediaUrl);

  const handleUnlock = (postId: string, price: number) => {
    const success = onDeductBalance(price);
    if (success) {
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, isUnlocked: true } : p
      ));
    }
  };

  const featuredSeriesCard = (
    <SponsoredFeedCard label={isBn ? 'পাইকামার্ট অরিজিনাল সিরিজ' : 'PaikarMart original series'}>
      <div className="overflow-hidden rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)]">
        <img
          src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&h=600&q=80"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="aspect-[16/7] w-full object-cover"
        />
        <div className="space-y-2 p-4 sm:p-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pm-accent-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--pm-accent)]">
            <Video className="h-3.5 w-3.5" />
            <span>{isBn ? 'বিজনেস মাস্টারক্লাস' : 'Business masterclass'}</span>
          </div>
          <h2 className="text-base font-black leading-tight text-[var(--pm-text)] sm:text-lg">
            {isBn ? 'গ্লোবাল হোলসেল লজিস্টিকস শিখুন' : 'Mastering global wholesale logistics'}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--pm-muted)]">
            {isBn
              ? 'ইমপোর্ট, ট্রেড আইন এবং আন্তর্জাতিক সোর্সিং নিয়ে ১২ পর্বের সিরিজ।'
              : 'A 12-part series on importing, trade regulations, and international sourcing.'}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setActiveTab('video')}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--pm-accent)] px-4 text-xs font-bold text-[var(--pm-accent-fg)] transition-colors hover:bg-[var(--pm-accent-hover)] cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isBn ? 'ভিডিও দেখুন' : 'Explore videos'}</span>
        </button>
      </div>
    </SponsoredFeedCard>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-20">

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        {(['all', 'video', 'news'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`min-h-10 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-lg'
                : 'bg-[var(--pm-card)] text-[var(--pm-muted)] border border-[var(--pm-border)] hover:text-[var(--pm-text)]'
            }`}
          >
            {tab === 'all' ? 'Discovery' : tab === 'video' ? 'OTT Videos' : 'Industry News'}
          </button>
        ))}
      </div>

      {/* Creator Feed Cards with OTT & Shoppable Video focus */}
      {activeTab !== 'news' && (
        <div className="grid grid-cols-1 gap-4 sm:gap-8">
          {visiblePosts.map((post, idx) => {
            const linkedProduct = commerceItems.length > 0
              ? commerceItems[idx % commerceItems.length]
              : undefined;
            return (
              <React.Fragment key={post.id}>
                <CreatorContentCard
                  post={post}
                  linkedProduct={linkedProduct}
                  onUnlock={handleUnlock}
                  onAddToCart={onAddToCart}
                />
                {idx === 1 && featuredSeriesCard}
                {idx === 3 && <AdMobBanner />}
              </React.Fragment>
            );
          })}
          {visiblePosts.length > 0 && visiblePosts.length < 2 && featuredSeriesCard}
          {visiblePosts.length > 0 && visiblePosts.length < 4 && <AdMobBanner />}
        </div>
      )}

      {/* Industry News Section */}
      <IndustryNewsPanel />
    </div>
  );
};
