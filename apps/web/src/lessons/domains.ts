/**
 * The all-domains lesson registry: the ONE place a lesson domain is declared, and the
 * single source every lesson surface reads (the city lesson host, the `?dev` lesson list,
 * the CFU checker, and practice). A domain contributes the lesson packs its module
 * discovers under `content/lessons/<id>/` via `import.meta.glob` plus the practice source
 * its nodes are drawn and graded through.
 *
 * Adding a domain is ONE entry below: every surface then picks it up automatically, because none
 * of them reach past this module into a single domain's pack. That is the defect this
 * module exists to prevent — D2 shipped fully authored but with zero importers, so its
 * lessons had no host lookup, no dev-view entry and no practice source, and a D2 lesson
 * that reached practice fell through to the D1 pool and threw.
 *
 * `lessonDomains.reachability.test.ts` fails if a `content/lessons/<id>/` folder has no
 * entry here, or if a registered lesson cannot build a gradable practice set.
 */

import type { D1NodeId } from "@cr/components";
import {
  D1_PRACTICE_NODES,
  D2_PRACTICE_NODES,
  D3_PRACTICE_NODES,
  D4_PRACTICE_NODES,
  D5_PRACTICE_NODES,
  D6_PRACTICE_NODES,
  D7_PRACTICE_NODES,
  D8_PRACTICE_NODES,
  D9_PRACTICE_NODES,
  D10_PRACTICE_NODES,
} from "@cr/item-bank";

import { d1LessonByNode, d1Lessons } from "./d1";
import { d2LessonByNode, d2Lessons } from "./d2";
import { d3LessonByNode, d3Lessons } from "./d3";
import { d4LessonByNode, d4Lessons } from "./d4";
import { d5LessonByNode, d5Lessons } from "./d5";
import { d6LessonByNode, d6Lessons } from "./d6";
import { d7LessonByNode, d7Lessons } from "./d7";
import { d8LessonByNode, d8Lessons } from "./d8";
import { d9LessonByNode, d9Lessons } from "./d9";
import { d10LessonByNode, d10Lessons } from "./d10";
import {
  d1PracticeSource,
  d2PracticeSource,
  d3PracticeSource,
  d4PracticeSource,
  d5PracticeSource,
  d6PracticeSource,
  d7PracticeSource,
  d8PracticeSource,
  d9PracticeSource,
  d10PracticeSource,
  type PracticeSource,
} from "./practiceSession";
import type { LessonContent } from "./types";

export interface LessonDomain {
  /** Stable domain key, and the `content/lessons/<id>/` folder its packs come from. */
  readonly id: string;
  /** Short display label for the dev surfaces, e.g. "D1". */
  readonly label: string;
  /** The domain's authored lessons, in its canonical display order. */
  readonly lessons: readonly LessonContent[];
  /** The same lessons keyed by node id. */
  readonly lessonByNode: Readonly<Record<string, LessonContent>>;
  /** The pool this domain's nodes practice + grade through. */
  readonly practiceSource: (nodeId: string) => PracticeSource;
  /** The item-bank nodes this domain can compose into practice. */
  readonly practiceNodes: readonly string[];
  /** True when this domain owns the node (it authored the lesson OR the practice pool). */
  readonly ownsNode: (nodeId: string) => boolean;
}

interface LessonDomainSpec extends Omit<LessonDomain, "ownsNode"> {
  /** The nodes the item bank serves practice for in this domain. */
  readonly practiceNodes: readonly string[];
}

/**
 * Derive `ownsNode` from what the domain actually ships. Both halves matter: a node is
 * claimed as soon as EITHER its lesson pack or its practice pool exists, so a domain is
 * dispatched correctly while its two halves land in separate PRs.
 */
function defineDomain(spec: LessonDomainSpec): LessonDomain {
  const owned = new Set<string>([...Object.keys(spec.lessonByNode), ...spec.practiceNodes]);
  return {
    id: spec.id,
    label: spec.label,
    lessons: spec.lessons,
    lessonByNode: spec.lessonByNode,
    practiceSource: spec.practiceSource,
    practiceNodes: spec.practiceNodes,
    ownsNode: (nodeId) => owned.has(nodeId),
  };
}

/** Every lesson domain the app can reach. A new domain is one entry here. */
export const LESSON_DOMAINS: readonly LessonDomain[] = [
  defineDomain({
    id: "d1",
    label: "D1",
    lessons: d1Lessons,
    lessonByNode: d1LessonByNode,
    practiceNodes: D1_PRACTICE_NODES,
    // The D1 pool is typed to its own node union; the id is a D1 node by construction.
    practiceSource: (nodeId) => d1PracticeSource(nodeId as D1NodeId),
  }),
  defineDomain({
    id: "d2",
    label: "D2",
    lessons: d2Lessons,
    lessonByNode: d2LessonByNode,
    practiceNodes: D2_PRACTICE_NODES,
    practiceSource: d2PracticeSource,
  }),
  defineDomain({
    id: "d3",
    label: "D3",
    lessons: d3Lessons,
    lessonByNode: d3LessonByNode,
    practiceNodes: D3_PRACTICE_NODES,
    practiceSource: d3PracticeSource,
  }),
  defineDomain({
    id: "d4",
    label: "D4",
    lessons: d4Lessons,
    lessonByNode: d4LessonByNode,
    practiceNodes: D4_PRACTICE_NODES,
    practiceSource: d4PracticeSource,
  }),
  defineDomain({
    id: "d5",
    label: "D5",
    lessons: d5Lessons,
    lessonByNode: d5LessonByNode,
    practiceNodes: D5_PRACTICE_NODES,
    practiceSource: d5PracticeSource,
  }),
  // D6 ("The Gearwright's Menagerie"), live from the commit that landed its 11 packs and
  // their practice templates together. The scaffold above it deliberately stayed unregistered
  // while 11 parallel authoring agents filled in leaf files, because a live entry costs real
  // practice templates: with the entry live and no `content/lessons/d6/` the folder-set
  // equality, the "at least one lesson" check and the generated reachability suite all fail,
  // and with a placeholder pack but no pool the next two fail instead ("d6 serves no L1 retry
  // for CG.1", then "not enough D6 practice instances for CG.1 L1"). That is why the scaffold
  // and the content are one commit rather than two.
  defineDomain({
    id: "d6",
    label: "D6",
    lessons: d6Lessons,
    lessonByNode: d6LessonByNode,
    practiceNodes: D6_PRACTICE_NODES,
    practiceSource: d6PracticeSource,
  }),
  defineDomain({
    id: "d7",
    label: "D7",
    lessons: d7Lessons,
    lessonByNode: d7LessonByNode,
    practiceNodes: D7_PRACTICE_NODES,
    practiceSource: d7PracticeSource,
  }),
  defineDomain({
    id: "d8",
    label: "D8",
    lessons: d8Lessons,
    lessonByNode: d8LessonByNode,
    practiceNodes: D8_PRACTICE_NODES,
    practiceSource: d8PracticeSource,
  }),
  defineDomain({
    id: "d9",
    label: "D9",
    lessons: d9Lessons,
    lessonByNode: d9LessonByNode,
    practiceNodes: D9_PRACTICE_NODES,
    practiceSource: d9PracticeSource,
  }),
  defineDomain({
    id: "d10",
    label: "D10",
    lessons: d10Lessons,
    lessonByNode: d10LessonByNode,
    practiceNodes: D10_PRACTICE_NODES,
    practiceSource: d10PracticeSource,
  }),
];

/** Every authored lesson, in domain order then each domain's display order. */
export const allLessons: readonly LessonContent[] = LESSON_DOMAINS.flatMap((domain) => [
  ...domain.lessons,
]);

/** Every authored lesson keyed by node id, across all domains. */
export const lessonByNode: Readonly<Record<string, LessonContent>> = Object.fromEntries(
  allLessons.map((lesson) => [lesson.node_id, lesson]),
);

/** The domain that owns a node, or undefined when no domain has claimed it. */
export function domainForNode(nodeId: string): LessonDomain | undefined {
  return LESSON_DOMAINS.find((domain) => domain.ownsNode(nodeId));
}

/**
 * The practice source for a node, dispatched by the domain that owns it. This is
 * `LessonPractice`'s DEFAULT, so no caller has to know (or remember) a node's domain to
 * open its practice set; callers that drive a pool of their own — the `?interactive`
 * demo — still pass an explicit `source`.
 *
 * An unclaimed node keeps the pre-dispatch behavior and falls back to the first domain's
 * source, whose "not enough practice instances" error names the node that has no pool.
 */
export function practiceSourceForNode(nodeId: string): PracticeSource {
  const domain = domainForNode(nodeId) ?? LESSON_DOMAINS[0];
  if (!domain) {
    throw new Error("no lesson domains are registered");
  }
  return domain.practiceSource(nodeId);
}

/**
 * The authoring predicate shown by the city and proven by the era release gate. A node is ready
 * only when both learner-facing halves exist: a lesson pack and a registered practice pool.
 */
export function isNodeAuthoringComplete(nodeId: string): boolean {
  const domain = domainForNode(nodeId);
  return (
    lessonByNode[nodeId] !== undefined && domain?.practiceNodes.includes(nodeId) === true
  );
}

/** Resolve the shared predicate for a city roster, preserving a server's explicit false. */
export function authoringCompletenessForNodes(
  nodeIds: readonly string[],
  server?: Readonly<Record<string, boolean>>,
): Readonly<Record<string, boolean>> {
  return Object.fromEntries(
    nodeIds.map((nodeId) => [
      nodeId,
      isNodeAuthoringComplete(nodeId) && (server?.[nodeId] ?? true),
    ]),
  );
}
