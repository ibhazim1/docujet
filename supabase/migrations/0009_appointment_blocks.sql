-- 0009 - recurring breaks and one-off blocked appointment slots.
-- Run after 0008.

create table if not exists public.appointment_weekly_blocks (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time without time zone not null,
  end_time time without time zone not null,
  label text not null default 'Break',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_weekly_blocks_time_order check (start_time < end_time)
);

create table if not exists public.appointment_date_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  blocked_time time without time zone not null,
  label text not null default 'Blocked slot',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (blocked_date, blocked_time)
);

alter table public.appointment_weekly_blocks enable row level security;
alter table public.appointment_date_blocks enable row level security;

drop trigger if exists appointment_weekly_blocks_set_updated_at on public.appointment_weekly_blocks;
create trigger appointment_weekly_blocks_set_updated_at before update on public.appointment_weekly_blocks
for each row execute function public.set_updated_at();

create or replace function public.get_available_time_slots(p_date date)
returns table(preferred_time time without time zone)
language sql security definer set search_path = public as $$
  select distinct (weekly.start_time + offsets.minutes * interval '1 minute')::time
  from public.appointment_weekly_availability weekly
  cross join lateral generate_series(0, floor(extract(epoch from (weekly.end_time - weekly.start_time)) / 60)::integer - 30, 30) offsets(minutes)
  where weekly.day_of_week = extract(dow from p_date)::smallint and weekly.is_active and p_date >= current_date
    and not exists (select 1 from public.appointment_booking_closures c where c.closed_date = p_date)
    and not exists (select 1 from public.appointment_weekly_blocks block where block.day_of_week = weekly.day_of_week and block.is_active
      and (weekly.start_time + offsets.minutes * interval '1 minute')::time < block.end_time
      and (weekly.start_time + (offsets.minutes + 30) * interval '1 minute')::time > block.start_time)
    and not exists (select 1 from public.appointment_date_blocks block where block.blocked_date = p_date
      and block.blocked_time = (weekly.start_time + offsets.minutes * interval '1 minute')::time)
    and not exists (select 1 from public.appointments booked where booked.preferred_date = p_date
      and booked.preferred_time = (weekly.start_time + offsets.minutes * interval '1 minute')::time and booked.status <> 'Cancelled')
  order by 1;
$$;

create or replace function public.validate_appointment_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_start time without time zone;
begin
  select min(weekly.start_time) into v_start from public.appointment_weekly_availability weekly
  where weekly.day_of_week = extract(dow from new.preferred_date)::smallint and weekly.is_active
    and new.preferred_time >= weekly.start_time and new.preferred_time < weekly.end_time
    and mod(extract(epoch from (new.preferred_time - weekly.start_time))::integer, 1800) = 0
    and not exists (select 1 from public.appointment_booking_closures c where c.closed_date = new.preferred_date)
    and not exists (select 1 from public.appointment_weekly_blocks block where block.day_of_week = weekly.day_of_week and block.is_active
      and new.preferred_time < block.end_time and (new.preferred_time + interval '30 minutes')::time > block.start_time)
    and not exists (select 1 from public.appointment_date_blocks block where block.blocked_date = new.preferred_date and block.blocked_time = new.preferred_time);
  if v_start is null then raise exception 'This appointment time is not available.'; end if;
  if exists (select 1 from public.appointments existing where existing.preferred_date = new.preferred_date and existing.preferred_time = new.preferred_time and existing.status <> 'Cancelled') then raise exception 'This appointment time has already been booked.'; end if;
  return new;
end;
$$;
