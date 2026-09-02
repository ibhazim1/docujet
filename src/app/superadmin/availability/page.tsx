import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminShell from "@/components/admin/AdminShell";
import DemoNotice from "@/components/admin/DemoNotice";
import { superadminNavItems } from "@/lib/admin-mock-data";
import { getAppointmentAvailability, getAppointmentBlocks, getBookingClosures } from "@/lib/supabase/availability";
import AvailabilityManager from "./AvailabilityManager";

export const metadata: Metadata = { title: "Appointment Availability" };
export const dynamic = "force-dynamic";

export default async function AppointmentAvailabilityPage() {
  const [availabilityResult, closuresResult, blocksResult] = await Promise.all([getAppointmentAvailability(), getBookingClosures(), getAppointmentBlocks()]);
  return <AdminShell navItems={superadminNavItems} brand="DocuJet Staff workspace" brandHref="/superadmin" tagline="System administration">
    <AdminHeader title="Appointment availability" description="Choose when customers can book appointments." eyebrow="DocuJet Superadmin" />
    <div className="space-y-6 p-5 md:p-8">
      {availabilityResult.error || closuresResult.error || blocksResult.error ? <DemoNotice title="Availability needs database setup." reason={availabilityResult.error || closuresResult.error || blocksResult.error || "Could not load availability."}>Apply <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">0009_appointment_blocks.sql</code> in Supabase before configuring slots.</DemoNotice> : null}
      <AvailabilityManager availability={availabilityResult.data} closures={closuresResult.data} weeklyBlocks={blocksResult.weekly} dateBlocks={blocksResult.dates} />
    </div>
  </AdminShell>;
}
