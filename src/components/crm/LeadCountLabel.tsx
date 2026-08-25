"use client";

import { useLeadTracker } from "./TrackerContext";

type LeadCountLabelProps = {
  /** `{visible}` and `{total}` are replaced with the live counts. */
  template?: string;
  className?: string;
};

/** "Showing 46 of 46 leads" — how much of the book the filters are letting through. */
export default function LeadCountLabel({
  template = "Showing {visible} of {total} leads",
  className = "",
}: LeadCountLabelProps) {
  const { visible, allLeads } = useLeadTracker();

  const text = template
    .replaceAll("{visible}", String(visible.length))
    .replaceAll("{total}", String(allLeads.length));

  return <p className={`text-sm text-slate-500 ${className}`}>{text}</p>;
}
