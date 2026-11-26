import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { aiRouter } from '../modules/ai/aiRoutes.js';
import { retailRouter } from '../modules/retail/retailRoutes.js';
import { wholesaleRouter } from '../modules/wholesale/wholesaleRoutes.js';
import rfqRouter from '../modules/rfq/rfqRoutes.js';
import { vendorRouter } from '../modules/vendors/vendorRoutes.js';
import { socialRouter } from '../modules/social/socialRoutes.js';
import { createPaymentSession, findPaymentSessionById, clearMemoryPaymentSessionsForTest } from '../modules/payment/paymentRepository.js';
import {
  clearMemoryFlaggedPostsForTest,
  enqueueFlaggedPost,
  listFlaggedPosts,
  reviewFlaggedPostRecord,
} from '../modules/ai/moderationRepository.js';

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

test('AI generation and grounding routes reject unauthenticated requests with 401', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRouter);

  const srv = await startTestServer(app);
  try {
    for (const [path, body] of [
      ['/api/ai/chat', { message: 'hello' }],
      ['/api/ai/search-grounding', { prompt: 'dhaka rice price' }],
      ['/api/ai/maps-grounding', { prompt: 'wholesalers near gulshan' }],
      ['/api/ai/transcribe', { base64Audio: 'AAAA' }],
    ] as const) {
      const res = await fetch(`${srv.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.equal(res.status, 401, `Expected 401 on ${path}`);
    }
  } finally {
    await srv.close();
  }
});

test('Retail Q&A answer, RFQ quoting, and Vendor KYC endpoints enforce auth & RBAC', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/retail', retailRouter);
  app.use('/api/wholesale', wholesaleRouter);
  app.use('/api/rfq', rfqRouter);
  app.use('/api/vendors', vendorRouter);
  app.use('/api/feed', socialRouter);

  const srv = await startTestServer(app);
  try {
    const qnaRes = await fetch(`${srv.baseUrl}/api/retail/products/p1/qna/q1/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: 'Spoofed answer' }),
    });
    assert.equal(qnaRes.status, 401);

    const rfqRespondRes = await fetch(`${srv.baseUrl}/api/wholesale/rfq/RFQ-841020/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counterPrice: 1 }),
    });
    assert.equal(rfqRespondRes.status, 401);

    const rfqQuoteRes = await fetch(`${srv.baseUrl}/api/rfq/rfq_demo_101/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotedPricePerUnit: 99 }),
    });
    assert.equal(rfqQuoteRes.status, 401);

    const kycQueueRes = await fetch(`${srv.baseUrl}/api/vendors/kyc/queue`);
    assert.equal(kycQueueRes.status, 401);

    const feedGetRes = await fetch(`${srv.baseUrl}/api/feed`);
    assert.equal(feedGetRes.status, 200);
    const feedJson = (await feedGetRes.json()) as { posts: unknown[] };
    assert.ok(Array.isArray(feedJson.posts));

    const feedPostRes = await fetch(`${srv.baseUrl}/api/feed/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Unauthorized post' }),
    });
    assert.equal(feedPostRes.status, 401);
  } finally {
    await srv.close();
  }
});

test('paymentRepository persists and updates sessions across lookups in repository layer', async () => {
  clearMemoryPaymentSessionsForTest();
  const created = await createPaymentSession({
    id: 'pay_repo_test_1',
    uid: 'uid_test_repo',
    provider: 'bkash',
    purpose: 'wallet_deposit',
    amount: 750,
    currency: 'BDT',
    mode: 'sandbox',
    gatewayReference: 'BK-REF-001',
    status: 'initiated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert.equal(created.id, 'pay_repo_test_1');

  const found = await findPaymentSessionById('pay_repo_test_1');
  assert.ok(found);
  assert.equal(found.amount, 750);
  assert.equal(found.status, 'initiated');
});

test('AI moderation endpoints enforce auth and moderationRepository persists/reviews flagged posts', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRouter);

  const srv = await startTestServer(app);
  try {
    const modListRes = await fetch(`${srv.baseUrl}/api/ai/moderation/posts`);
    assert.equal(modListRes.status, 401);

    const modReviewRes = await fetch(`${srv.baseUrl}/api/ai/moderation/posts/mod_1/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'rejected' }),
    });
    assert.equal(modReviewRes.status, 401);
  } finally {
    await srv.close();
  }

  clearMemoryFlaggedPostsForTest();
  const created = await enqueueFlaggedPost({
    id: 'mod_repo_test_1',
    authorUid: 'uid_flagged_user',
    contentExcerpt: 'Selling banned weapon test',
    flaggedKeywords: ['weapon'],
    status: 'pending_human_review',
    createdAt: new Date().toISOString(),
  });
  assert.equal(created.id, 'mod_repo_test_1');

  const queued = await listFlaggedPosts();
  assert.equal(queued.length, 1);
  assert.equal(queued[0].status, 'pending_human_review');

  const reviewed = await reviewFlaggedPostRecord({
    id: 'mod_repo_test_1',
    decision: 'rejected',
    reviewedBy: 'mod@paikarmart.com',
  });
  assert.ok(reviewed);
  assert.equal(reviewed.status, 'rejected');
  assert.equal(reviewed.reviewedBy, 'mod@paikarmart.com');
});

test('walletMemoryStore enforces idempotency, balance checks, and escrow hold/release invariants', async () => {
  const {
    depositToWallet,
    withdrawFromWallet,
    createEscrowHoldRecord,
    releaseEscrowRecord,
    getOrCreateWallet,
  } = await import('../modules/wallet/walletMemoryStore.js');

  const uid = `wallet_unit_${Date.now()}`;
  const dep1 = depositToWallet({ userId: uid, amount: 2000, idempotencyKey: `dep_key_${uid}` });
  const dep2 = depositToWallet({ userId: uid, amount: 2000, idempotencyKey: `dep_key_${uid}` });
  assert.equal(dep1.isDuplicate, false);
  assert.equal(dep2.isDuplicate, true);
  assert.equal(getOrCreateWallet(uid).balance, 2000);

  assert.throws(() => withdrawFromWallet({ userId: uid, amount: 5000 }), /INSUFFICIENT_BALANCE/);

  const sellerUid = `seller_unit_${Date.now()}`;
  const hold = createEscrowHoldRecord({
    orderId: `ORD-${Date.now()}`,
    amount: 750,
    buyerId: uid,
    sellerId: sellerUid,
  });
  assert.equal(getOrCreateWallet(uid).balance, 1250);
  assert.equal(hold.escrow.status, 'held');

  const rel = releaseEscrowRecord(hold.escrow.id);
  assert.equal(rel.escrow.status, 'released');
  assert.equal(getOrCreateWallet(sellerUid).balance, 750);
});

test('structured logger redacts sensitive keys including camelCase serviceRoleKey and apiKey', async () => {
  const { logger } = await import('../services/logger.js');
  const logged: string[] = [];
  const originalLog = console.log;
  console.log = (msg?: unknown) => {
    logged.push(String(msg ?? ''));
  };
  try {
    logger.info('security.redaction_test', {
      module: 'test',
      serviceRoleKey: 'super-secret-role-key',
      apiKey: 'ai-secret-key',
      token: 'bearer-123',
      safeField: 'visible',
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(logged.length, 1);
  const parsed = JSON.parse(logged[0]) as Record<string, unknown>;
  assert.equal(parsed.serviceRoleKey, '[REDACTED]');
  assert.equal(parsed.apiKey, '[REDACTED]');
  assert.equal(parsed.token, '[REDACTED]');
  assert.equal(parsed.safeField, 'visible');
});
