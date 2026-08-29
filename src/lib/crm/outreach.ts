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
 * ---------------------------------------------------------------------------
 * Stage decides the goal; the record decides the opener
 *
 * These drafts used to branch on the record alone — a booked meeting, a
 * cancellation, a chat question, a silence. That produced messages that were
 * always true and often aimless: the same "checking in, where do things stand"
 * went to a lead who had never seen the product and to one sitting on a
 * proposal, because both were equally quiet.
 *
 * Stage is now the primary axis, because it is what decides what the message is
 * *for*. MQL is asking for attention, SQL is asking for a decision to be made
 * easy, Opportunity is asking for the decision itself, and Customer is not
 * selling at all. Underneath that, the record still chooses the opener wherever
 * it has something stronger to open with — a meeting in the diary outranks any
 * stage template, because confirming it is the only message that makes sense.
 *
 * The no-prices rule above survives this intact, and it bites hardest at SQL,
 * where the instruction is to be competitive. The draft offers to *build* a
 * quote against real volumes; it never names a figure. That is the honest
 * version of competitive here — this business quotes after a consultation, and
 * a number invented by a template would go out under a rep's own name.
 * ---------------------------------------------------------------------------
 *
 * Pure functions over plain data, like the rest of `src/lib/crm/`.
 */

import { daysBetween, prettyDate } from "./analytics";
import { LOST_REASONS } from "./taxonomy";
import type { Lead, LeadAppointment, LostReason } from "./types";

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
 * Two cross-stage openers are checked first, because the record has something
 * to say that outranks any template: a meeting already in the diary, and a
 * meeting that was cancelled and never replaced. After that the lead's stage
 * decides what the message is for.
 *
 * A lost lead is answered by `reopeningDraft`, which is keyed on the cause of
 * death rather than the stage it died at — "we have changed how we quote" is
 * the right letter to a price loss whether it died at SQL or at Opportunity.
 */
export function draftFollowUp(lead: Lead, ctx: DraftContext): Draft {
  const name = firstName(lead.name);
  const greeting = name ? `Hi ${name},` : "Hello,";
  const matter = subjectMatter(lead);
  const sign = signOff(ctx);

  const upcoming = ctx.appointments.find(
    (a) => a.status !== "Cancelled" && daysBetween(ctx.today, a.date) >= 0,
  );
  const cancelled = latest(ctx.appointments, "Cancelled");
  const live = ctx.appointments.filter(
    (a) => a.status === "Confirmed" || a.status === "Pending",
  );

  // 1. A meeting is in the diary. Confirming it is the only message that makes
  //    sense at any stage, and it is the one most likely to stop a no-show.
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

  // 2. They booked, cancelled, and nothing replaced it. They wanted the meeting
  //    once, so the message is about making it easy to have it — again, true at
  //    whatever stage they are sitting at.
  if (cancelled && live.length === 0) {
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

  if (lead.lost) return reopeningDraft(lead, ctx, greeting, matter, sign);

  switch (lead.stage) {
    case "mql":
      return promotionDraft(lead, ctx, greeting, matter, sign);
    case "sql":
      return negotiationDraft(lead, ctx, greeting, matter, sign);
    case "opportunity":
      return closingDraft(lead, ctx, greeting, matter, sign);
    case "customer":
      return checkInDraft(lead, ctx, greeting, matter, sign);
    default:
      return qualifyingDraft(lead, ctx, greeting, matter, sign);
  }
}

/**
 * Lead — a first reply that asks rather than pitches.
 *
 * The board does not offer a Contact button at this stage, so this is written
 * for the rep who opened one specific raw lead and decided it was worth a
 * message anyway. It asks the two questions that decide whether they are a
 * buyer, because that is the only thing an unqualified lead is for.
 *
 * The chat opener lives here and only here: a visitor who typed a question into
 * the site and left their details has told us what they want, and quoting it
 * back is the strongest opener available at the one stage where nobody has
 * spoken to them yet.
 */
function qualifyingDraft(
  lead: Lead,
  ctx: DraftContext,
  greeting: string,
  matter: string,
  sign: string,
): Draft {
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

  const age = lead.createdAt ? Math.max(0, daysBetween(lead.createdAt, ctx.today)) : 0;
  return {
    subject:
      matter === "your printing requirements" ? "Your enquiry" : `Your enquiry about ${matter}`,
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

/**
 * MQL — put the product in front of them.
 *
 * The job here is exposure, not agreement, so the message asks for the smallest
 * possible thing: look at this. No pricing, no meeting request, no "when can we
 * talk" — each of those asks a lead who has not yet seen the product to commit
 * before they have been given a reason to.
 */
function promotionDraft(
  lead: Lead,
  ctx: DraftContext,
  greeting: string,
  matter: string,
  sign: string,
): Draft {
  const met = latest(ctx.appointments, "Completed");

  // A meeting already happened and the stage never moved past MQL. Sending a
  // product overview over the top of that would read as though nobody listened.
  if (met) {
    const since = Math.max(0, daysBetween(met.date, ctx.today));
    return {
      subject: `Following up on our ${met.type.toLowerCase()}`,
      body:
        `${greeting}\n\n` +
        `Thanks again for your time ${since <= 2 ? "the other day" : `on ${niceDate(met.date)}`}. ` +
        `I wanted to check what you made of ${matter}, and whether anything came up afterwards ` +
        `that I can help with.\n\n` +
        `If it would be useful, I can put together the next step for your team to review.\n\n` +
        `Best,\n${sign}`,
      basis: `They completed a ${met.type.toLowerCase()} ${since} days ago and are still at MQL.`,
    };
  }

  return {
    subject:
      matter === "your printing requirements"
        ? "What we could do for you"
        : `A closer look at ${matter}`,
    body:
      `${greeting}\n\n` +
      `We have not spoken properly yet, so rather than chase you I thought I would just show ` +
      `you what we do.\n\n` +
      `We fit and maintain office print systems — the machines, the servicing and the ` +
      `consumables — so there is one number to ring when something stops working. Most of our ` +
      `customers came to us because they were managing three suppliers for that.\n\n` +
      `I can send over a short overview of the models that suit ${matter}, with what each one ` +
      `is actually good at. Nothing to fill in and no commitment — have a read, and tell me if ` +
      `any of it is relevant to you.\n\n` +
      `Best,\n${sign}`,
    basis: "They fit who we sell to, but have not been shown the product yet.",
  };
}

/**
 * SQL — make it easy to say yes.
 *
 * The need is confirmed, so this stops describing and starts removing reasons
 * to wait: an offer to price against their real volumes, and two specific times
 * for a demonstration. Two times rather than "when suits you" on purpose — an
 * open question is work for the reader, and a choice between two is not.
 *
 * It offers to *build* a quote and never quotes one. See the module note: being
 * competitive here means pricing their actual usage rather than a list, and
 * saying so costs nothing and commits nobody to a figure.
 */
function negotiationDraft(
  lead: Lead,
  ctx: DraftContext,
  greeting: string,
  matter: string,
  sign: string,
): Draft {
  const met = latest(ctx.appointments, "Completed");
  const opener = met
    ? `Thanks again for your time on ${niceDate(met.date)}. Now I have a picture of what you ` +
      `are running, I can put some real numbers against it.`
    : `Now I understand what you are running, the useful next step is numbers rather than ` +
      `another conversation about features.`;

  return {
    subject:
      matter === "your printing requirements"
        ? "Putting some numbers together"
        : `Next steps on ${matter}`,
    body:
      `${greeting}\n\n` +
      `${opener}\n\n` +
      `I would rather quote against your actual volumes than hand you a list price — that is ` +
      `usually the difference between a figure that looks fine now and one that still looks ` +
      `fine in a year. Tell me roughly what you print in a month and how many people are on ` +
      `it, and I will put a proper costing together with servicing and consumables included, ` +
      `so there is nothing hiding underneath it.\n\n` +
      `It is also worth seeing one run before you decide. I could do Tuesday or Thursday ` +
      `afternoon — say which is easier and I will arrange it. If neither works, name a day and ` +
      `I will fit around you.\n\n` +
      `Best,\n${sign}`,
    basis: met
      ? `Qualified, and met with us on ${niceDate(met.date)}. The next step is a costed proposal.`
      : "Qualified with no meeting booked. The next step is a costed proposal and a date.",
  };
}

/**
 * Opportunity — confirm, then close.
 *
 * A proposal is with them, so the only two useful things a message can do are
 * check it arrived intact and surface whatever is actually blocking it. It asks
 * what would need to happen rather than for a decision, because the answer to
 * the first is something a rep can act on and the answer to the second is
 * almost always "we are still discussing it".
 */
function closingDraft(
  lead: Lead,
  ctx: DraftContext,
  greeting: string,
  matter: string,
  sign: string,
): Draft {
  const silent = lead.lastContactAt
    ? Math.max(0, daysBetween(lead.lastContactAt.slice(0, 10), ctx.today))
    : null;

  return {
    subject: matter === "your printing requirements" ? "Where we stand" : `Where we stand on ${matter}`,
    body:
      `${greeting}\n\n` +
      `I wanted to check you have everything you need from us on ${matter} — and that what we ` +
      `sent answers the question your side is actually asking, rather than the one I assumed.\n\n` +
      `If something is still in the way, it is usually easier to tell me than to work around ` +
      `it. Whether that is the figure, the timing, or somebody internally who has not seen it ` +
      `yet, I have some room to move on all three.\n\n` +
      `What would need to happen for you to be comfortable going ahead?\n\n` +
      `Best,\n${sign}`,
    basis:
      silent === null
        ? "At Opportunity with no logged contact — the proposal is out and unacknowledged."
        : `A proposal is with them and it has been ${silent} day${silent === 1 ? "" : "s"} since anyone spoke to them.`,
  };
}

/**
 * Customer — not a sales message.
 *
 * The order matters and it is the whole point: the machine first, their opinion
 * second, what is new third, and the referral last and lightly. Reversed, it is
 * a pitch wearing a check-in as a disguise, which is how an account learns to
 * stop opening your email.
 *
 * The referral ask is unconditional, because it otherwise never gets made — but
 * it is one sentence at the bottom, phrased so that ignoring it costs the
 * reader nothing.
 */
function checkInDraft(
  lead: Lead,
  ctx: DraftContext,
  greeting: string,
  matter: string,
  sign: string,
): Draft {
  const since = lead.lastContactAt
    ? Math.max(0, daysBetween(lead.lastContactAt.slice(0, 10), ctx.today))
    : null;

  return {
    subject: "How is everything running?",
    body:
      `${greeting}\n\n` +
      `No agenda with this one — I wanted to check the machine is doing what you bought it ` +
      `for. Any jams, any drop in quality, anything the team keeps grumbling about?\n\n` +
      `If there is something you would change about how we have handled it, I would genuinely ` +
      `rather hear it than not. That includes the boring parts: response times, how the ` +
      `consumables turn up, whoever you end up speaking to when you ring.\n\n` +
      `We have also added a few models since you bought. If your volumes have moved or you are ` +
      `opening somewhere new, it is worth five minutes before you commit to anything.\n\n` +
      `And if anyone you know is putting up with a printer they hate, send them my way — it is ` +
      `how most of our good customers found us.\n\n` +
      `Best,\n${sign}`,
    basis:
      since === null
        ? "A customer with no logged contact since the sale."
        : `They bought, and it has been ${since} day${since === 1 ? "" : "s"} since anyone checked in.`,
  };
}

/**
 * Lost — written against the cause, not the stage.
 *
 * Only worth sending when something has actually changed, and each `basis` says
 * so out loud, so a rep does not fire these off as a batch. A re-approach that
 * cannot name what is different is the same conversation that already failed
 * once, and it tells the reader we were not listening the first time.
 *
 * Two causes get no tailored re-approach at all. "Not a fit" and "Wrong
 * contact" were targeting failures, and the person on the other end is not the
 * one who can fix that — writing to them again asks a stranger to solve our
 * filing problem. They fall through to the neutral draft.
 */
function reopeningDraft(
  lead: Lead,
  ctx: DraftContext,
  greeting: string,
  matter: string,
  sign: string,
): Draft {
  const sinceClosed = lead.lastContactAt
    ? Math.max(0, daysBetween(lead.lastContactAt.slice(0, 10), ctx.today))
    : null;
  const gap = sinceClosed === null ? "a while" : `${sinceClosed} days`;
  const reason = lead.lostReason;

  const byCause: Partial<Record<LostReason, { subject: string; middle: string; basis: string }>> = {
    price: {
      subject: "Worth another look?",
      middle:
        `When we last spoke about ${matter}, the figure was the sticking point — and that was ` +
        `a fair objection rather than a brush-off.\n\n` +
        `We have changed how we put deals like yours together since then. I would rather show ` +
        `you what that looks like against your own volumes than simply tell you it is better, ` +
        `so if you are open to it, send me a rough monthly figure and I will work it out.`,
      basis: "Lost on price. Only send this if how we quote has actually changed since.",
    },
    competitor: {
      subject: "How has it worked out?",
      middle:
        `You went a different way on ${matter} when we last spoke, which was entirely ` +
        `reasonable — I wanted to see how it has held up.\n\n` +
        `If it is doing the job, genuinely good. If the servicing has turned out to be the weak ` +
        `part, that is usually where we get called back in, and I am happy to look at it with ` +
        `no obligation either way.`,
      basis: "Lost to a competitor. The useful moment is after the honeymoon, not during it.",
    },
    timing: {
      subject: "Is the timing better now?",
      middle:
        `We talked about ${matter} a while back and the timing was wrong — nothing to do with ` +
        `the fit.\n\n` +
        `It has been ${gap}, so I wanted to check whether the picture has changed at your end. ` +
        `If it has not, tell me when to come back and I will leave you alone until then.`,
      basis: "Lost on timing — the most reopenable cause there is. Check the date is actually right.",
    },
    budget_cut: {
      subject: "Checking in on the budget",
      middle:
        `Last time we spoke about ${matter} the budget had gone, which happens and was nobody's ` +
        `fault.\n\n` +
        `New year, new numbers — I wanted to ask whether it is back on the list. If it is, I can ` +
        `put something together that fits whatever the figure actually is, rather than what we ` +
        `discussed before.`,
      basis: "Lost to a budget cut. Send at the start of their fiscal year, not before it.",
    },
    no_response: {
      subject: "One last try",
      middle:
        `I never heard back about ${matter}, which usually means the moment passed or it landed ` +
        `at a busy time.\n\n` +
        `No hard feelings either way — but if it is still something you are thinking about, a ` +
        `one-line reply is enough and I will pick it up from there. If not, say so and I will ` +
        `stop cluttering your inbox.`,
      basis: "They went silent. Keep it short, and make saying no as easy as saying yes.",
    },
  };

  const chosen = reason ? byCause[reason] : undefined;

  if (!chosen) {
    const cause = reason ? LOST_REASONS[reason].label.toLowerCase() : null;
    return {
      subject: "Checking back in",
      body:
        `${greeting}\n\n` +
        `We spoke about ${matter} a while ago and it did not go ahead at the time.\n\n` +
        `I wanted to check whether anything has changed at your end — and if it has not, that ` +
        `is a perfectly good answer.\n\n` +
        `Best,\n${sign}`,
      basis: cause
        ? `Closed as "${cause}", which was a targeting call on our side rather than theirs. Re-approach only if that has changed.`
        : "Closed with no reason recorded, so there is nothing specific to re-approach on.",
    };
  }

  return {
    subject: chosen.subject,
    body: `${greeting}\n\n${chosen.middle}\n\nBest,\n${sign}`,
    basis: chosen.basis,
  };
}
