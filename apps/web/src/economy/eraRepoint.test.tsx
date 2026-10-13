import { civicCatalogueForEra, lessonMaterialAmount, materialForEra } from "@cr/economy";
import { ERA_SEQUENCE, getEraNodes } from "@cr/skill-graph";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { CitySurface } from "../city/CitySurface";
import { COACH_MARKS, coachGroupLabel } from "../city/coachmarks/coachMarksCore";
import { ROAD_TILE_GOLD_COST } from "../city/roads";
import { createRoadSpendEconomy } from "../city/roadsEconomy";
import type { CityLoad } from "../city/types";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { createInMemoryEconomyClient } from "./economySession";
import { materialUnit, materialWord, materialWordCapitalised } from "./materialWord";

/**
 * **THE THREE STATIC-ERA READS THE ECONOMY HAD LEFT, AND WHAT THEY COST.**
 *
 * PR #309 repointed the wallet at the live era and left three behind — the shop's
 * displayed price (`Shop.tsx`), the material every sentence names (`materialWord.ts`)
 * and the road decorator's affordability check (`roadsEconomy.ts`) — all reading
 * `CURRENT_ERA_ID`, the static FIRST-era constant.
 *
 * **THE SHOP ONE IS GONE WITH THE SHOP (2026-08-03), and so is the era-SCALING it turned
 * on.** A cosmetic was priced once at era-one scale and multiplied by `eraScaledPrice` at
 * the point of sale, so "the price shown" and "the price taken" could disagree by the
 * ladder. A civic building's cost is authored at its OWN era's scale in the catalogue,
 * so there is no multiplication for two readers to do differently. What survives is the
 * claim underneath: a spend in era two must come out of era two's material, and the
 * decorator's guard must be looking at the same stockpile the core debits.
 *
 * These drive the real components and the real economy core across real eras.
 */

/** Eras past the first, so a pin to era one cannot pass by coincidence. */
const LATER_ERAS = ERA_SEQUENCE.slice(1).map((era) => era.id);

afterEach(() => {
  resetCityEra();
});

describe("the material every sentence names follows the era", () => {
  it("names each era's own material, and never era one's in another era", () => {
    // The population is the shipped sequence, not a written-down list, and the floor
    // is under it: a `slice` that stopped returning eras would make the loop vacuous.
    expect(LATER_ERAS.length).toBe(9);
    const eraOne = materialWord(ERA_SEQUENCE[0]?.id ?? "prehistoric");
    expect(eraOne).toBe("stone");

    let named = 0;
    for (const eraId of LATER_ERAS) {
      const authored = materialForEra(eraId);
      if (authored === null) {
        // Nine eras have only a proposed material; the fallback is a generic noun
        // rather than era one's, because naming stone in an era that does not mint it
        // is a confident lie where "resources" is merely vague.
        expect(materialWord(eraId)).toBe("resources");
        continue;
      }
      named += 1;
      expect(materialWord(eraId), eraId).toBe(authored.display_name.toLowerCase());
      expect(materialWord(eraId), eraId).not.toBe(eraOne);
      expect(materialUnit(eraId), eraId).toBe(authored.unit_noun);
    }
    // At least one later era really does have its own authored word, so the loop above
    // is not nine passes through the fallback branch.
    expect(named).toBeGreaterThanOrEqual(1);
  });

  it("capitalises the era's word, not a capitalised era-one word", () => {
    const eraTwo = ERA_SEQUENCE[1]?.id ?? "neolithic";
    expect(materialWordCapitalised(eraTwo)).toBe(
      materialWord(eraTwo).charAt(0).toUpperCase() + materialWord(eraTwo).slice(1),
    );
    expect(materialWordCapitalised(eraTwo)).not.toBe("Stone");
  });
});

describe("a spend in a later era comes out of THAT era's material", () => {
  const ERA_TWO = ERA_SEQUENCE[1]?.id ?? "neolithic";
  /**
   * A node BELONGING to era two. The grant path resolves the material from the NODE's
   * era, not the city's, so completing an era-one lesson while standing in era two
   * credits stone and leaves the era-two stockpile at zero — which is the wallet
   * behaving correctly and would make this test measure nothing.
   */
  const ERA_TWO_NODE = getEraNodes(ERA_TWO)[0] ?? "";
  /** Era two's cheapest civic row, read off the catalogue rather than written down. */
  const ERA_TWO_BUILDING = [...civicCatalogueForEra(ERA_TWO)].sort(
    (a, b) => a.cost - b.cost,
  )[0];

  it("refuses a build the road spend has already claimed, at the era's price", async () => {
    // **THE DOUBLE-SPEND THE DECORATOR EXISTS TO PREVENT, and the era is load-bearing in
    // it.** The decorator nets the road spend off `spendable`; the base client cannot see
    // that counter and would happily debit the raw balance. So the guard is the only
    // thing standing between a road tile and a building funded by the same material.
    //
    // The wallet is netted to one unit short of the building's cost, which is the only
    // band where a guard reading the wrong stockpile and a guard reading the right one
    // disagree. Funding it comfortably instead makes both answer "buy" and measures
    // nothing.
    expect(ERA_TWO_NODE).not.toBe("");
    expect(ERA_TWO_BUILDING).toBeDefined();
    const cost = ERA_TWO_BUILDING?.cost ?? 0;
    expect(cost).toBeGreaterThan(0);

    setCityEra(ERA_TWO);
    const base = createInMemoryEconomyClient();
    await base.reportLessonComplete({ nodeId: ERA_TWO_NODE });
    const raw = (await base.getWallet()).spendable;
    expect(raw).toBeGreaterThan(cost);
    // The material really is era two's, not era one's — the whole point of the repoint.
    expect((await base.getWallet()).spendableMaterial?.id).toBe(
      materialForEra(ERA_TWO)?.id,
    );

    const decorated = createRoadSpendEconomy(base, () => raw - (cost - 1));
    expect((await decorated.getWallet()).spendable).toBe(cost - 1);

    const outcome = await decorated.purchaseCivicBuilding({
      placementId: `civic:${ERA_TWO_BUILDING?.id}:0`,
      building: ERA_TWO_BUILDING?.id ?? "",
    });
    expect(outcome.status).toBe("insufficient_material");
    // Fail-closed: the underlying ledger is untouched, so the roads keep their material.
    expect((await base.getWallet()).spendable).toBe(raw);
  });

  it("takes exactly the era's price when the wallet does cover it", async () => {
    const cost = ERA_TWO_BUILDING?.cost ?? 0;
    setCityEra(ERA_TWO);
    const base = createInMemoryEconomyClient();
    await base.reportLessonComplete({ nodeId: ERA_TWO_NODE });
    const decorated = createRoadSpendEconomy(base, () => 0);
    const before = (await decorated.getWallet()).spendable;

    const outcome = await decorated.purchaseCivicBuilding({
      placementId: `civic:${ERA_TWO_BUILDING?.id}:1`,
      building: ERA_TWO_BUILDING?.id ?? "",
    });

    expect(outcome.status).toBe("spent");
    const taken = before - (await decorated.getWallet()).spendable;
    expect(taken).toBe(cost);
    // And it came out of the era's own stockpile, which is the row on the ledger.
    const rows = base.snapshot().entries.filter((entry) => entry.kind === "spend");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.resource_type).toBe(materialForEra(ERA_TWO)?.id);
  });
});

describe("what a learner is told matches what they were paid", () => {
  it("names the era's material in the earn toast", async () => {
    const eraTwo = ERA_SEQUENCE[1]?.id ?? "neolithic";
    setCityEra(eraTwo);
    const paid = lessonMaterialAmount(eraTwo);
    expect(paid).toBeGreaterThan(0);
    // The grant path has resolved the node's era since before #309, so the credit was
    // always era two's material; only the SENTENCE was pinned.
    expect(materialWord(eraTwo)).not.toBe("stone");
  });
});

/**
 * The 38 sentences downstream of the material word — the road builder, the crisis
 * repair panel, the reward toasts and the coach marks — all inherited era one from a
 * module constant. Two of them are checked HERE, rendered rather than read, because a
 * repointed helper that no surface passes an era to would still print "stone".
 */
describe("the surfaces built from that word follow the era too", () => {
  it("prices a road tile in the era's material on the build menu", async () => {
    const user = userEvent.setup();
    const eraTwo = ERA_SEQUENCE[1]?.id ?? "neolithic";
    const word = materialWord(eraTwo);
    expect(word).not.toBe(materialWord(ERA_SEQUENCE[0]?.id ?? "prehistoric"));

    render(
      <CitySurface
        enableCanvas={false}
        eraId={eraTwo}
        goldAvailable={200}
        loadCity={() =>
          Promise.resolve({ node_states: [], neighborhood_state: null } as CityLoad)
        }
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    await user.click(screen.getByRole("button", { name: "Build" }));
    const shop = await screen.findByRole("dialog");
    await user.click(within(shop).getByRole("tab", { name: "Roads" }));

    const card = shop.querySelector<HTMLElement>('button[data-node-id="roads"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain(`${ROAD_TILE_GOLD_COST} ${word} per tile`);
    expect(card?.textContent).not.toContain("stone");
  });

  it("names the era's material in the coach mark that teaches the economy", () => {
    const eraTwo = ERA_SEQUENCE[1]?.id ?? "neolithic";
    const economy = COACH_MARKS.find((mark) => mark.id === "economy");
    const roads = COACH_MARKS.find((mark) => mark.id === "roads");
    expect(economy).toBeDefined();
    expect(roads).toBeDefined();
    for (const mark of [economy, roads]) {
      expect(mark?.text(eraTwo)).toContain(materialWord(eraTwo));
      expect(mark?.text(eraTwo)).not.toContain("stone");
    }
    // The How to play card's section heading is the same word, capitalised.
    expect(coachGroupLabel("gold", eraTwo)).toBe(materialWordCapitalised(eraTwo));
    expect(coachGroupLabel("gold", eraTwo)).not.toBe("Stone");
  });
});
