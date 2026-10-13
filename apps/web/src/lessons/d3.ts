/**
 * D3 mini-lessons (Linear Equations, Inequalities & Absolute Value). Authored as one JSON pack per
 * node in `content/lessons/d3/*.json` and loaded here via `import.meta.glob`, mirroring `d1.ts`,
 * `d2.ts`, `d5.ts`, `d7.ts` and `d8.ts`. Paragraphs are Markdown with `$...$` math and render
 * through `LessonProse`.
 *
 * `NODE_ORDER` lists LIN.1, LIN.3, LIN.4, LIN.5 and LIN.6, which is the whole of the domain's live
 * node set and the prerequisite order the chapter reads in. **LIN.2 is absent because its id is
 * RETIRED**: `packages/skill-graph/src/skill_graph.json` records `status: "retired"` and
 * `product_scope: "excluded"` on it, with the note "rational equations moved to RAT.6", so the
 * skill it used to name is authored in D5 and the id is never reused.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d3/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for the Bronze Age chapter (glob keys are alphabetical). */
const NODE_ORDER = ["LIN.1", "LIN.3", "LIN.4", "LIN.5", "LIN.6"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d3Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d3LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
