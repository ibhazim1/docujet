"use client";

import type { ReactNode } from "react";

type FilterBarProps = {
  className?: string;
  /** The controls. Each one reads and writes the tracker on its own. */
  children?: ReactNode;
};

/**
 * The filter row.
 *
 * A card and a flex row, nothing else — every control inside is a free-standing
 * element, so any of them can be moved out of here, dropped elsewhere on the
 * page, or removed entirely.
 */
export default function FilterBar({ className = "", children }: FilterBarProps) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}
