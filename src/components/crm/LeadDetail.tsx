"use client";

import Link from "next/link";
import EditableCell from "./EditableCell";
import SourceSelect from "./SourceSelect";
import StageSelect from "./StageSelect";
import type { StageActionResult } from "@/lib/crm/actions";
import { ago, prettyDate } from "@/lib/crm/analytics";
import { buildHref } from "@/lib/crm/query";
import { STAGES } from "@/lib/crm/taxonomy";
import type { Lead } from "@/lib/crm/types";

type LeadDetailProps = {
  lead: Lead;
  today: string;
  params: URLSearchParams;
  readOnly: boolean;
  isSample: boolean;
  onResult?: (result: StageActionResult) => void;
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
  lead,
  today,
  params,
  readOnly,
  isSample,
  onResult,
}: LeadDetailProps) {
  const edit = { readOnly, isSample, onResult };

  return (
    <section
      id="lead-detail"
      className="scroll-mt-6 rounded-3xl border border-slate-200 border-l-4 border-l-sky-800 bg-white p-6 shadow-sm"
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
        <Link
          href={buildHref(params, { lead: null })}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Close
        </Link>
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Stage">
          <StageSelect
            lead={lead}
            readOnly={readOnly}
            isSample={isSample}
            size="md"
            onResult={onResult}
          />
        </Field>
        <Field label="Source">
          <SourceSelect
            leadId={lead.id}
            source={lead.source}
            readOnly={readOnly}
            isSample={isSample}
            onResult={onResult}
          />
        </Field>
        <Field label="Captured">
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
        <Field label="Email">
          <EditableCell
            leadId={lead.id}
            field="email"
            value={lead.email}
            type="email"
            placeholder="No email"
            {...edit}
          />
        </Field>
        <Field label="Phone">
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

      {lead.lost ? (
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
        <Field label="Interest">
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

      {lead.chatTopic !== null ? (
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
        <Field label="Notes">
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
