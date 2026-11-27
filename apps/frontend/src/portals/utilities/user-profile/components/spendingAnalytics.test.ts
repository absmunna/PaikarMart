import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCategorySpendData,
  buildMonthlySpendingData,
  buildOrderStatusData,
} from './spendingAnalytics.js';
import type { Order } from '@/types';

const createOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  createdAt: '2026-11-12T10:00:00.000Z',
  items: [{
    product: { id: 'product-1', title: 'Rice', category: 'Grocery', price: 100 } as Order['items'][number]['product'],
    quantity: 2,
    isWholesale: false,
  }],
  subtotal: 200,
  deliveryFee: 0,
  tax: 0,
  total: 200,
  status: 'confirmed',
  deliveryAddress: 'Dhaka',
  paymentMethod: 'Cash on Delivery',
  estimatedArrival: '45 mins',
  trackingStep: 1,
  ...overrides,
});

test('builds selected monthly ranges from order dates and totals only', () => {
  const orders = [
    createOrder({ createdAt: '2026-11-12T10:00:00.000Z', total: 200 }),
    createOrder({ createdAt: '2026-10-12T10:00:00.000Z', total: 350 }),
    createOrder({ createdAt: '2025-11-12T10:00:00.000Z', total: 900 }),
  ];

  const threeMonths = buildMonthlySpendingData(orders, '3M', false, new Date('2026-11-27T12:00:00.000Z'));
  const year = buildMonthlySpendingData(orders, '1Y', false, new Date('2026-11-27T12:00:00.000Z'));

  assert.equal(threeMonths.length, 3);
  assert.deepEqual(threeMonths.map(({ spend }) => spend), [0, 350, 200]);
  assert.equal(year.length, 12);
  assert.equal(year.reduce((sum, month) => sum + month.spend, 0), 550);
});

test('derives category and order status summaries only from supplied orders', () => {
  const orders = [
    createOrder(),
    createOrder({
      id: 'order-2',
      status: 'delivered',
      items: [{
        product: { id: 'product-2', title: 'Beans', category: 'Grocery', price: 50 } as Order['items'][number]['product'],
        quantity: 3,
        isWholesale: false,
      }],
    }),
  ];

  assert.deepEqual(buildCategorySpendData(orders, false), [{ name: 'Grocery', value: 350 }]);
  assert.deepEqual(
    buildOrderStatusData(orders, false).map(({ key, value }) => ({ key, value })),
    [{ key: 'confirmed', value: 1 }, { key: 'delivered', value: 1 }],
  );
  assert.deepEqual(buildCategorySpendData([], false), []);
  assert.deepEqual(buildOrderStatusData([], false), []);
});
