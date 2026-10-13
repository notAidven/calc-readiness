/**
 * **WHAT EACH CITY LIFE FIGURE MEANS, AND THE ONE THING THAT MOVES IT.**
 *
 * The team lead, off a running build: *"also on the happiness/livability/population,
 * include a short tooltip that users can hover over that explains how the mechanics work
 * and how you can get more of them (e.g completing skill buildings increases your
 * population)"*.
 *
 * His example is the SHAPE and not the content. Every claim below was read out of the
 * derivation rather than guessed at, because a tooltip that is almost true is worse than
 * none: a learner acts on it, watches nothing happen, and concludes the game is broken
 * rather than that the text was wrong. `cityLifeExplainers.test.ts` holds each named lever
 * to being a real input, so an economy retune that stops one being true fails there rather
 * than shipping a panel that describes a mechanic it no longer has.
 *
 * ## WHERE EACH FIGURE COMES FROM, and which lever each line names
 *
 * All three are `deriveCityVitality` in `engines/game/src/city-vitality.ts`.
 *
 * **POPULATION** is `citizenPopulation(ledger)`: the founding crowd, plus the era-scaled
 * `CITIZENS_PER_COMPLETE_BUILDING` for every placed skill building whose practice has been
 * scored, plus the era-scaled `CITIZENS_PER_MASTERED_SKILL` again for every one of those that
 * is mastered. The mastered term is exactly twice the practised one, which is what *"twice as
 * many again"* is, and the multiplier is the material economy's `2^(N-1)` ladder. **Nothing
 * bought is an input at all**: `contributionsOf` hands the civic rows to the two CAPACITIES
 * and never to the headcount, and D-CIT2 has no capacity feedback, so *"build a hundred
 * Longhouses and not one person arrives"*. That half of the sentence is there because it is
 * the mistake the panel invites: three figures in one box, one of them a thing you buy
 * buildings for.
 *
 * **AND SINCE 2026-08-04 A BUILDING THE DIAGNOSTIC HANDED OVER BRINGS ITS PEOPLE TOO**, at
 * the mastered figure, from the moment it is placed (`citizens-population.ts`,
 * `CitizenBuildingLedger.inherited`). The clause naming it is not decoration: for the one
 * learner in the product who arrives at a city of a hundred and sixty four people having
 * answered nothing, a line saying only that practice brings people would be describing a
 * mechanic that did not produce the number they are looking at. The two clauses are also
 * the two an arriving learner needs in that order, since the crowd is the thing they did
 * not expect and the practice is the thing they still owe.
 *
 * **LIVABILITY** is the hub's founding provision plus `residenceCapacity(ledger)` plus every
 * civic row's `livability`. Two of those three can move, and **the lever named is the bought
 * one**, which is a measurement rather than a preference:
 *
 *   - Mastering a skill raises the homes term AND the headcount that term is read against.
 *     Over the whole of era one that is +44 homes against +36 people, so mastering all six
 *     skills nets **eight** places of room; two of the six (the Workshop and the Commons)
 *     house nobody and so LOWER the room they leave. In eras two to ten no skill node has a
 *     residence figure at all (`CITIZEN_NODE_CAPACITY` is keyed on era one's six), so every
 *     mastery there is six more mouths and no more room.
 *   - A bought row is room and nothing else. Era one's dearest is 20, which is exactly the
 *     most room a single skill can net, and every later era doubles it while mastery stays
 *     at zero.
 *
 * So *"buying a civic building raises it"* is the honest answer to "how do I get more", and
 * the test pins the comparison per era rather than taking this paragraph's word for it. The
 * line points at the Build menu instead of naming a building because the menu already
 * carries the figure per row (*"Sustains N more"*, `CivicBuildCard`) and the four rows are
 * re-authored every era.
 *
 * **HAPPINESS** is a COUNT OF PEOPLE the city can keep happy, not a mood: coverage is
 * `min(capacity, population)` and the percentage is derived from it. Its inputs are every
 * civic row's `happiness`, a small per-role figure for each complete skill building
 * (`SKILL_HAPPINESS_BY_ROLE`, 1 or 2), and `ROAD_HAPPINESS_PER_TILE` per laid tile. The
 * largest Happiness-providing civic row wins by an order of magnitude in every era (20 in
 * era one against 2 and 1, and it doubles each era while the other two do not move), so
 * Happiness-providing civic buildings are named, with roads second because they are the
 * cheap continuous lever a learner already has.
 *
 * ## ⚑ THE HAPPINESS LINE OWES NO CLAUSE ABOUT PEOPLE LEAVING, AND NEVER WILL
 *
 * This section used to hold the opposite instruction, and it is worth reading what it said
 * before it is taken as settled: *"`#500` adds the mechanic where a city below
 * `HAPPINESS_BAND_FLOOR.settling` loses people … When it merges, the happiness line owes a
 * clause saying that people leave below that line, because that is then the honest
 * consequence."* #500 did merge, and the clause was never written — the lead withdrew the
 * consequence (*"maybe just remove the actual consequences just tell them their people are
 * unhappy?"*) and on 2026-08-05 it was settled that **citizens do not leave**.
 *
 * So the reasoning stands and its premise is void. The line says what happiness counts and
 * what raises it, and the honest consequence of a low one is that the city is short of an
 * activity source, which is what the row's own alarmed sentence already says. Anybody adding
 * a departure clause here would be putting a consequence in a hover that the engine does
 * not have; `test/departuresAreWired.test.ts` sweeps these strings for it.
 *
 * ## THE CRAFT RULES THESE STRINGS ARE BOUND BY
 *
 * Two sentences at most, so this stays a hover rather than documentation. No em-dash and no
 * sentence that opens with a negation (`test/cityCopyRegister.test.ts`, which sweeps every
 * learner-readable source in the app). D-CIT13's *"the wording never shames"* and INV-COS-1's
 * *"a shortfall gates nothing"* apply here as they do to the rest of the panel, so nothing
 * below is phrased as a warning, a lock or a requirement.
 */

/** The three figures the CITY LIFE panel carries, keyed as the panel's rows are. */
export type CityLifeStat = "population" | "livability" | "happiness";

export interface CityLifeExplainer {
  /** The row this explains. */
  readonly stat: CityLifeStat;
  /** The row's own visible label, so the trigger can name what it is about. */
  readonly label: string;
  /**
   * What the number means, then how to raise it. At most two sentences, and every claim
   * in them is asserted against the derivation in `cityLifeExplainers.test.ts`.
   */
  readonly text: string;
}

export const CITY_LIFE_EXPLAINERS: Readonly<Record<CityLifeStat, CityLifeExplainer>> = {
  population: {
    stat: "population",
    label: "Population",
    text: "Population counts everyone your skill buildings have brought to the island, including the ones you tested out of. Practising a skill brings people and mastering it brings twice as many again; later eras bring larger crowds, while buying a building brings nobody.",
  },
  livability: {
    stat: "livability",
    label: "Livability",
    text: "Livability is how many people the city can sustain, and the crowd arrives whether or not there is room. Buying a civic building raises it, and the Build menu says how many more each one sustains.",
  },
  happiness: {
    stat: "happiness",
    label: "Happiness",
    text: "Happiness counts how many people your city can keep happy. Build civic buildings that provide Happiness, and lay roads; both increase it.",
  },
};

/**
 * Every stat the panel explains, in the order the rows are drawn.
 *
 * Exported so the panel and the test walk the SAME list: a fourth row added with no
 * explainer, or an explainer for a row nobody draws, fails the census rather than shipping
 * a figure with nothing behind it.
 */
export const CITY_LIFE_STATS: readonly CityLifeStat[] = [
  "population",
  "livability",
  "happiness",
];
