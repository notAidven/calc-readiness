import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import { MOCK_NODE_STATES } from "./mockCity";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { resetCityEra, setCityEra } from "./useCityEra";

/**
 * THE ROSTER IS GATED BY THE ERA THE CITY IS STANDING IN — the STORED era, at every era.
 *
 * Era two's buildings reached the city through `expansion_era`, which only the `?era=` dev
 * hatch ever passed — so a chapter the learner had advanced into put nothing on the island,
 * and era two was a dev path rather than a product one. The fix is one line of
 * `CitySurface.tsx`, `eraIdProp ?? liveEraId`, and the risk it carries is the mirror image: a
 * fresh city offering eleven buildings for lessons a learner cannot reach yet.
 *
 * ## WHY THE POPULATION IS TEN ERAS AND NOT THE TWO THIS DEFECT WAS FOUND IN
 *
 * `CitySurface.eraRoster.test.tsx` sweeps `ERA_SEQUENCE` through the `eraId` PROP. This file
 * is the same sweep through the STORE, because those are two different wirings and the store
 * is the one an advance moves — a surface that kept the prop path working and stopped reading
 * `useCityEra` would leave that file entirely green.
 *
 * The sweep is every era rather than era one and era two because the behaviour is exhibited
 * by every era, not only by the two the defect was reported in. Measured rather than argued,
 * at `b0f0106f`: with the surface pinned to `liveEraId === CURRENT_ERA_ID ? liveEraId :
 * "neolithic"` — era one and era two correct, eras three to ten wrong — the era-one/era-two
 * version of this file reported **3 passed, 0 failed**. It was a derived population with
 * floors under it, and it was still the wrong set. Widened, that same injection fails at
 * eight eras.
 *
 * Both directions are asserted at every era because either alone passes on a broken
 * implementation: a roster pinned to era one satisfies "no later era leaked in", and one that
 * appends every era satisfies "this era's buildings are present". Every population is read
 * from `ERA_SEQUENCE` rather than written down, and each carries a floor, since "contains
 * none of a later era" holds trivially over an empty era.
 *
 * `output/era-gating/` corroborates the era-one and era-two rows in a real browser, and it
 * corroborates the CONTENTS only — the roster reads "0 of 6 skills complete" fresh and "0 of
 * 11" advanced, which is the 6 and the 11 the last case below asserts. Those frames were taken
 * at 1440x900 and are not evidence about layout at any viewport; nothing here makes a spatial
 * claim, and `buildMenuEraAxis.browser.test.tsx` is where the build menu's own measurements at
 * 1024x580 live.
 */

/** Era slugs in authored order. INV-ERA-5's only sanctioned notion of era order. */
const ERA_IDS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/**
 * The buildings era `eraId` should be offering: its own and every earlier era's, in authored
 * order. Derived from `ERA_SEQUENCE` and NOT from `@cr/game`'s `cityRosterNodeIds`, which is
 * the same slice-and-flat-map — asserting the surface against the engine's copy of the
 * derivation would pass on any era the two got wrong together.
 */
function cumulativeNodeIds(eraId: EraId): readonly string[] {
  const upTo = ERA_IDS.indexOf(eraId);
  return ERA_IDS.slice(0, upTo + 1).flatMap((id) => [...getEraNodes(id)]);
}

/** The buildings no city in `eraId` may offer: every era after it in the sequence. */
function laterEraNodeIds(eraId: EraId): readonly string[] {
  return ERA_IDS.slice(ERA_IDS.indexOf(eraId) + 1).flatMap((id) => [...getEraNodes(id)]);
}

function loadWith(nodeStates: CityLoad["node_states"]): () => Promise<CityLoad> {
  return () => Promise.resolve({ node_states: nodeStates, placements: [] });
}

/**
 * Every skill node id the Buildings roster is offering, in roster order.
 *
 * The hub is dropped because it is not a skill node: it is pre-seeded and belongs to no era,
 * so it would sit in every era's expected list saying nothing about the gate.
 */
async function rosterNodeIds(user: ReturnType<typeof userEvent.setup>): Promise<string[]> {
  await openBuiltShelf(user);
  const panel = await screen.findByRole("group", { name: "Built" });
  return [...panel.querySelectorAll("[data-node-id]")]
    .map((element) => (element as HTMLElement).dataset.nodeId ?? "")
    .filter((nodeId) => nodeId !== TOWN_HALL_ID);
}

describe("the city roster is gated by the era the city is standing in", () => {
  // The era store is module-level and persisted, so one era would otherwise leak into the
  // next case and the "fresh city" assertion would be reading it.
  beforeEach(resetCityEra);
  afterEach(resetCityEra);

  /**
   * THE SHAPE OF THE SEQUENCE THE SWEEP BELOW RUNS OVER.
   *
   * A floor constrains size, not shape. Ten eras whose rosters all happened to be era one's
   * six would satisfy a count floor and make every case below vacuous, so the composition is
   * asserted here: every era contributes buildings of its own, and the roster therefore grows
   * strictly at every advance.
   */
  it("sweeps a sequence whose eras really do each add buildings", () => {
    expect(ERA_IDS.length).toBeGreaterThanOrEqual(10);

    // Every era carries buildings of its own, so no case below is asserting over an empty era.
    for (const eraId of ERA_IDS) {
      expect(
        getEraNodes(eraId).length,
        `${eraId} has no buildings of its own`,
      ).toBeGreaterThan(0);
    }

    // And the cumulative roster is strictly increasing, which is what makes "era N offers more
    // than era one" a claim about the sequence rather than about era two alone.
    const sizes = ERA_IDS.map((eraId) => cumulativeNodeIds(eraId).length);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(
        sizes[i] as number,
        `${ERA_IDS[i]} does not grow the roster past ${ERA_IDS[i - 1]}`,
      ).toBeGreaterThan(sizes[i - 1] as number);
    }
    expect(sizes[0]).toBeGreaterThanOrEqual(6);

    // THE COUNTER TO THE BLINDNESS THIS FILE WAS WIDENED FOR. Era one and era two were the
    // whole population once, and an implementation correct in exactly those two passed. So the
    // population with those two removed is floored on its own: the sweep has to reach eras a
    // pinned-to-era-two surface would fail at, and there have to be enough of them that
    // dropping one does not quietly shrink the sweep back to where it started.
    const beyondTheReportedEras = ERA_IDS.slice(2);
    expect(beyondTheReportedEras.length).toBeGreaterThanOrEqual(8);
    // Named, so a resequenced era cannot leave this slice pointing at the wrong two.
    expect(ERA_IDS.slice(0, 2)).toEqual(["prehistoric", "neolithic"]);

    // Exactly one era has no era after it, and it is the last one. Asserted both ways so the
    // "no later era to exclude" case below is a derived fact about the sequence and not an
    // exemption that could quietly come to cover more eras.
    const withNoLaterEra = ERA_IDS.filter((eraId) => laterEraNodeIds(eraId).length === 0);
    expect(withNoLaterEra).toEqual([ERA_IDS[ERA_IDS.length - 1]]);
  });

  it("offers era one's buildings and NO later era's on a fresh city", async () => {
    // NO `setCityEra` — a city with nothing stored, which is what a new learner opens. This is
    // the half that fails if the fix over-reaches and hands every era's buildings to everyone.
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} loadCity={loadWith(MOCK_NODE_STATES)} />);

    const eraOne = ERA_IDS[0] as EraId;
    const roster = await rosterNodeIds(user);
    expect(roster).toEqual([...cumulativeNodeIds(eraOne)]);

    // Floors on BOTH sets: era one is really there, and the later eras are a real set that is
    // really absent — not an empty one that could not have shown up anyway.
    expect(roster.length).toBeGreaterThanOrEqual(6);
    const later = laterEraNodeIds(eraOne);
    expect(later.length).toBeGreaterThanOrEqual(5);
    for (const nodeId of later) {
      expect(
        roster,
        `${nodeId} is on the island before the learner reached it`,
      ).not.toContain(nodeId);
    }
  });

  /**
   * THE SWEEP. Each era is entered through `setCityEra`, which is the setter the advance
   * ceremony's completion calls and the setter the `?era=` hatch writes — so this walks the
   * state a real advance leaves behind rather than a prop no shipped path passes.
   */
  it.each(ERA_IDS)("offers exactly what era %s has reached, once stored", async (eraId) => {
    const user = userEvent.setup();
    setCityEra(eraId);
    render(<CitySurface enableCanvas={false} loadCity={loadWith(MOCK_NODE_STATES)} />);

    const roster = await rosterNodeIds(user);
    const expected = cumulativeNodeIds(eraId);

    // Order-sensitive equality rather than a count or a subset: a roster that dropped one
    // building and repeated another, or reshuffled the chapters, cannot pass this.
    expect(roster).toEqual([...expected]);

    // Era one never leaves. A chapter ADDS to the city, and the debt a learner still owes in
    // an earlier era has to stay reachable from the era they are standing in.
    for (const nodeId of getEraNodes(ERA_IDS[0] as EraId)) {
      expect(roster, `${nodeId} left the island in ${eraId}`).toContain(nodeId);
    }

    // NOTHING FROM A LATER ERA. Floored, except at the last era, where the empty set is the
    // sequence's own shape — asserted as such above, in both directions.
    const later = laterEraNodeIds(eraId);
    if (eraId !== ERA_IDS[ERA_IDS.length - 1]) {
      expect(later.length, `no era follows ${eraId}`).toBeGreaterThan(0);
    }
    for (const nodeId of later) {
      expect(
        roster,
        `${nodeId} is offered in ${eraId}, before its own chapter`,
      ).not.toContain(nodeId);
    }
  });

  /**
   * The Built summary counts the STANDING era's roster too. Swept
   * rather than checked at era one, because a denominator pinned to six is the same defect
   * wearing different clothes: the roster would grow and the meter would report progress
   * against a city that no longer exists.
   */
  it.each(ERA_IDS)("counts era %s's whole roster on the Built summary", async (eraId) => {
    const user = userEvent.setup();
    setCityEra(eraId);
    render(<CitySurface enableCanvas={false} loadCity={loadWith(MOCK_NODE_STATES)} />);

    // `loadWith` places nothing, so the numerator is zero at every era and the denominator is
    // the only moving part.
    const { summary } = await openBuiltShelf(user);
    expect(summary).toHaveTextContent(`0/${cumulativeNodeIds(eraId).length}`);
  });
});
