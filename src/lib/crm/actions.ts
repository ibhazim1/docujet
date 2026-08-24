"use server";

/**
 * Stage edits.
 *
 * A port of the POST handler in `crm/index.php:29-71`, minus the machinery
 * Next provides for free: Server Actions are already origin-checked, so there
 * is no session CSRF token, and there is no POST/Redirect/GET cycle to guard
 * because the action mutates and calls `refresh()` rather than redirecting.
 */

import { refresh } from "next/cache";
import { findLead } from "./analytics";
import { fetchLeads, updateLeadFields, updateLeadStage } from "./leads";
import { isStageKey, isTerminal, STAGES } from "./taxonomy";
import type { EditableField, OpenStageKey } from "./types";

export type StageActionResult = {
  ok: boolean;
  message: string;
};

/**
 * Moves a lead, or closes it.
 *
 * Lost is a terminal flag, not a lifecycle position: choosing it closes the
 * lead and leaves its stage alone, so the funnel still knows how far it got.
 * Choosing any real stage reopens the lead, which is how a rep revives one
 * they had written off.
 */
export async function setStageAction(
  leadId: string,
  choice: string,
): Promise<StageActionResult> {
  if (!isStageKey(choice)) {
    return { ok: false, message: "Unknown stage." };
  }

  let lost = false;
  let stage: OpenStageKey;

  try {
    // Read the lead as it currently stands. Closing or reopening has to
    // preserve the stage it is on now, not the stage the row was seeded with.
    const lead = findLead(await fetchLeads(), leadId);
    if (lead === null) {
      return { ok: false, message: `${leadId} no longer exists.` };
    }

    lost = isTerminal(choice);
    stage = lost ? lead.stage : (choice as OpenStageKey);

    const saved = await updateLeadStage(leadId, stage, lost);
    if (!saved) {
      return { ok: false, message: `Could not find a row for ${leadId}.` };
    }
  } catch (cause) {
    // A misconfigured or unreachable database must surface as a message next to
    // the control the user just touched, not as a 500 that loses the page.
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not save the lead.",
    };
  }

  refresh();
  return {
    ok: true,
    message: `${leadId} ${lost ? "marked lost at" : "moved to"} ${STAGES[stage].label}.`,
  };
}

/**
 * Saves one inline edit.
 *
 * Trimmed but otherwise unvalidated: a lead book is a working document, and a
 * half-typed phone number a rep means to come back to is more useful than a
 * rejected one. The database is the record of what was actually captured.
 */
export async function updateLeadFieldAction(
  leadId: string,
  field: EditableField,
  value: string,
): Promise<StageActionResult> {
  try {
    const { written, skipped } = await updateLeadFields(leadId, { [field]: value.trim() });
    if (written.length === 0) {
      return {
        ok: false,
        message: `${skipped.join(", ")} is not an editable field, so nothing was saved.`,
      };
    }
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not save the lead.",
    };
  }

  refresh();
  return { ok: true, message: `${leadId} updated.` };
}

/** Reopening is "put it back where it already is, but open". */
export async function reopenAction(leadId: string): Promise<StageActionResult> {
  let lead;
  try {
    lead = findLead(await fetchLeads(), leadId);
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not read the leads table.",
    };
  }
  if (lead === null) {
    return { ok: false, message: `${leadId} no longer exists.` };
  }
  return setStageAction(leadId, lead.stage);
}
