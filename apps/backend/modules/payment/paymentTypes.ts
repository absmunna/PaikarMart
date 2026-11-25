export type PaymentProviderId = 'bkash' | 'nagad' | 'sslcommerz';

export type PaymentPurpose = 'wallet_deposit' | 'order_checkout';

export type PaymentSessionStatus = 'initiated' | 'completed' | 'failed' | 'cancelled';

export type GatewayAvailabilityMode = 'live' | 'sandbox' | 'unavailable';

export interface PaymentProviderSummary {
  id: PaymentProviderId;
  name: string;
  brandColor: string;
  channels: string[];
  mode: GatewayAvailabilityMode;
}

export interface PaymentInitiateInput {
  sessionId: string;
  uid: string;
  amount: number;
  purpose: PaymentPurpose;
  orderId?: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface PaymentInitiateResult {
  provider: PaymentProviderId;
  mode: 'live' | 'sandbox';
  gatewayReference: string;
  checkoutUrl?: string;
  sandboxChallenge?: {
    hint: string;
    testWallet: string;
    testOtp: string;
    testPin: string;
  };
}

export interface PaymentVerifyInput {
  session: PaymentSessionRecord;
  otp?: string;
  pin?: string;
  walletNumber?: string;
  valId?: string;
}

export interface PaymentVerifyResult {
  verified: boolean;
  provider: PaymentProviderId;
  trxId: string;
  message: string;
}

export interface PaymentProviderAdapter {
  id: PaymentProviderId;
  displayName: string;
  brandColor: string;
  channels: string[];
  getAvailabilityMode(): GatewayAvailabilityMode;
  initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult>;
  verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
}

export interface PaymentSessionRecord {
  id: string;
  uid: string;
  provider: PaymentProviderId;
  purpose: PaymentPurpose;
  amount: number;
  currency: 'BDT';
  orderId?: string;
  customerPhone?: string;
  mode: 'live' | 'sandbox';
  gatewayReference: string;
  trxId?: string;
  status: PaymentSessionStatus;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}
