/**
 * The /admin views that read appointments and the lead book: the appointments
 * table, the customer directory, and the dashboard's summary.
 *
 * These used to join `appointments` against a separate `customers` table. That table is gone: a person is a row in `crm_leads` now, and an
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

import { LOST_STAGE, SOURCES, STAGES } from "../crm/taxonomy";
import type { LeadAppointment, SourceKey, StageKey } from "../crm/types";
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

/** Only the columns these views need — not the whole `Lead`. */
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

const APPOINTMENT_COLUMNS =
  "id, lead_id, product_interest, appointment_type, preferred_date, preferred_time, status, additional_notes, created_at";

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

/**
 * The label a lead's lifecycle wears in the admin tables.
 *
 * Mirrors `displayStage()` in `crm/analytics.ts` — a lost lead shows as Lost
 * while its `stage` keeps recording how far it actually got — but takes a row
 * rather than a full `Lead`, since that is all these queries select.
 */
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

/**
 * One appointment row joined to the lead it names.
 *
 * A missing lead is impossible through the foreign key added in 0003, so these
 * fallbacks only ever show if a row is edited past it in psql — they say
 * "Unknown" rather than blank so that shows up as a fault, not as empty data.
 */
function toAdminAppointment(
  appointment: AppointmentRow,
  lead: LeadContactRow | undefined,
): AdminAppointment {
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
      appointment.status === "Confirmed" &&
      appointment.preferred_date < new Date().toISOString().slice(0, 10)
        ? "Completed"
        : appointment.status,
    additionalNotes: appointment.additional_notes ?? "",
    createdAt: appointment.created_at,
  };
}

/**
 * Every appointment, or one lead's.
 *
 * `leadId` narrows both halves, not just the appointments — scoped to one
 * person there is no reason to read the other fifty-one leads to name them.
 * It is what the Appointments link on a lead's card arrives with.
 */
export async function getAdminAppointments(leadId?: string) {
  if (!isSupabaseConfigured()) {
    return { data: [] as AdminAppointment[], error: NOT_CONFIGURED };
  }

  const client = supabase();
  // Keep the stored status current without requiring a separate scheduler.
  // The SQL function is idempotent and only changes confirmed past bookings.
  await client.rpc("sync_past_appointment_statuses");

  const appointments = client
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .order("created_at", { ascending: false });
  const leads = client.from("crm_leads").select(LEAD_CONTACT_COLUMNS);

  const [appointmentsResult, leadsResult] = await Promise.all([
    leadId ? appointments.eq("lead_id", leadId) : appointments,
    leadId ? leads.eq("id", leadId) : leads,
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
    (appointment) =>
      toAdminAppointment(appointment, leadMap.get(appointment.lead_id)),
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

// ---------------------------------------------------------------------------
// The dashboard
// ---------------------------------------------------------------------------

/** How many rows each "Recent ..." panel on the dashboard shows. */
const RECENT_APPOINTMENTS = 5;
const RECENT_LEADS = 4;

/** The subset of `crm_leads` the dashboard's lead panel renders. */
type DashboardLeadRow = {
  id: string;
  name: string;
  company: string;
  interest: string;
  source: string;
  stage: string;
  lost: boolean;
  created_at: string;
};

const DASHBOARD_LEAD_COLUMNS =
  "id, name, company, interest, source, stage, lost, created_at";

export type AdminDashboardLead = {
  id: string;
  name: string;
  company: string;
  interest: string;
  /** A source *label* ("Website form") — never the raw key. */
  source: string;
  /** A stage *label* ("Lead", "Lost") — what `StatusBadge` colours. */
  status: string;
  /** Y-m-d, as typed. See 0001 for why this column is text. */
  createdAt: string;
};

export type AdminDashboardData = {
  totalAppointments: number;
  pendingAppointments: number;
  newLeadsThisMonth: number;
  totalCustomers: number;
  recentAppointments: AdminAppointment[];
  recentLeads: AdminDashboardLead[];
};

/** What the dashboard renders when it could not read anything. */
function emptyDashboard(): AdminDashboardData {
  return {
    totalAppointments: 0,
    pendingAppointments: 0,
    newLeadsThisMonth: 0,
    totalCustomers: 0,
    recentAppointments: [],
    recentLeads: [],
  };
}

/**
 * The half-open [start, end) Y-m-01 pair bounding the month `today` falls in.
 *
 * `crm_leads.created_at` is text 'YYYY-MM-DD' rather than a date (see 0001),
 * so "this month" is a lexicographic range. That only works because the format
 * is zero-padded and big-endian — the same property `monthlyStats` relies on.
 */
function monthWindow(today: string): { start: string; end: string } {
  const [year, month] = today.split("-").map(Number);
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    start: `${year}-${pad(month)}-01`,
    end: month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`,
  };
}

/**
 * Everything the /admin landing page shows, in one call.
 *
 * The four KPIs are `head: true` counts — Postgres answers them without
 * shipping a row — and the two panels read only the handful they display. That
 * is the whole reason this is not built from `getAdminAppointments()` and
 * `fetchLeads()`: those two read every appointment and every lead to render
 * nine rows between them.
 *
 * `today` is passed in rather than read here so the page can honour the
 * `CRM_TODAY` pin that keeps the seeded demo data's "this month" stable — see
 * `resolveToday` in `crm/analytics.ts`.
 */
export async function getAdminDashboard(today: string) {
  if (!isSupabaseConfigured()) {
    return { data: emptyDashboard(), error: NOT_CONFIGURED };
  }

  const client = supabase();
  const { start, end } = monthWindow(today);

  const results = await Promise.all([
    client.from("appointments").select("id", { count: "exact", head: true }),
    client
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "Pending"),
    client
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lt("created_at", end),
    // Every lead that reached Customer, lost ones included — the same
    // population /admin/customers lists, for the same reason.
    client
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .eq("stage", "customer"),
    client
      .from("appointments")
      .select(APPOINTMENT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(RECENT_APPOINTMENTS),
    // `created_at` is hand-typed text and may tie; `inserted_at` breaks it with
    // the order the rows actually arrived in.
    client
      .from("crm_leads")
      .select(DASHBOARD_LEAD_COLUMNS)
      .order("created_at", { ascending: false })
      .order("inserted_at", { ascending: false })
      .limit(RECENT_LEADS),
  ]);

  const failure = results.map((result) => result.error?.message).find(Boolean);
  if (failure) {
    return { data: emptyDashboard(), error: failure };
  }

  const [total, pending, newLeads, customers, appointmentsResult, leadsResult] =
    results;

  const appointmentRows = (appointmentsResult.data ?? []) as AppointmentRow[];
  const leadIds = [...new Set(appointmentRows.map((row) => row.lead_id))];

  // Only the leads those few appointments name. `getAdminAppointments` reads
  // the whole book because it renders the whole book; five rows do not.
  let contacts: LeadContactRow[] = [];

  if (leadIds.length > 0) {
    const contactsResult = await client
      .from("crm_leads")
      .select(LEAD_CONTACT_COLUMNS)
      .in("id", leadIds);

    if (contactsResult.error) {
      return { data: emptyDashboard(), error: contactsResult.error.message };
    }
    contacts = (contactsResult.data ?? []) as LeadContactRow[];
  }

  const leadMap = new Map(contacts.map((lead) => [lead.id, lead]));

  const data: AdminDashboardData = {
    totalAppointments: total.count ?? 0,
    pendingAppointments: pending.count ?? 0,
    newLeadsThisMonth: newLeads.count ?? 0,
    totalCustomers: customers.count ?? 0,
    recentAppointments: appointmentRows.map((appointment) =>
      toAdminAppointment(appointment, leadMap.get(appointment.lead_id)),
    ),
    recentLeads: ((leadsResult.data ?? []) as DashboardLeadRow[]).map((lead) => ({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      interest: lead.interest,
      source: SOURCES[lead.source as SourceKey]?.label ?? lead.source,
      status: stageLabel(lead),
      createdAt: lead.created_at,
    })),
  };

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// The lead tracker's appointments
// ---------------------------------------------------------------------------

/**
 * Every appointment, keyed to the lead that booked it.
 *
 * Unfiltered on purpose, and shaped for the client: the tracker hands the whole
 * lead book to the browser and does all its filtering there (see
 * `analytics.ts`), so the card that shows a lead's appointments has to have
 * them already. There are fewer appointments than leads, and both together are
 * a fraction of what the charts already compute over.
 *
 * Ordered newest first so nothing downstream has to sort. `preferred_time` is a
 * `time` column, which arrives as 'HH:MM:SS'; the seconds are always zero
 * because every slot is booked on the half hour, so they are dropped here
 * rather than in six different bits of JSX.
 */
export async function getLeadAppointments() {
  if (!isSupabaseConfigured()) {
    return { data: [] as LeadAppointment[], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase()
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .order("preferred_date", { ascending: false })
    .order("preferred_time", { ascending: false });

  if (error) {
    return { data: [] as LeadAppointment[], error: error.message };
  }

  return {
    data: ((data ?? []) as AppointmentRow[]).map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      product: row.product_interest,
      type: row.appointment_type,
      date: row.preferred_date,
      time: (row.preferred_time ?? "").slice(0, 5),
      status: row.status,
    })),
    error: null,
  };
}

export async function getAdminCustomers() {
  return getCustomerLeads();
}
