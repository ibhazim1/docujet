"use client";

import BarRow from "./BarRow";
import ChartCard from "./ChartCard";
import { ACCENT } from "./tokens";
import { TrackerLink, useLeadTracker } from "../TrackerContext";
import { pct, pctOf } from "@/lib/crm/analytics";

type SourceVolumeChartProps = {
  title?: string;
  subtitle?: string;
  footnote?: string;
  /** Clicking a bar filters the whole tracker to that source. */
  clickToFilter?: boolean;
  showTable?: boolean;
  className?: string;
};

/**
 * Lead source distribution — the headline chart.
 *
 * Sorted descending so rank is read by position, and one hue for every bar
 * because sources are nominal categories.
 */
export default function SourceVolumeChart({
  title = "Lead source distribution",
  subtitle = "Where every lead came from, highest first",
  footnote = "Click a bar to filter the whole dashboard by that source.",
  clickToFilter = true,
  showTable = true,
  className = "",
}: SourceVolumeChartProps) {
  const { sources: rows, query, insightFor } = useLeadTracker();
  const activeSource = query.filters.source;
  const max = Math.max(1, ...rows.map((row) => row.total));

  return (
    <ChartCard
      title={title}
      explain="chart.sourceVolume"
      subtitle={subtitle}
      insight={insightFor("sourceVolume")}
      footnote={clickToFilter ? footnote : undefined}
      showTable={showTable}
      className={className}
      columns={["Source", "Leads", "Share"]}
      rows={rows.map((row) => [row.label, row.total, pct(row.share)])}
    >
      <div className="space-y-2">
        {rows.map((row) => {
          const bar = (
            <BarRow
              label={row.label}
              width={pctOf(row.total, max)}
              color={ACCENT}
              value={row.total}
              share={pct(row.share)}
            />
          );
          const hint = `${row.label}: ${row.total} leads (${pct(row.share)} of total)`;

          if (!clickToFilter) {
            return (
              <div key={row.key} title={hint} className="px-1 py-0.5">
                {bar}
              </div>
            );
          }

          return (
            <TrackerLink
              key={row.key}
              overrides={{
                source: activeSource === row.key ? null : row.key,
                lead: null,
              }}
              title={hint}
              className={`block rounded-lg px-1 py-0.5 transition hover:bg-slate-50 ${
                activeSource === row.key ? "bg-sky-50 ring-1 ring-sky-200" : ""
              }`}
            >
              {bar}
            </TrackerLink>
          );
        })}
      </div>
    </ChartCard>
  );
}
