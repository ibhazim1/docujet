"use client";

import Explain from "./Explain";
import QueueRow from "./QueueRow";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { PLAYS, PLAY_KEYS, type PlayDef } from "@/lib/crm/queue";

export type TodayQueueProps = {
  /** How many rows to show per play before the section collapses to a link. */
  limitPerPlay?: number;
  showActions?: boolean;
  className?: string;
};

/** The stripe down the left of a section, keyed to how urgent the play is. */
const TONE: Record<PlayDef["tone"], { bar: string; ink: string }> = {
  critical: { bar: "#dc2626", ink: "text-rose-800" },
  warning: { bar: "#f59e0b", ink: "text-amber-800" },
  opportunity: { bar: "#0d9488", ink: "text-teal-800" },
  neutral: { bar: "#cbd5e1", ink: "text-slate-600" },
};

/**
 * The work queue — the view this dashboard opens on.
 *
 * ---------------------------------------------------------------------------
 * What changed, and why it is the default
 *
 * The tracker had three views and every one of them answered a question about
 * the book: what is in it (table), where things sit (board), what the shape is
 * (charts). All correct, none of them a starting point — a rep opening the page
 * had to decide for themselves what today was for.
 *
 * This view decides. It groups every open lead into the situation it is
 * actually in, orders the groups by what is most expensive to leave undone, and
 * inside each group puts the deals nearest a decision first. A rep can work top
 * to bottom and be confident the thing above matters more than the thing below,
 * which is the only property a work queue really needs to have.
 *
 * The ordering key is lifecycle position, not deal size. Expected value is the
 * textbook answer and would be the right one if this business recorded what its
 * deals close for; it does not, so the alternative was a per-model estimate
 * nobody had checked against a real sale. Stage is a weaker signal and an
 * honest one — a person looked at that lead and judged how far along it was.
 * ---------------------------------------------------------------------------
 *
 * The play filter (`?play=…`) narrows this to one section, which is what the
 * insight panel on the dashboard links into: a finding and the leads behind it
 * are one click apart, and the link is shareable.
 */
export default function TodayQueue({
  limitPerPlay = 8,
  showActions = true,
  className = "",
}: TodayQueueProps) {
  const { queueGroups, queue, outstanding, query } = useLeadTracker();

  if (queue.length === 0) {
    return (
      <section
        className={`rounded-3xl border border-slate-200 bg-white p-10 text-center ${className}`}
      >
        <p className="text-sm font-semibold text-slate-900">Nothing open in this view.</p>
        <p className="mt-2 text-sm text-slate-500">
          Every lead the current filters match is closed. Clear the filters, or look at the charts
          to see where they went.
        </p>
      </section>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <header className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">
            {outstanding.count > 0
              ? `${outstanding.count} leads need action today`
              : "Nothing overdue — the queue is clear"}
          </h2>
          {outstanding.qualified > 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="font-semibold tabular-nums text-slate-900">
                {outstanding.qualified}
              </span>{" "}
              of them have already reached SQL or beyond
              <Explain term="concept.qualified" label="qualified" />
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Grouped by what is wrong, and inside each group the deals nearest a decision come first.
          Nothing here is ordered by deal size — this business does not record one, and a made-up
          figure would decide your morning.{" "}
          <Explain term="concept.play" label="how the queue is grouped" />
        </p>

        {query.play !== "" ? (
          <TrackerLink
            overrides={{ play: null }}
            className="mt-3 inline-block text-sm font-semibold text-sky-800 underline-offset-4 hover:underline"
          >
            Showing only {PLAYS[query.play].label} — show every play
          </TrackerLink>
        ) : null}
      </header>

      {queueGroups.map((group) => {
        const tone = TONE[group.def.tone];
        const shown = group.items.slice(0, limitPerPlay);
        const hidden = group.items.length - shown.length;

        return (
          <section
            key={group.key}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
            style={{ borderLeftWidth: 4, borderLeftColor: tone.bar }}
          >
            <header className="flex flex-wrap items-baseline justify-between gap-3 px-4 pb-3 pt-4">
              <div className="min-w-0">
                <h3 className={`flex items-center gap-1.5 text-sm font-semibold ${tone.ink}`}>
                  {group.def.label}
                  <span className="font-normal text-slate-400">{group.items.length}</span>
                  {/* The blurb underneath says what the play is; the dot says
                      why it is ranked where it is and what to actually do —
                      which is the half that will not fit on one line. */}
                  <Explain term={`play.${group.key}`} label={group.def.label} />
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{group.def.blurb}</p>
              </div>
              {group.qualified > 0 ? (
                <p className="flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-500">
                  <span className="font-semibold tabular-nums text-slate-800">
                    {group.qualified}
                  </span>{" "}
                  qualified
                  <Explain term="concept.qualified" label="qualified" />
                </p>
              ) : null}
            </header>

            <div>
              {shown.map((item) => (
                <QueueRow key={item.lead.id} item={item} showActions={showActions} />
              ))}
            </div>

            {hidden > 0 ? (
              <footer className="border-t border-slate-200 px-4 py-3">
                <TrackerLink
                  overrides={{ play: group.key, view: "today" }}
                  className="text-sm font-semibold text-sky-800 underline-offset-4 hover:underline"
                >
                  Show all {group.items.length} in {group.def.label.toLowerCase()}
                </TrackerLink>
              </footer>
            ) : null}
          </section>
        );
      })}

      <p className="px-1 text-xs leading-5 text-slate-400">
        A lead appears in exactly one play — the first that matches, in the order{" "}
        {PLAY_KEYS.map((key) => PLAYS[key].label.toLowerCase()).join(", ")}. Counting one lead in
        two sections would inflate every figure above and invite the same call twice.
      </p>
    </div>
  );
}
