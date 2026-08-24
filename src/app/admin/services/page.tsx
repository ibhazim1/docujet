import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTable from "@/components/admin/AdminTable";
import SearchInput from "@/components/admin/SearchInput";
import StatusBadge from "@/components/admin/StatusBadge";
import { adminServices } from "@/lib/admin-mock-data";

export const metadata: Metadata = {
  title: "Services",
};

export default function AdminServicesPage() {
  return (
    <AdminShell>
      <AdminHeader
        title="Services"
        description="Manage service listings and status labels in a frontend-only admin view."
      />

      <div className="space-y-6 p-5 md:p-8">
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="w-full max-w-md">
            <SearchInput placeholder="Search service name or description" />
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-sky-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
          >
            Add Service
          </button>
        </section>

        <AdminTable>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Service Name", "Description", "Status", "Last Updated", "Actions"].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {adminServices.map((service) => (
                <tr key={service.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-950">
                    {service.serviceName}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{service.description}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={service.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-600">{service.lastUpdated}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {["Edit", "Disable"].map((action) => (
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
