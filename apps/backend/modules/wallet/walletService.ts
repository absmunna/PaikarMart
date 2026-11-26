import { isPersistentFinanceEnabled } from '../../config/env.js';
import {
  resolveOrderUuidByOrderKey,
  resolveProfileUuidByAuthUid,
  supabaseAdmin
} from '../../services/dbService.js';
import { logger } from '../../services/logger.js';
import {
  getEscrowSummaryForUser,
  getOrCreateWallet,
  mapDbEscrowRow,
  summarizeEscrows,
  type ServerEscrowRecord,
  type ServerWalletAccount,
  type ServerWalletTransaction,
  type WalletTxStatus,
  type WalletTxType,
} from './walletMemoryStore.js';

export * from './walletMemoryStore.js';

export async function getPersistentEscrowSummary(authUid: string): Promise<{
  source: 'supabase' | 'memory';
  summary: ReturnType<typeof summarizeEscrows>;
  escrows: ServerEscrowRecord[];
}> {
  if (supabaseAdmin) {
    const profileUuid = await resolveProfileUuidByAuthUid(authUid);
    if (profileUuid) {
      const { data, error } = await supabaseAdmin
        .from('escrow_records')
        .select('*')
        .or(`buyer_id.eq.${profileUuid},vendor_id.eq.${profileUuid}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        const mapped = data.map((row) => mapDbEscrowRow(row, profileUuid, authUid));
        return {
          source: 'supabase',
          summary: summarizeEscrows(mapped),
          escrows: mapped
        };
      }

      if (isPersistentFinanceEnabled()) {
        logger.error('wallet.escrow_query_failed', { authUid, error: error?.message });
        throw new Error('FINANCE_DATABASE_ERROR');
      }
      logger.warn('wallet.escrow_query_fallback', { authUid, error: error?.message });
    } else if (isPersistentFinanceEnabled()) {
      return {
        source: 'supabase',
        summary: summarizeEscrows([]),
        escrows: []
      };
    }
  }

  const fallback = getEscrowSummaryForUser(authUid);
  return {
    source: 'memory',
    summary: fallback.summary,
    escrows: fallback.escrows
  };
}

export async function getPersistentWalletOverview(authUid: string): Promise<{
  source: 'supabase' | 'memory';
  wallet: ServerWalletAccount;
  escrowSummary: ReturnType<typeof summarizeEscrows>;
  escrows: ServerEscrowRecord[];
}> {
  if (supabaseAdmin) {
    const profileUuid = await resolveProfileUuidByAuthUid(authUid);
    if (profileUuid) {
      const [{ data: profile, error: profileErr }, { data: txRows, error: txErr }, escrowData] =
        await Promise.all([
          supabaseAdmin
            .from('profiles')
            .select('wallet_balance, reward_points, updated_at')
            .eq('id', profileUuid)
            .maybeSingle(),
          supabaseAdmin
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', profileUuid)
            .order('created_at', { ascending: false })
            .limit(50),
          getPersistentEscrowSummary(authUid)
        ]);

      if (!profileErr && profile) {
        const transactions: ServerWalletTransaction[] = (!txErr && Array.isArray(txRows) ? txRows : []).map(
          (row: any) => ({
            id: String(row.id),
            type: (row.type || 'deposit') as WalletTxType,
            amount: Number(row.amount ?? 0),
            currency: 'BDT',
            description: String(row.description || ''),
            referenceId: String(row.reference_id || row.id),
            timestamp: row.created_at
              ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            status: (row.status || 'completed') as WalletTxStatus
          })
        );

        const wallet: ServerWalletAccount = {
          userId: authUid,
          balance: Number(profile.wallet_balance ?? 0),
          coins: Number(profile.reward_points ?? 0),
          escrowHeldBalance: escrowData.summary.totalHeld,
          transactions,
          updatedAt: String(profile.updated_at || new Date().toISOString())
        };

        return {
          source: 'supabase',
          wallet,
          escrowSummary: escrowData.summary,
          escrows: escrowData.escrows
        };
      }

      if (isPersistentFinanceEnabled()) {
        logger.error('wallet.overview_query_failed', { authUid, error: profileErr?.message });
        throw new Error('FINANCE_DATABASE_ERROR');
      }
      logger.warn('wallet.overview_query_fallback', { authUid, error: profileErr?.message });
    } else if (isPersistentFinanceEnabled()) {
      return {
        source: 'supabase',
        wallet: {
          userId: authUid,
          balance: 0,
          coins: 0,
          escrowHeldBalance: 0,
          transactions: [],
          updatedAt: new Date().toISOString()
        },
        escrowSummary: summarizeEscrows([]),
        escrows: []
      };
    }
  }

  const wallet = getOrCreateWallet(authUid);
  const escrowData = getEscrowSummaryForUser(authUid);
  return {
    source: 'memory',
    wallet,
    escrowSummary: escrowData.summary,
    escrows: escrowData.escrows
  };
}

function isRpcUnavailableError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return err.code === 'PGRST202' || msg.includes('could not find the function') || msg.includes('does not exist');
}

function mapRpcErrorCode(err: { message?: string } | null | undefined, fallback: string): string {
  const msg = String(err?.message || '').toUpperCase();
  for (const known of [
    'INVALID_AMOUNT',
    'PROFILE_NOT_FOUND',
    'INSUFFICIENT_BALANCE',
    'INVALID_COINS',
    'INSUFFICIENT_COINS',
    'INVALID_ESCROW_PARAMS',
    'ORDER_OR_PROFILE_NOT_FOUND',
    'ESCROW_NOT_FOUND',
    'ESCROW_DISPUTED',
  ]) {
    if (msg.includes(known)) return known;
  }
  return fallback;
}

export async function applyVerifiedPaymentWebhook(params: {
  idempotencyKey: string;
  authUid: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'cashback';
  method?: string;
  description?: string;
  referenceId?: string;
}) {
  if (!supabaseAdmin || !isPersistentFinanceEnabled()) {
    throw new Error('FINANCE_UNAVAILABLE');
  }

  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 5000000) {
    throw new Error('INVALID_AMOUNT');
  }

  const refKey = String(params.idempotencyKey || params.referenceId || '').trim();
  if (!refKey) {
    throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  }

  const profileUuid = await resolveProfileUuidByAuthUid(params.authUid);
  if (!profileUuid) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const earnedCoins = params.type === 'deposit' ? Math.max(5, Math.floor(amount / 100)) : 0;
  const description =
    params.description?.trim() ||
    `${params.method || 'Verified Payment Gateway'} (${params.type})`;

  // Primary path: atomic PostgreSQL row-locked RPC
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('apply_wallet_ledger_atomic', {
    p_profile_id: profileUuid,
    p_type: params.type,
    p_amount: amount,
    p_description: description,
    p_reference_id: refKey,
    p_coins_delta: earnedCoins,
  });

  if (!rpcErr && rpcData) {
    return {
      duplicate: Boolean(rpcData.duplicate),
      balance: rpcData.balance !== undefined ? Number(rpcData.balance) : undefined,
      coins: rpcData.coins !== undefined ? Number(rpcData.coins) : undefined,
      earnedCoins: rpcData.duplicate ? 0 : earnedCoins,
      transaction: rpcData.transaction,
    };
  }

  if (rpcErr && !isRpcUnavailableError(rpcErr)) {
    throw new Error(mapRpcErrorCode(rpcErr, 'CONCURRENT_LEDGER_CONFLICT'));
  }

  // Fallback optimistic-locked path when RPC migration has not yet been applied
  const { data: existingTx } = await supabaseAdmin
    .from('wallet_transactions')
    .select('*')
    .eq('reference_id', refKey)
    .maybeSingle();

  if (existingTx) {
    return { duplicate: true, transaction: existingTx };
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('wallet_balance, reward_points')
    .eq('id', profileUuid)
    .single();

  if (profErr || !profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const currentBalance = Number(profile.wallet_balance ?? 0);
  const currentCoins = Number(profile.reward_points ?? 0);
  const delta = params.type === 'withdrawal' ? -amount : amount;
  const nextBalance = Number((currentBalance + delta).toFixed(2));

  if (nextBalance < 0) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  const nextCoins = currentCoins + earnedCoins;

  const { data: updatedProf, error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({
      wallet_balance: nextBalance,
      reward_points: nextCoins,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileUuid)
    .eq('wallet_balance', currentBalance)
    .select('wallet_balance, reward_points')
    .maybeSingle();

  if (updateErr || !updatedProf) {
    throw new Error('CONCURRENT_LEDGER_CONFLICT');
  }

  const { data: txRow, error: txErr } = await supabaseAdmin
    .from('wallet_transactions')
    .insert({
      user_id: profileUuid,
      type: params.type,
      amount,
      description,
      status: 'completed',
      reference_id: refKey
    })
    .select('*')
    .single();

  if (txErr) {
    throw new Error('LEDGER_WRITE_FAILED');
  }

  return {
    duplicate: false,
    balance: Number(updatedProf.wallet_balance),
    coins: Number(updatedProf.reward_points),
    earnedCoins,
    transaction: txRow
  };
}

export async function redeemPersistentWalletCoins(authUid: string, coinsToRedeem: number) {
  if (!supabaseAdmin || !isPersistentFinanceEnabled()) {
    throw new Error('FINANCE_UNAVAILABLE');
  }
  if (!Number.isFinite(coinsToRedeem) || coinsToRedeem < 10) {
    throw new Error('INVALID_COINS');
  }
  const cleanCoins = Math.floor(coinsToRedeem);
  const profileUuid = await resolveProfileUuidByAuthUid(authUid);
  if (!profileUuid) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const refId = `PM-REDEEM-${Date.now()}`;
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('redeem_wallet_coins_atomic', {
    p_profile_id: profileUuid,
    p_coins: cleanCoins,
    p_reference_id: refId,
  });

  if (!rpcErr && rpcData) {
    return {
      bdtValue: Number(rpcData.bdtValue),
      balance: Number(rpcData.balance),
      coins: Number(rpcData.coins),
      transaction: rpcData.transaction,
    };
  }

  if (rpcErr && !isRpcUnavailableError(rpcErr)) {
    throw new Error(mapRpcErrorCode(rpcErr, 'CONCURRENT_LEDGER_CONFLICT'));
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('wallet_balance, reward_points')
    .eq('id', profileUuid)
    .single();

  if (profErr || !profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const currentCoins = Number(profile.reward_points ?? 0);
  const currentBalance = Number(profile.wallet_balance ?? 0);
  if (currentCoins < cleanCoins) {
    throw new Error('INSUFFICIENT_COINS');
  }

  const bdtValue = Math.floor(cleanCoins / 5);
  const nextCoins = currentCoins - cleanCoins;
  const nextBalance = Number((currentBalance + bdtValue).toFixed(2));

  const { data: updatedProf, error: updErr } = await supabaseAdmin
    .from('profiles')
    .update({
      wallet_balance: nextBalance,
      reward_points: nextCoins,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileUuid)
    .eq('reward_points', currentCoins)
    .eq('wallet_balance', currentBalance)
    .select('wallet_balance, reward_points')
    .maybeSingle();

  if (updErr || !updatedProf) {
    throw new Error('CONCURRENT_LEDGER_CONFLICT');
  }

  const { data: txRow } = await supabaseAdmin
    .from('wallet_transactions')
    .insert({
      user_id: profileUuid,
      type: 'cashback',
      amount: bdtValue,
      description: `${cleanCoins} রিওয়ার্ড কয়েন থেকে ৳${bdtValue} কনভার্সন`,
      status: 'completed',
      reference_id: refId
    })
    .select('*')
    .single();

  return {
    bdtValue,
    balance: Number(updatedProf.wallet_balance),
    coins: Number(updatedProf.reward_points),
    transaction: txRow
  };
}

export async function createPersistentEscrowHold(params: {
  orderKey: string;
  buyerAuthUid: string;
  vendorAuthUidOrProfileId: string;
  amount: number;
}) {
  if (!supabaseAdmin) {
    throw new Error('FINANCE_UNAVAILABLE');
  }
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_ESCROW_PARAMS');
  }

  const buyerUuid = await resolveProfileUuidByAuthUid(params.buyerAuthUid);
  const orderUuid = await resolveOrderUuidByOrderKey(params.orderKey);
  if (!buyerUuid || !orderUuid) {
    throw new Error('ORDER_OR_PROFILE_NOT_FOUND');
  }

  let vendorUuid: string | null = await resolveProfileUuidByAuthUid(params.vendorAuthUidOrProfileId);
  if (!vendorUuid && /^[0-9a-f-]{36}$/i.test(params.vendorAuthUidOrProfileId)) {
    vendorUuid = params.vendorAuthUidOrProfileId;
  }
  if (!vendorUuid) {
    throw new Error('VENDOR_NOT_FOUND');
  }

  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('create_escrow_hold_atomic', {
    p_order_id: orderUuid,
    p_buyer_id: buyerUuid,
    p_vendor_id: vendorUuid,
    p_amount: amount,
    p_order_key: params.orderKey,
  });

  if (!rpcErr && rpcData?.escrow) {
    return {
      escrow: mapDbEscrowRow(rpcData.escrow, buyerUuid, params.buyerAuthUid),
      duplicate: Boolean(rpcData.duplicate),
    };
  }

  if (rpcErr && !isRpcUnavailableError(rpcErr)) {
    throw new Error(mapRpcErrorCode(rpcErr, 'CONCURRENT_LEDGER_CONFLICT'));
  }

  const { data: existingEscrow } = await supabaseAdmin
    .from('escrow_records')
    .select('*')
    .eq('order_id', orderUuid)
    .maybeSingle();

  if (existingEscrow) {
    return { escrow: mapDbEscrowRow(existingEscrow, buyerUuid, params.buyerAuthUid), duplicate: true };
  }

  const { data: buyerProf } = await supabaseAdmin
    .from('profiles')
    .select('wallet_balance')
    .eq('id', buyerUuid)
    .single();

  const currentBalance = Number(buyerProf?.wallet_balance ?? 0);
  if (currentBalance < amount) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  const nextBalance = Number((currentBalance - amount).toFixed(2));
  const { data: updatedBuyer, error: debitErr } = await supabaseAdmin
    .from('profiles')
    .update({ wallet_balance: nextBalance, updated_at: new Date().toISOString() })
    .eq('id', buyerUuid)
    .eq('wallet_balance', currentBalance)
    .select('wallet_balance')
    .maybeSingle();

  if (debitErr || !updatedBuyer) {
    throw new Error('CONCURRENT_LEDGER_CONFLICT');
  }

  const { data: escrowRow, error: escErr } = await supabaseAdmin
    .from('escrow_records')
    .insert({
      order_id: orderUuid,
      buyer_id: buyerUuid,
      vendor_id: vendorUuid,
      amount_bdt: amount,
      status: 'held'
    })
    .select('*')
    .single();

  if (escErr || !escrowRow) {
    throw new Error('ESCROW_CREATE_FAILED');
  }

  await supabaseAdmin.from('wallet_transactions').insert({
    user_id: buyerUuid,
    type: 'escrow_hold',
    amount,
    description: `Escrow Hold Locked — ${params.orderKey}`,
    status: 'completed',
    reference_id: String(escrowRow.id)
  });

  return {
    escrow: mapDbEscrowRow(escrowRow, buyerUuid, params.buyerAuthUid),
    duplicate: false
  };
}

export async function releasePersistentEscrow(params: {
  escrowIdOrOrderKey: string;
  actorAuthUid: string;
  isPrivileged: boolean;
}) {
  if (!supabaseAdmin) {
    throw new Error('FINANCE_UNAVAILABLE');
  }

  const actorUuid = await resolveProfileUuidByAuthUid(params.actorAuthUid);
  if (!actorUuid && !params.isPrivileged) {
    throw new Error('FORBIDDEN');
  }

  let query = supabaseAdmin.from('escrow_records').select('*');
  if (/^[0-9a-f-]{36}$/i.test(params.escrowIdOrOrderKey)) {
    query = query.or(`id.eq.${params.escrowIdOrOrderKey},order_id.eq.${params.escrowIdOrOrderKey}`);
  } else {
    const orderUuid = await resolveOrderUuidByOrderKey(params.escrowIdOrOrderKey);
    if (!orderUuid) throw new Error('ESCROW_NOT_FOUND');
    query = query.eq('order_id', orderUuid);
  }

  const { data: escrowRow } = await query.maybeSingle();
  if (!escrowRow) {
    throw new Error('ESCROW_NOT_FOUND');
  }

  if (!params.isPrivileged && escrowRow.buyer_id !== actorUuid) {
    throw new Error('FORBIDDEN');
  }

  if (escrowRow.status === 'disputed') {
    throw new Error('ESCROW_DISPUTED');
  }
  if (escrowRow.status === 'released') {
    return {
      escrow: mapDbEscrowRow(escrowRow, actorUuid || escrowRow.buyer_id, params.actorAuthUid),
      alreadyReleased: true
    };
  }

  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('release_escrow_atomic', {
    p_escrow_id: escrowRow.id,
  });

  if (!rpcErr && rpcData?.escrow) {
    return {
      escrow: mapDbEscrowRow(rpcData.escrow, actorUuid || escrowRow.buyer_id, params.actorAuthUid),
      alreadyReleased: Boolean(rpcData.alreadyReleased),
    };
  }

  if (rpcErr && !isRpcUnavailableError(rpcErr)) {
    throw new Error(mapRpcErrorCode(rpcErr, 'CONCURRENT_LEDGER_CONFLICT'));
  }

  const releasedAt = new Date().toISOString();
  const { data: updatedEscrow, error: updEscErr } = await supabaseAdmin
    .from('escrow_records')
    .update({ status: 'released', released_at: releasedAt })
    .eq('id', escrowRow.id)
    .eq('status', 'held')
    .select('*')
    .maybeSingle();

  if (updEscErr || !updatedEscrow) {
    throw new Error('CONCURRENT_LEDGER_CONFLICT');
  }

  const payoutAmount = Number(escrowRow.amount_bdt ?? 0);
  const { data: vendorProf } = await supabaseAdmin
    .from('profiles')
    .select('wallet_balance')
    .eq('id', escrowRow.vendor_id)
    .single();

  if (vendorProf) {
    const currentVendorBal = Number(vendorProf.wallet_balance ?? 0);
    const { data: creditedVendor, error: vendorCredErr } = await supabaseAdmin
      .from('profiles')
      .update({
        wallet_balance: Number((currentVendorBal + payoutAmount).toFixed(2)),
        updated_at: releasedAt
      })
      .eq('id', escrowRow.vendor_id)
      .eq('wallet_balance', currentVendorBal)
      .select('wallet_balance')
      .maybeSingle();

    if (vendorCredErr || !creditedVendor) {
      throw new Error('CONCURRENT_LEDGER_CONFLICT');
    }
  }

  await supabaseAdmin.from('wallet_transactions').insert({
    user_id: escrowRow.vendor_id,
    type: 'escrow_release',
    amount: payoutAmount,
    description: `Escrow Payout Released — Order ${String(escrowRow.order_id).slice(0, 8)}`,
    status: 'completed',
    reference_id: String(escrowRow.id)
  });

  return {
    escrow: mapDbEscrowRow(updatedEscrow, actorUuid || escrowRow.buyer_id, params.actorAuthUid),
    alreadyReleased: false
  };
}

export async function disputePersistentEscrow(params: {
  escrowIdOrOrderKey: string;
  actorAuthUid: string;
  isPrivileged: boolean;
  reason: string;
}) {
  if (!supabaseAdmin) {
    throw new Error('FINANCE_UNAVAILABLE');
  }
  if (!params.reason.trim()) {
    throw new Error('DISPUTE_REASON_REQUIRED');
  }

  const actorUuid = await resolveProfileUuidByAuthUid(params.actorAuthUid);
  if (!actorUuid && !params.isPrivileged) {
    throw new Error('FORBIDDEN');
  }

  let query = supabaseAdmin.from('escrow_records').select('*');
  if (/^[0-9a-f-]{36}$/i.test(params.escrowIdOrOrderKey)) {
    query = query.or(`id.eq.${params.escrowIdOrOrderKey},order_id.eq.${params.escrowIdOrOrderKey}`);
  } else {
    const orderUuid = await resolveOrderUuidByOrderKey(params.escrowIdOrOrderKey);
    if (!orderUuid) throw new Error('ESCROW_NOT_FOUND');
    query = query.eq('order_id', orderUuid);
  }

  const { data: escrowRow } = await query.maybeSingle();
  if (!escrowRow) {
    throw new Error('ESCROW_NOT_FOUND');
  }

  const isParty = actorUuid && (escrowRow.buyer_id === actorUuid || escrowRow.vendor_id === actorUuid);
  if (!params.isPrivileged && !isParty) {
    throw new Error('FORBIDDEN');
  }

  const trimmedReason = params.reason.trim().slice(0, 500);
  const { data: updated, error } = await supabaseAdmin
    .from('escrow_records')
    .update({ status: 'disputed', dispute_reason: trimmedReason })
    .eq('id', escrowRow.id)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error('ESCROW_UPDATE_FAILED');
  }

  return {
    escrow: {
      ...mapDbEscrowRow(updated, actorUuid || updated.buyer_id, params.actorAuthUid),
      disputeReason: updated.dispute_reason || trimmedReason
    }
  };
}

