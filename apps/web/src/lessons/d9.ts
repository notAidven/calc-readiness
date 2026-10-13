/**
 * D9 mini-lessons (Trigonometry). Authored as one JSON pack per node in
 * `content/lessons/d9/*.json` and loaded here via `import.meta.glob`, mirroring `d1.ts`,
 * `d2.ts`, `d5.ts`, `d7.ts` and `d8.ts`. Paragraphs are Markdown with `$...$` math and render
 * through `LessonProse`.
 *
 * `NODE_ORDER` lists TRG.1 to TRG.9, the domain's authored node set, so the display order is
 * stable and a node's pack becomes visible the moment it lands.
 *
 * Note what this file does NOT check. `import.meta.glob<LessonContent>` is a cast over JSON
 * rather than a structural validation, so a pack naming a visual id that `visuals.tsx` has
 * never heard of compiles clean and loads clean. The lesson-pack validator does not catch it
 * either, since it checks an id's suffix shape rather than registry membership. What catches
 * it is `visualsMath.test.tsx`, which derives its population from `allLessons` and renders
 * every id it finds — which is to say, only once this domain is registered in `domains.ts`.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d9/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for trigonometry (glob keys are alphabetical). */
const NODE_ORDER = [
  "TRG.1",
  "TRG.2",
  "TRG.3",
  "TRG.4",
  "TRG.5",
  "TRG.6",
  "TRG.7",
  "TRG.8",
  "TRG.9",
];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d9Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d9LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
