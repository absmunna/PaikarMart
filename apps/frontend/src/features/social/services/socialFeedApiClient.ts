import type { SocialPost } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type FeedSource = 'supabase' | 'api' | 'fallback';

export interface SocialFeedResult {
  posts: SocialPost[];
  source: FeedSource;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80';

function formatRelativeTimestamp(rawDate?: string): string {
  if (!rawDate) return 'Just now';
  const parsed = Date.parse(rawDate);
  if (Number.isNaN(parsed)) return rawDate;

  const diffSeconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(parsed).toLocaleDateString();
}

export function normalizeFeedPost(raw: any, index = 0): SocialPost {
  const authorName =
    raw?.authorName ||
    raw?.author_name ||
    raw?.profiles?.full_name ||
    'PaikarMart Member';
  const rawReactions = raw?.reactionsCount;

  return {
    id: String(raw?.id || `post_feed_${Date.now()}_${index}`),
    authorId: String(raw?.authorId || raw?.author_id || 'paikarmart_member'),
    authorName: String(authorName),
    authorHandle:
      raw?.authorHandle ||
      raw?.author_handle ||
      raw?.profiles?.handle ||
      undefined,
    authorAvatar: String(
      raw?.authorAvatar ||
        raw?.author_avatar ||
        raw?.profiles?.avatar_url ||
        DEFAULT_AVATAR
    ),
    authorVerified:
      typeof raw?.authorVerified === 'boolean'
        ? raw.authorVerified
        : Boolean(raw?.profiles?.is_verified),
    timestamp: raw?.timestamp
      ? String(raw.timestamp)
      : formatRelativeTimestamp(raw?.created_at),
    content: String(raw?.content || ''),
    mediaUrl: raw?.mediaUrl || raw?.media_url || undefined,
    postType: raw?.postType || raw?.post_type || 'regular',
    taggedProduct: raw?.taggedProduct || undefined,
    reactionsCount: {
      like: Number(rawReactions?.like ?? raw?.likes_count ?? 0),
      love: Number(rawReactions?.love ?? 0),
      care: Number(rawReactions?.care ?? 0),
    },
    userReaction: raw?.userReaction,
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    sharesCount: Number(raw?.sharesCount ?? raw?.shares_count ?? 0),
    isSponsored: Boolean(raw?.isSponsored),
    adNetwork: raw?.adNetwork,
  };
}

export async function fetchSocialFeedResult(
  signal?: AbortSignal
): Promise<SocialFeedResult> {
  try {
    const response = await fetch('/api/feed', {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        posts?: any[];
      };
      if (Array.isArray(payload.posts) && payload.posts.length > 0) {
        return {
          posts: payload.posts.map((row, idx) => normalizeFeedPost(row, idx)),
          source: 'api',
        };
      }
    }
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') {
      return { posts: [], source: 'fallback' };
    }
  }

  // Direct Supabase fallback when frontend has public anon keys configured
  if (isSupabaseConfigured() && !signal?.aborted) {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error && Array.isArray(data) && data.length > 0) {
        return {
          posts: data.map((row, idx) => normalizeFeedPost(row, idx)),
          source: 'supabase',
        };
      }
    } catch {
      // Fall through to cached/initial posts
    }
  }

  return { posts: [], source: 'fallback' };
}
