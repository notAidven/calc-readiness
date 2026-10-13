import { buildCityViewModel, type CityVitality, HAPPINESS_BAND_FLOOR } from "@cr/game";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  CityVitalityPanel,
  RESTLESS_LABEL,
  UNHAPPY_WARNING,
  UNSUSTAINED_WARNING,
} from "./CityVitalityPanel";
import { cityVitality } from "./citizens";
import { MOCK_NODE_STATES } from "./mockCity";
import { TOWN_HALL_ID } from "./townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

/**
 * **THE PANEL'S ALARM AND THE ENGINE'S READING ARE ONE DECISION, PROVED BY MOVING IT.**
 *
 * The team lead's fourth item: *"The panel must not warn while nothing happens, nor lose
 * people silently. Assert that the warning state and the departure rule are driven by the
 * same threshold: prove it by moving the threshold and watching both move together, so
 * they cannot drift into a UI that cries wolf."*
 *
 * ## ⚑ HALF OF THAT ITEM WAS WITHDRAWN, AND THE FILE KEEPS ITS NAME ANYWAY
 *
 * *"Nor lose people silently"* is void: on 2026-08-05 departures were removed as a mechanic
 * entirely (*"maybe just remove the actual consequences just tell them their people are
 * unhappy?"*), so there is no loss for the panel to be silent about and
 * `test/departuresAreWired.test.ts` is where that is now asserted. **His other half survives
 * word for word**, and it is the more valuable of the two: a panel must not warn while nothing
 * is wrong, and the only way to know the alarm and the engine cannot drift is to move the line
 * and watch them move as one.
 *
 * The filename is left alone on purpose. Three specs under `docs/superpowers/specs/` and two
 * engine headers cite it BY NAME, and a rename would make five true pointers stale on a day
 * when nothing about what they were pointing at got weaker.
 *
 * ## Why "they both read the same constant" is not the assertion
 *
 * Two files reading one constant is a fact about today's source. What the item asks for is
 * that they cannot COME APART, and the way to show that is to change the constant and see
 * the panel and the engine move as one — which is what this file does, at four different
 * thresholds, over a swept population of real cities.
 *
 * `HAPPINESS_BAND_FLOOR.settling` is mutated in place and restored. That is deliberate and
 * it is the point: it is the only way to ask *"what would this panel do if the line were
 * somewhere else"* without asking the panel, and a test that asked the panel would be the
 * panel agreeing with itself.
 *
 * ## The three claims, and which failure each one is about
 *
 *  1. **No shortfall goes unsaid.** A city the engine reads as short of something its player
 *     owes is a city the panel is alarmed about, on every city at every threshold. This is the
 *     failure that leaves a learner with a city they cannot see the problem with.
 *  2. **The panel never warns about a shortfall the engine is not reading.** The alarmed row
 *     is the one the engine names as the cause. This is the cry-wolf failure, and it is now
 *     the whole of what the fourth item is about.
 *  3. **Moving the line moves both.** With a floor under it, so the sweep cannot pass by
 *     never changing anything.
 */

const ALL_NODES = MOCK_NODE_STATES.map((state) => state.node_id);
const ALL_WITH_HALL = defaultPlacements([TOWN_HALL_ID, ...ALL_NODES], [], BUILDABLE_RADIUS);
const ALL_PLACED = ALL_WITH_HALL.filter((p) => p.nodeId !== TOWN_HALL_ID);

afterEach(cleanup);

function statesAt(mastery: Mastery): StudentNodeState[] {
  return MOCK_NODE_STATES.map((state) => ({
    ...state,
    mastery,
    lesson_stage: "done" as const,
    completion_status: mastery >= 2 ? "complete" : state.completion_status,
  })) as StudentNodeState[];
}

interface Town {
  readonly label: string;
  readonly placements: readonly PlacedTransform[];
  readonly nodeStates: readonly StudentNodeState[];
  readonly roadTileCount: number;
}

/**
 * The swept population: every city shape that moves a headcount, crossed with path
 * networks from none to a fully paved island.
 *
 * The paths matter more than the mastery here, and that is not obvious: era one's skill
 * buildings alone never take coverage past 20 percent, so a sweep over mastery alone would
 * be a sweep over cities that are ALL deep under any threshold worth testing. The road
 * tiles are what walk coverage from 20 percent to 100, which is what puts cities on both
 * sides of a moved line and makes the comparison below capable of failing.
 */
const TOWNS: readonly Town[] = (() => {
  const towns: Town[] = [];
  for (const [label, placements, nodeStates] of [
    ["bare island", [], MOCK_NODE_STATES],
    ["two placed", ALL_PLACED.slice(0, 2), MOCK_NODE_STATES],
    ["the shipped mock", ALL_PLACED, MOCK_NODE_STATES],
    ["all placed, taught", ALL_PLACED, statesAt(1)],
    ["all mastered", ALL_PLACED, statesAt(2)],
    ["all gold", ALL_PLACED, statesAt(3)],
  ] as const) {
    for (const roadTileCount of [0, 6, 12, 16, 20, 26, 35, 44]) {
      towns.push({
        label: `${label} @ ${roadTileCount} tiles`,
        placements,
        nodeStates,
        roadTileCount,
      });
    }
  }
  return towns;
})();

function vitalityOf(town: Town): CityVitality {
  return cityVitality({
    viewModel: buildCityViewModel({
      node_states: town.nodeStates,
      neighborhood_state: null,
    }),
    placements: town.placements,
    roadTileCount: town.roadTileCount,
  });
}

/** What the RENDERED panel is saying, read out of the DOM rather than out of the props. */
function panelState(vitality: CityVitality): {
  readonly alarmed: boolean;
  readonly rows: readonly string[];
  readonly warning: boolean;
} {
  cleanup();
  render(<CityVitalityPanel vitality={vitality} />);
  const region = screen.getByTestId("city-vitality");
  const rows: string[] = [];
  for (const id of ["vitality-population", "vitality-livability", "vitality-happiness"]) {
    if (within(region).getByTestId(id).getAttribute("data-alarm") === "true") {
      rows.push(id);
    }
  }
  return {
    alarmed: region.getAttribute("data-alarm") === "true",
    rows,
    warning:
      (region.textContent ?? "").includes(UNHAPPY_WARNING) ||
      (region.textContent ?? "").includes(UNSUSTAINED_WARNING),
  };
}

/**
 * Run `body` with the departure line moved, and put it back afterwards.
 *
 * The engine's band table is a plain object at runtime; `Readonly` is a type. Moving it
 * here is what makes this file a proof rather than a restatement.
 */
function withThreshold<T>(settling: number, body: () => T): T {
  const table = HAPPINESS_BAND_FLOOR as unknown as Record<string, number>;
  const original = table.settling as number;
  table.settling = settling;
  try {
    return body();
  } finally {
    table.settling = original;
  }
}

/** The lines the proof is run at, including the shipped one. */
const THRESHOLDS = [30, 45, 60, 85] as const;

describe("the panel's alarm and the engine's departure rule are one decision", () => {
  it("sweeps a population with cities on BOTH sides of the line, at every threshold", () => {
    // The floor. Every assertion below is of the form "for all cities...", and a sweep in
    // which nothing is ever alarmed, or everything always is, satisfies all of them while
    // measuring nothing at all.
    expect(TOWNS.length).toBeGreaterThanOrEqual(40);
    for (const settling of THRESHOLDS) {
      const warned = withThreshold(
        settling,
        () => TOWNS.filter((town) => vitalityOf(town).provision.unmet).length,
      );
      expect(warned, `every city is calm at settling=${settling}`).toBeGreaterThan(0);
      expect(warned, `every city is alarmed at settling=${settling}`).toBeLessThan(
        TOWNS.length,
      );
    }
  });

  it("never reads a shortfall without the panel saying so, and never touches the headcount", () => {
    // CLAIM 1, rewritten to the ruling. It used to read: a city with `leaving > 0` must be
    // showing its distressed state AND its population row must be alarmed. The second half is
    // now the assertion's opposite — the population row is the one row nothing can alarm —
    // so it is asserted as such rather than dropped, which is what keeps this case a guard.
    let short = 0;
    for (const settling of THRESHOLDS) {
      withThreshold(settling, () => {
        for (const town of TOWNS) {
          const vitality = vitalityOf(town);
          if (!vitality.provision.unmet) {
            continue;
          }
          short += 1;
          const shown = panelState(vitality);
          expect(shown.alarmed, `${town.label} @ ${settling}: silent shortfall`).toBe(true);
          expect(shown.warning, `${town.label} @ ${settling}: no sentence`).toBe(true);
          expect(
            shown.rows,
            `${town.label} @ ${settling}: the population row is alarmed, so something took people`,
          ).not.toContain("vitality-population");
        }
      });
    }
    // ...and the floor under it: cities really were short of something during the sweep.
    expect(short, "no city in the sweep was ever short of anything").toBeGreaterThan(24);
  });

  it("never shows an alarm the rule is not acting on, and alarms the row it names", () => {
    // CLAIM 2. The cry-wolf direction, in both halves: the panel is alarmed exactly when
    // the engine is, and the ROW it alarms is the deficiency the engine blames.
    let alarmed = 0;
    let calm = 0;
    for (const settling of THRESHOLDS) {
      withThreshold(settling, () => {
        for (const town of TOWNS) {
          const vitality = vitalityOf(town);
          const shown = panelState(vitality);
          expect(shown.alarmed, `${town.label} @ ${settling}`).toBe(
            vitality.provision.unmet,
          );
          if (!vitality.provision.unmet) {
            expect(shown.warning, `${town.label} @ ${settling}: warned anyway`).toBe(false);
            expect(shown.rows).toEqual([]);
            calm += 1;
            continue;
          }
          alarmed += 1;
          const owed =
            vitality.provision.cause === "sustenance"
              ? "vitality-livability"
              : "vitality-happiness";
          expect(shown.rows, `${town.label} @ ${settling}`).toContain(owed);
          const other =
            owed === "vitality-happiness" ? "vitality-livability" : "vitality-happiness";
          expect(
            shown.rows,
            `${town.label} @ ${settling}: alarmed a row nothing is happening to`,
          ).not.toContain(other);
        }
      });
    }
    expect(alarmed).toBeGreaterThan(20);
    expect(calm).toBeGreaterThan(20);
  });

  it("MOVES BOTH when the threshold moves, on the very same city", () => {
    // CLAIM 3, and the one the item actually asks for. The city is fully mastered with a
    // twenty-tile network, which puts it at 66 percent coverage: comfortably clear of a
    // line at 60 and comfortably under one at 90.
    const town = TOWNS.find((t) => t.label === "all mastered @ 20 tiles");
    if (!town) {
      throw new Error("the sweep no longer contains the city this proof is built on");
    }

    const low = withThreshold(30, () => {
      const vitality = vitalityOf(town);
      return { vitality, shown: panelState(vitality) };
    });
    const high = withThreshold(90, () => {
      const vitality = vitalityOf(town);
      return { vitality, shown: panelState(vitality) };
    });

    // The city did not change. Only the line did.
    expect(low.vitality.population).toBe(high.vitality.population);
    expect(low.vitality.happiness.covered).toBe(high.vitality.happiness.covered);

    // ...and its headcount did not change either, which is now half of what "only the line
    // did" means: the line is the ONLY thing between these two readings.
    expect(low.vitality.population).toBe(high.vitality.population);

    // Under a low line: the engine reads no shortfall and the panel is quiet.
    expect(low.vitality.provision.unmet).toBe(false);
    expect(low.vitality.provision.pressure).toBe(0);
    expect(low.shown.alarmed).toBe(false);
    expect(low.shown.warning).toBe(false);

    // Under a high line: BOTH moved, from one edit to one constant.
    expect(high.vitality.provision.unmet).toBe(true);
    expect(high.vitality.provision.pressure).toBeGreaterThan(0);
    expect(high.shown.alarmed).toBe(true);
    expect(high.shown.warning).toBe(true);
  });

  it("moves the WHOLE POPULATION together, so the pair cannot agree by coincidence", () => {
    // One city moving could be luck. This walks the line across four values and requires
    // the set of cities the ENGINE takes people from and the set the PANEL warns about to
    // be the same set every time, AND to be a different set at each threshold.
    const byThreshold = THRESHOLDS.map((settling) =>
      withThreshold(settling, () => {
        const enginesShortfall = new Set<string>();
        const panelsWarning = new Set<string>();
        for (const town of TOWNS) {
          const vitality = vitalityOf(town);
          if (vitality.provision.unmet) {
            enginesShortfall.add(town.label);
          }
          if (panelState(vitality).warning) {
            panelsWarning.add(town.label);
          }
        }
        return { settling, enginesShortfall, panelsWarning };
      }),
    );

    for (const { settling, enginesShortfall, panelsWarning } of byThreshold) {
      // The two sets are now the SAME set in both directions, and that is stronger than what
      // stood here. It used to be one containment only, because the shallow band just under
      // the line was warned while losing nobody, so a city could legitimately be warned and
      // not in the engine's loss set. With no loss to lag behind the warning, the engine's
      // reading and the panel's sentence are one fact and set equality is what says so.
      expect(
        [...panelsWarning].sort(),
        `@ ${settling}: the panel and the engine disagree about which cities are short`,
      ).toEqual([...enginesShortfall].sort());
      expect(panelsWarning.size, `nothing warned at ${settling}`).toBeGreaterThan(0);
    }

    // AND THE SETS ACTUALLY MOVE. Four identical sets would satisfy every containment
    // above while proving the threshold reaches neither side.
    const shapes = new Set(
      byThreshold.map(({ enginesShortfall }) => [...enginesShortfall].sort().join("|")),
    );
    expect(shapes.size, "moving the threshold changed nothing the engine does").toBe(
      THRESHOLDS.length,
    );
    const warnings = new Set(
      byThreshold.map(({ panelsWarning }) => [...panelsWarning].sort().join("|")),
    );
    expect(warnings.size, "moving the threshold changed nothing the panel says").toBe(
      THRESHOLDS.length,
    );
  });

  it("gives the panel NO second opinion: it follows the engine even when they disagree", () => {
    // The structural half, and the case is now MORE reachable rather than less: a bare island
    // really is `restless` with nothing the player owes, because the hub provides for its own
    // founders (`city-provision.ts` §4). If the panel held a threshold of its own it would
    // light up on the band regardless of what the engine read; handed a city the engine calls
    // provided-for while the band still says restless, it must stay quiet.
    const restlessButCalm: CityVitality = {
      population: 44,
      livability: { sustains: 72 },
      happiness: {
        coverage: 9,
        covered: 9,
        uncovered: 35,
        level: 20,
        band: "restless",
        fromPaths: 0,
      },
      shortfalls: { livability: 0, happiness: 26, practice: 0, none: false },
      provision: { pressure: 0, cause: null, unmet: false },
    };
    const quiet = panelState(restlessButCalm);
    expect(quiet.alarmed, "the panel re-derived a threshold of its own").toBe(false);
    expect(quiet.warning).toBe(false);
    // The band is still on screen, so this is a panel that read the band and declined to
    // alarm on it rather than a panel that failed to render.
    expect(screen.getByTestId("city-vitality").textContent).toContain(RESTLESS_LABEL);

    // ...and the converse, so the case above is not passing because the panel never alarms.
    const calmBandButShort: CityVitality = {
      ...restlessButCalm,
      happiness: { ...restlessButCalm.happiness, level: 80, band: "settling" },
      provision: { pressure: 0.2, cause: "amenities", unmet: true },
    };
    const loud = panelState(calmBandButShort);
    expect(loud.alarmed).toBe(true);
    expect(loud.warning).toBe(true);
  });
});
