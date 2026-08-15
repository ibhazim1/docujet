"use client";

import Link from "next/link";
import BarRow from "./BarRow";
import ChartCard from "./ChartCard";
import { ACCENT } from "./tokens";
import type { SourceStat } from "@/lib/crm/analytics";
import { pct, pctOf } from "@/lib/crm/analytics";
import { toggleHref } from "@/lib/crm/query";
import type { SourceKey } from "@/lib/crm/types";

type SourceVolumeChartProps = {
  rows: SourceStat[];
  activeSource: SourceKey | "";
  params: URLSearchParams;
};

/**
 * Lead source distribution — the headline chart.
 *
 * Sorted descending so rank is read by position, and one hue for every bar
 * because sources are nominal categories.
 */
export default function SourceVolumeChart({
  rows,
  activeSource,
  params,
}: SourceVolumeChartProps) {
  const max = Math.max(1, ...rows.map((row) => row.total));

  return (
    <ChartCard
      title="Lead source distribution"
      subtitle="Where every lead came from, highest first"
      footnote="Click a bar to filter the whole dashboard by that source."
      columns={["Source", "Leads", "Share"]}
      rows={rows.map((row) => [row.label, row.total, pct(row.share)])}
    >
      <div className="space-y-2">
        {rows.map((row) => (
          <Link
            key={row.key}
            href={toggleHref(params, "source", row.key, { lead: null })}
            title={`${row.label}: ${row.total} leads (${pct(row.share)} of total)`}
            className={`block rounded-lg px-1 py-0.5 transition hover:bg-slate-50 ${
              activeSource === row.key ? "bg-sky-50 ring-1 ring-sky-200" : ""
            }`}
          >
            <BarRow
              label={row.label}
              width={pctOf(row.total, max)}
              color={ACCENT}
              value={row.total}
              share={pct(row.share)}
            />
          </Link>
        ))}
      </div>
    </ChartCard>
  );
}
