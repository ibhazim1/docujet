"use client";

import { useState, useTransition } from "react";
import ContactNowDialog from "./ContactNowDialog";
import { ExplainOn } from "./Explain";
import LostReasonDialog from "./LostReasonDialog";
import { useLeadTracker } from "./TrackerContext";
import { reopenAction, setStageAction } from "@/lib/crm/actions";
import { nextOpenStage, STAGES } from "@/lib/crm/taxonomy";
import type { Lead } from "@/lib/crm/types";

export type LeadActionsProps = {
  lead: Lead;
  /** `row` is the compact set for the queue; `full` adds Reopen and labels. */
  variant?: "row" | "full";
  className?: string;
};

const BUTTON =
  "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40";

/**
 * The four things a rep does to a lead, as buttons.
 *
 * The queue can rank work perfectly and still change nothing if acting on a row
 * means opening a card, finding a control and coming back. These are the
 * actions inline, next to the reason they are being recommended.
 *
 * "Contact now" is the important one. Every stall figure, the going-cold play
 * and the recency half of the score all measure from `last_contact_at`, which
 * before this work only `create_booking` ever wrote — so the app was quietly
 * reporting "days since they last booked something" as though it were "days
 * since we last spoke".
 *
 * It was briefly a bare "Log contact" button, which closed that gap on paper
 * and asked the rep to do everything real somewhere else: find the number, work
 * out an opening line, have the conversation, then come back and press a button
 * whose only reward was a timestamp. The step most likely to be skipped was the
 * one the whole dashboard depends on. Now the button opens the details and a
 * drafted follow-up first, and offers to log at the end of that — so recording
 * it is the last step of a task rather than an errand of its own. See
 * `ContactNowDialog`.
 *
 * Each button explains itself on hover rather than in a caption, because that
 * reasoning is exactly what a rep needs once and never again. The delay before
 * the tooltip appears is long enough that reaching for the button never
 * summons one.
 */
export default function LeadActions({ lead, variant = "row", className = "" }: LeadActionsProps) {
  const { isSample, setFlash, readOnly } = useLeadTracker();
  const [isPending, startTransition] = useTransition();
  const [closing, setClosing] = useState(false);
  const [contacting, setContacting] = useState(false);

  if (readOnly) return null;

  const advance = nextOpenStage(lead.stage);

  function guard(run: () => Promise<void>) {
    if (isSample) {
      setFlash({ ok: false, message: "Preview data — connect the database to edit leads." });
      return;
    }
    startTransition(run);
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <ExplainOn term="action.contactNow">
          <button
            type="button"
            disabled={isPending}
            // Opens rather than writes: nothing is recorded until the dialog's
            // own Log contact button is pressed. A rep who opens this to check
            // a number and gets no answer has not contacted anybody.
            onClick={() => setContacting(true)}
            className={`${BUTTON} border-sky-800 bg-sky-800 text-white hover:bg-sky-900`}
          >
            Contact now
          </button>
        </ExplainOn>

        {lead.lost ? (
          <ExplainOn term="action.reopen">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                guard(async () => {
                  setFlash(await reopenAction(lead.id));
                })
              }
              className={`${BUTTON} border-slate-300 text-slate-700 hover:border-slate-500`}
            >
              Reopen
            </button>
          </ExplainOn>
        ) : (
          <>
            {advance ? (
              <ExplainOn
                term="action.advance"
                detail={`This lead is at ${STAGES[lead.stage].label}; the button moves it to ${STAGES[advance].label}.`}
              >
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    guard(async () => {
                      setFlash(await setStageAction(lead.id, advance));
                    })
                  }
                  className={`${BUTTON} border-slate-300 text-slate-700 hover:border-slate-500`}
                >
                  {variant === "full" ? `Advance to ${STAGES[advance].label}` : `→ ${STAGES[advance].label}`}
                </button>
              </ExplainOn>
            ) : null}

            <ExplainOn term="action.markLost">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setClosing(true)}
                className={`${BUTTON} border-slate-300 text-slate-500 hover:border-rose-300 hover:text-rose-700`}
              >
                Mark lost
              </button>
            </ExplainOn>
          </>
        )}
      </div>

      {contacting ? (
        <ContactNowDialog lead={lead} onClose={() => setContacting(false)} />
      ) : null}

      {closing ? (
        <LostReasonDialog
          lead={lead}
          isSample={isSample}
          onResult={setFlash}
          onClose={() => setClosing(false)}
        />
      ) : null}
    </>
  );
}
