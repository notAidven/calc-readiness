/**
 * D6 mini-lessons (The Gearwright's Menagerie, the automata-workshop island). Authored as
 * one JSON pack per node in `content/lessons/d6/*.json` and loaded here via
 * `import.meta.glob`, mirroring `d5.ts` and `d7.ts`. Paragraphs are Markdown with `$...$`
 * math and render through `LessonProse`.
 *
 * All 11 nodes are listed in NODE_ORDER so the display order is stable: CG.1 (the coordinate
 * plane), FUN.1 (function notation and evaluation), FUN.2 (domain and range), FUN.7
 * (composition), FUN.5 (average rate of change), FUN.3 (piecewise), FUN.8 (inverses), FUN.4
 * (reading graph features), FUN.9 (transformations and even/odd), FUN.10 (absolute-value
 * functions) and FUN.6 (the difference quotient). The order is the PREREQ order, not
 * alphabetical and not numeric: the plane and the function-machine chain come before the
 * graph-reading nodes that need them.
 *
 * All 11 packs are authored, so the glob resolves to 11 lessons and `domains.ts` registers
 * this module. See the `d6` entry there for the reachability constraint that decided when the
 * registration could land.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d6/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for the automata-workshop island, in prereq order. */
const NODE_ORDER = [
  "CG.1",
  "FUN.1",
  "FUN.2",
  "FUN.7",
  "FUN.5",
  "FUN.3",
  "FUN.8",
  "FUN.4",
  "FUN.9",
  "FUN.10",
  "FUN.6",
];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d6Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d6LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
