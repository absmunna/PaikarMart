-- ==============================================================================
-- PaikarMart Additive Financial & Persistence Hardening Migration (2026-11-26)
-- Safe to re-run against existing production Supabase PostgreSQL databases.
-- ==============================================================================

-- 1. Orders extra operational columns
alter table if exists public.orders add column if not exists store_id text;
alter table if exists public.orders add column if not exists store_name text;
alter table if exists public.orders add column if not exists discount numeric(10,2) not null default 0.00;
alter table if exists public.orders add column if not exists promo_code text;
alter table if exists public.orders add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- 2. Product reviews missing display author column + escrow dispute reason
alter table if exists public.product_reviews add column if not exists reviewer_name text;
alter table if exists public.escrow_records add column if not exists dispute_reason text;

-- 3. Idempotency unique constraint on wallet_transactions.reference_id (non-null)
create unique index if not exists idx_wallet_transactions_unique_ref
  on public.wallet_transactions(reference_id)
  where reference_id is not null;

-- 4. Persistent Payment Sessions Table
create table if not exists public.payment_sessions (
  id text primary key,
  uid text not null,
  provider text not null check (provider in ('bkash', 'nagad', 'sslcommerz')),
  purpose text not null check (purpose in ('wallet_deposit', 'order_checkout')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'BDT',
  order_id text,
  customer_phone text,
  mode text not null check (mode in ('live', 'sandbox')),
  gateway_reference text not null,
  trx_id text,
  status text not null default 'initiated' check (status in ('initiated', 'completed', 'failed', 'cancelled')),
  idempotency_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payment_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payment_sessions' and policyname = 'Users can view only their own payment sessions'
  ) then
    create policy "Users can view only their own payment sessions"
      on public.payment_sessions for select
      using (auth.uid()::text = uid or public.has_role('admin') or public.has_role('super_admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payment_sessions' and policyname = 'Only admins mutate payment sessions directly'
  ) then
    create policy "Only admins mutate payment sessions directly"
      on public.payment_sessions for all
      using (public.has_role('admin') or public.has_role('super_admin'));
  end if;
end $$;

create unique index if not exists idx_payment_sessions_uid_idem
  on public.payment_sessions(uid, idempotency_key)
  where idempotency_key is not null;

-- 5. Persistent Messaging Conversations & Messages Tables
create table if not exists public.conversations (
  id text primary key,
  owner_uid text not null,
  participant_uid text,
  participant_name text not null,
  participant_avatar text,
  participant_role text not null default 'vendor',
  store_id text,
  product_id text,
  product_title text,
  last_message text,
  unread_count int not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id text references public.conversations(id) on delete cascade not null,
  sender_uid text not null,
  sender_name text not null,
  text text not null,
  attachments jsonb not null default '[]'::jsonb,
  is_ai_suggested boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create index if not exists idx_conversations_owner on public.conversations(owner_uid, updated_at desc);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at asc);

-- 6. Persistent Wholesale Sample Requests Table
create table if not exists public.wholesale_samples (
  id text primary key,
  requester_uid text not null,
  requester_name text not null,
  product_id text not null,
  product_title text not null,
  supplier_name text,
  quantity int not null default 1 check (quantity > 0),
  shipping_address text not null,
  notes text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'shipped', 'delivered', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wholesale_samples enable row level security;
create index if not exists idx_wholesale_samples_requester on public.wholesale_samples(requester_uid, created_at desc);

-- 7. Atomic Wallet Ledger Credit/Debit RPC (Row-Level Locking + Idempotency)
create or replace function public.apply_wallet_ledger_atomic(
  p_profile_id uuid,
  p_type text,
  p_amount numeric,
  p_description text,
  p_reference_id text,
  p_coins_delta int default 0
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing public.wallet_transactions%rowtype;
  v_profile public.profiles%rowtype;
  v_next_balance numeric(12,2);
  v_next_coins int;
  v_delta numeric(12,2);
  v_tx public.wallet_transactions%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_reference_id is not null and btrim(p_reference_id) <> '' then
    select * into v_existing
    from public.wallet_transactions
    where reference_id = p_reference_id
    limit 1;

    if found then
      return jsonb_build_object(
        'duplicate', true,
        'transaction', to_jsonb(v_existing)
      );
    end if;
  end if;

  select * into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  v_delta := case when p_type in ('withdrawal', 'purchase', 'transfer', 'escrow_hold') then -p_amount else p_amount end;
  v_next_balance := round((coalesce(v_profile.wallet_balance, 0) + v_delta)::numeric, 2);
  if v_next_balance < 0 then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  v_next_coins := greatest(0, coalesce(v_profile.reward_points, 0) + coalesce(p_coins_delta, 0));

  update public.profiles
  set wallet_balance = v_next_balance,
      reward_points = v_next_coins,
      updated_at = timezone('utc'::text, now())
  where id = p_profile_id;

  insert into public.wallet_transactions (user_id, type, amount, description, status, reference_id)
  values (p_profile_id, p_type, p_amount, p_description, 'completed', nullif(btrim(p_reference_id), ''))
  returning * into v_tx;

  return jsonb_build_object(
    'duplicate', false,
    'balance', v_next_balance,
    'coins', v_next_coins,
    'transaction', to_jsonb(v_tx)
  );
end;
$$;

-- 8. Atomic Reward Coins Redemption RPC
create or replace function public.redeem_wallet_coins_atomic(
  p_profile_id uuid,
  p_coins int,
  p_reference_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_profile public.profiles%rowtype;
  v_bdt_value numeric(12,2);
  v_next_balance numeric(12,2);
  v_next_coins int;
  v_tx public.wallet_transactions%rowtype;
begin
  if p_coins is null or p_coins < 10 then
    raise exception 'INVALID_COINS';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if coalesce(v_profile.reward_points, 0) < p_coins then
    raise exception 'INSUFFICIENT_COINS';
  end if;

  v_bdt_value := floor(p_coins / 5)::numeric(12,2);
  v_next_coins := v_profile.reward_points - p_coins;
  v_next_balance := round((coalesce(v_profile.wallet_balance, 0) + v_bdt_value)::numeric, 2);

  update public.profiles
  set wallet_balance = v_next_balance,
      reward_points = v_next_coins,
      updated_at = timezone('utc'::text, now())
  where id = p_profile_id;

  insert into public.wallet_transactions (user_id, type, amount, description, status, reference_id)
  values (p_profile_id, 'cashback', v_bdt_value, format('%s reward coins converted to BDT %s', p_coins, v_bdt_value), 'completed', p_reference_id)
  returning * into v_tx;

  return jsonb_build_object(
    'bdtValue', v_bdt_value,
    'balance', v_next_balance,
    'coins', v_next_coins,
    'transaction', to_jsonb(v_tx)
  );
end;
$$;

-- 9. Atomic Escrow Hold & Release RPCs
create or replace function public.create_escrow_hold_atomic(
  p_order_id uuid,
  p_buyer_id uuid,
  p_vendor_id uuid,
  p_amount numeric,
  p_order_key text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing public.escrow_records%rowtype;
  v_buyer public.profiles%rowtype;
  v_next_balance numeric(12,2);
  v_escrow public.escrow_records%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_ESCROW_PARAMS';
  end if;

  select * into v_existing from public.escrow_records where order_id = p_order_id limit 1;
  if found then
    return jsonb_build_object('duplicate', true, 'escrow', to_jsonb(v_existing));
  end if;

  select * into v_buyer from public.profiles where id = p_buyer_id for update;
  if not found then
    raise exception 'ORDER_OR_PROFILE_NOT_FOUND';
  end if;

  if coalesce(v_buyer.wallet_balance, 0) < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  v_next_balance := round((v_buyer.wallet_balance - p_amount)::numeric, 2);
  update public.profiles
  set wallet_balance = v_next_balance,
      updated_at = timezone('utc'::text, now())
  where id = p_buyer_id;

  insert into public.escrow_records (order_id, buyer_id, vendor_id, amount_bdt, status)
  values (p_order_id, p_buyer_id, p_vendor_id, p_amount, 'held')
  returning * into v_escrow;

  insert into public.wallet_transactions (user_id, type, amount, description, status, reference_id)
  values (p_buyer_id, 'escrow_hold', p_amount, format('Escrow Hold Locked — %s', coalesce(p_order_key, p_order_id::text)), 'completed', v_escrow.id::text);

  return jsonb_build_object('duplicate', false, 'escrow', to_jsonb(v_escrow));
end;
$$;

create or replace function public.release_escrow_atomic(
  p_escrow_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_escrow public.escrow_records%rowtype;
  v_vendor public.profiles%rowtype;
  v_now timestamp with time zone := timezone('utc'::text, now());
begin
  select * into v_escrow from public.escrow_records where id = p_escrow_id for update;
  if not found then
    raise exception 'ESCROW_NOT_FOUND';
  end if;

  if v_escrow.status = 'disputed' then
    raise exception 'ESCROW_DISPUTED';
  end if;

  if v_escrow.status = 'released' then
    return jsonb_build_object('alreadyReleased', true, 'escrow', to_jsonb(v_escrow));
  end if;

  update public.escrow_records
  set status = 'released',
      released_at = v_now
  where id = p_escrow_id and status = 'held'
  returning * into v_escrow;

  select * into v_vendor from public.profiles where id = v_escrow.vendor_id for update;
  if found then
    update public.profiles
    set wallet_balance = round((coalesce(v_vendor.wallet_balance, 0) + v_escrow.amount_bdt)::numeric, 2),
        updated_at = v_now
    where id = v_escrow.vendor_id;
  end if;

  insert into public.wallet_transactions (user_id, type, amount, description, status, reference_id)
  values (
    v_escrow.vendor_id,
    'escrow_release',
    v_escrow.amount_bdt,
    format('Escrow Payout Released — Order %s', left(v_escrow.order_id::text, 8)),
    'completed',
    v_escrow.id::text
  )
  on conflict do nothing;

  return jsonb_build_object('alreadyReleased', false, 'escrow', to_jsonb(v_escrow));
end;
$$;

-- 10. Persistent Flagged Posts Moderation Queue (KI-013)
create table if not exists public.flagged_posts (
  id text primary key,
  author_uid text not null,
  content_excerpt text not null,
  flagged_keywords jsonb not null default '[]'::jsonb,
  status text not null default 'pending_human_review' check (status in ('pending_human_review', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.flagged_posts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flagged_posts' and policyname = 'Moderators and admins manage flagged posts'
  ) then
    create policy "Moderators and admins manage flagged posts"
      on public.flagged_posts for all
      using (public.has_role('moderator') or public.has_role('admin') or public.has_role('super_admin'))
      with check (public.has_role('moderator') or public.has_role('admin') or public.has_role('super_admin'));
  end if;
end $$;

create index if not exists idx_flagged_posts_status_created
  on public.flagged_posts(status, created_at desc);

