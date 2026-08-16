"use client";

/**
 * The settings editor.
 *
 * A single form posting to `updateSettingsAction`, imported directly rather
 * than threaded down as a prop — the same direct-import Server Action
 * pattern `StageSelect.tsx` uses for `setStageAction`.
 */

import { useState, useTransition } from "react";
import StatusBadge from "./StatusBadge";
import { compactInputClassName, inputClassName, pillButtonClassName } from "./field-styles";
import { updateSettingsAction, type SettingsActionResult } from "@/lib/settings/actions";
import type { SafeSiteSettings } from "@/lib/settings/mask";

type SettingsFormProps = {
  initialSettings: SafeSiteSettings;
};

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(
    initialSettings.chat.suggestions.length > 0 ? initialSettings.chat.suggestions : [""],
  );

  function onSubmit(formData: FormData) {
    // Controlled separately from the rest of the form, since it's a variable-
    // length list rather than a fixed input — replace whatever the browser
    // collected for "suggestions" with the current in-memory list.
    formData.delete("suggestions");
    for (const suggestion of suggestions) {
      if (suggestion.trim() !== "") formData.append("suggestions", suggestion);
    }

    startTransition(async () => {
      const outcome = await updateSettingsAction(formData);
      setResult(outcome);
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Business Information</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Company Name">
            <input
              name="companyName"
              defaultValue={initialSettings.business.companyName}
              className={inputClassName}
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              defaultValue={initialSettings.business.email}
              className={inputClassName}
            />
          </Field>
          <Field label="Phone">
            <input
              name="phone"
              defaultValue={initialSettings.business.phone}
              className={inputClassName}
            />
          </Field>
          <Field label="Business Hours">
            <input
              name="hours"
              defaultValue={initialSettings.business.hours}
              className={inputClassName}
            />
          </Field>
          <Field label="Address">
            <textarea
              name="address"
              rows={4}
              defaultValue={initialSettings.business.address}
              className={`${inputClassName} md:col-span-2`}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Chat Assistant</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Controls the floating assistant on the public site.
        </p>

        <div className="mt-5 space-y-5">
          <Field label="Greeting" caption="Shown when a visitor opens the chat panel.">
            <textarea
              name="greeting"
              rows={2}
              defaultValue={initialSettings.chat.greeting}
              className={inputClassName}
            />
          </Field>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Suggested questions
            </span>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={suggestion}
                    onChange={(event) =>
                      setSuggestions((current) =>
                        current.map((value, i) => (i === index ? event.target.value : value)),
                      )
                    }
                    className={compactInputClassName}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestions((current) => current.filter((_, i) => i !== index))
                    }
                    disabled={suggestions.length <= 1}
                    className={pillButtonClassName}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSuggestions((current) => [...current, ""])}
              className={`${pillButtonClassName} mt-2`}
            >
              Add suggestion
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Max message length" caption="webhook.ts / route.ts / ChatWidget.tsx">
              <input
                name="maxMessageChars"
                type="number"
                min={1}
                defaultValue={initialSettings.chat.maxMessageChars}
                className={inputClassName}
              />
            </Field>
            <Field label="History turns kept" caption="route.ts / ChatWidget.tsx">
              <input
                name="maxHistoryTurns"
                type="number"
                min={0}
                defaultValue={initialSettings.chat.maxHistoryTurns}
                className={inputClassName}
              />
            </Field>
            <Field label="Rate limit window (ms)" caption="route.ts">
              <input
                name="rateLimitWindowMs"
                type="number"
                min={1000}
                step={1000}
                defaultValue={initialSettings.chat.rateLimitWindowMs}
                className={inputClassName}
              />
            </Field>
            <Field label="Rate limit max requests" caption="route.ts">
              <input
                name="rateLimitMaxRequests"
                type="number"
                min={1}
                defaultValue={initialSettings.chat.rateLimitMaxRequests}
                className={inputClassName}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Integrations</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Secret fields show only the last few characters and are left blank here — type a new
          value to replace one, or leave it blank to keep what&apos;s already saved.
        </p>

        <div className="mt-5 space-y-4">
          <SecretField
            label="n8n webhook URL"
            name="n8nWebhookUrl"
            masked={initialSettings.integrations.n8nWebhookUrl}
            caption="Overrides N8N_CHAT_WEBHOOK_URL when set. webhook.ts"
          />
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            Editing the Plasmic fields below updates the stored record, but the Plasmic loader
            initializes once at server start (plasmic-init.ts) — the{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono">PLASMIC_PROJECT_ID</code> /{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono">PLASMIC_API_TOKEN</code>{" "}
            environment variables must also be updated and the server restarted for a change to
            actually take effect.
          </div>
          <Field label="Plasmic project ID">
            <input
              name="plasmicProjectId"
              defaultValue={initialSettings.integrations.plasmicProjectId}
              className={inputClassName}
            />
          </Field>
          <SecretField
            label="Plasmic API token"
            name="plasmicApiToken"
            masked={initialSettings.integrations.plasmicApiToken}
          />
          <p className="text-xs leading-5 text-slate-400">
            The CRM sheet connection (endpoint/secret) isn&apos;t editable here — Settings itself
            is stored through that same connection, so it stays env-var-only to avoid a
            chicken-and-egg config problem. Change CRM_SHEET_ENDPOINT / CRM_SHEET_SECRET directly
            if it ever needs to move.
          </p>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={pillButtonClassName}>
          {isPending ? "Saving…" : "Save settings"}
        </button>
        {result ? (
          <p className={`text-sm ${result.ok ? "text-emerald-700" : "text-rose-700"}`}>
            {result.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  caption,
  children,
}: {
  label: React.ReactNode;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {caption ? <span className="mt-1 block text-xs text-slate-400">{caption}</span> : null}
    </label>
  );
}

function SecretField({
  label,
  name,
  masked,
  caption,
}: {
  label: string;
  name: string;
  masked: { isSet: boolean; masked: string };
  caption?: string;
}) {
  return (
    <Field
      label={
        <span className="flex items-center gap-2">
          {label}
          <StatusBadge status={masked.isSet ? "Connected" : "Not configured"} />
        </span>
      }
      caption={caption}
    >
      <input
        name={name}
        type="password"
        autoComplete="off"
        placeholder={masked.isSet ? masked.masked : "Not set"}
        className={inputClassName}
      />
    </Field>
  );
}
