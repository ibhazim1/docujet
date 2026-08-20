"use server";

/**
 * Settings edits.
 *
 * Mirrors `src/lib/crm/actions.ts`'s shape: read the form, write through the
 * store, refresh, report ok/message rather than throwing.
 */

import { refresh, revalidatePath } from "next/cache";
import { updateConnection } from "../sheet-connection";
import { SECRET_KEYS } from "./types";
import { invalidateSettingsCache, updateSettings } from "./store";

export type SettingsActionResult = {
  ok: boolean;
  message: string;
};

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function num(formData: FormData, key: string, fallback: number): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return String(fallback);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(fallback);
}

/**
 * Writes every submitted field.
 *
 * Secret fields (`SECRET_KEYS`) are only included in the patch when the
 * submitted value is non-empty. The form always renders these fields empty —
 * never pre-filled with the real secret — so a non-empty submission means the
 * admin deliberately retyped it. Enforced here, not just by the UI, so a
 * stale or replayed form can't accidentally blank out a live secret.
 */
export async function updateSettingsAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  const suggestions = formData
    .getAll("suggestions")
    .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");

  const patch: Record<string, string> = {
    "business.companyName": str(formData, "companyName"),
    "business.phone": str(formData, "phone"),
    "business.email": str(formData, "email"),
    "business.address": str(formData, "address"),
    "business.hours": str(formData, "hours"),
    "chat.greeting": str(formData, "greeting"),
    "chat.suggestions": suggestions.join("\n"),
    "chat.maxMessageChars": num(formData, "maxMessageChars", 1000),
    "chat.maxHistoryTurns": num(formData, "maxHistoryTurns", 8),
    "chat.rateLimitWindowMs": num(formData, "rateLimitWindowMs", 60_000),
    "chat.rateLimitMaxRequests": num(formData, "rateLimitMaxRequests", 15),
    "integrations.plasmicProjectId": str(formData, "plasmicProjectId"),
  };

  for (const key of SECRET_KEYS) {
    const submitted = str(formData, key);
    if (submitted !== "") {
      patch[`integrations.${key}`] = submitted;
    }
  }

  // The connection is saved first, and separately: it does not live in the
  // sheet (see sheet-connection.ts), and the sheet write below is the very
  // thing it decides the destination of. Saving it first is also what lets an
  // admin repair a broken connection — the write that follows then either
  // succeeds against the corrected endpoint, or fails with a message while the
  // correction itself stays saved.
  try {
    updateConnection({
      endpoint: str(formData, "sheetEndpoint"),
      // Blank means "keep", exactly as for the secrets above.
      secret: str(formData, "sheetSecret") || undefined,
    });
    // A different endpoint or secret is a different sheet; anything read from
    // the old one is no longer the answer.
    invalidateSettingsCache();
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not save the sheet connection.",
    };
  }

  try {
    await updateSettings(patch);
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not write to the settings sheet.",
    };
  }

  refresh();
  // Business info and chat config feed the public root layout, so every
  // visitor-facing page must pick up the change, not just this admin session.
  revalidatePath("/", "layout");

  return { ok: true, message: "Settings saved." };
}
