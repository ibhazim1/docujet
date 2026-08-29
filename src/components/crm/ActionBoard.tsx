"use client";

import ActionRow from "./ActionRow";
import Explain from "./Explain";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { groupLostRows, type BoardSection, type StagePlay } from "@/lib/crm/playbook";
import { PLAYS } from "@/lib/crm/queue";
import { STAGES } from "@/lib/crm/taxonomy";

export type ActionBoardProps = {
  /** Rows to show per section before it collapses to a "show all" link. */
  limit?: number;
  showActions?: boolean;
  className?: string;
};

/**
 * The accent for a section, keyed to what the work at that stage is.
 *
 * Deliberately not the lifecycle's blue ramp. The ramp encodes *position* and
 * is used everywhere else in the app to do exactly that; here the reader has
 * already chosen a stage, and what the colour needs to say is what kind of
 * morning this section is — assessing, promoting, negotiating, closing,
 * keeping, or reviewing what went wrong.
 */
const TONE: Record<StagePlay["tone"], { bar: string; ink: string }> = {
  entry: { bar: "#94a3b8", ink: "text-slate-700" },
  promote: { bar: "#0ea5e9", ink: "text-sky-800" },
  negotiate: { bar: "#f59e0b", ink: "text-amber-800" },
  close: { bar: "#0d9488", ink: "text-teal-800" },
  retain: { bar: "#16a34a", ink: "text-green-800" },
  closed: { bar: "#7c8798", ink: "text-slate-600" },
};

/**
 * The action board — the view this page opens on.
 *
 * ---------------------------------------------------------------------------
 * One stage at a time
 *
 * This replaced a board that grouped by what had gone wrong: overdue, going
 * cold, stuck at the front door, nurture. Those groups ranked a morning well
 * and made it awkward to work, because each one held leads from every stage at
 * once — a raw enquiry next to a live proposal, needing completely different
 * sentences from the same person in the same sitting.
 *
 * Sections are stages now, and only one is on screen. That is the point rather
 * than a space saving: a rep picks the pile they are in the mood for, reads one
 * instruction at the top of it, and then works twenty rows without changing
 * register. The old ordering has not been lost — it is the status chip on each
 * row, and it still sorts the urgent to the top within the pile.
 * ---------------------------------------------------------------------------
 *
 * The tab strip always shows all six, empty ones included. A tab that vanished
 * when its pile cleared would move the others under the reader's cursor, and
 * "MQL 0" is a genuinely useful thing for the board to be able to say.
 */
export default function ActionBoard({
  limit = 25,
  showActions = true,
  className = "",
}: ActionBoardProps) {
  const { board, boardStage, query, allLeads } = useLeadTracker();

  const section = board.find((entry) => entry.key === boardStage) ?? board[0];
  if (!section) return null;

  const tone = TONE[section.play.tone];
  const total = board.reduce((sum, entry) => sum + entry.rows.length, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      <StageTabs board={board} active={boardStage} />

      {query.play !== "" ? (
        // A dashboard finding links in here with a play attached — "38 leads
        // have gone quiet" and the rows behind it are one click apart. The
        // narrowing crosses every section, so it gets its own line rather than
        // hiding inside one of them.
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Narrowed to <strong>{PLAYS[query.play].label.toLowerCase()}</strong> across every
            stage. {PLAYS[query.play].blurb}
          </p>
          <TrackerLink
            overrides={{ play: null }}
            className="shrink-0 text-sm font-semibold text-amber-900 underline underline-offset-4"
          >
            Show everything
          </TrackerLink>
        </div>
      ) : null}

      <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
        style={{ borderLeftWidth: 4, borderLeftColor: tone.bar }}
      >
        <header className="border-b border-slate-200 px-5 pb-4 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className={`flex items-center gap-2 text-base font-semibold ${tone.ink}`}>
              {STAGES[section.key].label}
              <span className="font-normal text-slate-400">{section.rows.length}</span>
              <Explain term={`stage.${section.key}`} label={STAGES[section.key].label} />
            </h2>
            <OrderToggle order={query.order} />
          </div>

          <p className="mt-2 text-sm font-medium text-slate-900">{section.play.objective}</p>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{section.play.method}</p>
        </header>

        {section.rows.length === 0 ? (
          <EmptySection stage={section.key} filtered={total === 0 && allLeads.length > 0} />
        ) : section.key === "lost" ? (
          <LostSections section={section} limit={limit} showActions={showActions} />
        ) : (
          <Rows section={section} limit={limit} showActions={showActions} />
        )}
      </section>
    </div>
  );
}

/** The six-way section selector. */
function StageTabs({ board, active }: { board: BoardSection[]; active: string }) {
  return (
    <nav
      aria-label="Lead stage"
      className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2"
    >
      {board.map((section) => {
        const isActive = section.key === active;
        const tone = TONE[section.play.tone];
        return (
          <TrackerLink
            key={section.key}
            // `lead` clears so switching sections does not leave a card open
            // over a list it no longer belongs to. `play` survives on purpose:
            // a reader who arrived from a dashboard finding is still looking at
            // that finding, one stage over.
            overrides={{ at: section.key, lead: null }}
            current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: isActive ? "#ffffff" : tone.bar }}
            />
            {STAGES[section.key].label}
            <span
              className={`tabular-nums ${
                isActive
                  ? "text-white/70"
                  : section.rows.length === 0
                    ? "text-slate-300"
                    : "text-slate-400"
              }`}
            >
              {section.rows.length}
            </span>
          </TrackerLink>
        );
      })}
    </nav>
  );
}

/**
 * The silence sort.
 *
 * Two buttons rather than a dropdown, because there are exactly two answers and
 * a select would hide one of them behind a click. Longest-silent leads by
 * default: that is the order a work board is for, and the reverse exists for a
 * rep picking up where they left off yesterday.
 */
function OrderToggle({ order }: { order: "late" | "recent" }) {
  const options = [
    { key: "late" as const, label: "Longest silent" },
    { key: "recent" as const, label: "Recently contacted" },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-400">Sort</span>
      <div className="inline-flex rounded-full border border-slate-300 bg-white p-0.5">
        {options.map((option) => {
          const isActive = order === option.key;
          return (
            <TrackerLink
              key={option.key}
              // `late` is the default, carried by the absence of the parameter.
              overrides={{ order: option.key === "late" ? null : option.key }}
              current={isActive ? "true" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </TrackerLink>
          );
        })}
      </div>
    </div>
  );
}

/** A plain section's rows, truncated with a link to the rest. */
function Rows({
  section,
  limit,
  showActions,
}: {
  section: BoardSection;
  limit: number;
  showActions: boolean;
}) {
  const shown = section.rows.slice(0, limit);
  const hidden = section.rows.length - shown.length;

  return (
    <>
      <div>
        {shown.map((row) => (
          <ActionRow
            key={row.lead.id}
            row={row}
            play={section.play}
            showActions={showActions}
          />
        ))}
      </div>
      {hidden > 0 ? (
        <footer className="border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
          {hidden} more at this stage. Narrow with the filters above, or open the table view.
        </footer>
      ) : null}
    </>
  );
}

/**
 * Lost, split by what killed each deal.
 *
 * The split is the entire reason this stage is a section a rep opens rather
 * than a filter they avoid. A flat list of dead deals is a graveyard; the same
 * list under "Price", "Wrong timing" and "Budget cut" is three re-approach
 * campaigns waiting for the business to change the thing named in the heading.
 *
 * Each heading carries the fix that cause implies, so the reader sees what
 * would have to be true before writing to anybody underneath it.
 */
function LostSections({
  section,
  limit,
  showActions,
}: {
  section: BoardSection;
  limit: number;
  showActions: boolean;
}) {
  const groups = groupLostRows(section.rows);
  // The cap is per cause rather than per section: five groups sharing one
  // budget would let the largest one push the rest off the screen, and the
  // small causes are often the reopenable ones.
  const perGroup = Math.max(5, Math.floor(limit / Math.max(1, groups.length)));

  return (
    <div>
      {groups.map((group) => {
        const shown = group.rows.slice(0, perGroup);
        const hidden = group.rows.length - shown.length;

        return (
          <section key={group.reason ?? "none"} className="border-b border-slate-200 last:border-b-0">
            <header className="bg-slate-50 px-5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {group.label}
                  <span className="font-normal text-slate-400">{group.rows.length}</span>
                </h3>
                {group.owner ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                    {group.owner}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                {group.fix ||
                  "Closed before a reason was recorded, so these count towards the gap in the loss analysis rather than towards any cause. Nothing here can be re-approached on evidence."}
              </p>
            </header>

            <div>
              {shown.map((row) => (
                <ActionRow
                  key={row.lead.id}
                  row={row}
                  play={section.play}
                  showActions={showActions}
                />
              ))}
            </div>

            {hidden > 0 ? (
              <p className="px-5 py-2 text-xs text-slate-400">
                {hidden} more closed for this reason.
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** What an empty section says. Different sentences for different kinds of empty. */
function EmptySection({ stage, filtered }: { stage: string; filtered: boolean }) {
  const copy: Record<string, string> = {
    lead: "No unassessed leads. Everything that came in has been qualified up or closed.",
    mql: "Nothing waiting to be shown the product.",
    sql: "Nobody is waiting on a quote or a date.",
    opportunity: "No live proposals. Nothing is waiting on a decision right now.",
    customer: "No customers in this view yet.",
    lost: "Nothing has been closed as lost — which either means the book is young or that deals are being left open instead of closed honestly.",
  };

  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">
        {filtered ? "Nothing matches the current filters." : "Nothing here."}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {filtered
          ? "Every section is empty for this filter. Clear it above to see the whole book."
          : copy[stage] ?? "Nothing at this stage."}
      </p>
    </div>
  );
}
