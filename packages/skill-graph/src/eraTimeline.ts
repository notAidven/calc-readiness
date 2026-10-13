/**
 * WHAT AN ERA IS ABOUT, IN WORDS A LEARNER CAN READ — and where the city stands.
 *
 * `eras.ts` answers "which nodes, in what order, on how much land". It says nothing a
 * learner could be shown. This module is the other half: the ten eras as ten chapters
 * of a curriculum, each with a short concept label and a summary of the mathematics
 * and the world it is set in, plus the derivation that decides which chapter the city
 * is currently in.
 *
 * ## Why this is a sibling of `eras.ts` rather than four more fields on `EraDefinition`
 *
 * Two reasons, and the second outlives the first.
 *
 *  1. `eras.ts` is contended. The end-of-era progression work reads and extends it, and
 *     display copy landing in the same file buys a merge conflict over a table nobody
 *     needed to move.
 *  2. The two halves change for different reasons and are reviewed by different people.
 *     A node set moving between eras is a curriculum decision, gated by the invariants
 *     in `eras.test.ts` and by the prerequisite graph. Rewording a summary is copy,
 *     reviewed by reading it. Keeping them apart means a copy edit cannot touch a
 *     structural table, and a curation change cannot silently reword what a learner
 *     reads.
 *
 * What is NOT duplicated here is the sequence itself. There is no ordinal, no second
 * list of era ids, and no era name: the timeline is built by walking `ERA_SEQUENCE`,
 * so this module cannot disagree with it about the order or the membership (INV-ERA-5).
 * `ERA_SUMMARIES` is keyed by `EraId` as a TOTAL record, so an eleventh era is a
 * compile error here rather than a blank card in the game.
 *
 * ## The domain is bookkeeping and a learner never meets it
 *
 * An era is a curated node set, not a domain (D-ERA3). Three eras hold more than one
 * domain and one domain spans three eras, so "the Polynomials era" is false as well as
 * unreadable. Every label below is therefore written from what the era TEACHES —
 * "shapes, and putting them on axes" rather than the two domain ids that supply those
 * nodes. `eraTimeline.test.ts` sweeps every string here for a domain id and for a node
 * id and fails on either, because the tell that copy has drifted back to the
 * bookkeeping axis is that an id appears in it. `EraDefinition.rationale` is the
 * counter-example and the reason the sweep exists: it is a good field, it explains the
 * curation to a maintainer, and it is unshowable — it cites `POL.5`, `CG.1` and the
 * hard edges between them.
 *
 * ## Where the words come from
 *
 * The world half of each summary follows the "Why here" column of §3 in
 * `docs/superpowers/specs/2026-07-27-era-progression-design.md`, which is the approved
 * and merged authority for what each era is thematically. The mathematics half is read
 * off the era's own node set in `eras.ts` against the node descriptions in
 * `docs/Node_Spine_v4.md`, so a summary describes the lessons the era actually
 * contains rather than the domain it roughly corresponds to.
 *
 * Deliberately NOT sourced from `docs/superpowers/specs/eras/`. Those ten folders are
 * the art brief: materials, silhouettes, ornament, the advisor, the island. They
 * describe how an era LOOKS, which is not what a timeline row says, and nine of the ten
 * are marked PROPOSED and under active revision. Copy taken from them would be copy
 * that changes when a roof does.
 */

import { ERA_SEQUENCE, type EraDefinition, type EraId } from "./eras";

/** One era's learner-facing copy. The name is `EraDefinition.name` and is not repeated. */
export interface EraSummary {
  /**
   * A short, scannable line for what the era is about — the thing a timeline row shows
   * under the era's name, and the slot the domain would occupy if a domain were a
   * legible answer. Sentence case, no trailing period, no proper nouns.
   */
  readonly concept: string;
  /**
   * One or two sentences: the mathematics the era teaches, then the world it is set in.
   * Written to be read cold by someone who has played none of it, because for every
   * learner today nine of these are eras they have never seen.
   */
  readonly summary: string;
}

/**
 * The ten, in the same concepts `ERA_SEQUENCE` groups the nodes into.
 *
 * A TOTAL `Record<EraId, ...>` on purpose: an era added to the sequence without copy
 * would otherwise render as a nameless gap in the middle of the timeline, and this way
 * it does not compile.
 */
export const ERA_SUMMARIES: Readonly<Record<EraId, EraSummary>> = {
  prehistoric: {
    concept: "counting, sharing, and doing it in the right order",
    summary:
      "Negatives, fractions and percents, and the agreed order of operations that " +
      "makes two people working separately reach the same answer. Arithmetic careful " +
      "enough to settle an argument: a tally cut into a bone, a kill divided six ways.",
  },
  neolithic: {
    concept: "growth by a factor, and the way back",
    summary:
      "Powers as repeated multiplication and roots as their undoing, including the " +
      "fractional exponents that turn each into the other. The first quantities on the " +
      "island that grow by a factor rather than by an amount: seed that multiplies, a " +
      "grain store that doubles, a harvest that scales.",
  },
  bronze_age: {
    concept: "finding one unknown by keeping both sides equal",
    summary:
      "Solving for a single unknown, rearranging a formula to give up whichever " +
      "quantity you actually want, and saying when something is merely larger rather " +
      "than equal. Trade across a balance scale: what weight of tin balances this copper.",
  },
  classical: {
    concept: "many terms at once, multiplied out and taken apart",
    summary:
      "Multiplying several terms together, factoring them back, dividing one " +
      "expression by another, and solving the squares that come out of it. The algebra " +
      "that can be done on a wax tablet, where a product really is an area and " +
      "completing the square means completing a square.",
  },
  medieval: {
    concept: "fractions whose top and bottom are whole expressions",
    summary:
      "Cancelling, multiplying, adding over a common denominator, stacking one " +
      "fraction inside another, and solving the equations they make while throwing out " +
      "the answers that quietly divide by zero. Guild ledgers, tithes, and land divided " +
      "into shares.",
  },
  renaissance: {
    concept: "shapes, and putting them on axes",
    summary:
      "Triangles, areas and volumes first, then the coordinate plane that turns a " +
      "position into a pair of numbers. Once there are axes a curve can be read: where " +
      "it crosses, where it turns, and where it runs away. Perspective, surveying, and " +
      "a dome whose shape is settled by the circle it stands on.",
  },
  industrial: {
    concept: "a machine that turns an input into an output",
    summary:
      "What a machine may be fed and what it hands back, what a rule that changes " +
      "partway looks like, what two machines in series do, and what it means to run one " +
      "backwards. Railways set out on plotted grids, and the first curve drawn on real " +
      "axes rather than solved on paper.",
  },
  atomic_age: {
    concept: "how fast something is changing",
    summary:
      "Slope read as a rate, the average rate of change across an interval, and the " +
      "difference quotient that calculus itself opens with, alongside reading the " +
      "features of a graph and shifting, flipping and stretching it. The century that " +
      "measured everything per hour.",
  },
  information_age: {
    concept: "doubling, and the scale that tames it",
    summary:
      "Quantities that multiply at every step, and the logarithm that reads such a " +
      "scale back as an ordinary number, so amounts millions apart fit on one page. " +
      "Transistors doubling, and orders of magnitude.",
  },
  cyberpunk: {
    concept: "angles, circles, and anything that repeats",
    summary:
      "Angles measured around a circle, the ratios hiding in a right triangle, and the " +
      "waves those ratios trace once the circle is unrolled, with the identities and " +
      "equations that come with them. Signals, rotation, and everything a screen has to " +
      "draw.",
  },
};

/** The copy for an era. Total over `EraId`, so this cannot miss. */
export function eraSummary(eraId: EraId): EraSummary {
  return ERA_SUMMARIES[eraId];
}

/**
 * Where an era sits relative to the city.
 *
 * `current` is the chapter the city is IN, which is not the same as the furthest era
 * holding any progress — see `buildEraTimeline`.
 */
export type EraStanding = "complete" | "current" | "ahead";

/** One row of the timeline: an era, its copy, and how far into it the city is. */
export interface EraTimelineEntry {
  readonly era: EraDefinition;
  /** 1-based play position, from `ERA_SEQUENCE` order and nothing else. */
  readonly number: number;
  readonly concept: string;
  readonly summary: string;
  readonly standing: EraStanding;
  /** How many of this era's nodes the learner has mastered. */
  readonly masteredCount: number;
  /** How many nodes this era holds. Never zero — the pacing band's floor is 3. */
  readonly nodeCount: number;
}

/** The whole timeline, and the marker's position on it. */
export interface EraTimelineView {
  readonly entries: readonly EraTimelineEntry[];
  /**
   * The era the city is in: the FIRST era not yet fully mastered. `null` only when
   * every era is complete, which is the one state with no chapter left to be in.
   */
  readonly currentEraId: EraId | null;
  /** The 1-based position of `currentEraId`, or `null` when the sequence is finished. */
  readonly currentNumber: number | null;
  /** Mastered nodes across the whole sequence. Zero is the ordinary state today. */
  readonly masteredTotal: number;
  /** Every node of every era mastered. `currentEraId` is `null` exactly here. */
  readonly allComplete: boolean;
}

/**
 * Build the timeline for a learner who has mastered exactly `masteredNodeIds`.
 *
 * ## Which signal, and why this one
 *
 * The caller passes node ids already filtered to MASTERED, because mastery is the gate
 * the era model actually uses: D-ERA5 advances the era on "mastering every skill in the
 * era" and D-ERA16's trial unlocks on the same condition, which in code is
 * `isNeighborhoodReady`'s `mastery >= 2` (`engines/game/src/neighborhood.ts`). This
 * package holds no student state and must not learn about `StudentNodeState`, so the
 * bar is applied by the caller — and `apps/web/src/city/eraTimelineView.ts` pins its
 * bar directly against `isNeighborhoodReady` so the two cannot drift.
 *
 * ## The marker is the earliest gap, not the furthest progress
 *
 * D-ERA17: a learner "starts at the earliest era whose domain they have not mastered",
 * and later eras they have already mastered are BANKED rather than skipped. So an era
 * ahead of the marker may legitimately show every one of its skills mastered and still
 * be `ahead`: the diagnostic discharges lessons, never mastery and never a trial. A
 * derivation that took the furthest mastered era instead would read that banked
 * knowledge as progress the learner has not made, and it would place the marker past
 * eras they have never opened.
 *
 * ## The empty answer is a real answer
 *
 * With nothing mastered — every learner today, since the live diagnostic scopes to the
 * six D1 nodes and most of the sequence has no authored lessons to master — the marker
 * sits on era one with `masteredCount` 0, and the other nine are `ahead`. That is not a
 * degenerate case to guard against; it is the case the surface is designed for.
 *
 * Ids that belong to no era are ignored rather than counted, so a mastered node outside
 * the curated sets cannot inflate an era and move the marker.
 */
export function buildEraTimeline(masteredNodeIds: Iterable<string>): EraTimelineView {
  const mastered = new Set(masteredNodeIds);

  const counted = ERA_SEQUENCE.map((era, index) => ({
    era,
    number: index + 1,
    masteredCount: era.nodes.filter((nodeId) => mastered.has(nodeId)).length,
  }));

  const currentIndex = counted.findIndex(
    ({ era, masteredCount }) => masteredCount < era.nodes.length,
  );
  const allComplete = currentIndex === -1;

  const entries = counted.map(({ era, number, masteredCount }, index): EraTimelineEntry => {
    const { concept, summary } = ERA_SUMMARIES[era.id];
    const standing: EraStanding = allComplete
      ? "complete"
      : index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "current"
          : "ahead";

    return {
      era,
      number,
      concept,
      summary,
      standing,
      masteredCount,
      nodeCount: era.nodes.length,
    };
  });

  const current = allComplete ? undefined : counted[currentIndex];

  return {
    entries,
    currentEraId: current?.era.id ?? null,
    currentNumber: current?.number ?? null,
    masteredTotal: counted.reduce((total, { masteredCount }) => total + masteredCount, 0),
    allComplete,
  };
}
