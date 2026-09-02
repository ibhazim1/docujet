import { isSupabaseConfigured, supabase } from "./service";

export type WeeklyAvailability = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};
export type BookingClosure = { id: string; closedDate: string; reason: string };
export type WeeklyBlock = { id: string; dayOfWeek: number; startTime: string; endTime: string; label: string; isActive: boolean };
export type DateBlock = { id: string; blockedDate: string; blockedTime: string; label: string };

export const AVAILABILITY_NOT_CONFIGURED =
  "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to the server environment.";

export async function getAppointmentAvailability() {
  if (!isSupabaseConfigured()) {
    return { data: [] as WeeklyAvailability[], error: AVAILABILITY_NOT_CONFIGURED };
  }

  const { data, error } = await supabase()
    .from("appointment_weekly_availability")
    .select("id, day_of_week, start_time, end_time, is_active")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return { data: [] as WeeklyAvailability[], error: error.message };
  return { data: (data ?? []).map((row) => ({ id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), isActive: row.is_active })), error: null };
}

export async function getBookingClosures() {
  if (!isSupabaseConfigured()) return { data: [] as BookingClosure[], error: AVAILABILITY_NOT_CONFIGURED };
  const { data, error } = await supabase().from("appointment_booking_closures").select("id, closed_date, reason").gte("closed_date", new Date().toISOString().slice(0, 10)).order("closed_date");
  if (error) return { data: [] as BookingClosure[], error: error.message };
  return { data: (data ?? []).map((row) => ({ id: row.id, closedDate: row.closed_date, reason: row.reason })), error: null };
}

export async function getAppointmentBlocks() {
  if (!isSupabaseConfigured()) return { weekly: [] as WeeklyBlock[], dates: [] as DateBlock[], error: AVAILABILITY_NOT_CONFIGURED };
  const client = supabase();
  const [weeklyResult, dateResult] = await Promise.all([
    client.from("appointment_weekly_blocks").select("id, day_of_week, start_time, end_time, label, is_active").order("day_of_week").order("start_time"),
    client.from("appointment_date_blocks").select("id, blocked_date, blocked_time, label").gte("blocked_date", new Date().toISOString().slice(0, 10)).order("blocked_date").order("blocked_time"),
  ]);
  const error = weeklyResult.error?.message || dateResult.error?.message;
  if (error) return { weekly: [] as WeeklyBlock[], dates: [] as DateBlock[], error };
  return {
    weekly: (weeklyResult.data ?? []).map((row) => ({ id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), label: row.label, isActive: row.is_active })),
    dates: (dateResult.data ?? []).map((row) => ({ id: row.id, blockedDate: row.blocked_date, blockedTime: row.blocked_time.slice(0, 5), label: row.label })),
    error: null,
  };
}
