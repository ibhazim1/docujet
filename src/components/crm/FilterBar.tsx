"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { compactInputClassName } from "@/components/admin/field-styles";
import { buildHref, isFiltered } from "@/lib/crm/query";
import { SOURCES, SOURCE_KEYS, STAGES, STAGE_KEYS } from "@/lib/crm/taxonomy";
import type { LeadFilters } from "@/lib/crm/types";

type FilterBarProps = {
  filters: LeadFilters;
  params: URLSearchParams;
};

/**
 * Search, source, stage and channel-group.
 *
 * The stage select carries an **Open only** option — "still in play" is the
 * list a rep actually wants and isn't expressible as any single stage. It is
 * one extra option rather than a second control that would duplicate
 * `stage=lost`.
 */
export default function FilterBar({ filters, params }: FilterBarProps) {
  const router = useRouter();

  function apply(overrides: Record<string, string | null>) {
    router.replace(buildHref(params, { ...overrides, lead: null }), { scroll: false });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          apply({ q: typeof value === "string" ? value.trim() : "" });
        }}
      >
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Search leads</span>
          {/* Uncontrolled and keyed on the applied query, so clearing a filter
              elsewhere on the page resets the box without an effect. */}
          <input
            key={filters.q}
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Search name, email, phone or interest…"
            className={compactInputClassName}
          />
        </label>

        <label className="w-full sm:w-auto">
          <span className="sr-only">Source</span>
          <select
            value={filters.source}
            onChange={(event) => apply({ source: event.target.value })}
            className={`${compactInputClassName} sm:w-48`}
          >
            <option value="">All sources</option>
            {SOURCE_KEYS.map((key) => (
              <option key={key} value={key}>
                {SOURCES[key].label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-full sm:w-auto">
          <span className="sr-only">Stage</span>
          <select
            value={filters.stage}
            onChange={(event) => apply({ stage: event.target.value })}
            className={`${compactInputClassName} sm:w-44`}
          >
            <option value="">All stages</option>
            <option value="open">Open only</option>
            {STAGE_KEYS.map((key) => (
              <option key={key} value={key}>
                {STAGES[key].label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-full sm:w-auto">
          <span className="sr-only">Channel group</span>
          <select
            value={filters.group}
            onChange={(event) => apply({ group: event.target.value })}
            className={`${compactInputClassName} sm:w-48`}
          >
            <option value="">Social &amp; web</option>
            <option value="social">Social only</option>
            <option value="web">Owned web only</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-full bg-sky-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Apply
        </button>

        {isFiltered(filters) ? (
          <Link
            href={buildHref(params, {
              q: null,
              stage: null,
              source: null,
              group: null,
              lead: null,
            })}
            className="text-sm font-semibold text-sky-800 underline-offset-4 hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </form>
    </section>
  );
}
