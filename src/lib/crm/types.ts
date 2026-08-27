/**
 * Lead tracker domain types.
 *
 * Ported from the PHP prototype in `crm/lib/data.php`. Only fields we actually
 * capture at lead-collection time are modelled: who they are, how to reach
 * them, where they came from, where they are in the lifecycle, and whether
 * they are still in play. There is deliberately no deal value, owner or
 * activity log.
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
  | "email";

export type SortDirection = "asc" | "desc";

export type ViewKey = "table" | "board" | "charts";

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
  | "notes";
