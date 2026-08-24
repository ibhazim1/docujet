import type { Metadata } from "next";

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
  // Route protection happens in src/proxy.ts so protected pages never render
  // without a valid Supabase session.
  return children;
}
