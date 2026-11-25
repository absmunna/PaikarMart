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

test('POST /api/orders rejects empty cart / zero subtotal and ignores tampered client total', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRouter);

  const srv = await startTestServer(app);
  try {
    const badRes = await fetch(`${srv.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [], subtotal: 0 }),
    });
    assert.equal(badRes.status, 400);

    // Client sends price=1000 qty=2, but attempts to spoof total=1
    const orderRes = await fetch(`${srv.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': 'sec-test-idem-1' },
      body: JSON.stringify({
        items: [{ product: { id: 'p_1', price: 1000 }, quantity: 2 }],
        subtotal: 1,
        total: 1,
        deliveryAddress: 'Dhaka, Bangladesh',
      }),
    });
    assert.equal(orderRes.status, 201);
    const data = (await orderRes.json()) as {
      order: { id: string; subtotal: number; deliveryFee: number; tax: number; total: number };
    };
    assert.equal(data.order.subtotal, 2000);
    assert.equal(data.order.deliveryFee, 60);
    assert.equal(data.order.tax, 100);
    assert.equal(data.order.total, 2160);

    // Repeat with same idempotency key returns identical order without creating duplicate
    const replayRes = await fetch(`${srv.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': 'sec-test-idem-1' },
      body: JSON.stringify({
        items: [{ product: { id: 'p_1', price: 1000 }, quantity: 2 }],
        deliveryAddress: 'Dhaka, Bangladesh',
      }),
    });
    assert.equal(replayRes.status, 200);
    const replayData = (await replayRes.json()) as { order: { id: string } };
    assert.equal(replayData.order.id, data.order.id);
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
