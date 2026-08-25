"use client";

import { DataProvider } from "@plasmicapp/loader-nextjs";
import type { ReactNode } from "react";
import FilterBar from "./FilterBar";
import FlashMessage from "./FlashMessage";
import KpiCard from "./KpiCard";
import KpiRow from "./KpiRow";
import LeadBoard from "./LeadBoard";
import LeadCharts from "./LeadCharts";
import LeadCountLabel from "./LeadCountLabel";
import LeadDetail from "./LeadDetail";
import LeadEmptyState from "./LeadEmptyState";
import LeadTable from "./LeadTable";
import PipelineBar from "./PipelineBar";
import StageTile from "./StageTile";
import ViewSwitch from "./ViewSwitch";
import ViewToggle from "./ViewToggle";
import ActiveLostDonut from "./charts/ActiveLostDonut";
import FunnelChart from "./charts/FunnelChart";
import MonthlyChart from "./charts/MonthlyChart";
import SocialSplitMeter from "./charts/SocialSplitMeter";
import SourceQualityChart from "./charts/SourceQualityChart";
import SourceShareDonut from "./charts/SourceShareDonut";
import SourceStageMatrix from "./charts/SourceStageMatrix";
import SourceVolumeChart from "./charts/SourceVolumeChart";
import StageShareDonut from "./charts/StageShareDonut";
import ApplyButton from "./filters/ApplyButton";
import ClearFilters from "./filters/ClearFilters";
import FilterSelect from "./filters/FilterSelect";
import SearchInput from "./filters/SearchInput";
import { LeadTrackerProvider, useLeadTracker } from "./TrackerContext";
import { STAGE_KEYS } from "@/lib/crm/taxonomy";
import type { Lead, ViewKey } from "@/lib/crm/types";

export type LeadTrackerProps = {
  className?: string;
  /** The lead book. Falls back to the seed rows when absent — the Studio canvas. */
  leads?: Lead[];
  /**
   * Y-m-d, resolved on the server so client and server agree on "this week".
   * Empty means whatever the loaded book came with.
   */
  today?: string;
  /**
   * With no `leads` prop, read the book from `/api/crm/leads` in the browser —
   * how a Plasmic-authored page gets real rows instead of the seed ones.
   */
  autoLoad?: boolean;
  /** Used when the URL carries no `view`. */
  defaultView?: ViewKey;
  /** Renders stage and source as badges instead of editors. Presentational only. */
  readOnly?: boolean;
  showKpis?: boolean;
  showPipeline?: boolean;
  showFilters?: boolean;
  /**
   * The tracker's contents.
   *
   * Empty means the standard dashboard below. In Plasmic this slot is filled
   * with that same tree as real, editable elements, so a designer rearranges
   * or deletes the parts instead of toggling props.
   */
  children?: ReactNode;
};

/** The dashboard as shipped — the layout the app renders when nothing overrides it. */
function StandardLayout({
  showKpis,
  showPipeline,
  showFilters,
}: {
  showKpis: boolean;
  showPipeline: boolean;
  showFilters: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewToggle />
        <LeadCountLabel />
      </div>

      <FlashMessage />

      {showKpis ? (
        <KpiRow>
          <KpiCard metric="total" />
          <KpiCard metric="topSource" />
          <KpiCard metric="social" />
          <KpiCard metric="qualified" />
          <KpiCard metric="customers" />
          <KpiCard metric="lost" />
        </KpiRow>
      ) : null}

      {showPipeline ? (
        <PipelineBar>
          {STAGE_KEYS.map((key) => (
            <StageTile key={key} stage={key} />
          ))}
        </PipelineBar>
      ) : null}

      {showFilters ? (
        <FilterBar>
          <SearchInput />
          <FilterSelect filter="source" />
          <FilterSelect filter="stage" />
          <FilterSelect filter="group" />
          <ApplyButton />
          <ClearFilters />
        </FilterBar>
      ) : null}

      <ViewSwitch
        emptyView={<LeadEmptyState />}
        tableView={<LeadTable />}
        boardView={<LeadBoard />}
        chartsView={
          <LeadCharts>
            <SourceVolumeChart />
            <SourceQualityChart />
            <FunnelChart />
            <MonthlyChart />
            <SourceStageMatrix />
            <SocialSplitMeter />
            <SourceShareDonut />
            <ActiveLostDonut />
            <StageShareDonut />
          </LeadCharts>
        }
      />

      <LeadDetail />
    </>
  );
}

/**
 * Publishes the tracker's numbers to Plasmic's data picker, so a designer can
 * bind any text on the page to `$ctx.leadTracker.…` without writing code.
 */
function PublishTrackerData({ children }: { children: ReactNode }) {
  const { visible, allLeads, stats, sources, query, view, today, selected, filtered } =
    useLeadTracker();

  return (
    <DataProvider
      name="leadTracker"
      data={{
        leads: visible,
        allLeads,
        count: visible.length,
        total: allLeads.length,
        stats,
        sources,
        filters: query.filters,
        filtered,
        sort: query.sort,
        dir: query.dir,
        view,
        today,
        selected,
      }}
    >
      {children}
    </DataProvider>
  );
}

/**
 * The lead tracker.
 *
 * A port of `crm/index.php` — three views over one filtered list. Every filter,
 * the sort, the active view and the selected lead are carried in the query
 * string, so any screen is a shareable URL and the back button behaves; inside
 * the Plasmic canvas, where there is no route to carry them, the same state
 * lives in the component so every control still responds.
 *
 * This component is now only the state and the frame. Each visible part — a KPI
 * tile, a filter, a chart, the table — is a free-standing element that reads
 * the tracker itself, which is what lets Plasmic move, restyle or delete any of
 * them independently.
 *
 * Filtering and aggregation run here in the browser over the whole book. At
 * this size that is instant and lets a filter change land without a server
 * round-trip; the server's only job is to hand over the rows.
 */
export default function LeadTracker({
  className = "",
  leads,
  today,
  autoLoad = true,
  defaultView = "table",
  readOnly = false,
  showKpis = true,
  showPipeline = true,
  showFilters = true,
  children,
}: LeadTrackerProps) {
  return (
    <LeadTrackerProvider
      leads={leads}
      // An empty string is Studio's "not set", not a date.
      today={today || undefined}
      autoLoad={autoLoad}
      defaultView={defaultView}
      readOnly={readOnly}
    >
      <PublishTrackerData>
        <div className={`space-y-6 ${className}`}>
          {children ?? (
            <StandardLayout
              showKpis={showKpis}
              showPipeline={showPipeline}
              showFilters={showFilters}
            />
          )}
        </div>
      </PublishTrackerData>
    </LeadTrackerProvider>
  );
}
