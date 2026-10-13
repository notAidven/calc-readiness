/**
 * **THE MECHANIC INVENTORY, AS A TABLE OF CONTENTS A CRISIS CANNOT SILENTLY SKIP A ROW OF.**
 *
 * The twenty-four rows are `docs/superpowers/specs/crisis-reference-packs/README.md` §3, derived
 * there from era one's built code because era one is the only crisis that exists. §2 says what the
 * list is for, and it is worth quoting because it is the whole reason this file is code and not
 * prose:
 *
 * > A brief written by walking the six atmosphere axes gets a thorough mood and a thorough hazard,
 * > because both are properties of the WORLD. Everything the player does is a property of the
 * > LOOP, and the loop has no axis list. So the interactive half is not argued away, it is never
 * > reached, and **an omission that is never reached is invisible in review**.
 *
 * Era one's brief lost the shield and the threatened building that way: not to a bad argument, to
 * no argument. **A blank row fails; a row saying "no analogue, because ..." passes** — that is the
 * document's own rule, and {@link MechanicAnswer} is it with a type behind it.
 * `crisisMechanicCoverage.test.ts` requires every registered crisis to answer all twenty-four.
 *
 * ## WHY THE ANSWER IS FOUR-WAY AND NOT TWO-WAY
 *
 * *"Covered"* and *"not covered"* would collapse the distinction this pass exists to protect. A
 * row the framework shares and a row each crisis supplies entirely are both answered, and they are
 * opposite answers: {@link ownedByTheCrisis} is a REFUSAL to generalise, and it has to be
 * distinguishable from {@link openSeam}, which is an admission that nothing carries the row yet.
 * Collapsing them is how a deliberate separation turns into a backlog item somebody later
 * "finishes" by sharing it.
 */

/* -------------------------------------------------------------------------- */
/* The rows                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The twenty-four rows, verbatim in substance from §3 of the reference-pack README.
 *
 * Ordered and complete. A row is never removed, because the inventory's value is that it is the
 * same list for every crisis: a shorter list for a crisis with less going on is the omission the
 * list exists to make visible.
 */
export const CRISIS_MECHANICS = [
  { id: "M1", title: "The crisis call, on the city, before the player enters" },
  { id: "M2", title: "The city while a call is unanswered" },
  { id: "M3", title: "Entry and exit, as a change on screen" },
  { id: "M4", title: "The atmosphere: light, sky, fog, exposure" },
  { id: "M5", title: "Ground under the crisis" },
  { id: "M6", title: "Water and shoreline under the crisis" },
  { id: "M7", title: "Vegetation under the crisis" },
  { id: "M8", title: "The hazard's own body, and its stages" },
  { id: "M9", title: "The propagation, and its leading edge" },
  { id: "M10", title: "The player's counter-mechanic, as an object" },
  { id: "M11", title: "Its own states: proposed, declared but inert, working, spent" },
  { id: "M12", title: "Its aimed coverage, and the footprint that coverage takes" },
  { id: "M13", title: "Its pre-commit preview" },
  { id: "M14", title: "Its duration" },
  { id: "M15", title: "Protection, and how much is left" },
  { id: "M16", title: "The threatened-but-unprotected building" },
  { id: "M17", title: "Accumulating damage short of destruction, and the threshold" },
  { id: "M18", title: "The ruin" },
  { id: "M19", title: "Ground lost for good" },
  { id: "M20", title: "Repair and rebuild, as an action and as a visible result" },
  { id: "M21", title: "Giving ground up, and buying it back" },
  { id: "M22", title: "The accuracy ladder, read off the board" },
  { id: "M23", title: "Ambient motion" },
  { id: "M24", title: "The conclusion, as a screen with a derived verdict" },
] as const;

export type MechanicId = (typeof CRISIS_MECHANICS)[number]["id"];

export const MECHANIC_IDS: readonly MechanicId[] = CRISIS_MECHANICS.map((row) => row.id);

/* -------------------------------------------------------------------------- */
/* The seams this pass stands up                                              */
/* -------------------------------------------------------------------------- */

/**
 * The shared seams, one name per module in this directory.
 *
 * A closed list on purpose: a row claiming a seam that does not exist is the failure this whole
 * file guards against, said one level up.
 */
export const FRAMEWORK_SEAMS = [
  /** `atmosphere.ts`: the preset swapped in on entry and absent on exit. */
  "atmosphere",
  /** `ladder.ts`: the shared ground-decal depth ladder, continued past the roads. */
  "ladder",
  /** `propagation.ts`: the declaration that keeps the four crises' reads apart. */
  "propagation",
  /** `buildingMark.ts`: the slot above the measured roofline that replaces the stars. */
  "badge-slot",
  /** `buildingMark.ts`: damage as a surface overlay on a building still standing. */
  "damage-overlay",
  /** `buildingMark.ts`: the ruin as a footprint-keyed stage of the same node. */
  "ruin-template",
] as const;

export type FrameworkSeam = (typeof FRAMEWORK_SEAMS)[number];

/* -------------------------------------------------------------------------- */
/* One crisis's answer to one row                                             */
/* -------------------------------------------------------------------------- */

/** The framework carries this row, through the named seam. */
export interface SharedSeamAnswer {
  readonly kind: "shared-seam";
  readonly seam: FrameworkSeam;
  readonly note: string;
}

/** This crisis supplies the row entirely, and sharing it would be the defect. */
export interface CrisisOwnedAnswer {
  readonly kind: "owned-by-the-crisis";
  readonly note: string;
}

/** The player does meet this row here, through a seam that lives outside this framework. */
export interface ElsewhereAnswer {
  readonly kind: "elsewhere";
  /** Where. A module path or a named engine concept, so the claim is checkable. */
  readonly where: string;
  readonly note: string;
}

/**
 * This crisis has no analogue for the row.
 *
 * The document's one warning about this answer is worth keeping in view: *"the test is whether the
 * PLAYER meets the mechanic, not whether the crisis implements it the way era one does."* *"Era
 * four has no hazard object"* is legitimate and changes what the brief owes. *"Era four has no
 * propagation"* would be false, because a district drifting to a claimant is propagation with an
 * unusual topology.
 */
export interface NoAnalogueAnswer {
  readonly kind: "no-analogue";
  /** The `because`. A blank fails the guard; that is the entire point of the row. */
  readonly because: string;
}

/** Nothing carries this row yet, for this crisis. An admission, not a refusal. */
export interface OpenAnswer {
  readonly kind: "open";
  readonly owed: string;
}

export type MechanicAnswer =
  | SharedSeamAnswer
  | CrisisOwnedAnswer
  | ElsewhereAnswer
  | NoAnalogueAnswer
  | OpenAnswer;

/** Every row answered. `Record` rather than a list, so the compiler catches a missing row. */
export type MechanicCoverage = Readonly<Record<MechanicId, MechanicAnswer>>;

export function sharedSeam(seam: FrameworkSeam, note: string): SharedSeamAnswer {
  return { kind: "shared-seam", seam, note };
}

export function ownedByTheCrisis(note: string): CrisisOwnedAnswer {
  return { kind: "owned-by-the-crisis", note };
}

export function elsewhere(where: string, note: string): ElsewhereAnswer {
  return { kind: "elsewhere", where, note };
}

export function noAnalogue(because: string): NoAnalogueAnswer {
  return { kind: "no-analogue", because };
}

export function openSeam(owed: string): OpenAnswer {
  return { kind: "open", owed };
}

/**
 * The prose an answer rests on, whichever kind it is.
 *
 * One accessor so the coverage guard can require every answer to carry a real reason without a
 * five-branch switch in the test — which would be the guard restating the union rather than
 * reading it, and would go stale the moment a sixth kind arrived.
 */
export function answerReason(answer: MechanicAnswer): string {
  switch (answer.kind) {
    case "no-analogue":
      return answer.because;
    case "open":
      return answer.owed;
    default:
      return answer.note;
  }
}

/** The rows one crisis answers with a shared seam, in inventory order. */
export function rowsOnSharedSeams(coverage: MechanicCoverage): readonly MechanicId[] {
  return MECHANIC_IDS.filter((id) => coverage[id].kind === "shared-seam");
}
