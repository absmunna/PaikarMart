import { useCallback, useEffect, useRef } from 'react';
import type { CommerceItem } from '@/types';
import { API_BASE, getAuthHeaders, getFirebaseBearerToken } from '@/shared/services/apiClient';

export type EngagementEventType = 'product_view' | 'cart_add' | 'search_query' | 'buy_now';

export interface AnalyticsEventRecord {
  event_type: EngagementEventType;
  session_id: string;
  user_id: string | null;
  product_id: string | null;
  product_title: string | null;
  store_id: string | null;
  store_name: string | null;
  category: string | null;
  search_query: string | null;
  quantity: number;
  price_bdt: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MerchantInsightsSummary {
  totalProductViews: number;
  totalCartAdditions: number;
  totalSearchQueries: number;
  totalBuyNows: number;
  addToCartRatePct: number;
  topViewedProducts: Array<{
    productId: string;
    title: string;
    storeId: string | null;
    category: string | null;
    views: number;
    cartAdds: number;
  }>;
  topSearchQueries: Array<{
    query: string;
    count: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    events: number;
  }>;
}

const ANALYTICS_SESSION_KEY = 'paikarmart_analytics_session_v1';
const LOCAL_ANALYTICS_BUFFER_KEY = 'paikarmart_local_analytics_v1';
const MAX_LOCAL_EVENTS = 120;
const PRODUCT_VIEW_DEDUPE_MS = 5000;
const SEARCH_DEBOUNCE_MS = 700;

function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return 'ssr_session';
  try {
    const existing = localStorage.getItem(ANALYTICS_SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `pm_${crypto.randomUUID()}`
        : `pm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ANALYTICS_SESSION_KEY, generated);
    return generated;
  } catch {
    return `pm_mem_${Date.now()}`;
  }
}

function appendLocalAnalyticsEvent(event: AnalyticsEventRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_ANALYTICS_BUFFER_KEY);
    const parsed: AnalyticsEventRecord[] = raw ? JSON.parse(raw) : [];
    const next = [event, ...(Array.isArray(parsed) ? parsed : [])].slice(0, MAX_LOCAL_EVENTS);
    localStorage.setItem(LOCAL_ANALYTICS_BUFFER_KEY, JSON.stringify(next));
  } catch {
    // Ignore localStorage quota/private mode errors
  }
}

export function buildLocalMerchantInsights(storeId?: string): MerchantInsightsSummary {
  let rows: AnalyticsEventRecord[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_ANALYTICS_BUFFER_KEY);
      rows = raw ? (JSON.parse(raw) as AnalyticsEventRecord[]) : [];
    } catch {
      rows = [];
    }
  }

  const scoped = storeId
    ? rows.filter((row) => row.store_id === storeId || row.event_type === 'search_query')
    : rows;

  let totalProductViews = 0;
  let totalCartAdditions = 0;
  let totalSearchQueries = 0;
  let totalBuyNows = 0;

  const productStats = new Map<
    string,
    {
      productId: string;
      title: string;
      storeId: string | null;
      category: string | null;
      views: number;
      cartAdds: number;
    }
  >();
  const searchStats = new Map<string, number>();
  const categoryStats = new Map<string, number>();

  for (const row of scoped) {
    if (row.event_type === 'product_view') totalProductViews += 1;
    if (row.event_type === 'cart_add') totalCartAdditions += 1;
    if (row.event_type === 'search_query') totalSearchQueries += 1;
    if (row.event_type === 'buy_now') totalBuyNows += 1;

    if (row.product_id && row.event_type !== 'search_query') {
      const current = productStats.get(row.product_id) || {
        productId: row.product_id,
        title: row.product_title || row.product_id,
        storeId: row.store_id,
        category: row.category,
        views: 0,
        cartAdds: 0,
      };
      if (row.event_type === 'product_view') current.views += 1;
      if (row.event_type === 'cart_add' || row.event_type === 'buy_now') {
        current.cartAdds += row.quantity || 1;
      }
      productStats.set(row.product_id, current);
    }

    if (row.event_type === 'search_query' && row.search_query) {
      const q = row.search_query.toLowerCase();
      searchStats.set(q, (searchStats.get(q) || 0) + 1);
    }

    if (row.category && row.event_type !== 'search_query') {
      categoryStats.set(row.category, (categoryStats.get(row.category) || 0) + 1);
    }
  }

  const addToCartRatePct =
    totalProductViews > 0
      ? Math.min(100, Math.round(((totalCartAdditions + totalBuyNows) / totalProductViews) * 1000) / 10)
      : 0;

  return {
    totalProductViews,
    totalCartAdditions,
    totalSearchQueries,
    totalBuyNows,
    addToCartRatePct,
    topViewedProducts: Array.from(productStats.values())
      .sort((a, b) => b.views + b.cartAdds * 2 - (a.views + a.cartAdds * 2))
      .slice(0, 6),
    topSearchQueries: Array.from(searchStats.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    categoryBreakdown: Array.from(categoryStats.entries())
      .map(([category, events]) => ({ category, events }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 6),
  };
}

async function dispatchAnalyticsEvent(record: AnalyticsEventRecord): Promise<void> {
  appendLocalAnalyticsEvent(record);

  try {
    const headers = await getAuthHeaders({ json: true });
    await fetch(`${API_BASE}/api/analytics/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(record),
      keepalive: true,
    });
  } catch {
    // Non-blocking analytics transport
  }
}

export async function fetchMerchantInsights(storeId?: string): Promise<MerchantInsightsSummary> {
  const localFallback = buildLocalMerchantInsights(storeId);
  try {
    const token = await getFirebaseBearerToken();
    if (!token) return localFallback;

    const queryString = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    const response = await fetch(`${API_BASE}/api/analytics/merchant-insights${queryString}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return localFallback;
    const payload = (await response.json().catch(() => ({}))) as {
      insights?: MerchantInsightsSummary;
    };
    if (!payload.insights) return localFallback;

    const remote = payload.insights;
    const hasRemoteData =
      remote.totalProductViews > 0 ||
      remote.totalCartAdditions > 0 ||
      remote.totalSearchQueries > 0 ||
      remote.totalBuyNows > 0;

    return hasRemoteData ? remote : localFallback;
  } catch {
    return localFallback;
  }
}

export interface UseEngagementAnalyticsOptions {
  userId?: string | null;
  enabled?: boolean;
}

export function useEngagementAnalytics({
  userId,
  enabled = true,
}: UseEngagementAnalyticsOptions = {}) {
  const sessionIdRef = useRef<string>(getOrCreateAnalyticsSessionId());
  const recentViewsRef = useRef<Map<string, number>>(new Map());
  const searchTimerRef = useRef<number | null>(null);
  const lastTrackedQueryRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (searchTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const trackEvent = useCallback(
    (
      eventType: EngagementEventType,
      partial: Partial<Omit<AnalyticsEventRecord, 'event_type' | 'session_id' | 'created_at'>>
    ) => {
      if (!enabled) return;

      const normalizedUserId =
        userId && userId !== 'guest_buyer' ? userId : null;

      const record: AnalyticsEventRecord = {
        event_type: eventType,
        session_id: sessionIdRef.current,
        user_id: normalizedUserId,
        product_id: partial.product_id ?? null,
        product_title: partial.product_title ?? null,
        store_id: partial.store_id ?? null,
        store_name: partial.store_name ?? null,
        category: partial.category ?? null,
        search_query: partial.search_query ?? null,
        quantity: Math.max(1, partial.quantity ?? 1),
        price_bdt: partial.price_bdt ?? null,
        metadata: partial.metadata ?? {},
        created_at: new Date().toISOString(),
      };

      void dispatchAnalyticsEvent(record);
    },
    [enabled, userId]
  );

  const trackProductView = useCallback(
    (product: CommerceItem | null | undefined, source = 'product_details') => {
      if (!enabled || !product?.id) return;

      const now = Date.now();
      const lastViewedAt = recentViewsRef.current.get(product.id) || 0;
      if (now - lastViewedAt < PRODUCT_VIEW_DEDUPE_MS) {
        return;
      }
      recentViewsRef.current.set(product.id, now);

      trackEvent('product_view', {
        product_id: product.id,
        product_title: product.title,
        store_id: product.storeId || null,
        store_name: product.storeName || null,
        category: product.category || null,
        price_bdt: product.price,
        quantity: 1,
        metadata: {
          tradeMode: product.tradeMode || product.type,
          source,
        },
      });
    },
    [enabled, trackEvent]
  );

  const trackCartAdd = useCallback(
    (
      product: CommerceItem,
      quantity = 1,
      isWholesale = false,
      source = 'cart_add'
    ) => {
      if (!enabled || !product?.id) return;

      trackEvent('cart_add', {
        product_id: product.id,
        product_title: product.title,
        store_id: product.storeId || null,
        store_name: product.storeName || null,
        category: product.category || null,
        price_bdt: product.price,
        quantity,
        metadata: {
          isWholesale,
          source,
        },
      });
    },
    [enabled, trackEvent]
  );

  const trackBuyNow = useCallback(
    (
      product: CommerceItem,
      quantity = 1,
      isWholesale = false
    ) => {
      if (!enabled || !product?.id) return;

      trackEvent('buy_now', {
        product_id: product.id,
        product_title: product.title,
        store_id: product.storeId || null,
        store_name: product.storeName || null,
        category: product.category || null,
        price_bdt: product.price,
        quantity,
        metadata: {
          isWholesale,
        },
      });
    },
    [enabled, trackEvent]
  );

  const trackSearchQuery = useCallback(
    (query: string, metadata: Record<string, unknown> = {}) => {
      if (!enabled) return;

      if (searchTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(searchTimerRef.current);
      }

      const trimmed = query.trim();
      if (trimmed.length < 2) {
        return;
      }

      const normalized = trimmed.toLowerCase();
      if (normalized === lastTrackedQueryRef.current) {
        return;
      }

      if (typeof window === 'undefined') return;
      searchTimerRef.current = window.setTimeout(() => {
        lastTrackedQueryRef.current = normalized;
        trackEvent('search_query', {
          search_query: trimmed,
          metadata,
        });
      }, SEARCH_DEBOUNCE_MS);
    },
    [enabled, trackEvent]
  );

  return {
    trackEvent,
    trackProductView,
    trackCartAdd,
    trackBuyNow,
    trackSearchQuery,
  };
}
