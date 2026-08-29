"use client";

import { ExplainOn } from "./Explain";
import { useLeadTracker } from "./TrackerContext";
import { SCORE_BANDS, type LeadScore } from "@/lib/crm/scoring";

/**
 * Band colour.
 *
 * Deliberately NOT the lifecycle ramp. Stage is an ordered position and wears
 * a single-hue ramp everywhere in this app; a score band is a temperature, and
 * borrowing the same blues would make a cold lead at Opportunity and a hot lead
 * at Lead read as the same kind of fact. Red through slate is a second scale
 * the eye keeps separate — and it is the only place in the CRM that uses it.
 */
const BAND_STYLE: Record<string, { bg: string; ink: string; ring: string }> = {
  hot: { bg: "#fee2e2", ink: "#991b1b", ring: "#fca5a5" },
  warm: { bg: "#ffedd5", ink: "#9a3412", ring: "#fdba74" },
  cool: { bg: "#e0f2fe", ink: "#075985", ring: "#7dd3fc" },
  cold: { bg: "#f1f5f9", ink: "#475569", ring: "#cbd5e1" },
};

export type ScoreChipProps = {
  /** Which lead to read. Falls back to the selected one, then the first shown. */
  leadId?: string;
  /** Pass a score directly when the caller already computed one. */
  score?: LeadScore;
  size?: "sm" | "md";
  /** Adds the band name beside the number. */
  showLabel?: boolean;
  className?: string;
};

/**
 * A lead score, as a chip.
 *
 * Hovering it gives both halves of the answer: what a priority score is and how
 * it is built, and then the top three factors behind this particular number.
 * That matters more than it sounds — a score is only as useful as a rep is
 * willing to believe, and "84 — Appointment booked +30, Pipeline progress +19,
 * Recent activity +13" survives scrutiny in a way a bare 84 does not.
 *
 * This replaced a native `title`, which carried the factors and could not carry
 * the explanation: a browser tooltip is one unstyled line, appears after a
 * delay nobody controls, and is invisible to a reader who has never met the
 * concept and so does not know there is anything to hover.
 */
export default function ScoreChip({
  leadId,
  score,
  size = "sm",
  showLabel = false,
  className = "",
}: ScoreChipProps) {
  const { scoreFor, selected, visible } = useLeadTracker();

  const id = leadId || selected?.id || visible[0]?.id || "";
  const reading = score ?? scoreFor(id);
  if (!reading) return null;

  const style = BAND_STYLE[reading.band] ?? BAND_STYLE.cold;
  const top = reading.factors.slice(0, 3);
  const explanation =
    top.length > 0
      ? `${reading.total} — ${top
          .map((factor) => `${factor.label} ${factor.points > 0 ? "+" : ""}${factor.points}`)
          .join(", ")}`
      : `${reading.total} — no signals recorded yet.`;

  return (
    <ExplainOn term="score" detail={explanation}>
      <span
        className={`inline-flex cursor-help items-center gap-1.5 whitespace-nowrap rounded-full font-semibold tabular-nums ring-1 ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
        } ${className}`}
        style={{ backgroundColor: style.bg, color: style.ink, boxShadow: `inset 0 0 0 1px ${style.ring}` }}
      >
        {reading.total}
        {showLabel ? (
          <span className="font-medium opacity-80">{SCORE_BANDS[reading.band].label}</span>
        ) : null}
      </span>
    </ExplainOn>
  );
}
