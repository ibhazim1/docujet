"use client";

import StatCard from "@/components/admin/StatCard";
import type { Summary } from "@/lib/crm/analytics";
import { pct } from "@/lib/crm/analytics";
import { toggleHref } from "@/lib/crm/query";
import { LOST_STAGE, SOURCES } from "@/lib/crm/taxonomy";
import type { LeadFilters } from "@/lib/crm/types";

type KpiRowProps = {
  stats: Summary;
  filters: LeadFilters;
  params: URLSearchParams;
};

/**
 * The six headline tiles.
 *
 * "From social" and "Lost" are links that toggle a filter — the two readings a
 * rep most often wants to drill into, and the only two that map cleanly onto a
 * single filter value.
 */
export default function KpiRow({ stats, filters, params }: KpiRowProps) {
  const topSourceLabel = stats.topSource ? SOURCES[stats.topSource].label : "—";
  const topSourceCount = stats.bySource[0]?.count ?? 0;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <StatCard
        label="Total leads"
        value={String(stats.count)}
        helper={`${stats.newThisWeek} added this week`}
      />
      <StatCard
        label="Top source"
        value={topSourceLabel}
        valueSize="sm"
        helper={stats.topSource ? `${topSourceCount} leads` : "no data"}
      />
      <StatCard
        label="From social"
        value={pct(stats.socialShare)}
        helper={`${stats.social} leads · ${
          filters.group === "social" ? "filtering — clear" : "click to filter"
        }`}
        href={toggleHref(params, "group", "social", { lead: null })}
        active={filters.group === "social"}
      />
      <StatCard
        label="Reached SQL+"
        value={pct(stats.qualifiedRate)}
        helper={`${stats.qualified} of ${stats.count} ever qualified`}
      />
      <StatCard
        label="Customers"
        value={String(stats.customers)}
        helper={`${pct(stats.winRate)} of all leads`}
      />
      <StatCard
        label="Lost"
        value={String(stats.lost)}
        helper={`${pct(stats.lossRate)} of all leads · ${stats.open} still open`}
        href={toggleHref(params, "stage", LOST_STAGE, { lead: null })}
        active={filters.stage === LOST_STAGE}
      />
    </section>
  );
}
