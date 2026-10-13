import type { EraId } from "@cr/skill-graph";

/**
 * PER-ERA CITIZEN DRESSING — what the people of the city are wearing, era by era.
 *
 * ## ⚑ THE FIFTH THING AN ADVANCE CHANGES, and the argument is owed here rather than assumed
 *
 * **D-ERA28 as amended by D-ET9** (`docs/superpowers/specs/2026-07-29-era-trial-contract.md`
 * §11.2) leaves *"the hall, the ground, the roads and the advisor as the only things an
 * advance still changes"*, after the 2026-07-29 re-dressing ruling withdrew the re-skin for
 * every standing building. This table makes it five, so it owes the argument.
 *
 * **The records anticipate this, and say how to decide it.** The ruling that bounded R3 was
 * not *"buildings only"*: `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md`
 * §2.1 states the line as a predictive rule and says in terms that it is meant to settle cases
 * nobody had raised yet —
 *
 * > *"**Per-era art is frozen where it multiplies with a catalogue and kept where it is
 * > one-per-era.** Anything added later is decided by asking which side of that line it falls
 * > on rather than by arguing from R3's wording."*
 *
 * > *"Stated that way it also answers the question for things nobody has proposed yet, which a
 * > bare 'buildings only' does not."*
 *
 * **A crowd is one-per-era, by construction and not by luck.** §2.1's table prices the island,
 * the advisor and the road surface at *"one"* per era and *"ten"* across the run, against a
 * building's `catalogue × eras`. This table is one row per era: the whole population shares one
 * cloth, one cut and one ornament, because {@link ERA_CITIZEN_DRESS} feeds two instanced draws
 * and a third that is usually empty. Ten rows buys ten crowds. There is no catalogue to
 * multiply against, so the crowd falls on the *kept* side of the line the ruling drew.
 *
 * **And the freeze has nothing to freeze ONTO here.** §2.3's *"three clocks in one city"* puts
 * skill buildings on the era they were CONSTRUCTED in and civic buildings on the era they were
 * PURCHASED in — two clocks that freeze on EVENTS. A citizen has neither event.
 * `2026-07-27-citizens-and-city-life-design.md` **D-CIT1** is explicit that citizens are
 * *"DERIVED, never persisted … recomputed from learning state on every load"*, and
 * `citySession.ts` stores no citizen at all, so there is no raised era to carry and nowhere to
 * carry it. Putting the crowd on a frozen clock would require inventing the persistence D-CIT1
 * refuses. The present-tense clock is the only one available, which is the same clock the hall,
 * the ground, the roads and the advisor are already on.
 *
 * **The re-dressing ruling's own reason is about STANDING things and does not reach a person.**
 * R3 freezes a building because *"a building stays as it was built, permanently"* and §2.2
 * makes that a feature: a frozen building *"is a spatial index into the learner's history"*,
 * legible *"as old"* only because the setting around it moved on. A citizen is not a record of
 * a past moment — they are alive, present-tense, and re-derived from scratch on every load. A
 * citizen still in era one's hide in the Bronze Age is not an old building read correctly; it
 * is the present rendered as the past, which is the defect `islandGround.ts`'s fallback exists
 * to prevent (*"era one's island in Early Modern is indistinguishable from the advance did
 * nothing"*).
 *
 * **Nothing in the records forbids it.** R5 is the ruling that bounds R3, and it enumerates
 * what re-dresses — the island, the advisor, the roads — without excluding anything; §2.1 then
 * replaces that enumeration with the rule quoted above precisely so that the list is not read
 * as closed. The trial contract's own D-ET8 already gives the crowd a beat in the advance
 * ceremony (*"the citizens gather while scaffolding goes up on the hall and the advisor changes
 * dress"*), so the people are on stage at the moment of the change either way.
 *
 * **What is being claimed, precisely.** That the era list is five rather than four. Not that
 * D-ERA28 is wrong about any of its four, and not that anything standing re-dresses. If Evan
 * reads the four as a closed set rather than as a description of what was left after the
 * buildings came out, this table is the one thing to delete and the fallback below is what the
 * crowd would then wear in every era.
 *
 * ## ⚑ WHAT THIS TABLE MAY TAKE FROM A GUIDE, AND WHAT IT MAY NOT
 *
 * All three authored guides are headed **Status: PROPOSED**, but their palette sections no
 * longer agree with each other. Era one's §4 carries no status line at all — it is the shipped
 * base. Era two's is *"Status: PROPOSED for Evan, not decided"*. Era three's was **ACCEPTED
 * 2026-07-31 (Evan)**. So the bar this module holds deliberately does NOT rest on a status
 * line, because one of the three has already moved and the others may: **no era's BODY HUE
 * appears on a person here.** `#D9C288` and `#5F6D4E` are wall colours, both guides say so in
 * the same words (*"buildings share the body hue and differ by silhouette plus accent"*), and
 * era two's has already moved once (`#B4714F` → `#D9C288`) while the code shipped the old one.
 * `islandGround.ts` refuses to transcribe those tables on the parallel ground that a palette
 * table covers body and accent, never ground.
 *
 * **What each row is transcribed from instead is the guide's one authored HUMAN** — the
 * advisor's dressing section, which each guide closes with `[x] The advisor` in its own
 * checklist, and which under **D-ET9** is a costume for a person of that era rather than a
 * second character. That is the only passage in a style guide that says what somebody in this
 * era is wearing, so it is the only passage a citizen may be dressed from. Each row below
 * quotes it.
 *
 * **Three of the five values are transcribed hexes; the other two are stated relations.** Where
 * a guide fixes a colour by relation rather than by hex — era three's mantle is *"undyed
 * cream"* and *"near-white"* — the value taken is the one the run has already MEASURED for that
 * relation, and the row says which measurement and where. Nothing here is picked by eye.
 *
 * ## SKIN IS NOT PER-ERA, and all three guides say so in the same five words
 *
 * Era one: *"Skin / body `#C08A5A` — era one's terracotta body hue is `#C98A5E`, the same hue to
 * within a hair"*. Era two: *"Skin and hair are the only notes outside it."* Era three: *"Skin
 * and hair are the only notes outside it."* Three guides, one sentence: a person's skin sits
 * OUTSIDE the era palette, so it is the one thing on a citizen an advance must not touch.
 * {@link CITIZEN_SKIN} is therefore a run-wide constant and no row may override it — which is
 * also the only reading under D-ET9, where the ten costumes are worn by one person.
 *
 * ## Why this module holds no `three` import
 *
 * The same reason `islandGround.ts` and `winterTones.ts` do not: a table of numbers and strings
 * can be read from either side of the city's chunk boundary for free, where a module that
 * opened `import * as THREE` would pull `three` into the city's first chunk.
 */

/* -------------------------------------------------------------------------- */
/* The vocabulary an era's row is written in                                  */
/* -------------------------------------------------------------------------- */

/**
 * The CUT of the garment — the silhouette half of the dressing, and the half that has to do
 * the work at full zoom-out where a citizen is a few pixels and detail is gone.
 *
 * A discriminated string rather than a bundle of radii, following `roadSurfacing.ts`'s course
 * kinds and for its reason: the renderer switches exhaustively, so a cut named here and never
 * drawn is a COMPILE ERROR rather than a citizen who silently wears the previous era's clothes.
 */
export type CitizenCut =
  /** Era one. A hide tunic flaring to a hem WIDER than the shoulders. */
  | "tunic"
  /** Era two. A woven wrap belted at the waist: an upright column with a pinch in it. */
  | "wrap"
  /** Era three. A long fringed mantle over ONE shoulder: asymmetric, and longer. */
  | "mantle";

/** The head's read. Era three's official has hair and beard *"oiled and squared off"*. */
export type CitizenCrown = "round" | "squared";

/**
 * The ONE note an era puts on a person, and where it sits.
 *
 * `null` for an era that puts nothing on a person, which is a real authored state and not a
 * gap: era one has neither metal nor weaving, and era two's guide calls its bead *"the era's
 * own signature material and **its first appearance on a character**"* — so the ornament
 * ARRIVING in era two is era two's story, and giving era one one would erase it.
 */
export interface CitizenOrnament {
  /** Stable id, so a guard can read the ornament back by name rather than by colour. */
  readonly id: string;
  readonly color: number;
  /**
   * Where it sits on the figure. This is a SILHOUETTE choice as much as a colour one: the
   * crown is centred and on top, the shoulder is offset and outboard, so the two eras differ
   * in outline as well as in hue.
   *
   * ## ⚑ ONLY TWO PLACES ON A CITIZEN ARE VISIBLE FROM THIS CAMERA, and it is measured
   *
   * The camera is fixed at about 49 degrees above the horizon, and a citizen is deliberately
   * HEAD-HEAVY — the head is 41.5% of standing height, because at a dozen screen pixels the
   * head is the one cue that survives. Those two facts together mean the head occludes the
   * whole front of the body. At the throat (`y ≈ 0.70`) the head's shadow reaches forward to
   * `z ≈ 0.32` and the chest's own surface is at `z ≈ 0.19`; at the waist it reaches `z ≈
   * 0.48` against a body surface at `z ≈ 0.15`. So a bead at the throat and a belt at the
   * waist are both geometrically invisible, always, from every angle of the orbit.
   *
   * **That was measured on a frame and not reasoned about afterwards.** The first version of
   * this table put era two's bead at the throat, where its guide's dressing puts it, and
   * `output/citizens-per-era/SHEET-4-figure.png` shows the four same citizens in all three
   * eras with no bead anywhere in the picture. What is left visible is the CROWN and anything
   * outboard of about `|x| = 0.24`, which is why the arms read and the chest does not — and
   * it is why these are the two placements this type offers.
   */
  readonly at: "crown" | "shoulder";
}

/** One era's crowd: what they wear, how it is cut, and the one note on it. */
export interface AuthoredCitizenDress {
  /** The era's authored cloth, at full value. */
  readonly cloth: number;
  /**
   * The deep end of the crowd's cloth, so a crowd is not a clone army. See
   * {@link CLOTH_SHADE} — derived for every era but the first, which carries its shipped pair.
   */
  readonly clothDeep: number;
  readonly cut: CitizenCut;
  readonly crown: CitizenCrown;
  readonly ornament: CitizenOrnament | null;
  /** The guide passage this row is transcribed from, quoted so a reader can check it. */
  readonly source: string;
}

/** What the renderer is handed: an era's row, or the fallback, saying which it got. */
export interface CitizenDress extends AuthoredCitizenDress {
  /**
   * `"authored"` — this era's own crowd is on screen.
   * `"unauthored"` — no guide dresses these people, so they wear
   *   {@link UNAUTHORED_CITIZEN_DRESS}. Never a previous era's clothes.
   */
  readonly art: "authored" | "unauthored";
}

/* -------------------------------------------------------------------------- */
/* Skin, which is the run's and not an era's                                  */
/* -------------------------------------------------------------------------- */

/**
 * The range a seeded `body_tone` walks between, taken from era one's advisor palette table —
 * *"Skin / body `#C08A5A`"* — and NOT re-authored per era, because all three guides put skin
 * outside the era palette (see the header).
 *
 * Shipped values, unchanged: this is the pair `Citizens.tsx` has drawn since the crowd landed.
 */
export const CITIZEN_SKIN = {
  warm: 0xc08a5a,
  deep: 0xa8734a,
} as const;

/**
 * The deep end of a crowd's cloth, as a fraction of the era's authored value.
 *
 * **MEASURED off era one's shipped pair rather than chosen.** The crowd has shipped at
 * `#9C7A52` → `#6B5238` since it landed, and that pair is very nearly a single scalar on all
 * three channels: 107/156 = 0.686, 82/122 = 0.672, 56/82 = 0.683. So era one already holds this
 * relation, and stating it as a rule lets a later era author ONE hex instead of two — which is
 * what makes a future era one row rather than a colour decision.
 *
 * **Era one is exempt and keeps its literal pair**, because 0.68 of `#9C7A52` rounds to
 * `#6A5338` rather than to `#6B5238` and era one's crowd is shipped, approved art that this
 * change must not move by a digit. The exemption is asserted in both directions in
 * `citizenDress.test.ts`: era one's pair must stay off the rule, and every other authored era's
 * must stay on it.
 */
export const CLOTH_SHADE = 0.68;

/** The era's cloth at {@link CLOTH_SHADE}, channel by channel, rounded once. */
export function shadeCloth(cloth: number): number {
  const r = Math.round(((cloth >> 16) & 0xff) * CLOTH_SHADE);
  const g = Math.round(((cloth >> 8) & 0xff) * CLOTH_SHADE);
  const b = Math.round((cloth & 0xff) * CLOTH_SHADE);
  return (r << 16) | (g << 8) | b;
}

/* -------------------------------------------------------------------------- */
/* The authored eras                                                          */
/* -------------------------------------------------------------------------- */

/**
 * ERA ONE — hide, and nothing else on the person.
 *
 * **BYTE-FOR-BYTE AS IT SHIPPED.** Every value here is the constant `Citizens.tsx` already
 * drew, moved into a row and not re-picked, on the discipline `islandEra.test.ts` states for
 * the island: era one's art is shipped, generated, measured and approved, and giving it an era
 * axis must not have re-tinted it. `citizenDress.test.ts` pins the four values against literals
 * so a transcription slip fails rather than quietly re-dressing the one era nobody asked to
 * change.
 *
 * The source is era one's advisor palette table — *"Hide tunic, cape, hem: `#836444`,
 * `#6B563E`, `#5F4730` — Earth / daub family"* — which is the list the shipped pair was drawn
 * from. The shipped pair is kept rather than swapped for the guide's three literals for the
 * reason above.
 *
 * **No ornament, and that is authored rather than missing.** Era one's §2 has four materials —
 * rammed earth, timber, thatch, undressed stone — and *"metal"* and cloth beyond hide are on
 * its absent list. Era two's guide then dates its own bead as *"its first appearance on a
 * character"*, which is a claim that would be false if era one's people wore one.
 */
const ERA_ONE_DRESS: AuthoredCitizenDress = {
  cloth: 0x9c7a52,
  clothDeep: 0x6b5238,
  cut: "tunic",
  crown: "round",
  ornament: null,
  source:
    'era-01-prehistoric/style-guide.md: "Hide tunic, cape, hem: Earth / daub family"; ' +
    "the era has no metal and no weaving, so a person carries no ornament",
};

/**
 * ERA TWO — woven cloth, belted, with the run's first ornament on a person.
 *
 * **The cut is the era's whole point about people, in its own words.** The dressing section
 * reads *"A woven flax wrap — **woven**, which is the visible break from Oru's hide tunic and
 * the cheapest way to date the advance on a person — belted with a cord, over bare feet."* So
 * the era itself nominates *what a person wears* as the cheapest legible marker of the advance,
 * and it nominates the WEAVE and the BELT as the markers. `"wrap"` is that belt: an upright
 * column with a pinch at the waist, against era one's cone flaring to a hem.
 *
 * **The cloth hex is the guide's own measured value and not its palette row.** The palette
 * section's *"Two supporting values, which are guidance and not palette rows"* gives *"Undyed
 * woven cloth `#C9BFA8`, ΔE 19.36 from the body and 13.69 from the parchment ground"*, and the
 * advisor section then rules that this is the wrap's value in as many words: *"So the wrap needs
 * a value, and the palette section's woven-cloth note is already it: `#C9BFA8`."* The guide is
 * also explicit that it is not white — *"Undyed does not mean white here; it means the warm grey
 * of unbleached wool"* — with `#E8E2D2` named as the near-white that would vanish into the
 * ground. That rejected value is era THREE's, for the reason era three's row gives.
 *
 * **The ornament is the fired-clay bead**, in the era's fired-clay accent `#A2503A`, which the
 * advisor's palette placement assigns it — *"the clay bead and tablet in the era's fired-clay
 * tone"*. The dressing calls it *"A **fired-clay** bead at the throat, which is era two's own
 * signature material and its first appearance on a character."*
 *
 * **It is worn on the CROWN here rather than at the throat, and the substitution is recorded
 * rather than quietly made.** A throat is invisible from this camera — see
 * {@link CitizenOrnament.at} for the measurement and for the frame that showed it — so a bead
 * placed there is an extra instanced draw of nothing. The placement that survives comes from
 * era two's OWN record: the delivered advisor drawing, described in the same guide, is *"a
 * woven headband set with three pale tiles"*. So the MATERIAL and the COLOUR are the
 * dressing's and the PLACEMENT is the drawing's, both era two's, and neither is invented. What
 * is not borrowed is the tiles' pale tone: the bead keeps the fired-clay accent, because that
 * is the note the guide calls *"the era's strongest local read"* and a pale tile on a pale
 * wrap would be no read at all.
 *
 * **What is deliberately NOT taken:** the body hue `#D9C288`. It is a wall, its section is
 * PROPOSED, and it has already moved once. Nothing about a citizen reads it.
 */
const ERA_TWO_CLOTH = 0xc9bfa8;
const ERA_TWO_DRESS: AuthoredCitizenDress = {
  cloth: ERA_TWO_CLOTH,
  clothDeep: shadeCloth(ERA_TWO_CLOTH),
  cut: "wrap",
  crown: "round",
  ornament: { id: "clay-bead", color: 0xa2503a, at: "crown" },
  source:
    'era-02-neolithic/style-guide.md: "A woven flax wrap: woven … belted with a cord, over ' +
    'bare feet. A fired-clay bead … its first appearance on a character", worn on "a woven ' +
    'headband" as the same guide describes the delivered drawing; ' +
    'cloth "#C9BFA8" from the same guide\'s woven-cloth note, which its advisor section rules ' +
    "is the wrap's value",
};

/**
 * ERA THREE — a mantle over one shoulder, pinned in bronze.
 *
 * **The cut is asymmetric, which is the strongest silhouette in the run and is the guide's.**
 * *"A long fringed wool mantle over one shoulder, in undyed cream, belted."* Over ONE shoulder:
 * a figure with mass on one side and not the other, which reads from most of the orbiting
 * camera's arc where a symmetrical cone reads the same from all of it.
 *
 * **The ornament is bronze, at a joint, and that is the era's central rule applied to a
 * person.** *"A **bronze** pin at the shoulder — the era's signature material, placed where the
 * era puts it, at the joint."* §2 rations the metal to exactly this — *"at joints and fittings
 * only … Small in area and high in contrast … never polished and never gold"* — so a pin is
 * the whole of what a citizen may carry, and bronze as cloth would break the era's one rule.
 * It sits OUTBOARD at the shoulder joint, where the arm meets the body, because that is both
 * what the guide describes and the only part of a shoulder this camera can see.
 * The colour is the accent `#A97740`, burnished rather than patinated because the guide puts
 * the patina on the wall and keeps the metal at the joint: *"the wall takes the patina and the
 * joint keeps the metal"*. Measured there as ΔE76 50.6 from the reserved mastery gold, so it
 * cannot read as gilding.
 *
 * **The crown is squared, and it is a quotation:** *"Hair and beard oiled and squared off, which
 * is the period's own read for a man of office."* At the fixed ~49-degree downward tilt the top
 * of the head is the largest single part of a citizen on screen, so squaring it is the cheapest
 * per-era read this figure has.
 *
 * **The cloth is a RELATION the guide states, resolved against the only measurement the run
 * has.** Era three gives no hex for the mantle: it says *"undyed cream"* and, in its palette
 * placement, *"a **near-white** mantle stands on a body at L\* 44.1"*. Era two's palette section
 * is where the run measured near-white — *"a near-white cloth at `#E8E2D2`"* — and rejected it
 * for era two because it *"measures ΔE 1.23 from the ground and would vanish into it"*. So the
 * two guides are not in tension, they are drawing a distinction: era two's undyed cloth is
 * expressly NOT white and era three's expressly IS near-white, and `#E8E2D2` is the value the
 * run already put on that word. Taking it here is a transcription of era two's measurement into
 * the era that asked for it, not a colour picked by eye.
 *
 * **What this buys, and it is the reason the three rows read as three eras at full zoom-out.**
 * Relative luminance, computed on these three cloths: era one `#9C7A52` **0.216**, era two
 * `#C9BFA8` **0.525**, era three `#E8E2D2` **0.762**. Value is the one channel that survives
 * when a citizen is a few pixels wide, and the crowd lightens monotonically across the run —
 * which was not tuned for. It falls straight out of hide → undyed woven wool → near-white
 * cream, in that order, because that is the order the guides authored.
 *
 * **What is deliberately NOT taken:** the body hue `#5F6D4E`. Patina is a wall, and §2 is
 * explicit that the wall takes the patina while a person's metal is a pin. That reasoning is
 * why the exclusion survived this section being ACCEPTED on 2026-07-31: it never rested on the
 * value being unratified.
 */
const ERA_THREE_CLOTH = 0xe8e2d2;
const ERA_THREE_DRESS: AuthoredCitizenDress = {
  cloth: ERA_THREE_CLOTH,
  clothDeep: shadeCloth(ERA_THREE_CLOTH),
  cut: "mantle",
  crown: "squared",
  ornament: { id: "bronze-pin", color: 0xa97740, at: "shoulder" },
  source:
    'era-03-bronze-age/style-guide.md: "A long fringed wool mantle over one shoulder, in ' +
    "undyed cream, belted. A bronze pin at the shoulder: the era's signature material, " +
    'placed where the era puts it, at the joint … Hair and beard oiled and squared off"',
};

/**
 * The dressing an era with no authored row falls back to.
 *
 * **DELIBERATELY VISIBLE, and never a previous era's clothes**, which is the whole point and is
 * `roadSurfacing.ts`'s ruling applied to people: *"the honest fallback is the plainest thing a
 * road can be rather than an invented surface or a borrowed one from the previous era."* A
 * Early Modern crowd in prehistoric hide is the *"the advance did nothing"* defect wearing its
 * most vivid form, because the people are the only thing on the island that moves.
 *
 * **It makes exactly three moves.** A plain undyed cloth; era one's tunic cut, which is the
 * plainest of the three and the one that says least about any era; and NO ornament, because an
 * ornament is a claim about a material an unauthored era has not chosen. Skin does not move,
 * for the reason in the header.
 *
 * **The tone is measured against the ground it stands on, following `UNAUTHORED_TERRAIN`'s own
 * method.** An unauthored era's island is `#9A9184` (`islandGround.ts`, relative luminance
 * 0.288). `#6E675C` is 0.138 — a contrast ratio of 1.80:1 against it, and low-chroma and warm
 * enough to sit on §1.1's parchment base. It is also nowhere near any authored era's cloth
 * (0.216, 0.525, 0.762), so a fallback crowd cannot be mistaken for an authored one.
 */
export const UNAUTHORED_CITIZEN_DRESS: AuthoredCitizenDress = {
  cloth: 0x6e675c,
  clothDeep: shadeCloth(0x6e675c),
  cut: "tunic",
  crown: "round",
  ornament: null,
  source:
    "no guide dresses this era's people; the plainest undyed cloth, measured against the " +
    "unauthored ground #9A9184 it stands on, and never a previous era's clothes",
};

/**
 * The authored crowds, era by era. **Eras one, two and three** — the three guides with authored
 * identity. Each of the other seven OWES a row as its guide's advisor section is authored, and
 * it is one row rather than a code change.
 */
export const ERA_CITIZEN_DRESS: Readonly<Partial<Record<EraId, AuthoredCitizenDress>>> = {
  prehistoric: ERA_ONE_DRESS,
  neolithic: ERA_TWO_DRESS,
  bronze_age: ERA_THREE_DRESS,
};

/** Whether this era's own crowd is authored, as opposed to the fallback. */
export function hasAuthoredCitizenDress(eraId: EraId): boolean {
  return eraId in ERA_CITIZEN_DRESS;
}

/**
 * The dressing to draw the crowd in. TOTAL: always returns something wearable, so the renderer
 * never branches on absence and the city always has people in it — the same contract
 * `islandGround` and `roadSurfacing` keep, and for the same reason. A caller that needs to know
 * which it got reads `art`.
 */
export function citizenDress(eraId: EraId): CitizenDress {
  const authored = ERA_CITIZEN_DRESS[eraId];
  return authored
    ? { ...authored, art: "authored" }
    : { ...UNAUTHORED_CITIZEN_DRESS, art: "unauthored" };
}
