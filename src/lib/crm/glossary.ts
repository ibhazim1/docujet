/**
 * What every term on the lead pages actually means.
 *
 * ---------------------------------------------------------------------------
 * Why this is a module and not a pile of `title` attributes
 *
 * The tracker is dense with vocabulary that is obvious to whoever built it and
 * opaque to whoever uses it: MQL, SQL, going cold, plays, bands, source
 * quality. A person who does not know what SQL means does not read "Reached
 * SQL+ — 34%" as a finding; they read it as noise and go back to working the
 * list by date, which is the exact behaviour every other part of this app was
 * built to stop.
 *
 * The explanations live here, together, for two reasons. They are prose, and
 * prose is only any good when it can be read end to end and made consistent —
 * scattered across thirty components it drifts, contradicts itself and goes
 * stale. And they are the same words in every place a term appears, so "Going
 * cold" on a KPI tile, in the queue and in a score breakdown cannot come to
 * mean three different things.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * The shape: what / why / how
 *
 * Every entry answers the three questions in that order, and the order is the
 * point. `what` alone produces a glossary, which tells a reader what a word
 * means and still leaves them with nothing to do. `why` is what earns the term
 * the right to be on screen at all. `how` is the only part that changes
 * anybody's morning.
 *
 * `why` and `how` are optional because forcing them produces padding, and a
 * tooltip nobody finishes reading explains nothing. Where the meaning carries
 * its own justification, the entry stops.
 * ---------------------------------------------------------------------------
 *
 * Thresholds are interpolated from `STALL_DAYS` rather than typed out, so the
 * explanation cannot quietly start lying the day somebody retunes them.
 */

import { STALL_DAYS } from "./taxonomy";

export type GlossaryEntry = {
  /** The term as the UI spells it. Heads the tooltip. */
  term: string;
  /** What it is. One or two sentences, using no jargon that is not itself defined here. */
  what: string;
  /** Why the business cares. Omitted where `what` already carries it. */
  why?: string;
  /** What to actually do about it. Present on everything a person can act on. */
  how?: string;
};

export const GLOSSARY = {
  // ---- The lifecycle -------------------------------------------------------
  //
  // The five stages plus the one terminal state. These are the terms that get
  // used most and explained least, because everyone who built this already
  // knows them.

  "stage.lead": {
    term: "Lead",
    what:
      "Someone who has given us their details and has not been assessed yet. Every capture lands " +
      "here first — a chatbot enquiry, a website form, a click from social.",
    why:
      "It is the widest part of the funnel and the least reliable one. Most of what sits here " +
      "will never buy, so leaving leads unassessed makes the pipeline look healthier than it is.",
    how:
      `Assess it inside ${STALL_DAYS.lead} days. Either move it to MQL because it looks like a ` +
      "buyer, or mark it lost with a reason — but stop counting it as pipeline.",
  },

  "stage.mql": {
    term: "MQL — Marketing Qualified Lead",
    what:
      "They match who we sell to — the right sort of organisation, a plausible job title, a real " +
      "interest recorded — but nobody has spoken to them yet.",
    why:
      "It is marketing's verdict, not sales'. Keeping it separate from SQL is what lets you see " +
      "whether a bad month was caused by the leads coming in or by the follow-up going out.",
    how:
      "Call them. MQL is a claim that the lead is worth a conversation; the conversation is what " +
      "turns it into an SQL.",
  },

  "stage.sql": {
    term: "SQL — Sales Qualified Lead",
    what:
      "Someone on the team has actually spoken to them and confirmed there is a real need, a " +
      "budget it could come out of, and a person who can say yes.",
    why:
      "SQL is the first stage that means a human verified the opportunity rather than inferred " +
      "it. That is why every quality figure in this tracker is measured as “reached SQL or " +
      "beyond” — it is the earliest point at which the number means anything.",
    how:
      "Work out what they need, put a demo or a proposal in front of them, and move them to " +
      "Opportunity once it is on the table.",
  },

  "stage.opportunity": {
    term: "Opportunity",
    what: "A live deal. A quote, a demo or a proposal is with them and they are deciding.",
    why:
      "The most expensive stage to let go quiet. Everything it cost to get them here has already " +
      "been spent, and a competitor who picks up the phone will take them.",
    how:
      `Keep a next action on it at all times. ${STALL_DAYS.opportunity} days of silence here ` +
      "deserves more of your morning than a hundred untouched new leads.",
  },

  "stage.customer": {
    term: "Customer",
    what: "They bought. The deal closed and they are an account now.",
    why:
      "The end of the sales lifecycle, not the end of the relationship. The tracker keeps " +
      `watching for silence here on a much longer clock — ${STALL_DAYS.customer} days — because ` +
      "this is account management, not selling.",
    how:
      "Check in periodically. Renewals, consumables and referrals all start with somebody " +
      "remembering to call.",
  },

  "stage.lost": {
    term: "Lost",
    what:
      "Closed without a sale. Lost sits outside the lifecycle rather than after Customer — a " +
      "lost lead has not progressed past anything, it left.",
    why:
      "The stage it reached is kept, so the channel that produced it still gets credit for how " +
      "far it got. A lead that qualified and then died says something good about the channel and " +
      "something bad about the follow-up, and only keeping both facts can tell you which.",
    how:
      "Always record a reason. The reason is the only thing that turns “we lost forty deals” " +
      "into a list of things to change on Monday.",
  },

  // ---- Scoring -------------------------------------------------------------

  score: {
    term: "Priority score",
    what:
      "0–100, how likely this lead looks to buy. Six signals: a booked appointment (up to +30), " +
      "how far it has got in the lifecycle (+25), the channel's own track record (+15), how much " +
      "of a buyer they look like (+15), how recently anyone touched it (+15), and a penalty of " +
      "up to −20 once it goes quiet.",
    why:
      "Without it, a list of leads gets worked from the top down, which means the order deals get " +
      "attention in is decided by when they happened to arrive rather than by what they are " +
      "worth attending to.",
    how:
      "Use it to choose between two leads, not to decide whether a lead is worth calling at all. " +
      "Every score shows its own workings — if a number looks wrong, the factor list names the " +
      "weight you disagree with.",
  },

  "score.band": {
    term: "Score bands",
    what:
      "Hot is 70 and above, Warm 50–69, Cool 30–49, Cold below 30. The colours are deliberately " +
      "not the blue lifecycle ramp: a band is a temperature, not a position.",
    why:
      "The band is what makes the number usable at a glance. Nobody triages on the difference " +
      "between a 61 and a 64, but everybody can act on the difference between warm and cold.",
    how:
      "Hot is today's call list. Warm is this week. Cool is nurture. Cold needs a new reason to " +
      "call, or an honest close.",
  },

  "score.factor.booking": {
    term: "Appointment booked",
    what:
      "Worth the most of any signal here — up to +30. A booked appointment is the only thing in " +
      "this data where the lead spent something of their own: their time, at a fixed hour, " +
      "agreed in advance.",
    why:
      "Nothing else a visitor does is that costly to fake. A cancellation scores negative rather " +
      "than zero, because it is worse than never having booked — they had intent and something " +
      "killed it.",
  },

  "score.factor.stage": {
    term: "Pipeline progress",
    what:
      "Credit for how far along a person has already judged this lead to be, up to +25. Measured " +
      "on the furthest stage it ever reached.",
    why:
      "A deal that got to SQL and then died keeps the credit for having got there. Stage is the " +
      "one signal in this model that came from a human looking at the lead.",
  },

  "score.factor.source": {
    term: "Channel track record",
    what:
      "How this channel has actually performed in your book — its own share of leads that " +
      "reached SQL or beyond — worth up to +15.",
    why:
      "Not a fixed ranking of LinkedIn over Facebook. If a channel stops producing qualified " +
      "leads for this business, its leads start scoring lower next month without anybody editing " +
      "a table. A channel with fewer than five leads borrows the book's overall rate instead of " +
      "its own, because one lead qualifying out of two is noise wearing the clothes of a signal.",
  },

  "score.factor.fit": {
    term: "Contact quality",
    what:
      "Whether they look like a buyer at all, up to +15: reachable by phone, attached to a named " +
      "organisation, and senior enough to sign for equipment.",
    how:
      "The one factor you can raise by typing. Filling in a job title and a phone number on a " +
      "promising lead is thirty seconds that moves it up the queue.",
  },

  "score.factor.recency": {
    term: "Recent activity",
    what: "Up to +15, decaying to nothing over the sixty days since anyone last touched the lead.",
    why:
      "Attention decays. A conversation three days old is warm; the same conversation eight " +
      "weeks old is archaeology.",
  },

  "score.factor.stall": {
    term: "Going cold",
    what:
      "A penalty of up to −20 once a lead has been silent for longer than its stage tolerates. It " +
      "does not apply when there is a meeting already in the diary.",
    why:
      "The only negative that can hit an otherwise healthy lead, and the reason the score works " +
      "for triage rather than just for ranking — a good deal going quiet has to be able to fall " +
      "far enough that somebody notices.",
  },

  // ---- The work queue ------------------------------------------------------

  "concept.play": {
    term: "Plays",
    what:
      "A play is a named situation with one obvious response. The queue sorts every open lead " +
      "into exactly one of them, ordered by what is most expensive to leave undone.",
    why:
      "A single list ordered by score would be defensible and would not get used, because “call " +
      "this one, it is an 84” does not tell anybody what to say. Ten leads of one kind can be " +
      "worked far faster than ten leads of ten kinds.",
    how:
      "Work top to bottom and trust that what is above matters more than what is below. Each " +
      "lead appears in one play only — counting it twice would inflate every figure here and " +
      "invite the same call to be made twice.",
  },

  "play.overdue": {
    term: "Overdue follow-ups",
    what: "You committed to a next step, wrote the date down, and the date has passed.",
    why:
      "It outranks everything, including hotter leads nobody promised anything to. A promise the " +
      "team made and broke costs credibility on top of the deal.",
    how:
      "Do it now, or move the date and say why. Leaving it silently overdue is the only option " +
      "here that costs something.",
  },

  "play.hot-untouched": {
    term: "Hot and never contacted",
    what: "Leads scoring 70 or above that nobody has ever spoken to.",
    why:
      "The cheapest revenue in the book. Everything that made these leads expensive has already " +
      "been paid for, and they are asking to be sold to.",
    how: "Call today. This play should be empty most mornings.",
  },

  "play.post-demo": {
    term: "Demo given, deal not moved",
    what: "They attended a meeting or a demo and the stage never changed afterwards.",
    why:
      "The business has already spent its most expensive resource — an hour of somebody's time — " +
      "and is on course to get nothing for it.",
    how:
      "Move them to SQL with what you learned, or mark them lost with a reason. Either is a fine " +
      "answer; leaving them sitting at Lead is not.",
  },

  "play.rescue": {
    term: "Cancelled and not rebooked",
    what: "They booked an appointment, cancelled it, and nobody has been back to them since.",
    why:
      "They wanted the meeting once. A cancellation is far more often a diary problem than a " +
      "decision, and nobody has tested which this was.",
    how: "Ring to rebook, and offer two specific times rather than asking when suits.",
  },

  "play.aging": {
    term: "Stuck at the front door",
    what: "Leads that have sat at Lead for over a month without ever being qualified or closed.",
    why:
      "These are what quietly inflate a pipeline. They count towards every total on the page and " +
      "represent no decision anybody has made.",
    how: "Qualify or close. An unqualified lead this old is not pipeline.",
  },

  "play.going-cold": {
    term: "Going cold",
    what:
      "Open deals that have been silent for longer than the stage they are sitting at tolerates: " +
      `${STALL_DAYS.lead} days at Lead, ${STALL_DAYS.mql} at MQL, ${STALL_DAYS.sql} at SQL, ` +
      `${STALL_DAYS.opportunity} at Opportunity.`,
    why:
      "The limit tightens further down the funnel because the cost of silence rises with it. A " +
      "new lead nobody called in a week is a queue that got busy; an Opportunity nobody called in " +
      "three weeks is a deal going to whoever did call.",
    how:
      "Re-engage with something new — a price, a case, an availability — rather than “just " +
      "checking in”. Or set a next action so it stops drifting.",
  },

  "play.nurture": {
    term: "Nurture",
    what: "Everything else still in play. Nothing is due on these today.",
    why:
      "They are listed so the queue accounts for the whole book, and you can see at a glance that " +
      "nothing is hiding outside it.",
    how: "No action needed. Keep them warm.",
  },

  // ---- Headline numbers ----------------------------------------------------

  "kpi.total": {
    term: "Total leads",
    what: "Every lead the current filters let through, at any stage, open or closed.",
  },

  "kpi.topSource": {
    term: "Top source",
    what: "The channel that produced the most leads in this view.",
    why:
      "Volume only. It says nothing about whether those leads were any good — a channel can lead " +
      "this tile and still qualify almost nobody.",
    how: "Read it next to Source quality, which is the chart that says whether the volume paid.",
  },

  "kpi.social": {
    term: "From social",
    what:
      "The share of leads that came from social channels — LinkedIn, Facebook, Instagram, " +
      "YouTube, X, Threads — rather than from owned web properties, meaning the site's enquiry " +
      "form and its chatbot.",
    why:
      "It is the one number that answers “is the social effort actually producing anything”, " +
      "which is otherwise spread across six separate source rows.",
    how: "Click the tile to filter the whole tracker to social leads, and again to clear it.",
  },

  "kpi.qualified": {
    term: "Reached SQL+",
    what:
      "The share of all leads that a human ever qualified — that reached SQL, Opportunity or " +
      "Customer — however they ended up afterwards.",
    why:
      "Counted on the furthest stage reached, so deals that qualified and then died still count " +
      "here. That is deliberate: this measures the quality of the leads arriving, not the team's " +
      "ability to close them.",
  },

  "kpi.customers": {
    term: "Customers",
    what: "Leads that bought, and the share of the whole book they represent.",
  },

  "kpi.lost": {
    term: "Lost",
    what: "Leads closed without a sale, and the share of the book they represent.",
    why:
      "A high loss rate is not automatically bad — closing dead leads honestly is what keeps the " +
      "rest of this dashboard true. What matters is which reasons dominate.",
    how: "Click to filter to them, then read the loss reason chart to see what is killing deals.",
  },

  "kpi.open": {
    term: "Still open",
    what: "Leads that are neither customers nor lost — everything still in play.",
  },

  "kpi.newThisWeek": {
    term: "New this week",
    what: "Leads captured in the last seven days.",
  },

  "kpi.needsAction": {
    term: "Needs action",
    what:
      "Open leads sitting in one of the five plays that represent work somebody is behind on: " +
      "overdue follow-ups, hot and never contacted, demo not followed up, cancelled and not " +
      "rebooked, and going cold. Nurture and front-door leads are not counted.",
    why:
      "This is the number worth driving to zero. The total lead count is not — it goes up when " +
      "marketing does well, and says nothing about whether anything is being worked.",
  },

  "kpi.hot": {
    term: "Hot leads",
    what: "Open leads scoring 70 or above.",
    how:
      "If this is healthy while Needs action is high, the problem is follow-up rather than leads.",
  },

  "kpi.stalled": {
    term: "Going cold",
    what:
      "Open leads that have been silent for longer than their stage allows. The line underneath " +
      "says how many of them had already reached SQL or beyond.",
    why:
      "Twelve raw leads going quiet and twelve qualified deals going quiet are the same number " +
      "and not the same morning. With no deal values recorded, that split is the honest way to " +
      "tell them apart.",
  },

  "kpi.overdue": {
    term: "Overdue",
    what: "Follow-ups the team committed to in writing and then missed.",
    why: "The only figure here that measures a broken promise rather than a slow process.",
  },

  "kpi.untouched": {
    term: "Never contacted",
    what: "Open leads with no logged contact against them at all.",
    why:
      "The difference between a lead that was worked and lost and one that was never tried. Only " +
      "the second is a failure of this team rather than of the market.",
    how:
      "If this is high while the total looks healthy, the bottleneck is capacity rather than lead " +
      "generation — buying more leads will make it worse.",
  },

  "kpi.unowned": {
    term: "Unowned",
    what: "Leads with nobody accountable for them.",
    why: "Work that belongs to everybody gets done by nobody.",
  },

  // ---- The things a person can press --------------------------------------

  "action.contactNow": {
    term: "Contact now",
    what:
      "Opens everything you need to reach this lead: their phone number, their email, and a " +
      "follow-up written for them — their name, what they asked about, and where the " +
      "conversation actually stands.",
    why:
      "The gap between knowing who to call and calling them is a blank message box. That gap is " +
      "where a work queue quietly dies: the rep knows the lead matters, cannot immediately think " +
      "what to say, and moves on to something with less friction in it. The draft removes the " +
      "blank page; it is not meant to be sent as written.",
    how:
      "Copy the parts you need, edit the message, then have the conversation. Nothing is recorded " +
      "until you press Log contact inside the dialog — so opening it to check a number and " +
      "getting no answer leaves the record honest.",
  },

  "action.logContact": {
    term: "Log contact",
    what:
      "Records that somebody on the team actually reached this lead — a call, an email, a " +
      "message — and stamps it with your name and the time.",
    why:
      "This one timestamp drives most of the tracker. Every going-cold figure, the stall penalty " +
      "in the score, the recency factor and the ordering of this whole queue measure from the " +
      "last contact. Until it is logged, the app cannot tell a lead that was worked from one that " +
      "was abandoned — and it will keep putting someone you rang this morning at the top of your " +
      "list.",
    how:
      "It lives inside Contact now, at the end of the dialog. Press it straight after the " +
      "conversation, not at the end of the day. The note is optional, because the timestamp is " +
      "the point — but a line about what was said is what lets a colleague pick the deal up " +
      "without ringing them again to ask.",
  },

  "action.advance": {
    term: "Advance a stage",
    what: "Moves the lead one step along the lifecycle — Lead to MQL, MQL to SQL, and so on.",
    why:
      "The stage is a human judgement, and it is the queue's primary sort key: deals nearest a " +
      "decision surface above raw ones inside every play. A deal parked at the wrong stage gets " +
      "worked in the wrong order.",
    how:
      "Advance when the next stage is genuinely true, never to show progress. If a demo happened " +
      "and nothing came of it, the honest move is Mark lost — not Opportunity.",
  },

  "action.markLost": {
    term: "Mark lost",
    what: "Closes the deal without a sale, and asks you which of seven reasons applies.",
    why:
      "Closing leads is normal and healthy — it is what keeps the pipeline a forecast rather than " +
      "a pile. The reason is the valuable half: it splits forty losses into targeting problems, " +
      "process problems and commercial ones, each of which somebody different can fix.",
    how:
      "Pick the reason that actually applies, including the unflattering one. The lead keeps the " +
      "stage it reached, so the channel still gets credit for qualifying it, and a wrong-timing " +
      "loss can be reopened when the timing changes.",
  },

  "action.reopen": {
    term: "Reopen",
    what: "Puts a closed lead back into play at the stage it had reached when it was lost.",
    why: "Timing and budget losses are not really losses. They are deals with a date on them.",
    how:
      "Reopen when something changed on their side, and set a next action immediately so it does " +
      "not go quiet a second time.",
  },

  "action.nextAction": {
    term: "Next action",
    what: "One sentence saying what happens next, and the date it should have happened by.",
    why:
      "This is the input the Overdue play runs on — the top section of the queue, above " +
      "everything else. A lead with a next action cannot quietly drift; a lead without one " +
      "depends on somebody remembering it.",
    how:
      "Both halves are required: a date with no commitment cannot be acted on, and a commitment " +
      "with no date never becomes overdue. Write what you will do, not what you hope they will " +
      "do. Clear both fields to remove it.",
  },

  // ---- Fields on the lead card --------------------------------------------

  "field.source": {
    term: "Source",
    what:
      "The channel this lead arrived through. Social covers LinkedIn, Facebook, Instagram, " +
      "YouTube, X and Threads; owned web covers the site's enquiry form and its chatbot.",
    why:
      "The primary analysis dimension in this tracker. It is what separates an expensive channel " +
      "from a productive one, and it feeds the score directly through that channel's own record " +
      "of producing qualified leads.",
  },

  "field.captured": {
    term: "Captured",
    what: "When the lead first arrived in the book.",
    why:
      "It is what the front-door play measures against: a lead that has sat unqualified for more " +
      "than a month is a decision nobody has made, however recently it was last touched.",
  },

  "field.title": {
    term: "Job title",
    what: "Who they are inside their organisation.",
    why:
      "Worth the ten seconds. A decision-making title raises the score, and “wrong contact” is one " +
      "of the commonest ways a deal here dies — a good pitch to somebody who cannot sign.",
  },

  "field.interest": {
    term: "Interest",
    what: "What they are actually after, in their own words wherever possible.",
    why:
      "The difference between a call that opens with a question about their situation and one " +
      "that opens with a pitch.",
  },

  "field.notes": {
    term: "Notes",
    what: "Where this deal stands right now. A summary you overwrite, not a log.",
    why:
      "The timeline underneath keeps the history, so you never have to preserve stale text in " +
      "here to preserve the record. Keeping both jobs in one box is what makes notes unreadable.",
  },

  "field.appointments": {
    term: "Appointments",
    what: "Meetings and demos booked with this lead, with their current status.",
    why:
      "A booking is the strongest intent signal the business collects, and the only one where the " +
      "lead spent something of their own to give it.",
    how:
      "Read-only here on purpose — a booking records something agreed with a person, so its " +
      "status is worked on the Appointments page rather than revised from a lead card.",
  },

  "field.timeline": {
    term: "Activity",
    what:
      "Everything that has happened to this lead, newest first — stage moves, logged contact, " +
      "bookings, notes, closures and reopenings.",
    why:
      "Notes say where things stand; this says how they got there. When a deal goes wrong, this is " +
      "what shows whether it was worked and lost or simply dropped.",
  },

  "field.chatCapture": {
    term: "Captured from chatbot",
    what:
      "The question this visitor asked the site's assistant, and which documents it answered from.",
    why:
      "The closest thing in the book to hearing a lead say what they want before anybody has " +
      "spoken to them. Where no documents are cited the assistant could not answer — a gap in the " +
      "knowledge base, and a reason this person may already be disappointed.",
    how: "Open the call with what they asked. They have already told you the agenda.",
  },

  // ---- Cross-cutting ideas -------------------------------------------------

  "concept.qualified": {
    term: "Qualified",
    what:
      "Reached SQL or beyond — somebody on the team spoke to them and confirmed a real need, a " +
      "budget and a decision maker.",
    why:
      "Counted on the furthest stage a lead ever reached, so qualifying a deal that later dies " +
      "still counts. Half the figures on these pages are split by it, because a raw lead going " +
      "quiet and a qualified deal going quiet cost very different amounts.",
  },

  "concept.contactLog": {
    term: "Contact log",
    what:
      "Every recorded interaction across all leads — who was contacted, how, by whom and when. It " +
      "follows the filters above it, so narrowing to a source narrows the log with it.",
    why:
      "A lead card answers “what happened to this deal”. Only this answers “has anybody actually " +
      "been calling”, which is a question about the team rather than about a lead.",
  },

  "concept.insights": {
    term: "What to do about it",
    what:
      "Findings rather than charts. Each one states a claim, shows the numbers behind it and names " +
      "one thing to change — then links to the leads it is about.",
    why:
      "The charts were all correct and none of them said anything on their own. A reader who " +
      "already knew what to look for could find the story; everybody else got accurate pictures " +
      "and no conclusion.",
    how:
      "Findings suppress themselves below the sample sizes where a percentage would be noise, so " +
      "an empty panel means “not enough data to say”, not “nothing is wrong”.",
  },

  "concept.severity": {
    term: "Fix now / Watch / Opportunity / Working",
    what:
      "How urgent a finding is. Fix now costs money today; Watch is a trend worth a second look; " +
      "Opportunity is something going right that is not being pressed; Working is confirmation, so " +
      "you can tell a healthy area from an unexamined one.",
  },

  "concept.needsAttention": {
    term: "Needs attention",
    what:
      "The plays with work outstanding right now, ordered by what is most expensive to leave " +
      "undone. Each row opens the queue filtered to exactly those leads.",
    why:
      "A dashboard that states a problem and cannot show you the rows behind it gets argued with " +
      "rather than acted on.",
  },

  "concept.closestToDecision": {
    term: "Closest to a decision",
    what: "Open leads that have reached SQL or beyond, furthest along first, then highest scoring.",
    why:
      "Ordered by lifecycle position rather than by deal size, because this business records no " +
      "deal values — and an invented figure would decide which accounts get the attention.",
  },

  // ---- Views ---------------------------------------------------------------

  "view.action": {
    term: "Action",
    what:
      "The work board: every lead filed under the stage it is sitting at, one stage on screen at " +
      "a time, with the standing instruction for that stage above it.",
    why:
      "The other three views answer questions about the book. This one hands out the work, which " +
      "is why the page opens on it. Sections are stages rather than problems because stage is " +
      "what decides what you actually say — twenty MQLs all need the same message, where twenty " +
      "leads that have all gone quiet need twenty different ones.",
    how:
      "Pick a stage and work down it. What has gone wrong with each lead is still there, as the " +
      "chip on its row, and the most neglected sort to the top.",
  },

  "concept.boardOrder": {
    term: "Sort",
    what:
      "Orders the section by silence: longest since anyone made contact, or most recently " +
      "contacted first.",
    why:
      "Inside one stage every lead already needs the same thing, so the useful question is not " +
      "which is most valuable — it is who you have left longest.",
    how:
      "Longest silent is the default and the one to work from. Recently contacted is for picking " +
      "up where you stopped yesterday, or for checking what a colleague has already been through.",
  },

  "concept.lostCauses": {
    term: "Lost, by cause",
    what:
      "Closed deals grouped by what killed them, each group carrying the change that would stop " +
      "it happening again and who owns that change.",
    why:
      "A flat list of dead deals is a graveyard nobody opens. The same list split by cause is a " +
      "set of re-approach campaigns waiting on one thing to change — the moment the business " +
      "fixes how it quotes, everything under Price is the warmest list it owns.",
    how:
      "Only write to a group once the thing named in its heading has actually changed. A " +
      "re-approach that cannot say what is different is the conversation that already failed.",
  },

  "view.table": {
    term: "Table",
    what:
      "The whole book as rows, sortable by any column. Every captured value is editable in place — " +
      "click it, type, press Enter.",
    how:
      "Use it for bulk tidying and for finding one specific lead. Use Today to decide who to call.",
  },

  "view.board": {
    term: "Board",
    what:
      "The same leads arranged in columns by stage, so the shape of the pipeline reads at a glance.",
    how: "The quickest way to spot a stage that has silted up.",
  },

  "view.charts": {
    term: "Charts",
    what:
      "The book's shape over time and by channel, with a panel of written findings above it saying " +
      "what the pictures add up to.",
    why: "Read the findings first. The charts are the evidence for them, not a substitute.",
  },

  // ---- Charts --------------------------------------------------------------

  "chart.funnel": {
    term: "Funnel",
    what:
      "How many leads ever reached each stage, and what became of them — still resting there, or " +
      "lost from there.",
    why:
      "Counted on the furthest stage reached, so the bars only ever shrink going down. The step " +
      "with the steepest drop is where the process is failing, not where the leads are worst.",
  },

  "chart.sourceQuality": {
    term: "Source quality",
    what: "What share of each channel's leads ever reached SQL or beyond.",
    why:
      "The companion to source volume, and the more important of the two. A channel can produce " +
      "the most leads in the book and qualify almost none of them, which is a cost rather than a " +
      "win.",
    how:
      "This is the same figure the score uses to weight a lead's channel, so a channel improving " +
      "here quietly raises its leads' priority.",
  },

  "chart.sourceVolume": {
    term: "Source volume",
    what: "How many leads each channel produced.",
    why: "Volume alone. Read it against source quality before concluding anything about spend.",
  },

  "chart.monthly": {
    term: "Leads by month",
    what: "Capture volume over time.",
    how:
      "Look for the shape, not the last bar — the current month is always partial and always looks " +
      "like a collapse.",
  },

  "chart.lossReason": {
    term: "Why deals die",
    what:
      "The recorded reason on every lost lead, ordered from problems that start early — bad " +
      "targeting — through process failures to commercial ones at the end.",
    why:
      "Each reason names who owns the fix. “38% cite price” is a statistic; “38% cite price — " +
      "qualify budget before the demo, not after” is an instruction.",
    how:
      "The bar also shows how many of those leads had already qualified. Losing raw leads is " +
      "cheap; losing qualified ones is the expensive kind.",
  },

  "chart.stageVelocity": {
    term: "Stage velocity",
    what: "How long leads actually sit at each stage before moving on.",
    why:
      "The going-cold limits are starting figures somebody chose. This is the measurement that " +
      "says what they ought to be for this business.",
  },

  "chart.socialSplit": {
    term: "Social vs owned web",
    what: "How the book splits between social channels and the site's own form and chatbot.",
    why:
      "The two groups cost completely different things to run, and are the honest unit for asking " +
      "whether the social effort is producing.",
  },

  "chart.sourceShare": {
    term: "Share by source",
    what: "Each channel's slice of the whole book.",
  },

  "chart.activeLost": {
    term: "Active vs lost",
    what: "How much of the book is still in play against how much has closed without a sale.",
  },

  "chart.stageShare": {
    term: "Share by stage",
    what: "Where the book is sitting right now, by displayed stage.",
    why:
      "A snapshot, unlike the funnel: a lost lead counts under Lost here rather than under the " +
      "stage it died at.",
  },

  "chart.sourceStageMatrix": {
    term: "Source against stage",
    what:
      "Every channel crossed with every stage, so you can see where a given channel's leads stop.",
    how:
      "Read across a row. A channel whose leads all bunch at Lead is producing volume nobody is " +
      "qualifying.",
  },
} as const satisfies Record<string, GlossaryEntry>;

/** Every key the UI can ask for. Namespaced, so a stage and a KPI cannot collide. */
export type GlossaryKey = keyof typeof GLOSSARY;

/**
 * The entry registered under a key, or null.
 *
 * Takes a plain string rather than a `GlossaryKey` because most callers build
 * the key from live data — `stage.${lead.stage}`, `play.${group.key}` — which
 * no amount of typing can check at the call site. Returning null lets a term
 * that has not been written yet render as nothing at all, rather than as a
 * tooltip with `undefined` in it.
 */
export function explain(key: string): GlossaryEntry | null {
  return (GLOSSARY as Record<string, GlossaryEntry>)[key] ?? null;
}
