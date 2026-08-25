"use client";

import ChartCard from "./ChartCard";
import DonutChart from "./DonutChart";
import { OTHER_COLOR, RANK_COLORS } from "./tokens";
import { useLeadTracker } from "../TrackerContext";
import { pct, topSourceShares } from "@/lib/crm/analytics";

/** Wedges past this rank stay far enough apart under CVD to share a screen. */
const RANKED_SLOTS = RANK_COLORS.length;

type SourceShareDonutProps = {
  title?: string;
  subtitle?: string;
  footnote?: string;
  centerCaption?: string;
  showTable?: boolean;
  className?: string;
};

/**
 * Lead source share as a donut — the top three sources by volume, everything
 * else folded into "Other" so the wedge count stays inside the range a
 * part-to-whole chart can actually show at a glance.
 *
 * Pairs with `SourceVolumeChart`, which carries the full eight-source ranking;
 * this one answers "how concentrated is our source mix?" in one shape.
 */
export default function SourceShareDonut({
  title = "Source concentration",
  subtitle = "Top sources by volume, share of all leads",
  footnote = "Coloured by rank, not by source — each wedge is labelled directly so a re-filter never quietly repaints what a colour means.",
  centerCaption = "leads",
  showTable = true,
  className = "",
}: SourceShareDonutProps) {
  const { sources: rows } = useLeadTracker();
  const shares = topSourceShares(rows, RANKED_SLOTS);
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  const segments = shares.map((share, i) => ({
    key: share.key,
    label: share.label,
    value: share.total,
    color: i < RANKED_SLOTS ? RANK_COLORS[i] : OTHER_COLOR,
  }));

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      footnote={footnote}
      showTable={showTable}
      className={className}
      columns={["Source", "Leads", "Share"]}
      rows={shares.map((share) => [
        share.label,
        share.total,
        pct(total > 0 ? share.total / total : 0),
      ])}
    >
      <DonutChart segments={segments} centerValue={String(total)} centerCaption={centerCaption} />
    </ChartCard>
  );
}
