/**
 * Query and presentation logic for the lead tracker.
 *
 * A port of `crm/lib/helpers.php` plus the arithmetic half of
 * `crm/lib/charts.php`. Everything here is a pure function over plain data —
 * no React, no `next/*` — so the same code runs on the server and in the
 * browser, and so the numbers can be diffed against the PHP original.
 *
 * ---------------------------------------------------------------------------
 * Lifecycle position vs. displayed stage
 *
 * A lead carries two separate facts: `stage`, the furthest point it reached,
 * and `lost`, whether it is still in play. Everything ordinal — sorting, the
 * funnel, "reached SQL or beyond" — reads `stage`, because a lead that died at
 * SQL still got to SQL. Everything that groups leads for display — the board
 * columns, the pipeline bar, the stage filter — reads `displayStage()`, which
 * reports Lost so closed leads stop inflating the open counts.
 *
 * Getting these the wrong way round is the whole trap: use `displayStage()`
 * in the funnel and every loss silently vanishes from the denominator.
 * ---------------------------------------------------------------------------
 */

import {
  CONTACT_KINDS,
  LOST_REASONS,
  LOST_REASON_KEYS,
  LOST_STAGE,
  OPEN_STAGE_KEYS,
  SOURCES,
  SOURCE_KEYS,
  STAGES,
  STAGE_KEYS,
  STALL_DAYS,
  stageIndex,
} from "./taxonomy";
import type {
  ContactLogEntry,
  Lead,
  LeadEvent,
  LeadFilters,
  LostReason,
  OpenStageKey,
  SortDirection,
  SortKey,
  SourceGroup,
  SourceKey,
  StageKey,
} from "./types";

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Parses a Y-m-d date at UTC midnight, so arithmetic never crosses a DST seam. */
function parseDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

/** Whole days between two Y-m-d dates. Negative when `to` is before `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / 86_400_000);
}

/** Human-readable age relative to `today`, e.g. "3 days ago". */
export function ago(date: string, today: string): string {
  const days = daysBetween(date, today);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats a Y-m-d date for display, e.g. "14 May 2026". */
export function prettyDate(date: string | null | undefined): string {
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Today as Y-m-d, honouring the `CRM_TODAY` pin used to keep demo data stable. */
export function resolveToday(pinned?: string): string {
  return pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)
    ? pinned
    : new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Lifecycle position vs. displayed stage
// ---------------------------------------------------------------------------

/** The stage a lead is displayed under: Lost when closed, otherwise its lifecycle position. */
export function displayStage(lead: Lead): StageKey {
  return lead.lost ? LOST_STAGE : lead.stage;
}

/** Sort position for a lead's displayed stage, with Lost after the whole open lifecycle. */
export function displayStageOrder(lead: Lead): number {
  return lead.lost ? OPEN_STAGE_KEYS.length : stageIndex(lead.stage);
}

// ---------------------------------------------------------------------------
// Filtering & sorting
// ---------------------------------------------------------------------------

/**
 * Applies the dashboard's filters.
 *
 * The stage filter also accepts the pseudo-stage `open`, which means "anything
 * still in play". That is the working list a rep actually wants, and it is not
 * expressible as any single stage — hence one extra option rather than a
 * second control that would duplicate `stage=lost`.
 *
 * `q` matches id, name, company, email, phone and interest.
 */
export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const q = filters.q.trim().toLowerCase();

  return leads.filter((lead) => {
    if (filters.stage !== "") {
      const shown = displayStage(lead);
      const matches =
        filters.stage === "open" ? shown !== LOST_STAGE : shown === filters.stage;
      if (!matches) return false;
    }
    if (filters.source !== "" && lead.source !== filters.source) {
      return false;
    }
    if (filters.group !== "" && SOURCES[lead.source]?.group !== filters.group) {
      return false;
    }
    if (q === "") return true;

    const haystack = [
      lead.id,
      lead.name,
      lead.company,
      lead.email,
      lead.phone,
      lead.interest,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

const SORT_KEYS: SortKey[] = [
  "name",
  "stage",
  "source",
  "created_at",
  "email",
  "score",
  "next_action_at",
];

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as string[]).includes(value);
}

function sortValue(lead: Lead, key: SortKey): string {
  switch (key) {
    case "created_at":
      return lead.createdAt;
    case "name":
      return lead.name;
    case "source":
      return lead.source;
    case "email":
      return lead.email;
    case "next_action_at":
      // Y-m-d sorts lexicographically. Leads with nothing scheduled sort last
      // ascending rather than first: "no next action" is not the earliest date,
      // it is the absence of one, and burying the actual diary under it would
      // make the column useless.
      return lead.nextActionAt ?? "9999-99-99";
    default:
      return "";
  }
}

/**
 * The extra reading the score sort needs.
 *
 * Score cannot be computed here — it depends on appointments and on the book's
 * own source statistics, which would make this module import `scoring.ts` while
 * `scoring.ts` imports this one. The caller that already holds both hands the
 * scores in; without them the column falls back to created date rather than
 * silently sorting everything equal.
 */
export type SortContext = {
  scores?: Map<string, number>;
};

/**
 * Sorts leads by a whitelisted column. Unknown columns fall back to created date.
 *
 * `desc` reverses the ascending result rather than flipping the comparator,
 * which is what the PHP does — it also reverses the order of equal elements.
 */
export function sortLeads(
  leads: Lead[],
  key: string,
  direction: SortDirection,
  ctx: SortContext = {},
): Lead[] {
  let sortKey: SortKey = isSortKey(key) ? key : "created_at";
  // Asking for the score column without supplying scores would sort every row
  // equal, which reads as "the sort is broken" rather than "the sort is
  // unavailable". Falling back to the default column is the honest failure.
  if (sortKey === "score" && ctx.scores === undefined) sortKey = "created_at";

  const sorted = [...leads].sort((a, b) => {
    // Stage sorts by lifecycle position, not alphabetically, and sorts on the
    // displayed stage so the Lost leads group together at the end rather than
    // scattering through the list at whatever stage they died.
    if (sortKey === "stage") {
      return displayStageOrder(a) - displayStageOrder(b);
    }
    if (sortKey === "score") {
      return (ctx.scores?.get(a.id) ?? 0) - (ctx.scores?.get(b.id) ?? 0);
    }
    const left = sortValue(a, sortKey);
    const right = sortValue(b, sortKey);
    return left < right ? -1 : left > right ? 1 : 0;
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}

export type Page<T> = {
  /** The rows on this page. */
  rows: T[];
  /** The page actually shown, after clamping. 1-based. */
  page: number;
  perPage: number;
  /** Rows across every page — the filtered total, not the whole book. */
  total: number;
  totalPages: number;
  /** 1-based inclusive range of `total` on show, for "showing 11-20 of 55". */
  from: number;
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

/**
 * Cuts a list into one page.
 *
 * ---------------------------------------------------------------------------
 * Clamping rather than resetting
 *
 * The page number lives in the URL, so it survives a filter change that makes
 * it impossible — sitting on page 4 and then filtering down to six results
 * would otherwise render an empty table with no hint that the rows are behind
 * you. Rather than trying to spot every such change and reset, this clamps to
 * the last real page whenever the requested one is past the end.
 *
 * That means the page shown is not always the page asked for, which is why the
 * clamped value comes back in the result: the controls bind to `page` here, not
 * to the query string, so the URL and the buttons cannot disagree.
 * ---------------------------------------------------------------------------
 *
 * An empty list is one page, not zero, so the footer can say "0 of 0" without
 * special-casing.
 */
export function paginate<T>(rows: T[], page: number, perPage: number): Page<T> {
  const size = Math.max(1, Math.floor(perPage));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (current - 1) * size;

  return {
    rows: rows.slice(start, start + size),
    page: current,
    perPage: size,
    total,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
    hasPrevious: current > 1,
    hasNext: current < totalPages,
  };
}

/** Finds one lead by id, for the detail panel. */
export function findLead(leads: Lead[], id: string): Lead | null {
  return leads.find((lead) => lead.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Aggregation — the numbers behind the KPI row and the charts
// ---------------------------------------------------------------------------

export type Summary = {
  count: number;
  byStage: Record<StageKey, number>;
  bySource: Array<{ key: SourceKey; count: number }>;
  social: number;
  socialShare: number;
  newThisWeek: number;
  customers: number;
  qualified: number;
  qualifiedRate: number;
  winRate: number;
  lost: number;
  open: number;
  lossRate: number;
  topSource: SourceKey | null;

  // -------------------------------------------------------------------------
  // Pipeline health (0006). The counts above say how big the book is; these
  // say whether anybody is working it.
  // -------------------------------------------------------------------------

  /** Open leads past the silence limit for their stage. */
  stalled: number;
  /** Of those, the ones that had reached SQL or beyond — the expensive stalls. */
  stalledQualified: number;
  /** Open leads nobody has ever contacted. */
  untouched: number;
  /** Open leads whose committed next action is past due. */
  overdue: number;
  /** Open leads with no owner. Nobody is accountable for these. */
  unowned: number;
  /** Open leads with a loss reason recorded, over all losses. Data-quality check. */
  lossReasonCoverage: number;
};

/**
 * Headline counts for the KPI row.
 *
 * Two different questions get two different counts, and conflating them is how
 * a Lost stage starts lying:
 *
 *   - `byStage` is *where leads sit now*, keyed on the displayed stage, so a
 *     lost lead counts under Lost and not under the stage it died at. This is
 *     what stops closed leads inflating the open pipeline.
 *   - `qualified` is *how far leads ever got*, so a lead that reached SQL and
 *     then fell over still counts. Dropping it would credit a source for
 *     nothing and make every channel that loses late look like one that never
 *     qualified anyone at all.
 *
 * `customers` counts only open customers — a customer marked lost has churned,
 * and counting them would inflate the win rate permanently.
 */
export function summarise(leads: Lead[], today: string): Summary {
  const byStage = Object.fromEntries(STAGE_KEYS.map((key) => [key, 0])) as Record<StageKey, number>;
  const bySourceCounts = Object.fromEntries(SOURCE_KEYS.map((key) => [key, 0])) as Record<SourceKey, number>;

  let social = 0;
  let newThisWeek = 0;
  let customers = 0;
  let qualified = 0;
  let lost = 0;
  let stalled = 0;
  let stalledQualified = 0;
  let untouched = 0;
  let overdue = 0;
  let unowned = 0;
  let lossReasonsRecorded = 0;
  const sqlIndex = stageIndex("sql");

  for (const lead of leads) {
    byStage[displayStage(lead)] += 1;
    bySourceCounts[lead.source] += 1;
    if (SOURCES[lead.source]?.group === "social") social += 1;
    if (daysBetween(lead.createdAt, today) <= 7) newThisWeek += 1;
    if (lead.lost) lost += 1;
    if (lead.stage === "customer" && !lead.lost) customers += 1;
    // Ever reached SQL — deliberately counts lost leads at the stage they got to.
    if (stageIndex(lead.stage) >= sqlIndex) qualified += 1;

    if (lead.lost) {
      if (lead.lostReason !== null) lossReasonsRecorded += 1;
      continue;
    }

    // A signed customer is not work in progress: the health counts below are
    // about deals somebody still has to move, and an account that has already
    // bought would make every one of them read worse than it is.
    if (lead.stage === "customer") continue;

    if (lead.ownerId === null) unowned += 1;
    if (lead.lastContactAt === null) untouched += 1;
    if (lead.nextActionAt !== null && daysBetween(lead.nextActionAt, today) >= 0) overdue += 1;

    const touchedAt = lead.lastContactAt ? lead.lastContactAt.slice(0, 10) : lead.createdAt;
    const silent = touchedAt ? Math.max(0, daysBetween(touchedAt, today)) : 0;
    if (silent > (STALL_DAYS[lead.stage as OpenStageKey] ?? 14)) {
      stalled += 1;
      // A qualified lead going quiet is a different problem from a raw one
      // going quiet, and the count that matters is the qualified half: those
      // are the deals somebody has already spent time earning.
      if (stageIndex(lead.stage) >= sqlIndex) stalledQualified += 1;
    }
  }

  const total = leads.length;
  // Stable descending sort, matching PHP's arsort(): ties keep declaration order.
  const bySource = SOURCE_KEYS.map((key) => ({ key, count: bySourceCounts[key] })).sort(
    (a, b) => b.count - a.count,
  );

  return {
    count: total,
    byStage,
    bySource,
    social,
    socialShare: total > 0 ? social / total : 0,
    newThisWeek,
    customers,
    qualified,
    qualifiedRate: total > 0 ? qualified / total : 0,
    winRate: total > 0 ? customers / total : 0,
    lost,
    open: total - lost,
    lossRate: total > 0 ? lost / total : 0,
    topSource: total > 0 ? bySource[0].key : null,
    stalled,
    stalledQualified,
    untouched,
    overdue,
    unowned,
    lossReasonCoverage: lost > 0 ? lossReasonsRecorded / lost : 0,
  };
}

export type SourceStat = {
  key: SourceKey;
  label: string;
  group: SourceGroup;
  total: number;
  qualified: number;
  customers: number;
  lost: number;
  byStage: Record<StageKey, number>;
  share: number;
  qualifiedRate: number;
  lossRate: number;
};

/**
 * Per-source breakdown — the primary analysis table.
 *
 * `qualifiedRate` (share reaching SQL or beyond) is the quality measure rather
 * than the customer rate: with these volumes a single won deal would swing a
 * raw conversion percentage by twenty points, which reads as signal when it is
 * noise. Volume and quality are deliberately reported side by side, because the
 * highest-volume source is rarely the highest-quality one.
 *
 * Lost leads still count towards `qualified` at the stage they reached. A
 * source that produces leads which qualify and then lose on price has a
 * closing problem; one that produces leads which never qualify at all has a
 * targeting problem. Measuring quality on open leads only would show both as
 * the same low number and hide the distinction the chart exists to make.
 */
export function sourceStats(leads: Lead[]): SourceStat[] {
  const sqlIndex = stageIndex("sql");

  const rows = new Map<SourceKey, SourceStat>(
    SOURCE_KEYS.map((key) => [
      key,
      {
        key,
        label: SOURCES[key].label,
        group: SOURCES[key].group,
        total: 0,
        qualified: 0,
        customers: 0,
        lost: 0,
        byStage: Object.fromEntries(STAGE_KEYS.map((s) => [s, 0])) as Record<StageKey, number>,
        share: 0,
        qualifiedRate: 0,
        lossRate: 0,
      },
    ]),
  );

  for (const lead of leads) {
    const row = rows.get(lead.source);
    if (!row) continue;
    row.total += 1;
    row.byStage[displayStage(lead)] += 1;
    if (stageIndex(lead.stage) >= sqlIndex) row.qualified += 1;
    if (lead.stage === "customer" && !lead.lost) row.customers += 1;
    if (lead.lost) row.lost += 1;
  }

  const total = leads.length;
  for (const row of rows.values()) {
    row.share = total > 0 ? row.total / total : 0;
    row.qualifiedRate = row.total > 0 ? row.qualified / row.total : 0;
    row.lossRate = row.total > 0 ? row.lost / row.total : 0;
  }

  return [...rows.values()].sort((a, b) => b.total - a.total);
}

export type FunnelRow = {
  key: OpenStageKey;
  label: string;
  reached: number;
  resting: number;
  lost: number;
  /** Reached over the previous stage's reached. Null on the entry row. */
  stepRate: number | null;
};

/**
 * Lifecycle funnel.
 *
 * A lead sits at exactly one stage, so "reached MQL" means "is at MQL or
 * beyond" — the counts are suffix sums, not the raw per-stage tallies. Step
 * conversion is each stage's count over the previous stage's.
 *
 * Lost leads stay in the funnel at the furthest stage they reached. Dropping
 * them would measure conversion among survivors only, so every step rate would
 * climb as deals were lost and the funnel would look best in the middle of a
 * bad quarter. Keeping them means a step rate is what it claims to be: of
 * everyone who got this far, this share went further.
 *
 * The three counts are therefore distinct and all needed:
 *   - `reached` — ever got here, open or lost. Drives the bar and the step rate.
 *   - `resting` — still open and sitting here right now. The workable pipeline.
 *   - `lost`    — closed at this stage. Where the leak actually is.
 *
 * Terminal stages are not rows: Lost is not a step in the funnel, it is an
 * exit from one, so it is reported per-stage instead of as a sixth bar.
 */
export function funnelStats(leads: Lead[]): FunnelRow[] {
  const reachedAt = Object.fromEntries(OPEN_STAGE_KEYS.map((k) => [k, 0])) as Record<OpenStageKey, number>;
  const openAt = { ...reachedAt };
  const lostAt = { ...reachedAt };

  for (const lead of leads) {
    // A lead's `stage` is always an open stage — Lost lives on the `lost` flag
    // — but an unknown key from edited data must not create an entry that
    // would shift the suffix sums.
    if (!(lead.stage in reachedAt)) continue;
    reachedAt[lead.stage] += 1;
    if (lead.lost) {
      lostAt[lead.stage] += 1;
    } else {
      openAt[lead.stage] += 1;
    }
  }

  const rows: FunnelRow[] = [];
  let previous: number | null = null;

  OPEN_STAGE_KEYS.forEach((key, i) => {
    let reached = 0;
    OPEN_STAGE_KEYS.forEach((other, j) => {
      if (j >= i) reached += reachedAt[other];
    });
    rows.push({
      key,
      label: STAGES[key].label,
      reached,
      resting: openAt[key],
      lost: lostAt[key],
      stepRate: previous !== null && previous > 0 ? reached / previous : null,
    });
    previous = reached;
  });

  return rows;
}

export type SourceShareRow = { key: SourceKey | "other"; label: string; total: number };

/**
 * Top sources by volume, tail folded into "Other".
 *
 * Feeds the source-share donut, which only has three colour slots that stay
 * pairwise distinct under CVD (see `RANK_COLORS` in `charts/tokens.ts`) — past
 * that, more wedges would need hues the palette can't safely give them.
 */
export function topSourceShares(rows: SourceStat[], limit: number): SourceShareRow[] {
  const top: SourceShareRow[] = rows
    .slice(0, limit)
    .map((row) => ({ key: row.key, label: row.label, total: row.total }));
  const rest = rows.slice(limit).reduce((sum, row) => sum + row.total, 0);
  return rest > 0 ? [...top, { key: "other", label: "Other", total: rest }] : top;
}

export type ActiveLostRow = { key: "active" | "lost"; label: string; count: number };

/** Leads currently in play versus closed lost. */
export function activeVsLost(leads: Lead[]): ActiveLostRow[] {
  const lost = leads.filter((lead) => lead.lost).length;
  return [
    { key: "active", label: "Active", count: leads.length - lost },
    { key: "lost", label: "Lost", count: lost },
  ];
}

export type StageShareRow = { key: OpenStageKey; label: string; count: number };

/**
 * Where active (non-lost) leads currently sit, one row per open stage.
 *
 * Only leads still in play are counted — a lead's `lost` flag freezes its
 * `stage`, so a lost lead's last stage is not "where it currently sits"; that
 * split is `activeVsLost`'s job, not this one's.
 */
export function activeStageBreakdown(leads: Lead[]): StageShareRow[] {
  const counts = Object.fromEntries(OPEN_STAGE_KEYS.map((key) => [key, 0])) as Record<
    OpenStageKey,
    number
  >;
  for (const lead of leads) {
    if (!lead.lost) counts[lead.stage] += 1;
  }
  return OPEN_STAGE_KEYS.map((key) => ({ key, label: STAGES[key].label, count: counts[key] }));
}

export type MonthlyRow = { key: string; label: string; count: number };

/** Leads created per calendar month, oldest first, with empty months filled in. */
export function monthlyStats(leads: Lead[]): MonthlyRow[] {
  if (leads.length === 0) return [];

  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.createdAt.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keys = [...counts.keys()].sort();
  const [firstYear, firstMonth] = keys[0].split("-").map(Number);
  const [lastYear, lastMonth] = keys[keys.length - 1].split("-").map(Number);

  const rows: MonthlyRow[] = [];
  let year = firstYear;
  let month = firstMonth;
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    rows.push({ key, label: MONTHS[month - 1], count: counts.get(key) ?? 0 });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Cause and pace — the aggregates that turn the book into a decision
// ---------------------------------------------------------------------------

export type LossReasonRow = {
  key: LostReason | "unrecorded";
  label: string;
  owner: "commercial" | "targeting" | "process" | "unknown";
  count: number;
  share: number;
  /**
   * How many of these had reached SQL or beyond before they died.
   *
   * The severity measure, in the absence of deal values. Losing five raw leads
   * because they were never a fit costs an hour; losing two that had been
   * qualified, demoed and quoted costs weeks — and a chart ranked on the raw
   * count alone would put the cheap problem first.
   */
  qualified: number;
};

/**
 * Why deals died, and what that cost.
 *
 * The single most valuable report a small sales team can have, and the one this
 * app could not produce until `lost_reason` existed: it converts losses from
 * something that merely happened into a ranked list of things to fix.
 *
 * `unrecorded` is carried as a row rather than dropped. Losses closed before
 * the column existed — or by a rep who skipped the prompt — are not a cause,
 * they are a hole in the data, and hiding them would make the percentages of
 * the real causes wrong in a way nobody could see. When that row is large, the
 * finding is about the process, not the market.
 *
 * Sorted by how many qualified deals each cause killed, then by raw count:
 * losing leads that had already reached SQL is a more expensive failure than
 * losing ones that never got off the ground, and the ranking should say so.
 */
export function lossReasonStats(leads: Lead[]): LossReasonRow[] {
  const sqlIndex = stageIndex("sql");
  const counts = new Map<LostReason | "unrecorded", { count: number; qualified: number }>();
  let total = 0;

  for (const lead of leads) {
    if (!lead.lost) continue;
    total += 1;
    const key = lead.lostReason ?? "unrecorded";
    const row = counts.get(key) ?? { count: 0, qualified: 0 };
    row.count += 1;
    if (stageIndex(lead.stage) >= sqlIndex) row.qualified += 1;
    counts.set(key, row);
  }

  const rows: LossReasonRow[] = [];
  for (const key of [...LOST_REASON_KEYS, "unrecorded" as const]) {
    const row = counts.get(key);
    if (row === undefined) continue;
    rows.push({
      key,
      label: key === "unrecorded" ? "Not recorded" : LOST_REASONS[key].label,
      owner: key === "unrecorded" ? "unknown" : LOST_REASONS[key].owner,
      count: row.count,
      share: total > 0 ? row.count / total : 0,
      qualified: row.qualified,
    });
  }

  return rows.sort((a, b) => b.qualified - a.qualified || b.count - a.count);
}


export type VelocityRow = {
  key: OpenStageKey;
  label: string;
  /** Open leads currently parked here. */
  count: number;
  /** Mean days they have been sitting, since the stage last moved. */
  avgDays: number;
  /** The longest-parked one. Averages hide the deal that has been stuck a year. */
  maxDays: number;
  /** What this stage tolerates, from `STALL_DAYS`. */
  threshold: number;
};

/**
 * How long open deals have been sitting where they are.
 *
 * Measured from `stage_changed_at`, not `created_at`. A lead that arrived in
 * January and was promoted to Opportunity yesterday has been at Opportunity for
 * one day, and a report that called it eight months old would send a rep to
 * rescue a deal that is moving perfectly well.
 *
 * This is dwell time, not cycle time: it says how long the deals still here
 * have been here, which is the actionable question. Cycle time — how long won
 * deals took end to end — needs `lead_events` history to accumulate first, and
 * is the right measure once it has.
 */
export function stageVelocity(leads: Lead[], today: string): VelocityRow[] {
  const buckets = new Map<OpenStageKey, number[]>(OPEN_STAGE_KEYS.map((key) => [key, []]));

  for (const lead of leads) {
    if (lead.lost) continue;
    const bucket = buckets.get(lead.stage as OpenStageKey);
    if (!bucket) continue;
    // No stamp means the row predates 0006 and was never backfilled; the arrival
    // date is the only honest fallback, and it over-states rather than invents.
    const since = lead.stageChangedAt ? lead.stageChangedAt.slice(0, 10) : lead.createdAt;
    if (!since) continue;
    bucket.push(Math.max(0, daysBetween(since, today)));
  }

  return OPEN_STAGE_KEYS.map((key) => {
    const days = buckets.get(key) ?? [];
    return {
      key,
      label: STAGES[key].label,
      count: days.length,
      avgDays: days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : 0,
      maxDays: days.length > 0 ? Math.max(...days) : 0,
      threshold: STALL_DAYS[key],
    };
  });
}


/**
 * The contact log: every recorded interaction, newest first.
 *
 * ---------------------------------------------------------------------------
 * Derived, not fetched
 *
 * This joins the events the tracker already holds to the leads it already
 * holds, in the browser, rather than asking the database for a third view of
 * the same rows. That is not only cheaper — it is what makes the log obey the
 * filter bar. On a page where the KPI tiles, the charts and the table all
 * narrow to the current filters, a section that silently ignored them would
 * look broken, and "who has been calling our LinkedIn leads" is a real
 * question the filters can now answer.
 *
 * Only the kinds that are actually a conversation are included — see
 * `CONTACT_KINDS`. A lead whose event references a row not in `leads` is
 * dropped rather than rendered against a blank name: with the filters applied
 * that is the normal case, not an error.
 * ---------------------------------------------------------------------------
 */
export function buildContactLog(leads: Lead[], events: LeadEvent[]): ContactLogEntry[] {
  const byId = new Map(leads.map((lead) => [lead.id, lead]));

  return events
    .filter((event) => CONTACT_KINDS.includes(event.kind) && byId.has(event.leadId))
    .map((event) => {
      const lead = byId.get(event.leadId)!;
      return {
        id: event.id,
        at: event.at,
        leadId: lead.id,
        leadName: lead.name || lead.id,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        kind: event.kind,
        actorName: event.actorName,
        detail: event.detail,
      };
    })
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

// ---------------------------------------------------------------------------
// Chart arithmetic
// ---------------------------------------------------------------------------

/** Percentage of a maximum, guarding against division by zero. */
export function pctOf(value: number, max: number): number {
  return max > 0 ? (value / max) * 100 : 0;
}

/** Formats a 0..1 ratio as a whole percentage. */
export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Rounds an axis maximum up to a clean number.
 *
 * The top is forced to a multiple of twice the unit, so the midpoint tick is a
 * round number too — otherwise a max of 32 yields ticks of 35 / 17.5 / 0.
 */
export function niceTop(max: number): number {
  const unit = max <= 10 ? 1 : max <= 20 ? 2 : max <= 50 ? 5 : 10;
  const step = unit * 2;
  return Math.ceil(max / step) * step;
}

/** Five-bin heat level for the source × stage matrix. 0 stays blank. */
export function heatBin(count: number, max: number): number {
  return count === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 5));
}
