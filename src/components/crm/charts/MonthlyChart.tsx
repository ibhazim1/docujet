"use client";

import ChartCard from "./ChartCard";
import { ACCENT } from "./tokens";
import { useLeadTracker } from "../TrackerContext";
import { monthlyStats, niceTop, pctOf } from "@/lib/crm/analytics";

type MonthlyChartProps = {
  title?: string;
  subtitle?: string;
  showTable?: boolean;
  className?: string;
};

/**
 * Leads captured per month — a magnitude-over-time column chart, one hue.
 *
 * The axis top rounds to a clean number so the midpoint tick is whole, and the
 * gridlines are solid hairlines rather than dashes.
 */
export default function MonthlyChart({
  title = "Leads captured per month",
  subtitle = "All sources combined",
  showTable = true,
  className = "",
}: MonthlyChartProps) {
  const { visible, insightFor } = useLeadTracker();
  const rows = monthlyStats(visible);
  if (rows.length === 0) return null;
  const top = niceTop(Math.max(1, ...rows.map((row) => row.count)));

  return (
    <ChartCard
      title={title}
      explain="chart.monthly"
      subtitle={subtitle}
      insight={insightFor("monthly")}
      showTable={showTable}
      className={className}
      columns={["Month", "Leads"]}
      rows={rows.map((row) => [row.label, row.count])}
    >
      <div className="flex gap-3">
        <div className="flex h-[210px] flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-slate-400">
          <span>{top}</span>
          <span>{Math.floor(top / 2)}</span>
          <span>0</span>
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[186px] flex-col justify-between">
            <span className="block border-t border-slate-200" />
            <span className="block border-t border-slate-200" />
            <span className="block border-t border-slate-200" />
          </div>

          <div className="relative flex h-[210px] items-end gap-2">
            {rows.map((row) => (
              <div
                key={row.key}
                title={`${row.label}: ${row.count} leads`}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                <span className="mb-1 text-[11px] font-semibold tabular-nums text-slate-600">
                  {row.count}
                </span>
                <span
                  className="w-full max-w-6 rounded-t"
                  style={{
                    height: `${pctOf(row.count, top) * 0.78}%`,
                    backgroundColor: ACCENT,
                  }}
                />
                <span className="mt-2 h-4 text-[11px] text-slate-500">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
