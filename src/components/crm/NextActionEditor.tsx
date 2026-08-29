"use client";

import { useState, useTransition } from "react";
import { ExplainOn } from "./Explain";
import { useLeadTracker } from "./TrackerContext";
import { setNextActionAction } from "@/lib/crm/actions";
import { daysBetween, prettyDate } from "@/lib/crm/analytics";
import type { Lead } from "@/lib/crm/types";

export type NextActionEditorProps = {
  lead: Lead;
  className?: string;
};

/**
 * What happens next, and when.
 *
 * Written as one control rather than two fields because the halves are only
 * useful together: a date with no commitment produces an overdue item nobody
 * can act on, and a commitment with no date never becomes overdue at all. The
 * server action refuses the first combination for that reason.
 *
 * This is the input the Overdue play runs on — the top section of the queue and
 * the one that outranks everything, because a promise the team made and broke
 * costs credibility on top of the deal.
 */
export default function NextActionEditor({ lead, className = "" }: NextActionEditorProps) {
  const { isSample, setFlash, readOnly, today } = useLeadTracker();
  const [action, setAction] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentAction = action ?? lead.nextAction;
  const currentDue = dueAt ?? lead.nextActionAt ?? "";
  const dirty = action !== null || dueAt !== null;

  const overdueBy = lead.nextActionAt ? daysBetween(lead.nextActionAt, today) : null;
  const isOverdue = overdueBy !== null && overdueBy >= 0;

  if (readOnly) {
    return (
      <div className={className}>
        {lead.nextAction ? (
          <p className="text-sm text-slate-700">
            {lead.nextAction}
            {lead.nextActionAt ? (
              <span className={isOverdue ? "ml-2 font-semibold text-rose-700" : "ml-2 text-slate-400"}>
                {isOverdue ? "overdue since " : "due "}
                {prettyDate(lead.nextActionAt)}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Nothing scheduled.</p>
        )}
      </div>
    );
  }

  function save() {
    const nextAction = currentAction;
    const nextDue = currentDue;
    setAction(null);
    setDueAt(null);

    if (isSample) {
      setFlash({ ok: false, message: "Preview data — connect the database to edit leads." });
      return;
    }
    startTransition(async () => {
      setFlash(await setNextActionAction(lead.id, nextAction, nextDue));
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={currentAction}
          disabled={isPending}
          placeholder="What happens next?"
          aria-label={`Next action for ${lead.name}`}
          onChange={(event) => setAction(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-sky-800 focus:ring-4 focus:ring-sky-100 disabled:opacity-50"
        />
        <input
          type="date"
          value={currentDue}
          disabled={isPending}
          aria-label={`Due date for ${lead.name}`}
          onChange={(event) => setDueAt(event.target.value)}
          className={`rounded-lg border bg-white px-3 py-1.5 text-sm tabular-nums outline-none transition focus:border-sky-800 focus:ring-4 focus:ring-sky-100 disabled:opacity-50 ${
            isOverdue && !dirty ? "border-rose-400 text-rose-800" : "border-slate-300 text-slate-900"
          }`}
        />
        {dirty ? (
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-lg bg-sky-800 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:opacity-40"
          >
            Save
          </button>
        ) : null}
      </div>

      <ExplainOn term="action.nextAction" display="block">
        <p className="mt-1 cursor-help text-xs text-slate-400">
          {isOverdue && !dirty
            ? `Overdue by ${overdueBy} day${overdueBy === 1 ? "" : "s"} — this lead is at the top of the queue.`
            : "A date without a commitment cannot be actioned, so both are needed. Clear both to remove it."}
        </p>
      </ExplainOn>
    </div>
  );
}
