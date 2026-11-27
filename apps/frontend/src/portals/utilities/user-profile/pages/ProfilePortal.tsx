import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeHandle } from '@paikarmart/shared';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';
import { 
  User as UserType, 
  SocialPost, 
  Order, 
  ServiceBooking,
} from '@/types';
import { ShieldCheck, Wrench, Eye, Briefcase, GraduationCap, MapPin, Image as ImageIcon } from 'lucide-react';
import { FeedPostCard } from '@/features/social';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart2 } from 'lucide-react';
import { ProfileHeader } from '@/portals/utilities/user-profile/components/ProfileHeader';

interface ProfilePortalProps {
  currentUser: UserType;
  posts: SocialPost[];
  savedPostIds: string[];
  orders: Order[];
  bookings: ServiceBooking[];
  onReact: (postId: string, reaction: any) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onToggleSavedPost: (postId: string) => void;
  onAddToCart: (item: any) => void;
  commerceItems: any[];
}

type ProfileTab = 'posts' | 'about' | 'photos' | 'bookings' | 'analytics';

const SpendingAnalyticsDashboard = React.lazy(() =>
  import('@/portals/utilities/user-profile/components/SpendingAnalyticsDashboard').then((module) => ({
    default: module.SpendingAnalyticsDashboard,
  }))
);

interface ProfileSectionBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

class ProfileSectionBoundary extends React.Component<
  ProfileSectionBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Profile insights failed to load:', error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export const ProfilePortal: React.FC<ProfilePortalProps> = ({
  currentUser,
  posts,
  savedPostIds,
  orders,
  bookings,
  onReact,
  onAddComment,
  onToggleSavedPost,
  onAddToCart,
  commerceItems,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  
  const userPosts = posts.filter(p => p.authorId === currentUser.id || p.authorName === currentUser.name);
  const userPhotos = userPosts.filter((post) => Boolean(post.mediaUrl));
  const profileTabs: { id: ProfileTab; label: string }[] = [
    { id: 'posts', label: isBn ? `পোস্ট (${userPosts.length})` : `Posts (${userPosts.length})` },
    { id: 'about', label: isBn ? 'পরিচিতি' : 'About' },
    { id: 'photos', label: isBn ? `ছবি (${userPhotos.length})` : `Photos (${userPhotos.length})` },
    { id: 'bookings', label: isBn ? `বুকিং (${bookings.length})` : `Bookings (${bookings.length})` },
    { id: 'analytics', label: isBn ? 'ইনসাইটস' : 'Insights' },
  ];

  return (
    <div className="space-y-4 pb-24 sm:space-y-5">
      <ProfileHeader
        displayName={currentUser.name}
        avatar={currentUser.avatar}
        coverImage={currentUser.coverImage}
        handle={currentUser.handle.startsWith('@') ? currentUser.handle : `@${currentUser.handle}`}
        location={currentUser.location}
        bio={currentUser.bio}
        verifiedLabel={currentUser.vendorProfile?.verified ? (isBn ? 'ভেরিফাইড বিক্রেতা' : 'Verified seller') : undefined}
        badge={currentUser.isVendor && !currentUser.vendorProfile?.verified ? (
          <span className="rounded-full bg-[var(--pm-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--pm-muted)]">
            {isBn ? 'বিক্রেতা প্রোফাইল' : 'Seller profile'}
          </span>
        ) : undefined}
        secondaryMeta={currentUser.profession && (
          <span>{currentUser.profession}</span>
        )}
        actions={(
          <Link
            to={`/u/${encodeURIComponent(normalizeHandle(currentUser.vendorProfile?.handle || currentUser.vendorProfile?.storeName || currentUser.handle || currentUser.name))}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--pm-surface)] px-4 text-sm font-bold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
          >
            <Eye className="h-4 w-4" />
            <span>{isBn ? 'পাবলিক প্রোফাইল' : 'View public profile'}</span>
          </Link>
        )}
        stats={(
          <div className="flex min-h-12 items-center gap-4 text-sm text-[var(--pm-muted)]">
            <span><strong className="text-[var(--pm-text)]">{userPosts.length}</strong> {isBn ? 'পোস্ট' : userPosts.length === 1 ? 'post' : 'posts'}</span>
            <span><strong className="text-[var(--pm-text)]">{userPhotos.length}</strong> {isBn ? 'ছবি' : 'photos'}</span>
          </div>
        )}
        tabs={(
          <div className="flex gap-1 overflow-x-auto px-3 no-scrollbar sm:px-6" role="group" aria-label={isBn ? 'প্রোফাইল বিভাগ' : 'Profile sections'}>
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
      />

      {activeTab === 'posts' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.35fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-4">
              <h2 className="text-lg font-bold text-[var(--pm-text)]">{isBn ? 'পরিচিতি' : 'Intro'}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">
                {currentUser.bio || (isBn ? 'এখনও কোনো পরিচিতি যোগ করা হয়নি।' : 'No introduction added yet.')}
              </p>
              <div className="mt-4 space-y-3 border-t border-[var(--pm-border)] pt-4 text-sm">
                {currentUser.location && (
                  <p className="flex items-center gap-2 text-[var(--pm-text)]">
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--pm-muted)]" />
                    <span>{currentUser.location}</span>
                  </p>
                )}
                {currentUser.profession && (
                  <p className="flex items-center gap-2 text-[var(--pm-text)]">
                    <Briefcase className="h-4 w-4 shrink-0 text-[var(--pm-muted)]" />
                    <span>{currentUser.profession}</span>
                  </p>
                )}
                {currentUser.education && (
                  <p className="flex items-center gap-2 text-[var(--pm-text)]">
                    <GraduationCap className="h-4 w-4 shrink-0 text-[var(--pm-muted)]" />
                    <span>{currentUser.education}</span>
                  </p>
                )}
                {currentUser.personalVerification?.status === 'verified' && (
                  <p className="flex items-center gap-2 text-[var(--pm-text)]">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--pm-accent)]" />
                    <span>{isBn ? 'পরিচয় যাচাই করা হয়েছে' : 'Identity verified'}</span>
                  </p>
                )}
              </div>
              {currentUser.skills && currentUser.skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--pm-border)] pt-4">
                  {currentUser.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-[var(--pm-surface)] px-3 py-1 text-xs text-[var(--pm-muted)]">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {userPhotos.length > 0 && (
              <section className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[var(--pm-text)]">{isBn ? 'ছবি' : 'Photos'}</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('photos')}
                    className="text-sm font-semibold text-[var(--pm-accent)] hover:underline"
                  >
                    {isBn ? 'সব দেখুন' : 'See all'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
                  {userPhotos.slice(0, 6).map((post) => (
                    <img
                      key={post.id}
                      src={safeMediaSrc(post.mediaUrl, DEFAULT_AVATAR_URL)}
                      alt={isBn ? 'প্রোফাইল পোস্টের ছবি' : 'Profile post'}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ))}
                </div>
              </section>
            )}
          </aside>

          <section className="space-y-4">
            <div className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-4">
              <h2 className="text-lg font-bold text-[var(--pm-text)]">{isBn ? 'পোস্ট' : 'Posts'}</h2>
            </div>
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  isSaved={savedPostIds.includes(post.id)}
                  onReact={onReact}
                  onAddComment={onAddComment}
                  onToggleSave={onToggleSavedPost}
                  onAddToCart={onAddToCart}
                  commerceItems={commerceItems}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-8 text-center">
                <p className="text-sm text-[var(--pm-muted)]">
                  {isBn ? 'আপনার শেয়ার করা পোস্ট এখানে দেখা যাবে।' : 'Posts you share will appear here.'}
                </p>
                <Link
                  to="/portal/social"
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--pm-accent)] px-4 text-sm font-bold text-[var(--pm-accent-fg)] hover:bg-[var(--pm-accent-hover)]"
                >
                  {isBn ? 'ফিডে যান' : 'Open feed'}
                </Link>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'about' && (
        <section className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[var(--pm-text)]">{isBn ? 'পরিচিতি' : 'About'}</h2>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-[var(--pm-muted)]">
            {currentUser.bio || (isBn ? 'এখনও কোনো পরিচিতি যোগ করা হয়নি।' : 'No introduction added yet.')}
          </p>
          <dl className="mt-5 grid gap-4 border-t border-[var(--pm-border)] pt-5 sm:grid-cols-2">
            {[
              { label: isBn ? 'অবস্থান' : 'Location', value: currentUser.location },
              { label: isBn ? 'পেশা' : 'Work', value: currentUser.profession },
              { label: isBn ? 'শিক্ষা' : 'Education', value: currentUser.education },
              { label: isBn ? 'অ্যাকাউন্ট' : 'Account type', value: currentUser.role },
            ].filter((item) => item.value).map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold text-[var(--pm-muted)]">{item.label}</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--pm-text)]">{item.value}</dd>
              </div>
            ))}
          </dl>
          {currentUser.skills && currentUser.skills.length > 0 && (
            <div className="mt-5 border-t border-[var(--pm-border)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--pm-text)]">{isBn ? 'দক্ষতা ও আগ্রহ' : 'Skills & interests'}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentUser.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-[var(--pm-surface)] px-3 py-1.5 text-sm text-[var(--pm-muted)]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'photos' && (
        <section className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-4 sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-[var(--pm-text)]">{isBn ? 'ছবি' : 'Photos'}</h2>
          {userPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {userPhotos.map((post) => (
                <figure key={post.id} className="overflow-hidden rounded-lg bg-[var(--pm-surface)]">
                  <img
                    src={safeMediaSrc(post.mediaUrl, DEFAULT_AVATAR_URL)}
                    alt={post.content}
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
                {isBn ? 'এখনও কোনো ছবি শেয়ার করা হয়নি।' : 'No photos shared yet.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className="mt-3 text-sm font-semibold text-[var(--pm-accent)] hover:underline"
              >
                {isBn ? 'পোস্টে ফিরুন' : 'Back to posts'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Tab Content 1: Recharts Spending & Order History Analytics */}
      {activeTab === 'analytics' && (
        <ProfileSectionBoundary
          fallback={(
            <section role="alert" className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-6 text-center">
              <BarChart2 className="mx-auto h-8 w-8 text-[var(--pm-muted)]" />
              <h2 className="mt-3 text-base font-semibold text-[var(--pm-text)]">
                {isBn ? 'ইনসাইটস লোড করা যায়নি' : 'Insights could not be loaded'}
              </h2>
              <p className="mt-1 text-sm text-[var(--pm-muted)]">
                {isBn ? 'আপনার প্রোফাইলের অন্য অংশগুলো ব্যবহার করতে পারবেন।' : 'Your profile is still available while this section is unavailable.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className="mt-4 min-h-10 rounded-lg bg-[var(--pm-surface)] px-4 text-sm font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
              >
                {isBn ? 'প্রোফাইলে ফিরুন' : 'Back to profile'}
              </button>
            </section>
          )}
        >
          <React.Suspense
            fallback={(
              <div role="status" aria-label={isBn ? 'ইনসাইটস লোড হচ্ছে' : 'Loading insights'} className="space-y-4">
                <span className="sr-only">{isBn ? 'ইনসাইটস লোড হচ্ছে' : 'Loading insights'}</span>
                <div className="h-28 animate-pulse rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] motion-reduce:animate-none" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-64 animate-pulse rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] motion-reduce:animate-none" />
                  <div className="h-64 animate-pulse rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] motion-reduce:animate-none" />
                </div>
              </div>
            )}
          >
            <SpendingAnalyticsDashboard orders={orders} />
          </React.Suspense>
        </ProfileSectionBoundary>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length > 0 ? (
            bookings.map(booking => (
              <div key={booking.id} className="bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--pm-border)] pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--pm-success)]">Booking #{booking.id}</span>
                    <h4 className="text-sm font-bold text-[var(--pm-text)]">{booking.serviceTitle}</h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] text-xs font-bold uppercase">
                    {booking.status}
                  </span>
                </div>
                <div className="text-xs text-[var(--pm-muted)] space-y-1">
                  <p>Provider: <strong className="text-[var(--pm-text)]">{booking.providerName}</strong></p>
                  <p>Schedule: <strong className="text-[var(--pm-text)]">{booking.date} · {booking.timeSlot}</strong></p>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-3xl p-12 text-center space-y-3">
              <Wrench className="w-10 h-10 text-[var(--pm-muted)] mx-auto" />
              <p className="text-[var(--pm-muted)] text-sm font-medium">No service bookings yet. Explore Nearby Services!</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
