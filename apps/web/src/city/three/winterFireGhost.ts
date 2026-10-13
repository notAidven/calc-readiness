import type { WinterActionTier } from "@cr/game";
import * as THREE from "three";

import { cellCenter } from "../worldLayout";
import { buildHearth, FLAME_MESH_NAME, FUEL_STEPS } from "./winterFire";
import {
  ALL_EXPOSED,
  buildCellTerrain,
  type CellExposure,
  type CellTerrainSpec,
  facedMaterial,
} from "./winterScene";
import { WINTER_GROUND_TONES } from "./winterTones";

/**
 * **WHAT A FIRE HERE WOULD LOOK LIKE, DRAWN AS THE FIRE AND NOT AS A FRAME ROUND IT.**
 *
 * The candidate cells used to carry four raised bars each, toned per tier out of
 * `WINTER_PREVIEW_TONES` — `0x7fa8c4` / `0x4f86b0` / `0x2f5f8c`. The lead's words on the
 * render: *"it shouldnt display this chunky looking blue (its fire, not snow). it should show
 * a preview of what the fire looks like in the actual game."*
 *
 * **THE HUE WAS THE WORSE HALF OF IT, AND IT WAS NOT AN ARBITRARY BAD PICK — IT WAS THE
 * WINTER'S OWN COLOUR.** Frost is `0xdce8f2`, the frost line `0x9fc0d8` and the cold lagoon
 * `0x2f5a63`: blue is what this scene has spent on ICE. Marking the one action that pushes
 * frost BACK in three more blues told the player the affordance was more of the thing they
 * were losing to. The tier bands were legible and they were legible in the wrong language.
 *
 * ## The convention this follows is `GhostBuilding.tsx`, not a new one
 *
 * City placement already answers "what would go here" by drawing the actual model translucent
 * at the candidate spot. That is the house pattern and this is the same problem, so the
 * candidate now shows a GHOST OF THE RESULT: the ochre held-ground patch in the exact terrain
 * treatment a real warded cell gets, with a ghosted hearth and flame standing on the cell the
 * fire would be lit on.
 *
 * **{@link WARDED_TERRAIN} is the load-bearing part of "reuse rather than redraw".** It is the
 * ONE definition of what held ground looks like, and `WinterGround.tsx` puts this same object
 * in its `TERRAIN.warded` slot rather than keeping a copy — so the preview and the fact are the
 * same spec by construction, and a re-tone of held ground cannot leave a preview promising the
 * old one. The hearth is `winterFire.ts`'s own `buildHearth`, ghosted, for the same reason:
 * there is no second fire in this codebase to drift from the first.
 *
 * **Sharing the spec turned out not to be enough, and {@link buildHeldGroundTile} is the
 * repair.** The two surfaces shared every value in that object and still drew different
 * pictures, because the RIM is decided by an argument the spec does not carry — see
 * {@link HELD_TILE_RIM} for the whole of that finding. Both now go through one builder, so
 * "the promise and the fact are the same" is a claim about vertex buffers rather than about
 * two call sites that happen to agree today.
 *
 * ## A proposal, not a fact — three channels say so
 *
 * A ghost that looked exactly like a lit fire would tell the player the fire is already there.
 * `GhostBuilding` separates the two with translucency, and this takes the same three: every
 * material is `transparent` at an opacity well under one, `depthWrite` is off so the ghost
 * never occludes what it is proposed over, and the flame's emissive ramp is damped to
 * {@link GHOST_HEAT} — a proposed fire glows, but visibly less than one that caught. Put a
 * ghost beside a real hearth and the real one is the solid one.
 *
 * ## What the extent trade actually was
 *
 * The frames were replaced by FILLED patches, and a fill can hide what is under it — which is
 * the argument the outline treatment shipped with, and it was a real one: a player aiming a
 * fire needs to see what is already frozen inside the band. The patch is translucent for that
 * reason and not only to read as provisional, so the frost underneath shows through it.
 *
 * The other half of extent is that THREE nested bands have to stay countable, and here the
 * ghost is strictly better than the frames were. {@link GHOST_OPACITY} ramps by tier, and the
 * ramp MEANS something the three blues did not: `tier_by_cell` records the weakest tier that
 * reaches a cell, so a `weak` cell is held whatever the player scores and a `strong` cell is
 * held only if they ace the batch. Opacity is therefore CERTAINTY — the inner disc is nearly
 * solid ochre because it is nearly promised, and the outer ring is thinner because it is not.
 * The feathered rim lands on every CELL rather than on every band boundary, so all three discs
 * keep a visible edge and so does everything inside them — see {@link HELD_TILE_RIM}, which is
 * where that stopped being an accident of how the bands were collected and became the rule.
 *
 * **THE FLOOR OF THE RAMP WAS RAISED OFF A PHOTOGRAPH, NOT OFF THE TABLE.** The first values
 * were 0.62 / 0.44 / 0.28, which is a clean ramp and read badly: alpha composites against what
 * is BEHIND it, and what is behind it is near-white snow (`SNOW_LIT` is `0xeef5f4`), so ochre
 * at 0.28 over snow is a pale tan rather than a warm patch. The outer band — the ground the
 * player is deciding whether accuracy is worth reaching for — was the one that nearly
 * disappeared. Judged at 1024x580 at the shipped camera, which is where the loss shows; the
 * arithmetic looked fine at every value in both sets.
 */

/** How much of the flame's authored emissive ramp a PROPOSED fire is allowed. */
export const GHOST_HEAT = 0.45;

/**
 * Opacity per tier band: how certain the player is to actually get this ground.
 *
 * `none` is listed and is zero-reach in practice — a fire that never caught holds nothing, so
 * the engine never labels a cell with it. It is kept in the table because the record is keyed
 * by {@link WinterActionTier} and a missing arm would be an implicit `undefined` opacity.
 */
export const GHOST_OPACITY: Readonly<Record<WinterActionTier, number>> = {
  none: 0,
  weak: 0.74,
  steady: 0.58,
  strong: 0.42,
};

/** How solid the proposed hearth and flame are. `GhostBuilding` uses 0.5 for the same job. */
export const GHOST_HEARTH_OPACITY = 0.52;

/**
 * **THE ONE DEFINITION OF WHAT GROUND A FIRE IS HOLDING LOOKS LIKE.**
 *
 * `WinterGround.tsx` imports this as its `TERRAIN.warded`, and the preview below builds from
 * it, so there is exactly one held-ground treatment and the promise cannot drift from the
 * result. Its values reach down toward the island's worn earth (`#B2854F`) from era one's own
 * bare earth, and its rim is feathered — bounded, so the patch ends ragged without the extent
 * becoming uncountable.
 */
export const WARDED_TERRAIN: CellTerrainSpec = {
  color: WINTER_GROUND_TONES.warded,
  dish: 0.12,
  segments: 4,
  edge: "feather",
  values: [0.7, 0.82, 0.92, 1.0],
};

/**
 * **HELD GROUND IS RIMMED ON ALL FOUR SIDES OF EVERY CELL — PER TILE, NEVER PER REGION. THIS
 * OVERTURNS A RULING, AND THE RULING IT OVERTURNS IS CARRIED FORWARD RATHER THAN DELETED.**
 *
 * The lead, on a committed fire: *"everything looks good on the first era crisis except the
 * tiles that are protected by fire; instead of making all the tiles overlap, just make the
 * tiles protected by the real fire look like it does in the preview, with each tile
 * individually protected as shown in image"*.
 *
 * ## The two treatments were never two treatments, and the divergence was one argument
 *
 * The preview and the committed fire already shared everything: {@link WARDED_TERRAIN},
 * `buildCellTerrain`, the dish, the facet spread and the feather. What they did NOT share was
 * the `exposed` set each handed the builder, and a feather is only cut on an exposed side — so
 * that one argument decided the whole picture:
 *
 *  - the PREVIEW was built band by band, against `tier_by_cell`. A band is the difference of two
 *    of `winterWardOffsets`' Euclidean discs — the shipped radii are 0, 1 and 2, so the bands are
 *    a single cell, then the four cells at distance 1, then the eight at distance 2 — and **no
 *    two cells of any of those bands are orthogonal neighbours.** They only ever touch at a
 *    corner. So every side of every previewed cell was exposed, every cell got its own rim, and
 *    the preview read per tile. That is measured rather than argued, over every legal fire cell
 *    of era one's island, in `winterHeldGroundPerTile.test.ts`;
 *  - the COMMITTED fire was built against `covered.warded`, the whole held region at once. An
 *    interior cell then has no exposed side, keeps its rim vertices where its neighbour will
 *    also compute them, and the two merge into one continuous surface. A 13-cell diamond has
 *    five interior cells and the result is the single irregular blob the objection names.
 *
 * ## THE RULING BEING OVERTURNED, AND WHAT OF IT SURVIVES
 *
 * The merged look was not an accident. §3.2 of the art brief asks that *"two cells in the same
 * state that touch read as ONE surface with a boundary round the pair"*, `buildCellTerrain`'s
 * own note states it, `TERRAIN`'s note in `WinterGround.tsx` records the trade it bought — *"the
 * extent stays countable and the cross stops reading as a grid selection"* — and
 * `winterGround.test.ts` pinned it, by asserting that the middle cell of a plus-shaped patch is
 * full cell width. It was the design working, and the lead has now looked at it and ruled the
 * other way for HELD GROUND. So:
 *
 *  - **the rule still holds for the frost.** The sheet, the frost line and the margin are still
 *    built against their own covered sets and still merge, which is what keeps a frozen board
 *    one field of ice rather than 88 stamps. Held ground is the one state that opts out, and it
 *    is the one state a player DECLARES — the reason the merge was worth having (a boundary
 *    round the pair) is bought here by the hearth standing in the middle of the set instead;
 *  - **the countability the trade protected is not lost, it is doubled.** The feather was
 *    bounded at {@link FEATHER_INSET} precisely so extent survived softening; per tile, every
 *    cell keeps at least three quarters of its own plan and there are now as many rims as
 *    cells, so "how many cells is this fire holding" is more legible, not less. What it costs
 *    is the other half of that sentence: a grid selection is closer to what this now reads as,
 *    and only the hearth and the tightness of the cluster keep it one fire's doing.
 */
export const HELD_TILE_RIM: CellExposure = ALL_EXPOSED;

export const FIRE_GHOST_PATCH_NAME = "winter-fire-ghost-patch";
export const FIRE_GHOST_HEARTH_NAME = "winter-fire-ghost-hearth";

/**
 * **ONE CELL OF HELD GROUND, AND THE ONLY PLACE EITHER SURFACE GETS ONE.**
 *
 * `WinterGround.tsx` builds its `warded` fill from this and {@link buildFireGhostPatch} builds
 * the ghost from it, so the promise and the fact are now the same GEOMETRY and not merely the
 * same spec — the vertex buffers are identical at a given cell, which
 * `winterHeldGroundPerTile.test.ts` asserts rather than takes on trust. It takes no exposure
 * argument on purpose: {@link HELD_TILE_RIM} is the ruling, and a parameter here is how the two
 * came apart in the first place.
 */
export function buildHeldGroundTile(
  col: number,
  row: number,
  topY: number,
  depth: number,
): THREE.Mesh {
  const { x, z } = cellCenter(col, row);
  return buildCellTerrain(WARDED_TERRAIN, x, z, topY, depth, HELD_TILE_RIM);
}

/**
 * One candidate cell's ghosted held ground: the real warded terrain, translucent.
 *
 * The geometry is {@link buildHeldGroundTile}'s, so it is the same faceted, dished,
 * per-tile-feathered surface a cell gets once the fire actually catches. Only the MATERIAL
 * differs, and it differs in the three ways a ghost differs from a fact.
 */
export function buildFireGhostPatch(
  col: number,
  row: number,
  tier: WinterActionTier,
  topY: number,
  depth: number,
): THREE.Mesh {
  const mesh = buildHeldGroundTile(col, row, topY, depth);
  // A fresh material rather than the cached one `buildCellTerrain` reaches for: that one is
  // shared with every REAL warded tile on the board, and turning it transparent here would
  // ghost the ground fires have already taken.
  // `color` is NOT optional here even though the facets carry the variation: a `vertexColors`
  // material multiplies its diffuse by the attribute, so leaving it at the default white gives
  // a patch of pale GREY — which is the one result this whole change exists to avoid.
  mesh.material = facedMaterial(mesh.geometry, {
    color: WARDED_TERRAIN.color,
    transparent: true,
    opacity: GHOST_OPACITY[tier],
    depthWrite: false,
    roughness: 0.94,
  });
  mesh.name = FIRE_GHOST_PATCH_NAME;
  mesh.castShadow = false;
  // A proposal casts nothing and catches nothing. Stated, as the rest of this layer states it.
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * The proposed fire itself: `winterFire.ts`'s hearth, lit, and then ghosted.
 *
 * `lit` is true because the preview's whole job is to answer "what does a fire here look like",
 * and a fire that never caught is an OUTCOME rather than a proposal. The mesh names survive the
 * ghosting untouched, which matters beyond tidiness: `winterGround.test.ts` exempts emissive on
 * a mesh called `FLAME_MESH_NAME` under a group called `HEARTH_NAME` and on nothing else, so a
 * ghost that renamed its parts would either lose the exemption or need a second one.
 *
 * **The duration is the FULL ladder for the same reason `lit` is true.** A proposal is a fire
 * about to be laid, so it is drawn with its fuel intact; ghosting it down toward its last round
 * would preview a fire already half spent, and the ghost's job is to show the RESULT of the
 * commit rather than a moment somewhere after it.
 */
export function buildGhostHearth(radius: number): THREE.Group {
  // BURNING, because a proposal is a fire about to be lit: the ghost's job is to show the RESULT
  // of the commit, and the other two states are what happens to it afterwards.
  const hearth = buildHearth(radius, "burning", FUEL_STEPS);
  const group = new THREE.Group();
  group.name = FIRE_GHOST_HEARTH_NAME;
  group.add(hearth);

  // Deduped by identity: `buildHearth` shares one stone material across nine stones, and
  // damping the flame twice would take it below the ramp #323 tuned.
  const seen = new Set<THREE.Material>();
  hearth.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (seen.has(material)) {
        continue;
      }
      seen.add(material);
      const standard = material as THREE.MeshStandardMaterial;
      standard.transparent = true;
      standard.opacity = GHOST_HEARTH_OPACITY;
      standard.depthWrite = false;
      // Damped, not removed. Zeroing it would fail the flame's own exemption — which asserts
      // an exempt material is genuinely emissive — and would also lose the one channel that
      // says "fire" at a glance.
      if (mesh.name === FLAME_MESH_NAME) {
        standard.emissiveIntensity *= GHOST_HEAT;
      }
    }
  });

  return group;
}
