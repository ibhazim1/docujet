"use client";

import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { pct } from "@/lib/crm/analytics";
import { LOST_STAGE, SOURCES } from "@/lib/crm/taxonomy";

/** The readings a tile can show. Each is a fact the summary already computes. */
export type KpiMetric =
  | "total"
  | "topSource"
  | "social"
  | "qualified"
  | "customers"
  | "lost"
  | "open"
  | "newThisWeek";

export type KpiCardProps = {
  metric?: KpiMetric;
  /** Overrides the built-in caption. */
  label?: string;
  /** Overrides the built-in sub-line. */
  helper?: string;
  /** `sm` suits a word; `md` suits a number. Follows the metric when unset. */
  valueSize?: "md" | "sm";
  /**
   * Whether the tile toggles its filter when clicked. Only the two metrics that
   * map onto a single filter value can — the rest ignore it.
   */
  clickToFilter?: boolean;
  className?: string;
};

/**
 * One headline tile.
 *
 * Registered on its own so a designer can build any KPI row they want: add a
 * tile, pick a different reading, relabel it, drop the ones they do not care
 * about. The numbers all come from the tracker, so a tile is correct wherever
 * it is placed.
 */
export default function KpiCard({
  metric = "total",
  label,
  helper,
  valueSize,
  clickToFilter = true,
  className = "",
}: KpiCardProps) {
  const { stats, query, filtered } = useLeadTracker();
  const filters = query.filters;

  const topSourceLabel = stats.topSource ? SOURCES[stats.topSource].label : "—";
  const topSourceCount = stats.bySource[0]?.count ?? 0;

  const readings: Record<
    KpiMetric,
    {
      label: string;
      value: string;
      helper: string;
      size?: "sm";
      filter?: { key: string; value: string; active: boolean };
    }
  > = {
    total: {
      label: "Total leads",
      value: String(stats.count),
      helper: `${stats.newThisWeek} added this week`,
    },
    topSource: {
      label: "Top source",
      value: topSourceLabel,
      helper: stats.topSource ? `${topSourceCount} leads` : "no data",
      size: "sm",
    },
    social: {
      label: "From social",
      value: pct(stats.socialShare),
      helper: `${stats.social} leads · ${
        filters.group === "social" ? "filtering — clear" : "click to filter"
      }`,
      filter: { key: "group", value: "social", active: filters.group === "social" },
    },
    qualified: {
      label: "Reached SQL+",
      value: pct(stats.qualifiedRate),
      helper: `${stats.qualified} of ${stats.count} ever qualified`,
    },
    customers: {
      label: "Customers",
      value: String(stats.customers),
      helper: `${pct(stats.winRate)} of all leads`,
    },
    lost: {
      label: "Lost",
      value: String(stats.lost),
      helper: `${pct(stats.lossRate)} of all leads · ${stats.open} still open`,
      filter: { key: "stage", value: LOST_STAGE, active: filters.stage === LOST_STAGE },
    },
    open: {
      label: "Still open",
      value: String(stats.open),
      helper: filtered ? "within the current filters" : "across the whole book",
    },
    newThisWeek: {
      label: "New this week",
      value: String(stats.newThisWeek),
      helper: `of ${stats.count} leads shown`,
    },
  };

  const reading = readings[metric] ?? readings.total;
  const size = valueSize ?? reading.size ?? "md";
  const filter = clickToFilter ? reading.filter : undefined;
  const active = filter?.active ?? false;

  const body = (
    <>
      <p className="text-sm font-medium text-slate-500">{label || reading.label}</p>
      <p
        className={`mt-3 font-semibold tracking-tight text-slate-950 ${
          size === "sm" ? "text-xl" : "text-3xl"
        }`}
      >
        {reading.value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{helper || reading.helper}</p>
    </>
  );

  const shell = `block rounded-3xl border bg-white p-5 shadow-sm ${
    active ? "border-sky-800 ring-2 ring-sky-100" : "border-slate-200"
  } ${className}`;

  if (filter) {
    return (
      <TrackerLink
        overrides={{
          [filter.key]: filter.active ? null : filter.value,
          lead: null,
        }}
        className={`${shell} transition hover:border-slate-400`}
      >
        {body}
      </TrackerLink>
    );
  }

  return <section className={shell}>{body}</section>;
}
