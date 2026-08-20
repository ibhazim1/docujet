/**
 * Keeps secrets out of client-rendered HTML/JSON.
 *
 * `toSafeSettingsView()` is the only shape the Settings page's server
 * component hands to its client form — a stored secret's real value never
 * reaches the browser after it's first saved.
 */

import { SECRET_KEYS } from "./types";
import type { SiteSettings } from "./types";
import type { ConnectionSource, ResolvedConnection } from "../sheet-connection";

export type MaskedSecret = { isSet: boolean; masked: string };

export type SafeIntegrationSettings = {
  n8nWebhookUrl: MaskedSecret;
  plasmicProjectId: string;
  plasmicApiToken: MaskedSecret;
};

export type SafeSiteSettings = {
  business: SiteSettings["business"];
  chat: SiteSettings["chat"];
  integrations: SafeIntegrationSettings;
};

export function maskSecret(value: string): MaskedSecret {
  if (value === "") return { isSet: false, masked: "" };
  const tail = value.slice(-4);
  return { isSet: true, masked: value.length <= 4 ? "•".repeat(value.length) : `••••••${tail}` };
}

export function toSafeSettingsView(settings: SiteSettings): SafeSiteSettings {
  return {
    business: settings.business,
    chat: settings.chat,
    integrations: {
      n8nWebhookUrl: maskSecret(settings.integrations.n8nWebhookUrl),
      plasmicProjectId: settings.integrations.plasmicProjectId,
      plasmicApiToken: maskSecret(settings.integrations.plasmicApiToken),
    },
  };
}

export function isSecretKey(key: string): key is (typeof SECRET_KEYS)[number] {
  return (SECRET_KEYS as readonly string[]).includes(key);
}

/**
 * The sheet connection as the admin form may see it.
 *
 * The endpoint goes through in plaintext: it is a URL anyone could hold, which
 * is exactly why every request to it also carries the secret (see
 * `crm/sheets.ts`). The secret itself is masked like any other.
 *
 * `source` travels with each field so the form can say where the live value
 * came from — an admin needs to know whether they are looking at .env or at
 * something a previous save put on top of it.
 */
export type SafeSheetConnection = {
  endpoint: string;
  endpointSource: ConnectionSource;
  secret: MaskedSecret;
  secretSource: ConnectionSource;
};

export function toSafeConnectionView(connection: ResolvedConnection): SafeSheetConnection {
  return {
    endpoint: connection.endpoint,
    endpointSource: connection.endpointSource,
    secret: maskSecret(connection.secret),
    secretSource: connection.secretSource,
  };
}
