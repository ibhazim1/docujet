import { supabase } from "./supabase/service";

export type SuperadminUser = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "superadmin" | "unassigned";
  isActive: boolean;
  lastSignInAt: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export async function getSuperadminUsers() {
  const client = supabase();
  const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      client.from("user_profiles").select("id, full_name, role, is_active"),
    ]);

  if (authError) throw authError;
  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  return (authData.users ?? []).map((user): SuperadminUser => {
    const profile = profileMap.get(user.id);
    return {
      id: user.id,
      email: user.email ?? "No email",
      fullName: profile?.full_name || user.user_metadata?.full_name || "Unnamed staff",
      role: profile?.role ?? "unassigned",
      isActive: profile?.is_active ?? !user.banned_until,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at,
    };
  });
}

export async function getAuditLogs() {
  const client = supabase();
  const { data, error } = await client
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map(
    (log): AuditLog => ({
      id: log.id,
      actorId: log.actor_id,
      action: log.action,
      targetType: log.target_type,
      targetId: log.target_id,
      details: (log.details ?? {}) as Record<string, unknown>,
      createdAt: log.created_at,
    }),
  );
}
