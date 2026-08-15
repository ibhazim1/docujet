/**
 * The chat panel's endpoint.
 *
 * A thin proxy in front of the n8n workflow. It exists so the webhook URL stays
 * on the server (see `src/lib/chat/webhook.ts`), and so the one public,
 * unauthenticated, money-costing path in this app has a place to validate input
 * and throttle abuse before anything reaches n8n.
 */

import {
  askChatWebhook,
  ChatWebhookError,
  MAX_MESSAGE_CHARS,
  type ChatTurn,
} from "@/lib/chat/webhook";

/** Never prerender or cache: every request is a distinct conversation turn. */
export const dynamic = "force-dynamic";

/** Turns of prior conversation forwarded to the workflow. Enough for context, short enough to stay cheap. */
const MAX_HISTORY_TURNS = 8;

// ---------------------------------------------------------------------------
// Throttling
//
// Deliberately in-process and approximate. It is not a security boundary — it
// is a brake, so a single bored visitor cannot spin the workflow in a loop. On
// a multi-instance deployment each instance keeps its own counter, which is
// fine for that purpose. A shared store would only be worth it if the workflow
// ever became expensive enough to be worth defending properly.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;

const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(
    (at) => now - at < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  // The map would otherwise grow one entry per visitor for the process's life.
  if (hits.size > 500) {
    for (const [entryKey, times] of hits) {
      if (times.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) {
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

function parseHistory(value: unknown): ChatTurn[] {
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
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.slice(0, MAX_MESSAGE_CHARS),
    }));
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (isRateLimited(clientKey(request))) {
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
  if (message.length > MAX_MESSAGE_CHARS) {
    return fail(
      `Please keep your question under ${MAX_MESSAGE_CHARS} characters.`,
      400,
    );
  }

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim() !== ""
      ? body.sessionId.trim().slice(0, 100)
      : crypto.randomUUID();

  try {
    const reply = await askChatWebhook({
      message,
      sessionId,
      page: typeof body.page === "string" ? body.page.slice(0, 200) : undefined,
      history: parseHistory(body.history),
    });

    return Response.json({ reply, sessionId });
  } catch (error) {
    if (error instanceof ChatWebhookError) {
      return fail(error.message, error.status);
    }

    console.error("[chat] unexpected failure", error);
    return fail(
      "Something went wrong on our side. Please try again, or contact us directly.",
      500,
    );
  }
}
