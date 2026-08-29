/**
 * The chat panel's endpoint.
 *
 * The doorway, not the assistant. Everything about answering — retrieval, the
 * brief, the model call — lives under `src/lib/chat/`; this route exists so the
 * one public, unauthenticated, money-costing path in this app has a place to
 * validate input and throttle abuse before any of that runs.
 *
 * It used to proxy to an n8n workflow. The contract it presents to the browser
 * is post `{ message, sessionId, page, history }`, get back
 * `{ reply, sessionId, cited, answered }` or `{ error }`.
 *
 * `cited` and `answered` were added when the assistant became a sales channel
 * rather than a help desk: the panel accumulates the ids so that a visitor who
 * later leaves their details arrives in the lead book carrying the
 * knowledge-base entries that served them, and `answered` is what lets the
 * panel offer the handover exactly when the corpus has run out of road.
 */

import { logChatQuestion } from "@/lib/chat/capture";
import {
  askAssistant,
  ChatError,
  MAX_MESSAGE_CHARS as FALLBACK_MAX_MESSAGE_CHARS,
  type ChatTurn,
} from "@/lib/chat/deepseek";
import { getSettingsSafe } from "@/lib/settings/store";

/** Never prerender or cache: every request is a distinct conversation turn. */
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Throttling
//
// Deliberately in-process and approximate. It is not a security boundary — it
// is a brake, so a single bored visitor cannot spin the workflow in a loop. On
// a multi-instance deployment each instance keeps its own counter, which is
// fine for that purpose. A shared store would only be worth it if the workflow
// ever became expensive enough to be worth defending properly.
//
// Window/max-requests are admin-configurable (settings.chat.rateLimit*), read
// fresh per request below — the store's own 30s cache keeps this cheap.
// ---------------------------------------------------------------------------

const hits = new Map<string, number[]>();

function isRateLimited(key: string, windowMs: number, maxRequests: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);

  if (recent.length >= maxRequests) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  // The map would otherwise grow one entry per visitor for the process's life.
  if (hits.size > 500) {
    for (const [entryKey, times] of hits) {
      if (times.every((at) => now - at >= windowMs)) {
        hits.delete(entryKey);
      }
    }
  }

  return false;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// ---------------------------------------------------------------------------

function parseHistory(value: unknown, maxHistoryTurns: number, maxMessageChars: number): ChatTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is ChatTurn => {
      if (!entry || typeof entry !== "object") return false;
      const turn = entry as Partial<ChatTurn>;
      return (
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim() !== ""
      );
    })
    .slice(-maxHistoryTurns)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.slice(0, maxMessageChars),
    }));
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const { chat } = await getSettingsSafe();
  const maxMessageChars = chat.maxMessageChars || FALLBACK_MAX_MESSAGE_CHARS;

  if (isRateLimited(clientKey(request), chat.rateLimitWindowMs, chat.rateLimitMaxRequests)) {
    return fail(
      "That is a lot of questions at once. Give it a minute, then try again.",
      429,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("Malformed request.", 400);
  }

  const body = (payload ?? {}) as Record<string, unknown>;

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message === "") {
    return fail("Type a question first.", 400);
  }
  if (message.length > maxMessageChars) {
    return fail(
      `Please keep your question under ${maxMessageChars} characters.`,
      400,
    );
  }

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim() !== ""
      ? body.sessionId.trim().slice(0, 100)
      : crypto.randomUUID();

  try {
    const answer = await askAssistant({
      message,
      sessionId,
      page: typeof body.page === "string" ? body.page.slice(0, 200) : undefined,
      history: parseHistory(body.history, chat.maxHistoryTurns, maxMessageChars),
    });

    // Fire-and-forget, and deliberately not awaited: the visitor has an answer
    // and must not wait on an insert, nor ever see one fail. `logChatQuestion`
    // swallows and logs its own errors; the catch here is the last resort for a
    // rejected promise, which would otherwise be unhandled.
    void logChatQuestion({
      sessionId,
      question: message,
      cited: answer.cited,
      topSimilarity: answer.topSimilarity,
    }).catch(() => undefined);

    return Response.json({
      reply: answer.reply,
      sessionId,
      cited: answer.cited,
      // Whether the knowledge base had anything, not whether text came back —
      // the model always produces text, including when it is honestly saying it
      // does not know.
      answered: answer.cited.length > 0,
    });
  } catch (error) {
    if (error instanceof ChatError) {
      return fail(error.message, error.status);
    }

    console.error("[chat] unexpected failure", error);
    return fail(
      "Something went wrong on our side. Please try again, or contact us directly.",
      500,
    );
  }
}
