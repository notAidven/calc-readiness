import { SUCCESSION_LIGHT } from "./crisis/succession";

/**
 * **ERA FOUR'S TONES — the web lane's answer to `succession-mechanics.ts` row M4.**
 *
 * That row is `deferred` in the engine's inventory and names its successor in one sentence: *"A
 * `successionTones.ts` answering to `winterTones.ts`'s shipped `WINTER_LIGHT`, in
 * `apps/web/src/city/three/`, which this pass does not own."* This is that file.
 *
 * ## THE LIGHT IS RE-EXPORTED AND NOT RE-AUTHORED, WHICH IS THE ONE THING TO READ FIRST
 *
 * `WINTER_LIGHT` lives in `winterTones.ts` and the registry imports it from there. Era four's
 * preset went the other way round: `crisis/succession.ts` shipped {@link SUCCESSION_LIGHT} as
 * half of the thin vertical slice, months before anything drew a plinth, and `registry.ts`
 * already binds era four's entry to it. So the shape M4 asks for — *a tones module beside the
 * geometry that paints it* — is satisfied by a **re-export**, and a second copy of thirteen
 * numbers would be the one way the atmosphere the registry declares and the atmosphere the scene
 * mounts could come apart. `successionTones.test.ts` asserts the identity rather than the values.
 *
 * What is genuinely new here is the SCENE palette below, which is the half `crisis/succession.ts`
 * has no business holding: `CrisisAtmosphere` is thirteen controls over four lights, and none of
 * them says what limestone is.
 *
 * ## NOTHING HERE IMPORTS `three`, AND THAT IS LOAD-BEARING
 *
 * `winterTones.ts`'s header records the reason and it applies unchanged: this table is read from
 * the DOM side (the board's key, the card chrome) as well as from the scene, and a module that
 * opened `import * as THREE` would pull `three` into whichever chunk reached it first. It is
 * types and plain numbers. `crisis/succession.ts` opens nothing either, so the re-export is free.
 *
 * ## WHERE THE NUMBERS COME FROM, AND THE ONE THAT IS A PROPOSAL
 *
 * Every hex below except three is era four's own, out of
 * `eras/era-04-classical/style-guide.md` §"palette" and the nineteen-frame art sheet
 * (`output/imagegen/era-04-succession-crisis-scenes/README.md`). The sheet's *"owed to the lead"*
 * list opens with the observation that **there is no `succession-tones.ts` so nothing pins any of
 * them and a build may not keep them** — this is the pin, so that item is now closed for the
 * values it names.
 *
 * The three that are not looked up are called out at their own fields: {@link
 * SUCCESSION_SCENE_TONES.CUT_SHADOW}, {@link SUCCESSION_SCENE_TONES.FIGURE} and {@link
 * SUCCESSION_SCENE_TONES.WATER_BASIN}. Two of the three are the sheet's own PERCENTAGES resolved
 * against a hex it does give, which is arithmetic rather than invention; the third is argued in
 * place.
 *
 * **Mastery gold `#FFB703` appears in none of them, and no tone here is CIVIC green or BRICK
 * red.** `successionTones.test.ts` sweeps this table and the built meshes, exactly as
 * `winterGround.test.ts` sweeps era one's.
 */

/**
 * **THE SCENE PALETTE: what era four's crisis is made of.**
 *
 * The vocabulary is deliberately the MATERIAL one and not the board-state one. Era one keeps the
 * two apart (`WINTER_GROUND_TONES` says what *frozen* looks like, `WINTER_SCENE_TONES` says what
 * *snow* is made of) and era four needs the split more sharply rather than less, because of the
 * ruling that shapes its whole picture: **no state is carried by hue.** Allegiance is carried by
 * POSE and by what stands on a plinth, never by a tint — so there is no `heldByStanding` tone
 * here and there is not going to be one. A board-state table for era four would have exactly one
 * legitimate entry, and inviting a second is how a tint gets authored.
 */
export const SUCCESSION_SCENE_TONES = {
  /**
   * **DRESSED ASHLAR LIMESTONE — era four's body hue, and the ground is the same stone.**
   *
   * `#D2C8AA`, the style guide's own body value. Era four is the era whose ground and buildings
   * are one material, which the guide flags as *"the tightest body-to-ground reading in the
   * run"*, and the crisis inherits that problem rather than solving it: the boundary stones, the
   * plinths and the drift blocks are all this stone standing on paving cut from it. What tells
   * them apart is FORM and the shadow the noon key throws, which is the whole reason
   * `SUCCESSION_LIGHT` raises the key and keeps `shadowIntensity` at 1.
   */
  LIMESTONE: 0xd2c8aa,
  /**
   * **THE LIMESTONE TWELVE PERCENT DOWN — a door reveal, an undercut, a seated joint.**
   *
   * *Not looked up, and arithmetic rather than a proposal.* `LIMESTONE` at 0.88 is
   * `(184.8, 176, 149.6)`, which rounds to this. It exists because era four's key is high and
   * hard and puts almost nothing into a hole: a doorway drawn as an opening would read as a black
   * gap or as nothing at all, where a reveal one step down the same stone reads as an undercut
   * with a wall the key can catch. One step and not two — a darker reveal would read as a hole
   * knocked in the wall, which is the sacked-city confusion arriving through the openings.
   */
  LIMESTONE_DEEP: 0xb9b096,
  /** The paving's top face — fitted dressed limestone, one step up from the body. */
  PAVING: 0xded5c0,
  /** The paving's deeper cut, so a floor of one material still has facets. */
  PAVING_DEEP: 0xc9bfa6,
  /** The quay's kerb line, and the island's own dressed edge. */
  KERB: 0xa89c82,
  /** Terracotta pan-and-cover roof tile: era four's one strong colour, and its only roof. */
  TERRACOTTA: 0xb4674a,
  /**
   * **MARBLE, in the accent role the era allows it and never as a whole body.**
   *
   * `#CCC8BD` is the art sheet's owed item 9, settled there: the limestone's own lightness
   * (L* 80.6 against 80.7) and its own hue angle (95.2 degrees against 95.0) with the chroma cut
   * from 16.3 to 6.0 — *"that same pale stone drained of its yellow rather than a whiter stone"*.
   * Held at the limestone's VALUE on purpose, because the counting slab lies flat and shows the
   * camera its top face, and a paler marble would take that face into the pale ground behind it.
   *
   * It is the counting slab and the claim plate, and nothing else on the island is made of it.
   */
  MARBLE: 0xccc8bd,
  /** The slab's ruled grid, cut about 40 percent down from the marble. The sheet's own hex. */
  MARBLE_GROOVE: 0x7a7871,
  /**
   * **A COUNTER'S TOP FACE**, `Darken(Marble, 0.30)` — the sheet's own hex, and the arithmetic
   * agrees: `#CCC8BD` at 0.70 is `(142.8, 140, 132.3)`, which rounds to this.
   *
   * From the MARBLE and not from the limestone, because a counter is a marble disc in a marble slab
   * and a groove is that slab's own shadow. Era four's other tone table derives it from limestone,
   * which is the plate generator's reading of the same brief and is a divergence to note rather than
   * a second opinion to reconcile: that table says what the nineteen reference frames are made of
   * and this one says what the renderer builds.
   */
  COUNTER: 0x8f8c84,
  /**
   * A counter's rim, `Darken(Marble, 0.52)`.
   *
   * Visible only where the disc stands proud of its seat, which is by design and by a hair: the
   * ruling is 0.015 of relief, *"one sixth of the counter's own thickness"*, because truly flush
   * has no edge and with no edge it has no cast shadow — and a cast shadow is the only presence cue
   * this rig offers a small disc. The rim is what that shadow is thrown by.
   */
  COUNTER_SIDE: 0x62605b,
  /**
   * **THE PROPOSAL TONE, AND NOTHING ELSE IN THE ERA USES IT.**
   *
   * *A proposal, not a lookup.* `#979078` is the sheet's, and its argument is about the GROUND
   * rather than about stone: era four's floor is the palest in the run, so a ghost reasoning
   * correctly toward pale resolves to a smear against it. This is the dark end of the stone family,
   * far enough down to hold its own edges against `PAVING` at a hot noon and not so far down that it
   * reads as a different material.
   *
   * One tone for every proposal, whatever it proposes. That is the point rather than a saving: a
   * ghost is *the object about to change existence*, and a ghost that kept its own material would be
   * a picture of the object instead.
   */
  STONE_DEEP: 0x979078,
  /**
   * **THE SHADOW LYING IN A CUT MARK — every mark on this island is a groove and never a line.**
   *
   * *Not looked up, and it is arithmetic rather than a proposal.* The art sheet specifies every
   * cut mark as *"shallow relief about 44 percent darker than the stone's own hue, so a shadow
   * line sits inside the groove"* and gives no hex for it. `LIMESTONE` at 0.56 is
   * `(117.6, 112, 95.2)`, which rounds to this. Stated rather than inlined because it is a
   * MATERIAL fact — this is what cut stone looks like at the bottom of a groove — and four
   * different objects cut a mark into stone.
   */
  CUT_SHADOW: 0x76705f,
  /**
   * **THE FIGURES AND THE DRIFT BLOCK: the same limestone, one step darker than the plinth.**
   *
   * *Not looked up, and arithmetic again.* Frame 3's brief asks for the figure *"in the same
   * limestone one step darker than the pedestal, about 22 percent down from its hue"*; the
   * pedestal is `LIMESTONE`, and 0.78 of it is `(163.8, 156, 132.6)`.
   *
   * **One tone for both figures, which is prohibition 2 rather than a saving.** *"No state is
   * carried by hue: allegiance is carried by pose and by what stands on a pedestal, never by a
   * tint."* A standing claimant and a seated one are the same stone and separate by silhouette,
   * which is what survives full zoom-out; two tones here would be the tint the ruling forbids,
   * authored in the one file that makes it easy.
   */
  FIGURE: 0xa39c84,
  /**
   * Undressed timber, for the shear-legs that stand over a drift block.
   *
   * The style guide names era four's timber as *"the muted `#B08968` family the construction
   * stages use"* and gives one value; the two below it are that hue's own facets, which is how
   * every other material in this table is stepped.
   */
  TIMBER_LIT: 0xb08968,
  TIMBER_MID: 0x8a6a4e,
  TIMBER_DARK: 0x5e4832,
  /** The fibre sling. Pale hemp, so a slack curve still reads against the timber behind it. */
  FIBRE: 0xc3b394,
  /**
   * **THE PLANTING'S CANOPY, in two tones, and they are THE ISLAND'S OWN.**
   *
   * `islandGround("classical").tones.foliage` is `[0x7ea350, 0x93b45f, 0x6b8f45]` — era four
   * inherits the island's canopy because *"no later guide authors a plant colour"* — and these
   * are its second and third entries. `successionTones.test.ts` reads the island and asserts
   * the equality, so the crisis's trees cannot drift away from the trees on the player's own
   * shore while this table quietly keeps a hex that used to match.
   *
   * **Two of them, because one was the whole reason the trees read as tents.** A crown drawn in
   * a single flat green under a near-overhead key is one silhouette with no interior: every
   * facet takes the same light, so a cone comes back as a triangle and a triangle at this size
   * is a tent. A lit tone over a deeper one gives the mass an inside.
   */
  FOLIAGE: 0x93b45f,
  FOLIAGE_DEEP: 0x6b8f45,
  /**
   * **SLATE MIST WATER `#8FA9B8` — the harbour, with the port shut.**
   *
   * Era four's own water, from §1.1 of its style guide by way of the art sheet. It is the SHUT
   * port's water and it is not re-toned for the crisis: era one's lagoon goes cold because the
   * weather changed, and nothing about era four's weather changed the sea. What changed is that
   * nothing is moving on it.
   */
  WATER_SLATE: 0x8fa9b8,
  /**
   * **THE PUBLIC BASIN, WHICH IS STILL RUNNING — the one thing on the island that has not
   * stopped.**
   *
   * *Not looked up, and the one entry here that is a genuine proposal.* Era four authors one
   * water tone and the crisis needs two, because §2.4's whole point is a contrast: *"the public
   * basin still runs — the one thing that has not stopped, worth keeping precisely because
   * everything else has."* Drawn in `WATER_SLATE` the basin is the harbour in a box and says
   * nothing.
   *
   * So this is `WATER_SLATE` lifted in value and desaturated toward the sky, which is what
   * shallow moving water over pale stone actually does, and it stays inside the same hue family
   * rather than introducing one: it is the harbour's water lit, not a second colour. The
   * separation is a VALUE step of about 0.13 in relative luminance, which is the channel a hard
   * noon has most of and the channel the pale ground leaves free.
   */
  WATER_BASIN: 0xb2c6d0,
} as const;

/**
 * **THE ATMOSPHERE, RE-EXPORTED FROM THE SLICE THAT ALREADY SHIPPED IT.**
 *
 * `crisis/succession.ts` holds era four's thirteen controls with the argument for each, and
 * `registry.ts` binds era four's entry to that object. Re-exported here so the scene reads its
 * light from the same place it reads its stone — which is the shape M4 asks for — without a
 * second copy anything could diverge from.
 *
 * `SUCCESSION_LIGHT` is `as const satisfies CrisisAtmosphere` at its own definition, so the
 * compiler already holds it to the shared preset shape and nothing needs re-asserting here.
 */
export { SUCCESSION_LIGHT };
