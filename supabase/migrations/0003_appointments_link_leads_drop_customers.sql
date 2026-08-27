-- ===========================================================================
-- 0003 — appointments point at leads, and `customers` goes away.
--
-- Part two of folding `customers` into the lead book; 0002 added the columns
-- and the id generator this needs. After this file there is one table of
-- people, `crm_leads`, and "customer" is a position in its lifecycle
-- (stage = 'customer') rather than a separate table.
--
-- THIS FILE IS DESTRUCTIVE — it drops public.customers. Take a backup or a
-- Supabase branch first. There is no down-migration.
--
-- Run 0002 before this one. Apply by pasting the whole file into the Supabase
-- SQL Editor.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. The new link.
--
-- Nullable and unconstrained for now: crm_leads.id is text ('L-1042') while
-- customers.id is a uuid, so this is a new column to be filled, not a rename.
-- ---------------------------------------------------------------------------
alter table public.appointments add column if not exists lead_id text;

-- ---------------------------------------------------------------------------
-- 2. Move every customer into the lead book.
--
-- A loop rather than one INSERT..SELECT because each row needs a decision: a
-- lead may already exist for that email (46 leads against 5 customers, and the
-- old create_booking upserted on email, so overlap is possible). Creating a
-- second row for the same person would break the one-lead-per-person model
-- this migration exists to establish, so an existing lead is enriched rather
-- than duplicated.
--
-- Stage mapping. `customers.status` defaulted to 'Prospect' and the old
-- create_booking wrote 'Prospect' unconditionally, so the column recorded
-- "arrived through the booking form", never a rep's judgement:
--
--     Active           -> customer      (a real customer)
--     Needs Follow-up  -> customer      (a customer who needs chasing)
--     Prospect         -> lead          (submitted the form, nothing more)
--
-- 'Prospect' therefore lands at 'lead', the same place the new create_booking
-- below puts a fresh booking. Mapping it to 'opportunity' would inflate the
-- funnel with people who only ever booked a demo. The original value is kept
-- in `notes` either way, so the judgement is reversible.
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
  v_lead_id text;
begin
  for c in select * from public.customers order by created_at loop
    select l.id into v_lead_id
      from public.crm_leads l
     where l.email <> '' and lower(l.email) = lower(c.email)
     order by l.inserted_at
     limit 1;

    if v_lead_id is null then
      v_lead_id := public.next_lead_id();

      insert into public.crm_leads (
        id, name, company, title, email, phone, source, stage,
        created_at, interest, chat_topic, cited, notes, lost,
        last_contact_at, inserted_at
      ) values (
        v_lead_id, c.full_name, c.company_name, '', c.email, c.phone,
        'form',
        case c.status when 'Prospect' then 'lead' else 'customer' end,
        -- crm_leads.created_at is text 'YYYY-MM-DD' on purpose — see 0001.
        to_char(c.created_at, 'YYYY-MM-DD'),
        '', null, '{}',
        'Migrated from the customers table on 2026-08-27. Its status was '
          || c.status || '.',
        false,
        c.last_contact_at,
        c.created_at
      );
    else
      -- Same person, already in the book. Fill only what the lead is missing:
      -- a rep's correction outranks whatever the booking form captured.
      update public.crm_leads l
         set name    = case when l.name    = '' then c.full_name    else l.name    end,
             company = case when l.company = '' then c.company_name else l.company end,
             phone   = case when l.phone   = '' then c.phone        else l.phone   end,
             last_contact_at = greatest(
               coalesce(l.last_contact_at, c.last_contact_at),
               coalesce(c.last_contact_at, l.last_contact_at)
             ),
             notes = case when l.notes = '' then '' else l.notes || chr(10) || chr(10) end
                     || 'Merged from the customers table on 2026-08-27. '
                     || 'Its status was ' || c.status || '.'
       where l.id = v_lead_id;
    end if;

    update public.appointments a
       set lead_id = v_lead_id
     where a.customer_id = c.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Refuse to continue if anything was left behind.
--
-- customer_id is NOT NULL behind a foreign key, so this should be unreachable
-- — which is exactly why it is worth asserting before the drop rather than
-- discovering it afterwards, when `customers` is gone and the mapping with it.
-- ---------------------------------------------------------------------------
do $$
declare
  n bigint;
begin
  select count(*) into n from public.appointments where lead_id is null;
  if n > 0 then
    raise exception 'aborting: % appointment row(s) have no lead_id', n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Make the link real, and drop the old one.
--
-- ON DELETE RESTRICT, where customers had CASCADE. Deleting a lead should not
-- silently take its appointment history with it — the lead book is edited
-- daily, and a booking is a record of something that actually happened.
-- Nothing in the app deletes either, so this only ever binds someone in psql.
-- ---------------------------------------------------------------------------
alter table public.appointments
  alter column lead_id set not null,
  add constraint appointments_lead_id_fkey
    foreign key (lead_id) references public.crm_leads(id) on delete restrict,
  drop column customer_id;

create index if not exists appointments_lead_id_idx
  on public.appointments (lead_id);

-- No CASCADE: if something still depends on this table, that is news, and it
-- should stop the migration rather than be swept away silently.
drop table public.customers;

-- ---------------------------------------------------------------------------
-- 5. Bookings create leads.
--
-- DROP then CREATE, not CREATE OR REPLACE: the return type changes from
-- (customer_id uuid, appointment_id uuid) to (lead_id text, appointment_id
-- uuid), and Postgres will not replace a function's return type in place.
-- BookingForm.tsx destructures only `error` and ignores the returned row, so
-- the change is invisible to the client.
--
-- The argument list is unchanged and must stay that way — the client passes
-- these by name.
--
-- SECURITY DEFINER carries over, and is doing more work than it used to:
-- crm_leads has RLS on with ZERO policies (see 0001), so the function owner is
-- the only thing that can write it at all. Without SECURITY DEFINER every
-- anonymous booking would fail.
-- ---------------------------------------------------------------------------
drop function if exists public.create_booking(
  text, text, text, text, text, text, date, time without time zone, text);

create function public.create_booking(
  p_full_name text, p_company_name text, p_email text, p_phone text,
  p_product_interest text, p_appointment_type text,
  p_preferred_date date, p_preferred_time time without time zone,
  p_additional_notes text)
returns table(lead_id text, appointment_id uuid)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_lead_id text;
  v_appointment_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  -- The blank guard matters: crm_leads.email defaults to '', so an unguarded
  -- lookup would glue every unnamed lead onto whichever one came first.
  if v_email <> '' then
    select l.id into v_lead_id
      from public.crm_leads l
     where l.email <> '' and lower(l.email) = v_email
     order by l.inserted_at desc
     limit 1;
  end if;

  if v_lead_id is null then
    v_lead_id := public.next_lead_id();

    -- stage 'lead', not 'customer': booking a demo is not buying anything.
    -- Promotion happens on /admin/leads, through setStageAction.
    insert into public.crm_leads (
      id, name, company, title, email, phone, source, stage,
      created_at, interest, chat_topic, cited, notes, lost, last_contact_at
    ) values (
      v_lead_id, p_full_name, p_company_name, '', p_email, p_phone,
      'form', 'lead', to_char(now(), 'YYYY-MM-DD'),
      p_product_interest, null, '{}', '', false, now()
    );
  else
    -- Fill blanks only. The old create_booking overwrote name, company and
    -- phone from the form on every booking; against the lead book that would
    -- let a repeat booking quietly undo a rep's correction.
    update public.crm_leads l
       set name     = case when l.name     = '' then p_full_name        else l.name     end,
           company  = case when l.company  = '' then p_company_name     else l.company  end,
           phone    = case when l.phone    = '' then p_phone            else l.phone    end,
           interest = case when l.interest = '' then p_product_interest else l.interest end,
           last_contact_at = now()
     where l.id = v_lead_id;
  end if;

  insert into public.appointments (
    lead_id, product_interest, appointment_type, preferred_date,
    preferred_time, additional_notes, status, source
  ) values (
    v_lead_id, p_product_interest, p_appointment_type, p_preferred_date,
    p_preferred_time, p_additional_notes, 'Pending', 'Booking Form'
  ) returning id into v_appointment_id;

  return query select v_lead_id, v_appointment_id;
end;
$function$;

-- DROP FUNCTION took the old grants with it. /booking runs anonymously.
grant execute on function public.create_booking(
  text, text, text, text, text, text, date, time without time zone, text)
  to anon, authenticated;

-- get_booked_time_slots never touched `customers` and needs no change.

commit;
