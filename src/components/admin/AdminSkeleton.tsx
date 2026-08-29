import AdminShell from "./AdminShell";

/**
 * What an admin page looks like before its data arrives.
 *
 * ---------------------------------------------------------------------------
 * Why this exists at all
 *
 * Every admin route is `force-dynamic` and reads Supabase — deliberately, since
 * a cached lead book is a wrong lead book. That read is not free, and without a
 * `loading.tsx` beside each page Next has nothing to show while it happens: the
 * browser sits on the *previous* page, unchanged and unresponsive, until the
 * server replies. A click that appears to do nothing for a second reads as a
 * broken button, and the usual response is to click it again.
 *
 * This is the answer to that, and it is not decoration. Rendering the shell
 * immediately means the sidebar, the frame and the page's own shape are on
 * screen the instant a link is clicked, so the navigation is visibly
 * acknowledged and only the part that genuinely depends on the database is
 * still moving. The perceived wait is the difference between "nothing happened"
 * and "this bit is loading", which is most of the wait.
 * ---------------------------------------------------------------------------
 *
 * The shell is real rather than a grey rectangle standing in for it: it is a
 * client component with no data of its own, so it costs nothing to render early
 * and it means the sidebar never flickers or shifts when the page lands
 * underneath it.
 */
export default function AdminSkeleton({
  title = "Loading",
  /** How many KPI-sized tiles to stand in for. Zero drops the row. */
  tiles = 6,
  /** A table-shaped block under the tiles, for the list pages. */
  rows = 5,
}: {
  title?: string;
  tiles?: number;
  rows?: number;
}) {
  return (
    <AdminShell>
      {/* The header is real text, not a bar. The page title is known before the
          data is, and showing it is what tells the reader the click landed on
          the page they asked for. */}
      <div className="border-b border-slate-200 bg-white px-5 py-6 md:px-8">
        <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200" />
        <p className="sr-only">{title}</p>
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-md bg-slate-100" />
      </div>

      <SkeletonBody title={title} tiles={tiles} rows={rows} />
    </AdminShell>
  );
}

/**
 * The same placeholder without the shell, for a page that already has one.
 *
 * Both admin pages wrap their tracker in a Suspense boundary, because reading
 * the query string on the client suspends during the server render. Those
 * boundaries used to fall back to the single line "Loading leads…", which is
 * technically an answer and visually a jolt: one line of grey text is replaced
 * a moment later by a full dashboard, and the page jumps the height of the
 * thing that arrived. Standing in at roughly the right size costs nothing and
 * removes the jump.
 */
export function SkeletonBody({
  title = "Loading",
  tiles = 6,
  rows = 5,
}: {
  title?: string;
  tiles?: number;
  rows?: number;
}) {
  return (
      <div
        className="space-y-6 p-5 md:p-8"
        // The whole block is one live region announcing one thing, so a screen
        // reader says "loading" once rather than narrating twenty grey boxes.
        role="status"
        aria-live="polite"
        aria-label={`${title} — loading`}
      >
        {tiles > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: tiles }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : null}

        {rows > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            </div>
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
                // Each row fades in slightly after the one above it, so the
                // block reads as a list arriving rather than as one flat shape
                // pulsing. Staggered by index and capped, because a long stagger
                // on a fast connection is a delay the page invented.
                style={{ animationDelay: `${Math.min(index, 5) * 90}ms` }}
              >
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="hidden h-6 w-20 shrink-0 animate-pulse rounded-full bg-slate-100 sm:block" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
  );
}
