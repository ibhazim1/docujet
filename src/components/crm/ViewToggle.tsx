"use client";

import { TrackerLink, useLeadTracker } from "./TrackerContext";
import type { ViewKey } from "@/lib/crm/types";

type ViewToggleProps = {
  tableLabel?: string;
  boardLabel?: string;
  chartsLabel?: string;
  /** Which views to offer. Dropping one hides its button, not the view itself. */
  views?: ViewKey[];
  className?: string;
};

/** The segmented Table / Board / Charts control. */
export default function ViewToggle({
  tableLabel = "Table",
  boardLabel = "Board",
  chartsLabel = "Charts",
  views = ["table", "board", "charts"],
  className = "",
}: ViewToggleProps) {
  const { view } = useLeadTracker();
  const labels: Record<ViewKey, string> = {
    table: tableLabel,
    board: boardLabel,
    charts: chartsLabel,
  };

  return (
    <nav
      aria-label="Lead tracker view"
      className={`inline-flex rounded-full border border-slate-300 bg-white p-1 ${className}`}
    >
      {views.map((key) => {
        const isActive = view === key;
        return (
          <TrackerLink
            key={key}
            // `table` is the default, so it is carried by the absence of `view`.
            overrides={{ view: key === "table" ? null : key, lead: null }}
            current={isActive ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              isActive
                ? "bg-sky-800 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            {labels[key] ?? key}
          </TrackerLink>
        );
      })}
    </nav>
  );
}
