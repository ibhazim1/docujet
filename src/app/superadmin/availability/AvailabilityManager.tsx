"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { BookingClosure, DateBlock, WeeklyAvailability, WeeklyBlock } from "@/lib/supabase/availability";
import { createAvailability, createClosure, createDateBlock, createWeeklyBlock, deleteAvailability, deleteClosure, deleteDateBlock, deleteWeeklyBlock, setAvailabilityActive, updateAvailabilityFromForm, type AvailabilityActionState } from "./actions";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const initialState: AvailabilityActionState = { error: null, success: null };
const today = new Date().toISOString().slice(0, 10);

export default function AvailabilityManager({ availability, closures, weeklyBlocks, dateBlocks }: { availability: WeeklyAvailability[]; closures: BookingClosure[]; weeklyBlocks: WeeklyBlock[]; dateBlocks: DateBlock[] }) {
  const [state, action, pending] = useActionState(createAvailability, initialState);
  const [editingId, setEditingId] = useState<string | null>(null);
  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-semibold text-slate-950">Weekly availability</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">These time ranges repeat every week. A closure can override a single date.</p>
      <form action={action} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <label className="text-sm font-medium text-slate-700">Day<select name="day_of_week" defaultValue="1" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Start time<input name="start_time" type="time" step="1800" required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-medium text-slate-700">End time<input name="end_time" type="time" step="1800" required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <button type="submit" disabled={pending} className="rounded-full bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-60">{pending ? "Adding..." : "Add time range"}</button>
      </form>
      {state.error ? <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.error}</p> : null}
      {state.success ? <p role="status" className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.success}</p> : null}
      <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200">
        {availability.map((row) => editingId === row.id ? <form key={row.id} action={updateAvailabilityFromForm} className="grid gap-3 bg-sky-50 px-4 py-4 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end"><input type="hidden" name="id" value={row.id} /><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Day<select name="day_of_week" defaultValue={row.dayOfWeek} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Start<input name="start_time" type="time" step="1800" defaultValue={row.startTime} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">End<input name="end_time" type="time" step="1800" defaultValue={row.endTime} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" /></label><button type="submit" className="rounded-full bg-sky-800 px-4 py-2.5 text-xs font-semibold text-white">Save</button><button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-slate-300 px-4 py-2.5 text-xs font-semibold">Cancel</button></form> : <div key={row.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-950">{days[row.dayOfWeek]}: {row.startTime} - {row.endTime}</p><p className="mt-1 text-sm text-slate-500">{row.isActive ? "Active for every week" : "Disabled"}</p></div><div className="flex flex-wrap gap-2"><form action={setAvailabilityActive}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="is_active" value={String(!row.isActive)} /><button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold">{row.isActive ? "Disable" : "Enable"}</button></form><button type="button" onClick={() => setEditingId(row.id)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold">Edit</button><form action={deleteAvailability} onSubmit={(event) => { if (!window.confirm("Delete this weekly time range?")) event.preventDefault(); }}><input type="hidden" name="id" value={row.id} /><button className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Delete</button></form></div></div>)}
        {!availability.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">No weekly availability configured.</p> : null}
      </div>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-semibold text-slate-950">Recurring breaks</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">Block a time range every week, such as a daily lunch break.</p>
      <form action={createWeeklyBlock} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
        <label className="text-sm font-medium text-slate-700">Day<select name="day_of_week" defaultValue="1" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Start<input name="start_time" type="time" step="1800" required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-medium text-slate-700">End<input name="end_time" type="time" step="1800" required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-medium text-slate-700">Label<input name="label" defaultValue="Lunch break" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <button type="submit" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Add break</button>
      </form>
      <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">{weeklyBlocks.map((block) => <div key={block.id} className="flex items-center justify-between gap-3 px-4 py-4"><p className="text-sm font-semibold text-slate-950">{days[block.dayOfWeek]}: {block.startTime} - {block.endTime} <span className="font-normal text-slate-500">({block.label})</span></p><form action={deleteWeeklyBlock} onSubmit={(event) => { if (!window.confirm("Delete this recurring break?")) event.preventDefault(); }}><input type="hidden" name="id" value={block.id} /><button className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Delete</button></form></div>)}{!weeklyBlocks.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">No recurring breaks configured.</p> : null}</div>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-semibold text-slate-950">Close booking for a date</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">Use this for holidays, company events, or other one-off closures.</p>
      <form action={createClosure} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
        <label className="text-sm font-medium text-slate-700">Closed date<input name="closed_date" type="date" min={today} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-medium text-slate-700">Reason (optional)<input name="reason" placeholder="Public holiday" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <button type="submit" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Close booking</button>
      </form>
      <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200">
        {closures.map((closure) => <div key={closure.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-950">{new Intl.DateTimeFormat("en-MY", { dateStyle: "long" }).format(new Date(`${closure.closedDate}T00:00:00`))}</p><p className="mt-1 text-sm text-slate-500">{closure.reason || "Booking closed"}</p></div><form action={deleteClosure} onSubmit={(event) => { if (!window.confirm("Reopen booking for this date?")) event.preventDefault(); }}><input type="hidden" name="id" value={closure.id} /><button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold">Reopen date</button></form></div>)}
        {!closures.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">No closed dates configured.</p> : null}
      </div>
      <h3 className="mt-8 text-lg font-semibold text-slate-950">Block one specific slot</h3>
      <p className="mt-1 text-sm text-slate-500">This removes one 30-minute slot without changing the weekly schedule.</p>
      <form action={createDateBlock} className="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
        <label className="text-sm font-medium text-slate-700">Date<input name="blocked_date" type="date" min={today} required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-medium text-slate-700">Time<input name="blocked_time" type="time" step="1800" required className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-medium text-slate-700">Reason (optional)<input name="label" placeholder="Staff meeting" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
        <button type="submit" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Block slot</button>
      </form>
      <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">{dateBlocks.map((block) => <div key={block.id} className="flex items-center justify-between gap-3 px-4 py-4"><p className="text-sm font-semibold text-slate-950">{block.blockedDate} at {block.blockedTime} <span className="font-normal text-slate-500">({block.label})</span></p><form action={deleteDateBlock} onSubmit={(event) => { if (!window.confirm("Unblock this appointment slot?")) event.preventDefault(); }}><input type="hidden" name="id" value={block.id} /><button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold">Unblock</button></form></div>)}{!dateBlocks.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">No specific slots blocked.</p> : null}</div>
    </section>
  </div>;
}
