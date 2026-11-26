import { API_BASE, getAuthHeaders, getFirebaseBearerToken } from '@/shared/services/apiClient';
import type { AppNotification, PortalTab } from '@/types';

async function authHeaders(json = false): Promise<Record<string, string> | null> {
  const token = await getFirebaseBearerToken();
  if (!token) return null;
  return await getAuthHeaders({ json });
}

export async function fetchUserNotificationsApi(): Promise<AppNotification[] | null> {
  try {
    const headers = await authHeaders();
    if (!headers) return null;
    const res = await fetch(`${API_BASE}/api/notifications`, { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as { notifications?: AppNotification[] };
    return Array.isArray(data.notifications) ? data.notifications : null;
  } catch {
    return null;
  }
}

export async function createUserNotificationApi(payload: {
  type: AppNotification['type'];
  title: string;
  message: string;
  actionTab?: PortalTab;
  avatar?: string;
}): Promise<AppNotification | null> {
  try {
    const headers = await authHeaders(true);
    if (!headers) return null;
    const res = await fetch(`${API_BASE}/api/notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { notification?: AppNotification };
    return data.notification || null;
  } catch {
    return null;
  }
}

export async function markNotificationReadApi(id: string): Promise<void> {
  try {
    const headers = await authHeaders();
    if (!headers) return;
    await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      headers,
    });
  } catch {
    // Ignore transient network errors
  }
}

export async function markAllNotificationsReadApi(): Promise<void> {
  try {
    const headers = await authHeaders();
    if (!headers) return;
    await fetch(`${API_BASE}/api/notifications/read-all`, {
      method: 'PATCH',
      headers,
    });
  } catch {
    // Ignore transient network errors
  }
}

export async function clearUserNotificationsApi(): Promise<void> {
  try {
    const headers = await authHeaders();
    if (!headers) return;
    await fetch(`${API_BASE}/api/notifications`, {
      method: 'DELETE',
      headers,
    });
  } catch {
    // Ignore transient network errors
  }
}
