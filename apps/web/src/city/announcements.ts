import {
  type CityBuildingView,
  type CityStormView,
  type ConstructionState,
  capacityForNode,
  neighborhoodLabel,
} from "@cr/game";
import { PRACTICED_MASTERY } from "@cr/mastery-service";
import type { Mastery } from "@cr/state-schema";

import { skillDisplayName } from "../diagnostic/skillNames";
import { buildingName } from "./buildingAssets";
// No `ERA_ONE_CIVIC_TYPES` and no `civicTypeOf` here any more: since the selection
// sentence reads its two capacities through `civicContributions`, this module has stopped
// consulting the catalogue for a capacity at all. That absence is the single-source
// property made structural rather than promised — there is no longer a second reading
// here to drift from the popup's.
import { civicContributions, isCivicPlacement } from "./civic";
import type { PaletteVariant } from "./palette";
import { placementLabel, TOWN_HALL_LABEL } from "./townHall";
import type { StormAttemptResult } from "./types";
import type { PlacementRefusal } from "./worldLayout";

/**
 * Pure, deterministic copy helpers shared by the visible UI and the ARIA live
 * regions. Keeping them here (framework-free) makes the announcement wording and
 * the never-color-alone state labels unit-testable in isolation (design §9).
 *
 * NO ANNOUNCEMENT SPEAKS A RAW INTERNAL ID. The visible roster deliberately
 * keeps `NUM.*` out of the UI (`CitySurface.tsx`, the plot button's comment), so a
 * live region that reads "Placed NUM.3 (Workshop)" hands a screen-reader
 * user an identifier no sighted user is ever shown — the accessibility surface being
 * *less* usable than the visual one, which is backwards. Every message therefore
 * names a building through {@link buildingSubject} / `placementLabel` and a
 * neighborhood through `neighborhoodLabel`. `announcements.test.ts` sweeps every
 * exported `*Message` for a leaked id, so a new message cannot reopen this.
 *
 * Provenance: PR #132 stopped the hub sentinel leaking into the placement family and
 * PR #138 removed a duplicated node id from the progress label, both deferring these
 * eight top-level leaks as needing display names threaded through the whole file.
 */

/** Human label for each construction state; state is NEVER conveyed by color alone. */
export const CONSTRUCTION_STATE_LABEL: Record<ConstructionState, string> = {
  preview: "Preview",
  not_started: "Not started",
  teaching: "Breaking ground",
  practice: "Under construction",
  unfinished: "Needs finishing",
  complete: "Complete",
  gold: "Mastered",
};

/**
 * Human label for each mastery level (Mastery_Scoring_Spec section 2): mastery is a
 * status, not a fraction. 2 = mastered (finishes the building); 3 is a non-gating
 * gold margin. Shown alongside the raw score so the number reads meaningfully.
 */
export const MASTERY_LABEL: Record<Mastery, string> = {
  0: "Not started",
  1: "In progress",
  2: "Mastered",
  3: "Gold mastery",
};

/**
 * How a building is NAMED aloud: its city building name plus the skill it teaches —
 * "Workshop (Field properties & the distributive law)". That is the pair the visible
 * roster row leads with (the city name first, the human skill topic under it), so a
 * listener and a reader are told the same two things, and the
 * parenthetical that used to hold a duplicate of the building name now carries the
 * information the raw id was standing in for.
 *
 * Both halves degrade gracefully. `placementLabel` handles the ISLAND HUB, which is
 * not a skill node — `buildingName`/`skillDisplayName` would both fall back to the
 * `town-hall` sentinel (the shape of the defect PR #132 fixed). The topic is dropped
 * whenever `skillDisplayName` has no entry and hands the id back, so an unmapped node
 * reads as a single fallback rather than the id twice over.
 *
 * IT IS THE STABLE HANDLE, NOT THE ERA-DRESSED DISPLAY NAME, and that is a decision
 * rather than an omission (D-ERA29). An announcement is transient and already carries
 * two other clauses — the skill topic and the construction state — so a dressing would
 * be the fourth thing spoken about an event the listener wanted the outcome of. The
 * dressing lives on the PERSISTENT surfaces, where it can be read at leisure: the
 * roster row and the building callout's title. If an era ever wants it spoken here,
 * swap `placementLabel` for `buildingDisplayName` and thread the era through.
 */
function buildingSubject(nodeId: string): string {
  const name = placementLabel(nodeId);
  const topic = skillDisplayName(nodeId);
  return topic === nodeId ? name : `${name} (${topic})`;
}

/** Polite announcement + panel summary when a building is selected. */
export function buildingSelectionMessage(building: CityBuildingView): string {
  return [
    `Selected ${buildingSubject(building.node_id)}, ${CONSTRUCTION_STATE_LABEL[building.construction_state]}.`,
    `${building.progress.label}.`,
  ].join(" ");
}

/** Friendly, 1-based lot name for the DOM roster + announcements. */
export function lotLabel(lotIndex: number): string {
  return `Lot ${lotIndex + 1}`;
}

/**
 * Polite announcement when a lot is selected — an empty lot invites placement,
 * a built lot reads out its skill + state (never color alone).
 */
export function lotSelectionMessage(
  lotIndex: number,
  building: CityBuildingView | null,
): string {
  if (!building) {
    return `Selected ${lotLabel(lotIndex)} (empty). Choose a skill to build here.`;
  }
  return `Selected ${lotLabel(lotIndex)}: ${buildingSubject(building.node_id)}, ${CONSTRUCTION_STATE_LABEL[building.construction_state]}. ${building.progress.label}.`;
}

/** Announced when the build menu (shop) opens. */
export function buildMenuMessage(count: number): string {
  return count > 0
    ? `Build menu open. ${count} skill${count === 1 ? "" : "s"} ready to construct. Choose one to place.`
    : "Build menu open. Every skill on this island is already placed.";
}

/** Human "facing" label for a quarter-turn rotation (never color/shape alone). */
export function rotationLabel(rot: number): string {
  return `${((((rot % 4) + 4) % 4) * 90) % 360} degrees`;
}

/** Announced when a skill enters free placement over the island. */
export function placementStartMessage(buildingLabel: string): string {
  return `Placing ${buildingLabel} on open ground. Drag on the map or use the arrow keys to move it, R to rotate, Enter to build here, or Escape to cancel.`;
}

/**
 * WHY a spot is refused, in plain language shared by the visible placement bar and live
 * region, so neither surface says less than the other.
 *
 * The copy leads with what the building needs, matching BUILD 3's approach framing. The
 * reachability branch still has to name its distinct consequence: a refusal over plainly
 * empty ground otherwise reads as a broken input. It says what to do rather than exposing
 * the flood-fill mechanism, and it never mentions a road because bare grass is a path
 * (INV-COS-1).
 *
 * Each value is a complete sentence fragment that can follow a building label and colon,
 * or stand alone in the visible placement bar.
 */
export function placementRefusalReason(refusal: PlacementRefusal): string {
  return refusal === "unreachable"
    ? "Needs an open approach. That spot would wall a building in, with no open ground left to walk up to it. Leave a gap so every building can be reached."
    : "Needs open ground. Move it onto the island and clear of other buildings.";
}

/**
 * Announced as the ghost moves — validity is spoken, never shown by color alone, and
 * a refusal always carries its reason (see {@link placementRefusalReason}).
 */
export function placementMoveMessage(
  buildingLabel: string,
  refusal: PlacementRefusal | null,
): string {
  return refusal === null
    ? `${buildingLabel}: valid spot. Build here, keep moving, or rotate.`
    : `${buildingLabel}: ${placementRefusalReason(refusal)}`;
}

/** Announced when the ghost is rotated in place. */
export function placementRotateMessage(
  buildingLabel: string,
  rot: number,
  refusal: PlacementRefusal | null,
): string {
  return `${buildingLabel} rotated to ${rotationLabel(rot)}. ${
    refusal === null ? "Valid spot." : sentence(placementRefusalReason(refusal))
  }`;
}

/** A reason clause promoted to its own sentence (it is written to follow a colon). */
function sentence(clause: string): string {
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

/** Announced when placement is cancelled without building. */
export function placementCancelMessage(buildingLabel: string): string {
  return `Cancelled placing ${buildingLabel}. It is still ready to build whenever you pick a spot.`;
}

/* -------------------------------------------------------------------------- */
/* Relocation (moving an already-placed building). Same grammar as placement, */
/* worded so a screen-reader user knows the building keeps everything but its  */
/* spot and that Escape snaps it back where it was.                            */
/* -------------------------------------------------------------------------- */

/** Announced when an already-placed building enters MOVE mode. */
export function moveStartMessage(buildingLabel: string): string {
  return `Moving ${buildingLabel} to open ground. Drag on the map or use the arrow keys to reposition it, R to rotate, Enter to drop it here, or Escape to cancel and snap it back.`;
}

/**
 * Announced as the building is nudged or dragged to a new cell: validity spoken, never
 * shown by color alone, and the refused branch says what the building needs rather than
 * what it is not (see {@link placementMoveMessage}). The building's own current footprint
 * is ignored, so its original spot reads as a valid drop target.
 */
export function moveStepMessage(
  buildingLabel: string,
  refusal: PlacementRefusal | null,
): string {
  return refusal === null
    ? `${buildingLabel}: valid spot. Drop here, keep moving, or rotate.`
    : `${buildingLabel}: ${placementRefusalReason(refusal)}`;
}

/** Announced when the building is rotated in place during a move. */
export function moveRotateMessage(
  buildingLabel: string,
  rot: number,
  refusal: PlacementRefusal | null,
): string {
  return `${buildingLabel} rotated to ${rotationLabel(rot)}. ${
    refusal === null ? "Valid spot." : sentence(placementRefusalReason(refusal))
  }`;
}

/** Announced when a move is confirmed and the building settles at its new spot. */
export function moveConfirmMessage(buildingLabel: string): string {
  return `Moved ${buildingLabel} to its new spot. Its progress and mastery are unchanged.`;
}

/** Announced when a move is cancelled and the building returns to where it was. */
export function moveCancelMessage(buildingLabel: string): string {
  return `Move cancelled. ${buildingLabel} snapped back to its original spot.`;
}

/**
 * Announced when a skill is placed. A tested-out (pre-built) skill drops in built at
 * 0 stars — practice earns the stars; a normal placement lays a Foundation the
 * learner clicks to start the lesson.
 *
 * It takes the node id and names the building itself rather than accepting a label:
 * the caller is `confirmPlacement`, whose active ghost CAN be the hub, and passing
 * `buildingName(active.nodeId)` was the one way left to leak a sentinel into this
 * sentence (PR #132's defect, one call site along). `buildingSubject` guards it.
 */
export function skillPlacedMessage(nodeId: string, preBuilt = false): string {
  return preBuilt
    ? `Placed ${buildingSubject(nodeId)}. You tested out, so its building is already built. Practise it to earn its mastery stars.`
    : `Placed ${buildingSubject(nodeId)}. Its foundation is ready. Click it to start the lesson.`;
}

/**
 * Announced when a skill in the roster is selected (placed or ready to build). The
 * node id is passed separately because an unplaced skill has no `CityBuildingView`
 * to read it from, and both branches must still be able to name the building.
 */
export function skillSelectionMessage(
  nodeId: string,
  building: CityBuildingView | null,
  placed: boolean,
): string {
  // A BOUGHT CIVIC BUILDING ARRIVES HERE AND MUST NOT BE ANSWERED IN THIS GRAMMAR.
  // Clicking one in the scene routes through the same `selectSkill`, and it satisfies
  // both branches of the test below for reasons that have nothing to do with it being
  // unbuilt: it has no `CityBuildingView` (it has no `student_node_state` row) and it is
  // absent from `placedNodeIds` (it lives in `load.civic`, not `load.placements`). So the
  // learner was told a building they had already paid for was "not built yet", and
  // invited to do the thing they had just done. Guarded HERE rather than at the call site
  // for the reason `placementLabel` is: one gate every caller already goes through cannot
  // be forgotten by the next one. See {@link civicSelectionMessage}.
  if (isCivicPlacement(nodeId)) {
    return civicSelectionMessage(nodeId);
  }
  if (!building || !placed) {
    return `Selected ${buildingSubject(nodeId)}, ready to build. Choose Build to place it on the island.`;
  }
  return `Selected ${buildingSubject(nodeId)}, ${CONSTRUCTION_STATE_LABEL[building.construction_state]}. ${building.progress.label}.`;
}

/* -------------------------------------------------------------------------- */
/* Civic buildings — the BOUGHT half of the catalogue (D-ERA7).                */
/*                                                                            */
/* Era one civic-buildings.md §6: "Nothing carries meaning by art alone — the  */
/* canvas is `aria-hidden`, so every capacity, shortfall and count lives in    */
/* the DOM." A purchase moves both capacities, so what it bought and what that */
/* cost has to be SAID, not just drawn on a building that appears.             */
/* -------------------------------------------------------------------------- */

/**
 * Announced when a civic building is bought and lands. It names the two capacities it
 * provides, because that is the whole reason to buy one and the canvas cannot say it.
 *
 * NO SHAME AND NO PRESSURE (D-CIT13, INV-COS-1): it reports what the city gained and
 * what it cost, and it never suggests the learner ought to buy another or that anything
 * is blocked until they do — a capacity gates nothing.
 */
export function civicPlacedMessage(input: {
  readonly name: string;
  readonly cost: number;
  readonly materialLabel: string;
  readonly livability: number;
  readonly happiness: number;
}): string {
  return (
    `Built ${input.name} for ${input.cost} ${input.materialLabel}. ` +
    `${civicProvidesSentence(input.livability, input.happiness)}`
  );
}

/**
 * WHAT ONE CIVIC BUILDING GIVES THE CITY, as one sentence — shared by the purchase and
 * the selection so the two cannot come to describe the same building differently.
 * Written for whichever dials are non-zero, because a row that moves one of them should
 * not read as if it moved both and scored nothing.
 */
function civicProvidesSentence(livability: number, happiness: number): string {
  const provides = [
    livability > 0 ? `${livability} more people sustained` : null,
    happiness > 0 ? `${happiness} Happiness` : null,
  ].filter((clause): clause is string => clause !== null);
  return provides.length > 0
    ? `It adds ${provides.join(" and ")}.`
    : "It adds nothing to either dial.";
}

/**
 * Announced when a BOUGHT civic building is SELECTED — the click a learner makes on one
 * standing in the city.
 *
 * IT EXISTS BECAUSE THE SKILL SENTENCE WAS FALSE HERE, and the falsehood was the second
 * of its kind in a day: an empty 0-of-3 mastery rack floated over every bought building
 * for the same reason this said "not built yet" over one — machinery written for
 * buildings EARNED through mastery, applied to buildings that are BOUGHT. A civic
 * building has no lesson, no CFU, no practice set and no `student_node_state` row, so
 * every question the skill grammar asks about it ("is it placed?", "what construction
 * stage?", "how much progress?") is a question it cannot have an answer to.
 *
 * SO IT ANSWERS THE QUESTIONS IT CAN, in the hub's grammar rather than the skill one:
 * `townHallSelectionMessage` also names a non-skill building, says plainly that it is not
 * a skill, and then reports the thing that building is actually for. Here that is the two
 * capacities the purchase bought — the whole reason to own one, and, since the canvas is
 * `aria-hidden`, otherwise legible only in the City Life panel's pooled totals.
 *
 * NO SHAME AND NO PRESSURE (D-CIT13, INV-COS-1), like the rest of this lane: it reports
 * what the building gives and never suggests the learner ought to buy another, nor that
 * anything is waiting on them. A capacity gates nothing.
 */
export function civicSelectionMessage(nodeId: string): string {
  const name = placementLabel(nodeId);
  // THE CAPACITIES COME THROUGH `civicContributions`, not off the catalogue directly, and
  // that indirection is the whole point: the popup this click also opens reports the same
  // two figures, so the arithmetic has exactly one home and the two surfaces cannot come
  // to disagree about one building. See `civic.ts`.
  const provides = civicContributions(nodeId);
  if (provides === null) {
    // Not a civic placement at all. Debuggable rather than a lie about a building this
    // function cannot look up; nothing in the app reaches this, since the one caller
    // tests `isCivicPlacement` first.
    return `Selected ${name}.`;
  }
  return (
    `Selected ${name}: a bought civic building, not a skill. ` +
    `${civicProvidesSentence(provides.livability, provides.happiness)}`
  );
}

/**
 * Announced when the stockpile will not cover a civic building — the affordability
 * refusal, in the DOM, because the build-menu card's disabled state is not announced by
 * itself.
 *
 * A SHORTFALL OF MATERIAL IS NOT A LOCK. It says what is short and by how much, in the
 * same grammar the road bar uses for gold, and nothing about it is phrased as a
 * requirement: era one is solvent on the lesson lump (INV-ERA-4), so the answer is
 * always "later", never "not for you".
 */
export function civicUnaffordableMessage(input: {
  readonly name: string;
  readonly cost: number;
  readonly available: number;
  readonly materialLabel: string;
}): string {
  return (
    `${input.name} costs ${input.cost} ${input.materialLabel} and you have ` +
    `${input.available}. Nothing was spent. Finish a lesson to earn more.`
  );
}

/**
 * Announced when a civic placement is refused by the placement rule. Deliberately the
 * SAME reason text a skill placement gets ({@link placementRefusalReason}) — a civic
 * building goes through the one gate, so it must not acquire a second vocabulary for
 * the same three refusals.
 */
export function civicRefusedMessage(name: string, refusal: PlacementRefusal): string {
  return `${name}: ${placementRefusalReason(refusal)} Nothing was spent.`;
}

/* -------------------------------------------------------------------------- */
/* Town Hall — the island HUB (a non-skill building; design §9).              */
/* Pre-seeded and always built; the player only relocates it. Its selection   */
/* is announced through the same polite live region, in text.                 */
/* -------------------------------------------------------------------------- */

/**
 * Announced when the Town Hall is selected (map click or the roster's island-hub
 * entry): island progress + whether Review mistakes is available. The hall is
 * pre-seeded and always built (no construction stage to announce).
 */
export function townHallSelectionMessage(
  complete: number,
  total: number,
  interleavedAvailable: boolean,
): string {
  return `Selected ${TOWN_HALL_LABEL} (the island hub). ${complete} of ${total} skills complete. Review mistakes ${
    interleavedAvailable ? "is available" : "is not yet available"
  }.`;
}

/**
 * Announced when the hub's interleaved practice opens: how many practiced skills the
 * session mixes, so the learner knows what they are stepping into before the first
 * problem (the drill itself hides each problem's skill until it is answered).
 */
export function interleavedPracticeMessage(skills: number): string {
  return `Mixed practice started at the ${TOWN_HALL_LABEL}. Problems are mixed across the ${skills} skills you have practiced.`;
}

/**
 * Storm status line, reused by the panel, the DOM control, and announcements.
 *
 * The locked line says MASTERED, not "complete" (#103). The gate behind it is
 * `isNeighborhoodReady` — every required node at `mastery >= 2` — and a tested-out
 * building is already Complete at mastery 0, so the old wording denied the exact
 * word six roster rows were showing. Naming the real requirement makes the lock
 * explain itself in the same vocabulary as the counter that drives it, and the
 * second sentence says how to satisfy it.
 */
export function stormMessage(storm: CityStormView): string {
  switch (storm.phase) {
    case "cleared":
      return "Storm cleared. Replay it any time for fun.";
    case "ready":
      return `Storm ready. Clear ${storm.required_correct} of ${storm.item_count} to finish the neighborhood.`;
    default:
      return "The storm opens once all six skills are mastered. Practise a building to earn its mastery stars.";
  }
}

/**
 * Announced once when the island finishes loading: where the learner is, plus where
 * the storm stands. It lived inline in `CitySurface` as "D1 neighborhood loaded." —
 * the one announcement authored outside this file, and so the one that missed both
 * the storm-copy fold-in (#103) and this naming pass. Folded in for the
 * same reason `StormEntryScreen`'s duplicate lines were: copy kept where it can be
 * swept is copy that stays fixed.
 */
export function cityLoadedMessage(neighborhoodId: string, storm: CityStormView): string {
  return `${neighborhoodLabel(neighborhoodId)} neighborhood loaded. ${stormMessage(storm)}`;
}

/**
 * Label for the lesson action button, sensitive to construction state. A
 * tested-out building is Complete without its lesson ever having been opened, so
 * it says READ rather than "Review" — the mini-lesson is new material there, not a
 * revisit (#103).
 */
export function lessonActionLabel(building: CityBuildingView): string {
  switch (building.construction_state) {
    case "complete":
    case "gold":
      return building.tested_out ? "Read lesson" : "Review lesson";
    case "not_started":
    case "preview":
      return "Start lesson";
    default:
      return "Resume lesson";
  }
}

/* -------------------------------------------------------------------------- */
/* What a skill building gives the city.                                       */
/* -------------------------------------------------------------------------- */

/**
 * **WHAT THIS BUILDING GIVES THE CITY, in its own authored numbers.**
 *
 * Civic buildings are attributed per building and skill buildings were attributed
 * nowhere, even though a skill building's capacity is the largest number in the game:
 * `CITIZEN_NODE_CAPACITY` takes the Dwellings from 10 residents to 26 on mastery, and
 * the tuning table's own comment calls that jump *"the largest single beat in the
 * game"*. Nothing told the player it happened.
 *
 * ## It is INFORMATIONAL, never a reward (BUILD 5)
 *
 * *"Homes for 26 of your people"*, not *"+16 capacity earned"*. The distinction is the
 * whole permission this line has: the research backs making a gain APPARENT and refuses
 * a second score to chase. So the sentence states a standing fact about the building,
 * carries no delta, no total and no currency, and the only lever it names is MASTERY,
 * which is the one unifying progress signal (BUILD 2).
 *
 * ## It carries NO SUBJECT, for `masteryLabel`'s reason
 *
 * Every consumer names the building immediately before it: the callout's own title, and
 * the completion announcement's *"Its building, Dwellings, is built"*. A leading subject
 * would be the building named twice, and naming it here from the node id is the one path
 * that leaks a raw `NUM.*` into learner-facing prose.
 *
 * ## THE COMPLETION ANNOUNCEMENT IS ALREADY THE MASTERY BEAT
 *
 * `CityBuildingView.complete` is `mastery >= 2` and not a construction fact, so the beat
 * `CitySurface` fires the completion announcement on is exactly the crossing into
 * mastered — which is exactly when the residence figure jumps. One clause on
 * {@link skillCompleteMessage} therefore makes the jump an EVENT; no second
 * mastery-specific announcement is needed, and one written here would have been
 * unreachable code behind that effect's `!newlyComplete` guard.
 *
 * ## NULL UNTIL THE BUILDING ACTUALLY HOLDS SOMEBODY, which is a decision
 *
 * The engine's rule is `buildingLedger`'s: a building holds people once it is placed,
 * complete AND past `PRACTICED_MASTERY`. A TESTED-OUT building is Complete at mastery 0
 * and holds nobody, so a line promising ten homes there would be false on the one path
 * that looks most like success. Rather than write a second, forward-looking sentence
 * that has to stay in step with that rule, this returns null until the fact is true —
 * so the line's ARRIVAL is itself the news, and it can never describe a capacity the
 * roster does not have.
 *
 * ## The figures are read, never typed
 *
 * `capacityForNode` is the tuning table, so a retune moves this sentence with it and an
 * unauthored node (or the island hub, which is not a skill) returns null rather than a
 * sentence about zeros.
 *
 * **O-20 CAVEAT.** These are `residenceCapacity` terms — a sum over skill nodes that
 * bounds population. Under the recorded leaning that `residenceCapacity` becomes
 * authoritative and gains civic inputs, every sentence here stays true: the
 * reconciliation ADDS terms to the pool rather than moving a skill node out of it. A
 * sentence phrased against the economy's `livability` instead would be describing a
 * number about to change meaning, which is why this attributes the building's own
 * contribution and leaves the pooled total to a panel.
 */
export function cityContributionMessage(building: CityBuildingView): string | null {
  const capacity = capacityForNode(building.node_id);
  // The SAME two conjuncts `buildingLedger` applies, read off the view's own fields.
  // `gold` is legacy and no longer derived, and is accepted so this cannot go quiet if
  // it ever is again.
  const built =
    (building.construction_state === "complete" ||
      building.construction_state === "gold") &&
    building.mastery >= PRACTICED_MASTERY;
  if (!built) {
    return null;
  }
  const mastered = building.mastery >= 2;
  const homes = mastered ? capacity.residence_mastered : capacity.residence_built;
  const clauses: string[] = [];
  if (homes > 0) {
    clauses.push(
      mastered || capacity.residence_mastered <= homes
        ? `Homes for ${homes} of your people.`
        : `Homes for ${homes} of your people, and ${capacity.residence_mastered} at mastery.`,
    );
  }
  if (capacity.daytime > 0) {
    clauses.push(`Room for ${capacity.daytime} of your people here by day.`);
  }
  return clauses.length === 0 ? null : clauses.join(" ");
}

/* -------------------------------------------------------------------------- */
/* Lesson + completion. These two name the BUILDING alone rather than the full */
/* subject: each follows a selection announcement that has already introduced  */
/* the skill, and the surface they narrate (the lesson card's heading) is       */
/* titled with the building name too.                                          */
/* -------------------------------------------------------------------------- */

export function lessonActionMessage(building: CityBuildingView): string {
  return `${lessonActionLabel(building)} for ${placementLabel(building.node_id)}.`;
}

/** Announced when the in-world (stubbed) lesson entry opens for a building. */
export function lessonEntryMessage(building: CityBuildingView): string {
  return `Entered the ${placementLabel(building.node_id)} lesson stand-in. This does not change mastery.`;
}

/**
 * Celebration line when a building finishes (built / complete). The SKILL is what was
 * completed and the BUILDING is what got built, so naming both says what happened:
 * the old "NUM.3 complete! Its building is built." collapsed to a bare id doing the
 * work of both.
 *
 * It used to end "A cosmetic reward is on the way." That promise is not kept: finishing
 * a skill pays XP and gold, and cosmetics are BOUGHT with that gold in the Shop —
 * nothing is granted. The clause is dropped rather than restated because the economy
 * HUD announces the actual grant ("Earned 15 gold and 20 XP from learning.") in its own
 * polite live region; saying it here too would speak the reward twice to a screen-reader
 * user, who was until now the only one being told the wrong thing while the HUD showed
 * the right one.
 */
export function skillCompleteMessage(building: CityBuildingView): string {
  const gives = cityContributionMessage(building);
  const built = `${skillDisplayName(building.node_id)} complete! Its building, ${buildingName(building.node_id)}, is built.`;
  return gives === null ? built : `${built} ${gives}`;
}

/** Human labels for the runtime palette variants. */
export const PALETTE_LABEL: Record<PaletteVariant, string> = {
  day: "Day",
  night: "Night (warm dusk)",
  colorblind: "Colorblind-safe",
};

/** Announced (polite) when the lighting theme changes via the LUT. */
export function lightingMessage(variant: PaletteVariant): string {
  return `Lighting theme set to ${PALETTE_LABEL[variant]}.`;
}

/**
 * The storm trio speaks the neighborhood's NAME, not its domain id. `"D1"` is an
 * internal registry key that appears nowhere on the storm screens a sighted player
 * uses ("Face the storm", "finish the neighborhood"), so announcing it was the same
 * parity break as the `NUM.*` leaks above, one namespace over; `NEIGHBORHOOD_LABELS`
 * has carried the learner-facing name all along.
 */
export function stormEncounterMessage(neighborhoodId: string): string {
  return `Storm encounter for the ${neighborhoodLabel(neighborhoodId)} neighborhood. Face it when you are ready, and retry it as often as you like.`;
}

export function stormActionMessage(neighborhoodId: string): string {
  return `Storm attempt started for the ${neighborhoodLabel(neighborhoodId)} neighborhood.`;
}

/**
 * THE MID-ERA CRISIS CALL, spoken the moment the trigger lands (D-CRISIS-9, D-CRISIS-10).
 *
 * Assertive, because it is the one thing on screen that just changed and the visible
 * notice appears at the same instant; polite would let it queue behind whatever the
 * learner's last action announced, and arrive after they had already read the banner.
 *
 * It says exactly three things and stops: what arrived, that it waits, and who will
 * explain it. Everything else the advisor says, and saying it twice would make the live
 * region a second copy of a card that is right there.
 *
 * The progress clause is `N of M skills in this age`, which is the same sentence the
 * timeline row and the town capsule already speak, so a listener is told the crisis fired
 * on a number they have heard before. It names no node id, no era slug and no domain key,
 * per this module's sweep.
 *
 * Primitives rather than the briefing object on purpose: `crisisCall.ts` holds the
 * briefing and imports this, and passing the object would make the two import each other.
 */
export function crisisCallMessage(
  crisisTitle: string,
  advisorName: string | null,
  masteredInEra: number,
  eraNodeCount: number,
): string {
  return [
    `${crisisTitle} has reached the island, with ${masteredInEra} of ${eraNodeCount} skills in this age behind you.`,
    "It waits until you are ready.",
    advisorName ? `${advisorName} is here to explain it.` : "",
  ]
    .filter((part) => part.length > 0)
    .join(" ");
}

/** Confirmed storm outcome (assertive), announced after the checkpoint write. */
export function stormResultMessage(
  neighborhoodId: string,
  result: StormAttemptResult,
): string {
  const neighborhood = `the ${neighborhoodLabel(neighborhoodId)} neighborhood`;
  if (!result.cleared) {
    return `The storm for ${neighborhood} is still standing. Face it again whenever you are ready.`;
  }
  if (result.checkpoint_cleared) {
    return `Storm cleared for ${neighborhood}! Its checkpoint is complete.`;
  }
  return `Storm cleared for ${neighborhood}.`;
}
