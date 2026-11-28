import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  formatDisplayHandle,
  normalizeHandle,
  type PublicProfileProjection
} from '@paikarmart/shared';
import {
  Search,
  MessageCircle,
  ArrowLeft,
  Share2,
  Check,
  Lock,
  Wrench,
  Package,
  MessageSquare,
  SlidersHorizontal,
  Image as ImageIcon
} from 'lucide-react';
import { CommerceItem, ReactionType, ServiceBooking, SocialPost, User } from '@/types';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProfileHeader } from '@/portals/utilities/user-profile/components/ProfileHeader';
import { vendorApiClient } from '@/features/vendors';
import { FeedPostCard } from '@/features/social';
import { ProductCardActionRow } from '@/features/marketplace/components/ProductCardActionRow';
import { ServiceCard, ServiceBookingModal } from '@/features/services';
import { ContentCard, ContentCardMedia } from '@/components/shared/CardPrimitives';

interface PublicStorefrontPageProps {
  commerceItems: CommerceItem[];
  posts: SocialPost[];
  savedPostIds: string[];
  currentUser: User;
  onAddToCart: (item: CommerceItem, qty: number, isWholesale: boolean) => void;
  onBookService?: (booking: Omit<ServiceBooking, 'id' | 'status'>) => void;
  onReact: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onToggleSavedPost: (postId: string) => void;
  onDeductBalance?: (amount: number) => boolean;
}

type ProfileSectionTab = 'all' | 'posts' | 'photos' | 'products' | 'services';

export const PublicStorefrontPage: React.FC<PublicStorefrontPageProps> = ({
  commerceItems,
  posts,
  savedPostIds,
  currentUser,
  onAddToCart,
  onBookService,
  onReact,
  onAddComment,
  onToggleSavedPost,
  onDeductBalance
}) => {
  const { handle, storeId } = useParams<{ handle?: string; storeId?: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const rawParam = handle || storeId || currentUser.handle || currentUser.name;
  const targetSlug = normalizeHandle(rawParam);

  const [publicProfile, setPublicProfile] = useState<PublicProfileProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileSectionTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedService, setSelectedService] = useState<CommerceItem | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPublicProfile(null);
    setActiveTab('all');
    setSearchQuery('');
    setModeFilter('all');
    void vendorApiClient
      .fetchPublicProfileByHandle(rawParam)
      .then((res) => {
        if (active) setPublicProfile(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [rawParam]);

  // Match all public Social Posts belonging to this single @handle / author / store
  const matchingPosts = useMemo(() => {
    return posts.filter((p) => {
      const authorSlug = normalizeHandle(p.authorHandle || p.authorName);
      const taggedSlug = p.taggedProduct
        ? normalizeHandle(p.taggedProduct.storeHandle || p.taggedProduct.storeName)
        : '';
      return (
        authorSlug === targetSlug ||
        p.authorId === rawParam ||
        (publicProfile?.storeId && p.authorId === publicProfile.storeId) ||
        taggedSlug === targetSlug
      );
    });
  }, [posts, targetSlug, rawParam, publicProfile]);
  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query
      ? matchingPosts.filter((post) =>
          `${post.content} ${post.authorName}`.toLowerCase().includes(query)
        )
      : matchingPosts;
  }, [matchingPosts, searchQuery]);
  const matchingPhotos = useMemo(
    () => filteredPosts.filter((post) => Boolean(post.mediaUrl?.trim())),
    [filteredPosts]
  );

  // Match all public Commerce Products (Retail & Wholesale) belonging to this handle / store
  const matchingProducts = useMemo(() => {
    return commerceItems.filter((item) => {
      if (item.type === 'service' || item.type === 'rides') return false;
      const storeSlug = normalizeHandle(item.storeHandle || item.storeName);
      const belongsToHandle =
        item.storeId === rawParam ||
        storeSlug === targetSlug ||
        (publicProfile?.storeId && item.storeId === publicProfile.storeId) ||
        (publicProfile && normalizeHandle(publicProfile.displayName) === storeSlug);

      if (!belongsToHandle) return false;
      if (modeFilter !== 'all' && (item.tradeMode || item.type) !== modeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [commerceItems, rawParam, targetSlug, publicProfile, modeFilter, searchQuery]);

  // Match all public Services belonging to this handle / store
  const matchingServices = useMemo(() => {
    return commerceItems.filter((item) => {
      if (item.type !== 'service') return false;
      const storeSlug = normalizeHandle(item.storeHandle || item.storeName);
      const belongsToHandle =
        item.storeId === rawParam ||
        storeSlug === targetSlug ||
        (publicProfile?.storeId && item.storeId === publicProfile.storeId);
      if (!belongsToHandle) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [commerceItems, rawParam, targetSlug, publicProfile, searchQuery]);

  const isOwner = useMemo(() => {
    const userSlug = normalizeHandle(currentUser.handle || currentUser.name);
    const vendorSlug = currentUser.vendorProfile
      ? normalizeHandle(currentUser.vendorProfile.handle || currentUser.vendorProfile.storeName)
      : '';
    return (
      userSlug === targetSlug ||
      (vendorSlug && vendorSlug === targetSlug) ||
      currentUser.id === rawParam ||
      Boolean(currentUser.vendorProfile?.id && currentUser.vendorProfile.id === rawParam) ||
      Boolean(currentUser.vendorProfile?.id && publicProfile?.storeId === currentUser.vendorProfile.id)
    );
  }, [currentUser, targetSlug, rawParam, publicProfile]);

  const resolvedDisplayName =
    publicProfile?.displayName ||
    (isOwner ? currentUser.vendorProfile?.storeName || currentUser.name : undefined) ||
    matchingProducts[0]?.storeName ||
    matchingServices[0]?.storeName ||
    matchingPosts[0]?.authorName ||
    rawParam.replace(/^@/, '').replace(/_/g, ' ');

  const resolvedHandle = formatDisplayHandle(
    publicProfile?.handle || targetSlug
  );

  const resolvedAvatar =
    publicProfile?.avatar ||
    matchingPosts[0]?.authorAvatar ||
    (isOwner ? currentUser.avatar : undefined);

  const resolvedLocation =
    publicProfile?.location ||
    (isOwner ? currentUser.vendorProfile?.location || currentUser.location : undefined);

  const isMerchantProfile =
    Boolean(publicProfile) ||
    matchingProducts.length > 0 ||
    matchingServices.length > 0 ||
    (isOwner && currentUser.isVendor);
  const profileTabs: { id: ProfileSectionTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'posts', label: `Posts (${matchingPosts.length})` },
    { id: 'photos', label: `Photos (${matchingPosts.filter((post) => post.mediaUrl?.trim()).length})` },
    ...(isMerchantProfile || matchingProducts.length > 0
      ? [{ id: 'products' as const, label: `Shop (${matchingProducts.length})` }]
      : []),
    ...(isMerchantProfile || matchingServices.length > 0
      ? [{ id: 'services' as const, label: `Services (${matchingServices.length})` }]
      : [])
  ];

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/u/${encodeURIComponent(normalizeHandle(resolvedHandle))}`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(shareUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="space-y-4 pb-20 sm:space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="hidden md:inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--pm-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--pm-muted)]">
          <Lock className="h-3.5 w-3.5 text-[var(--pm-success)]" />
          <span>Public profile</span>
        </span>
      </div>

      <ProfileHeader
        displayName={resolvedDisplayName}
        avatar={resolvedAvatar}
        coverImage={isOwner ? currentUser.coverImage : undefined}
        handle={resolvedHandle}
        location={resolvedLocation}
        bio={isOwner ? currentUser.bio : undefined}
        verifiedLabel={
          publicProfile?.verified
            ? 'Verified seller'
            : matchingPosts.some((post) => post.authorVerified)
              ? 'Verified profile'
              : undefined
        }
        badge={isMerchantProfile && !publicProfile?.verified ? (
          <span className="rounded-full bg-[var(--pm-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--pm-muted)]">
            Seller profile
          </span>
        ) : undefined}
        secondaryMeta={(
          <>
            {isMerchantProfile && publicProfile?.category && (
              <span>{publicProfile.category}</span>
            )}
            {isMerchantProfile && publicProfile?.isOpen !== undefined && (
              <span className={publicProfile.isOpen ? 'font-semibold text-[var(--pm-success)]' : 'font-semibold text-[var(--pm-danger)]'}>
                {publicProfile.isOpen ? 'Open now' : 'Closed'}
              </span>
            )}
            {typeof publicProfile?.rating === 'number' && (
              <span className="font-semibold text-[var(--pm-text)]">★ {publicProfile.rating.toFixed(1)}</span>
            )}
          </>
        )}
        actions={(
          <>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--pm-surface)] px-4 text-sm font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
            >
              {copiedLink ? <Check className="h-4 w-4 text-[var(--pm-success)]" /> : <Share2 className="h-4 w-4" />}
              <span>{copiedLink ? 'Link copied' : 'Share profile'}</span>
            </button>

            <Link
              to="/portal/messages"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--pm-accent)] px-4 text-sm font-semibold text-[var(--pm-accent-fg)] hover:bg-[var(--pm-accent-hover)]"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Message</span>
            </Link>

            {isOwner && currentUser.isVendor && (
              <Link
                to="/portal/seller"
                className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--pm-success)] px-4 text-sm font-semibold text-white hover:opacity-90 sm:col-span-1"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Seller Central</span>
              </Link>
            )}
          </>
        )}
        stats={(
          <div className="flex min-h-12 items-center gap-4 text-sm text-[var(--pm-muted)]">
            <span><strong className="text-[var(--pm-text)]">{matchingPosts.length}</strong> {matchingPosts.length === 1 ? 'post' : 'posts'}</span>
            <span><strong className="text-[var(--pm-text)]">{matchingPosts.filter((post) => post.mediaUrl?.trim()).length}</strong> photos</span>
            {isMerchantProfile && (
              <span><strong className="text-[var(--pm-text)]">{matchingProducts.length}</strong> products</span>
            )}
          </div>
        )}
        tabs={(
          <div className="flex items-center gap-1 overflow-x-auto px-3 no-scrollbar sm:px-6" role="group" aria-label="Public profile sections">
            {profileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={`min-h-12 shrink-0 border-b-[3px] px-4 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--pm-accent)] text-[var(--pm-accent)]'
                    : 'border-transparent text-[var(--pm-muted)] hover:bg-[var(--pm-card-hover)] hover:text-[var(--pm-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        belowTabs={(
          <div className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-3">
            <div className="relative sm:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pm-muted)]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${resolvedHandle}'s profile...`}
                aria-label={`Search ${resolvedHandle}'s profile`}
                className="min-h-10 w-full rounded-lg border border-[var(--pm-border)] bg-[var(--pm-input)] py-2 pl-10 pr-4 text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] outline-none focus:border-[var(--pm-accent)]"
              />
            </div>
          </div>
        )}
      />

      {loading ? (
        <div className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-10 text-center text-sm text-[var(--pm-muted)]" role="status">
          Loading profile...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Shop Products Section */}
          {(activeTab === 'all' || activeTab === 'products') && (isMerchantProfile || matchingProducts.length > 0) && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-[var(--pm-text)] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--pm-accent)]" />
                  <span>Shop & Wholesale Catalog</span>
                </h2>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--pm-surface)] border border-[var(--pm-border)]">
                  {(['all', 'retail', 'wholesale'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModeFilter(m)}
                      aria-pressed={modeFilter === m}
                      className={`min-h-9 px-3 rounded-md text-xs font-bold capitalize cursor-pointer ${
                        modeFilter === m
                          ? 'bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] shadow-xs'
                          : 'text-[var(--pm-muted)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {matchingProducts.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] text-xs text-[var(--pm-muted)] text-center">
                  No active shop products listed under {resolvedHandle} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matchingProducts.map((item) => (
                    <ContentCard
                      key={item.id}
                      className="flex flex-col justify-between space-y-2.5 p-2.5"
                    >
                      <div className="space-y-2.5">
                        <ContentCardMedia className="aspect-[4/3] rounded-xl">
                          <img
                            src={safeMediaSrc(item.imageUrl, DEFAULT_AVATAR_URL)}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </ContentCardMedia>
                        <ProductCardActionRow
                          item={item}
                          isBn={isBn}
                          onAddToCart={(product, isWholesale) =>
                            onAddToCart(product, product.minWholesaleQty || 1, isWholesale)
                          }
                          className="-mx-2.5 -mt-2.5"
                        />
                        <div className="space-y-1">
                          <p className="text-xs text-[var(--pm-muted)]">
                            {item.category} · {(item.tradeMode || item.type).toUpperCase()}
                          </p>
                          <Link
                            to={`/hub/marketplace/product/${encodeURIComponent(item.id)}`}
                            className="text-sm font-bold text-[var(--pm-text)] hover:text-[var(--pm-accent)] line-clamp-1 block"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-[var(--pm-muted)] line-clamp-2">{item.description}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--pm-border)] flex items-center justify-between">
                        <span className="text-base font-mono tabular-nums font-bold text-[var(--pm-text)]">
                          ৳{item.price.toLocaleString()}
                        </span>
                        <Link
                          to={`/hub/marketplace/product/${encodeURIComponent(item.id)}`}
                          className="min-h-10 rounded-xl px-3.5 flex items-center text-xs font-semibold text-[var(--pm-accent)] hover:bg-[var(--pm-card-hover)]"
                        >
                          {isBn ? 'পণ্য দেখুন' : 'View product'}
                        </Link>
                      </div>
                    </ContentCard>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Bookable Services Section */}
          {(activeTab === 'all' || activeTab === 'services') && (isMerchantProfile || matchingServices.length > 0) && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-[var(--pm-text)] flex items-center gap-2 px-1">
                <Wrench className="w-4 h-4 text-[var(--pm-success)]" />
                <span>Bookable Services</span>
              </h2>
              {matchingServices.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] text-xs text-[var(--pm-muted)] text-center">
                  No bookable services listed under {resolvedHandle}.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {matchingServices.map((srv) => (
                    <ServiceCard
                      key={srv.id}
                      service={srv}
                      onClick={(s) => setSelectedService(s)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Social Posts Section */}
          {(activeTab === 'all' || activeTab === 'posts') && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-[var(--pm-text)] flex items-center gap-2 px-1">
                <MessageSquare className="w-4 h-4 text-[var(--pm-accent)]" />
                <span>Posts</span>
              </h2>
              {filteredPosts.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] text-xs text-[var(--pm-muted)] text-center">
                  {searchQuery.trim()
                    ? `No posts match "${searchQuery.trim()}".`
                    : `No public posts shared under ${resolvedHandle} yet.`}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      isSaved={savedPostIds.includes(post.id)}
                      onReact={onReact}
                      onAddComment={onAddComment}
                      onToggleSave={onToggleSavedPost}
                      onAddToCart={(item) => onAddToCart(item, 1, item.type === 'wholesale')}
                      commerceItems={commerceItems}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'photos' && (
            <section className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-4 sm:p-6">
              <h2 className="mb-4 text-xl font-bold text-[var(--pm-text)]">Photos</h2>
              {matchingPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {matchingPhotos.map((post) => (
                    <figure key={post.id} className="overflow-hidden rounded-lg bg-[var(--pm-surface)]">
                      <img
                        src={safeMediaSrc(post.mediaUrl, DEFAULT_AVATAR_URL)}
                        alt={post.content || `${resolvedDisplayName}'s photo`}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-[var(--pm-surface)] px-5 py-10 text-center">
                  <ImageIcon className="mx-auto h-8 w-8 text-[var(--pm-muted)]" />
                  <p className="mt-3 text-sm text-[var(--pm-muted)]">
                    {searchQuery.trim() ? 'No photos match your search.' : 'No photos shared yet.'}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {onBookService && (
        <ServiceBookingModal
          selectedService={selectedService}
          onClose={() => setSelectedService(null)}
          onBookService={onBookService}
          currentUser={currentUser}
          onDeductBalance={onDeductBalance}
        />
      )}
    </div>
  );
};
