/**
 * Where a chat conversation becomes a lead.
 *
 * The sibling of `/api/chat`, and public for the same reason: the visitor
 * filling this in has no account and is not going to make one. Everything that
 * decides what gets written lives in `captureChatLead` and in the
 * `capture_chat_lead` function 0006 adds — this route is the doorway, and its
 * job is to validate, throttle, and refuse to be interesting.
 *
 * Throttled harder than `/api/chat`. That route is a person asking questions
 * and a burst of them is normal curiosity; this one writes to the lead book,
 * where a burst is somebody filling it with rubbish. Nothing here is a security
 * boundary — `capture_chat_lead` upserts on email, so the worst a determined
 * abuser achieves is one junk lead per address, which a rep deletes.
 */

import { captureChatLead } from "@/lib/chat/capture";

export const dynamic = "force-dynamic";

/** Captures per window, per address. A visitor needs one; two is a correction. */
const MAX_CAPTURES = 3;
const WINDOW_MS = 10 * 60 * 1000;

// In-process and approximate, exactly as the chat route's limiter is, and for
// the same reason: it is a brake rather than a boundary, and on a multi-instance
// deployment each instance keeping its own count is fine for that purpose.
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= MAX_CAPTURES) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 500) {
    for (const [entryKey, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(entryKey);
    }
  }

  return false;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  if (isRateLimited(clientKey(request))) {
    return Response.json(
      { error: "That has already been sent. We will be in touch shortly." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const body = (payload ?? {}) as Record<string, unknown>;

  const result = await captureChatLead({
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    company: typeof body.company === "string" ? body.company : "",
    topic: typeof body.topic === "string" ? body.topic : "",
    cited: Array.isArray(body.cited) ? (body.cited as string[]) : [],
    sessionId: typeof body.sessionId === "string" ? body.sessionId : "",
  });

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: result.status });
  }

  // The lead id goes back so the panel can say something specific, and because
  // it is the reference a visitor quotes if they ring before anyone rings them.
  return Response.json({ ok: true, reference: result.leadId });
}
