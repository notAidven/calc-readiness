import type { WinterResolution, WinterRoundLog } from "@cr/game";

import type { SfxName } from "../audio/soundEffects";

/**
 * **WHICH SOUNDS A WINTER TRANSITION OWES, AS A PURE FUNCTION OF WHAT THE ENGINE JUST
 * WROTE.**
 *
 * ## Why this is a module and not four lines inside the surface
 *
 * It was four lines inside the surface, and the stacking assertion written against it
 * passed over a version that played one crack PER RUINED BUILDING. Measured rather than
 * argued: replace the branch with a loop over `[...ruined, ...damaged]`, play a whole
 * winter at nought of three so the frost takes three buildings in one advance, and the
 * suite still reports 41 passed. The sample's own `minIntervalMs` floor was quietly
 * absorbing the extra plays, so the test was measuring the backstop and reporting it as
 * the mechanism.
 *
 * That is the shape `.cursor/rules/qa-verification.mdc` warns about — an assertion that
 * survives the defect it was written for — and the fix is not a bigger assertion but a
 * different subject. What is actually claimed is *"a round that struck six buildings owes
 * ONE crack"*, which is a statement about a decision and not about what a media element
 * did afterwards. So the decision is here, returning the sounds it owes, and
 * `winterSfx.test.ts` counts them. Inject the loop now and it reports six.
 *
 * The floor stays in the catalogue and stays a backstop: it is what protects a sound from
 * a caller this module has not met yet.
 */

/**
 * The sounds closing a round owes, in the order they should be started.
 *
 * @param closed the round the engine just wrote, or `undefined` before any has closed
 * @param justEnded whether THIS transition is the one that ended the winter
 */
export function roundClosingSfx(
  closed: WinterRoundLog | undefined,
  justEnded: boolean,
): readonly SfxName[] {
  const sounds: SfxName[] = [];
  if (closed !== undefined) {
    // The frost taking ground. A round where it took none is silent rather than quiet:
    // nothing happened to the island, so there is nothing to say about it.
    if (closed.froze > 0) {
      sounds.push("frost-advance");
    }
    // ONE crack for the round, whatever the frost found. The event is not "a building was
    // frozen" — that reading is what produces six overlapping samples on one press — it is
    // "the frost reached the settlement", which happened once.
    if (closed.ruined.length > 0 || closed.damaged.length > 0) {
      sounds.push("building-frozen");
    }
  }
  // The winter letting go. `ended` is the phase the last `end_round` produces, so this can
  // only ever happen once in an encounter; it is the counterpart of `thawWinterRows`,
  // which takes the weather off the island at exactly this transition.
  if (justEnded) {
    sounds.push("thaw");
  }
  return sounds;
}

/**
 * The sounds a resolved round owes as a SAMPLE. The round's verdict is deliberately not
 * here: it is the check mark the lesson layer already synthesizes, it needs no asset, and
 * a per-tier fanfare would make a graded outcome loud.
 *
 * `magnitude` is the ward radius and the engine leaves it null at tier `none`, so a hearth
 * that never caught is silent — which is the difference between the DECLARATION (already
 * thudded on commit) and the fire.
 */
export function resolutionSfx(resolution: WinterResolution | null): readonly SfxName[] {
  if (resolution === null) {
    return [];
  }
  return resolution.action.kind === "fire" && resolution.magnitude !== null
    ? ["fire-lit"]
    : [];
}

/** Whether a resolved round earned enough to be worth the check mark at all. */
export function resolutionEarnedItsChime(resolution: WinterResolution | null): boolean {
  return resolution !== null && resolution.tier !== "none";
}
