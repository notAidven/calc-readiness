/**
 * D5 mini-lessons (Verdigris Hold, the crafting-guild island). Authored as one JSON pack
 * per node in `content/lessons/d5/*.json` and loaded here via `import.meta.glob`, mirroring
 * `d1.ts` and `d2.ts`. Paragraphs are Markdown with `$...$` math and render through
 * `LessonProse`. All six nodes ship: RAT.1 (simplify + excluded values), RAT.2 (multiply and
 * divide), RAT.3 (add and subtract), RAT.4 (complex/nested fractions), RAT.5 (domain, holes
 * and asymptotes) and RAT.6 (rational equations and extraneous roots), listed in NODE_ORDER
 * so the display order is stable.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d5/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for the crafting island (glob keys are alphabetical). */
const NODE_ORDER = ["RAT.1", "RAT.2", "RAT.3", "RAT.4", "RAT.5", "RAT.6"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d5Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d5LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
