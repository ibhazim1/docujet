"use client";

import BarRow from "./BarRow";
import ChartCard from "./ChartCard";
import { ACCENT } from "./tokens";
import { useLeadTracker } from "../TrackerContext";
import { pct } from "@/lib/crm/analytics";

/** Below this, one conversion swings the rate too far to rank on. */
const THIN_SAMPLE = 4;

type SourceQualityChartProps = {
  title?: string;
  subtitle?: string;
  footnote?: string;
  showTable?: boolean;
  className?: string;
};

/**
 * Source quality — share of each source's leads that reached SQL or beyond.
 *
 * Sits directly beside the volume chart on purpose: the two together are the
 * actual finding, because the loudest channel is rarely the best one. Sources
 * with too few leads to mean anything are marked rather than ranked.
 */
export default function SourceQualityChart({
  title = "Source quality",
  subtitle = "Share of each source's leads that reached SQL or beyond",
  footnote = "Sources with fewer than 4 leads are dimmed — the percentage is not yet meaningful. " +
    "A lead that qualified and was later lost still counts here, so this measures what a " +
    "channel brings in, not what closed.",
  showTable = true,
  className = "",
}: SourceQualityChartProps) {
  const { sources, insightFor } = useLeadTracker();
  const ranked = [...sources].sort((a, b) => b.qualifiedRate - a.qualifiedRate);

  return (
    <ChartCard
      title={title}
      explain="chart.sourceQuality"
      subtitle={subtitle}
      insight={insightFor("sourceQuality")}
      footnote={footnote}
      showTable={showTable}
      className={className}
      columns={["Source", "Leads", "Reached SQL+", "Rate", "Lost"]}
      rows={ranked.map((row) => [
        row.label,
        row.total,
        row.qualified,
        pct(row.qualifiedRate),
        row.lost,
      ])}
    >
      <div className="space-y-2">
        {ranked.map((row) => {
          const thin = row.total < THIN_SAMPLE;
          return (
            <div
              key={row.key}
              title={`${row.label}: ${row.qualified} of ${row.total} leads reached SQL or beyond`}
            >
              <BarRow
                label={row.label}
                width={row.qualifiedRate * 100}
                color={ACCENT}
                dim={thin}
                value={pct(row.qualifiedRate)}
                share={thin ? `n=${row.total}` : `${row.qualified}/${row.total}`}
              />
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
