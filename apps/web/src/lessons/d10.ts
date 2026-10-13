/**
 * D10 mini-lessons (Geometry). Authored as one JSON pack per node in
 * `content/lessons/d10/*.json` and loaded here via `import.meta.glob`, mirroring `d1.ts`,
 * `d2.ts`, `d5.ts`, `d7.ts` and `d8.ts`. Paragraphs are Markdown with `$...$` math and
 * render through `LessonProse`.
 *
 * `NODE_ORDER` lists GEO.1 then GEO.2, which is both the graph's prereq order (GEO.2 lists
 * GEO.1) and the reading order: GEO.2 measures its figures with the relations GEO.1
 * establishes. Unlike D8, no node of this domain is held back — the whole authored node
 * set ships. See `docs/D10_Domain_Plan.md`.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d10/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for geometry (glob keys are alphabetical). */
const NODE_ORDER = ["GEO.1", "GEO.2"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d10Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d10LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
