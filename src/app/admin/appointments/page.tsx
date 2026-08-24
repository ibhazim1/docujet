import type { Metadata } from "next";
import AdminAppointmentsPageView from "@/components/pages/admin/AdminAppointmentsPage";
import AdminPlasmicPage from "@/components/plasmic/AdminPlasmicPage";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function AdminAppointmentsPage() {
  return (
    <AdminPlasmicPage
      path="/admin/appointments"
      fallback={<AdminAppointmentsPageView />}
    />
  );
}
