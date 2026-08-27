"use client";

import AdminTable from "@/components/admin/AdminTable";
import EditableCell from "./EditableCell";
import SortHeader from "./SortHeader";
import SourceSelect from "./SourceSelect";
import StageSelect from "./StageSelect";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { prettyDate } from "@/lib/crm/analytics";
import { STAGES } from "@/lib/crm/taxonomy";
import type { Lead, SortKey } from "@/lib/crm/types";

/** Every column the table knows how to draw. */
export type ColumnKey =
  | "name"
  | "company"
  | "email"
  | "phone"
  | "source"
  | "created_at"
  | "stage"
  | "title"
  | "interest"
  | "notes";

export type LeadColumn = {
  field: ColumnKey;
  /** Overrides the built-in heading. */
  header?: string;
  /** A CSS width for the column, e.g. `17%` or `180px`. */
  width?: string;
};

type LeadTableProps = {
  /** Which columns to show, in order. Empty means the seven it shipped with. */
  columns?: LeadColumn[];
  /** The `L-1088 · open` link under each name, which opens the detail panel. */
  showOpenLink?: boolean;
  /** Overrides the tracker's setting for this table only. */
  readOnly?: boolean;
  className?: string;
};

const HEADERS: Record<ColumnKey, string> = {
  name: "Lead",
  company: "Company",
  email: "Email",
  phone: "Phone",
  source: "Source",
  created_at: "Captured",
  stage: "Stage",
  title: "Job title",
  interest: "Interest",
  notes: "Notes",
};

/** Fixed shares rather than auto widths — a long note must not move every other column. */
const WIDTHS: Record<ColumnKey, string> = {
  name: "17%",
  company: "16%",
  email: "19%",
  phone: "13%",
  source: "12%",
  created_at: "10%",
  stage: "12%",
  title: "15%",
  interest: "17%",
  notes: "17%",
};

/** The columns whose values the list can actually be ordered by. */
const SORTABLE: Partial<Record<ColumnKey, SortKey>> = {
  name: "name",
  email: "email",
  source: "source",
  created_at: "created_at",
  stage: "stage",
};

export const DEFAULT_COLUMNS: LeadColumn[] = [
  { field: "name" },
  { field: "email" },
  { field: "phone" },
  { field: "source" },
  { field: "created_at" },
  { field: "stage" },
  { field: "notes" },
];

/**
 * The working list.
 *
 * Every captured field is edited in place: click a value, type, press Enter.
 * Stage and source are closed sets and get controls; the rest are free text.
 * Only the id is fixed, because it is the row's identity in the database.
 */
export default function LeadTable({
  columns,
  showOpenLink = true,
  readOnly,
  className = "",
}: LeadTableProps) {
  const tracker = useLeadTracker();
  const { visible, query, isSample, setFlash } = tracker;
  const isReadOnly = readOnly ?? tracker.readOnly;
  const edit = { readOnly: isReadOnly, isSample, onResult: setFlash };

  const shown = (columns?.length ? columns : DEFAULT_COLUMNS).filter((column) => HEADERS[column.field]);
  const minWidth = Math.max(560, shown.length * 155);

  function cell(column: LeadColumn, lead: Lead) {
    switch (column.field) {
      case "name":
        return (
          <>
            <EditableCell
              leadId={lead.id}
              field="name"
              value={lead.name}
              placeholder="Unnamed lead"
              className="font-medium text-slate-950"
              {...edit}
            />
            {showOpenLink ? (
              <TrackerLink
                overrides={{ lead: lead.id }}
                scrollTo="lead-detail"
                className="mt-0.5 block text-xs text-slate-500 underline-offset-4 hover:text-sky-800 hover:underline"
              >
                {lead.id} · open
              </TrackerLink>
            ) : null}
          </>
        );
      case "email":
        return (
          <EditableCell
            leadId={lead.id}
            field="email"
            value={lead.email}
            type="email"
            placeholder="No email"
            className="break-all"
            {...edit}
          />
        );
      case "phone":
        return (
          <EditableCell
            leadId={lead.id}
            field="phone"
            value={lead.phone}
            type="tel"
            placeholder="No phone"
            {...edit}
          />
        );
      case "source":
        return (
          <SourceSelect
            leadId={lead.id}
            source={lead.source}
            readOnly={isReadOnly}
            isSample={isSample}
            onResult={setFlash}
          />
        );
      case "created_at":
        return (
          <EditableCell
            leadId={lead.id}
            field="created_at"
            value={lead.createdAt}
            type="date"
            placeholder="No date"
            render={(value) => prettyDate(value)}
            {...edit}
          />
        );
      case "stage":
        return (
          <>
            <StageSelect
              lead={lead}
              readOnly={isReadOnly}
              isSample={isSample}
              onResult={setFlash}
            />
            {lead.lost ? (
              // The control can only say "Lost"; how far the lead got is the
              // useful part.
              <span className="mt-1 block text-xs text-slate-500">
                at {STAGES[lead.stage].label}
              </span>
            ) : null}
          </>
        );
      case "company":
        return (
          <EditableCell
            leadId={lead.id}
            field="company"
            value={lead.company}
            placeholder="No company"
            {...edit}
          />
        );
      case "title":
        return (
          <EditableCell
            leadId={lead.id}
            field="title"
            value={lead.title}
            placeholder="No job title"
            {...edit}
          />
        );
      case "interest":
        return (
          <EditableCell
            leadId={lead.id}
            field="interest"
            value={lead.interest}
            placeholder="What are they after?"
            multiline
            className="whitespace-pre-wrap"
            {...edit}
          />
        );
      case "notes":
        return (
          <EditableCell
            leadId={lead.id}
            field="notes"
            value={lead.notes}
            placeholder="Add a note"
            multiline
            className="whitespace-pre-wrap"
            {...edit}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className={className}>
      <AdminTable>
        <table className="w-full table-fixed text-left text-sm" style={{ minWidth }}>
          <colgroup>
            {shown.map((column, index) => (
              <col key={index} style={{ width: column.width || WIDTHS[column.field] }} />
            ))}
          </colgroup>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {shown.map((column, index) => {
                const sortKey = SORTABLE[column.field];
                const label = column.header || HEADERS[column.field];
                return (
                  <th key={index} className="px-5 py-4 font-medium">
                    {sortKey ? <SortHeader sortKey={sortKey} label={label} /> : label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((lead) => (
              <tr
                key={lead.id}
                className={`border-t border-slate-200 align-top ${lead.lost ? "opacity-60" : ""} ${
                  lead.id === query.leadId ? "bg-sky-50" : ""
                }`}
              >
                {shown.map((column, index) => (
                  <td
                    key={index}
                    className={`px-5 py-4 text-slate-600 ${
                      column.field === "created_at" ? "whitespace-nowrap" : ""
                    }`}
                  >
                    {cell(column, lead)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>
    </div>
  );
}
