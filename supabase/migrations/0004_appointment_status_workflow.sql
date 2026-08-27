-- ===========================================================================
-- 0004 - appointment status workflow.
--
-- Run this after 0003. New bookings are confirmed immediately. Past confirmed
-- appointments are completed whenever the admin appointment list is loaded,
-- and staff can finish or cancel a confirmed appointment from its detail page.
-- ===========================================================================

-- Normalize existing records before installing the insert trigger.
update public.appointments
set status = 'Completed'
where preferred_date < current_date
  and status in ('Pending', 'Confirmed');

update public.appointments
set status = 'Confirmed'
where preferred_date >= current_date
  and status = 'Pending';

create or replace function public.confirm_new_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'Confirmed';
  return new;
end;
$$;

drop trigger if exists appointments_confirm_on_insert on public.appointments;
create trigger appointments_confirm_on_insert
  before insert on public.appointments
  for each row execute function public.confirm_new_appointment();

create or replace function public.sync_past_appointment_statuses()
returns void
language sql
security definer
set search_path = public
as $$
  update public.appointments
     set status = 'Completed'
   where preferred_date < current_date
     and status = 'Confirmed';
$$;

revoke all on function public.sync_past_appointment_statuses() from public;
grant execute on function public.sync_past_appointment_statuses() to service_role;
