/**
 * D7 mini-lessons (Linear Functions). Authored as one JSON pack per node in
 * `content/lessons/d7/*.json` and loaded here via `import.meta.glob`, mirroring `d1.ts`,
 * `d2.ts` and `d5.ts`. Paragraphs are Markdown with `$...$` math and render through
 * `LessonProse`. All four nodes ship: LF.1 (slope as a constant rate of change, and
 * classifying a line's behavior), LF.2 (write and graph line equations, parallel and
 * perpendicular), LF.3 (build a linear model from a description or from data) and LF.4
 * (solve a 2x2 linear system), listed in NODE_ORDER so the display order is stable.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d7/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for linear functions (glob keys are alphabetical). */
const NODE_ORDER = ["LF.1", "LF.2", "LF.3", "LF.4"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d7Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d7LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
