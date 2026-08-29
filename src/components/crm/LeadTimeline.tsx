"use client";

import Explain from "./Explain";
import { useLeadTracker } from "./TrackerContext";
import type { LeadEventKind } from "@/lib/crm/types";

export type LeadTimelineProps = {
  leadId?: string;
  limit?: number;
  className?: string;
};

/** A dot colour per kind, so the shape of a history reads before the words do. */
const KIND_DOT: Record<LeadEventKind, string> = {
  created: "#94a3b8",
  stage: "#2a78d6",
  contacted: "#0d9488",
  note: "#cbd5e1",
  lost: "#dc2626",
  reopened: "#f59e0b",
  appointment: "#7c3aed",
  chat_capture: "#0891b2",
};

function when(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * What has actually happened to this lead.
 *
 * The notes field was the only history the app had, which made it both the
 * record of the current situation and the record of how it got there — two jobs
 * that fight each other, since keeping the second means never editing the
 * first. This separates them: notes say where things stand, the timeline says
 * what was done.
 *
 * Renders nothing at all when there is no history, rather than an empty frame.
 * A lead seeded before `lead_events` existed genuinely has none, and a heading
 * over a blank box reads as a bug rather than as an absence.
 */
export default function LeadTimeline({ leadId, limit = 12, className = "" }: LeadTimelineProps) {
  const { eventsFor, selected, visible } = useLeadTracker();

  const id = leadId || selected?.id || visible[0]?.id || "";
  const events = eventsFor(id).slice(0, limit);
  if (events.length === 0) return null;

  return (
    <section className={className}>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        History
        <Explain term="field.timeline" label="the history" />
      </h4>
      <ol className="mt-3 space-y-3">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: KIND_DOT[event.kind] ?? "#cbd5e1" }}
            />
            <span className="min-w-0 text-sm">
              <span className="block text-slate-700">{event.detail}</span>
              <span className="block text-xs text-slate-400">{when(event.at)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
