import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import type { AdvisorDress } from "../lessons/OruAdvisorCharacter";
import { advisorDressFor } from "./advisorDress";
import {
  LATE_ERA_HALLS,
  LATE_ERA_SKILL_BUILDINGS,
  type LateEraId,
} from "./era8To10RegistryPlan";
import { skillBuildingHomeEra } from "./skillBuildingEra";
import { isTownHall, placementLabel, TOWN_HALL_ID } from "./townHall";

/**
 * PER-ERA DRESSING SUBTITLES — the era flavour that hangs off a stable name.
 *
 * Authority: **D-ERA29** in `docs/superpowers/specs/2026-07-27-era-progression-design.md`
 * §6.2a, which amends D-ERA9 rather than contradicting it.
 *
 * ## The shape, and why it is this shape
 *
 * D-ERA9 fixed the display names as plain and era-neutral, and its reason is
 * accessibility: the Three.js canvas is `aria-hidden`, so a screen-reader user
 * navigates the city entirely through these names, and a building that renames itself
 * ten times destroys the only handle they have. D-ERA29 keeps that requirement
 * exactly and reads it more precisely: what may not move is **the handle**, which is
 * weaker than "no era flavour may exist anywhere". So a building has
 *
 *   - a STABLE NAME (`buildingAssets.ts`, `buildingName`) — the handle, identical in
 *     all ten eras, and always the LEADING token of the display name; and
 *   - a PER-ERA SUBTITLE (this table) — the era's own dressing, a suffix.
 *
 * `buildingDisplayName` composes them as `"{stable}, {subtitle}"`. **The subtitle is
 * NOT `aria-hidden`**: it enters the accessible name, so a sighted user and a
 * screen-reader user always say the same words about the same building (D-ERA29's
 * ruling, argued there). Alphabetical order, type-ahead and "find the one beginning
 * with D" are unaffected, because only the suffix moves.
 *
 * ## ⚑ WHAT THE ERA KEY MEANS — read before adding a row
 *
 * Record: `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md`, R3 and
 * §7. Skill buildings do not re-dress when the era turns; each is drawn once, in the
 * era it is raised, and kept. The hub is the only BUILDING that still re-themes, and so
 * the only row in this table that an era advance touches. (The island, the roads and
 * the advisor re-dress too, but none of them is named here.) Two consequences:
 *
 *  1. **A SKILL NODE'S SUBTITLE IS NOT A FUNCTION OF THE LIVE ERA.** It is a function
 *     of the era the building was RAISED in, which is settled the moment it goes up.
 *     **RESOLVED 2026-08-18:** every skill building uses its node's authored home era,
 *     including banked and catch-up placements. The value is derived by
 *     `skillBuildingHomeEra(nodeId)` and is not stored. The LIVE era is the wrong key.
 *     The two-part `"{stable}, {subtitle}"` shape is still REQUIRED for the hub, which
 *     is the only building whose name has to survive a re-theme.
 *  2. **FIXED 2026-07-30, by the change that wired era two.** This lookup was keyed on
 *     the live era for every building, and point 1 above ended *"not fixed here, because
 *     changing the key is a behaviour change; it belongs with whoever wires era two"*.
 *     That is this change, so the key has moved: {@link buildingSubtitle} resolves the
 *     hub against the LIVE era and every skill node against `getEraOfNode(nodeId)`.
 *
 *     The defect it closes was live and named in advance: in era two,
 *     `buildingDisplayName("NUM.3", "neolithic")` returned bare `"Workshop"` and silently
 *     dropped `"Tool Shelter"`, because `ERA_DRESSINGS` has no `neolithic` row for
 *     `NUM.3` and never will — the building is still era one's Tool Shelter. **Dropping a
 *     dressing is a re-dress**, and the 2026-07-29 skill-building ruling (R3) says era
 *     one's six never re-dress, so the live key was producing exactly what the ruling
 *     forbids the moment a second era existed.
 *
 *     This is the permanent ownership rule: test-out changes which teaching is required,
 *     not the authored era identity of the skill node.
 *
 * ## Why the table is keyed by era and starts almost empty
 *
 * **Eras one through five** have authored subtitle-grade dressing names. Era one's are
 * in `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §6 — Evan's
 * canonical text, and the one guide that names its dressings as proper nouns
 * ("the Stone Circle", "the Roundhouse"). **Era two's row was ratified on 2026-07-29** and
 * is wired here by the change that wired era two: its guide's *"The subtitle row
 * (D-ERA29)"* section carries all seven as the team lead's final names and states *"the row
 * is ready to wire"*, with the `tower` — the last slot to settle — locked at "the Stone
 * Tower". **Eras three and four were ratified in the same 2026-07-29 naming pass** and are
 * wired below; both guides explicitly mark their D-ERA29 rows "ratified for wiring". Era
 * five's final proper-noun row is wired with its attached Medieval building kit.
 *
 * Ratified copy is the bar, not authored copy: the five remaining guides dress their masses
 * too, but as lower-case descriptive forms ("the parterre court") and all still marked
 * **PROPOSED**, so wiring them would ship unratified strings into the accessible name. Each
 * therefore OWES a subtitle row as it is ratified; the obligation is recorded in
 * `docs/superpowers/specs/eras/README.md`.
 *
 * **What clears the bar is a section that says so, NOT the guide's own status line.** Era
 * three's guide is headed *"Status: PROPOSED"* and its palette section is explicitly *"PROPOSED
 * for Evan's review"* — and its subtitle row is neither. That row is headed *"ratified for
 * wiring into `apps/web/src/city/eraDressing.ts`"*, its names are the capitalised proper nouns
 * this table wants rather than running prose, its closure checklist reads *"[x] The subtitle
 * row — ratified above, seven proper nouns, ready to wire"*, and every name in it is the team
 * lead's own from the second naming pass over the full 102-building roster (which is also where
 * `eras/README.md`'s master table gets era three's column). So the row is ratified while the
 * guide around it is not, which is the same shape era two shipped under.
 *
 * **What a guide owes is a row for the nodes IT INTRODUCES, plus the hub** — 72 entries
 * across the ten eras rather than the 322 a re-dressing model needed. Two authoring
 * traps come with that. The guides dress MASSES and this table is keyed by NODE, so the
 * eleven cases where one era puts two of its nodes on one mass need a name each,
 * authored rather than transcribed. And **every announced name has to be unique across
 * the whole run**, because two eras' dressings now stand on the island at the same time
 * where previously the city only ever wore one era's.
 *
 * **An era with no row degrades to the stable name alone**, with no placeholder and
 * no invented dressing — `Partial<Record<EraId, …>>` makes that the default rather
 * than something a caller has to remember, and it is the reason this is a lookup
 * returning `null` rather than a required field on each building.
 */

/** One era's dressing names, keyed by node id (or the hub's sentinel). */
export type EraDressingRow = Readonly<Record<string, string>>;

function lateEraDressingRow(eraId: LateEraId): EraDressingRow {
  return {
    ...Object.fromEntries(
      Object.entries(LATE_ERA_SKILL_BUILDINGS[eraId]).map(([nodeId, [, , subtitle]]) => [
        nodeId,
        subtitle,
      ]),
    ),
    [TOWN_HALL_ID]: LATE_ERA_HALLS[eraId].subtitle,
  };
}

/**
 * The authored dressings, era by era. Eras one through five — see the header for why the
 * other five are absent rather than guessed, and what each owes.
 *
 * Era one's row is a verbatim transcription of `era-01-prehistoric/style-guide.md`
 * §6's seven dressed masses, including the hub's, so this table has one dressing for
 * every building the island can show today and no node silently missing one.
 *
 * ## The hub holds the Stone Circle, and `NUM.S` the Roundhouse (D-ERA31)
 *
 * These two were the other way round until 2026-07-28, and the swap is a DESIGN ruling
 * rather than a correction: era one's §6 gave the Stone Circle to `hall` (`NUM.S`, a
 * skill) and the Great Hearth to the hub, and the code matched the guide exactly. What
 * the guide did not reckon with is that it also made the Stone Circle the
 * settlement's largest roof and its tallest roofed building, so the eye read the skill
 * building as the town hall. Evan's ruling puts the era's round communal hall where the
 * civic centre actually is.
 *
 * **Only the DRESSING moved. Neither stable name did**, so D-TH7 is untouched: the hub
 * is now "Town Hall" and `NUM.S` is still "Assembly Hall", and no skill building
 * has gained a name that reads as the town hall.
 *
 * **The round-plan CHAIN stayed with `hall`** (the second half of D-ERA31, and the
 * cheaper half of the fork). Era one's §6 has `hall` keeping its round plan through all
 * ten eras — granary rotunda, colonnaded tholos, domed rotunda, transit concourse — and
 * that chain is what resolved the `POL.3` basilica and `GEO.1` domed-hall collisions on
 * 2026-07-28. The hub wears a round in era one WITHOUT inheriting it, so the nine later
 * guides keep both of their entries: `hall` stays "one big communal roof" and
 * `town-hall` stays "a sheltered communal fire". Nothing downstream had to move.
 *
 * **Two round buildings now stand on adjacent plots, and they are separated by PLAN and
 * SCALE rather than by geometry** (the rule `eras/README.md` states): the hub is a ring
 * you look into, open to the sky over its hearth, at 3×2; the Roundhouse is a closed
 * cone you go into, at 2×2. See era one's §6. **The shipped art for both is approved as
 * it stands** (Evan, 2026-07-28): the hub reads as a hearth with a shelter, which is what
 * the Stone Circle names, and no new model is required.
 */
export const ERA_DRESSINGS: Readonly<Partial<Record<EraId, EraDressingRow>>> = {
  prehistoric: {
    "NUM.S": "Roundhouse",
    "NUM.F": "Hide Shed",
    "NUM.2": "Hut Cluster",
    "NUM.3": "Tool Shelter",
    "NUM.4": "Clearing",
    "NUM.5": "Lookout",
    [TOWN_HALL_ID]: "Stone Circle",
  },
  /**
   * ERA TWO, ratified 2026-07-29 and transcribed verbatim from
   * `docs/superpowers/specs/eras/era-02-neolithic/style-guide.md`'s subtitle row — *"All
   * seven are the team lead's final names and the row is ready to wire."*
   *
   * **The hub's is the one an advance actually shows**, because the hub is the only
   * building that re-themes (R3): era one's Stone Circle becomes **the Elders' Hearth**, a
   * communal hearth room sunk a step into the earth and walled in brick, with the flat roof
   * as the surface the settlement stands on. So the fire the ring of standing stones held
   * under the open sky is indoors for the first time, which is the *sheltered communal
   * fire* through-line advancing rather than changing.
   *
   * **Two of these six moved on 2026-07-30 when Evan withdrew the buildings under them** —
   * `EXP.1` from *the Seed House* (a raised seed store, mostly boarded timber, which is not
   * one of the era's five materials) and the hub from *the Shrine* (a domed clay oven, the
   * same object as the era's civic Bread Oven). The names moved *with* the buildings rather
   * than as a rename pass; the other four are the team lead's 2026-07-29 set, untouched.
   * `era-02-neolithic/style-guide.md`'s subtitle row carries both replacements, the census
   * that cleared them and the alternatives rejected.
   *
   * **The five skill rows are era two's OWN nodes and no era-one node appears here.** That
   * is the R3 ruling as data: era one's six keep era one's names permanently, so a
   * `neolithic` row for `NUM.3` would be the re-dress the ruling withdrew. `EXP.1` and the
   * four `RAD` nodes have no models, footprints or lessons placed in the city yet, so these
   * five are inert today and land the day those buildings do — authored ahead of the art
   * rather than after it, because the row is ratified now and ratification is the bar.
   *
   * **`dwelling` is authored in the guide and absent here on purpose.** Its name is "the
   * Family Compound" and era two introduces no node on that mass, so there is no key to
   * hang it on: this table is keyed by NODE, and inventing a synthetic key for a mass with
   * no node would put a string in the accessible name of nothing.
   */
  neolithic: {
    "EXP.1": "the Bee House",
    "RAD.1": "the Potter's Kiln",
    "RAD.2": "the Sheep Pen",
    "RAD.3": "the Meeting House",
    "RAD.4": "the Stone Tower",
    [TOWN_HALL_ID]: "the Elders' Hearth",
  },
  /**
   * ERA THREE, ratified 2026-07-29 and transcribed verbatim from
   * `docs/superpowers/specs/eras/era-03-bronze-age/style-guide.md`'s *"The subtitle row
   * (D-ERA29)"* — *"ratified for wiring into `apps/web/src/city/eraDressing.ts`"*, seven proper
   * nouns from the lead's second naming pass. `eras/README.md`'s master naming table carries the
   * same seven in its `3 Bronze` column, which is the second record they are checked against.
   *
   * ## SEVEN RATIFIED NAMES AGAINST FIVE NODES, and the arithmetic closes without a gap
   *
   * The guide names seven MASSES and this table is keyed by NODE, which is the first of the two
   * authoring traps the header describes. The seven resolve as **five skill nodes + the hub +
   * one inert mass**, and every one of the five comes from the guide's own roster table rather
   * than from matching a name to a lesson:
   *
   *   `LIN.1` → `hall`     → the Merchants' Hall   (a trade hall, carts through both ends)
   *   `LIN.3` → `workshop` → the Bronze Foundry    (a foundry shop, two smelting hearths)
   *   `LIN.4` → `store`    → the Treasury          (a sealed bonded store, one bronze door)
   *   `LIN.5` → `yard`     → the Ingot Yard        (an ingot-weighing yard, open to the sky)
   *   `LIN.6` → `tower`    → the Stronghold        (a corner bastion, solid corbelled parapet)
   *   hub     → `town-hall`→ the Council Hall      (the furnace court; the hub re-themes, R3)
   *
   * **`dwelling` — "the Gallery Court" — is ratified and deliberately NOT wired**, on era two's
   * precedent and for era two's reason. Era three introduces no node on that mass: the guide
   * says so twice, *"`dwelling` — the Hut Cluster (`NUM.2`) alone, and **era three puts no node
   * on it**"* in §5, and *"Inert: no node on `dwelling` here"* in the subtitle row's own
   * rationale. This table is keyed by node, so there is no key to hang it on, and inventing a
   * synthetic one would put a string in the accessible name of nothing. Era two's "the Family
   * Compound" sits out for exactly the same reason. **So nothing here is underdetermined and no
   * name was authored to fill a gap** — the mismatch is 5 + 1 + 1 = 7, not 7 against 5.
   *
   * **`LIN.2` is not missing either.** It is retired (`lessons/d3.ts`), so the domain's live
   * roster is the five above, which is what `ERA_SEQUENCE`'s `bronze_age` entry holds.
   *
   * **These five are dressed and named but UNDRAWN, which is a narrower landing than era
   * two's.** There is no `lin-*.glb` in `art/models/`, so each resolves through
   * `resolveBuildingModel`'s fail-closed branch to the shared procedural template while
   * announcing its real name. That is the defect this row closes: a learner in era three read a
   * build card headlined `"LIN.1"` with no subtitle under it. Authored ahead of the art rather
   * than after it, because the row is ratified now and ratification is the bar.
   */
  bronze_age: {
    "LIN.1": "the Merchants' Hall",
    "LIN.3": "the Bronze Foundry",
    "LIN.4": "the Treasury",
    "LIN.5": "the Ingot Yard",
    "LIN.6": "the Stronghold",
    [TOWN_HALL_ID]: "the Council Hall",
  },
  /**
   * ERA FOUR, transcribed from the Classical guide's D-ERA29 row, which is explicitly
   * "ratified for wiring into `apps/web/src/city/eraDressing.ts`". `workshop` has two
   * nodes, so the row follows the guide's node-specific split rather than deriving one
   * subtitle from the shared mass.
   */
  classical: {
    "POL.1": "the Stonecutters' Shop",
    "POL.2": "the Barracks",
    "POL.3": "the Custom's House",
    "POL.4": "the Wine Cellars",
    "POL.8": "the Surveyor's Shop",
    [TOWN_HALL_ID]: "the Senate House",
  },
  /**
   * ERA FIVE, transcribed from the Medieval guide's ratified D-ERA29 row. The source kit's
   * stale `CLO.*` target labels do not enter learner copy; these are the current RAT nodes,
   * and the hub keeps the product's Court House name rather than the source's generic label.
   */
  medieval: {
    "RAT.1": "the Weaver's Shop",
    "RAT.2": "the Wool Store",
    "RAT.3": "the Guild Hall",
    "RAT.4": "the Tower House",
    "RAT.6": "the Timber Houses",
    [TOWN_HALL_ID]: "the Court House",
  },
  /**
   * ERA SEVEN, transcribed from the Industrial guide's ratified D-ERA29 row. Its two
   * shared-mass pairs are keyed per node, and learner copy keeps the current Cannon
   * Factory and Water Tower names rather than the retired Pattern Shop/accumulator prose.
   */
  industrial: {
    "FUN.1": "the Spinning Mill",
    "FUN.2": "the Cotton Warehouse",
    "FUN.3": "the Locomotive Shop",
    "FUN.7": "the Exhibition Hall",
    "FUN.8": "the Cannon Factory",
    "POL.5": "the Water Tower",
    [TOWN_HALL_ID]: "the Engine House",
  },
  atomic_age: lateEraDressingRow("atomic_age"),
  information_age: lateEraDressingRow("information_age"),
  cyberpunk: lateEraDressingRow("cyberpunk"),
};

/**
 * The era's advisor, and the one line that says who they are.
 *
 * **D-ERA28**, as amended by **D-ET9** (`docs/superpowers/specs/2026-07-29-era-trial-contract.md`
 * §19.2). The advisor is one of the four things an era advance still changes — the hall, the
 * ground, the roads and the advisor — after the 2026-07-29 re-dressing ruling withdrew the
 * re-skin for every standing building.
 *
 * ## ⚑ THERE IS ONE ADVISOR FOR THE WHOLE RUN, AND THIS TABLE IS A COSTUME LIST
 *
 * **D-ET9, the team lead, verbatim:** *"There is one continuous advisor for the whole run,
 * re-themed per era. Not ten advisors."* It overturns the identity half of D-ERA28 and
 * resolves §5.4's open question in favour of one character in ten costumes. §19.2 reads
 * THIS TABLE's shape as the evidence for it — *"a partial name-and-role table is a costume
 * list; nothing in the code ever committed to ten characters"*.
 *
 * **What that makes each half of a row.** The NAME is continuous and is not per-era data at
 * all: {@link continuousAdvisorName} derives it from era one's row, because
 * `eras/README.md`'s own table gives era one as *"the surviving name"* and column three as
 * *"Era N's advisor is Oru, dressed and speaking as …"*. The ROLE is the era's REGISTER,
 * which is exactly what the lead's 2026-07-30 clarification says must keep varying — *"the
 * advisor's prose should change across eras though — it's not just a static advisor"* — so
 * it is per-era, and it is the half an unratified era does not have.
 *
 * **`Ket` is retired here, and that is the code change the documents said was owed.**
 * `eras/README.md` recorded *"one of the nine retired names is therefore still shipping,
 * which is a code change owed in the web lane"*, and era two's guide names the same one-line
 * change. Era two's advisor is **Oru, dressed and speaking as a grain keeper** — the guide's
 * own words — and everything else in that section (the flax wrap, the fired-clay bead, the
 * impressed clay tablet, the winnowing basket, the four poses, the register of *a quantity
 * that multiplies*) survives untouched, which is what the ruling asks for.
 *
 * ## ⚑ THE THREE-WAY DISPUTE IS CLOSED. Evan, 2026-07-31: *"oru redressed"*
 *
 * Era two's name was contested three ways for a day — this table shipped `Ket`, `D-ET9`
 * retired it for Oru, and Evan's delivered art arrived as `MakaAdvisor.dc.html` — and every
 * record that named it carried a *"disputed three ways, whoever settles it moves both"* note
 * pointing here. **Evan ruled for `D-ET9`'s answer** and this is the row that records it:
 * era two's advisor is Oru, re-dressed as a grain keeper. `Ket` is a retired name and `Maka`
 * is a costume's working title, so neither is a second person.
 *
 * **The rule that outlives the dispute, and the reason it never blocked the art:**
 * **`art` names a DRAWING and this table names the PERSON a learner hears.** They are
 * different kinds of thing and are allowed to differ — `eraAdvisor.ts`' `AdvisorArt` token
 * `maka` is the handle for era two's costume, after the file it was ported from, and it makes
 * no claim about who is wearing it. That separation is what let the drawing land on
 * 2026-07-31 while the name was still open, and it is asserted rather than trusted:
 * `eraAdvisorArt.test.tsx` fails if the spoken name is ever derived from the drawing token.
 * Under D-ET9 the separation is permanent, not transitional — one person wears ten costumes,
 * so a costume that took the person's name would need a number after it.
 *
 * ## This table is a NAME and a REGISTER. The CLOTHES are `advisorDress.ts`
 *
 * Every era's style guide carries an authored dressing paragraph, and `advisorDress.ts`
 * transcribes the ten into parameters the character component draws.
 *
 * **The two halves resolve together and this is the seam they meet at.**
 * {@link resolveEraAdvisor} answers *"who is on screen, in what voice, in what clothes"* in
 * one call, so a surface cannot get a beat-one register from one era and a costume from
 * another — which is exactly the defect a second resolver would have introduced.
 *
 * ## An unratified era shows the ADVISOR but not a register
 *
 * `Partial` because seven eras have not ratified a register, and this is the one place where
 * the dressings' *"no row, no string"* rule does NOT extend to dropping the whole line:
 * under D-ET9 the person is the same person in all ten eras, so a surface that renders
 * nothing has removed a character the ruling says is continuously present. That is the A4
 * defect — eras three to ten rendered no advisor at all — and it is worse than a default
 * register, because a learner who is being guided through ten ages by one guide meets
 * nobody from the Bronze Age on. {@link resolveEraAdvisor} is therefore TOTAL: it always
 * names the advisor, carries `role: null` where no register is ratified, and reports which
 * of the two it is in `register`, exactly as `resolveEraTownHall` reports its own fallback.
 * A borrowed register would still read as authored, so none is borrowed.
 *
 * **The clothes are NOT partial in the same way, and the asymmetry is deliberate.** All ten
 * eras have an authored dressing, so {@link ResolvedEraAdvisor.dress} is always the era's
 * own. A `null` there would have meant *"wear the previous era's clothes"*, which is not an
 * honest absence but a wrong costume.
 */
export interface EraAdvisor {
  readonly name: string;
  /**
   * How he is introduced in this era, in a few words. **Enters learner-facing copy** — the
   * ceremony byline and the era door's eyebrow are built from it, so a word written here is
   * a word a learner reads and a screen reader speaks.
   *
   * **IT MAY NOT BE ANOTHER FEATURE'S JOB TITLE**, which is not a general caution: era one
   * held `the memory-keeper` while the Album shipped as the thing that keeps the city's
   * memory, and the product lead retired it on 2026-08-05 — *"oru should be an advisor and
   * an advisor only."* `advisorIsAnAdvisor.test.tsx` sweeps every era's RENDERED byline for
   * that vocabulary, so a re-dressing that reaches for one fails there rather than shipping.
   */
  readonly role: string;
}

export const ERA_ADVISORS: Readonly<Partial<Record<EraId, EraAdvisor>>> = {
  /**
   * ERA ONE. **`the memory-keeper` is retired**, ruled by the product lead on 2026-08-05 —
   * *"oru should be an advisor and an advisor only."*
   *
   * **It was another feature's job title, on the advisor, in the one place a learner reads
   * it out loud.** Keeping the city's memory is the **Album's** job (D-ERA19 layer 4, the
   * surface the team lead called the *chronicler*), and this row is what the ceremony byline
   * and the door's eyebrow are built from — see the `role` comment above, *"Enters
   * learner-facing copy."*
   *
   * **WHICH HALF GIVES WAS DECIDED BEFORE THE COLLISION HAPPENED, and citing it is the
   * point.** `CitySurface.tsx`, choosing the label `Album` over `Chronicler`: *"A chronicler
   * is also a PERSON, and this is a log."* The person keeps the person-name and the log
   * keeps the log-name, so the advisor moves and the Album does not. This is the ruling
   * being applied, not a rename anybody drifted into.
   *
   * **`your advisor` and not `the advisor`, because it has to read in two slots.** The
   * ceremony builds `"{name}, {role}"` and the door's eyebrow builds `"{name} · {role}"`,
   * and it is also verbatim what the intro's first slide says out loud — *"I am Oru, your
   * advisor."* So the character introduces himself once and every later surface agrees with
   * him. `advisorIsAnAdvisor.test.tsx` reads both slots out of the mounted DOM.
   *
   * **The article's logic survives the change, in the possessive rather than the definite.**
   * Era one's register is UNIQUE — he is *your* advisor, the only one there is — and every
   * re-dressing after it is indefinite, one of the settlement's several jobs. That contrast
   * is what the rows below are keeping; only era one's grammatical form moved.
   */
  prehistoric: { name: "Oru", role: "your advisor" },
  /**
   * ERA TWO, after D-ET9. Transcribed from
   * `docs/superpowers/specs/eras/era-02-neolithic/style-guide.md`'s sunset block — *"The name
   * `Ket` is retired. Era two's advisor is **Oru**, dressed and speaking as a grain keeper."*
   *
   * The article is the guide's and is indefinite — *a* grain keeper, one of the settlement's
   * several jobs — which is also the form `eras/README.md`'s table uses for all nine
   * re-dressings. See era one's row for the register it is indefinite *against*.
   *
   * **Settled by Evan on 2026-07-31** — *"oru redressed"* — against `Maka`, the name his
   * delivered art file carries. `Maka` stays as the DRAWING's token and nothing here follows
   * it; see the header for why those are two different kinds of name.
   */
  neolithic: { name: "Oru", role: "a grain keeper" },
  /**
   * ERA THREE, under D-ET9 from the start — its guide was re-recorded on 2026-07-30 rather than
   * needing a retirement applied to it here. Transcribed from
   * `docs/superpowers/specs/eras/era-03-bronze-age/style-guide.md`'s sunset block — *"The name
   * `Nabu` is retired. Era three's advisor is **Oru**, dressed and speaking as a weights-and-
   * measures official."*
   *
   * **The register is what survived the retirement, and the guide says so in terms:** *"so does
   * the register above, `the person both sides of a bargain trust`, which is this era's
   * presentation of Oru rather than a second person's personality."* Its closure checklist
   * carries *"[x] The advisor"*, and `eras/README.md`'s advisor table gives era three's role as
   * *a weights-and-measures official* — the second record, and the one the header cites for the
   * indefinite article. So this row is a REGISTER arriving with its name already settled, which
   * is the opposite of era two's, where the name was the contested half.
   *
   * **Nothing about the DRAWING moves with it.** Era three has no advisor art: `eraAdvisor.ts`
   * gives `bronze_age` `BORROWED_ORU_POSES` and `eraAdvisorArt.test.tsx` records *"no advisor
   * character authored; drawing owed per the eras README"*. Both stay true — this table names
   * the PERSON a learner hears, and under D-ET9 that separation is permanent.
   */
  bronze_age: { name: "Oru", role: "a weights-and-measures official" },
};

/**
 * The advisor's name, which is the same name in all ten eras (D-ET9).
 *
 * DERIVED FROM ERA ONE'S ROW rather than written as a literal, on the same discipline
 * {@link CURRENT_ERA_ID} follows: era one's is the surviving name because era one is first in
 * `ERA_SEQUENCE` and its advisor is the one that ships, so a rename of the character is one
 * edit in one place and nine eras follow it. Fail-loud rather than defaulting to `"Oru"`,
 * because a hard-coded fallback would keep working while quietly no longer being a
 * derivation.
 */
export function continuousAdvisorName(): string {
  const first = ERA_ADVISORS[CURRENT_ERA_ID];
  if (!first) {
    throw new Error(
      `Era "${CURRENT_ERA_ID}" is first in ERA_SEQUENCE and has no advisor row, so the ` +
        `one continuous advisor D-ET9 rules for cannot be derived from the authored data.`,
    );
  }
  return first.name;
}

/** The advisor an era resolves to: who, in what voice, and in what clothes. */
export interface ResolvedEraAdvisor {
  /** The continuous character (D-ET9). Never null, and the same in all ten eras. */
  readonly name: string;
  /**
   * The era's own register, or `null` where none is ratified — in which case a surface names
   * the advisor and says nothing about the job he holds here. Never the previous era's.
   */
  readonly role: string | null;
  /**
   * `"authored"` — this era has ratified a REGISTER and it is on screen.
   * `"unauthored"` — it has not, so the advisor is named without one.
   *
   * **This field was called `dress` until the ten costumes landed, and the rename is the
   * point rather than tidying.** It never described clothes: it reported whether
   * {@link EraAdvisor.role} exists. Leaving it named `dress` beside a real garment would
   * have had eight eras reporting `dress: "unauthored"` while visibly wearing an authored
   * costume, which is a worse lie than the one it started as.
   */
  readonly register: "authored" | "unauthored";
  /**
   * WHAT HE IS WEARING HERE. Never null — every era has an authored dressing, and see the
   * header for why a missing one could not degrade gracefully the way a register can.
   */
  readonly dress: AdvisorDress;
}

/**
 * The advisor for the era the city is wearing. TOTAL: always names somebody and always
 * dresses them, so no era can render the advisor away or leave him in the last era's
 * clothes. See the header for why the register may still be absent when the costume cannot.
 *
 * **This is the beat-one seam.** D-ET8's first beat changes the advisor's dress, and the
 * ceremony reaches it by resolving THIS function against the incoming era at the beat's
 * halfway mark. Both halves therefore move on the same call and cannot disagree.
 */
export function resolveEraAdvisor(eraId: EraId): ResolvedEraAdvisor {
  const authored = ERA_ADVISORS[eraId];
  const dress = advisorDressFor(eraId);
  return authored
    ? { name: authored.name, role: authored.role, register: "authored", dress }
    : { name: continuousAdvisorName(), role: null, register: "unauthored", dress };
}

/** The era's authored advisor row, or `null` where no register is ratified. */
export function eraAdvisor(eraId: EraId): EraAdvisor | null {
  return ERA_ADVISORS[eraId] ?? null;
}

/**
 * THE FIRST ERA, and the default the city stands in before anything advances it.
 *
 * DERIVED FROM `ERA_SEQUENCE`, never written as a literal: era one is era one because
 * it is first in the authored sequence (INV-ERA-5 — the order is array position and
 * nothing else), and it is the only era with authored lessons, items and models
 * today.
 *
 * ## ⚑ ERA STATE NOW EXISTS, AND IT IS NOT THIS CONSTANT
 *
 * This docblock read *"there is no era STATE in the app yet — the chapter break that
 * advances it is D-ERA5 and unbuilt — so this constant is the single seam where that state
 * will land"*, and it has landed: **`eraState.ts` holds the stored era and `useCityEra.ts`
 * is the React view of it.** Read one of those two if you want the era the city is standing
 * in *now*. This constant is what they default to.
 *
 * **THE WARNING THAT CAME WITH THE SEAM STILL BINDS, and it is why this was not simply
 * repointed.** Each call site has to be decided separately rather than as a set: the live
 * era is right for everything that re-themes — the roads (`three/Roads.tsx`), the island,
 * the advisor and the town hall — and wrong for a skill building's dressing, which is fixed
 * at the era the building was raised in (header, point 1). *"A change that swaps this
 * constant for live era state and touches nothing else silently drops `Hut Cluster` from
 * every era-one building the moment era two exists"* was exactly right, so the two call
 * sites the advance needed were decided individually — {@link buildingSubtitle} splits hub
 * from skill node, and `CitySurface.tsx` reads live era state for the surface — and the
 * rest still read era one, which is the correct answer for all of them today.
 *
 * **The remaining readers, and none of them is a bug.** `winter/**` and
 * `engines/game/hard-winter*` are era one's crisis and belong to another lane;
 * `economy/**`'s era multiplier is era one's ×1 and belongs to a third;
 * `three/GridworkModelPreview.tsx` is a dev preview whose own comment says it pins era one
 * because the model glob only resolves one era's files. Each is a separate decision for its
 * owner, which is what this warning asks for.
 */
export const CURRENT_ERA_ID: EraId = firstEraId();

/**
 * Fail-loud rather than defaulting to the `"prehistoric"` literal, following the
 * `eraBuildableRadius` discipline in `eras.ts`: a hard-coded fallback would keep
 * working while quietly no longer being a derivation, which is the whole property
 * INV-ERA-5 asks this module to preserve.
 */
function firstEraId(): EraId {
  const first = ERA_SEQUENCE[0];
  if (!first) {
    throw new Error(
      "ERA_SEQUENCE is empty, so the era the city wears cannot be derived from it.",
    );
  }
  return first.id;
}

/**
 * The era the dressing for `nodeId` is looked up under, given the era the city is
 * currently wearing.
 *
 * **The hub takes the LIVE era and every skill node takes its OWN** (header point 2).
 * `skillBuildingHomeEra` reads `ERA_SEQUENCE` membership — static authored data, one era per node by
 * INV-ERA-2 — so a skill building's dressing is fixed the moment its node is curated into
 * an era and cannot move when the city advances. That is R3 expressed as a lookup rather
 * than as a convention somebody has to remember at each call site.
 *
 * A node in no era falls back to the live era, which is the only answer available and is
 * unreachable through the registry: `eras.test.ts` pins the ten sets as a partition of the
 * 62 in-product nodes.
 */
function dressingEraFor(nodeId: string, liveEraId: EraId): EraId {
  if (isTownHall(nodeId)) {
    return liveEraId;
  }
  return skillBuildingHomeEra(nodeId) ?? liveEraId;
}

/**
 * The dressing subtitle for a building, or `null` when no dressing is authored for it.
 * `null` is the honest answer for most of the sequence today and callers must render the
 * stable name alone for it — never a placeholder, an em dash, or another era's dressing,
 * all of which would read as authored.
 *
 * **CALLERS PASS THE LIVE ERA and it is used only for the hub.** The parameter is kept for
 * every caller rather than split into two functions because the hub flows through the same
 * roster rows, callouts and announcements every skill building does; a caller that had to
 * know which of two lookups to use would be a caller that can get it wrong. See
 * {@link dressingEraFor} for the split, and the header's point 2 for the defect it closes.
 */
export function buildingSubtitle(nodeId: string, eraId: EraId): string | null {
  return ERA_DRESSINGS[dressingEraFor(nodeId, eraId)]?.[nodeId] ?? null;
}

/**
 * The learner-facing display name: `"{stable}, {subtitle}"`, or the stable name alone
 * when the era has authored no dressing for this building.
 *
 * The stable name is ALWAYS the leading token, which is the whole of D-ERA29's
 * accessibility argument — the handle has not moved, it has gained a suffix. It comes
 * from `placementLabel`, so the hub's sentinel resolves to "Town Hall" rather than
 * to the literal `town-hall` (the #112 defect), and an unmapped id still reads as
 * itself.
 */
export function buildingDisplayName(nodeId: string, eraId: EraId): string {
  const stable = placementLabel(nodeId);
  const subtitle = buildingSubtitle(nodeId, eraId);
  return subtitle ? `${stable}, ${subtitle}` : stable;
}
