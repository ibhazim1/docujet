"use client";

import { useTransition } from "react";
import SourcePill from "./SourcePill";
import type { StageActionResult } from "@/lib/crm/actions";
import { updateLeadFieldAction } from "@/lib/crm/actions";
import { SOURCES, SOURCE_KEYS } from "@/lib/crm/taxonomy";
import type { SourceKey } from "@/lib/crm/types";

type SourceSelectProps = {
  leadId: string;
  source: SourceKey;
  readOnly?: boolean;
  isSample?: boolean;
  onResult?: (result: StageActionResult) => void;
};

/**
 * The channel a lead came from.
 *
 * A closed set, so it is a select rather than free text — source is the
 * dashboard's primary analysis dimension, and one typo would split a channel
 * into two and quietly change every chart.
 */
export default function SourceSelect({
  leadId,
  source,
  readOnly = false,
  isSample = false,
  onResult,
}: SourceSelectProps) {
  const [isPending, startTransition] = useTransition();

  if (readOnly) return <SourcePill source={source} />;

  return (
    <select
      value={source}
      disabled={isPending}
      aria-label={`Source for ${leadId}`}
      onChange={(event) => {
        const next = event.target.value;
        if (isSample) {
          onResult?.({
            ok: false,
            message: "Preview data — connect the database to edit leads.",
          });
          return;
        }
        startTransition(async () => {
          onResult?.(await updateLeadFieldAction(leadId, "source", next));
        });
      }}
      className="w-full max-w-full rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100 disabled:opacity-50"
    >
      {SOURCE_KEYS.map((key) => (
        <option key={key} value={key}>
          {SOURCES[key].label}
        </option>
      ))}
    </select>
  );
}
