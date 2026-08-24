import type { Metadata } from "next";
import AdminCustomersPageView from "@/components/pages/admin/AdminCustomersPage";
import AdminPlasmicPage from "@/components/plasmic/AdminPlasmicPage";

export const metadata: Metadata = {
  title: "Customers",
};

export default function AdminCustomersPage() {
  return (
    <AdminPlasmicPage
      path="/admin/customers"
      fallback={<AdminCustomersPageView />}
    />
  );
}
