"use client";

/**
 * The browser's Supabase client — sign-in, sign-out, the sidebar's role lookup,
 * and the booking form.
 *
 * Its two configuration values do not come from `process.env` here, and that is
 * deliberate. Next only inlines an environment variable into a browser bundle
 * when its name begins with `NEXT_PUBLIC_`, so the obvious version of this file
 * forces the project to carry two variables marked public in every deployment
 * dashboard. The values are handed down from the server instead: the root
 * layout reads them and renders `<SupabaseBrowserConfig>`, which calls
 * `setBrowserSupabaseConfig()` below before anything can ask for a client.
 *
 * To be clear about what this does and does not buy: the publishable key still
 * reaches the browser — `signInWithPassword` runs there, so it must. What
 * changes is that the environment variable feeding it is an ordinary
 * server-side one (`SUPABASE_PUBLISHABLE_KEY`), read at request time, rather
 * than a build-time public constant. The key itself is designed to be public
 * and is useless on its own: `crm_leads`, `app_settings` and the `kb_*` tables
 * have RLS enabled with no policies, so it can read none of them.
 */

import { createBrowserClient } from "@supabase/ssr";

type BrowserSupabaseConfig = {
  url: string;
  publishableKey: string;
};

/**
 * Module scope rather than React context, so that `createClient()` keeps the
 * plain-function shape its four callers already use. A hook would mean every
 * one of them hoisting a call out of the event handler it lives in, for no
 * gain — there is exactly one configuration and it never changes for the life
 * of the page.
 */
let config: BrowserSupabaseConfig | null = null;

/** Called during render by `SupabaseBrowserConfig`, above every consumer in the tree. */
export function setBrowserSupabaseConfig(next: BrowserSupabaseConfig): void {
  config = next;
}

export function createClient() {
  if (!config?.url || !config?.publishableKey) {
    // Reached when SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are missing from the
    // environment, in which case the layout renders the config component with
    // empty strings. Naming both is worth it: this surfaces in a visitor's
    // console, and "supabaseUrl is required" from deep inside the library says
    // nothing about which deployment setting is at fault.
    throw new Error(
      "Supabase is not configured for the browser. SUPABASE_URL and " +
        "SUPABASE_PUBLISHABLE_KEY must be set on the server. See .env.example.",
    );
  }

  return createBrowserClient(config.url, config.publishableKey);
}
