import AdminHeader from "@/components/admin/AdminHeader";
import AdminTable from "@/components/admin/AdminTable";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { appointments, dashboardStats, leads } from "@/lib/admin-mock-data";

type AdminDashboardPageProps = {
  className?: string;
};

export default function AdminDashboardPage({
  className,
}: AdminDashboardPageProps) {
  return (
    <div className={className ?? ""}>
      <AdminHeader
        title="Dashboard"
        description="Overview of mock appointments, leads, and customer activity for the admin UI."
      />

      <div className="space-y-8 p-5 md:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
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
                Demo frontend data only. No remote storage or workflow is connected yet.
              </p>
            </div>
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
                  {appointments.map((appointment) => (
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
          </div>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Recent Leads</h2>
            <p className="mt-1 text-sm text-slate-500">
              Current lead items are mock records for layout preview.
            </p>
            <div className="mt-5 space-y-4">
              {leads.map((lead) => (
                <article
                  key={lead.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-950">{lead.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{lead.company}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {lead.productInterest} via {lead.source}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                    Created {lead.createdDate}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
