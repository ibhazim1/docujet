"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import EmptyState from "@/components/admin/EmptyState";
import FilterBar from "./FilterBar";
import KpiRow from "./KpiRow";
import LeadBoard from "./LeadBoard";
import LeadCharts from "./LeadCharts";
import LeadDetail from "./LeadDetail";
import LeadTable from "./LeadTable";
import PipelineBar from "./PipelineBar";
import ViewToggle from "./ViewToggle";
import {
  filterLeads,
  findLead,
  sortLeads,
  sourceStats,
  summarise,
} from "@/lib/crm/analytics";
import type { StageActionResult } from "@/lib/crm/actions";
import { parseQuery } from "@/lib/crm/query";
import { SAMPLE_LEADS, SAMPLE_TODAY } from "@/lib/crm/sample-leads";
import type { Lead, ViewKey } from "@/lib/crm/types";

export type LeadTrackerProps = {
  className?: string;
  /** The lead book. Falls back to the seed rows when absent — the Studio canvas. */
  leads?: Lead[];
  /** Y-m-d, resolved on the server so client and server agree on "this week". */
  today?: string;
  /** Used when the URL carries no `view`. */
  defaultView?: ViewKey;
  showKpis?: boolean;
  showPipeline?: boolean;
  showFilters?: boolean;
  /**
   * Renders stage controls as badges instead of editors.
   *
   * Purely presentational, and always honoured — including in the Plasmic
   * canvas, so the two looks can be compared there. Whether an edit can
   * actually reach the sheet is a separate question; see `isSample` below.
   */
  readOnly?: boolean;
};

/**
 * The lead tracker.
 *
 * A port of `crm/index.php` — three views over one filtered list, with every
 * filter, the sort, the active view and the selected lead carried in the query
 * string, so any screen is a shareable URL and the back button behaves.
 *
 * Filtering and aggregation run here in the browser over the whole book. At
 * this size that is instant and lets a filter change land without a server
 * round-trip; the server's only job is to hand over the rows.
 */
export default function LeadTracker({
  className = "",
  leads,
  today = SAMPLE_TODAY,
  defaultView = "table",
  showKpis = true,
  showPipeline = true,
  showFilters = true,
  readOnly = false,
}: LeadTrackerProps) {
  const searchParams = useSearchParams();
  const [flash, setFlash] = useState<StageActionResult | null>(null);

  // No `leads` prop means nobody read the sheet — the Plasmic Studio canvas,
  // or a bare render — so these rows are the bundled samples.
  //
  // This gates the *write*, not the *look*. `readOnly` still decides whether a
  // badge or a control renders, so a designer can preview either in Studio;
  // `isSample` stops the control from calling a Server Action against rows
  // that aren't in the sheet, which would either write to the wrong place or,
  // with no endpoint in scope, throw on click.
  const isSample = leads === undefined;
  const allLeads = leads ?? SAMPLE_LEADS;

  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const query = useMemo(() => parseQuery(params), [params]);
  const view = params.get("view") ? query.view : defaultView;

  const visible = useMemo(
    () => sortLeads(filterLeads(allLeads, query.filters), query.sort, query.dir),
    [allLeads, query.filters, query.sort, query.dir],
  );
  const stats = useMemo(() => summarise(visible, today), [visible, today]);
  const sources = useMemo(() => sourceStats(visible), [visible]);
  const selected = findLead(allLeads, query.leadId);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewToggle view={view} params={params} />
        <p className="text-sm text-slate-500">
          Showing {visible.length} of {allLeads.length} leads
        </p>
      </div>

      {flash ? (
        <p
          role={flash.ok ? "status" : "alert"}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            flash.ok
              ? "border-sky-200 bg-sky-50 text-sky-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {flash.message}
        </p>
      ) : null}

      {showKpis ? <KpiRow stats={stats} filters={query.filters} params={params} /> : null}
      {showPipeline ? (
        <PipelineBar stats={stats} filters={query.filters} params={params} />
      ) : null}
      {showFilters ? <FilterBar filters={query.filters} params={params} /> : null}

      {visible.length === 0 ? (
        <EmptyState
          title="No leads match these filters"
          description="Clear a filter or widen the search to bring rows back."
        />
      ) : view === "table" ? (
        <LeadTable
          leads={visible}
          selectedId={query.leadId}
          sort={query.sort}
          dir={query.dir}
          params={params}
          readOnly={readOnly}
          isSample={isSample}
          onResult={setFlash}
        />
      ) : view === "board" ? (
        <LeadBoard
          leads={visible}
          byStage={stats.byStage}
          params={params}
          readOnly={readOnly}
          isSample={isSample}
          onResult={setFlash}
        />
      ) : (
        <LeadCharts
          leads={visible}
          sources={sources}
          activeSource={query.filters.source}
          params={params}
        />
      )}

      {selected ? (
        <LeadDetail
          lead={selected}
          today={today}
          params={params}
          readOnly={readOnly}
          isSample={isSample}
          onResult={setFlash}
        />
      ) : null}
    </div>
  );
}
