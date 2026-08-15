import ChartCard from "./ChartCard";
import { ACCENT } from "./tokens";
import type { SourceStat } from "@/lib/crm/analytics";
import { pct, pctOf } from "@/lib/crm/analytics";

/**
 * Social versus owned web properties.
 *
 * Two numbers against a whole — a meter, not a pie. The track is a lighter
 * step of the same ramp so the unfilled portion still reads as part of the
 * measure.
 */
export default function SocialSplitMeter({
  rows,
  total,
}: {
  rows: SourceStat[];
  total: number;
}) {
  const social = rows
    .filter((row) => row.group === "social")
    .reduce((sum, row) => sum + row.total, 0);
  const web = total - social;

  return (
    <ChartCard
      title="Social vs owned channels"
      subtitle="Social platforms against the website chatbot and contact form"
      columns={["Channel group", "Leads", "Share"]}
      rows={[
        ["Social", social, pct(total > 0 ? social / total : 0)],
        ["Owned web", web, pct(total > 0 ? web / total : 0)],
      ]}
    >
      <div
        title={`Social ${social} of ${total} leads`}
        className="h-5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "#c3d9f5" }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${pctOf(social, Math.max(1, total))}%`,
            backgroundColor: ACCENT,
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
        <span>
          <b className="text-slate-950">{social}</b> from social (
          {pct(total > 0 ? social / total : 0)})
        </span>
        <span>
          <b className="text-slate-950">{web}</b> from owned web (
          {pct(total > 0 ? web / total : 0)})
        </span>
      </div>
    </ChartCard>
  );
}
