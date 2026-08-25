"use client";

import { usePlasmicCanvasContext } from "@plasmicapp/loader-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { StageActionResult } from "@/lib/crm/actions";
import {
  filterLeads,
  findLead,
  sortLeads,
  sourceStats,
  summarise,
  type SourceStat,
  type Summary,
} from "@/lib/crm/analytics";
import { buildHref, isFiltered, parseQuery, type TrackerQuery } from "@/lib/crm/query";
import { SAMPLE_LEADS, SAMPLE_TODAY } from "@/lib/crm/sample-leads";
import type { Lead, ViewKey } from "@/lib/crm/types";

/**
 * The tracker's shared state.
 *
 * Every CRM piece — a KPI tile, the filter bar, a chart — reads this instead of
 * being handed props by a parent component. That is what lets Plasmic treat
 * each piece as a free-standing element a designer can move, delete or drop
 * anywhere: nothing needs a specific parent to pass it data.
 *
 * Reads and writes are separated. Anything that changes the view goes through
 * `apply`, which owns the one decision the URL used to make implicitly: inside
 * the Plasmic canvas there is no route to navigate, so state stays local and
 * the controls still work; in the real app it is mirrored into the query
 * string exactly as before, so a filtered screen is still a shareable link.
 */
export type TrackerValue = {
  /** Every lead the tracker was given, before filtering. */
  allLeads: Lead[];
  /** The filtered, sorted list every view renders. */
  visible: Lead[];
  /** The lead the detail panel is open on, if any. */
  selected: Lead | null;
  stats: Summary;
  sources: SourceStat[];
  query: TrackerQuery;
  view: ViewKey;
  today: string;
  /** Stage and source render as badges rather than controls. */
  readOnly: boolean;
  /** These rows are the bundled samples, so writes have nowhere real to go. */
  isSample: boolean;
  params: URLSearchParams;
  filtered: boolean;
  flash: StageActionResult | null;
  setFlash: (result: StageActionResult | null) => void;
  /** The search box's uncommitted text, so Apply can live in a separate element. */
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  applySearch: () => void;
  hrefFor: (overrides: Record<string, string | null>) => string;
  apply: (overrides: Record<string, string | null>) => void;
  toggle: (key: string, value: string, extra?: Record<string, string | null>) => void;
  toggleHrefFor: (
    key: string,
    value: string,
    extra?: Record<string, string | null>,
  ) => string;
};

const TrackerContext = createContext<TrackerValue | null>(null);

export type TrackerOptions = {
  leads?: Lead[];
  today?: string;
  defaultView?: ViewKey;
  readOnly?: boolean;
  /**
   * With no `leads` prop, read the book from `/api/crm/leads` in the browser.
   *
   * This is what a Plasmic-authored page needs: the tracker is assembled in
   * Studio with no server component above it to do the reading, so without
   * this it would show the seed rows. Never runs in the Studio canvas, where
   * there is no session and the samples are the point.
   */
  autoLoad?: boolean;
};

/** Nothing to compute for a dormant instance; every aggregate handles it. */
const NO_LEADS: Lead[] = [];

function useTrackerState(options: TrackerOptions, dormant = false): TrackerValue {
  const { leads, defaultView = "table", readOnly = false, autoLoad = false } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  const inCanvas = Boolean(usePlasmicCanvasContext());

  const [localQuery, setLocalQuery] = useState(() => searchParams?.toString() ?? "");
  const [flash, setFlash] = useState<StageActionResult | null>(null);
  const [searchDraft, setSearchDraft] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ leads: Lead[]; today: string } | null>(null);

  const shouldLoad = autoLoad && leads === undefined && !inCanvas && !dormant;
  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;

    fetch("/api/crm/leads")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.leads)) return;
        setLoaded({ leads: data.leads as Lead[], today: data.today ?? SAMPLE_TODAY });
      })
      // A failed read leaves the seed rows in place, which is what the page
      // already shows when the database is not connected.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  const book = leads ?? loaded?.leads;
  const today = options.today ?? loaded?.today ?? SAMPLE_TODAY;

  // No rows from anywhere means nobody read the database — the Plasmic canvas,
  // or a bare render — so these are the bundled samples. It gates the *write*,
  // not the look: `readOnly` still decides badge-or-control, while `isSample`
  // stops a control calling a Server Action against rows no database holds.
  const isSample = book === undefined;
  const allLeads = dormant ? NO_LEADS : book ?? SAMPLE_LEADS;

  // In the canvas there is no route to own the state, so the component owns it.
  // Everywhere else the URL stays the single source of truth.
  const search = inCanvas ? localQuery : searchParams?.toString() ?? "";
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const query = useMemo(() => parseQuery(params), [params]);
  const view = params.get("view") ? query.view : defaultView;

  const visible = useMemo(
    () => sortLeads(filterLeads(allLeads, query.filters), query.sort, query.dir),
    [allLeads, query.filters, query.sort, query.dir],
  );
  const stats = useMemo(() => summarise(visible, today), [visible, today]);
  const sources = useMemo(() => sourceStats(visible), [visible]);
  const selected = findLead(allLeads, query.leadId);

  const hrefFor = useCallback(
    (overrides: Record<string, string | null>) => buildHref(params, overrides),
    [params],
  );

  const apply = useCallback(
    (overrides: Record<string, string | null>) => {
      const href = buildHref(params, overrides);
      setLocalQuery(href === "?" ? "" : href.slice(1));
      if (!inCanvas) router.replace(href, { scroll: false });
    },
    [params, inCanvas, router],
  );

  const toggleHrefFor = useCallback(
    (key: string, value: string, extra: Record<string, string | null> = {}) =>
      hrefFor({ [key]: params.get(key) === value ? null : value, ...extra }),
    [hrefFor, params],
  );

  const toggle = useCallback(
    (key: string, value: string, extra: Record<string, string | null> = {}) =>
      apply({ [key]: params.get(key) === value ? null : value, ...extra }),
    [apply, params],
  );

  const draft = searchDraft ?? query.filters.q;
  const applySearch = useCallback(() => {
    apply({ q: (searchDraft ?? "").trim(), lead: null });
    setSearchDraft(null);
  }, [apply, searchDraft]);

  return {
    allLeads,
    visible,
    selected,
    stats,
    sources,
    query,
    view,
    today,
    readOnly,
    isSample,
    params,
    filtered: isFiltered(query.filters),
    flash,
    setFlash,
    searchDraft: draft,
    setSearchDraft,
    applySearch,
    hrefFor,
    apply,
    toggle,
    toggleHrefFor,
  };
}

/** Sample-backed state for a piece dropped on its own, with no tracker above it. */
const STANDALONE: TrackerOptions = {};

/**
 * Read the tracker.
 *
 * A piece with no tracker above it still gets a working one over the seed
 * rows, so a designer can drag a single chart or the filter bar onto a blank
 * artboard and have it render and respond. Both hooks always run — the unused
 * one is dormant and computes over no leads.
 */
export function useLeadTracker(): TrackerValue {
  const provided = useContext(TrackerContext);
  const standalone = useTrackerState(STANDALONE, provided !== null);
  return provided ?? standalone;
}

export function LeadTrackerProvider({
  children,
  ...options
}: TrackerOptions & { children: ReactNode }) {
  const value = useTrackerState(options);
  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

/**
 * A link that changes the tracker.
 *
 * A real anchor, so the destination is copyable and a modified click still
 * opens a new tab, but a plain click is handled in place — which is what makes
 * these controls live inside the Plasmic canvas, where a navigation would
 * either go nowhere or take the whole editor with it.
 */
export function TrackerLink({
  overrides,
  scrollTo,
  className,
  style,
  title,
  current,
  children,
}: {
  overrides: Record<string, string | null>;
  /** Element id to bring into view after the click. */
  scrollTo?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  current?: "page" | "true";
  children: ReactNode;
}) {
  const { hrefFor, apply } = useLeadTracker();
  const href = `${hrefFor(overrides)}${scrollTo ? `#${scrollTo}` : ""}`;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    apply(overrides);
    if (scrollTo) {
      requestAnimationFrame(() => {
        document
          .getElementById(scrollTo)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <a
      href={href}
      onClick={onClick}
      title={title}
      aria-current={current}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
