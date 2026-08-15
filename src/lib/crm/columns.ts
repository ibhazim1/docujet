/**
 * Mapping between a sheet's header row and the lead model.
 *
 * The sheet is a human document that predates this app, so its headers are
 * whatever a person found natural — "Lead ID", "Date", "Status" — not the
 * field names the code uses. Rather than demand the sheet be rewritten, every
 * field accepts a few spellings and the columns are located by name at read
 * time. Column *order* is therefore irrelevant, and inserting a column in the
 * sheet cannot shift every field by one.
 *
 * Only `id` is required. A sheet that does not record job titles or notes
 * simply yields empty strings for them; nothing downstream breaks.
 *
 * `scripts/apps-script/Code.gs` carries the same table, because the write path
 * has to find the same two columns from the same headers. The two must agree —
 * change one, change the other.
 */

import type { LeadField } from "./types";

/**
 * Accepted header spellings per field, lowercased.
 *
 * The first entry is the canonical name that `npm run crm:seed` writes.
 */
export const COLUMN_ALIASES: Record<LeadField, string[]> = {
  id: ["id", "lead id", "leadid", "lead_id", "ref"],
  name: ["name", "lead", "lead name", "full name", "contact"],
  title: ["title", "job title", "position", "role"],
  email: ["email", "e-mail", "email address"],
  phone: ["phone", "phone number", "mobile", "contact number"],
  source: ["source", "channel", "lead source"],
  stage: ["stage", "lifecycle", "lifecycle stage"],
  created_at: ["created_at", "date", "captured", "created", "created date"],
  interest: ["interest", "product interest", "stated interest"],
  chat_topic: ["chat_topic", "chat topic", "question", "chatbot question"],
  cited: ["cited", "citations", "faq", "kb entries"],
  notes: ["notes", "note", "comments", "remarks"],
  lost: ["lost", "status", "state"],
};

export const LEAD_FIELDS = Object.keys(COLUMN_ALIASES) as LeadField[];

/** Canonical header row, written by the seed script. */
export const CANONICAL_HEADERS = LEAD_FIELDS.map((field) => COLUMN_ALIASES[field][0]);

export type ColumnMap = {
  /** Zero-based column index per field; -1 when the sheet has no such column. */
  index: Record<LeadField, number>;
  /** The header text actually found, per field. Empty when absent. */
  matched: Record<LeadField, string>;
};

/**
 * Locates each field in a header row.
 *
 * A header is claimed by the first field that lists it, and a column is never
 * claimed twice — so a sheet carrying both "Status" and "Lost" gives `lost` to
 * whichever appears first rather than silently preferring one.
 */
export function resolveColumns(header: string[]): ColumnMap {
  const normalised = header.map((cell) => cell.toString().trim().toLowerCase());
  const taken = new Set<number>();

  const index = {} as Record<LeadField, number>;
  const matched = {} as Record<LeadField, string>;

  for (const field of LEAD_FIELDS) {
    let found = -1;
    for (const alias of COLUMN_ALIASES[field]) {
      const at = normalised.indexOf(alias);
      if (at !== -1 && !taken.has(at)) {
        found = at;
        break;
      }
    }
    index[field] = found;
    matched[field] = found === -1 ? "" : header[found].toString().trim();
    if (found !== -1) taken.add(found);
  }

  return { index, matched };
}

/**
 * Reads a lead's closed state from whatever vocabulary its column uses.
 *
 * A `lost` column holds TRUE/FALSE; a `Status` column holds Active/Lost. Both
 * answer the same question, so both are understood here and anything
 * unrecognised — including a blank — means still in play.
 */
export function coerceLost(value: string): boolean {
  const text = value.trim().toLowerCase();
  return (
    text === "true" ||
    text === "1" ||
    text === "yes" ||
    text === "lost" ||
    text === "closed"
  );
}

/**
 * The two words a status column should be written back with.
 *
 * Writing TRUE into a column whose dropdown only permits Active/Lost is
 * rejected by Sheets outright, so the vocabulary is chosen from the header the
 * sheet actually uses.
 */
export function lostVocabulary(matchedHeader: string): { lost: string; open: string } {
  const header = matchedHeader.trim().toLowerCase();
  return header === "status" || header === "state"
    ? { lost: "Lost", open: "Active" }
    : { lost: "TRUE", open: "FALSE" };
}
