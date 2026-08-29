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
 * live table would silently overwrite real leads that happen to share the
 * sample ids. Looking first costs one query.
 */

import { countLeads, recordEvent, seedLeads } from "../src/lib/crm/leads";
import { SAMPLE_LEADS } from "../src/lib/crm/sample-leads";
import { supabase, isSupabaseConfigured } from "../src/lib/supabase/service";

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

  const owners = await assignOwners();
  await seedEvents(owners);
}

/**
 * Spreads the seeded leads across whoever actually exists in `user_profiles`.
 *
 * `sample-leads.ts` cannot do this: `owner_id` is a foreign key, and a uuid
 * invented in a data file would fail the constraint on every row. So ownership
 * is assigned here, against real accounts, round-robin.
 *
 * Every fourth lead is deliberately left unowned. That is not laziness — an
 * unowned lead is a real and common state, it is what the ownership finding in
 * `insights.ts` exists to catch, and a seed book where everything has an owner
 * would leave that finding untestable.
 */
async function assignOwners(): Promise<Map<string, string>> {
  const owners = new Map<string, string>();

  const { data, error } = await supabase()
    .from("user_profiles")
    .select("id")
    .eq("is_active", true);

  if (error) {
    console.warn(`Could not read staff accounts, leaving every lead unowned: ${error.message}`);
    return owners;
  }

  const staff = (data ?? []) as { id: string }[];
  if (staff.length === 0) {
    console.log("No active staff accounts — leads seeded without owners.");
    return owners;
  }

  let assigned = 0;
  for (const [index, lead] of SAMPLE_LEADS.entries()) {
    if (index % 4 === 3) continue;
    const owner = staff[index % staff.length];
    const { error: writeError } = await supabase()
      .from("crm_leads")
      .update({ owner_id: owner.id })
      .eq("id", lead.id);
    if (!writeError) {
      owners.set(lead.id, owner.id);
      assigned += 1;
    }
  }

  console.log(`Assigned ${assigned} leads across ${staff.length} staff account(s).`);
  return owners;
}

/**
 * Gives each seeded lead the history it would have accumulated.
 *
 * Without this the timeline is empty on every row, the stage-velocity chart has
 * nothing to measure against and the contact log has no rows, which makes all
 * three look broken rather than new. Only what the row itself implies is
 * written — creation, the stage it reached, the last contact, the close — so
 * nothing here is invented beyond what the lead already asserts.
 *
 * Contact events are stamped with the lead's own `lastContactAt` and attributed
 * to its owner, so the contact log reads as a history that happened over weeks
 * rather than as fifty rows sharing one timestamp and no name.
 */
async function seedEvents(owners: Map<string, string>): Promise<void> {
  const { error } = await supabase()
    .from("lead_events")
    .delete()
    .in("lead_id", SAMPLE_LEADS.map((lead) => lead.id));

  if (error) {
    console.warn(`Could not clear old lead history: ${error.message}`);
    return;
  }

  let written = 0;
  for (const lead of SAMPLE_LEADS) {
    await recordEvent(lead.id, "created", {
      at: `${lead.createdAt}T09:00:00.000Z`,
      toStage: "lead",
      detail: `Captured from ${lead.source === "chatbot" ? "the website assistant" : lead.source}.`,
    });
    written += 1;

    if (lead.stage !== "lead") {
      await recordEvent(lead.id, "stage", {
        at: lead.stageChangedAt ?? undefined,
        actorId: owners.get(lead.id) ?? null,
        toStage: lead.stage,
        detail: `Progressed to ${lead.stage.toUpperCase()}.`,
      });
      written += 1;
    }

    if (lead.lastContactAt) {
      await recordEvent(lead.id, "contacted", {
        at: lead.lastContactAt,
        actorId: owners.get(lead.id) ?? null,
        detail: lead.source === "chatbot" ? "Followed up on the chat enquiry." : "Spoke to the lead.",
      });
      written += 1;
    }

    if (lead.chatTopic) {
      await recordEvent(lead.id, "chat_capture", {
        at: `${lead.createdAt}T09:30:00.000Z`,
        detail: `Left contact details in the chat panel after asking: ${lead.chatTopic}`,
      });
      written += 1;
    }

    if (lead.lost) {
      await recordEvent(lead.id, "lost", {
        fromStage: lead.stage,
        actorId: owners.get(lead.id) ?? null,
        detail: lead.lostReason
          ? `Closed lost: ${lead.lostReason.replace(/_/g, " ")}.`
          : "Closed lost, no reason recorded.",
      });
      written += 1;
    }
  }

  console.log(`Wrote ${written} history entries.`);
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
