/**
 * The seed lead book.
 *
 * It has two jobs:
 *
 *   1. `npm run db:seed` writes these rows into the `crm_leads` table, which is
 *      the real database once seeded.
 *   2. `LeadTracker` falls back to them when it is handed no leads — which is
 *      what happens in the Plasmic Studio canvas, where there is no server to
 *      read the database.
 *
 * ---------------------------------------------------------------------------
 * These rows describe DocuJet
 *
 * They used to describe a document-scanning business, transcribed verbatim from
 * the PHP prototype this app grew out of. That made every screen quietly
 * dishonest: an Epson printer dashboard showing clinics digitising patient
 * records, with deal values and channel quality computed off interests that had
 * nothing to do with anything the company sells. Rewritten here for the actual
 * business — A3 colour multifunction printers, Malaysian enterprise buyers, the
 * three WorkForce Enterprise models — so that every derived number is checkable
 * against something real.
 *
 * `interest` names a model wherever the lead named one, because that is the
 * single most useful thing a rep knows before picking up the phone. Several
 * rows name none, on purpose — that is what an early enquiry looks like.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * The book is arranged to exercise the whole dashboard
 *
 * Every play in `queue.ts` has members, every loss reason appears, and both the
 * stalled and the healthy cases are present — because a seed book that only
 * contains happy rows makes a broken queue look like an empty one. Specifically:
 *
 *   - overdue        L-1042, L-1053, L-1065  (next action in the past)
 *   - hot-untouched  L-1050, L-1074          (booked, never contacted)
 *   - post-demo      L-1059, L-1067          (demo completed, still at MQL)
 *   - rescue         L-1035, L-1080          (cancelled, nothing rebooked)
 *   - going-cold     L-1049, L-1055, L-1064  (silent past the stage limit)
 *   - aging          L-1078, L-1083, L-1086  (a month at Lead)
 *   - nurture        the recently touched remainder
 *
 * `lost: true` closes a lead. Its `stage` stays at the furthest point it
 * reached, so the funnel can show where deals actually die — the losses below
 * are spread across Lead, SQL and Opportunity on purpose, because a channel
 * that loses at Lead and one that loses at Opportunity are not the same
 * problem, and a single "Lost" bucket cannot tell them apart.
 *
 * Two losses carry no `lostReason`, standing in for deals closed before the
 * column existed. That is what makes the "not recorded" row on the loss chart —
 * and the data-quality finding that goes with it — visible in the seed book
 * rather than only in production.
 * ---------------------------------------------------------------------------
 *
 * `chatTopic` / `cited` are set only for chatbot-sourced leads — the question
 * that triggered capture and the knowledge-base entries that answered it. The
 * ids are real: `EPSON-0xx` rows in `data/epson workforce rag.csv`. A captured
 * lead with an empty `cited` asked something the corpus could not answer and
 * gave their details anyway.
 */

import type { Lead, LeadAppointment, LostReason, OpenStageKey, SourceKey } from "./types";

/** The date the tracker treats as "today", so the sample numbers stay stable. */
export const SAMPLE_TODAY = "2026-07-31";

type LeadExtras = {
  company?: string;
  chatTopic?: string;
  cited?: string[];
  notes?: string;
  lost?: boolean;
  /** Y-m-d. Turned into a timestamp below — the column is a real one. */
  contacted?: string;
  next?: string;
  nextAt?: string;
  reason?: LostReason;
  /** Y-m-d the stage last moved. Defaults to the creation date. */
  moved?: string;
};

/** Builds one lead record. */
function lead(
  id: string,
  name: string,
  title: string,
  email: string,
  phone: string,
  source: SourceKey,
  stage: OpenStageKey,
  createdAt: string,
  interest: string,
  extras: LeadExtras = {},
): Lead {
  return {
    id,
    name,
    title,
    company: extras.company ?? "",
    email,
    phone,
    source,
    stage,
    createdAt,
    interest,
    chatTopic: extras.chatTopic ?? null,
    // Midday UTC rather than midnight, so that slicing back to Y-m-d cannot
    // land on the previous day in any timezone the admin might be read from.
    lastContactAt: extras.contacted ? `${extras.contacted}T12:00:00.000Z` : null,
    cited: extras.cited ?? [],
    notes: extras.notes ?? "",
    lost: extras.lost ?? false,
    // Seeded rows name no real staff member: `owner_id` is a foreign key into
    // `user_profiles`, and inventing uuids here would fail the constraint. The
    // seed script assigns owners from whoever actually exists.
    ownerId: null,
    nextAction: extras.next ?? "",
    nextActionAt: extras.nextAt ?? null,
    lostReason: extras.reason ?? null,
    stageChangedAt: `${extras.moved ?? createdAt}T12:00:00.000Z`,
  };
}

export const SAMPLE_LEADS: Lead[] = [
  // ---- LinkedIn ---------------------------------------------------------
  // The best channel in the book: enterprise buyers who name a model.
  lead("L-1042", "Nurul Aina Rahman", "Head of Operations", "aina.rahman@aspirasicap.example", "+60 12-334 8871", "linkedin", "opportunity", "2026-05-14", "WF-C21000 fleet for 4 branch offices", { company: "Aspirasi Capital Bhd", notes: "Budget confirmed. Procurement reviewing the service agreement.", contacted: "2026-07-24", next: "Send the revised 4-unit quote with the service SLA", nextAt: "2026-07-29", moved: "2026-07-02" }),
  lead("L-1057", "Siti Noraini Abdullah", "Head of Compliance", "s.noraini@amanahtrust.example", "+60 19-663 1102", "linkedin", "opportunity", "2026-06-12", "WF-C20750 with PIN release printing for regulated documents", { company: "Amanah Trust Management", notes: "Security features decide this, not price. Walked through IP filtering and panel admin mode.", contacted: "2026-07-28", next: "Compliance sign-off call", nextAt: "2026-08-05", moved: "2026-07-15" }),
  lead("L-1030", "Lim Chee Seng", "Chief Operating Officer", "cs.lim@titiwangsains.example", "+60 12-220 4417", "linkedin", "customer", "2026-03-11", "WF-C21000 x3 for claims processing centre", { company: "Titiwangsa Insurance", notes: "Signed 18 Jul. Reference-able once the third unit is installed.", contacted: "2026-07-18", moved: "2026-07-18" }),
  lead("L-1033", "Yusrina Binti Latif", "Branch Operations Head", "yusrina@kopwawasan.example", "+60 13-667 8890", "linkedin", "customer", "2026-04-02", "WF-C20600 for member application processing", { company: "Koperasi Wawasan", notes: "Live since June. Running cost came in under the laser fleet it replaced.", contacted: "2026-07-09", moved: "2026-06-20" }),
  lead("L-1064", "Norhayati Binti Salleh", "Assistant Director", "norhayati@mpampang.example", "+60 13-229 5561", "linkedin", "sql", "2026-05-16", "WF-C20750 units for municipal service counters", { company: "Majlis Perbandaran Ampang", notes: "Open tender. No contact since the site survey — chase before the submission window closes.", contacted: "2026-06-28", moved: "2026-06-05" }),
  lead("L-1049", "Wong Li Fen", "Company Secretary", "lifen.wong@harmonics.example", "+60 12-118 6654", "linkedin", "sql", "2026-06-21", "WF-C20600 for statutory filing volumes", { company: "Harmonics Corporate Services", notes: "Files for 200+ client companies. High duty cycle is the whole pitch.", contacted: "2026-07-01", moved: "2026-07-01" }),
  lead("L-1055", "Ahmad Zulkifli bin Hassan", "General Manager", "zulkifli@bumihijau.example", "+60 19-445 2210", "linkedin", "sql", "2026-04-22", "WF-C21000 for plantation admin centre, high monthly volume", { company: "Bumi Hijau Plantations", notes: "Quoted in May. Gone quiet since — three months at SQL with no movement.", contacted: "2026-05-30", moved: "2026-05-12" }),
  lead("L-1074", "Rahim bin Osman", "Group CIO", "rahim.osman@nusantarahold.example", "+60 12-330 7745", "linkedin", "mql", "2026-07-18", "Group print strategy across 5 subsidiaries, WF-C21000 standard", { company: "Nusantara Holdings", notes: "Booked a consultation off the Heat-Free comparison post. Nobody has called yet.", moved: "2026-07-22" }),
  lead("L-1066", "Fatimah Zahra Osman", "Registrar", "registrar@uniselangor.example", "+60 13-441 0092", "linkedin", "mql", "2026-06-28", "WF-C20750 for registry and transcript printing", { company: "Universiti Selangor", notes: "Grant-funded. Decision before the October intake.", contacted: "2026-07-26", moved: "2026-07-10" }),
  lead("L-1078", "Chandran Muthusamy", "Head of Shared Services", "chandran.m@prismaenergy.example", "+60 16-771 2204", "linkedin", "lead", "2026-06-24", "Comparing multifunction vendors", { company: "Prisma Energy", notes: "Downloaded the total-cost-of-ownership guide and went quiet.", moved: "2026-06-24" }),
  lead("L-1081", "Serena Yap Hui Ling", "Finance Manager", "serena.yap@meridianlog.example", "+60 12-887 4432", "linkedin", "lead", "2026-07-30", "Running cost enquiry for a laser replacement", { company: "Meridian Logistics", notes: "Commented on the energy consumption post.", contacted: "2026-07-30" }),

  // ---- Facebook ---------------------------------------------------------
  // Volume without qualification — the channel the insight panel flags.
  lead("L-1035", "Zaiton Binti Ibrahim", "Admin Manager", "zaiton@klinikpermata.example", "+60 13-556 7781", "facebook", "opportunity", "2026-04-18", "WF-C20600 for 3 clinic front desks", { company: "Klinik Permata Group", notes: "Cancelled the pricing call and never rebooked. Still open, still winnable.", contacted: "2026-06-14", moved: "2026-06-02" }),
  lead("L-1047", "Tan Boon Keat", "Managing Director", "bk.tan@keatseng.example", "+60 12-771 3388", "facebook", "sql", "2026-06-03", "WF-C20600 for print room replacement", { company: "Keat Seng Trading", notes: "Bought a refurbished laser MFP for a third of the price. Never engaged with running cost.", lost: true, reason: "price", contacted: "2026-07-02", moved: "2026-06-20" }),
  lead("L-1052", "Hasnah Binti Mokhtar", "Office Manager", "hasnah@sridamai.example", "+60 19-224 5590", "facebook", "mql", "2026-06-27", "WF-C20600 for a single office", { company: "Sri Damai Properties", notes: "Attended the Facebook Live session on Heat-Free.", contacted: "2026-07-27", moved: "2026-07-14" }),
  lead("L-1067", "Gopal Krishnan", "Operations Executive", "gopal.k@cahayadist.example", "+60 17-338 9921", "facebook", "mql", "2026-05-19", "WF-C20750 for delivery documentation printing", { company: "Cahaya Distribution", notes: "Demo went well in June. Stage has not moved since.", contacted: "2026-06-26", moved: "2026-06-05" }),
  lead("L-1075", "Rosnah Binti Yaakob", "Practice Manager", "rosnah@kliniksihat.example", "+60 11-5567 8834", "facebook", "lead", "2026-07-05", "Small clinic, one desktop printer", { company: "Klinik Sihat", notes: "A3 enterprise MFP is far past what a single clinic needs. Referred to the consumer range.", lost: true, reason: "not_a_fit", contacted: "2026-07-08", moved: "2026-07-08" }),
  lead("L-1079", "Mohd Rizal bin Aziz", "Owner", "rizal@rizalauto.example", "+60 12-664 3319", "facebook", "lead", "2026-06-10", "General printer enquiry", { company: "Rizal Auto Services", notes: "Four follow-ups over seven weeks, no reply.", lost: true, reason: "no_response", contacted: "2026-07-15", moved: "2026-06-10" }),
  lead("L-1083", "Kamala Devi", "Administrator", "kamala@tamanria.example", "+60 13-882 1147", "facebook", "lead", "2026-06-20", "Enrolment form printing", { company: "Tadika Taman Ria", notes: "Very small volume. Nothing has happened in six weeks.", moved: "2026-06-20" }),

  // ---- Instagram --------------------------------------------------------
  // The clearest volume-without-value case: six leads, one ever qualified.
  lead("L-1054", "Elaine Cheah Su Ann", "Marketing Manager", "elaine.cheah@vistaretail.example", "+60 16-447 2213", "instagram", "sql", "2026-06-30", "WF-C20750 for in-house marketing collateral", { company: "Vista Retail Group", notes: "Wants the 1.2m long-paper capability for point-of-sale banners.", contacted: "2026-07-25", moved: "2026-07-19" }),
  lead("L-1062", "Amirah Binti Roslan", "Brand Executive", "amirah@nadiwellness.example", "+60 12-995 3320", "instagram", "mql", "2026-06-05", "Client intake form printing", { company: "Nadi Wellness", notes: "Downloaded the spec sheet. No model named.", contacted: "2026-07-21", moved: "2026-06-30" }),
  lead("L-1076", "Jocelyn Tan Wei Ning", "Founder", "jocelyn@studiokirana.example", "+60 17-556 8890", "instagram", "lead", "2026-07-26", "Curious about the printer range", { company: "Studio Kirana", notes: "Story reply. No stated project.", contacted: "2026-07-26" }),
  lead("L-1080", "Danish Haikal bin Roslan", "Operations Assistant", "danish@kopirumah.example", "+60 11-2287 4471", "instagram", "lead", "2026-06-18", "Supplier invoice printing", { company: "Kopi Rumah Group", notes: "Cancelled the consultation the day before. No replacement booked.", contacted: "2026-07-04", moved: "2026-06-18" }),
  lead("L-1082", "Nadia Sofea", "Marketing Assistant", "nadia@bloomflorist.example", "+60 19-773 2218", "instagram", "lead", "2026-07-30", "General enquiry", { company: "Bloom Florist", notes: "Followed after a carousel post.", contacted: "2026-07-30" }),
  lead("L-1084", "Farah Nabila", "Admin Assistant", "farah@ceriaevents.example", "+60 12-448 9931", "instagram", "lead", "2026-07-31", "Printing question, no volume given", { company: "Ceria Events", notes: "Intent unclear.", contacted: "2026-07-31" }),

  // ---- YouTube ----------------------------------------------------------
  // Low volume, high intent — people who watched a demo before enquiring.
  lead("L-1046", "Michael Teoh Wei Jie", "Head of Shared Services", "m.teoh@perdanahg.example", "+60 16-990 3345", "youtube", "customer", "2026-05-30", "WF-C21000 x2 for back-office print rooms, 9 hotels", { company: "Perdana Hospitality Group", notes: "Found us through the Heat-Free walkthrough video. Uptime was the deciding factor.", contacted: "2026-07-16", moved: "2026-07-16" }),
  lead("L-1053", "Arun Devarajan", "Regional IT Director", "arun.d@straitsfreight.example", "+60 17-224 9987", "youtube", "sql", "2026-04-14", "WF-C21000 for customs documentation, 24/7 operation", { company: "Straits Freight Forwarding", notes: "Watched the full demo before enquiring. Wants Epson Device Admin across sites.", contacted: "2026-07-22", next: "Send the Device Admin integration brief", nextAt: "2026-07-27", moved: "2026-06-30" }),
  lead("L-1059", "Lee Kar Wai", "IT Manager", "kw.lee@sinaranmfg.example", "+60 12-445 7723", "youtube", "mql", "2026-05-21", "WF-C20750 for production floor document control", { company: "Sinaran Manufacturing", notes: "Demo completed in June. Asked about LDAP integration and then nothing moved.", contacted: "2026-06-22", moved: "2026-06-08" }),
  lead("L-1070", "Vijaya Letchumi", "Records Officer", "vijaya@damaiutama.example", "+60 13-229 8876", "youtube", "mql", "2026-06-11", "WF-C20600 for a records department", { company: "Hospital Damai Utama", notes: "Subscribed and watched three videos before enquiring.", contacted: "2026-07-23", moved: "2026-07-02" }),
  lead("L-1077", "Syafiq bin Zainuddin", "IT Executive", "syafiq@alamsekitar.example", "+60 11-3345 8821", "youtube", "lead", "2026-07-27", "Evaluating a laser replacement", { company: "Alam Sekitar Consulting", notes: "No budget confirmed yet.", contacted: "2026-07-27" }),

  // ---- X ----------------------------------------------------------------
  lead("L-1050", "Faridah Binti Kamal", "Chief Digital Officer", "faridah.k@selasihbank.example", "+60 12-990 4417", "x", "opportunity", "2026-07-20", "WF-C21000 branch pilot, 6 units if successful", { company: "Selasih Bank", notes: "Booked a pricing discussion off a thread about print security. Nobody has called yet.", moved: "2026-07-24" }),
  lead("L-1065", "Ravi Sandran", "Head of IT", "ravi.s@teguhcon.example", "+60 16-337 2290", "x", "mql", "2026-06-02", "WF-C20750 for site documentation printing", { company: "Teguh Construction", notes: "Technical buyer. Engaged with the network protocol thread.", contacted: "2026-07-19", next: "Confirm dual-network support in writing", nextAt: "2026-07-25", moved: "2026-06-28" }),
  lead("L-1072", "Aaron Lim Jia Hao", "Software Engineer", "aaron.lim@fintechnusa.example", "+60 17-882 5546", "x", "lead", "2026-07-23", "Integration and API questions", { company: "Fintech Nusantara", notes: "Developer curiosity. No purchasing role and no budget.", lost: true, reason: "wrong_contact", contacted: "2026-07-24", moved: "2026-07-24" }),
  lead("L-1085", "Tengku Adlan", "Analyst", "adlan@perdanaresearch.example", "+60 12-556 9903", "x", "lead", "2026-07-31", "Market research enquiry", { company: "Perdana Research", notes: "Competitor research, not a prospect.", lost: true, reason: "not_a_fit", contacted: "2026-07-31", moved: "2026-07-31" }),

  // ---- Threads ----------------------------------------------------------
  lead("L-1073", "Izzati Binti Hamzah", "Executive Assistant", "izzati@menaraprima.example", "+60 19-882 6641", "threads", "lead", "2026-06-14", "Office printer refresh", { company: "Menara Prima Management", notes: "Replied to a thread on paperless offices. Nothing since.", moved: "2026-06-14" }),
  lead("L-1086", "Hafiz Nordin", "Coordinator", "hafiz@sukanselangor.example", "+60 13-447 2218", "threads", "lead", "2026-06-25", "Membership card and form printing", { company: "Majlis Sukan Selangor", notes: "Early-stage curiosity, no follow-up scheduled.", moved: "2026-06-25" }),

  // ---- Website chatbot --------------------------------------------------
  // Every one of these has a `chatTopic` and a `cited` list, because that is
  // what `capture_chat_lead` writes. L-1071 cites nothing: the assistant could
  // not answer, and they gave their details anyway — the strongest signal on
  // this page, and a knowledge-base gap at the same time.
  lead("L-1043", "Tan Mei Ling", "Facilities Director", "meiling.tan@bandarrayaprop.example", "+60 12-445 9982", "chatbot", "opportunity", "2026-05-08", "WF-C21000 for a 22-floor commercial tower", { company: "Bandaraya Properties", notes: "Asked about running cost first, price second. Textbook Heat-Free buyer.", chatTopic: "How much less power does the WF-C21000 use than our laser fleet?", cited: ["EPSON-042", "EPSON-011", "EPSON-047"], contacted: "2026-07-29", next: "Present the 5-year running cost comparison", nextAt: "2026-08-07", moved: "2026-07-11" }),
  lead("L-1058", "Ng Wei Sheng", "IT Operations Manager", "ws.ng@antaramedia.example", "+60 16-228 3341", "chatbot", "sql", "2026-06-17", "WF-C20750 with high capacity tray", { company: "Antara Media", notes: "Came in through the chat panel asking about tray capacity for unattended runs.", chatTopic: "What is the optional High Capacity Tray and how much does it hold?", cited: ["EPSON-060", "EPSON-040"], contacted: "2026-07-26", moved: "2026-07-08" }),
  lead("L-1061", "Priya Nair", "Procurement Lead", "priya.nair@setiahealthcare.example", "+60 19-337 4478", "chatbot", "sql", "2026-06-09", "WF-C20600 for clinic administration, 4 sites", { company: "Setia Healthcare", notes: "Wanted warranty terms before anything else. Procurement-led process.", chatTopic: "What warranty comes with the WorkForce Enterprise range?", cited: ["EPSON-107", "EPSON-096"], contacted: "2026-07-20", moved: "2026-06-29" }),
  lead("L-1068", "Azman bin Yusof", "Head of Administration", "azman@koperasiguru.example", "+60 13-558 2214", "chatbot", "mql", "2026-07-02", "WF-C20600 for member services counter", { company: "Koperasi Guru Malaysia", notes: "Asked about scanning as well as printing.", chatTopic: "Where can the WorkForce Enterprise scan to?", cited: ["EPSON-071", "EPSON-070", "EPSON-072"], contacted: "2026-07-28", moved: "2026-07-17" }),
  lead("L-1071", "Sharifah Aliyah", "Group Finance Director", "sharifah@intanberhad.example", "+60 12-663 7719", "chatbot", "mql", "2026-07-14", "WF-C21000, asking about lease financing", { company: "Intan Berhad", notes: "The assistant had nothing on leasing or financing and she left her details anyway. Highest-intent lead of the week and the corpus could not serve her.", chatTopic: "Do you offer leasing or monthly payment plans on the WF-C21000?", cited: [], contacted: "2026-07-25", moved: "2026-07-21" }),
  lead("L-1087", "Kelvin Ooi Chin Hock", "Office Manager", "kelvin.ooi@sentosalegal.example", "+60 17-449 3320", "chatbot", "lead", "2026-07-29", "WF-C20600 for a legal practice", { company: "Sentosa Legal", notes: "Asked about duplex speed for double-sided bundles.", chatTopic: "Does duplex printing slow the WorkForce Enterprise down?", cited: ["EPSON-022", "EPSON-030"], contacted: "2026-07-29" }),
  lead("L-1088", "Rashid bin Talib", "Operations Manager", "rashid@utaraagro.example", "+60 11-4478 2295", "chatbot", "lead", "2026-07-31", "Printer for a regional office", { company: "Utara Agro", notes: "Asked about ink yield. Early, but specific.", chatTopic: "How many pages does an ink cartridge print?", cited: ["EPSON-032", "EPSON-031"], contacted: "2026-07-31" }),

  // ---- Website form -----------------------------------------------------
  // The only source that creates leads in production today, and the one whose
  // leads all arrive with a booked appointment attached.
  lead("L-1044", "Hema Ramachandran", "General Manager", "hema.r@wilayahprint.example", "+60 12-889 4471", "form", "opportunity", "2026-05-22", "WF-C21000 x2 for a commercial print bureau", { company: "Wilayah Print Services", notes: "Wants throughput figures verified against their own job mix.", contacted: "2026-07-27", next: "Arrange a sample print run with their files", nextAt: "2026-08-04", moved: "2026-07-13" }),
  lead("L-1048", "Steven Chong Kah Meng", "Director", "steven.chong@lembahauto.example", "+60 16-337 9982", "form", "customer", "2026-04-09", "WF-C20750 for a dealership group", { company: "Lembah Auto Group", notes: "Installed across three showrooms in July.", contacted: "2026-07-11", moved: "2026-07-11" }),
  lead("L-1060", "Nur Alia Binti Kamarudin", "Admin Head", "alia@perdanaschool.example", "+60 19-882 3345", "form", "sql", "2026-06-20", "WF-C20750 for a school administration block", { company: "Perdana International School", notes: "Board approval needed. Term-time decision cycle.", contacted: "2026-07-24", moved: "2026-07-09" }),
  lead("L-1063", "Daniel Foo Zhi Wei", "Operations Manager", "daniel.foo@kilangjaya.example", "+60 12-227 5568", "form", "sql", "2026-05-27", "WF-C20600 for a factory admin office", { company: "Kilang Jaya Industries", notes: "Quoted. Waiting on their capex cycle in Q4.", lost: true, reason: "timing", contacted: "2026-07-10", moved: "2026-06-18" }),
  lead("L-1069", "Melissa Wong Xin Yi", "HR Manager", "melissa.wong@grandmutiara.example", "+60 17-556 2213", "form", "mql", "2026-07-08", "WF-C20600 for an HR document room", { company: "Grand Mutiara Hotel", notes: "Booked a product consultation through the site.", contacted: "2026-07-29", moved: "2026-07-21" }),
  lead("L-1051", "Ibrahim bin Osman", "Facilities Manager", "ibrahim@menarasyariah.example", "+60 13-227 8890", "form", "opportunity", "2026-04-30", "WF-C20750 x2 for a corporate tower", { company: "Menara Syariah", notes: "Was at contract stage. Their landlord renewed a managed print contract instead.", lost: true, reason: "competitor", contacted: "2026-07-05", moved: "2026-06-16" }),
  lead("L-1056", "Low Yee Ling", "Finance Controller", "yeeling.low@pantaimart.example", "+60 12-448 3327", "form", "sql", "2026-05-09", "WF-C20600 for retail head office", { company: "Pantai Mart", notes: "Capex was pulled in the mid-year review.", lost: true, reason: "budget_cut", contacted: "2026-06-30", moved: "2026-06-11" }),
  // Two closed without a reason — deals shut before the field existed. This is
  // what the "not recorded" row and the data-quality finding are built from.
  lead("L-1045", "Cheryl Ong Sze Min", "Office Administrator", "cheryl.ong@bayubuild.example", "+60 16-889 4432", "form", "mql", "2026-04-25", "WF-C20600 enquiry", { company: "Bayu Build", notes: "Closed before the loss reason field existed.", lost: true, moved: "2026-05-14" }),
  lead("L-1089", "Zulkarnain bin Idris", "Manager", "zul@kedaiharian.example", "+60 11-2245 7783", "form", "lead", "2026-05-03", "Printer enquiry, no detail given", { company: "Kedai Harian Enterprise", notes: "Closed before the loss reason field existed.", lost: true, moved: "2026-05-20" }),
  lead("L-1090", "Grace Lau Mei Fong", "Executive Assistant", "grace.lau@axisadvisory.example", "+60 19-556 8821", "form", "lead", "2026-07-31", "WF-C20600 enquiry for a small advisory office", { company: "Axis Advisory", notes: "Booked a consultation on arrival.", contacted: "2026-07-31" }),
];

/**
 * The bookings behind those leads.
 *
 * Deliberately shaped so the appointment-driven plays have something to find:
 * upcoming confirmed bookings on the untouched leads (which is what makes them
 * score hot), completed demos on leads whose stage never moved afterwards, and
 * cancellations with nothing booked in their place.
 */
export const SAMPLE_APPOINTMENTS: LeadAppointment[] = [
  // Upcoming — high intent, and on L-1050 and L-1074 nobody has called yet.
  { id: "sample-apt-1", leadId: "L-1042", product: "WF-C21000 fleet for 4 branch offices", type: "Pricing Discussion", date: "2026-08-04", time: "10:00", status: "Confirmed" },
  { id: "sample-apt-2", leadId: "L-1050", product: "WF-C21000 branch pilot, 6 units if successful", type: "Pricing Discussion", date: "2026-08-06", time: "15:00", status: "Confirmed" },
  { id: "sample-apt-3", leadId: "L-1074", product: "Group print strategy across 5 subsidiaries", type: "Product Consultation", date: "2026-08-05", time: "11:15", status: "Confirmed" },
  { id: "sample-apt-4", leadId: "L-1044", product: "WF-C21000 x2 for a commercial print bureau", type: "Product Demonstration", date: "2026-08-11", time: "09:30", status: "Pending" },
  { id: "sample-apt-5", leadId: "L-1069", product: "WF-C20600 for an HR document room", type: "Product Consultation", date: "2026-08-07", time: "14:00", status: "Pending" },
  { id: "sample-apt-6", leadId: "L-1090", product: "WF-C20600 enquiry for a small advisory office", type: "Product Consultation", date: "2026-08-12", time: "16:00", status: "Pending" },

  // Completed — the hour is already spent. On L-1059 and L-1067 the stage
  // never moved afterwards, which is the whole point of the post-demo play.
  { id: "sample-apt-7", leadId: "L-1059", product: "WF-C20750 for production floor document control", type: "Product Demonstration", date: "2026-06-19", time: "14:30", status: "Completed" },
  { id: "sample-apt-8", leadId: "L-1067", product: "WF-C20750 for delivery documentation printing", type: "Product Demonstration", date: "2026-06-24", time: "10:30", status: "Completed" },
  { id: "sample-apt-9", leadId: "L-1030", product: "WF-C21000 x3 for claims processing centre", type: "Pricing Discussion", date: "2026-07-02", time: "11:00", status: "Completed" },
  { id: "sample-apt-10", leadId: "L-1046", product: "WF-C21000 x2 for back-office print rooms", type: "Technical Consultation", date: "2026-07-08", time: "09:00", status: "Completed" },
  { id: "sample-apt-11", leadId: "L-1053", product: "WF-C21000 for customs documentation", type: "Product Demonstration", date: "2026-07-15", time: "13:00", status: "Completed" },
  { id: "sample-apt-12", leadId: "L-1043", product: "WF-C21000 for a 22-floor commercial tower", type: "Technical Consultation", date: "2026-07-21", time: "10:00", status: "Completed" },

  // Cancelled with nothing booked in their place — the rescue play.
  { id: "sample-apt-13", leadId: "L-1035", product: "WF-C20600 for 3 clinic front desks", type: "Pricing Discussion", date: "2026-06-16", time: "15:30", status: "Cancelled" },
  { id: "sample-apt-14", leadId: "L-1080", product: "Supplier invoice printing", type: "Product Consultation", date: "2026-07-06", time: "11:30", status: "Cancelled" },

  // After-sales on a live customer — not a sales signal, and the queue is
  // right to leave it alone.
  { id: "sample-apt-15", leadId: "L-1048", product: "WF-C20750 for a dealership group", type: "After-Sales Support", date: "2026-08-19", time: "10:00", status: "Confirmed" },
];
