"use client";

import Explain from "./Explain";
import ScoreChip from "./ScoreChip";
import { useLeadTracker } from "./TrackerContext";
import { SCORE_BANDS } from "@/lib/crm/scoring";

export type ScoreBreakdownProps = {
  leadId?: string;
  className?: string;
};

/**
 * The whole arithmetic behind a score, itemised.
 *
 * This panel is the reason the score is allowed to influence what anybody does.
 * A model that ranks a rep working day without showing its reasoning is asking
 * for trust it has not earned, and the first time it is wrong about a deal the
 * rep knows well, the entire feature is written off. Showing the sum means a
 * disagreement lands on a specific weight — which is a fixable, one-line
 * argument in `scoring.ts` rather than a verdict on the idea.
 */
export default function ScoreBreakdown({ leadId, className = "" }: ScoreBreakdownProps) {
  const { scoreFor, selected, visible } = useLeadTracker();

  const id = leadId || selected?.id || visible[0]?.id || "";
  const score = scoreFor(id);
  if (!score) return null;

  return (
    <section className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
      <header className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Priority score
          <Explain term="score" />
        </h4>
        <ScoreChip leadId={id} size="md" showLabel />
      </header>

      {score.factors.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Nothing scored yet — no booking, no stage progress and no recorded contact.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {score.factors.map((factor) => (
            <li key={factor.key} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                {/* `factor.detail` is the evidence on this lead; the dot is why
                    the weight is what it is. Keeping them apart is what lets a
                    rep disagree with the model rather than with the row. */}
                <span className="flex items-center gap-1.5 font-medium text-slate-800">
                  {factor.label}
                  <Explain term={`score.factor.${factor.key}`} label={factor.label} />
                </span>
                <span className="block text-xs leading-5 text-slate-500">{factor.detail}</span>
              </span>
              <span
                className={`shrink-0 font-semibold tabular-nums ${
                  factor.points < 0 ? "text-rose-700" : "text-slate-700"
                }`}
              >
                {factor.points > 0 ? "+" : ""}
                {factor.points}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        {SCORE_BANDS[score.band].label} band, {SCORE_BANDS[score.band].min} and above.{" "}
        <Explain term="score.band" label="the score bands" /> The score ranks likelihood to buy; it
        says nothing about deal size — those are combined only when the queue is ordered.
      </p>
    </section>
  );
}
