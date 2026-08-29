/**
 * Lead scoring.
 *
 * The tracker showed 46 rows that looked identical, sorted by date. A rep works
 * the top of a list like that, which means the order deals get attention in is
 * decided by when they happened to arrive. This module decides it by how likely
 * they are to buy instead.
 *
 * ---------------------------------------------------------------------------
 * Why the score returns its own reasons
 *
 * `scoreLead` returns the factor list, not just a total, and every surface that
 * shows a score can show the breakdown behind it. That is not a nicety. A
 * number a rep cannot interrogate is a number a rep overrules, and a scoring
 * model nobody trusts is worse than no scoring model at all — it adds a column
 * and changes no behaviour. "87, because they booked a demo and sit at
 * Opportunity" survives an argument; "87" does not.
 *
 * It also makes the model falsifiable. When a 90 loses and a 30 buys, the
 * factors say which weight was wrong, and the table below is one edit.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * What is deliberately NOT in here
 *
 * Deal value. A big deal is not a likely deal, and multiplying the two produces
 * a number that means neither. They are kept apart and combined only at the
 * point of ordering the queue, where "expected value" is the honest product of
 * a probability and an amount — see `queue.ts`.
 * ---------------------------------------------------------------------------
 *
 * Pure functions over plain data, like the rest of `src/lib/crm/`.
 */

import { daysBetween } from "./analytics";
import { STALL_DAYS, stageIndex } from "./taxonomy";
import type { Lead, LeadAppointment, OpenStageKey, SourceKey } from "./types";

export type ScoreBand = "hot" | "warm" | "cool" | "cold";

export type ScoreFactor = {
  key: string;
  label: string;
  /** Signed. Negative factors are penalties and are rendered as such. */
  points: number;
  /** The evidence, in one clause. This is what makes the total arguable. */
  detail: string;
};

export type LeadScore = {
  /** 0–100, clamped. */
  total: number;
  band: ScoreBand;
  /** Ordered by absolute weight, so the reason that moved it most reads first. */
  factors: ScoreFactor[];
};

export type ScoreContext = {
  /** Y-m-d. */
  today: string;
  appointmentsFor: (leadId: string) => LeadAppointment[];
  /**
   * Each source's own historical share of leads that reached SQL or beyond,
   * from `sourceStats()`. Passing this in rather than hard-coding channel
   * weights is what makes the model self-calibrating: if LinkedIn stops
   * producing qualified leads for this business, LinkedIn leads score lower
   * next month without anybody editing a table.
   */
  sourceQuality: Record<SourceKey, number>;
};

export const SCORE_BANDS: Record<ScoreBand, { label: string; min: number }> = {
  hot: { label: "Hot", min: 70 },
  warm: { label: "Warm", min: 50 },
  cool: { label: "Cool", min: 30 },
  cold: { label: "Cold", min: 0 },
};

export function scoreBand(total: number): ScoreBand {
  if (total >= SCORE_BANDS.hot.min) return "hot";
  if (total >= SCORE_BANDS.warm.min) return "warm";
  if (total >= SCORE_BANDS.cool.min) return "cool";
  return "cold";
}

/**
 * Job titles that can sign for a printer fleet.
 *
 * Matched loosely and on purpose. `title` is free text, and the cost of the two
 * errors is not symmetric: scoring a junior as senior wastes one call, while
 * missing a real decision maker buries them in the nurture pile. The list is
 * drawn from who actually buys this equipment — IT, facilities, procurement and
 * finance, plus anyone with a C or a directorship.
 */
const SENIOR_TITLE = /(chief|c[teiof]o|director|head|vp|vice president|president|owner|founder|partner|principal|general manager|gm\b|manager|procurement|purchasing|facilit|finance|it\b)/i;

/** Contributions, before clamping. Each one is capped by its own arithmetic. */
const WEIGHTS = {
  booking: 30,
  stage: 25,
  sourceQuality: 15,
  fit: 15,
  recency: 15,
  stallPenalty: -20,
} as const;

/**
 * Scores one lead.
 *
 * The six factors, and the reasoning behind each weight:
 *
 *   Booking (30, the heaviest)  A booked appointment is the only signal in this
 *     data where the visitor spent something — their time, at a fixed hour, in
 *     advance. Nothing else a lead does is that costly to fake. A cancellation
 *     is scored negative rather than zero because it is worse than never having
 *     booked: they had intent and something killed it.
 *
 *   Stage (25)  Where a human has already judged them to be. Reads raw `stage`,
 *     never `displayStage()`, so a lead that reached SQL and then died keeps the
 *     credit for having reached it — the discipline `analytics.ts` sets out.
 *
 *   Source quality (15)  Not a fixed channel ranking. Each source is scored on
 *     its own historical SQL+ rate in this book, so the weight is a measurement
 *     rather than an opinion.
 *
 *   Fit (15)  Whether they look like a buyer: reachable by phone, attached to
 *     an organisation, senior enough to sign.
 *
 *   Recency (15)  Attention decays. A conversation three days old is warm; the
 *     same conversation eight weeks old is archaeology.
 *
 *   Stall penalty (−20)  The only negative that can apply to an otherwise
 *     healthy lead, and the reason the score is useful for triage rather than
 *     just ranking: a good lead going quiet has to be able to fall far enough
 *     to be noticed.
 */
export function scoreLead(lead: Lead, ctx: ScoreContext): LeadScore {
  const factors: ScoreFactor[] = [];

  // --- Booking intent -------------------------------------------------------
  const appointments = ctx.appointmentsFor(lead.id);
  const upcoming = appointments.some(
    (a) => a.status !== "Cancelled" && daysBetween(ctx.today, a.date) >= 0,
  );

  if (appointments.length > 0) {
    const has = (status: string) => appointments.some((a) => a.status === status);

    if (upcoming && (has("Confirmed") || has("Pending"))) {
      factors.push({
        key: "booking",
        label: "Appointment booked",
        points: WEIGHTS.booking,
        detail: "Has an upcoming appointment — the strongest intent signal we collect.",
      });
    } else if (has("Completed")) {
      factors.push({
        key: "booking",
        label: "Met with us",
        points: 25,
        detail: "Has completed an appointment.",
      });
    } else if (has("Cancelled")) {
      factors.push({
        key: "booking",
        label: "Booking cancelled",
        points: -10,
        detail: "Booked and then cancelled, and has not rebooked.",
      });
    }
  }

  // --- Stage progress -------------------------------------------------------
  // Raw `stage`: how far it ever got, which is what predicts the next step.
  const position = stageIndex(lead.stage);
  if (position > 0) {
    factors.push({
      key: "stage",
      label: "Pipeline progress",
      points: Math.round((position / 4) * WEIGHTS.stage),
      detail: `A human has already qualified them to ${lead.stage.toUpperCase()}.`,
    });
  }

  // --- Source quality -------------------------------------------------------
  const quality = ctx.sourceQuality[lead.source] ?? 0;
  if (quality > 0) {
    factors.push({
      key: "source",
      label: "Channel track record",
      points: Math.round(quality * WEIGHTS.sourceQuality),
      detail: `${Math.round(quality * 100)}% of leads from this channel have reached SQL or beyond.`,
    });
  }

  // --- Fit ------------------------------------------------------------------
  let fit = 0;
  const evidence: string[] = [];
  if (lead.phone.trim() !== "") {
    fit += 5;
    evidence.push("reachable by phone");
  }
  if (lead.company.trim() !== "") {
    fit += 4;
    evidence.push("named organisation");
  }
  if (SENIOR_TITLE.test(lead.title)) {
    fit += 6;
    evidence.push("decision-making title");
  }
  if (fit > 0) {
    factors.push({
      key: "fit",
      label: "Contact quality",
      points: Math.min(fit, WEIGHTS.fit),
      detail: evidence.join(", ") + ".",
    });
  }

  // --- Recency --------------------------------------------------------------
  // `lastContactAt` is a timestamp and `createdAt` is a Y-m-d string, so the
  // former is sliced before comparison. Falling back to `createdAt` is what
  // makes a brand-new uncontacted lead score as fresh rather than as neglected;
  // the stall penalty below is what stops it staying that way.
  const touchedAt = lead.lastContactAt ? lead.lastContactAt.slice(0, 10) : lead.createdAt;
  const daysSinceTouch = touchedAt ? Math.max(0, daysBetween(touchedAt, ctx.today)) : 999;

  if (daysSinceTouch <= 60) {
    const freshness = 1 - daysSinceTouch / 60;
    const points = Math.round(freshness * WEIGHTS.recency);
    if (points > 0) {
      factors.push({
        key: "recency",
        label: "Recent activity",
        points,
        detail:
          daysSinceTouch === 0
            ? "Touched today."
            : `Last activity ${daysSinceTouch} day${daysSinceTouch === 1 ? "" : "s"} ago.`,
      });
    }
  }

  // --- Stall penalty --------------------------------------------------------
  // Only applies to leads still in play, and never to one with a meeting in the
  // diary. A lost lead is not stalled, it is over, and penalising it twice would
  // push closed deals below the useful range where the band no longer
  // distinguishes anything.
  //
  // The `upcoming` exemption matters more than it looks. Without it a lead who
  // booked a demo for next Tuesday and has not been phoned since is scored as
  // decaying — the one case where silence is not neglect, because the next
  // contact is already agreed. The first version of this model pushed exactly
  // that lead out of the hot band and into the going-cold play, which is the
  // opposite of the truth about it.
  if (!lead.lost && !upcoming) {
    const threshold = STALL_DAYS[lead.stage as OpenStageKey] ?? 14;
    if (daysSinceTouch > threshold) {
      const overdue = daysSinceTouch - threshold;
      // Full penalty once a lead is a whole threshold past due, so the scale is
      // proportional to the stage's own tolerance rather than to a flat day count.
      const severity = Math.min(1, overdue / threshold);
      factors.push({
        key: "stall",
        label: "Going cold",
        points: Math.round(severity * WEIGHTS.stallPenalty),
        detail: `${daysSinceTouch} days untouched — ${threshold} is the limit at this stage.`,
      });
    }
  }

  const raw = factors.reduce((sum, factor) => sum + factor.points, 0);
  const total = Math.max(0, Math.min(100, raw));

  return {
    total,
    band: scoreBand(total),
    factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
  };
}

/**
 * Builds the source-quality table `scoreLead` needs.
 *
 * Takes the rows `sourceStats()` already produces, so the scorer and the source
 * quality chart can never disagree about what a channel's track record is.
 *
 * A source with too little history gets the book's overall rate instead of its
 * own: at two leads, one qualifying reads as a 50% channel, which is noise
 * wearing the clothes of a signal. Five is the floor at which the number starts
 * meaning anything at these volumes.
 */
export function sourceQualityIndex(
  rows: Array<{ key: SourceKey; total: number; qualifiedRate: number }>,
  overallRate: number,
  minimumSample = 5,
): Record<SourceKey, number> {
  const index = {} as Record<SourceKey, number>;
  for (const row of rows) {
    index[row.key] = row.total >= minimumSample ? row.qualifiedRate : overallRate;
  }
  return index;
}
