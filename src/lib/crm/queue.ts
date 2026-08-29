/**
 * The work queue.
 *
 * Everything else in `src/lib/crm/` answers a question about the book. This
 * module answers the only question a rep actually has at nine in the morning:
 * who do I call, and why that one first.
 *
 * ---------------------------------------------------------------------------
 * Plays, not a sorted list
 *
 * A single list ordered by score would be defensible and would not get used,
 * because "call this one, it's an 84" does not tell anybody what to say. So the
 * queue groups leads into *plays*: named situations that each have one obvious
 * response. "They took a demo three weeks ago and nobody moved the stage" is a
 * different phone call from "they cancelled and never rebooked", and a rep can
 * work ten of one kind faster than ten of ten kinds.
 *
 * Every play carries its own recommended action for the same reason the score
 * carries its own factors: a recommendation without a stated basis gets
 * ignored, and one with a basis can be argued with and corrected.
 *
 * Each lead lands in exactly ONE play, the first that matches in priority
 * order. A lead appearing in three sections would inflate every count and let a
 * rep do the same work twice.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * Ordering within a play: how far it got, then how likely it is
 *
 * Rows sort by lifecycle position first and score second, so the deals nearest
 * a decision surface above the raw ones inside every play.
 *
 * This was briefly ordered by expected monetary value instead, which is the
 * textbook answer and was wrong here: nothing in this business records what a
 * deal is worth, so the figure came from a per-model estimate that had never
 * been measured against a single closed sale. Ordering a rep's morning by an
 * invented number is worse than ordering it by an honest proxy, and stage is an
 * honest proxy — somebody looked at that lead and judged how far along it was.
 *
 * When DocuJet starts recording what deals actually close for, expected value
 * becomes the right key and this becomes a two-line change.
 * ---------------------------------------------------------------------------
 */

import { daysBetween } from "./analytics";
import { scoreLead, type LeadScore, type ScoreContext } from "./scoring";
import { STAGES, STALL_DAYS, stageIndex } from "./taxonomy";
import type { Lead, LeadAppointment, OpenStageKey } from "./types";

export type PlayKey =
  | "overdue"
  | "hot-untouched"
  | "post-demo"
  | "rescue"
  | "going-cold"
  | "aging"
  | "nurture";

export type PlayDef = {
  label: string;
  /** Why this group exists, in one line. Renders under the section heading. */
  blurb: string;
  /** Ordinal urgency. Lower runs first, both for matching and for display. */
  priority: number;
  tone: "critical" | "warning" | "opportunity" | "neutral";
};

/**
 * The seven plays, in the order they are tested.
 *
 * The order encodes a judgement about what is most expensive to leave undone:
 *
 *   1. A promise the rep made and broke costs credibility as well as the deal,
 *      so it outranks everything — including a hotter lead nobody promised
 *      anything to.
 *   2. High intent that nobody has touched is the purest waste in the book: the
 *      marketing spend is already sunk and the lead is asking to be sold to.
 *   3-4. A demo given and not followed up, or a cancellation nobody chased, are
 *      both cases where the business has already spent its most expensive
 *      resource — a person's hour — and is about to get nothing for it.
 *   5. A lead that has sat at the entry stage for a month is a qualification
 *      decision, not a chase — so it is triaged before decay rather than after.
 *      Ordering it the other way round, as the first version of this did, put
 *      every ageing raw lead into "going cold" and emptied this play entirely:
 *      a month-old lead nobody called is silent by definition, so the decay rule
 *      always matched first and the more useful classification never fired.
 *   6. Decay everywhere else. Real, but cheaper to fix late than any of the
 *      above.
 *   7. Everything else still open, so the queue accounts for the whole book and
 *      a rep can see that nothing is hiding.
 */
export const PLAYS: Record<PlayKey, PlayDef> = {
  overdue: {
    label: "Overdue follow-ups",
    blurb: "You committed to a next step and the date has passed.",
    priority: 1,
    tone: "critical",
  },
  "hot-untouched": {
    label: "Hot and never contacted",
    blurb: "High-intent leads nobody has spoken to yet. The cheapest revenue in the book.",
    priority: 2,
    tone: "critical",
  },
  "post-demo": {
    label: "Demo given, deal not moved",
    blurb: "They took a meeting and the stage never changed. Advance them or disqualify them.",
    priority: 3,
    tone: "warning",
  },
  rescue: {
    label: "Cancelled and not rebooked",
    blurb: "They had intent and something got in the way. Nobody has been back to them.",
    priority: 4,
    tone: "warning",
  },
  aging: {
    label: "Stuck at the front door",
    blurb: "Sitting at Lead for over a month. Qualify them or close them, but stop counting them.",
    priority: 5,
    tone: "neutral",
  },
  "going-cold": {
    label: "Going cold",
    blurb: "Open deals past the silence limit for the stage they are sitting at.",
    priority: 6,
    tone: "warning",
  },
  nurture: {
    label: "Nurture",
    blurb: "Everything else still in play. No action needed today.",
    priority: 7,
    tone: "neutral",
  },
};

export const PLAY_KEYS = (Object.keys(PLAYS) as PlayKey[]).sort(
  (a, b) => PLAYS[a].priority - PLAYS[b].priority,
);

export function isPlayKey(value: string): value is PlayKey {
  return Object.prototype.hasOwnProperty.call(PLAYS, value);
}

export type QueueItem = {
  lead: Lead;
  score: LeadScore;
  play: PlayKey;
  /** Why this lead is in this play. Stated as evidence, with the numbers in it. */
  reason: string;
  /** What to do about it. One imperative sentence. */
  action: string;
  /** Lifecycle position, 0-based. The primary sort key within a play. */
  reach: number;
  daysSinceTouch: number;
};

export type QueueContext = ScoreContext;

/** Days since anyone touched a lead, falling back to when it arrived. */
export function daysSinceTouch(lead: Lead, today: string): number {
  const at = lead.lastContactAt ? lead.lastContactAt.slice(0, 10) : lead.createdAt;
  if (!at) return 0;
  return Math.max(0, daysBetween(at, today));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Decides which play a lead belongs to, and what to say about it.
 *
 * Lost leads are not returned at all. The queue is a list of work, and there is
 * no work on a closed deal — a reopened one comes back through `reopenAction`
 * and rejoins the queue on the next render.
 */
function classify(
  lead: Lead,
  score: LeadScore,
  ctx: QueueContext,
  appointments: LeadAppointment[],
): { play: PlayKey; reason: string; action: string } | null {
  if (lead.lost) return null;

  const today = ctx.today;
  const silent = daysSinceTouch(lead, today);
  const stage = STAGES[lead.stage].label;

  // 1. A broken promise.
  if (lead.nextActionAt) {
    const overdueBy = daysBetween(lead.nextActionAt, today);
    if (overdueBy >= 0) {
      const commitment = lead.nextAction.trim() || "a follow-up";
      return {
        play: "overdue",
        reason:
          overdueBy === 0
            ? `"${commitment}" is due today.`
            : `"${commitment}" was due ${plural(overdueBy, "day")} ago.`,
        action: "Do it now, or move the date and say why.",
      };
    }
  }

  // 2. Paid-for intent that nobody has answered.
  if (score.total >= 70 && lead.lastContactAt === null) {
    return {
      play: "hot-untouched",
      reason: `Scores ${score.total} and has never been contacted — ${plural(silent, "day")} since they arrived.`,
      action: "Call today. Everything that made this lead expensive has already been paid for.",
    };
  }

  const completed = appointments.filter((a) => a.status === "Completed");
  const cancelled = appointments.filter((a) => a.status === "Cancelled");
  const live = appointments.filter((a) => a.status === "Confirmed" || a.status === "Pending");

  // 3. An hour of somebody's time, spent and not banked.
  if (completed.length > 0 && stageIndex(lead.stage) <= stageIndex("mql")) {
    const last = completed.reduce((a, b) => (a.date > b.date ? a : b));
    const since = Math.max(0, daysBetween(last.date, today));
    return {
      play: "post-demo",
      reason: `${last.type} completed ${plural(since, "day")} ago and they are still at ${stage}.`,
      action: "Move them to SQL with what you learned, or mark them lost with a reason.",
    };
  }

  // 4. Intent that hit an obstacle and was never chased.
  if (cancelled.length > 0 && live.length === 0) {
    const last = cancelled.reduce((a, b) => (a.date > b.date ? a : b));
    const since = Math.max(0, daysBetween(last.date, today));
    return {
      play: "rescue",
      reason: `${last.type} cancelled ${plural(since, "day")} ago with no replacement booked.`,
      action: "Ring to rebook. They wanted the meeting once.",
    };
  }

  // 5. Never qualified, never closed — the leads that quietly inflate a
  // pipeline. Tested before decay: see the ordering note above.
  if (lead.stage === "lead" && lead.createdAt) {
    const age = daysBetween(lead.createdAt, today);
    if (age > 30) {
      return {
        play: "aging",
        reason: `Arrived ${plural(age, "day")} ago and has not moved past Lead.`,
        action: "Qualify or close. An unqualified lead this old is not pipeline.",
      };
    }
  }

  // 6. Decay, measured against what this stage tolerates.
  //
  // A booked meeting exempts a lead from this, matching the stall penalty in
  // `scoring.ts`: silence before an agreed next contact is not neglect, and
  // telling a rep to "re-engage" someone they are seeing on Tuesday wastes the
  // one thing this queue is spending — their attention.
  const threshold = STALL_DAYS[lead.stage as OpenStageKey] ?? 14;
  const meetingBooked = live.some((a) => daysBetween(today, a.date) >= 0);
  if (silent > threshold && !meetingBooked) {
    return {
      play: "going-cold",
      reason: `${plural(silent, "day")} of silence at ${stage}; ${threshold} is the limit here.`,
      action: "Re-engage with something new, or set a next action so it stops drifting.",
    };
  }

  return {
    play: "nurture",
    reason: `Open at ${stage}, last activity ${plural(silent, "day")} ago.`,
    action: "Nothing due. Keep warm.",
  };
}

/**
 * Builds the queue.
 *
 * Returns every open lead exactly once, sorted by play priority and then by the
 * money at risk. Lost leads are excluded — see `classify`.
 */
export function buildQueue(leads: Lead[], ctx: QueueContext): QueueItem[] {
  const items: QueueItem[] = [];

  for (const lead of leads) {
    const score = scoreLead(lead, ctx);
    const appointments = ctx.appointmentsFor(lead.id);
    const verdict = classify(lead, score, ctx, appointments);
    if (verdict === null) continue;

    items.push({
      lead,
      score,
      play: verdict.play,
      reason: verdict.reason,
      action: verdict.action,
      reach: stageIndex(lead.stage),
      daysSinceTouch: daysSinceTouch(lead, ctx.today),
    });
  }

  return items.sort((a, b) => {
    const byPlay = PLAYS[a.play].priority - PLAYS[b.play].priority;
    if (byPlay !== 0) return byPlay;
    const byReach = b.reach - a.reach;
    if (byReach !== 0) return byReach;
    return b.score.total - a.score.total;
  });
}

export type PlayGroup = {
  key: PlayKey;
  def: PlayDef;
  items: QueueItem[];
  /**
   * How many of these had reached SQL or beyond — the section's second figure.
   *
   * A count alone cannot separate "eight raw leads have gone quiet" from "eight
   * qualified deals have gone quiet", and those are not the same morning. This
   * is the closest the book gets to saying which.
   */
  qualified: number;
};

/**
 * Groups a built queue for rendering, dropping plays that matched nobody.
 *
 * An empty section is worse than no section: it takes vertical space to say
 * nothing, and a screen of them buries the two that have work in them.
 */
export function groupQueue(items: QueueItem[]): PlayGroup[] {
  const sqlIndex = stageIndex("sql");
  return PLAY_KEYS.map((key) => {
    const inPlay = items.filter((item) => item.play === key);
    return {
      key,
      def: PLAYS[key],
      items: inPlay,
      qualified: inPlay.filter((item) => item.reach >= sqlIndex).length,
    };
  }).filter((group) => group.items.length > 0);
}

/** The plays that represent work someone is behind on, for the KPI tiles. */
export const ACTION_PLAYS: PlayKey[] = [
  "overdue",
  "hot-untouched",
  "post-demo",
  "rescue",
  "going-cold",
];

/** How many leads need action today, and how many of those are qualified. */
export function actionSummary(items: QueueItem[]): { count: number; qualified: number } {
  const sqlIndex = stageIndex("sql");
  const needing = items.filter((item) => ACTION_PLAYS.includes(item.play));
  return {
    count: needing.length,
    qualified: needing.filter((item) => item.reach >= sqlIndex).length,
  };
}
