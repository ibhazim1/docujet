/**
 * What each stage is for, and what a rep does to a lead sitting in one.
 *
 * ---------------------------------------------------------------------------
 * Why this replaced the play-based queue
 *
 * The old work board grouped leads by what had gone wrong with them — overdue,
 * going cold, stuck at the front door, nurture. That is a good way to rank a
 * morning and a bad way to *work* one, because the groups cut across the
 * lifecycle: "going cold" held a raw lead nobody had qualified next to an
 * Opportunity with a proposal outstanding, and those two need completely
 * different sentences out of the same rep in the same sitting.
 *
 * This groups by stage instead, which is the axis that decides what you
 * actually say. Every lead in the MQL section needs the same thing — the
 * product put in front of them. Every lead in Opportunity needs the same
 * thing — a decision. A rep can pick a section and stay in one frame of mind
 * for twenty rows, which is the whole efficiency argument for a work queue and
 * the one the old grouping quietly gave up.
 *
 * What went wrong with a lead has not been thrown away: it survives as a
 * status chip on the row (`QueueItem.play`), so the ordering and the urgency
 * are still visible inside the section. The change is which fact organises the
 * screen, not which facts are known.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * Why the action set is per stage
 *
 * A raw Lead does not get a phone call. That is the one genuinely
 * counter-intuitive rule here and it is the most valuable: an unassessed lead
 * is a *filing* decision, not a conversation, and a rep who rings every one of
 * them spends the morning on the widest and least reliable part of the funnel.
 * So the Lead section offers exactly two buttons — qualify it up, or close it
 * with a reason — and no way to start a call from the row.
 *
 * The lead card (`LeadDetail`) keeps the full set. Someone who has opened one
 * specific raw lead and decided to ring it has made a judgement the board
 * should not override; what the board declines to do is *invite* that call
 * twenty times over.
 * ---------------------------------------------------------------------------
 */

import { displayStage } from "./analytics";
import { buildQueue, type PlayKey, type QueueItem } from "./queue";
import { scoreLead, type LeadScore, type ScoreContext } from "./scoring";
import { LOST_REASONS, LOST_REASON_KEYS, STAGE_KEYS } from "./taxonomy";
import type { Lead, LostReason, StageKey } from "./types";

/** The controls a row may offer. Each stage names the subset it wants. */
export type StageActionKey = "contact" | "advance" | "markLost" | "reopen";

export type StagePlay = {
  /** The one job at this stage. Reads as the section's subtitle. */
  objective: string;
  /** How to do it — the standing instruction for every row in the section. */
  method: string;
  /** Which buttons a row in this section shows, in this order. */
  actions: StageActionKey[];
  /** Section accent, keyed to where in the lifecycle the work sits. */
  tone: "entry" | "promote" | "negotiate" | "close" | "retain" | "closed";
};

/**
 * The six sections.
 *
 * `method` is written as an instruction to a person rather than a description
 * of a state, because the section header is the last thing a rep reads before
 * they start working the rows underneath it. "Sitting at Lead for over a month"
 * tells them what they can already see; "qualify it up or close it, but do not
 * ring it" tells them what to do with their next ten minutes.
 */
export const STAGE_PLAYBOOK: Record<StageKey, StagePlay> = {
  lead: {
    objective: "Decide whether this is a buyer.",
    method:
      "Do not ring these. Read what they sent, then qualify them up or close them with a " +
      "reason — an unassessed lead is a filing decision, and one left sitting here is not " +
      "pipeline no matter how long the list gets.",
    actions: ["advance", "markLost"],
    tone: "entry",
  },
  mql: {
    objective: "Get the product in front of them.",
    method:
      "They fit what we sell to, and they have not yet seen what we actually do. Send the " +
      "overview, name the model that suits their volumes, and make looking at it cost them " +
      "nothing. You are buying attention here, not a decision.",
    actions: ["contact", "advance", "markLost"],
    tone: "promote",
  },
  sql: {
    objective: "Make it easy to say yes.",
    method:
      "The need is confirmed, so stop selling and start agreeing. Offer to build a quote " +
      "around their actual volumes, put two specific times in front of them for a " +
      "demonstration, and take the work of deciding off their desk.",
    actions: ["contact", "advance", "markLost"],
    tone: "negotiate",
  },
  opportunity: {
    objective: "Confirm, then close.",
    method:
      "The proposal is with them and the cost of winning them is already spent. Call to " +
      "confirm they have everything they need, find the one thing still in the way, and " +
      "agree the step that ends in a signature.",
    actions: ["contact", "advance", "markLost"],
    tone: "close",
  },
  customer: {
    objective: "Keep them, and grow them.",
    method:
      "Check the machine is doing what they bought it for, and ask what they would change. " +
      "This is where consumables, upgrades and referrals come from — a happy account is the " +
      "cheapest source of the next one, and nobody asks it unprompted.",
    actions: ["contact", "markLost"],
    tone: "retain",
  },
  lost: {
    objective: "Fix the cause, then reopen.",
    method:
      "Grouped by what killed the deal, because the cause is what decides whether it can come " +
      "back. When the business changes something on this list — how it quotes, who it targets, " +
      "how fast it replies — the group under that heading becomes the warmest list you own.",
    actions: ["reopen"],
    tone: "closed",
  },
};

/** How a section is ordered: longest silent first, or most recently touched. */
export type BoardOrder = "late" | "recent";

export function isBoardOrder(value: string): value is BoardOrder {
  return value === "late" || value === "recent";
}

export type BoardRow = {
  lead: Lead;
  score: LeadScore;
  /** Days since anyone logged contact, falling back to when it arrived. */
  daysSinceTouch: number;
  /**
   * The situation this lead is in, from the play classifier.
   *
   * Null on a lost lead, which has no situation left to be in. Kept as the
   * row's status chip rather than as the grouping — see the module note.
   */
  status: QueueItem | null;
  /** Lost rows only. Null means it was closed before the reason existed. */
  lostReason: LostReason | null;
};

export type BoardSection = {
  key: StageKey;
  play: StagePlay;
  rows: BoardRow[];
  /** How many reached SQL or beyond. Meaningless on the SQL+ sections themselves. */
  qualified: number;
};

/**
 * Lost rows, split by what killed them.
 *
 * A flat list of lost deals is a graveyard: correct, depressing and actionable
 * by nobody. Split by cause it becomes a work list, because each cause names
 * something a different person can change — and the moment one of them *is*
 * changed, the group underneath it is a set of people with a reason to hear
 * from us again. That is the entire argument for making Lost a section a rep
 * opens rather than a filter they avoid.
 *
 * Unattributed losses come last under their own heading. They are not evidence
 * of anything, and putting them first would let the biggest group on the screen
 * be the one that says nothing.
 */
export type LostGroup = {
  reason: LostReason | null;
  label: string;
  /** What to change so this stops happening. Empty for the unattributed group. */
  fix: string;
  /** Who owns that change — targeting, process or commercial. */
  owner: string;
  rows: BoardRow[];
};

export function groupLostRows(rows: BoardRow[]): LostGroup[] {
  const groups: LostGroup[] = [];

  for (const key of LOST_REASON_KEYS) {
    const matching = rows.filter((row) => row.lostReason === key);
    if (matching.length === 0) continue;
    groups.push({
      reason: key,
      label: LOST_REASONS[key].label,
      fix: LOST_REASONS[key].fix,
      owner: LOST_REASONS[key].owner,
      rows: matching,
    });
  }

  const unattributed = rows.filter((row) => row.lostReason === null);
  if (unattributed.length > 0) {
    groups.push({
      reason: null,
      label: "No reason recorded",
      fix: "",
      owner: "",
      rows: unattributed,
    });
  }

  return groups;
}

/**
 * Days since anyone touched a lead, falling back to when it arrived.
 *
 * Duplicated from `queue.ts` rather than imported, because that one is scoped
 * to open leads and this has to answer for closed ones too — a lost lead still
 * has a last-contact date, and the Lost section sorts on it like every other.
 */
function silenceOf(lead: Lead, today: string): number {
  const at = lead.lastContactAt ? lead.lastContactAt.slice(0, 10) : lead.createdAt;
  if (!at) return 0;
  const from = new Date(`${at}T00:00:00Z`).getTime();
  const to = new Date(`${today}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/**
 * Builds the six sections.
 *
 * `play` narrows every section at once to leads in one situation, which is how
 * an insight on the dashboard links to the rows behind its claim. Empty means
 * no narrowing, which is the normal case.
 *
 * Every visible lead lands in exactly one section, keyed on its *displayed*
 * stage — so
 * a lead that reached SQL and then died appears under Lost, not under SQL. That
 * is the opposite of the rule the funnel uses, and deliberately: the funnel
 * asks "how far did this ever get", which is a question about the channel, and
 * this asks "what do I do with it now", which is a question about today.
 */
export function buildBoard(
  leads: Lead[],
  ctx: ScoreContext,
  order: BoardOrder = "late",
  play: PlayKey | "" = "",
): BoardSection[] {
  // `buildQueue` classifies open leads and drops closed ones, which is exactly
  // the split needed here: the survivors carry a situation, the rest carry a
  // cause of death.
  const byId = new Map<string, QueueItem>();
  for (const item of buildQueue(leads, ctx)) byId.set(item.lead.id, item);

  const rowsByStage = new Map<StageKey, BoardRow[]>();
  for (const key of STAGE_KEYS) rowsByStage.set(key, []);

  for (const lead of leads) {
    const status = byId.get(lead.id) ?? null;
    // A play narrowing crosses every section — it is what a dashboard finding
    // links in with. Lost leads carry no play, so they drop out entirely rather
    // than surviving as an unfiltered section underneath a banner claiming
    // otherwise: "going cold" is a statement about an open deal, and a closed
    // one cannot be an example of it.
    if (play !== "" && status?.play !== play) continue;

    rowsByStage.get(displayStage(lead))?.push({
      lead,
      // Reuse the classifier's score where there is one; a lost lead was never
      // classified, so it needs its own reading for the chip on its row.
      score: status?.score ?? scoreLead(lead, ctx),
      daysSinceTouch: status?.daysSinceTouch ?? silenceOf(lead, ctx.today),
      status,
      lostReason: lead.lostReason ?? null,
    });
  }

  const sqlIndex = STAGE_KEYS.indexOf("sql");

  return STAGE_KEYS.map((key) => {
    const rows = rowsByStage.get(key) ?? [];
    return {
      key,
      play: STAGE_PLAYBOOK[key],
      rows: sortRows(rows, order),
      qualified: rows.filter((row) => STAGE_KEYS.indexOf(row.lead.stage) >= sqlIndex).length,
    };
  });
}

/**
 * Orders one section.
 *
 * Silence is the only key offered, in either direction, and that is a
 * deliberate narrowing rather than an oversight. Inside a single stage every
 * lead already needs the same thing, so the useful question is not "which is
 * most valuable" — it is "who have I left longest", and its inverse for a rep
 * picking up where they stopped yesterday.
 *
 * Score breaks ties so the order is stable and the more promising lead of two
 * equally neglected ones surfaces first.
 */
function sortRows(rows: BoardRow[], order: BoardOrder): BoardRow[] {
  const direction = order === "late" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const bySilence = (b.daysSinceTouch - a.daysSinceTouch) * direction;
    if (bySilence !== 0) return bySilence;
    return b.score.total - a.score.total;
  });
}

/**
 * The section to open on: the earliest stage that has anything in it.
 *
 * Left-to-right so the choice is predictable, but skipping empties so the board
 * never opens on a heading with nothing under it. A rep whose Lead pile is
 * clear should land on MQL, not on proof that they cleared it.
 */
export function firstPopulatedStage(sections: BoardSection[]): StageKey {
  return sections.find((section) => section.rows.length > 0)?.key ?? "lead";
}
