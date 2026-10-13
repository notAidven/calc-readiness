/**
 * D8 mini-lessons (Exponential & Logarithmic). Authored as one JSON pack per node in
 * `content/lessons/d8/*.json` and loaded here via `import.meta.glob`, mirroring `d1.ts`,
 * `d2.ts`, `d5.ts` and `d7.ts`. Paragraphs are Markdown with `$...$` math and render through
 * `LessonProse`.
 *
 * `NODE_ORDER` lists EL.1 to EL.6, the domain's authored node set, so the display order is
 * stable and a node's pack becomes visible the moment it lands.
 *
 * EL.6 was absent until 2026-07-30, on the reading that solving these equations needed the
 * arbitrary equation equivalence `docs/Answer_Equivalence_Spec.md` defers at §10. Measured
 * rather than assumed, that gate was mis-stated: solving `2^x = 8` submits `3`, not an
 * equation, so the answer shapes EL.6 actually needs are `numeric`, `precision` and
 * `solution_set`, all three of which the v2 checker already graded. The one genuine gap was a
 * roster holding exact symbolic members (`{ln 2, ln 3}`), which `compareSolutionSet` now
 * evaluates for items declaring `representation: "exact"`. Submitting an equivalent EQUATION
 * stays deferred, and nothing in EL.6 asks for one.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d8/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for exponentials and logarithms (glob keys are alphabetical). */
const NODE_ORDER = ["EL.1", "EL.2", "EL.3", "EL.4", "EL.5", "EL.6"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d8Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d8LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
