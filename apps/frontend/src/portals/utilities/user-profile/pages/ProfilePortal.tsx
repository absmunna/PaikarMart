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
import { ShieldCheck, Edit3, Wrench, Eye, Briefcase, GraduationCap, MapPin, Image as ImageIcon } from 'lucide-react';
import { FeedPostCard } from '@/features/social';
import { SpendingAnalyticsDashboard } from '@/portals/utilities/user-profile/components/SpendingAnalyticsDashboard';
import { SavedAddressesPage } from '@/portals/utilities/user-profile/components/account';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, syncAuthenticatedProfile } from '@/features/auth';
import { updateProfile as updateFirebaseProfile, updateUserProfileToFirestore, uploadProfileAvatar } from '@/lib/firebase';
import { ProfileHeader } from '@/portals/utilities/user-profile/components/ProfileHeader';

interface ProfilePortalProps {
  currentUser: UserType;
  onUpdateUser: (updatedUser: UserType) => void;
  posts: SocialPost[];
  orders: Order[];
  bookings: ServiceBooking[];
  onReact: (postId: string, reaction: any) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onAddToCart: (item: any) => void;
  commerceItems: any[];
}

type ProfileTab = 'posts' | 'about' | 'photos' | 'bookings' | 'saved' | 'analytics';

export const ProfilePortal: React.FC<ProfilePortalProps> = ({
  currentUser,
  onUpdateUser,
  posts,
  orders,
  bookings,
  onReact,
  onAddComment,
  onAddToCart,
  commerceItems,
}) => {
  const { language } = useLanguage();
  const { firebaseUser, refetchProfile } = useAuth();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [location, setLocation] = useState(currentUser.location);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isEditing) {
      setName(currentUser.name);
      setLocation(currentUser.location);
      setAvatar(currentUser.avatar);
    }
  }, [currentUser.id, currentUser.name, currentUser.location, currentUser.avatar, isEditing]);
  
  const userPosts = posts.filter(p => p.authorId === currentUser.id || p.authorName === currentUser.name);
  const userPhotos = userPosts.filter((post) => Boolean(post.mediaUrl));
  const profileTabs: { id: ProfileTab; label: string }[] = [
    { id: 'posts', label: isBn ? `পোস্ট (${userPosts.length})` : `Posts (${userPosts.length})` },
    { id: 'about', label: isBn ? 'পরিচিতি' : 'About' },
    { id: 'photos', label: isBn ? `ছবি (${userPhotos.length})` : `Photos (${userPhotos.length})` },
    { id: 'bookings', label: isBn ? `বুকিং (${bookings.length})` : `Bookings (${bookings.length})` },
    { id: 'saved', label: isBn ? 'ঠিকানা' : 'Addresses' },
    { id: 'analytics', label: isBn ? 'ইনসাইটস' : 'Insights' },
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError(null);

    let nextAvatar = avatar;
    try {
      if (avatarFile && firebaseUser) {
        nextAvatar = (await uploadProfileAvatar(avatarFile, firebaseUser.uid)) || avatar;
      }

      if (firebaseUser) {
        await updateFirebaseProfile(firebaseUser, {
          displayName: name,
          ...(nextAvatar ? { photoURL: nextAvatar } : {}),
        });
        await updateUserProfileToFirestore({
          id: firebaseUser.uid,
          email: firebaseUser.email || currentUser.email || '',
          name,
          handle: currentUser.handle,
          role: currentUser.role,
          avatar: nextAvatar,
          location,
          emailVerified: firebaseUser.emailVerified,
        });
        await syncAuthenticatedProfile({
          name,
          handle: currentUser.handle,
          avatar: nextAvatar,
          location,
          phone: currentUser.phone,
        }).catch((err) => console.warn('Supabase profile sync warning:', err));
        await refetchProfile().catch(() => {});
      }

      onUpdateUser({
      ...currentUser,
      name,
      location,
      avatar: nextAvatar,
      });
      setAvatar(nextAvatar);
      setAvatarFile(null);
      setIsEditing(false);
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Profile update failed.');
    }
  };

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
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--pm-accent)] px-4 text-sm font-bold text-[var(--pm-accent-fg)] hover:bg-[var(--pm-accent-hover)]"
            >
              <Edit3 className="h-4 w-4" />
              <span>{isBn ? 'প্রোফাইল সম্পাদনা' : 'Edit profile'}</span>
            </button>
            <Link
              to={`/u/${encodeURIComponent(normalizeHandle(currentUser.vendorProfile?.handle || currentUser.vendorProfile?.storeName || currentUser.handle || currentUser.name))}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--pm-surface)] px-4 text-sm font-bold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
            >
              <Eye className="h-4 w-4" />
              <span>{isBn ? 'পাবলিক প্রোফাইল' : 'View public profile'}</span>
            </Link>
          </>
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
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-4 min-h-10 w-full rounded-lg bg-[var(--pm-surface)] px-4 text-sm font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
              >
                {isBn ? 'প্রোফাইল সম্পাদনা' : 'Edit profile'}
              </button>
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
                  onReact={onReact}
                  onAddComment={onAddComment}
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
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[var(--pm-text)]">{isBn ? 'পরিচিতি' : 'About'}</h2>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="min-h-10 rounded-lg bg-[var(--pm-surface)] px-4 text-sm font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
            >
              {isBn ? 'প্রোফাইল সম্পাদনা' : 'Edit profile'}
            </button>
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
        <SpendingAnalyticsDashboard orders={orders} />
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

      {activeTab === 'saved' && (
        <SavedAddressesPage />
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
          <form onSubmit={handleSaveProfile} className="bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pm-border)]">
              <h3 className="text-base font-bold text-[var(--pm-text)]">Edit Profile</h3>
              <button type="button" onClick={() => setIsEditing(false)} className="text-[var(--pm-muted)] hover:text-[var(--pm-text)] cursor-pointer">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--pm-text)] block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] border border-[var(--pm-border)] focus:border-[var(--pm-accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--pm-text)] block mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] border border-[var(--pm-border)] focus:border-[var(--pm-accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--pm-text)] block mb-1">Profile Photo</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] border border-[var(--pm-border)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--pm-accent-soft)] file:px-2 file:py-1 file:text-xs file:font-bold"
                />
                <p className="mt-1 text-[10px] text-[var(--pm-muted)]">JPG, PNG বা WebP · Firebase Storage configured থাকলে cloud-এ সংরক্ষিত হবে</p>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--pm-text)] block mb-1">Avatar Image URL (fallback)</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] text-xs text-[var(--pm-text)] border border-[var(--pm-border)] focus:border-[var(--pm-accent)] outline-none"
                />
              </div>
            </div>

            {profileSaveError && (
              <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                {profileSaveError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
