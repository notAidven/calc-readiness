/**
 * D4 mini-lessons (Polynomials & Quadratics), authored for the CLASSICAL ERA. One JSON pack per
 * node in `content/lessons/d4/*.json`, loaded here via `import.meta.glob`, mirroring `d1.ts`,
 * `d2.ts`, `d3.ts`, `d5.ts`, `d7.ts` and `d8.ts`. Paragraphs are Markdown with `$...$` math and
 * render through `LessonProse`.
 *
 * `NODE_ORDER` is the prerequisite order the chapter reads in, and it now spans THREE eras.
 * `getEraNodes("classical")`'s five come first — multiply, factor, solve by factoring, solve
 * when factoring will not do, divide — then Early Modern's two graph-reading nodes, which is
 * where they belong in the reading as well as in the graph: end behavior needs the leading
 * term multiplication gives you, and graph analysis needs the factored forms POL.2 produces.
 * `POL.5` closes the chapter from the Industrial era, and it reads last for a reason of its
 * own rather than by era number: a parabola's vertex, intercepts and extreme value are the
 * graph-reading moves of the two before it, narrowed to the one degree where every part of the
 * curve can be named exactly.
 *
 * A `content/lessons/<domain>/` directory is a file-layout fact and an era is a grouping over
 * nodes; the two do not coincide here and are not meant to. This chapter is the clearest case
 * of that in the tree.
 */

import type { LessonContent } from "./types";

const packs = import.meta.glob<LessonContent>("../../../../content/lessons/d4/*.json", {
  eager: true,
  import: "default",
});

/** Canonical display order for the Polynomials chapter (glob keys are alphabetical). */
const NODE_ORDER = ["POL.1", "POL.2", "POL.3", "POL.4", "POL.8", "POL.6", "POL.7", "POL.5"];

const byNode: Record<string, LessonContent> = {};
for (const lesson of Object.values(packs)) {
  byNode[lesson.node_id] = lesson;
}

export const d4Lessons: readonly LessonContent[] = NODE_ORDER.map(
  (id) => byNode[id],
).filter((lesson): lesson is LessonContent => Boolean(lesson));

export const d4LessonByNode: Readonly<Record<string, LessonContent>> = byNode;
