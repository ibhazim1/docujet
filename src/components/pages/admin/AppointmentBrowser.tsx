"use client";

import { useMemo, useState } from "react";
import { formatAppointmentId, type AdminAppointment } from "@/lib/supabase/admin";
import AppointmentTable from "./AppointmentTable";

const appointmentStatuses = ["All Statuses", "Pending", "Confirmed", "Completed", "Cancelled"];
const appointmentTypes = [
  "All Types",
  "Product Consultation",
  "Product Demonstration",
  "Pricing Discussion",
  "Technical Consultation",
  "After-Sales Support",
];

export default function AppointmentBrowser({ appointments }: { appointments: AdminAppointment[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [appointmentType, setAppointmentType] = useState("All Types");
  const [date, setDate] = useState("");

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchesSearch = !query || [
        appointment.id,
        formatAppointmentId(appointment.id),
        appointment.customer,
        appointment.appointmentType,
        appointment.preferredDate,
        appointment.preferredTime,
      ].some((field) => field.toLowerCase().includes(query));
      const matchesStatus = status === "All Statuses" || appointment.status === status;
      const matchesType = appointmentType === "All Types" || appointment.appointmentType === appointmentType;
      const matchesDate = !date || appointment.preferredDate === date;

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [appointments, appointmentType, date, search, status]);

  function clearFilters() {
    setSearch("");
    setStatus("All Statuses");
    setAppointmentType("All Types");
    setDate("");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Search appointments" htmlFor="appointment-search">
            <input id="appointment-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID or customer" className={inputClassName} />
          </Field>
          <SelectField label="Status" value={status} options={appointmentStatuses} onChange={setStatus} />
          <SelectField label="Appointment Type" value={appointmentType} options={appointmentTypes} onChange={setAppointmentType} />
          <Field label="Preferred Date" htmlFor="appointments-date">
            <input id="appointments-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClassName} />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-500">
          <span>Showing {filteredAppointments.length} of {appointments.length} appointments</span>
          <button type="button" onClick={clearFilters} className="font-semibold text-sky-800 hover:text-sky-950">Clear filters</button>
        </div>
      </section>

      {filteredAppointments.length ? <AppointmentTable appointments={filteredAppointments} /> : <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><h3 className="text-lg font-semibold text-slate-950">No matching appointments</h3><p className="mt-2 text-sm text-slate-600">Try changing the search or clearing one of the filters.</p></div>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const id = `appointment-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <Field label={label} htmlFor={id}><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName}>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

const inputClassName = "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
