import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminShell from "@/components/admin/AdminShell";
import DemoNotice from "@/components/admin/DemoNotice";
import { superadminNavItems } from "@/lib/admin-mock-data";
import { getAppointmentAvailability } from "@/lib/supabase/availability";
import AvailabilityManager from "./AvailabilityManager";

export const metadata: Metadata = { title: "Appointment Availability" };
export const dynamic = "force-dynamic";

export default async function AppointmentAvailabilityPage() {
  const result = await getAppointmentAvailability();
  return <AdminShell navItems={superadminNavItems} brand="DocuJet Staff workspace" brandHref="/superadmin" tagline="System administration">
    <AdminHeader title="Appointment availability" description="Choose when customers can book appointments." eyebrow="DocuJet Superadmin" />
    <div className="space-y-6 p-5 md:p-8">
      {result.error ? <DemoNotice title="Availability needs database setup." reason={result.error}>Apply <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">0007_appointment_availability.sql</code> in Supabase before configuring slots.</DemoNotice> : null}
      <AvailabilityManager availability={result.data} />
    </div>
  </AdminShell>;
}
