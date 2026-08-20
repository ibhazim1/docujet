/**
 * Where the Google Sheet connection lives — the endpoint and shared secret
 * that both the CRM (`crm/sheets.ts`) and Settings (`settings/store.ts`) use
 * to reach the one Apps Script deployment.
 *
 * ---------------------------------------------------------------------------
 * Why this is NOT stored in the settings sheet like everything else
 *
 * Settings is persisted *through* this connection. Storing the endpoint inside
 * the sheet it tells you how to reach is circular — you would need the value
 * to read the value. So the admin-editable copy lives in a small local JSON
 * file instead, which needs nothing but a writable disk.
 *
 * Resolution order, highest first:
 *   1. the local override file (written from /admin/settings)
 *   2. CRM_SHEET_ENDPOINT / CRM_SHEET_SECRET
 *
 * Saved-wins matches how `integrations.n8nWebhookUrl` already overrides
 * `N8N_CHAT_WEBHOOK_URL`. A wrong value saved here is recoverable: the
 * Settings page renders its form even when the sheet is unreachable, so the
 * field can be retyped — or the file deleted to fall back to .env.
 *
 * The file is git-ignored and holds a live secret, so it is exactly as
 * sensitive as .env and belongs nowhere near a commit.
 * ---------------------------------------------------------------------------
 *
 * Read fresh on every call rather than cached: it changes only when an admin
 * saves, every caller that uses it is already about to make a network round
 * trip, and a stale cache here would mean an admin's own save appears not to
 * have taken. Sync I/O for the same reason `isSheetConfigured()` is sync —
 * callers ask this question from non-async code.
 *
 * No `server-only` marker, matching `sheets.ts`: `scripts/seed-crm-sheet.ts`
 * runs that module under plain Node, where the marker throws.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type SheetConnection = {
  endpoint: string;
  secret: string;
};

/** Which layer supplied a resolved field — surfaced in the admin UI. */
export type ConnectionSource = "saved" | "env" | "none";

export type ResolvedConnection = SheetConnection & {
  endpointSource: ConnectionSource;
  secretSource: ConnectionSource;
};

/**
 * The override file's location. `SHEET_CONNECTION_FILE` points it at a mounted
 * volume where the project directory itself is not writable.
 *
 * The `turbopackIgnore` comments on every fs call below are because that env
 * var makes the path non-static, which otherwise makes the build trace the
 * whole project into the server bundle. Nothing here reads a project file, so
 * there is genuinely nothing to trace.
 */
function storePath(): string {
  return process.env.SHEET_CONNECTION_FILE || join(process.cwd(), ".docujet", "connection.json");
}

/** The saved override, or an empty object when the file is absent or unreadable. */
function readOverride(): Partial<SheetConnection> {
  let raw: string;
  try {
    raw = readFileSync(/* turbopackIgnore: true */ storePath(), "utf8");
  } catch {
    // No file yet is the normal, expected state — env vars alone are a
    // perfectly good configuration.
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SheetConnection>;
    return {
      endpoint: typeof parsed.endpoint === "string" ? parsed.endpoint : undefined,
      secret: typeof parsed.secret === "string" ? parsed.secret : undefined,
    };
  } catch {
    console.warn(`[sheet-connection] ${storePath()} is not valid JSON, ignoring it.`);
    return {};
  }
}

export function resolveConnection(): ResolvedConnection {
  const saved = readOverride();
  const endpoint = saved.endpoint || process.env.CRM_SHEET_ENDPOINT || "";
  const secret = saved.secret || process.env.CRM_SHEET_SECRET || "";

  const sourceOf = (savedValue: string | undefined, resolved: string): ConnectionSource => {
    if (resolved === "") return "none";
    return savedValue ? "saved" : "env";
  };

  return {
    endpoint,
    secret,
    endpointSource: sourceOf(saved.endpoint, endpoint),
    secretSource: sourceOf(saved.secret, secret),
  };
}

/** True when both halves resolve to something. Lets a page degrade instead of crashing. */
export function isConnectionConfigured(): boolean {
  const { endpoint, secret } = resolveConnection();
  return Boolean(endpoint && secret);
}

/**
 * The connection, or a thrown explanation of which half is missing.
 *
 * Replaces the per-module `requireEnv()` helpers, so the message names both
 * places a value can come from rather than only the environment variable.
 */
export function requireConnection(): SheetConnection {
  const { endpoint, secret } = resolveConnection();
  const missing: string[] = [];
  if (!endpoint) missing.push("CRM_SHEET_ENDPOINT");
  if (!secret) missing.push("CRM_SHEET_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} not set. Fill in the ` +
        "Sheet connection fields on /admin/settings, or set the environment variables. See " +
        "scripts/apps-script/Code.gs for the setup steps.",
    );
  }
  return { endpoint, secret };
}

/**
 * Saves a sparse connection change.
 *
 * Sparse so a blank secret field means "keep what's saved" rather than
 * "erase it" — the same rule the settings form applies to every other secret.
 * Passing an empty string explicitly is how a field is cleared back to its
 * environment variable.
 */
export function updateConnection(patch: Partial<SheetConnection>): void {
  const current = readOverride();
  const next: Partial<SheetConnection> = {
    endpoint: patch.endpoint ?? current.endpoint,
    secret: patch.secret ?? current.secret,
  };

  // The file holds genuine overrides only. A key is dropped when it is empty
  // (cleared) or when it merely repeats the environment variable — both mean
  // "fall through to .env", which also keeps a later .env edit effective
  // instead of frozen under a copy of its own old value. Retyping the .env
  // secret is therefore how a saved secret is un-saved from the form, whose
  // blank field always means "keep".
  const body: Partial<SheetConnection> = {};
  if (next.endpoint && next.endpoint !== process.env.CRM_SHEET_ENDPOINT) {
    body.endpoint = next.endpoint;
  }
  if (next.secret && next.secret !== process.env.CRM_SHEET_SECRET) {
    body.secret = next.secret;
  }

  const path = storePath();
  try {
    mkdirSync(/* turbopackIgnore: true */ dirname(path), { recursive: true });
    writeFileSync(/* turbopackIgnore: true */ path, `${JSON.stringify(body, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (cause) {
    // Serverless platforms mount the app read-only, so this is a real
    // deployment shape rather than an unexpected failure — say what to do
    // instead of surfacing an ENOENT/EROFS.
    throw new Error(
      `Could not write ${path} (${cause instanceof Error ? cause.message : String(cause)}). ` +
        "On a read-only or ephemeral filesystem the sheet connection has to come from the " +
        "CRM_SHEET_ENDPOINT / CRM_SHEET_SECRET environment variables instead.",
    );
  }
}
