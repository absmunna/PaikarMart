import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDbOrderRow } from '../services/dbService.js';

test('maps the public order ID without replacing the idempotency key', () => {
  const order = mapDbOrderRow({
    id: 'a15d468c-0a61-4c0a-b321-1274e7fd58a7',
    public_order_id: 'PKM-123456',
    idempotency_key: 'cart-1700000000000-2',
    customer_id: 'f23b7554-d71c-452a-8d55-59e7c2d0b430',
  });

  assert.equal(order.id, 'PKM-123456');
  assert.equal(order.dbUuid, 'a15d468c-0a61-4c0a-b321-1274e7fd58a7');
  assert.equal(order.idempotencyKey, 'cart-1700000000000-2');
});
