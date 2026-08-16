import ChartCard from "./ChartCard";
import DonutChart from "./DonutChart";
import { ACCENT } from "./tokens";
import { activeVsLost, pct } from "@/lib/crm/analytics";
import { STAGES } from "@/lib/crm/taxonomy";
import type { Lead } from "@/lib/crm/types";

/**
 * Active versus lost, as a donut.
 *
 * Two slices only, so identity rides the same colours the rest of the
 * dashboard already uses for this exact split: accent blue for "still in
 * play", the desaturated Lost grey for closed — never a status red, because
 * losing leads here is normal volume, not an alarm.
 */
export default function ActiveLostDonut({ leads }: { leads: Lead[] }) {
  const rows = activeVsLost(leads);
  const total = leads.length;

  const segments = rows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.count,
    color: row.key === "lost" ? STAGES.lost.light : ACCENT,
  }));

  return (
    <ChartCard
      title="Active vs lost"
      subtitle="Every lead, still in play or closed lost"
      columns={["Status", "Leads", "Share"]}
      rows={rows.map((row) => [row.label, row.count, pct(total > 0 ? row.count / total : 0)])}
    >
      <DonutChart segments={segments} centerValue={String(total)} centerCaption="leads" />
    </ChartCard>
  );
}
