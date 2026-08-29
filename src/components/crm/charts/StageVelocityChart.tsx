"use client";

import ChartCard from "./ChartCard";
import { TRACK } from "./tokens";
import { TrackerLink, useLeadTracker } from "../TrackerContext";
import { pctOf, stageVelocity } from "@/lib/crm/analytics";
import { stageColor } from "@/lib/crm/taxonomy";

type StageVelocityChartProps = {
  title?: string;
  subtitle?: string;
  footnote?: string;
  clickToFilter?: boolean;
  showTable?: boolean;
  className?: string;
};

/**
 * How long open deals have been parked at each stage.
 *
 * ---------------------------------------------------------------------------
 * Where the pipeline ages
 *
 * The funnel says how many deals get through each step. It cannot say how long
 * they take, which is the difference between a pipeline that is working slowly
 * and one that has stopped — both look identical in a funnel, and only one is
 * an emergency.
 *
 * Each bar carries its stage's tolerance as a marker, so the chart is read
 * against a standard rather than against the other bars: Opportunity at 25 days
 * is fine and Lead at 25 days is not, and a chart that only ranked the stages
 * against each other would say the opposite.
 * ---------------------------------------------------------------------------
 *
 * Dwell time, not cycle time. It measures how long the deals *still here* have
 * been here — the question a rep can act on this morning. How long won deals
 * took end to end is the better long-run measure and needs `lead_events` to
 * accumulate history first.
 *
 * Stage colour comes from the lifecycle ramp, exactly as it does on the board
 * and in the badges, so position in the funnel reads as darkness here too.
 */
export default function StageVelocityChart({
  title = "Where deals are ageing",
  subtitle = "Average days open leads have sat at their current stage",
  footnote = "Measured from the last stage change, not from when the lead arrived. The marker on each bar is what that stage tolerates before a lead counts as stalled.",
  clickToFilter = true,
  showTable = true,
  className = "",
}: StageVelocityChartProps) {
  const { visible, today, query, insightFor } = useLeadTracker();
  const rows = stageVelocity(visible, today).filter((row) => row.count > 0);
  const max = Math.max(1, ...rows.map((row) => Math.max(row.avgDays, row.threshold, row.maxDays)));
  const activeStage = query.filters.stage;

  if (rows.length === 0) {
    return (
      <ChartCard
        title={title}
      explain="chart.stageVelocity"
        subtitle={subtitle}
        showTable={false}
        className={className}
        columns={[]}
        rows={[]}
      >
        <p className="text-sm text-slate-500">No open leads in this view to measure.</p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={title}
      explain="chart.stageVelocity"
      subtitle={subtitle}
      insight={insightFor("velocity")}
      footnote={footnote}
      showTable={showTable}
      className={className}
      columns={["Stage", "Open", "Avg days", "Oldest", "Limit"]}
      rows={rows.map((row) => [
        row.label,
        row.count,
        Math.round(row.avgDays),
        row.maxDays,
        row.threshold,
      ])}
    >
      <div className="space-y-3">
        {rows.map((row) => {
          const over = row.avgDays > row.threshold;
          const body = (
            <div className="grid grid-cols-[minmax(72px,110px)_minmax(0,1fr)_auto] items-center gap-3">
              <span className="min-w-0 text-xs text-slate-600">
                <span className="block truncate">{row.label}</span>
                <span className="block text-[11px] text-slate-400">
                  {row.count} open · oldest {row.maxDays}d
                </span>
              </span>

              <span
                className="relative block h-4 w-full overflow-hidden rounded-l-[2px] rounded-r"
                style={{ backgroundColor: TRACK }}
              >
                <span
                  className="block h-full rounded-l-[2px] rounded-r"
                  style={{
                    width: `${pctOf(row.avgDays, max)}%`,
                    backgroundColor: stageColor(row.key),
                  }}
                />
                {/* The tolerance marker. Rendered over the bar rather than beside
                    it so the comparison is read at a glance, without arithmetic. */}
                <span
                  aria-hidden
                  className="absolute top-0 h-full w-px bg-slate-900/60"
                  style={{ left: `${pctOf(row.threshold, max)}%` }}
                />
              </span>

              <span className="whitespace-nowrap text-right text-xs tabular-nums">
                <span className={`font-semibold ${over ? "text-rose-700" : "text-slate-950"}`}>
                  {Math.round(row.avgDays)}d
                </span>
                <span className="ml-2 text-slate-400">/ {row.threshold}d</span>
              </span>
            </div>
          );

          const hint = `${row.label}: ${row.count} open leads, ${Math.round(row.avgDays)} days on average against a ${row.threshold}-day limit; oldest ${row.maxDays} days`;

          if (!clickToFilter) {
            return (
              <div key={row.key} title={hint} className="px-1">
                {body}
              </div>
            );
          }

          return (
            <TrackerLink
              key={row.key}
              overrides={{ stage: activeStage === row.key ? null : row.key, lead: null }}
              title={hint}
              className={`block rounded-lg px-1 py-0.5 transition hover:bg-slate-50 ${
                activeStage === row.key ? "bg-sky-50 ring-1 ring-sky-200" : ""
              }`}
            >
              {body}
            </TrackerLink>
          );
        })}
      </div>
    </ChartCard>
  );
}
