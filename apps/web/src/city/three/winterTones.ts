import type { CrisisAtmosphere } from "./crisis/atmosphere";

/**
 * **THE WINTER'S TONES, AND THE ONE REASON THEY ARE NOT IN `WinterGround.tsx`.**
 *
 * They belong beside the geometry that paints them, and they used to be there. They are here
 * because the in-city mount's legend has to name the same tones the island is wearing, and
 * `WinterInCity` is reached from `CitySurface`'s STATIC import graph: taking one number out of
 * a module that opens `import * as THREE` would have pulled `three` into the city's first
 * chunk, which is the cost `WinterEntryChip` and the lazy surface exist to avoid. A table with
 * no runtime import can be read from either side for free.
 *
 * `WinterGround.tsx` re-exports both, so nothing needs to know this file exists.
 *
 * Cold and high-contrast against ground that is a vivid yellow-green (`tussock`, `0xa8b850`),
 * because the read has to survive full zoom-out. **Mastery gold `#FFB703` is reserved and
 * appears in none of them** — `winterGround.test.ts` sweeps this table AND the built meshes.
 */
export const WINTER_GROUND_TONES = {
  /**
   * **FROST ON THE GROUND, and the one number in this table that moved for saturation.**
   *
   * It was `0xdce8f2` — *"pale, desaturated ice over the grass"*, which was written when the
   * ground under it was a vivid yellow-green tussock and was right against that ground. #323 then
   * laid a snow course over the whole island, and against snow a pale desaturated blue is not a
   * state: measured in a rendered frame at the shipped camera, frozen ground came back at
   * `(171, 181, 186)` beside unfrozen winter ground at `(152, 166, 166)` — 15 points of blue and
   * NO value step at all, the frost being if anything the lighter of the two.
   *
   * So this is a saturation and value shift within the same hue (205 degrees, shared with
   * `frostLine` and `frostFront`) and emphatically not a new tone: relative luminance goes 0.79 to
   * 0.71 against lit snow's 0.90, so the gap the read depends on goes from 0.11 to 0.19, and the
   * blue-minus-red cast goes from 22 to 39. It stays pale — this is ice on the ground and not the
   * frost's leading edge, which is `frostLine` 0.21 below it and still clearly a step colder.
   *
   * **Adding white was never on the table and this is the opposite move.** The island is already
   * white; the only room left is downward and toward saturation.
   */
  frost: 0xc8dfef,
  /** The leading edge of the frost, one tone step colder, so the ADVANCE is legible. */
  frostLine: 0x9fc0d8,
  /**
   * **THE FROST FRONT: THE ONE DARK VALUE IN THE COLD PALETTE, AND WHY IT HAS TO BE DARK.**
   *
   * `frost` and `frostLine` above are the ground the frost HOLDS, and both are pale because the
   * ground they lie on is pale — #323 made every winter ground state faceted snow-toned terrain
   * to match the island's low-poly look, which was right and is exactly the problem: frosted
   * ground and unfrosted winter ground are both near-white, both faceted, both snow-toned, so
   * **more white cannot mark anything**. Measured in this scene, frost is 0.79 relative
   * luminance against lit snow's 0.90 — an eleven-point gap carrying the whole read.
   *
   * So the front — ground the frost takes when this round closes, `WinterCellView.frost_next` —
   * goes the other way: 0.19, which is a bigger step down from frost than frost is from snow,
   * three times over. It is a value shift and a saturation shift inside the cold family the
   * scene already spends on ice (`frostLine` is this hue two steps lighter, `WATER_COLD` is it
   * darker and greener), so no new hue enters the palette and none of the three the game
   * reserves for correctness — CIVIC green, BRICK red, SIGNAL_DEEP amber — is borrowed for
   * terrain.
   *
   * It is also deliberately not `abandoned`'s dead char (`0x4a4844`, luminance 0.07): those two
   * are the darkest things on the board and have to stay tellable apart, so this keeps 0.12 of
   * luminance and a whole hue between them — a wider gap than any pair among the four states
   * that shipped. `winterGround.test.ts` sweeps that pairwise rather than trusting this note.
   *
   * **AND IT IS OPAQUE, WHICH IS THE OTHER HALF OF THE LESSON.** The fire ghost's opacity ramp
   * had to be raised off a photograph because a translucent wash over near-white snow composites
   * to a pale tint whatever the arithmetic says (`winterFireGhost.ts` records it). The front is
   * therefore standing geometry in a solid tone, not a wash: alpha over snow is the trap, and
   * this is the one state on the board that could least afford to fall into it.
   */
  frostFront: 0x3c7fa0,
  /**
   * Ground a fire is holding: era one's OWN bare earth, thawed out from under the snow.
   *
   * This was `0xc98a4b`, an ochre near this one and in no palette on the island. The art brief
   * (§1, "the fire") argues the held ground should sit in the island's own bare-earth family
   * (`#C9A06A` / `#B2854F`) "so the one thing a fire is *for* looks like ground that has been
   * walked on", and this is exactly `C.earth` from `StarterIsland.tsx`. It is repeated as a
   * literal rather than imported because nothing in this file may import `three` — see the
   * header — and the value-varied facets the tile is drawn with reach down toward `earthWorn`
   * (`#B2854F`) from here, so both tones of that family are on the ground.
   */
  warded: 0xc9a06a,
  /**
   * **GROUND GIVEN UP FOR GOOD: SPOILED, NOT ABSENT. The island's own hearth ash.**
   *
   * This was `0x4a4844`, a dead char, and the team lead's verdict on it was *"the broken ground
   * is too dark and jarrin[g]"*. He is right, and the reason is arithmetic rather than taste:
   * the ground this lies on is near-white snow (`SNOW_LIT`, relative luminance 0.90), so a
   * near-black tone is not a strong read, it is **the maximum contrast the scene can produce**
   * — 0.835 of luminance, more than any other pair of things on the island — and a patch at
   * maximum contrast against its surround reads as a HOLE PUNCHED IN THE ISLAND rather than as
   * damaged land.
   *
   * `0x8d8a82` is `ERA_ONE_PROP_TONES.ash` from `StarterIsland.tsx`: the grey ash bed under the
   * camp's fire-blackened stone ring, already on this island's ground. Ground gone to ash is
   * the picture, said in the ash the island already has, so **no hue enters the palette and the
   * fourth key entry keeps its meaning** — it is the same neutral dead grey it always was, with
   * its value taken off black. Repeated as a literal rather than imported for the reason the
   * header gives: nothing in this file may import `three`, exactly as `warded` repeats `C.earth`.
   *
   * Measured, with the guard's own formula: luminance 0.065 → 0.255, so the gap to lit snow
   * goes 0.835 → 0.646 and the gap to the fair-weather island's green tussock (0.432, which is
   * what a scar lies on after the thaw) goes 0.367 → 0.177. Still the darkest ground state, and
   * still nothing like black.
   *
   * **IT COMPOSES WITH THE ICE FRONT (#344) rather than colliding with it.** That branch adds
   * `frostFront` at luminance 0.187 and argues, correctly, that the front and this state are the
   * two darkest things on the board and have to stay tellable apart. Raising this one narrows
   * their VALUE gap to 0.068 — still clear of the 0.05 floor `winterGround.test.ts` sweeps — and
   * the separation moves onto the channel that can carry it: the front is a saturated mid-blue
   * (blue-minus-red +100, saturation 0.77) and this is a neutral ash (-11, 0.09), 111 points of
   * cast apart, which is the widest hue gap of any pair in the key bar the warded ochre. The two
   * also differ in FORM — the front is standing shove ice, this is a churned, sunken tile.
   *
   * **NEVER TONE ALONE.** `TERRAIN.abandoned` in `WinterGround.tsx` gives this state a `churn`
   * edge (broken at every rim vertex, with the skirt following the break) and a relief and facet
   * count that belong to no other state, and the city's own scar layer carries a hatch
   * (`ScarredGround.tsx`). A retone that lifts the value has to lean harder on those, not less.
   */
  abandoned: 0x8d8a82,
  /** The fire's own mass, and its ember core. */
  fireStone: 0x6f6a63,
  fireCore: 0xd4552f,
  /** Ground a pull-back would give up — provisional, and deliberately not the fire's tone. */
  previewAbandon: 0x8e4b58,
} as const;

/**
 * **THERE IS NO PER-TIER PREVIEW TONE TABLE, AND ITS ABSENCE IS THE POINT.**
 *
 * This file used to carry `WINTER_PREVIEW_TONES` — `0x8a8f94` / `0x7fa8c4` / `0x4f86b0` /
 * `0x2f5f8c`, one outline colour per fire tier. Three of the four were BLUES, which is the
 * winter's own colour in this scene: `frost`, `frostLine` and `WATER_COLD` above are all blue,
 * so the marker for the one action that pushes frost back was drawn in the language of the
 * thing the player was losing to. A candidate now shows a ghost of the fire's own result — the
 * `warded` ochre above, at three opacities — and `winterFireGhost.ts` owns that ramp. Nothing
 * needs a cold token for a warm affordance, so there is no table here to reach for.
 */

/**
 * **THE CRISIS'S SCENE PALETTE — the design batch's `W`, verbatim.**
 *
 * `docs/superpowers/specs/2026-07-30-winter-crisis-scene-assets.html` names these and asks
 * that they be used by name rather than as raw hex. They live beside
 * {@link WINTER_GROUND_TONES} rather than in a second palette module for the reason that
 * file's own header gives: nothing here imports `three`, so either side of the winter can
 * read a number for free.
 *
 * The two tables are not redundant and neither is the other's replacement.
 * {@link WINTER_GROUND_TONES} is the BOARD-STATE vocabulary — one tone per thing the engine
 * projects (frozen, the frost line, warded, abandoned), and the in-city legend names them
 * to the player. This is the SCENE vocabulary: what snow, ice, water, wood, stone and smoke
 * are made of while the crisis is on. A cell being frozen and snow being pale are different
 * claims, and collapsing them would make the legend unwritable.
 *
 * ## TWO VALUES DIVERGE FROM WHAT SHIPS, AND BOTH ARE WINTER-ONLY VARIANTS
 *
 * **`STONE` is `0xb4ac98` where `constructionStages.ts` pours its footings in `0xd9ccb2`.**
 * The shipped number is `BASE.parchmentDeep` (`city/palette.ts`), and it is load-bearing
 * well past the footing: `groundShade`, `gridLine`, `road`, `districtScenery` and the site
 * tint in `bodyHueFor` are all derived from it, so re-toning it to suit a hearth would
 * re-tone the fair-weather city. It is also FORBIDDEN here by a shipped guard —
 * `ruinSeam.test.ts` requires that no colour of a ruin appears in the site or the scaffold
 * stage, and `0xd9ccb2` is exactly the scaffold's `STONE`, so a winter ruin drawn in it
 * fails that assertion. The winter keeps its own colder, darker stone and the shipped value
 * is untouched.
 *
 * **`WATER_COLD` is `0x2f5a63` where the fair-weather lagoon is a teal gradient**
 * (`StarterIsland.tsx`'s `shallows` `0xa8d4d8` → `deepWater` `0x3f7f92`, baked into vertex
 * colours). Also a winter-only variant: the crisis lays its own cold water OVER that lagoon
 * while it is mounted and removes it on the way out, so the thaw is a removal rather than a
 * re-tint and era one's shore — which its style guide owns — is never edited. The design
 * batch's reason for the value stands: a warm teal sea under a grey sky is the single
 * biggest tell that the winter was faked.
 */
export const WINTER_SCENE_TONES = {
  SNOW_LIT: 0xeef5f4,
  SNOW_MID: 0xe2eaea,
  SNOW_SHADE: 0xd9e3e2,
  SNOW_DEEP: 0xcbd7d8,
  ICE_PALE: 0xe7eeee,
  ICE_FACET: 0xc5d5d7,
  ICE_SHADE: 0xa9bfc4,
  WATER_COLD: 0x2f5a63,
  SLUSH_MID: 0x9a8874,
  SLUSH_DARK: 0x6f6357,
  WOOD_LIT: 0xb08968,
  WOOD_MID: 0x8d6648,
  WOOD_DARK: 0x5f4730,
  STONE: 0xb4ac98,
  STONE_DARK: 0x8d8878,
  /**
   * **THE TWO STONE TONES A SPENT HEARTH WEARS**, and the only entries in this table the design
   * batch's `W` does not name.
   *
   * They are still the batch's own numbers rather than invented ones: they are read off plate
   * `07-fire-four-states.svg`'s FOURTH mass, the burnt-out hearth, whose ring is drawn in
   * `#6a635c` / `#4e4a45` / `#5b564f` where the burning hearth's is `#d9ccb2` / `#b9ac93` /
   * `#c9baa0`. The 3D ring alternates two tones over nine stones, so it takes the plate's
   * lightest and darkest and leaves the middle facet.
   *
   * They are a SEPARATE PAIR rather than `STONE`/`STONE_DARK` darkened at draw time, because the
   * brief's requirement is that the ring reads as *the same ring later* — *"darkened, not
   * collapsed, scattered or broken"* — so the geometry is identical and the tone is the entire
   * difference, which is exactly what a named pair makes reviewable.
   */
  STONE_SPENT: 0x6a635c,
  STONE_SPENT_DARK: 0x4e4a45,
  CHAR: 0x3a342c,
  FLAME: 0xff9a37,
  EMBER: 0xd9622e,
  /**
   * The flame's core, which is NOT the design batch's and is the one tone added to its table.
   *
   * The batch authors a two-tone flame, `FLAME` over `EMBER`, and two tones cannot carry a
   * heat ramp: with the emissive term spent evenly across them the whole flame resolved to one
   * clipped orange and the facets stopped reading (see `winterFire.ts`). A third, hotter tone at
   * the top of the ramp is what gives the flame an inside.
   *
   * **IT WAS `0xffdca6`, WHICH IS A NEAR-WHITE, AND UNDER ACES THAT MADE THE FIRE WHITE.** The
   * note here said it was *"held just off white so it stays fire rather than becoming a lamp"*, and
   * that is a claim about the hex rather than about the pixel: this tone is the diffuse AND the
   * emissive target of the hottest band, the renderer adds `emissive * emissiveIntensity` after the
   * lighting term, and ACES then compresses whatever comes out. Carried through the shipped
   * pipeline — this tone, its own emissive at 1.45, `WINTER_LIGHT.exposure` 0.92 — the core
   * resolved to **`rgb(227, 214, 188)`, saturation 0.17**, against lit snow's `rgb(181, 184, 184)`.
   * The hottest part of the fire came out paler than the snow it was standing on and barely
   * warmer. The lead: *"the fire still looks trash"*.
   *
   * So the tone is saturated instead, and the ramp it sits at the top of came down with it
   * (`winterFire.ts`'s `HEAT`). Through the same pipeline this reads `rgb(208, 172, 97)`,
   * saturation 0.53 — still the brightest thing in the hearth and now unmistakably fire.
   *
   * It is held clear of mastery gold (`#FFB703`) on the channel that matters as well as by hex:
   * gold is `rgb(255, 183, 3)` with essentially no blue, this is `rgb(255, 196, 106)`, so the two
   * do not meet as a rendered colour either. `winterGround.test.ts` sweeps this table for the hex.
   */
  FLAME_HOT: 0xffc46a,
  SMOKE_MID: 0xaeb7b8,
  SMOKE_DARK: 0x828e90,
  SKY_OVERCAST: 0xdce0de,
  FOG_NEAR: 0xd5dad8,
} as const;

/**
 * **THE OVERCAST RIG — the same four lights, re-valued.**
 *
 * The scene has exactly four lights (`CityLighting.tsx`: hemisphere, ambient, a shadowed key
 * and a fill) and no `EffectComposer`, so a weather change is a re-valuation of those four
 * plus the sky, the fog and the exposure, and nothing else. These are the design batch's
 * WINTER numbers.
 *
 * The key drops to roughly a third of daylight and goes near-white; the fill RISES, which is
 * what softens a hard shadow edge when there is nothing to blur it with — the ratio goes from
 * about 4:1 to 1.7:1, and that ratio is what reads as overcast. The hemisphere's ground bounce
 * swaps era one's warm earth for cold blue-white, because a hemisphere light's second colour
 * is the colour the ground actually is and the ground is now snow.
 *
 * **The batch's FAIR half is deliberately not carried across.** Its baseline (key `0xfff0d2`
 * at 1.55, fog 46→132) is not the rig that ships (`#fff6e6` at 1.32, fog 90→600), so
 * importing it would re-light every fair-weather screen to describe the crisis. Only the
 * winter end is authored here; `cityEnvironment`/`lightSpec` keep the day preset exactly as
 * it is and this overrides it while a winter is on the island.
 *
 * **`fog.near`/`fog.far` are RATIOS of the island radius, not the batch's world units**, and
 * that is the one number in this table that was re-derived rather than copied. The batch asks
 * for 24→68, sized so the sea dies before the frame edge at the default framing. This camera
 * dollies to 2.6x (`VILLAGE_CAMERA.maxDistanceRatio`) and may pan 0.72 of the island off
 * centre, so its worst-case view distance is about 259 world units (`maxViewDistance`): a fog
 * far of 68 puts the WHOLE ISLAND past the fog at full zoom-out, which is precisely the defect
 * the shipped x20 far plane exists to avoid. The near plane is pulled in hard (3.0 → 1.4 of
 * the radius, so haze starts before the shore instead of past it) and the far plane is pulled
 * in as far as the dolly allows (20 → 10, i.e. 300, still clear of 259). The rest of the
 * batch's intent is carried by COLOUR instead of by distance: the fog goes to `FOG_NEAR` and
 * the lagoon goes to `WATER_COLD`, so the sea dissolves into grey rather than staying teal.
 *
 * ## IT IS THE SHARED CRISIS PRESET SHAPE, AND THE `satisfies` IS THE CLAIM
 *
 * `crisis/atmosphere.ts` names these thirteen controls as the whole of what a crisis in this
 * renderer can change about the weather, on the grounds that the budget is a property of the
 * renderer rather than of the winter. **Era one is the evidence for that claim, so the claim is
 * checked against era one by the compiler**: not one value below moves, and a field that stopped
 * matching would fail here rather than in a second crisis six months from now.
 *
 * The import is TYPE-ONLY and `crisis/atmosphere.ts` opens nothing, so the header's rule above is
 * intact: this file is still reachable from `CitySurface`'s static graph without pulling `three`
 * into the city's first chunk.
 */
export const WINTER_LIGHT = {
  /** Renderer tone-mapping exposure. ACES is already applied; this pulls the top end down. */
  exposure: 0.92,
  /** Flat grey-white, zero blue. */
  sky: 0xdce0de,
  fog: { color: 0xd5dad8, nearRatio: 1.4, farRatio: 10 },
  hemi: { sky: 0xe6eaea, ground: 0xc4d1d6, intensity: 0.88 },
  ambient: { color: 0xd8dee0, intensity: 0.46 },
  /**
   * key:fill is about 1.7:1 here, against 4:1 in fair weather.
   *
   * `posRatio` is the batch's own fair→winter MOVE (`[-38, 54, 30]` → `[-44, 70, 26]`)
   * expressed as a multiplier on the shipped position rather than as world units, because
   * the shipped rig derives every light position from the island radius and a literal would
   * stop scaling with it. Raising the key is the other half of "shadows stay present but
   * shallow": a higher key throws a shorter shadow, which is what an overcast sky does.
   */
  key: {
    color: 0xf4f7f6,
    intensity: 0.58,
    shadowIntensity: 0.55,
    posRatio: [1.16, 1.3, 0.87],
  },
  fill: { color: 0xc9d6dc, intensity: 0.34, posRatio: [0.88, 1.16, 1.04] },
} as const satisfies CrisisAtmosphere;
