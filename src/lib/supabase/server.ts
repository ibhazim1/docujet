/**
 * The Supabase client every server-side data module shares.
 *
 * This app has no browser-side database access at all: every read and write
 * happens in a server component, a server action, or a script. So there is one
 * client, created with the project's **secret** (service_role) key, and no
 * publishable/anon key anywhere — nothing Supabase-related is ever shipped to
 * the browser bundle.
 *
 * That key bypasses row-level security, which is the point: `crm_leads` and
 * `app_settings` have RLS enabled with zero policies, so the secret key is the
 * only thing that can reach them. See
 * `supabase/migrations/0001_crm_leads_and_settings.sql`.
 *
 * ---------------------------------------------------------------------------
 * Server-side only: `SUPABASE_SECRET_KEY` must never reach a `"use client"`
 * module. There is no `server-only` marker because `scripts/seed-leads.ts`
 * imports this under plain Node, where that marker throws — the same trade the
 * modules it replaced made.
 * ---------------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Memoized rather than created per call: the client is a thin stateless wrapper
// around fetch, but it also owns a connection-reuse agent worth keeping.
let client: SupabaseClient | null = null;

/**
 * True when both halves are set.
 *
 * Lets a page degrade into its sample-data state instead of crashing — the
 * whole admin area, and every public page that reads settings, still renders
 * with no Supabase project configured at all.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** The client, or a thrown explanation of which half is missing. */
export function supabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
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
