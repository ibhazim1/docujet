/**
 * Query-string state.
 *
 * Every filter, the sort, the active view and the selected lead live in the
 * URL — a port of `url_with()` in `crm/lib/helpers.php` and the parameter
 * whitelisting at the top of `crm/index.php`. That is what makes any screen a
 * shareable link and keeps the back button honest.
 */

import { isSortKey } from "./analytics";
import { isBoardOrder, type BoardOrder } from "./playbook";
import { isPlayKey, type PlayKey } from "./queue";
import { isSourceKey, isStageKey } from "./taxonomy";
import type {
  LeadFilters,
  SortDirection,
  SortKey,
  StageKey,
  ViewKey,
} from "./types";

export type TrackerQuery = {
  view: ViewKey;
  filters: LeadFilters;
  sort: SortKey;
  dir: SortDirection;
  leadId: string;
  /**
   * Narrows the queue to one play.
   *
   * Carried in the URL like every other piece of view state, which is what lets
   * an insight on the dashboard link straight to the leads behind it — "38% of
   * losses cite price" is a claim, and `?view=action&play=going-cold` is the
   * evidence, one click away and shareable.
   */
  play: PlayKey | "";
  /**
   * Which stage section the action board is showing.
   *
   * The board displays one stage at a time, so this is the single most
   * important thing about what is on screen and it belongs in the URL with
   * everything else — "the MQL pile" is a link somebody can send.
   *
   * Empty means "not chosen", which the board resolves to the earliest stage
   * that has anything in it. That is deliberately not the same as defaulting to
   * `lead` in here: the right answer depends on the leads, which this module
   * cannot see.
   */
  at: StageKey | "";
  /**
   * How the visible section is ordered: longest silent first, or most recently
   * contacted first.
   *
   * Separate from `sort`/`dir`, which belong to the table. The board sorts on
   * one axis only and in a different unit, and overloading the table's keys
   * would mean a column choice made in one view silently reordering the other.
   */
  order: BoardOrder;
  /**
   * How many table rows to show at once, and which page of them.
   *
   * In the URL with everything else, so "page 3 of the LinkedIn leads" is a
   * link somebody can send. `page` is 1-based because it is user-facing; the
   * slice arithmetic converts once, in `paginate()`.
   */
  perPage: number;
  page: number;
};

/** The sizes the picker offers. Anything else is reached through Custom. */
export const PAGE_SIZES = [10, 20, 50, 100] as const;

/**
 * The default, and it is deliberately the smallest one.
 *
 * The table used to render every matching lead, so the page grew a screen
 * taller with each one and reaching the filter bar again meant scrolling back
 * past all of them. Ten is about a screen: enough to work with, short enough
 * that the controls above and below are both reachable without travelling.
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * The largest custom size accepted.
 *
 * Not a performance limit — the tracker holds the whole book in memory anyway.
 * It stops a hand-edited URL asking for a hundred thousand rows and hanging the
 * tab on a render nobody wanted.
 */
export const MAX_PAGE_SIZE = 500;

/** Reads the whitelisted parameters. Anything unrecognised falls back to a default. */
export function parseQuery(params: URLSearchParams): TrackerQuery {
  const rawStage = params.get("stage") ?? "";
  const rawSource = params.get("source") ?? "";
  const rawGroup = params.get("group") ?? "";
  const rawView = params.get("view") ?? "";
  const rawSort = params.get("sort") ?? "";

  const rawPlay = params.get("play") ?? "";
  const rawAt = params.get("at") ?? "";
  const rawOrder = params.get("order") ?? "";

  return {
    // `action` is the default and needs no parameter; the other three are
    // explicit. Anything unrecognised falls back to the board rather than to a
    // blank screen — including `view=today`, the name this view used to have,
    // which keeps links shared before the rename pointing somewhere sensible.
    view:
      rawView === "board" || rawView === "charts" || rawView === "table"
        ? rawView
        : "action",
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
    play: isPlayKey(rawPlay) ? rawPlay : "",
    at: isStageKey(rawAt) ? rawAt : "",
    order: isBoardOrder(rawOrder) ? rawOrder : "late",
    perPage: parsePerPage(params.get("per")),
    page: parsePage(params.get("page")),
  };
}

/** Reads `per`, falling back to the default for anything unusable. */
function parsePerPage(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(value, MAX_PAGE_SIZE);
}

/** Reads `page`. Out-of-range values are clamped later, against the real total. */
function parsePage(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return 1;
  return value;
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
