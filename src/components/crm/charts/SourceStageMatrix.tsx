"use client";

import ChartCard from "./ChartCard";
import { HEAT_FILL, HEAT_INK } from "./tokens";
import { useLeadTracker } from "../TrackerContext";
import { heatBin } from "@/lib/crm/analytics";
import { STAGES, STAGE_KEYS } from "@/lib/crm/taxonomy";

type SourceStageMatrixProps = {
  title?: string;
  subtitle?: string;
  showTable?: boolean;
  className?: string;
};

/**
 * Source × stage matrix.
 *
 * A grid of counts is a magnitude comparison, so the cells use a sequential
 * single-hue ramp — five bins, darker meaning more. This is where "Instagram
 * brings volume but it all stalls at Lead" becomes visible in one glance.
 *
 * The Lost column comes from the same tally and keeps the same ramp: every
 * cell in this grid answers one question — how many leads sit here — and
 * splitting the scale would break the comparison the grid exists to support.
 * The column header carries the meaning; the ramp carries only the count.
 */
export default function SourceStageMatrix({
  title = "Source × stage",
  subtitle = "Where each source's leads currently sit — darker means more",
  showTable = true,
  className = "",
}: SourceStageMatrixProps) {
  const { sources: rows } = useLeadTracker();

  let max = 1;
  for (const row of rows) {
    max = Math.max(max, ...STAGE_KEYS.map((key) => row.byStage[key]));
  }

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      showTable={showTable}
      className={className}
      columns={["Source", ...STAGE_KEYS.map((key) => STAGES[key].label)]}
      rows={rows.map((row) => [row.label, ...STAGE_KEYS.map((key) => row.byStage[key])])}
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[420px] grid-cols-[110px_repeat(6,minmax(0,1fr))] gap-1">
          <div />
          {STAGE_KEYS.map((key) => (
            <div key={key} className="pb-1 text-center text-[11px] font-medium text-slate-500">
              {STAGES[key].label}
            </div>
          ))}

          {rows.map((row) => (
            <div key={row.key} className="contents">
              <div className="flex items-center truncate pr-2 text-xs text-slate-600">
                {row.label}
              </div>
              {STAGE_KEYS.map((key) => {
                const count = row.byStage[key];
                const bin = heatBin(count, max);
                return (
                  <div
                    key={key}
                    title={`${row.label} → ${STAGES[key].label}: ${count} lead${count === 1 ? "" : "s"}`}
                    className="flex h-8 items-center justify-center rounded text-xs font-semibold tabular-nums"
                    style={{
                      backgroundColor: bin === 0 ? "transparent" : HEAT_FILL[bin],
                      color: bin === 0 ? "#cbd5e1" : HEAT_INK[bin],
                    }}
                  >
                    {count === 0 ? "·" : count}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
