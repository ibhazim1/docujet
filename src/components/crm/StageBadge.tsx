import { ExplainOn } from "./Explain";
import { STAGES } from "@/lib/crm/taxonomy";
import type { StageKey } from "@/lib/crm/types";

/**
 * A stage as a read-only chip.
 *
 * Wears the stage's own colour from the ordinal ramp, so position in the
 * lifecycle reads as darkness here exactly as it does in the funnel and the
 * board. The three lightest steps take dark text; the rest take white.
 *
 * Hovering it says what the stage means. This is the badge that carries MQL and
 * SQL — two initialisms the whole app is built on and neither of which a new
 * admin has any way to decode — so explaining them here reaches the queue, the
 * board and the table at once, without any of the three growing a legend.
 */
export default function StageBadge({ stage }: { stage: StageKey }) {
  const { label, light } = STAGES[stage];
  const onLightEnd = stage === "lead" || stage === "mql";

  return (
    <ExplainOn term={`stage.${stage}`}>
      <span
        className="inline-flex cursor-help whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ backgroundColor: light, color: onLightEnd ? "#0f172a" : "#ffffff" }}
      >
        {label}
      </span>
    </ExplainOn>
  );
}
