"use client";

import { TrackerLink, useLeadTracker } from "../TrackerContext";

type ClearFiltersProps = {
  label?: string;
  /** Keeps the link on screen even when nothing is filtered — useful while designing. */
  alwaysShow?: boolean;
  className?: string;
};

/** Drops every filter at once. Hidden while nothing is narrowed. */
export default function ClearFilters({
  label = "Clear",
  alwaysShow = false,
  className = "",
}: ClearFiltersProps) {
  const { filtered } = useLeadTracker();
  if (!filtered && !alwaysShow) return null;

  return (
    <TrackerLink
      overrides={{ q: null, stage: null, source: null, group: null, lead: null }}
      className={`text-sm font-semibold text-sky-800 underline-offset-4 hover:underline ${className}`}
    >
      {label}
    </TrackerLink>
  );
}
