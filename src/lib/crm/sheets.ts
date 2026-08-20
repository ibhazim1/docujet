/**
 * Persistence for the lead book.
 *
 * The Google Sheet *is* the database — this replaces both `data.php` (fixed
 * sample rows) and `storage.php` (a JSON overlay of stage edits) from the PHP
 * prototype. It is the only module in the app that talks to Google, so
 * swapping the sheet for a real database later means rewriting this file and
 * nothing else.
 *
 * Sheet layout — one tab, `Leads`, header row in row 1:
 *
 * Columns are located by header name, not position — see `columns.ts` for
 * the accepted spellings. Only `id` is required.
 *
 * Rows are read by header name rather than position, so inserting a column in
 * the sheet does not silently shift every field by one.
 *
 * ---------------------------------------------------------------------------
 * Why an Apps Script web app rather than the Sheets REST API
 *
 * The REST API needs a service account, and a service account needs a
 * downloadable JSON key — which Google Cloud organisations routinely block
 * with `iam.disableServiceAccountKeyCreation`. A bound Apps Script needs no
 * Cloud project at all: it runs as the sheet's owner, on their own document,
 * so there is no key to be blocked and no Drive sharing rule to relax.
 *
 * The trade is that the endpoint is reachable by anyone with the URL, so every
 * request carries a shared secret that the script checks before doing
 * anything. See `scripts/apps-script/Code.gs` for the other half and the
 * deployment steps.
 * ---------------------------------------------------------------------------
 *
 * Server-side only: `CRM_SHEET_SECRET` must never reach a `"use client"`
 * module. It carries no `server-only` marker because
 * `scripts/seed-crm-sheet.ts` runs it under plain Node, where that marker
 * throws.
 */

import { isConnectionConfigured, requireConnection } from "../sheet-connection";
import { CANONICAL_HEADERS, coerceLost, resolveColumns } from "./columns";
import type { ColumnMap } from "./columns";
import { SAMPLE_LEADS } from "./sample-leads";
import { isOpenStageKey, isSourceKey } from "./taxonomy";
import type { EditableField, Lead, OpenStageKey, SourceKey } from "./types";

/** Canonical header row, written by the seed script. */
export const SHEET_COLUMNS = CANONICAL_HEADERS;

/** How long a read is reused before the sheet is consulted again. */
const CACHE_TTL_MS = 30_000;

// Keyed by connection: an admin whose browser points at a different sheet
// must not be served rows another request cached from the previous one. See
// `ResolvedConnection.fingerprint`.
let cache: { key: string; leads: Lead[]; at: number } | null = null;

/**
 * True when the endpoint and secret are present. Lets the page degrade instead
 * of crashing.
 *
 * Either half may come from the environment or from what an admin saved on
 * /admin/settings — see `sheet-connection.ts` for the precedence. Async
 * because one of those layers is the request's own cookies.
 */
export async function isSheetConfigured(): Promise<boolean> {
  return isConnectionConfigured();
}

/**
 * The tab holding the lead book.
 *
 * Sent with every request rather than hardcoded in the script, so renaming a
 * tab — or pointing a second environment at a different one — is a .env change
 * and needs no redeploy. `DEFAULT_TAB` in Code.gs is only the fallback for a
 * request that names none.
 */
export function leadsTab(): string {
  return process.env.CRM_SHEET_TAB || "Leads";
}

type ScriptResponse = {
  ok: boolean;
  error?: string;
  values?: string[][];
  count?: number;
  row?: number;
  written?: string[];
  skipped?: string[];
};

/**
 * Calls the Apps Script web app.
 *
 * Apps Script answers a POST with a 302 to `script.googleusercontent.com`
 * holding the already-computed output, so the mutation has happened by the
 * time the redirect is followed. `fetch` follows it by default; that is the
 * intended flow, not an accident.
 */
async function call(action: string, payload: Record<string, unknown> = {}): Promise<ScriptResponse> {
  const { endpoint, secret } = await requireConnection();

  const response = await fetch(endpoint, {
    method: "POST",
    // text/plain keeps Apps Script from rejecting the request; it reads the raw
    // body either way.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, action, secret, tab: leadsTab() }),
    redirect: "follow",
    cache: "no-store",
  });

  const body = await response.text();

  let parsed: ScriptResponse;
  try {
    parsed = JSON.parse(body) as ScriptResponse;
  } catch {
    // An HTML body means Google served a sign-in or error page rather than the
    // script — almost always the deployment's access setting.
    throw new Error(
      `The leads endpoint returned ${response.status} and not JSON. Check that the Apps Script ` +
        'deployment is a Web app with "Execute as: Me" and "Who has access: Anyone", and that ' +
        "CRM_SHEET_ENDPOINT is the /exec URL of the current deployment.",
    );
  }

  if (!parsed.ok) {
    throw new Error(parsed.error ?? "The leads sheet rejected the request.");
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Turns one sheet row into a lead.
 *
 * Returns null for a row with no id — a trailing blank row in the sheet is
 * normal and must not become a ghost lead.
 *
 * Columns the sheet does not have yield empty strings; a sheet that records no
 * job titles or notes is a perfectly good lead book, just a sparser one.
 *
 * An unrecognised `source` or `stage` is repaired rather than trusted. A stage
 * key that is unknown *or terminal* would corrupt the funnel's suffix sums,
 * which assume every lead's stage is a real step — the same defence
 * `apply_overrides()` applies in the PHP.
 */
function rowToLead(row: string[], columns: ColumnMap): Lead | null {
  const cell = (field: keyof ColumnMap["index"]): string => {
    const at = columns.index[field];
    return at === -1 ? "" : (row[at] ?? "").toString().trim();
  };

  const id = cell("id");
  if (id === "") return null;

  const source = cell("source");
  const stage = cell("stage");
  const chatTopic = cell("chat_topic");
  const cited = cell("cited");

  return {
    id,
    name: cell("name"),
    title: cell("title"),
    email: cell("email"),
    phone: cell("phone"),
    source: (isSourceKey(source) ? source : "form") as SourceKey,
    stage: (isOpenStageKey(stage) ? stage : "lead") as OpenStageKey,
    createdAt: cell("created_at"),
    interest: cell("interest"),
    chatTopic: chatTopic === "" ? null : chatTopic,
    cited: cited === "" ? [] : cited.split(",").map((entry) => entry.trim()).filter(Boolean),
    notes: cell("notes"),
    lost: coerceLost(cell("lost")),
  };
}

/**
 * Reads the whole lead book.
 *
 * Cached in-process for 30 seconds so that rapid filter changes and repeated
 * renders do not each cost a round-trip. Writes clear it, so an edit is
 * visible immediately. (The framework-level alternative, `use cache`, needs
 * `cacheComponents: true` in next.config.ts — a project-wide mode change that
 * would affect every existing page, so it is left for later.)
 */
export async function fetchLeads(): Promise<Lead[]> {
  const { fingerprint } = await requireConnection();
  if (cache && cache.key === fingerprint && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.leads;
  }

  const rows = (await call("list")).values ?? [];
  if (rows.length < 2) {
    cache = { key: fingerprint, leads: [], at: Date.now() };
    return [];
  }

  const columns = resolveColumns(rows[0]);
  if (columns.index.id === -1) {
    throw new Error(
      `No id column found in "${leadsTab()}". Its header row reads: ` +
        `${rows[0].join(", ")}. Rename the identifier column to "id" or "Lead ID", ` +
        'or run "npm run crm:seed" to lay the tab out from scratch.',
    );
  }

  const leads = rows
    .slice(1)
    .map((row) => rowToLead(row, columns))
    .filter((lead): lead is Lead => lead !== null);

  cache = { key: fingerprint, leads, at: Date.now() };
  return leads;
}

/**
 * The tab's header row and data-row count, without interpreting either.
 *
 * Lets the seed script look before it overwrites: `fetchLeads` would either
 * throw or quietly repair a foreign layout, and neither answers the only
 * question that matters — is there something here that is not ours?
 */
export async function peekTab(): Promise<{
  header: string[];
  rows: number;
  columns: ColumnMap;
}> {
  const values = (await call("list")).values ?? [];
  const header = (values[0] ?? []).map((name) => name.toString().trim());
  return {
    header,
    rows: Math.max(values.length - 1, 0),
    columns: resolveColumns(header),
  };
}

/** Drops the read cache. Called after every write. */
export function invalidateLeadsCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Records a stage change.
 *
 * `stage` is always a lifecycle position, never the terminal state — closing a
 * lead sets `lost` and leaves the stage alone, so reopening it later restores
 * it to where it actually was. The script resolves the row by id at write
 * time, so a re-sorted sheet cannot misdirect the edit.
 */
export async function updateLeadStage(
  id: string,
  stage: OpenStageKey,
  lost: boolean,
): Promise<boolean> {
  await call("setStage", { id, stage, lost });
  invalidateLeadsCache();
  return true;
}

/**
 * Writes edited fields onto one lead's row.
 *
 * Which columns exist is the sheet's business, so the script resolves them and
 * reports anything it could not place. `id`, `stage` and `lost` are refused
 * there — the lifecycle pair belongs to `updateLeadStage`, which keeps the two
 * consistent.
 */
export async function updateLeadFields(
  id: string,
  fields: Partial<Record<EditableField, string>>,
): Promise<{ written: string[]; skipped: string[] }> {
  const response = await call("setFields", { id, fields });
  invalidateLeadsCache();
  return { written: response.written ?? [], skipped: response.skipped ?? [] };
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/** Serialises one lead into a sheet row, in `SHEET_COLUMNS` order. */
export function leadToRow(lead: Lead): string[] {
  return [
    lead.id,
    lead.name,
    lead.title,
    lead.email,
    lead.phone,
    lead.source,
    lead.stage,
    lead.createdAt,
    lead.interest,
    lead.chatTopic ?? "",
    lead.cited.join(","),
    lead.notes,
    lead.lost ? "TRUE" : "FALSE",
  ];
}

/** Clears the tab and writes the header plus every seed lead. */
export async function seedSheet(leads: Lead[] = SAMPLE_LEADS): Promise<number> {
  const response = await call("seed", { rows: leads.map(leadToRow) });
  invalidateLeadsCache();
  return response.count ?? leads.length;
}
