/**
 * Query-string state.
 *
 * Every filter, the sort, the active view and the selected lead live in the
 * URL — a port of `url_with()` in `crm/lib/helpers.php` and the parameter
 * whitelisting at the top of `crm/index.php`. That is what makes any screen a
 * shareable link and keeps the back button honest.
 */

import { isSortKey } from "./analytics";
import { isSourceKey, isStageKey } from "./taxonomy";
import type {
  LeadFilters,
  SortDirection,
  SortKey,
  ViewKey,
} from "./types";

export type TrackerQuery = {
  view: ViewKey;
  filters: LeadFilters;
  sort: SortKey;
  dir: SortDirection;
  leadId: string;
};

/** Reads the whitelisted parameters. Anything unrecognised falls back to a default. */
export function parseQuery(params: URLSearchParams): TrackerQuery {
  const rawStage = params.get("stage") ?? "";
  const rawSource = params.get("source") ?? "";
  const rawGroup = params.get("group") ?? "";
  const rawView = params.get("view") ?? "";
  const rawSort = params.get("sort") ?? "";

  return {
    view: rawView === "board" || rawView === "charts" ? rawView : "table",
    filters: {
      q: (params.get("q") ?? "").trim(),
      // `open` is a pseudo-stage meaning "anything still in play".
      stage: isStageKey(rawStage) || rawStage === "open" ? rawStage : "",
      source: isSourceKey(rawSource) ? rawSource : "",
      group: rawGroup === "social" || rawGroup === "web" ? rawGroup : "",
    },
    sort: isSortKey(rawSort) ? rawSort : "created_at",
    dir: params.get("dir") === "asc" ? "asc" : "desc",
    leadId: params.get("lead") ?? "",
  };
}

/** True when at least one filter is narrowing the list. */
export function isFiltered(filters: LeadFilters): boolean {
  return Boolean(filters.q || filters.stage || filters.source || filters.group);
}

/**
 * Builds a href for the current page with parameters replaced or removed.
 *
 * `null` removes a parameter, matching `url_with()`'s `array_filter` — empty
 * strings drop out too, so a cleared filter leaves no trace in the URL.
 */
export function buildHref(
  current: URLSearchParams,
  overrides: Record<string, string | null>,
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  // Drop anything that survived as an empty value, as array_filter would.
  for (const [key, value] of [...next.entries()]) {
    if (value === "") next.delete(key);
  }
  const query = next.toString();
  return query === "" ? "?" : `?${query}`;
}

/** Toggles a parameter: setting it when off, clearing it when already active. */
export function toggleHref(
  current: URLSearchParams,
  key: string,
  value: string,
  extra: Record<string, string | null> = {},
): string {
  const isActive = current.get(key) === value;
  return buildHref(current, { [key]: isActive ? null : value, ...extra });
}
