import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { integrationStatuses } from "@/lib/admin-mock-data";

export const metadata: Metadata = {
  title: "Settings",
};

export default function AdminSettingsPage() {
  return (
    <>
      <AdminHeader
        title="Settings"
        description="Business details, notification preferences, and planned integrations."
      />

      <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Business Information
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Company Name">
                <input defaultValue="DocuJet" className={inputClassName} />
              </Field>
              <Field label="Email">
                <input defaultValue="Email placeholder" className={inputClassName} />
              </Field>
              <Field label="Phone">
                <input defaultValue="Phone placeholder" className={inputClassName} />
              </Field>
              <Field label="Business Hours">
                <input defaultValue="Business hours placeholder" className={inputClassName} />
              </Field>
              <Field label="Address">
                <textarea
                  rows={4}
                  defaultValue="Address placeholder"
                  className={`${inputClassName} md:col-span-2`}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Notification Preferences
            </h2>
            <div className="mt-5 space-y-4">
              {[
                "Appointment alerts",
                "Lead alerts",
                "Email notifications",
              ].map((label) => (
                <label
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-800">{label}</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                </label>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Integrations</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            These statuses are frontend indicators only. No live connections are
            configured from this interface yet.
          </p>
          <div className="mt-5 space-y-4">
            {integrationStatuses.map((integration) => (
              <article
                key={integration.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {integration.name}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {integration.description}
                    </p>
                  </div>
                  <StatusBadge status={integration.status} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
