/**
 * **ERA SIX'S CRISIS TONES, AND WHY A DOCUMENT FULL OF HEXES IS NOT A PALETTE.**
 *
 * `output/imagegen/era-06-plague-crisis-scenes/README.md` briefs fifteen frames and names a
 * colour in nearly every paragraph of them. Its own owed item 1 says what was wrong with that:
 * *"There is no `plague-tones.ts` answering to `apps/web/src/city/three/winterTones.ts` … so
 * nothing pins any of them."* Generate against an unpinned sheet and the returned art becomes
 * the palette by accident; write the renderer afterwards and it drifts from the art that
 * briefed it. **Era one is the counter-example and the reason this file has the shape it has**:
 * `winterTones.ts` existed before the winter was drawn, so the drawing and the meshes agree.
 *
 * **Nothing here is invented.** Every value is one of four things, and each entry says which:
 * era six's style guide, the plate generator's `$ERA6` table
 * (`tools/generate-winter-crisis-references.ps1:2014-2027`), a tone the prompt sheet itself
 * proposed and argued, or a documented `Darken`/`Lighten` of one of those computed with the
 * generator's own arithmetic. `test/crisisToneTables.test.ts` re-derives the fourth kind rather
 * than trusting these comments.
 *
 * ## NOTHING HERE IMPORTS `three`, WHICH IS INHERITED RATHER THAN RE-ARGUED
 *
 * `winterTones.ts`'s header owns the reason: it is reachable from `CitySurface`'s STATIC import
 * graph and pulling `three` into that graph is the cost the lazy city surface exists to avoid.
 * This file is a table of plain numbers with no imports at all, so it is free from either side.
 *
 * ## WHAT THIS FILE DELIBERATELY DOES NOT CARRY: AN ATMOSPHERE PRESET
 *
 * `winterTones.ts` ends in `WINTER_LIGHT`, and the obvious symmetry would be a `PLAGUE_LIGHT`
 * beside it. **There is nothing to put in one.** `crises/era-06-plague.md` §2.1's lever table is
 * eleven rows of *direction* — *"neutral, near white"*, *"well down"*, *"high and flat"*, *"up"*,
 * *"leave roughly alone"* — and not one number; the art brief adds three notes in the same
 * register. A `CrisisAtmosphere` needs thirteen values, so authoring one here would mean
 * inventing eleven of them and `crises/README.md` forbids inventing a tuning number. **The one
 * number era six's brief does treat as identifying is `key.shadowIntensity`**, which it wants
 * *below* era one's 0.55 because era six is the only preset of the four aiming for shadowless —
 * and *"below 0.55"* is a bound rather than a value. So the preset stays owed, and this file
 * pins what the sheets actually decided: the materials.
 */

/**
 * **WHAT ERA SIX'S CRISIS IS MADE OF — the scene vocabulary.**
 *
 * The split is `winterTones.ts`'s and the reason is its: *"A cell being frozen and snow being
 * pale are different claims, and collapsing them would make the legend unwritable."* This table
 * is what plaster, slate/lead, paving, sky and water ARE while the crisis is on.
 * {@link PLAGUE_MARK_TONES} is what the crisis draws on top of them.
 *
 * **Mastery gold `#FFB703` is reserved and appears in none of them**, which is the sheet's
 * seventh ruling and is swept over this table by `test/crisisToneTables.test.ts`.
 */
export const PLAGUE_SCENE_TONES = {
  /**
   * **WARM BUFF LIME PLASTER, AND THIS ENTRY IS WHERE ERA SIX'S CRISIS READS IT FROM.**
   *
   * Era six's style guide authors it: the palette table (D-ERA27) reads *"Body hue | Warm buff
   * lime plaster | `#C7A48E`"*. It supersedes both the pale `#E9C2A1` pass and the later
   * dusty-rose `#D29F9F` pass after the Northern Early Modern material review.
   * `test/eraPaletteLadder.test.ts` parses that table, so this is the guarded value.
   *
   * **The selected body still clears both channels that the original collision exposed.**
   * Against era four's limestone the guide records a 10.8 L\* gap and 15.4 ΔE76, while the
   * roof is 39.4 ΔE76 from the wall. Era four's own guide says its terracotta roof *"is what
   * actually separates a building from the ground"*, so era six's dark roof must move with
   * the wall — see {@link LEAD} and the note at the foot of this file.
   *
   * **Three artefacts did not follow the guide on 2026-08-01 and all three fed this crisis**:
   * `$ERA6.Body`, written four hours before the re-pitch; the plague prompt sheet, last touched
   * a day after it; and `advisorDress.ts`. This file was written while the question was still
   * open and deliberately kept the sheet's `#E9C2A1` so that nothing disagreed with anything.
   * The rose correction moved all of them together; this final buff/slate refinement does the
   * same before any of the fifteen crisis frames are fired.
   *
   * **This entry is the pin the rest of era six's crisis answers to**, and
   * `test/eraSixBodyHue.test.ts` is what makes that a fact rather than an intention: `$ERA6`,
   * the six plates, both era-six run sheets and the advisor's overgown are all measured against
   * this number, in both directions, so a surface that keeps its own copy fails.
   */
  BODY_STUCCO: 0xc7a48e,
  /**
   * **DARK SLATE AND SHEET LEAD, ON EVERY ROOF AND NOT ONLY THE DOMES.**
   *
   * The style guide's principal accent `#596675` moved darker in the final Northern palette, while
   * keeping the role established by the earlier re-pitch: the cool accent owns the whole roof
   * rather than only a dome. §2 states the reversal in terms: *"Every roof in this era is lead"*,
   * pitched roofs included, and *"no roof, no wall and no paving is terracotta"*.
   *
   * Ruling 1 of the sheet forbids drawing a link band in this tone: grey-blue against pale
   * dressed stone reads as a thing lying ON the floor, which is precisely era seven's object and
   * the separation the crisis cannot afford to lose.
   */
  LEAD: 0x596675,
  /**
   * **THE GEOMETRIC PAVING, WHICH IS ERA SIX'S FLOOR AND THE CRISIS'S ONLY WRITING SURFACE.**
   *
   * Large dressed slabs over a deeper cut, kerbed. The whole family is the plate generator's and
   * no line of the style guide holds any of the three, which the sheet's owed item 1 says
   * outright — so what is pinned here is the generator's authorship, not a style-guide lookup.
   *
   * The floor is *"cooler and greyer than the buildings"* by the era's own rule, and the crisis
   * needs it to stay that way: every mark era six makes is cut into this stone rather than laid
   * on it, so the paving is the value everything in {@link PLAGUE_MARK_TONES} is measured
   * against.
   */
  PAVING: 0xcfcdc4,
  /** The deeper cut the pattern is drawn in, and what shows in the joints. */
  PAVING_DEEP: 0xbab8ae,
  /** The kerb, and the darkest rung of the authored ground family. */
  KERB: 0x9d9b92,
  /**
   * **A FLAT PALE GREY SKY WITH BARELY ANY BLUE IN IT**, which is the whole of era six's weather.
   *
   * The read the brief asks for is *"a day nobody went out in"*, and its stated trap is that a
   * designer will reach for gloom first: *"pale, even and empty is more unsettling than dark"*.
   * A scene tone rather than a light: it is what the sky in a frame is painted, and the
   * `CrisisAtmosphere.sky` that would drive the renderer is part of the preset this file does
   * not author. They will very likely be the same number when somebody writes it — era one's
   * are — but a picture's sky and a scene's clear colour are two claims and only one of them is
   * decided.
   */
  SKY_OVERCAST: 0xdcdedb,
  /**
   * The haze, left roughly where fair weather has it, because **era six is the only one of the
   * four crises that does not pull the fog in.** Everything is meant to be visible and empty.
   */
  HAZE: 0xd2d5d3,
  /** The water, with one hull standing off past the mole: the quarantine read from outside. */
  WATER: 0x8aa0ab,
} as const;

/**
 * **THE MARKS THE CRISIS ITSELF DRAWS — the board-state vocabulary, and it is short on purpose.**
 *
 * Era one's equivalent is one tone per ground state, because a frost occupies ground. Era six's
 * hazard occupies none: *"the infection has no body: it is a status on a building, marked at its
 * threshold"*, and what propagates travels along a line drawn in the floor. So the marks are an
 * inlaid band, a stone laid across it, and two things at a door.
 *
 * ## THE THREE LINK STATES SHARE ONE TONE, AND THAT IS THE DESIGN RATHER THAN AN OMISSION
 *
 * A band is **open**, **suspended** or **carrying**, and no hue tells them apart. Open is
 * {@link INLAY} unbroken; carrying is the same inlay with a row of cut notches in it; suspended
 * is the same inlay gone matte and recessed with a barrier stone across it. **Both channels are
 * geometry**, which is what lets the states survive greyscale and full zoom-out, and it is also
 * what keeps era six clear of era nine: a confidence grade is era nine's, reserved by
 * D-CRISIS-22, and a tone that meant *probably* would collapse the two crises into one.
 *
 * {@link INLAY_SHUT} and {@link INLAY_NOTCH} are therefore not a contradiction of that. They are
 * the shading a cut and a recess have, named rather than left to draw time for exactly the
 * reason `WINTER_SCENE_TONES.STONE_SPENT` is named: the requirement is that a shut band reads as
 * *the same band, shut*, so the geometry is identical and the tone is the whole difference,
 * which is what a named pair makes reviewable.
 */
export const PLAGUE_MARK_TONES = {
  /**
   * **THE LINK: A NARROW BAND INLAID FLUSH IN THE PAVING, IN A DARKER CUT OF THE FLOOR.**
   *
   * *"The inlay belongs to the floor's colour family, not to the building's"*, and the sheet
   * argues why the obvious choice was wrong: lead grey-blue against pale dressed stone reads as
   * a thing lying on the floor, which is era seven's raised main and the one confusion the pair
   * of frames 10 and 11 exists to prevent. `$ERA6.Inlay` carries the same reasoning in a
   * comment, so the generator and this table agree by derivation rather than by coincidence.
   *
   * It is 0.208 of weighted luminance below {@link PLAGUE_SCENE_TONES.PAVING} and 0.012 below
   * {@link PLAGUE_SCENE_TONES.KERB} — a rung of the floor's own family and not a new colour.
   */
  INLAY: 0x9a9890,
  /**
   * A shut band: the inlay **matte and recessed** along its length, either side of the stone.
   *
   * `Darken(Inlay, 0.20)`, the generator's own value for a suspended link. It is the second
   * channel behind the barrier stone, and frame 9 turns on it entirely — a stone with no band is
   * a closure that has EXPIRED, and the only thing separating that from a stone nobody set is
   * that the band under it is still visibly dulled.
   */
  INLAY_SHUT: 0x7b7a73,
  /**
   * The shadow lying in a cut notch, `Darken(Inlay, 0.34)`.
   *
   * The notches are what make a carrying band legible at zoom-out where an inlay alone might
   * not, and they must read as **cuts** rather than as a dashed line: each is a groove with a
   * lit wall, a dark wall and a shadow in it. Nothing travels along a band and every band is the
   * same width, so this tone is the only thing that ever appears on one.
   */
  INLAY_NOTCH: 0x66645f,
  /**
   * **THE BARRIER STONE, AND THE ONE HEX ON THE WHOLE SHEET THAT THE SHEET ITSELF PROPOSED.**
   *
   * Settled at `#ACAAA0` on 2026-08-02 as that sheet's owed item 11, and it is carried here in
   * the terms it was settled in, because the two halves have different weight. **The direction
   * was a lookup**: era six's style guide rules that *"each pale era carries its own dark element
   * at ground level"* and names era six's as the rusticated base, so a piece of stone that must
   * read against a pale floor goes dark. **The value was proposed**, since no line in the tree
   * gives a barrier stone a hue.
   *
   * What it fixes: at the plate generator's default `#C8C3B6` the stone's luminance, 0.765, fell
   * BETWEEN the paving's two at 0.803 and 0.720 — bracketed by the floor it lies on, with no
   * value channel against it at all. `#ACAAA0` is the exact midpoint of the 0.113 gap between
   * the deeper cut and the kerb, the one empty rung of the era's own ground family, at L\* 69.5,
   * C\* 5.5, hue 101.6° — inside that family's own band on both. So it invents a rung and not a
   * colour, and it is 0.138 below the slab face and 0.055 below the deeper cut: **darker than
   * every tone in the paving it lies on**, where it used to sit between two of them.
   *
   * What it costs, recorded rather than buried: the step down to a shut inlay band drops from
   * 0.170 to 0.070, because the gap the stone fits into is bounded below as well as above. Three
   * things carry that pair regardless — the stone stands proud and shows three shaded faces
   * where the band is flush, the band goes {@link INLAY_SHUT} along its length, and
   * {@link BARRIER_BAND} is still 0.306 below the stone.
   *
   * **The plates still draw `#C8C3B6` and that divergence is deliberate**: the prompt sheet
   * cites the plates *for shape only*. Bringing `$ERA6` and the six SVGs into line is a
   * regeneration rather than a documentation pass, and it is owed.
   */
  BARRIER_STONE: 0xacaaa0,
  /**
   * The raised bands cut round the stone, `Darken(BarrierStone, 0.46)` — the generator's own
   * amount, applied to the settled stone rather than to the default it used to darken.
   *
   * **The band COUNT is the duration read** and it is the only place in the four crisis packs
   * where a magnitude is drawn on the board: one band, two bands, a full collar, and none for a
   * closure that has expired. That makes this a countability tone rather than a decorative one —
   * it sits 0.306 below the stone, which is the widest step anywhere in era six's ground family,
   * because one band has to be tellable from two at the resting camera.
   */
  BARRIER_BAND: 0x5d5c56,
  /**
   * Painted timber shutters, closed and barred across every opening, in the era's own joinery.
   *
   * The plate generator's value at its `ShutterPlates` call sites
   * (`generate-winter-crisis-references.ps1:2109`) and nowhere else in the tree, so this is the
   * generator's authorship exactly as the ground family is. The frame briefs describe the
   * shutters in full and give no hex, which is how a generator ends up choosing one.
   */
  SHUTTER_TIMBER: 0x7c6a55,
  /** The shutter's own shaded face, `Darken(ShutterTimber, 0.22)`. */
  SHUTTER_TIMBER_DARK: 0x615342,
  /**
   * **THE BARRED DOOR PANEL, WHICH IS ERA SIX'S CORNER TAG IN THE ERA'S OWN ARMORIAL FORMAT.**
   *
   * Drawn in the slate/lead accent, which is the plate's choice and is legal: ruling 1's cool
   * exclusion is a statement about a link BAND lying in the floor, not about a panel fixed to a
   * door, and the panel is meant to read as applied metalwork.
   */
  DOOR_PANEL: 0x596675,
  /**
   * **THE SINGLE HORIZONTAL CUT BAR, AND IT IS DELIBERATELY NOT A CROSS.**
   *
   * `Lighten(DoorPanel, 0.5)`: the lit wall of a cut, which is what makes the mark read as
   * incised rather than painted on. A cross is the historically obvious mark and it collides
   * twice — `hw-cell__lose` already uses a cross glyph for ground the player would lose, and a
   * cross is the wrong-answer mark on a screen that is also showing a batch verdict. **A single
   * horizontal bar is unambiguous and unclaimed**, and it is ruled: era four's corner marker was
   * ruled on 2026-08-02 to carry the claimant's own chevron or ring and *never a bar*, expressly
   * so that this glyph stays era six's.
   */
  DOOR_BAR: 0xacb2ba,
  /**
   * The low pedestal at an infected building's threshold, in the paving's own stone.
   *
   * Era six's props kit carries a pedestal with nothing on it; the crisis is that sentence made
   * into a mechanic. The pedestal is a **place**, so it is the floor's material and not the
   * building's.
   */
  VESSEL_PEDESTAL: 0xcfcdc4,
  /**
   * The covered vessel standing on it, and **the object itself is still owed.**
   *
   * The art brief offers *"a vinegar vessel or a smoke pot at a door"* and does not choose;
   * frames 1, 2, 13 and 15 all say *"a covered vessel"* and leave it there. What IS decided is
   * the tone, because the plate generator's `ThresholdVessel` draws one
   * (`generate-winter-crisis-references.ps1:1268`): a dark fired body, the darkest small object
   * on era six's ground, which is what makes a threshold mark readable at the building's edge.
   * Pinned so that whichever object the lead picks arrives in a tone the plates already use,
   * and flagged so nobody reads a pinned colour as a settled subject.
   */
  VESSEL: 0x6f6256,
} as const;

/**
 * **THERE IS NO ROOF-TILE ENTRY HERE, AND IT IS A DELETION RATHER THAN AN OMISSION.**
 *
 * This file carried `ROOF_TILE: 0xb4674a` — era four's terracotta accent, copied — for as long
 * as the fifteen frames said *"terracotta pan-and-cover tile … on everything not domed"*. Era
 * six's style guide reversed that on 2026-08-01 and the lead ruled the sheet into line on
 * 2026-08-03: **every roof in this era is {@link PLAGUE_SCENE_TONES.LEAD}**, and terracotta
 * survives *"as an OBJECT and never as a SURFACE"* — the Painters' School roundels and the
 * citrus pots, neither of which any crisis frame draws.
 *
 * **The entry is not moved to a rose roof, it is gone**, because era six's roofs are not a
 * second body tone: they are the accent this table already holds. And era four's `#B4674A` is
 * still correct in era four's own guide and in `succession-tones.ts`, where it is that era's
 * identity device rather than a hex two eras share. A crisis table that went on holding a copy
 * of it is exactly how the collision reached era six the first time.
 */

/**
 * **THERE IS NO ERA-SEVEN ENTRY HERE, AND FRAME 11 IS WHY THAT NEEDS SAYING.**
 *
 * One frame of era six's fifteen is not an era-six frame at all: frame 11 draws era seven's
 * raised steam main on sleepers, in soot-darkened industrial brick `#8E5F4E`, so that a reviewer
 * can see that era six's inlaid band is not it. That hex is on the sheet and unpinned by this
 * file on purpose — **it is already authored, in era seven's own style guide**, whose palette
 * table gives body hue *"soot-darkened brick `#8E5F4E`"* and accent *"cast iron `#3E4247`"*, and
 * `test/eraPaletteLadder.test.ts` parses that table.
 *
 * Copying it into era six's crisis tones would give a **shelved** era a second, unguarded home
 * for its body hue, reached through a crisis it is not part of. D-CRISIS-32 defers era seven
 * rather than cancelling it, so the value it comes back to should be the one its own guide holds.
 * The run sheet quotes era seven's guide directly for that one frame.
 */
