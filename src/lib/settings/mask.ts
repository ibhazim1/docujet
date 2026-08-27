/**
 * Keeps secrets out of client-rendered HTML/JSON.
 *
 * `toSafeSettingsView()` is the only shape the Settings page's server
 * component hands to its client form — a stored secret's real value never
 * reaches the browser after it's first saved.
 */

import { SECRET_KEYS } from "./types";
import type { SiteSettings } from "./types";

export type MaskedSecret = { isSet: boolean; masked: string };

export type SafeIntegrationSettings = {
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
      plasmicProjectId: settings.integrations.plasmicProjectId,
      plasmicApiToken: maskSecret(settings.integrations.plasmicApiToken),
    },
  };
}

export function isSecretKey(key: string): key is (typeof SECRET_KEYS)[number] {
  return (SECRET_KEYS as readonly string[]).includes(key);
}
