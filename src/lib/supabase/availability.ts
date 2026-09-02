import { isSupabaseConfigured, supabase } from "./service";

export type AppointmentAvailability = {
  id: string;
  availableDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export const AVAILABILITY_NOT_CONFIGURED =
  "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to the server environment.";

function toAvailability(row: {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}): AppointmentAvailability {
  return {
    id: row.id,
    availableDate: row.available_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    isActive: row.is_active,
  };
}

export async function getAppointmentAvailability() {
  if (!isSupabaseConfigured()) {
    return { data: [] as AppointmentAvailability[], error: AVAILABILITY_NOT_CONFIGURED };
  }

  const { data, error } = await supabase()
    .from("appointment_availability")
    .select("id, available_date, start_time, end_time, is_active")
    .gte("available_date", new Date().toISOString().slice(0, 10))
    .order("available_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return { data: [] as AppointmentAvailability[], error: error.message };
  return { data: (data ?? []).map(toAvailability), error: null };
}
