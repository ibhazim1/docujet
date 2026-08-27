/**
 * The two admin tables that read appointments.
 *
 * Both of these used to join `appointments` against a separate `customers`
 * table. That table is gone: a person is a row in `crm_leads` now, and an
 * appointment points at one through `appointments.lead_id`. "Customer" is no
 * longer a table — it is `stage = 'customer'` in the lead lifecycle, which is
 * what it always meant in the CRM.
 *
 * ---------------------------------------------------------------------------
 * These read through the **service** client, not `server.ts`. `crm_leads` has
 * RLS on with zero policies, so a publishable-key client reads it as an empty
 * array *with no error* — every appointment would silently render "Unknown
 * lead" and nothing would report a failure. `/admin/*` is already behind the
 * route guard in `src/proxy.ts`, which is what makes bypassing RLS here safe.
 * ---------------------------------------------------------------------------
 */

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
};

/** Only the columns these two views need — not the whole `Lead`. */
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
};

export type AdminCustomer = {
  id: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  appointments: number;
  lastContact: string;
  /** A stage *label* ("Customer", "Lost") — what `StatusBadge` colours. */
  status: string;
};

/**
 * The label a lead's lifecycle wears in the admin tables.
 *
 * Mirrors `displayStage()` in `crm/analytics.ts` — a lost lead shows as Lost
 * while its `stage` keeps recording how far it actually got — but takes a row
 * rather than a full `Lead`, since that is all these queries select.
 */
function stageLabel(row: Pick<LeadContactRow, "stage" | "lost">): string {
  const key = (row.lost ? LOST_STAGE : row.stage) as StageKey;
  return STAGES[key]?.label ?? row.stage;
}

/** The same "we cannot reach the database" answer both callers return. */
const NOT_CONFIGURED =
  "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.";

export async function getAdminAppointments() {
  if (!isSupabaseConfigured()) {
    return { data: [] as AdminAppointment[], error: NOT_CONFIGURED };
  }

  const client = supabase();

  const [appointmentsResult, leadsResult] = await Promise.all([
    client
      .from("appointments")
      .select(
        "id, lead_id, product_interest, appointment_type, preferred_date, preferred_time, status",
      )
      .order("created_at", { ascending: false }),
    client.from("crm_leads").select(LEAD_CONTACT_COLUMNS),
  ]);

  if (appointmentsResult.error) {
    return {
      data: [] as AdminAppointment[],
      error: appointmentsResult.error.message,
    };
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
        status: appointment.status,
      };
    },
  );

  return { data, error: null };
}

/**
 * The customer directory — leads that reached the Customer stage.
 *
 * Lost ones are kept rather than filtered out. `stage` records how far a lead
 * got and never moves backwards, so a churned customer still has
 * `stage = 'customer'`; hiding them would make the directory quietly disagree
 * with the funnel, and their appointment history is exactly what someone
 * looking at this page wants. `stageLabel` shows them as Lost.
 */
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

  if (appointmentsResult.error) {
    return {
      data: [] as AdminCustomer[],
      error: appointmentsResult.error.message,
    };
  }

  const appointmentCounts = new Map<string, number>();

  (appointmentsResult.data ?? []).forEach((row: { lead_id: string }) => {
    appointmentCounts.set(
      row.lead_id,
      (appointmentCounts.get(row.lead_id) ?? 0) + 1,
    );
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
