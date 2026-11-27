import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { orderRouter } from '../modules/orders/orderRoutes.js';
import { evaluateVoucher } from '../modules/retail/retailRoutes.js';

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

test('GET /api/orders rejects unauthenticated requests with 401', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRouter);

  const srv = await startTestServer(app);
  try {
    const listRes = await fetch(`${srv.baseUrl}/api/orders`);
    assert.equal(listRes.status, 401);

    const statusRes = await fetch(`${srv.baseUrl}/api/orders/PKM-123456/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'delivered' }),
    });
    assert.equal(statusRes.status, 401);
  } finally {
    await srv.close();
  }
});

test('POST /api/orders requires sign-in and fails closed when persistence is unavailable', async () => {
  const unauthenticatedApp = express();
  unauthenticatedApp.use(express.json());
  unauthenticatedApp.use('/api/orders', orderRouter);

  const unauthenticatedServer = await startTestServer(unauthenticatedApp);
  try {
    const unauthenticatedResponse = await fetch(`${unauthenticatedServer.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ product: { id: 'auth-required-product', price: 100 }, quantity: 1 }],
      }),
    });
    assert.equal(unauthenticatedResponse.status, 401);
    assert.deepEqual(await unauthenticatedResponse.json(), {
      error: 'Sign in to place an order. Guest checkout is not available yet.',
    });
  } finally {
    await unauthenticatedServer.close();
  }

  const authenticatedApp = express();
  authenticatedApp.use(express.json());
  authenticatedApp.use((_req, res, next) => {
    res.locals.auth = { uid: 'order-persistence-test-user' };
    next();
  });
  authenticatedApp.use('/api/orders', orderRouter);

  const authenticatedServer = await startTestServer(authenticatedApp);
  try {
    const invalidCartResponse = await fetch(`${authenticatedServer.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [], subtotal: 0 }),
    });
    assert.equal(invalidCartResponse.status, 400);

    const payload = {
      items: [{ product: { id: 'p_1', price: 1000 }, quantity: 2 }],
      subtotal: 1,
      total: 1,
      deliveryAddress: 'Dhaka, Bangladesh',
      paymentMethod: 'Cash on Delivery',
      idempotencyKey: 'sec-test-idem-1',
    };
    const orderRes = await fetch(`${authenticatedServer.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': 'sec-test-idem-1' },
      body: JSON.stringify(payload),
    });
    assert.equal(orderRes.status, 503);
    assert.deepEqual(await orderRes.json(), {
      error: 'We could not save your order. Please try again later.',
    });

    const replayRes = await fetch(`${authenticatedServer.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': 'sec-test-idem-1' },
      body: JSON.stringify(payload),
    });
    assert.equal(replayRes.status, 503);
  } finally {
    await authenticatedServer.close();
  }
});

test('POST /api/orders rejects online payment methods while checkout is COD-only', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRouter);

  const srv = await startTestServer(app);
  try {
    const response = await fetch(`${srv.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ product: { id: 'cod-test-product', price: 100 }, quantity: 1 }],
        paymentMethod: 'Mobile Wallet (bKash/Nagad/Rocket)',
      }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'Only Cash on Delivery is currently available for orders.',
    });
  } finally {
    await srv.close();
  }
});

test('evaluateVoucher rejects unknown promo codes and enforces minimum spend threshold', () => {
  const unknown = evaluateVoucher('HACKER99', 5000, ['Retail']);
  assert.equal(unknown.valid, false);
  assert.equal(unknown.discountBdt, 0);

  const belowMin = evaluateVoucher('SUPER10', 100, ['Retail']);
  assert.equal(belowMin.valid, false);
  assert.equal(belowMin.discountBdt, 0);
});
