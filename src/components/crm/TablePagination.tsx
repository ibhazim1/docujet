"use client";

import { useState } from "react";
import { useLeadTracker } from "./TrackerContext";
import { MAX_PAGE_SIZE, PAGE_SIZES } from "@/lib/crm/query";

export type TablePaginationProps = {
  className?: string;
};

const BUTTON =
  "rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300";

/**
 * How many rows, and which page of them.
 *
 * ---------------------------------------------------------------------------
 * Why a size picker needs a pager beside it
 *
 * The table used to render every lead the filters matched, so the page grew a
 * screen taller with each one. Capping it fixes the scrolling and creates a
 * worse problem on its own: with a cap and nothing else, every lead past the
 * tenth becomes unreachable except by guessing a filter that surfaces it. A
 * limit without a way to move past it is not a shorter list, it is a hidden
 * one.
 *
 * So the two controls ship together, and the footer states the range in words
 * — "Showing 11-20 of 55" — because a page number on its own does not tell
 * anybody whether there is more.
 * ---------------------------------------------------------------------------
 *
 * Changing the size returns to page one. Staying put would be arithmetically
 * possible and useless: the rows under the cursor would all change anyway, so
 * the only predictable landing place is the top.
 */
export default function TablePagination({ className = "" }: TablePaginationProps) {
  const { paged, apply, query } = useLeadTracker();
  const isPreset = (PAGE_SIZES as readonly number[]).includes(query.perPage);

  // Custom stays open while it is in use, so the input does not vanish under
  // the cursor the moment a typed value happens to equal a preset.
  const [custom, setCustom] = useState(!isPreset);

  // Null means "nothing half-typed", so the input follows the committed size —
  // which is what makes a size arriving from elsewhere (the back button, a
  // shared link) reach the field without an effect mirroring props into state.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? String(query.perPage);

  function setSize(size: number) {
    apply({
      per: String(size),
      // Any size change lands on page one; see the note above.
      page: null,
      lead: null,
    });
  }

  function commitCustom() {
    if (draft === null) return;
    const size = Number(draft);
    setDraft(null);
    // Anything unusable snaps back to the size in force rather than being
    // refused with a message: this is a row count, not a form field.
    if (!Number.isInteger(size) || size < 1) return;
    setSize(Math.min(size, MAX_PAGE_SIZE));
  }

  function goTo(page: number) {
    // Page one is the default, so it is carried by the absence of the
    // parameter — the same rule the view toggle follows.
    apply({ page: page <= 1 ? null : String(page), lead: null });
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-1 pt-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-500" htmlFor="lead-page-size">
          Show
        </label>
        <select
          id="lead-page-size"
          value={custom ? "custom" : String(query.perPage)}
          onChange={(event) => {
            const choice = event.target.value;
            if (choice === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            setSize(Number(choice));
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-800 focus:ring-4 focus:ring-sky-100"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>

        {custom ? (
          <input
            type="number"
            min={1}
            max={MAX_PAGE_SIZE}
            value={value}
            aria-label="Rows per page"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitCustom}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setDraft(null);
            }}
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm tabular-nums text-slate-900 outline-none transition focus:border-sky-800 focus:ring-4 focus:ring-sky-100"
          />
        ) : null}

        <span className="text-sm text-slate-500">
          {paged.total === 0
            ? "no leads match"
            : `of ${paged.total} · showing ${paged.from}–${paged.to}`}
        </span>
      </div>

      {paged.totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={BUTTON}
            disabled={!paged.hasPrevious}
            onClick={() => goTo(paged.page - 1)}
          >
            Previous
          </button>
          <span className="whitespace-nowrap text-sm tabular-nums text-slate-500">
            Page {paged.page} of {paged.totalPages}
          </span>
          <button
            type="button"
            className={BUTTON}
            disabled={!paged.hasNext}
            onClick={() => goTo(paged.page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
