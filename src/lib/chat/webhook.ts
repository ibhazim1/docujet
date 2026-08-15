/**
 * The chat assistant's only link to the outside world.
 *
 * The answer is produced by an n8n workflow, not by this app: the browser talks
 * to `/api/chat`, that route talks to this module, and this module talks to the
 * webhook. Nothing else in the codebase knows the URL exists, so pointing the
 * assistant at a different workflow — or replacing n8n entirely — means
 * rewriting this file and nothing else.
 *
 * The Python RAG service under `chatbot/` is a separate, older experiment and
 * is deliberately not wired into the site.
 *
 * Server-side only. Keeping the call here rather than in the browser means the
 * webhook URL never ships in the client bundle, so it cannot be lifted out of
 * the page source and hammered directly, and the browser never has to negotiate
 * CORS with n8n.
 */

/**
 * The workflow supplied for development.
 *
 * This is the **test** endpoint (`/webhook-test/…`). n8n only registers a test
 * webhook while the editor is open and the workflow is armed with "Execute
 * workflow" — otherwise it answers 404 and the assistant reports it as
 * unavailable. The production endpoint is the same URL with `/webhook/` in
 * place of `/webhook-test/`, and it stays live once the workflow is activated.
 *
 * Set `N8N_CHAT_WEBHOOK_URL` to switch; no code change is needed.
 */
const FALLBACK_WEBHOOK_URL =
  "https://documationdev.app.n8n.cloud/webhook-test/5f88d823-5a47-4bbd-aaf4-c2eeeaff67a9";

/** How long the workflow gets to answer before the visitor is told it timed out. */
const REQUEST_TIMEOUT_MS = 45_000;

/** Longest question accepted, matching GUARDRAIL_MAX_QUESTION_CHARS in .env.example. */
export const MAX_MESSAGE_CHARS = 1000;

export function chatWebhookUrl(): string {
  return process.env.N8N_CHAT_WEBHOOK_URL?.trim() || FALLBACK_WEBHOOK_URL;
}

/** True while the webhook is the one-shot test endpoint rather than a live one. */
export function isTestWebhook(url = chatWebhookUrl()): boolean {
  return url.includes("/webhook-test/");
}

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AskOptions = {
  message: string;
  /** Stable per-visitor id, so a memory node in the workflow can thread the conversation. */
  sessionId: string;
  /** Path the visitor asked from. Lets the workflow answer "this page" questions. */
  page?: string;
  /** Recent turns, oldest first, in case the workflow keeps no memory of its own. */
  history?: ChatTurn[];
};

/**
 * A failure the visitor is allowed to read.
 *
 * Anything thrown from here reaches the chat panel verbatim, so the messages
 * are written for a customer, not for a log file — with the single exception of
 * the unarmed-test-webhook case, which only ever happens in development and is
 * worth naming precisely so the developer knows to press "Execute workflow".
 */
export class ChatWebhookError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "ChatWebhookError";
    this.status = status;
  }
}

/**
 * Pulls the reply text out of whatever the workflow returned.
 *
 * n8n's shape depends on how the workflow was built — an AI Agent node ends up
 * as `{ output }`, a Set node as `{ text }` or `{ message }`, a "Respond to
 * Webhook" node in text mode as a bare string, and any of them wrapped in a
 * one-item array. Rather than force one convention on whoever edits the
 * workflow, accept the common ones and only give up when there is genuinely no
 * text to show.
 */
export function extractReply(raw: string): string | null {
  const body = raw.trim();
  if (body === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Not JSON: the workflow responded with plain text, which is a valid reply.
    return body;
  }

  const KEYS = ["output", "text", "reply", "message", "answer", "response", "result"];

  const walk = (value: unknown, depth: number): string | null => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }
    if (depth > 4) return null;

    if (Array.isArray(value)) {
      for (const entry of value) {
        const found = walk(entry, depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const key of KEYS) {
        if (key in record) {
          const found = walk(record[key], depth + 1);
          if (found) return found;
        }
      }
      // `data` and `json` are envelopes rather than answers, so they are only
      // opened after the keys above have been tried at this level.
      for (const key of ["data", "json", "body"]) {
        if (key in record) {
          const found = walk(record[key], depth + 1);
          if (found) return found;
        }
      }
    }

    return null;
  };

  return walk(parsed, 0);
}

/**
 * Sends one question to the workflow and returns its answer.
 *
 * The payload carries the question under three names on purpose: `chatInput` is
 * what n8n's own Chat Trigger reads, `message` is the obvious name for a Webhook
 * node, and `action: "sendMessage"` is what the Chat Trigger expects to see. A
 * workflow built either way therefore works without anyone having to match this
 * file's vocabulary.
 */
export async function askChatWebhook({
  message,
  sessionId,
  page,
  history = [],
}: AskOptions): Promise<string> {
  const url = chatWebhookUrl();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sendMessage",
        chatInput: message,
        message,
        sessionId,
        page: page ?? null,
        history,
        source: "docujet-website",
        timestamp: new Date().toISOString(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ChatWebhookError(
        "That took longer than expected. Please try again, or book an appointment and we will follow up directly.",
        504,
      );
    }
    throw new ChatWebhookError(
      "The assistant is unreachable right now. Please try again in a moment.",
    );
  }

  const body = await response.text();

  if (!response.ok) {
    // The visitor gets a courteous non-answer either way, so the detail has to
    // go somewhere a developer will see it. Without this, a workflow that
    // throws inside n8n is indistinguishable from one that is merely offline.
    console.warn(
      `[chat] n8n responded ${response.status}: ${body.slice(0, 300)}`,
    );

    // A 404 from a /webhook-test/ URL is not an outage — it means nobody has
    // armed the workflow in the n8n editor. Say so plainly; it is the single
    // most common way this integration appears broken during development.
    if (response.status === 404 && isTestWebhook(url)) {
      throw new ChatWebhookError(
        'The n8n test webhook is not listening. Open the workflow in n8n and click "Execute workflow", ' +
          "or set N8N_CHAT_WEBHOOK_URL to the production URL (/webhook/ instead of /webhook-test/).",
        503,
      );
    }
    throw new ChatWebhookError(
      "The assistant could not answer that just now. Please try again shortly.",
    );
  }

  const reply = extractReply(body);
  if (!reply) {
    throw new ChatWebhookError(
      "The assistant returned an empty answer. Please rephrase your question or contact us directly.",
    );
  }

  return reply;
}
