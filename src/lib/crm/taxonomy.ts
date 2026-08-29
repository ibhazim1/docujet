/**
 * The lifecycle and the channel list — the two vocabularies the whole tracker
 * is built on. Ported from `stages()` and `sources()` in `crm/lib/data.php`.
 *
 * These stay in code rather than in the database because they carry
 * presentation (colour) and analysis (group) alongside their labels, and
 * because a stage key appearing in a row that is not defined here would
 * corrupt the funnel's suffix sums.
 */

import type {
  LeadEventKind,
  LostReason,
  LostReasonDef,
  OpenStageKey,
  SourceDef,
  SourceKey,
  StageDef,
  StageKey,
} from "./types";

/** The terminal stage key. Several modules test for it, so it is named once. */
export const LOST_STAGE = "lost" as const;

/**
 * The lead lifecycle, plus the one terminal state that sits outside it.
 *
 * Lead -> Customer is an *ordered* scale, not a set of unrelated categories, so
 * those five are coloured with a single-hue ordinal ramp (light -> dark):
 * further along the lifecycle reads as darker everywhere in the UI.
 *
 * Lost is marked `terminal` and deliberately leaves that ramp. It is not a
 * sixth step — a lost lead has not progressed past Customer — so giving it the
 * next darker blue would encode it as the end of the progression, which is the
 * one thing it is not. It takes a desaturated grey instead: clearly outside the
 * ramp, and receding rather than alarming, because losing leads is normal.
 *
 * `terminal` is what the rest of the app keys off, never the string 'lost', so
 * a second closed state (Dormant, say) is a matter of adding a row here.
 */
export const STAGES: Record<StageKey, StageDef> = {
  lead: { label: "Lead", light: "#86b6ef", dark: "#9ec5f4" },
  mql: { label: "MQL", light: "#5598e7", dark: "#6da7ec" },
  sql: { label: "SQL", light: "#2a78d6", dark: "#3987e5" },
  opportunity: { label: "Opportunity", light: "#1c5cab", dark: "#256abf" },
  customer: { label: "Customer", light: "#104281", dark: "#184f95" },
  lost: { label: "Lost", light: "#7c8798", dark: "#8b95a6", terminal: true },
};

/**
 * Where a lead came from — the primary analysis dimension.
 *
 * `group` separates paid/organic social from owned web properties, so the
 * dashboard can answer "how much is social actually producing?" in one number.
 */
export const SOURCES: Record<SourceKey, SourceDef> = {
  linkedin: { label: "LinkedIn", group: "social" },
  facebook: { label: "Facebook", group: "social" },
  instagram: { label: "Instagram", group: "social" },
  youtube: { label: "YouTube", group: "social" },
  x: { label: "X", group: "social" },
  threads: { label: "Threads", group: "social" },
  chatbot: { label: "Website chatbot", group: "web" },
  form: { label: "Website form", group: "web" },
};

/**
 * Why deals die, and who owns the fix.
 *
 * Ordered by how early in the cycle the problem originates, so the chart reads
 * left to right as a journey: bad targeting produces a lead that was never a
 * fit; good targeting badly worked produces silence; a well-worked lead still
 * dies on price or to a competitor at the end.
 *
 * `fix` is the point of the whole column. "38% of losses cite price" is a
 * statistic; "38% cite price — qualify budget before the demo, not after" is an
 * instruction, and only one of the two changes what anybody does on Monday.
 */
export const LOST_REASONS: Record<LostReason, LostReasonDef> = {
  not_a_fit: {
    label: "Not a fit",
    owner: "targeting",
    fix: "Tighten who the campaigns reach — these leads were never buyers.",
  },
  wrong_contact: {
    label: "Wrong contact",
    owner: "targeting",
    fix: "Capture job title at collection and route to the actual decision maker.",
  },
  no_response: {
    label: "Went silent",
    owner: "process",
    fix: "Shorten first-response time — these were reachable once and are not now.",
  },
  timing: {
    label: "Wrong timing",
    owner: "process",
    fix: "Set a next action rather than closing — timing losses are re-openable.",
  },
  budget_cut: {
    label: "Budget cut",
    owner: "process",
    fix: "Requalify budget at SQL, and diary these for the next fiscal year.",
  },
  price: {
    label: "Price",
    owner: "commercial",
    fix: "Qualify budget before the demo, and lead with running cost, not sticker price.",
  },
  competitor: {
    label: "Lost to competitor",
    owner: "commercial",
    fix: "Find out who, and get the Heat-Free comparison in front of them earlier.",
  },
};

export const LOST_REASON_KEYS = Object.keys(LOST_REASONS) as LostReason[];

export function isLostReason(value: string): value is LostReason {
  return Object.prototype.hasOwnProperty.call(LOST_REASONS, value);
}

/**
 * How long a lead may sit untouched at each stage before it counts as stalled.
 *
 * Tighter further down the funnel, because the cost of silence rises with it: a
 * new lead nobody has called in a week is a queue that got busy, while an
 * Opportunity nobody has called in three weeks is a deal being lost to a
 * competitor who did call. Customer is longest — it is an account-management
 * cadence, not a sales one.
 *
 * These are starting figures. The right values are whatever this business's own
 * won deals turn out to have had, which is a question `stageVelocity()` can
 * answer once there is enough history to answer it with.
 */
export const STALL_DAYS: Record<OpenStageKey, number> = {
  lead: 7,
  mql: 10,
  sql: 14,
  opportunity: 21,
  customer: 45,
};

/**
 * The kinds of event that are actually a conversation with a person.
 *
 * `stage`, `note`, `lost` and `reopened` are record-keeping: they say what the
 * business decided, not that anybody spoke to anyone. Putting them in a contact
 * log would pad it with rows that answer none of the questions it exists to
 * answer, and would make "when did we last actually talk to them" unreadable.
 */
export const CONTACT_KINDS: LeadEventKind[] = ["contacted", "appointment", "chat_capture"];

/** The ones the lead initiated rather than the team. */
const INBOUND_KINDS: LeadEventKind[] = ["chat_capture", "appointment"];

/**
 * True when the lead came to us rather than the other way round.
 *
 * The contact log needs this to decide what goes in its "By" column: an
 * inbound row has no staff member behind it, and leaving that cell blank would
 * read as missing data rather than as "they contacted us".
 */
export function isInboundContact(kind: LeadEventKind): boolean {
  return INBOUND_KINDS.includes(kind);
}

/** Every stage key, in lifecycle order, terminal states last. */
export const STAGE_KEYS = Object.keys(STAGES) as StageKey[];

/** Every source key, in declaration order. */
export const SOURCE_KEYS = Object.keys(SOURCES) as SourceKey[];

/** The open lifecycle — every stage except the terminal ones. */
export const OPEN_STAGE_KEYS = STAGE_KEYS.filter(
  (key) => !STAGES[key].terminal,
) as OpenStageKey[];

/** True when a stage is a closed state rather than a position in the lifecycle. */
export function isTerminal(stage: string): boolean {
  return Boolean(STAGES[stage as StageKey]?.terminal);
}

export function isStageKey(value: string): value is StageKey {
  return Object.prototype.hasOwnProperty.call(STAGES, value);
}

export function isOpenStageKey(value: string): value is OpenStageKey {
  return isStageKey(value) && !isTerminal(value);
}

export function isSourceKey(value: string): value is SourceKey {
  return Object.prototype.hasOwnProperty.call(SOURCES, value);
}

/**
 * Zero-based position of a stage in the open lifecycle.
 *
 * Terminal stages have no position and return -1 — Lost is not "after
 * Customer", it is off the scale entirely. Callers comparing against a
 * threshold (`>= sql`) should therefore pass a lead's `stage`, never its
 * displayed stage, or every lost lead drops below the threshold regardless of
 * how far it actually got.
 */
export function stageIndex(stage: string): number {
  const position = (OPEN_STAGE_KEYS as string[]).indexOf(stage);
  return position;
}

/** The stage that follows `stage` in the open lifecycle, or null at the end. */
export function nextOpenStage(stage: OpenStageKey): OpenStageKey | null {
  return OPEN_STAGE_KEYS[stageIndex(stage) + 1] ?? null;
}

/** The colour a stage wears on the admin's light surfaces. */
export function stageColor(stage: StageKey): string {
  return STAGES[stage].light;
}
