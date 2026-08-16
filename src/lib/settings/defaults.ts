/**
 * The settings store's fallback — and, until a Settings sheet is deployed,
 * its only source of truth. Seeded from today's real hardcoded values so
 * turning this feature on changes nothing about what visitors see.
 *
 * `business` is sourced from `site-data.ts`'s `footerPlaceholders` rather than
 * re-typed here, so there is exactly one place the real Epson contact details
 * live.
 */

import { footerPlaceholders } from "@/lib/site-data";
import type { SiteSettings } from "./types";

export const DEFAULT_SETTINGS: SiteSettings = {
  business: {
    companyName: "DocuJet",
    phone: footerPlaceholders.phone,
    email: footerPlaceholders.email,
    address: footerPlaceholders.office,
    hours: footerPlaceholders.hours,
  },
  chat: {
    greeting:
      "Hi! I'm the DocuJet assistant. Ask me about the WorkForce Enterprise range, pricing direction, or booking a consultation.",
    suggestions: [
      "What resolution and geometry do the Epson MicroTFP print chips have?",
      "What is Heat-Free Technology?",
      "How fast do the Epson WorkForce Enterprise printers print on A4?",
    ],
    maxMessageChars: 1000,
    maxHistoryTurns: 8,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 15,
  },
  integrations: {
    // Empty means "not overridden" — consumers fall back to process.env exactly
    // as they do today. See store.ts's getSettings() merge behavior.
    n8nWebhookUrl: "",
    plasmicProjectId: "",
    plasmicApiToken: "",
  },
};
