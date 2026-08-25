"use client";

import { TrackerLink, useLeadTracker } from "./TrackerContext";
import type { SortKey } from "@/lib/crm/types";

type SortHeaderProps = {
  sortKey: SortKey;
  label: string;
};

/** A sortable column header that toggles direction on the active column. */
export default function SortHeader({ sortKey, label }: SortHeaderProps) {
  const { query } = useLeadTracker();
  const isActive = sortKey === query.sort;
  const nextDir = isActive && query.dir === "asc" ? "desc" : "asc";

  return (
    <TrackerLink
      overrides={{ sort: sortKey, dir: nextDir, lead: null }}
      className={`inline-flex items-center gap-1 transition hover:text-slate-950 ${
        isActive ? "text-slate-950" : ""
      }`}
    >
      {label}
      <span aria-hidden="true" className="text-[10px]">
        {isActive ? (query.dir === "asc" ? "↑" : "↓") : ""}
      </span>
    </TrackerLink>
  );
}
