import crypto from 'crypto';
import { isBkashConfigured, isPaymentSandboxAllowed } from '../../../config/env.js';
import type {
  GatewayAvailabilityMode,
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentProviderAdapter,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from '../paymentTypes.js';

export class BkashPaymentProvider implements PaymentProviderAdapter {
  readonly id = 'bkash' as const;
  readonly displayName = 'bKash Mobile Banking';
  readonly brandColor = '#e2136e';
  readonly channels = ['bKash Personal', 'bKash Merchant'];

  getAvailabilityMode(): GatewayAvailabilityMode {
    if (isBkashConfigured()) return 'live';
    if (isPaymentSandboxAllowed()) return 'sandbox';
    return 'unavailable';
  }

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const mode = this.getAvailabilityMode();
    if (mode === 'unavailable') {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    const gatewayReference = `BKS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    if (mode === 'live') {
      const baseUrl = (process.env.BKASH_BASE_URL || 'https://tokenized.pay.bka.sh/v1.2.0-beta').replace(/\/$/, '');
      const grantRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          username: String(process.env.BKASH_USERNAME || ''),
          password: String(process.env.BKASH_PASSWORD || ''),
        },
        body: JSON.stringify({
          app_key: String(process.env.BKASH_APP_KEY || ''),
          app_secret: String(process.env.BKASH_APP_SECRET || ''),
        }),
      });
      const grantJson = (await grantRes.json().catch(() => ({}))) as { id_token?: string };
      if (!grantRes.ok || !grantJson?.id_token) {
        throw new Error('PROVIDER_HANDSHAKE_FAILED');
      }

      const appOrigin = (process.env.APP_URL || '').replace(/\/$/, '');
      const createRes = await fetch(`${baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: grantJson.id_token,
          'X-APP-Key': String(process.env.BKASH_APP_KEY || ''),
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: input.uid.slice(0, 32),
          callbackURL: appOrigin ? `${appOrigin}/api/payment/callback/bkash` : undefined,
          amount: String(input.amount),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: input.orderId || input.sessionId,
        }),
      });
      const createJson = (await createRes.json().catch(() => ({}))) as {
        paymentID?: string;
        bkashURL?: string;
      };
      if (!createRes.ok || !createJson?.paymentID) {
        throw new Error('PROVIDER_INITIATE_FAILED');
      }

      return {
        provider: this.id,
        mode: 'live',
        gatewayReference: createJson.paymentID,
        checkoutUrl: createJson.bkashURL,
      };
    }

    return {
      provider: this.id,
      mode: 'sandbox',
      gatewayReference,
      sandboxChallenge: {
        hint: 'bKash Sandbox Mode: Enter wallet number, OTP 123456, and PIN 1212.',
        testWallet: '01770618575',
        testOtp: '123456',
        testPin: '1212',
      },
    };
  }

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (input.session.mode === 'sandbox') {
      const otp = String(input.otp || '').trim();
      const pin = String(input.pin || '').trim();
      if (otp !== '123456' || pin !== '1212') {
        throw new Error('INVALID_GATEWAY_CREDENTIALS');
      }
      return {
        verified: true,
        provider: this.id,
        trxId: `BKS-TRX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        message: 'bKash sandbox payment verified.',
      };
    }

    if (!isBkashConfigured()) {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    const baseUrl = (process.env.BKASH_BASE_URL || 'https://tokenized.pay.bka.sh/v1.2.0-beta').replace(/\/$/, '');
    const grantRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: String(process.env.BKASH_USERNAME || ''),
        password: String(process.env.BKASH_PASSWORD || ''),
      },
      body: JSON.stringify({
        app_key: String(process.env.BKASH_APP_KEY || ''),
        app_secret: String(process.env.BKASH_APP_SECRET || ''),
      }),
    });
    const grantJson = (await grantRes.json().catch(() => ({}))) as { id_token?: string };
    if (!grantRes.ok || !grantJson?.id_token) {
      throw new Error('PROVIDER_HANDSHAKE_FAILED');
    }

    const execRes = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: grantJson.id_token,
        'X-APP-Key': String(process.env.BKASH_APP_KEY || ''),
      },
      body: JSON.stringify({
        paymentID: input.session.gatewayReference,
      }),
    });
    const execJson = (await execRes.json().catch(() => ({}))) as {
      transactionStatus?: string;
      trxID?: string;
    };

    if (!execRes.ok || execJson.transactionStatus !== 'Completed' || !execJson.trxID) {
      throw new Error('PAYMENT_VERIFICATION_FAILED');
    }

    return {
      verified: true,
      provider: this.id,
      trxId: execJson.trxID,
      message: 'bKash live payment verified.',
    };
  }
}
