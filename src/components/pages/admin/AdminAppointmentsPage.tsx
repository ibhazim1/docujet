import Link from "next/link";
import EmptyState from "@/components/admin/EmptyState";
import AdminHeader from "@/components/admin/AdminHeader";
import AppointmentBrowser from "@/components/pages/admin/AppointmentBrowser";
import { getAdminAppointments } from "@/lib/supabase/admin";

type AdminAppointmentsPageProps = {
  /** Narrows the table to one lead's bookings. From `?lead=` on the URL. */
  leadId?: string;
  /**
   * Legacy. `?appointment=` used to highlight one row in a table rendered here;
   * rows now open `/admin/appointments/[id]` instead, and nothing in the app
   * links with this parameter any more. Still accepted so the route that passes
   * it does not have to change.
   */
  appointmentId?: string;
  className?: string;
};

export default async function AdminAppointmentsPage({
  leadId,
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
              <Link
                href={`/admin/leads?lead=${encodeURIComponent(leadId ?? "")}`}
                className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:border-sky-400"
              >
                Back to the lead
              </Link>
              <Link
                href="/admin/appointments"
                className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:border-sky-400"
              >
                Show all appointments
              </Link>
            </div>
          </div>
        ) : null}

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
          <AppointmentBrowser appointments={appointments} />
        )}
      </div>
    </div>
  );
}
