import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import DemoNotice from "@/components/admin/DemoNotice";
import LeadTracker from "@/components/crm/LeadTracker";
import { resolveToday } from "@/lib/crm/analytics";
import { fetchLeads, isSheetConfigured } from "@/lib/crm/sheets";
import type { Lead } from "@/lib/crm/types";

export const metadata: Metadata = {
  title: "Lead Tracker",
};

// The sheet is the database, so this page is always request-time fresh.
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const today = resolveToday(process.env.CRM_TODAY);

  let leads: Lead[] | null = null;
  let notice: string | null = null;

  if (!isSheetConfigured()) {
    notice =
      "No sheet endpoint and secret are configured — neither saved on the Settings page nor " +
      "set as CRM_SHEET_ENDPOINT / CRM_SHEET_SECRET in .env.";
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
        {notice ? (
          <DemoNotice
            title="Showing sample data — the leads sheet is not connected."
            reason={notice}
          >
            Every view below works on the 46 seed leads. The stage controls still respond, but
            nothing is saved — these rows exist in no sheet. Connect one by following the header
            of{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              scripts/apps-script/Code.gs
            </code>
            , enter the endpoint and secret under Sheet connection on the Settings page, then run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              npm run crm:seed
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
    </>
  );
}
