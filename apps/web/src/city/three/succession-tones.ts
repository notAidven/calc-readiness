/**
 * **ERA FOUR'S CRISIS TONES — AND THIS IS THE ONE OF THE THREE WHOSE ART ALREADY EXISTS.**
 *
 * `output/imagegen/era-04-succession-crisis-scenes/` holds nineteen returned frames, so the
 * obvious question when this file was written was whether its numbers should be read OUT of
 * them rather than pinned for them. **They should not, and the answer is a measurement rather
 * than a preference — see "Derived from the sheet, not from the frames" below.** Every value
 * here comes from era four's style guide, the plate generator's `$ERA4` table
 * (`tools/generate-winter-crisis-references.ps1:1907-1916`), a literal one of the generator's
 * crisis primitives draws, a documented `Darken`/`Lighten` of one of those, or the one tone the
 * prompt sheet itself proposed and argued. `test/crisisToneTables.test.ts` re-derives the
 * computed ones rather than trusting these comments.
 *
 * The sheet's owed item 1 is what this closes: *"There is no `succession-tones.ts` answering to
 * `apps/web/src/city/three/winterTones.ts` … so nothing pins any of them and a build may not
 * keep them."*
 *
 * ## IT CARRIES NO ATMOSPHERE PRESET, AND UNLIKE ERAS SIX AND NINE THAT IS BECAUSE ONE EXISTS
 *
 * `winterTones.ts` ends in `WINTER_LIGHT` because era one's tones and era one's weather landed
 * together. Era four's weather landed first and separately: `crisis/succession.ts` holds
 * `SUCCESSION_LIGHT`, thirteen controls satisfying `CrisisAtmosphere`, read off §2.1 of the
 * merged brief. Restating any of it here would be a second home for a number that already has
 * one, so this file stops at materials and the light stays where it is.
 *
 * ## NOTHING HERE IMPORTS `three`
 *
 * Inherited from `winterTones.ts`'s header rather than re-argued: it is reachable from
 * `CitySurface`'s static import graph, and this file is plain numbers with no imports at all.
 *
 * ## DERIVED FROM THE SHEET, NOT FROM THE FRAMES, AND HERE IS WHY
 *
 * A render has continuous shading, so the flat hex a brief pins is not a colour the returned
 * image is made of. Measured over the eighteen composited frames at this tip: **not one has
 * `#ECE4D3` as its most common colour**, and the exact pinned parchment covers at most **0.001
 * percent** of any frame. Their modal colours miss it by **5 to 86** units of RGB distance, and
 * each frame carries **6,981 to 48,514** unique colours. Sampling that set would not recover
 * `#ECE4D3`; it would produce eighteen different near-misses and call the average of them a
 * palette.
 *
 * **What the frames ARE good for is checking the other direction**, and one such check is
 * already recorded in this repository: era two's four civic renders came back on `#DDE3ED`
 * against a brief that asked for parchment, which the work log calls *"a divergence to note
 * rather than a reshoot"* precisely because nothing in code pinned the hex. After this file,
 * that comparison has something to be a divergence FROM.
 */

/**
 * **THE CLASSICAL PORT, AS THE CRISIS FINDS IT.**
 *
 * The scene-against-marks split is `winterTones.ts`'s: this is what limestone, terracotta,
 * marble, paving, sky and water ARE, and {@link SUCCESSION_MARK_TONES} is what the crisis adds.
 *
 * **Mastery gold `#FFB703` appears in none of them** — the sheet's seventh ruling, which adds
 * *"and no gilding"* because a classical city is the likeliest surface in the run for gold to
 * arrive uninvited. Swept by `test/crisisToneTables.test.ts`.
 */
export const SUCCESSION_SCENE_TONES = {
  /**
   * Dressed ashlar limestone: era four's body hue, from its style guide's palette table.
   *
   * Its thin level coursed joints are the material itself, so a wall reads as assembled from
   * equal blocks rather than piled from found ones. That matters to a tone table because it is
   * the channel {@link MARBLE} is told apart on — cut before colour.
   */
  LIMESTONE: 0xd2c8aa,
  /**
   * Terracotta pan-and-cover roof tile: era four's accent, its one strong colour and its only
   * roof.
   *
   * Era four's guide calls it *"what actually separates a building from the ground"*, and the
   * first run proved the point the expensive way — a comparison sheet claiming three views of one
   * building came back as three different buildings, **one of them missing this roof entirely**,
   * which is the failure that put the whole set onto image-to-image from an anchor.
   */
  ROOF_TILE: 0xb4674a,
  /**
   * The paved floor of fitted dressed limestone, its joint lines running straight through the
   * whole open area. The plate generator's, with no style-guide line behind it.
   *
   * **The joint line is half of era four's crisis.** A boundary stone is set into the paving
   * *along one of its own joint lines*, which is what makes a run of stones read as an enclosure
   * drawn on the floor rather than as objects dropped on it.
   */
  PAVING: 0xded5c0,
  /** The deeper cut of the same floor. */
  PAVING_DEEP: 0xc9bfa6,
  /** The kerb, which is era four's own dark element at ground level. */
  KERB: 0xa89c82,
  /**
   * **MARBLE, WHICH IS THE OTHER HEX ON THIS SHEET WITH NO SOURCE OUTSIDE IT.**
   *
   * Settled at `#CCC8BD` on 2026-08-02 and **proposed there rather than looked up**: nothing in
   * the tree authors a marble hue. Era four's style guide names marble in its materials table
   * and gives it no hex, its palette table holds exactly two rows, the palette ladder authors one
   * body and one accent per era and no material tones, and `$ERA4` has no marble entry.
   *
   * What was wrong: the sheet used to read *"pale faceted marble in the era's stone `#D2C8AA`"* —
   * the limestone body hue exactly, a delta of (0, 0, 0) — so the accent had no colour channel
   * against the body it accents. **The first run shows what that cost.** The three counting-slab
   * frames came back in three different materials: the limestone-toned slab asked for, then
   * **veined white marble**, which the sheet forbids outright, then a third near-white slab.
   * Given nothing of its own to be, marble was invented three times and once illegally.
   *
   * The derivation is chroma rather than lightness. `#CCC8BD` holds the limestone's L\* (80.6
   * against 80.7) and its hue angle (95.2° against 95.0°) and cuts its chroma from **16.3 to
   * 6.0** — the same pale stone drained of its yellow rather than a whiter stone. **Why not
   * simply whiter, which is the obvious answer and the wrong one**: frames 16 to 18 put the slab
   * straight onto the parchment, a slab lies flat, and the face the 49° camera mostly sees is its
   * top face, which the three-tone model lifts 26 percent. At the limestone hue that top face
   * is 0.840 against the parchment's 0.896, a step of 0.056; a marble at L\* 85 would leave
   * 0.017 and the slab would begin to dissolve into its own background. This holds the step at
   * 0.057 and buys the separation on chroma, where there is room.
   *
   * **Both channels are required and the colour does not retire the cut**: a marble accent is one
   * monolithic piece with no coursing joint anywhere in it, where limestone is always assembled
   * from equal blocks under thin level joints.
   */
  MARBLE: 0xccc8bd,
  /**
   * A hard white noon bleached almost to white at the horizon — era four's crisis is the only
   * one of the four that wants **more** light rather than less.
   *
   * A scene tone rather than a light: `SUCCESSION_LIGHT.sky` in `crisis/succession.ts` is the
   * value the renderer reads, and it is a different number (`0xe8f1f7`) for a good reason — a
   * sky's clear colour and the tone a picture paints its horizon are two claims. Era four is the
   * one crisis where both exist, so the difference is visible here rather than assumed away.
   */
  SKY_NOON: 0xe9e7de,
  /** The haze, pushed well back, because era four's crisis wants clarity and not weather. */
  HAZE: 0xdcd9cd,
  /** Slate mist water, with the hulls holding position outside a port that has shut. */
  WATER: 0x8fa9b8,
} as const;

/**
 * **THE MARKS THE CRISIS ADDS — AND NOT ONE OF THEM FILLS ANYTHING.**
 *
 * ## ERA FOUR REFUSES THE SHARED GROUND LADDER, AND THIS TABLE HAS TO REFUSE IT TOO
 *
 * Era one's tone table is one entry per ground state, because a frost takes ground. Era four
 * takes none. `crisis/succession.ts` declares the carrier as
 * `{ kind: "standing-object", anchor: "authored-plinth" }`, and `propagation.ts`'s
 * `carrierUsesGroundLadder` returns **false** for exactly that variant — the only one of the
 * three for which it does. The reason is recorded in the declaration itself: era four's floor
 * identity is its paving, and a fill *"would make the board read as a map rather than as a
 * city"*.
 *
 * So **there is no tone here for a claimed district, a held region or a contested one**, and
 * that absence is load-bearing rather than incidental. Ruling 2 of the prompt sheet is *"no state
 * is carried by hue: allegiance is carried by pose and by what stands on a pedestal, never by a
 * tint, a fill or a wash"*, and ruling 1 is that nothing joins one thing to another — era four's
 * boundary stones **enclose** and never **join**. A district tone in this table would break both
 * at once, silently, and it would settle the question the whole sheet is asking.
 * `test/crisisToneTables.test.ts` asserts the refusal against the declaration rather than against
 * this paragraph.
 *
 * What carries allegiance instead is **silhouette and count**: a standing figure against a
 * seated one, a chevron against a ring, four counters against a second row started.
 */
export const SUCCESSION_MARK_TONES = {
  /**
   * The figure on a plinth, `Darken(Limestone, 0.22)` — the same stone one step down.
   *
   * **One step and no hue**, which is ruling 2 in a number: a standing figure and a seated one
   * are the two claimants and they are told apart by outline alone — a tall narrow upright with
   * one arm raised clear of the body, against a wide low mass with a knee thrown forward past the
   * pedestal's front edge. The sheet's test for the pair is whether they still separate when the
   * frame is squinted at, which a tint would answer and a silhouette has to earn.
   */
  FIGURE: 0xa49c85,
  /**
   * **A CUT MARK: A GROOVE WITH A SHADOW LYING IN IT**, `Darken(Limestone, 0.44)`.
   *
   * Ruling 4 of the sheet is *"every mark is cut into stone … never a line drawn or painted on
   * top"*, and this tone is what makes the difference visible: a cut has a lit wall, a dark wall
   * and a shadow in the bottom of it, where paint, ink, chalk and inlay are flat and have none.
   * It is the tone of the chevron, the ring, both together on one top face, the mark on a drift
   * block, and the chevron on an inscription panel.
   *
   * **The two marks are a chevron and a ring, both shapes, and nothing is readable as a
   * character.** The first run is why that is a ruling: asked for *"a single mark"* with no shape
   * given, it returned a serifed **I**.
   */
  CUT_MARK: 0x76705f,
  /**
   * A counter's top face, `Darken(Limestone, 0.30)`, seated flush down in a ruled cell.
   *
   * *Seated* rather than *placed* is the whole read — a counter is sunk into its cut cell so its
   * top face sits level with the ruling and its sides are hidden, where a game piece stands on a
   * board. Which is why the sides below are a separate entry: on a seated counter they barely
   * show, and the first run returned a slab with its counters standing proud instead.
   */
  COUNTER_TOP: 0x938c77,
  /** A counter's side, `Darken(Limestone, 0.52)`. */
  COUNTER_SIDE: 0x656052,
  /**
   * The grooves ruling a counting slab into cells, `Darken(Marble, 0.40)`.
   *
   * Computed from {@link SUCCESSION_SCENE_TONES.MARBLE} rather than from the limestone, because
   * the slab is marble and a groove is that slab's own shadow. **The ruling is what makes the
   * count countable**, so it has to read as a grid of equal cells and never as a scale: nothing
   * graduated, numbered, or longer than its neighbour.
   */
  SLAB_RULING: 0x7a7871,
  /**
   * The boards shuttering a civic building's bays: **new squared timber, not salvage.**
   *
   * The plate generator's literal at its `ShutterPlates` call
   * (`generate-winter-crisis-references.ps1:1983`), and the frame brief gives no hex. The costliest
   * confusion on era four's sheet is *shuttered* against *sacked*, and they separate on
   * silhouette against fabric: this building has lost its openings and kept every line of its
   * outline. Salvage timber would put the frame on the wrong side of that in one material.
   */
  SHUTTER_TIMBER: 0x9a8564,
  /** The shutter's shaded face, `Darken(ShutterTimber, 0.22)`. */
  SHUTTER_TIMBER_DARK: 0x78684e,
  /**
   * The small milestone-shaped stone marker at a shuttered building's front lower corner.
   *
   * The plate generator's literal, alongside the shutters it comes with.
   *
   * **THE OBJECT THIS DESCRIBES NO LONGER SHIPS, and the row stays because the frames do.** Claude
   * Design's third pass deleted the corner milestone into the claim post: the post already stands
   * at the plot's front corner carrying the same mark, so two uprights at one corner was one object
   * too many. This table's job is to say what the nineteen delivered frames are made of, and frame
   * 13 has a milestone in it, so the hex is still a true statement about the reference and a false
   * one about the renderer. `successionScene.ts` builds no `CORNER_MARKER_NAME`.
   */
  CORNER_MARKER: 0x8c7a5e,
  /**
   * The claimant's mark cut into that corner marker, `Lighten(CornerMarker, 0.5)`.
   *
   * **RULED 2026-08-02, and the ruling survived the object being deleted.** The marker is gone —
   * see above — and the mark is now the claim post's, cut into all four of its faces because the
   * camera orbits. What is unchanged is that the glyph IS the content: the chevron in a chevron
   * district, the ring in a ring district, **nothing at all where the district is unclaimed**,
   * never a bar — which is era six's ruled door glyph and would hand one crisis's mark to another —
   * and never a character. Frame 13 came back with a serifed capital **I** off a stale prompt that
   * named no shape, which is why the ruling is written down twice rather than once.
   */
  CORNER_MARK: 0xc6bcae,
} as const;
