"use client";

import { useLeadTracker } from "./TrackerContext";

type FlashMessageProps = {
  /** Shown in the canvas so the banner can be styled while nothing has happened. */
  previewText?: string;
  className?: string;
};

/**
 * The result of the last edit.
 *
 * Renders nothing until a save succeeds or fails — set a preview text to keep
 * it visible while designing.
 */
export default function FlashMessage({ previewText = "", className = "" }: FlashMessageProps) {
  const { flash } = useLeadTracker();

  const ok = flash ? flash.ok : true;
  const message = flash?.message ?? previewText;
  if (!message) return null;

  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
        ok ? "border-sky-200 bg-sky-50 text-sky-900" : "border-rose-200 bg-rose-50 text-rose-900"
      } ${className}`}
    >
      {message}
    </p>
  );
}
