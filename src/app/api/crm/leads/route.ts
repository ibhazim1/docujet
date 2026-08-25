import { NextResponse } from "next/server";
import { resolveToday } from "@/lib/crm/analytics";
import { fetchLeads, isSupabaseConfigured } from "@/lib/crm/leads";
import { createClient } from "@/lib/supabase/server";

/**
 * The lead book, for a tracker that was not handed one.
 *
 * `/admin/leads` reads the rows on the server and passes them straight down, so
 * it never touches this. It exists for the Plasmic-authored version of the
 * page: there the tracker is assembled in Studio and rendered on the client,
 * with no server component above it to do the reading. Without this the
 * designer's page would quietly show the seed rows instead of the real book.
 *
 * The proxy only guards `/admin/*`, so the session check here is not
 * redundant — it is the only thing standing between this route and the whole
 * lead book, which `fetchLeads` reads with the RLS-bypassing service client.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const today = resolveToday(process.env.CRM_TODAY);

  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    // No auth configured at all — treat it as signed out rather than 500.
    signedIn = false;
  }

  if (!signedIn) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      leads: null,
      today,
      notice:
        "No Supabase project is configured — SUPABASE_URL and SUPABASE_SECRET_KEY are not set in .env.",
    });
  }

  try {
    return NextResponse.json({ leads: await fetchLeads(), today, notice: null });
  } catch (cause) {
    return NextResponse.json({
      leads: null,
      today,
      notice: cause instanceof Error ? cause.message : "Could not read the leads table.",
    });
  }
}
