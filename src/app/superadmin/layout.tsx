import type { Metadata } from "next";
import { requireSuperadmin } from "@/lib/supabase/authorization";

export const metadata: Metadata = {
  title: {
    default: "Superadmin",
    template: "%s | DocuJet Superadmin",
  },
};

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperadmin();
  return children;
}
