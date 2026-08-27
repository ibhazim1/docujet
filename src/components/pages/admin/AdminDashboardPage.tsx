import AdminHeader from "@/components/admin/AdminHeader";
import AdminTable from "@/components/admin/AdminTable";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { prettyDate, resolveToday } from "@/lib/crm/analytics";
import { getAdminDashboard } from "@/lib/supabase/admin";

type AdminDashboardPageProps = {
  className?: string;
};

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

/**
 * The /admin landing page.
 *
 * Everything here is one read — see `getAdminDashboard`. When that read fails
 * the KPIs show an em dash rather than zero: "no appointments" and "we could
 * not ask" are different answers, and only one of them should be reassuring.
 */
export default async function AdminDashboardPage({
  className,
}: AdminDashboardPageProps) {
  const today = resolveToday(process.env.CRM_TODAY);
  const { data, error } = await getAdminDashboard(today);

  const reading = (value: number) => (error ? "—" : String(value));

  const stats = [
    {
      label: "Total Appointments",
      value: reading(data.totalAppointments),
      helper: "Booking requests on record",
    },
    {
      label: "Pending Appointments",
      value: reading(data.pendingAppointments),
      helper: "Awaiting confirmation",
    },
    {
      label: "New Leads",
      value: reading(data.newLeadsThisMonth),
      helper: `Captured in ${monthLabel(today)}`,
    },
    {
      label: "Total Customers",
      value: reading(data.totalCustomers),
      helper: "Leads at the Customer stage",
    },
  ];

  return (
    <div className={className ?? ""}>
      <AdminHeader
        title="Dashboard"
        description="Appointment, lead, and customer activity from Supabase."
      />

      <div className="space-y-8 p-5 md:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="min-w-0 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Recent Appointments
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                The latest booking requests. The full list lives on the
                Appointments page.
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
                        <td className="px-5 py-4 text-slate-600">
                          {appointment.appointmentType}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {appointment.preferredDate}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {appointment.preferredTime}
                        </td>
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

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Recent Leads</h2>
            <p className="mt-1 text-sm text-slate-500">
              The newest entries in the lead book, by their captured date.
            </p>
            <div className="mt-5 space-y-4">
              {error ? (
                <p className="text-sm text-slate-600">{error}</p>
              ) : data.recentLeads.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No leads yet. New ones arrive from the booking form, the contact
                  form, and the chatbot.
                </p>
              ) : (
                data.recentLeads.map((lead) => (
                  <article
                    key={lead.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-950">
                          {lead.name || lead.id}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {lead.company || "No company recorded"}
                        </p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {lead.interest || "No interest recorded"} via {lead.source}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                      Created {prettyDate(lead.createdAt)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
