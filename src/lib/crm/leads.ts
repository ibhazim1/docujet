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
import { isOpenStageKey, isSourceKey } from "./taxonomy";
import type { EditableField, Lead, OpenStageKey, SourceKey } from "./types";

const TABLE = "crm_leads";

/** The row as Postgres holds it. */
type LeadRow = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  created_at: string;
  interest: string;
  chat_topic: string | null;
  cited: string[] | null;
  notes: string;
  lost: boolean;
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
  email: "email",
  phone: "phone",
  created_at: "created_at",
  source: "source",
  interest: "interest",
  notes: "notes",
};

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
    email: row.email ?? "",
    phone: row.phone ?? "",
    source: (isSourceKey(row.source) ? row.source : "form") as SourceKey,
    stage: (isOpenStageKey(row.stage) ? row.stage : "lead") as OpenStageKey,
    createdAt: row.created_at ?? "",
    interest: row.interest ?? "",
    chatTopic: row.chat_topic === null || row.chat_topic === "" ? null : row.chat_topic,
    cited: row.cited ?? [],
    notes: row.notes ?? "",
    lost: row.lost,
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
): Promise<boolean> {
  const { data, error } = await supabase()
    .from(TABLE)
    .update({ stage, lost })
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Could not update ${id}: ${error.message}`);
  }
  return (data ?? []).length > 0;
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
  const patch: Record<string, string> = {};
  const written: string[] = [];
  const skipped: string[] = [];

  for (const [field, value] of Object.entries(fields)) {
    const column = EDITABLE_COLUMNS[field as EditableField];
    if (column === undefined || value === undefined) {
      skipped.push(field);
      continue;
    }
    patch[column] = value;
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
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    stage: lead.stage,
    created_at: lead.createdAt,
    interest: lead.interest,
    chat_topic: lead.chatTopic,
    cited: lead.cited,
    notes: lead.notes,
    lost: lead.lost,
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
