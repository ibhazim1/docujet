"use client";

import Link from "next/link";
import { buildHref } from "@/lib/crm/query";
import type { ViewKey } from "@/lib/crm/types";

const VIEWS: Array<{ key: ViewKey; label: string }> = [
  { key: "table", label: "Table" },
  { key: "board", label: "Board" },
  { key: "charts", label: "Charts" },
];

type ViewToggleProps = {
  view: ViewKey;
  params: URLSearchParams;
};

/** The segmented Table / Board / Charts control from the PHP top bar. */
export default function ViewToggle({ view, params }: ViewToggleProps) {
  return (
    <nav
      aria-label="Lead tracker view"
      className="inline-flex rounded-full border border-slate-300 bg-white p-1"
    >
      {VIEWS.map(({ key, label }) => {
        const isActive = view === key;
        return (
          <Link
            key={key}
            href={buildHref(params, { view: key === "table" ? null : key, lead: null })}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              isActive
                ? "bg-sky-800 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
