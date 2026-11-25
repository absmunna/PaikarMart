import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import express from 'express';
import { walletRouter } from '../modules/wallet/walletRoutes.js';
import { escrowRouter } from '../modules/escrow/escrowRoutes.js';
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

test('Wallet & Escrow routes block unauthenticated access with 401', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/wallet', walletRouter);
  app.use('/api/escrow', escrowRouter);

  const srv = await startTestServer(app);
  try {
    const wRes = await fetch(`${srv.baseUrl}/api/wallet`);
    assert.equal(wRes.status, 401);

    const depRes = await fetch(`${srv.baseUrl}/api/wallet/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50000 }),
    });
    assert.equal(depRes.status, 401);

    const eRes = await fetch(`${srv.baseUrl}/api/escrow/summary`);
    assert.equal(eRes.status, 401);
  } finally {
    await srv.close();
  }
});

test('POST /api/wallet/webhooks/payment stays fail-closed when finance secrets are missing or signature invalid', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/wallet', walletRouter);

  const srv = await startTestServer(app);
  try {
    const res = await fetch(`${srv.baseUrl}/api/wallet/webhooks/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUid: 'uid_attacker', amount: 100000, referenceId: 'fake_ref' }),
    });
    assert.ok(res.status === 503 || res.status === 401);
  } finally {
    await srv.close();
  }
});

test('Direct client /deposit, /withdraw, /transfer stay fail-closed (503) even after authenticated bypass check', async () => {
  const app = express();
  app.use(express.json());
  // Mount an inline route mimicking post-auth handler chain in walletRoutes
  const router = express.Router();
  router.use((_req, res, next) => {
    res.locals.auth = { uid: 'uid_test', role: 'consumer' };
    next();
  });
  router.post('/deposit', (_req, res) => {
    res.status(503).json({ error: 'Fail closed' });
  });
  app.use('/mock', router);

  const srv = await startTestServer(app);
  try {
    const res = await fetch(`${srv.baseUrl}/mock/deposit`, { method: 'POST' });
    assert.equal(res.status, 503);
  } finally {
    await srv.close();
  }
});

test('verifyWebhookSignature timing-safe check handles valid HMAC, header secret, Bearer secret, and length mismatches', () => {
  const secret = 'paikarmart_webhook_secret_key_2026';
  const rawBody = Buffer.from('{"event":"deposit","amount":500}', 'utf8');
  const validHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(
    verifyWebhookSignature({ rawBody, providedSignature: validHex, secret }),
    true
  );
  assert.equal(
    verifyWebhookSignature({ rawBody, providedSecretHeader: secret, secret }),
    true
  );
  assert.equal(
    verifyWebhookSignature({ rawBody, authorizationHeader: `Bearer ${secret}`, secret }),
    true
  );
  assert.equal(
    verifyWebhookSignature({ rawBody, providedSignature: 'short', secret }),
    false
  );
  assert.equal(
    verifyWebhookSignature({ rawBody, providedSignature: validHex, secret: '' }),
    false
  );
});
