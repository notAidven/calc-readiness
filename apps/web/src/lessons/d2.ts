/**
 * D2 mini-lessons (Boomtown Square, the powers-and-roots island). Authored as one JSON pack per node in
 * `content/lessons/d2/*.json` and loaded here via `import.meta.glob`, mirroring `d1.ts`.
 * Paragraphs are Markdown with `$...$` math and render through `LessonProse`. All five
 * nodes ship, EXP.1 (exponent laws) plus RAD.1 / RAD.2 / RAD.3 / RAD.4 (roots, combining
 * and rationalizing, rational exponents, variable radicands), listed in NODE_ORDER so the
 * display order is stable.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d2/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for the Boomtown Square island (glob keys are alphabetical). */
const NODE_ORDER = ["EXP.1", "RAD.1", "RAD.2", "RAD.3", "RAD.4"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d2Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d2LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
