"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaffProfile } from "@/lib/supabase/authorization";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/service";

type AppointmentStatus = "Completed" | "Cancelled";

async function requireStaff() {
  const profile = await getCurrentStaffProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    throw new Error("You are not authorized to update appointments.");
  }
  return profile;
}

export async function updateAppointmentStatusFromForm(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured on the server.");

  const actor = await requireStaff();
  const appointmentId = String(formData.get("appointment_id") ?? "");
  const status = String(formData.get("status") ?? "") as AppointmentStatus;

  if (!appointmentId || (status !== "Completed" && status !== "Cancelled")) {
    throw new Error("Invalid appointment status update.");
  }

  const client = supabase();
  const { error } = await client
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("status", "Confirmed");

  if (error) throw error;

  await client.from("audit_logs").insert({
    actor_id: actor.id,
    action: `appointment.${status.toLowerCase()}`,
    target_type: "appointment",
    target_id: appointmentId,
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${appointmentId}`);
}
