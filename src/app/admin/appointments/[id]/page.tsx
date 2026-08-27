import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminShell from "@/components/admin/AdminShell";
import EmptyState from "@/components/admin/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import AppointmentStatusActions from "@/components/pages/admin/AppointmentStatusActions";
import { formatAppointmentId, getAdminAppointment } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Appointment Details" };
export const dynamic = "force-dynamic";

export default async function AdminAppointmentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: appointment, error } = await getAdminAppointment(decodeURIComponent(id));

  if (!appointment && !error) notFound();

  return (
    <AdminShell>
      <AdminHeader
        title="Appointment Details"
        description="Complete information for this appointment request."
      />
      <div className="space-y-6 p-5 md:p-8">
        <Link href="/admin/appointments" className="inline-flex text-sm font-semibold text-sky-800 hover:text-sky-950">
          ← Back to appointments
        </Link>

        {error ? (
          <EmptyState title="Could not load appointment" description={error} />
        ) : appointment ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Appointment ID</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{formatAppointmentId(appointment.id)}</h2>
                </div>
                <StatusBadge status={appointment.status} />
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <Detail label="Appointment Type" value={appointment.appointmentType} />
                <Detail label="Preferred Date" value={appointment.preferredDate} />
                <Detail label="Preferred Time" value={appointment.preferredTime} />
                <Detail label="Product of Interest" value={appointment.product} />
                <Detail label="Submitted" value={new Date(appointment.createdAt).toLocaleString()} />
              </div>
            </section>

            {appointment.status === "Confirmed" ? (
              <AppointmentStatusActions appointmentId={appointment.id} />
            ) : null}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Customer Details</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Detail label="Full Name" value={appointment.customer} />
                <Detail label="Company" value={appointment.company} />
                <Detail label="Email" value={appointment.email} />
                <Detail label="Phone" value={appointment.phone} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Additional Notes</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {appointment.additionalNotes || "No additional notes were provided."}
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}
