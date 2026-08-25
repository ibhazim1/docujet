import type { Metadata } from "next";
import AdminLeadsPageView from "@/components/pages/admin/AdminLeadsPage";
import AdminPlasmicPage from "@/components/plasmic/AdminPlasmicPage";

export const metadata: Metadata = {
  title: "Lead Tracker",
};

// Leads change from under this page — another admin session, a direct edit in
// the Supabase table editor — so it is always request-time fresh.
export const dynamic = "force-dynamic";

export default function AdminLeadsPage() {
  return <AdminPlasmicPage path="/admin/leads" fallback={<AdminLeadsPageView />} />;
}
