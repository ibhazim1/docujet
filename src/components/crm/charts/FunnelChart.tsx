import BarRow from "./BarRow";
import ChartCard from "./ChartCard";
import type { FunnelRow } from "@/lib/crm/analytics";
import { pct, pctOf } from "@/lib/crm/analytics";
import { STAGES } from "@/lib/crm/taxonomy";

/**
 * Lifecycle funnel.
 *
 * "Reached" is cumulative — a lead at Opportunity has necessarily been an MQL —
 * so the bars are suffix sums, and the drop between bars is the real conversion
 * step. Stage colour follows the ordinal ramp.
 *
 * Lost leads are counted at the furthest stage they reached, so the step rates
 * describe everyone who ever got that far rather than only the survivors. The
 * loss is then annotated on the stage it happened at, which is the reading that
 * matters: a drop between two bars tells you leads stopped, and the annotation
 * tells you whether they were actively lost there or are simply still sitting.
 * There is no Lost bar — it is an exit from the funnel, not a step in it.
 */
export default function FunnelChart({ rows }: { rows: FunnelRow[] }) {
  const max = Math.max(1, rows[0]?.reached ?? 1);

  return (
    <ChartCard
      title="Lifecycle funnel"
      subtitle="Leads reaching each stage, counted at the furthest stage they got to"
      footnote="Step conversion counts lost leads in the denominator — otherwise the rate would rise as deals were lost."
      columns={["Stage", "Reached", "Open here", "Lost here", "Step conversion"]}
      rows={rows.map((row) => [
        row.label,
        row.reached,
        row.resting,
        row.lost,
        row.stepRate === null ? "—" : pct(row.stepRate),
      ])}
    >
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            title={`${row.label}: ${row.reached} reached, ${row.resting} still open here, ${row.lost} lost here`}
          >
            <BarRow
              label={row.label}
              note={row.lost > 0 ? `${row.lost} lost here` : undefined}
              width={pctOf(row.reached, max)}
              color={STAGES[row.key].light}
              value={row.reached}
              share={row.stepRate === null ? "entry" : `↓ ${pct(row.stepRate)}`}
            />
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
