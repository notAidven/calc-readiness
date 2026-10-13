import { ERA_SEQUENCE, type EraId, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  CIVIC_CATALOGUE,
  CIVIC_ROLES,
  civicBuildingForRole,
  civicBuildingOrThrow,
  civicCatalogueForEra,
  civicFootprintCells,
  findCivicBuilding,
} from "./civicCatalogue";
import { ERA_MATERIALS } from "./materials";

/**
 * The catalogue's INTERNAL invariants and its lookups.
 *
 * Deliberately not the same claims as `test/eraCivicCatalogueParity.test.ts`, which
 * owns "these forty rows equal the ten authored tables" and needs `node:fs` to say
 * so. This file owns what is true of the shipped data on its own terms, and runs
 * inside the zero-I/O package.
 */

describe("the catalogue is forty rows, four per era, ids that cannot collide", () => {
  it("holds exactly four rows for every era in the shipped sequence", () => {
    // A CENSUS over the sequence rather than a count of the catalogue: a count of 40
    // is satisfied by eight eras of five, and a per-era count is satisfied by an era
    // the sequence does not contain.
    expect(
      ERA_SEQUENCE.map((era) => [era.id, civicCatalogueForEra(era.id).length] as const),
    ).toEqual(ERA_SEQUENCE.map((era) => [era.id, 4] as const));
    expect(CIVIC_CATALOGUE.length).toBe(4 * ERA_SEQUENCE.length);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every row a unique id that names its own era", () => {
    const ids = CIVIC_CATALOGUE.map((building) => building.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const building of CIVIC_CATALOGUE) {
      // The prefix is not decoration: it is what makes two eras' identically-roled
      // buildings distinguishable in a stored placement.
      expect(building.id.startsWith(`${building.era}_`), building.id).toBe(true);
    }
  });

  it("prices every row in the material its own era mints", () => {
    for (const building of CIVIC_CATALOGUE) {
      expect(building.material, building.id).toBe(ERA_MATERIALS[building.era].material.id);
    }
  });

  it("gives every row a positive cost, footprint and contribution", () => {
    for (const building of CIVIC_CATALOGUE) {
      expect(building.cost, building.id).toBeGreaterThan(0);
      expect(civicFootprintCells(building), building.id).toBeGreaterThan(0);
      const { livability, happiness } = building.provides;
      // A row provides SOMETHING. A zero-and-zero row would be dominated by
      // everything and would be free capacity nobody could ever want.
      expect(livability + happiness, building.id).toBeGreaterThan(0);
    }
  });
});

describe("contributions follow the era ladder; COSTS deliberately do not", () => {
  const ladder = (eraId: EraId): number => 2 ** (eraNumber(eraId) - 1);

  it("scales each era's headline magnitude by exactly 2^(N-1)", () => {
    // The dwelling row's livability is the era's headline magnitude, and era one's is
    // 20. Asserted across all ten so a re-tuned era cannot silently leave the ladder.
    for (const era of ERA_SEQUENCE) {
      const dwelling = civicBuildingForRole(era.id, "dwelling");
      expect(dwelling.provides.livability, dwelling.id).toBe(20 * ladder(era.id));
    }
  });

  it("does NOT derive cost from the ladder — era seven prices food below it", () => {
    // The counterexample, pinned so nobody replaces the authored costs with a
    // multiplier. Era seven's food row is "the cheapest livability in the run so
    // far" at 3,840 coal where the ladder would say 5,120, and that is the design.
    const foodRow = civicBuildingForRole("industrial", "food");
    expect(foodRow.cost).toBe(3840);
    expect(80 * ladder("industrial")).toBe(5120);
    expect(foodRow.cost).toBeLessThan(80 * ladder("industrial"));
  });

  it("keeps era ten the ONE era whose food row costs more than its dwelling", () => {
    // The pair the dominance guard's exceptions machinery was built for and then
    // deleted for. Asserted as a census over all ten rather than as a fact about one,
    // so a second era drifting into the same shape is visible here.
    const dearerFood = ERA_SEQUENCE.filter(
      (era) =>
        civicBuildingForRole(era.id, "food").cost >
        civicBuildingForRole(era.id, "dwelling").cost,
    ).map((era) => era.id);
    expect(dearerFood).toEqual(["cyberpunk"]);
  });
});

describe("lookups", () => {
  it("finds a building by id and returns null — never throws — for an unknown one", () => {
    // The id and the name are DIFFERENT STRINGS for this row, which is what makes it
    // the right fixture: #244 renamed it to *The Family Lodge* and the id did not move.
    expect(findCivicBuilding("prehistoric_longhouse")?.name).toBe("The Family Lodge");
    expect(findCivicBuilding("nope")).toBeNull();
    // The id is stable across a display rename, and the display name is never a key:
    // `prehistoric_longhouse` still resolves after the 2026-07-29 rename, and neither
    // the new name nor the old one is a lookup.
    expect(findCivicBuilding("The Family Lodge")).toBeNull();
    expect(findCivicBuilding("The Longhouse")).toBeNull();
  });

  it("throws loudly on an unknown id when the caller asked for a building", () => {
    // Fail-loud, per `materialForEraOrThrow`: a purchase resolving an unknown id to a
    // free, contribution-less placeholder is strictly worse than one that stops.
    expect(() => civicBuildingOrThrow("nope")).toThrow(/no civic building "nope"/);
    // And the message says what an id looks like, since the likely mistake is
    // passing a display name.
    expect(() => civicBuildingOrThrow("The Family Lodge")).toThrow(/not an id/);
  });

  it("resolves every (era, role) pair — the totality O-4 depends on", () => {
    // 40 lookups, all four roles in all ten eras. This is the property that makes
    // `civicTeardownCost` unable to fail: "the current era's cost for that type"
    // always has an answer.
    const resolved = ERA_SEQUENCE.flatMap((era) =>
      CIVIC_ROLES.map((role) => civicBuildingForRole(era.id, role).id),
    );
    expect(resolved.length).toBe(40);
    expect(new Set(resolved).size).toBe(40);
  });

  it("reads a footprint as AREA, and 1x2 and 2x1 are the same area", () => {
    const clinic = civicBuildingOrThrow("information_age_clinic");
    const communityCentre = civicBuildingOrThrow("atomic_age_community_centre");
    expect(civicFootprintCells(clinic)).toBe(2);
    expect(civicFootprintCells(communityCentre)).toBe(2);
    // Same area, different shape — which is why the catalogue stores both and the
    // parity test compares both.
    expect(clinic.footprint).toEqual({ width: 1, depth: 2 });
    expect(communityCentre.footprint).toEqual({ width: 2, depth: 1 });
  });
});

/**
 * **THE HOSPITAL MOVED ERAS, AND THE IDS DID NOT MOVE WITH IT.**
 *
 * #244 took *The Hospital* from Early Modern to the Information Age, so
 * `renaissance_hospital` holds *The Painters' School* and `information_age_clinic` holds
 * *The Hospital*. Both ids stay: an id is a stable key a placement records, not a
 * description, and `CivicBuildingDefinition`'s docblock carries the full argument.
 *
 * Pinned here rather than only commented, because a comment cannot stop the next reader
 * from tidying it. This fails BOTH ways — if an id is renamed to match its name, and if
 * a name moves back to match its id — so either becomes a deliberate act with this file
 * to edit rather than a silent one.
 */
describe("the two rows whose id and name deliberately disagree", () => {
  const MOVED: readonly { readonly id: string; readonly name: string }[] = [
    { id: "renaissance_hospital", name: "The Painters' School" },
    { id: "information_age_clinic", name: "The Hospital" },
  ];

  it.each(MOVED)(
    "$id still holds $name, and its id has not been tidied",
    ({ id, name }) => {
      const building = findCivicBuilding(id);
      expect(
        building,
        `${id} no longer exists. If it was renamed to match its display name, that is a ` +
          `deliberate change and this entry should go with it — see CivicBuildingDefinition.`,
      ).not.toBeNull();
      expect(building?.name).toBe(name);
      // The disagreement itself, which is the whole claim: a slug of the display name
      // would not be this id.
      expect(id).not.toContain(name.replace(/^The /, "").toLowerCase().split(" ")[0]);
    },
  );

  it("keeps the hospital's name in exactly one era, and the ids in the other order", () => {
    // The swap stated as a whole, so a half-applied rename fails. Era six's id says
    // hospital and era nine's row says Hospital — crossed, and that is correct.
    const named = CIVIC_CATALOGUE.filter((b) => b.name === "The Hospital");
    expect(named.map((b) => b.id)).toEqual(["information_age_clinic"]);
    const idSaysHospital = CIVIC_CATALOGUE.filter((b) => b.id.includes("hospital"));
    expect(idSaysHospital.map((b) => b.name)).toEqual(["The Painters' School"]);
  });
});
