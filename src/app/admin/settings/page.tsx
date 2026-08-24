import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";
import DemoNotice from "@/components/admin/DemoNotice";
import SettingsForm from "@/components/admin/SettingsForm";
import StatusBadge from "@/components/admin/StatusBadge";
import { integrationStatuses } from "@/lib/admin-mock-data";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { toSafeSettingsView } from "@/lib/settings/mask";
import { getSettings, isSettingsConfigured } from "@/lib/settings/store";

export const metadata: Metadata = {
  title: "Settings",
};

// Settings can change between requests (another admin session, a direct edit
// in the Supabase table editor), so this page is always request-time fresh —
// same reasoning as admin/leads/page.tsx.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  let notice: string | null = null;

  if (!isSettingsConfigured()) {
    notice =
      "No Supabase project is configured — SUPABASE_URL and SUPABASE_SECRET_KEY are not set " +
      "in .env.";
  }

  // getSettings() already falls back to DEFAULT_SETTINGS with no network call
  // when unconfigured, so a throw here only happens when Supabase IS configured
  // but unreachable — fall back to defaults so the form still renders rather
  // than the whole page failing.
  let settings = DEFAULT_SETTINGS;
  try {
    settings = await getSettings();
  } catch (cause) {
    notice = cause instanceof Error ? cause.message : "Could not read settings.";
  }

  const safeSettings = toSafeSettingsView(settings);

  // The rest of the sidebar is fixed copy, but the database is the one thing
  // this page can actually answer for, so it answers.
  const integrations = integrationStatuses.map((integration) =>
    integration.name === "Supabase"
      ? { ...integration, status: notice === null ? ("Connected" as const) : integration.status }
      : integration,
  );

  return (
    <>
      <AdminHeader
        title="Settings"
        description="Business details, chat assistant configuration, and integrations."
      />

      <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {notice ? (
            <DemoNotice
              title="Showing default values — the database is not connected."
              reason={notice}
            >
              Nothing you edit here will be saved until Supabase is set up. Apply{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
                supabase/migrations/0001_crm_leads_and_settings.sql
              </code>{" "}
              in the SQL Editor, then set{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">SUPABASE_URL</code>{" "}
              and{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
                SUPABASE_SECRET_KEY
              </code>{" "}
              in{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">.env</code> — see{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">.env.example</code>
              . Settings shares the database with Leads; it just uses its own{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">app_settings</code>{" "}
              table.
            </DemoNotice>
          ) : null}

          <SettingsForm initialSettings={safeSettings} />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Connection status</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            A read-only summary of what&apos;s wired up. Edit the values in Integrations.
          </p>
          <div className="mt-5 space-y-4">
            {integrations.map((integration) => (
              <article
                key={integration.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">{integration.name}</h3>
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

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-start-2">
          <h2 className="text-xl font-semibold text-slate-950">Notification Preferences</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            No notification-sending system exists in this app yet (no email or webhook delivery
            is wired up anywhere), so these are not yet connected to anything real.
          </p>
          <div className="mt-5 space-y-4">
            {["Appointment alerts", "Lead alerts", "Email notifications"].map((label) => (
              <label
                key={label}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-800">{label}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  disabled
                  className="h-4 w-4 rounded border-slate-300"
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
