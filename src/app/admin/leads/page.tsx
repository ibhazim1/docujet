import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import LeadTracker from "@/components/crm/LeadTracker";
import { resolveToday } from "@/lib/crm/analytics";
import { fetchLeads, isSheetConfigured } from "@/lib/crm/sheets";
import type { Lead } from "@/lib/crm/types";

export const metadata: Metadata = {
  title: "Lead Tracker",
};

// The sheet is the database, so this page is always request-time fresh.
export const dynamic = "force-dynamic";

/**
 * Explains why the rows on screen are not the sheet's.
 *
 * The tracker still renders underneath, on the bundled seed leads, so the
 * whole UI is testable before any Google setup. Editing is inert in that mode
 * — `LeadTracker` blocks the write when it is handed no leads — so nothing
 * here can be mistaken for a change that was saved.
 */
function DemoNotice({ reason }: { reason: string }) {
  return (
    <div
      role="status"
      className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900"
    >
      <p className="font-semibold">Showing sample data — the leads sheet is not connected.</p>
      <p className="mt-2 leading-6">{reason}</p>
      <p className="mt-2 leading-6">
        Every view below works on the 46 seed leads. The stage controls still respond, but
        nothing is saved — these rows exist in no sheet. Connect one by following the header of{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
          scripts/apps-script/Code.gs
        </code>
        , then run{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">npm run crm:seed</code>.
      </p>
    </div>
  );
}

export default async function AdminLeadsPage() {
  const today = resolveToday(process.env.CRM_TODAY);

  let leads: Lead[] | null = null;
  let notice: string | null = null;

  if (!isSheetConfigured()) {
    notice = "CRM_SHEET_ENDPOINT and CRM_SHEET_SECRET are not set in .env.";
  } else {
    try {
      leads = await fetchLeads();
    } catch (cause) {
      notice = cause instanceof Error ? cause.message : "Could not read the leads sheet.";
    }
  }

  return (
    <>
      <AdminHeader
        title="Lead Tracker"
        description="Which channels produce leads, and which of those leads are worth anything."
      />

      <div className="space-y-6 p-5 md:p-8">
        {notice ? <DemoNotice reason={notice} /> : null}

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
    </>
  );
}
