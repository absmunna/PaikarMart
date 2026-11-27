begin;

alter table public.shipment_waybills
  add column if not exists assigned_courier_profile_id uuid
  references public.profiles(id) on delete set null;

create index if not exists idx_shipment_waybills_assigned_courier
  on public.shipment_waybills(assigned_courier_profile_id);

drop policy if exists "Customers and admins can view shipment waybills"
  on public.shipment_waybills;
drop policy if exists "Customers, assigned couriers and admins can view shipment waybills"
  on public.shipment_waybills;

create policy "Customers, assigned couriers and admins can view shipment waybills"
  on public.shipment_waybills for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = public.current_profile_id()
    )
    or assigned_courier_profile_id = public.current_profile_id()
    or public.has_role('moderator')
    or public.has_role('admin')
    or public.has_role('super_admin')
  );

commit;
