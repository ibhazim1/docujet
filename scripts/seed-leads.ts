/**
 * Writes the seed lead book into `crm_leads`.
 *
 *   npm run db:seed            -- refuses if the table already has rows
 *   npm run db:seed -- --force -- upsert over whatever is there
 *
 * Runs outside Next, which is why `src/lib/supabase/service.ts` and
 * `src/lib/crm/leads.ts` carry no `server-only` marker — that marker throws
 * here. Run through `tsx` rather than Node's own type stripping: Node loads
 * this as ESM and so demands a file extension on every specifier in the whole
 * reachable graph, and app code under src/ is extensionless by design.
 *
 * The guard is the point. Seeding is destructive-adjacent: an upsert over a
 * live table would silently overwrite 46 real leads that happen to share the
 * sample ids. Looking first costs one query.
 */

import { countLeads, seedLeads } from "../src/lib/crm/leads";
import { SAMPLE_LEADS } from "../src/lib/crm/sample-leads";
import { isSupabaseConfigured } from "../src/lib/supabase/service";

async function main(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env before seeding. See .env.example.",
    );
  }

  const force = process.argv.includes("--force");
  const existing = await countLeads();

  if (existing > 0 && !force) {
    console.error(
      `crm_leads already holds ${existing} row${existing === 1 ? "" : "s"}. Seeding would ` +
        "overwrite any row sharing a sample id. Re-run with --force if that is what you want:\n" +
        "  npm run db:seed -- --force",
    );
    process.exitCode = 1;
    return;
  }

  const count = await seedLeads(SAMPLE_LEADS);
  console.log(`Seeded ${count} leads.`);
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
