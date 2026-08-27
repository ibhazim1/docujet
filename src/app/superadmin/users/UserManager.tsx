"use client";

import { useActionState } from "react";
import type { SuperadminUser } from "@/lib/superadmin";
import { createStaffUser, toggleStaffUserFromForm, type SuperadminActionState } from "../actions";

const initialState: SuperadminActionState = { error: null, success: null };

export default function UserManager({ users }: { users: SuperadminUser[] }) {
  const [state, formAction, pending] = useActionState(createStaffUser, initialState);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Create staff account</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Create a confirmed Supabase Auth account and assign its administrative role.</p>
        {state.error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p> : null}
        {state.success ? <p role="status" className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.success}</p> : null}
        <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Full name<input name="full_name" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">Temporary password<input name="password" type="password" minLength={8} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">Role<select name="role" defaultValue="admin" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-normal"><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select></label>
          <button type="submit" disabled={pending} className="rounded-full bg-sky-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:cursor-wait disabled:opacity-60 md:col-span-2 md:justify-self-start">{pending ? "Creating account…" : "Create staff account"}</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-950">Staff accounts</h2><p className="mt-1 text-sm text-slate-500">Deactivate accounts when access should be removed without deleting their history.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr>{["Staff", "Role", "Status", "Last sign-in", "Action"].map((heading) => <th key={heading} className="px-6 py-4 font-medium">{heading}</th>)}</tr></thead>
            <tbody>
              {users.map((user) => <tr key={user.id} className="border-t border-slate-200">
                <td className="px-6 py-4"><p className="font-medium text-slate-950">{user.fullName}</p><p className="mt-1 text-slate-500">{user.email}</p></td>
                <td className="px-6 py-4 capitalize text-slate-600">{user.role}</td>
                <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
                <td className="px-6 py-4 text-slate-600">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "Never"}</td>
                <td className="px-6 py-4">{user.role !== "unassigned" ? <form action={toggleStaffUserFromForm}><input type="hidden" name="user_id" value={user.id} /><input type="hidden" name="next_active" value={String(!user.isActive)} /><button type="submit" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{user.isActive ? "Deactivate" : "Activate"}</button></form> : <span className="text-xs text-slate-400">Assign a role first</span>}</td>
              </tr>)}
              {!users.length ? <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">No staff accounts found. Create one above.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
