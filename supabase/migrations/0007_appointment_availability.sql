-- 0007 - superadmin-managed appointment availability.
-- Run after 0006. Availability is the source of truth for public booking.

create table if not exists public.appointment_availability (
  id uuid primary key default gen_random_uuid(),
  available_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_availability_time_order check (start_time < end_time),
  constraint appointment_availability_range_minute check (
    extract(second from start_time) = 0 and extract(second from end_time) = 0
  )
);

create index if not exists appointment_availability_date_idx
  on public.appointment_availability (available_date, start_time);

drop trigger if exists appointment_availability_set_updated_at
  on public.appointment_availability;
create trigger appointment_availability_set_updated_at
  before update on public.appointment_availability
  for each row execute function public.set_updated_at();

alter table public.appointment_availability enable row level security;

create or replace function public.validate_appointment_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.available_date < current_date then
    raise exception 'Availability date cannot be in the past.';
  end if;

  if new.is_active and exists (
    select 1
      from public.appointment_availability existing
     where existing.id <> new.id
       and existing.available_date = new.available_date
       and existing.is_active
       and new.start_time < existing.end_time
       and new.end_time > existing.start_time
  ) then
    raise exception 'Availability overlaps another active time range on this date.';
  end if;

  return new;
end;
$$;

drop trigger if exists appointment_availability_validate
  on public.appointment_availability;
create trigger appointment_availability_validate
  before insert or update on public.appointment_availability
  for each row execute function public.validate_appointment_availability();

-- Public read functions expose only active availability and booked-free slots.
create or replace function public.get_available_dates(
  p_from date default current_date,
  p_to date default current_date + 365)
returns table(available_date date)
language sql
security definer
set search_path = public
as $$
  select distinct a.available_date
    from public.appointment_availability a
   where a.is_active
     and a.available_date between greatest(p_from, current_date) and p_to
   order by a.available_date;
$$;

create or replace function public.get_available_time_slots(p_date date)
returns table(preferred_time time without time zone)
language sql
security definer
set search_path = public
as $$
  select distinct slots.preferred_time
    from public.appointment_availability a
    cross join lateral generate_series(
      0,
      floor(extract(epoch from (a.end_time - a.start_time)) / 60)::integer - 30,
      30
    ) as offsets(minutes)
    cross join lateral (
      select (a.start_time + offsets.minutes * interval '1 minute')::time
        as preferred_time
    ) slots
   where a.available_date = p_date
     and a.is_active
     and a.available_date >= current_date
     and not exists (
       select 1
         from public.appointments booked
        where booked.preferred_date = p_date
          and booked.preferred_time = slots.preferred_time
          and booked.status <> 'Cancelled'
     )
   order by slots.preferred_time;
$$;

-- Enforce the same rule for the anonymous create_booking RPC and any future
-- direct appointment insert, closing the race between slot display and submit.
create or replace function public.validate_appointment_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start time without time zone;
begin
  select min(a.start_time)
    into v_start
    from public.appointment_availability a
   where a.available_date = new.preferred_date
     and a.is_active
     and new.preferred_time >= a.start_time
     and new.preferred_time < a.end_time
     and mod(extract(epoch from (new.preferred_time - a.start_time))::integer, 1800) = 0;

  if v_start is null then
    raise exception 'This appointment time is not available.';
  end if;

  if exists (
    select 1 from public.appointments existing
     where existing.preferred_date = new.preferred_date
       and existing.preferred_time = new.preferred_time
       and existing.status <> 'Cancelled'
  ) then
    raise exception 'This appointment time has already been booked.';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_validate_availability on public.appointments;
create trigger appointments_validate_availability
  before insert on public.appointments
  for each row execute function public.validate_appointment_booking();

revoke all on function public.get_available_dates(date, date) from public;
grant execute on function public.get_available_dates(date, date) to anon, authenticated;
revoke all on function public.get_available_time_slots(date) from public;
grant execute on function public.get_available_time_slots(date) to anon, authenticated;
