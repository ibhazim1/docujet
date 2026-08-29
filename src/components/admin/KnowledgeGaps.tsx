import type { KnowledgeGap } from "@/lib/chat/capture";

export type KnowledgeGapsProps = {
  gaps: KnowledgeGap[];
  /** Every unanswered question on record, not just the ones listed. */
  total: number;
  notice: string | null;
};

function when(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

/**
 * What visitors asked that the knowledge base could not answer.
 *
 * ---------------------------------------------------------------------------
 * Demand the site was generating and throwing away
 *
 * The assistant answered from 111 verified entries and forgot every question
 * the moment it replied, which discarded the most direct signal this business
 * has about what buyers want to know. A question the corpus missed is a visitor
 * who left unserved. The same question from fourteen visitors is a missing page
 * that is costing sales — and the fix is one entry in the editor directly above
 * this panel, which is why the two sit together.
 * ---------------------------------------------------------------------------
 *
 * Placed on Settings rather than on the dashboard because this is a list of
 * things to write, not a list of leads to call — though the same finding also
 * appears in the insight panel, priced as an opportunity, for whoever is
 * deciding where the week goes.
 */
export default function KnowledgeGaps({ gaps, total, notice }: KnowledgeGapsProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Questions we could not answer</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Every question the assistant had no knowledge-base entry for. Each one is a visitor who
        asked something specific and left without an answer — add an entry above and the next
        person who asks gets served.
      </p>

      {notice ? (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </p>
      ) : gaps.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Nothing recorded yet. Unanswered questions start appearing here as soon as visitors ask
          them.
        </p>
      ) : (
        <>
          <ol className="mt-5 space-y-2">
            {gaps.map((gap) => (
              <li
                key={gap.question}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <span className="min-w-0 text-sm text-slate-700">{gap.question}</span>
                <span className="shrink-0 text-right">
                  {gap.timesAsked > 1 ? (
                    <span className="block text-sm font-semibold tabular-nums text-slate-950">
                      ×{gap.timesAsked}
                    </span>
                  ) : null}
                  <span className="block text-xs text-slate-400">{when(gap.askedAt)}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
            {total} unanswered {total === 1 ? "question" : "questions"} on record
            {gaps.length < total ? `, grouped into the ${gaps.length} shown` : ""}. Questions
            asked more than once are listed first.
          </p>
        </>
      )}
    </section>
  );
}
