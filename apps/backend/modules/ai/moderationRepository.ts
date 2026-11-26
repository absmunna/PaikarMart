import { isLiveDatabaseConfigured } from '../../config/env.js';
import { supabaseAdmin } from '../../services/dbService.js';
import { logger } from '../../services/logger.js';

export interface FlaggedPostRecord {
  id: string;
  authorUid: string;
  contentExcerpt: string;
  flaggedKeywords: string[];
  status: 'pending_human_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

const memoryFlaggedPosts: FlaggedPostRecord[] = [];

function mapDbFlaggedPost(row: Record<string, any>): FlaggedPostRecord {
  return {
    id: String(row.id),
    authorUid: String(row.author_uid),
    contentExcerpt: String(row.content_excerpt || ''),
    flaggedKeywords: Array.isArray(row.flagged_keywords)
      ? row.flagged_keywords.map((item) => String(item))
      : [],
    status: (row.status || 'pending_human_review') as FlaggedPostRecord['status'],
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
    createdAt: String(row.created_at),
  };
}

export function clearMemoryFlaggedPostsForTest(): void {
  memoryFlaggedPosts.length = 0;
}

export async function enqueueFlaggedPost(
  record: FlaggedPostRecord
): Promise<FlaggedPostRecord> {
  if (supabaseAdmin && isLiveDatabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('flagged_posts')
      .insert({
        id: record.id,
        author_uid: record.authorUid,
        content_excerpt: record.contentExcerpt,
        flagged_keywords: record.flaggedKeywords,
        status: record.status,
        created_at: record.createdAt,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('Failed to persist flagged post in Supabase', {
        module: 'ai',
        action: 'enqueueFlaggedPost',
        error: error.message,
      });
      throw new Error('MODERATION_PERSISTENCE_FAILED');
    }
    if (data) {
      return mapDbFlaggedPost(data);
    }
  }

  memoryFlaggedPosts.unshift(record);
  if (memoryFlaggedPosts.length > 200) {
    memoryFlaggedPosts.length = 200;
  }
  return record;
}

export async function listFlaggedPosts(limit = 100): Promise<FlaggedPostRecord[]> {
  if (supabaseAdmin && isLiveDatabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('flagged_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list flagged posts from Supabase', {
        module: 'ai',
        action: 'listFlaggedPosts',
        error: error.message,
      });
      throw new Error('MODERATION_QUERY_FAILED');
    }

    return Array.isArray(data) ? data.map((row) => mapDbFlaggedPost(row)) : [];
  }

  return memoryFlaggedPosts.slice(0, limit);
}

export async function reviewFlaggedPostRecord(params: {
  id: string;
  decision: 'approved' | 'rejected';
  reviewedBy: string;
}): Promise<FlaggedPostRecord | null> {
  const nowIso = new Date().toISOString();

  if (supabaseAdmin && isLiveDatabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('flagged_posts')
      .update({
        status: params.decision,
        reviewed_by: params.reviewedBy,
        reviewed_at: nowIso,
      })
      .eq('id', params.id)
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('Failed to review flagged post in Supabase', {
        module: 'ai',
        action: 'reviewFlaggedPostRecord',
        postId: params.id,
        error: error.message,
      });
      throw new Error('MODERATION_UPDATE_FAILED');
    }

    return data ? mapDbFlaggedPost(data) : null;
  }

  const target = memoryFlaggedPosts.find((item) => item.id === params.id);
  if (!target) return null;
  target.status = params.decision;
  target.reviewedBy = params.reviewedBy;
  target.reviewedAt = nowIso;
  return target;
}
