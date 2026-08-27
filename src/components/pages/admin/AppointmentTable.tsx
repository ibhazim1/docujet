"use client";

import { useRouter } from "next/navigation";
import { formatAppointmentId, type AdminAppointment } from "@/lib/supabase/admin";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";

export default function AppointmentTable({ appointments }: { appointments: AdminAppointment[] }) {
  const router = useRouter();

  function openAppointment(id: string) {
    router.push(`/admin/appointments/${encodeURIComponent(id)}`);
  }

  return (
    <AdminTable>
      <table className="w-full min-w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[20%]" />
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
        </colgroup>
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {["ID", "Customer", "Appointment Type", "Date", "Time", "Status"].map((heading) => (
              <th key={heading} className="px-5 py-4 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr
              key={appointment.id}
              tabIndex={0}
              role="link"
              onClick={() => openAppointment(appointment.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openAppointment(appointment.id);
                }
              }}
              className="cursor-pointer border-t border-slate-200 transition hover:bg-sky-50 focus:bg-sky-50 focus:outline-none"
            >
              <td className="break-all px-3 py-4 font-medium text-slate-950 md:px-5">{formatAppointmentId(appointment.id)}</td>
              <td className="break-words px-3 py-4 text-slate-700 md:px-5">{appointment.customer}</td>
              <td className="break-words px-3 py-4 text-slate-600 md:px-5">{appointment.appointmentType}</td>
              <td className="break-words px-3 py-4 text-slate-600 md:px-5">{appointment.preferredDate}</td>
              <td className="break-words px-3 py-4 text-slate-600 md:px-5">{appointment.preferredTime}</td>
              <td className="px-3 py-4 md:px-5"><StatusBadge status={appointment.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTable>
  );
}
