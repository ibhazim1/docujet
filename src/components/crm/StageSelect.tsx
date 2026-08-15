"use client";

import { useTransition } from "react";
import StageBadge from "./StageBadge";
import { displayStage } from "@/lib/crm/analytics";
import { setStageAction, type StageActionResult } from "@/lib/crm/actions";
import { STAGES, STAGE_KEYS } from "@/lib/crm/taxonomy";
import type { Lead } from "@/lib/crm/types";

type StageSelectProps = {
  lead: Lead;
  /** Renders a badge instead of a control. Presentational only. */
  readOnly?: boolean;
  /** These rows are the bundled samples, so an edit has nowhere real to go. */
  isSample?: boolean;
  size?: "sm" | "md";
  onResult?: (result: StageActionResult) => void;
};

/**
 * The inline stage editor.
 *
 * The select shows the *displayed* stage, so a closed lead reads "Lost" rather
 * than the stage it died at. Picking Lost closes it; picking any real stage
 * reopens it. The action works out which of those happened.
 */
export default function StageSelect({
  lead,
  readOnly = false,
  isSample = false,
  size = "sm",
  onResult,
}: StageSelectProps) {
  const [isPending, startTransition] = useTransition();
  const current = displayStage(lead);

  if (readOnly) {
    return <StageBadge stage={current} />;
  }

  return (
    <select
      value={current}
      disabled={isPending}
      aria-label={`Stage for ${lead.name}`}
      onChange={(event) => {
        const choice = event.target.value;
        // The control still renders and still looks live, but sample rows are
        // not in the sheet, so nothing is written. The select snaps back on
        // the next render because its value comes from the lead.
        if (isSample) {
          onResult?.({ ok: false, message: "Preview data — connect the leads sheet to edit leads." });
          return;
        }
        startTransition(async () => {
          const result = await setStageAction(lead.id, choice);
          onResult?.(result);
        });
      }}
      style={{ borderColor: STAGES[current].light }}
      className={`w-full max-w-full rounded-full border-2 bg-white font-semibold text-slate-900 outline-none transition focus:ring-4 focus:ring-sky-100 disabled:opacity-50 ${
        size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
      }`}
    >
      {STAGE_KEYS.map((key) => (
        <option key={key} value={key}>
          {STAGES[key].label}
        </option>
      ))}
    </select>
  );
}
