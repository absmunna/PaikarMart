import { auth } from '@/lib/firebase';

export const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function getFirebaseBearerToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function getAuthHeaders(options: {
  json?: boolean;
  requireAuth?: boolean;
  extraHeaders?: HeadersInit;
} = {}): Promise<Record<string, string>> {
  const { json = false, requireAuth = false, extraHeaders } = options;
  const token = await getFirebaseBearerToken();
  if (requireAuth && !token) {
    throw new Error('Authentication required. Please sign in to continue.');
  }

  const normalizedExtra: Record<string, string> = {};
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      normalizedExtra[key] = value;
    });
  }

  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...normalizedExtra,
  };
}

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit;
  requireAuth?: boolean;
  json?: boolean;
}

export async function apiRequest<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    requireAuth = false,
    json = Boolean(options.body && typeof options.body === 'string'),
    headers: extraHeaders,
    ...rest
  } = options;

  const headers = await getAuthHeaders({
    json,
    requireAuth,
    extraHeaders,
  });

  const url = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...rest,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as any)?.details ||
      (data as any)?.error ||
      (data as any)?.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}
