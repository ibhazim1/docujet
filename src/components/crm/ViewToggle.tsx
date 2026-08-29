"use client";

import { ExplainOn } from "./Explain";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import type { ViewKey } from "@/lib/crm/types";

type ViewToggleProps = {
  todayLabel?: string;
  tableLabel?: string;
  boardLabel?: string;
  chartsLabel?: string;
  /** Which views to offer. Dropping one hides its button, not the view itself. */
  views?: ViewKey[];
  className?: string;
};

/**
 * The segmented Today / Table / Board / Charts control.
 *
 * Today leads, and is the default. The order is not cosmetic: the three views
 * to its right all answer questions *about* the book, and this one hands out
 * the work. A dashboard that opens on a table asks the reader to decide what
 * the morning is for before it tells them anything.
 */
export default function ViewToggle({
  todayLabel = "Today",
  tableLabel = "Table",
  boardLabel = "Board",
  chartsLabel = "Charts",
  views = ["today", "table", "board", "charts"],
  className = "",
}: ViewToggleProps) {
  const { view, outstanding } = useLeadTracker();
  const labels: Record<ViewKey, string> = {
    today: todayLabel,
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
          // Wrapped rather than dotted: this is the page's primary navigation,
          // and four info dots across a segmented control would make choosing a
          // view look like a form to fill in.
          <ExplainOn key={key} term={`view.${key}`}>
            <TrackerLink
              // `today` is the default, so it is carried by the absence of `view`.
              // Leaving a view also clears the play filter: it belongs to the
              // queue alone and would otherwise silently narrow the table.
              overrides={{ view: key === "today" ? null : key, lead: null, play: null }}
              current={isActive ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-sky-800 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {labels[key] ?? key}
              {key === "today" && outstanding.count > 0 ? (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                    isActive ? "bg-white/20" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {outstanding.count}
                </span>
              ) : null}
            </TrackerLink>
          </ExplainOn>
        );
      })}
    </nav>
  );
}
