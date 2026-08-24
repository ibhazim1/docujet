-- ===========================================================================
-- 0001 — the lead book and site settings.
--
-- Replaces the two Google Sheet tabs the app used to read through an Apps
-- Script web app: `Leads` (one row per lead) and `Settings` (key/value site
-- config). The shapes below are deliberately faithful to what the sheet held,
-- so the migration is a storage swap and not a product change.
--
-- Apply by pasting this whole file into the Supabase SQL Editor and running it.
-- ===========================================================================

-- Keeps updated_at honest without every write path having to remember.
--
-- Created only if absent rather than `create or replace`: this project already
-- carries tables from other work (customers, appointments) that have their own
-- updated_at columns, and a function of this name may already back them.
-- Replacing it would silently change how those tables behave.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ) then
    create function public.set_updated_at()
    returns trigger language plpgsql as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- crm_leads — mirrors the `Lead` type in src/lib/crm/types.ts.
--
-- The vocabularies below are CHECK constraints rather than enum types on
-- purpose: src/lib/crm/taxonomy.ts is the single source of truth for stages and
-- sources, and it promises that adding one is "a matter of adding a row here".
-- A CHECK keeps that a one-line ALTER TABLE; an enum would make it an ALTER
-- TYPE plus a code change.
-- ---------------------------------------------------------------------------
create table public.crm_leads (
  id          text primary key,                     -- natural key, e.g. 'L-1042'
  name        text        not null default '',
  title       text        not null default '',
  email       text        not null default '',
  phone       text        not null default '',
  source      text        not null default 'form'
                check (source in ('linkedin','facebook','instagram','youtube',
                                  'x','threads','chatbot','form')),
  -- Never holds 'lost'. Closing a lead sets `lost` and leaves the stage at the
  -- furthest point it reached, so the funnel still knows where deals die.
  stage       text        not null default 'lead'
                check (stage in ('lead','mql','sql','opportunity','customer')),
  -- Free text rather than `date`: this is inline-editable and the current
  -- behaviour accepts whatever a rep types (see updateLeadFieldAction). A date
  -- column would make this migration start rejecting input that used to be
  -- accepted. ISO 'YYYY-MM-DD' by convention; monthlyStats slices and sorts it
  -- lexicographically.
  created_at  text        not null default '',
  interest    text        not null default '',
  -- null (not '') means "not chatbot-sourced" — matches `chatTopic: string | null`.
  chat_topic  text,
  -- Knowledge-base entry ids. Was a comma-joined cell in the sheet; a real
  -- array here, which is why leads.ts no longer splits or joins anything.
  cited       text[]      not null default '{}',
  notes       text        not null default '',
  lost        boolean     not null default false,
  inserted_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Nothing filters server-side today — every filter, sort and aggregate runs in
-- JS over the whole array in src/lib/crm/analytics.ts. These are what make
-- pushing that work into SQL later a change of query rather than a rewrite.
create index crm_leads_created_at_idx on public.crm_leads (created_at desc);
create index crm_leads_stage_idx      on public.crm_leads (stage);
create index crm_leads_source_idx     on public.crm_leads (source);

create trigger crm_leads_set_updated_at
  before update on public.crm_leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_settings — the key/value shape the Settings tab already used, verbatim.
--
-- Dot-path keys ('business.phone', 'chat.greeting', ...). Values are always
-- text; numbers are decimal text and lists are newline-joined, exactly as
-- before, so mergeEntries() in settings/store.ts reads them back unchanged.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      text        not null default '',
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS on with zero policies = deny-all for anon and authenticated. The secret
-- (service_role) key bypasses RLS, and it is the only key this app holds — no
-- publishable key is used anywhere, and nothing Supabase-related reaches the
-- browser. When Supabase Auth is added to /admin later, policies get written
-- here.
-- ---------------------------------------------------------------------------
alter table public.crm_leads    enable row level security;
alter table public.app_settings enable row level security;
