"use client";

import { ExplainOn } from "./Explain";
import LeadActions from "./LeadActions";
import ScoreChip from "./ScoreChip";
import SourcePill from "./SourcePill";
import StageBadge from "./StageBadge";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { ago, displayStage } from "@/lib/crm/analytics";
import type { QueueItem } from "@/lib/crm/queue";

export type QueueRowProps = {
  item: QueueItem;
  /** Hides the action buttons — for a read-only or presentational placement. */
  showActions?: boolean;
  className?: string;
};

/**
 * One piece of work.
 *
 * Reads as a sentence rather than as a table row, because that is what it is:
 * who, why they are here, what to do. A row that made the reader assemble those
 * facts from four columns would be a table with extra steps, and the whole
 * point of this view is that a rep should not have to interpret anything before
 * picking up the phone.
 *
 * The right-hand column carries how long it has been silent rather than a money
 * figure. There is no deal value in this book to show, and inventing one would
 * put the least reliable number on the page in the position the eye goes to
 * first.
 */
export default function QueueRow({ item, showActions = true, className = "" }: QueueRowProps) {
  const { today } = useLeadTracker();
  const { lead, reason, action, daysSinceTouch } = item;

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
          <StageBadge stage={displayStage(lead)} />
          <SourcePill source={lead.source} />
        </div>

        <p className="mt-2 text-sm text-slate-700">{reason}</p>
        <p className="mt-1 text-sm font-medium text-sky-900">{action}</p>

        {showActions ? <LeadActions lead={lead} className="mt-3" /> : null}
      </div>

      {/* The silence figure is the one number on this row that comes from
          somebody remembering to press Log contact, so hovering it explains
          the button that produces it rather than the number itself. */}
      <ExplainOn term="action.logContact" display="block" className="shrink-0">
        <div className="cursor-help text-left sm:text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-950">
            {daysSinceTouch}d
          </p>
          <p className="text-xs text-slate-400">since contact</p>
          <p className="mt-1 text-xs text-slate-500">
            arrived {ago(lead.createdAt, today)}
          </p>
        </div>
      </ExplainOn>
    </article>
  );
}
