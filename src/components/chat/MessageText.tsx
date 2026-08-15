"use client";

/**
 * Renders one assistant reply as markdown.
 *
 * The workflow's agent writes GFM — tables of order codes, bulleted spec lists,
 * the occasional heading — because that is what language models produce whether
 * or not anyone asked. Rendered as plain text those arrive as a wall of pipes
 * and asterisks, so the panel parses them properly.
 *
 * Only the assistant's side goes through here. A visitor's own message is shown
 * verbatim: someone typing `*` or a stray pipe is not writing markup, and
 * silently reformatting what they said would be a small lie about what was sent.
 *
 * Loaded lazily by ChatWidget — see the `React.lazy` boundary there — so the
 * parser is fetched when someone opens the panel rather than by every visitor
 * who merely loads a page.
 *
 * Raw HTML in the source is ignored rather than rendered, which is
 * react-markdown's default and the reason no sanitiser is wired in: an answer
 * that echoes back something a visitor typed cannot inject markup.
 */

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { navItems } from "@/lib/site-data";

// ---------------------------------------------------------------------------
// Internal routes
// ---------------------------------------------------------------------------

/** Site routes the assistant may send someone to. "/" is excluded — too short to match safely. */
const INTERNAL_ROUTES = navItems
  .map((item) => item.href)
  .filter((href) => href !== "/")
  .sort((a, b) => b.length - a.length);

const BARE_ROUTE = new RegExp(
  `(^|\\s)(${INTERNAL_ROUTES.map((route) => route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w/-])`,
  "g",
);

/**
 * Turns a bare `/booking` into a real link.
 *
 * Markdown leaves a naked path as text, and getting someone from an answer to
 * the booking form in one tap is the entire commercial point of the widget. So
 * the paths this site actually has are promoted to links before parsing.
 *
 * The lead character must be whitespace or the start of the string, which is
 * what keeps it away from paths already inside a link — `](/booking)` and
 * `[/booking]` are both preceded by punctuation — and from the tail of a URL.
 * Code spans and fenced blocks are stepped over entirely: a path shown as an
 * example is being quoted, not offered.
 */
export function linkifyBareRoutes(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`]*`)/g)
    .map((chunk, index) =>
      // Odd indices are the captured code delimiters themselves.
      index % 2 === 1
        ? chunk
        : chunk.replace(BARE_ROUTE, (_, lead: string, route: string) => `${lead}[${route}](${route})`),
    )
    .join("");
}

// ---------------------------------------------------------------------------
// Element styling
//
// Sized for a 24rem panel rather than an article column: headings only a step
// above body text, tables at text-xs, and every block resetting its trailing
// margin so a bubble never ends in dead space.
// ---------------------------------------------------------------------------

const linkClassName =
  "font-medium text-sky-800 underline decoration-sky-700/40 underline-offset-2 transition hover:decoration-sky-700";

const components: Components = {
  p: (props) => <p className="mb-3 last:mb-0" {...props} />,

  a: ({ href, children, ...props }) => {
    // Internal links go through the router so the panel — and the conversation
    // inside it — survives the navigation.
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={linkClassName}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        {...props}
      >
        {children}
      </a>
    );
  },

  strong: (props) => <strong className="font-semibold text-slate-900" {...props} />,
  em: (props) => <em className="italic" {...props} />,

  ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
  li: (props) => <li className="marker:text-slate-400 [&>p]:mb-0" {...props} />,

  h1: (props) => <h4 className="mb-2 mt-4 text-base font-semibold text-slate-950 first:mt-0" {...props} />,
  h2: (props) => <h4 className="mb-2 mt-4 text-base font-semibold text-slate-950 first:mt-0" {...props} />,
  h3: (props) => <h5 className="mb-2 mt-4 font-semibold text-slate-950 first:mt-0" {...props} />,
  h4: (props) => <h5 className="mb-2 mt-4 font-semibold text-slate-950 first:mt-0" {...props} />,
  h5: (props) => <h6 className="mb-2 mt-4 font-semibold text-slate-950 first:mt-0" {...props} />,
  h6: (props) => <h6 className="mb-2 mt-4 font-semibold text-slate-950 first:mt-0" {...props} />,

  // A spec table is wider than the panel no matter how it is styled, so it gets
  // its own scroll container rather than forcing the whole bubble sideways.
  table: (props) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left text-xs" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="whitespace-nowrap border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-900"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border border-slate-200 px-2.5 py-1.5 align-top leading-5" {...props} />
  ),

  // `pre` owns the block styling and neutralises the inline treatment of the
  // `code` it wraps — react-markdown no longer tells the code renderer whether
  // it is inline, and the descendant selector answers that without guessing
  // from a language class an indented block would not carry.
  pre: (props) => (
    <pre
      className="mb-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs leading-6 text-slate-100 last:mb-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-900"
      {...props}
    />
  ),

  blockquote: (props) => (
    <blockquote className="mb-3 border-l-2 border-sky-700/40 pl-3 text-slate-600 last:mb-0" {...props} />
  ),
  hr: (props) => <hr className="my-3 border-slate-200" {...props} />,
};

export default function MessageText({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {linkifyBareRoutes(text)}
    </ReactMarkdown>
  );
}
