import { EscrowRecord, EscrowSummary, WalletServerPayload } from '@/features/wallet/types/walletTypes';
import { apiRequest } from '@/shared/services/apiClient';

export async function fetchWalletStateApi(userId = 'user_me'): Promise<{
  source: 'supabase' | 'memory';
  persistenceReady: boolean;
  wallet: WalletServerPayload;
  escrowSummary: EscrowSummary;
  escrows: EscrowRecord[];
}> {
  void userId;
  return await apiRequest('/api/wallet', { requireAuth: false }).catch(() => ({
    source: 'memory' as const,
    persistenceReady: false,
    wallet: { balance: 0, coins: 0, escrowBalance: 0, totalEarned: 0 },
    escrowSummary: { totalHeld: 0, activeHolds: 0, releasedTotal: 0, disputedTotal: 0 },
    escrows: [],
  }));
}

export async function depositWalletApi(payload: {
  userId?: string;
  amount: number;
  method: string;
  idempotencyKey?: string;
}): Promise<{ wallet: WalletServerPayload; earnedCoins?: number }> {
  return await apiRequest('/api/wallet/deposit', {
    method: 'POST',
    requireAuth: true,
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function withdrawWalletApi(payload: {
  userId?: string;
  amount: number;
  method: string;
  accountDetails?: string;
  idempotencyKey?: string;
}): Promise<{ wallet: WalletServerPayload }> {
  return await apiRequest('/api/wallet/withdraw', {
    method: 'POST',
    requireAuth: true,
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function transferWalletApi(payload: {
  userId?: string;
  amount: number;
  recipient: string;
  note?: string;
  idempotencyKey?: string;
}): Promise<{ wallet: WalletServerPayload }> {
  return await apiRequest('/api/wallet/transfer', {
    method: 'POST',
    requireAuth: true,
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function redeemCoinsApi(payload: {
  userId?: string;
  coinsToRedeem: number;
}): Promise<{ wallet: WalletServerPayload; bdtValue: number }> {
  return await apiRequest('/api/wallet/redeem-coins', {
    method: 'POST',
    requireAuth: true,
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function fetchEscrowSummaryApi(userId = 'user_me'): Promise<{
  summary: EscrowSummary;
  escrows: EscrowRecord[];
}> {
  void userId;
  return await apiRequest('/api/escrow/summary', { requireAuth: true });
}

export async function createEscrowHoldApi(payload: {
  orderId: string;
  poNumber?: string;
  title?: string;
  amount: number;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
  holdDays?: number;
}): Promise<{ escrow: EscrowRecord; wallet: WalletServerPayload }> {
  return await apiRequest('/api/escrow/hold', {
    method: 'POST',
    requireAuth: true,
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function releaseEscrowApi(escrowId: string): Promise<{
  escrow: EscrowRecord;
  wallet: WalletServerPayload;
}> {
  return await apiRequest(`/api/escrow/release/${encodeURIComponent(escrowId)}`, {
    method: 'POST',
    requireAuth: true,
    json: true,
  });
}

export async function disputeEscrowApi(
  escrowId: string,
  reason: string
): Promise<{ escrow: EscrowRecord; wallet: WalletServerPayload }> {
  return await apiRequest(`/api/escrow/dispute/${encodeURIComponent(escrowId)}`, {
    method: 'POST',
    requireAuth: true,
    json: true,
    body: JSON.stringify({ reason }),
  });
}
