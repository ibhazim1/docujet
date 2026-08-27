"use client";

/**
 * Hands the browser its Supabase configuration.
 *
 * Rendered once by the root layout, which is a Server Component and can
 * therefore read `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` directly. This
 * is what lets `src/lib/supabase/client.ts` work without either value being a
 * `NEXT_PUBLIC_` build-time constant — see the note at the top of that file for
 * what that is and is not worth.
 *
 * Assigned during render rather than in an effect: every consumer reaches for a
 * client from an event handler or a mount effect, both of which run after this
 * component's render, and an effect here would only add a window in which they
 * could run first. The call is idempotent, so React rendering it twice in
 * development changes nothing.
 */

import { setBrowserSupabaseConfig } from "@/lib/supabase/client";

type SupabaseBrowserConfigProps = {
  url: string;
  publishableKey: string;
};

export default function SupabaseBrowserConfig({
  url,
  publishableKey,
}: SupabaseBrowserConfigProps) {
  setBrowserSupabaseConfig({ url, publishableKey });
  return null;
}
