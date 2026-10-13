import type { EraId } from "@cr/skill-graph";

import {
  type EraIslandDesign,
  EVAN_ISLAND_DESIGNS,
  ERA_THREE_TO_SEVEN_ISLANDS,
  eraIslandDesign,
} from "./islandDesign";
import { BASE } from "./palette";

/**
 * PER-ERA ISLAND GROUND — what the island is made of, era by era, and the ratified ladder
 * that says what each era's ground becomes.
 *
 * Authority: **D-ERA26** (the island's terrain is per-era art), **D-ERA32** (*the island
 * carries the era; the buildings carry the lesson*) and **D-ERA33** (an advance re-dresses
 * the island WHOLESALE and the ground never stratifies) — all in
 * `docs/superpowers/specs/2026-07-27-era-progression-design.md` §5.2a/§5.2b, with the
 * anatomy, the ladder and the two cross-era constraints at
 * `docs/superpowers/specs/eras/README.md`.
 *
 * ## The gap this closes, and it was the largest one on screen
 *
 * `three/StarterIsland.tsx` had **no era concept at all**: it took `{ layout,
 * reducedMotion }`, its palette was a single `const C` of era-one hex, and its geometry was
 * era one's shore, camp and slipway. So all ten eras rendered era one's island, which is why
 * an era advance read as nothing happening — the island is the largest thing on screen and
 * D-ERA32's load-bearing half is that *"an era's identity has to be visible in the ground,
 * because the ground is the only large surface that changes at an advance."*
 *
 * `ceremonyScenes.tsx` reported it rather than fixing it, by name: *"the 3D island does not
 * turn … giving it one is a real change to a file this lane may not touch. Reported, not
 * built, which was the instruction."* This is that change.
 *
 * ## Authored coverage
 *
 * The ten-era ground ladder landed on 2026-07-30 and is **ratified design data** — the team
 * lead's D-ERA32/D-ERA33 rulings, with all ten island sections authored to artist depth on
 * the strength of them. {@link ERA_GROUND_LADDER} is that table, transcribed verbatim, and it
 * is **TOTAL over the ten eras**: every era has a ratified sentence for what its ground is
 * and for the step from the era before.
 *
 * Eras one and two keep their bespoke starter and worked-field treatments. Eras three through
 * seven are the five supplied terrain references, adapted through each era guide's D-ERA26
 * ground, shoreline, water, and vegetation requirements in `islandDesign.ts`. Their pigments
 * describe terrain rather than borrowing the building body/accent palette.
 *
 * Eras eight through ten still take {@link UNAUTHORED_ISLAND_GROUND}. The fallback remains a
 * visible, deliberate state until those island designs are supplied.
 *
 * ## ⚑ ERA TWO IS NOW A ROW, AND IT NEEDED NO NEW PIGMENT AT ALL
 *
 * The original fallback rule was **over-applied to era two**, which left era two's island on
 * the grey fallback while its ROADS were authored — an
 * island that read as unfinished in the one era whose guide says the island is where its
 * identity lives. What resolved it is that era two's guide does not need a ground palette,
 * because it authors era two's ground **by reference to era one's**:
 *
 * > *"The island reads in two families for the first time: ground somebody has broken, and
 * > ground nobody has touched. The untouched half is era one's exactly and is not
 * > re-authored — pale dry tussock over packed earth, bare rock still showing on the high
 * > ground."*
 *
 * The water is *"unchanged in colour and depth"*, the shoreline *"deliberately almost
 * unchanged, and that is a decision"*, and the wild planting is *"era one's planting,
 * unchanged and now doing a new job"*. So {@link ERA_TWO_TERRAIN} is era one's table
 * transcribed, and that is a RATIFIED reading of era two's guide rather than a fallback
 * wearing an era-two label — see its own block for why the two are not the same claim.
 *
 * The half that IS era two's own is the **worked plots** ({@link ERA_TWO_WORKED_PLOTS}), and
 * they are painted in era one's already-authored bare-soil values because the guide fixes
 * them by RELATION rather than by hex: worked ground is *"darker than the tussock beside
 * it"*, and *"the road tread is darker than every worked surface on the island including
 * freshly broken soil"*. Nothing here reads era two's PROPOSED body or accent hue, which
 * cover a building's wall and are Evan's open decision.
 *
 * **What era two's ground still owes is most of its section**, named in
 * {@link ERA_TWO_WORKED_PLOTS} so nobody mistakes this row for the art pass.
 *
 * ## The fallback is VISIBLE and DELIBERATE, which is the whole point
 *
 * It would have been easy to make an unauthored era fall back to era one's dressing, and that
 * is precisely the defect: era one's island in Early Modern is indistinguishable from *the
 * advance did nothing*. `roadSurfacing.ts` already ruled on the same question for the same
 * reason — *"the honest fallback is the plainest thing a road can be rather than an invented
 * surface or a borrowed one from the previous era"* — and this follows it.
 *
 * **The fallback makes exactly two moves, and no more.** See
 * {@link UNAUTHORED_ISLAND_GROUND} for each with its authority. What it deliberately does NOT
 * touch is the island itself — its mass, its shelving shore, the lagoon, the boulder and
 * gravel scatter, and the wild margin vegetation — because those are terrain rather than an
 * era's dressing, and no later era authors a plant or a water colour either. A fallback that
 * stripped them would be a demolition wearing an honesty argument.
 *
 * ## Why this module holds no `three` import
 *
 * Same reason `winterTones.ts` does not: the ceremony's beat-four scene and the era-advance
 * copy both read the ladder, and they are reached from `CitySurface`'s static import graph. A
 * table of numbers and strings can be read from either side for free, where a module that
 * opens `import * as THREE` would pull `three` into the city's first chunk.
 */

/* -------------------------------------------------------------------------- */
/* The ratified ten-era ladder                                                */
/* -------------------------------------------------------------------------- */

/** One era's row of the ground ladder: what the ground IS, and the step to it. */
export interface IslandGroundLadderRow {
  /**
   * What the walking surface is made of, and what has been done to it. Verbatim from
   * `eras/README.md`'s *"The ten-era ladder, one line each"*, second column.
   */
  readonly ground: string;
  /**
   * The step from the era before — the sentence that says what a player watching an advance
   * INTO this era is seeing. Verbatim from the same table's third column.
   */
  readonly step: string;
}

/**
 * THE LADDER, all ten rows, transcribed verbatim from `eras/README.md`.
 *
 * **Total rather than `Partial`**, which is the one place this module differs in shape from
 * `eraDressing.ts` and `roadSurfacing.ts` — and the difference is the finding: the ladder is
 * ratified for all ten eras, so an era's *words* are always available even where its
 * *pigment* is not. The bold emphasis of the source table is dropped because these are
 * rendered as text rather than as markdown; nothing else is edited, abridged or reworded.
 *
 * `islandGroundLadder` is the accessor; `islandGround.test.ts` pins the table's keys against
 * `ERA_SEQUENCE` in both directions, so an era added to the sequence without a row fails
 * rather than silently reading as an era with nothing to say.
 */
export const ERA_GROUND_LADDER: Readonly<Record<EraId, IslandGroundLadderRow>> = {
  prehistoric: {
    ground:
      "Packed bare earth and dry tussock, worn to soil where people walk. Nothing planted, in rows or fenced",
    step: "The floor. Barely-altered land, and the baseline every later shore departs from",
  },
  neolithic: {
    ground:
      "Worked soil in a settlement's worth of small hand-broken plots, in four states at once — freshly broken, standing crop, stubble, fallow — against untouched tussock",
    step: "Wild becomes worked. The ground is done something to for the first time: turf stripped, stones picked out, furrows hoed, a boundary put round it",
  },
  bronze_age: {
    ground:
      "Terraced plots behind dry-laid stone revetments, metalled routes, level bare earth between",
    step: "Traction and stone. An animal that can pull a cart can pull an ard, so furrows run a plot's full length and the fields go straight — and the water grows a wall",
  },
  classical: {
    ground:
      "Fitted stone slabs to a camber, kerbed and guttered, laid to a regular bond that runs under everything",
    step: "Loose aggregate becomes a floor. One continuous plane that does not change where a building stops — and the fields leave the island",
  },
  medieval: {
    ground:
      "Era four's floor sunk, tilted, rutted and patched; new ground cobbled in rough fans; beaten earth and a gutter down the lane",
    step: "State, not material. The one era that brings almost no new surface: the floor that was to a line is no longer to a line, and the camber is gone",
  },
  renaissance: {
    ground:
      "Geometric paving — banded, diagonal or radiating — composed across the whole open ground, on stepped platforms with moulded edges",
    step: "Pattern and level. The same stone re-laid to a drawing, with the setting-out cut into it: bench marks and a meridian line",
  },
  industrial: {
    ground:
      "Setts and engineering brick with iron rails let into them, cinder and clinker elsewhere, soot-darkened unevenly and downwind",
    step: "The light goes out. Clean pale composition becomes dark identical machine-made units organised by where things must be dragged",
  },
  atomic_age: {
    ground:
      "Poured concrete bays with wide expansion joints and a broom finish, asphalt, painted lines; the rails lifted, their beds surviving as scars",
    step: "The only advance that gets lighter, and the ground stops being laid and starts being poured. The last era with soil underfoot",
  },
  information_age: {
    ground:
      "Precise unit paving on structure — large-format slabs, banded setts, resin-bound gravel — with flush covers, tactile paving and uplighters in the pattern",
    step: "Poured becomes laid. A monolith divided by a few structural joints becomes thousands of small units — the same unitising its buildings do",
  },
  cyberpunk: {
    ground:
      "A deck of perforated metal, dark composite and resin over the older ground, with gaps and grilles you see down through. Wet, reflective, and nothing is soil",
    step: "Sealed becomes open. Era nine's floor hid what was under it; era ten lets you look through to it, which closes the arc that began on bare earth",
  },
};

/** The ratified ladder row for an era. Total — every era has one. */
export function islandGroundLadder(eraId: EraId): IslandGroundLadderRow {
  return ERA_GROUND_LADDER[eraId];
}

/* -------------------------------------------------------------------------- */
/* The tones the island's terrain is painted with                             */
/* -------------------------------------------------------------------------- */

/**
 * Every tone the island's TERRAIN is drawn in. Per-era, because D-ERA26 makes the terrain
 * per-era art.
 *
 * An era's own PROPS are not here and are not per-era data: era one's camp — a hearth ring, a
 * drying rack, a midden, flint chips, a hide boat — is authored content belonging to era one,
 * and its tones live beside the geometry that draws it in `three/StarterIsland.tsx`. This
 * table is the surfaces every island has.
 */
export interface IslandTerrainTones {
  /** The lagoon, pale at the shore and deepening outward. */
  readonly shallows: number;
  readonly deepWater: number;
  /**
   * THE WALKING SURFACE, and the pale variation within it. This is the axis the ladder says
   * must carry the age: it is the largest surface, it is under everything else, and it is the
   * one a player cannot look away from.
   */
  readonly ground: number;
  readonly groundPale: number;
  /** Bare soil worn through the ground, in three values, plus the island's submerged mass. */
  readonly earth: number;
  readonly earthWorn: number;
  readonly earthDeep: number;
  /** The shelving shore: coarse sand into gravel, darkening as it wets. */
  readonly coarseSand: number;
  readonly gravel: number;
  readonly gravelWet: number;
  /** Vegetation: a trunk, low scrub, and the reeds standing in the shallows. */
  readonly trunk: number;
  readonly scrub: number;
  readonly reed: number;
  /** The tones a tree canopy picks from. */
  readonly foliage: readonly number[];
  /** Blade tones for grass clumps on the ground, and for reeds in the water. */
  readonly bladeTones: readonly number[];
  readonly reedTones: readonly number[];
  /** A small range of cool/warm greys so no two boulders match. */
  readonly rockTones: readonly number[];
  /**
   * The placement grid's line, as a CSS colour string — it is drawn to a 2D canvas rather
   * than to a material, which is why this one is not a hex number.
   */
  readonly gridLine: string;
}

/**
 * ERA ONE'S TERRAIN — the authored, shipped, measured row, and the ladder's floor.
 *
 * Moved here from `three/StarterIsland.tsx`'s `const C` rather than re-authored: these are the
 * exact values that file shipped, and `islandGround.test.ts` is what stops the two drifting.
 * Era one's guide records why it is the one era not re-specified under D-ERA32 — *"era one is
 * the floor every other era is a departure from, and nine guides now quote it"* — and why it
 * is the best-specified of the ten.
 *
 * ## The chroma is deliberate, and a first pass proved it
 *
 * The materials are the era's four and no more — earth, timber, thatch, undressed stone, no
 * paint and no metal — but the CHROMA is not part of that restraint. A first pass authored
 * tan-on-tan for period honesty and the island rendered archaeological rather than inviting.
 * `City_Art_Bible.md` §0 asks for a *"stylized, low-fidelity, meaning-dense isometric toy city
 * on warm parchment: calm and instantly legible"* — and **calm is not drab**. So every hue
 * here carries real saturation while staying inside the material list. Judged in renders, not
 * in these numbers.
 *
 * ## The figure-ground measurement, kept because it is the reason for the values
 *
 * An earlier pass authored the ground paler than the buildings' own earth plates (0.53 against
 * their 0.43), which inverted figure and ground and left the settlement reading as dark
 * patches on bleached terrain; and a light, low-chroma ground washes out entirely under this
 * key light. The shipped ground is pitched at the same luminance the retired meadow had (0.42
 * against 0.41). The bare-earth tones stay in the family of the base plates era one's building
 * models bring with them (`#C6AC86` / `#BB9868` after the 18% lift), so a worn patch of island
 * reads as the SAME material as the earth a building stands on.
 *
 * The shore tones are held close in VALUE to the ground — barely above it dry, below it wet —
 * which is the whole of what keeps the shoreline a change of material rather than a bright
 * ring drawn round the island. Two passes learnt that the hard way. Nothing here is built, so
 * there is no dressed-stone, kerb or plank tone in this palette at all.
 *
 * ## The grid line is a RELATIONSHIP, not a colour
 *
 * Its colour took three passes and the third was measured. The retired pairing — a deep forest
 * green on a vibrant green meadow — worked because the line was dark, the ground had real
 * chroma, and both sat in one hue family, so the line read as a crease in the surface. Worn
 * soil on a low-chroma khaki broke the second and third of those; a warm cream broke the first
 * by going lighter than the surface. This deep olive on the vivid tussock reproduces the
 * relationship in era one's own palette. {@link UNAUTHORED_ISLAND_GROUND} reproduces the same
 * relationship again on a ground that is not green, which is what a per-era grid line has to
 * be able to do.
 */
export const ERA_ONE_TERRAIN: IslandTerrainTones = {
  // Water: slate mist (`City_Art_Bible.md` §1.1) pushed toward its aqua neighbour and kept
  // pale at the shore, deepening outward — calm, but with enough chroma to read as somewhere
  // you would land a boat rather than as weather.
  shallows: 0xa8d4d8,
  deepWater: 0x3f7f92,
  // Ground: sun-dried tussock grass over packed earth. A yellow-green rather than an emerald
  // lawn, because this ground has never been tended — but VIVID (see the docblock).
  ground: 0xa8b850,
  groundPale: 0xc2cc68,
  earth: 0xc9a06a,
  earthWorn: 0xb2854f,
  earthDeep: 0x8a6a45,
  coarseSand: 0xc9b98a,
  gravel: 0xb8a877,
  gravelWet: 0x998a63,
  // Vegetation: windblown and dry, but alive. No blossom and no autumn — a flowering
  // ornamental tree reads CULTIVATED, the one thing a pre-agricultural era cannot be.
  trunk: 0x8f6c45,
  scrub: 0x7f9a4e,
  reed: 0xaeb85e,
  foliage: [0x7ea350, 0x93b45f, 0x6b8f45],
  bladeTones: [0xc2cc68, 0xa8b850, 0x7f9a4e],
  reedTones: [0xaeb85e, 0xc2cc68],
  rockTones: [0x8b93a0, 0x8b8779, 0x7c8591, 0x9aa1ac, 0x6f7885],
  gridLine: "rgba(46,66,24,0.95)",
};

/**
 * WHAT AN ERA WITH NO AUTHORED GROUND SHOWS — visible, deliberate, and not era one's island.
 *
 * ## The two moves, each with its authority
 *
 * **1. The walking surface goes MID-VALUE and LOW-CHROMA.** This is the README's own durable
 * rule rather than a colour chosen here: *"the later the era, the more its ground must sit
 * MID-VALUE and LOW-CHROMA, because it has to hold nine eras of accumulated body hues at
 * once. A ground at either extreme of value serves one half of the city and abandons the
 * other."* An era whose material nobody has authored is exactly the case that rule is for —
 * it is the ground that has to carry every era's buildings and commit to none of their
 * materials. It is also unmistakably not era one's vivid yellow-green, which is the property
 * the fallback exists to have.
 *
 * **2. Era one's own dressing comes off** — the camp (a fire-blackened stone ring, a lashed
 * drying rack, a midden gone grey, a scatter of flint chips), the hide boat hauled out above
 * the waterline, and the worn routes between them that
 * those four are the reason for. Era one's guide authors all of it as era one's, and its
 * absent list is explicit that *"nothing is planted, in rows or fenced, nothing flowers, and
 * no stone meets the water"* — an era-one hide boat on a Early Modern island is the *silently
 * showing era one* defect at its most vivid. `three/StarterIsland.tsx` gates them on
 * {@link IslandGroundDressing.props}.
 *
 * ## What it deliberately leaves alone, and why that is not timidity
 *
 * The island's mass, its shelving shore, the lagoon, the boulder and gravel scatter, and the
 * wild margin vegetation all stay exactly as they are. Those are TERRAIN rather than an era's
 * dressing: no later guide authors a water colour, a plant colour or a beach, the ladder never
 * says an era has no margins, and era nine's own section asks for *more* planting rather than
 * less. Stripping them would be a demolition rather than a re-dress, and it would tell the
 * player something false — that the island itself is missing — where the true statement is
 * that its ground has not been dressed yet.
 *
 * ## The grid line is re-derived, not reused
 *
 * Era one's deep olive is tuned to a green ground and measures 2.87:1 against it with an 8°
 * hue gap (composited through the canvas alpha and the material opacity, Rec.709 relative
 * luminance). Left on this ground it would be a green line on a neutral surface — the exact
 * failure era one's third pass diagnosed, a line landing off its ground's hue with no chroma
 * to carry it. `rgba(46,42,36,0.95)` reproduces the RELATIONSHIP instead: **2.79:1 with a 3°
 * hue gap**, so the affordance is as strong as era one's and reads as a crease in this
 * surface rather than as a line drawn on it.
 */
export const UNAUTHORED_TERRAIN: IslandTerrainTones = {
  ...ERA_ONE_TERRAIN,
  // Mid-value, low-chroma, and warm rather than cold so it still sits on §1.1's parchment
  // base. Measured against the bare-earth road every unauthored era falls back to
  // (`UNAUTHORED_ROAD_SURFACING`, `#c9a06a`): the road separates from it on BOTH value (0.386
  // against 0.288 relative luminance) and chroma (47% saturation against 10%), so a laid road
  // still reads on ground whose own material is unknown.
  ground: 0x9a9184,
  groundPale: 0xb0a89c,
  gridLine: "rgba(46,42,36,0.95)",
  // THE BLADES FOLLOW THE GROUND OUT, and this is the one place where "inherit era one's
  // vegetation" would have been wrong. Era one's ground IS dry tussock grass, so its grass
  // clumps are painted in the ground's own two tones — the same material, which is the
  // authored fact rather than a shortcut. On a ground that is not grass those two tones are
  // era one's ground wearing a plant's shape, so the clumps take the tones that are
  // vegetation in their own right: the scrub and the reed, both unchanged from era one,
  // because no later guide authors a plant colour either.
  bladeTones: [ERA_ONE_TERRAIN.reed, ERA_ONE_TERRAIN.scrub],
  reedTones: [ERA_ONE_TERRAIN.reed, ERA_ONE_TERRAIN.scrub],
};

/* -------------------------------------------------------------------------- */
/* Era two — the same tussock, with the first worked ground in it              */
/* -------------------------------------------------------------------------- */

/**
 * ERA TWO'S TERRAIN — era one's table, transcribed on era two's guide's own instruction.
 *
 * ## Why this is not the fallback with a different name
 *
 * {@link UNAUTHORED_TERRAIN} exists because an era whose ground nobody has designed must not
 * silently show era one's, and it moves the walking surface off era one's tussock to say so.
 * That is the right answer for an era with **no authored sentence about its ground**. Era two
 * has a whole authored section, and what that section says about the untouched half is that it
 * *"is era one's exactly and is not re-authored"* — so transcribing era one's values here is
 * obeying era two's guide, and moving them would be disobeying it. The distinction is
 * observable rather than rhetorical: era two paints era one's tussock **and** worked plots
 * era one does not have, where the fallback paints neither.
 *
 * Every field is era one's because era two's guide changes none of them: the water is
 * *"unchanged in colour and depth"* (*"era two farms the water … by putting something in it,
 * not by altering it"*), the shore is *"deliberately almost unchanged, and that is a
 * decision"* because the built edge is the Bronze Age's move to make, and the wild vegetation
 * is *"era one's planting, unchanged and now doing a new job … the control against which the
 * sown ground reads"*. The grid line travels with the ground, and the ground has not moved.
 */
export const ERA_TWO_TERRAIN: IslandTerrainTones = { ...ERA_ONE_TERRAIN };

/**
 * One state a plot of worked ground is in, and the tone that paints it.
 *
 * A LIST rather than named slots, for the reason `roadSurfacing.ts` gives about its courses:
 * an era may have more states than another or none at all, and a table of fixed slots would
 * make "this era does not work its ground" unexpressible.
 */
export interface WorkedPlotState {
  /** Stable id, so a test can read a state back by name. */
  readonly id: string;
  /** The surface, in one of the island's already-authored bare-soil values. */
  readonly soil: number;
  /**
   * The ridge tone for a state whose surface is FURROWED, and absent for one that is not.
   *
   * Absence is a real authored distinction rather than a default: the guide furrows *"freshly
   * broken"* ground (*"soil turned and raked into furrows"*) and puts stubble in rows (*"the
   * only ground that reads striped"*), while fallow is *"broken once and left; weeds coming
   * back through it unevenly"* — a fallow plot with crisp furrows in it would be describing a
   * plot somebody is still working.
   *
   * ONE TONE STEP, which is the guide's own measure of a furrow at this camera: *"at the fixed
   * ~49° camera a furrow is a fine-pitched corrugation catching one tone step."* So each
   * furrowed state takes the next soil value UP its own three-value ladder rather than a new
   * hex, and the corrugation reads as the same soil catching the light.
   */
  readonly furrow?: number;
  /**
   * The standing vegetation over the soil, for a state that has a crop on it. Absent for the
   * three that are bare worked ground.
   */
  readonly crop?: WorkedPlotCrop;
}

/**
 * STANDING CEREAL — the fourth state, and the only one of the four that is not a decal.
 *
 * The guide's row is *"Cereal to knee or waist height, dense, hiding the soil entirely"*, and
 * *"the palest and the only tall ground surface"*. Its §"Vegetation" adds the property the
 * whole read hangs on: *"Tall, pale and gone to seed head at the top, standing well clear of
 * everything around it — this is the only vegetation on the island with a flat top, and that
 * flatness at zoom-out is what reads as crop before any detail resolves."*
 *
 * So the shape is a FLAT-TOPPED stand rather than a scatter of blades: the flat top is the
 * authored read, and a jittered canopy would destroy exactly the thing the guide says carries
 * it at distance. `three/StarterIsland.tsx` draws each stand as one many-sided block whose top
 * face takes {@link seedHead} and whose sides take {@link stalk}, with loose stalks round its
 * rim so the silhouette is not a drum.
 */
export interface WorkedPlotCrop {
  /**
   * Height of the stand in world units — *"to knee or waist height"*, against a citizen who
   * stands about half a hut tall. Above the island's 0.5u tussock clumps and well below its
   * 1.15u reeds, so the crop stands clear of the wild planting without competing with the
   * trees.
   */
  readonly height: number;
  /** The stalk, below the seed head: the stand's sides. */
  readonly stalk: number;
  /** The seed head — the flat top, and the only surface that has to be *the palest*. */
  readonly seedHead: number;
}

/**
 * THE THREE THINGS THAT DIVIDE ERA TWO'S GROUND, as a discriminated union on `kind`.
 *
 * A union rather than a set of flags for the reason `roadSurfacing.ts` gives about its road
 * courses: the renderer switches exhaustively, so a boundary kind added here is a COMPILE
 * ERROR until something draws it, rather than a row that silently renders nothing.
 *
 * The guide's rule is that *"everything that divides this island came out of the plot it
 * divides"*, and it names *"three kinds and no more"*:
 *
 *  - `clearance-heap` — the primary boundary, and *"heaps that have grown along, not walls
 *    that were built: no courses, no faces, no through-stones, no gateposts"*, knee-high,
 *    *"petering out entirely where a plot's stones ran out — which is the detail that says
 *    made of what the field gave up louder than any amount of texture"*;
 *  - `brushwood-line` — *"where there was no stone: cut scrub jammed between driven stakes,
 *    leaning, gappy, and obviously renewed in patches"*;
 *  - `scratched-ditch` — *"unlined, a scratch rather than a cut, with the spoil thrown up on
 *    one side as a low bank"*.
 *
 * None of them carries a tone, deliberately: all three are made of what the island already
 * has, so the renderer paints them from the era's own terrain values — the boulder greys for
 * the picked stones, the trunk and scrub for the stakes and the brush, the worn soils for the
 * scratch and its spoil. A boundary with a palette of its own would be a built thing.
 */
export type FieldBoundaryKind = "clearance-heap" | "brushwood-line" | "scratched-ditch";

export interface FieldBoundary {
  readonly kind: FieldBoundaryKind;
  /** How many of this kind ring the margin. */
  readonly count: number;
}

/**
 * WHERE THE CROP STOPS BEING A FIELD AND STARTS BEING A STORE.
 *
 * *"One patch of ground is worked and NOT sown, and it is the era's threshing floor … a patch
 * beaten bare, swept hard and pale, with the sledge parked on it and husk drifted off its
 * downwind edge. It sits between the plots and the settlement, because it is where the crop
 * stops being a field and starts being a store."*
 *
 * It is also the era's answer to a gap the guide flags at length: §7's box records that
 * re-authoring `RAD.2` as a sheep pen *"takes a step out of the middle of the era's own
 * material chain: harvest → thresh → winnow → store → grind → bake"*, and rules that threshing
 * *"should live as props and worked ground on buildings that already stand"* rather than as a
 * building — *"threshing is done on ground rather than in a structure, so a prop is not a
 * consolation prize here; it is what the activity actually is."* This is that ground.
 */
export interface ThreshingFloor {
  /**
   * The beaten, swept surface. *"Swept hard and pale"* is a relation, and the one authored
   * island tone that satisfies it is measured in {@link ERA_TWO_THRESHING_FLOOR}.
   */
  readonly floor: number;
  /** Husk drifted off the downwind edge — what the seed head becomes once it is beaten off. */
  readonly husk: number;
}

/**
 * ERA TWO'S WORKED GROUND — *"the plot is the era's unit of ground the way the brick is its
 * unit of wall"*, and the half of era two's island that is era two's own.
 *
 * ## The tones are RELATIONS the guide fixes, so no hex is invented here
 *
 * Era two's guide gives the four states' tones as positions against each other and against
 * their neighbours, never as values — *"the darkest ground on the island"*, *"mid, and the
 * only ground that reads striped"*, *"between worked and wild"* — and adds two hard
 * inequalities: the worked ground *"earns its read from VALUE CONTRAST against the pale
 * tussock, not from absolute darkness"*, and **do not let a furrow get as dark as a tread**,
 * because *"the road tread is darker than every worked surface on the island including freshly
 * broken soil"*.
 *
 * Era one's terrain already carries *"bare soil worn through the ground, in three values"*,
 * and those three satisfy both inequalities exactly as they stand — measured in three's
 * working space against the tussock (`#a8b850`, 0.280) and era two's authored road tread
 * (`ERA_TWO_HOLLOW`, `#7c5c37`, 0.115):
 *
 *   - freshly broken `earthDeep` `#8a6a45` — 0.157: darker than the tussock, and still
 *     LIGHTER than the tread, which is the guide's inequality in the one place it could break;
 *   - stubble `earthWorn` `#b2854f` — 0.262: below the tussock, above the broken soil;
 *   - fallow `earth` `#c9a06a` — 0.364: the state *"between worked and wild"*, and the same
 *     value the road's own verge takes, so a fallow plot and a path edge read as one material.
 *
 * They are also the tones the island's worn patches already use, which is the point rather
 * than a coincidence: a plot somebody broke by hand is the same soil as a path somebody wore,
 * and D-ERA30's road note is explicit that the two systems are ONE material family separated
 * by value.
 *
 * ## THE FOURTH STATE, and where its two tones come from
 *
 * *"A settlement's fields are never all in one state, and authoring all four at once is what
 * makes the island read as farmed rather than as a green patch."* The three above are soils;
 * the fourth is standing cereal, and it needs a value for a surface the island's palette has
 * no entry for. Both of its tones are CONSUMED from ratified tables rather than invented, and
 * the one relation that had to be satisfied was measured rather than eyeballed:
 *
 *   - the **seed head** is `City_Art_Bible.md` §1.1's **parchment deep `#D9CCB2`**, taken
 *     through `palette.ts`'s `BASE` so this reads the same table the whole city recolours
 *     from. The guide requires the crop to be *"the palest"* ground surface, and the surface
 *     it actually has to beat is not the tussock but the tussock's own pale variation
 *     `groundPale` at **0.5565** relative luminance — every other authored island tone loses
 *     to that, including `coarseSand` at 0.4895. Parchment deep measures **0.6115**, which
 *     clears it with room while staying well short of §1.1's parchment itself (0.7802), where
 *     a stand of cereal would read as blown-out paper rather than as a crop;
 *   - the **stalk** is era one's authored `reed` **`#aeb85e`** at 0.4409 — the island's own
 *     cereal-shaped blade tone, above the tussock's 0.4318 so the stand reads pale from top to
 *     bottom, and below the seed head so the flat top is legible as the seed head at distance.
 *
 * Nothing here reads era two's **PROPOSED** body `#D9C288` or accent `#A2503A`. Those cover a
 * building's wall and are Evan's open decision; the temptation is real, because the palette
 * section's own line is that era two's walls *"become the colour of the harvest"* — but a hue
 * argued for a brick is not a ratified value for a crop, and consuming it here would ship an
 * undecided palette onto the ground.
 *
 * ## ⚑ WHAT IS STILL OWED, after this pass
 *
 * The **worked field is now complete** — four states, furrows, all three boundaries and the
 * threshing floor. What remains is the WATER'S EDGE and the MARGIN PROPS, deferred as a
 * separate pass rather than half-drawn here:
 *
 *   - the **timber skid track** down the slipway (*"split logs, half-sunk, to drag hulls
 *     over"*), which belongs with the shore rather than with the fields;
 *   - the **fish traps** — *"woven withy baskets and a low stake line running out from the
 *     beach, **visible under the surface**"*. **Blocked on a design question rather than on
 *     effort:** the lagoon is an opaque `MeshStandardMaterial` (`buildSea`), so nothing below
 *     the waterline renders at all. Drawing these as authored needs era one's shipped water to
 *     become translucent, and era two's guide is explicit that *"the water itself is unchanged
 *     in colour and depth"* — so it is not era two's water to move. Evan or whoever owns the
 *     lagoon should rule;
 *   - the **margin additions** (querns with husk, storage pits at two diameters with the spoil
 *     beside the newest, a stook, a raised platform with sacks, potsherds in a bigger midden, a
 *     penned corner of scrub). Seven or eight distinct props, the largest volume of the three,
 *     and the least load-bearing for the era read — era one's camp already occupies that ring,
 *     and era two's version of it is *more of the same plus potsherds*.
 *
 * A dozen plots is the guide's own count — *"A dozen or so is the right number; enough to read
 * as a farmed settlement, few enough that each is legibly somebody's"* — and where they may
 * sit is not a choice either: the guide puts the fields *"in the ring that already holds era
 * one's scatter"* outside `BUILDABLE_RADIUS + 3`, *"so the buildings stand on the pale ground
 * and the fields surround them"*, which is also the radius-25 floor every island decal is
 * held to. `three/StarterIsland.tsx` draws them, on the ground-decal ladder's existing `worn`
 * rung; `eraTwoGround.test.ts` pins the rung, the radius and the inequalities above.
 */
export const ERA_TWO_WORKED_PLOTS: readonly WorkedPlotState[] = [
  {
    id: "freshly-broken",
    soil: ERA_ONE_TERRAIN.earthDeep,
    furrow: ERA_ONE_TERRAIN.earthWorn,
  },
  { id: "stubble", soil: ERA_ONE_TERRAIN.earthWorn, furrow: ERA_ONE_TERRAIN.earth },
  {
    id: "standing-crop",
    // The soil under the stand. Drawn, and then almost entirely hidden — *"dense, hiding the
    // soil entirely"* — so it shows only where the stand's rim breaks up.
    soil: ERA_ONE_TERRAIN.earthWorn,
    crop: {
      // WAIST rather than knee, which is the top of the guide's own range and is where it had to
      // go: at knee height the stand read from a 49° camera as a pale lid on the plot, because
      // almost none of its stalk side was in shot. `#eraTwoField.browser.test.tsx` holds the
      // frames the two heights were judged in.
      height: 0.72,
      stalk: ERA_ONE_TERRAIN.reed,
      seedHead: BASE.parchmentDeep,
    },
  },
  { id: "fallow", soil: ERA_ONE_TERRAIN.earth },
];

/**
 * The worked-ground states, era by era. **Era two only** — era one's ground is *"nothing
 * planted, in rows or fenced"* by its own absent list, while the later island designs carry
 * their cultivation in the dedicated terrain-feature layer rather than this Era 2 field model.
 */
export const ERA_WORKED_PLOTS: Readonly<
  Partial<Record<EraId, readonly WorkedPlotState[]>>
> = {
  neolithic: ERA_TWO_WORKED_PLOTS,
};

/**
 * ERA TWO'S FIELD BOUNDARIES — all three kinds, and the counts are the guide's own emphasis.
 *
 * Stone dominates because the guide says it does: clearance heaps are *"the primary
 * boundary"*, brushwood goes only *"where there was no stone"*, and a ditch appears only
 * *"where a plot meets a path or a wet corner needs draining"*. So the counts descend, and a
 * reader can see the ranking in the data rather than having to trust the renderer.
 *
 * **Nothing encloses the whole island**, which is a constraint rather than a detail: *"the
 * boundaries are around plots, not around the settlement — there is no wall, no palisade, no
 * defensive line, and nothing that reads as a perimeter. This era has decided where things
 * grow; it has not yet decided who is outside."* Six boundaries against twelve plots cannot
 * close a ring, and `eraTwoGround.test.ts` asserts the gap rather than leaving it to the eye.
 */
export const ERA_TWO_FIELD_BOUNDARIES: readonly FieldBoundary[] = [
  { kind: "clearance-heap", count: 3 },
  { kind: "brushwood-line", count: 2 },
  { kind: "scratched-ditch", count: 1 },
];

/**
 * ERA TWO'S THRESHING FLOOR, and its two tones are the same kind of measured relation the crop
 * needed.
 *
 * *"Beaten bare, swept hard and pale"* has to beat the worked soils AND the tussock it sits
 * among, and the island's authored `coarseSand` `#c9b98a` does at **0.4895** relative
 * luminance against the tussock's 0.4318 and every worked state below that. It is the right
 * material as well as the right value: a floor beaten hard and swept clean of husk is grain
 * dust and fine grit, not soil, and `coarseSand` is the island's only authored value for that.
 *
 * The **husk** takes the crop's own seed-head tone. That is not a shortcut — husk is what a
 * seed head becomes once it has been beaten off the stalk, so the two being one value is the
 * material fact. It also makes the drift read as continuous with the standing crop nearby,
 * which is the sequence the floor exists to complete.
 */
export const ERA_TWO_THRESHING_FLOOR: ThreshingFloor = {
  floor: ERA_ONE_TERRAIN.coarseSand,
  husk: BASE.parchmentDeep,
};

/* -------------------------------------------------------------------------- */
/* Era two at the water's edge                                                 */
/* -------------------------------------------------------------------------- */

/**
 * THE TIMBER SKID TRACK — *"the gravel slipway is now worn broad and has a timber skid track
 * laid down it — split logs, half-sunk, to drag hulls over. Still no jetty."*
 *
 * **It carries no tone**, for the same reason the field boundaries carry none: it is made of what
 * the island already has. Split logs are worked wood, and the island's authored worked-wood value
 * is era one's `timber` on the drying rack and the boat's gunwale, so `three/StarterIsland.tsx`
 * paints them from that rather than from a row here — a skid track with a palette of its own
 * would be claiming a material the era does not have.
 *
 * Era one's former gravel trail was later retired by explicit user direction because it read as
 * a diagonal rock pile. This track remains Era two's first worked landing and is drawn as a
 * separate pass over the same shelving-shore helpers; it does not bring Era one's removed gravel
 * or pebbles back.
 */
export interface SkidTrack {
  /** How many split logs are laid across the track. */
  readonly logs: number;
}

/**
 * FISH TRAPS — *"the water is now worked for the first time: fish traps in the shallows, woven
 * withy baskets and a low stake line running out from the beach"*.
 *
 * ## ⚑ A DOCUMENTED DEPARTURE, ruled by Evan on 2026-07-31
 *
 * The guide asks for the traps *"visible under the surface"* and, four sentences earlier, that
 * *"the water itself is unchanged in colour and depth"*. **Both cannot hold.** `three/StarterIsland.tsx`'s
 * `buildSea` is an opaque `MeshStandardMaterial`, so nothing below `WATERLINE_Y` renders at all,
 * and making it translucent is a change to the water.
 *
 * **The ruling is for the constraint over the image.** The lagoon is era one's surface and every
 * later era inherits it, so re-dressing it to serve one era's props has the larger blast radius.
 * So the traps read as worked water **from above the waterline alone**, which is the harder brief:
 * a viewer who cannot see under the water must still read *somebody has put something in this
 * water on purpose*. Two cues carry it, in this order of strength:
 *
 *  1. **stake tops proud of the surface, in a deliberate line** — the strongest available, and the
 *     reason the stakes are drawn as a converging V rather than a scatter. A straight-ish run of
 *     posts standing out of water is not a thing nature makes;
 *  2. **basket rims breaking the surface** at the V's mouth, so the line is seen to lead somewhere.
 *
 * **What was explicitly ruled out:** faking translucency with a pale patch on the water where the
 * traps would be. That alters the water by another route, which is the thing the ruling protects.
 *
 * The departure is also recorded in the era-two style guide's own Water section, in the `⚑` form
 * that section already uses for its open questions, so a reader of the guide is not left thinking
 * the traps were simply drawn wrong.
 *
 * ## The two tones, both consumed
 *
 * The **stake** is era one's `trunk`, the island's authored raw-wood value: a driven stake is a
 * sharpened branch rather than a worked timber, which is also what keeps it reading apart from
 * the skid track's split logs a quarter of the island away. The **basket** is era one's `reed`,
 * and that is a material fact rather than a convenience — a withy basket is woven out of exactly
 * what grows in the shallows it is set in, and the reeds standing beside it are painted the same.
 */
export interface FishTraps {
  /** Driven stakes, whose tops stand proud of the lagoon. */
  readonly stake: number;
  /** Woven withy baskets, whose rims break the surface. */
  readonly basket: number;
}

/**
 * ERA TWO'S WATER EDGE. Era one keeps a hauled-out hide boat but no laid rock trail and does
 * nothing to its water, so both worked-water rows are era two's first.
 */
export const ERA_TWO_SKID_TRACK: SkidTrack = { logs: 8 };

export const ERA_TWO_FISH_TRAPS: FishTraps = {
  stake: ERA_ONE_TERRAIN.trunk,
  basket: ERA_ONE_TERRAIN.reed,
};

/** The skid track, era by era. **Era two only.** */
export const ERA_SKID_TRACK: Readonly<Partial<Record<EraId, SkidTrack>>> = {
  neolithic: ERA_TWO_SKID_TRACK,
};

/** The fish traps, era by era. **Era two only** — era two is where the water is first worked. */
export const ERA_FISH_TRAPS: Readonly<Partial<Record<EraId, FishTraps>>> = {
  neolithic: ERA_TWO_FISH_TRAPS,
};

/** The field boundaries, era by era. **Era two only** — see {@link ERA_WORKED_PLOTS}. */
export const ERA_FIELD_BOUNDARIES: Readonly<
  Partial<Record<EraId, readonly FieldBoundary[]>>
> = {
  neolithic: ERA_TWO_FIELD_BOUNDARIES,
};

/** The threshing floor, era by era. **Era two only** — it is era two's own material chain. */
export const ERA_THRESHING_FLOOR: Readonly<Partial<Record<EraId, ThreshingFloor>>> = {
  neolithic: ERA_TWO_THRESHING_FLOOR,
};

/* -------------------------------------------------------------------------- */
/* The dressing, and the lookup                                              */
/* -------------------------------------------------------------------------- */

/** The island's dressing for one era: its terrain tones, its props, and its ladder row. */
export interface IslandGroundDressing {
  readonly tones: IslandTerrainTones;
  /** The later-era terrain composition, or `null` for the bespoke Era 1/2 islands. */
  readonly design: EraIslandDesign | null;
  /**
   * The states this era's WORKED ground is in, lowest-effort first. Empty for every era that
   * does not work its ground, so the renderer draws no plots rather than branching on an era.
   */
  readonly plots: readonly WorkedPlotState[];
  /**
   * What divides this era's plots. Empty for an era that divides nothing, so a ground with no
   * fields on it cannot grow a boundary round nothing.
   */
  readonly boundaries: readonly FieldBoundary[];
  /**
   * Where this era's crop stops being a field and starts being a store, or `null` for an era
   * that has no crop to thresh.
   */
  readonly threshingFloor: ThreshingFloor | null;
  /** Timbers laid down the landing, or `null` for an era with no worked landing. */
  readonly skidTrack: SkidTrack | null;
  /** What this era has put in its water, or `null` for an era that only looks at it. */
  readonly fishTraps: FishTraps | null;
  /** Whether the starter camp, hide-boat landing, and worn routes remain on this island. */
  readonly props: boolean;
  /** The ratified ladder row, which every era has (see {@link ERA_GROUND_LADDER}). */
  readonly ladder: IslandGroundLadderRow;
  /**
   * `"authored"` — this era's own ground is on screen.
   * `"unauthored"` — its palette is not ratified, so the island wears
   *   {@link UNAUTHORED_TERRAIN} and a surface may say so. Never era one's.
   */
  readonly art: "authored" | "unauthored";
}

/**
 * The authored island grounds, era by era. Eras one and two are bespoke; Eras three through
 * seven come from the five supplied terrain references and their D-ERA26 style-guide sections.
 */
export const ERA_ISLAND_GROUND: Readonly<Partial<Record<EraId, IslandTerrainTones>>> = {
  prehistoric: ERA_ONE_TERRAIN,
  neolithic: EVAN_ISLAND_DESIGNS.neolithic.terrain,
  bronze_age: ERA_THREE_TO_SEVEN_ISLANDS.bronze_age.terrain,
  classical: ERA_THREE_TO_SEVEN_ISLANDS.classical.terrain,
  medieval: ERA_THREE_TO_SEVEN_ISLANDS.medieval.terrain,
  renaissance: ERA_THREE_TO_SEVEN_ISLANDS.renaissance.terrain,
  industrial: ERA_THREE_TO_SEVEN_ISLANDS.industrial.terrain,
  atomic_age: EVAN_ISLAND_DESIGNS.atomic_age.terrain,
  information_age: EVAN_ISLAND_DESIGNS.information_age.terrain,
  cyberpunk: EVAN_ISLAND_DESIGNS.cyberpunk.terrain,
};

const ERAS_WITH_STARTER_PROPS: ReadonlySet<EraId> = new Set(["prehistoric"]);

/** Whether this era's own ground palette is authored, as opposed to the fallback. */
export function hasAuthoredIslandGround(eraId: EraId): boolean {
  return eraId in ERA_ISLAND_GROUND;
}

/**
 * The dressing to render the island with. TOTAL: always returns something paintable, so the
 * renderer never branches on absence and the island always draws — the same contract
 * `roadSurfacing` keeps, and for the same reason. A caller that needs to know which it got
 * reads `art`.
 */
export function islandGround(eraId: EraId): IslandGroundDressing {
  const authored = ERA_ISLAND_GROUND[eraId];
  return {
    tones: authored ?? UNAUTHORED_TERRAIN,
    design: eraIslandDesign(eraId),
    plots: ERA_WORKED_PLOTS[eraId] ?? [],
    boundaries: ERA_FIELD_BOUNDARIES[eraId] ?? [],
    threshingFloor: ERA_THRESHING_FLOOR[eraId] ?? null,
    skidTrack: ERA_SKID_TRACK[eraId] ?? null,
    fishTraps: ERA_FISH_TRAPS[eraId] ?? null,
    props: ERAS_WITH_STARTER_PROPS.has(eraId),
    ladder: islandGroundLadder(eraId),
    art: authored ? "authored" : "unauthored",
  };
}

/**
 * The fallback dressing on its own, for a test or a caller that wants to compare against it
 * without going through an era. Named for symmetry with `UNAUTHORED_ROAD_SURFACING`.
 */
export const UNAUTHORED_ISLAND_GROUND: IslandTerrainTones = UNAUTHORED_TERRAIN;
