import type { Metadata } from "next";
import AdminAppointmentsPageView from "@/components/pages/admin/AdminAppointmentsPage";
import AdminPlasmicPage from "@/components/plasmic/AdminPlasmicPage";

export const metadata: Metadata = {
  title: "Appointments",
};

/**
 * `?lead=` scopes the table to one lead, `?appointment=` picks out the row that
 * was clicked — both arrive from the Appointments list on a lead's card.
 *
 * Reading `searchParams` at all opts this route into request-time rendering,
 * which it wanted anyway: it was being prerendered at build time and serving
 * whatever bookings existed when the build ran.
 */
export default async function AdminAppointmentsPage(
  props: PageProps<"/admin/appointments">,
) {
  const { lead, appointment } = await props.searchParams;

  return (
    <AdminPlasmicPage
      path="/admin/appointments"
      fallback={
        <AdminAppointmentsPageView
          leadId={typeof lead === "string" ? lead : undefined}
          appointmentId={typeof appointment === "string" ? appointment : undefined}
        />
      }
    />
  );
}
