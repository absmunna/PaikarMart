import React, { useEffect, useRef, useState } from 'react';
import { StoriesTray } from '@/portals/community/social-feed/components/StoriesTray';
import { PostComposer } from '@/portals/community/social-feed/components/PostComposer';
import { FeedPostCard } from '@/features/social';
import { PersonalVerificationModal } from '@/portals/utilities/user-profile/components/PersonalVerificationModal';
import { useAuth } from '@/features/auth';
import {
  AdMobBanner,
  SocialFeedListSkeleton,
  SocialPostSkeleton,
} from '@/design-system/components';
import { INITIAL_STORIES } from '@/data/mockData';
import { User, SocialPost, CommerceItem, ReactionType, PostType, TaggedProduct, CitizenPostCategory } from '@/types';

interface SocialPortalProps {
  currentUser: User;
  posts: SocialPost[];
  savedPostIds: string[];
  commerceItems: CommerceItem[];
  isLoading?: boolean;
  onCreatePost: (
    content: string,
    taggedProduct?: TaggedProduct,
    mediaUrl?: string,
    postType?: PostType,
    citizenCategory?: CitizenPostCategory,
    aiSafetyVerified?: boolean,
    aiRiskAssessment?: 'safe' | 'low_risk' | 'high_risk_flagged'
  ) => void;
  onReactToPost: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onToggleSavedPost: (postId: string) => void;
  onAddToCart: (item: CommerceItem) => void;
}

export const SocialPortal: React.FC<SocialPortalProps> = ({
  currentUser,
  posts,
  savedPostIds,
  commerceItems,
  isLoading = false,
  onCreatePost,
  onReactToPost,
  onAddComment,
  onToggleSavedPost,
  onAddToCart
}) => {
  const { setCurrentUser } = useAuth();
  const [visibleCount, setVisibleCount] = useState(5);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(5);
  }, [posts.length]);

  const visiblePosts = posts.slice(0, visibleCount);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (isLoading || !sentinel || visibleCount >= posts.length) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + 5, posts.length));
    }, { rootMargin: '280px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, posts.length, visibleCount]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-2 animate-fadeIn">
      {/* Facebook Horizontal Stories Carousel */}
      <StoriesTray
        stories={INITIAL_STORIES}
        currentUser={currentUser}
      />

      {/* "What's on your mind?" Post Composer with Tag Commerce Product */}
      <PostComposer
        currentUser={currentUser}
        commerceItems={commerceItems}
        onCreatePost={onCreatePost}
        onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
      />

      {/* Feed Posts List */}
      {isLoading ? (
        <SocialFeedListSkeleton count={3} />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {visiblePosts.map((post, index) => (
            <React.Fragment key={post.id}>
              <FeedPostCard
                post={post}
                currentUser={currentUser}
                isSaved={savedPostIds.includes(post.id)}
                onReact={onReactToPost}
                onAddComment={onAddComment}
                onToggleSave={onToggleSavedPost}
                onAddToCart={onAddToCart}
                commerceItems={commerceItems}
              />
              {index === 2 && <AdMobBanner />}
            </React.Fragment>
          ))}

          {visiblePosts.length > 0 && visiblePosts.length < 3 && <AdMobBanner />}

          {visibleCount < posts.length && (
            <div ref={loadMoreRef} aria-label="Loading older posts" aria-live="polite">
              <SocialPostSkeleton showMedia={false} />
            </div>
          )}
        </div>
      )}

      <PersonalVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        currentUser={currentUser}
        onVerificationSubmitted={(docType, docNumber) => {
          setCurrentUser((prev) => ({
            ...prev,
            personalVerification: {
              status: 'verified',
              documentType: docType,
              documentNumber: docNumber,
              verifiedAt: new Date().toISOString().split('T')[0],
              verificationBadge: 'Verified Citizen (স্মার্ট নাগরিক)',
            },
            canPostHomemade: true,
            canParticipateBids: true,
            canPostRental: true,
            canPostUsedGoods: true,
          }));
        }}
      />
    </div>
  );
};

