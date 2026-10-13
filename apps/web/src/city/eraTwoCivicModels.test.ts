import { CIVIC_CATALOGUE } from "@cr/economy";
import { ERA_ONE_CIVIC_TYPES } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { cityModelUrls, MODEL_STAGES } from "./buildingAssets";
import {
  CIVIC_BUNDLED_STAGES,
  CIVIC_MODEL_TYPE_IDS,
  CIVIC_TYPE_IDS,
  CIVIC_UNBUNDLED_STAGES,
  civicBuildingName,
  civicFilePrefix,
  civicFootprint,
  civicModelBasename,
  civicModelUrls,
  ERA_EIGHT_CIVIC_TYPE_IDS,
  ERA_FIVE_CIVIC_TYPE_IDS,
  ERA_FOUR_CIVIC_TYPE_IDS,
  ERA_NINE_CIVIC_TYPE_IDS,
  ERA_SEVEN_CIVIC_TYPE_IDS,
  ERA_TEN_CIVIC_TYPE_IDS,
  ERA_THREE_CIVIC_TYPE_IDS,
  ERA_TWO_CIVIC_TYPE_IDS,
  hasCivicModel,
  isCivicType,
  resolveCivicModel,
} from "./civicBuildings";
import { CURRENT_ERA_ID } from "./eraDressing";
import {
  DEFAULT_TOWN_HALL_DOMAIN,
  hasAuthoredEraTownHall,
  resolveEraTownHall,
  resolveTownHallModel,
  TOWN_HALL_ERA_MODELS,
  TOWN_HALL_ID,
  TOWN_HALL_STAGES,
  townHallModelUrls,
} from "./townHall";

/**
 * ERA TWO'S FOUR CIVIC BUILDINGS AND ITS HUB — the models exported from
 * `art/building-sources/era-02-neolithic-all-buildings.dc.html` by
 * `scripts/export-era-two-civic-models.mjs`.
 *
 * ## WHAT THIS FILE IS WRITTEN AGAINST, AND WHY IT IS A SEPARATE FILE
 *
 * The defect is the one `civicBuildings.ts`'s header names: **a model no loader can
 * resolve**. Era two makes that easy to ship, for a reason era one did not have — **era two
 * cannot render in the city at all.** Its nodes are `product_scope: "target"`, MVP is
 * pinned at 6, and `CURRENT_ERA_ID` derives from `ERA_SEQUENCE[0]`, so no in-city surface
 * touches these files. Five GLBs could sit in the tree unreachable through the registry and
 * every existing suite would stay green, because every existing suite iterates era one.
 * That is the emptiness this file exists to make impossible.
 *
 * It is separate from `civicBuildings.test.ts` because that file's population is
 * deliberately `ERA_ONE_CIVIC_TYPES`, and its header argues for that at length. Widening it
 * in place would have replaced a correct narrow claim with a broader one and lost the
 * narrow one. This file adds the era-two claim beside it.
 *
 * ## THE POPULATION IS THE CATALOGUE AT THE TIP, FILTERED TO `neolithic`
 *
 * Not a list written down here, because a list is what drifts: **Gabriel's `#243` renamed
 * several civic rows on 29–30 July** (era one's 1×1 became *The Spring*, its dwelling *The
 * Family Lodge*). Every sweep below iterates `ERA_TWO_CIVIC_TYPE_IDS`, which is one filter
 * over `CIVIC_CATALOGUE`. A fifth era-two row arriving in the economy lane therefore fails
 * HERE as a missing model rather than being silently unrenderable.
 *
 * **Deriving is not the same as deriving CORRECTLY**, so the derivation is checked against
 * the tree two ways rather than trusted: a floor of four AND a `built`-file assertion per
 * member, so an era filter that returned the wrong set (or none) cannot pass.
 */

/**
 * THE FIVE BASENAMES THIS LANE OWNS, written down ONCE and asserted against the derivation
 * rather than used as the population.
 *
 * This is a coordination record, not the source of truth. A parallel lane is exporting era
 * two's FIVE SKILL buildings into the same flat directory in the same hour; a basename
 * registry with two owners for one key is decided by glob order, so the two lanes' names
 * have to be provably disjoint. The skill lane's are node-derived (`exp-1-*`, `rad-1-*` …
 * through `nodeFilePrefix`); these five are not, and cannot be, because a civic type is not
 * a graph node and the hub is a sentinel.
 *
 * Asserted BOTH ways below: a derived basename missing from this list fails, and a listed
 * basename the derivation no longer produces fails too.
 */
const OWNED_CIVIC_BASENAMES = [
  "civic-neolithic-granary-built.glb",
  "civic-neolithic-village-houses-built.glb",
  "civic-neolithic-bread-oven-built.glb",
  "civic-neolithic-village-well-built.glb",
] as const;

const OWNED_HUB_BASENAME = "townhall-neolithic-built.glb";

describe("era two's civic type ids come from the catalogue at the tip", () => {
  it("derives exactly the four `neolithic` rows, with a floor under the filter", () => {
    const rows = CIVIC_CATALOGUE.filter((row) => row.era === "neolithic");
    // THE FLOOR. Every set comparison in this file is free over an empty population, and an
    // empty one is exactly what a renamed era id or a moved table would silently produce.
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect([...ERA_TWO_CIVIC_TYPE_IDS].sort()).toEqual([...rows.map((r) => r.id)].sort());
    expect(new Set(ERA_TWO_CIVIC_TYPE_IDS).size).toBe(ERA_TWO_CIVIC_TYPE_IDS.length);

    // The four ids and display names as authored, pinned by name. A loop over a derived
    // list proves the list is self-consistent; it proves nothing about WHICH rows are in
    // it, and "which rows" is the thing that moved twice this week.
    expect([...ERA_TWO_CIVIC_TYPE_IDS].sort()).toEqual([
      "neolithic_bread_oven",
      "neolithic_granary",
      "neolithic_village_houses",
      "neolithic_village_well",
    ]);
    expect(civicBuildingName("neolithic_granary")).toBe("The Granary");
    expect(civicBuildingName("neolithic_village_houses")).toBe("The Village Houses");
    expect(civicBuildingName("neolithic_bread_oven")).toBe("The Bread Oven");
    expect(civicBuildingName("neolithic_village_well")).toBe("The Village Well");
  });

  /**
   * ONE ROLE EACH — food, dwelling, amenity, blend — which is D-ERA24's no-dominated-row
   * guard and the reason there are exactly four. Asserted as a SET EQUALITY over the roles
   * rather than a count, because four rows sharing two roles would satisfy a count.
   */
  it("fills all four civic roles exactly once", () => {
    const roles = CIVIC_CATALOGUE.filter((row) => row.era === "neolithic").map(
      (row) => row.role,
    );
    expect(roles.length).toBe(4);
    expect([...roles].sort()).toEqual(["amenity", "blend", "dwelling", "food"]);
  });

  /**
   * THE FOOTPRINTS THE ART WAS MODELLED TO, pinned at the tip so a plot change cannot land
   * silently underneath the models.
   *
   * **A PLOT CHANGE IS PENDING AND IS NOT DECIDED.** A live proposal would move the Granary
   * to 1×1, the Bread Oven to 3×2 and the Village Well to 2×1, and Evan has three rulings
   * outstanding on it. The art is modelled to what is AUTHORED here. If the proposal lands
   * this test fails first, which is the point: the models would then need RE-FITTING and not
   * re-drawing, since `PlacedBuilding.prepareModel` contain-fits whatever it is handed.
   */
  it("pins the authored footprints the models were fitted to (a plot change is pending)", () => {
    expect(civicFootprint("neolithic_granary")).toEqual({ w: 2, d: 1 });
    expect(civicFootprint("neolithic_village_houses")).toEqual({ w: 2, d: 2 });
    expect(civicFootprint("neolithic_bread_oven")).toEqual({ w: 2, d: 2 });
    expect(civicFootprint("neolithic_village_well")).toEqual({ w: 1, d: 1 });
    // Every era-two type has a footprint at all — so a fifth row cannot arrive with none.
    for (const id of ERA_TWO_CIVIC_TYPE_IDS) {
      const footprint = civicFootprint(id);
      expect(footprint, `${id} footprint`).not.toBeNull();
      expect((footprint?.w ?? 0) * (footprint?.d ?? 0)).toBeGreaterThan(0);
    }
  });
});

describe("era two's four civic models resolve through the registry", () => {
  /**
   * THE LOAD-BEARING ASSERTION OF THIS FILE. Delete any one of the four GLBs and this fails
   * at that id with `expected null not to be null`; put them in an `art/models/civic/`
   * subdirectory instead and it fails at `kind` being the procedural stand-in rather than
   * `"glb"`, because the glob is non-recursive. Both were verified by injection.
   */
  it("resolves a BUNDLED glb for every era-two type at the one committed stage", () => {
    // The floor, first: a `toBeGreaterThanOrEqual` on an empty loop asserts nothing.
    expect(ERA_TWO_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    for (const id of ERA_TWO_CIVIC_TYPE_IDS) {
      for (const stage of CIVIC_BUNDLED_STAGES) {
        const resolved = resolveCivicModel(id, stage);
        expect(resolved, `${id}/${stage} must resolve`).not.toBeNull();
        // "A model exists on disk" and "a model is reachable through the glob" are
        // different claims, and a subdirectory satisfies the first while failing this.
        expect(resolved?.kind, `${id}/${stage} must be a bundled file`).toBe("glb");
        expect((resolved?.url ?? "").length, `${id}/${stage} url`).toBeGreaterThan(0);
        expect(resolved?.node_id).toBe(id);
        expect(resolved?.modelStage).toBe(stage);
      }
    }
    // DISTINCT ACROSS TYPES, so four buildings are not one mass wearing four labels — the
    // claim a per-type loop structurally cannot make.
    const built = ERA_TWO_CIVIC_TYPE_IDS.map((id) => resolveCivicModel(id)?.url);
    expect(new Set(built).size).toBe(ERA_TWO_CIVIC_TYPE_IDS.length);
    // And distinct from era one's four, which stand simultaneously with them (civic
    // buildings are never removed), so a key collision would show as one shared file.
    const eraOne = CIVIC_TYPE_IDS.map((id) => resolveCivicModel(id)?.url);
    expect(new Set([...built, ...eraOne]).size).toBe(built.length + eraOne.length);
  });

  it("defaults to `built`, the only stage a purchase resolves", () => {
    for (const id of ERA_TWO_CIVIC_TYPE_IDS) {
      expect(resolveCivicModel(id)?.url).toBe(resolveCivicModel(id, "built")?.url);
      expect(resolveCivicModel(id)?.modelStage).toBe("built");
      expect(resolveCivicModel(id)?.kind, id).toBe("glb");
    }
  });

  /**
   * THE EIGHT EARLY-STAGE FILES ARE DELIBERATELY NOT COMMITTED, exactly as era one's eight
   * are, and that is an exception so it is asserted against the REAL glob in BOTH
   * directions rather than against the list's own contents.
   *
   * Era one's set established this: all twelve were committed, eight were shown unreachable,
   * and `d9328f8` deleted them for 2.56 MB of `dist`. Era two goes further — its source
   * authors NO `frame()` for a civic type at all (`_nFrames()` has entries for the five
   * skill buildings and the hub only), so a committed civic `construction` would be a
   * scaffold with no building inside it.
   */
  it("declares exactly the era-two stages with no committed file, checked against the glob", () => {
    const bundledByGlob = MODEL_STAGES.filter((stage) =>
      ERA_TWO_CIVIC_TYPE_IDS.every((id) => resolveCivicModel(id, stage)?.kind === "glb"),
    );
    const unbundledByGlob = MODEL_STAGES.filter((stage) =>
      ERA_TWO_CIVIC_TYPE_IDS.every((id) => resolveCivicModel(id, stage)?.kind === stage),
    );
    expect(ERA_TWO_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(bundledByGlob.length).toBeGreaterThanOrEqual(1);
    expect(unbundledByGlob.length).toBeGreaterThanOrEqual(2);
    expect([...bundledByGlob]).toEqual([...CIVIC_BUNDLED_STAGES]);
    expect([...unbundledByGlob]).toEqual([...CIVIC_UNBUNDLED_STAGES]);
    // Disjoint and together the whole authored population, so neither list can grow until
    // it has swallowed the set it is an exemption from.
    expect(
      CIVIC_BUNDLED_STAGES.filter((s) => CIVIC_UNBUNDLED_STAGES.includes(s)),
    ).toHaveLength(0);
    expect([...CIVIC_BUNDLED_STAGES, ...CIVIC_UNBUNDLED_STAGES].sort()).toEqual(
      [...MODEL_STAGES].sort(),
    );
  });

  /**
   * AN UNCOMMITTED EARLY STAGE MUST NOT ANSWER `null`. Every caller reads `null` as "empty
   * pad", so a future build beat on purchase would render nothing with every test green.
   */
  it("answers an era-two early stage with the procedural stand-in, never null", () => {
    for (const id of ERA_TWO_CIVIC_TYPE_IDS) {
      for (const stage of CIVIC_UNBUNDLED_STAGES) {
        const resolved = resolveCivicModel(id, stage);
        expect(resolved, `${id}/${stage} must not be a silent empty pad`).not.toBeNull();
        expect(resolved?.kind, `${id}/${stage}`).toBe(stage);
        expect(resolved?.url, `${id}/${stage} has no file to point at`).toBeNull();
      }
    }
  });

  it("recognizes every model-backed catalogue identity plus the legacy Era 1 keys", () => {
    expect(ERA_TWO_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_THREE_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_FOUR_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_FIVE_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_SEVEN_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_EIGHT_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_NINE_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_TEN_CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    const catalogueModelIds = [
      ...ERA_TWO_CIVIC_TYPE_IDS,
      ...ERA_THREE_CIVIC_TYPE_IDS,
      ...ERA_FOUR_CIVIC_TYPE_IDS,
      ...ERA_FIVE_CIVIC_TYPE_IDS,
      ...ERA_SEVEN_CIVIC_TYPE_IDS,
      ...ERA_EIGHT_CIVIC_TYPE_IDS,
      ...ERA_NINE_CIVIC_TYPE_IDS,
      ...ERA_TEN_CIVIC_TYPE_IDS,
    ];
    for (const id of catalogueModelIds) {
      expect(hasCivicModel(id), `${id} has art`).toBe(true);
      expect(isCivicType(id), `${id} is a known catalogue identity`).toBe(true);
    }
    for (const id of CIVIC_TYPE_IDS) {
      expect(hasCivicModel(id), `${id} has art`).toBe(true);
      expect(isCivicType(id), `${id} remains a readable legacy identity`).toBe(true);
    }
    // The model population is exactly the union and holds nothing else.
    expect([...CIVIC_MODEL_TYPE_IDS].sort()).toEqual(
      [
        ...CIVIC_TYPE_IDS,
        ...ERA_TWO_CIVIC_TYPE_IDS,
        ...ERA_THREE_CIVIC_TYPE_IDS,
        ...ERA_FOUR_CIVIC_TYPE_IDS,
        ...ERA_FIVE_CIVIC_TYPE_IDS,
        ...ERA_SEVEN_CIVIC_TYPE_IDS,
        ...ERA_EIGHT_CIVIC_TYPE_IDS,
        ...ERA_NINE_CIVIC_TYPE_IDS,
        ...ERA_TEN_CIVIC_TYPE_IDS,
      ].sort(),
    );
    expect(catalogueModelIds).toEqual(
      CIVIC_CATALOGUE.filter((row) => row.era !== "prehistoric")
        .map((row) => row.id)
        .filter((id) => hasCivicModel(id)),
    );
    expect(new Set(CIVIC_MODEL_TYPE_IDS).size).toBe(CIVIC_MODEL_TYPE_IDS.length);
    // Era one's ids are UNPREFIXED and era two's are era-prefixed, which is what makes the
    // two id spaces collision-free without a rename of four shipped files.
    for (const id of CIVIC_TYPE_IDS) {
      expect(Object.keys(ERA_ONE_CIVIC_TYPES)).toContain(id);
      expect(id.startsWith("neolithic_")).toBe(false);
    }
  });
});

describe("the basenames this lane owns, against the lane exporting beside it", () => {
  /**
   * BOTH DIRECTIONS against the derivation, so this record cannot go stale in either
   * direction: a type whose basename is not listed fails, and a listed basename the
   * derivation no longer produces fails.
   */
  it("derives exactly the four civic basenames it claims", () => {
    const derived = ERA_TWO_CIVIC_TYPE_IDS.map((id) => civicModelBasename(id, "built"));
    expect(derived.length).toBeGreaterThanOrEqual(4);
    expect([...derived].sort()).toEqual([...OWNED_CIVIC_BASENAMES].sort());
    // The documented key, exercised on the ids that actually contain underscores — era
    // two's all do, where era one had exactly one.
    for (const id of ERA_TWO_CIVIC_TYPE_IDS) {
      expect(id).toMatch(/_/);
      expect(civicFilePrefix(id)).toBe(`civic-${id.replace(/_/g, "-")}`);
      expect(civicFilePrefix(id)).not.toMatch(/_/);
    }
  });

  /**
   * DISJOINT FROM THE SKILL LANE'S SPACE, measured over the real glob rather than agreed in
   * a message. The skill registry excludes `civic-*` and is non-recursive; the hub lives in
   * `townhall/`. So every url in this lane's five must be absent from the skill set, and
   * the skill set must be non-empty for that to mean anything.
   */
  it("shares no url with the skill-node registry", () => {
    const skill = new Set(cityModelUrls());
    expect(skill.size).toBeGreaterThanOrEqual(18);
    const mine = [
      ...ERA_TWO_CIVIC_TYPE_IDS.map((id) => resolveCivicModel(id)?.url),
      resolveEraTownHall("neolithic", CURRENT_ERA_ID).model?.url,
    ];
    expect(mine).toHaveLength(5);
    for (const url of mine) {
      expect(url, "every owned url resolves").toBeTruthy();
      expect(skill.has(url as string), `${url} leaked into the skill set`).toBe(false);
    }
    expect(new Set(mine).size).toBe(5);
    // And no owned basename is node-derivable, which is what makes the two spaces disjoint
    // by construction rather than by today's names happening not to clash.
    for (const name of [...OWNED_CIVIC_BASENAMES, OWNED_HUB_BASENAME]) {
      expect(name.startsWith("civic-") || name.startsWith("townhall-")).toBe(true);
    }
  });
});

describe("era two's hub re-themes the same placement", () => {
  /**
   * THE HUB IS NOT A CIVIC BUILDING AND IS NOT ADDRESSED LIKE ONE. It has no type id — it is
   * a sentinel — so its basenames are named EXPLICITLY in `TOWN_HALL_ERA_MODELS` and live in
   * the `townhall/` subdirectory behind a dedicated glob, which is what keeps them
   * additional to the skill set's pinned count rather than part of it.
   *
   * ⚑ ERAS ONE AND TWO'S ARTWORK WAS SWAPPED (2026-08-20, explicit product instruction), so
   * this describe block's assertions were re-pointed at `prehistoric` rather than
   * `neolithic`: `TOWN_HALL_ERA_MODELS.prehistoric` is now `OWNED_HUB_BASENAME` (the
   * Shrine/Elders' Hearth GLB this lane exported), and `TOWN_HALL_ERA_MODELS.neolithic` is
   * now the plain `townhall-built.glb` era one always shipped. The FILES and the CLAIMS this
   * lane makes about them are unchanged — only which era key resolves to which file moved.
   */
  it("resolves era two's Shrine at `built`, on the hub's own sentinel", () => {
    const resolved = resolveEraTownHall("prehistoric", CURRENT_ERA_ID).model;
    expect(resolved).not.toBeNull();
    expect(resolved?.kind).toBe("glb");
    expect(resolved?.node_id).toBe(TOWN_HALL_ID);
    expect((resolved?.url ?? "").length).toBeGreaterThan(0);
    // A DIFFERENT FILE from the plain island hall. Without this the era argument could be
    // dropped entirely and every assertion above would still pass on the Stone Circle.
    const plainHall = resolveTownHallModel("built", DEFAULT_TOWN_HALL_DOMAIN);
    expect(plainHall?.url).toBeTruthy();
    expect(resolved?.url).not.toBe(plainHall?.url);
  });

  /**
   * ONLY `built` IS COMMITTED FOR THE HUB TOO, and for a reason of its own rather than the
   * civic one: **D-TH4 was REVERSED on 2026-07-26** — the hall no longer builds itself
   * through completion-driven stages, so `resolveTownHallModel` is only ever called with
   * `built`. Era one's hub still carries all three files; that is a pre-reversal artefact,
   * not a convention worth copying at 1.4 MB.
   *
   * Both directions against the real glob: an early stage that turns out to be bundled
   * fails, and `built` failing to be bundled fails.
   */
  it("commits `built` alone, and the era axis asks for nothing else", () => {
    // REWRITTEN AT THE 2026-07-30 MERGE. This case used to drive an `era` parameter on
    // `resolveTownHallModel` over all three stages, because this lane's table held a
    // `[site, construction, built]` triple. `integration`'s era-advance lane
    // (`game/era-one-to-two-transition`) replaced that with `resolveEraTownHall` over ONE
    // finished basename per era, on the reasoning that the ceremony draws its own six
    // construction stages rather than swapping island geometry — so an era owes one GLB and
    // nobody authors thirty. Their shape is kept and this asserts it instead.
    expect(TOWN_HALL_STAGES).toHaveLength(3);
    // The ISLAND axis still has all three stages, and era one still ships all three files.
    const islandBundled = TOWN_HALL_STAGES.filter(
      (stage) => resolveTownHallModel(stage, DEFAULT_TOWN_HALL_DOMAIN)?.kind === "glb",
    );
    expect(islandBundled).toEqual([...TOWN_HALL_STAGES]);
    // The ERA axis names one basename per era, and this lane's exported file is now
    // `prehistoric`'s (the eras 1/2 artwork swap, see the describe block's header).
    expect(TOWN_HALL_ERA_MODELS.prehistoric).toBe(OWNED_HUB_BASENAME);
  });

  /**
   * **THE CLAIM GABRIEL'S "I can't find an era-two town hall" WAS ABOUT.**
   *
   * `integration`'s resolver deliberately does not fail loud on a missing hall — a blank
   * island is worse than a visibly-era-one one — so it REPORTS instead:
   * `art: "fallback"` means the era declares a hall the bundle does not have. That is the
   * state `integration` is in, and it is what his rebuild reported.
   *
   * On this branch the asset is committed (`3e48455`), so era two must resolve
   * **`authored`**. Asserted in both directions against the real glob, so neither a deleted
   * GLB nor a silently renamed one can pass: `authored` requires the file, and era ten —
   * which declares no hall at all — must still read `unauthored` rather than accidentally
   * resolving something.
   */
  it("resolves era two's hall as AUTHORED, not as the reported fallback", () => {
    expect(hasAuthoredEraTownHall("prehistoric")).toBe(true);
    const shrine = resolveEraTownHall("prehistoric", CURRENT_ERA_ID);
    expect(shrine.art).toBe("authored");
    expect(shrine.showing_era).toBe("prehistoric");
    expect(shrine.model?.kind).toBe("glb");
    expect(shrine.model?.url).toBeTruthy();
    // And it is genuinely a different file from the plain island hall, which is the whole
    // point of the re-theme: `authored` over that URL would be a green that showed nothing.
    expect(shrine.model?.url).not.toBe(
      resolveTownHallModel("built", DEFAULT_TOWN_HALL_DOMAIN)?.url,
    );
  });

  /**
   * AN ERA WITH NO AUTHORED HUB ART FALLS THROUGH TO THE ISLAND'S OWN, rather than
   * resolving `null`. Scope the population by actual bundled-art behaviour, then reconcile
   * it with the declaration table in both directions.
   */
  it("uses an explicit era-specific fallback for an era with no finished Hall GLB", () => {
    const island = resolveTownHallModel("built", DEFAULT_TOWN_HALL_DOMAIN);
    expect(island?.url).toBeTruthy();
    // After the eras 1/2 artwork swap, `neolithic`'s own entry is the one that resolves to
    // the plain island hall it names — `authored`, not a fall-through, because that era
    // declares the file it actually ships (era one's former `townhall-built.glb`).
    const eraTwo = resolveEraTownHall("neolithic", CURRENT_ERA_ID);
    expect(eraTwo.art).toBe("authored");
    expect(eraTwo.model?.url).toBe(island?.url);
    // An era that declares no GLB renders its own procedural landmark and reports
    // `unauthored`, so a surface can tell that treatment from bundled art.
    const unsupported = ERA_SEQUENCE.map((era) => era.id).filter(
      (eraId) => !hasAuthoredEraTownHall(eraId),
    );
    const undeclared = ERA_SEQUENCE.map((era) => era.id).filter(
      (eraId) => TOWN_HALL_ERA_MODELS[eraId] === undefined,
    );
    // A meaningful floor plus exact current composition: Early Modern is the one real
    // fallback, while all three late-era halls are authored.
    expect(unsupported.length).toBeGreaterThanOrEqual(1);
    expect(unsupported).toEqual(["renaissance"]);
    expect(undeclared).toEqual(unsupported);
    for (const eraId of unsupported) {
      const resolved = resolveEraTownHall(eraId, CURRENT_ERA_ID);
      expect(resolved.art, eraId).toBe("unauthored");
      expect(resolved.showing_era, eraId).toBe(eraId);
      expect(resolved.model, eraId).toMatchObject({ kind: "built", url: null });
    }
    // Both directions on the table: the declared set is exactly the sequence minus the
    // undrawn ones, so a table entry for an era that no longer exists fails here.
    expect(Object.keys(TOWN_HALL_ERA_MODELS).sort()).toEqual(
      ERA_SEQUENCE.map((era) => era.id)
        .filter((eraId) => !unsupported.includes(eraId))
        .sort(),
    );
  });

  it("keeps the hub's urls out of the civic registry, both ways", () => {
    const hall = new Set(townHallModelUrls());
    const civic = new Set(civicModelUrls());
    expect(hall.size).toBeGreaterThanOrEqual(4);
    expect(civic.size).toBe(CIVIC_MODEL_TYPE_IDS.length * CIVIC_BUNDLED_STAGES.length);
    for (const url of hall) {
      expect(civic.has(url), `${url} leaked into the civic set`).toBe(false);
    }
    for (const url of civic) {
      expect(hall.has(url), `${url} leaked into the hall set`).toBe(false);
    }
  });
});
