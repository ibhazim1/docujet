-- ===========================================================================
-- 0000 — the booking tables, as they stood before this repo owned any of them.
--
-- DO NOT RUN THIS FILE. It is a historical record, reverse-engineered from the
-- live Supabase project on 2026-08-27 via pg_get_constraintdef /
-- pg_get_functiondef / information_schema. `customers` and `appointments` and
-- the two RPCs below were created by hand in the dashboard and had never been
-- committed, which meant the repo's only description of them was the column
-- list in src/lib/supabase/admin.ts.
--
-- 0003 supersedes all of it: `customers` is dropped and appointments point at
-- `crm_leads` instead. This file exists so that change has a "from" state.
--
-- Two caveats about fidelity:
--   * Column ORDER is not preserved — information_schema was read sorted by
--     name, not ordinal. Types, nullability, defaults and constraints are exact.
--   * The GRANTs on the two functions were not captured. Both were SECURITY
--     DEFINER, which is what let an anonymous visitor book through RLS.
--
-- Not recorded here at all: public.audit_logs, public.user_profiles and
-- public.is_superadmin(), which also live only in the dashboard. Neither table
-- has a foreign key to `customers`, which is the only reason 0003 can drop it.
-- ===========================================================================

create table public.customers (
  id              uuid        primary key default gen_random_uuid(),
  full_name       text        not null,
  company_name    text        not null,
  email           text        not null unique,
  phone           text        not null,
  status          text        not null default 'Prospect'
                    check (status in ('Active','Prospect','Needs Follow-up')),
  last_contact_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.appointments (
  id               uuid        primary key default gen_random_uuid(),
  customer_id      uuid        not null
                     references public.customers(id) on delete cascade,
  product_interest text        not null,
  appointment_type text        not null
                     check (appointment_type in ('Product Consultation',
                                                 'Product Demonstration',
                                                 'Pricing Discussion',
                                                 'Technical Consultation',
                                                 'After-Sales Support')),
  preferred_date   date        not null,
  preferred_time   time without time zone not null,
  additional_notes text,
  status           text        not null default 'Pending'
                     check (status in ('Pending','Confirmed','Completed','Cancelled')),
  source           text        not null default 'Booking Form',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function set_updated_at();

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function set_updated_at();

-- Unlike crm_leads, these two are readable by a signed-in user through the
-- publishable key — which is why src/lib/supabase/admin.ts used to reach them
-- with the cookie client.
alter table public.customers    enable row level security;
alter table public.appointments enable row level security;

create policy customers_select_authenticated on public.customers
  for select to authenticated using (true);
create policy customers_insert_authenticated on public.customers
  for insert to authenticated with check (true);
create policy customers_update_authenticated on public.customers
  for update to authenticated using (true);

create policy appointments_select_authenticated on public.appointments
  for select to authenticated using (true);
create policy appointments_insert_authenticated on public.appointments
  for insert to authenticated with check (true);
create policy appointments_update_authenticated on public.appointments
  for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- The booking write path.
--
-- Note the `on conflict (email) do update`: reuse-by-email was already the
-- behaviour here, which is why 0003 keeps it when the target becomes crm_leads.
-- SECURITY DEFINER is load-bearing — /booking is used by anonymous visitors,
-- who match none of the `to authenticated` policies above.
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(
  p_full_name text, p_company_name text, p_email text, p_phone text,
  p_product_interest text, p_appointment_type text,
  p_preferred_date date, p_preferred_time time without time zone,
  p_additional_notes text)
returns table(customer_id uuid, appointment_id uuid)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_customer_id uuid;
  v_appointment_id uuid;
begin
  insert into public.customers (
    full_name, company_name, email, phone, status, last_contact_at
  )
  values (p_full_name, p_company_name, p_email, p_phone, 'Prospect', now())
  on conflict (email) do update set
    full_name = excluded.full_name,
    company_name = excluded.company_name,
    phone = excluded.phone,
    last_contact_at = now(),
    updated_at = now()
  returning id into v_customer_id;

  insert into public.appointments (
    customer_id, product_interest, appointment_type, preferred_date,
    preferred_time, additional_notes, status, source
  )
  values (v_customer_id, p_product_interest, p_appointment_type,
          p_preferred_date, p_preferred_time, p_additional_notes,
          'Pending', 'Booking Form')
  returning id into v_appointment_id;

  return query select v_customer_id, v_appointment_id;
end;
$function$;

create or replace function public.get_booked_time_slots(p_date date)
returns table(preferred_time time without time zone)
language sql security definer set search_path to 'public'
as $function$
  select a.preferred_time
  from public.appointments a
  where a.preferred_date = p_date
    and a.status <> 'Cancelled'
  order by a.preferred_time;
$function$;
