import { Router } from 'express';
import type { Request, Response } from 'express';
import { isPrivilegedRole, requireFirebaseAuth } from '../../middleware/requireFirebaseAuth.js';
import { supabase, supabaseAdmin } from '../../services/dbService.js';
import { getStoreOwnerId } from '../vendors/vendorService.js';

export const analyticsRouter = Router();

const VALID_EVENT_TYPES = new Set(['product_view', 'cart_add', 'search_query', 'buy_now']);

export interface StoredAnalyticsRow {
  event_type: 'product_view' | 'cart_add' | 'search_query' | 'buy_now';
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

const inMemoryAnalyticsBuffer: StoredAnalyticsRow[] = [];
const MAX_BUFFER_EVENTS = 500;

function sanitizeOptionalString(value: unknown, maxLen = 160): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : null;
}

function sanitizeEvent(raw: any): StoredAnalyticsRow | null {
  const eventType = String(raw?.event_type || raw?.eventType || '').trim();
  if (!VALID_EVENT_TYPES.has(eventType)) {
    return null;
  }

  const sessionId = sanitizeOptionalString(raw?.session_id || raw?.sessionId, 120) || 'guest_session';
  const rawQty = Number(raw?.quantity ?? 1);
  const quantity = Number.isFinite(rawQty) && rawQty >= 1 ? Math.min(Math.round(rawQty), 100000) : 1;
  const rawPrice = raw?.price_bdt ?? raw?.priceBdt;
  const parsedPrice = rawPrice !== undefined && rawPrice !== null ? Number(rawPrice) : null;
  const priceBdt = parsedPrice !== null && Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null;

  const metadata =
    raw?.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
      ? raw.metadata
      : {};

  return {
    event_type: eventType as StoredAnalyticsRow['event_type'],
    session_id: sessionId,
    user_id: sanitizeOptionalString(raw?.user_id || raw?.userId, 120),
    product_id: sanitizeOptionalString(raw?.product_id || raw?.productId, 120),
    product_title: sanitizeOptionalString(raw?.product_title || raw?.productTitle, 200),
    store_id: sanitizeOptionalString(raw?.store_id || raw?.storeId, 120),
    store_name: sanitizeOptionalString(raw?.store_name || raw?.storeName, 160),
    category: sanitizeOptionalString(raw?.category, 100),
    search_query: sanitizeOptionalString(raw?.search_query || raw?.searchQuery, 160),
    quantity,
    price_bdt: priceBdt,
    metadata,
    created_at: new Date().toISOString(),
  };
}

function aggregateMerchantInsights(rows: StoredAnalyticsRow[], storeId?: string) {
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

    if (row.product_id && (row.event_type === 'product_view' || row.event_type === 'cart_add' || row.event_type === 'buy_now')) {
      const existing = productStats.get(row.product_id) || {
        productId: row.product_id,
        title: row.product_title || row.product_id,
        storeId: row.store_id,
        category: row.category,
        views: 0,
        cartAdds: 0,
      };
      if (row.event_type === 'product_view') existing.views += 1;
      if (row.event_type === 'cart_add' || row.event_type === 'buy_now') existing.cartAdds += row.quantity || 1;
      productStats.set(row.product_id, existing);
    }

    if (row.event_type === 'search_query' && row.search_query) {
      const normalized = row.search_query.toLowerCase();
      searchStats.set(normalized, (searchStats.get(normalized) || 0) + 1);
    }

    if (row.category && row.event_type !== 'search_query') {
      categoryStats.set(row.category, (categoryStats.get(row.category) || 0) + 1);
    }
  }

  const topViewedProducts = Array.from(productStats.values())
    .sort((a, b) => b.views + b.cartAdds * 2 - (a.views + a.cartAdds * 2))
    .slice(0, 6);

  const topSearchQueries = Array.from(searchStats.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const categoryBreakdown = Array.from(categoryStats.entries())
    .map(([category, events]) => ({ category, events }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 6);

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
    topViewedProducts,
    topSearchQueries,
    categoryBreakdown,
  };
}

analyticsRouter.post('/events', async (req: Request, res: Response) => {
  const incoming = Array.isArray(req.body?.events) ? req.body.events : [req.body];
  const sanitizedRows = incoming
    .map(sanitizeEvent)
    .filter((row: StoredAnalyticsRow | null): row is StoredAnalyticsRow => Boolean(row))
    .slice(0, 25);

  if (sanitizedRows.length === 0) {
    res.status(400).json({ error: 'Valid engagement event payload required.' });
    return;
  }

  for (const row of sanitizedRows) {
    inMemoryAnalyticsBuffer.unshift(row);
  }
  if (inMemoryAnalyticsBuffer.length > MAX_BUFFER_EVENTS) {
    inMemoryAnalyticsBuffer.length = MAX_BUFFER_EVENTS;
  }

  const client = supabaseAdmin || supabase;
  let persistedToSupabase = false;

  if (client) {
    try {
      const insertPayload = sanitizedRows.map(({ created_at: _ignored, ...dbRow }) => dbRow);
      const { error } = await client.from('analytics').insert(insertPayload);
      if (!error) {
        persistedToSupabase = true;
      } else {
        console.warn('Supabase analytics insert notice:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase analytics insert error:', err?.message || err);
    }
  }

  res.status(201).json({
    success: true,
    recorded: sanitizedRows.length,
    persistedToSupabase,
  });
});

analyticsRouter.get('/merchant-insights', requireFirebaseAuth, async (req: Request, res: Response) => {
  const requestedStoreId =
    typeof req.query.storeId === 'string' && req.query.storeId.trim()
      ? req.query.storeId.trim()
      : undefined;

  if (requestedStoreId) {
    const ownerId = getStoreOwnerId(requestedStoreId);
    if (ownerId && ownerId !== res.locals.auth.uid && !isPrivilegedRole(res.locals.auth)) {
      res.status(403).json({ error: 'Forbidden: Not authorized to view merchant insights for this store.' });
      return;
    }
  }

  const client = supabaseAdmin || supabase;
  let source: 'supabase' | 'memory' = 'memory';
  let rows: StoredAnalyticsRow[] = inMemoryAnalyticsBuffer;

  if (client) {
    try {
      let query = client
        .from('analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (requestedStoreId) {
        query = query.or(`store_id.eq.${requestedStoreId},event_type.eq.search_query`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        source = 'supabase';
        rows = data as StoredAnalyticsRow[];
      }
    } catch (err: any) {
      console.warn('Supabase merchant insights query notice:', err?.message || err);
    }
  }

  const insights = aggregateMerchantInsights(rows, requestedStoreId);
  res.json({
    success: true,
    source,
    insights,
  });
});
