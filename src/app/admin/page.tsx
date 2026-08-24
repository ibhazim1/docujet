import type { Metadata } from "next";
import AdminDashboardPageView from "@/components/pages/admin/AdminDashboardPage";
import AdminPlasmicPage from "@/components/plasmic/AdminPlasmicPage";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return <AdminPlasmicPage path="/admin" fallback={<AdminDashboardPageView />} />;
}
