"use client";

import { useState, useTransition } from "react";
import { setStageAction, type StageActionResult } from "@/lib/crm/actions";
import { LOST_REASONS, LOST_REASON_KEYS, STAGES } from "@/lib/crm/taxonomy";
import type { Lead, LostReason } from "@/lib/crm/types";

export type LostReasonDialogProps = {
  lead: Lead;
  isSample?: boolean;
  onResult?: (result: StageActionResult) => void;
  onClose: () => void;
};

/**
 * Closing a lead, with the reason required.
 *
 * ---------------------------------------------------------------------------
 * Why this is a dialog and not a field
 *
 * A loss reason that can be filled in later is a loss reason that is never
 * filled in — every CRM with an optional one ends up with 80% of its closed
 * deals categorised as blank, and the analysis built on the remaining 20% looks
 * authoritative while describing a self-selected minority. Interrupting the
 * close is the only point at which the person knows the answer and is thinking
 * about it.
 *
 * The cost is one click on a thing reps do a few times a week. What it buys is
 * `lossReasonStats()` — arguably the most useful report the business gets,
 * because it is the only one that turns a failure into an instruction.
 * ---------------------------------------------------------------------------
 *
 * Each option carries the fix it implies, so choosing one is also the moment a
 * rep sees what the business intends to do about that pattern.
 */
export default function LostReasonDialog({
  lead,
  isSample = false,
  onResult,
  onClose,
}: LostReasonDialogProps) {
  const [reason, setReason] = useState<LostReason | "">("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (reason === "") return;

    if (isSample) {
      onResult?.({ ok: false, message: "Preview data — connect the database to close leads." });
      onClose();
      return;
    }

    startTransition(async () => {
      const result = await setStageAction(lead.id, "lost", reason);
      onResult?.(result);
      if (result.ok) onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Close ${lead.name} as lost`}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <h3 className="text-base font-semibold text-slate-950">
          Close {lead.name || lead.id} as lost
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          They reached {STAGES[lead.stage].label}, and that is where the funnel will keep them. Why
          did it end?
        </p>

        <div className="mt-4 space-y-2">
          {LOST_REASON_KEYS.map((key) => {
            const def = LOST_REASONS[key];
            const isActive = reason === key;
            return (
              <label
                key={key}
                className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${
                  isActive
                    ? "border-sky-800 bg-sky-50 ring-2 ring-sky-100"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name="lost-reason"
                  value={key}
                  checked={isActive}
                  onChange={() => setReason(key)}
                  className="mt-1 accent-sky-800"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">{def.label}</span>
                  <span className="block text-xs leading-5 text-slate-500">{def.fix}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={reason === "" || isPending}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {isPending ? "Closing…" : "Close as lost"}
          </button>
        </div>
      </div>
    </div>
  );
}
