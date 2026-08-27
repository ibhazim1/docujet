import { updateAppointmentStatusFromForm } from "@/app/admin/appointments/actions";

export default function AppointmentStatusActions({ appointmentId }: { appointmentId: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Update Status</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This appointment is confirmed. Mark it completed after the meeting or cancel it if it will not proceed.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <form action={updateAppointmentStatusFromForm}>
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <input type="hidden" name="status" value="Completed" />
          <button type="submit" className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">Mark Completed</button>
        </form>
        <form action={updateAppointmentStatusFromForm}>
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <input type="hidden" name="status" value="Cancelled" />
          <button type="submit" className="rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">Cancel Appointment</button>
        </form>
      </div>
    </section>
  );
}
