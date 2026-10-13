/**
 * Era-specific theming vocabulary for D6 lesson PRACTICE prompts.
 *
 * D6's island is **The Gearwright's Menagerie**, an automata workshop laid out on a survey
 * grid (`docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md`), hue Eucalyptus
 * `#7E9C8B`. Its 11 nodes span THREE eras, which is why the vocabulary is split rather than
 * given as one word list: a Renaissance surveying lesson and an Atomic Age telemetry lesson
 * should not read alike even on the same island.
 *
 *  - **Renaissance** (CG.1): the survey yard outside the workshop. Sighting rods, a chalked
 *    grid, a plumb line, paces stepped off between two stakes.
 *  - **Industrial** (FUN.1, FUN.2, FUN.3, FUN.7, FUN.8): the workshop floor. An automaton is
 *    a machine fed one setting and returning one motion: a dial, an intake, a linkage, two
 *    machines coupled in series, a machine run backwards.
 *  - **Atomic Age** (FUN.4, FUN.5, FUN.6, FUN.9, FUN.10): the telemetry loft. Traces on a
 *    chart recorder, a reading per hour, a peak and a trough, a trace folded about an axis.
 *
 * Hard rules for callers, the same ones `d5/theming.ts` states:
 *  - Theme the PROMPT string only. Never let the theme change `answer`, `params`,
 *    `difficulty`, or the worked solution.
 *  - A learner who ignores the workshop entirely must still read the mathematical task.
 *  - Scenario wording is frozen into the prompt at `generate()` time.
 */

/** The island's display name, so no prompt has to spell it a second way. */
export const D6_ISLAND = "The Gearwright's Menagerie";

/** Renaissance-era nouns: CG.1's survey yard, where the plane is chalked out and paced. */
export const SURVEY_YARD_NOUNS: readonly string[] = [
  "sighting rod",
  "chalked grid",
  "plumb line",
  "corner stake",
  "pace",
];

/** Industrial-era nouns: the workshop floor, where a function is a machine. */
export const WORKSHOP_NOUNS: readonly string[] = [
  "automaton",
  "setting dial",
  "intake",
  "linkage",
  "output arm",
  "governor",
];

/** Atomic Age nouns: the telemetry loft, where a function is a trace on a chart. */
export const TELEMETRY_NOUNS: readonly string[] = [
  "chart recorder",
  "trace",
  "reading",
  "peak",
  "trough",
  "sweep",
];

/** Which era's vocabulary a D6 node draws on. Mirrors `eras.ts`, kept here for authoring. */
export const D6_NODE_ERA: Readonly<
  Record<string, "renaissance" | "industrial" | "atomic">
> = {
  "CG.1": "renaissance",
  "FUN.1": "industrial",
  "FUN.2": "industrial",
  "FUN.3": "industrial",
  "FUN.7": "industrial",
  "FUN.8": "industrial",
  "FUN.4": "atomic",
  "FUN.5": "atomic",
  "FUN.6": "atomic",
  "FUN.9": "atomic",
  "FUN.10": "atomic",
};

/** The noun list a node's prompts should draw from, by its era. */
export function nounsForNode(nodeId: string): readonly string[] {
  switch (D6_NODE_ERA[nodeId]) {
    case "renaissance":
      return SURVEY_YARD_NOUNS;
    case "atomic":
      return TELEMETRY_NOUNS;
    default:
      return WORKSHOP_NOUNS;
  }
}
