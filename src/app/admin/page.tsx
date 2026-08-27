import type { Metadata } from "next";
import AdminDashboardPageView from "@/components/pages/admin/AdminDashboardPage";
import AdminPlasmicPage from "@/components/plasmic/AdminPlasmicPage";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Counts and recent activity move whenever a booking lands or a rep edits a
// lead, so this is always read at request time — the same reason /admin/leads
// is. A cached dashboard is a wrong dashboard.
export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return <AdminPlasmicPage path="/admin" fallback={<AdminDashboardPageView />} />;
}
