import { LOST_STAGE, STAGES } from "../crm/taxonomy";
import type { StageKey } from "../crm/types";
import { isSupabaseConfigured, supabase } from "./service";

type AppointmentRow = {
  id: string;
  lead_id: string;
  product_interest: string;
  appointment_type: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  additional_notes: string | null;
  created_at: string;
};

type LeadContactRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  lost: boolean;
  last_contact_at: string | null;
};

const LEAD_CONTACT_COLUMNS =
  "id, name, company, email, phone, stage, lost, last_contact_at";

export type AdminAppointment = {
  id: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  product: string;
  appointmentType: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  additionalNotes: string;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  appointments: number;
  lastContact: string;
  status: string;
};

export function formatAppointmentId(id: string): string {
  if (!id) return "APT-UNKNOWN";
  if (id.length <= 12) return id;
  return `APT-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function stageLabel(row: Pick<LeadContactRow, "stage" | "lost">): string {
  const key = (row.lost ? LOST_STAGE : row.stage) as StageKey;
  return STAGES[key]?.label ?? row.stage;
}

const NOT_CONFIGURED =
  "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.";

export async function getAdminAppointments() {
  if (!isSupabaseConfigured()) {
    return { data: [] as AdminAppointment[], error: NOT_CONFIGURED };
  }

  const client = supabase();
  // Keep the stored status current without requiring a separate scheduler.
  // The SQL function is idempotent and only changes confirmed past bookings.
  await client.rpc("sync_past_appointment_statuses");

  const [appointmentsResult, leadsResult] = await Promise.all([
    client
      .from("appointments")
      .select(
        "id, lead_id, product_interest, appointment_type, preferred_date, preferred_time, status, additional_notes, created_at",
      )
      .order("created_at", { ascending: false }),
    client.from("crm_leads").select(LEAD_CONTACT_COLUMNS),
  ]);

  if (appointmentsResult.error) {
    return { data: [] as AdminAppointment[], error: appointmentsResult.error.message };
  }
  if (leadsResult.error) {
    return { data: [] as AdminAppointment[], error: leadsResult.error.message };
  }

  const leadMap = new Map(
    ((leadsResult.data ?? []) as LeadContactRow[]).map((lead) => [lead.id, lead]),
  );
  const data = ((appointmentsResult.data ?? []) as AppointmentRow[]).map(
    (appointment) => {
      const lead = leadMap.get(appointment.lead_id);
      return {
        id: appointment.id,
        customer: lead?.name ?? "Unknown lead",
        company: lead?.company ?? "Unknown company",
        email: lead?.email ?? "Unknown email",
        phone: lead?.phone ?? "Unknown phone",
        product: appointment.product_interest,
        appointmentType: appointment.appointment_type,
        preferredDate: appointment.preferred_date,
        preferredTime: appointment.preferred_time,
        status:
          appointment.status === "Confirmed" && appointment.preferred_date < new Date().toISOString().slice(0, 10)
            ? "Completed"
            : appointment.status,
        additionalNotes: appointment.additional_notes ?? "",
        createdAt: appointment.created_at,
      };
    },
  );

  return { data, error: null };
}

export async function getAdminAppointment(id: string) {
  const result = await getAdminAppointments();
  if (result.error) return { data: null, error: result.error };
  return {
    data: result.data.find((appointment) => appointment.id === id) ?? null,
    error: null,
  };
}

export async function getCustomerLeads() {
  if (!isSupabaseConfigured()) {
    return { data: [] as AdminCustomer[], error: NOT_CONFIGURED };
  }

  const client = supabase();
  const [leadsResult, appointmentsResult] = await Promise.all([
    client
      .from("crm_leads")
      .select(LEAD_CONTACT_COLUMNS)
      .eq("stage", "customer")
      .order("last_contact_at", { ascending: false, nullsFirst: false }),
    client.from("appointments").select("lead_id"),
  ]);

  if (leadsResult.error) {
    return { data: [] as AdminCustomer[], error: leadsResult.error.message };
  }

  const appointmentCounts = new Map<string, number>();
  (appointmentsResult.data ?? []).forEach((row: { lead_id: string }) => {
    appointmentCounts.set(row.lead_id, (appointmentCounts.get(row.lead_id) ?? 0) + 1);
  });

  const data = ((leadsResult.data ?? []) as LeadContactRow[]).map((lead) => ({
    id: lead.id,
    customer: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    appointments: appointmentCounts.get(lead.id) ?? 0,
    lastContact: lead.last_contact_at
      ? new Date(lead.last_contact_at).toISOString().slice(0, 10)
      : "—",
    status: stageLabel(lead),
  }));

  return { data, error: null };
}

export async function getAdminCustomers() {
  return getCustomerLeads();
}
