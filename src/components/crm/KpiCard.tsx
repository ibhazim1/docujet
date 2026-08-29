"use client";

import Explain from "./Explain";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { pct } from "@/lib/crm/analytics";
import { LOST_STAGE, SOURCES } from "@/lib/crm/taxonomy";

/**
 * The readings a tile can show.
 *
 * The first eight describe the book; the rest describe the work outstanding in
 * it. Both sets are kept because they answer different people's questions — a
 * rep wants to know what is going cold, an owner wants to know whether the
 * shape of the book is healthy — and a KPI row can be built for either audience
 * out of the same component.
 */
export type KpiMetric =
  | "total"
  | "topSource"
  | "social"
  | "qualified"
  | "customers"
  | "lost"
  | "open"
  | "newThisWeek"
  | "needsAction"
  | "hot"
  | "stalled"
  | "overdue"
  | "untouched"
  | "unowned";

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
  const { stats, query, filtered, queue, outstanding } = useLeadTracker();
  const filters = query.filters;

  const topSourceLabel = stats.topSource ? SOURCES[stats.topSource].label : "—";
  const topSourceCount = stats.bySource[0]?.count ?? 0;
  const hot = queue.filter((item) => item.score.band === "hot").length;

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

    // ---- Work outstanding --------------------------------------------------
    //
    // Every helper here says how many of the count are *qualified* wherever it
    // can. Twelve raw leads going quiet and twelve SQL-and-beyond leads going
    // quiet are the same number and not the same morning, and with no deal
    // values recorded this is the honest way to tell them apart.
    needsAction: {
      label: "Needs action",
      value: String(outstanding.count),
      helper:
        outstanding.qualified > 0
          ? `${outstanding.qualified} of them already qualified`
          : "none of them qualified yet",
    },
    hot: {
      label: "Hot leads",
      value: String(hot),
      helper: "scoring 70 or above, still open",
    },
    stalled: {
      label: "Going cold",
      value: String(stats.stalled),
      helper:
        stats.stalledQualified > 0
          ? `${stats.stalledQualified} of them reached SQL or beyond`
          : "all still at the early stages",
    },
    overdue: {
      label: "Overdue",
      value: String(stats.overdue),
      helper: "follow-ups committed to and missed",
    },
    untouched: {
      label: "Never contacted",
      value: String(stats.untouched),
      helper: `of ${stats.open} open leads`,
    },
    unowned: {
      label: "Unowned",
      value: String(stats.unowned),
      helper: "nobody is accountable for these",
    },
  };

  const reading = readings[metric] ?? readings.total;
  const size = valueSize ?? reading.size ?? "md";
  const filter = clickToFilter ? reading.filter : undefined;
  const active = filter?.active ?? false;

  const body = (
    <>
      {/* The dot sits with the caption rather than in a corner, because it
          explains the words — "Reached SQL+", "Going cold" — and not the tile.
          A relabelled tile keeps the explanation of the metric underneath it,
          which is the reading a designer's chosen wording most needs. */}
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
        {label || reading.label}
        <Explain term={`kpi.${metric}`} label={reading.label} />
      </p>
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
