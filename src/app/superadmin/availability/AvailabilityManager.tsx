"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { AppointmentAvailability } from "@/lib/supabase/availability";
import {
  createAvailability,
  deleteAvailability,
  setAvailabilityActive,
  updateAvailabilityFromForm,
  type AvailabilityActionState,
} from "./actions";

const initialState: AvailabilityActionState = { error: null, success: null };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function AvailabilityManager({
  availability,
}: {
  availability: AppointmentAvailability[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(availability[0]?.availableDate ?? today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(createAvailability, initialState);
  const selectedRows = availability.filter((row) => row.availableDate === selectedDate);
  const configuredDates = new Set(availability.map((row) => row.availableDate));

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Choose a date</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Dates with a blue dot already have availability.</p>
        <input
          type="date"
          min={today}
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
        />
        <div className="mt-5 space-y-2">
          {Array.from(configuredDates).map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm ${selectedDate === date ? "bg-sky-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              <span>{formatDate(date)}</span>
              <span className={`h-2 w-2 rounded-full ${selectedDate === date ? "bg-white" : "bg-sky-700"}`} />
            </button>
          ))}
          {!configuredDates.size ? <p className="text-sm text-slate-500">No availability configured yet.</p> : null}
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{formatDate(selectedDate)}</h2>
              <p className="mt-1 text-sm text-slate-500">Add 30-minute appointment windows for this date.</p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">Superadmin only</span>
          </div>

          <form action={createAction} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <label className="text-sm font-medium text-slate-700">Date<input name="available_date" type="date" min={today} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Start time<input name="start_time" type="time" step="1800" required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">End time<input name="end_time" type="time" step="1800" required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
            <button type="submit" disabled={createPending} className="rounded-full bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-60">{createPending ? "Adding..." : "Add slot"}</button>
          </form>
          {createState.error ? <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{createState.error}</p> : null}
          {createState.success ? <p role="status" className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{createState.success}</p> : null}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 md:px-6"><h2 className="text-lg font-semibold text-slate-950">Configured time ranges</h2><p className="mt-1 text-sm text-slate-500">Inactive ranges stay saved but cannot be booked.</p></div>
          <div className="divide-y divide-slate-200">
            {selectedRows.map((row) => editingId === row.id ? <EditRow key={row.id} row={row} onCancel={() => setEditingId(null)} /> : <AvailabilityRow key={row.id} row={row} onEdit={() => setEditingId(row.id)} />)}
            {!selectedRows.length ? <p className="px-5 py-10 text-center text-sm text-slate-500">No availability for this date. Add a time range above.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function AvailabilityRow({ row, onEdit }: { row: AppointmentAvailability; onEdit: () => void }) {
  return <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
    <div><p className="font-semibold text-slate-950">{row.startTime} - {row.endTime}</p><p className="mt-1 text-sm text-slate-500">Generates 30-minute booking buttons</p></div>
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{row.isActive ? "Available" : "Disabled"}</span>
      <form action={setAvailabilityActive}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="is_active" value={String(!row.isActive)} /><button type="submit" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">{row.isActive ? "Disable" : "Enable"}</button></form>
      <button type="button" onClick={onEdit} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
      <form action={deleteAvailability} onSubmit={(event) => { if (!window.confirm("Delete this availability range?")) event.preventDefault(); }}><input type="hidden" name="id" value={row.id} /><button type="submit" className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Delete</button></form>
    </div>
  </div>;
}

function EditRow({ row, onCancel }: { row: AppointmentAvailability; onCancel: () => void }) {
  return <form action={updateAvailabilityFromForm} className="grid gap-3 bg-sky-50 px-5 py-5 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end md:px-6">
    <input type="hidden" name="id" value={row.id} />
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Date<input name="available_date" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={row.availableDate} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" /></label>
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Start<input name="start_time" type="time" step="1800" defaultValue={row.startTime} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" /></label>
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">End<input name="end_time" type="time" step="1800" defaultValue={row.endTime} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" /></label>
    <button type="submit" className="rounded-full bg-sky-800 px-4 py-2.5 text-xs font-semibold text-white">Save</button><button type="button" onClick={onCancel} className="rounded-full border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700">Cancel</button>
  </form>;
}
