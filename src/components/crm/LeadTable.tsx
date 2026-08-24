"use client";

import Link from "next/link";
import AdminTable from "@/components/admin/AdminTable";
import EditableCell from "./EditableCell";
import SortHeader from "./SortHeader";
import SourceSelect from "./SourceSelect";
import StageSelect from "./StageSelect";
import type { StageActionResult } from "@/lib/crm/actions";
import { prettyDate } from "@/lib/crm/analytics";
import { buildHref } from "@/lib/crm/query";
import { STAGES } from "@/lib/crm/taxonomy";
import type { Lead, SortDirection, SortKey } from "@/lib/crm/types";

type LeadTableProps = {
  leads: Lead[];
  selectedId: string;
  sort: SortKey;
  dir: SortDirection;
  params: URLSearchParams;
  readOnly: boolean;
  isSample: boolean;
  onResult?: (result: StageActionResult) => void;
};

/**
 * The working list.
 *
 * Every captured field is edited in place: click a value, type, press Enter.
 * Stage and source are closed sets and get controls; the rest are free text.
 * Only the id is fixed, because it is the row's identity in the database.
 */
export default function LeadTable({
  leads,
  selectedId,
  sort,
  dir,
  params,
  readOnly,
  isSample,
  onResult,
}: LeadTableProps) {
  const edit = { readOnly, isSample, onResult };

  return (
    <AdminTable>
      <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
        {/* Fixed shares rather than auto widths: with auto, a long note pushes
            every other column around as the data changes. Notes takes the
            slack because it is the only column with no natural width. */}
        <colgroup>
          <col className="w-[17%]" />
          <col className="w-[19%]" />
          <col className="w-[13%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[17%]" />
        </colgroup>
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-5 py-4 font-medium">
              <SortHeader sortKey="name" label="Lead" activeKey={sort} activeDir={dir} params={params} />
            </th>
            <th className="px-5 py-4 font-medium">
              <SortHeader sortKey="email" label="Email" activeKey={sort} activeDir={dir} params={params} />
            </th>
            <th className="px-5 py-4 font-medium">Phone</th>
            <th className="px-5 py-4 font-medium">
              <SortHeader sortKey="source" label="Source" activeKey={sort} activeDir={dir} params={params} />
            </th>
            <th className="px-5 py-4 font-medium">
              <SortHeader sortKey="created_at" label="Captured" activeKey={sort} activeDir={dir} params={params} />
            </th>
            <th className="px-5 py-4 font-medium">
              <SortHeader sortKey="stage" label="Stage" activeKey={sort} activeDir={dir} params={params} />
            </th>
            <th className="px-5 py-4 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className={`border-t border-slate-200 align-top ${lead.lost ? "opacity-60" : ""} ${
                lead.id === selectedId ? "bg-sky-50" : ""
              }`}
            >
              <td className="px-5 py-4">
                <EditableCell
                  leadId={lead.id}
                  field="name"
                  value={lead.name}
                  placeholder="Unnamed lead"
                  className="font-medium text-slate-950"
                  {...edit}
                />
                <Link
                  href={`${buildHref(params, { lead: lead.id })}#lead-detail`}
                  className="mt-0.5 block text-xs text-slate-500 underline-offset-4 hover:text-sky-800 hover:underline"
                >
                  {lead.id} · open
                </Link>
              </td>
              <td className="px-5 py-4 text-slate-600">
                <EditableCell
                  leadId={lead.id}
                  field="email"
                  value={lead.email}
                  type="email"
                  placeholder="No email"
                  className="break-all"
                  {...edit}
                />
              </td>
              <td className="px-5 py-4 text-slate-600">
                <EditableCell
                  leadId={lead.id}
                  field="phone"
                  value={lead.phone}
                  type="tel"
                  placeholder="No phone"
                  {...edit}
                />
              </td>
              <td className="px-5 py-4">
                <SourceSelect
                  leadId={lead.id}
                  source={lead.source}
                  readOnly={readOnly}
                  isSample={isSample}
                  onResult={onResult}
                />
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                <EditableCell
                  leadId={lead.id}
                  field="created_at"
                  value={lead.createdAt}
                  type="date"
                  placeholder="No date"
                  render={(value) => prettyDate(value)}
                  {...edit}
                />
              </td>
              <td className="px-5 py-4">
                <StageSelect
                  lead={lead}
                  readOnly={readOnly}
                  isSample={isSample}
                  onResult={onResult}
                />
                {lead.lost ? (
                  // The control can only say "Lost"; how far the lead got is
                  // the useful part.
                  <span className="mt-1 block text-xs text-slate-500">
                    at {STAGES[lead.stage].label}
                  </span>
                ) : null}
              </td>
              <td className="px-5 py-4 text-slate-600">
                <EditableCell
                  leadId={lead.id}
                  field="notes"
                  value={lead.notes}
                  placeholder="Add a note"
                  multiline
                  className="whitespace-pre-wrap"
                  {...edit}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTable>
  );
}
