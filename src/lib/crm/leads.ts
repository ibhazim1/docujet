/**
 * Persistence for the lead book.
 *
 * One table, `crm_leads`, one row per lead — see
 * `supabase/migrations/0001_crm_leads_and_settings.sql` for the schema. This
 * replaces the Google Sheet the app used to read through an Apps Script web
 * app, and with it the header-alias guessing (`columns.ts`), the endpoint and
 * shared secret (`sheet-connection.ts`), and the 30-second read cache that
 * existed only because every read was a Google round-trip.
 *
 * Column names are snake_case in Postgres and camelCase in the `Lead` domain
 * type; `rowToLead` and `EDITABLE_COLUMNS` are the only two places that know
 * the mapping.
 *
 * ---------------------------------------------------------------------------
 * Server-side only, via `supabase()` — see `src/lib/supabase/service.ts` for why
 * there is no `server-only` marker.
 * ---------------------------------------------------------------------------
 */

import { supabase } from "../supabase/service";
import { SAMPLE_LEADS } from "./sample-leads";
import { isLostReason, isOpenStageKey, isSourceKey } from "./taxonomy";
import type {
  EditableField,
  Lead,
  LeadEvent,
  LeadEventKind,
  LostReason,
  OpenStageKey,
  SourceKey,
} from "./types";

const TABLE = "crm_leads";
const EVENTS_TABLE = "lead_events";

/** The row as Postgres holds it. */
type LeadRow = {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  created_at: string;
  interest: string;
  chat_topic: string | null;
  last_contact_at: string | null;
  cited: string[] | null;
  notes: string;
  lost: boolean;
  // Added by 0006. Optional on the way in so a read against a database that has
  // not had the migration applied degrades to the previous behaviour instead of
  // throwing — the tracker then shows no history and no commitments, which is
  // exactly what it showed before.
  owner_id?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
  lost_reason?: string | null;
  stage_changed_at?: string | null;
};

/** One row of `lead_events`, as Postgres holds it. */
type LeadEventRow = {
  id: number;
  lead_id: string;
  at: string;
  kind: string;
  from_stage: string | null;
  to_stage: string | null;
  actor_id: string | null;
  detail: string | null;
};

/**
 * The columns an inline edit may write, and where each one lands.
 *
 * This allowlist is the guard the Apps Script used to apply on its own side: a
 * field arriving from the client that is not in this map is refused rather than
 * passed through to the update. `id` is the row's identity, and `stage`/`lost`
 * are the lifecycle pair that `updateLeadStage` keeps consistent — none of the
 * three is reachable from here.
 */
const EDITABLE_COLUMNS: Record<EditableField, string> = {
  name: "name",
  title: "title",
  company: "company",
  email: "email",
  phone: "phone",
  created_at: "created_at",
  source: "source",
  interest: "interest",
  notes: "notes",
  owner_id: "owner_id",
  next_action: "next_action",
  next_action_at: "next_action_at",
};

/**
 * Fields that must reach Postgres as NULL rather than as an empty string.
 *
 * `owner_id` is a uuid and `next_action_at` is a date; an empty string is a
 * type error for both, and would surface to the user as an opaque database
 * message when what they did was clear a field. Clearing is a legitimate edit —
 * it is how a rep unassigns a lead or drops a follow-up date — so it is
 * translated here rather than refused.
 */
const NULLABLE_COLUMNS = new Set<EditableField>(["owner_id", "next_action_at"]);

/**
 * True when a Supabase project is configured. Lets the page degrade instead of
 * crashing.
 */
export { isSupabaseConfigured } from "../supabase/service";

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Turns one row into a lead.
 *
 * An unrecognised `source` or `stage` is repaired rather than trusted. The
 * CHECK constraints on the table make that near-unreachable now, but a stage
 * key that is unknown *or terminal* would corrupt the funnel's suffix sums,
 * which assume every lead's stage is a real step — so the guard stays, at no
 * cost.
 */
function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name ?? "",
    title: row.title ?? "",
    company: row.company ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    source: (isSourceKey(row.source) ? row.source : "form") as SourceKey,
    stage: (isOpenStageKey(row.stage) ? row.stage : "lead") as OpenStageKey,
    createdAt: row.created_at ?? "",
    interest: row.interest ?? "",
    chatTopic: row.chat_topic === null || row.chat_topic === "" ? null : row.chat_topic,
    lastContactAt: row.last_contact_at ?? null,
    cited: row.cited ?? [],
    notes: row.notes ?? "",
    lost: row.lost,
    ownerId: row.owner_id ?? null,
    nextAction: row.next_action ?? "",
    nextActionAt: row.next_action_at ?? null,
    // Repaired rather than trusted, exactly as `source` and `stage` are above: a
    // reason outside the vocabulary would show up in the loss chart as its own
    // silent category and misstate every share in it.
    lostReason: (row.lost_reason && isLostReason(row.lost_reason)
      ? row.lost_reason
      : null) as LostReason | null,
    stageChangedAt: row.stage_changed_at ?? null,
  };
}

/** Turns one `lead_events` row into a timeline entry. */
function rowToEvent(row: LeadEventRow, actors: Map<string, string>): LeadEvent {
  return {
    id: row.id,
    leadId: row.lead_id,
    at: row.at,
    kind: row.kind as LeadEventKind,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    actorId: row.actor_id,
    actorName: row.actor_id ? actors.get(row.actor_id) ?? null : null,
    detail: row.detail ?? "",
  };
}

/**
 * Reads the whole lead book.
 *
 * Every filter, sort and aggregate still runs in JS over this array (see
 * `analytics.ts`), so the read is deliberately unfiltered — pushing that work
 * into SQL is a later change, and the indexes are already in place for it.
 *
 * Ordered rather than left to the database's discretion: the table view's
 * default sort is `created_at` descending and `sortLeads` reverses a stable
 * sort, so ties inherit this order, and the board's columns are built by
 * filtering this array in place. Sheet row position used to decide both.
 */
export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Could not read leads: ${error.message}`);
  }
  return (data as LeadRow[]).map(rowToLead);
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Records a stage change.
 *
 * `stage` is always a lifecycle position, never the terminal state — closing a
 * lead sets `lost` and leaves the stage alone, so reopening it later restores
 * it to where it actually was.
 *
 * Returns false when no row carried that id, which is how the caller
 * distinguishes "the lead is gone" from "the write failed".
 */
export async function updateLeadStage(
  id: string,
  stage: OpenStageKey,
  lost: boolean,
  options: { lostReason?: LostReason | null; stageMoved?: boolean } = {},
): Promise<boolean> {
  const patch: Record<string, unknown> = { stage, lost };

  // Only stamp the clock when the stage actually moved. Closing a lead, or
  // reopening one, leaves it exactly where it was — restarting the dwell timer
  // for those would make every closed-and-reopened deal look freshly promoted
  // and hide the fact that it has been stuck for months.
  if (options.stageMoved) {
    patch.stage_changed_at = new Date().toISOString();
  }

  // Undefined means the caller is not touching the reason. Null means clear it,
  // which is what reopening a lead has to do — a live deal with a recorded
  // cause of death would corrupt the loss analysis.
  if (options.lostReason !== undefined) {
    patch.lost_reason = options.lostReason;
  }

  const { data, error } = await supabase()
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Could not update ${id}: ${error.message}`);
  }
  return (data ?? []).length > 0;
}

/**
 * Records that somebody spoke to a lead.
 *
 * The one write that had no path in the app at all: `last_contact_at` existed
 * from 0002 and was stamped only by `create_booking`, which meant the column
 * said "when they last booked something", not "when we last spoke". Every stall
 * and going-cold calculation rests on this being true, so it needs a control a
 * rep can press.
 */
export async function logContact(
  id: string,
  note: string,
  actorId: string | null = null,
): Promise<boolean> {
  const at = new Date().toISOString();

  const { data, error } = await supabase()
    .from(TABLE)
    .update({ last_contact_at: at })
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Could not update ${id}: ${error.message}`);
  }
  if ((data ?? []).length === 0) return false;

  // The actor is the whole point of the contact log: "someone rang them on
  // Tuesday" is a fact nobody can follow up on, and an unattributed log is what
  // a team ends up with when the name is optional.
  await recordEvent(id, "contacted", { detail: note || "Contacted.", actorId });
  return true;
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

/**
 * Appends one event to a lead history.
 *
 * Deliberately swallows its own failure. The history is valuable and it is not
 * the record of what happened — `crm_leads` is — so a logging problem must
 * never turn a successful stage change into an error message that makes a rep
 * click it again. The failure is logged where an operator will see it.
 */
export async function recordEvent(
  leadId: string,
  kind: LeadEventKind,
  fields: {
    fromStage?: string | null;
    toStage?: string | null;
    actorId?: string | null;
    detail?: string;
    /**
     * ISO timestamp. Omitted for anything happening now, which is every real
     * write — it exists so the seed script can lay down a history that has
     * actually elapsed. Without it every seeded contact shares one timestamp
     * and the contact log renders as a single moment.
     */
    at?: string;
  } = {},
): Promise<void> {
  const { error } = await supabase()
    .from(EVENTS_TABLE)
    .insert({
      lead_id: leadId,
      kind,
      from_stage: fields.fromStage ?? null,
      to_stage: fields.toStage ?? null,
      actor_id: fields.actorId ?? null,
      detail: fields.detail ?? "",
      ...(fields.at ? { at: fields.at } : {}),
    });

  if (error) {
    console.warn(`[crm] could not log ${kind} on ${leadId}: ${error.message}`);
  }
}

/**
 * Reads the whole activity log, newest first.
 *
 * Capped, and read in one go for the same reason the appointments are: the
 * tracker already holds the entire book in the browser and does every lookup
 * there, so one bounded array costs far less than a round-trip each time a lead
 * card opens. The cap is generous enough to cover every lead in a book this
 * size and finite enough that it cannot become the slow query later.
 */
export async function fetchLeadEvents(limit = 2000): Promise<LeadEvent[]> {
  const { data, error } = await supabase()
    .from(EVENTS_TABLE)
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);

  if (error) {
    // A missing table means 0006 has not been applied. The timeline is an
    // addition to the lead card, not the card itself, so an empty history is a
    // better answer than a page that will not render.
    console.warn(`[crm] could not read lead events: ${error.message}`);
    return [];
  }

  const rows = data as LeadEventRow[];

  // Staff names, resolved once for the whole batch. A second small query rather
  // than a PostgREST embedded select: the embedded-resource naming depends on
  // the foreign key's name and breaks quietly if that is ever changed, and the
  // contact log needs these names in the browser where it cannot go and get
  // them itself.
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const actors = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase()
      .from("user_profiles")
      .select("id, full_name")
      .in("id", actorIds);

    if (profileError) {
      // The history is still worth showing unattributed; the contact log says
      // "not recorded" rather than losing the row.
      console.warn(`[crm] could not resolve event actors: ${profileError.message}`);
    } else {
      for (const p of (profiles ?? []) as { id: string; full_name: string }[]) {
        actors.set(p.id, p.full_name);
      }
    }
  }

  return rows.map((row) => rowToEvent(row, actors));
}

/**
 * Writes edited fields onto one lead's row.
 *
 * Reports which fields it wrote and which it refused, so the caller can say
 * something specific rather than "the save failed". A field is skipped when it
 * is not in `EDITABLE_COLUMNS` — that is the guard, not a schema quirk, so the
 * message it produces should say so.
 */
export async function updateLeadFields(
  id: string,
  fields: Partial<Record<EditableField, string>>,
): Promise<{ written: string[]; skipped: string[] }> {
  const patch: Record<string, string | number | null> = {};
  const written: string[] = [];
  const skipped: string[] = [];

  for (const [field, value] of Object.entries(fields)) {
    const key = field as EditableField;
    const column = EDITABLE_COLUMNS[key];
    if (column === undefined || value === undefined) {
      skipped.push(field);
      continue;
    }

    if (NULLABLE_COLUMNS.has(key) && value.trim() === "") {
      patch[column] = null;
    } else {
      patch[column] = value;
    }
    written.push(field);
  }

  if (written.length === 0) {
    return { written, skipped };
  }

  const { data, error } = await supabase()
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Could not update ${id}: ${error.message}`);
  }
  if ((data ?? []).length === 0) {
    throw new Error(`${id} no longer exists.`);
  }
  return { written, skipped };
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/** Serialises one lead into its row. The inverse of `rowToLead`. */
export function leadToRow(lead: Lead): LeadRow {
  return {
    id: lead.id,
    name: lead.name,
    title: lead.title,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    stage: lead.stage,
    created_at: lead.createdAt,
    interest: lead.interest,
    chat_topic: lead.chatTopic,
    last_contact_at: lead.lastContactAt,
    cited: lead.cited,
    notes: lead.notes,
    lost: lead.lost,
    // Seed leads name no real staff member, and a uuid that is not in
    // `user_profiles` would violate the foreign key. Ownership on seeded rows is
    // therefore assigned by the seed script against whoever actually exists.
    owner_id: lead.ownerId,
    next_action: lead.nextAction,
    next_action_at: lead.nextActionAt,
    lost_reason: lead.lostReason,
    stage_changed_at: lead.stageChangedAt,
  };
}

/** Writes the seed leads, replacing any row that already carries the same id. */
export async function seedLeads(leads: Lead[] = SAMPLE_LEADS): Promise<number> {
  const { error } = await supabase()
    .from(TABLE)
    .upsert(leads.map(leadToRow), { onConflict: "id" });

  if (error) {
    throw new Error(`Could not seed leads: ${error.message}`);
  }
  return leads.length;
}

/** How many leads the table holds. Lets the seed script look before it writes. */
export async function countLeads(): Promise<number> {
  const { count, error } = await supabase()
    .from(TABLE)
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Could not count leads: ${error.message}`);
  }
  return count ?? 0;
}
