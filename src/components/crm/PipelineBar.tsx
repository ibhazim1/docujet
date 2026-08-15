"use client";

import Link from "next/link";
import type { Summary } from "@/lib/crm/analytics";
import { toggleHref } from "@/lib/crm/query";
import { STAGES, STAGE_KEYS } from "@/lib/crm/taxonomy";
import type { LeadFilters } from "@/lib/crm/types";

type PipelineBarProps = {
  stats: Summary;
  filters: LeadFilters;
  params: URLSearchParams;
};

/**
 * Where the book sits right now, one tile per stage.
 *
 * Counts key off the *displayed* stage, so a lost lead shows under Lost rather
 * than inflating the stage it died at. Every tile toggles that stage as a
 * filter. The Lost tile is dashed because it is an exit from the lifecycle,
 * not a step in it.
 */
export default function PipelineBar({ stats, filters, params }: PipelineBarProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {STAGE_KEYS.map((key) => {
        const stage = STAGES[key];
        const count = stats.byStage[key];
        const fill = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;
        const isActive = filters.stage === key;

        return (
          <Link
            key={key}
            href={toggleHref(params, "stage", key, { lead: null })}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-3xl border bg-white p-4 shadow-sm transition hover:border-slate-400 ${
              stage.terminal ? "border-dashed" : ""
            } ${isActive ? "border-sky-800 ring-2 ring-sky-100" : "border-slate-200"}`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-500">{stage.label}</span>
              <span className="text-2xl font-semibold tracking-tight text-slate-950">
                {count}
              </span>
            </span>
            <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full"
                style={{ width: `${fill}%`, backgroundColor: stage.light }}
              />
            </span>
          </Link>
        );
      })}
    </section>
  );
}
