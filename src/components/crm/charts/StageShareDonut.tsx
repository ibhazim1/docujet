import ChartCard from "./ChartCard";
import DonutChart from "./DonutChart";
import { activeStageBreakdown, pct } from "@/lib/crm/analytics";
import { STAGES } from "@/lib/crm/taxonomy";
import type { Lead } from "@/lib/crm/types";

/**
 * Where active leads currently sit, by stage, as a donut.
 *
 * Stage is an ordered scale, so wedges take the same single-hue ordinal ramp
 * as the funnel and the board columns — further along reads as darker here
 * too. Lost leads are excluded entirely; `ActiveLostDonut` is where that split
 * lives, so this chart only ever describes leads still in play.
 */
export default function StageShareDonut({ leads }: { leads: Lead[] }) {
  const rows = activeStageBreakdown(leads);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const segments = rows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.count,
    color: STAGES[row.key].light,
  }));

  return (
    <ChartCard
      title="Active lead stage mix"
      subtitle="Where leads still in play currently sit"
      footnote="Lost leads are excluded — see Active vs lost for that split."
      columns={["Stage", "Leads", "Share"]}
      rows={rows.map((row) => [row.label, row.count, pct(total > 0 ? row.count / total : 0)])}
    >
      <DonutChart segments={segments} centerValue={String(total)} centerCaption="active" />
    </ChartCard>
  );
}
