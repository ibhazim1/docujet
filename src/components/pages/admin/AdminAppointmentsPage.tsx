import EmptyState from "@/components/admin/EmptyState";
import AdminHeader from "@/components/admin/AdminHeader";
import AppointmentBrowser from "@/components/pages/admin/AppointmentBrowser";
import { getAdminAppointments } from "@/lib/supabase/admin";

type AdminAppointmentsPageProps = {
  className?: string;
};

export default async function AdminAppointmentsPage({
  className,
}: AdminAppointmentsPageProps) {
  const { data: appointments, error } = await getAdminAppointments();

  return (
    <div className={className ?? ""}>
      <AdminHeader
        title="Appointments"
        description="Manage appointment requests synced from Supabase."
      />

      <div className="space-y-6 p-5 md:p-8">
        {error ? (
          <EmptyState
            title="Could not load appointments"
            description={error}
          />
        ) : appointments.length === 0 ? (
          <EmptyState
            title="No appointments yet"
            description="Once bookings are submitted, they will appear here from Supabase."
          />
        ) : (
          <AppointmentBrowser appointments={appointments} />
        )}
      </div>
    </div>
  );
}
