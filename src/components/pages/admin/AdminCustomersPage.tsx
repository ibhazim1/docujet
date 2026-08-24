import EmptyState from "@/components/admin/EmptyState";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTable from "@/components/admin/AdminTable";
import SearchInput from "@/components/admin/SearchInput";
import StatusBadge from "@/components/admin/StatusBadge";
import { getAdminCustomers } from "@/lib/supabase/admin";

type AdminCustomersPageProps = {
  className?: string;
};

export default async function AdminCustomersPage({
  className,
}: AdminCustomersPageProps) {
  const { data: customers, error } = await getAdminCustomers();

  return (
    <div className={className ?? ""}>
      <AdminHeader
        title="Customers"
        description="Customer directory synced from Supabase."
      />

      <div className="space-y-6 p-5 md:p-8">
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_240px]">
          <SearchInput placeholder="Search customer, company, or email" />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select className={inputClassName} defaultValue="All Statuses">
              {["All Statuses", "Active", "Prospect", "Needs Follow-up"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </section>

        {error ? (
          <EmptyState title="Could not load customers" description={error} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Customer records will appear here after bookings are created in Supabase."
          />
        ) : (
          <AdminTable>
            <table className="min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    "Customer",
                    "Company",
                    "Email",
                    "Phone",
                    "Appointments",
                    "Last Contact",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-200">
                    <td className="px-5 py-4 font-medium text-slate-950">{customer.customer}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.company}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.email}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.phone}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.appointments}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.lastContact}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTable>
        )}
      </div>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
