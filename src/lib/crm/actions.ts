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
import {
  fetchLeads,
  logContact,
  recordEvent,
  updateLeadFields,
  updateLeadStage,
} from "./leads";
import { isLostReason, isStageKey, isTerminal, LOST_REASONS, STAGES } from "./taxonomy";
import { getCurrentStaffProfile } from "../supabase/authorization";
import type { EditableField, LostReason, OpenStageKey } from "./types";

export type StageActionResult = {
  ok: boolean;
  message: string;
};

/**
 * Who is doing this, for the activity log.
 *
 * Returns null rather than throwing when nobody is signed in. These actions
 * already sit behind the `/admin` proxy guard, so an unauthenticated caller is
 * not the threat model here — the null case is the Plasmic canvas and the
 * seed script, where an unattributed event is better than a failed write.
 *
 * Swallows its own failure for the same reason `recordEvent` does: not knowing
 * who pressed the button must never stop the button working.
 */
async function currentActorId(): Promise<string | null> {
  try {
    const profile = await getCurrentStaffProfile();
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

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
  reason?: string,
): Promise<StageActionResult> {
  if (!isStageKey(choice)) {
    return { ok: false, message: "Unknown stage." };
  }

  let lost = false;
  let stage: OpenStageKey;
  let lostReason: LostReason | null = null;

  try {
    // Read the lead as it currently stands. Closing or reopening has to
    // preserve the stage it is on now, not the stage the row was seeded with.
    const lead = findLead(await fetchLeads(), leadId);
    if (lead === null) {
      return { ok: false, message: `${leadId} no longer exists.` };
    }

    lost = isTerminal(choice);
    stage = lost ? lead.stage : (choice as OpenStageKey);

    if (lost) {
      // The reason is required at the moment of closing, and the refusal below
      // is the whole mechanism: a reason that can be skipped is a reason nobody
      // supplies, and `lossReasonStats()` then reports on a minority of the
      // evidence while looking authoritative. One click is the price of the
      // most useful report the business gets.
      if (!reason || !isLostReason(reason)) {
        return {
          ok: false,
          message: "Choose why this lead was lost — the loss report is only as good as this field.",
        };
      }
      lostReason = reason;
    }

    const stageMoved = !lost && lead.stage !== stage;
    const actorId = await currentActorId();

    const saved = await updateLeadStage(leadId, stage, lost, {
      // Reopening clears the cause of death. A live deal carrying one would show
      // up in the loss analysis as a loss that is somehow still in the pipeline.
      lostReason: lost ? lostReason : null,
      stageMoved,
    });
    if (!saved) {
      return { ok: false, message: `Could not find a row for ${leadId}.` };
    }

    if (lost) {
      await recordEvent(leadId, "lost", {
        fromStage: lead.stage,
        actorId,
        detail: `Closed lost at ${STAGES[lead.stage].label}: ${LOST_REASONS[lostReason!].label}.`,
      });
    } else if (lead.lost) {
      await recordEvent(leadId, "reopened", {
        toStage: stage,
        actorId,
        detail: `Reopened at ${STAGES[stage].label}.`,
      });
    } else if (stageMoved) {
      await recordEvent(leadId, "stage", {
        fromStage: lead.stage,
        toStage: stage,
        actorId,
        detail: `${STAGES[lead.stage].label} to ${STAGES[stage].label}.`,
      });
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
    message: lost
      ? `${leadId} marked lost at ${STAGES[stage].label} — ${LOST_REASONS[lostReason!].label}.`
      : `${leadId} moved to ${STAGES[stage].label}.`,
  };
}

/**
 * Records that somebody spoke to a lead.
 *
 * The single most load-bearing button added by this work. Every stall figure,
 * every going-cold play and the recency half of the score all measure from
 * `last_contact_at`, and until now nothing in the app could set it — so the
 * whole set of derived facts was quietly measuring "days since they last booked
 * something" instead.
 */
export async function logContactAction(
  leadId: string,
  note: string,
): Promise<StageActionResult> {
  try {
    const saved = await logContact(leadId, note.trim(), await currentActorId());
    if (!saved) {
      return { ok: false, message: `${leadId} no longer exists.` };
    }
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not record the contact.",
    };
  }

  refresh();
  return { ok: true, message: `Contact logged against ${leadId}.` };
}

/**
 * Sets what happens next, and when.
 *
 * Written as one action rather than two inline edits because the pair is only
 * meaningful together: a date with no commitment produces an overdue item
 * nobody can act on, and a commitment with no date never becomes overdue at
 * all. Clearing both is how a rep says there is nothing outstanding.
 */
export async function setNextActionAction(
  leadId: string,
  action: string,
  dueAt: string,
): Promise<StageActionResult> {
  const text = action.trim();
  const due = dueAt.trim();

  if (due !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    return { ok: false, message: "Give the due date as YYYY-MM-DD." };
  }
  if (due !== "" && text === "") {
    return { ok: false, message: "Say what is due, not just when — an unnamed task cannot be actioned." };
  }

  try {
    await updateLeadFields(leadId, { next_action: text, next_action_at: due });
    await recordEvent(leadId, "note", {
      actorId: await currentActorId(),
      detail: text === "" ? "Next action cleared." : `Next action: ${text}${due ? ` (due ${due})` : ""}.`,
    });
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not save the next action.",
    };
  }

  refresh();
  return {
    ok: true,
    message: text === "" ? `Next action cleared on ${leadId}.` : `Next action set on ${leadId}.`,
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

/**
 * Reopening is "put it back where it already is, but open".
 *
 * Routed through `setStageAction` so the loss reason is cleared and the
 * `reopened` event is logged by the one place that owns those rules.
 */
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
