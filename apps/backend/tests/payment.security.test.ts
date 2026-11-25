import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import express from 'express';
import {
  clearPaymentSessionsForTest,
  getPaymentProviderAdapter,
  paymentRouter,
} from '../modules/payment/paymentRoutes.js';
import { verifyWebhookSignature } from '../modules/logistics/courierAdapters.js';

function startTestServer(app: express.Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise<void>((resClose) => server.close(() => resClose())),
      });
    });
  });
}

test('GET /api/payment/providers returns safe provider list without exposing credentials', async () => {
  const app = express();
  app.use('/api/payment', paymentRouter);

  const srv = await startTestServer(app);
  try {
    const res = await fetch(`${srv.baseUrl}/api/payment/providers`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { success: boolean; providers: Array<{ id: string; mode: string }> };
    assert.equal(json.success, true);
    const ids = json.providers.map((p) => p.id);
    assert.deepEqual(ids.sort(), ['bkash', 'nagad', 'sslcommerz']);
    assert.equal(JSON.stringify(json).includes('APP_SECRET'), false);
    assert.equal(JSON.stringify(json).includes('STORE_PASSWORD'), false);
  } finally {
    await srv.close();
  }
});

test('POST /api/payment/initiate and /verify reject unauthenticated callers with 401', async () => {
  clearPaymentSessionsForTest();
  const app = express();
  app.use(express.json());
  app.use('/api/payment', paymentRouter);

  const srv = await startTestServer(app);
  try {
    const initRes = await fetch(`${srv.baseUrl}/api/payment/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'bkash', amount: 500, purpose: 'wallet_deposit' }),
    });
    assert.equal(initRes.status, 401);

    const verifyRes = await fetch(`${srv.baseUrl}/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'pay_fake', otp: '123456', pin: '1212' }),
    });
    assert.equal(verifyRes.status, 401);
  } finally {
    await srv.close();
  }
});

test('POST /api/payment/callback/:provider fails closed when PAYMENT_WEBHOOK_SECRET is missing', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/payment', paymentRouter);

  const srv = await startTestServer(app);
  try {
    const res = await fetch(`${srv.baseUrl}/api/payment/callback/bkash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUid: 'u1', amount: 1000, referenceId: 'ref_1' }),
    });
    // Expect 503 fail-closed unless live finance & webhook secret are configured, or 401 if configured without valid sig
    assert.ok(res.status === 503 || res.status === 401);
  } finally {
    await srv.close();
  }
});

test('Payment gateway adapters fail closed in production when credentials and sandbox override are absent', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevSandbox = process.env.PAYMENT_SANDBOX_MODE;
  const prevAppKey = process.env.BKASH_APP_KEY;

  process.env.NODE_ENV = 'production';
  process.env.PAYMENT_SANDBOX_MODE = 'false';
  delete process.env.BKASH_APP_KEY;

  try {
    const bkash = getPaymentProviderAdapter('bkash');
    assert.equal(bkash.getAvailabilityMode(), 'unavailable');
    await assert.rejects(
      () =>
        bkash.initiate({
          sessionId: 'pay_prod_check',
          uid: 'u_test',
          amount: 500,
          purpose: 'wallet_deposit',
        }),
      /PROVIDER_NOT_CONFIGURED/
    );
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevSandbox === undefined) delete process.env.PAYMENT_SANDBOX_MODE;
    else process.env.PAYMENT_SANDBOX_MODE = prevSandbox;
    if (prevAppKey !== undefined) process.env.BKASH_APP_KEY = prevAppKey;
  }
});

test('Sandbox payment verification rejects wrong OTP or PIN and succeeds with sandbox credentials', async () => {
  const prevSandbox = process.env.PAYMENT_SANDBOX_MODE;
  process.env.PAYMENT_SANDBOX_MODE = 'true';

  try {
    const nagad = getPaymentProviderAdapter('nagad');
    const init = await nagad.initiate({
      sessionId: 'pay_sbx_1',
      uid: 'u_test',
      amount: 1200,
      purpose: 'order_checkout',
      orderId: 'PKM-100200',
    });
    assert.equal(init.mode, 'sandbox');

    const fakeSession = {
      id: 'pay_sbx_1',
      uid: 'u_test',
      provider: 'nagad' as const,
      purpose: 'order_checkout' as const,
      amount: 1200,
      currency: 'BDT' as const,
      mode: 'sandbox' as const,
      gatewayReference: init.gatewayReference,
      status: 'initiated' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await assert.rejects(
      () => nagad.verify({ session: fakeSession, otp: '000000', pin: '1212' }),
      /INVALID_GATEWAY_CREDENTIALS/
    );

    const verified = await nagad.verify({ session: fakeSession, otp: '123456', pin: '1212' });
    assert.equal(verified.verified, true);
    assert.ok(verified.trxId.startsWith('NGD-TRX-'));
  } finally {
    if (prevSandbox === undefined) delete process.env.PAYMENT_SANDBOX_MODE;
    else process.env.PAYMENT_SANDBOX_MODE = prevSandbox;
  }
});

test('Payment callback HMAC verification rejects tampered payloads and accepts genuine signatures', () => {
  const secret = 'test-payment-webhook-secret-32chars';
  const payload = JSON.stringify({ authUid: 'uid_abc', amount: 1500, referenceId: 'TRX-991' });
  const sig = crypto.createHmac('sha256', secret).update(Buffer.from(payload, 'utf8')).digest('hex');

  assert.equal(
    verifyWebhookSignature({
      rawBody: Buffer.from(payload, 'utf8'),
      providedSignature: `sha256=${sig}`,
      secret,
    }),
    true
  );

  const tampered = JSON.stringify({ authUid: 'uid_abc', amount: 999999, referenceId: 'TRX-991' });
  assert.equal(
    verifyWebhookSignature({
      rawBody: Buffer.from(tampered, 'utf8'),
      providedSignature: `sha256=${sig}`,
      secret,
    }),
    false
  );
});
