import { supabaseAdmin } from '../../services/dbService.js';
import type { VerifiedFirebaseAuth } from '../../middleware/requireFirebaseAuth.js';
import { isPrivilegedRole } from '../../middleware/requireFirebaseAuth.js';

export interface RfqRowRecord {
  id: string;
  buyerId: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  targetPricePerUnit: number;
  specifications: string;
  deliveryDeadline: string;
  status: string;
  quotes: any[];
  created_at?: string;
}

export interface WholesaleSampleRecord {
  id: string;
  requesterUid: string;
  productId: string;
  productTitle: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  shippingAddress: string;
  sampleFee: number;
  status: 'requested' | 'dispatched' | 'delivered';
  trackingCode: string;
  createdAt: string;
}

const memoryRfqs: RfqRowRecord[] = [
  {
    id: 'rfq_demo_101',
    buyerId: 'user_demo_1',
    buyerName: 'Rahim Enterprise',
    itemTitle: 'Cotton T-Shirts Bulk (Export Quality)',
    quantity: 5000,
    targetPricePerUnit: 120,
    specifications: '100% Combed Cotton, GSM 180, Assorted Sizes (M, L, XL)',
    deliveryDeadline: '2026-12-15',
    status: 'negotiating',
    quotes: [
      {
        vendorId: 'v_1',
        vendorName: 'Dhaka Textiles Ltd',
        quotedPricePerUnit: 125,
        notes: 'Includes free courier delivery in Dhaka region.',
      },
    ],
    created_at: new Date().toISOString(),
  },
];

const memorySamples: WholesaleSampleRecord[] = [];

function canSeeRfq(row: { buyerId?: string }, auth: VerifiedFirebaseAuth): boolean {
  if (isPrivilegedRole(auth) || auth.role === 'vendor' || auth.isVendor) return true;
  return row.buyerId === auth.uid;
}

export async function listRfqsForUser(auth: VerifiedFirebaseAuth): Promise<{
  rfqs: RfqRowRecord[];
  source: 'supabase' | 'fallback';
}> {
  if (supabaseAdmin) {
    try {
      let query = supabaseAdmin
        .from('paikarmart_rfqs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isPrivilegedRole(auth) && auth.role !== 'vendor' && !auth.isVendor) {
        query = query.eq('buyerId', auth.uid);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return {
          rfqs: data as RfqRowRecord[],
          source: 'supabase',
        };
      }
    } catch {
      // Fallback below when table isn't provisioned yet
    }
  }

  return {
    rfqs: memoryRfqs.filter((r) => canSeeRfq(r, auth)),
    source: 'fallback',
  };
}

export async function findRfqById(id: string): Promise<RfqRowRecord | null> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('paikarmart_rfqs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        return data as RfqRowRecord;
      }
    } catch {
      // Fallback below
    }
  }
  return memoryRfqs.find((r) => r.id === id) || null;
}

export async function createRfqRecord(record: RfqRowRecord): Promise<RfqRowRecord> {
  memoryRfqs.unshift(record);
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('paikarmart_rfqs').insert([
        {
          id: record.id,
          buyerId: record.buyerId,
          buyerName: record.buyerName,
          itemTitle: record.itemTitle,
          quantity: record.quantity,
          targetPricePerUnit: record.targetPricePerUnit,
          specifications: record.specifications,
          deliveryDeadline: record.deliveryDeadline,
          status: record.status,
          quotes: record.quotes,
          created_at: record.created_at || new Date().toISOString(),
        },
      ]);
    } catch {
      // Ignore if migration hasn't run in dev
    }
  }
  return record;
}

export async function updateRfqRecord(
  id: string,
  patch: Partial<Pick<RfqRowRecord, 'status' | 'quotes' | 'specifications'>>
): Promise<RfqRowRecord | null> {
  const mem = memoryRfqs.find((r) => r.id === id);
  if (mem) {
    if (patch.status !== undefined) mem.status = patch.status;
    if (patch.quotes !== undefined) mem.quotes = patch.quotes;
    if (patch.specifications !== undefined) mem.specifications = patch.specifications;
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('paikarmart_rfqs')
        .update(patch)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (!error && data) {
        return data as RfqRowRecord;
      }
    } catch {
      // Fallback to memory record
    }
  }

  return mem || null;
}

export async function listWholesaleSamplesForUser(
  auth: VerifiedFirebaseAuth
): Promise<WholesaleSampleRecord[]> {
  if (supabaseAdmin) {
    try {
      let query = supabaseAdmin
        .from('wholesale_samples')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isPrivilegedRole(auth)) {
        query = query.eq('requester_uid', auth.uid);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: String(row.id),
          requesterUid: String(row.requester_uid),
          productId: String(row.product_id),
          productTitle: String(row.product_title),
          companyName: String(row.requester_name || ''),
          contactPerson: String(row.supplier_name || row.requester_name || ''),
          phone: '',
          shippingAddress: String(row.shipping_address || ''),
          sampleFee: 500,
          status: row.status === 'delivered' ? 'delivered' : row.status === 'shipped' ? 'dispatched' : 'requested',
          trackingCode: `PM-TRK-${String(row.id).replace(/\D/g, '').slice(-6) || '100200'}`,
          createdAt: String(row.created_at || new Date().toISOString()),
        }));
      }
    } catch {
      // Fallback below
    }
  }

  return isPrivilegedRole(auth)
    ? memorySamples
    : memorySamples.filter((s) => s.requesterUid === auth.uid);
}

export async function createWholesaleSampleRecord(
  sample: WholesaleSampleRecord
): Promise<WholesaleSampleRecord> {
  memorySamples.unshift(sample);

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('wholesale_samples').insert({
        id: sample.id,
        requester_uid: sample.requesterUid,
        requester_name: sample.companyName || sample.contactPerson,
        product_id: sample.productId,
        product_title: sample.productTitle,
        supplier_name: sample.contactPerson,
        quantity: 1,
        shipping_address: sample.shippingAddress,
        notes: `Phone: ${sample.phone} | Tracking: ${sample.trackingCode}`,
        status: 'shipped',
      });
    } catch {
      // Graceful fallback when migration hasn't run
    }
  }

  return sample;
}
