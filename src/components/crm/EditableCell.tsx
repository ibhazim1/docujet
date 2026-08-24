"use client";

import { useState, useTransition } from "react";
import type { StageActionResult } from "@/lib/crm/actions";
import { updateLeadFieldAction } from "@/lib/crm/actions";
import type { EditableField } from "@/lib/crm/types";

type EditableCellProps = {
  leadId: string;
  field: EditableField;
  value: string;
  /** Shown when the value is empty, so the click target still has something to hit. */
  placeholder?: string;
  /** How a saved value is displayed when not being edited. */
  render?: (value: string) => React.ReactNode;
  type?: "text" | "email" | "tel" | "date";
  multiline?: boolean;
  readOnly?: boolean;
  isSample?: boolean;
  className?: string;
  onResult?: (result: StageActionResult) => void;
};

/**
 * A value that becomes an input when clicked.
 *
 * Click to edit, Enter or blur to save, Escape to abandon. An unchanged value
 * is not written, so tabbing through a row costs nothing.
 *
 * While a save is in flight the typed text is shown rather than the server's,
 * because the round-trip goes to the database and can take a moment. That
 * override is a single piece of state layered over the prop — not a mirror of
 * it — so once the write lands and the page refreshes, clearing the override
 * reveals the server's own value. A rejected write clears it too, which snaps
 * the cell back to what the database still holds.
 */
export default function EditableCell({
  leadId,
  field,
  value,
  placeholder = "—",
  render,
  type = "text",
  multiline = false,
  readOnly = false,
  isSample = false,
  className = "",
  onResult,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shown = pendingValue ?? value;

  function save(next: string) {
    setEditing(false);
    const trimmed = next.trim();
    if (trimmed === value) return;

    if (isSample) {
      onResult?.({
        ok: false,
        message: "Preview data — connect the database to edit leads.",
      });
      return;
    }

    setPendingValue(trimmed);
    startTransition(async () => {
      const result = await updateLeadFieldAction(leadId, field, trimmed);
      setPendingValue(null);
      onResult?.(result);
    });
  }

  if (readOnly) {
    return <span className={className}>{render ? render(shown) : shown || placeholder}</span>;
  }

  if (editing) {
    const shared = {
      autoFocus: true,
      defaultValue: shown,
      "aria-label": `${field} for ${leadId}`,
      className:
        "w-full min-w-0 rounded-lg border border-sky-700 bg-white px-2 py-1 text-sm text-slate-900 outline-none ring-4 ring-sky-100",
      onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        save(event.target.value),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setEditing(false);
        }
        // Enter saves — except in a textarea, where it should still break a line.
        if (event.key === "Enter" && !multiline) {
          event.preventDefault();
          save((event.target as HTMLInputElement).value);
        }
      },
    };

    return multiline ? <textarea rows={3} {...shared} /> : <input type={type} {...shared} />;
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={isPending}
      title="Click to edit"
      // Deliberately not truncating by default: a clipped phone number is
      // useless, and the caller knows which of its columns can spare the room.
      className={`-mx-1 block max-w-full rounded px-1 py-0.5 text-left transition hover:bg-sky-50 hover:ring-1 hover:ring-sky-200 disabled:opacity-50 ${className}`}
    >
      {shown ? (
        render ? (
          render(shown)
        ) : (
          shown
        )
      ) : (
        <span className="text-slate-400">{placeholder}</span>
      )}
    </button>
  );
}
