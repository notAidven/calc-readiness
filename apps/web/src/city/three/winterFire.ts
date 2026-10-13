import { HARD_WINTER, type WinterFireState } from "@cr/game";
import * as THREE from "three";

import { flatWinter } from "./winterScene";
import { WINTER_SCENE_TONES as W } from "./winterTones";

/**
 * **THE FIRE: A HEARTH THAT DISAPPEARS BEHIND THE FIRST THING IN FRONT OF IT, AND A SMOKE
 * COLUMN THAT DOES NOT.**
 *
 * Wired from the design batch's asset 9. The hearth is about three world units — under one
 * grid cell — so at the shipped camera it is hidden by any building between it and the eye.
 * The COLUMN is therefore the asset that marks the fire's position: it rises to
 * {@link COLUMN_HEIGHT}, leans downwind, and widens toward the top so it has mass where it is
 * read against the sky.
 *
 * ## WHAT REPLACES WHAT
 *
 * This replaces `WinterGround.tsx`'s own `addFire` — a seven-sided cylinder ring with a cone
 * in it, at exactly this scale (ring radius `GRID_CELL * 0.3`, total height about 3.0). The
 * silhouette read is the same and the stone ring is genuinely better: nine boxes at varied
 * heights and yaws facet under the flat shading where a cylinder reads as a smooth puck, and
 * a fire that is the player's own mark on the board earns the detail. The two states the old
 * fire could show are both kept — a hearth that never caught stands with no ember in it,
 * because the board has to be able to report a declaration that bought nothing.
 *
 * ## THREE STATES NOW, BECAUSE THE ENGINE STOPPED THROWING THE THIRD ONE AWAY
 *
 * A fire that burnt out used to be DELETED from `state.fires`, so this file could only ever be
 * asked for two of the four states plate `07-fire-four-states.svg` draws. The 2026-08-02 ruling
 * keeps a spent hearth on the board (`WinterFire` in `hard-winter.ts`), and {@link buildHearth}
 * therefore takes the engine's own {@link WinterFireState} rather than a `lit` boolean — which is
 * also what stops a caller collapsing the two zero-fuel states, since a hearth that never caught
 * and one that burnt out are at the same `rounds_left` and are different pictures:
 *
 *  - **`burning`** — pale stones, laid fuel, an ember bed, seven tongues, a smoke column.
 *  - **`spent`** — *"the same hearth with its stones gone dark, the fuel spent, a thin wisp of
 *    smoke or none at all"*: {@link WINTER_SCENE_TONES.STONE_SPENT}'s ring, char fuel, no ember
 *    bed, no tongues, and {@link buildSmokeWisp} in place of the column. The ochre ground it was
 *    holding reverts through the engine rather than here — a spent fire wards nothing, so the
 *    frost closes over it on its ordinary advance and the two halves of the state change together,
 *    which is what the brief asks to read as the same hearth in a later state.
 *  - **`never_caught`** — pale stones and PALE, unburnt fuel, no ember, no flame, no smoke at all.
 *    Nothing about it is darkened: it bought nothing, and it burnt nothing either.
 *
 * ## THE FLAME IS THE ONLY EMISSIVE THING IN THE WINTER, AND IT LIGHTS NOTHING
 *
 * The crisis budget is four lights scene-wide, no bloom and no post-processing, so a fire
 * cannot be a light source. The batch's answer is an unlit bright FACE. It authors that as a
 * `MeshBasicMaterial`, which is not usable inside this layer: `winterGround.test.ts` sweeps
 * every material in the winter group for `flatShading === true` and `metalness === 0`, and a
 * basic material has NEITHER property — so a basic-material flame breaks two of the guard's
 * three claims and not the one that is actually about brightness. A flat-shaded standard
 * material with an emissive term is the same picture (a bright face; three.js emissive
 * illuminates nothing and needs no composer) and breaks exactly ONE of them, which is the
 * narrowest hole the guard can be given. That is the deviation, and the reason for it.
 *
 * There is no halo, no light pool on the snow and no colour cycling. The snow beside the
 * hearth is exactly as cold as the snow anywhere else.
 *
 * ## AN EMISSIVE TERM AT ONE STRENGTH IS WHAT MADE THE FLAME A FLAT ORANGE TRIANGLE
 *
 * The first flame this file shipped was two nested five-sided cones, each in a material whose
 * emissive was its OWN diffuse colour at intensity 1.35. That is the defect and not merely an
 * unlucky look: three.js adds `emissive * emissiveIntensity` after the lighting term, so at
 * 1.35 on a saturated hue every facet of the cone resolves to the same clipped value whatever
 * angle it is at. The flat shading the whole island reads its form by was still there and had
 * nothing left to show. **Permitting emissive is what the guard was loosened for; spending all
 * of it in one flat step is what threw the form away.** The lead's words on the render:
 * *"i thought we established it wouldnt do this disgusting looking flat orange square"*.
 *
 * So the emissive budget is spent as a RAMP, hottest at the core, and the outer surfaces keep
 * enough of their lit term to facet:
 *
 *  - **Three heat bands, not one.** {@link HEAT} runs 0.40 / 0.92 / 1.45 over ember, flame and
 *    a near-white core tone, so the flame has an inside and an outside. The outer tongues at
 *    0.40 still take the key light, which is what makes their facets read.
 *  - **Emissive is hotter than diffuse in every band.** A surface lit toward its own hue only
 *    ever gets brighter; lit toward the NEXT band up it also shifts, so a facet turned away
 *    from the key reads as cooler ember rather than as the same orange at lower alpha.
 *  - **Seven tongues, not one cone.** A cone has three silhouette edges and they are straight.
 *    The tongues are lathed flame profiles at five segments, twisted, leant and jittered per
 *    seed, so the outline is broken at every height and no two fires are identical.
 *  - **A fuel stack, which is what the flame stands out of.** Three logs in the wood tones
 *    put DARK values inside the fire's own silhouette. Nothing else in the hearth could: the
 *    stones are outside the flame and the ember bed is under it.
 *
 * ## HOW LONG IT HAS LEFT IS SPENT ON THE SMOKE COLUMN, AND SECONDARILY IN THE FUEL
 *
 * **RULED 2026-08-02: THE DURATION MOVED TO THE COLUMN, because the hearth does not have the
 * pixels to carry it.** The fuel ladder below is kept and is not wrong; it is not sufficient
 * alone. Measured off the committed frames at 1024x580 at the shipped camera, the whole
 * difference between three rounds left and one is the flame's top edge descending **11px on a
 * 21px-wide flame** — a three-unit hearth inside a ring of stones has nowhere to put three
 * states. No art on the flame fixes that, so the read is now carried by the one asset in this
 * file that is 26 units tall and exists to be findable from the far rim: see
 * {@link columnSpanFor}. `winterCamera.test.ts` measures the resulting ladder in screen pixels
 * at the shipped camera and at both dolly clamps.
 *
 * ## THE FUEL LADDER, WHICH IS THE SECOND CHANNEL AND WAS THE FIRST
 *
 * `burn_rounds_by_tier` ran a ladder for a long time and this layer read none of it: the view
 * carried `rounds_left` to `WinterGround.tsx` and `addFire` spent only `radius !== null` on it,
 * so a player deciding whether to light a second fire could not see how long the first one had.
 * The mechanic inventory carried the row as an outright GAP, and it is the one thing in this
 * crisis a player could not see AT ALL.
 *
 * The design is **block 2 of `2026-08-01-winter-crisis-mechanics-scene-assets.html`**, which is
 * the design hand-back for this mechanic and supersedes the prose recommendation in
 * `2026-08-01-hard-winter-art-brief-addendum.md` §4 that this was first built against. The two
 * disagree about mechanism, not about intent, and the sheet is far more specific: the stack loses
 * **a log a round** rather than thinning, **no radius anywhere is scaled**, and the flame's core
 * falls **faster** than its skirt. See {@link FUEL_POSE} for the table and the reasons.
 *
 * **NOTHING HORIZONTAL MOVES, AND THAT IS THE WHOLE ASSET.** The stone ring, the ember bed's
 * disc, every tongue's base radius and every surviving log's own section are identical at every
 * step; the ladder is spent entirely in Y and in how many logs are present. *"A fire drawn
 * narrower as it burns down is a fire that covers less ground, which is the one reading this
 * frame exists to prevent — duration is not width."* `fireDuration.test.ts` asserts the variant
 * and that invariant in the same test, because an implementation that ignored `rounds_left`
 * would hold the footprint perfectly.
 *
 * **THE STACK NEVER EMPTIES.** One log is the last step, not zero: an empty ring of stones is
 * already taken by the fire that never caught, and the logs are the only dark values inside the
 * flame's own silhouette.
 *
 * **A HEARTH THAT NEVER CAUGHT DOES NOT BURN ITS FUEL DOWN**, whatever its `rounds_left` says.
 * `burn_rounds_by_tier.none` is 1, so an unlit hearth arrives at the bottom of the ladder every
 * time, and posing it there would draw a fire that never lit as one that had burnt out. The
 * laid, whole stack is most of what makes the unlit state read as *never caught*.
 *
 * ## THE POSE IS BAKED INTO THE TONGUE GEOMETRY, WHICH IS THE ONE MECHANISM DEVIATION
 *
 * The sheet poses the flame with `tongue.scale.y` and then requires {@link updateFire} to
 * multiply its jitter INTO that pose, warning that *"left as an authored scale that the frame
 * loop overwrites, a one-log fire snaps back to full height on the first frame"*. That warning is
 * correct and this file answers it at the root instead: the height is in the GEOMETRY, so the
 * frame loop's absolute `scale` write cannot reach it and no per-frame code has to know the pose
 * exists. Same picture, same reduced-motion behaviour, one fewer thing to keep in step — and
 * `fireDuration.test.ts` asserts the posed order SURVIVES a run of `updateFire`, which is the
 * behaviour the sheet was protecting rather than the line it wrote.
 *
 * ## WHAT A PLAYER ACTUALLY SEES FALL IS THE FLAME, NOT THE STACK
 *
 * Photographed at 1024x580 at the game's own camera and again at the plates' tilt
 * (`winterCrisisShots.browser.test.tsx`, shots `08a`-`08c` and `09a`-`09b`), **the stack is not
 * visible at either elevation**: from above the flame and the ember skirt fill the ring's mouth,
 * and from the side the ring stones stand 0.71 to 1.07 of the hearth radius tall against a stack
 * whose top is 0.545 whole and 0.285 at one log, so they hide it. Plate 08 draws the stack
 * burning down because it draws a hearth at 16° with nothing in front of it; the shipped hearth
 * has nine stones round the rim. The sheet calls the fuel and the flame *"two channels, both
 * vertical"*; in the tree the first of them is occluded, so the flame carries the read alone.
 * **Whether the stack is worth making visible is a design decision and it is the lead's.**
 *
 * What the flame does carry, measured off those frames: its top edge descends **233, 257, 275 px**
 * over the three steps and its height falls **109, 90, 72 px**, while the held ground's bounding
 * box is byte-identical in all three. Its pixel WIDTH goes 69, 81, 80 — it grows slightly, because
 * a collapsed flame hides less of its own lap from a camera looking down into the ring. That is
 * the right direction: the sheet's fear is a fire that reads as covering LESS.
 *
 * **ONE CONSEQUENCE OF THE POSE MEETING THE TREE'S RING, recorded because it is the lead's.** At
 * one log the core tongue reaches 0.22 + 1.72 × 0.38 = 0.874 of the hearth radius, and the ring
 * stones stand 0.71 to 1.07. So the last step's flame is BELOW the tallest stones: fully visible
 * at the game's 49°, where the camera looks into the ring, and nearly hidden at the plates' 16°
 * (shot `09b`). The game never renders 16°, so this is a note about the plate rather than a defect
 * in the scene — but it is why `coreY` should not be lowered further without a frame.
 *
 * **THE CANVAS IS NOT THE ACCESSIBLE CHANNEL FOR THIS AND WAS NEVER GOING TO BE.** It is
 * `aria-hidden`, so the flame is a second reading and `WinterStatusStrip`'s *"N rounds left"* is
 * the one a screen reader gets. That was also the excuse for the flame being a close-zoom read
 * only, and the 2026-08-02 ruling withdraws the excuse for the DURATION specifically: an
 * accessible mirror is why the picture may be a second reading, not why it may be an unreadable
 * one. The column is the channel that has to survive full zoom-out.
 */

export const HEARTH_NAME = "winter-hearth";
export const FLAME_NAME = "winter-flame";
export const SMOKE_COLUMN_NAME = "winter-smoke-column";
export const SMOKE_PUFF_NAME = "winter-smoke-puff";

/**
 * The last of the smoke over a hearth that has gone out.
 *
 * A DIFFERENT NAME FROM THE COLUMN, and that is what keeps it still: `WinterGround.tsx`'s frame
 * loop drives `updateFire` for every `SMOKE_COLUMN_NAME` it finds, recycling puffs up a 26-unit
 * span, and a dead fire billowing like a live one is the one thing this state must not do. It is
 * also what stops a spent hearth being findable at zoom-out the way a burning one is, which is
 * right: the column exists to mark where a fire IS.
 */
export const SMOKE_WISP_NAME = "winter-smoke-wisp";

/**
 * Stones in the ring. Nine reads as laid by hand; a smooth ring reads as poured.
 *
 * Exported because the spent state's requirement is about the COUNT — the brief asks for *"a
 * complete ring of nine laid stones: darkened, not collapsed, scattered or broken"* — so a guard
 * has to be able to count them without writing the nine down a second time.
 */
export const RING_STONES = 9;

/**
 * How tall each stone in the ring stands, as a share of the hearth's radius, over three steps.
 *
 * Named because two things need the tallest of them and one of them used to guess: the ring is what
 * a spent hearth's wisp has to rise clear of, and that clearance was a fraction of the smoke
 * column's own base — a constant that had nothing to do with the stones. A table both can read is
 * the fix, and a re-laid ring moves the wisp with it.
 */
const RING_STONE_RISE = [0.71, 0.89, 1.07] as const;

/** The tallest stone in the ring, as a share of the hearth's radius. */
const RING_TALLEST = Math.max(...RING_STONE_RISE);

/**
 * **THE ONE MESH IN THE WINTER LAYER PERMITTED AN EMISSIVE TERM.**
 *
 * Named rather than inlined because `winterGround.test.ts`'s emissive guard exempts THIS NAME
 * and nothing else — see that file. If the flame stops being called this, the guard tightens
 * back onto it rather than silently letting every material through.
 */
export const FLAME_MESH_NAME = "winter-flame-face";

/** The fuel the flame stands out of. Named so a guard's failure message can say where. */
export const FUEL_NAME = "winter-hearth-fuel";

/**
 * **HOW MANY STEPS THE FUEL HAS TO DRAW, TAKEN OFF THE TUNING RATHER THAN CHOSEN.**
 *
 * `burn_rounds_by_tier` runs 1 / 2 / 2 / 3 over the four accuracy tiers, so the longest fire on
 * this board has three rounds and a drawn fire's `rounds_left` is somewhere in 1..3 — the engine
 * decrements and then filters at zero, so nothing is ever drawn at 0. Three steps is therefore
 * what the plate draws and it is not a number this file picked: a re-tune that lengthens the top
 * rung lengthens the ladder here, and `fireDuration.test.ts` derives its sweep from the same
 * expression rather than from a literal.
 *
 * Read off `HARD_WINTER` rather than restated. Block 2 of the sheet declares its own
 * `BURN_ROUNDS_BY_TIER = [1, 2, 2, 3]`, correctly, but a second copy of a tuning table is a
 * second thing to re-tune — and the sheet's own comment marks it as a quotation of
 * `hard-winter-tuning.ts` rather than a definition.
 */
export const FUEL_STEPS = Math.max(...Object.values(HARD_WINTER.fire.burn_rounds_by_tier));

/**
 * **THE POSE AT EACH REMAINING ROUND: HOW MANY LOGS ARE LEFT, AND HOW MUCH HEIGHT THE FLAME
 * KEEPS. THE SHEET'S OWN TABLE, AND NOTHING ELSE MOVES.**
 *
 * From block 2 of `2026-08-01-winter-crisis-mechanics-scene-assets.html`, which is the design
 * hand-back for this mechanic. **Every radius in the hearth is untouched at every step** — the
 * stone ring, the ember bed's seven-sided disc, and every tongue's BASE radius — and the logs
 * that remain are the authored bottom-n rather than resized ones, so nothing horizontal moves
 * anywhere. *"A fire drawn narrower as it burns down is a fire that covers less ground, which
 * is the one reading this frame exists to prevent — duration is not width."*
 *
 * **The core falls faster than the skirt, and that is measured rather than tidy.** The sheet:
 * *"a dying fire loses its peak before it loses its lap: keeping the ratio flat gave three
 * flames that looked like one flame at three zoom levels."* A single ramp over all seven tongues
 * is the flat ratio that was tried and rejected, so the split is core against everything else,
 * which is what {@link TONGUES} is already ordered for — index 0 is the core.
 */
const FUEL_POSE: Readonly<
  Record<number, { readonly logs: number; readonly coreY: number; readonly skirtY: number }>
> = {
  3: { logs: 3, coreY: 1.0, skirtY: 1.0 },
  2: { logs: 2, coreY: 0.66, skirtY: 0.72 },
  1: { logs: 1, coreY: 0.38, skirtY: 0.48 },
};

/** The longest pose the table holds. `fireDuration.test.ts` pins it equal to {@link FUEL_STEPS}. */
const POSE_MAX = Math.max(...Object.keys(FUEL_POSE).map(Number));

/**
 * The shortest, which is where a SPENT hearth stands.
 *
 * Derived rather than written as 1, for the same reason {@link POSE_MAX} is: the spent state is the
 * step past the end of the ladder, and it has to keep sitting on the ladder's own last rung so the
 * stack does not grow at the moment the fire goes out. A retune that gave the table a step 0 would
 * move the spent hearth onto it.
 */
const POSE_MIN = Math.min(...Object.keys(FUEL_POSE).map(Number));

/**
 * The stack as `buildHearth` has always laid it, bottom log first, char on top.
 *
 * **A SPENT STACK IS TAKEN FROM THE CHARRED END, and that is where this file departs from the
 * sheet's code while keeping the sheet's stated reason.** Block 2 says *"the log that has
 * already been in the fire is the last one to go"* and then writes `logs.slice(pose.logs)`,
 * which removes index 2 — the CHAR log — first, so its one-log fire is a single unburnt
 * mid-brown log and a stack that looks FRESHER the longer it burns. The comment is right and
 * the slice is backwards. Both halves are satisfiable at once: the logs that remain are the
 * bottom-n by POSITION, so the stack still shortens from the top, and their tones are taken
 * from the char end, so the wood that survives is the wood that has burnt.
 */
const FUEL_TONES_LIT: readonly number[] = [W.WOOD_MID, W.WOOD_DARK, W.CHAR];

/** The stack a hearth that never caught stands with: laid, and not burnt in any degree. */
const FUEL_TONES_UNLIT: readonly number[] = [W.WOOD_MID, W.WOOD_DARK, W.WOOD_LIT];

/**
 * The pose for a fire with `roundsLeft` to go.
 *
 * Clamped rather than trusted: a `rounds_left` off either end of the table must draw the nearest
 * step rather than reach for a pose that does not exist.
 */
function poseFor(roundsLeft: number): (typeof FUEL_POSE)[number] {
  const step = THREE.MathUtils.clamp(Math.round(roundsLeft), 1, POSE_MAX);
  return FUEL_POSE[step] as (typeof FUEL_POSE)[number];
}

/**
 * The three heat bands, coolest first: how bright the band is, what it is made of, and what
 * it is glowing TOWARD.
 *
 * The pairs are deliberately not `emissive === color`. A surface whose emissive is its own
 * hue only gets brighter as the term rises; one glowing toward the band above it also shifts
 * hue, so a facet angled away from the key light reads as cooler ember instead of as the same
 * orange with less light on it.
 *
 * **THE INTENSITIES WERE 0.40 / 0.92 / 1.45 AND TWO OF THE THREE BANDS CLIPPED.** The header above
 * records why one flat 1.35 threw the form away, and the fix — three bands, hottest at the core —
 * was right about the SHAPE of the ramp and wrong about its top. Carried through the shipped
 * pipeline (`ACESFilmicToneMapping` at `WINTER_LIGHT.exposure` 0.92) the three bands resolved to:
 *
 * | band | intensity | on screen | saturation |
 * | --- | --- | --- | --- |
 * | outer | 0.40 | `rgb(175, 87, 24)` | 0.86 |
 * | mid | 0.92 | `rgb(215, 189, 146)` | **0.32** |
 * | core | 1.45 | `rgb(227, 214, 188)` | **0.17** |
 *
 * Only the outer band was still fire. The core came out paler than the lit snow it stands on
 * (`rgb(181, 184, 184)`) and 39 points warmer in `r - b`, where the ochre ground a fire holds is
 * 83 — so the hottest thing on the island read as a cream lump, and from the shipped camera you
 * look DOWN into the ring at the tallest tongue, which is the core. That is the whole of *"the fire
 * still looks trash"*: an emissive term big enough to clip does not make a brighter fire, it makes
 * a white one, and ACES cannot give back a hue that was pushed past the top of the curve.
 *
 * The ramp is therefore spent where it still buys saturation. At 0.30 / 0.50 / 0.72 the same
 * pipeline gives `rgb(162, 74, 20)` at 0.88, `rgb(195, 143, 64)` at 0.67 and `rgb(208, 172, 97)`
 * at 0.53: a value step of 26 between mid and core, so the flame still has an inside, and no band
 * under 106 in `r - b`. The core is now DIMMER than a fully-mastered star's 1.35 rather than
 * brighter, which is the right way round — a star is a reward and a hearth is a hearth.
 */
const HEAT = {
  outer: { color: W.EMBER, toward: W.FLAME, intensity: 0.3 },
  mid: { color: W.FLAME, toward: W.FLAME_HOT, intensity: 0.5 },
  core: { color: W.FLAME_HOT, toward: W.FLAME_HOT, intensity: 0.72 },
} as const;

type HeatBand = (typeof HEAT)[keyof typeof HEAT];

function flameMaterial(band: HeatBand): THREE.MeshStandardMaterial {
  return flatWinter({
    color: band.color,
    emissive: new THREE.Color(band.toward),
    emissiveIntensity: band.intensity,
    roughness: 1,
  });
}

/**
 * A flame tongue's profile, as radius against height fraction: pinched at the foot, bulging
 * low, drawn out to a point. Lathed at five segments, which is what makes it facet.
 *
 * A cone's silhouette is three straight edges and every cone in a group repeats them. This
 * profile plus the twist and lean below is why seven tongues read as one moving mass rather
 * than as a stack of triangles.
 */
const TONGUE_PROFILE: readonly (readonly [number, number])[] = [
  [0.0, 0.0],
  [0.58, 0.14],
  [0.82, 0.36],
  [0.66, 0.58],
  [0.36, 0.79],
  [0.13, 0.93],
  [0.0, 1.0],
];

/** Radial segments in a tongue. Five reads as faceted; more reads as a smooth candle flame. */
const TONGUE_SEGMENTS = 5;

/**
 * One tongue, in local space with its foot at y = 0.
 *
 * The lathe is twisted about Y and leant with height, and every ring's radius is nudged by a
 * hash of the seed, so no two tongues in a hearth share a silhouette and no two hearths on the
 * board share a flame. Hashed rather than drawn from a generator, for the reason every seeded
 * thing on this island is: the same board looks the same after a reload.
 */
function tongueGeometry(baseR: number, height: number, seed: number): THREE.BufferGeometry {
  const hash = (n: number) => {
    const v = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const points = TONGUE_PROFILE.map(
    ([r, f]) =>
      new THREE.Vector2(
        r * baseR * (r === 0 ? 1 : 0.82 + hash(f * 7.3) * 0.36),
        f * height,
      ),
  );
  const geometry = new THREE.LatheGeometry(points, TONGUE_SEGMENTS);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const lean = (hash(3.1) - 0.5) * baseR * 1.4;
  const twist = 0.5 + hash(5.7) * 0.7;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const f = height === 0 ? 0 : y / height;
    const a = f * f * twist;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    position.setXYZ(
      i,
      x * c - z * s + lean * f * f,
      y + (hash(x * 4.1 + z * 2.7) - 0.5) * height * 0.06,
      x * s + z * c + lean * 0.4 * f * f,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** How high the tongues' feet sit above the hearth's floor, as a share of its radius. */
const FLAME_FOOT = 0.22;

/** Where each tongue sits: its band, its size, and where round the bed it stands. */
const TONGUES: readonly {
  readonly band: HeatBand;
  readonly baseR: number;
  readonly height: number;
  readonly at: number;
  readonly yaw: number;
}[] = [
  // The core, tallest and hottest, slightly off centre so the peak is not on the axis.
  { band: HEAT.core, baseR: 0.34, height: 1.72, at: 0.08, yaw: 0.4 },
  // Three mid tongues around it, at three heights so the silhouette has three peaks.
  { band: HEAT.mid, baseR: 0.34, height: 1.44, at: 0.26, yaw: 0.6 },
  { band: HEAT.mid, baseR: 0.3, height: 1.18, at: 0.3, yaw: 2.7 },
  { band: HEAT.mid, baseR: 0.32, height: 1.31, at: 0.28, yaw: 4.5 },
  // The ember skirt: short, wide, coolest, lapping over the fuel.
  { band: HEAT.outer, baseR: 0.42, height: 0.82, at: 0.42, yaw: 1.5 },
  { band: HEAT.outer, baseR: 0.38, height: 0.68, at: 0.46, yaw: 3.5 },
  { band: HEAT.outer, baseR: 0.4, height: 0.75, at: 0.44, yaw: 5.6 },
];

/**
 * **HOW HIGH A FULL-FUEL FLAME REACHES, AS A MULTIPLE OF THE HEARTH'S RADIUS.**
 *
 * Derived from {@link TONGUES} rather than written down, because it exists to keep the smoke column
 * off the flame ({@link COLUMN_CLEARANCE}) and the thing that broke that was a constant which had
 * stopped describing the geometry. A tongue retuned taller now pushes the smoke up with it.
 *
 * The FULL pose, so the clearance holds at every rung of the fuel ladder: the pose only ever
 * shortens the flame, and a base sized for a one-log fire would be inside a three-log one.
 */
export const FLAME_TIP_RATIO =
  FLAME_FOOT + Math.max(...TONGUES.map((tongue) => tongue.height));

/**
 * The ring's two tones and the stack's, by state. The RING and the FUEL are the whole of what a
 * state changes about the built hearth: every dimension in it is identical at all three, which is
 * what makes the spent one read as the same hearth later rather than as another object.
 *
 *  - a hearth that never caught keeps `WOOD_LIT` on top: unburnt, and the pale end of the timber.
 *  - a burning one has `CHAR` there, the one log that has been in the fire.
 *  - a spent one is char throughout, which is the brief's own reading of the state — *"the fuel
 *    spent to char `#3A342C`"* — and `CHAR` is that hex. It stands at {@link POSE_MIN}, so what is
 *    left of the stack is the one log the last burning frame had, charred.
 *
 * The two lit tables are {@link FUEL_TONES_LIT} and {@link FUEL_TONES_UNLIT} rather than copies of
 * them, because the indexing that takes a short stack from the charred end reads off their order.
 */
const HEARTH_TONES: Readonly<
  Record<
    WinterFireState,
    { readonly ring: readonly [number, number]; readonly fuel: readonly number[] }
  >
> = {
  burning: { ring: [W.STONE, W.STONE_DARK], fuel: FUEL_TONES_LIT },
  never_caught: { ring: [W.STONE, W.STONE_DARK], fuel: FUEL_TONES_UNLIT },
  spent: {
    ring: [W.STONE_SPENT, W.STONE_SPENT_DARK],
    fuel: FUEL_TONES_LIT.map(() => W.CHAR),
  },
};

/**
 * A stone ring, a fuel stack, an ember bed and a flame — about three world units tall
 * including the flame tip, so it fits inside one grid cell.
 *
 * `state` is the engine's own reading of the fire (`winterFireState`), and only `burning` gets an
 * ember bed and a flame. The other two are real built hearths doing nothing, and the difference
 * between them is the tone of the stones and of the fuel: a hearth that never caught stands with
 * its fuel laid and pale, and a spent one stands with its stones gone dark and one charred log
 * left. The laid fuel is what makes either absence read as a hearth rather than as an empty ring
 * of stones.
 *
 * It takes the STATE rather than a `lit` boolean because a boolean cannot carry the third case:
 * `burn_rounds_by_tier.none` is 1, so a hearth that never caught sits at the same `rounds_left: 0`
 * as one that burnt out, and a call site deriving `lit` for itself is one `||` away from drawing a
 * failed declaration as a fire that had done its work.
 *
 * `roundsLeft` is the fire's remaining duration, and it is spent on the FUEL and the FLAME and
 * on nothing that changes what the fire covers — see the duration section of this file's
 * docblock. It is required rather than defaulted because every caller genuinely knows the
 * answer: the board has the fire's own, and the ghost is proposing a fire nobody has lit yet,
 * which is {@link FUEL_STEPS}.
 */
export function buildHearth(
  radius: number,
  state: WinterFireState,
  roundsLeft: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = HEARTH_NAME;
  const tones = HEARTH_TONES[state];
  const lit = state === "burning";
  // WHERE EACH STATE SITS ON THE FUEL LADDER, and only one of the three reads `roundsLeft`.
  //
  // A hearth that never caught burnt nothing, so it stands with its stack whole whatever its
  // duration says: `burn_rounds_by_tier.none` is 1, so an unlit hearth arrives at the BOTTOM of
  // the ladder every time, and posing it there would draw a fire that never lit as a spent one.
  //
  // A SPENT hearth sits at that bottom step deliberately, which is what keeps the ladder
  // continuous across the moment the fire goes out: the last burning frame is one log, and one log
  // is what chars. Posing it at the top instead would have the stack GROW as the fire died.
  const pose = lit
    ? poseFor(roundsLeft)
    : state === "spent"
      ? poseFor(POSE_MIN)
      : poseFor(POSE_MAX);

  const stone = flatWinter({ color: tones.ring[0] });
  const stoneDark = flatWinter({ color: tones.ring[1] });
  const ringR = radius * 0.96;
  const stoneW = (Math.PI * 2 * ringR) / RING_STONES;

  for (let i = 0; i < RING_STONES; i += 1) {
    const a = (i / RING_STONES) * Math.PI * 2;
    const h = radius * (RING_STONE_RISE[i % RING_STONE_RISE.length] as number);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(stoneW, h, radius * 0.46),
      i % 2 ? stone : stoneDark,
    );
    mesh.position.set(Math.cos(a) * ringR, h / 2, Math.sin(a) * ringR);
    mesh.rotation.y = -a + (i % 2 ? 0.2 : -0.15);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // The fuel: three logs laid across each other, in the wood tones and the char. These are
  // the only DARK values inside the flame's own silhouette, and they are most of what stops
  // a lit hearth reading as one orange mass — the stones are outside the flame and the ember
  // bed is under it, so neither can break it up.
  //
  // AND THIS IS WHERE THE FIRE'S DURATION IS DRAWN: the stack loses a log a round. Each log
  // that remains is the one `buildHearth` always authored at that index — same length, same
  // section, same place — so the stack shortens from the top and NOTHING HORIZONTAL MOVES.
  for (let i = 0; i < pose.logs; i += 1) {
    const log = new THREE.Mesh(
      new THREE.BoxGeometry(radius * (1.44 - i * 0.12), radius * 0.19, radius * 0.21),
      // Taken from the char end, so a shorter stack is a more burnt one. See HEARTH_TONES.
      flatWinter({ color: tones.fuel[tones.fuel.length - pose.logs + i] as number }),
    );
    log.name = FUEL_NAME;
    log.position.set(0, radius * (0.19 + i * 0.13), radius * (i - 1) * 0.16);
    log.rotation.set(0, (i / 3) * Math.PI + 0.3, (i % 2 ? 1 : -1) * 0.11);
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);
  }

  if (!lit) {
    return group;
  }

  // The ember bed: a low seven-sided disc, at the coolest band. Emissive at all because an
  // ember bed that took only the overcast key light would read as a rusty plate rather than
  // as heat; at the OUTER band because the bed is the coolest thing that is still burning,
  // and a bed as bright as the core would flood the fuel it is meant to sit under.
  const bed = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.83, 7).rotateX(-Math.PI / 2),
    flameMaterial(HEAT.outer),
  );
  bed.name = FLAME_MESH_NAME;
  bed.position.y = radius * 0.12;
  bed.castShadow = false;
  bed.receiveShadow = false;

  // The flame: seven lathed tongues in three heat bands. Faceted from every heading, and no
  // camera-facing billboard that would swim as the compass orbits.
  const flame = new THREE.Group();
  flame.name = FLAME_NAME;
  TONGUES.forEach((spec, i) => {
    const mesh = new THREE.Mesh(
      // Y ONLY. `baseR` is passed through untouched at every step, which is the sheet's
      // load-bearing constraint and the reason the pose is not a uniform scale.
      tongueGeometry(
        radius * spec.baseR,
        radius * spec.height * (i === 0 ? pose.coreY : pose.skirtY),
        i + 1,
      ),
      flameMaterial(spec.band),
    );
    mesh.name = FLAME_MESH_NAME;
    mesh.position.set(
      Math.cos(spec.yaw) * radius * spec.at,
      radius * FLAME_FOOT,
      Math.sin(spec.yaw) * radius * spec.at,
    );
    mesh.rotation.y = spec.yaw;
    // A flame is not a light source here, and a flame that cast a shadow would be claiming
    // to be one. Stated rather than defaulted, as everything else in this layer states it.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    flame.add(mesh);
  });

  group.add(bed, flame);
  return group;
}

/* -------------------------------------------------------------------------- */
/* The smoke column                                                           */
/* -------------------------------------------------------------------------- */

/**
 * How tall the column of a fire with its WHOLE fuel stack stands, in world units.
 *
 * Nine times the hearth, and just clear of `MAX_BUILD_HEIGHT` (24), which is the point: from
 * the far rim of the island it has to be findable over whatever is standing in between. The
 * batch derives it against a three-unit hearth at the shipped tilt and fov, and the shipped
 * tilt and fov are what it says they are — `VILLAGE_CAMERA.polarAngle` is 0.72 rad (49°) and
 * `CityScene`'s camera is `fov: 32`.
 *
 * **IT IS THE TOP OF A LADDER SINCE 2026-08-02 rather than the only height a column has.** A fire
 * that has just caught throws exactly the column that shipped before, so nothing about the
 * findability argument above is spent; a fire running out of fuel throws a shorter one. See
 * {@link columnSpanFor}.
 */
export const COLUMN_HEIGHT = 26;

/**
 * Puffs in a WHOLE-FUEL stack.
 *
 * **ELEVEN LEFT GAPS, AND A COLUMN WITH GAPS IN IT IS NOT SMOKE.** Eleven puffs over
 * {@link COLUMN_HEIGHT} is one every 2.6 world units, against a bottom puff 1.8 units across, so the
 * lower half of the column was a row of separated lumps with island showing between them — and at
 * the shipped opacity they were hard-edged, near-opaque and cool grey, which is a description of
 * STONE. Photographed at 1024x580 the column read as a totem of boulders standing on the hearth.
 *
 * Fourteen is one every 2.0 units against a bottom puff {@link puffRadius} makes 2.5 across, so
 * consecutive puffs overlap and the column is continuous where it is thickest. It still thins and
 * widens upward, which is the design's own requirement — the mass belongs at the top, where it is
 * read against the sky from the far rim of the island.
 *
 * A SHORTER COLUMN GETS FEWER OF THEM RATHER THAN THE SAME FOURTEEN STRETCHED THINNER, which is
 * why {@link PUFF_SPACING} is what the count is derived from: holding the count and shrinking the
 * span would make a dying fire's column DENSER than a fresh one's, and holding the count and
 * keeping the spacing is the same thing said the other way round. See {@link puffsFor}.
 */
const PUFFS = 14;

/**
 * How far apart consecutive puffs sit, in world units — the interval the count is derived from.
 *
 * Read off {@link PUFFS} and {@link COLUMN_HEIGHT} rather than written down, so the whole-fuel
 * column is bit-identical to the one #449 photographed and the shorter rungs inherit its density
 * instead of a second number nobody measured. 2.0 units against a foot puff 2.5 across, which is
 * the overlap the paragraph above is about.
 */
const PUFF_SPACING = COLUMN_HEIGHT / (PUFFS - 1);

/**
 * The fewest puffs a column may be built from, however short its span.
 *
 * Four, and it is a floor on the ARITHMETIC as much as on the picture: `updateFire` divides by
 * `count - 1` to recover the rise a puff was built at, and the recycle needs more than a pair to
 * read as travel rather than as two lumps swapping places.
 */
const COLUMN_MIN_PUFFS = 4;

/**
 * **THE SHARE OF {@link COLUMN_HEIGHT} A COLUMN WITH ONE ROUND LEFT STANDS — the bottom of the
 * duration ladder, and the number the 2026-08-02 ruling turns on.**
 *
 * The ruling moved the fire's duration off the flame and onto this column because the flame does
 * not have the pixels: three rounds against one is an 11px descent on a 21px-wide flame at the
 * shipped camera. What this asset has instead is 26 world units of height standing against the
 * sky, and the arithmetic is `winterCamera.test.ts`'s: a 26u vertical reads 648.7px on a 1080-tall
 * frame at the default dolly, 405px from the far rim of the island and 202px at full zoom-out.
 *
 * At 0.42 the ladder is 26 / 18.46 / 10.92 world units, which is about **31px between adjacent
 * rungs at FULL ZOOM-OUT** on a short 580-tall frame before the crisis framing's own 1.4669x, and
 * about 100px at the resting dolly. Against the flame's 11px, at the resting dolly only. The floor
 * is not chosen for comfort at the top of the range: it is chosen so the WORST view a player can
 * dolly to still separates the rungs, which is the entire reason the read moved here.
 *
 * **IT IS NOT LOWER, and the reason is the state below it.** A spent hearth's wisp
 * ({@link WISP_HEIGHT}) tops out around 6.5u, and a one-round column has to read as a fire that is
 * still burning rather than as one that has gone out. At 0.42 the shortest column's top stands
 * about 2.6x the wisp's; much under a third and the two states start arguing, which
 * `winterScene.test.ts` asserts against the SHORTEST rung rather than against the tallest.
 */
const COLUMN_SHORTEST = 0.42;

/**
 * **HOW TALL THE COLUMN OF A FIRE WITH `roundsLeft` TO GO STANDS, IN WORLD UNITS.**
 *
 * Linear over the rungs the tuning has, from {@link COLUMN_SHORTEST} at one round left to the
 * whole of {@link COLUMN_HEIGHT} at {@link FUEL_STEPS}. Derived from `FUEL_STEPS` rather than
 * written as a three-key table for the reason that constant exists: the number of rounds a fire
 * can have is `burn_rounds_by_tier`'s to decide and it is being re-tuned, so a table keyed by 1, 2
 * and 3 would leave a rung undrawn or an entry describing nothing.
 *
 * Clamped at both ends, exactly as {@link poseFor} is: a `rounds_left` off either end of the
 * ladder draws the nearest rung rather than extrapolating a column taller than the one the
 * findability argument was made about.
 *
 * A single-rung tuning gets the whole height and no ladder, which is the honest answer rather
 * than a division by zero: with one rung there is no duration to draw.
 */
export function columnSpanFor(roundsLeft: number): number {
  const step = THREE.MathUtils.clamp(Math.round(roundsLeft), 1, FUEL_STEPS);
  if (FUEL_STEPS <= 1) {
    return COLUMN_HEIGHT;
  }
  const share = COLUMN_SHORTEST + (1 - COLUMN_SHORTEST) * ((step - 1) / (FUEL_STEPS - 1));
  return COLUMN_HEIGHT * share;
}

/**
 * How many puffs a column spanning `span` units is built from, at the authored spacing.
 *
 * **CEILING RATHER THAN ROUND, and the difference was measured rather than reasoned.** Rounding
 * puts the spacing either side of {@link PUFF_SPACING}, and a rung that rounds DOWN spaces its
 * puffs further apart than the interval #449's frames were taken at: at two rounds left that came
 * out at 2.051 units and opened a **0.02-unit gap** between the two lowest puffs, which is the
 * boulder-totem defect back in miniature at the one place the eye is guaranteed to be looking. A
 * ceiling can only ever tighten the spacing, so continuity is monotone in the direction the column
 * shortens and the whole-fuel rung is unchanged (26 over 2.0 is exactly thirteen intervals).
 */
function puffsFor(span: number): number {
  return Math.max(COLUMN_MIN_PUFFS, Math.ceil(span / PUFF_SPACING) + 1);
}

/** Lean downwind, per world unit of height. */
const LEAN = 0.17;

/**
 * How much clear air is kept between the flame's tip and the lowest puff, in world units.
 *
 * **THE LOWEST PUFF WAS SITTING ON THE FLAME.** `COLUMN_BASE` was the constant 2.6 with the comment
 * *"where the lowest puff sits, clear of the flame tip"*, and it was not: the hearth is built at
 * `GRID_CELL * 0.3` = 1.2u, its core tongue reaches `1.94 * radius` = 2.33u, and a puff centred at
 * 2.6 with a radius of 0.9 has its underside at 1.9 — **0.4u BELOW the tip**, centred on the same
 * axis, in `SMOKE_DARK` at 0.92 opacity. So the first thing drawn over a burning hearth was a
 * near-opaque dark grey lump covering the top of its own flame, which is most of why the fire read
 * grey rather than orange, and it was there in the built layout as well as in motion — under reduced
 * motion the puffs never move off it.
 *
 * A constant could not have been right, because the base has to clear a flame whose height is a
 * multiple of a radius the CALLER chooses. So the base is derived per column from the hearth it
 * stands on ({@link FLAME_TIP_RATIO}) and this is the only number left to pick.
 *
 * SMALL, because the other failure is a plume with daylight under it. This was 1.35 first and the
 * frame said so: the smoke stood a clear 16px off the flame at the crisis camera and read as
 * belonging to nothing. What the gap has to survive is the flame BREATHING — `updateFire` scales the
 * group and each tongue, up to about 1.27 together — so the margin is measured against the tip in
 * motion rather than at rest, which is why `winterScene.test.ts` re-measures both boxes at six
 * values of `t` instead of once.
 */
const COLUMN_CLEARANCE = 0.7;

/** Where the lowest puff of a column over a hearth of `hearthRadius` sits. */
function columnBase(hearthRadius: number): number {
  return hearthRadius * FLAME_TIP_RATIO + puffRadius(0) + COLUMN_CLEARANCE;
}

interface ColumnUserData {
  readonly wind: number;
  readonly phase: number;
  /** Where this column's lowest puff sits, so the frame loop recycles to the same floor. */
  readonly base: number;
  /**
   * How far above `base` this column reaches, which is the DURATION, and how many puffs it took
   * to fill it. Carried rather than recomputed for the reason `base` is: the frame loop recycles
   * over the span the group was BUILT at, and a module constant here would recycle every column
   * to the whole-fuel height whatever its own duration says.
   */
  readonly span: number;
  readonly puffs: number;
}

/**
 * The column: a stack of faceted puffs rising from the hearth, leaning downwind, widening
 * from about 0.9 to 3.8 units so the mass is at the top where it is read against the sky.
 *
 * Single-subdivision icosahedra rather than sprites: faceted from every heading, cheap, and
 * no camera-facing billboard to swim as the compass orbits a full 360°. The puffs use ALPHA,
 * which is blending and not glow — nothing about it needs a composer.
 *
 * `seed` fixes the tumble phase per fire so two hearths do not breathe in lockstep, and is a
 * number the caller derives from the fire's own cell rather than drawn from a generator, so
 * the same board looks the same on a reload.
 *
 * **`roundsLeft` IS THE FIRE'S DURATION AND IT IS SPENT ON THE HEIGHT**, which is the 2026-08-02
 * ruling: {@link columnSpanFor} decides how far the stack reaches and {@link puffsFor} how many
 * puffs fill it at the authored spacing. It is REQUIRED rather than defaulted for the reason
 * {@link buildHearth}'s is — every caller knows the answer, and a default would silently draw a
 * fire about to go out as one that had just caught, which is the exact defect the ruling names.
 *
 * **THE FOOT DOES NOT MOVE.** {@link puffRadius} and {@link puffOpacity} are keyed on the RISE
 * above the base in world units rather than on a fraction of the column's own span, so the puff
 * sitting over the hearth is the same size and the same opacity at every rung and only the reach
 * above it changes. That is the same invariant the fuel ladder is under — duration is not width —
 * carried up into the smoke: a column scaled down as a whole would say the fire covers less
 * ground, and the ground it holds is identical at every rung.
 */
export function buildSmokeColumn(
  seed: number,
  windDeg: number,
  hearthRadius: number,
  roundsLeft: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = SMOKE_COLUMN_NAME;
  const wind = THREE.MathUtils.degToRad(windDeg);
  const dirX = Math.cos(wind);
  const dirZ = Math.sin(wind);
  const base = columnBase(hearthRadius);
  const span = columnSpanFor(roundsLeft);
  const puffs = puffsFor(span);

  for (let i = 0; i < puffs; i += 1) {
    const rise = (i / (puffs - 1)) * span;
    const y = base + rise;
    const r = puffRadius(rise);
    const lift = rise / COLUMN_HEIGHT;
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      flatWinter({
        color: i % 3 === 0 ? W.SMOKE_DARK : W.SMOKE_MID,
        transparent: true,
        opacity: puffOpacity(rise),
        depthWrite: false,
        roughness: 1,
      }),
    );
    mesh.name = SMOKE_PUFF_NAME;
    mesh.position.set(dirX * y * LEAN, y, dirZ * y * LEAN);
    mesh.scale.set(1, 0.78 + lift * 0.3, 1);
    mesh.rotation.set(lift * 1.3, i * 0.7, lift * 0.4);
    // A shadow-casting cloud of transparent balls reads as a bug, and a cloud that took a
    // shadow reads as a solid. Both are stated rather than left at their defaults.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }

  const data: ColumnUserData = {
    wind,
    phase: ((seed % 100) / 100) * Math.PI * 2,
    base,
    span,
    puffs,
  };
  group.userData = data;
  return group;
}

/* -------------------------------------------------------------------------- */
/* The wisp over a spent hearth                                               */
/* -------------------------------------------------------------------------- */

/**
 * How tall the wisp stands. A SEVENTH of {@link COLUMN_HEIGHT}, which is exactly where plate
 * `07-fire-four-states.svg` puts it: its burning mass runs from y 576 to y 52 and its burnt-out
 * mass from 576 to 429, about a seventh of the height, at a third of the opacity.
 *
 * It was a sixth — the plate's seventh *"with room"* — and the room is now needed at the other end.
 * The wisp starts above the ring it rises from rather than a third buried in it
 * ({@link WISP_CLEARANCE}), which lifts its whole span, and `winterScene.test.ts` holds the wisp's
 * TOP under a fifth of the column's so that a dying fire can never read as a living one. Taking the
 * span to the plate's own figure pays for the lift out of the end that was never measured against
 * anything.
 *
 * The proportion is the whole point rather than a detail. The column's job is to be findable over
 * the settlement from the far rim; this one must NOT be, because it marks a fire that is out. It
 * has to be visible up close and lost at zoom-out, which is the opposite requirement.
 */
export const WISP_HEIGHT = COLUMN_HEIGHT / 7;

/** Puffs in the wisp. Three reads as the last of the smoke; more reads as a small fire. */
const WISP_PUFFS = 3;

/**
 * Clear air kept between the ring's tallest stone and the UNDERSIDE of the wisp's lowest puff.
 *
 * Small, because the wisp has to read as rising OUT of the hearth: a plume floating with daylight
 * under it is a plume belonging to nothing. What it may not do is sit IN the stones — the old base
 * put a third of its lowest puff over them, and a translucent grey ball half-buried in the ring is
 * the one thing the spent state cannot afford, since its whole read is *"the same hearth with its
 * stones gone dark"* and that is a claim about the stones' own tone.
 */
const WISP_CLEARANCE = 0.15;

/** Radius of the wisp's puff at height fraction `f`: thinning, and gone by the top. */
function wispRadius(f: number): number {
  return 0.92 - f * 0.44;
}

/**
 * **A THIN WISP OF SMOKE, OR NONE AT ALL — the brief's own words, and this is the wisp.**
 *
 * Three small faceted puffs leaning downwind on the same vector the column uses, thinning as they
 * rise and gone by the top. Deliberately built from the same primitive and the same smoke tones as
 * the column, so it reads as the same substance in a smaller quantity; and deliberately NOT named
 * {@link SMOKE_COLUMN_NAME}, so the frame loop never animates it (see that constant).
 *
 * `seed` fixes the jitter per hearth, off the fire's own cell, so two spent hearths do not stand
 * with identical smoke and the same board looks the same after a reload.
 */
export function buildSmokeWisp(
  seed: number,
  windDeg: number,
  hearthRadius: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = SMOKE_WISP_NAME;
  // Clear of the RING rather than of a flame, because a spent hearth has no flame. It read
  // `COLUMN_BASE * 0.62`, a fraction of the burning column's own floor, which is a number about
  // something else: the thing this has to rise out of is nine stones standing up to
  // `RING_TALLEST` of the radius, and that radius is the caller's.
  const base = hearthRadius * RING_TALLEST + wispRadius(0) + WISP_CLEARANCE;
  const wind = THREE.MathUtils.degToRad(windDeg);
  const hash = (n: number) => {
    const v = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  for (let i = 0; i < WISP_PUFFS; i += 1) {
    const f = i / (WISP_PUFFS - 1);
    const y = base + f * WISP_HEIGHT;
    // Thinning rather than widening, which is the other half of "not a column": the column puts
    // its mass at the top to be read against the sky, and this loses its at the top to die out.
    const r = wispRadius(f);
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      flatWinter({
        // The DARK smoke tone at the foot, because what this has to be read against is frost
        // within a step of white: the plate's own `#aeb7b8` at a third opacity is a visible
        // zigzag over a sixth of its frame and is a couple of pale pixels at a grid cell's
        // width, so the wisp takes the darker of the two smoke tones where it is thickest.
        color: f < 0.9 ? W.SMOKE_DARK : W.SMOKE_MID,
        transparent: true,
        opacity: 0.42 - f * 0.18,
        depthWrite: false,
        roughness: 1,
      }),
    );
    mesh.name = SMOKE_PUFF_NAME;
    mesh.position.set(
      Math.cos(wind) * y * LEAN + (hash(i + 1.7) - 0.5) * 0.5,
      y,
      Math.sin(wind) * y * LEAN + (hash(i + 3.3) - 0.5) * 0.5,
    );
    mesh.rotation.set(f * 1.1, i * 0.9, f * 0.5);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }
  return group;
}

/**
 * Radius of the puff sitting `rise` world units above the column's foot: mass where it is read,
 * which is the top of a WHOLE-FUEL column.
 *
 * The FOOT is what moved. It was 0.9, which is 1.8 across against a 2.6-unit puff spacing, so the
 * bottom of the column was separated lumps; 1.25 is 2.5 across against {@link PUFF_SPACING}'s 2.0,
 * so they overlap. The top is where the design wants the mass and it is where it was.
 *
 * **IT TAKES A RISE RATHER THAN A FRACTION, and that is what keeps the foot of a short column
 * identical to the foot of a tall one.** Keyed on a fraction of the column's own span, a one-round
 * column would put its full 3.8-unit crown 11 units up and read as a whole plume that had been
 * moved down; keyed on the rise, smoke widens as it climbs and a column that stops climbing early
 * simply never gets wide. Over a whole-fuel column the two are the same expression, which is what
 * makes #449's frames of it still frames of what ships.
 */
function puffRadius(rise: number): number {
  return 1.25 + (rise / COLUMN_HEIGHT) * 2.55;
}

/**
 * Opacity of the puff sitting `rise` world units above the column's foot. Thins out, never
 * disappears.
 *
 * **0.92 AT THE FOOT IS NOT SMOKE, IT IS A WALL, and the FOOT is the whole of what moved.** A
 * near-opaque hard-edged ball in a cool grey is a boulder, and eleven of them over an island read as
 * one: the lower column obliterated the terrain behind it instead of veiling it. Smoke is what you
 * can see through, so the foot comes down to 0.66.
 *
 * The TOP is left where it was — 0.53 against 0.50 — because that end is not the defect and thinning
 * it would break the column's actual job. The design puts the mass at the top so a column is
 * FINDABLE over the settlement from the far rim, and `winterScene.test.ts` pins the floor above 0.4
 * for that reason and pins the wisp under it by a margin. A flat reduction across the whole ramp was
 * tried first and it went red at both of those, correctly: it would have made a dying fire's wisp
 * denser than a living fire's plume.
 *
 * **A RISE FOR THE SAME REASON {@link puffRadius} TAKES ONE, and here it also keeps the duration
 * ladder off the opacity channel.** A short column thins over a short climb, so its top is at 0.61
 * rather than 0.53 and every rung stays clear of the 0.4 floor the findability argument needs — the
 * duration is spent on HEIGHT and on nothing that could make a burning fire read as a spent one.
 */
function puffOpacity(rise: number): number {
  return 0.66 - (rise / COLUMN_HEIGHT) * 0.13;
}

/**
 * One frame of the fire: a scale jitter on the flame, and the column's puffs rising, growing,
 * thinning and recycling to the bottom.
 *
 * **NOTHING ABOUT THE CRISIS DEPENDS ON THIS BEING CALLED.** The winter advances on player
 * actions and on nothing else (`test/hardWinterClockless.test.ts`), and this moves no round,
 * decides no outcome and is not read by anything that does. Under reduced motion the caller
 * does not call it at all and the column stands still, which is exactly how
 * `StarterIsland.tsx` treats its gulls.
 *
 * No colour cycling on the flame — ACES makes a cycling flame read as a hue shift rather than
 * as a flicker — and no flicker on anything else in the scene.
 */
export function updateFire(
  hearth: THREE.Object3D | null,
  column: THREE.Object3D,
  t: number,
): void {
  const flame = hearth?.getObjectByName(FLAME_NAME);
  if (flame) {
    // The whole flame breathes, and each tongue also runs on its OWN phase, so the tips
    // cross each other instead of the mass pulsing as one shape. A single group scale was
    // what made the old cone look like a triangle being zoomed.
    flame.scale.set(
      1 + Math.sin(t * 7.1) * 0.05,
      1 + Math.sin(t * 9.3) * 0.09,
      1 + Math.cos(t * 6.4) * 0.05,
    );
    flame.children.forEach((tongue, i) => {
      const p = i * 1.7;
      tongue.scale.set(
        1 + Math.sin(t * 6.3 + p) * 0.07,
        1 + Math.sin(t * 8.1 + p * 1.4) * 0.17,
        1 + Math.cos(t * 5.9 + p) * 0.07,
      );
      tongue.rotation.z = Math.sin(t * 4.7 + p) * 0.06;
    });
  }

  // THE SPAN AND THE COUNT ARE THE COLUMN'S OWN, for the reason the floor is: this column was
  // built to the duration of the fire it stands on, and a module constant here would recycle every
  // puff over the whole-fuel height and hand a one-round fire a full column on the first frame.
  // That is the trap block 2 of the assets sheet named for the flame's pose, met a second time.
  const { wind, phase, base, span, puffs } = column.userData as ColumnUserData;
  const dirX = Math.cos(wind);
  const dirZ = Math.sin(wind);
  column.children.forEach((puff, i) => {
    // Position is derived from `t` rather than integrated from a delta, so a dropped frame
    // cannot make one column drift out of step with another.
    const start = (i / puffs) * span;
    // The FLOOR is the column's own, read off the group that was built, not a module constant: it
    // clears the flame of the hearth this column stands on and that hearth's radius is the
    // caller's. A constant here would recycle every puff to a height that suited one radius.
    const y = base + ((start + t * 1.15) % span);
    const rise = y - base;
    puff.position.set(
      dirX * y * LEAN + Math.sin(t * 0.5 + i + phase) * 0.35,
      y,
      dirZ * y * LEAN + Math.cos(t * 0.4 + i + phase) * 0.35,
    );
    // The geometry is a fixed size per puff, so the growth is carried by the scale.
    const grow = puffRadius(rise) / puffRadius((i / (puffs - 1)) * span);
    puff.scale.set(grow, grow * (0.78 + (rise / COLUMN_HEIGHT) * 0.3), grow);
    const mesh = puff as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.opacity = puffOpacity(rise);
    puff.rotation.y = i * 0.7 + t * 0.12;
  });
}
