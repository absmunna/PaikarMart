import crypto from 'crypto';
import { isPaymentSandboxAllowed, isSslcommerzConfigured } from '../../../config/env.js';
import type {
  GatewayAvailabilityMode,
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentProviderAdapter,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from '../paymentTypes.js';

export class SslcommerzPaymentProvider implements PaymentProviderAdapter {
  readonly id = 'sslcommerz' as const;
  readonly displayName = 'SSLCommerz (Cards, Rocket & NetBanking)';
  readonly brandColor = '#1d4ed8';
  readonly channels = ['Visa / Mastercard', 'Rocket DBBL', 'BRAC / City Bank Net'];

  getAvailabilityMode(): GatewayAvailabilityMode {
    if (isSslcommerzConfigured()) return 'live';
    if (isPaymentSandboxAllowed()) return 'sandbox';
    return 'unavailable';
  }

  private getApiBase(): string {
    const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';
    return isLive ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
  }

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const mode = this.getAvailabilityMode();
    if (mode === 'unavailable') {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    const gatewayReference = `SSL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    if (mode === 'live') {
      const apiBase = this.getApiBase();
      const appOrigin = (process.env.APP_URL || '').replace(/\/$/, '');
      const form = new URLSearchParams({
        store_id: String(process.env.SSLCOMMERZ_STORE_ID || ''),
        store_passwd: String(process.env.SSLCOMMERZ_STORE_PASSWORD || ''),
        total_amount: String(input.amount),
        currency: 'BDT',
        tran_id: gatewayReference,
        success_url: appOrigin ? `${appOrigin}/api/payment/callback/sslcommerz` : 'https://paikarmart.local/success',
        fail_url: appOrigin ? `${appOrigin}/api/payment/callback/sslcommerz` : 'https://paikarmart.local/fail',
        cancel_url: appOrigin ? `${appOrigin}/api/payment/callback/sslcommerz` : 'https://paikarmart.local/cancel',
        ipn_url: appOrigin ? `${appOrigin}/api/payment/callback/sslcommerz` : '',
        cus_name: input.customerName || 'PaikarMart Customer',
        cus_email: input.customerEmail || 'customer@paikarmart.local',
        cus_add1: 'Dhaka',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        cus_phone: input.customerPhone || '01700000000',
        shipping_method: 'NO',
        product_name: input.purpose === 'wallet_deposit' ? 'PaikarMart Wallet Topup' : `Order ${input.orderId || input.sessionId}`,
        product_category: 'Commerce',
        product_profile: 'general',
      });

      const initRes = await fetch(`${apiBase}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const initJson = (await initRes.json().catch(() => ({}))) as {
        status?: string;
        GatewayPageURL?: string;
        sessionkey?: string;
      };
      if (!initRes.ok || initJson.status !== 'SUCCESS') {
        throw new Error('PROVIDER_INITIATE_FAILED');
      }

      return {
        provider: this.id,
        mode: 'live',
        gatewayReference: initJson.sessionkey || gatewayReference,
        checkoutUrl: initJson.GatewayPageURL,
      };
    }

    return {
      provider: this.id,
      mode: 'sandbox',
      gatewayReference,
      sandboxChallenge: {
        hint: 'SSLCommerz Sandbox Mode: Enter card/Rocket account, OTP 123456, and PIN 1212.',
        testWallet: '01711223344',
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
        trxId: `SSL-TRX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        message: 'SSLCommerz sandbox transaction verified.',
      };
    }

    if (!isSslcommerzConfigured() || !input.valId) {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    const apiBase = this.getApiBase();
    const qs = new URLSearchParams({
      val_id: input.valId,
      store_id: String(process.env.SSLCOMMERZ_STORE_ID || ''),
      store_passwd: String(process.env.SSLCOMMERZ_STORE_PASSWORD || ''),
      format: 'json',
    });

    const valRes = await fetch(`${apiBase}/validator/api/validationserverAPI.php?${qs.toString()}`);
    const valJson = (await valRes.json().catch(() => ({}))) as {
      status?: string;
      bank_tran_id?: string;
    };

    if (!valRes.ok || (valJson.status !== 'VALID' && valJson.status !== 'VALIDATED')) {
      throw new Error('PAYMENT_VERIFICATION_FAILED');
    }

    return {
      verified: true,
      provider: this.id,
      trxId: valJson.bank_tran_id || `SSL-TRX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      message: 'SSLCommerz live transaction validated.',
    };
  }
}
