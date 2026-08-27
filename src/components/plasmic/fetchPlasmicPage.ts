import { PLASMIC } from "@/plasmic-init";

type PlasmicPageData = Awaited<ReturnType<typeof PLASMIC.maybeFetchComponentData>>;

/**
 * True when both halves of the Plasmic credential are present.
 *
 * `plasmic-init.ts` asserts them non-null (`process.env.PLASMIC_PROJECT_ID!`),
 * which is a promise the environment does not have to keep — a deployment whose
 * environment variables were never filled in hands the loader `undefined` for
 * both and it happily builds a request to fetch project "undefined".
 */
function isPlasmicConfigured(): boolean {
  return Boolean(
    process.env.PLASMIC_PROJECT_ID?.trim() && process.env.PLASMIC_API_TOKEN?.trim(),
  );
}

/**
 * Fetches a page's Plasmic design, or `null` when there is nothing to fetch.
 *
 * The name `maybeFetchComponentData` suggests this is already safe, but its
 * "maybe" only covers a project that has no such page: it throws on a missing
 * credential, a rejected token, and a Plasmic outage alike. Those all reached
 * `next build` as a prerender error, which is how a blank environment variable
 * turned into a failed deployment rather than into the coded fallback pages
 * that `.env.example` promises.
 *
 * So all three are treated the same way here, and the same way as "this page is
 * not in the project": return null, and let the caller render the version of
 * the page that lives in this repository. A site that renders its own
 * components is a far better outcome than a site that does not build.
 *
 * Logged rather than swallowed — falling back is fine, doing so silently for a
 * month is not.
 */
export async function fetchPlasmicPage(path: string): Promise<PlasmicPageData> {
  if (!isPlasmicConfigured()) {
    console.warn(
      `[plasmic] PLASMIC_PROJECT_ID / PLASMIC_API_TOKEN are not set — rendering ${path} from ` +
        "src/components/pages/ instead of the Studio design.",
    );
    return null;
  }

  try {
    return await PLASMIC.maybeFetchComponentData(path);
  } catch (cause) {
    console.warn(
      `[plasmic] could not fetch ${path}, falling back to the coded page:`,
      cause instanceof Error ? cause.message : cause,
    );
    return null;
  }
}
