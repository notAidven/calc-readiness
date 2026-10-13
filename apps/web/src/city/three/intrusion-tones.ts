/**
 * **ERA NINE'S CRISIS TONES. THE CRISIS IS AN INSTRUMENT, SO MOST OF THIS TABLE IS ONE PANEL.**
 *
 * `output/imagegen/era-09-intrusion-crisis-scenes/README.md` briefs fourteen frames, and its
 * owed item 1 states the gap this file closes: *"There is no `intrusion-tones.ts` answering to
 * `apps/web/src/city/three/winterTones.ts` … so nothing pins them, and
 * `test/intrusionPlateTones.test.ts` guards the plates rather than a renderer."* Both halves are
 * still true of the plates and only the first is fixed here: the guard below is
 * `test/crisisToneTables.test.ts`, and it pins this table to the same `$ERA9` the plate guard
 * reads, so the two cannot drift apart.
 *
 * **Nothing here is invented.** Every value is era nine's style guide, the plate generator's
 * `$ERA9` table (`tools/generate-winter-crisis-references.ps1:2130-2146`), a literal one of the
 * generator's crisis primitives draws, or a `Darken`/`Lighten` of one of those computed with the
 * generator's own arithmetic and re-derived by the guard.
 *
 * ## THE ONE THING ERA NINE'S BRIEF SAYS ABOUT ITSELF THAT A TONE TABLE HAS TO OBEY
 *
 * *"Every other crisis in the game gives you an antagonist to design. This one gives you an
 * instrument."* Compromise propagates along nothing visible, the source is never drawn, and the
 * board's entire content is what the player has learned. So the crisis adds exactly three kinds
 * of thing to the town — **a lit matrix panel by a door, a collar on a duct marker in the floor,
 * and a hole in the paving with a barrier round it** — and everything below is one of those.
 *
 * ## NOTHING HERE IMPORTS `three`, AND THERE IS NO ATMOSPHERE PRESET
 *
 * The import rule is `winterTones.ts`'s and is inherited rather than re-argued: this file is
 * plain numbers with no imports, so either side of the city can read it for free.
 *
 * The preset's absence is the same finding as era six's. `crises/era-09-intrusion.md` §2.1 is
 * eleven rows of direction — *"neutral grey"*, *"down substantially"*, *"cooler, dimmer"*,
 * *"pull the far plane in a little"* — with no numbers, and a `CrisisAtmosphere` wants thirteen.
 * **The brief's one hard constraint about light is not a number at all**: a lit panel is *"a
 * bright face, not a light source, and it lights nothing"*, because the panels are the brightest
 * things in the frame and a dark scene would make them look wonderful and would be a lie. That
 * is a statement about geometry and emissive material, which {@link INTRUSION_MARK_TONES}
 * carries, and the sky and haze below are the picture's rather than the rig's.
 */

/**
 * **WHAT THE TOWN IS MADE OF — the scene vocabulary, and it has almost no internal contrast.**
 *
 * That flatness is the era rather than an accident: body and accent *"sit close together on
 * purpose, so a building has very little internal contrast"*, and the crisis's whole read
 * depends on it — a countable row of lit bars is legible because there is nothing else bright in
 * the frame.
 *
 * **Mastery gold `#FFB703` appears in none of them**, which is the sheet's eighth ruling and is
 * swept over this table by `test/crisisToneTables.test.ts`.
 */
export const INTRUSION_SCENE_TONES = {
  /**
   * Anodised and composite rainscreen panel: era nine's body hue, from its style guide's palette
   * table, matte and close-toned and seamless at a distance.
   *
   * Its narrow open joint is the whole of the detail, and the era's real absence is behind that:
   * **visible hand-work of any kind.** Eight eras carried the evidence of their own making on
   * the outside and this is the era that stops, which is why nothing in this table has a tone
   * for a tool mark, a course or a rivet.
   */
  BODY_CLAD: 0x96a1ab,
  /**
   * Unitised curtain-wall glass, the era's accent, and **the chroma ceiling for the whole pack.**
   *
   * Ruling 2 of the sheet is stated against this value: *"nothing in the frame is more saturated
   * than the era's own glass accent"*. Measured the way `test/intrusionPlateTones.test.ts`
   * measures it — HSL saturation in three.js's linear working space — that is **0.297**, and it
   * is the enforceable form of era nine's *"nothing that reads as an alarm"*.
   */
  GLASS: 0x7fa0a8,
  /**
   * **PRECISE BANDED UNIT PAVING, AND IT IS THE WARM END OF ERA NINE'S PALETTE.**
   *
   * That inversion is the era's own ruling and it is what the barrier tone turns on: era nine's
   * style guide keeps the paving *"warmer or darker than the body hue, not cooler"*, because the
   * wall is already cool. So **in era nine warm means floor**, and this entry is the reference
   * point rule 1 of the sheet is stated against. Measured on blue-minus-red, era nine's ground
   * family runs **-15 to -9** and everything built or added to the town runs **+6 to +41**; this
   * tone is the -15.
   *
   * The floor is also where the crisis lives — *"a precise banded pattern with holes in it is the
   * crisis, and it is one prop repeated"* — so five of the fourteen frames are a piece of it.
   */
  PAVING: 0xa9a49a,
  /** The deeper cut the bands are laid in. */
  PAVING_DEEP: 0x948f86,
  /** The kerb. */
  KERB: 0x7d786f,
  /**
   * **LATE, FLAT AND COLOURLESS**, and slightly darker than the other three crises' skies.
   *
   * Not night, and the brief says why in the one sentence a renderer should carry: a dark scene
   * would have bright rectangles floating in blackness with no falloff anywhere, which reads as
   * broken rather than as atmospheric. A dimmed flat late afternoon keeps the town readable and
   * still lets the panels be the brightest thing.
   */
  SKY_LATE: 0xb9bfc2,
  /** The haze, pulled in a little: the town legible and the world beyond it indistinct. */
  HAZE: 0xadb4b8,
  /** The water. */
  WATER: 0x7f96a0,
} as const;

/**
 * **THE INSTRUMENT, THE GROUND MARK AND THE HOLE — everything the crisis adds to the town.**
 *
 * ## THE FOUR READINGS ARE A COUNT, NOT A COLOUR, AND THIS TABLE IS BUILT SO THEY CANNOT BECOME ONE
 *
 * *Unread* is a lit blank face, *clear* is one bar, *likely compromised* is two with the second
 * at half height, *compromised* is three at full height. **Every one of those uses the same
 * {@link PANEL_FACE} and the same {@link PANEL_BAR}**: the reading is carried by how many bars
 * there are and how tall the second one is, so it survives greyscale, which is what INV-CRISIS-16
 * asks for. A per-reading colour would be the single easiest way to destroy that, so there is no
 * tone here for *clear* and none for *compromised*.
 *
 * The two variants that DO change tone change it for a different reason. A **stale** reading
 * keeps every bar it had and marks the whole panel as no longer current — the crisis's sharpest
 * moment, *"you knew this and it no longer counts"* — so the face and bars drop together and a
 * strikethrough goes under the row. A **dark** panel is not a reading at all: it says the
 * building is switched out of the town, and telling it from a lit blank one is what frames 6 and
 * 13 exist to settle.
 */
export const INTRUSION_MARK_TONES = {
  /** The panel's outer rim. Three distinct parts is what stops a lit rectangle reading as a screen. */
  PANEL_RIM: 0x5d686e,
  /** The dark bezel between rim and face. **The bezel and the face are never both lifted.** */
  PANEL_BEZEL: 0x464f55,
  /**
   * The lit face: bright, and **emissive inside the model rather than a light added to the
   * scene.** It throws no glow, halo or spill onto the wall it is mounted on.
   *
   * One of the six tones `test/intrusionPlateTones.test.ts` names as a legitimate exception to
   * the chroma ceiling, and the reason is a fact about the measure rather than about the picture:
   * a near-white trips HSL saturation while its cast, +32, keeps it comfortably inside rule 1.
   */
  PANEL_FACE: 0xc3dae3,
  /**
   * A lit bar: **a shape standing on the face, not a lit region of it**, so its edges are hard
   * and unlit face shows either side. All bars are the same width and the same height, except
   * the second of two, which is deliberately half — the only place in the four crisis packs
   * where a partial magnitude is drawn, and era nine's alone by D-CRISIS-22.
   */
  PANEL_BAR: 0xf4fdff,
  /** A stale panel's face, dropped to about half brightness and whole rather than broken. */
  PANEL_FACE_STALE: 0x78878e,
  /** A stale panel's bars: dimmer, and still cleanly countable as three. */
  PANEL_BAR_STALE: 0x9db0b7,
  /**
   * The single horizontal bar drawn UNDER the row on a stale reading, and the only strikethrough.
   *
   * It is also the one exception written into ruling 4 of the sheet. That ruling reads *"a
   * countable row of lit bars, and on a stale reading one horizontal bar beneath the row.
   * Nothing else"* — the clause was added on 2026-08-02 because the earlier form, fed verbatim as
   * the sheet instructs, forbade the mark the sheet's own sharpest frame is carried by.
   */
  PANEL_STRIKE: 0x39423f,
  /** A dark panel's rim. */
  PANEL_RIM_DARK: 0x2f353a,
  /** A dark panel's bezel. */
  PANEL_BEZEL_DARK: 0x394045,
  /**
   * A dark panel's face, and the darkest thing on any building.
   *
   * **It must be distinguishable from a lit blank one**, which is the whole job of frame 13's
   * blanking panels: a dark readout means the building is switched out of the town, and a lit
   * blank one means nobody has looked at it yet. Two different facts, and the difference is
   * carried here and in the flush plates over the openings.
   */
  PANEL_FACE_DARK: 0x262b2f,
  /**
   * **THE OPEN SERVICE VOID, AND IT IS THE LOUDEST THING IN THE PACK.**
   *
   * *"A dark solid shape you cannot see into"*, holding nothing and lighting nothing — anything
   * visible inside it turns the subject from a hole in a pattern into a piece of infrastructure.
   *
   * Measured on linear relative luminance, it sits at **0.031** against the floor's **0.373**, a
   * step of 0.342, which is what makes the eye land on the opening rather than on the barrier
   * round it. `test/intrusionPlateTones.test.ts` asserts exactly that ordering rather than the
   * numbers: the void must be further from the floor in value than the barrier is.
   */
  VOID: 0x2c3236,
  /**
   * A closed inspection cover, `Darken(Paving, 0.14)` — **the floor's own stone, barely stepped.**
   *
   * The cover is squared to the module and sits on the paving's own joint lines, and the banded
   * pattern runs straight through it: a piece of the pattern rather than a lid dropped on top of
   * it. The frame's subject is that continuity, so the step is small on purpose.
   */
  COVER: 0x918d84,
  /** The cover's lit face, `Lighten(Paving, 0.22)`, drawn at low opacity over it. */
  COVER_LIT: 0xbcb8b0,
  /** The shaded edge of a cover standing on its side, `Darken(Paving, 0.34)`. */
  COVER_EDGE: 0x706c66,
  /**
   * **A FLUSH DUCT MARKER: A MARK ON A PLACE, AND NEVER A LINE BETWEEN TWO OF THEM.**
   *
   * `Darken(Paving, 0.24)`. The tone is unremarkable and the rule attached to it is the hardest
   * constraint on era nine's whole sheet — see the note under this table.
   */
  DUCT_MARKER: 0x807d75,
  /**
   * The collar ring on a marker, `Darken(Paving, 0.44)`, cut from the floor's own stone.
   *
   * **The collar is the zoomed-out channel and it is not a nicety**: a panel by a door disappears
   * at full zoom-out and a collar on a ground marker does not, which is the entire subject of
   * frame 2. Flush, raised and doubled are three heights of the same ring — geometry again, and
   * never a coloured ring, a painted circle, a decal or a glowing one.
   */
  COLLAR: 0x5f5c56,
  /** The collar's lit top face, `Lighten(Paving, 0.30)`: what says *raised* rather than *flush*. */
  COLLAR_TOP: 0xc3bfb8,
  /**
   * The single cut notch across a collar on a stale reading, and it must read as **a clean cut in
   * stone** rather than as a crack, a chip or damage.
   */
  COLLAR_NOTCH: 0x3d454a,
  /**
   * **THE TEMPORARY BARRIER'S RAIL — THE TOWN'S OWN CLAD PANEL, AND THE MOST HEAVILY MEASURED
   * RULING ON THE SHEET. CARRIED HERE EXACTLY AS IT WAS RULED.**
   *
   * The ruling is `2026-08-01-intrusion-crisis-art-brief.md` §3.2a, dated 2026-08-01, and
   * `test/intrusionPlateTones.test.ts` is what stops it being prose. Until it, the plates drew
   * the barriers round a lifted cover in a rust orange — `#b8593a` posts under a `#c9663f` rail —
   * which was the warmest and by far the most saturated thing in any intrusion plate.
   *
   * **The two rules, with their reference points derived rather than written down.** Nothing may
   * be warmer than the floor, because in era nine warm means floor and a warm barrier says
   * *floor* at the one object whose job is to say *this floor is open here*; and nothing may be
   * more saturated than the era's own accent, because a cool alarm colour would pass the first
   * rule, which is why there are two.
   *
   * **The measurements, all five of which reproduce at this tip.** On blue-minus-red era nine's
   * ground family runs -15 to -9 and its built and added family +6 to +41, against the two rust
   * barriers at **-126** and **-138**. On HSL saturation in three.js's linear working space the
   * pack's 25 material tones top out at **0.297** ({@link INTRUSION_SCENE_TONES.GLASS}) against
   * the barriers' **0.838** and **0.843**.
   *
   * **And the read did not weaken, which is the half worth keeping.** The case for the rust was
   * not empty — a high-visibility barrier round a lifted floor cover genuinely reads as
   * maintenance rather than as alarm — and what it could not survive is that era nine already
   * spends its warmth on the ground. Measured on linear relative luminance, the clad post is a
   * WIDER step off the floor than the rust post was, **0.229 against 0.197**, and the void stays
   * the darkest thing on the paving at 0.031 against the floor's 0.373. The barrier got quieter
   * and the hole did not.
   *
   * **This is the same material the town seals a building's openings with**, which is the other
   * half of the ruling: `$ERA9.Clad` is authored once and handed to both primitives, because it
   * was a literal at one call site and a rust orange at the other, and that is how one category
   * of object came to have two contradictory tones.
   */
  BARRIER_RAIL: 0x8b959c,
  /**
   * The barrier's upright posts, `FaceRight(BarrierRail)` — **the face model applied to the
   * panel, never a second invented tone.**
   *
   * `test/intrusionPlateTones.test.ts` recomputes this from `$ERA9.Clad` the way `MixHex`
   * computes it and asserts the plates carry the result, so the two plates and this entry cannot
   * drift onto a hand-picked value. `test/crisisToneTables.test.ts` recomputes it again from
   * {@link BARRIER_RAIL} here.
   */
  BARRIER_POST: 0x646b70,
  /**
   * The flush blanking panels over an isolated building's openings: the same clad panel again.
   *
   * **Sealed, not boarded**, and the distinction is the frame's whole subject — the plates are
   * the building's own material in the building's own grid, flush with the wall and fixed by a
   * bracket you cannot see, where boarding is a foreign material cut to fit and standing proud.
   * Boarding is what a generator reaches for and it would make an isolated building read as
   * abandoned rather than as switched out of the town.
   */
  BLANKING_PANEL: 0x8b959c,
  /**
   * The small angled service isolation plate at an isolated building's front lower corner.
   *
   * The plate generator's literal at its one `ShutterPlates` call for this pack
   * (`generate-winter-crisis-references.ps1:2234`), and the sheet gives no hex for it.
   */
  ISOLATION_PLATE: 0x4c565c,
  /**
   * The broken trace on that plate, `Lighten(IsolationPlate, 0.5)` — the lit wall of the cut.
   *
   * Era nine owns a two-part diagonal with a central break: a disconnected service trace that
   * cannot be mistaken for era six's horizontal quarantine bar or era four's claimant glyphs.
   * The cross-era ownership contract lives in the shared crisis specification.
   */
  ISOLATION_TRACE: 0xa6aaae,
} as const;

/**
 * **THERE IS NO LINK TONE IN THIS FILE, AND ITS ABSENCE IS THE HARDEST CONSTRAINT ON THE SHEET.**
 *
 * The shape of this note is `winterTones.ts`'s — that file records why it holds no per-tier
 * preview table — and era nine's version is a ruling rather than a preference: *"Era nine must
 * never be given an edge layer, because the duct collars are marks about places and not lines
 * between them."* It is protected in three places at once. `propagation.ts` makes it
 * unrepresentable, since an `unobservable` topology's only assignable layer is
 * `NO_PROPAGATION_LAYER`; the prompt sheet feeds it as the first of eight rulings; and the sheet
 * sizes every paving panel so that nothing on one can be traced to anywhere.
 *
 * **The risk is specific rather than general.** Era nine's duct and fibre markers genuinely do
 * run along routes in the paving, so a route in a floor is one short step from a line between two
 * buildings — the wrong answer is one the subject actively invites. It has already been lost
 * once: an earlier cut of the prompt sheet dropped the prohibition outright, and the frame with a
 * whole town in it was asking for collars *"along the routes evidence was found on"*, which is
 * the traceable run the ruling exists to forbid.
 *
 * So {@link INTRUSION_MARK_TONES.DUCT_MARKER} and {@link INTRUSION_MARK_TONES.COLLAR} are the
 * tones of a **mark on a place**. A band with two ends drawn in them would be era six's crisis,
 * however good it looked, and there is deliberately nothing here to draw one with.
 */
