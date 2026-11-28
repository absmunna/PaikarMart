-- Keep the customer-facing order ID separate from the checkout idempotency key.
alter table public.orders
  add column if not exists public_order_id text;

create unique index if not exists idx_orders_public_order_id
  on public.orders(public_order_id);
