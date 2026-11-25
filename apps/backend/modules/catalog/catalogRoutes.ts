import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { isPrivilegedRole, requireFirebaseAuth, requireRole } from '../../middleware/requireFirebaseAuth.js';
import { resolveProfileUuidByAuthUid, supabaseAdmin } from '../../services/dbService.js';

export const catalogRouter = Router();

const PMIN_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates an Amazon ASIN-style Master Catalog identifier (PMIN-B + 10 chars).
 * Server-side only — clients never invent canonical PMIN codes.
 */
export function generatePmin(): string {
  const bytes = crypto.randomBytes(10);
  let suffix = '';
  for (let i = 0; i < 10; i++) {
    suffix += PMIN_ALPHABET[bytes[i] % PMIN_ALPHABET.length];
  }
  return `PMIN-B${suffix}`;
}

export interface BuyBoxRankableOffer {
  id: string;
  isActive: boolean;
  stockQuantity: number;
  price: number;
  shippingFee?: number;
  sellerVerified?: boolean;
  isBuyBoxWinner?: boolean;
  createdAt?: string;
}

/**
 * Amazon-style Buy-Box winner selector:
 * 1. Active & in-stock (stockQuantity > 0) offers always outrank out-of-stock offers
 * 2. Lowest landed cost (price + shippingFee)
 * 3. Verified merchant priority
 * 4. Lower shippingFee tie-breaker
 * 5. Newer listing tie-breaker
 */
export function rankSellerOffersForBuyBox<T extends BuyBoxRankableOffer>(offers: T[]): Array<T & { isBuyBoxWinner: boolean }> {
  const sorted = [...offers].sort((a, b) => {
    const aAvail = a.isActive && a.stockQuantity > 0 ? 1 : 0;
    const bAvail = b.isActive && b.stockQuantity > 0 ? 1 : 0;
    if (aAvail !== bAvail) return bAvail - aAvail;

    const aLanded = Number(a.price || 0) + Number(a.shippingFee || 0);
    const bLanded = Number(b.price || 0) + Number(b.shippingFee || 0);
    if (aLanded !== bLanded) return aLanded - bLanded;

    const aVerified = a.sellerVerified ? 1 : 0;
    const bVerified = b.sellerVerified ? 1 : 0;
    if (aVerified !== bVerified) return bVerified - aVerified;

    const aShip = Number(a.shippingFee || 0);
    const bShip = Number(b.shippingFee || 0);
    if (aShip !== bShip) return aShip - bShip;

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  let winnerAssigned = false;
  return sorted.map((offer) => {
    const eligible = Boolean(offer.isActive && offer.stockQuantity > 0);
    if (!winnerAssigned && eligible) {
      winnerAssigned = true;
      return { ...offer, isBuyBoxWinner: true };
    }
    return { ...offer, isBuyBoxWinner: false };
  });
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const firstRelation = <T>(value: T | T[] | null | undefined): T | undefined => (
  Array.isArray(value) ? value[0] : value || undefined
);

const isMissingTableError = (err?: { code?: string; message?: string } | null): boolean => {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01' || msg.includes('schema cache') || msg.includes('does not exist');
};

const isMissingColumnError = (err?: { code?: string; message?: string } | null): boolean => {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return code === '42703' || msg.includes('column') && msg.includes('does not exist');
};

const mapListing = (listing: any) => {
  const product = firstRelation(listing.master_product) || {};
  const store = firstRelation(listing.store) || {};
  const images = Array.isArray(listing.seller_real_photos) ? listing.seller_real_photos.filter(Boolean) : [];
  const canonicalImages = Array.isArray(product.canonical_images) ? product.canonical_images.filter(Boolean) : [];
  return {
    id: listing.id,
    masterProductId: listing.master_product_id,
    pmin: product.pmin || listing.pmin || undefined,
    storeId: listing.store_id,
    storeName: store.store_name || 'Verified Store',
    storeHandle: store.handle || undefined,
    type: listing.trade_mode === 'wholesale' ? 'wholesale' : 'retail',
    tradeMode: listing.trade_mode === 'wholesale' ? 'wholesale' : 'retail',
    title: product.title_en || product.title_bn || 'Marketplace Product',
    description: product.description || '',
    price: toNumber(listing.price),
    originalPrice: listing.original_price == null ? undefined : toNumber(listing.original_price),
    shippingFee: listing.shipping_fee == null ? 0 : toNumber(listing.shipping_fee),
    isBuyBoxWinner: Boolean(listing.is_buy_box_winner),
    minWholesaleQty: toNumber(listing.min_wholesale_qty, 1),
    wholesaleTiers: Array.isArray(listing.wholesale_tiers) ? listing.wholesale_tiers : [],
    rating: toNumber(store.rating, 5),
    reviewsCount: 0,
    deliveryEta: listing.delivery_eta || '1-2 Days',
    proximityDistance: undefined,
    imageUrl: images[0] || canonicalImages[0] || '',
    sellerRealPhotos: images,
    galleryImages: [...new Set([...images, ...canonicalImages])],
    brand: product.brand || undefined,
    specifications: product.specifications || {},
    variantOptions: Array.isArray(product.variant_options) ? product.variant_options : [],
    variantOffers: Array.isArray(product.variant_offers) ? product.variant_offers : [],
    category: product.category || store.category || 'General',
    inStock: Boolean(listing.is_active) && toNumber(listing.stock_quantity) > 0,
    isOpen: store.is_open !== false,
    openingHoursLabel: store.opening_hours_label || undefined,
    prepMinutes: store.prep_minutes == null ? undefined : toNumber(store.prep_minutes),
    badge: product.is_verified ? 'Verified catalog' : undefined,
  };
};

const mapStandaloneProduct = (row: any) => {
  const store = firstRelation(row.store) || {};
  const type = String(row.type || 'retail');
  const tradeMode = type === 'wholesale' ? 'wholesale' : 'retail';
  return {
    id: String(row.id),
    masterProductId: row.master_product_id ? String(row.master_product_id) : undefined,
    pmin: row.pmin ? String(row.pmin) : undefined,
    storeId: String(row.store_id || store.id || ''),
    storeName: store.store_name || row.store_name || 'Verified Store',
    storeHandle: store.handle || undefined,
    type: type === 'food' || type === 'grocery' || type === 'service' || type === 'rides' || type === 'wholesale' ? type : 'retail',
    tradeMode,
    title: String(row.title || row.name || 'Marketplace Product'),
    description: String(row.description || ''),
    price: toNumber(row.price),
    originalPrice: row.original_price == null ? undefined : toNumber(row.original_price),
    minWholesaleQty: toNumber(row.min_wholesale_qty, 1),
    wholesaleTiers: Array.isArray(row.wholesale_tiers) ? row.wholesale_tiers : [],
    rating: toNumber(row.rating ?? store.rating, 5),
    reviewsCount: toNumber(row.reviews_count, 0),
    deliveryEta: row.delivery_eta || '1-2 Days',
    imageUrl: String(row.image_url || ''),
    category: String(row.category || store.category || 'General'),
    inStock: row.in_stock !== false,
    isOpen: store.is_open !== false,
    openingHoursLabel: store.opening_hours_label || undefined,
    prepMinutes: store.prep_minutes == null ? undefined : toNumber(store.prep_minutes),
  };
};

const mapMasterProduct = (row: any) => ({
  id: String(row.id),
  pmin: row.pmin ? String(row.pmin) : undefined,
  barcode: row.barcode || undefined,
  titleEn: String(row.title_en || ''),
  titleBn: String(row.title_bn || row.title_en || ''),
  brand: String(row.brand || 'Generic'),
  category: String(row.category || 'General'),
  description: String(row.description || ''),
  canonicalImages: Array.isArray(row.canonical_images) ? row.canonical_images.filter(Boolean) : [],
  specifications: row.specifications && typeof row.specifications === 'object' ? row.specifications : {},
  variantOptions: Array.isArray(row.variant_options) ? row.variant_options : [],
  variantOffers: Array.isArray(row.variant_offers) ? row.variant_offers : [],
  isVerified: Boolean(row.is_verified),
  createdAt: String(row.created_at || new Date().toISOString()).split('T')[0],
});

const mapSellerListingRow = (row: any) => {
  const store = firstRelation(row.store) || {};
  return {
    id: String(row.id),
    masterProductId: String(row.master_product_id),
    pmin: row.pmin ? String(row.pmin) : undefined,
    storeId: String(row.store_id),
    sellerId: String(row.seller_id),
    sellerName: String(store.store_name || 'Verified Merchant'),
    sellerRating: toNumber(store.rating, 5),
    sellerVerified: Boolean(store.is_verified ?? true),
    price: toNumber(row.price),
    originalPrice: row.original_price == null ? undefined : toNumber(row.original_price),
    shippingFee: row.shipping_fee == null ? 0 : toNumber(row.shipping_fee),
    condition: row.condition ? String(row.condition) : 'New',
    fulfillmentType: row.fulfillment_type ? String(row.fulfillment_type) : 'seller_fulfilled',
    isBuyBoxWinner: Boolean(row.is_buy_box_winner),
    stockQuantity: toNumber(row.stock_quantity, 0),
    tradeMode: (row.trade_mode === 'wholesale' ? 'wholesale' : 'retail') as 'retail' | 'wholesale',
    minWholesaleQty: toNumber(row.min_wholesale_qty, 1),
    wholesaleTiers: Array.isArray(row.wholesale_tiers) ? row.wholesale_tiers : [],
    sellerRealPhotos: Array.isArray(row.seller_real_photos) ? row.seller_real_photos : [],
    deliveryEta: String(row.delivery_eta || '1-2 Days'),
    location: String(row.location || 'Dhaka, Bangladesh'),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at || ''),
  };
};

/** Public catalog read model. Never returns seller PII or private credentials. */
catalogRouter.get('/products', async (_req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.json({ products: [], source: 'unconfigured', schemaReady: false });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('seller_listings')
    .select(`
      id, master_product_id, store_id, price, original_price, stock_quantity,
      trade_mode, min_wholesale_qty, wholesale_tiers, seller_real_photos,
      delivery_eta, location, is_active,
      master_product:master_products!inner(*),
      store:stores!inner(store_name, handle, category, rating, is_open, opening_hours_label, prep_minutes, status)
    `)
    .eq('is_active', true)
    .eq('master_product.is_verified', true)
    .eq('store.status', 'active')
    .eq('store.is_verified', true)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!error && Array.isArray(data) && data.length > 0) {
    res.json({ products: data.map(mapListing), source: 'supabase', table: 'seller_listings', schemaReady: true });
    return;
  }

  // Fallback to standalone public.products table if seller_listings is empty or unavailable
  const { data: legacyData, error: legacyErr } = await supabaseAdmin
    .from('products')
    .select(`
      id, store_id, type, title, description, price, original_price,
      min_wholesale_qty, wholesale_tiers, rating, reviews_count, delivery_eta,
      image_url, category, in_stock, metadata, created_at,
      store:stores(id, store_name, handle, category, rating, is_open, opening_hours_label, prep_minutes, status, is_verified)
    `)
    .eq('in_stock', true)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!legacyErr && Array.isArray(legacyData) && legacyData.length > 0) {
    res.json({
      products: legacyData.map(mapStandaloneProduct),
      source: 'supabase',
      table: 'products',
      schemaReady: !isMissingTableError(error),
    });
    return;
  }

  if (isMissingTableError(error) && isMissingTableError(legacyErr)) {
    res.json({
      products: [],
      source: 'schema_missing',
      schemaReady: false,
      error: 'Supabase tables are not created yet. Run supabase/schema.sql in your Supabase SQL Editor.',
    });
    return;
  }

  if (error && !isMissingTableError(error)) {
    console.error('Catalog read failed:', error.message);
    res.status(503).json({
      products: [],
      source: 'error',
      schemaReady: false,
      error: 'Catalog is temporarily unavailable.',
    });
    return;
  }

  res.json({ products: [], source: 'supabase', schemaReady: true });
});

catalogRouter.get('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!supabaseAdmin) {
    res.json({ product: null, source: 'unconfigured' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('seller_listings')
    .select(`
      id, master_product_id, store_id, price, original_price, stock_quantity,
      trade_mode, min_wholesale_qty, wholesale_tiers, seller_real_photos,
      delivery_eta, location, is_active,
      master_product:master_products!inner(*),
      store:stores!inner(store_name, handle, category, rating, is_open, opening_hours_label, prep_minutes, status)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!error && data) {
    res.json({ product: mapListing(data), source: 'supabase' });
    return;
  }

  const { data: legacy } = await supabaseAdmin
    .from('products')
    .select(`
      id, store_id, type, title, description, price, original_price,
      min_wholesale_qty, wholesale_tiers, rating, reviews_count, delivery_eta,
      image_url, category, in_stock, metadata, created_at,
      store:stores(id, store_name, handle, category, rating, is_open, opening_hours_label, prep_minutes)
    `)
    .eq('id', id)
    .maybeSingle();

  if (legacy) {
    res.json({ product: mapStandaloneProduct(legacy), source: 'supabase' });
    return;
  }

  res.status(404).json({ product: null, source: 'supabase', error: 'Product not found' });
});

catalogRouter.get('/master-products', async (_req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.json({ masterProducts: [], source: 'unconfigured' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('master_products')
    .select('*')
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    res.json({
      masterProducts: [],
      source: isMissingTableError(error) ? 'schema_missing' : 'error',
    });
    return;
  }

  res.json({ masterProducts: (data || []).map(mapMasterProduct), source: 'supabase' });
});

catalogRouter.get('/master-products/by-pmin/:pmin', async (req: Request, res: Response) => {
  const normalizedPmin = String(req.params.pmin || '').trim().toUpperCase();
  if (!normalizedPmin) {
    res.status(400).json({ error: 'Valid PMIN code is required.' });
    return;
  }
  if (!supabaseAdmin) {
    res.json({ masterProduct: null, listings: [], buyBoxWinner: null, offerCount: 0, source: 'unconfigured' });
    return;
  }

  const { data: master, error } = await supabaseAdmin
    .from('master_products')
    .select('*')
    .eq('pmin', normalizedPmin)
    .eq('is_verified', true)
    .maybeSingle();

  if (error) {
    res.status(isMissingTableError(error) || isMissingColumnError(error) ? 200 : 500).json({
      masterProduct: null,
      listings: [],
      buyBoxWinner: null,
      offerCount: 0,
      source: isMissingTableError(error) ? 'schema_missing' : 'error',
    });
    return;
  }

  if (!master) {
    res.status(404).json({ masterProduct: null, listings: [], buyBoxWinner: null, offerCount: 0, error: 'Master product not found for PMIN.' });
    return;
  }

  const { data: rawOffers } = await supabaseAdmin
    .from('seller_listings')
    .select(`*, store:stores!inner(store_name, rating, status, is_verified)`)
    .eq('master_product_id', master.id)
    .eq('is_active', true)
    .eq('store.status', 'active')
    .eq('store.is_verified', true);

  const ranked = rankSellerOffersForBuyBox((rawOffers || []).map(mapSellerListingRow));
  const buyBoxWinner = ranked.find((item) => item.isBuyBoxWinner) || ranked[0] || null;

  res.json({
    masterProduct: mapMasterProduct(master),
    listings: ranked,
    buyBoxWinner,
    offerCount: ranked.length,
    source: 'supabase',
  });
});

catalogRouter.get('/listings/by-master/:masterProductId', async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.json({ listings: [], buyBoxWinner: null, offerCount: 0, source: 'unconfigured' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('seller_listings')
    .select(`
      *,
      store:stores!inner(store_name, rating, status, is_verified)
    `)
    .eq('master_product_id', req.params.masterProductId)
    .eq('is_active', true)
    .eq('store.status', 'active')
    .eq('store.is_verified', true)
    .order('price', { ascending: true });

  if (error) {
    res.json({ listings: [], buyBoxWinner: null, offerCount: 0, source: isMissingTableError(error) ? 'schema_missing' : 'error' });
    return;
  }

  const ranked = rankSellerOffersForBuyBox((data || []).map(mapSellerListingRow));
  const buyBoxWinner = ranked.find((item) => item.isBuyBoxWinner) || ranked[0] || null;

  res.json({ listings: ranked, buyBoxWinner, offerCount: ranked.length, source: 'supabase' });
});

catalogRouter.get('/listings/by-pmin/:pmin', async (req: Request, res: Response) => {
  const normalizedPmin = String(req.params.pmin || '').trim().toUpperCase();
  if (!normalizedPmin) {
    res.status(400).json({ error: 'Valid PMIN code is required.' });
    return;
  }
  if (!supabaseAdmin) {
    res.json({ listings: [], buyBoxWinner: null, offerCount: 0, source: 'unconfigured' });
    return;
  }

  const { data: master } = await supabaseAdmin
    .from('master_products')
    .select('id')
    .eq('pmin', normalizedPmin)
    .maybeSingle();

  if (!master?.id) {
    res.json({ listings: [], buyBoxWinner: null, offerCount: 0, source: 'supabase' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('seller_listings')
    .select(`*, store:stores!inner(store_name, rating, status, is_verified)`)
    .eq('master_product_id', master.id)
    .eq('is_active', true)
    .eq('store.status', 'active')
    .eq('store.is_verified', true);

  if (error) {
    res.json({ listings: [], buyBoxWinner: null, offerCount: 0, source: 'error' });
    return;
  }

  const ranked = rankSellerOffersForBuyBox((data || []).map(mapSellerListingRow));
  const buyBoxWinner = ranked.find((item) => item.isBuyBoxWinner) || ranked[0] || null;

  res.json({ listings: ranked, buyBoxWinner, offerCount: ranked.length, source: 'supabase' });
});

catalogRouter.post('/listings', requireFirebaseAuth, requireRole(['vendor', 'moderator', 'admin', 'super_admin']), async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Supabase is not configured.' });
    return;
  }

  const profileUuid = await resolveProfileUuidByAuthUid(res.locals.auth.uid);
  if (!profileUuid) {
    res.status(404).json({ error: 'Seller profile not found in Supabase.' });
    return;
  }

  const { data: storeRow } = await supabaseAdmin
    .from('stores')
    .select('id, store_name')
    .eq('owner_id', profileUuid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!storeRow) {
    res.status(403).json({ error: 'Approved vendor store is required before attaching catalog listings.' });
    return;
  }

  const {
    masterProductId,
    price,
    shippingFee,
    condition,
    fulfillmentType,
    stockQuantity,
    tradeMode,
    minWholesaleQty,
    deliveryEta,
    location,
    sellerRealPhotos,
  } = req.body || {};

  if (!masterProductId || !Number.isFinite(Number(price)) || Number(price) < 0) {
    res.status(400).json({ error: 'masterProductId and valid price are required.' });
    return;
  }

  const { data: masterRow } = await supabaseAdmin
    .from('master_products')
    .select('*')
    .eq('id', String(masterProductId))
    .maybeSingle();

  const basePayload: Record<string, unknown> = {
    master_product_id: String(masterProductId),
    store_id: storeRow.id,
    seller_id: profileUuid,
    price: Number(price),
    stock_quantity: Math.max(0, Math.floor(Number(stockQuantity ?? 1))),
    trade_mode: tradeMode === 'wholesale' ? 'wholesale' : 'retail',
    min_wholesale_qty: tradeMode === 'wholesale' ? Math.max(1, Math.floor(Number(minWholesaleQty ?? 10))) : 1,
    seller_real_photos: Array.isArray(sellerRealPhotos) ? sellerRealPhotos : [],
    delivery_eta: String(deliveryEta || '1-2 Days'),
    location: String(location || 'Dhaka, Bangladesh'),
    is_active: true,
  };

  const extendedPayload: Record<string, unknown> = {
    ...basePayload,
    ...(masterRow?.pmin ? { pmin: masterRow.pmin } : {}),
    shipping_fee: Number.isFinite(Number(shippingFee)) && Number(shippingFee) >= 0 ? Number(shippingFee) : 0,
    condition: String(condition || 'New').slice(0, 40),
    fulfillment_type: String(fulfillmentType || 'seller_fulfilled').slice(0, 40),
  };

  let insertResult = await supabaseAdmin
    .from('seller_listings')
    .insert(extendedPayload)
    .select('*')
    .single();

  if (insertResult.error && isMissingColumnError(insertResult.error)) {
    insertResult = await supabaseAdmin
      .from('seller_listings')
      .insert(basePayload)
      .select('*')
      .single();
  }

  if (insertResult.error || !insertResult.data) {
    res.status(400).json({ error: insertResult.error?.message || 'Failed to attach listing.' });
    return;
  }

  res.status(201).json({ success: true, listing: insertResult.data });
});

catalogRouter.get('/submissions', requireFirebaseAuth, requireRole(['moderator', 'admin', 'super_admin']), async (_req: Request, res: Response) => {
  if (!isPrivilegedRole(res.locals.auth)) {
    res.status(403).json({ error: 'Governance privileges required.' });
    return;
  }
  if (!supabaseAdmin) {
    res.json({ submissions: [], source: 'unconfigured' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('catalog_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    res.json({ submissions: [], source: isMissingTableError(error) ? 'schema_missing' : 'error' });
    return;
  }

  const submissions = (data || []).map((row: any) => ({
    id: String(row.id),
    sellerId: String(row.seller_id),
    sellerName: 'Merchant Applicant',
    proposedTitle: String(row.proposed_title || ''),
    proposedBrand: row.proposed_brand || undefined,
    proposedCategory: String(row.proposed_category || 'General'),
    proposedDescription: String(row.proposed_description || ''),
    proposedImages: Array.isArray(row.proposed_images) ? row.proposed_images : [],
    proposedPrice: toNumber(row.proposed_price),
    tradeMode: row.trade_mode === 'wholesale' ? 'wholesale' : 'retail',
    status: row.status || 'pending_review',
    aiConfidenceScore: toNumber(row.ai_confidence_score, 95),
    aiAuditNotes: row.ai_audit_notes || undefined,
    createdAt: String(row.created_at || ''),
  }));

  res.json({ submissions, source: 'supabase' });
});

catalogRouter.post('/submissions', requireFirebaseAuth, requireRole(['vendor', 'moderator', 'admin', 'super_admin']), async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Supabase is not configured.' });
    return;
  }
  const profileUuid = await resolveProfileUuidByAuthUid(res.locals.auth.uid);
  if (!profileUuid) {
    res.status(404).json({ error: 'Seller profile not found in Supabase.' });
    return;
  }

  const body = req.body || {};
  if (!body.proposedTitle || !body.proposedCategory || !Number.isFinite(Number(body.proposedPrice))) {
    res.status(400).json({ error: 'proposedTitle, proposedCategory, and proposedPrice are required.' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('catalog_submissions')
    .insert({
      seller_id: profileUuid,
      proposed_title: String(body.proposedTitle).trim(),
      proposed_brand: body.proposedBrand ? String(body.proposedBrand).trim() : null,
      proposed_category: String(body.proposedCategory).trim(),
      proposed_description: body.proposedDescription ? String(body.proposedDescription).trim() : '',
      proposed_images: Array.isArray(body.proposedImages) ? body.proposedImages : [],
      proposed_price: Number(body.proposedPrice),
      trade_mode: body.tradeMode === 'wholesale' ? 'wholesale' : 'retail',
      status: 'pending_review',
      ai_confidence_score: toNumber(body.aiConfidenceScore, 95),
      ai_audit_notes: body.aiAuditNotes ? String(body.aiAuditNotes) : null,
    })
    .select('*')
    .single();

  if (error || !data) {
    res.status(400).json({ error: error?.message || 'Failed to submit catalog proposal.' });
    return;
  }

  res.status(201).json({ success: true, submission: data });
});

catalogRouter.post('/submissions/:id/review', requireFirebaseAuth, requireRole(['moderator', 'admin', 'super_admin']), async (req: Request, res: Response) => {
  if (!isPrivilegedRole(res.locals.auth)) {
    res.status(403).json({ error: 'Governance privileges required.' });
    return;
  }
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Supabase is not configured.' });
    return;
  }

  const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';
  const reviewerUuid = await resolveProfileUuidByAuthUid(res.locals.auth.uid);

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('catalog_submissions')
    .update({ status: decision, reviewed_by: reviewerUuid })
    .eq('id', req.params.id)
    .select('*')
    .maybeSingle();

  if (subErr || !sub) {
    res.status(404).json({ error: 'Catalog submission not found.' });
    return;
  }

  let masterProduct = null;
  if (decision === 'approved') {
    const generatedPmin = generatePmin();
    const baseMaster = {
      title_en: sub.proposed_title,
      title_bn: sub.proposed_title,
      brand: sub.proposed_brand || 'Generic',
      category: sub.proposed_category,
      description: sub.proposed_description || '',
      canonical_images: sub.proposed_images || [],
      specifications: { Approval: 'Verified by Governance & Gemini AI', PMIN: generatedPmin },
      is_verified: true,
    };

    let masterRes = await supabaseAdmin
      .from('master_products')
      .insert({ ...baseMaster, pmin: generatedPmin })
      .select('*')
      .maybeSingle();

    if (masterRes.error && isMissingColumnError(masterRes.error)) {
      masterRes = await supabaseAdmin
        .from('master_products')
        .insert(baseMaster)
        .select('*')
        .maybeSingle();
    }

    masterProduct = masterRes.data ? mapMasterProduct(masterRes.data) : null;
  }

  res.json({ success: true, decision, submission: sub, masterProduct });
});
