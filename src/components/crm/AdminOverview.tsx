"use client";

import type { ReactNode } from "react";
import Explain from "./Explain";
import InsightPanel from "./InsightPanel";
import KpiCard from "./KpiCard";
import KpiRow from "./KpiRow";
import { useLeadTracker } from "./TrackerContext";
import FunnelChart from "./charts/FunnelChart";
import { ago } from "@/lib/crm/analytics";
import { PLAYS, type PlayKey } from "@/lib/crm/queue";
import { stageIndex, STAGES } from "@/lib/crm/taxonomy";

export type AdminOverviewProps = {
  /** Where the drill-downs point. The tracker lives on another route. */
  leadsPath?: string;
  className?: string;
  /**
   * Stacked below the funnel chart, in its own column.
   *
   * The funnel and the insight panel sit side by side and rarely run the same
   * height — the panel has as many findings as the book currently supports,
   * the funnel is always five bars. Left alone, that mismatch is dead white
   * space under the shorter one. This is that space, offered to the caller
   * rather than padded out: something else worth a glance at the top of the
   * page — appointment health, say — belongs there before the fold does,
   * not wasted as a gap.
   */
  funnelFooter?: ReactNode;
  /**
   * A full-width block between the funnel row and the attention row.
   *
   * For content that earns a place above the fold but fits neither column —
   * a table, typically, where the funnel and insight panel are both cards.
   */
  afterFunnel?: ReactNode;
};

/** The plays worth surfacing on a dashboard, in the order they cost the most. */
const ATTENTION: PlayKey[] = ["overdue", "hot-untouched", "post-demo", "rescue", "going-cold"];

/**
 * The owner view of the lead book.
 *
 * ---------------------------------------------------------------------------
 * A different question from the one /admin/leads answers
 *
 * The tracker answers "what do I do next", which is a rep question asked every
 * morning. This page answers "is the book healthy, and if not why not" — asked
 * by whoever is accountable for the revenue, roughly weekly, and previously not
 * answerable anywhere in this app: the dashboard counted appointments, leads and
 * customers, and none of those three says whether anything is being worked.
 *
 * So the top line is the shape of the pipeline, the middle is a ranked list of
 * what to fix, and the bottom is the work outstanding — each item a link into
 * the queue that contains it, because a dashboard that states a problem and
 * cannot show you the rows behind it gets argued with rather than acted on.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * Why there is no revenue on this page
 *
 * There was, briefly: open pipeline, weighted forecast, won-to-date, all in
 * ringgit. Every one of them was computed from a per-model deal estimate that
 * had never been checked against a single closed sale, because nothing in this
 * business records what a deal is worth. A forecast is the most quoted number a
 * dashboard produces and the hardest to walk back once it has been said out
 * loud in a meeting, so it is the last thing that should rest on a guess.
 *
 * The counts here are all things the book actually knows. When DocuJet starts
 * recording close values, the money version becomes worth building — from
 * measurements rather than from assumptions.
 * ---------------------------------------------------------------------------
 *
 * Rendered inside a `LeadTracker` on `/admin`, which is what gives it the same
 * numbers the tracker itself computes — there is deliberately no second code
 * path here that could disagree with the lead page about the state of the book.
 */
export default function AdminOverview({
  leadsPath = "/admin/leads",
  className = "",
  funnelFooter,
  afterFunnel,
}: AdminOverviewProps) {
  const { queue, visible, today } = useLeadTracker();

  const counts = new Map<PlayKey, number>();
  for (const item of queue) {
    counts.set(item.play, (counts.get(item.play) ?? 0) + 1);
  }

  const attention = ATTENTION.map((key) => ({
    key,
    def: PLAYS[key],
    count: counts.get(key) ?? 0,
  })).filter((row) => row.count > 0);

  // The deals nearest a decision. Without values to rank on, "furthest along,
  // then highest scoring" is the honest ordering — and arguably the more useful
  // one for a weekly review, which is about what is going to land rather than
  // about what it will be worth when it does.
  const sqlIndex = stageIndex("sql");
  const closest = queue
    .filter((item) => item.reach >= sqlIndex)
    .sort((a, b) => b.reach - a.reach || b.score.total - a.score.total)
    .slice(0, 5);

  return (
    <div className={`space-y-8 ${className}`}>
      <KpiRow>
        <KpiCard metric="open" />
        <KpiCard metric="qualified" />
        <KpiCard metric="needsAction" />
        <KpiCard metric="stalled" />
        <KpiCard metric="untouched" />
        <KpiCard metric="customers" />
      </KpiRow>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* A column, not just the chart, so `funnelFooter` stacks underneath it
            rather than fighting it for the same grid cell. */}
        <div className="flex min-w-0 flex-col gap-6">
          <FunnelChart />
          {funnelFooter}
        </div>
        <InsightPanel limit={5} basePath={leadsPath} />
      </section>

      {afterFunnel}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-950">
            Needs attention
            <Explain term="concept.needsAttention" label="needs attention" />
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Work outstanding right now. Each row opens the queue filtered to it.
          </p>

          {attention.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              Nothing outstanding. Every open lead has been touched inside the limit for its stage.
            </p>
          ) : (
            <ul className="mt-5 space-y-2">
              {attention.map((row) => (
                <li key={row.key}>
                  <a
                    href={`${leadsPath}?view=action&play=${row.key}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-slate-400"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                        {row.def.label}
                        <Explain term={`play.${row.key}`} label={row.def.label} />
                      </span>
                      <span className="block truncate text-xs text-slate-500">{row.def.blurb}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">
                      {row.count}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-950">
            Closest to a decision
            <Explain term="concept.closestToDecision" label="closest to a decision" />
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Open leads that have reached SQL or beyond, furthest along first. These are the
            conversations the next quarter rests on.
          </p>

          {closest.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              Nothing has reached SQL yet. Every open lead still has the whole cycle to run, which
              is itself the finding.
            </p>
          ) : (
            <ul className="mt-5 space-y-2">
              {closest.map((item) => (
                <li key={item.lead.id}>
                  <a
                    href={`${leadsPath}?lead=${item.lead.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-slate-400"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {item.lead.company || item.lead.name || item.lead.id}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.lead.interest || "No interest recorded"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-950">
                        {STAGES[item.lead.stage].label}
                        <Explain
                          term={`stage.${item.lead.stage}`}
                          label={STAGES[item.lead.stage].label}
                        />
                      </span>
                      <span className="block text-xs text-slate-400">
                        touched {ago(item.lead.lastContactAt?.slice(0, 10) ?? item.lead.createdAt, today)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {visible.length > 0 ? (
            <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
              Ordered by lifecycle position, not by deal size — this business records no deal
              values, and a made-up one would decide which accounts get the attention.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
