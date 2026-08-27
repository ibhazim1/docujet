import { redirect } from "next/navigation";
import { createClient } from "./server";

export type StaffRole = "admin" | "superadmin";

export type StaffProfile = {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
};

export async function getCurrentStaffProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;
  return data as StaffProfile;
}

export async function requireSuperadmin() {
  const profile = await getCurrentStaffProfile();
  if (!profile || profile.role !== "superadmin") {
    redirect("/admin");
  }
  return profile;
}

export async function isCurrentUserSuperadmin() {
  const profile = await getCurrentStaffProfile();
  return Boolean(profile?.role === "superadmin");
}
