import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ThumbsUp, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Share2, 
  Globe, 
  CheckCircle2, 
  ShoppingCart, 
  MoreHorizontal,
  Send,
  Sparkles
} from 'lucide-react';
import { formatDisplayHandle, normalizeHandle } from '@paikarmart/shared';
import { SocialPost, ReactionType, User, CommerceItem } from '@/types';
import { DEFAULT_AVATAR_URL, DEFAULT_PRODUCT_IMAGE_URL, safeMediaSrc } from '@/shared/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CardActionBar, CardActionButton, ContentCard, ContentCardMedia } from '@/components/shared/CardPrimitives';
import { Badge } from '@/components/shared/Badge';

interface FeedPostCardProps {
  post: SocialPost;
  currentUser: User;
  isSaved: boolean;
  onReact: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onAddToCart: (item: CommerceItem) => void;
  onToggleSave: (postId: string) => void;
  commerceItems: CommerceItem[];
  onOpenStorePortal?: (storeId: string) => void;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  currentUser,
  isSaved,
  onReact,
  onAddComment,
  onAddToCart,
  onToggleSave,
  commerceItems,
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [shareStatus, setShareStatus] = useState<'shared' | 'copied' | 'unavailable' | 'failed' | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  const totalReactions = 
    post.reactionsCount.like + 
    post.reactionsCount.love + 
    post.reactionsCount.care;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(post.id, commentInput.trim());
    setCommentInput('');
    setShowComments(true);
  };

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.hash = `post-${encodeURIComponent(post.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.authorName, text: post.content, url: url.toString() });
        setShareStatus('shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url.toString());
        setShareStatus('copied');
      } else {
        setShareStatus('unavailable');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Post sharing failed:', error);
      setShareStatus('failed');
    }
  };

  const handleProductClick = (e: React.MouseEvent) => {
    if (post.taggedProduct) {
      e.stopPropagation();
      navigate(`/hub/marketplace/product/${post.taggedProduct.id}`);
    }
  };

  // Find linked commerce item if tagged
  const linkedProduct = post.taggedProduct 
    ? commerceItems.find(i => i.id === post.taggedProduct?.id)
    : null;

  return (
    <ContentCard id={`post-${post.id}`} className="p-4 sm:p-6 space-y-3 sm:space-y-4 transition-shadow duration-300 hover:shadow-md premium-shadow">
      
      {/* Top Header: Author info & options */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/u/${normalizeHandle(post.authorHandle || post.authorName)}`)}
            className="relative cursor-pointer shrink-0 group"
            aria-label={`View ${post.authorName} profile`}
          >
            <img
              src={safeMediaSrc(post.authorAvatar, DEFAULT_AVATAR_URL)}
              alt={post.authorName}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[var(--pm-border)] group-hover:ring-[var(--pm-accent)] transition-all shadow-sm"
            />
            {post.authorVerified && (
              <div className="absolute -right-0.5 -bottom-0.5 bg-[var(--pm-card)] rounded-full p-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--pm-accent)] fill-[var(--pm-accent-soft)]" />
              </div>
            )}
          </button>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => navigate(`/u/${normalizeHandle(post.authorHandle || post.authorName)}`)}
                className="text-[15px] font-black text-[var(--pm-text)] hover:text-[var(--pm-accent)] hover:underline cursor-pointer text-left"
              >
                {post.authorName}
              </button>
              <span className="text-[11px] font-mono text-[var(--pm-muted)]">
                {formatDisplayHandle(post.authorHandle || post.authorName)}
              </span>
              {post.isSponsored && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] uppercase tracking-tighter">
                  {post.adNetwork || (isBn ? 'প্রচারিত' : 'Promoted')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--pm-muted)]">
              <span>{post.timestamp}</span>
              <span aria-hidden="true">·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {post.citizenCategory === 'homemade' && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
              🍲 হোমমেড খাবার/পণ্য
            </span>
          )}
          {post.citizenCategory === 'bid' && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
              🔨 পাবলিক নিলাম
            </span>
          )}
          {post.citizenCategory === 'property_rent' && (
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider border border-purple-500/20">
              🏢 ফ্ল্যাট ভাড়া / প্রোপার্টি
            </span>
          )}
          {post.citizenCategory === 'used_goods' && (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
              📦 সেকেন্ড হ্যান্ড
            </span>
          )}
          {post.aiSafetyVerified && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] text-[9px] font-black uppercase tracking-tighter">
              ✨ AI Verified
            </span>
          )}
          {post.aiRiskAssessment === 'high_risk_flagged' && (
            <Badge tone="warning" size="xs" className="font-black uppercase tracking-tighter">
              ⚠ Pending Review
            </Badge>
          )}
          {post.postType === 'demand' && (
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
              Demand
            </span>
          )}
          {post.postType === 'sale' && (
            <Badge tone="success" size="md" className="font-black uppercase tracking-widest">
              Sale
            </Badge>
          )}
          <button 
            type="button" 
            aria-label="Post options"
            className="p-2 text-[var(--pm-muted)] hover:text-[var(--pm-text)] rounded-full hover:bg-[var(--pm-surface)] transition-colors active-scale cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Post Text Content */}
      <p className={`text-[15px] leading-relaxed whitespace-pre-line px-1 ${
        post.postType === 'demand' ? 'text-[var(--pm-text)] font-bold italic' : 'text-[var(--pm-text)] font-medium'
      }`}>
        {post.content}
      </p>

      {/* Attached Media Photo / Banner */}
      {post.mediaUrl?.trim() && (
        <ContentCardMedia className="rounded-2xl sm:rounded-[1.5rem] border border-[var(--pm-border)] shadow-inner group">
          <img
            src={post.mediaUrl.trim()}
            alt="Post media"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full max-h-[500px] object-cover group-hover:scale-[1.03] transition-transform duration-1000"
          />
        </ContentCardMedia>
      )}

      <CardActionBar label={isBn ? 'পোস্টের কাজ' : 'Post actions'} className="-mx-2 -mt-3 border-b border-[var(--pm-border)] sm:-mx-3">
        {showReactionPicker && (
          <div
            onMouseLeave={() => setShowReactionPicker(false)}
            className="absolute -top-12 left-2 z-20 flex items-center gap-3 rounded-full border border-[var(--pm-border)] px-2 py-1.5 shadow-2xl pm-glass animate-scale-in"
          >
            {(['like', 'love', 'care', 'haha', 'wow'] as ReactionType[]).map((rx) => (
              <button
                key={rx}
                type="button"
                aria-label={rx}
                onClick={() => {
                  onReact(post.id, rx);
                  setShowReactionPicker(false);
                }}
                className="cursor-pointer p-1 text-xl transition-transform hover:scale-125 active:scale-90"
              >
                {rx === 'like' ? '👍' : rx === 'love' ? '❤️' : rx === 'care' ? '🥰' : rx === 'haha' ? '😂' : '😮'}
              </button>
            ))}
          </div>
        )}
        <CardActionButton
          icon={post.userReaction === 'love' ? Heart : ThumbsUp}
          label={post.userReaction ? (isBn ? 'প্রতিক্রিয়া বদলান' : 'Change reaction') : (isBn ? 'পছন্দ' : 'Like')}
          active={Boolean(post.userReaction)}
          activeTone={post.userReaction === 'love' ? 'danger' : 'accent'}
          count={totalReactions}
          onMouseEnter={() => setShowReactionPicker(true)}
          onClick={() => onReact(post.id, post.userReaction === 'like' ? 'love' : 'like')}
        />
        <CardActionButton
          icon={MessageCircle}
          label={isBn ? 'মন্তব্য দেখুন বা লিখুন' : 'View or add comments'}
          count={post.comments.length}
          onClick={() => setShowComments(!showComments)}
        />
        {post.taggedProduct && linkedProduct && (
          <CardActionButton
            icon={ShoppingCart}
            label={isBn ? 'কার্টে যোগ করুন' : 'Add tagged product to cart'}
            onClick={() => onAddToCart(linkedProduct)}
          />
        )}
        <CardActionButton
          icon={Bookmark}
          label={isSaved
            ? (isBn ? 'সেভ করা পোস্ট সরান' : 'Remove saved post')
            : (isBn ? 'পোস্ট সেভ করুন' : 'Save post')}
          active={isSaved}
          onClick={() => onToggleSave(post.id)}
        />
        <CardActionButton
          icon={Share2}
          label={shareStatus === 'copied'
            ? (isBn ? 'লিংক কপি হয়েছে' : 'Link copied')
            : shareStatus === 'failed'
              ? (isBn ? 'শেয়ার করা যায়নি' : 'Could not share')
              : (isBn ? 'শেয়ার করুন' : 'Share post')}
          count={post.sharesCount}
          onClick={handleShare}
        />
      </CardActionBar>
      {shareStatus && (
        <p role="status" className="text-center text-[11px] text-[var(--pm-muted)]">
          {shareStatus === 'shared'
            ? (isBn ? 'পোস্ট শেয়ার করা হয়েছে।' : 'Post shared.')
            : shareStatus === 'copied'
              ? (isBn ? 'পোস্টের লিংক কপি হয়েছে।' : 'Post link copied.')
              : shareStatus === 'unavailable'
                ? (isBn ? 'এই ডিভাইসে শেয়ার সুবিধা নেই।' : 'Sharing is unavailable on this device.')
                : (isBn ? 'পোস্ট শেয়ার করা যায়নি।' : 'Could not share this post.')}
        </p>
      )}

      {/* Embedded Tagged Commercial Item Card */}
      {post.taggedProduct && (
        <div 
          onClick={handleProductClick}
          className="rounded-2xl p-3 sm:p-4 bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-3 sm:gap-4 shadow-sm hover:shadow-md hover:border-[var(--pm-accent)] transition-all cursor-pointer group active-scale"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-sm ring-1 ring-[var(--pm-border)]">
              <img
                src={safeMediaSrc(post.taggedProduct.image, DEFAULT_PRODUCT_IMAGE_URL)}
                alt={post.taggedProduct.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--pm-accent)]">
                  {post.taggedProduct.category}
                </span>
                <span aria-hidden="true" className="text-[var(--pm-muted)] text-[10px]">·</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/u/${normalizeHandle(post.taggedProduct?.storeHandle || post.taggedProduct?.storeName)}`);
                  }}
                  className="text-[10px] font-bold text-[var(--pm-muted)] hover:text-[var(--pm-accent)] hover:underline cursor-pointer truncate"
                >
                  {post.taggedProduct.storeName}
                </button>
              </div>
              <h5 className="text-[14px] font-black text-[var(--pm-text)] truncate group-hover:text-[var(--pm-accent)] transition-colors">
                {post.taggedProduct.title}
              </h5>
              <p className="text-[13px] font-mono font-black text-[var(--pm-text)] mt-0.5">
                ৳{post.taggedProduct.price.toLocaleString()}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Demand & Used Product CTA Bar */}
      {(post.postType === 'demand' || post.postType === 'sale') && (
        <div className="space-y-3 pt-2">
          {sentNotice && (
            <div className="p-3 rounded-2xl bg-[var(--pm-success-soft)] border border-[var(--pm-success)]/25 text-[var(--pm-success)] text-xs font-black text-center animate-scale-in">
              {sentNotice}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => {
                const msg = post.postType === 'demand' ? 'Proposal sent to buyer!' : 'Message sent to seller!';
                setSentNotice(msg);
                setTimeout(() => setSentNotice(null), 2500);
              }}
              className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active-scale shadow-lg cursor-pointer ${
                post.postType === 'demand' 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30' 
                  : 'bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)]'
              }`}
            >
              {post.postType === 'demand'
                ? isBn ? 'প্রস্তাব পাঠান' : 'I Have This / Send Proposal'
                : isBn ? 'বিক্রেতাকে বার্তা দিন' : 'Contact Seller'}
            </button>
          </div>
        </div>
      )}

      {/* Comment Section - Refined */}
      {showComments && (
        <div className="pt-4 border-t border-[var(--pm-border)] space-y-4 animate-fade-in">
          
          {/* List of comments */}
          <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 px-1">
                <img
                  src={safeMediaSrc(comment.authorAvatar, DEFAULT_AVATAR_URL)}
                  alt={comment.authorName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[var(--pm-border)]"
                />
                <div className="flex-1 space-y-1">
                  <div className="bg-[var(--pm-surface)] border border-[var(--pm-border)] rounded-2xl px-4 py-2.5">
                    <span className="text-[13px] font-black text-[var(--pm-text)] block mb-0.5">
                      {comment.authorName}
                    </span>
                    <p className="text-[13px] font-medium text-[var(--pm-text)] leading-normal">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 px-2 text-[10px] font-black uppercase tracking-tighter text-[var(--pm-muted)]">
                    <button className="hover:text-[var(--pm-accent)] cursor-pointer">Like</button>
                    <button className="hover:text-[var(--pm-accent)] cursor-pointer">Reply</button>
                    <span>12h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* New Comment Input - Unified Look */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-3 pt-2">
            <img
              src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[var(--pm-border)]"
            />
            <div className="relative flex-1">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={isBn ? 'আপনার মতামত লিখুন...' : 'Share your thoughts...'}
                className="w-full bg-[var(--pm-input)] border border-[var(--pm-border)] rounded-full pl-4 pr-10 py-2.5 text-[13px] font-medium text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent)]/20 outline-none"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                aria-label={isBn ? 'মন্তব্য পাঠান' : 'Send comment'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center disabled:opacity-20 transition-all active-scale shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

        </div>
      )}

    </ContentCard>
  );
};
