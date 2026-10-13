/**
 * **THE 24-ROW MECHANIC INVENTORY, ANSWERED FOR ERA FOUR.**
 *
 * `docs/superpowers/specs/crisis-reference-packs/README.md` §3 derives twenty-four
 * mechanics from era one's built code and rules how every crisis brief must use them:
 * *"a row for every mechanic […] the row [says] either what the player sees or that this
 * crisis has no analogue. **A blank row fails; a row saying 'no analogue, because ...'
 * passes.**"*
 *
 * ## Why the inventory is DATA and not prose
 *
 * §2 of that document explains what the inventory is for, and it is the reason this file
 * is a table a test can read rather than a section of a markdown document:
 *
 * > A brief written by walking the six atmosphere axes gets a thorough mood and a thorough
 * > hazard, because both are properties of the WORLD. Everything the player does is a
 * > property of the LOOP, and the loop has no axis list. So the interactive half is not
 * > argued away, it is never reached, **and an omission that is never reached is invisible
 * > in review**: a reader checking that brief against its own table of contents finds
 * > nothing missing.
 *
 * A prose inventory has exactly that failure mode a second time: a row quietly dropped
 * reads as a document with no gap in it. So the rows below are derived against the source
 * table by `test/successionMechanicInventory.test.ts`, which parses §3's twenty-four rows
 * out of the markdown and asserts SET EQUALITY in both directions — a row this file misses
 * fails, and a row this file invents fails too.
 *
 * **The row COUNT is derived and not written down, and there is a reason to say so.** §3's
 * own prose says *"Twenty-two rows"* over a table that has twenty-four in it, and the
 * section that tells a brief how to use it says *"the same 24 rows"* two paragraphs later.
 * The table is the authority — it is the thing with the mechanics in it — so the derivation
 * parses rows rather than trusting either sentence, and the disagreement is recorded here
 * rather than silently resolved in favour of the number this file happens to hold.
 *
 * ## The three answers a row may give, and what each one owes
 *
 *  - **`built`** — this pass shipped era four's instance in `engines/game/`. The row names
 *    exported symbols, and the test checks every one of them really is exported, so a
 *    renamed function fails here rather than leaving the inventory describing a function
 *    nobody can find.
 *  - **`no_analogue`** — era four genuinely has no instance. The row must say *because*,
 *    which the test enforces on the literal word, because that is the shape §3 rules
 *    passes. It may name no engine symbol: a row claiming an absence and pointing at code
 *    is claiming two different things.
 *  - **`deferred`** — era four HAS an instance and this pass did not build it. The row says
 *    what it will be and which lane owns it. *"Not built yet"* with no successor is the
 *    blank row under another name.
 *
 * **This pass owns `engines/game/` and does not touch `apps/web/src/city/three/`.** Five
 * rows are presentation and are `deferred` for that reason rather than because they are
 * hard; each names the web-lane artefact that will answer it, so the split reads as a lane
 * boundary and not as an omission.
 */

/** Which of the three answers a row gives. */
export type SuccessionMechanicAnswer = "built" | "no_analogue" | "deferred";

/** One row of the inventory, answered. */
export interface SuccessionMechanic {
  /** `M1` .. `M24`, exactly as §3's table keys them. */
  readonly id: string;
  /**
   * The mechanic, in the inventory's own words. Kept so a reader of this file does not
   * have to hold the markdown open beside it; the test asserts it against the source
   * table, so the two cannot drift.
   */
  readonly mechanic: string;
  readonly answer: SuccessionMechanicAnswer;
  /**
   * **What era four's instance IS, or why there is none.** This is the deliverable for the
   * row, and a short one is a blank row with a sentence in front of it.
   */
  readonly instance: string;
  /** Exported names in this engine a reader can go and check. Empty for `no_analogue`. */
  readonly engine_symbols: readonly string[];
  /** What is still owed and which lane owns it, or `null` when nothing is. */
  readonly next: string | null;
}

/**
 * ERA FOUR'S ANSWERS, in the inventory's order.
 *
 * Read `M9` first. It is the row the whole design turns on, and the one the reference pack
 * singles out as the answer that must not be got wrong: *"'Era four has no propagation'
 * would be a false answer, because a district drifting to a claimant is propagation with an
 * unusual topology. The test is whether the PLAYER meets the mechanic, not whether the
 * crisis implements it the way era one does."*
 */
export const SUCCESSION_MECHANICS: readonly SuccessionMechanic[] = [
  {
    id: "M1",
    mechanic: "The crisis call, on the city, before the player enters",
    answer: "built",
    instance:
      "The shared mid-era call, bound to era four. `successionEntry()` reports the era, " +
      "the trigger and the nodes a learner has finished when the call arrives, and the " +
      "trigger is DERIVED rather than written down: D-CRISIS-9 sets it at `ceil(n / 2)` " +
      "over the era's own nodes, which for era four's five POL nodes is three. The brief " +
      "states that three as a number and a literal three here would be the per-era table " +
      "D-CRISIS-9 exists to abolish, so this module computes it through " +
      "`mid-era-crisis.ts` and holds only the era id.",
    engine_symbols: ["successionEntry", "SUCCESSION_ERA"],
    next:
      "The HUD chip and the advisor's briefing slides are the web lane's " +
      "(`apps/web/src/city/crisisCall.ts`), and era four's copy is authored in the " +
      "brief's §9.1: 'The city has no successor' / 'Two claimants are courting the " +
      "districts' / 'Go to the forum'.",
  },
  {
    id: "M2",
    mechanic:
      "The city while a call is unanswered. D-CRISIS-35 freezes building and leaves " +
      "learning alone",
    answer: "deferred",
    instance:
      "Identical to era one's, and unbuilt for the same reason: D-CRISIS-35 freezes the " +
      "city and leaves learning alone, and that is a GAME-level ruling rather than a " +
      "crisis-level one. What era four adds is §5.42b's finding, and it is a property of " +
      "this engine rather than of the city: a cycle advances on an answered batch, so a " +
      "player who never enters answers no batch, no cycle advances and NO DISTRICT " +
      "DRIFTS. The crisis on the doorstep is genuinely frozen, and `successionReducer` " +
      "is what makes that structural rather than incidental.",
    engine_symbols: ["successionReducer"],
    next:
      "The freeze itself belongs with `useCrisisCall` in the web lane, where era one's " +
      "gap already is. Nothing in era four can close it: §5.42b records that no cycle " +
      "unit could ever have reached a player who never entered.",
  },
  {
    id: "M3",
    mechanic: "Entry and exit, as a change on screen",
    answer: "built",
    instance:
      "The engine half — what reverts and what persists — is built and is the half with a " +
      "ruling behind it. The statues and the claim plates STAY (§8.2), which is why the " +
      "outcome reports holdings and contests rather than a score; the boundary stones GO, " +
      "because they are the crisis's own drawing on the ground; and a contest still " +
      "standing at the settle persists as `suspended_civic`, which is era four's whole " +
      "durable consequence. `successionDamage` is what a caller folds into the city.",
    engine_symbols: ["successionOutcome", "successionDamage"],
    next:
      "ANSWERED IN THE WEB LANE. `SuccessionInCity.tsx` binds deterministic ward ids to " +
      "stable placements from the current city session and publishes the dispute through " +
      "the shared city canvas. `SuccessionConclusion.tsx` is the resolution panel. On " +
      "explicit Return, only currently existing bought civics enter `suspended_civic`; " +
      "skill buildings and the Town Hall keep their capacity, and the settled marker layer " +
      "rebuilds from battle persistence after reload.",
  },
  {
    id: "M4",
    mechanic: "The atmosphere: light, sky, fog, exposure",
    answer: "deferred",
    instance:
      "Era four has an emphatic one and it is the most identifying lever in its brief: a " +
      "high, hard, still noon with the key raised close to overhead, which is the exact " +
      "reverse of era three's long dawn rake. Cooler and whiter key, a horizon bleached " +
      "almost white, and the fog's near plane pushed OUT, because era four's crisis wants " +
      "clarity rather than haze — everything is visible and nobody will say what they " +
      "intend. Nothing in the engine reads a light.",
    engine_symbols: [],
    next:
      "ANSWERED IN THE WEB LANE. `apps/web/src/city/three/successionTones.ts` is that file. " +
      "It RE-EXPORTS the atmosphere rather than re-authoring it — `SUCCESSION_LIGHT` already " +
      "shipped in `crisis/succession.ts` and the crisis registry is bound to it, so a second " +
      "copy of thirteen numbers would be the one way the preset the registry declares and " +
      "the preset the scene mounts could come apart. What the file adds is era four's SCENE " +
      "palette, which the shared thirteen-control preset has no business holding.",
  },
  {
    id: "M5",
    mechanic: "Ground under the crisis",
    answer: "deferred",
    instance:
      "Era four's answer is a refusal of the shared decal ladder and it is a design " +
      "decision rather than an omission (§2.2). NOTHING FILLS A DISTRICT: a fill would " +
      "cover the paved floor that is the era's whole ground identity, and it would make " +
      "the board read as a map rather than as a city. Era four's authored radius (43) is " +
      "also well past the drawn grass (30), so a per-cell layer would extend past the " +
      "island. What the crisis writes on the ground instead is OBJECTS — boundary stones " +
      "set along the joint lines the paving already has, one every few paces.",
    engine_symbols: [],
    next:
      "ANSWERED IN THE WEB LANE, and the refusal held. `buildBoundaryStone` and " +
      "`buildBoundaryRun` in `apps/web/src/city/three/successionScene.ts` build the run as " +
      "separate stones set into the paving on its own joint lines, each carrying the " +
      "holder's cut mark or none at all where the district is unclaimed. **No layer is laid " +
      "and there is no fill parameter to reach for**, which is what the row refuses. The " +
      "engine still holds no position: where a stone stands is " +
      "`apps/web/src/succession/successionStands.ts`'s answer, derived from the drift order " +
      "alone and never read back.",
  },
  {
    id: "M6",
    mechanic: "Water and shoreline under the crisis",
    answer: "deferred",
    instance:
      "Era four is a port city and the crisis SHUTS THE PORT, which §2.4 calls the " +
      "largest single atmosphere change available at almost no cost: ships stand off at " +
      "anchor rather than unloading, the quay is cleared of bales and sacks and jars, and " +
      "the public basin still runs — the one thing that has not stopped, worth keeping " +
      "precisely because everything else has.",
    engine_symbols: [],
    next:
      "ANSWERED IN THE WEB LANE. `buildQuay`, `buildHull`, `buildTreadwheelCrane` and " +
      "`buildBasin` in `apps/web/src/city/three/successionScene.ts`: hulls standing off at " +
      "anchor, a quay with a deck, a lip and bollards and NO cargo builder to call, a crane " +
      "stopped mid-lift with its load still in the air, and the basin running in a water " +
      "tone a measured step above the shut harbour's. The clearing is the content, which is " +
      "why there is no way to draw the quay loaded.",
  },
  {
    id: "M7",
    mechanic: "Vegetation under the crisis",
    answer: "no_analogue",
    instance:
      "No analogue, because a political dispute does not change what grows. §2.3 is " +
      "explicit that era four's line of limbed-up trees is the era's own planting and the " +
      "crisis leaves it alone. The one permitted change is not in the vegetation at all " +
      "but at the foot of it — the ground beneath the line has been standing-room, " +
      "scuffed where people have been gathering — which is a rung on the decal ladder and " +
      "belongs to the ground row rather than to this one.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M8",
    mechanic: "The hazard's own body, and its stages",
    answer: "no_analogue",
    instance:
      "No analogue, because era four's hazard has no body. §3: 'Era four's hazard is not " +
      "a thing on the board; it is a state of the board. The antagonist is TIME PASSING " +
      "WITHOUT YOU, expressed as districts deciding on their own.' There is no frost, no " +
      "fire and nothing walking up the road, and the reference pack names this row as the " +
      "legitimate absence that CHANGES WHAT THE BRIEF OWES: the atmosphere has to be " +
      "carried by a city that has stopped working instead. Do not read the drift block as " +
      "the hazard's body — the block is the WARNING that the state of the board is about " +
      "to change, and it is answered under the propagation row.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M9",
    mechanic: "The propagation, and its leading edge",
    answer: "built",
    instance:
      "ALLEGIANCE, ALONG NOTHING SPATIAL AT ALL. `successionThreat` names exactly one " +
      "undecided district before a three-question batch begins. Resolving that batch is the " +
      "only event that lets the rival act: the named district gains the rival statue and its " +
      "civic building closes. There is no front, adjacency, distance or elapsed-time input. " +
      "The marked decree block is visible before the decision lands, so the learner knows " +
      "what the next batch will change; a rally can move the next named district first, but " +
      "planning and spending never trigger another rival move.",
    engine_symbols: ["successionThreat", "successionReducer"],
    next:
      "The block, the shear-legs and the lift interpolation are web-lane geometry (B7), " +
      "which the brief says to build first because every other item is decoration " +
      "without it.",
  },
  {
    id: "M10",
    mechanic: "The player's counter-mechanic, as an object",
    answer: "built",
    instance:
      "INFLUENCE is a banked resource and its rule is deliberately literal: each correct " +
      "answer earns one, so a batch adds zero through three and accuracy changes nothing " +
      "else. `successionActionOffers` spends it on exactly two verbs: rally the next " +
      "district for two, or reopen the newest closure for one. The visible object is a " +
      "ruled limestone tablet with equal unnumbered seats and stone tesserae standing " +
      "proud. Holding influence across batches is allowed, while neither holding nor " +
      "spending advances the rival.",
    engine_symbols: [
      "successionCountersFor",
      "successionActionOffers",
      "successionReducer",
    ],
    next: "The ruled slab and its counters are web-lane DOM and SVG (U1).",
  },
  {
    id: "M11",
    mechanic: "Its own states: proposed, declared but inert, working, spent",
    answer: "built",
    instance:
      "PROPOSED is one derived action offer copied into `state.proposal`; it changes no " +
      "district, bank or batch. The rally proposal is a translucent complete chevron statue, " +
      "and the reopen proposal keeps the current shutters solid while adding a removal " +
      "cleat. COMMITTED applies that exact target and cost immediately: the statue becomes " +
      "solid or the shutters come off. SPENT is the matching tessera removed from influence. " +
      "DECLARED BUT INERT has no analogue because an action is not waiting for questions " +
      "to determine its strength; questions have already sized the bank.",
    engine_symbols: ["successionActionOffers", "successionReducer", "successionOutcome"],
    next: "The outline variants of the figure and the claim plate are web-lane geometry (B8).",
  },
  {
    id: "M12",
    mechanic: "Its aimed coverage, and the footprint that coverage takes",
    answer: "no_analogue",
    instance:
      "No analogue, because accuracy sizes the BANK here and never a reach. Era one's " +
      "fire covers a disc whose radius the tier decides; a Succession spend names one " +
      "district or one building and reaches exactly it, at every accuracy. The nearest " +
      "thing is how many districts one commit touches, which is a count the read-out " +
      "reports and not a shape on the ground — and it is decided by how long the player " +
      "banked rather than by how well they answered.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M13",
    mechanic: "Its pre-commit preview",
    answer: "built",
    instance:
      "`successionActionOffers` derives both the current target and price from the state; " +
      "the client sends only an action kind. `propose_action` records that complete offer " +
      "without changing the board or bank, and `commit_action` re-derives it and refuses a " +
      "stale or mismatched proposal before applying it. The DOM says current, proposed and " +
      "cost in three short lines while the scene shows the same ghost statue or removal " +
      "cleat. Preview and commit therefore cannot disagree about a district, a civic " +
      "building, or the influence paid.",
    engine_symbols: ["successionActionOffers", "successionReducer"],
    next: "The panel itself is web-lane DOM (U5).",
  },
  {
    id: "M14",
    mechanic: "Its duration",
    answer: "no_analogue",
    instance:
      "No analogue, because era four's counter-mechanic has no duration. A fire burns out " +
      "and a shield is spent; a claim plate does not expire, a swayed district never " +
      "drifts back, and nothing the player buys is denominated in cycles remaining. The " +
      "one thing in the crisis that is timed in cycles is the drift block, which stands " +
      "for exactly one — and that is the hazard's clock rather than the counter-mechanic's, " +
      "so it is answered under the propagation row. Era one's own instance of this row is " +
      "a gap (`burn_rounds_by_tier` runs 2/2/3 and nothing draws it); era four's is an " +
      "absence, which is a different thing and is why this row says so.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M15",
    mechanic: "Protection, and how much is left",
    answer: "no_analogue",
    instance:
      "No analogue, because there is no harm for a shield to stand in front of. §8: 'Era " +
      "four's consequence is capacity, not ruin. Nothing in this crisis destroys " +
      "anything.' Era four's counter-play is PRE-EMPTION rather than absorption — swaying " +
      "a district takes it out of the population drift can reach, instead of hardening it " +
      "where it stands — and 'how much is left' has no referent either, because a decided " +
      "district is decided outright with no partial state between neutral and held. The " +
      "bank is not a shield: it is a store of capability that stands between nothing and " +
      "nothing until it is spent.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M16",
    mechanic: "The threatened-but-unprotected building",
    answer: "built",
    instance:
      "The one value returned by `successionThreat`: an undecided district whose empty " +
      "statue base carries the rival-marked decree block. The adjacent DOM sentence names " +
      "the same district and civic building and says that after the next three-question " +
      "batch the rival claims it and closes that building. No other district is presented " +
      "as threatened, and no elapsed time can land the warning. This is a district-level " +
      "political decision only; skill buildings remain outside the state shape, so the " +
      "threat cannot relock or erase learning.",
    engine_symbols: ["successionThreat", "successionReducer"],
    next: "The block at the plinth's foot with its cut faction mark is web-lane geometry (B7).",
  },
  {
    id: "M17",
    mechanic: "Accumulating damage short of destruction, and the threshold",
    answer: "no_analogue",
    instance:
      "No analogue, because era four's consequence is binary capacity rather than a " +
      "damage scale. A district's civic building is working or it is suspended; there is " +
      "no ladder, no points and no threshold, and `succession-tuning.ts` therefore holds " +
      "no `ruin_at`, no `bite` and no `stages`. The contrast with era one is worth stating " +
      "rather than leaving as a difference: era one MOVED FROM one bit to damage points " +
      "because a one-bit model could not express a near miss. Era four keeps one bit " +
      "because there is nothing here to be a near miss OF — a district that drifted has " +
      "decided, and the question the player faces afterwards is whether to settle the " +
      "claim, not how badly it went.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M18",
    mechanic: "The ruin",
    answer: "no_analogue",
    instance:
      "No analogue, because nothing is ruined. §8.3: 'No building is removed, no node is " +
      "relocked, no mastery is touched, and no skill building is ever claimed.' This is " +
      "structural rather than promised — `successionDamage` returns an empty `buildings` " +
      "list on every state the reducer can reach, and the suite sweeps every ending on " +
      "every board to assert it rather than trusting the sentence.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M19",
    mechanic: "Ground lost for good",
    answer: "no_analogue",
    instance:
      "No analogue, because no ground changes hands. Era four's districts are political " +
      "and not territorial: a district has no extent, so there is nothing to lose the use " +
      "of. `successionDamage` returns an empty `cells` list on every reachable state, " +
      "swept the same way the ruin row is.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M20",
    mechanic: "Repair and rebuild, as an action and as a visible result",
    answer: "built",
    instance:
      "Era four's repair is the Reopen action, one of exactly two verbs. It costs one " +
      "influence and targets the newest rival-held civic building that is still closed. " +
      "The proposal leaves the current closure solid and adds a removal cleat; commitment " +
      "removes the shutters immediately while leaving the rival statue and district " +
      "control unchanged. The capacity returns because `successionDamage` reports only " +
      "buildings whose `civic_state` remains closed. Nothing is rebuilt because no fabric " +
      "was damaged in the first place.",
    engine_symbols: ["successionActionOffers", "successionReducer", "successionDamage"],
    next:
      "What an AFTER-the-crisis lift costs was ruled on 2026-08-04: the product lead " +
      "settled that it is paid off, 'just to keep the model consistent'. The price is " +
      "DERIVED rather than authored per crisis — a quarter of the current era's cost for " +
      "that building's role, which is the teardown rate O-4 already sets for an " +
      "intervention on a building the player owns, so it scales through the catalogue and " +
      "sits below a winter rebuild. The city withholds a shuttered building's two " +
      "capacities, captions it SUSPENDED and offers the lift; `clearSuspendedCivic` is " +
      "still the path and it now has a caller. Nothing here is owed a ruling.",
  },
  {
    id: "M21",
    mechanic: "Giving ground up, and buying it back",
    answer: "no_analogue",
    instance:
      "No analogue, because nothing in era four is surrendered to buy safety elsewhere. " +
      "Era one's pull-back trades land for resilience across the whole board and charges " +
      "material to reclaim it; every Succession action costs counters and counters buy " +
      "nothing back. `cancel` is the nearest verb by name and it is not this mechanic: it " +
      "gives up the RIVAL's claim rather than any of the player's, and what it returns is " +
      "capacity rather than land.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M22",
    mechanic: "The accuracy ladder, read off the board rather than off a card",
    answer: "built",
    instance:
      "The counting board is the ladder. A batch seats one, two or three counters into the " +
      "ruled slab, and the counters are the same objects a card's cost zone draws as pips, " +
      "so the player compares what they earned against what an action costs by looking at " +
      "the same material. The zero-correct state leaves all seats empty. Era four's version " +
      "is cumulative where era one's is per-round: influence persists between batches, and " +
      "the visible bank carries the history of what the learner earned and did not yet " +
      "spend. The board consequence is identical at all four accuracy rungs; only the " +
      "number of tesserae differs.",
    engine_symbols: ["successionCountersFor", "successionActionOffers"],
    next: "The slab, the counters and the cost-zone pips are web-lane DOM and SVG (U1, U2).",
  },
  {
    id: "M23",
    mechanic: "Ambient motion",
    answer: "deferred",
    instance:
      "Almost none, and that IS the read: §2.6 calls era four's crisis the stillest of the " +
      "nine. The basin's water moves and the block in the crane's sling turns slightly, " +
      "and nothing else in the city does. The clause that reaches this engine is the last " +
      "one: NOTHING THAT MOVES MAY ADVANCE THE ENCOUNTER, and it matters more here than " +
      "anywhere else because era four has a cycle and a cycle that appeared to turn on its " +
      "own would read as a timer. That half is built and enforced — the reducer advances " +
      "on an answered batch and on nothing else, and a repository sweep fails on a clock " +
      "read in any source that can decide an allegiance.",
    engine_symbols: ["successionReducer"],
    next:
      "ANSWERED IN THE WEB LANE. `SuccessionAmbient` in " +
      "`apps/web/src/city/three/SuccessionIsland.tsx` is the rig, and it can move exactly two " +
      "things: the basin's surface and whatever is hanging in a sling. The block that hangs " +
      "is the PORT CRANE'S rather than a plinth's, which is the brief's own reading — a block " +
      "waiting at a plinth sits on the ground with the sling slack above it, so there is " +
      "nothing in a sling there to turn. Under reduced motion the rig is not mounted at all, " +
      "so both objects hold the still frame they were built in. It is handed a scene graph " +
      "and a frame interval and has no reducer in scope, so nothing that moves can advance " +
      "the encounter.",
  },
  {
    id: "M24",
    mechanic: "The conclusion, as a screen with a derived verdict",
    answer: "built",
    instance:
      "`successionOutcome` derives three presentation bands from the board rather than from " +
      "an accuracy field. A player-controlled district contributes two points and every " +
      "open civic building one. Twelve is the best ending: three chevron statues, three " +
      "ring statues and all six buildings open. Six or more is partial; less is fractured. " +
      "The sheet reports both statue counts, open capacity and influence accounts, and says " +
      "that answers wrote no mastery or unlock progress. Accuracy affects which endings are " +
      "reachable only through influence.",
    engine_symbols: ["successionOutcome", "successionHoldings"],
    next: "The sheet itself is web-lane DOM (U5, U6), following D-CRISIS-30.",
  },
];
