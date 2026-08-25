"use client";

import { useTransition } from "react";
import SourcePill from "./SourcePill";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { pillButtonClassName } from "@/components/admin/field-styles";
import { displayStage } from "@/lib/crm/analytics";
import { reopenAction, setStageAction, type StageActionResult } from "@/lib/crm/actions";
import { LOST_STAGE, STAGES, STAGE_KEYS, nextOpenStage } from "@/lib/crm/taxonomy";
import type { Lead, StageKey } from "@/lib/crm/types";

type LeadBoardProps = {
  /** Which columns to show, in order. Empty means every stage. */
  stages?: StageKey[];
  /** The Move / Lost / Reopen buttons on each card. */
  showActions?: boolean;
  showSourcePill?: boolean;
  emptyLabel?: string;
  /** Overrides the tracker's setting for this board only. */
  readOnly?: boolean;
  className?: string;
};

/**
 * Kanban by lifecycle stage.
 *
 * An open card advances to the next stage or closes; a closed card offers only
 * to reopen, at the stage it was lost from. Lost is never offered as the
 * "next" stage — it is an exit from the lifecycle, not the step after
 * Customer, and a one-click advance that could silently close a deal would be
 * a trap.
 */
function CardActions({
  lead,
  isSample,
  onResult,
}: {
  lead: Lead;
  isSample: boolean;
  onResult?: (result: StageActionResult) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<StageActionResult>) {
    // Sample rows are not in the database, so the buttons stay visible and
    // clickable for preview but write nothing.
    if (isSample) {
      onResult?.({ ok: false, message: "Preview data — connect the database to edit leads." });
      return;
    }
    startTransition(async () => {
      const result = await action();
      onResult?.(result);
    });
  }

  const stageLabel = STAGES[lead.stage].label;

  if (lead.lost) {
    return (
      <div className="mt-3">
        <button
          type="button"
          disabled={isPending}
          title={`Reopen ${lead.name} at ${stageLabel}`}
          onClick={() => run(() => reopenAction(lead.id))}
          className={pillButtonClassName}
        >
          ↩ Reopen at {stageLabel}
        </button>
      </div>
    );
  }

  const next = nextOpenStage(lead.stage);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {next ? (
        <button
          type="button"
          disabled={isPending}
          title={`Move to ${STAGES[next].label}`}
          onClick={() => run(() => setStageAction(lead.id, next))}
          className={pillButtonClassName}
        >
          Move to {STAGES[next].label} →
        </button>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        title={`Mark ${lead.name} lost at ${stageLabel}`}
        onClick={() => run(() => setStageAction(lead.id, LOST_STAGE))}
        className={`${pillButtonClassName} hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700`}
      >
        Lost
      </button>
    </div>
  );
}

export default function LeadBoard({
  stages,
  showActions = true,
  showSourcePill = true,
  emptyLabel = "Empty",
  readOnly,
  className = "",
}: LeadBoardProps) {
  const tracker = useLeadTracker();
  const { visible, stats, isSample, setFlash } = tracker;
  const isReadOnly = readOnly ?? tracker.readOnly;

  const columns = stages?.length ? stages : STAGE_KEYS;

  return (
    <div className={`-mx-1 overflow-x-auto px-1 pb-2 ${className}`}>
      <div
        className="grid gap-4"
        style={{
          minWidth: Math.max(320, columns.length * 184),
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((key) => {
          const stage = STAGES[key];
          if (!stage) return null;
          const column = visible.filter((lead) => displayStage(lead) === key);

          return (
            <section
              key={key}
              className={`rounded-3xl border bg-white p-4 shadow-sm ${
                stage.terminal ? "border-dashed border-slate-300" : "border-slate-200"
              }`}
            >
              <header className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.light }}
                  />
                  {stage.label}
                </h3>
                <span className="text-sm font-semibold text-slate-500">{stats.byStage[key]}</span>
              </header>

              <div className="mt-3 space-y-3">
                {column.map((lead) => (
                  <article
                    key={lead.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <TrackerLink
                      overrides={{ lead: lead.id }}
                      scrollTo="lead-detail"
                      className="block"
                    >
                      <strong className="block text-sm font-semibold text-slate-950">
                        {lead.name || "Unnamed lead"}
                      </strong>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {lead.title || lead.email}
                      </span>
                    </TrackerLink>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {showSourcePill ? <SourcePill source={lead.source} size="sm" /> : null}
                      {lead.lost ? (
                        <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          at {STAGES[lead.stage].label}
                        </span>
                      ) : null}
                    </div>
                    {showActions && !isReadOnly ? (
                      <CardActions lead={lead} isSample={isSample} onResult={setFlash} />
                    ) : null}
                  </article>
                ))}
                {column.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">{emptyLabel}</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
