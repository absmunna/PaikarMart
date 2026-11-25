import { supabaseAdmin } from '../../services/dbService.js';

export type ServerNotificationType = 'order' | 'booking' | 'social' | 'system' | 'wallet';

export interface ServerNotificationRecord {
  id: string;
  authUid: string;
  type: ServerNotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionTab?: string;
  linkId?: string;
  avatar?: string;
  createdAt: string;
}

const VALID_TYPES = new Set<ServerNotificationType>([
  'order',
  'booking',
  'social',
  'system',
  'wallet',
]);

const memoryNotificationStore = new Map<string, ServerNotificationRecord[]>();

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return 'Just now';
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function mapSupabaseRow(row: Record<string, any>): ServerNotificationRecord {
  const createdAt = String(row.created_at || new Date().toISOString());
  const rawType = String(row.type || 'system') as ServerNotificationType;
  return {
    id: String(row.id),
    authUid: String(row.auth_uid),
    type: VALID_TYPES.has(rawType) ? rawType : 'system',
    title: String(row.title || 'Notification'),
    message: String(row.message || ''),
    timestamp: formatRelativeTime(createdAt),
    read: Boolean(row.read),
    actionTab: row.action_tab ? String(row.action_tab) : undefined,
    linkId: row.link_id ? String(row.link_id) : undefined,
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt,
  };
}

function getMemoryList(authUid: string): ServerNotificationRecord[] {
  let list = memoryNotificationStore.get(authUid);
  if (!list) {
    list = [];
    memoryNotificationStore.set(authUid, list);
  }
  return list;
}

export async function listUserNotifications(authUid: string): Promise<{
  source: 'supabase' | 'memory';
  notifications: ServerNotificationRecord[];
  unreadCount: number;
}> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('auth_uid', authUid)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        const notifications = data.map(mapSupabaseRow);
        return {
          source: 'supabase',
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        };
      }
    } catch {
      // Fallback gracefully if notifications table has not been migrated yet
    }
  }

  const mem = getMemoryList(authUid).map((n) => ({
    ...n,
    timestamp: formatRelativeTime(n.createdAt),
  }));
  return {
    source: 'memory',
    notifications: mem,
    unreadCount: mem.filter((n) => !n.read).length,
  };
}

export async function createUserNotification(params: {
  authUid: string;
  type: ServerNotificationType;
  title: string;
  message: string;
  actionTab?: string;
  linkId?: string;
  avatar?: string;
}): Promise<{ source: 'supabase' | 'memory'; notification: ServerNotificationRecord }> {
  const safeType: ServerNotificationType = VALID_TYPES.has(params.type) ? params.type : 'system';
  const safeTitle = String(params.title || '').trim().slice(0, 120) || 'Update';
  const safeMessage = String(params.message || '').trim().slice(0, 500);
  const safeActionTab = params.actionTab ? String(params.actionTab).slice(0, 40) : undefined;
  const safeLinkId = params.linkId ? String(params.linkId).slice(0, 120) : undefined;
  const safeAvatar = params.avatar ? String(params.avatar).slice(0, 512) : undefined;
  const nowIso = new Date().toISOString();

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          auth_uid: params.authUid,
          type: safeType,
          title: safeTitle,
          message: safeMessage,
          read: false,
          action_tab: safeActionTab || null,
          link_id: safeLinkId || null,
          avatar: safeAvatar || null,
        })
        .select('*')
        .single();

      if (!error && data) {
        return {
          source: 'supabase',
          notification: mapSupabaseRow(data),
        };
      }
    } catch {
      // Fallback gracefully to in-memory store
    }
  }

  const record: ServerNotificationRecord = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    authUid: params.authUid,
    type: safeType,
    title: safeTitle,
    message: safeMessage,
    timestamp: 'Just now',
    read: false,
    actionTab: safeActionTab,
    linkId: safeLinkId,
    avatar: safeAvatar,
    createdAt: nowIso,
  };

  const list = getMemoryList(params.authUid);
  list.unshift(record);
  if (list.length > 50) list.length = 50;

  return { source: 'memory', notification: record };
}

export async function markNotificationRead(authUid: string, notificationId: string): Promise<boolean> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('auth_uid', authUid)
        .select('id')
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    } catch {
      // Fallback to in-memory update
    }
  }

  const list = getMemoryList(authUid);
  const target = list.find((n) => n.id === notificationId);
  if (target) {
    target.read = true;
    return true;
  }
  return false;
}

export async function markAllNotificationsRead(authUid: string): Promise<void> {
  if (supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('auth_uid', authUid)
        .eq('read', false);
    } catch {
      // Fallback to in-memory update
    }
  }

  const list = getMemoryList(authUid);
  for (const item of list) {
    item.read = true;
  }
}

export async function clearUserNotifications(authUid: string): Promise<void> {
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('notifications').delete().eq('auth_uid', authUid);
    } catch {
      // Fallback to in-memory delete
    }
  }

  memoryNotificationStore.set(authUid, []);
}
