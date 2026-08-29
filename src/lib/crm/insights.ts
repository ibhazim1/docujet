/**
 * The verdict engine.
 *
 * Nine charts told the business what its numbers were. None of them said what
 * was wrong or what to do, which is the difference between a dashboard people
 * open once and one they run a meeting from. This module reads the same
 * aggregates the charts do and returns findings: a statement of what is true, a
 * statement of what it costs, and one thing to change.
 *
 * ---------------------------------------------------------------------------
 * Three rules every finding here obeys
 *
 *   1. **It carries its evidence.** Never "Instagram is underperforming" —
 *      always "Instagram: 9 leads, 1 reached SQL (11%), against 34% across the
 *      book". A finding that cannot be checked cannot be trusted, and a finding
 *      nobody trusts changes nothing.
 *
 *   2. **It is weighed in qualified leads, not in money.** This business does
 *      not record what a deal is worth, so any ringgit figure here would be a
 *      per-model guess dressed as revenue — and the one number people would
 *      quote onward. `scale` counts the qualified leads a finding concerns
 *      instead: leads that reached SQL or beyond are the ones somebody has
 *      already spent real time earning, which is the closest thing to cost the
 *      book honestly holds.
 *
 *   3. **It suppresses itself on thin data.** Every threshold below exists so a
 *      book of forty leads does not generate confident findings out of two-lead
 *      samples. Silence is a better answer than noise wearing a percentage.
 * ---------------------------------------------------------------------------
 */

import {
  activeStageBreakdown,
  funnelStats,
  lossReasonStats,
  pct,
  sourceStats,
  stageVelocity,
  type FunnelRow,
  type LossReasonRow,
  type SourceStat,
  type Summary,
  type VelocityRow,
} from "./analytics";
import { LOST_REASONS, STAGES } from "./taxonomy";
import type { Lead } from "./types";

export type InsightSeverity = "critical" | "warning" | "opportunity" | "good";

export type Insight = {
  key: string;
  severity: InsightSeverity;
  /** The headline. A claim, not a topic. */
  title: string;
  /** The evidence, with the numbers in it. */
  finding: string;
  /** One thing to change. Imperative. */
  action: string;
  /**
   * How much is riding on it, counted in qualified leads — those that reached
   * SQL or beyond. Null when the finding concerns nothing countable that way.
   * Used for ranking; never rendered as a headline figure, because "4" is a
   * sorting key and not a sentence.
   */
  scale: number | null;
  /** Query string that opens the tracker on the leads behind the finding. */
  href: string | null;
};

export type InsightContext = {
  today: string;
  stats: Summary;
  /** Unanswered chat questions, from `chat_questions`. Absent when unavailable. */
  kbGaps?: { total: number; topTheme: string | null };
};

/** Below this many leads a source rate is noise, not a track record. */
const MIN_SOURCE_SAMPLE = 6;
/** Below this many closed deals a loss-reason split says nothing. */
const MIN_LOSS_SAMPLE = 4;

function severityRank(severity: InsightSeverity): number {
  return { critical: 0, warning: 1, opportunity: 2, good: 3 }[severity];
}

// ---------------------------------------------------------------------------
// The findings
// ---------------------------------------------------------------------------

/** Work nobody has moved. The most common quiet loss. */
function stallFinding(stats: Summary): Insight | null {
  if (stats.stalled === 0) return null;
  const share = stats.open > 0 ? stats.stalled / stats.open : 0;
  return {
    key: "stalled",
    severity: stats.stalledQualified >= 3 || share > 0.4 ? "critical" : "warning",
    title: `${stats.stalled} open leads have gone quiet`,
    finding:
      `${pct(share)} of the open book is past the silence limit for its stage` +
      (stats.stalledQualified > 0
        ? `, and ${stats.stalledQualified} of them had already reached SQL or beyond — deals somebody has spent real time earning.`
        : "."),
    action: "Work the Going cold play today, or close them so they stop counting as pipeline.",
    scale: stats.stalledQualified,
    href: "?view=today&play=going-cold",
  };
}

/** Leads bought and never called. The purest waste in the book. */
function untouchedFinding(stats: Summary): Insight | null {
  if (stats.untouched === 0) return null;
  const share = stats.open > 0 ? stats.untouched / stats.open : 0;
  if (share < 0.1) return null;
  return {
    key: "untouched",
    severity: share > 0.3 ? "critical" : "warning",
    title: `${stats.untouched} leads have never been contacted`,
    finding:
      `${pct(share)} of open leads have no recorded contact. ` +
      `The acquisition cost on these is already spent.`,
    action: "Clear the Hot and never contacted play first — it is the cheapest revenue available.",
    scale: null,
    href: "?view=today&play=hot-untouched",
  };
}

/** A promise the team made and did not keep. */
function overdueFinding(stats: Summary): Insight | null {
  if (stats.overdue === 0) return null;
  return {
    key: "overdue",
    severity: "critical",
    title: `${stats.overdue} follow-ups are past due`,
    finding:
      "These are commitments the team made to a next step and the date has passed. " +
      "A missed follow-up costs credibility as well as the deal.",
    action: "Clear them, or move the dates and record why.",
    scale: null,
    href: "?view=today&play=overdue",
  };
}

/** Where the funnel actually leaks. */
function funnelFinding(rows: FunnelRow[]): Insight | null {
  const steps = rows.filter((row) => row.stepRate !== null && row.reached > 0);
  if (steps.length === 0) return null;

  const worst = steps.reduce((a, b) => ((a.stepRate ?? 1) < (b.stepRate ?? 1) ? a : b));
  const rate = worst.stepRate ?? 0;
  if (rate > 0.5) return null;

  const previous = rows[rows.findIndex((row) => row.key === worst.key) - 1];
  return {
    key: "funnel-leak",
    severity: rate < 0.25 ? "critical" : "warning",
    title: `The pipeline leaks hardest at ${previous?.label ?? "the previous stage"} → ${worst.label}`,
    finding:
      `Only ${pct(rate)} of leads that reached ${previous?.label ?? "the previous stage"} ` +
      `go on to ${worst.label}.` +
      (worst.lost > 0
        ? ` ${worst.lost} died at ${worst.label} outright.`
        : " The rest are still sitting there."),
    action:
      worst.key === "sql" || worst.key === "mql"
        ? "Fix qualification: the leads arriving are not the leads being sold to."
        : "Fix the close: these deals are qualified and still not landing.",
    scale: worst.lost,
    href: `?stage=${worst.key}&view=table`,
  };
}

/** A channel taking follow-up time and returning nothing. */
function sourceQualityFinding(sources: SourceStat[], stats: Summary): Insight | null {
  const eligible = sources.filter((row) => row.total >= MIN_SOURCE_SAMPLE);
  if (eligible.length < 2) return null;

  const worst = eligible.reduce((a, b) => (a.qualifiedRate < b.qualifiedRate ? a : b));
  if (worst.qualifiedRate >= stats.qualifiedRate * 0.6) return null;

  return {
    key: `source-quality-${worst.key}`,
    severity: "opportunity",
    title: `${worst.label} produces volume without qualification`,
    finding:
      `${worst.total} leads, ${worst.qualified} of which reached SQL (${pct(worst.qualifiedRate)}), ` +
      `against ${pct(stats.qualifiedRate)} across the book. ` +
      `It is ${pct(worst.share)} of lead volume and follow-up time.`,
    action: `Retarget or cut ${worst.label}, and move the effort to the channels that qualify.`,
    scale: null,
    href: `?source=${worst.key}&view=table`,
  };
}

/** The best channel nobody is leaning on. */
function sourceOpportunityFinding(sources: SourceStat[], stats: Summary): Insight | null {
  const eligible = sources.filter((row) => row.total >= MIN_SOURCE_SAMPLE);
  if (eligible.length < 2) return null;

  const best = eligible.reduce((a, b) => (a.qualifiedRate > b.qualifiedRate ? a : b));
  if (best.qualifiedRate <= stats.qualifiedRate * 1.3) return null;
  // Only worth saying when the best channel is not already the biggest one —
  // otherwise the advice is "keep doing what you are doing".
  if (best.share > 0.3) return null;

  return {
    key: `source-opportunity-${best.key}`,
    severity: "opportunity",
    title: `${best.label} qualifies better than anything else and is underused`,
    finding:
      `${pct(best.qualifiedRate)} of its ${best.total} leads reach SQL, against ` +
      `${pct(stats.qualifiedRate)} overall — but it is only ${pct(best.share)} of volume.`,
    action: `Put more into ${best.label}. It is the highest-converting channel in the book.`,
    scale: null,
    href: `?source=${best.key}&view=table`,
  };
}

/** What is killing deals, and whose problem it is. */
function lossFinding(rows: LossReasonRow[], stats: Summary): Insight | null {
  if (stats.lost < MIN_LOSS_SAMPLE) return null;

  const recorded = rows.filter((row) => row.key !== "unrecorded");
  if (recorded.length === 0) return null;

  const top = recorded[0];
  if (top.share < 0.25) return null;

  const def = top.key === "unrecorded" ? null : LOST_REASONS[top.key];
  return {
    key: `loss-${top.key}`,
    severity: top.share > 0.4 ? "critical" : "warning",
    title: `${pct(top.share)} of losses come down to one cause: ${top.label.toLowerCase()}`,
    finding:
      `${top.count} of ${stats.lost} closed-lost leads cite ${top.label.toLowerCase()}` +
      (top.qualified > 0
        ? `, and ${top.qualified} had reached SQL or beyond before dying.`
        : ".") +
      ` That is a ${def?.owner ?? "process"} problem, not bad luck.`,
    action: def?.fix ?? "Investigate the pattern behind these losses.",
    scale: top.qualified,
    href: "?stage=lost&view=table",
  };
}

/** The data-quality finding that makes the one above possible. */
function lossCoverageFinding(stats: Summary): Insight | null {
  if (stats.lost < MIN_LOSS_SAMPLE) return null;
  if (stats.lossReasonCoverage >= 0.7) return null;

  const missing = Math.round(stats.lost * (1 - stats.lossReasonCoverage));
  return {
    key: "loss-coverage",
    severity: "warning",
    title: `${missing} losses were closed without a reason`,
    finding:
      `Only ${pct(stats.lossReasonCoverage)} of closed-lost deals record why. ` +
      `Until that is most of them, the loss analysis is describing a minority of the evidence.`,
    action: "Record a reason on every close. It is one click and it is the whole dataset.",
    scale: null,
    href: "?stage=lost&view=table",
  };
}

/**
 * A pipeline resting on almost nothing qualified.
 *
 * The replacement for a value-concentration finding. Without deal values there
 * is no way to say "three deals are 60% of the forecast", but the underlying
 * risk is still measurable and arguably better measured this way: a book with
 * two hundred leads and four qualified ones is one bad week from an empty
 * quarter, whatever those four turn out to be worth.
 */
function thinPipelineFinding(leads: Lead[], stats: Summary): Insight | null {
  if (stats.open < 10) return null;

  const lateStage = leads.filter(
    (lead) => !lead.lost && (lead.stage === "sql" || lead.stage === "opportunity"),
  ).length;
  if (lateStage > 5) return null;

  return {
    key: "thin-pipeline",
    severity: lateStage <= 2 ? "critical" : "warning",
    title:
      lateStage === 0
        ? "Nothing is close to closing"
        : `Only ${lateStage} open ${lateStage === 1 ? "lead is" : "leads are"} near a decision`,
    finding:
      `${stats.open} leads are open and ${lateStage} of them sit at SQL or Opportunity. ` +
      `Everything else still has the whole cycle to run, so the next quarter rests on very few conversations.`,
    action: "Qualify the middle of the book upward before adding more at the top.",
    scale: lateStage,
    href: "?stage=sql&view=table",
  };
}

/** Deals parked far past what the stage tolerates. */
function velocityFinding(rows: VelocityRow[]): Insight | null {
  const worst = rows
    .filter((row) => row.count > 0 && row.avgDays > row.threshold * 1.5)
    .sort((a, b) => b.avgDays / b.threshold - a.avgDays / a.threshold)[0];
  if (!worst) return null;

  return {
    key: `velocity-${worst.key}`,
    severity: "warning",
    title: `Deals are parking at ${worst.label}`,
    finding:
      `${worst.count} open leads have sat at ${worst.label} for ${Math.round(worst.avgDays)} days on ` +
      `average against a ${worst.threshold}-day limit; the oldest is ${worst.maxDays} days.`,
    action: `Review what is blocking progression out of ${worst.label} — this is where the pipeline ages.`,
    scale: null,
    href: `?stage=${worst.key}&view=table`,
  };
}

/** Nobody is accountable for these. */
function ownershipFinding(stats: Summary): Insight | null {
  if (stats.unowned === 0) return null;
  const share = stats.open > 0 ? stats.unowned / stats.open : 0;
  if (share < 0.25) return null;

  return {
    key: "unowned",
    severity: "warning",
    title: `${stats.unowned} open leads have no owner`,
    finding:
      `${pct(share)} of the open book is unassigned. Work that belongs to everybody gets done by nobody.`,
    action: "Assign an owner to every open lead. Unowned leads are the ones that go quiet.",
    scale: null,
    href: "?view=table",
  };
}

/** Questions the assistant could not answer are demand nobody served. */
function knowledgeGapFinding(ctx: InsightContext): Insight | null {
  const gaps = ctx.kbGaps;
  if (!gaps || gaps.total < 5) return null;

  return {
    key: "kb-gap",
    severity: "opportunity",
    title: `${gaps.total} visitor questions went unanswered`,
    finding:
      `The assistant had no knowledge-base entry for these` +
      (gaps.topTheme ? `; the most common theme is "${gaps.topTheme}"` : "") +
      `. Each one is a buyer who asked something and left without an answer.`,
    action: "Add these to the knowledge base in Settings. Answering them converts the next visitor.",
    scale: null,
    href: null,
  };
}

/** Something is going right. A panel of only bad news gets tuned out. */
function goodFinding(stats: Summary, sources: SourceStat[]): Insight | null {
  if (stats.customers === 0) return null;
  const best = sources
    .filter((row) => row.customers > 0)
    .sort((a, b) => b.customers - a.customers)[0];

  return {
    key: "won",
    severity: "good",
    title: `${stats.customers} leads have become customers`,
    finding:
      `${pct(stats.winRate)} of the whole book has closed` +
      (best ? `, with ${best.label} producing the most (${best.customers}).` : "."),
    action: best
      ? `Whatever is working on ${best.label}, do more of it.`
      : "Keep the current approach.",
    scale: stats.customers,
    href: "?stage=customer&view=table",
  };
}

/**
 * Every finding worth showing, ranked.
 *
 * Severity first, then how many qualified leads it concerns. An earlier version
 * ranked on money, which was the right instinct and the wrong data: the figures
 * came from per-model estimates nobody had measured, so the order of this panel
 * was decided by an assumption. Severity is a judgement stated openly in each
 * finding above, and `scale` breaks ties with something the book actually
 * knows.
 *
 * Good news sorts last regardless. A panel titled "what to do about it" that
 * opens with a congratulation is one people stop reading.
 */
export function buildInsights(leads: Lead[], ctx: InsightContext): Insight[] {
  const stats = ctx.stats;

  const sources = sourceStats(leads);
  const funnel = funnelStats(leads);
  const losses = lossReasonStats(leads);
  const velocity = stageVelocity(leads, ctx.today);

  const found = [
    overdueFinding(stats),
    stallFinding(stats),
    untouchedFinding(stats),
    lossFinding(losses, stats),
    funnelFinding(funnel),
    thinPipelineFinding(leads, stats),
    sourceQualityFinding(sources, stats),
    sourceOpportunityFinding(sources, stats),
    velocityFinding(velocity),
    ownershipFinding(stats),
    lossCoverageFinding(stats),
    knowledgeGapFinding(ctx),
    goodFinding(stats, sources),
  ].filter((insight): insight is Insight => insight !== null);

  return found.sort((a, b) => {
    const good = Number(a.severity === "good") - Number(b.severity === "good");
    if (good !== 0) return good;

    const bySeverity = severityRank(a.severity) - severityRank(b.severity);
    if (bySeverity !== 0) return bySeverity;

    return (b.scale ?? 0) - (a.scale ?? 0);
  });
}

// ---------------------------------------------------------------------------
// Chart verdicts
// ---------------------------------------------------------------------------

/**
 * The one line that turns a chart into a statement.
 *
 * Each chart already renders its numbers correctly and leaves the reader to
 * work out what they mean. These are the sentence a analyst would say standing
 * next to it — not a restatement of the tallest bar, but the comparison that
 * makes the shape worth looking at. Returns null when the data does not support
 * saying anything, which is better than a hedge.
 */
export type ChartKey =
  | "sourceVolume"
  | "sourceQuality"
  | "funnel"
  | "monthly"
  | "sourceStage"
  | "socialSplit"
  | "sourceShare"
  | "activeLost"
  | "stageShare"
  | "lossReason"
  | "velocity";

export type ChartInsightInput = {
  leads: Lead[];
  stats: Summary;
  sources: SourceStat[];
  today: string;
};

export function chartInsight(key: ChartKey, input: ChartInsightInput): string | null {
  const { leads, stats, sources, today } = input;
  if (leads.length === 0) return null;

  const eligible = sources.filter((row) => row.total >= MIN_SOURCE_SAMPLE);

  switch (key) {
    case "sourceVolume": {
      if (!stats.topSource) return null;
      const top = sources[0];
      return (
        `${top.label} supplies ${pct(top.share)} of all leads. Volume is not quality — ` +
        `read this beside the chart to its right before moving any budget.`
      );
    }

    case "sourceQuality": {
      if (eligible.length < 2) return "Not enough leads per channel yet to rank quality reliably.";
      const best = eligible.reduce((a, b) => (a.qualifiedRate > b.qualifiedRate ? a : b));
      const worst = eligible.reduce((a, b) => (a.qualifiedRate < b.qualifiedRate ? a : b));
      if (best.key === worst.key) return null;
      return (
        `${best.label} qualifies at ${pct(best.qualifiedRate)} and ${worst.label} at ` +
        `${pct(worst.qualifiedRate)} — the same effort is worth ` +
        `${(best.qualifiedRate / Math.max(worst.qualifiedRate, 0.01)).toFixed(1)}x more on ${best.label}.`
      );
    }

    case "funnel": {
      const steps = funnelStats(leads).filter((row) => row.stepRate !== null);
      if (steps.length === 0) return null;
      const worst = steps.reduce((a, b) => ((a.stepRate ?? 1) < (b.stepRate ?? 1) ? a : b));
      return (
        `The narrowest step is into ${worst.label} at ${pct(worst.stepRate ?? 0)}. ` +
        `${worst.lost} deals died at ${worst.label} — that is where a fix pays the most.`
      );
    }

    case "monthly": {
      const rows = leads.length > 0 ? monthlyTrend(leads) : null;
      if (!rows) return null;
      return rows;
    }

    case "sourceStage":
      return "Read across a row for a channel that produces leads and never progresses them.";

    case "socialSplit": {
      const socialRows = sources.filter((row) => row.group === "social" && row.total > 0);
      const socialQualified = socialRows.reduce((sum, row) => sum + row.qualified, 0);
      const socialTotal = socialRows.reduce((sum, row) => sum + row.total, 0);
      if (socialTotal === 0) return null;
      const socialRate = socialQualified / socialTotal;
      const direction = socialRate >= stats.qualifiedRate ? "better" : "worse";
      return (
        `Social is ${pct(stats.socialShare)} of volume and qualifies at ${pct(socialRate)} — ` +
        `${direction} than the ${pct(stats.qualifiedRate)} book average.`
      );
    }

    case "sourceShare": {
      const top = sources[0];
      if (!top || top.share < 0.4) return null;
      return `${top.label} alone is ${pct(top.share)} of the book. One channel failing would halve intake.`;
    }

    case "activeLost": {
      if (stats.lost === 0) return null;
      const qualifiedLosses = lossReasonStats(leads).reduce((sum, row) => sum + row.qualified, 0);
      return (
        `${pct(stats.lossRate)} of the book is closed lost` +
        (qualifiedLosses > 0
          ? `, and ${qualifiedLosses} of those had reached SQL or beyond before dying.`
          : ", none of it past the early stages.")
      );
    }

    case "stageShare": {
      const rows = activeStageBreakdown(leads);
      const open = rows.reduce((sum, row) => sum + row.count, 0);
      if (open === 0) return null;
      const atLead = rows.find((row) => row.key === "lead")?.count ?? 0;
      if (atLead / open < 0.5) return null;
      return `${pct(atLead / open)} of open leads have never been qualified past ${STAGES.lead.label}. The pipeline is thinner than the count suggests.`;
    }

    case "lossReason": {
      const rows = lossReasonStats(leads);
      const recorded = rows.filter((row) => row.key !== "unrecorded");
      if (recorded.length === 0) {
        return "No loss reasons recorded yet, so there is nothing here to learn from.";
      }
      const top = recorded[0];
      const def = top.key === "unrecorded" ? null : LOST_REASONS[top.key];
      return (
        `${top.label} is the costliest cause: ${top.count} ` +
        `${top.count === 1 ? "lead" : "leads"}` +
        (top.qualified > 0 ? `, ${top.qualified} of them already qualified` : "") +
        `. ${def?.fix ?? ""}`
      ).trim();
    }

    case "velocity": {
      const rows = stageVelocity(leads, today).filter((row) => row.count > 0);
      if (rows.length === 0) return null;
      const worst = rows.sort((a, b) => b.avgDays / b.threshold - a.avgDays / a.threshold)[0];
      if (worst.avgDays <= worst.threshold) {
        return "Every stage is moving inside its limit. Nothing is parked.";
      }
      return (
        `${worst.label} is the bottleneck: ${Math.round(worst.avgDays)} days on average against a ` +
        `${worst.threshold}-day limit, oldest ${worst.maxDays} days.`
      );
    }

    default:
      return null;
  }
}

/** Direction of travel over the last two complete months, stated plainly. */
function monthlyTrend(leads: Lead[]): string | null {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.createdAt.slice(0, 7);
    if (key.length !== 7) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const keys = [...counts.keys()].sort();
  if (keys.length < 3) return null;

  // The most recent month is usually incomplete, so comparing it would read as
  // a collapse every time. The two months before it are the honest comparison.
  const previous = counts.get(keys[keys.length - 2]) ?? 0;
  const before = counts.get(keys[keys.length - 3]) ?? 0;
  if (before === 0) return null;

  const change = (previous - before) / before;
  if (Math.abs(change) < 0.15) return "Intake is flat month on month.";
  return change > 0
    ? `Intake rose ${pct(change)} in the last complete month. Make sure follow-up capacity kept up.`
    : `Intake fell ${pct(Math.abs(change))} in the last complete month — top of funnel needs attention now, not next quarter.`;
}
