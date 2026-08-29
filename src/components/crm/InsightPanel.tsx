"use client";

import Explain from "./Explain";
import { useLeadTracker } from "./TrackerContext";
import type { Insight, InsightSeverity } from "@/lib/crm/insights";

export type InsightPanelProps = {
  limit?: number;
  title?: string;
  /** Where the links point. `/admin/leads` from the dashboard; empty when already there. */
  basePath?: string;
  className?: string;
};

const SEVERITY: Record<InsightSeverity, { label: string; bar: string; chip: string; ink: string }> = {
  critical: { label: "Fix now", bar: "#dc2626", chip: "#fee2e2", ink: "#991b1b" },
  warning: { label: "Watch", bar: "#f59e0b", chip: "#fef3c7", ink: "#92400e" },
  opportunity: { label: "Opportunity", bar: "#0d9488", chip: "#ccfbf1", ink: "#115e59" },
  good: { label: "Working", bar: "#16a34a", chip: "#dcfce7", ink: "#166534" },
};

/**
 * What the numbers mean, and what to do about them.
 *
 * ---------------------------------------------------------------------------
 * The gap this fills
 *
 * The charts were all correct and none of them said anything. A reader who
 * already knew what to look for could find the story in them; a reader who
 * did not — which is everyone, most mornings — got nine accurate pictures and
 * no conclusion. This panel is the conclusion: each finding states a claim,
 * shows the evidence with the numbers in it, and names one thing to change.
 * ---------------------------------------------------------------------------
 */
export default function InsightPanel({
  limit = 5,
  title = "What to do about it",
  basePath = "",
  className = "",
}: InsightPanelProps) {
  const { insights } = useLeadTracker();
  const shown = insights.slice(0, limit);

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <header>
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-950">
          {title}
          <Explain term="concept.insights" label="these findings" />
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Every claim carries the numbers behind it and links to the leads it is about.
        </p>
      </header>

      {shown.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Nothing stands out. Either the book is healthy or there is not enough of it yet to say —
          the findings suppress themselves below the sample sizes where a percentage would be noise.
        </p>
      ) : (
        <ol className="mt-5 space-y-3">
          {shown.map((insight) => (
            <InsightRow key={insight.key} insight={insight} basePath={basePath} />
          ))}
        </ol>
      )}
    </section>
  );
}

function InsightRow({ insight, basePath }: { insight: Insight; basePath: string }) {
  const tone = SEVERITY[insight.severity];

  const body = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-950">{insight.title}</h4>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: tone.chip, color: tone.ink }}
          >
            {tone.label}
          </span>
          <Explain term="concept.severity" label={tone.label} />
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">{insight.finding}</p>
      <p className="mt-1.5 text-sm font-medium leading-6 text-sky-900">{insight.action}</p>
    </>
  );

  const shell = "block rounded-2xl border border-slate-200 p-4";

  return (
    <li style={{ borderLeftWidth: 0 }}>
      {insight.href ? (
        <a
          href={`${basePath}${insight.href}`}
          className={`${shell} transition hover:border-slate-400`}
          style={{ borderLeftWidth: 4, borderLeftColor: tone.bar }}
        >
          {body}
        </a>
      ) : (
        <div className={shell} style={{ borderLeftWidth: 4, borderLeftColor: tone.bar }}>
          {body}
        </div>
      )}
    </li>
  );
}
