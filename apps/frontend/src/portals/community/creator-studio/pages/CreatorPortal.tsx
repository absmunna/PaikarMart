import React, { useState } from 'react';
import { 
  Video,
  Play
} from 'lucide-react';
import { CommerceItem, CreatorContent, User } from '@/types';
import { INITIAL_CREATOR_POSTS } from '@/data/mockData';
import { AdMobBanner } from '@/design-system/components';
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-20">
      
      {/* OTT Style Banner */}
      <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl relative overflow-hidden aspect-[4/3] sm:aspect-auto sm:min-h-[300px] flex items-end">
        <img 
          src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&h=600&q=80" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          alt="OTT Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        
        <div className="relative z-10 space-y-2.5 sm:space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Video className="w-3 h-3" />
            <span>PaikarMart Original</span>
          </div>
          <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-tight">Mastering Global Wholesale Logistics</h1>
          <p className="text-sm text-slate-300 line-clamp-2">Exclusive 12-part series on importing from East-Asia and navigating local trade laws.</p>
          <button className="px-6 py-3 rounded-2xl bg-white text-slate-950 font-bold text-sm flex items-center gap-2 hover:bg-slate-100 transition-all active:scale-[0.98]">
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Watch Trailer</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        {(['all', 'video', 'news'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
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
              <CreatorContentCard
                key={post.id}
                post={post}
                linkedProduct={linkedProduct}
                onUnlock={handleUnlock}
                onAddToCart={onAddToCart}
              />
            );
          })}
        </div>
      )}

      <AdMobBanner />

      {/* Industry News Section */}
      <IndustryNewsPanel />
    </div>
  );
};
