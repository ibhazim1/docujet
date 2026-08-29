"use client";

import BarRow from "./BarRow";
import ChartCard from "./ChartCard";
import { useLeadTracker } from "../TrackerContext";
import { lossReasonStats, pct, pctOf } from "@/lib/crm/analytics";

type LossReasonChartProps = {
  title?: string;
  subtitle?: string;
  footnote?: string;
  showTable?: boolean;
  className?: string;
};

/**
 * Colour by who owns the fix, not by how bad the reason is.
 *
 * This is the one chart in the set where the categories are not merely nominal
 * — they group into three problems with three different owners, and that
 * grouping is the actionable content. Three commercial reasons in a row is a
 * pricing conversation; three targeting reasons is a marketing brief. Colouring
 * them individually would hide the only pattern worth seeing.
 *
 * "Not recorded" takes grey and sits outside the scheme, because it is not a
 * cause. It is a hole in the data, and it should look like one.
 */
const OWNER_COLOR: Record<string, string> = {
  commercial: "#c2410c",
  targeting: "#7c3aed",
  process: "#0d9488",
  unknown: "#94a3b8",
};

const OWNER_LABEL: Record<string, string> = {
  commercial: "Commercial",
  targeting: "Targeting",
  process: "Process",
  unknown: "Not recorded",
};

/**
 * Why deals died, and what each cause cost.
 *
 * ---------------------------------------------------------------------------
 * The chart the dashboard was missing entirely
 *
 * Everything else here reports on leads that are alive. Losses were a single
 * grey number — a count, with no cause attached, which meant every deal the
 * business lost taught it nothing at all. This turns that into a ranked list of
 * fixable problems, which is the most direct route from a dashboard to a
 * decision that anything in this app offers.
 *
 * Sized by the raw count and ranked by how many of each cause had already
 * reached SQL. Losing five leads that were never a fit costs an afternoon;
 * losing two that had been qualified, demoed and quoted costs weeks, and a
 * chart ordered on frequency alone would put the cheap problem first.
 *
 * There is no money on this chart because there is none in the book: DocuJet
 * records no deal values, and the per-model estimate that briefly stood in for
 * them was invented rather than measured. Qualified-lead count is the closest
 * honest proxy for what a loss cost.
 * ---------------------------------------------------------------------------
 */
export default function LossReasonChart({
  title = "Why deals are lost",
  subtitle = "Ranked by how many qualified leads each cause killed, with the part of the business that owns the fix",
  footnote = "Recorded when a lead is closed, which is why it is required at that moment — a reason that can be skipped is one nobody supplies, and the analysis would then describe a self-selected minority.",
  showTable = true,
  className = "",
}: LossReasonChartProps) {
  const { visible, insightFor } = useLeadTracker();
  const rows = lossReasonStats(visible);
  const max = Math.max(1, ...rows.map((row) => row.count));
  const totalLost = rows.reduce((sum, row) => sum + row.count, 0);
  const totalQualified = rows.reduce((sum, row) => sum + row.qualified, 0);

  if (rows.length === 0) {
    return (
      <ChartCard
        title={title}
      explain="chart.lossReason"
        subtitle={subtitle}
        showTable={false}
        className={className}
        columns={[]}
        rows={[]}
      >
        <p className="text-sm text-slate-500">
          No closed-lost leads in this view. Nothing has been lost yet, or the filters exclude them
          all.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={title}
      explain="chart.lossReason"
      subtitle={subtitle}
      insight={insightFor("lossReason")}
      footnote={footnote}
      showTable={showTable}
      className={className}
      columns={["Reason", "Leads", "Qualified", "Share"]}
      rows={rows.map((row) => [row.label, row.count, row.qualified, pct(row.share)])}
    >
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            title={`${row.label}: ${row.count} leads lost, ${row.qualified} of them already qualified`}
            className="px-1 py-0.5"
          >
            <BarRow
              label={row.label}
              note={OWNER_LABEL[row.owner]}
              width={pctOf(row.count, max)}
              color={OWNER_COLOR[row.owner] ?? OWNER_COLOR.unknown}
              value={row.count}
              share={row.qualified > 0 ? `${row.qualified} qualified` : pct(row.share)}
              dim={row.key === "unrecorded"}
            />
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
        {totalLost} leads closed lost, {totalQualified} of which had reached SQL or beyond before
        they died.
      </p>
    </ChartCard>
  );
}
