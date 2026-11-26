import { supabase, supabaseAdmin } from '../config/supabaseAdmin.js';

export { supabase, supabaseAdmin };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(value?: string | null): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

export async function checkDatabaseConnection(): Promise<string> {
  const client = supabaseAdmin || supabase;
  if (!client) {
    return 'Supabase PostgreSQL (In-Memory Fallback Mode)';
  }
  try {
    const { error } = await client.from('master_products').select('id').limit(1);
    if (!error) {
      return 'Supabase PostgreSQL (Live & Connected)';
    }
    const { error: prodErr } = await client.from('products').select('id').limit(1);
    if (!prodErr) {
      return 'Supabase PostgreSQL (Connected · Legacy products table active; run supabase/schema.sql for 1:N master catalog)';
    }
    return `Supabase Connected (Table Notice: ${error.message})`;
  } catch (err: any) {
    return `Supabase Connection Error: ${err.message}`;
  }
}

export async function getStoredFeedPosts(fallbackPosts: any[]) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase feed fetch fallback to memory:', e);
    }
  }
  return fallbackPosts;
}

export async function resolveProfileUuidByAuthUid(authUid?: string): Promise<string | null> {
  const client = supabaseAdmin || supabase;
  if (!client || !authUid) return null;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .eq('auth_uid', authUid)
      .maybeSingle();
    if (error) {
      console.warn('Supabase profile UUID lookup notice:', error.message);
      return null;
    }
    return data?.id || null;
  } catch {
    return null;
  }
}

export async function resolveOrderUuidByOrderKey(orderKey?: string): Promise<string | null> {
  const client = supabaseAdmin || supabase;
  if (!client || !orderKey) return null;
  const trimmed = orderKey.trim();
  if (!trimmed) return null;

  try {
    if (isUuidString(trimmed)) {
      const { data, error } = await client
        .from('orders')
        .select('id')
        .eq('id', trimmed)
        .maybeSingle();
      if (!error && data?.id) return data.id;
    }

    const { data, error } = await client
      .from('orders')
      .select('id')
      .eq('idempotency_key', trimmed)
      .maybeSingle();
    if (!error && data?.id) return data.id;
  } catch (err: any) {
    console.warn('Supabase order UUID lookup notice:', err?.message || err);
  }
  return null;
}

export async function insertStoredPost(post: { authorId?: string; content: string; mediaUrl?: string }) {
  const client = supabaseAdmin || supabase;
  if (client) {
    try {
      const authorUuid = await resolveProfileUuidByAuthUid(post.authorId);
      if (!authorUuid) return;
      const { error } = await client.from('social_posts').insert({
        author_id: authorUuid,
        content: post.content,
        media_url: post.mediaUrl || null,
        likes_count: 0,
        shares_count: 0
      });
      if (error) {
        console.warn('Supabase post insert notice:', error.message);
      }
    } catch (e) {
      console.warn('Supabase post insert fallback to memory:', e);
    }
  }
}

export function mapDbOrderRow(row: Record<string, any>, resolvedCustomerAuthUid?: string) {
  const status = String(row.status || 'confirmed') as 'confirmed' | 'preparing' | 'in_transit' | 'delivered';
  const stepMap: Record<string, number> = { confirmed: 1, preparing: 2, in_transit: 3, delivered: 4 };
  return {
    id: String(row.idempotency_key || row.id),
    dbUuid: String(row.id),
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
    customerProfileId: String(row.customer_id),
    customerId: resolvedCustomerAuthUid || String(row.customer_id),
    subtotal: Number(row.subtotal ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    tax: Number(row.tax ?? 0),
    discount: Number(row.discount ?? 0),
    promoCode: row.promo_code ? String(row.promo_code) : undefined,
    total: Number(row.total ?? 0),
    status,
    trackingStep: stepMap[status] || 1,
    deliveryAddress: String(row.delivery_address || 'Dhaka, Bangladesh'),
    paymentMethod: String(row.payment_method || 'Mobile Wallet'),
    estimatedArrival: '45 mins',
    items: Array.isArray(row.items) ? row.items : [],
    buyerName: row.buyer_name ? String(row.buyer_name) : undefined,
    buyerPhone: row.buyer_phone ? String(row.buyer_phone) : undefined,
    storeId: row.store_id ? String(row.store_id) : undefined,
    storeName: row.store_name ? String(row.store_name) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

export async function getStoredOrders(fallbackOrders: any[], authUid?: string, isPrivileged = false) {
  const client = supabaseAdmin || supabase;
  if (client) {
    try {
      let query = client.from('orders').select('*').order('created_at', { ascending: false }).limit(100);
      if (!isPrivileged && authUid) {
        const profileUuid = await resolveProfileUuidByAuthUid(authUid);
        if (!profileUuid) return fallbackOrders;
        query = query.eq('customer_id', profileUuid);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((row) => mapDbOrderRow(row, !isPrivileged ? authUid : undefined));
      }
    } catch (e) {
      console.warn('Supabase orders fetch fallback to memory:', e);
    }
  }
  return fallbackOrders;
}

export async function findStoredOrderByIdOrKey(orderIdOrKey: string) {
  const client = supabaseAdmin || supabase;
  if (!client || !orderIdOrKey) return null;
  const trimmed = orderIdOrKey.trim();
  if (!trimmed) return null;
  try {
    const query = isUuidString(trimmed)
      ? client.from('orders').select('*').or(`id.eq.${trimmed},idempotency_key.eq.${trimmed}`).maybeSingle()
      : client.from('orders').select('*').eq('idempotency_key', trimmed).maybeSingle();
    const { data, error } = await query;
    if (!error && data) {
      let customerAuthUid: string | undefined;
      if (data.customer_id) {
        const { data: prof } = await client
          .from('profiles')
          .select('auth_uid')
          .eq('id', data.customer_id)
          .maybeSingle();
        if (prof?.auth_uid) customerAuthUid = String(prof.auth_uid);
      }
      return mapDbOrderRow(data, customerAuthUid);
    }
  } catch (e) {
    console.warn('Supabase single order lookup notice:', e);
  }
  return null;
}

export async function updateStoredOrderStatus(orderIdOrKey: string, status: string, updatedAt: string): Promise<boolean> {
  const client = supabaseAdmin;
  if (!client || !orderIdOrKey) return false;
  try {
    const targetUuid = await resolveOrderUuidByOrderKey(orderIdOrKey);
    if (!targetUuid) return false;
    const { error } = await client
      .from('orders')
      .update({ status, updated_at: updatedAt })
      .eq('id', targetUuid);
    if (error) {
      console.warn('Supabase order status update notice:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase order status update error:', e);
    return false;
  }
}

export async function insertStoredOrder(order: any): Promise<boolean> {
  const client = supabaseAdmin || supabase;
  if (client) {
    try {
      const customerUuid = await resolveProfileUuidByAuthUid(order.customerId);
      if (!customerUuid) return false;
      const { error } = await client.from('orders').insert({
        idempotency_key: order.idempotencyKey || order.id || null,
        customer_id: customerUuid,
        subtotal: order.subtotal || 0,
        delivery_fee: order.deliveryFee || 0,
        tax: order.tax || 0,
        discount: order.discount || 0,
        promo_code: order.promoCode || null,
        total: order.total || 0,
        status: order.status || 'confirmed',
        delivery_address: order.deliveryAddress || 'Standard Delivery',
        payment_method: order.paymentMethod || 'Cash On Delivery',
        items: order.items || [],
        buyer_name: order.buyerName || null,
        buyer_phone: order.buyerPhone || null,
        store_id: order.storeId || null,
        store_name: order.storeName || null,
        updated_at: order.updatedAt || new Date().toISOString(),
      });
      if (error) {
        console.warn('Supabase order insert notice:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase order insert fallback to memory:', e);
    }
  }
  return false;
}

export async function upsertStoredShipmentWaybill(shipment: {
  orderId: string;
  trackingNumber: string;
  courierPartner: string;
  status: string;
  deliveryOtp: string;
  pickupLocation: string;
  dropLocation: string;
  shippingFee: number;
  checkpoints: any[];
  podReceipt?: { verifiedAt?: string };
  updatedAt?: string;
}): Promise<boolean> {
  if (!supabaseAdmin) return false;
  try {
    const orderUuid = await resolveOrderUuidByOrderKey(shipment.orderId);
    if (!orderUuid) return false;

    const { error } = await supabaseAdmin
      .from('shipment_waybills')
      .upsert(
        {
          order_id: orderUuid,
          tracking_number: shipment.trackingNumber,
          courier_partner: shipment.courierPartner,
          status: shipment.status,
          delivery_otp: shipment.deliveryOtp,
          pickup_location: shipment.pickupLocation,
          drop_location: shipment.dropLocation,
          shipping_fee_bdt: Number(shipment.shippingFee || 60),
          pod_verified_at: shipment.podReceipt?.verifiedAt || null,
          checkpoints: shipment.checkpoints || [],
          updated_at: shipment.updatedAt || new Date().toISOString(),
        },
        { onConflict: 'order_id' }
      );
    if (error) {
      console.warn('Supabase waybill upsert notice:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Supabase waybill upsert fallback to memory:', err?.message || err);
    return false;
  }
}

export async function findStoredShipmentWaybill(key: string): Promise<any | null> {
  const client = supabaseAdmin || supabase;
  if (!client || !key) return null;
  try {
    const cleanKey = key.trim();
    const { data: byTracking, error: trackingErr } = await client
      .from('shipment_waybills')
      .select('*')
      .ilike('tracking_number', cleanKey)
      .maybeSingle();

    if (!trackingErr && byTracking) {
      return byTracking;
    }

    const orderUuid = await resolveOrderUuidByOrderKey(cleanKey);
    if (!orderUuid) return null;

    const { data: byOrder, error: orderErr } = await client
      .from('shipment_waybills')
      .select('*')
      .eq('order_id', orderUuid)
      .maybeSingle();

    if (!orderErr && byOrder) {
      return byOrder;
    }
  } catch (err: any) {
    console.warn('Supabase waybill lookup notice:', err?.message || err);
  }
  return null;
}

export async function listStoredShipmentWaybills(): Promise<any[]> {
  const client = supabaseAdmin || supabase;
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('shipment_waybills')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (err: any) {
    console.warn('Supabase waybill list notice:', err?.message || err);
  }
  return [];
}
