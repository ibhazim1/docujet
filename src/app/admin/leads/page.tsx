import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import DemoNotice from "@/components/admin/DemoNotice";
import LeadTracker from "@/components/crm/LeadTracker";
import { resolveToday } from "@/lib/crm/analytics";
import { fetchLeads, isSupabaseConfigured } from "@/lib/crm/leads";
import type { Lead } from "@/lib/crm/types";

export const metadata: Metadata = {
  title: "Lead Tracker",
};

// Leads change from under this page — another admin session, a direct edit in
// the Supabase table editor — so it is always request-time fresh.
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const today = resolveToday(process.env.CRM_TODAY);

  let leads: Lead[] | null = null;
  let notice: string | null = null;

  if (!isSupabaseConfigured()) {
    notice =
      "No Supabase project is configured — SUPABASE_URL and SUPABASE_SECRET_KEY are not set " +
      "in .env.";
  } else {
    try {
      leads = await fetchLeads();
    } catch (cause) {
      notice = cause instanceof Error ? cause.message : "Could not read the leads table.";
    }
  }

  return (
    <AdminShell>
      <AdminHeader
        title="Lead Tracker"
        description="Which channels produce leads, and which of those leads are worth anything."
      />

      <div className="space-y-6 p-5 md:p-8">
        {notice ? (
          <DemoNotice
            title="Showing sample data — the database is not connected."
            reason={notice}
          >
            Every view below works on the 46 seed leads. The stage controls still respond, but
            nothing is saved — these rows exist in no database. Apply{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              supabase/migrations/0001_crm_leads_and_settings.sql
            </code>{" "}
            in the Supabase SQL Editor, set{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">SUPABASE_URL</code>{" "}
            and{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              SUPABASE_SECRET_KEY
            </code>{" "}
            in{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">.env</code>, then
            run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              npm run db:seed
            </code>
            .
          </DemoNotice>
        ) : null}

        {/* LeadTracker reads the query string with useSearchParams, which needs
            a Suspense boundary above it. Omitting `leads` puts it in sample
            mode, which is exactly what the notice above describes. */}
        <Suspense fallback={<p className="text-sm text-slate-500">Loading leads…</p>}>
          {leads ? (
            <LeadTracker leads={leads} today={today} />
          ) : (
            <LeadTracker today={today} />
          )}
        </Suspense>
      </div>
    </AdminShell>
  );
}
