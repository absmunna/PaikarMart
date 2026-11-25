import crypto from 'crypto';
import { isNagadConfigured, isPaymentSandboxAllowed } from '../../../config/env.js';
import type {
  GatewayAvailabilityMode,
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentProviderAdapter,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from '../paymentTypes.js';

export class NagadPaymentProvider implements PaymentProviderAdapter {
  readonly id = 'nagad' as const;
  readonly displayName = 'Nagad Digital Wallet';
  readonly brandColor = '#f37021';
  readonly channels = ['Nagad Personal', 'Nagad Islamic'];

  getAvailabilityMode(): GatewayAvailabilityMode {
    if (isNagadConfigured()) return 'live';
    if (isPaymentSandboxAllowed()) return 'sandbox';
    return 'unavailable';
  }

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const mode = this.getAvailabilityMode();
    if (mode === 'unavailable') {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    const gatewayReference = `NGD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    if (mode === 'live') {
      const baseUrl = (
        process.env.NAGAD_BASE_URL ||
        'https://sandbox.mynagad.com:10060/remote-payment-gateway-1.0/api/dfs'
      ).replace(/\/$/, '');
      const merchantId = String(process.env.NAGAD_MERCHANT_ID || '');
      const orderRef = input.orderId || input.sessionId;
      const checkRes = await fetch(
        `${baseUrl}/check-out/initialize/${encodeURIComponent(merchantId)}/${encodeURIComponent(orderRef)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateTime: new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14),
            challenge: crypto.randomBytes(16).toString('hex'),
          }),
        }
      );

      if (!checkRes.ok) {
        throw new Error('PROVIDER_INITIATE_FAILED');
      }

      const data = (await checkRes.json().catch(() => ({}))) as {
        sensitiveData?: string;
        callBackUrl?: string;
      };
      return {
        provider: this.id,
        mode: 'live',
        gatewayReference,
        checkoutUrl: data.callBackUrl,
      };
    }

    return {
      provider: this.id,
      mode: 'sandbox',
      gatewayReference,
      sandboxChallenge: {
        hint: 'Nagad Sandbox Mode: Enter wallet number, OTP 123456, and PIN 1212.',
        testWallet: '01812345678',
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
        trxId: `NGD-TRX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        message: 'Nagad sandbox payment verified.',
      };
    }

    if (!isNagadConfigured()) {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    const baseUrl = (
      process.env.NAGAD_BASE_URL ||
      'https://sandbox.mynagad.com:10060/remote-payment-gateway-1.0/api/dfs'
    ).replace(/\/$/, '');
    const verifyRes = await fetch(
      `${baseUrl}/verify/payment/${encodeURIComponent(input.session.gatewayReference)}`
    );
    const verifyJson = (await verifyRes.json().catch(() => ({}))) as {
      status?: string;
      issuerPaymentRefNo?: string;
    };

    if (!verifyRes.ok || verifyJson.status !== 'Success') {
      throw new Error('PAYMENT_VERIFICATION_FAILED');
    }

    return {
      verified: true,
      provider: this.id,
      trxId: verifyJson.issuerPaymentRefNo || `NGD-TRX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      message: 'Nagad live payment verified.',
    };
  }
}
