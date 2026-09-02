"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaffProfile } from "@/lib/supabase/authorization";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/service";

export type AvailabilityActionState = {
  error: string | null;
  success: string | null;
};

const initialState: AvailabilityActionState = { error: null, success: null };

async function requireAvailabilityManager() {
  const profile = await getCurrentStaffProfile();
  if (!profile || profile.role !== "superadmin") {
    throw new Error("You are not authorized to manage appointment availability.");
  }
  return profile;
}

function readTime(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59 || minutes % 30 !== 0) return null;
  return hours * 60 + minutes;
}

function validateRange(date: string, startTime: string, endTime: string) {
  const today = new Date().toISOString().slice(0, 10);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) {
    return "Choose today or a future date.";
  }
  if (start === null || end === null) {
    return "Times must use 30-minute increments, such as 09:00 or 09:30.";
  }
  if (start >= end) return "Start time must be before end time.";
  return null;
}

function redirectAfterSave() {
  revalidatePath("/superadmin/availability");
  revalidatePath("/booking");
}

export async function createAvailability(
  _previousState: AvailabilityActionState = initialState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  void _previousState;
  try {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured on the server.");
    const actor = await requireAvailabilityManager();
    const availableDate = String(formData.get("available_date") ?? "");
    const startTime = readTime(formData.get("start_time"));
    const endTime = readTime(formData.get("end_time"));
    const validationError = validateRange(availableDate, startTime, endTime);
    if (validationError) return { error: validationError, success: null };

    const { error } = await supabase().from("appointment_availability").insert({
      available_date: availableDate,
      start_time: startTime,
      end_time: endTime,
      created_by: actor.id,
    });
    if (error) throw error;
    redirectAfterSave();
    return { error: null, success: "Availability added." };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Could not add availability.", success: null };
  }
}

export async function updateAvailability(
  _previousState: AvailabilityActionState = initialState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  void _previousState;
  try {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured on the server.");
    await requireAvailabilityManager();
    const id = String(formData.get("id") ?? "");
    const availableDate = String(formData.get("available_date") ?? "");
    const startTime = readTime(formData.get("start_time"));
    const endTime = readTime(formData.get("end_time"));
    const validationError = validateRange(availableDate, startTime, endTime);
    if (!id) return { error: "Availability record is missing.", success: null };
    if (validationError) return { error: validationError, success: null };

    const { error } = await supabase()
      .from("appointment_availability")
      .update({ available_date: availableDate, start_time: startTime, end_time: endTime })
      .eq("id", id);
    if (error) throw error;
    redirectAfterSave();
    return { error: null, success: "Availability updated." };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Could not update availability.", success: null };
  }
}

export async function updateAvailabilityFromForm(formData: FormData): Promise<void> {
  await updateAvailability(undefined, formData);
}

export async function setAvailabilityActive(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured on the server.");
  await requireAvailabilityManager();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  const { error } = await supabase().from("appointment_availability").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
  redirectAfterSave();
}

export async function deleteAvailability(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured on the server.");
  await requireAvailabilityManager();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase().from("appointment_availability").delete().eq("id", id);
  if (error) throw error;
  redirectAfterSave();
}
