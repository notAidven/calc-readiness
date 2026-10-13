/**
 * D1 mini-lessons (teaching text only). The packs are authored as one JSON file per MVP
 * node in `content/lessons/d1/*.json` (1:1 with the six city buildings: NUM.S, NUM.F,
 * NUM.2, NUM.3, NUM.4, NUM.5) and loaded here via `import.meta.glob`. Paragraphs are
 * Markdown and may use **bold** and LaTeX math delimited by `$...$`; they render through
 * `LessonProse`. Practice items and check-for-understanding questions are out of scope for
 * now; the player shows a placeholder where the CFU will go.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d1/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order, matching the city buildings (glob keys are alphabetical). */
const NODE_ORDER = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d1Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d1LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
