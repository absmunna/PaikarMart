import { useCallback, useEffect, useState } from 'react';
import type {
  CitizenPostCategory,
  PostType,
  ReactionType,
  SocialPost,
  TaggedProduct,
  User,
} from '@/types';
import { INITIAL_POSTS } from '@/data/mockData';
import { loadStoredData, saveStoredData } from '@/lib/supabase';
import { fetchSocialFeedResult } from '../services/socialFeedApiClient';

export interface UseSocialFeedStoreOptions {
  currentUser: User;
  onPostCreated?: (post: SocialPost) => void;
}

export function useSocialFeedStore({ currentUser, onPostCreated }: UseSocialFeedStoreOptions) {
  const [posts, setPosts] = useState<SocialPost[]>(() =>
    loadStoredData('POSTS', INITIAL_POSTS)
  );
  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    const storedIds = loadStoredData<unknown>('SAVED_SOCIAL_POSTS', []);
    return Array.isArray(storedIds)
      ? [...new Set(storedIds.filter((postId): postId is string => typeof postId === 'string'))]
      : [];
  });
  const [isFeedLoading, setIsFeedLoading] = useState(true);

  useEffect(() => {
    saveStoredData('POSTS', posts);
  }, [posts]);

  useEffect(() => {
    saveStoredData('SAVED_SOCIAL_POSTS', savedPostIds);
  }, [savedPostIds]);

  const mergeServerPosts = useCallback((serverPosts: SocialPost[]) => {
    if (!serverPosts.length) return;
    setPosts((prev) => {
      const seenIds = new Set<string>();
      const merged: SocialPost[] = [];
      for (const post of [...serverPosts, ...prev]) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          merged.push(post);
        }
      }
      return merged;
    });
  }, []);

  const refreshServerPosts = useCallback(async (signal?: AbortSignal) => {
    setIsFeedLoading(true);
    try {
      const feedResult = await fetchSocialFeedResult(signal);
      if (signal?.aborted || feedResult.posts.length === 0) return;
      mergeServerPosts(feedResult.posts);
    } finally {
      if (!signal?.aborted) {
        setIsFeedLoading(false);
      }
    }
  }, [mergeServerPosts]);

  const handleCreatePost = useCallback(
    (
      content: string,
      taggedProduct?: TaggedProduct,
      mediaUrl?: string,
      postType: PostType = 'regular',
      citizenCategory: CitizenPostCategory = 'general',
      aiSafetyVerified: boolean = true,
      aiRiskAssessment: 'safe' | 'low_risk' | 'high_risk_flagged' = 'safe'
    ) => {
      const newPost: SocialPost = {
        id: `post_${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatar,
        authorVerified:
          currentUser.isVendor || currentUser.personalVerification?.status === 'verified',
        timestamp: 'Just now',
        content,
        mediaUrl,
        postType,
        citizenCategory,
        aiSafetyVerified,
        aiRiskAssessment,
        taggedProduct,
        reactionsCount: { like: 0, love: 0, care: 0 },
        sharesCount: 0,
        comments: [],
      };

      setPosts((prev) => [newPost, ...prev]);
      onPostCreated?.(newPost);
    },
    [currentUser, onPostCreated]
  );

  const handleReactToPost = useCallback((postId: string, reaction: ReactionType) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;

        const currentRx = p.userReaction;
        const isSame = currentRx === reaction;
        const nextRx = isSame ? undefined : reaction;

        const counts = { ...p.reactionsCount };
        if (currentRx && counts[currentRx as keyof typeof counts] !== undefined) {
          counts[currentRx as keyof typeof counts] = Math.max(
            0,
            counts[currentRx as keyof typeof counts] - 1
          );
        }
        if (nextRx && counts[nextRx as keyof typeof counts] !== undefined) {
          counts[nextRx as keyof typeof counts] = counts[nextRx as keyof typeof counts] + 1;
        }

        return {
          ...p,
          userReaction: nextRx,
          reactionsCount: counts,
        };
      })
    );
  }, []);

  const handleAddComment = useCallback(
    (postId: string, commentText: string) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;

          const newComment = {
            id: `c_${Date.now()}`,
            authorName: currentUser.name,
            authorAvatar: currentUser.avatar,
            content: commentText,
            timestamp: 'Just now',
            likes: 0,
          };

          return {
            ...p,
            comments: [...p.comments, newComment],
          };
        })
      );
    },
    [currentUser]
  );

  const handleToggleSavedPost = useCallback((postId: string) => {
    if (!postId) return;
    setSavedPostIds((prev) =>
      prev.includes(postId)
        ? prev.filter((savedId) => savedId !== postId)
        : [postId, ...prev]
    );
  }, []);

  return {
    posts,
    savedPostIds,
    isFeedLoading,
    setPosts,
    mergeServerPosts,
    refreshServerPosts,
    handleCreatePost,
    handleReactToPost,
    handleAddComment,
    handleToggleSavedPost,
  };
}
