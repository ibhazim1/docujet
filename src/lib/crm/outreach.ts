/**
 * The follow-up a rep is about to send.
 *
 * ---------------------------------------------------------------------------
 * Why the app drafts this at all
 *
 * The queue can rank leads perfectly and still be ignored, because the gap
 * between "call this one" and actually doing it is a blank message box at nine
 * in the morning. That blank box is where a work queue quietly dies: the rep
 * knows who to contact, cannot immediately think what to say, and moves on to
 * something with less friction in it.
 *
 * So this writes the first draft. Not to automate the conversation — a rep
 * edits every one of these before sending, and should — but to make starting
 * cost nothing. The draft is deliberately short, specific to what this lead
 * actually did, and free of anything that would embarrass the sender if it went
 * out unedited.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * What it will not say
 *
 * No prices, no lead times, no availability, no promises about what a
 * technician will do. Those are the same limits the chat assistant works under
 * (`src/lib/chat/prompt.ts`), and for the same reason: this business quotes
 * after a consultation, and a draft that guessed a number would put it in a
 * rep's outbox under their own name.
 *
 * It also never claims something happened that the record does not support —
 * "following up on our call" is only written when there is a logged contact to
 * follow up on.
 * ---------------------------------------------------------------------------
 *
 * Pure functions over plain data, like the rest of `src/lib/crm/`.
 */

import { daysBetween, prettyDate } from "./analytics";
import type { Lead, LeadAppointment } from "./types";

export type Draft = {
  /** Email subject. Ignored when the rep is sending this by phone or chat. */
  subject: string;
  /** The message. Plain text with blank lines between paragraphs. */
  body: string;
  /** Why this draft rather than another, for the line above the textarea. */
  basis: string;
};

export type DraftContext = {
  /** Y-m-d. */
  today: string;
  appointments: LeadAppointment[];
  /** Who is writing. Signs the message off; omitted when unknown. */
  senderName?: string | null;
  /** The business, for the sign-off. */
  companyName?: string;
};

/**
 * Honorifics, which are never the name to greet somebody by.
 *
 * "Tan" is deliberately absent even though "Tan Sri" is a title: it is also one
 * of the commonest Chinese-Malaysian surnames, and dropping it would greet Tan
 * Boon Keat as "Boon". Discarding a real name is the worse error, so the
 * ambiguous case keeps the name.
 */
const HONORIFIC = /^(mr|mrs|ms|miss|dr|prof|ir|encik|puan|cik|tuan|datuk|dato|datin|haji|hajah|seri|sri)[.]?$/i;

/**
 * The name to open with.
 *
 * The first token that is not a title. Malaysian names carry patronymics —
 * "bin", "binti", "a/l" — and honorifics, and "Hi Ahmad" is right where "Hi
 * Ahmad Zulkifli bin Hassan" is a mail merge announcing itself.
 *
 * Falls back to a greeting with no name rather than to a placeholder: "Hello,"
 * is warm and "Hi {name}" is a bug somebody sent to a customer.
 */
export function firstName(fullName: string): string | null {
  for (const token of fullName.trim().split(/\s+/)) {
    if (token.length < 2) continue;
    if (HONORIFIC.test(token)) continue;
    return token;
  }
  return null;
}

/**
 * A date as it should appear in a message to a customer.
 *
 * `prettyDate` gives "19 Jun 2026". The ISO form these are stored in is correct
 * everywhere else in the app and wrong here: nobody writes "our demonstration
 * on 2026-06-19" to a person.
 */
function niceDate(date: string): string {
  return prettyDate(date);
}

/** "the WF-C21000" / "your printing requirements" — what to say they asked about. */
function subjectMatter(lead: Lead): string {
  const interest = lead.interest.trim();
  if (interest === "") return "your printing requirements";

  // The interest is free text a rep may have typed. A model number is the one
  // part of it worth quoting back verbatim; anything else is summarised, since
  // repeating a whole line like "WF-C21000 fleet for 4 branch offices" reads as
  // a database field pasted into a sentence.
  const model = interest.match(/WF-C2\d{4}/i);
  return model ? `the ${model[0].toUpperCase()}` : "your printing requirements";
}

/** The most recent appointment of a given status, or null. */
function latest(appointments: LeadAppointment[], status: string): LeadAppointment | null {
  const matching = appointments.filter((a) => a.status === status);
  if (matching.length === 0) return null;
  return matching.reduce((a, b) => (a.date > b.date ? a : b));
}

function signOff(ctx: DraftContext): string {
  const company = ctx.companyName?.trim() || "DocuJet";
  return ctx.senderName?.trim() ? `${ctx.senderName.trim()}\n${company}` : company;
}

/**
 * Writes the draft.
 *
 * Six situations, checked in the order that makes one of them true. The
 * ordering matters: a lead with a cancelled booking AND a long silence is a
 * rebooking conversation, not a generic check-in, and the more specific opener
 * is always the better one to hand a rep.
 */
export function draftFollowUp(lead: Lead, ctx: DraftContext): Draft {
  const name = firstName(lead.name);
  const greeting = name ? `Hi ${name},` : "Hello,";
  const matter = subjectMatter(lead);
  const sign = signOff(ctx);
  const upcoming = ctx.appointments.find(
    (a) => a.status !== "Cancelled" && daysBetween(ctx.today, a.date) >= 0,
  );
  const completed = latest(ctx.appointments, "Completed");
  const cancelled = latest(ctx.appointments, "Cancelled");

  // 1. A meeting is in the diary. Confirming it is the only message that makes
  //    sense, and it is the one most likely to stop a no-show.
  if (upcoming) {
    return {
      subject: `Confirming ${niceDate(upcoming.date)} — ${upcoming.type}`,
      body:
        `${greeting}\n\n` +
        `Just confirming our ${upcoming.type.toLowerCase()} on ${niceDate(upcoming.date)} at ` +
        `${upcoming.time}. I will walk you through ${matter} and answer anything you want to ` +
        `dig into.\n\n` +
        `If the time no longer suits, tell me what does and I will move it.\n\n` +
        `Thanks,\n${sign}`,
      basis: `They have a ${upcoming.type.toLowerCase()} booked for ${niceDate(upcoming.date)}.`,
    };
  }

  // 2. A meeting happened. Anything else would ignore the most important thing
  //    in the record.
  if (completed) {
    const since = Math.max(0, daysBetween(completed.date, ctx.today));
    return {
      subject: `Following up on our ${completed.type.toLowerCase()}`,
      body:
        `${greeting}\n\n` +
        `Thanks again for your time ${since <= 2 ? "the other day" : `on ${niceDate(completed.date)}`}. ` +
        `I wanted to check what you made of ${matter}, and whether anything came up ` +
        `afterwards that I can help with.\n\n` +
        `If it would be useful, I can put together the next step for your team to review.\n\n` +
        `Best,\n${sign}`,
      basis: `They completed a ${completed.type.toLowerCase()} ${since} days ago and the stage has not moved since.`,
    };
  }

  // 3. They booked and then cancelled, and nothing replaced it. They wanted the
  //    meeting once, so the message is about making it easy to have it.
  if (cancelled) {
    return {
      subject: "Finding another time",
      body:
        `${greeting}\n\n` +
        `We had a ${cancelled.type.toLowerCase()} booked that did not go ahead — no problem at ` +
        `all. If you are still looking at ${matter}, I am happy to find a time that works ` +
        `better, or to send something over you can read at your own pace instead.\n\n` +
        `Which would you prefer?\n\n` +
        `Best,\n${sign}`,
      basis: `Their ${cancelled.type.toLowerCase()} on ${niceDate(cancelled.date)} was cancelled and nothing was booked in its place.`,
    };
  }

  // 4. They came through the chat panel with a specific question. Quoting it
  //    back is the strongest opener available — it proves a person read it.
  if (lead.chatTopic && lead.lastContactAt === null) {
    const unanswered = lead.cited.length === 0;
    return {
      subject: "Your question about our printers",
      body:
        `${greeting}\n\n` +
        `You asked us: "${lead.chatTopic}"\n\n` +
        (unanswered
          ? `That one is outside what our site assistant could answer, so it came to me directly. ` +
            `I can give you a proper answer — and if it is easier, we can go through it on a ` +
            `quick call.\n\n`
          : `I wanted to follow that up properly rather than leave you with the short version. ` +
            `Happy to go through it on a quick call, or to answer here if that is easier.\n\n`) +
        `Best,\n${sign}`,
      basis: unanswered
        ? "They asked the site assistant something it could not answer, and left their details anyway."
        : "They left their details in the chat panel after asking a specific question.",
    };
  }

  // 5. Never been contacted. An introduction, kept short — nobody reads a long
  //    first email from a company they have not spoken to.
  if (lead.lastContactAt === null) {
    const age = lead.createdAt ? Math.max(0, daysBetween(lead.createdAt, ctx.today)) : 0;
    return {
      subject: `${matter === "your printing requirements" ? "Your enquiry" : `Your enquiry about ${matter}`}`,
      body:
        `${greeting}\n\n` +
        `Thanks for getting in touch about ${matter}. I look after enquiries like yours, and I ` +
        `wanted to introduce myself rather than send you a brochure.\n\n` +
        `Could you tell me roughly what your current print volumes look like, and how many ` +
        `people would be using the machine? That is usually enough for me to point you at the ` +
        `right model.\n\n` +
        `Best,\n${sign}`,
      basis:
        age > 0
          ? `Nobody has contacted them since they arrived ${age} days ago.`
          : "Nobody has contacted them yet.",
    };
  }

  // 6. Everything else: we have spoken, and it has gone quiet.
  const silent = Math.max(0, daysBetween(lead.lastContactAt.slice(0, 10), ctx.today));
  return {
    subject: "Checking in",
    body:
      `${greeting}\n\n` +
      `It has been a little while since we last spoke about ${matter}, so I wanted to check ` +
      `where things stand at your end.\n\n` +
      `If it is still on the table, tell me what would be most useful next and I will sort it. ` +
      `If the timing has changed, that is helpful to know too — I would rather leave you alone ` +
      `and come back when it suits.\n\n` +
      `Best,\n${sign}`,
    basis: `Last contact was ${silent} day${silent === 1 ? "" : "s"} ago.`,
  };
}
