/**
 * Site-wide configuration a non-developer can edit from `/admin/settings`.
 *
 * Split into a public content shape and a secrets shape on purpose: `business`
 * and `chat` are safe to thread into Client Component props, but
 * `integrations` holds live credentials and must only ever cross into a
 * client render through `toSafeSettingsView()` in `mask.ts`.
 */

export type BusinessInfo = {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
};

export type ChatConfig = {
  greeting: string;
  /** Add/remove list, not a fixed count. */
  suggestions: string[];
  maxMessageChars: number;
  maxHistoryTurns: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
};

/**
 * The sheet endpoint/secret pair deliberately does NOT appear here.
 *
 * It IS admin-editable — the Settings page has a "Sheet connection" section
 * for it — but it cannot be *stored* here: `SiteSettings` is persisted through
 * that very connection (see `store.ts`), so a value telling the app where
 * settings live would itself live inside settings. It is kept in a local
 * override file instead; see `../sheet-connection.ts`.
 */
export type IntegrationSettings = {
  /** Secret-ish: a live workflow URL. Wins over N8N_CHAT_WEBHOOK_URL when set. */
  n8nWebhookUrl: string;
  /** Not secret, but changing it here requires an env var update + restart — see plasmic-init.ts. */
  plasmicProjectId: string;
  /** Secret. */
  plasmicApiToken: string;
};

export type SiteSettings = {
  business: BusinessInfo;
  chat: ChatConfig;
  integrations: IntegrationSettings;
};

/** Fields in `IntegrationSettings` that must never round-trip to a client render in plaintext. */
export const SECRET_KEYS = ["n8nWebhookUrl", "plasmicApiToken"] as const;

export type SecretKey = (typeof SECRET_KEYS)[number];
