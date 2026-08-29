"use client";

import ChartCard from "./ChartCard";
import DonutChart from "./DonutChart";
import { useLeadTracker } from "../TrackerContext";
import { activeStageBreakdown, pct } from "@/lib/crm/analytics";
import { STAGES } from "@/lib/crm/taxonomy";

type StageShareDonutProps = {
  title?: string;
  subtitle?: string;
  footnote?: string;
  centerCaption?: string;
  showTable?: boolean;
  className?: string;
};

/**
 * Where active leads currently sit, by stage, as a donut.
 *
 * Stage is an ordered scale, so wedges take the same single-hue ordinal ramp
 * as the funnel and the board columns — further along reads as darker here
 * too. Lost leads are excluded entirely; `ActiveLostDonut` is where that split
 * lives, so this chart only ever describes leads still in play.
 */
export default function StageShareDonut({
  title = "Active lead stage mix",
  subtitle = "Where leads still in play currently sit",
  footnote = "Lost leads are excluded — see Active vs lost for that split.",
  centerCaption = "active",
  showTable = true,
  className = "",
}: StageShareDonutProps) {
  const { visible, insightFor } = useLeadTracker();
  const rows = activeStageBreakdown(visible);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const segments = rows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.count,
    color: STAGES[row.key].light,
  }));

  return (
    <ChartCard
      title={title}
      explain="chart.stageShare"
      subtitle={subtitle}
      insight={insightFor("stageShare")}
      footnote={footnote}
      showTable={showTable}
      className={className}
      columns={["Stage", "Leads", "Share"]}
      rows={rows.map((row) => [row.label, row.count, pct(total > 0 ? row.count / total : 0)])}
    >
      <DonutChart segments={segments} centerValue={String(total)} centerCaption={centerCaption} />
    </ChartCard>
  );
}
