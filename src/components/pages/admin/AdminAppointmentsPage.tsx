import EmptyState from "@/components/admin/EmptyState";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTable from "@/components/admin/AdminTable";
import SearchInput from "@/components/admin/SearchInput";
import StatusBadge from "@/components/admin/StatusBadge";
import { getAdminAppointments } from "@/lib/supabase/admin";

type AdminAppointmentsPageProps = {
  /** Narrows the table to one lead's bookings. From `?lead=` on the URL. */
  leadId?: string;
  /** The row that was clicked on the lead's card. From `?appointment=`. */
  appointmentId?: string;
  className?: string;
};

export default async function AdminAppointmentsPage({
  leadId,
  appointmentId,
  className,
}: AdminAppointmentsPageProps) {
  const { data: appointments, error } = await getAdminAppointments(leadId);

  // The lead's own name, taken from the rows rather than read separately — an
  // appointment already carries it. Falls back to the id for a `?lead=` that
  // matches nothing, which is the only way this can come back empty.
  const scopedTo = leadId ? appointments[0]?.customer || leadId : null;

  return (
    <div className={className ?? ""}>
      <AdminHeader
        title="Appointments"
        description="Manage appointment requests synced from Supabase."
      />

      <div className="space-y-6 p-5 md:p-8">
        {scopedTo ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900"
          >
            <p>
              Showing only the appointments booked by{" "}
              <strong className="font-semibold">{scopedTo}</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/admin/leads?lead=${encodeURIComponent(leadId ?? "")}`}
                className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:border-sky-400"
              >
                Back to the lead
              </a>
              <a
                href="/admin/appointments"
                className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:border-sky-400"
              >
                Show all appointments
              </a>
            </div>
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-4">
            <SearchInput placeholder="Search customer, company, or appointment ID" />
            <FilterSelect
              label="Status"
              options={["All Statuses", "Pending", "Confirmed", "Completed", "Cancelled"]}
            />
            <FilterSelect
              label="Appointment Type"
              options={[
                "All Types",
                "Product Consultation",
                "Product Demonstration",
                "Pricing Discussion",
                "Technical Consultation",
                "After-Sales Support",
              ]}
            />
            <Field label="Preferred Date" htmlFor="appointments-date">
              <input id="appointments-date" type="date" className={inputClassName} />
            </Field>
          </div>
        </section>

        {error ? (
          <EmptyState
            title="Could not load appointments"
            description={error}
          />
        ) : appointments.length === 0 ? (
          <EmptyState
            title={scopedTo ? "No appointments for this lead" : "No appointments yet"}
            description={
              scopedTo
                ? "This lead has not booked anything, or the booking has since been removed."
                : "Once bookings are submitted, they will appear here from Supabase."
            }
          />
        ) : (
          <AdminTable>
            <table className="min-w-[1180px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    "Appointment ID",
                    "Customer",
                    "Company",
                    "Email",
                    "Phone",
                    "Product",
                    "Appointment Type",
                    "Preferred Date",
                    "Preferred Time",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    // The one that was clicked on the lead's card. Scrolled to
                    // by the anchor and marked so it is findable among siblings
                    // that differ only by time.
                    id={`appointment-${appointment.id}`}
                    className={`scroll-mt-6 border-t border-slate-200 ${
                      appointment.id === appointmentId ? "bg-sky-50" : ""
                    }`}
                  >
                    <td className="px-5 py-4 font-medium text-slate-950">{appointment.id}</td>
                    <td className="px-5 py-4 text-slate-600">{appointment.customer}</td>
                    <td className="px-5 py-4 text-slate-600">{appointment.company}</td>
                    <td className="px-5 py-4 text-slate-600">{appointment.email}</td>
                    <td className="px-5 py-4 text-slate-600">{appointment.phone}</td>
                    <td className="px-5 py-4 text-slate-600">{appointment.product}</td>
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
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {["View", "Confirm", "Complete", "Cancel"].map((action) => (
                          <button
                            key={action}
                            type="button"
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTable>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <Field label={label} htmlFor={label}>
      <select id={label} className={inputClassName} defaultValue={options[0]}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
