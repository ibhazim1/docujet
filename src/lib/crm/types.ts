/**
 * Lead tracker domain types.
 *
 * Ported from the PHP prototype in `crm/lib/data.php`. The first half of `Lead`
 * is what we capture at collection time: who they are, how to reach them, where
 * they came from, where they are in the lifecycle, and whether they are still
 * in play.
 *
 * The second half — owner, next action, lost reason, stage clock — arrived with
 * 0006 and is a different kind of fact. It is not what the lead told us; it is
 * what the business has decided about them. The original model left it out on
 * purpose, and that was right while the tracker only reported on the book. It
 * stopped being right when the tracker had to hand out work: chasing needs a
 * commitment, and learning from a loss needs a cause. See `scoring.ts` and
 * `queue.ts`.
 *
 * ---------------------------------------------------------------------------
 * There is still deliberately no deal value
 *
 * A `deal_value` column was built here and then taken out again. Nothing in
 * this business records what a deal is worth, so every figure it produced came
 * from a per-model estimate that was invented rather than measured — and a
 * weighted pipeline built on invented unit prices is a number people repeat in
 * meetings as though it were revenue. The estimate has to come from DocuJet own
 * closed deals before it is worth anything, and until then the queue ranks on
 * evidence it actually holds. See the ordering note in `queue.ts`.
 * ---------------------------------------------------------------------------
 */

export type StageKey =
  | "lead"
  | "mql"
  | "sql"
  | "opportunity"
  | "customer"
  | "lost";

/** Every stage except the terminal ones — the value a lead's `stage` may hold. */
export type OpenStageKey = Exclude<StageKey, "lost">;

export type SourceKey =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "youtube"
  | "x"
  | "threads"
  | "chatbot"
  | "form";

export type SourceGroup = "social" | "web";

/**
 * Why a lead was closed.
 *
 * A closed-lost lead with no reason teaches the business nothing, which is why
 * `LostReasonDialog` makes this required at the moment of closing rather than
 * an optional field somebody fills in later (nobody does). The split matters:
 * `price` and `competitor` are commercial problems, `not_a_fit` and
 * `wrong_contact` are targeting problems, and `no_response` and `timing` are
 * process problems. One bucket called "Lost" cannot tell them apart, and they
 * have three different fixes.
 *
 * Historical losses carry `null` — recorded before the column existed. That is
 * "not recorded", never a reason of its own, and the charts say so.
 */
export type LostReason =
  | "price"
  | "timing"
  | "competitor"
  | "no_response"
  | "not_a_fit"
  | "wrong_contact"
  | "budget_cut";

/**
 * One recorded interaction with a lead, as the contact log lists it.
 *
 * Flattened deliberately: the reader joins the lead and the staff member in
 * before handing this over, so the table takes a list of rows and renders them
 * rather than holding three lookups the way a naive join would leave it.
 *
 * Lives here rather than beside its reader for the same reason `LeadAppointment`
 * does — the component that renders it is registered for the Plasmic canvas,
 * and a type is the only thing it can safely take from a module that holds the
 * service key.
 */
export type ContactLogEntry = {
  id: number;
  /** ISO timestamp. */
  at: string;
  leadId: string;
  leadName: string;
  company: string;
  email: string;
  phone: string;
  kind: LeadEventKind;
  /**
   * Who made contact. A staff member's name for anything the team did, null
   * for the inbound events the lead initiated — those are attributed to the
   * lead in the table rather than to nobody.
   */
  actorName: string | null;
  detail: string;
};

/** What happened to a lead, in the order it happened. */
export type LeadEventKind =
  | "created"
  | "stage"
  | "contacted"
  | "note"
  | "lost"
  | "reopened"
  | "appointment"
  | "chat_capture";

export type StageDef = {
  label: string;
  /** Single-hue ordinal ramp, validated against a light surface. */
  light: string;
  /** The dark-surface ramp. Retained from the PHP for fidelity; unused today. */
  dark: string;
  /** A closed state rather than a position in the lifecycle. */
  terminal?: boolean;
};

export type SourceDef = {
  label: string;
  group: SourceGroup;
};

export type LostReasonDef = {
  label: string;
  /**
   * Which part of the business owns the fix. Three reasons pointing at
   * `targeting` is a marketing brief; three pointing at `commercial` is a
   * pricing review. This is what turns the loss chart into an instruction.
   */
  owner: "commercial" | "targeting" | "process";
  /** What to do when this reason dominates. Shown on the chart's verdict line. */
  fix: string;
};

/**
 * One lead.
 *
 * `stage` and `lost` are two different facts and both are kept:
 *
 *   - `stage` is how far the lead got — the furthest point it reached, which
 *     never moves backwards and is still meaningful after the lead is closed.
 *   - `lost` is whether it is still in play.
 *
 * Collapsing the two — writing 'lost' into `stage` — would destroy the only
 * copy of how far the lead got, and with it the funnel's ability to say where
 * deals die and a source's credit for producing a lead that qualified before
 * it fell over. See `displayStage()` in `analytics.ts`.
 */
export type Lead = {
  id: string;
  name: string;
  title: string;
  /** The organisation. Was `customers.company_name` before that table folded in. */
  company: string;
  email: string;
  phone: string;
  source: SourceKey;
  stage: OpenStageKey;
  createdAt: string;
  interest: string;
  /** The chatbot question that triggered capture. Chatbot-sourced leads only. */
  chatTopic: string | null;
  /**
   * When someone last spoke to them. Stamped by `create_booking`, never typed,
   * which is why this is a real timestamp and `createdAt` above is not.
   * Null means never contacted.
   */
  lastContactAt: string | null;
  /** Knowledge-base entry ids that answered it. Empty means the bot could not. */
  cited: string[];
  notes: string;
  lost: boolean;

  // -------------------------------------------------------------------------
  // Sales intelligence (0006). Everything above describes who the lead is;
  // everything below is what the business has decided to do about them.
  // -------------------------------------------------------------------------

  /** The staff member accountable for it. Null means nobody is — a finding. */
  ownerId: string | null;
  /** What the owner committed to do next. Empty when nothing is committed. */
  nextAction: string;
  /** Y-m-d. When it is due. Past and open is what makes a follow-up overdue. */
  nextActionAt: string | null;
  /** Why it was closed. Null on every open lead, and on losses that predate 0006. */
  lostReason: LostReason | null;
  /**
   * ISO timestamp of the last stage change.
   *
   * The honest denominator for "how long has this been sitting here".
   * `createdAt` cannot answer that — a lead created in January and promoted to
   * Opportunity yesterday is not eight months stale.
   */
  stageChangedAt: string | null;
};

/**
 * One thing that happened to a lead.
 *
 * The activity log this type file used to say it deliberately went without.
 * That was the right call while the tracker only described the book; it stops
 * being right the moment the app has to say how long a lead has been stuck,
 * because that question has no answer without a history to measure against.
 */
export type LeadEvent = {
  id: number;
  leadId: string;
  /** ISO timestamp. */
  at: string;
  kind: LeadEventKind;
  fromStage: string | null;
  toStage: string | null;
  /** The staff member who did it. Null for anything the lead or the system did. */
  actorId: string | null;
  /**
   * That staff member's name, resolved when the log is read.
   *
   * Carried on the event rather than looked up per row, because the contact log
   * renders in the browser from the same array the timeline uses and has no way
   * to reach `user_profiles` from there.
   */
  actorName: string | null;
  /** One human-readable sentence. The timeline renders this verbatim. */
  detail: string;
};

/**
 * One booked appointment, as the lead card shows it.
 *
 * It lives here, in the CRM's pure types, rather than beside the `appointments`
 * reader — the components that render it are `"use client"`, and a type is the
 * only thing they can safely take from a module that holds the service key.
 *
 * `leadId` is `appointments.lead_id`, the link 0003 established. What this
 * leaves out — the additional notes, the booking source — is on
 * /admin/appointments; this is the summary a rep needs while reading a lead,
 * not the booking record.
 */
export type LeadAppointment = {
  id: string;
  leadId: string;
  /** What they asked about. */
  product: string;
  /** 'Product Consultation', 'Pricing Discussion', … — a CHECK, not an enum. */
  type: string;
  /** Y-m-d. */
  date: string;
  /** 'HH:MM'. Postgres hands back 'HH:MM:SS'; the seconds are always zero. */
  time: string;
  /** 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'. */
  status: string;
};

/** The dashboard's filter state, all of it carried in the query string. */
export type LeadFilters = {
  q: string;
  /** A stage key, the pseudo-stage `open`, or '' for no filter. */
  stage: StageKey | "open" | "";
  source: SourceKey | "";
  group: SourceGroup | "";
};

export type SortKey =
  | "name"
  | "stage"
  | "source"
  | "created_at"
  | "email"
  | "score"
  | "next_action_at";

export type SortDirection = "asc" | "desc";

/**
 * `today` is the working view and the default: the queue a rep acts on. The
 * other three answer questions about the book; this one hands out the work.
 */
export type ViewKey = "today" | "table" | "board" | "charts";

/**
 * Fields a user may edit inline.
 *
 * `id` is the row's identity. `stage` and `lost` are the lifecycle pair, whose
 * consistency is the whole point of `setStageAction` — a free-text edit that
 * could close a lead without preserving how far it got would undo that.
 */
export type EditableField =
  | "name"
  | "title"
  | "company"
  | "email"
  | "phone"
  | "created_at"
  | "source"
  | "interest"
  | "notes"
  | "owner_id"
  | "next_action"
  | "next_action_at";
