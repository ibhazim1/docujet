/**
 * The seed lead book.
 *
 * A verbatim transcription of `leads()` in `crm/lib/data.php`. It has two jobs:
 *
 *   1. `npm run db:seed` writes these rows into the `crm_leads` table, which is
 *      the real database once seeded.
 *   2. `LeadTracker` falls back to them when it is handed no leads — which is
 *      what happens in the Plasmic Studio canvas, where there is no server to
 *      read the database.
 *
 * `chatTopic` / `cited` are set only for chatbot-sourced leads — the question
 * that triggered capture and the knowledge-base entries that answered it.
 *
 * `lost: true` closes a lead. Its `stage` stays at the furthest point it
 * reached, so the funnel can show where deals actually die — the losses below
 * are spread across Lead, SQL and Opportunity on purpose, because a channel
 * that loses at Lead and one that loses at Opportunity are not the same
 * problem, and a single "Lost" bucket cannot tell them apart.
 */

import type { Lead, OpenStageKey, SourceKey } from "./types";

/** The date the PHP prototype treats as "today", so its sample numbers stay stable. */
export const SAMPLE_TODAY = "2026-07-31";

type LeadExtras = {
  chatTopic?: string;
  cited?: string[];
  notes?: string;
  lost?: boolean;
};

/** Builds one lead record. Mirrors the named-argument factory in `data.php`. */
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
    email,
    phone,
    source,
    stage,
    createdAt,
    interest,
    chatTopic: extras.chatTopic ?? null,
    cited: extras.cited ?? [],
    notes: extras.notes ?? "",
    lost: extras.lost ?? false,
  };
}

export const SAMPLE_LEADS: Lead[] = [
  // ---- LinkedIn ---------------------------------------------------------
  lead("L-1042", "Nurul Aina Rahman", "Head of Operations", "aina.rahman@aspirasicap.example", "+60 12-334 8871", "linkedin", "opportunity", "2026-05-14", "Document management rollout across 4 branches", { notes: "Budget confirmed. Legal reviewing the MSA." }),
  lead("L-1057", "Siti Noraini Abdullah", "Head of Compliance", "s.noraini@amanahtrust.example", "+60 19-663 1102", "linkedin", "opportunity", "2026-06-12", "Regulated records archive with audit trail", { notes: "Audit trail and retention policy decide this, not price." }),
  lead("L-1030", "Lim Chee Seng", "Chief Operating Officer", "cs.lim@titiwangsains.example", "+60 12-220 4417", "linkedin", "customer", "2026-03-11", "Claims document processing, enterprise rollout", { notes: "Signed 18 Jul. Reference-able after go-live." }),
  lead("L-1033", "Yusrina Binti Latif", "Branch Operations Head", "yusrina@kopwawasan.example", "+60 13-667 8890", "linkedin", "customer", "2026-04-02", "Member application digitisation", { notes: "Live since June. Ask for a testimonial." }),
  lead("L-1064", "Norhayati Binti Salleh", "Assistant Director", "norhayati@mpampang.example", "+60 13-229 5561", "linkedin", "sql", "2026-05-16", "Municipal records digitisation programme", { notes: "Went to open tender, awarded elsewhere on price. Re-tenders in 2028.", lost: true }),
  lead("L-1049", "Wong Li Fen", "Company Secretary", "lifen.wong@harmonics.example", "+60 12-118 6654", "linkedin", "sql", "2026-06-21", "Statutory records retention and retrieval", { notes: "Handles filings for 200+ client companies." }),
  lead("L-1055", "Ahmad Zulkifli bin Hassan", "General Manager", "zulkifli@bumihijau.example", "+60 19-445 2210", "linkedin", "sql", "2026-04-22", "Digitising 20 years of land title records", { notes: "Paper archive in poor condition — scope carefully." }),
  lead("L-1074", "Rahim bin Osman", "Group CIO", "rahim.osman@nusantarahold.example", "+60 12-330 7745", "linkedin", "mql", "2026-06-18", "Group-wide document strategy, 5 subsidiaries", { notes: "Engaged with three posts before enquiring." }),
  lead("L-1066", "Fatimah Zahra Osman", "Registrar", "registrar@uniselangor.example", "+60 13-441 0092", "linkedin", "mql", "2026-05-28", "Student records and transcript digitisation", { notes: "Grant-funded — decision before October intake." }),
  lead("L-1078", "Chandran Muthusamy", "Head of Shared Services", "chandran.m@prismaenergy.example", "+60 16-771 2204", "linkedin", "lead", "2026-07-27", "Exploring vendor options", { notes: "Downloaded the buyer guide." }),
  lead("L-1081", "Serena Yap Hui Ling", "Finance Manager", "serena.yap@meridianlog.example", "+60 12-887 4432", "linkedin", "lead", "2026-07-30", "Invoice archiving enquiry", { notes: "Commented on the AP automation post." }),

  // ---- Facebook ---------------------------------------------------------
  lead("L-1035", "Zaiton Binti Ibrahim", "Admin Manager", "zaiton@klinikpermata.example", "+60 13-556 7781", "facebook", "opportunity", "2026-04-18", "Patient file digitisation, 3 branches", { notes: "Partners declined the spend this year. Worth revisiting at budget season.", lost: true }),
  lead("L-1047", "Tan Boon Keat", "Managing Director", "bk.tan@keatseng.example", "+60 12-771 3388", "facebook", "sql", "2026-06-03", "Document scanning services", { notes: "Went with a cheaper scanning bureau. Price-led throughout.", lost: true }),
  lead("L-1052", "Hasnah Binti Mokhtar", "Office Manager", "hasnah@sridamai.example", "+60 19-224 5590", "facebook", "mql", "2026-06-27", "Small office records cleanup", { notes: "Attended the Facebook Live session." }),
  lead("L-1067", "Gopal Krishnan", "Operations Executive", "gopal.k@cahayadist.example", "+60 17-338 9921", "facebook", "mql", "2026-05-19", "Proof-of-delivery capture", { notes: "Requested the logistics case study." }),
  lead("L-1075", "Rosnah Binti Yaakob", "Practice Manager", "rosnah@kliniksihat.example", "+60 11-5567 8834", "facebook", "lead", "2026-07-25", "Single-clinic file scanning", { notes: "Below minimum engagement size. Referred to a partner.", lost: true }),
  lead("L-1079", "Mohd Rizal bin Aziz", "Owner", "rizal@rizalauto.example", "+60 12-664 3319", "facebook", "lead", "2026-07-28", "General enquiry", { notes: "Three follow-ups over six weeks, no response.", lost: true }),
  lead("L-1083", "Kamala Devi", "Administrator", "kamala@tamanria.example", "+60 13-882 1147", "facebook", "lead", "2026-07-31", "Enrolment form digitisation", { notes: "Very small scope." }),

  // ---- Instagram --------------------------------------------------------
  lead("L-1054", "Elaine Cheah Su Ann", "Marketing Manager", "elaine.cheah@vistaretail.example", "+60 16-447 2213", "instagram", "sql", "2026-06-30", "Marketing collateral print management", { notes: "Reel on print workflow drove the enquiry." }),
  lead("L-1062", "Amirah Binti Roslan", "Brand Executive", "amirah@nadiwellness.example", "+60 12-995 3320", "instagram", "mql", "2026-06-05", "Client intake form digitisation", { notes: "Downloaded the pricing sheet." }),
  lead("L-1076", "Jocelyn Tan Wei Ning", "Founder", "jocelyn@studiokirana.example", "+60 17-556 8890", "instagram", "lead", "2026-07-26", "Curious about scanning services", { notes: "Story reply, no stated project." }),
  lead("L-1080", "Danish Haikal bin Roslan", "Operations Assistant", "danish@kopirumah.example", "+60 11-2287 4471", "instagram", "lead", "2026-07-29", "Supplier invoice filing", { notes: "DM enquiry, early stage." }),
  lead("L-1082", "Nadia Sofea", "Marketing Assistant", "nadia@bloomflorist.example", "+60 19-773 2218", "instagram", "lead", "2026-07-30", "General enquiry", { notes: "Followed after a carousel post." }),
  lead("L-1084", "Farah Nabila", "Admin Assistant", "farah@ceriaevents.example", "+60 12-448 9931", "instagram", "lead", "2026-07-31", "Contract filing question", { notes: "Intent unclear." }),

  // ---- YouTube ----------------------------------------------------------
  lead("L-1046", "Michael Teoh Wei Jie", "Head of Shared Services", "m.teoh@perdanahg.example", "+60 16-990 3345", "youtube", "customer", "2026-05-30", "Back-office document workflow, 9 hotels", { notes: "Found us via the eONE walkthrough video." }),
  lead("L-1053", "Arun Devarajan", "Regional IT Director", "arun.d@straitsfreight.example", "+60 17-224 9987", "youtube", "sql", "2026-04-14", "Customs documentation processing", { notes: "Watched the full product demo before enquiring." }),
  lead("L-1059", "Lee Kar Wai", "IT Manager", "kw.lee@sinaranmfg.example", "+60 12-445 7723", "youtube", "mql", "2026-05-21", "Production document control", { notes: "High-intent — asked about integrations in comments." }),
  lead("L-1070", "Vijaya Letchumi", "Records Officer", "vijaya@damaiutama.example", "+60 13-229 8876", "youtube", "mql", "2026-06-11", "Medical records archive", { notes: "Subscribed, watched three videos." }),
  lead("L-1077", "Syafiq bin Zainuddin", "IT Executive", "syafiq@alamsekitar.example", "+60 11-3345 8821", "youtube", "lead", "2026-07-27", "Small-scale scanning project", { notes: "No budget confirmed." }),

  // ---- X ----------------------------------------------------------------
  lead("L-1050", "Faridah Binti Kamal", "Chief Digital Officer", "faridah.k@selasihbank.example", "+60 12-990 4417", "x", "opportunity", "2026-06-16", "Branch document digitisation pilot", { notes: "Reached out after a thread on OCR accuracy." }),
  lead("L-1065", "Ravi Sandran", "Head of IT", "ravi.s@teguhcon.example", "+60 16-337 2290", "x", "mql", "2026-06-02", "Site documentation management", { notes: "Technical audience — engaged with the API post." }),
  lead("L-1072", "Aaron Lim Jia Hao", "Software Engineer", "aaron.lim@fintechnusa.example", "+60 17-882 5546", "x", "lead", "2026-07-23", "API and integration questions", { notes: "Developer curiosity — no budget and no purchasing role. Disqualified.", lost: true }),
  lead("L-1085", "Tengku Adlan", "Analyst", "adlan@perdanaresearch.example", "+60 12-556 9903", "x", "lead", "2026-07-31", "Market research enquiry", { notes: "Competitor research, not a prospect. Disqualified.", lost: true }),

  // ---- Threads ----------------------------------------------------------
  lead("L-1073", "Izzati Binti Hamzah", "Executive Assistant", "izzati@menaraprima.example", "+60 19-882 6641", "threads", "lead", "2026-05-30", "Office document storage", { notes: "Replied to a thread on paperless offices." }),
  lead("L-1086", "Hafiz Nordin", "Coordinator", "hafiz@sukanselangor.example", "+60 13-447 2218", "threads", "lead", "2026-07-29", "Membership records", { notes: "Early-stage curiosity." }),
  lead("L-1087", "Chloe Ng Sze Ying", "Office Admin", "chloe@lumiadesign.example", "+60 11-6678 3345", "threads", "lead", "2026-07-31", "General enquiry", { notes: "No project identified." }),

  // ---- Website chatbot --------------------------------------------------
  lead("L-1051", "Priya Ramasamy", "Finance Director", "priya.r@serimutiara.example", "+60 12-908 5523", "chatbot", "opportunity", "2026-06-30", "Invoice processing automation, ~12k/month", { chatTopic: "Can the system extract data from supplier invoices automatically?", cited: ["FAQ-018", "FAQ-021"], notes: "Strong fit. CFO is the economic buyer." }),
  lead("L-1039", "David Wong Chee Meng", "IT Manager", "d.wong@northportlog.example", "+60 13-772 1140", "chatbot", "customer", "2026-05-22", "Bulk scanning of delivery orders", { chatTopic: "How long does it take to retrieve an archived document?", cited: ["FAQ-041"], notes: "Signed in July. Smooth delivery." }),
  lead("L-1058", "Chong Wei Han", "Head of IT", "wh.chong@pantaimed.example", "+60 16-223 7788", "chatbot", "sql", "2026-05-07", "Patient records digitisation across 6 clinics", { chatTopic: "Is Documation ISO 27001 certified?", cited: [], notes: "Chatbot refused — entry pending confirmation. NEEDS a definitive answer from management." }),
  lead("L-1061", "Sarah Lim Mei Xin", "Operations Executive", "sarah.lim@kllegal.example", "+60 11-2876 4432", "chatbot", "mql", "2026-06-09", "Case file archiving and retrieval", { chatTopic: "How much does document scanning cost per page?", cited: ["FAQ-012"], notes: "Small firm, 18 staff. Entry-tier candidate." }),
  lead("L-1071", "Aisyah Binti Kamarul", "HR Manager", "aisyah.k@damaihealth.example", "+60 17-338 2214", "chatbot", "mql", "2026-06-23", "Employee file digitisation, ~1,200 records", { chatTopic: "Do you handle confidential HR documents?", cited: ["FAQ-027", "FAQ-029"], notes: "Clear use case and volume stated up front." }),
  lead("L-1088", "Grace Anak Jugah", "Admin Director", "grace.j@borneoagro.example", "+60 14-559 0071", "chatbot", "lead", "2026-07-31", "Records management, Kuching-based", { chatTopic: "Do you provide services outside Klang Valley?", cited: ["FAQ-008"], notes: "East Malaysia — confirm coverage before quoting." }),

  // ---- Website form -----------------------------------------------------
  lead("L-1048", "Kavitha Subramaniam", "Operations Director", "kavitha.s@sinaranpack.example", "+60 12-445 7724", "form", "opportunity", "2026-06-09", "Production document control", { notes: "Proposal delivered, decision expected August." }),
  lead("L-1060", "Jason Kok Wai Loon", "Facilities Manager", "jason@wismacemerlang.example", "+60 12-889 4470", "form", "sql", "2026-04-28", "Managed print for a 22-floor tower", { notes: "Walkthrough scheduled." }),
  lead("L-1069", "Ismail bin Daud", "Warehouse Manager", "ismail.d@cahayalog.example", "+60 12-664 3320", "form", "mql", "2026-06-16", "Delivery note archiving", { notes: "Requested a callback." }),
  lead("L-1089", "Mohd Faizal bin Yusof", "Admin Head", "faizal@pkn.example", "+60 19-882 6642", "form", "lead", "2026-07-30", "Records digitisation enquiry", { notes: "Form submission only, no detail given." }),
];
