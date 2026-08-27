"use client";

/**
 * The chat assistant's knowledge base, as a table.
 *
 * Everything the assistant is allowed to say about the products is one row in
 * here. It arrived either from the Q&A sheet (`npm run kb:ingest`) or from the
 * website's own copy, and until now correcting one meant editing a spreadsheet
 * on someone's laptop. Adding, editing and removing all happen here instead —
 * and because every write re-embeds the entry, a correction is searchable the
 * moment it is saved.
 *
 * Rendered as a sibling of `SettingsForm`, never inside it: that component is a
 * single `<form>`, and this one has a form of its own.
 */

import { useMemo, useState, useTransition } from "react";

import AdminTable from "./AdminTable";
import { compactInputClassName, inputClassName, pillButtonClassName } from "./field-styles";
import {
  addKnowledgeEntryAction,
  deleteKnowledgeEntryAction,
  updateKnowledgeEntryAction,
  type EditableKnowledgeField,
  type KnowledgeActionResult,
} from "@/lib/chat/actions";
import { ADMIN_SOURCE, parseQnaContent } from "@/lib/chat/corpus";
import type { KnowledgeEntry } from "@/lib/chat/knowledge";

/**
 * Rows shown before the table asks to be expanded.
 *
 * The corpus is well over a hundred entries and this table sits at the bottom
 * of a settings page. Search finds a specific answer; this keeps scrolling past
 * the table cheap for everyone who came here for something else.
 */
const INITIAL_ROWS = 25;

type KnowledgeManagerProps = {
  entries: KnowledgeEntry[];
  /** Set when the table could not be read, so the section explains itself rather than showing zero rows. */
  notice?: string | null;
};

export default function KnowledgeManager({ entries, notice = null }: KnowledgeManagerProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<KnowledgeActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Parsed once per render rather than per cell: every row needs both halves,
  // and the regex would otherwise run twice for each of a hundred rows on every
  // keystroke in the search box.
  const rows = useMemo(
    () => entries.map((entry) => ({ entry, ...parseQnaContent(entry.content) })),
    [entries],
  );

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === "") return rows;

    return rows.filter(({ entry, question, answer }) =>
      [entry.id, entry.source, question, answer].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [rows, search]);

  const shown = expanded ? matches : matches.slice(0, INITIAL_ROWS);

  function onAdd(formData: FormData) {
    startTransition(async () => {
      const outcome = await addKnowledgeEntryAction(formData);
      setResult(outcome);
      if (outcome.ok) setAdding(false);
    });
  }

  function onDelete(id: string, question: string) {
    // Deliberately a confirm(): there is no undo and no tombstone — the
    // importer will not put a deleted entry back.
    if (!window.confirm(`Remove "${question || id}" from the knowledge base?`)) return;

    startTransition(async () => {
      setResult(await deleteKnowledgeEntryAction(id));
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Knowledge base</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The only things the assistant knows about the products. It answers from the entries
            that match a visitor&apos;s question and says it does not know when none do, so an
            answer that is missing here is an answer it will not give.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className={pillButtonClassName}
        >
          {adding ? "Cancel" : "Add Q&A"}
        </button>
      </div>

      {notice ? (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
        >
          {notice}
        </p>
      ) : null}

      {adding ? (
        <form action={onAdd} className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Question</span>
            <input
              name="question"
              required
              placeholder="How long is the warranty?"
              className={inputClassName}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Answer</span>
            <textarea
              name="answer"
              rows={5}
              required
              placeholder="Write it the way you would say it to a customer."
              className={inputClassName}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Keywords <span className="font-normal text-slate-500">(optional)</span>
            </span>
            <input
              name="keywords"
              placeholder="warranty, support, wf-c21000"
              className={inputClassName}
            />
            <span className="mt-2 block text-xs leading-6 text-slate-500">
              Comma separated. Worth adding model codes a customer might type but the answer
              does not spell out.
            </span>
          </label>
          <button type="submit" disabled={isPending} className={pillButtonClassName}>
            {isPending ? "Saving…" : "Save entry"}
          </button>
        </form>
      ) : null}

      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
            result.ok
              ? "border-sky-200 bg-sky-50 text-sky-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {result.message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <label className="block w-full max-w-sm">
          <span className="mb-2 block text-sm font-medium text-slate-700">Search entries</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setExpanded(false);
            }}
            placeholder="Heat-Free, warranty, WF-C21000…"
            className={compactInputClassName}
          />
        </label>
        <p className="text-sm text-slate-500">
          Showing {shown.length} of {matches.length}
          {matches.length === entries.length ? "" : ` (${entries.length} total)`}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
          {entries.length === 0
            ? "No entries yet. Add one above, or seed them from the sheet with npm run kb:ingest."
            : "Nothing matches that search."}
        </p>
      ) : (
        <div className="mt-5">
          <AdminTable>
            <table className="w-full min-w-[52rem] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[47%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Question", "Answer", "Source", ""].map((heading) => (
                    <th key={heading || "actions"} className="px-5 py-4 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(({ entry, question, answer }) => (
                  <tr key={entry.id} className="border-t border-slate-200 align-top">
                    <td className="px-5 py-4">
                      <KnowledgeCell
                        id={entry.id}
                        field="question"
                        value={question}
                        placeholder={entry.title}
                        onResult={setResult}
                        className="font-medium text-slate-950"
                      />
                      <span className="mt-1 block font-mono text-[0.7rem] text-slate-400">
                        {entry.id}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <KnowledgeCell
                        id={entry.id}
                        field="answer"
                        value={answer}
                        multiline
                        onResult={setResult}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <SourceBadge source={entry.source} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id, question)}
                        disabled={isPending}
                        className={pillButtonClassName}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTable>

          {!expanded && matches.length > shown.length ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={`${pillButtonClassName} mt-4`}
            >
              Show all {matches.length}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

/**
 * Where an entry came from, and therefore who may overwrite it.
 *
 * Worth a column rather than a footnote: an entry marked `admin` is one the
 * importer will never touch again, and that is the difference between a
 * correction that survives the next `npm run kb:ingest` and one that does not.
 */
function SourceBadge({ source }: { source: string }) {
  const isAdmin = source === ADMIN_SOURCE;

  return (
    <span
      title={isAdmin ? "Edited here. The sheet importer leaves it alone." : source}
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isAdmin ? "bg-sky-100 text-sky-900" : "bg-slate-100 text-slate-600"
      }`}
    >
      {isAdmin ? "admin" : source === "site-data" ? "website" : "sheet"}
    </span>
  );
}

type KnowledgeCellProps = {
  id: string;
  field: EditableKnowledgeField;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  onResult: (result: KnowledgeActionResult) => void;
};

/**
 * A value that becomes an input when clicked.
 *
 * The same interaction as `src/components/crm/EditableCell.tsx` — click to
 * edit, Escape to abandon, blur to save, an unchanged value costs nothing —
 * written separately rather than by generalising that component, which is wired
 * to the lead tracker's action across sixteen call sites and is not worth
 * destabilising for this. The two differ in what they save and in wanting a
 * clamped multi-line answer here.
 */
function KnowledgeCell({
  id,
  field,
  value,
  placeholder = "—",
  multiline = false,
  className = "",
  onResult,
}: KnowledgeCellProps) {
  const [editing, setEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shown = pendingValue ?? value;

  function save(next: string) {
    setEditing(false);
    const trimmed = next.trim();
    if (trimmed === value) return;

    // Held over the prop while the write is in flight, because re-embedding and
    // writing takes a round trip the admin should not watch their own typing
    // disappear for. Cleared either way once the page refreshes.
    setPendingValue(trimmed);
    startTransition(async () => {
      const outcome = await updateKnowledgeEntryAction(id, field, trimmed);
      setPendingValue(null);
      onResult(outcome);
    });
  }

  if (editing) {
    const shared = {
      autoFocus: true,
      defaultValue: shown,
      "aria-label": `${field} for ${id}`,
      className:
        "w-full min-w-0 rounded-lg border border-sky-700 bg-white px-2 py-1 text-sm text-slate-900 outline-none ring-4 ring-sky-100",
      onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        save(event.target.value),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setEditing(false);
        }
        // Enter saves — except in a textarea, where it should still break a line.
        if (event.key === "Enter" && !multiline) {
          event.preventDefault();
          save((event.target as HTMLInputElement).value);
        }
      },
    };

    return multiline ? <textarea rows={8} {...shared} /> : <input {...shared} />;
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={isPending}
      title="Click to edit"
      className={`-mx-1 block w-full rounded px-1 py-0.5 text-left leading-6 transition hover:bg-sky-50 hover:ring-1 hover:ring-sky-200 disabled:opacity-50 ${className}`}
    >
      {shown ? (
        <span className={multiline ? "line-clamp-4 whitespace-pre-wrap" : ""}>{shown}</span>
      ) : (
        <span className="text-slate-400">{placeholder}</span>
      )}
    </button>
  );
}
