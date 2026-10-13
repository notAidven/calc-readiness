/**
 * Wires the real lesson-practice pipeline for the in-browser demo: the pure-TS
 * lesson engine (`@cr/lesson`) driving the mastery service (`@cr/mastery-service`)
 * over the teammate's frozen practice bank (`@cr/item-bank`). Persistence is an
 * in-memory stand-in (no network/auth in the dev loop); the 4/5 mastery rule and
 * its constants come only from the service, never re-hardcoded here.
 */

import type { D1NodeId } from "@cr/components";
import {
  buildRandomizedD1PracticeSet,
  buildRandomizedD2PracticeSet,
  buildRandomizedD3PracticeSet,
  buildRandomizedD4PracticeSet,
  buildRandomizedD5PracticeSet,
  buildRandomizedD6PracticeSet,
  buildRandomizedD7PracticeSet,
  buildRandomizedD8PracticeSet,
  buildRandomizedD9PracticeSet,
  buildRandomizedD10PracticeSet,
  buildRandomizedInteractivePracticeSet,
  drawD1PracticeInstance,
  drawD2PracticeInstance,
  drawD3PracticeInstance,
  drawD4PracticeInstance,
  drawD5PracticeInstance,
  drawD6PracticeInstance,
  drawD7PracticeInstance,
  drawD8PracticeInstance,
  drawD9PracticeInstance,
  drawD10PracticeInstance,
  drawInteractivePracticeInstance,
  type FrozenItem,
  INTERACTIVE_DEMO_NODE,
  type ItemDifficulty,
} from "@cr/item-bank";
import {
  createLessonEngine,
  type LessonSession,
  type PracticeItemInstance,
} from "@cr/lesson";
import {
  createMasteryService,
  type MasteryService,
  type MasteryStateStore,
  type ResponseCorrectness,
  type StoredMastery,
  type SubmitAssessmentEvidenceResult,
} from "@cr/mastery-service";

import { createApiMasteryService, type MasteryApiConfig } from "./apiMasteryService";
import {
  checkerVersionForId,
  checkerVersionForItem,
  practiceChecker,
  practiceItemsById,
} from "./practiceChecker";

/**
 * Project a frozen bank item into an engine practice instance, tagging it with the
 * item's OWN `equivalence_checker_version` (v1 for text D1 items, v2 for interactive)
 * so the engine's client grade and the mastery recompute each route to the matching
 * checker. A text item still declares v1, so its mastery path is byte-for-byte the
 * one it had before.
 */
function toInstance(item: FrozenItem): PracticeItemInstance {
  return {
    // Keep item_id === item_version_id so the engine's client grade and the
    // service's authoritative recompute both resolve the same registered key.
    item_id: item.item_version_id,
    item_version: 1,
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItem(item),
    template_id: item.template_id,
    template_params: item.template_params,
  };
}

/**
 * True when a reveal→retry draw is a different problem than the one just shown: a new
 * item-version id AND a different prompt. Id-only avoid is the draw layer's job; this
 * is the UI hard gate so a missing avoid entry or a same-prompt twin cannot re-serve
 * the problem the student just revealed.
 */
export function isDistinctRetry(current: FrozenItem, next: PracticeItemInstance): boolean {
  if (next.item_version_id === current.item_version_id) {
    return false;
  }
  const nextFrozen = practiceItemsById.get(next.item_version_id);
  return nextFrozen !== undefined && nextFrozen.prompt !== current.prompt;
}

/**
 * Draw a fresh number-swapped instance for a reveal/retry, or undefined if exhausted.
 * `templateId` (the slot's shape) is preferred so a retry keeps the same problem shape
 * even when the cell holds more than one.
 */
export function drawFreshInstance(
  nodeId: D1NodeId,
  difficulty: ItemDifficulty,
  avoid: Iterable<string>,
  templateId?: string,
): PracticeItemInstance | undefined {
  const fresh = drawD1PracticeInstance(nodeId, difficulty, { avoid, templateId });
  return fresh ? toInstance(fresh) : undefined;
}

/**
 * Authoritative correctness recompute (server-side stand-in), reusing the versioned
 * practice checker. The response carries only the item id, so we look up that item's
 * OWN checker version and grade under it — a text item is recomputed at v1 (unchanged),
 * an interactive item at v2.
 */
const recomputeCorrectness: ResponseCorrectness = (response) =>
  practiceChecker({
    raw_answer: response.raw_answer,
    item_version_id: response.item_id,
    equivalence_checker_version: checkerVersionForId(response.item_id),
  }).client_correct;

/**
 * The remote mastery service, when the app is signed in against a real API.
 *
 * Module-level configuration rather than a parameter threaded through all thirteen
 * `PracticeSource` factories, following `configureAnswerChecker` — the same shape, for the
 * same reason: this is one process-wide fact about how the app was launched, not something
 * an individual practice set gets to choose. Null is the default and is what the demo, the
 * local dev loop and every test run on, so nothing reaches the network unless a composition
 * root has said so.
 */
let remoteMasteryService: MasteryService | null = null;

/**
 * Point practice submissions at the API, or (with `null`) back at the in-browser service.
 *
 * Called once from the composition root in account mode. The in-memory path is left exactly
 * as it was, because it is not a degraded version of this one: with no account there is
 * nowhere to persist a record TO, and computing the result locally is the honest behaviour
 * rather than a stand-in for something better.
 */
export function configureApiMasteryService(config: MasteryApiConfig | null): void {
  remoteMasteryService = config === null ? null : createApiMasteryService(config);
}

/** The in-browser service: recompute in the page, remember nothing past this session. */
function createLocalMasteryService() {
  return createMasteryService({
    store: createInMemoryStore(),
    recomputeCorrectness,
  });
}

/** A minimal in-memory persistence boundary for the demo (no DB in the browser loop). */
function createInMemoryStore(): MasteryStateStore {
  const mastery = new Map<string, StoredMastery>();
  const evidence = new Map<string, SubmitAssessmentEvidenceResult>();
  return {
    getMastery: (nodeId) => mastery.get(nodeId) ?? null,
    setMastery: (nodeId, value, completion_status) => {
      mastery.set(nodeId, { mastery: value, completion_status });
    },
    getEvidenceResult: (evidenceId) => evidence.get(evidenceId) ?? null,
    recordEvidenceResult: (evidenceId, result) => {
      evidence.set(evidenceId, result);
    },
  };
}

/** A started practice session plus the ids of its five initial instances. */
export interface WebPracticeSession {
  session: LessonSession;
  /** Item-version ids of the five opening instances, for seeding the retry dedup set. */
  initialInstanceIds: readonly string[];
}

/**
 * Build a started practice session for one node: a randomized five-slot set
 * (`buildRandomizedD1PracticeSet` — same 1×L1/2×L2/2×L3 mix and easy -> hard order,
 * but each slot drawn at random per (node, difficulty) so the opening problems vary
 * run to run), driven through the engine's stage machine. Teaching + CFU are owned by
 * `AdvisorLesson`, so we fast-forward those stages and hand back a session already in
 * `practice`. The initial instance ids are returned so the caller can seed its
 * shown-set dedup and keep retries from repeating an item used in another slot.
 */
export function createWebPracticeSession(nodeId: D1NodeId): WebPracticeSession {
  return startPracticeSession(nodeId, buildRandomizedD1PracticeSet(nodeId));
}

/** Drive a set of frozen items through the engine's stage machine into `practice`. */
function startPracticeSession(
  nodeId: string,
  frozen: readonly FrozenItem[],
): WebPracticeSession {
  const engine = createLessonEngine(remoteMasteryService ?? createLocalMasteryService());

  const items = frozen.map(toInstance);
  const session = engine.startLesson({ node_id: nodeId, items });

  session.startTeaching();
  session.submitCheckForUnderstanding(true);
  session.startPractice();

  return { session, initialInstanceIds: frozen.map((item) => item.item_version_id) };
}

/**
 * A practice surface's source of problems. It lets ONE set of practice components
 * (`LessonPractice` / `InfinitePractice`) drive either the shipped D1 pool or the
 * interactive demo pool through the very same engine + mastery path — the only thing
 * that varies is which pool the opening set and the reveal→retry draw come from.
 */
export interface PracticeSource {
  /** The node id the session runs under (a real D1 node, or the interactive demo node). */
  readonly nodeId: string;
  /** Build a started five-slot session for this source. */
  createSession(): WebPracticeSession;
  /** Draw a fresh number-swapped instance for a reveal/retry, or undefined if exhausted. */
  drawFresh(
    difficulty: ItemDifficulty,
    avoid: Iterable<string>,
    templateId?: string,
  ): PracticeItemInstance | undefined;
}

/** The default source: the shipped D1 practice pool for one node (behavior unchanged). */
export function d1PracticeSource(nodeId: D1NodeId): PracticeSource {
  return {
    nodeId,
    createSession: () => createWebPracticeSession(nodeId),
    drawFresh: (difficulty, avoid, templateId) =>
      drawFreshInstance(nodeId, difficulty, avoid, templateId),
  };
}

/**
 * The interactive demo source: the number_line pool under the synthetic demo node.
 * It proves the interactive infra runs the real practice flow end to end WITHOUT
 * touching any shipped D1 node's practice.
 */
export function interactivePracticeSource(): PracticeSource {
  return {
    nodeId: INTERACTIVE_DEMO_NODE,
    createSession: () =>
      startPracticeSession(INTERACTIVE_DEMO_NODE, buildRandomizedInteractivePracticeSet()),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawInteractivePracticeInstance(difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D2 source: the "Boomtown Square" practice pool for any of its four nodes (EXP.1,
 * RAD.1, RAD.2, RAD.3), not EXP.1 alone. Its text shapes grade through the v2 product
 * checker (positive exponents for EXP.1, simplified radicals for RAD.1 / RAD.2, exact
 * numeric values for RAD.3) and its build/convert shapes grade through the `expr_builder`
 * widget module, all via the same engine and mastery flow the D1 and interactive sources
 * use.
 */
export function d2PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () => startPracticeSession(nodeId, buildRandomizedD2PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD2PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D5 source: the "Verdigris Hold" crafting-guild practice pool for any of its six nodes
 * (RAT.1 to RAT.6). Every shape grades through the v2 product checker, via the same engine
 * and mastery flow the other sources use. RAT.1 to RAT.4 take the `rational_answer` path,
 * which compares the expression on its valid domain AND the excluded-value set; RAT.5 and
 * RAT.6 are asked for a domain, a feature or a solution set, so they answer in those types.
 */
export function d5PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () => startPracticeSession(nodeId, buildRandomizedD5PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD5PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D6 source: "The Gearwright's Menagerie" automata-workshop practice pool for any of its
 * 11 nodes (CG.1 and FUN.1 to FUN.10). Every shape grades through the v2 product checker, via
 * the same engine and mastery flow the other sources use.
 */
export function d6PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () => startPracticeSession(nodeId, buildRandomizedD6PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD6PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D7 source: the Linear Functions practice pool for any of its four nodes (LF.1 to
 * LF.4). Every shape grades through the v2 product checker, via the same engine and
 * mastery flow the other sources use. The answer types follow the question rather than a
 * house form: a slope or a prediction is numeric, a line or a model is asked for as the
 * right-hand side of `y = ...` and graded as an expression, a system's solution is a
 * point, and the classify families answer with a word.
 */
export function d7PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () => startPracticeSession(nodeId, buildRandomizedD7PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD7PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D3 source: the Linear Equations, Inequalities & Absolute Value practice pool. Every shape
 * grades through the v2 product checker, via the same engine and mastery flow the other sources
 * use. A weight or a count is numeric; "solve for x" answers as a solution set, including the
 * empty one where an absolute-value equation has no solution; a solved inequality answers as an
 * interval, and this is the first served pool to reach the plain interval field rather than the
 * set-builder one; and one LIN.6 shape answers in set-builder notation, because writing that form
 * is itself its graded skill.
 */
export function d3PracticeSource(
  nodeId: string,
  rng: () => number = Math.random,
): PracticeSource {
  return {
    nodeId,
    createSession: () =>
      startPracticeSession(nodeId, buildRandomizedD3PracticeSet(nodeId, rng)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD3PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D4 source: the Polynomials & Quadratics practice pool for the Classical era's five
 * nodes (POL.1, POL.2, POL.3, POL.4 and POL.8). Every shape grades through the v2 product
 * checker, via the same engine and mastery flow the other sources use. The answer types follow
 * the question rather than a house form: an expanded or divided-out polynomial answers as an
 * expression in standard form, a factored form answers as an expression that has to be fully
 * factored over the integers, "solve" answers as a solution set, and a remainder, a
 * discriminant or a completing constant answers as a plain number.
 */
export function d4PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () => startPracticeSession(nodeId, buildRandomizedD4PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD4PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D8 source: the Exponential & Logarithmic practice pool. Every shape grades through the
 * v2 product checker, via the same engine and mastery flow the other sources use. A count, a
 * remaining amount, an exponent or a base is numeric; a growth-or-decay verdict answers with
 * a word; and the two continuous-growth shapes answer with a decimal rounded to a declared
 * precision, because the checker has no `e` binding and so cannot grade an exact `e`
 * expression.
 */
export function d8PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () => startPracticeSession(nodeId, buildRandomizedD8PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD8PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D9 source: the Trigonometry practice pool. Every shape grades through the v2 product
 * checker, via the same engine and mastery flow the other sources use.
 *
 * Two limits of the answer grammar shaped what this pool can ask, and both are worth knowing
 * before adding a shape to it. Nothing symbolic in trigonometry grades — the expression
 * grammar has no trigonometric functions, so a key containing `sin` does not match even
 * itself — which is why every slot evaluates or names rather than rewrites. And neither a
 * roster nor an interval can parse a pi, which is why a single angle is asked in exact
 * radians while a SET of them is asked in degrees.
 *
 * Retry depth is uneven here in a way it is not elsewhere. Seven cells have a genuinely small
 * answer space (only three sines are exact and positive, and the sum and difference formulas
 * reach just two radicals), so they carry fewer replacement instances than the usual six.
 * `d9.test.ts` names each one with its measured ceiling.
 */
export function d9PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () => startPracticeSession(nodeId, buildRandomizedD9PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD9PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}

/**
 * The D10 source: the Geometry practice pool. Every shape grades through the v2 product
 * checker, via the same engine and mastery flow the other sources use. A length, an angle,
 * an area and a volume are all numeric, with the unit carried by the PROMPT rather than
 * typed, because the checker rejects a unit in a submitted answer outright; an exact
 * diagonal answers as a simplified radical written with `sqrt(...)`; and the one
 * exact-volume shape answers as an expression that declares `pi`, which is the only
 * spelling that binds the symbol.
 */
export function d10PracticeSource(nodeId: string): PracticeSource {
  return {
    nodeId,
    createSession: () =>
      startPracticeSession(nodeId, buildRandomizedD10PracticeSet(nodeId)),
    drawFresh: (difficulty, avoid, templateId) => {
      const fresh = drawD10PracticeInstance(nodeId, difficulty, { avoid, templateId });
      return fresh ? toInstance(fresh) : undefined;
    },
  };
}
