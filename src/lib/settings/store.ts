/**
 * Persistence for site settings.
 *
 * Modeled directly on `src/lib/crm/sheets.ts` — a Google Sheet is the
 * database, reached through an Apps Script web app rather than the Sheets
 * REST API, for the same reason `sheets.ts` gives: no service account, no
 * downloadable key an org's Cloud policy can block.
 *
 * Shares the SAME Apps Script deployment, endpoint, and secret as the CRM's
 * `CRM_SHEET_ENDPOINT`/`CRM_SHEET_SECRET` — one script project to deploy and
 * one secret to manage, rather than a second parallel one. See
 * `scripts/apps-script/Code.gs`'s "SETTINGS TAB" section for the server-side
 * half (`readSettings`/`writeSettings`). Only the tab differs, via
 * `SETTINGS_SHEET_TAB` (default "Settings") — a different tab in the same
 * spreadsheet, or a different spreadsheet, either works.
 *
 * Not server-only-marked, matching `sheets.ts`'s own reasoning: a future
 * seed/CLI script may need to run this under plain Node, where that marker
 * throws.
 */

import { isConnectionConfigured, requireConnection, resolveConnection } from "../sheet-connection";
import { DEFAULT_SETTINGS } from "./defaults";
import type { SiteSettings } from "./types";

const CACHE_TTL_MS = 30_000;

// Keyed by connection — see `ResolvedConnection.fingerprint`. Without this,
// settings read through one admin's saved connection would be served to every
// other visitor for the next 30 seconds.
let cache: { key: string; settings: SiteSettings; at: number } | null = null;

/**
 * True when both halves of the connection resolve — from the environment, from
 * a file, or from what an admin saved on the Settings page itself. Those extra
 * sources are why this is not a plain `process.env` check, and why it is
 * async; see `sheet-connection.ts`.
 */
export async function isSettingsConfigured(): Promise<boolean> {
  return isConnectionConfigured();
}

export function settingsTab(): string {
  return process.env.SETTINGS_SHEET_TAB || "Settings";
}

type ScriptResponse = {
  ok: boolean;
  error?: string;
  values?: [string, string][];
};

/** Calls the shared Apps Script web app. Same POST/redirect/parse shape as `sheets.ts`'s `call()`. */
async function call(action: string, payload: Record<string, unknown> = {}): Promise<ScriptResponse> {
  const { endpoint, secret } = await requireConnection();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, action, secret, tab: settingsTab() }),
    redirect: "follow",
    cache: "no-store",
  });

  const body = await response.text();

  let parsed: ScriptResponse;
  try {
    parsed = JSON.parse(body) as ScriptResponse;
  } catch {
    throw new Error(
      `The settings endpoint returned ${response.status} and not JSON. Check that the Apps Script ` +
        'deployment is a Web app with "Execute as: Me" and "Who has access: Anyone", and that ' +
        "CRM_SHEET_ENDPOINT is the /exec URL of the current deployment.",
    );
  }

  if (!parsed.ok) {
    throw new Error(parsed.error ?? "The settings sheet rejected the request.");
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Merging — the sheet's key/value rows onto SiteSettings
//
// Suggestions are a list, but a sheet cell is one string, so they are joined
// with newlines (not commas — a suggestion's own text may contain one). The
// server action (`actions.ts`) writes rows in this same shape directly from
// its FormData, so there is no reverse (SiteSettings -> entries) direction
// to maintain here.
// ---------------------------------------------------------------------------

function numberOr(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Merges sheet rows onto `DEFAULT_SETTINGS`. Unknown or missing keys silently keep the default. */
function mergeEntries(rows: [string, string][]): SiteSettings {
  const found = new Map(rows);
  const get = (key: string): string | undefined => found.get(key);
  const base = DEFAULT_SETTINGS;

  return {
    business: {
      companyName: get("business.companyName") ?? base.business.companyName,
      phone: get("business.phone") ?? base.business.phone,
      email: get("business.email") ?? base.business.email,
      address: get("business.address") ?? base.business.address,
      hours: get("business.hours") ?? base.business.hours,
    },
    chat: {
      greeting: get("chat.greeting") ?? base.chat.greeting,
      suggestions: get("chat.suggestions")?.split("\n").filter((line) => line.trim() !== "") ??
        base.chat.suggestions,
      maxMessageChars: numberOr(get("chat.maxMessageChars"), base.chat.maxMessageChars),
      maxHistoryTurns: numberOr(get("chat.maxHistoryTurns"), base.chat.maxHistoryTurns),
      rateLimitWindowMs: numberOr(get("chat.rateLimitWindowMs"), base.chat.rateLimitWindowMs),
      rateLimitMaxRequests: numberOr(get("chat.rateLimitMaxRequests"), base.chat.rateLimitMaxRequests),
    },
    integrations: {
      n8nWebhookUrl: get("integrations.n8nWebhookUrl") ?? base.integrations.n8nWebhookUrl,
      plasmicProjectId: get("integrations.plasmicProjectId") ?? base.integrations.plasmicProjectId,
      plasmicApiToken: get("integrations.plasmicApiToken") ?? base.integrations.plasmicApiToken,
    },
  };
}

// ---------------------------------------------------------------------------
// Reading & writing
// ---------------------------------------------------------------------------

/**
 * Reads site settings.
 *
 * Returns `DEFAULT_SETTINGS` directly, with no network call, when no
 * connection resolves (neither saved nor env) — this is what makes the
 * settings page (and everything reading it) fully testable with zero Google
 * Cloud setup. Configured-but-unreachable (wrong secret, deployment not yet
 * updated with the Settings actions, network failure, ...) still throws —
 * `getSettingsSafe()` below is for callers that must not.
 */
export async function getSettings(): Promise<SiteSettings> {
  const { endpoint, secret, fingerprint } = await resolveConnection();
  if (!endpoint || !secret) {
    return DEFAULT_SETTINGS;
  }

  if (cache && cache.key === fingerprint && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.settings;
  }

  const rows = (await call("getSettings")).values ?? [];
  const settings = mergeEntries(rows);

  cache = { key: fingerprint, settings, at: Date.now() };
  return settings;
}

/**
 * `getSettings()`, but falls back to `DEFAULT_SETTINGS` on any failure
 * instead of throwing.
 *
 * For every caller where site-wide availability must never depend on the
 * Settings sheet being reachable — the root layout, the public-page
 * composition root, the chat API route. A real problem still needs to be
 * visible somewhere, so it's logged rather than swallowed silently; the
 * admin Settings page uses `getSettings()` directly instead of this, so an
 * admin sees the actual error rather than a quiet fallback.
 */
export async function getSettingsSafe(): Promise<SiteSettings> {
  try {
    return await getSettings();
  } catch (cause) {
    console.warn(
      "[settings] could not read the settings sheet, using defaults:",
      cause instanceof Error ? cause.message : cause,
    );
    return DEFAULT_SETTINGS;
  }
}

/** Drops the read cache. Called after every write. */
export function invalidateSettingsCache(): void {
  cache = null;
}

/**
 * Writes a sparse set of changed settings.
 *
 * Takes dot-path keys (e.g. `"business.phone"`), not a full `SiteSettings` —
 * this is what lets the server action omit a secret field the admin left
 * blank rather than overwriting it with an empty string. Values are always
 * strings; array/number fields are pre-serialized by the caller (newline-joined
 * lists, numbers as decimal text — the same conventions `mergeEntries` reads back).
 */
export async function updateSettings(patch: Record<string, string>): Promise<void> {
  await call("setSettings", { entries: patch });
  invalidateSettingsCache();
}
