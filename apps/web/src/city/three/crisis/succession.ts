import type { CrisisAtmosphere } from "./atmosphere";
import type { CrisisPropagation } from "./propagation";

/**
 * **ERA FOUR'S THIN VERTICAL SLICE. This is not the Succession Crisis and does not try to be.**
 *
 * The crisis itself is roughly ten thousand lines of source that nobody has written. What is here
 * is the smallest thing that can answer the question the framework has to answer before anybody
 * starts: **do the seams accept a crisis that propagates non-spatially, or do they only accept a
 * frost?** A lighting preset and a propagation declaration are enough to answer it, because those
 * are the two seams a crisis meets first and they are the two that would have to bend.
 *
 * Both are read from the merged brief, `docs/superpowers/specs/crises/era-04-succession-crisis.md`,
 * rather than invented. Nothing here is a tuning number; §"What is not in scope" of
 * `crises/README.md` forbids inventing one and none is needed for either seam.
 *
 * ## WHAT THIS SLICE IS EVIDENCE FOR, STATED SO IT CANNOT BE OVERREAD
 *
 * It shows two things and no more. **First**, that {@link CrisisAtmosphere} carries era four's
 * direction without a new control — including the two levers era one moved in the OPPOSITE
 * direction, which is the only interesting part: era one drops its key and pulls its fog near
 * plane in, and era four raises its key and pushes its near plane out. A table that only ever went
 * one way would be a table shaped by era one. **Second**, that era four's tipping is expressible
 * without being a degenerate frost, which is what {@link SUCCESSION_PROPAGATION} is for.
 *
 * It is evidence for nothing about the board, the cards, the influence ladder or the conclusion.
 */

/**
 * **HIGH, HARD AND STILL — era four's atmosphere, from §2.1 of its brief.**
 *
 * The brief's direction, lever by lever: *"era four is the era that set the island out to a line,
 * and the crisis should read as that order becoming brittle rather than as weather arriving. A
 * flat hot noon with short hard shadows is the correct read."*
 *
 * ## THE THREE LEVERS THAT PROVE THE PRESET IS NOT ERA-ONE-SHAPED
 *
 *  1. **`key.posRatio` goes UP and IN, not out.** *"High, close to overhead. Short hard shadows,
 *     no long rakes. This is the single most identifying lever and it is the reverse of era
 *     three's."* Against the shipped `KEY_POS` of `[-1.5, 2.1, 1.25]` this resolves to about 77
 *     degrees of elevation, where fair weather is 47 and era one's overcast is 53. It is also the
 *     control `crisis-reference-packs/README.md` §1a says the briefs asked for in prose without
 *     knowing it existed;
 *  2. **`key.intensity` RISES.** 1.32 to 1.44: *"up slightly. Hard light is the point."* Era one
 *     drops the same number to 0.58, so the field has now been driven in both directions;
 *  3. **`fog.nearRatio` is pushed OUT.** 3 to 4.6, against era one pulling it in to 1.4: *"era
 *     four's crisis wants clarity, not haze: everything is visible and nobody will say what they
 *     intend."* A fog term that could only ever thicken would have made this unsayable.
 *
 * **`shadowIntensity` is 1 and that is a statement rather than a default.** Era one drops it to
 * 0.55 because an overcast sky has shallow shadows and there is no blur available; era four wants
 * the hardest shadows the rig can throw, so it keeps the full term. Written out rather than
 * omitted, because an absent value and a deliberate full one are the same picture and only one of
 * them is checkable.
 *
 * **The rim is kept at the shipped `#BFDCEF` / 0.48** on the brief's own instruction, which is
 * worth noting because it means era four's key-to-fill ratio goes UP to about 3:1 where era one's
 * falls to 1.7:1. Contrast rising is the read.
 *
 * Nothing here is mastery gold `#FFB703`, `CIVIC` green or `BRICK` red.
 */
export const SUCCESSION_LIGHT = {
  /** A hot noon, so the top end is pushed rather than pulled. Era one runs 0.92. */
  exposure: 1.06,
  /** *"Bleached almost white at the horizon, holding blue only at the top."* */
  sky: 0xe8f1f7,
  /** Colour matched to the bleached horizon; the near plane pushed out for clarity. */
  fog: { color: 0xe4eef5, nearRatio: 4.6, farRatio: 20 },
  /** *"Paler, and lower in chroma"*, over a bounce that is stone rather than earth. */
  hemi: { sky: 0xdfe9f2, ground: 0xb9b2a4, intensity: 0.72 },
  /** *"Down."* Less soft fill, more contrast. */
  ambient: { color: 0xeceef0, intensity: 0.22 },
  key: {
    /** *"Cooler and whiter. Era four's limestone is already pale."* */
    color: 0xf4f6f8,
    intensity: 1.44,
    shadowIntensity: 1,
    posRatio: [0.42, 1.55, 0.35],
  },
  /** *"Keep."* The shipped rim, untouched, which is what lifts the contrast ratio. */
  fill: { color: 0xbfdcef, intensity: 0.48, posRatio: [1, 1, 1] },
} as const satisfies CrisisAtmosphere;

/**
 * **ALLEGIANCE, TIPPING, ALONG NOTHING.**
 *
 * The whole point of this pass, in one value. Read it against era one's and the two share the
 * `kind` discriminant and not one substantive field: there is no `advance` because nothing
 * travels, no `frontSubject` because there is no boundary, and no cell anywhere — *"era four lays
 * no per-cell layer at all"*.
 *
 * ## WHY THIS IS NOT A FROST WITH THE SPREAD TURNED OFF
 *
 * A frost with a spread of zero is still a frost: it would carry an advance direction nobody uses,
 * a leading edge that never moves, and a cell grid era four has no ground layer to draw on. The
 * player would meet a mechanic that looks like era one's holding still, which is worse than a
 * different mechanic, because *"a player does not meet the same mental model twice"* is the
 * property the separation exists for and a frozen frost is era one's model met a second time.
 *
 * What era four's brief actually specifies is an **arrival**. §3.4 calls the drift warning *"the
 * most important object in this brief"*: a district about to drift shows a numbered block waiting
 * at the foot of its plinth, with the shear-legs standing over it, and **when the drift lands the
 * block goes up on the plinth. Same object, moved.** So the player's job is to watch an object
 * arrive, and — the half a frost genuinely cannot express — *"a district with no block at its
 * plinth is not drifting this cycle, and that absence is as informative as the block."* Absence is
 * a reading here. On a frost front, absence is just unfrozen ground.
 *
 * ## WHY THE LAYER IS `designed` AND NOT `none`
 *
 * Era four HAS world geometry for its propagation and nobody has built it. Era nine has none and
 * never will. Those two look identical from outside a type that only knows *"no builder"*, which
 * is exactly why {@link PropagationLayer} keeps them apart: era nine's `none` carries a reason and
 * a guard, and this carries what is owed.
 *
 * `TMark` is `never` on purpose. There is no mark type yet because there is no builder, and
 * inventing one now is how a stub becomes a design decision nobody made.
 */
export const SUCCESSION_PROPAGATION: CrisisPropagation<never> = {
  read: "tipping",
  job: "watch-an-object-arrive",
  topology: {
    kind: "unlinked",
    decidesPer: "district",
    decidedBy: "whoever-is-currently-strongest",
  },
  layer: {
    kind: "designed",
    /**
     * A standing object at an authored plinth, and NO rung on the ground ladder. Era four's floor
     * identity is its paving and a fill *"would make the board read as a map rather than as a
     * city"*, so the one seam era one leans on hardest is the one era four declines.
     */
    carrier: { kind: "standing-object", anchor: "authored-plinth" },
    owed:
      "the numbered block, the shear-legs over it, and the block going up on the plinth as a " +
      "single interpolation on a player-caused advance (era-04 brief section 3.4)",
  },
};
