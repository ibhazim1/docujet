import { STAGES } from "@/lib/crm/taxonomy";
import type { StageKey } from "@/lib/crm/types";

/**
 * A stage as a read-only chip.
 *
 * Wears the stage's own colour from the ordinal ramp, so position in the
 * lifecycle reads as darkness here exactly as it does in the funnel and the
 * board. The three lightest steps take dark text; the rest take white.
 */
export default function StageBadge({ stage }: { stage: StageKey }) {
  const { label, light } = STAGES[stage];
  const onLightEnd = stage === "lead" || stage === "mql";

  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: light, color: onLightEnd ? "#0f172a" : "#ffffff" }}
    >
      {label}
    </span>
  );
}
