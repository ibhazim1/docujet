import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import DemoNotice from "@/components/admin/DemoNotice";
import LeadTracker from "@/components/crm/LeadTracker";
import { resolveToday } from "@/lib/crm/analytics";
import { fetchLeads, isSupabaseConfigured } from "@/lib/crm/leads";
import type { Lead } from "@/lib/crm/types";

type AdminLeadsPageProps = {
  className?: string;
};

/**
 * The lead tracker page as coded.
 *
 * This is the fallback the app renders until someone builds `/admin/leads` in
 * Plasmic; after that, Studio's version takes over and this stops being used.
 * The two are not the same page: here the rows are read on the server and
 * handed down, whereas a Studio-built page renders the tracker on the client
 * and it reads them itself through `/api/crm/leads`.
 */
export default async function AdminLeadsPage({ className }: AdminLeadsPageProps) {
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
    <div className={className ?? ""}>
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

        {/* The tracker reads the query string with useSearchParams, which needs
            a Suspense boundary above it. Omitting `leads` puts it in sample
            mode, which is exactly what the notice above describes — and
            `autoLoad` is off because this page has already done the reading. */}
        <Suspense fallback={<p className="text-sm text-slate-500">Loading leads…</p>}>
          {leads ? (
            <LeadTracker leads={leads} today={today} autoLoad={false} />
          ) : (
            <LeadTracker today={today} autoLoad={false} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
