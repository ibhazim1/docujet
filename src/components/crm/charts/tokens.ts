/**
 * Chart colour, assigned by the job the data does rather than by taste.
 *
 * **Lead sources are nominal** — LinkedIn isn't "more" than Facebook. So every
 * source bar is a single hue and length alone carries magnitude. Putting a
 * value-ramp on nominal categories would double-encode bar length as colour
 * and burn the only free channel on information the chart already shows.
 *
 * **Lifecycle stages are ordered**, so they use the single-hue ordinal ramp
 * from `taxonomy.ts` — the same one that colours the board columns and stage
 * badges. Position in the lifecycle reads as darkness everywhere in the UI.
 *
 * **Counts in a grid are magnitude**, so the source × stage matrix uses a
 * five-bin sequential ramp, darker meaning more.
 */

/** The single hue every nominal bar wears. Mid-point of the lifecycle ramp. */
export const ACCENT = "#2a78d6";

/** Five sequential bins for the heat matrix, lightest to darkest. */
export const HEAT_FILL = ["", "#e5eefb", "#c3d9f5", "#8fb8ea", "#4d8ede", "#1c5cab"];

/** Text colour that clears contrast on each heat bin. */
export const HEAT_INK = ["", "#1e293b", "#1e293b", "#0f172a", "#ffffff", "#ffffff"];

/** The neutral track a bar sits in. */
export const TRACK = "#eef2f7";

/**
 * Rank colours for the top-N-plus-Other donuts.
 *
 * These slices ARE identity (a wedge has no length to lean on the way a bar
 * does), so unlike the nominal bars above they need real hue separation — the
 * first three slots of the validated categorical palette, the only ones that
 * clear the all-pairs CVD floor in both modes (slots 4+ fail once yellow and
 * orange share a screen). Colour is assigned by rank, not by source identity,
 * because no fixed per-source mapping survives filtering with only three safe
 * slots for eight sources; each wedge carries its own label in the legend so
 * a reader is never asked to remember "blue means LinkedIn" across a re-filter.
 */
export const RANK_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"];

/** The folded "everything else" wedge — deliberately outside the identity ramp. */
export const OTHER_COLOR = "#94a3b8";
