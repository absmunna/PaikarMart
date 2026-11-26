import { isLiveDatabaseConfigured } from '../../config/env.js';
import { supabaseAdmin } from '../../services/dbService.js';
import { logger } from '../../services/logger.js';
import type { PaymentSessionRecord, PaymentSessionStatus } from './paymentTypes.js';

const memorySessions = new Map<string, PaymentSessionRecord>();

function mapDbSession(row: Record<string, any>): PaymentSessionRecord {
  return {
    id: String(row.id),
    uid: String(row.uid),
    provider: row.provider,
    purpose: row.purpose,
    amount: Number(row.amount ?? 0),
    currency: 'BDT',
    orderId: row.order_id ? String(row.order_id) : undefined,
    customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    mode: row.mode,
    gatewayReference: String(row.gateway_reference),
    trxId: row.trx_id ? String(row.trx_id) : undefined,
    status: row.status as PaymentSessionStatus,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function clearMemoryPaymentSessionsForTest(): void {
  memorySessions.clear();
}

export async function findPaymentSessionById(sessionId: string): Promise<PaymentSessionRecord | null> {
  if (supabaseAdmin && isLiveDatabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!error && data) {
      return mapDbSession(data);
    }
    if (error) {
      logger.warn('Payment session DB read failed; checking memory cache', {
        module: 'payment',
        action: 'findPaymentSessionById',
        error: error.message,
      });
    }
  }

  return memorySessions.get(sessionId) || null;
}

export async function findPaymentSessionByIdempotency(
  uid: string,
  idempotencyKey: string
): Promise<PaymentSessionRecord | null> {
  if (supabaseAdmin && isLiveDatabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('uid', uid)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (!error && data) {
      return mapDbSession(data);
    }
  }

  for (const existing of memorySessions.values()) {
    if (existing.uid === uid && existing.idempotencyKey === idempotencyKey) {
      return existing;
    }
  }
  return null;
}

export async function createPaymentSession(record: PaymentSessionRecord): Promise<PaymentSessionRecord> {
  memorySessions.set(record.id, record);

  if (supabaseAdmin && isLiveDatabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        id: record.id,
        uid: record.uid,
        provider: record.provider,
        purpose: record.purpose,
        amount: record.amount,
        currency: record.currency,
        order_id: record.orderId || null,
        customer_phone: record.customerPhone || null,
        mode: record.mode,
        gateway_reference: record.gatewayReference,
        trx_id: record.trxId || null,
        status: record.status,
        idempotency_key: record.idempotencyKey || null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('Failed to persist payment session in Supabase', {
        module: 'payment',
        action: 'createPaymentSession',
        uid: record.uid,
        error: error.message,
      });
      throw new Error('PAYMENT_SESSION_PERSISTENCE_FAILED');
    }
    if (data) {
      const mapped = mapDbSession(data);
      memorySessions.set(mapped.id, mapped);
      return mapped;
    }
  }

  return record;
}

export async function updatePaymentSessionCompletion(params: {
  sessionId: string;
  status: PaymentSessionStatus;
  trxId?: string;
}): Promise<PaymentSessionRecord | null> {
  const nowIso = new Date().toISOString();
  const cached = memorySessions.get(params.sessionId);
  if (cached) {
    cached.status = params.status;
    if (params.trxId) cached.trxId = params.trxId;
    cached.updatedAt = nowIso;
  }

  if (supabaseAdmin && isLiveDatabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('payment_sessions')
      .update({
        status: params.status,
        trx_id: params.trxId || null,
        updated_at: nowIso,
      })
      .eq('id', params.sessionId)
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('Failed to update payment session status in Supabase', {
        module: 'payment',
        action: 'updatePaymentSessionCompletion',
        error: error.message,
      });
      throw new Error('PAYMENT_SESSION_UPDATE_FAILED');
    }
    if (data) {
      const mapped = mapDbSession(data);
      memorySessions.set(mapped.id, mapped);
      return mapped;
    }
  }

  return cached || null;
}
