import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTable from "@/components/admin/AdminTable";
import DemoNotice from "@/components/admin/DemoNotice";
import EmptyState from "@/components/admin/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminOverview from "@/components/crm/AdminOverview";
import LeadTracker from "@/components/crm/LeadTracker";
import { resolveToday } from "@/lib/crm/analytics";
import { fetchLeads, isSupabaseConfigured } from "@/lib/crm/leads";
import type { Lead, LeadAppointment } from "@/lib/crm/types";
import { getAdminDashboard, getLeadAppointments } from "@/lib/supabase/admin";

type AdminDashboardPageProps = {
  className?: string;
};

/**
 * The /admin landing page — the owner view.
 *
 * ---------------------------------------------------------------------------
 * What this page used to be, and why it changed
 *
 * Four counts and two lists: total appointments, pending appointments, new
 * leads this month, total customers. Every figure correct, and not one of them
 * a number anybody acts on. "38 appointments" does not say whether the book is
 * healthy; "23 open leads have gone quiet, 6 of them already qualified" does.
 *
 * So the page now leads with the shape of the pipeline and a ranked list of
 * what to fix, and the appointment activity that used to be the whole dashboard
 * is supporting detail rather than the headline. The numbers come from the
 * same pure functions the lead tracker uses, rendered through a `LeadTracker`
 * whose children slot is filled with `AdminOverview` — deliberately, so there
 * is no second code path that could disagree with /admin/leads about the book.
 *
 * Appointment health rides in `AdminOverview`'s `funnelFooter` slot, stacked
 * under the funnel chart rather than off in a section of its own: the funnel
 * and the insight panel beside it are almost never the same height, and a
 * short card is exactly what belongs in the gap that opens up rather than left
 * as dead space. Recent Appointments takes `afterFunnel` — too wide for either
 * column, so it runs full width, above the attention lists rather than below
 * them: a booking is the strongest signal this page has, and it should not be
 * the thing a reader has to scroll to reach.
 * ---------------------------------------------------------------------------
 *
 * The appointment reads still come from `getAdminDashboard`, which counts in
 * SQL. When that read fails the counts show an em dash rather than zero: "no
 * appointments" and "we could not ask" are different answers, and only one of
 * them should be reassuring.
 */
export default async function AdminDashboardPage({
  className,
}: AdminDashboardPageProps) {
  const today = resolveToday(process.env.CRM_TODAY);

  const [dashboard, book] = await Promise.all([
    getAdminDashboard(today),
    readBook(),
  ]);

  const { data, error } = dashboard;

  // Built here rather than inline below, because each is handed to
  // `AdminOverview` twice — once for the real book, once for the sample-data
  // fallback — and the appointment reads do not change between those two
  // branches. Only the lead book does.
  const appointmentHealth = (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Appointment health</h2>
      <p className="mt-1 text-sm text-slate-500">
        A booking is the strongest buying signal this business collects, so the share that never
        happens is worth watching on its own.
      </p>
      <dl className="mt-5 space-y-3">
        <Reading
          label="Total booked"
          value={error ? "—" : String(data.totalAppointments)}
          helper="Booking requests on record"
        />
        <Reading
          label="Awaiting confirmation"
          value={error ? "—" : String(data.pendingAppointments)}
          helper="Unconfirmed bookings are the ones that get forgotten"
        />
        <Reading
          label="New leads this month"
          value={error ? "—" : String(data.newLeadsThisMonth)}
          helper={`Captured in ${monthLabel(today)}`}
        />
        <Reading
          label="Reached Customer"
          value={error ? "—" : String(data.totalCustomers)}
          helper="Every lead that ever signed, churned ones included"
        />
      </dl>
    </section>
  );

  const recentAppointments = (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Recent Appointments</h2>
        <p className="mt-1 text-sm text-slate-500">
          The latest booking requests. The full list lives on the Appointments page.
        </p>
      </div>
      {error ? (
        <EmptyState title="Could not load appointments" description={error} />
      ) : data.recentAppointments.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Once bookings are submitted, they will appear here from Supabase."
        />
      ) : (
        <AdminTable>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Customer", "Company", "Appointment Type", "Date", "Time", "Status"].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.recentAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-950">
                    {appointment.customer}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{appointment.company}</td>
                  <td className="px-5 py-4 text-slate-600">{appointment.appointmentType}</td>
                  <td className="px-5 py-4 text-slate-600">{appointment.preferredDate}</td>
                  <td className="px-5 py-4 text-slate-600">{appointment.preferredTime}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={appointment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      )}
    </div>
  );

  return (
    <div className={className ?? ""}>
      <AdminHeader
        title="Dashboard"
        description="How healthy the book is, what is going quiet, and what to do about it."
      />

      <div className="space-y-8 p-5 md:p-8">
        {book.notice ? (
          <DemoNotice
            title="Showing sample data — the database is not connected."
            reason={book.notice}
          >
            Every figure below is computed from the seed lead book, so the arithmetic is real even
            though the leads are not. Connect Supabase and run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>{" "}
            to see your own.
          </DemoNotice>
        ) : null}

        {/* The overview reads the query string through the tracker, which needs
            a Suspense boundary. `readOnly` because this is a reporting surface:
            leads are edited on /admin/leads, and a stage control here would be
            a second place to change the same thing. */}
        <Suspense
          fallback={<p className="text-sm text-slate-500">Loading pipeline…</p>}
        >
          {book.leads ? (
            <LeadTracker
              leads={book.leads}
              appointments={book.appointments}
              today={today}
              autoLoad={false}
              readOnly
            >
              <AdminOverview funnelFooter={appointmentHealth} afterFunnel={recentAppointments} />
            </LeadTracker>
          ) : (
            <LeadTracker today={today} autoLoad={false} readOnly>
              <AdminOverview funnelFooter={appointmentHealth} afterFunnel={recentAppointments} />
            </LeadTracker>
          )}
        </Suspense>
      </div>
    </div>
  );
}

function Reading({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <dt className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{helper}</span>
      </dt>
      <dd className="shrink-0 text-lg font-semibold tabular-nums text-slate-950">{value}</dd>
    </div>
  );
}

/**
 * The lead book, for the health aggregates.
 *
 * A whole-table read where the rest of this page counts in SQL, because "how
 * many open leads have gone quiet" is not expressible as a count without every
 * lead's stage and last-contact date to hand. At this size that is one small
 * query, and it is the same read `/admin/leads` already does.
 */
async function readBook(): Promise<{
  leads: Lead[] | null;
  appointments: LeadAppointment[];
  notice: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      leads: null,
      appointments: [],
      notice:
        "No Supabase project is configured — SUPABASE_URL and SUPABASE_SECRET_KEY are not set in .env.",
    };
  }

  try {
    const [leads, booked] = await Promise.all([fetchLeads(), getLeadAppointments()]);
    return { leads, appointments: booked.data, notice: null };
  } catch (cause) {
    return {
      leads: null,
      appointments: [],
      notice: cause instanceof Error ? cause.message : "Could not read the leads table.",
    };
  }
}

/** "August 2026" — which month the New Leads count is counting. */
function monthLabel(today: string): string {
  const [year, month] = today.split("-").map(Number);

  // Fixed locale and UTC: this renders on the server, and a reading that
  // depended on the server's timezone could name the wrong month.
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
