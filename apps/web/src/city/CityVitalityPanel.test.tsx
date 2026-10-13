import { type CityVitality, HAPPINESS_BAND_FLOOR, type HappinessBand } from "@cr/game";
import type { StudentNodeState } from "@cr/state-schema";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import {
  CityVitalityPanel,
  HAPPINESS_BANDS_BY_FLOOR,
  happinessReadout,
  RESTLESS_LABEL,
  UNHAPPY_WARNING,
} from "./CityVitalityPanel";
import { MOCK_NODE_STATES } from "./mockCity";
import { TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

/**
 * The city-life readout, asserted THROUGH the real `CitySurface` rather than by
 * mounting the panel with a hand-made prop.
 *
 * That choice is the point of the file. Rendering `CityVitalityPanel` with a literal
 * `CityVitality` would prove the component can display three numbers and nothing at
 * all about whether the app derives them, mounts it, or shows it to anybody — which
 * is exactly the gap between "I added a component" and "it renders". Every assertion
 * below therefore starts from a `CityLoad` and reads the DOM the learner gets.
 *
 * The a11y assertions are not decoration either: the 3D canvas is `aria-hidden`, so
 * a figure that exists only on it does not exist. Era one's civic-buildings.md
 * section 6 states the rule for these exact numbers — *"every capacity, shortfall and
 * count lives in the DOM"*.
 *
 * ── WHAT HAPPENED TO THE THREE-LAYOUT SWEEPS ─────────────────────────────────
 *
 * Until `224d6b8` this file swept every a11y assertion across `VITALITY_VARIANTS`,
 * because three candidate layouts were being compared and the defect worth catching was
 * "the compact one announces less than the full one". Evan picked the ledger, the other
 * two are gone, and a sweep over a one-element list is theatre.
 *
 * So each sweep was resolved rather than deleted, and this is the audit — because a
 * quiet drop in coverage during a cleanup is exactly how accessibility work gets undone
 * later:
 *
 *   - `is a labelled region`, `puts a value on every meter`, `keeps the canvas out of
 *     it`, and `states the happiness coverage as a count of people` all still have a
 *     subject: the one panel. They are RE-POINTED at it, assertion for assertion, with
 *     nothing removed — including the `bars.length >= 2` floor and the `aria-valuetext`
 *     requirement, which is the assertion that made a bar-less layout legitimate in the
 *     first place and is the one most worth keeping.
 *   - `sweeps all three layouts, and the list has not collapsed to one` is REMOVED. It
 *     existed only as a floor under the `for` loops, so that a truncated variant list
 *     could not make them vacuous. With no loops there is nothing vacuous to guard, and
 *     the floor that still matters — that the panel has not silently lost a meter —
 *     lives on as `bars.length >= 2` inside the re-pointed meter test.
 *   - `announces exactly the same state whichever layout is drawn` is SPLIT. Its
 *     cross-layout equality has no subject now, but it was carrying a second invariant
 *     that does: `accessibleReadout()` is the single source, so the spoken text and the
 *     meters cannot become two accounts of one city. That half is re-pointed as
 *     `the live region and the meters agree on the figures`, and its completeness
 *     assertions are kept verbatim.
 *   - `renders three genuinely different layouts, not one thrice` is REMOVED outright.
 *     It protected only against the three candidates being one design in a trench coat.
 *     There is one design, so there is nothing left for it to be about.
 */

const ALL_NODES = MOCK_NODE_STATES.map((state) => state.node_id);
const ALL_WITH_HALL = defaultPlacements([TOWN_HALL_ID, ...ALL_NODES], [], BUILDABLE_RADIUS);
const TOWN_HALL_PLACEMENT: PlacedTransform | null =
  ALL_WITH_HALL.find((p) => p.nodeId === TOWN_HALL_ID) ?? null;
const ALL_PLACED = ALL_WITH_HALL.filter((p) => p.nodeId !== TOWN_HALL_ID);

/** Nothing built: the founding crowd against the starting city's own provision. */
function bareLoad(): CityLoad {
  return {
    node_states: MOCK_NODE_STATES,
    neighborhood_state: null,
    placements: [],
    town_hall: TOWN_HALL_PLACEMENT,
  };
}

/** Everything placed and mastered: the most populous city era one can reach. */
function masteredLoad(): CityLoad {
  return {
    node_states: MOCK_NODE_STATES.map((state) => ({
      ...state,
      mastery: 2,
      lesson_stage: "done",
      completion_status: "complete",
    })) as StudentNodeState[],
    neighborhood_state: null,
    placements: ALL_PLACED,
    town_hall: TOWN_HALL_PLACEMENT,
  };
}

/**
 * Mastered city plus a path network. Cells sit outside the usual build cluster so
 * this fixture only exercises the happiness count (vitality reads `roads.length`).
 */
function masteredLoadWithRoads(tileCount: number): CityLoad {
  const roads = Array.from({ length: tileCount }, (_, index) => ({
    col: 12 + (index % 6),
    row: 12 + Math.floor(index / 6),
  }));
  return { ...masteredLoad(), roads };
}

async function panel(load: CityLoad): Promise<HTMLElement> {
  render(<CitySurface enableCanvas={false} loadCity={() => Promise.resolve(load)} />);
  return screen.findByTestId("city-vitality");
}

/** Tear the previous mount's panel out so `findByTestId` cannot match two. */
function dropPanel() {
  for (const node of screen.queryAllByTestId("city-vitality")) {
    node.remove();
  }
}

describe("the city-life readout renders in the app", () => {
  it("shows population, livability and happiness on the bare starting city", async () => {
    const region = await panel(bareLoad());
    // Every figure carries a WORD, never a bare number and never a colour.
    expect(within(region).getByTestId("vitality-population")).toHaveTextContent(
      /Population\s*12 people/,
    );
    expect(within(region).getByTestId("vitality-livability")).toHaveTextContent(
      /Livability/,
    );
    expect(within(region).getByTestId("vitality-happiness")).toHaveTextContent(/Happiness/);
  });

  it("keeps all three explainers keyboard-reachable through the compact instrument", async () => {
    const user = userEvent.setup();
    const region = await panel(bareLoad());
    const triggers = within(region).getAllByRole("button", { name: /^About / });
    expect(triggers).toHaveLength(3);

    const population = within(region).getByRole("button", { name: "About Population" });
    await user.click(population);
    const explainer = within(region).getByRole("tooltip", { name: /Population counts/i });
    expect(explainer).toHaveAttribute("data-open", "true");
    expect(explainer).toHaveTextContent(/Practising a skill brings people/i);

    await user.keyboard("{Escape}");
    expect(explainer).toHaveAttribute("data-open", "false");
    expect(population).toHaveFocus();
  });

  /**
   * RE-POINTED, NOT WEAKENED, and the direction is reversed on purpose.
   *
   * This asserted `/Housing \d+ · Food \d+/` — the #218 reading in the DOM, where naming
   * both inputs was what stopped either reading as a capacity of its own. #236 ruled
   * livability to be one pool with housing and food NOT tracked separately, so the old
   * assertion now demands the panel print two figures the model does not have.
   *
   * The claim it was protecting still exists and still needs a guard: **the panel must not
   * present livability as more than one quantity.** So the same surface is asserted in the
   * opposite direction, and the assertion is on the whole region rather than the terms line
   * alone — a panel that moved the two inputs to a different element would otherwise pass.
   * A count floor sits under it, because "does not contain these words" is satisfied by an
   * empty panel.
   */
  it("presents livability as ONE pool, naming no housing or food term", async () => {
    const region = await panel(bareLoad());
    const text = region.textContent ?? "";
    // The floor: this panel really did render, with its three rows and their figures.
    expect(text.length).toBeGreaterThan(40);
    expect(within(region).getByTestId("vitality-livability")).toHaveTextContent(
      /Livability\s*\d+ sustained/,
    );
    // The deletion, on the whole region so it cannot be relocated past the assertion.
    expect(text).not.toMatch(/Housing/i);
    expect(text).not.toMatch(/\bFood\b/i);
    // And the sustaining figure is still a single number with a word beside it, so the
    // one-pool reading is asserted positively as well as by absence.
    expect(within(region).getByTestId("vitality-livability-terms").textContent).toMatch(
      /room for \d+ more|\d+ short/,
    );
  });

  it("moves every dial when the city is fully built and mastered", async () => {
    const bare = await panel(bareLoad());
    const bareText = bare.textContent ?? "";
    dropPanel();

    const built = await panel(masteredLoad());
    const builtText = built.textContent ?? "";
    // The whole readout is derived, so a city that grew must read differently. A
    // panel that rendered constants would pass every assertion above and fail here.
    expect(builtText).not.toBe(bareText);
    // ⚑ THE FIGURE IS THE HEADCOUNT LEARNING BROUGHT. This read `Population38 people` with
    // a terms line saying `6 people have left`, because era one's skill buildings reach 9 of
    // 44 and that was deep enough under the departure line to take six. Departures were
    // removed as a mechanic on 2026-08-05, so the row reads 44 and there is no terms line at
    // all — asserted by absence as well as by the figure, because the row losing its alarmed
    // line is half of what the ruling does on this panel.
    expect(within(built).getByTestId("vitality-population")).toHaveTextContent(
      /Population48 people/,
    );
    expect(
      within(built).queryByTestId("vitality-population-terms"),
      "the population row still has a terms line, which is where the loss was stated",
    ).toBeNull();
    expect(
      within(built).getByTestId("vitality-population").getAttribute("data-alarm"),
      "the population row is alarmed, so something is being taken from it",
    ).toBe("false");
  });
});

/**
 * WHAT REPLACED THE SHORTFALL CALLOUT, and why this is not a weakened assertion.
 *
 * The panel used to carry a tinted `vitality-shortfalls` list reading *"18 of them are
 * out of reach of an amenity"* directly beneath a line reading *"Amenities reach 4 of
 * 22"* — the same fact twice, with the panel's most emphatic element spent on the
 * repeat. The list is gone and the happiness ROW now states the coverage once.
 *
 * The old test asserted the callout's wording, so it could not survive that. The CLAIM
 * it was written to protect can and must: a shortfall is stated in WORDS AND FIGURES,
 * never left to a short bar. That claim is what is asserted here instead, on the
 * surviving surface.
 */
describe("laid roads raise happiness coverage in the HUD", () => {
  /**
   * 20 tiles is the measured settling threshold at full mastery after the founding-
   * population rebalance (skills 9 + roads 20 = coverage 29 of 48 -> 60.4%, Settling;
   * `HAPPINESS_BAND_FLOOR.settling` is 60). Floored so a zero-tile "paved" load cannot
   * make the assertion hold by accident.
   */
  const SETTLING_ROAD_TILES = 20;

  it("names path coverage and moves the band once a settling network is laid", async () => {
    expect(SETTLING_ROAD_TILES).toBeGreaterThanOrEqual(20);

    dropPanel();
    const bare = await panel(masteredLoad());
    expect(within(bare).getByTestId("vitality-happiness").textContent).toMatch(
      /9\s*of\s*48/,
    );
    // Deep under the line, so the row carries the lead's warning rather than the mild
    // band label. The label is what a city that is unhappy and losing NOBODY still reads,
    // and the bare starting city is that city: asserted below.
    expect(within(bare).getByTestId("vitality-happiness-terms").textContent).toContain(
      UNHAPPY_WARNING,
    );
    expect(within(bare).getByTestId("vitality-happiness-terms").textContent).not.toMatch(
      /Roads add/,
    );
    dropPanel();

    const paved = await panel(masteredLoadWithRoads(SETTLING_ROAD_TILES));
    const happiness = within(paved).getByTestId("vitality-happiness");
    // 9 skill + 20 paths = 29 of 48.
    expect(happiness.textContent).toMatch(/29\s*of\s*48/);
    const terms = within(paved).getByTestId("vitality-happiness-terms").textContent;
    expect(terms).toMatch(/Settling in/);
    expect(terms).toMatch(/Roads add 20 Happiness/);

    // THE WRAP DEFECT. Putting "29 of 48" inside `.hud-vitality-figure` (1.2rem display
    // type) made the phrase break mid-number once roads pushed coverage to two digits —
    // measured on `?mock&paths`: figure height 40px, "29 of" over "48", "reached" floating
    // beside. The count alone is the figure; "of N" is the unit, matching Population /
    // Livability and leaving no space inside the display glyph for a line break.
    const figure = happiness.querySelector(".hud-vitality-figure");
    const unit = happiness.querySelector(".hud-vitality-unit");
    expect(figure?.textContent, "the display figure is the covered count alone").toBe("29");
    expect(
      unit?.textContent,
      "the population rides on the unit, not inside the figure",
    ).toBe("of 48");
  });
});

describe("a shortfall is stated, not left to the shape of a bar", () => {
  it("renders the exact Happiness warning beside its warning triangle", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const warning = within(region).getByTestId("vitality-happiness-terms");

    expect(
      warning.querySelector(".hud-icon"),
      "the warning triangle is missing",
    ).not.toBeNull();
    expect((warning.textContent ?? "").replace(/\s+/g, " ").trim()).toBe(
      "Your people are unhappy and need things to do!",
    );
  });

  it("states the happiness coverage as a count of people", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const happiness = within(region).getByTestId("vitality-happiness");
    // 48 people against era one's skill-building amenities alone: the city has grown
    // past what it built for it, and the readout SAYS so.
    expect(happiness.textContent).toMatch(/9\s*of\s*48/);
    // The qualitative state is WORDS, so it never rests on a bar length — nor, now, on
    // the shape of a mouth or on a tint.
    expect(region.textContent).toContain(UNHAPPY_WARNING);
  });

  /**
   * BOTH DIRECTIONS, so neither assertion can hold vacuously — and the pair had to be
   * re-homed, because #236 took one of them away from every city this app can reach.
   *
   * WHAT THIS TEST USED TO DO. It read the two wordings off two real loads: the bare
   * city has HEADROOM and must not be described as short, the mastered city IS short and
   * must not be described as having room. Both halves came from a real `CityLoad`, which
   * is this file's whole method.
   *
   * WHY THE SECOND HALF NO LONGER HAS A CITY. Under the limiting-factor reading the
   * mastered city sustained `min(residence, hub)` against its population and was short.
   * Pooled, `residenceCapacity` at full mastery equals the population exactly
   * (`ENDGAME_SPARE_HOMES = 0`), so pooling it with the hub's `HUB_FOUNDING_LIVABILITY`
   * leaves the city its founders' provision as permanent headroom on top of that, whatever
   * else is or is not built. **No era-one city can be short of livability any more**, and
   * the reason is structural rather than a fixture that happened to drift.
   *
   * SO THE PAIR IS SPLIT ACROSS THE TWO DIALS RATHER THAN WEAKENED. Livability supplies
   * the "room" direction on both reachable cities; HAPPINESS supplies the "short"
   * direction, which is the dial that genuinely goes short now (9 of 48). And the
   * livability-shortfall WORDING — which is live code, unreachable in era one but not in
   * era two's catalogue — keeps a test of its own below, mounted on a constructed
   * capacity so that the branch cannot rot unnoticed while no city exercises it.
   */
  it("says both reachable cities have room, and never describes them as short", async () => {
    dropPanel();
    const bare = await panel(bareLoad());
    const bareTerms = within(bare).getByTestId("vitality-livability-terms");
    expect(bareTerms.textContent, "the starting city is solvent (INV-ERA-4)").toMatch(
      /room for \d+ more/,
    );
    expect(bareTerms.textContent).not.toMatch(/short/);
    expect(
      bare.querySelector(".hud-vitality-scale")?.getAttribute("data-state"),
      "the capacity scale agrees with the words",
    ).toBe("room");

    dropPanel();
    const built = await panel(masteredLoad());
    const builtTerms = within(built).getByTestId("vitality-livability-terms");
    // The figure is not a constant: this city's headroom differs from the bare city's,
    // so "room for N more" is being derived and not printed.
    expect(builtTerms.textContent).toMatch(/room for \d+ more/);
    expect(builtTerms.textContent).not.toBe(bareTerms.textContent);
    expect(builtTerms.textContent).not.toMatch(/short/);
    expect(built.querySelector(".hud-vitality-scale")?.getAttribute("data-state")).toBe(
      "room",
    );
  });

  it("states the happiness shortfall in words AND figures on both cities", async () => {
    // The direction livability lost. Both reachable cities are short of amenity
    // coverage, and neither may be described as settled — which is the claim the
    // original pair existed to protect, on the dial that still varies.
    for (const load of [bareLoad, masteredLoad]) {
      dropPanel();
      const region = await panel(load());
      const happiness = within(region).getByTestId("vitality-happiness");
      // A figure, as a count of people, not a bar length.
      expect(happiness.textContent).toMatch(/\d+\s*of\s*\d+/);
      // And words for the state, whichever of the two unhappy wordings this city is in:
      // the mild band label while the hub still provides for the whole crowd, the lead's
      // alarmed line once the player owes provision.
      expect(region.textContent).toMatch(
        new RegExp(
          [RESTLESS_LABEL, UNHAPPY_WARNING]
            .map((line) => line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("|"),
        ),
      );
      expect(region.textContent).not.toMatch(/settled/i);
    }
  });
});

/**
 * THE LIVABILITY-SHORTFALL WORDING, which era one can no longer produce.
 *
 * Mounted on a constructed {@link CityVitality} rather than a `CityLoad`, and that is a
 * deliberate exception to this file's method rather than a lapse from it. The method
 * exists so that "I added a component" cannot pass for "the app derives this and shows
 * it"; every assertion above still starts from a real load and still proves exactly
 * that. What this block covers is a BRANCH the derivation cannot currently reach, so
 * there is no load that would exercise it and the alternative to a constructed prop is
 * no coverage at all — which is how a shortfall wording would be free to break silently
 * until era two's catalogue made it reachable again.
 *
 * `shortfalls.livability` is `@cr/economy`'s `unsustained` and is positive whenever a
 * population exceeds its pool, so this is a reachable state of the MODEL and only an
 * unreachable state of era one.
 */
describe("the shortfall wording still works when a city is over its pool", () => {
  const OVER_CAPACITY: CityVitality = {
    population: 44,
    livability: { sustains: 30 },
    happiness: {
      coverage: 9,
      covered: 9,
      uncovered: 35,
      level: 20,
      band: "restless",
      fromPaths: 0,
    },
    shortfalls: { livability: 14, happiness: 21, practice: 0, none: false },
    // The engine's own answer for this city, transcribed rather than invented: 44 people
    // against a pool of 30 is a sustenance pressure of 14/44, which is deeper than the
    // amenity pressure at level 20, so `sustenance` is the shortfall the row names.
    provision: { pressure: 14 / 44, cause: "sustenance", unmet: true },
  };

  it("says how many short, and the scale agrees with the words", () => {
    render(<CityVitalityPanel vitality={OVER_CAPACITY} />);
    const region = screen.getByTestId("city-vitality");
    const terms = within(region).getByTestId("vitality-livability-terms");
    expect(terms.textContent, "the gap is stated as a figure").toMatch(/14 short/);
    expect(terms.textContent).not.toMatch(/room for/);
    expect(region.querySelector(".hud-vitality-scale")?.getAttribute("data-state")).toBe(
      "short",
    );
    // Still no resurrected input terms: one pool, even in the shortfall state.
    expect(region.textContent).not.toMatch(/Housing/i);
    expect(region.textContent).not.toMatch(/\bFood\b/i);
  });
});

/**
 * THE DESIGN FIX ITSELF, pinned so it cannot silently regress.
 *
 * Livability is a CAPACITY and happiness is a COVERAGE FRACTION. Shipped as two
 * identical `.hud-meter` fills, a full capacity bar beside a near-empty fraction bar
 * read as one measure at two scores — which misinforms rather than merely looking
 * plain. The fix is that the two carry structurally DIFFERENT instruments, and that is
 * a fact about the DOM, so it is assertable: give them the same instrument again and
 * this fails.
 */
describe("the two measures do not share an instrument", () => {
  it("gives livability a capacity scale and happiness counted units", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const livability = within(region).getByTestId("vitality-livability");
    const happiness = within(region).getByTestId("vitality-happiness");

    // A capacity reads against a threshold: a provision field plus a crowd notch.
    expect(livability.querySelector(".hud-vitality-scale-fill")).not.toBeNull();
    expect(livability.querySelector(".hud-vitality-scale-notch")).not.toBeNull();
    // A fraction over people reads as counted units, never as the same field.
    expect(happiness.querySelector(".hud-vitality-cells")).not.toBeNull();
    expect(livability.querySelector(".hud-vitality-cells")).toBeNull();
    expect(happiness.querySelector(".hud-vitality-scale")).toBeNull();
  });

  it("draws one unit per person while the crowd is countable", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const cells = within(region)
      .getByTestId("vitality-happiness")
      .querySelectorAll(".hud-vitality-cell");
    // 48 people, 9 of them reached: the instrument is the count, so it must BE the count.
    expect(cells.length).toBe(48);
    expect([...cells].filter((c) => c.getAttribute("data-reached") === "true").length).toBe(
      9,
    );
  });
});

/* ========================================================================== */
/* The happiness face                                                          */
/* ========================================================================== */

/**
 * THE SPECIFICATION, written here rather than read from the implementation.
 *
 * A test that looked the expression up in `BAND_READOUT` and compared it to the
 * expression the same row rendered would assert nothing at all — it would be one table
 * agreeing with itself. So the expected face per LABEL is written down here, on the
 * reasoning a reader can check: "Content" is the settled ending, so it smiles; the
 * `restless` label names a state the people are in, so it does not; "Settling in" is
 * neither. The low band's wording is read from {@link RESTLESS_LABEL} rather than copied,
 * because the product lead rewrote it on 2026-08-04 and a copy here would have gone on
 * asserting the sentence he replaced.
 *
 * Keyed by the LABEL, deliberately, because the label is what a learner reads beside the
 * face and "the face and the words disagree" is the defect. The census below keeps this
 * map and the model's band set in step in both directions.
 */
type Expression = "happy" | "neutral" | "unhappy";

const EXPRESSION_FOR_LABEL: Readonly<Record<string, Expression>> = {
  Content: "happy",
  "Settling in": "neutral",
  [RESTLESS_LABEL]: "unhappy",
};

/** Which way each named expression is obliged to curve. */
const DIRECTION_FOR_EXPRESSION: Readonly<Record<Expression, number>> = {
  happy: 1,
  neutral: 0,
  unhappy: -1,
};

/**
 * The expression the spec demands for a label the panel actually rendered. THROWS on an
 * unknown label rather than returning a default, so a renamed band surfaces here instead
 * of quietly comparing `undefined` to `undefined` and passing.
 */
function specExpressionFor(label: string | null): Expression {
  // A city the player owes provision for prints the lead's alarmed line in place of the
  // mild band label, and that sentence is the `restless` band said louder rather than a
  // fourth state. Mapped here so the face check still has a spec to compare against, and
  // mapped to the SAME expression the label it replaces has, which is the property that
  // matters: the face and the words must not disagree.
  if (label?.includes(UNHAPPY_WARNING)) {
    return EXPRESSION_FOR_LABEL[RESTLESS_LABEL] as Expression;
  }
  // The terms line may append " · Roads add N Happiness" when roads contribute; the band
  // word is always the first clause.
  const bandLabel = label?.split(" · ")[0] ?? null;
  const expression = bandLabel === null ? undefined : EXPRESSION_FOR_LABEL[bandLabel];
  if (!expression) {
    throw new Error(`the panel showed a label the spec does not cover: ${label}`);
  }
  return expression;
}

/**
 * Which way a mouth curves, read out of the path itself rather than trusted from its
 * name: `1` smiles, `0` is level, `-1` frowns.
 *
 * SVG's y axis grows DOWNWARD, so a quadratic whose control point has a LARGER y than
 * its lip line bows toward the chin and reads as a smile. This is the whole reason the
 * check is worth having: it compares the drawing to the claim, so a mouth pasted into
 * the wrong band fails instead of merely looking wrong to nobody.
 */
function mouthDirection(path: string): number {
  const curve = /Q\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(path);
  if (!curve) {
    return 0;
  }
  const start = /^M\s*([\d.]+)[\s,]+([\d.]+)/.exec(path);
  if (!start) {
    throw new Error(`mouth path does not begin with a moveto: ${path}`);
  }
  const controlY = Number(curve[2]);
  const lipY = (Number(start[2]) + Number(curve[4])) / 2;
  return controlY > lipY ? 1 : -1;
}

describe("the happiness face agrees with the words beside it", () => {
  it("covers every band the model defines, and no band it does not", () => {
    // The population is DERIVED from the engine's own band table, not listed here, and
    // floored so an empty or truncated derivation cannot make the sweeps below vacuous.
    expect(HAPPINESS_BANDS_BY_FLOOR.length).toBeGreaterThanOrEqual(3);
    expect(new Set(HAPPINESS_BANDS_BY_FLOOR).size).toBe(HAPPINESS_BANDS_BY_FLOOR.length);
    expect([...HAPPINESS_BANDS_BY_FLOOR].sort()).toEqual(
      (Object.keys(HAPPINESS_BAND_FLOOR) as HappinessBand[]).sort(),
    );

    // A CENSUS IN BOTH DIRECTIONS between the spec above and the implementation: a band
    // whose label changes leaves `EXPRESSION_FOR_LABEL` with a key nothing renders, and
    // a band added to the model arrives with no expected expression. Either fails here
    // rather than shipping a face nobody chose.
    const labels = HAPPINESS_BANDS_BY_FLOOR.map((band) => happinessReadout(band).label);
    expect(new Set(labels)).toEqual(new Set(Object.keys(EXPRESSION_FOR_LABEL)));
  });

  it("wires each band's expression to a mouth that actually curves that way", () => {
    for (const band of HAPPINESS_BANDS_BY_FLOOR) {
      const { label, expression, mouth } = happinessReadout(band);
      expect(
        expression,
        `${band} claims an expression the spec does not give its label`,
      ).toBe(EXPRESSION_FOR_LABEL[label]);

      // The DRAWING against the CLAIM. A "happy" row holding the frown path fails here.
      expect(
        mouthDirection(mouth),
        `${band} is called "${expression}" but its mouth curves the other way: ${mouth}`,
      ).toBe(DIRECTION_FOR_EXPRESSION[expression]);
    }
  });

  it("gives a happier mouth to every higher band, in the model's own order", () => {
    // Derived from `HAPPINESS_BAND_FLOOR`, so this holds the panel to the ENGINE's
    // ranking rather than to anything written in this file. Swap two mouths and the
    // sequence stops rising.
    const ranked = HAPPINESS_BANDS_BY_FLOOR.map((band) => ({
      band,
      floor: HAPPINESS_BAND_FLOOR[band],
      direction: mouthDirection(happinessReadout(band).mouth),
    }));

    // A FLOOR under the walk below: one band would satisfy it while comparing nothing.
    expect(ranked.length).toBeGreaterThanOrEqual(3);

    let previous: (typeof ranked)[number] | null = null;
    for (const entry of ranked) {
      if (previous) {
        expect(
          entry.floor,
          `${entry.band} is not ranked above ${previous.band} by the engine`,
        ).toBeGreaterThan(previous.floor);
        expect(
          entry.direction,
          `${entry.band} (floor ${entry.floor}) has no happier a mouth than ${previous.band} (floor ${previous.floor})`,
        ).toBeGreaterThan(previous.direction);
      }
      previous = entry;
    }

    // And no two bands share a face, or the readout would be ambiguous where it matters.
    expect(new Set(ranked.map((entry) => entry.direction)).size).toBe(ranked.length);
  });

  /**
   * THE SAME CLAIM IN THE REAL DOM, and state-agnostic on purpose.
   *
   * Rather than synthesising a `CityVitality` per band — which era one cannot reach,
   * since civic buildings are not purchasable yet and coverage never climbs out of
   * `restless` — this reads the band the panel is ACTUALLY showing off `dd[data-band]`,
   * then checks the rendered face and the rendered label against the spec. So it works
   * at whatever state the app can produce, and it is three independent DOM facts being
   * held together rather than the table agreeing with itself.
   */
  for (const [name, load] of [
    ["the bare starting city", bareLoad],
    ["the fully mastered city", masteredLoad],
  ] as const) {
    it(`renders the spec'd face for the band ${name} is in`, async () => {
      dropPanel();
      const region = await panel(load());
      const happiness = within(region).getByTestId("vitality-happiness");

      const band = happiness.querySelector("dd")?.getAttribute("data-band");
      expect(band, "the row says which band it is in").toBeTruthy();

      const label = within(happiness).getByTestId("vitality-happiness-terms").textContent;
      expect(label, "the band's words are on screen").toBeTruthy();
      const expected = specExpressionFor(label);

      const face = within(happiness).getByTestId("vitality-happiness-face");
      expect(face.getAttribute("data-expression")).toBe(expected);
      // And the drawing itself, not just its name.
      const mouth = face.querySelectorAll("path")[2]?.getAttribute("d") ?? "";
      expect(mouthDirection(mouth)).toBe(DIRECTION_FOR_EXPRESSION[expected]);
    });
  }

  it("keeps the face decorative, so it is never the only carrier and never announced", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const happiness = within(region).getByTestId("vitality-happiness");
    const face = within(happiness).getByTestId("vitality-happiness-face");

    // DECORATIVE: the meaning is already text, twice — visibly on the row and in the
    // announced sentence — so the face may not be announced on top of it.
    expect(face).toHaveAttribute("aria-hidden", "true");
    expect(face.getAttribute("aria-label")).toBeNull();
    expect(face.querySelector("title")).toBeNull();

    // NOT THE ONLY CARRIER: strip the face and the state is still readable. Asserted by
    // reading the text the face sits beside rather than by trusting that it is there. On
    // this city the words are the lead's alarmed line; on a city whose crowd the hub still
    // provides for they are the mild band label, which the bare-island case below reads.
    expect(within(happiness).getByTestId("vitality-happiness-terms").textContent).toContain(
      UNHAPPY_WARNING,
    );
    expect(within(region).getByTestId("vitality-live").textContent).toContain(
      UNHAPPY_WARNING,
    );

    dropPanel();
    const founding = await panel(bareLoad());
    expect(
      within(founding).getByTestId("vitality-happiness-terms").textContent,
      "the mild band label is what an unhappy city the hub still provides for reads",
    ).toBe(RESTLESS_LABEL);

    // AND IT DOES NOT POLLUTE THE METER'S NAME. The face lives in the row's `dt`, so a
    // future move of it inside the `progressbar` would change what is read out.
    const meter = within(happiness).getByRole("progressbar");
    expect(meter.getAttribute("aria-label")).toBe("People the city can keep happy");
    expect(meter.querySelector('[data-testid="vitality-happiness-face"]')).toBeNull();
  });
});

/**
 * THE ACCESSIBILITY CONTRACT.
 *
 * The 3D canvas is `aria-hidden`, so this DOM is the only access a screen-reader user
 * has to the city's state. See the file header for what each of these was before the
 * three candidate layouts were cut down to one, and why nothing here is weaker for it.
 */
describe("the readout is reachable without the canvas", () => {
  it("is a labelled region, so a screen reader can find it by name", async () => {
    dropPanel();
    await panel(bareLoad());
    expect(screen.getByRole("region", { name: "City life" })).toBeInTheDocument();
  });

  it("puts a value on every meter, so no bar is a picture only", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const bars = within(region).getAllByRole("progressbar");
    // A FLOOR under the sweep: `getAllByRole` over an empty match would throw, but a
    // panel that lost one of its two meters would otherwise pass a bare `for` loop.
    // This is also what is left of the deleted variant-list floor — see the header.
    expect(bars.length, "the panel keeps both meters").toBeGreaterThanOrEqual(2);
    for (const bar of bars) {
      expect(bar).toHaveAttribute("aria-label");
      expect(bar).toHaveAttribute("aria-valuenow");
      expect(bar).toHaveAttribute("aria-valuemax");
      expect(Number(bar.getAttribute("aria-valuenow"))).not.toBeNaN();
      // `aria-valuetext` states the value a drawn bar would only imply. It is kept from
      // the three-layout sweep on purpose: it is the assertion that made a bar-less
      // layout legitimate, and the one a redesign is most likely to drop by accident.
      expect(bar.getAttribute("aria-valuetext")).toMatch(/\d/);
    }
    // Both measures are present and NAMED, so neither meter can stand for the other.
    const labels = bars.map((bar) => bar.getAttribute("aria-label"));
    expect(labels).toContain("People the city can sustain");
    expect(labels).toContain("People the city can keep happy");
  });

  it("keeps the canvas out of it — the panel is not inside an aria-hidden subtree", async () => {
    dropPanel();
    const region = await panel(bareLoad());
    let node: HTMLElement | null = region;
    while (node) {
      expect(
        node.getAttribute("aria-hidden"),
        `${node.className || node.tagName} hides the readout`,
      ).not.toBe("true");
      node = node.parentElement;
    }
  });

  it("announces the state politely, and completely", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const live = within(region).getByTestId("vitality-live");
    expect(live).toHaveAttribute("aria-live", "polite");
    // All three measures, plus the band. Kept from the cross-layout test that used to
    // carry them, where they were the guard against three layouts agreeing on an empty
    // string. The sentence now ends in a HEADROOM clause rather than a full stop,
    // because #236's pooling put this city inside its livability (48 people, 80
    // sustained after the founding-population rebalance) where the un-pooled reading
    // would have left it short. The clause is asserted rather than tolerated by a
    // loosened `\.`, so the announcement cannot lose it.
    //
    // ⚑ It opened `38 people. 6 have left.` until 2026-08-05. Both halves are asserted now,
    // the second by absence: dropping the loss clause was safe because there is no longer a
    // change to the headcount for a screen-reader learner to be the only one in the room
    // unable to tell about, and an announcement that still carried it would be describing a
    // mechanic the engine does not have.
    expect(live.textContent).toMatch(/^48 people\. Livability/);
    expect(live.textContent).not.toMatch(/left|leav/i);
    expect(live.textContent).toMatch(/Livability sustains 48 of them/);
    expect(live.textContent).toMatch(/with \d+ to spare\./);
    expect(live.textContent).toMatch(/the city can keep 9 happy/);
    // THE ALARMED STATE IS ANNOUNCED, which is the one thing a screen-reader user would
    // otherwise be the only person in the room unable to tell: the canvas is `aria-hidden`,
    // so a shortfall that lived only in a tint would not exist for them.
    expect(live.textContent).toContain(UNHAPPY_WARNING);
  });

  /**
   * THE SURVIVING HALF of `announces exactly the same state whichever layout is drawn`.
   *
   * That test's real subject was `accessibleReadout()` being the single source, so the
   * spoken text and the meters could not drift into two accounts of one city. Three
   * layouts were only how it was observed. With one layout the invariant is unchanged
   * and observable a different way: the live region and the happiness meter must agree
   * on the figures, because they are supposed to come from the same derivation.
   */
  it("makes the live region and the meters agree on the figures", async () => {
    dropPanel();
    const region = await panel(masteredLoad());
    const live = within(region).getByTestId("vitality-live").textContent ?? "";
    const bars = within(region).getAllByRole("progressbar");
    expect(bars.length).toBeGreaterThanOrEqual(2);

    for (const bar of bars) {
      const now = bar.getAttribute("aria-valuenow");
      const valueText = bar.getAttribute("aria-valuetext") ?? "";
      // The meter's own two accounts of itself first: the number and the words on the
      // same element cannot disagree.
      expect(
        valueText,
        `${bar.getAttribute("aria-label")}: valuetext omits its value`,
      ).toMatch(new RegExp(`\\b${now}\\b`));
      // Then the announced sentence must carry that same figure.
      expect(
        live,
        `the announcement omits ${bar.getAttribute("aria-label")} = ${now}`,
      ).toMatch(new RegExp(`\\b${now}\\b`));
    }
  });
});
