import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTable from "@/components/admin/AdminTable";
import SearchInput from "@/components/admin/SearchInput";
import StatusBadge from "@/components/admin/StatusBadge";
import { leads } from "@/lib/admin-mock-data";

export const metadata: Metadata = {
  title: "Leads",
};

export default function AdminLeadsPage() {
  return (
    <AdminShell>
      <AdminHeader
        title="Leads"
        description="Track mock lead entries, statuses, and next-step actions for the admin UI."
      />

      <div className="space-y-6 p-5 md:p-8">
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_240px]">
          <SearchInput placeholder="Search lead name, company, or email" />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select className={inputClassName} defaultValue="All Statuses">
              {["All Statuses", "New", "Contacted", "Qualified", "Proposal", "Won", "Lost"].map(
                (option) => (
                  <option key={option}>{option}</option>
                ),
              )}
            </select>
          </label>
        </section>

        <AdminTable>
          <table className="min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Name",
                  "Company",
                  "Email",
                  "Phone",
                  "Product Interest",
                  "Source",
                  "Status",
                  "Created Date",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-950">{lead.name}</td>
                  <td className="px-5 py-4 text-slate-600">{lead.company}</td>
                  <td className="px-5 py-4 text-slate-600">{lead.email}</td>
                  <td className="px-5 py-4 text-slate-600">{lead.phone}</td>
                  <td className="px-5 py-4 text-slate-600">{lead.productInterest}</td>
                  <td className="px-5 py-4 text-slate-600">{lead.source}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-600">{lead.createdDate}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {["View", "Update"].map((action) => (
                        <button
                          key={action}
                          type="button"
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      </div>
    </AdminShell>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
