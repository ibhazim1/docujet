-- 0008 - recurring weekly availability and date-specific booking closures.
-- Run after 0007. Existing date ranges are converted to their weekday pattern.

create table if not exists public.appointment_weekly_availability (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time without time zone not null,
  end_time time without time zone not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_weekly_time_order check (start_time < end_time),
  constraint appointment_weekly_minute check (
    extract(minute from start_time)::integer % 30 = 0 and
    extract(minute from end_time)::integer % 30 = 0 and
    extract(second from start_time) = 0 and extract(second from end_time) = 0
  )
);

create table if not exists public.appointment_booking_closures (
  id uuid primary key default gen_random_uuid(),
  closed_date date not null unique,
  reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_weekly_day_idx
  on public.appointment_weekly_availability (day_of_week, start_time);
create index if not exists appointment_closures_date_idx
  on public.appointment_booking_closures (closed_date);

drop trigger if exists appointment_weekly_set_updated_at on public.appointment_weekly_availability;
create trigger appointment_weekly_set_updated_at before update on public.appointment_weekly_availability
for each row execute function public.set_updated_at();
drop trigger if exists appointment_closures_set_updated_at on public.appointment_booking_closures;
create trigger appointment_closures_set_updated_at before update on public.appointment_booking_closures
for each row execute function public.set_updated_at();

alter table public.appointment_weekly_availability enable row level security;
alter table public.appointment_booking_closures enable row level security;

create or replace function public.validate_weekly_availability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_active and exists (
    select 1 from public.appointment_weekly_availability existing
    where existing.id <> new.id and existing.day_of_week = new.day_of_week
      and existing.is_active and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception 'Availability overlaps another active time range on this day.';
  end if;
  return new;
end;
$$;

drop trigger if exists appointment_weekly_validate on public.appointment_weekly_availability;
create trigger appointment_weekly_validate before insert or update on public.appointment_weekly_availability
for each row execute function public.validate_weekly_availability();

-- Convert the old date-specific configuration, if it exists, into recurring
-- weekday rules without creating duplicate ranges.
insert into public.appointment_weekly_availability (day_of_week, start_time, end_time, is_active, created_by)
select distinct extract(dow from old.available_date)::smallint, old.start_time, old.end_time,
       old.is_active, old.created_by
from public.appointment_availability old
where not exists (
  select 1 from public.appointment_weekly_availability weekly
  where weekly.day_of_week = extract(dow from old.available_date)::smallint
    and weekly.start_time = old.start_time and weekly.end_time = old.end_time
);

create or replace function public.get_available_dates(
  p_from date default current_date,
  p_to date default current_date + 365)
returns table(available_date date)
language sql security definer set search_path = public as $$
  select dates.available_date
  from generate_series(greatest(p_from, current_date), p_to, interval '1 day') dates(available_date)
  where extract(dow from dates.available_date)::smallint in (
    select distinct day_of_week from public.appointment_weekly_availability where is_active
  )
    and not exists (
      select 1 from public.appointment_booking_closures closure
      where closure.closed_date = dates.available_date::date
    )
  order by dates.available_date;
$$;

create or replace function public.get_available_time_slots(p_date date)
returns table(preferred_time time without time zone)
language sql security definer set search_path = public as $$
  select distinct (weekly.start_time + offsets.minutes * interval '1 minute')::time
  from public.appointment_weekly_availability weekly
  cross join lateral generate_series(
    0, floor(extract(epoch from (weekly.end_time - weekly.start_time)) / 60)::integer - 30, 30
  ) offsets(minutes)
  where weekly.day_of_week = extract(dow from p_date)::smallint
    and weekly.is_active and p_date >= current_date
    and not exists (select 1 from public.appointment_booking_closures c where c.closed_date = p_date)
    and not exists (
      select 1 from public.appointments booked
      where booked.preferred_date = p_date and booked.preferred_time =
        (weekly.start_time + offsets.minutes * interval '1 minute')::time
        and booked.status <> 'Cancelled'
    )
  order by 1;
$$;

create or replace function public.validate_appointment_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_start time without time zone;
begin
  select min(weekly.start_time) into v_start
  from public.appointment_weekly_availability weekly
  where weekly.day_of_week = extract(dow from new.preferred_date)::smallint
    and weekly.is_active and new.preferred_time >= weekly.start_time
    and new.preferred_time < weekly.end_time
    and mod(extract(epoch from (new.preferred_time - weekly.start_time))::integer, 1800) = 0
    and not exists (select 1 from public.appointment_booking_closures c where c.closed_date = new.preferred_date);
  if v_start is null then raise exception 'This appointment time is not available.'; end if;
  if exists (select 1 from public.appointments existing where existing.preferred_date = new.preferred_date
    and existing.preferred_time = new.preferred_time and existing.status <> 'Cancelled') then
    raise exception 'This appointment time has already been booked.';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_validate_availability on public.appointments;
create trigger appointments_validate_availability before insert on public.appointments
for each row execute function public.validate_appointment_booking();

revoke all on function public.get_available_dates(date, date) from public;
grant execute on function public.get_available_dates(date, date) to anon, authenticated;
revoke all on function public.get_available_time_slots(date) from public;
grant execute on function public.get_available_time_slots(date) to anon, authenticated;
