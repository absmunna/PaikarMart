import React, { useMemo, useState } from 'react';
import { CheckCircle2, Reply, Send, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SellerReviewRecord {
  id: string;
  buyerName: string;
  productTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
  sellerReply?: string;
}

const INITIAL_SELLER_REVIEWS: SellerReviewRecord[] = [
  {
    id: 'rev_101',
    buyerName: 'Nirjon M.',
    productTitle: 'Apple iPhone 15 Pro Max - Natural Titanium',
    rating: 5,
    comment: 'Original sealed box and prompt same-day courier handover in Gulshan.',
    createdAt: '2 hours ago',
    verifiedPurchase: true,
  },
  {
    id: 'rev_102',
    buyerName: 'Rahima B.',
    productTitle: '180 GSM Pure Cotton Crewneck T-Shirt',
    rating: 4,
    comment: 'Good fabric quality and clean stitching. Packaging was secure for wholesale carton.',
    createdAt: '1 day ago',
    verifiedPurchase: true,
    sellerReply: 'Thank you for ordering with us! Bulk restocks ship within 24 hours.',
  },
];

export const SellerReviewManager: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [reviews, setReviews] = useState<SellerReviewRecord[]>(INITIAL_SELLER_REVIEWS);
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered' | 'five_star'>('all');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    if (filterMode === 'unanswered') return reviews.filter((r) => !r.sellerReply);
    if (filterMode === 'five_star') return reviews.filter((r) => r.rating === 5);
    return reviews;
  }, [reviews, filterMode]);

  const handleSubmitReply = (reviewId: string) => {
    const clean = replyDraft.trim();
    if (!clean) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, sellerReply: clean } : r))
    );
    setReplyingToId(null);
    setReplyDraft('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--pm-card)] p-4 sm:p-5 rounded-2xl border border-[var(--pm-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--pm-text)]">
              {isBn ? 'ক্রেতা রিভিউ ও রেপুটেশন ম্যানেজার' : 'Customer Reviews & Store Reputation'}
            </h4>
            <p className="text-xs text-[var(--pm-muted)] font-mono tabular-nums">
              {avgRating} ★ avg · {reviews.length} {isBn ? 'ভেরিফাইড রিভিউ' : 'verified reviews'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', en: 'All', bn: 'সব' },
              { id: 'unanswered', en: 'Needs Reply', bn: 'উত্তর বাকি' },
              { id: 'five_star', en: '5★ Top', bn: '৫★ রিভিউ' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-transparent'
                  : 'bg-[var(--pm-surface)] text-[var(--pm-muted)] border-[var(--pm-border)] hover:text-[var(--pm-text)]'
              }`}
            >
              {isBn ? tab.bn : tab.en}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visibleReviews.map((review) => (
          <div
            key={review.id}
            className="p-4 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--pm-text)]">
                  <span>{review.buyerName}</span>
                  {review.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--pm-success)] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      {isBn ? 'ভেরিফাইড ক্রেতা' : 'Verified Purchase'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--pm-muted)]">{review.productTitle} · {review.createdAt}</p>
              </div>
              <div className="flex items-center gap-0.5 text-amber-500 font-mono text-xs font-bold shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <span>{review.rating}.0</span>
              </div>
            </div>

            <p className="text-xs text-[var(--pm-text)] leading-relaxed">{review.comment}</p>

            {review.sellerReply ? (
              <div className="p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-[var(--pm-accent)] block">
                  {isBn ? 'আপনার উত্তর' : 'Your Store Reply'}
                </span>
                <p className="text-[var(--pm-muted)]">{review.sellerReply}</p>
              </div>
            ) : replyingToId === review.id ? (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder={isBn ? 'ক্রেতাকে ধন্যবাদ বা উত্তর লিখুন...' : 'Write a polite reply to this customer...'}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleSubmitReply(review.id)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBn ? 'পাঠান' : 'Reply'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setReplyingToId(review.id);
                  setReplyDraft('');
                }}
                className="text-xs font-bold text-[var(--pm-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>{isBn ? 'রিপ্লাই দিন' : 'Reply to Review'}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
