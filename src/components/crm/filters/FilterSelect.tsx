"use client";

import { useLeadTracker } from "../TrackerContext";
import { compactInputClassName } from "@/components/admin/field-styles";
import { SOURCES, SOURCE_KEYS, STAGES, STAGE_KEYS } from "@/lib/crm/taxonomy";

export type FilterKey = "source" | "stage" | "group";

type FilterSelectProps = {
  filter?: FilterKey;
  /** The "no filter" option — what the control reads when nothing is narrowed. */
  allLabel?: string;
  /** Stage only: the pseudo-stage meaning "anything still in play". */
  openOnlyLabel?: string;
  className?: string;
};

const OPTIONS: Record<FilterKey, { label: string; options: Array<{ value: string; label: string }> }> = {
  source: {
    label: "Source",
    options: SOURCE_KEYS.map((key) => ({ value: key, label: SOURCES[key].label })),
  },
  stage: {
    label: "Stage",
    options: STAGE_KEYS.map((key) => ({ value: key, label: STAGES[key].label })),
  },
  group: {
    label: "Channel group",
    options: [
      { value: "social", label: "Social only" },
      { value: "web", label: "Owned web only" },
    ],
  },
};

const DEFAULT_ALL: Record<FilterKey, string> = {
  source: "All sources",
  stage: "All stages",
  group: "Social & web",
};

/**
 * One dropdown filter.
 *
 * Source, stage and channel group are the same control over different closed
 * sets, so they are one component with a `filter` prop rather than three
 * near-identical ones for a designer to keep straight.
 */
export default function FilterSelect({
  filter = "source",
  allLabel,
  openOnlyLabel = "Open only",
  className = "",
}: FilterSelectProps) {
  const { query, apply } = useLeadTracker();
  const config = OPTIONS[filter] ?? OPTIONS.source;
  const value = query.filters[filter] ?? "";

  return (
    <label className={`w-full sm:w-auto ${className}`}>
      <span className="sr-only">{config.label}</span>
      <select
        value={value}
        onChange={(event) => apply({ [filter]: event.target.value, lead: null })}
        className={`${compactInputClassName} sm:w-48`}
      >
        <option value="">{allLabel || DEFAULT_ALL[filter]}</option>
        {filter === "stage" ? <option value="open">{openOnlyLabel}</option> : null}
        {config.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
