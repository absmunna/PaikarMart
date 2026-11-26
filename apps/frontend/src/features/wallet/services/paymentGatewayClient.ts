import { API_BASE, apiRequest } from '@/shared/services/apiClient';

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
  return await apiRequest<PaymentInitiateResponse>('/api/payment/initiate', {
    method: 'POST',
    requireAuth: true,
    json: true,
    headers: payload.idempotencyKey ? { 'X-Idempotency-Key': payload.idempotencyKey } : undefined,
    body: JSON.stringify(payload),
  });
}

export async function verifyGatewayPaymentApi(payload: {
  sessionId: string;
  walletNumber?: string;
  otp?: string;
  pin?: string;
  valId?: string;
}): Promise<PaymentVerifyResponse> {
  return await apiRequest<PaymentVerifyResponse>('/api/payment/verify', {
    method: 'POST',
    requireAuth: true,
    json: true,
    body: JSON.stringify(payload),
  });
}
