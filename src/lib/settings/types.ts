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
  /**
   * The assistant's instructions — who it is, what it may say, what it must
   * refuse to invent. Was a constant in `src/lib/chat/prompt.ts`; editable here
   * so changing the assistant's behaviour is not a deploy.
   *
   * Never empty: `store.ts` substitutes `DEFAULT_SYSTEM_PROMPT` for a blank
   * stored value, which is how clearing the field in the settings form means
   * "put the shipped brief back" rather than "give the model no instructions".
   */
  systemPrompt: string;
  /** Add/remove list, not a fixed count. */
  suggestions: string[];
  maxMessageChars: number;
  maxHistoryTurns: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
};

/**
 * The database connection deliberately does NOT appear here, and is not
 * admin-editable at all: `SiteSettings` is persisted *through* it (see
 * `store.ts`), so a value telling the app where settings live would itself
 * live inside settings. `SUPABASE_URL` / `SUPABASE_SECRET_KEY` are environment
 * variables and nothing else.
 *
 * `DEEPSEEK_API_KEY` is absent for a related reason: the chat assistant is not
 * an integration the site can be pointed at any more, it is part of the app
 * (src/lib/chat/), and its key is a deployment credential like the database's.
 * The n8n webhook URL that used to live here went away with the workflow —
 * migration 0004 deletes the stored row.
 */
export type IntegrationSettings = {
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
export const SECRET_KEYS = ["plasmicApiToken"] as const;

export type SecretKey = (typeof SECRET_KEYS)[number];
