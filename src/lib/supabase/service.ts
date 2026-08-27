/**
 * The privileged Supabase client — service role, no user session.
 *
 * There are two server-side clients in this app and they are not
 * interchangeable:
 *
 *   - `server.ts` builds a client from the **publishable** key and the
 *     request's cookies. It acts as the signed-in admin and is subject to
 *     row-level security. Auth and anything RLS should scope to a user goes
 *     through it.
 *   - this one uses the **secret** (service_role) key, carries no session, and
 *     bypasses RLS entirely.
 *
 * `crm_leads` and `app_settings` have RLS enabled with zero policies, so this
 * client is the only thing that can reach them at all — see
 * `supabase/migrations/0001_crm_leads_and_settings.sql`. A publishable-key
 * client reads those tables as an empty array with no error, which is why
 * importing the wrong one here fails silently rather than loudly.
 *
 * Importing this module is therefore a deliberate statement that the caller
 * intends to bypass RLS. Today that is the lead book, the settings
 * store, the two /admin tables in `admin.ts`, and the seed script.
 *
 * ---------------------------------------------------------------------------
 * Server-side only: `SUPABASE_SECRET_KEY` must never reach a `"use client"`
 * module, and must never be given a NEXT_PUBLIC_ alias. There is no
 * `server-only` marker because `scripts/seed-leads.ts` imports this under
 * plain Node, where that marker throws.
 * ---------------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Memoized rather than created per call: the client is a thin stateless wrapper
// around fetch, but it also owns a connection-reuse agent worth keeping.
let client: SupabaseClient | null = null;

/**
 * The project URL.
 *
 * One entry in .env now serves every client: `server.ts` and `proxy.ts` read
 * this same name, and the browser is handed it by the root layout. The
 * `NEXT_PUBLIC_SUPABASE_URL` fallback that used to live here went away with
 * those variables. The key deliberately has no such sharing — the secret one
 * and the publishable one are different values and must stay so.
 */
function projectUrl(): string | undefined {
  return process.env.SUPABASE_URL;
}

/**
 * True when both halves are set.
 *
 * Lets a page degrade into its sample-data state instead of crashing — the
 * lead tracker and settings form still render with no Supabase project
 * configured at all.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(projectUrl() && process.env.SUPABASE_SECRET_KEY);
}

/** The client, or a thrown explanation of which half is missing. */
export function supabase(): SupabaseClient {
  if (client) return client;

  const url = projectUrl();
  const key = process.env.SUPABASE_SECRET_KEY;

  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SECRET_KEY");

  if (!url || !key) {
    throw new Error(
      `${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} not set. Copy the project ` +
        "URL and the service_role (secret) key from the Supabase dashboard — Project Settings > " +
        "Data API and Project Settings > API Keys — into .env. See .env.example.",
    );
  }

  client = createClient(url, key, {
    // There is no browser session to persist and no user token to refresh:
    // this client authenticates as the service role, once, from the server.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
