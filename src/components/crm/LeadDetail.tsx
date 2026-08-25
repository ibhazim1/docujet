"use client";

import EditableCell from "./EditableCell";
import SourceSelect from "./SourceSelect";
import StageSelect from "./StageSelect";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { ago, prettyDate } from "@/lib/crm/analytics";
import { STAGES } from "@/lib/crm/taxonomy";

type LeadDetailProps = {
  /**
   * Falls back to the first lead in the list when none is selected, so the
   * panel can be seen and styled without clicking a row first.
   */
  alwaysShow?: boolean;
  stageLabel?: string;
  sourceLabel?: string;
  capturedLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  interestLabel?: string;
  notesLabel?: string;
  closeLabel?: string;
  /** The "closed — lost" explainer, shown only on a lost lead. */
  showLostPanel?: boolean;
  /** The captured-from-chatbot quote, shown only on a chatbot lead. */
  showChatbotPanel?: boolean;
  /** Overrides the tracker's setting for this panel only. */
  readOnly?: boolean;
  className?: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <div className="mt-2 text-sm text-slate-700">{children}</div>
    </div>
  );
}

/** Everything the book holds about one lead. */
export default function LeadDetail({
  alwaysShow = false,
  stageLabel = "Stage",
  sourceLabel = "Source",
  capturedLabel = "Captured",
  emailLabel = "Email",
  phoneLabel = "Phone",
  interestLabel = "Interest",
  notesLabel = "Notes",
  closeLabel = "Close",
  showLostPanel = true,
  showChatbotPanel = true,
  readOnly,
  className = "",
}: LeadDetailProps) {
  const tracker = useLeadTracker();
  const { selected, visible, today, isSample, setFlash } = tracker;
  const isReadOnly = readOnly ?? tracker.readOnly;

  const lead = selected ?? (alwaysShow ? visible[0] ?? null : null);
  if (!lead) return null;

  const edit = { readOnly: isReadOnly, isSample, onResult: setFlash };

  return (
    <section
      id="lead-detail"
      className={`scroll-mt-6 rounded-3xl border border-slate-200 border-l-4 border-l-sky-800 bg-white p-6 shadow-sm ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-baseline gap-2 text-xl font-semibold text-slate-950">
            <EditableCell
              leadId={lead.id}
              field="name"
              value={lead.name}
              placeholder="Unnamed lead"
              {...edit}
            />
            <span className="text-sm font-normal text-slate-400">· {lead.id}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            <EditableCell
              leadId={lead.id}
              field="title"
              value={lead.title}
              placeholder="Add a job title"
              {...edit}
            />
          </p>
        </div>
        <TrackerLink
          overrides={{ lead: null }}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {closeLabel}
        </TrackerLink>
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={stageLabel}>
          <StageSelect
            lead={lead}
            readOnly={isReadOnly}
            isSample={isSample}
            size="md"
            onResult={setFlash}
          />
        </Field>
        <Field label={sourceLabel}>
          <SourceSelect
            leadId={lead.id}
            source={lead.source}
            readOnly={isReadOnly}
            isSample={isSample}
            onResult={setFlash}
          />
        </Field>
        <Field label={capturedLabel}>
          <EditableCell
            leadId={lead.id}
            field="created_at"
            value={lead.createdAt}
            type="date"
            placeholder="No date"
            render={(value) => `${prettyDate(value)} (${ago(value, today)})`}
            {...edit}
          />
        </Field>
        <Field label={emailLabel}>
          <EditableCell
            leadId={lead.id}
            field="email"
            value={lead.email}
            type="email"
            placeholder="No email"
            {...edit}
          />
        </Field>
        <Field label={phoneLabel}>
          <EditableCell
            leadId={lead.id}
            field="phone"
            value={lead.phone}
            type="tel"
            placeholder="No phone"
            {...edit}
          />
        </Field>
      </div>

      {showLostPanel && lead.lost ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Closed — lost
          </span>
          <p className="mt-2 text-sm text-slate-600">
            Reached <strong className="text-slate-900">{STAGES[lead.stage].label}</strong> before it
            was lost. It still counts towards {STAGES[lead.stage].label} in the funnel and towards
            its source&apos;s quality score, so the channel keeps credit for the leads it qualified.
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <Field label={interestLabel}>
          <EditableCell
            leadId={lead.id}
            field="interest"
            value={lead.interest}
            placeholder="What are they after?"
            multiline
            className="whitespace-pre-wrap"
            {...edit}
          />
        </Field>
      </div>

      {showChatbotPanel && lead.chatTopic !== null ? (
        <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">
            Captured from chatbot
          </span>
          <p className="mt-2 border-l-2 border-sky-300 pl-3 text-sm italic text-slate-700">
            “{lead.chatTopic}”
          </p>
          {lead.cited.length > 0 ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              Answered from
              {lead.cited.map((id) => (
                <code
                  key={id}
                  className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700"
                >
                  {id}
                </code>
              ))}
            </p>
          ) : (
            <p className="mt-3 text-xs font-semibold text-amber-700">
              The chatbot could not answer this — knowledge-base gap.
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-6">
        <Field label={notesLabel}>
          <EditableCell
            leadId={lead.id}
            field="notes"
            value={lead.notes}
            placeholder="Add a note"
            multiline
            className="whitespace-pre-wrap"
            {...edit}
          />
        </Field>
      </div>
    </section>
  );
}
