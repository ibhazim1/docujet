"use client";

import { useLeadTracker } from "./TrackerContext";

type LeadCountLabelProps = {
  /** `{visible}` and `{total}` are replaced with the live counts. */
  template?: string;
  className?: string;
};

/**
 * "46 of 46 leads match" — how much of the book the filters are letting through.
 *
 * Deliberately not "showing": the table shows one page of these, and its own
 * footer says which. Two controls both claiming to say what is on screen, with
 * different numbers, is worse than either.
 */
export default function LeadCountLabel({
  template = "{visible} of {total} leads match",
  className = "",
}: LeadCountLabelProps) {
  const { visible, allLeads } = useLeadTracker();

  const text = template
    .replaceAll("{visible}", String(visible.length))
    .replaceAll("{total}", String(allLeads.length));

  return <p className={`text-sm text-slate-500 ${className}`}>{text}</p>;
}
