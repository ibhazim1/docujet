"use client";

import Explain from "./Explain";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { STAGES } from "@/lib/crm/taxonomy";
import type { StageKey } from "@/lib/crm/types";

type StageTileProps = {
  stage?: StageKey;
  /** Overrides the stage's own name. */
  label?: string;
  /** The share bar under the count. */
  showBar?: boolean;
  /** Clicking filters the whole tracker to this stage, and clicking again clears it. */
  clickToFilter?: boolean;
  className?: string;
};

/**
 * One pipeline tile.
 *
 * The count keys off the *displayed* stage, so a lost lead shows under Lost
 * rather than inflating the stage it died at. Lost is dashed because it is an
 * exit from the lifecycle, not a step in it.
 */
export default function StageTile({
  stage = "lead",
  label,
  showBar = true,
  clickToFilter = true,
  className = "",
}: StageTileProps) {
  const { stats, query } = useLeadTracker();

  const def = STAGES[stage] ?? STAGES.lead;
  const count = stats.byStage[stage] ?? 0;
  const fill = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;
  const isActive = query.filters.stage === stage;

  const shell = `rounded-3xl border bg-white p-4 shadow-sm ${
    def.terminal ? "border-dashed" : ""
  } ${isActive ? "border-sky-800 ring-2 ring-sky-100" : "border-slate-200"} ${className}`;

  const body = (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          {label || def.label}
          <Explain term={`stage.${stage}`} label={def.label} />
        </span>
        <span className="text-2xl font-semibold tracking-tight text-slate-950">{count}</span>
      </span>
      {showBar ? (
        <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full"
            style={{ width: `${fill}%`, backgroundColor: def.light }}
          />
        </span>
      ) : null}
    </>
  );

  if (!clickToFilter) {
    return <section className={`block ${shell}`}>{body}</section>;
  }

  return (
    <TrackerLink
      overrides={{ stage: isActive ? null : stage, lead: null }}
      current={isActive ? "true" : undefined}
      className={`block transition hover:border-slate-400 ${shell}`}
    >
      {body}
    </TrackerLink>
  );
}
