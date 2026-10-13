import { civicBuildingOrThrow, civicCatalogueForEra } from "@cr/economy";
import { deriveProvision, NO_CRISIS_DAMAGE } from "@cr/game";
import { describe, expect, it } from "vitest";

import { civicContributionRowsOf, cityVitality } from "./citizens";
import { createCityDevSession } from "./citySession";
import { MOCK_CITY_LOAD } from "./mockCity";
import { suspendedCivicIds } from "./suspendedCivic";
import type { PlacedTransform } from "./worldLayout";

/**
 * **THE SEAM THE SUPPRESSION IS APPLIED AT, and the phantom row it must not reach.**
 *
 * `civicContributionRowsOf` leads with a row that has no placement behind it. Era one section
 * 4 gives the starting city a Smokehouse *"introduced by the tutorial as the player's first
 * real placement choice"* and that placement does not exist yet (O-8), so its 20 livability
 * arrives as a phantom row and the bought buildings are appended to it.
 *
 * That row is the trap in this function, and it is a trap in both directions:
 *
 *  - **a suspension must not be able to take it.** It is what section 8.1 guarantees the
 *    starting city, and a crisis that shuttered a BOUGHT Smokehouse must not also silently
 *    switch off the free one;
 *  - **a bought Smokehouse must still be suspendable on its own terms.** It is a real
 *    placement with a real id one row further down, and exempting it because a phantom row
 *    of the same type leads would be the other half of the same mistake.
 *
 * The structural answer is that the phantom row is pushed before the loop and is keyed by
 * NOTHING, so no `suspended_civic` record can name it. Both halves are measured below rather
 * than left to that paragraph.
 */

const FREE_SMOKEHOUSE = civicBuildingOrThrow("prehistoric_smokehouse");

function placement(catalogueId: string, sequence: number): PlacedTransform {
  return { nodeId: `civic:${catalogueId}:${sequence}`, col: sequence, row: 0, rot: 0 };
}

function totals(rows: readonly { livability: number; happiness: number }[]) {
  return rows.reduce(
    (sum, row) => ({
      livability: sum.livability + row.livability,
      happiness: sum.happiness + row.happiness,
    }),
    { livability: 0, happiness: 0 },
  );
}

describe("the free Smokehouse row and a crisis suspension", () => {
  it("keeps the starting city's guaranteed livability when EVERY placement is shut", () => {
    const bought = civicCatalogueForEra("prehistoric").map((row, index) =>
      placement(row.id, index),
    );
    const everything = new Set(bought.map((p) => p.nodeId));
    const rows = civicContributionRowsOf(bought, everything);

    // The four bought rows are zeroed and the phantom one is untouched, so what is left is
    // exactly section 8.1's guarantee.
    expect(totals(rows)).toEqual({
      livability: FREE_SMOKEHOUSE.provides.livability,
      happiness: FREE_SMOKEHOUSE.provides.happiness,
    });
    expect(rows).toHaveLength(bought.length + 1);
    // A floor: there really were four bought buildings worth something to withhold, so the
    // equality above is not holding over an empty catalogue.
    expect(bought.length).toBeGreaterThanOrEqual(4);
    expect(totals(civicContributionRowsOf(bought)).livability).toBeGreaterThan(
      FREE_SMOKEHOUSE.provides.livability,
    );
  });

  it("still shuts a BOUGHT Smokehouse, which is a placement like any other", () => {
    // The other direction. The free row and the bought one are the same catalogue TYPE, and
    // a suppression keyed on the type rather than on the placement id would either miss this
    // building or take the phantom row with it.
    const bought = [placement(FREE_SMOKEHOUSE.id, 0)];
    const shut = civicContributionRowsOf(bought, new Set([bought[0]?.nodeId as string]));

    expect(totals(shut)).toEqual({
      livability: FREE_SMOKEHOUSE.provides.livability,
      happiness: FREE_SMOKEHOUSE.provides.happiness,
    });
    // …which is the phantom row alone: the bought copy's own contribution is gone.
    expect(totals(civicContributionRowsOf(bought)).livability).toBe(
      FREE_SMOKEHOUSE.provides.livability * 2,
    );
  });
});

/**
 * **AN UNDAMAGED CITY IS EXACTLY THE CITY IT WAS**, which is the claim every optional
 * parameter owes and the one a reviewer of a change like this asks first.
 *
 * Asserted as a deep equality over the DERIVED OBJECTS rather than by reading the code,
 * because the two ways this could go wrong are both invisible in a diff: a default that
 * allocates a different empty, and a rewritten loop that reorders the rows a caller compares.
 */
describe("a city with no suspensions", () => {
  const bought = civicCatalogueForEra("prehistoric").map((row, index) =>
    placement(row.id, index),
  );

  it("derives byte-identical contribution rows through the new parameter and without it", () => {
    const before = civicContributionRowsOf(bought);
    expect(civicContributionRowsOf(bought, suspendedCivicIds(NO_CRISIS_DAMAGE))).toEqual(
      before,
    );
    expect(civicContributionRowsOf(bought, new Set())).toEqual(before);
    // Serialized, so ORDER is part of the claim: the rows are positional as far as any
    // caller comparing two arrays is concerned, and a reordering loop would pass a
    // set-wise check.
    expect(JSON.stringify(civicContributionRowsOf(bought, new Set()))).toBe(
      JSON.stringify(before),
    );
  });

  it("derives the same two dials as it did before the suppression existed", () => {
    const viewModel = {
      buildings: [],
    } as unknown as Parameters<typeof cityVitality>[0]["viewModel"];
    const withParameter = cityVitality({
      viewModel,
      placements: [],
      civic: civicContributionRowsOf(bought, suspendedCivicIds(NO_CRISIS_DAMAGE)),
    });
    const without = cityVitality({
      viewModel,
      placements: [],
      civic: civicContributionRowsOf(bought),
    });
    expect(withParameter).toEqual(without);
    // A floor under the equality: the city really does have capacity for the two to agree
    // about, so this is not two zeroes matching.
    expect(withParameter.livability.sustains).toBeGreaterThan(0);
    expect(withParameter.happiness.coverage).toBeGreaterThan(0);
  });

  it("reads nothing out of an undamaged city's damage record", () => {
    expect(suspendedCivicIds(NO_CRISIS_DAMAGE).size).toBe(0);
  });

  /**
   * **AND NO CITY THE APP CAN OPEN IS HOLDING ONE**, which is the difference between "an
   * undamaged city is unchanged" and "nothing a reviewer opens on Friday is changed".
   *
   * Both crisis engines write `suspended_civic` against the placement ids of the board they
   * were opened over, and both dev routes open an AUTHORED board carrying stand-in ids
   * (`succession-harbour-grain-dock`). Neither route writes to the city at all —
   * `SuccessionSurface` says in terms that it *"touches nothing in the 3D city"* — so the
   * only way a suspension reaches a city today is a caller passing one to
   * `recordCrisisDamage`, which is what every case above does deliberately.
   *
   * Asserted over what the app actually loads rather than argued, because the claim being
   * made is about the demo route and not about the type.
   */
  it("is holding no suspension in either city the app opens", async () => {
    const fresh = createCityDevSession();
    expect((await fresh.load()).crisis_damage?.suspended_civic ?? []).toEqual([]);
    expect(fresh.crisisDamage().suspended_civic).toEqual([]);
    // The `?mock` route's city, which is the other one a reviewer can reach.
    expect(MOCK_CITY_LOAD.crisis_damage?.suspended_civic ?? []).toEqual([]);
    // A floor: the mock city really is a city, so the emptiness above is a fact about its
    // damage rather than about an empty fixture.
    expect((MOCK_CITY_LOAD.placements ?? []).length).toBeGreaterThan(0);
  });
});

/**
 * **A SUSPENSION MAY CAUSE THE WARNING AND MUST NOT CAUSE A LOSS OF ITS OWN.**
 *
 * This was written against #561
 * while that lane was open — *"removes the population loss an under-provisioned city suffers
 * and keeps the warning"* — on the reasoning that a suspension lowers livability and can
 * therefore push a city over the line, which is correct and is the signal doing its job. That
 * ruling landed on 2026-08-05 as **citizens do not leave**, so the anticipation is now history
 * and the claim is the same one it always was.
 *
 * What makes the two compose is that a suspension adds no threshold and no second reading of
 * one. It moves `sustains`, and `deriveProvision` alone decides what that means: one rule, one
 * place, which is why the ruling reached a suspension-caused shortfall with nothing here to
 * update beyond the name. Asserted rather than argued, because *"they compose"* is the kind of
 * sentence that is true right up until somebody adds a branch.
 */
describe("a suspension against the provision reading", () => {
  const viewModel = {
    buildings: [],
  } as unknown as Parameters<typeof cityVitality>[0]["viewModel"];
  // The FOOD row, which provides livability and no happiness, so shutting it moves exactly
  // one of the rule's three inputs and the claim below is about that input.
  const bought = [placement("prehistoric_smokehouse", 0)];

  it("reaches the warning through the shared rule and never past it", () => {
    const open = cityVitality({
      viewModel,
      placements: [],
      civic: civicContributionRowsOf(bought),
    });
    const shut = cityVitality({
      viewModel,
      placements: [],
      civic: civicContributionRowsOf(bought, new Set([bought[0]?.nodeId as string])),
    });

    // The suspension is what moved, and it moved exactly one input to the rule.
    expect(shut.livability.sustains).toBeLessThan(open.livability.sustains);
    expect(shut.population).toBe(open.population);
    expect(shut.happiness.level).toBe(open.happiness.level);

    // …and the verdict is the shared rule's, recomputed here from the same three inputs.
    // Nothing in the city lane holds an opinion about what a shortfall means, which is why
    // removing the departure consequence needed no edit on this side of the seam.
    expect(shut.provision).toEqual(
      deriveProvision({
        population: shut.population,
        happinessLevel: shut.happiness.level,
        sustains: shut.livability.sustains,
      }),
    );

    // AND THE SUSPENSION COSTS THE CITY NO PEOPLE, which is the ruling reaching this seam: a
    // crisis may take a city's capacity and may never take its crowd.
    expect(shut.population).toBe(open.population);
  });
});
