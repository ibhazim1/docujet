import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | DocuJet Admin",
  },
  description: "Frontend admin interface for DocuJet staff and client administrators.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Protect /admin/* with Supabase Auth and server-side session checks.
  return <AdminShell>{children}</AdminShell>;
}
