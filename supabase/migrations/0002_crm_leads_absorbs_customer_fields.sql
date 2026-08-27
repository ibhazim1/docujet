-- ===========================================================================
-- 0002 — crm_leads grows the two columns that forced `customers` to exist.
--
-- Part one of folding the `customers` table into the lead book. This half is
-- purely additive and safe to run on its own: it widens `crm_leads` and adds
-- the id generator that a booking will need. Nothing reads the new columns
-- yet, and nothing is dropped.
--
-- Part two — repointing `appointments` at `crm_leads`, backfilling the
-- customer rows, and rewriting `create_booking` — lands in 0003, which is
-- destructive and needs the live definitions of `customers`, `appointments`
-- and `create_booking` first. None of those three has ever been in this repo.
--
-- Apply by pasting this whole file into the Supabase SQL Editor and running it.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The two fields a lead was missing.
--
-- `company` is the whole reason `customers` was a separate table: crm_leads
-- carries `title` (a person's job title) but had nowhere to put the
-- organisation, which both /admin/customers and /admin/appointments display.
--
-- `last_contact_at` backs the "Last Contact" column. It is timestamptz, unlike
-- `created_at` — that one is text on purpose (see 0001) because a rep types it
-- by hand. Nobody types this one; `create_booking` stamps it.
-- ---------------------------------------------------------------------------
alter table public.crm_leads
  add column if not exists company         text not null default '',
  add column if not exists last_contact_at timestamptz;

-- Deliberately NOT unique. `email` defaults to '' and several leads may share
-- that blank, so a unique index would reject the second one. The lookup in
-- create_booking guards against matching on blank instead.
create index if not exists crm_leads_email_idx on public.crm_leads (lower(email));

-- ---------------------------------------------------------------------------
-- Lead ids for rows the app creates itself.
--
-- `crm_leads.id` is a natural key ('L-1042') with no default — until now only
-- the seed script supplied one, because nothing else ever inserted a lead. A
-- booking has to mint its own, and it must never collide with seed data, so
-- the sequence starts above the highest L-#### already in the table.
-- ---------------------------------------------------------------------------
create sequence if not exists public.crm_lead_id_seq;

-- setval(..., n, false) means "the next nextval() returns n".
-- The 1000 floor keeps ids the same width on an empty table.
select setval(
  'public.crm_lead_id_seq',
  greatest(
    (select coalesce(max(substring(id from '^L-(\d+)$')::int), 0)
       from public.crm_leads),
    1000
  ) + 1,
  false
);

create or replace function public.next_lead_id() returns text
language sql volatile as $$
  select 'L-' || nextval('public.crm_lead_id_seq')::text;
$$;
