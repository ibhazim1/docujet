"use client";

import { ExplainOn } from "./Explain";
import LeadActions from "./LeadActions";
import ScoreChip from "./ScoreChip";
import SourcePill from "./SourcePill";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { ago } from "@/lib/crm/analytics";
import type { BoardRow, StagePlay } from "@/lib/crm/playbook";
import { PLAYS } from "@/lib/crm/queue";

export type ActionRowProps = {
  row: BoardRow;
  /** The stage's playbook, which decides the buttons this row offers. */
  play: StagePlay;
  showActions?: boolean;
  className?: string;
};

/** The status chip's colour, keyed to the play's own urgency. */
const STATUS_TONE: Record<string, { chip: string; ink: string }> = {
  critical: { chip: "#fee2e2", ink: "#991b1b" },
  warning: { chip: "#fef3c7", ink: "#92400e" },
  opportunity: { chip: "#ccfbf1", ink: "#115e59" },
  neutral: { chip: "#f1f5f9", ink: "#475569" },
};

/**
 * One lead on the action board.
 *
 * ---------------------------------------------------------------------------
 * What changed from the old queue row, and why
 *
 * The row no longer carries a stage badge. It used to, because the old grouping
 * cut across the lifecycle and a reader could not otherwise tell an MQL from an
 * Opportunity. Under the new sections that badge would repeat the heading above
 * it on every single row — the most reliable way to teach somebody to stop
 * reading a column.
 *
 * What replaced it is the *situation* chip: overdue, going cold, never
 * contacted. That is the fact the section heading does not already carry, and
 * it is what decides which of twenty MQLs to open first once a rep has picked
 * their pile.
 * ---------------------------------------------------------------------------
 *
 * The recommended action line survives from the queue, because it is still the
 * thing that makes a row workable without opening it — but it now sits under a
 * heading that has already said what this stage is for, so it reads as the
 * specific case rather than as the whole instruction.
 */
export default function ActionRow({ row, play, showActions = true, className = "" }: ActionRowProps) {
  const { today } = useLeadTracker();
  const { lead, status, daysSinceTouch } = row;

  const statusDef = status ? PLAYS[status.play] : null;
  const tone = statusDef ? STATUS_TONE[statusDef.tone] ?? STATUS_TONE.neutral : null;

  return (
    <article
      className={`grid gap-4 border-t border-slate-200 px-4 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] ${className}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ScoreChip leadId={lead.id} />
          <TrackerLink
            overrides={{ lead: lead.id }}
            scrollTo="lead-detail"
            className="truncate text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
          >
            {lead.name || lead.id}
          </TrackerLink>
          {lead.company ? (
            <span className="truncate text-sm text-slate-500">{lead.company}</span>
          ) : null}

          {statusDef && tone ? (
            <ExplainOn term={`play.${status!.play}`}>
              <span
                className="cursor-help whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: tone.chip, color: tone.ink }}
              >
                {statusDef.label}
              </span>
            </ExplainOn>
          ) : null}

          <SourcePill source={lead.source} />
        </div>

        {status ? (
          <>
            <p className="mt-2 text-sm text-slate-700">{status.reason}</p>
            <p className="mt-1 text-sm font-medium text-sky-900">{status.action}</p>
          </>
        ) : (
          // Lost leads carry no play, so the row says what it can: how far it
          // got before it died. The cause is the heading it is filed under, so
          // repeating it here would be noise.
          <p className="mt-2 text-sm text-slate-600">
            Reached {lead.stage.toUpperCase()} before it was closed.
          </p>
        )}

        {showActions ? (
          <LeadActions lead={lead} actions={play.actions} className="mt-3" />
        ) : null}
      </div>

      {/* The silence figure is the one number here that depends on somebody
          remembering to log a contact, so hovering it explains the button that
          produces it rather than the number itself. */}
      <ExplainOn term="action.contactNow" display="block" className="shrink-0">
        <div className="cursor-help text-left sm:text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-950">{daysSinceTouch}d</p>
          <p className="text-xs text-slate-400">since contact</p>
          <p className="mt-1 text-xs text-slate-500">arrived {ago(lead.createdAt, today)}</p>
        </div>
      </ExplainOn>
    </article>
  );
}
