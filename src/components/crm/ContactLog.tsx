"use client";

import AdminTable from "@/components/admin/AdminTable";
import EmptyState from "@/components/admin/EmptyState";
import Explain from "./Explain";
import { TrackerLink, useLeadTracker } from "./TrackerContext";
import { isInboundContact } from "@/lib/crm/taxonomy";
import type { ContactLogEntry, LeadEventKind } from "@/lib/crm/types";

export type ContactLogProps = {
  /** Overrides the tracker's own log. Rarely wanted — see the note below. */
  entries?: ContactLogEntry[];
  /** How many rows to render before the footer says how many were left out. */
  limit?: number;
  title?: string;
  className?: string;
};

/**
 * What each kind of contact is called, and which way it went.
 *
 * Direction is the column that stops this being a list of undifferentiated
 * events: a call the team made and a form the lead filled in are both contact,
 * and only one of them is work somebody did.
 */
const KIND: Record<string, { label: string; chip: string; ink: string }> = {
  contacted: { label: "Logged contact", chip: "#e0f2fe", ink: "#075985" },
  appointment: { label: "Appointment booked", chip: "#ede9fe", ink: "#5b21b6" },
  chat_capture: { label: "Chat enquiry", chip: "#cffafe", ink: "#155e63" },
};

/**
 * When it happened, to the minute.
 *
 * A contact log is read to answer "has anyone spoken to them since Tuesday",
 * so the time of day matters and a bare date does not answer it. Fixed locale
 * and an explicit timezone: this renders on the server, and a timestamp that
 * shifted with the host's clock would be worse than no timestamp.
 */
function when(at: string): { date: string; time: string } {
  const stamp = new Date(at);
  if (Number.isNaN(stamp.getTime())) return { date: at, time: "" };

  return {
    date: stamp.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    }),
    time: stamp.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kuala_Lumpur",
    }),
  };
}

/**
 * Every interaction with a lead, in one place.
 *
 * ---------------------------------------------------------------------------
 * What this answers that nothing else did
 *
 * The lead card shows one lead's history and the queue shows what is overdue.
 * Neither answers the question a manager actually asks out loud — "who has been
 * talking to whom, and when" — because that question is cross-lead and both of
 * those views are per-lead or per-play. Without it, "we contacted them" is a
 * claim; with it, it is a row with a name and a timestamp on it.
 *
 * The `By` column is the reason the underlying `actor_id` had to start being
 * filled in. It was nullable and written by nothing, so before this the log
 * could have said when a lead was contacted and never by whom, which is the
 * half of the answer that makes the other half worth having.
 * ---------------------------------------------------------------------------
 *
 * Inbound rows — a booking, a chat enquiry — are attributed to the lead rather
 * than left blank. Nobody on the team did them, and an empty cell reads as
 * missing data rather than as "they came to us".
 *
 * Reads the tracker rather than taking rows as a prop, like every other piece
 * of the CRM, which is what makes it obey the filter bar above it: filter to a
 * source and this becomes the contact history for that channel.
 */
export default function ContactLog({
  entries,
  limit = 25,
  title = "Contact log",
  className = "",
}: ContactLogProps) {
  const { contactLog, filtered } = useLeadTracker();
  const all = entries ?? contactLog;
  const rows = all.slice(0, limit);

  return (
    <section className={`min-w-0 space-y-4 ${className}`}>
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
          {title}
          <Explain term="concept.contactLog" label="the contact log" />
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Every recorded interaction with a lead — who was contacted, how to reach them, who did it
          and when.{" "}
          {filtered ? "Narrowed to the leads the filters above are showing." : null}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No contact recorded for these leads" : "No contact recorded yet"}
          description={
            filtered
              ? "Nothing has been logged against any lead the current filters match. Clear the filters to see the whole log."
              : "Nothing has been logged against a lead. Use Log contact after a call, and bookings and chat enquiries will appear here on their own."
          }
        />
      ) : (
        <AdminTable>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Lead", "Contact details", "Type", "By", "When"].map((heading) => (
                  <th key={heading} className="px-5 py-4 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {heading}
                      {heading === "By" ? (
                        <Explain term="action.logContact" label="the By column" />
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => {
                const kind = KIND[entry.kind] ?? {
                  label: entry.kind,
                  chip: "#f1f5f9",
                  ink: "#475569",
                };
                const stamp = when(entry.at);
                const inbound = isInboundContact(entry.kind as LeadEventKind);

                return (
                  <tr key={entry.id} className="border-t border-slate-200 align-top">
                    <td className="px-5 py-4">
                      <TrackerLink
                        overrides={{ lead: entry.leadId }}
                        scrollTo="lead-detail"
                        className="font-medium text-slate-950 underline-offset-4 hover:text-sky-800 hover:underline"
                      >
                        {entry.leadName}
                      </TrackerLink>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {entry.company || entry.leadId}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {entry.email ? (
                        <a
                          href={`mailto:${entry.email}`}
                          className="block break-all underline-offset-4 hover:text-sky-800 hover:underline"
                        >
                          {entry.email}
                        </a>
                      ) : (
                        <span className="block text-slate-400">No email</span>
                      )}
                      {entry.phone ? (
                        <a
                          href={`tel:${entry.phone.replace(/\s/g, "")}`}
                          className="mt-0.5 block whitespace-nowrap text-xs underline-offset-4 hover:text-sky-800 hover:underline"
                        >
                          {entry.phone}
                        </a>
                      ) : (
                        <span className="mt-0.5 block text-xs text-slate-400">No phone</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: kind.chip, color: kind.ink }}
                      >
                        {kind.label}
                      </span>
                      {entry.detail ? (
                        <span className="mt-1 block max-w-xs text-xs leading-5 text-slate-500">
                          {entry.detail}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      {entry.actorName ? (
                        <span className="text-slate-800">{entry.actorName}</span>
                      ) : inbound ? (
                        <span className="text-slate-500">
                          The lead
                          <span className="mt-0.5 block text-xs text-slate-400">came to us</span>
                        </span>
                      ) : (
                        // Logged before actor attribution existed, or by the
                        // seed script. Named as such rather than left blank, so
                        // it does not read as a person whose name is missing.
                        <span className="text-slate-400">Not recorded</span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {stamp.date}
                      <span className="mt-0.5 block text-xs tabular-nums text-slate-400">
                        {stamp.time}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTable>
      )}

      {all.length > rows.length ? (
        <p className="text-xs text-slate-500">
          Showing the {rows.length} most recent of {all.length} recorded interactions.
        </p>
      ) : null}
    </section>
  );
}
