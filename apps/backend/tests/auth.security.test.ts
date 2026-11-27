import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { securityHeadersMiddleware } from '../middleware/securityHeaders.js';
import {
  auditMiddleware,
  clearAuditEvents,
  getRecentAuditEvents,
  redactSensitiveFields,
} from '../middleware/audit.js';
import {
  isAllowlistedSuperAdminEmail,
  requireFirebaseAuth,
  requireRole,
  SUPER_ADMIN_EMAILS,
} from '../middleware/requireFirebaseAuth.js';
import { notificationRouter } from '../modules/notifications/notificationRoutes.js';
import identityRouter from '../modules/identity/identityRoutes.js';
import { aiRouter } from '../modules/ai/aiRoutes.js';
import rfqRouter from '../modules/rfq/rfqRoutes.js';
import { authRouter } from '../modules/auth/authRoutes.js';
import { generatePmin, rankSellerOffersForBuyBox } from '../modules/catalog/catalogRoutes.js';
import storageRouter from '../modules/storage/storageRoutes.js';

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

test('securityHeadersMiddleware enforces hardening headers while keeping AI Studio iframe embeddable', async () => {
  const app = express();
  app.use(securityHeadersMiddleware);
  app.get('/ping', (_req, res) => res.json({ ok: true }));

  const srv = await startTestServer(app);
  try {
    const response = await fetch(`${srv.baseUrl}/ping`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal(response.headers.get('x-frame-options'), null);
  } finally {
    await srv.close();
  }
});

test('requireFirebaseAuth rejects requests without Bearer token with 401', async () => {
  const app = express();
  app.use('/api/notifications', notificationRouter);

  const srv = await startTestServer(app);
  try {
    const unauth = await fetch(`${srv.baseUrl}/api/notifications`);
    assert.equal(unauth.status, 401);

    const invalidScheme = await fetch(`${srv.baseUrl}/api/notifications`, {
      headers: { Authorization: 'Basic abc123' },
    });
    assert.equal(invalidScheme.status, 401);

    const invalidJwt = await fetch(`${srv.baseUrl}/api/notifications`, {
      headers: { Authorization: 'Bearer not-a-valid-firebase-jwt' },
    });
    assert.ok(invalidJwt.status === 401 || invalidJwt.status === 503);
  } finally {
    await srv.close();
  }
});

test('requireRole enforces RBAC hierarchy (blocks consumer/moderator from admin/super_admin routes)', () => {
  const mkRes = () => {
    const res: any = {
      statusCode: 200,
      locals: {},
      body: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    return res;
  };

  const adminGate = requireRole(['admin', 'super_admin']);
  const superAdminGate = requireRole('super_admin');

  // Consumer blocked
  const resConsumer = mkRes();
  resConsumer.locals.auth = { uid: 'u1', role: 'consumer', roles: ['consumer'] };
  let called = false;
  adminGate({} as any, resConsumer, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(resConsumer.statusCode, 403);

  // Moderator cannot enter admin/super_admin gate
  const resMod = mkRes();
  resMod.locals.auth = { uid: 'u2', role: 'moderator', roles: ['moderator'] };
  called = false;
  adminGate({} as any, resMod, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(resMod.statusCode, 403);

  // Admin blocked from super_admin-only gate
  const resAdminOnSuper = mkRes();
  resAdminOnSuper.locals.auth = { uid: 'u3', role: 'admin', roles: ['admin'] };
  called = false;
  superAdminGate({} as any, resAdminOnSuper, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(resAdminOnSuper.statusCode, 403);

  // Super Admin allowed through
  const resSuper = mkRes();
  resSuper.locals.auth = { uid: 'u4', role: 'super_admin', roles: ['super_admin'] };
  called = false;
  superAdminGate({} as any, resSuper, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(resSuper.statusCode, 200);
});

test('auditMiddleware records mutations while redacting sensitive fields', async () => {
  clearAuditEvents();
  const redacted = redactSensitiveFields({
    storeName: 'Dhaka Wholesale',
    password: 'my-secret-password',
    nidNumber: '1990123456789',
    nested: { dataBase64: 'AAAABBBB', pin: '1212', otp: '123456', safeField: 'visible' },
  }) as Record<string, any>;

  assert.equal(redacted.storeName, 'Dhaka Wholesale');
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.nidNumber, '[REDACTED]');
  assert.equal(redacted.nested.dataBase64, '[REDACTED]');
  assert.equal(redacted.nested.pin, '[REDACTED]');
  assert.equal(redacted.nested.otp, '[REDACTED]');
  assert.equal(redacted.nested.safeField, 'visible');

  const app = express();
  app.use(express.json());
  app.use('/api', auditMiddleware);
  app.post('/api/test-mutation', (_req, res) => res.status(201).json({ ok: true }));

  const srv = await startTestServer(app);
  try {
    const resp = await fetch(`${srv.baseUrl}/api/test-mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500, pin: '9999', secretToken: 'tok_123' }),
    });
    assert.equal(resp.status, 201);
    const recent = getRecentAuditEvents(10);
    assert.ok(recent.length >= 1);
    assert.equal(recent[0].path, '/api/test-mutation');
    assert.equal(recent[0].metadata?.amount, 500);
    assert.equal(recent[0].metadata?.pin, '[REDACTED]');
    assert.equal(recent[0].metadata?.secretToken, '[REDACTED]');
  } finally {
    await srv.close();
  }
});

test('identityRouter, ai moderate-post, and rfq/forecasting routes enforce authentication and return JSON', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/identity', identityRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/rfq', rfqRouter);
  app.use('/api/forecasting', rfqRouter);

  const srv = await startTestServer(app);
  try {
    const kycPost = await fetch(`${srv.baseUrl}/api/identity/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentType: 'NID', documentNumber: '1234567890' }),
    });
    assert.equal(kycPost.status, 401);

    const kycGet = await fetch(`${srv.baseUrl}/api/identity/verification/ver_123`);
    assert.equal(kycGet.status, 401);

    const modPost = await fetch(`${srv.baseUrl}/api/ai/moderate-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Fresh organic mango for sale' }),
    });
    assert.equal(modPost.status, 401);

    const rfqGet = await fetch(`${srv.baseUrl}/api/rfq`);
    assert.equal(rfqGet.status, 401);
    assert.match(rfqGet.headers.get('content-type') || '', /application\/json/);

    const forecastGet = await fetch(`${srv.baseUrl}/api/forecasting/predict`);
    assert.equal(forecastGet.status, 401);
    assert.match(forecastGet.headers.get('content-type') || '', /application\/json/);
  } finally {
    await srv.close();
  }
});

test('requireFirebaseAuth export remains callable', () => {
  assert.equal(typeof requireFirebaseAuth, 'function');
});

test('allowlisted super-admin emails require a verified Firebase email claim', () => {
  const allowlistedEmail = Array.from(SUPER_ADMIN_EMAILS)[0];

  assert.equal(isAllowlistedSuperAdminEmail(allowlistedEmail, false), false);
  assert.equal(isAllowlistedSuperAdminEmail(allowlistedEmail, undefined), false);
  assert.equal(isAllowlistedSuperAdminEmail(allowlistedEmail?.toUpperCase(), true), true);
  assert.equal(isAllowlistedSuperAdminEmail('unlisted@example.com', true), false);
});

test('Step 1 & 5: promote-seller and promote-creator enforce auth on both /api/auth and /api/v1/auth', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/v1/auth', authRouter);

  const srv = await startTestServer(app);
  try {
    for (const prefix of ['/api/auth', '/api/v1/auth']) {
      const sellerRes = await fetch(`${srv.baseUrl}${prefix}/promote-seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName: 'Dhaka Mart', type: 'retail' }),
      });
      assert.equal(sellerRes.status, 401);

      const creatorRes = await fetch(`${srv.baseUrl}${prefix}/promote-creator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName: 'Dhaka Creator' }),
      });
      assert.equal(creatorRes.status, 401);
    }
  } finally {
    await srv.close();
  }
});

test('Step 2: generatePmin produces valid PMIN-B codes and Buy-Box picks lowest landed in-stock verified offer', () => {
  const pminA = generatePmin();
  const pminB = generatePmin();
  assert.match(pminA, /^PMIN-B[A-Z0-9]{10}$/);
  assert.match(pminB, /^PMIN-B[A-Z0-9]{10}$/);
  assert.notEqual(pminA, pminB);

  const ranked = rankSellerOffersForBuyBox([
    { id: 'oos_cheapest', isActive: true, stockQuantity: 0, price: 400, shippingFee: 0, sellerVerified: true },
    { id: 'high_ship', isActive: true, stockQuantity: 10, price: 480, shippingFee: 80, sellerVerified: true },
    { id: 'winner_landed', isActive: true, stockQuantity: 5, price: 500, shippingFee: 20, sellerVerified: true },
    { id: 'tie_unverified', isActive: true, stockQuantity: 5, price: 500, shippingFee: 20, sellerVerified: false },
  ]);

  assert.equal(ranked[0].id, 'winner_landed');
  assert.equal(ranked[0].isBuyBoxWinner, true);
  assert.equal(ranked.filter((o) => o.isBuyBoxWinner).length, 1);
  assert.equal(ranked[ranked.length - 1].id, 'oos_cheapest');
  assert.equal(ranked[ranked.length - 1].isBuyBoxWinner, false);
});

test('Step 3 & 5: Citizen KYC review and post moderation endpoints enforce auth + moderator/admin RBAC', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/identity', identityRouter);
  app.use('/api/v1/verifications', identityRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/v1/ai', aiRouter);

  const srv = await startTestServer(app);
  try {
    const pendingRes = await fetch(`${srv.baseUrl}/api/identity/verifications/pending`);
    assert.equal(pendingRes.status, 401);

    const pendingV1Res = await fetch(`${srv.baseUrl}/api/v1/verifications/pending`);
    assert.equal(pendingV1Res.status, 401);

    const reviewRes = await fetch(`${srv.baseUrl}/api/identity/verifications/ver_123/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'verified' }),
    });
    assert.equal(reviewRes.status, 401);

    const modQueueRes = await fetch(`${srv.baseUrl}/api/ai/moderation/posts`);
    assert.equal(modQueueRes.status, 401);
  } finally {
    await srv.close();
  }

  // Verify moderator role is permitted while consumer is blocked
  const modGate = requireRole(['moderator', 'admin', 'super_admin']);
  const resConsumer: any = { statusCode: 200, locals: { auth: { uid: 'c1', role: 'consumer', roles: ['consumer'] } }, status(c: number) { this.statusCode = c; return this; }, json() { return this; } };
  let modAllowed = false;
  modGate({} as any, resConsumer, () => { modAllowed = true; });
  assert.equal(modAllowed, false);
  assert.equal(resConsumer.statusCode, 403);

  const resMod: any = { statusCode: 200, locals: { auth: { uid: 'm1', role: 'moderator', roles: ['moderator'] } }, status(c: number) { this.statusCode = c; return this; }, json() { return this; } };
  modAllowed = false;
  modGate({} as any, resMod, () => { modAllowed = true; });
  assert.equal(modAllowed, true);
});

test('Step 4 & 5: storageRouter enforces authentication on /api/storage and /api/v1/storage', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/storage', storageRouter);
  app.use('/api/v1/storage', storageRouter);

  const srv = await startTestServer(app);
  try {
    for (const prefix of ['/api/storage', '/api/v1/storage']) {
      const imgRes = await fetch(`${srv.baseUrl}${prefix}/upload/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'image/png', dataBase64: 'AAAA' }),
      });
      assert.equal(imgRes.status, 401);

      const digRes = await fetch(`${srv.baseUrl}${prefix}/upload/digital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'application/pdf', dataBase64: 'AAAA' }),
      });
      assert.equal(digRes.status, 401);

      const signedRes = await fetch(`${srv.baseUrl}${prefix}/file/file_123/signed-url`);
      assert.equal(signedRes.status, 401);
    }
  } finally {
    await srv.close();
  }
});
