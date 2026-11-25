import { auth } from '@/lib/firebase';

export type PaymentGatewayProviderId = 'bkash' | 'nagad' | 'sslcommerz';

export interface PaymentProviderInfo {
  id: PaymentGatewayProviderId;
  name: string;
  brandColor: string;
  channels: string[];
  mode: 'live' | 'sandbox' | 'unavailable';
}

export interface InitiatedPaymentSession {
  id: string;
  provider: PaymentGatewayProviderId;
  purpose: 'wallet_deposit' | 'order_checkout';
  amount: number;
  currency: 'BDT';
  mode: 'live' | 'sandbox';
  gatewayReference: string;
  status: string;
}

export interface PaymentInitiateResponse {
  success: boolean;
  session: InitiatedPaymentSession;
  checkoutUrl?: string;
  sandboxChallenge?: {
    hint: string;
    testWallet: string;
    testOtp: string;
    testPin: string;
  };
}

export interface PaymentVerifyResponse {
  success: boolean;
  session: InitiatedPaymentSession;
  trxId: string;
  message: string;
  walletCredit?: Record<string, unknown>;
}

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function requireAuthHeaders(json = true): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in first to process a payment.');
  }
  const token = await user.getIdToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchPaymentProvidersApi(): Promise<PaymentProviderInfo[]> {
  try {
    const res = await fetch(`${API_BASE}/api/payment/providers`);
    if (!res.ok) return [];
    const data = (await res.json()) as { providers?: PaymentProviderInfo[] };
    return Array.isArray(data.providers) ? data.providers : [];
  } catch {
    return [];
  }
}

export async function initiateGatewayPaymentApi(payload: {
  provider: PaymentGatewayProviderId;
  amount: number;
  purpose: 'wallet_deposit' | 'order_checkout';
  orderId?: string;
  customerPhone?: string;
  customerName?: string;
  idempotencyKey?: string;
}): Promise<PaymentInitiateResponse> {
  const headers = await requireAuthHeaders(true);
  if (payload.idempotencyKey) {
    headers['X-Idempotency-Key'] = payload.idempotencyKey;
  }
  const res = await fetch(`${API_BASE}/api/payment/initiate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Could not initiate payment gateway session.');
  }
  return data as PaymentInitiateResponse;
}

export async function verifyGatewayPaymentApi(payload: {
  sessionId: string;
  walletNumber?: string;
  otp?: string;
  pin?: string;
  valId?: string;
}): Promise<PaymentVerifyResponse> {
  const headers = await requireAuthHeaders(true);
  const res = await fetch(`${API_BASE}/api/payment/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Gateway payment verification failed.');
  }
  return data as PaymentVerifyResponse;
}
