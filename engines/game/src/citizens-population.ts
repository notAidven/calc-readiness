import { PRACTICED_MASTERY } from "@cr/mastery-service";
import type { LessonStage, Mastery, PlacementEstimate } from "@cr/state-schema";

import {
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  type CitizenCapacity,
  capacityForNode,
  FOUNDING_POPULATION,
  HUB_DAYTIME_CAPACITY,
  populationGainMultiplierForNode,
  TESTED_OUT_PLACEMENT,
} from "./citizens-tuning";
import { deriveConstructionState } from "./construction";
import type { CitizenRoleId } from "./descriptors";

/**
 * The population and capacity arithmetic (pure, framework-free, no seed, no
 * individuals, no renderer).
 *
 * ONE DIAL, TWO TERMS (D-CIT2). Population is a pure function of learning state:
 * no clock, no capacity feedback, no way to farm people by building houses. The two
 * terms are the ones the design states — a practised skill brings people, and mastering
 * it brings more.
 *
 * ## BOTH TERMS ARE KEYED ON MASTERY NOW, and that is a ruling, not a tidy-up
 *
 * The first term used to fire on `construction_state === "complete"` alone, which is a
 * union including `lesson_stage === "done"` — so it fired on ATTENDANCE. The economy's
 * lesson grant had the same shape and lost it in the same change: currency is gated on
 * the mastery bar now (`LESSON_GRANT_MASTERY_BAR`), and **population had to move with it
 * or the solvency invariant would break at its foundation.** INV-ERA-4 rests on the
 * means arriving alongside the mouths; paying at the bar while housing people at
 * attendance is exactly a window where a learner has citizens and no material.
 *
 * So the first term now also requires `mastery >= PRACTICED_MASTERY` — a SCORED practice
 * set, which is the lowest thing that is evidence of learning rather than of turning up
 * (`masteryFromCorrectCount` never returns below 1 for a scored set, and nothing else
 * raises mastery). Population is therefore graded 0 / built / mastered across the four
 * mastery values, which is what "population scales with mastery level" means in
 * arithmetic.
 *
 * ## WHAT THIS COSTS: GROUNDED CORRECTION 2's test-out clause, deliberately
 *
 * That correction rejected a *strictly* mastery-keyed count on two grounds, and only one
 * of them survives:
 *
 *  - **The build beat is UNCHANGED.** *"Build Rowhouse Flats and part of the crowd walks
 *    over and moves in"* fires when the building finishes, and on the ordinary path a
 *    finished practice set writes mastery and `lesson_stage: "done"` in the same call
 *    (`citySession.advanceMasteryDev`, and `setStageDev`'s `built` stage writes
 *    `mastery: 1`). A below-bar finish is mastery 1, so it still brings its people. The
 *    correction's second ground is fully honoured.
 *  - **The test-out clause is OVERRULED.** A passed placement is pre-built to
 *    `lesson_stage: "done"` / `completion_status: "complete"` at **`mastery: 0`** before
 *    the learner has answered one item, and that node used to bring
 *    {@link CITIZENS_PER_COMPLETE_BUILDING} people. It now brings none until the learner
 *    scores a set. *"A building obtained by testing out is still a building, so it still
 *    houses people"* is the sentence being traded away, and what is bought is that the
 *    ONE state where mouths arrived with no possible means is gone: the economy already
 *    refuses to pay a tested-out node (its `practiced` conjunct, issue #102), so this was
 *    the single place the two derivations disagreed about whether learning had happened.
 *    A tested-out learner is not punished — nothing is taken away, they simply have the
 *    same crowd as any learner who has not practised yet, and one scored set brings the
 *    people the pre-build used to hand over.
 *
 * ## ⚑ 2026-08-04: THE TEST-OUT CLAUSE IS RESTORED, LARGER, AND THE PREMISE IS WHY
 *
 * The team lead, asked how to size a caught-up learner's figures: *"population should be
 * proportional to era always"*. So a third term joins the two above: a building the
 * DIAGNOSTIC handed over holds the crowd a mastered one holds, from the moment it is
 * placed. {@link CitizenBuildingLedger.inherited} is that signal and
 * {@link TESTED_OUT_PLACEMENT} is the bar it reads.
 *
 * **This does not reopen the paragraph above. It answers it, because the premise moved.**
 * The clause was overruled for exactly one reason, stated in its own words: *"the ONE state
 * where mouths arrived with no possible means"*. INV-ERA-4 rests on the means arriving
 * alongside the mouths, and a tested-out learner's means could not arrive, because the earn
 * table pays on practice evidence they do not carry. That is no longer true. #558 seeds a
 * caught-up learner the **cheapest closing city of every age the diagnostic handed over** —
 * the same model INV-ERA-4 measures solvency against, cross-checked against
 * `ERA_LAND_DEMAND`'s ten authored figures. The means now arrive with the mouths, in kind
 * rather than in currency, and `caughtUpCityHasItsPeople.test.tsx` measures that they
 * outrun them at every placement rather than leaving it as an argument.
 *
 * **Three things this deliberately does NOT do**, because only the population was reopened:
 *
 *  - **It grants no mastery.** `mastery` is untouched, so the lesson, the practice set, the
 *    era trial, the completion ceremony, the stars and the economy's lesson grant are all
 *    exactly where they were. The crowd is a fact about the CITY; mastery is a fact about
 *    the LEARNER, and the diagnostic handed over one of them.
 *  - **It leaves `complete` and `mastered` meaning what they mean.** Both still require a
 *    scored set, so `roster.settled` (*"every skill mastered"*) stays FALSE for a caught-up
 *    learner, and so does the skill buildings' D-ERA7 amenity term, which #558 measured as
 *    part of the gap and which is not this change's to close.
 *  - **It does not fire on attendance.** The first bullet of the 2026-07-30 ruling — the
 *    build term used to fire on `lesson_stage === "done"` alone — is untouched. `done` at
 *    mastery 0 on a placement the learner FAILED still brings nobody.
 *
 * **It is monotone, and that is what forces the bar to be the placement rather than the
 * absence of practice.** `placement_estimate` is immutable after onboarding (Contracts §1),
 * so a handed-over node stays handed over: practising it to mastery 1 keeps it at the full
 * figure instead of dropping it to the built one. A signal that switched off on the first
 * practice set — `tested_out`, or `mastery < PRACTICED_MASTERY` — would take four people
 * away from a learner for practising, which D-CIT6 forbids and
 * `citizens-invariants.test.ts` sweeps 4096 vectors for.
 *
 * PLACED AND PRACTISED, not complete-in-state (D-CIT10). `citySession.seedFromPlacement`
 * clears `placements`, so a learner who tested out of everything has six nodes
 * complete in `student_node_state` and ZERO buildings standing. Counting state alone
 * would put 44 people on a bare island, assigned to homes that do not exist. Both
 * population and capacity read the SAME set, which is what makes the settled ending
 * hold for a tested-out learner too — and it is why the mastery floor is applied to
 * `residence_capacity` as well: a pre-built node with homes and nobody in them would
 * read hollow, which is the failure `ENDGAME_SPARE_HOMES` exists to prevent.
 *
 * MONOTONE BY CONSTRUCTION. Mastery is monotone (`mastery-service` writes
 * `max(existing, evidenced)`) and placement is monotone (a building is never
 * unplaced), so every total here can only rise. That is the machine-checkable half of
 * "nobody is ever punished" (D-CIT6) and of the no-eviction guarantee. The mastery floor
 * strengthens it rather than threatening it: both terms are now monotone in the same
 * single variable.
 *
 * ## MONOTONE IN LEARNING STATE, which is narrower than it used to mean (2026-07-31)
 *
 * The paragraph above is kept because it is true of everything in this file: nothing a
 * LEARNER can do lowers a term here, and that is still the property D-CIT6 needs. What is
 * withdrawn is the wider reading — that capacity therefore never falls at all.
 *
 * The team lead ruled that a mid-era crisis takes capacity and that the people it was
 * holding leave: *"people leave because there's a reduction of the capacity […] but they'll
 * come back if you increase capacity via the civic buildings"* (D-CRISIS-28, and the
 * citizens design's AMENDMENT 3). So capacity has a **second mover**, and
 * `citizens.ts`'s `min(population, capacity)` may go down. The no-eviction guarantee is
 * scoped to learning events from here on; `citizens.ts` carries the amended argument at the
 * line that turns on it.
 *
 * **Nothing in this file implements that, and nothing here should.** `residenceCapacity` is
 * a sum over SKILL NODES — `capacityForNode` returns all zeros for any id outside the six,
 * so a purchased civic building contributes nothing to it, and a crisis cannot lower it
 * without undoing mastery, which the failure floor forbids. The capacity the ruling's lever
 * actually moves is the economy package's `livability`. Reconciling the two ledgers is a
 * decision the design has asked for twice and never made (O-20 in
 * `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`), and it changes what
 * "settled" means, so it is not a penalty term to add here in passing.
 */

/** Everything the arithmetic needs about one node. The caller supplies the role. */
export interface CitizenNodeInput {
  readonly node_id: string;
  /**
   * The social role, resolved from the neighborhood descriptor by
   * `resolveNeighborhood` and carried on `CityBuildingView` (D-CIT17). The caller
   * passes it through; it never looks one up. Capacity is keyed separately by id.
   */
  readonly citizen_role: CitizenRoleId;
  /** Does this building STAND on the island? (D-CIT10 — the load-bearing field.) */
  readonly placed: boolean;
  readonly mastery: Mastery;
  readonly lesson_stage: LessonStage;
  readonly placement_estimate: PlacementEstimate;
  /** Per-node authoring completeness; absent defaults to true (`construction.ts`). */
  readonly authoring_complete?: boolean;
}

/** One building's derived social standing: what it is, and how many it holds. */
export interface CitizenBuildingLedger {
  readonly node_id: string;
  /** Passed through from `CitizenNodeInput.citizen_role`, never looked up here. */
  readonly role: CitizenRoleId;
  /**
   * Placed, `construction_state === "complete"`, AND `mastery >= PRACTICED_MASTERY`.
   *
   * The mastery floor is the 2026-07-30 change and the field name is deliberately
   * unchanged: this has always meant "the building is finished and holds people", and
   * what moved is which signal proves it. A tested-out pre-build (complete at mastery 0)
   * no longer qualifies.
   */
  readonly complete: boolean;
  /** `complete` AND `mastery >= 2` (D-CIT11). Gold (3) is not a third tier. */
  readonly mastered: boolean;
  /**
   * **THE DIAGNOSTIC HANDED THIS BUILDING OVER**: it is placed, it reads finished, and its
   * plot passed the placement check at {@link TESTED_OUT_PLACEMENT} or better.
   *
   * It is a fact about the CITY the learner walked into, never about what they know, and
   * that is the whole of the split: {@link complete} and {@link mastered} keep meaning
   * "the learner scored a set" and "the learner cleared the bar", and this one means "the
   * building was standing when they got here". A node can be both, and usually ends up
   * both, since practising a handed-over skill leaves the placement where it was.
   *
   * **It is INDEPENDENT of the two above rather than a third rung of them**, which is what
   * lets the population read the city while `roster.settled`, the amenity term, the trial
   * gate and the stars go on reading the learner.
   */
  readonly inherited: boolean;
  /** Homes here NOW: mastered or inherited -> mastered figure, complete -> built, else 0. */
  readonly residence_capacity: number;
  /** Daytime seats here NOW: complete -> the node's figure, else 0. No mastery term. */
  readonly daytime_capacity: number;
}

/**
 * The full crowd a building holds once its skill is MASTERED — the two terms together,
 * which is also what a handed-over building holds from the moment it is placed.
 */
const CITIZENS_PER_MASTERED_BUILDING =
  CITIZENS_PER_COMPLETE_BUILDING + CITIZENS_PER_MASTERED_SKILL;

/**
 * What one building adds to the crowd, denominated at its era's economy scale.
 *
 * The three cases in one expression rather than two independent counters, because the
 * inherited term is a MAXIMUM and not an addition: a handed-over node that is also
 * practised must be paid once, at the larger figure, or a learner would gain four people
 * for practising something the diagnostic had already credited.
 *
 * The era multiplier is read from the node rather than from the standing city. In the
 * archipelago those are the same era; on the retained single-island fallback this preserves
 * the built era of every accumulated skill, just as its material grant and frozen building do.
 */
function peopleFor(entry: {
  node_id: string;
  complete: boolean;
  mastered: boolean;
  inherited: boolean;
}): number {
  const multiplier = populationGainMultiplierForNode(entry.node_id);
  if (entry.mastered || entry.inherited) {
    return CITIZENS_PER_MASTERED_BUILDING * multiplier;
  }
  return entry.complete ? CITIZENS_PER_COMPLETE_BUILDING * multiplier : 0;
}

/**
 * Homes here now.
 *
 * **Inherited reads as mastered, and D-CIT10 is why it has to.** GROUNDED CORRECTION 3
 * requires population and capacity to come from the SAME set, so that the two cannot come
 * apart and a city can never hold a crowd assigned to homes that do not exist. Paying the
 * crowd out of {@link peopleFor} and not the homes out of here would be exactly that
 * splitting. It also retires the one reason the 2026-07-30 floor was applied to this
 * function in the first place: *"a pre-built node with homes and nobody in them would read
 * hollow"*. There is somebody in them now.
 */
function residenceFor(
  capacity: CitizenCapacity,
  entry: { complete: boolean; mastered: boolean; inherited: boolean },
): number {
  if (entry.mastered || entry.inherited) {
    return capacity.residence_mastered;
  }
  return entry.complete ? capacity.residence_built : 0;
}

/**
 * Derive the per-building ledger from raw node state. The placed-and-complete rule
 * lives HERE, in one place, so no caller can key the population on state alone.
 */
export function buildingLedger(
  nodes: readonly CitizenNodeInput[],
): readonly CitizenBuildingLedger[] {
  return nodes.map((node) => {
    const capacity = capacityForNode(node.node_id);
    // The SAME construction rule the stars, the storm copy, and the roster agree on.
    const constructionState = deriveConstructionState(
      {
        mastery: node.mastery,
        lesson_stage: node.lesson_stage,
        placement_estimate: node.placement_estimate,
      },
      { authoring_complete: node.authoring_complete ?? true },
    );
    // BOTH TERMS READ MASTERY. The construction check is kept beside the floor rather
    // than replaced by it, because it carries two facts mastery does not: `placed`
    // (D-CIT10) and `authoring_complete` (a preview node can never complete).
    const standing = node.placed && constructionState === "complete";
    const complete = standing && node.mastery >= PRACTICED_MASTERY;
    const mastered = complete && node.mastery >= 2;
    // THE SECOND EVIDENCE OF LEARNING, read off the one signal a tested-out node carries
    // that attendance cannot forge. See the file header's 2026-08-04 section.
    const inherited = standing && node.placement_estimate >= TESTED_OUT_PLACEMENT;
    return {
      node_id: node.node_id,
      role: node.citizen_role,
      complete,
      mastered,
      inherited,
      residence_capacity: residenceFor(capacity, { complete, mastered, inherited }),
      daytime_capacity: complete ? capacity.daytime : 0,
    };
  });
}

/**
 * The island's population: the founding crowd, plus an ERA-SCALED term per PRACTISED
 * building, a LARGER era-scaled term per mastered skill, and that same larger term for every
 * building the diagnostic HANDED OVER (the 2026-08-04 ruling in the file header).
 *
 * Still un-gameable: you cannot wait for people (no clock), and you cannot farm them by
 * building houses (no capacity feedback). What testing out buys is the crowd of the age
 * you were placed past, alongside that age's civic buildings, and nothing else.
 */
export function citizenPopulation(ledger: readonly CitizenBuildingLedger[]): number {
  let people = FOUNDING_POPULATION;
  for (const entry of ledger) {
    people += peopleFor(entry);
  }
  return people;
}

/**
 * Total homes on the island. A constant SUM over the buildings, so its full-mastery
 * value is independent of the order they were finished in — which is why
 * `population(all mastered) === capacity(all mastered)` is order-independent rather
 * than a property that survives only the common path (design section 8.4).
 */
export function residenceCapacity(ledger: readonly CitizenBuildingLedger[]): number {
  return ledger.reduce((total, entry) => total + entry.residence_capacity, 0);
}

/**
 * Total daytime seats, INCLUDING the hub's small staff — the hub is pre-seeded and
 * always built on every island, so this is never zero. It decides how busy the city
 * looks by day and has NO bearing on who is waiting for a home.
 */
export function daytimeCapacity(ledger: readonly CitizenBuildingLedger[]): number {
  return (
    HUB_DAYTIME_CAPACITY +
    ledger.reduce((total, entry) => total + entry.daytime_capacity, 0)
  );
}
