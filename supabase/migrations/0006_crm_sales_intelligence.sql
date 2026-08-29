-- ---------------------------------------------------------------------------
-- 0006 — sales intelligence
--
-- The lead book could say what happened. It could not say what to do about it.
-- This migration adds the three facts that turn a record into a decision:
--
--   commitment — who owns it and what they promised to do next, so "overdue"
--                is a fact rather than a feeling.
--   cause      — why a lead was lost, so losing teaches the business something.
--   time       — when the stage last moved, so velocity and stall are real
--                measurements instead of proxies off `created_at`.
--
-- There is deliberately no `deal_value`. One was drafted here and taken out
-- again: nothing in this business records what a deal closes for, so the column
-- would have been filled from a per-model estimate nobody had measured, and a
-- weighted pipeline built on invented unit prices is exactly the kind of number
-- that gets repeated in a meeting as though it were revenue. Add it when there
-- are closed deals to derive it from.
--
-- Two new tables carry what a single row cannot: `lead_events` (the activity
-- log `types.ts` deliberately went without, now needed for velocity and the
-- lead timeline) and `chat_questions` (every question the assistant is asked,
-- so the ones it could not answer become a content gap someone can close).
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- crm_leads — five new columns
--
-- Every one is nullable or defaulted, so existing rows stay valid and the app
-- degrades to today's behaviour on a book that has none of them filled in.
-- ---------------------------------------------------------------------------

alter table public.crm_leads
  -- Accountability. SET NULL rather than RESTRICT: deactivating a staff member
  -- must not be blocked by their lead list, and an unowned lead is a state the
  -- queue can surface and fix.
  add column if not exists owner_id uuid references public.user_profiles(id) on delete set null,

  -- What the rep committed to, and when. The pair is what makes an overdue
  -- follow-up detectable; `next_action_at` alone would say a date is past
  -- without saying what was supposed to happen on it.
  add column if not exists next_action text not null default '',
  add column if not exists next_action_at date,

  -- Why it died. NULL for every open lead, and for the historical losses that
  -- predate this column — the charts read that as "not recorded", not as a
  -- reason of its own. The vocabulary lives in `src/lib/crm/taxonomy.ts`; the
  -- CHECK below is the guard, kept in step with it by hand exactly as the
  -- `source` and `stage` CHECKs already are.
  add column if not exists lost_reason text,

  -- When `stage` last moved. Defaulted to now() so a row inserted today is
  -- honest; backfilled below for the rows that already exist.
  add column if not exists stage_changed_at timestamptz not null default now();

do $guard$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_leads_lost_reason_check'
  ) then
    alter table public.crm_leads
      add constraint crm_leads_lost_reason_check
      check (lost_reason is null or lost_reason in (
        'price', 'timing', 'competitor', 'no_response',
        'not_a_fit', 'wrong_contact', 'budget_cut'
      ));
  end if;
end
$guard$;

-- Existing rows have never had a stage change recorded, so the best available
-- answer is when the row arrived. `inserted_at` and not `created_at`: the
-- latter is free text a rep typed and may be anything at all.
update public.crm_leads
   set stage_changed_at = inserted_at
 where stage_changed_at > inserted_at;

create index if not exists crm_leads_next_action_at_idx
  on public.crm_leads (next_action_at)
  where next_action_at is not null;
create index if not exists crm_leads_owner_idx
  on public.crm_leads (owner_id)
  where owner_id is not null;
create index if not exists crm_leads_stage_changed_at_idx
  on public.crm_leads (stage_changed_at desc);

-- ---------------------------------------------------------------------------
-- lead_events — the activity log
--
-- Kept separate from `audit_logs` on purpose. That table is the superadmin and
-- appointment audit trail: its `details jsonb` shape is right for recording
-- arbitrary administrative acts and wrong for the ordinal question this one
-- exists to answer — "how many days did leads spend at SQL last quarter" —
-- which wants `from_stage`/`to_stage` as columns it can index and group by.
--
-- `actor_id` is nullable because the two most common writers are not people:
-- `create_booking` runs anonymously, and `capture_chat_lead` runs for a visitor
-- who has no account.
-- ---------------------------------------------------------------------------

create table if not exists public.lead_events (
  id bigint generated always as identity primary key,
  lead_id text not null references public.crm_leads(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in (
    'created', 'stage', 'contacted', 'note',
    'lost', 'reopened', 'appointment', 'chat_capture'
  )),
  from_stage text,
  to_stage text,
  actor_id uuid references public.user_profiles(id) on delete set null,
  detail text not null default ''
);

-- The timeline reads one lead newest-first; velocity scans by kind.
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, at desc);
create index if not exists lead_events_kind_idx on public.lead_events (kind, at desc);

-- ---------------------------------------------------------------------------
-- chat_questions — what visitors actually ask
--
-- The assistant answers from a 111-entry corpus and forgets every question the
-- moment it replies. That throws away the most direct demand signal the site
-- has: a question it could NOT answer is a visitor who left unserved, and a
-- theme repeated across a dozen sessions is a gap in the knowledge base that is
-- costing sales. `answered` is derived from whether retrieval cleared the
-- similarity floor, not from whether the model produced text — it always does.
--
-- `lead_id` is filled in later, by `capture_chat_lead`, for every question in a
-- session that eventually gave up contact details. That is what lets a lead
-- card show the conversation that produced it.
-- ---------------------------------------------------------------------------

create table if not exists public.chat_questions (
  id bigint generated always as identity primary key,
  session_id text not null default '',
  asked_at timestamptz not null default now(),
  question text not null,
  answered boolean not null default false,
  top_similarity real,
  cited text[] not null default '{}',
  lead_id text references public.crm_leads(id) on delete set null
);

create index if not exists chat_questions_asked_at_idx on public.chat_questions (asked_at desc);
create index if not exists chat_questions_session_idx on public.chat_questions (session_id);
-- The gap report only ever reads the unanswered ones.
create index if not exists chat_questions_unanswered_idx
  on public.chat_questions (asked_at desc) where not answered;

-- ---------------------------------------------------------------------------
-- RLS: on, with no policies, exactly as crm_leads has it since 0001.
--
-- Deny-all for anon and authenticated. Both tables are written through
-- SECURITY DEFINER functions and read with the service key, which bypasses RLS.
-- `chat_questions` holds free text a stranger typed and `lead_events` is the
-- lead book's history; neither has any business being readable from a browser.
-- ---------------------------------------------------------------------------

alter table public.lead_events enable row level security;
alter table public.chat_questions enable row level security;

-- ---------------------------------------------------------------------------
-- create_booking — now records what it did
--
-- Same signature and same behaviour; the additions are the stage-change stamp
-- on a newly created lead and two event rows. A booking is the single strongest
-- buying signal this business collects, and until now it left no trace on the
-- lead's own history.
-- ---------------------------------------------------------------------------

create or replace function public.create_booking(
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
  v_created boolean := false;
begin
  if v_email <> '' then
    select l.id into v_lead_id
      from public.crm_leads l
     where l.email <> '' and lower(l.email) = v_email
     order by l.inserted_at desc
     limit 1;
  end if;

  if v_lead_id is null then
    v_lead_id := public.next_lead_id();
    v_created := true;

    insert into public.crm_leads (
      id, name, company, title, email, phone, source, stage,
      created_at, interest, chat_topic, cited, notes, lost, last_contact_at,
      stage_changed_at
    ) values (
      v_lead_id, p_full_name, p_company_name, '', p_email, p_phone,
      'form', 'lead', to_char(now(), 'YYYY-MM-DD'),
      p_product_interest, null, '{}', '', false, now(),
      now()
    );
  else
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

  if v_created then
    insert into public.lead_events (lead_id, kind, to_stage, detail)
    values (v_lead_id, 'created', 'lead', 'Created from the booking form.');
  end if;

  insert into public.lead_events (lead_id, kind, detail)
  values (
    v_lead_id, 'appointment',
    coalesce(nullif(p_appointment_type, ''), 'Appointment')
      || ' booked for ' || to_char(p_preferred_date, 'DD Mon YYYY')
      || ' at ' || to_char(p_preferred_time, 'HH24:MI') || '.'
  );

  return query select v_lead_id, v_appointment_id;
end;
$function$;

grant execute on function public.create_booking(
  text, text, text, text, text, text, date, time without time zone, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- capture_chat_lead — the assistant finally produces leads
--
-- Mirrors create_booking's discipline deliberately: match on a lowercased,
-- trimmed email; guard against the blank email that would glue strangers
-- together; fill blanks only on an existing lead so a rep's correction is never
-- overwritten by a visitor typing into a chat panel.
--
-- What differs is what it records. `source = 'chatbot'`, plus the two columns
-- that have existed since 0001 and been written by nothing: `chat_topic`, the
-- question that triggered capture, and `cited`, the knowledge-base entries that
-- answered it. An empty `cited` on a captured lead is itself a finding — the
-- visitor asked something the corpus could not answer and gave their details
-- anyway, which is the most motivated buyer the site sees.
--
-- SECURITY DEFINER for the same reason create_booking needs it: crm_leads has
-- RLS on with zero policies, so nothing anonymous can write it otherwise.
-- ---------------------------------------------------------------------------

create or replace function public.capture_chat_lead(
  p_full_name text, p_email text, p_phone text, p_company_name text,
  p_interest text, p_chat_topic text, p_cited text[], p_session_id text)
returns text
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_lead_id text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cited text[] := coalesce(p_cited, '{}');
  v_session text := coalesce(nullif(trim(coalesce(p_session_id, '')), ''), '');
begin
  if v_email = '' then
    raise exception 'An email address is required to capture a lead.';
  end if;

  select l.id into v_lead_id
    from public.crm_leads l
   where l.email <> '' and lower(l.email) = v_email
   order by l.inserted_at desc
   limit 1;

  if v_lead_id is null then
    v_lead_id := public.next_lead_id();

    insert into public.crm_leads (
      id, name, company, title, email, phone, source, stage,
      created_at, interest, chat_topic, cited, notes, lost, last_contact_at,
      stage_changed_at
    ) values (
      v_lead_id, coalesce(p_full_name, ''), coalesce(p_company_name, ''), '',
      trim(coalesce(p_email, '')), coalesce(p_phone, ''), 'chatbot', 'lead',
      to_char(now(), 'YYYY-MM-DD'), coalesce(p_interest, ''),
      nullif(trim(coalesce(p_chat_topic, '')), ''), v_cited, '', false, null,
      now()
    );

    insert into public.lead_events (lead_id, kind, to_stage, detail)
    values (v_lead_id, 'created', 'lead', 'Captured by the website assistant.');
  else
    -- A known lead came back through the chat panel. Their contact details are
    -- already right; what is new is the question, so that is what gets merged.
    -- `cited` is unioned rather than replaced: it is the record of everything
    -- the bot has ever answered them with, not just the most recent turn.
    update public.crm_leads l
       set name       = case when l.name     = '' then coalesce(p_full_name, '')    else l.name     end,
           company    = case when l.company  = '' then coalesce(p_company_name, '') else l.company  end,
           phone      = case when l.phone    = '' then coalesce(p_phone, '')        else l.phone    end,
           interest   = case when l.interest = '' then coalesce(p_interest, '')     else l.interest end,
           chat_topic = coalesce(l.chat_topic, nullif(trim(coalesce(p_chat_topic, '')), '')),
           cited      = coalesce((
             select array_agg(distinct c order by c)
               from unnest(l.cited || v_cited) as c
              where c <> ''
           ), '{}')
     where l.id = v_lead_id;
  end if;

  insert into public.lead_events (lead_id, kind, detail)
  values (
    v_lead_id, 'chat_capture',
    'Left contact details in the chat panel'
      || case when trim(coalesce(p_chat_topic, '')) = '' then '.'
              else ' after asking: ' || trim(p_chat_topic) end
  );

  -- Back-link the whole conversation, not just the triggering turn: the value
  -- of the transcript to a rep is the sequence of questions, and every one of
  -- them was asked by this lead.
  if v_session <> '' then
    update public.chat_questions q
       set lead_id = v_lead_id
     where q.session_id = v_session and q.lead_id is null;
  end if;

  return v_lead_id;
end;
$function$;

grant execute on function public.capture_chat_lead(
  text, text, text, text, text, text, text[], text) to anon, authenticated;

commit;
