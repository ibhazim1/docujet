"use client";

import AdminTable from "@/components/admin/AdminTable";
import EditableCell from "./EditableCell";
import Explain from "./Explain";
import ScoreChip from "./ScoreChip";
import TablePagination from "./TablePagination";
import SortHeader from "./SortHeader";
import SourceSelect from "./SourceSelect";
import StageSelect from "./StageSelect";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { daysBetween, prettyDate } from "@/lib/crm/analytics";
import { STAGES } from "@/lib/crm/taxonomy";
import type { MouseEvent } from "react";
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
  | "notes"
  | "score"
  | "next_action";

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
  /** Clicking anywhere on a row that is not a control opens that lead's card. */
  rowClickOpens?: boolean;
  /** Overrides the tracker's setting for this table only. */
  readOnly?: boolean;
  /** The row-count picker and pager beneath the table. */
  showPagination?: boolean;
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
  score: "Score",
  next_action: "Next action",
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
  score: "8%",
  next_action: "20%",
};

/**
 * The columns whose heading is a term rather than a plain word.
 *
 * Only these get an explainer. "Company" and "Phone" need no gloss, and a dot
 * on every heading would turn the row into a line of dots with words between
 * them — which is the failure mode this whole feature has to avoid.
 */
const EXPLAINED: Partial<Record<ColumnKey, string>> = {
  score: "score",
  stage: "concept.qualified",
  source: "field.source",
  created_at: "field.captured",
  next_action: "action.nextAction",
  title: "field.title",
  interest: "field.interest",
  notes: "field.notes",
};

/** The columns whose values the list can actually be ordered by. */
const SORTABLE: Partial<Record<ColumnKey, SortKey>> = {
  name: "name",
  email: "email",
  source: "source",
  created_at: "created_at",
  stage: "stage",
  score: "score",
  next_action: "next_action_at",
};

/**
 * The shipped columns.
 *
 * Score leads, because the first question a person opens this list with is
 * which lead matters most — and a list that cannot answer it until you have
 * read every row is one that gets worked top to bottom by arrival date. Phone
 * drops out of the default set to make room; it is still on the lead card and
 * still available as a column.
 */
export const DEFAULT_COLUMNS: LeadColumn[] = [
  { field: "score" },
  { field: "name" },
  { field: "company" },
  { field: "stage" },
  { field: "source" },
  { field: "next_action" },
  { field: "created_at" },
];

/** What a click has to miss for the row itself to claim it. */
const CONTROLS = "a, button, select, input, textarea, label, [contenteditable], [data-explain]";

/**
 * The working list.
 *
 * Every captured field is edited in place: click a value, type, press Enter.
 * Stage and source are closed sets and get controls; the rest are free text.
 * Only the id is fixed, because it is the row's identity in the database.
 *
 * The row is also a click target for opening the lead's card — but only where
 * no cell control is, since every editable value is a button and clicking one
 * means "edit this", not "open the lead".
 */
export default function LeadTable({
  columns,
  showOpenLink = true,
  rowClickOpens = true,
  readOnly,
  showPagination = true,
  className = "",
}: LeadTableProps) {
  const tracker = useLeadTracker();
  const { paged, query, isSample, setFlash, apply, today } = tracker;
  // One page, not the whole filtered set: see `paged` in TrackerContext for why
  // the two are kept apart.
  const rows = paged.rows;
  const isReadOnly = readOnly ?? tracker.readOnly;
  const edit = { readOnly: isReadOnly, isSample, onResult: setFlash };

  const shown = (columns?.length ? columns : DEFAULT_COLUMNS).filter((column) => HEADERS[column.field]);
  const minWidth = Math.max(560, shown.length * 155);

  function openLead(event: MouseEvent<HTMLTableRowElement>, lead: Lead) {
    // A click that landed on a cell's own control belongs to that control: the
    // editable values are buttons, stage and source are selects, and the id is
    // a link that already opens the card.
    if ((event.target as HTMLElement).closest(CONTROLS)) return;
    // Nor one that ended a text selection — dragging across a phone number to
    // copy it should not also open the card.
    if (!window.getSelection()?.isCollapsed) return;
    apply({ lead: lead.id });
  }

  function cell(column: LeadColumn, lead: Lead) {
    switch (column.field) {
      case "score":
        // Lost leads carry no useful score — the queue excludes them and the
        // stall penalty does not apply — so the cell says why it is blank
        // rather than showing a number that means nothing.
        return lead.lost ? (
          <span className="text-xs text-slate-400">closed</span>
        ) : (
          <ScoreChip leadId={lead.id} />
        );
      case "next_action": {
        if (!lead.nextAction && !lead.nextActionAt) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        const overdueBy = lead.nextActionAt ? daysBetween(lead.nextActionAt, today) : null;
        const isOverdue = overdueBy !== null && overdueBy >= 0;
        return (
          <>
            <span className="block text-slate-800">{lead.nextAction || "Unnamed task"}</span>
            {lead.nextActionAt ? (
              <span
                className={`mt-0.5 block text-xs ${
                  isOverdue ? "font-semibold text-rose-700" : "text-slate-400"
                }`}
              >
                {isOverdue ? "overdue " : "due "}
                {prettyDate(lead.nextActionAt)}
              </span>
            ) : null}
          </>
        );
      }
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
                const term = EXPLAINED[column.field];
                return (
                  <th key={index} className="px-5 py-4 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {sortKey ? <SortHeader sortKey={sortKey} label={label} /> : label}
                      {term ? <Explain term={term} label={label} /> : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr
                key={lead.id}
                // The row is a mouse convenience, not the accessible control:
                // the `L-1088 · open` link in the name cell is what a keyboard
                // and a screen reader use, which is why it stays.
                onClick={rowClickOpens ? (event) => openLead(event, lead) : undefined}
                className={`border-t border-slate-200 align-top ${lead.lost ? "opacity-60" : ""} ${
                  lead.id === query.leadId
                    ? "bg-sky-50"
                    : rowClickOpens
                      ? "hover:bg-slate-50"
                      : ""
                } ${rowClickOpens ? "cursor-pointer" : ""}`}
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

      {showPagination ? <TablePagination className="mt-4" /> : null}
    </div>
  );
}
