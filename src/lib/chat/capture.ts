/**
 * Turning conversations into leads.
 *
 * ---------------------------------------------------------------------------
 * The leak this closes
 *
 * The assistant answers from 111 verified Epson entries, talks to real buyers,
 * and captured nobody. Every field needed to record one of those conversations
 * already existed and was written by nothing: `source = 'chatbot'` in the
 * taxonomy, `chat_topic` and `cited` as columns since 0001, and a panel in
 * `LeadDetail.tsx` that renders all three. The wire between them is this file
 * and the `capture_chat_lead` function added in 0006.
 *
 * It is the highest-value change in this work by some distance. A visitor
 * asking what an ink cartridge yields is further along than most leads the paid
 * channels produce — they have a machine in mind and a question about running
 * it — and until now the business never learned they existed.
 * ---------------------------------------------------------------------------
 *
 * Server-side only, via `supabase()` — see `src/lib/supabase/service.ts`.
 */

import { supabase } from "../supabase/service";
import { isSupabaseConfigured } from "../supabase/service";

/** Field caps. Generous, since this is a form a person types into by hand. */
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_PHONE = 40;
const MAX_COMPANY = 160;
const MAX_TOPIC = 500;
const MAX_CITED = 12;

/**
 * Email validation, kept deliberately loose.
 *
 * Enough to catch a typo and a bot posting junk; not enough to reject the
 * legitimately odd address, because the cost of the two errors is nowhere near
 * equal. A rejected buyer is gone; a malformed row is a rep squinting at one
 * field for two seconds. `capture_chat_lead` matches on this value, so it is
 * lowercased and trimmed here rather than left for Postgres.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CaptureInput = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  /** What they were asking about. Becomes the lead's interest and chat topic. */
  topic?: string;
  /** Knowledge-base ids that answered them. Empty is meaningful — see below. */
  cited?: string[];
  sessionId?: string;
};

export type CaptureResult =
  | { ok: true; leadId: string }
  | { ok: false; message: string; status: number };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Records one captured conversation as a lead.
 *
 * Validation is the caller-facing half; the upsert-by-email, the fill-blanks-
 * only discipline and the event log all live in `capture_chat_lead`, alongside
 * the identical rules `create_booking` follows — deliberately one place, so the
 * two capture paths cannot drift into disagreeing about what counts as the same
 * person.
 */
export async function captureChatLead(input: CaptureInput): Promise<CaptureResult> {
  const name = clean(input.name, MAX_NAME);
  const email = clean(input.email, MAX_EMAIL).toLowerCase();
  const phone = clean(input.phone, MAX_PHONE);
  const company = clean(input.company, MAX_COMPANY);
  const topic = clean(input.topic, MAX_TOPIC);

  if (email === "" || !EMAIL.test(email)) {
    return { ok: false, message: "That does not look like an email address.", status: 400 };
  }
  if (name === "") {
    return { ok: false, message: "Please give us a name to put on the enquiry.", status: 400 };
  }
  if (!isSupabaseConfigured()) {
    console.warn("[chat] a lead was offered and there is no database to put it in");
    return {
      ok: false,
      message: "We could not save that just now. Please use the booking form instead.",
      status: 503,
    };
  }

  // Deduped and capped: the retrieval returns up to six chunks and several
  // routinely come from the same document, so the raw list would store the same
  // id three times and make `cited.length` read as more evidence than it is.
  const cited = [...new Set((input.cited ?? []).filter((id) => typeof id === "string" && id !== ""))]
    .slice(0, MAX_CITED);

  const { data, error } = await supabase().rpc("capture_chat_lead", {
    p_full_name: name,
    p_email: email,
    p_phone: phone,
    p_company_name: company,
    // The question doubles as the interest, which is what `value.ts` reads a
    // model number out of — so "pricing on the WF-C21000" prices itself.
    p_interest: topic,
    p_chat_topic: topic,
    p_cited: cited,
    p_session_id: clean(input.sessionId, 100),
  });

  if (error) {
    console.error(`[chat] could not capture a lead: ${error.message}`);
    return {
      ok: false,
      message: "We could not save that just now. Please use the booking form instead.",
      status: 500,
    };
  }

  return { ok: true, leadId: String(data) };
}

/**
 * Logs one question, whether or not it was answered.
 *
 * Fire-and-forget by contract: the caller must not await a failure here into
 * the visitor's reply. A logging problem is an operator's problem, and turning
 * it into an error bubble would break the one public feature this app has in
 * order to record that it worked.
 *
 * `answered` is derived from whether retrieval cleared the similarity floor,
 * not from whether the model produced text — it always produces text, including
 * when it is honestly saying it does not know.
 */
export async function logChatQuestion(input: {
  sessionId: string;
  question: string;
  cited: string[];
  topSimilarity: number | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const cited = [...new Set(input.cited)].slice(0, MAX_CITED);

  const { error } = await supabase().from("chat_questions").insert({
    session_id: input.sessionId.slice(0, 100),
    question: input.question.slice(0, 2000),
    answered: cited.length > 0,
    top_similarity: input.topSimilarity,
    cited,
  });

  if (error) {
    console.warn(`[chat] could not log the question: ${error.message}`);
  }
}

export type KnowledgeGap = {
  question: string;
  askedAt: string;
  timesAsked: number;
};

/**
 * Questions the corpus could not answer, most-repeated first.
 *
 * A demand signal the site has always generated and never kept. One unanswered
 * question is a bad day; the same question from fourteen different visitors is
 * a missing page that is costing sales, and the fix is one entry in the
 * knowledge base — which is why this is surfaced next to the editor that adds
 * them.
 *
 * Grouped case-insensitively on the question text. Crude, and right for the
 * volumes involved: near-duplicates that differ in wording still read as a
 * theme when they sit next to each other in a short list.
 */
export async function getKnowledgeGaps(limit = 20): Promise<{
  gaps: KnowledgeGap[];
  total: number;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { gaps: [], total: 0, error: null };
  }

  const { data, error } = await supabase()
    .from("chat_questions")
    .select("question, asked_at")
    .eq("answered", false)
    .order("asked_at", { ascending: false })
    .limit(500);

  if (error) {
    return { gaps: [], total: 0, error: error.message };
  }

  const rows = (data ?? []) as { question: string; asked_at: string }[];
  const grouped = new Map<string, KnowledgeGap>();

  for (const row of rows) {
    const key = row.question.trim().toLowerCase();
    const existing = grouped.get(key);
    if (existing) {
      existing.timesAsked += 1;
      // Keep the most recent asking, so the list reads as current.
      if (row.asked_at > existing.askedAt) existing.askedAt = row.asked_at;
    } else {
      grouped.set(key, { question: row.question.trim(), askedAt: row.asked_at, timesAsked: 1 });
    }
  }

  const gaps = [...grouped.values()]
    .sort((a, b) => b.timesAsked - a.timesAsked || (a.askedAt < b.askedAt ? 1 : -1))
    .slice(0, limit);

  return { gaps, total: rows.length, error: null };
}
