import { ERA_ONE_CIVIC_TYPES } from "@cr/game";
import { skillGraph } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { cityModelUrls, MODEL_STAGES, nodeFilePrefix } from "./buildingAssets";
import {
  CIVIC_ART,
  CIVIC_BUNDLED_STAGES,
  CIVIC_MODEL_STAGES,
  CIVIC_MODEL_TYPE_IDS,
  CIVIC_TYPE_IDS,
  CIVIC_UNBUNDLED_STAGES,
  type CivicTypeId,
  civicBuildingName,
  civicFilePrefix,
  civicFootprint,
  civicModelBasename,
  civicModelUrls,
  civicTypeModelUrls,
  isCivicType,
  resolveCivicModel,
} from "./civicBuildings";
import { townHallModelUrls } from "./townHall";

/**
 * The four BOUGHT civic buildings' MODEL registry (`civicBuildings.ts`).
 *
 * The failure this file is written against is the one that registry's header names: a
 * model NO LOADER CAN RESOLVE. Civic types are not graph nodes, so their filenames cannot
 * be derived from a node id the way the skill set's are, and every part of the key that
 * had to be built instead is measured here rather than argued in a comment — the
 * population coming from the SHIPPED type table and not from a list, the `civic-` prefix
 * sitting outside the node-derived space, the flat directory being partitioned in BOTH
 * directions, and the footprints coming through the catalogue rather than beside it.
 *
 * ## THE POPULATION IS `ERA_ONE_CIVIC_TYPES`, WHICH IS THE POINT AND NOT A DETAIL
 *
 * Every sweep below iterates `Object.keys(ERA_ONE_CIVIC_TYPES)` (via `CIVIC_TYPE_IDS`,
 * which is itself derived from it). Iterating a list written down in the registry would
 * make the registry mark its own homework: a type present in the economy lane and absent
 * from the art would be invisible, which is exactly the shape of the defect — an
 * unrenderable building — this file exists to catch. So the authority is the table the
 * economy ships and the catalogue guard already binds
 * (`test/eraOneCivicCatalogue.test.ts`), and a fifth type arriving there fails HERE as a
 * missing model.
 */

describe("civic type → GLB registry", () => {
  it("covers every SHIPPED civic type, with the population read off the economy's table", () => {
    const shipped = Object.keys(ERA_ONE_CIVIC_TYPES);
    // The floor, because every sweep below is free over an empty population and an empty
    // one is what a renamed export or a moved table would silently produce.
    expect(shipped.length).toBeGreaterThanOrEqual(4);
    expect([...CIVIC_TYPE_IDS].sort()).toEqual([...shipped].sort());
    expect(new Set(CIVIC_TYPE_IDS).size).toBe(CIVIC_TYPE_IDS.length);
    // Set equality against the art notes too, in both directions: an art note for a type
    // that no longer ships, or a shipped type with no art note, both fail.
    expect(Object.keys(CIVIC_ART).sort()).toEqual([...shipped].sort());
  });

  it("resolves a bundled GLB for every type at the one committed stage", () => {
    for (const id of CIVIC_TYPE_IDS) {
      for (const stage of CIVIC_BUNDLED_STAGES) {
        const resolved = resolveCivicModel(id, stage);
        expect(resolved, `${id}/${stage}`).not.toBeNull();
        // A BUNDLED FILE, not the procedural fail-closed fallback. "A model exists on
        // disk" and "a model is reachable through the glob" are different claims, and a
        // `art/models/civic/` subdirectory would satisfy the first while failing this.
        expect(resolved?.kind, `${id}/${stage}`).toBe("glb");
        expect((resolved?.url ?? "").length, `${id}/${stage} url`).toBeGreaterThan(0);
        expect(resolved?.modelStage).toBe(stage);
        expect(resolved?.node_id).toBe(id);
      }
      // DIFFERENT files per type, so two buildings are not one mass wearing two labels.
      const urls = CIVIC_BUNDLED_STAGES.map((s) => resolveCivicModel(id, s)?.url);
      expect(new Set(urls).size, `${id} distinct stage files`).toBe(
        CIVIC_BUNDLED_STAGES.length,
      );
      expect(civicTypeModelUrls(id)).toEqual(urls);
    }
    // Distinct ACROSS types too — the claim the per-type loop above cannot make.
    const built = CIVIC_TYPE_IDS.map((id) => resolveCivicModel(id)?.url);
    expect(new Set(built).size).toBe(CIVIC_TYPE_IDS.length);
  });

  /**
   * THE EIGHT EARLY-STAGE FILES ARE DELIBERATELY NOT COMMITTED, and that is an exception
   * list, so it is asserted in BOTH directions against the REAL glob rather than against
   * the list's own contents.
   *
   * A civic building is BOUGHT, not built through mastery, so nothing in the shipped design
   * ever asks for `site` or `construction`; committing them cost 2,559,576 bytes of `dist`
   * for a stage no code path reaches. Evan's art is not lost — it regenerates byte-for-byte
   * from his source in one command (`scripts/export-civic-models.mjs`, which pins the eight
   * absent files by SHA-256).
   *
   * - a stage declared UNBUNDLED that turns out to have a file fails, so the declaration
   *   cannot go on excusing an absence that has stopped existing;
   * - a stage NOT declared unbundled that turns out to have no file fails, so a `built`
   *   model deleted by accident cannot hide inside this exemption;
   * - and the two lists must together be exactly the three authored stages, so neither can
   *   grow until it has swallowed the population.
   */
  it("declares exactly the stages with no committed file, checked against the glob", () => {
    const bundledByGlob = CIVIC_MODEL_STAGES.filter((stage) =>
      CIVIC_TYPE_IDS.every((id) => resolveCivicModel(id, stage)?.kind === "glb"),
    );
    const unbundledByGlob = CIVIC_MODEL_STAGES.filter((stage) =>
      CIVIC_TYPE_IDS.every((id) => resolveCivicModel(id, stage)?.kind === stage),
    );
    // Floors, so neither set equality below can hold by both sides being empty.
    expect(CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    expect(bundledByGlob.length).toBeGreaterThanOrEqual(1);
    expect(unbundledByGlob.length).toBeGreaterThanOrEqual(2);
    // Both directions, against the glob and not against the constants' own contents.
    expect([...bundledByGlob]).toEqual([...CIVIC_BUNDLED_STAGES]);
    expect([...unbundledByGlob]).toEqual([...CIVIC_UNBUNDLED_STAGES]);
    // Disjoint, and together the whole authored population — no stage is claimed twice and
    // none goes unclaimed, so the exemption cannot swallow the set it is an exemption from.
    expect(
      CIVIC_BUNDLED_STAGES.filter((s) => CIVIC_UNBUNDLED_STAGES.includes(s)),
    ).toHaveLength(0);
    expect([...CIVIC_BUNDLED_STAGES, ...CIVIC_UNBUNDLED_STAGES].sort()).toEqual(
      [...CIVIC_MODEL_STAGES].sort(),
    );
  });

  /**
   * WHAT A MISSING STAGE RESOLVES TO, made explicit because `null` here is how a future
   * build beat on purchase would render nothing with every test still green. It is the
   * shared neutral procedural stand-in — a visible placeholder, not an absence.
   */
  it("answers an uncommitted early stage with the procedural stand-in, never null", () => {
    for (const id of CIVIC_TYPE_IDS) {
      for (const stage of CIVIC_UNBUNDLED_STAGES) {
        const resolved = resolveCivicModel(id, stage);
        expect(resolved, `${id}/${stage} must not be a silent empty pad`).not.toBeNull();
        expect(resolved?.kind, `${id}/${stage}`).toBe(stage);
        expect(resolved?.url, `${id}/${stage} has no file to point at`).toBeNull();
        expect(resolved?.modelStage).toBe(stage);
        expect(resolved?.node_id).toBe(id);
      }
      // And the url list carries only what is really bundled, so a preload cannot be
      // handed an entry for a file that is not there.
      expect(civicTypeModelUrls(id)).toHaveLength(CIVIC_BUNDLED_STAGES.length);
      for (const url of civicTypeModelUrls(id)) {
        expect(url.length).toBeGreaterThan(0);
      }
    }
  });

  it("defaults to `built`, the only stage a purchase resolves and the only one committed", () => {
    for (const id of CIVIC_TYPE_IDS) {
      expect(resolveCivicModel(id)?.url).toBe(resolveCivicModel(id, "built")?.url);
      expect(resolveCivicModel(id)?.modelStage).toBe("built");
      // The default is a real FILE, not the stand-in the early stages now get — otherwise
      // a deleted `built` model would satisfy every assertion above.
      expect(resolveCivicModel(id)?.kind, id).toBe("glb");
    }
  });

  it("returns null for anything that is not a civic type, including a skill node", () => {
    expect(resolveCivicModel("NUM.S")).toBeNull();
    expect(resolveCivicModel("town-hall")).toBeNull();
    // The ART's own slugs are NOT keys — the registry is keyed on the shipped id.
    expect(resolveCivicModel("lodge")).toBeNull();
    expect(resolveCivicModel("spring")).toBeNull();
    expect(resolveCivicModel("")).toBeNull();
    expect(isCivicType("NUM.S")).toBe(false);
    expect(isCivicType("longhouse")).toBe(true);
    expect(civicFootprint("NUM.S")).toBeNull();
    expect(civicBuildingName("NO.SUCH.TYPE")).toBe("NO.SUCH.TYPE");
  });

  it("builds every basename from the documented key, `civic-<type>-<stage>.glb`", () => {
    // Derived through the prefix helper from the shipped ids, so the documented key and
    // the files on disk are the same claim rather than two.
    for (const id of CIVIC_TYPE_IDS) {
      expect(civicFilePrefix(id)).toBe(`civic-${id.replace(/_/g, "-")}`);
      expect(civicFilePrefix(id)).not.toMatch(/_/);
      for (const stage of CIVIC_MODEL_STAGES) {
        expect(civicModelBasename(id, stage)).toBe(`${civicFilePrefix(id)}-${stage}.glb`);
      }
    }
    // The one id that exercises the `_` → `-` collapse. Pinned by name, because if this
    // is the only underscored id then a generic loop over the ids proves nothing about it.
    expect(CIVIC_TYPE_IDS).toContain<CivicTypeId>("water_spring");
    expect(civicModelBasename("water_spring", "built")).toBe(
      "civic-water-spring-built.glb",
    );
    // The stage words are the SAME three the rest of the city uses, by reference rather
    // than transcription, so the two cannot drift into `frame` vs `construction`.
    expect(CIVIC_MODEL_STAGES).toBe(MODEL_STAGES);
  });

  it("reads names and footprints THROUGH the shipped catalogue table, never beside it", () => {
    for (const id of CIVIC_TYPE_IDS) {
      const row = ERA_ONE_CIVIC_TYPES[id];
      expect(civicBuildingName(id), `${id} name`).toBe(row.name);
      expect(civicFootprint(id), `${id} footprint`).toEqual({
        w: row.footprint[0],
        d: row.footprint[1],
      });
    }
    // And the footprints are the catalogue's actual frozen values, so this cannot pass by
    // both sides reading the same wrong table. §3 at the tip: Smokehouse 2×1, Longhouse
    // 2×2, Campfire 2×2, Water Spring 1×1 (INV-ERA-1 / D-ERA10 freeze these).
    expect(civicFootprint("smokehouse")).toEqual({ w: 2, d: 1 });
    expect(civicFootprint("longhouse")).toEqual({ w: 2, d: 2 });
    expect(civicFootprint("campfire")).toEqual({ w: 2, d: 2 });
    expect(civicFootprint("water_spring")).toEqual({ w: 1, d: 1 });
  });
});

describe("the `civic-` prefix is collision-free by construction", () => {
  it("is outside the node-derived basename space, measured over the whole graph", () => {
    // The registry is keyed by BASENAME in a directory it SHARES with the skill set, so
    // "no node could ever produce a `civic-…` basename" is the claim the flat layout
    // rests on. Derive it from the real graph rather than from era one's six: an
    // `excluded` node that comes back into product must not collide either.
    const nodeIds = skillGraph.nodes.map((node) => node.id);
    expect(nodeIds.length).toBeGreaterThanOrEqual(62);
    const prefixes = nodeIds.map(nodeFilePrefix);
    for (const prefix of prefixes) {
      expect(prefix.startsWith("civic-"), `${prefix} must not shadow a civic model`).toBe(
        false,
      );
    }
    // And no civic stem collides with a node prefix, in either direction.
    const nodeSet = new Set(prefixes);
    for (const id of CIVIC_TYPE_IDS) {
      expect(nodeSet.has(civicFilePrefix(id))).toBe(false);
      expect(nodeSet.has(id)).toBe(false);
    }
  });

  it("partitions the flat model directory in BOTH directions — no url has two owners", () => {
    const civicUrls = civicModelUrls();
    const skillUrls = cityModelUrls();
    const hallUrls = townHallModelUrls();

    // Floors first: every containment below is free over an empty collection, and an
    // empty civic set is precisely what a mis-globbed subdirectory would produce. One file
    // per type, since only `built` is committed (`CIVIC_UNBUNDLED_STAGES`).
    //
    // THE POPULATION IS `CIVIC_MODEL_TYPE_IDS`, NOT `CIVIC_TYPE_IDS`, and that is the count
    // every later art drop moves: twenty types with committed art against era one's four.
    // Measured red on the old value first — `expected [ …(8) ] to have a length of 4 but
    // got 8` — so this is a widened assertion rather than a loosened one.
    expect(civicUrls).toHaveLength(
      CIVIC_MODEL_TYPE_IDS.length * CIVIC_BUNDLED_STAGES.length,
    );
    expect(CIVIC_MODEL_TYPE_IDS).toHaveLength(36);
    // A FLOOR ON THE SKILL SET, NOT A PIN, and the exact claim has NOT been dropped — it
    // has moved to the file that owns it. `buildingAssets.test.ts` used to pin the literal
    // 18 here too and now derives the set from the eras whose art exists, because era two's
    // five skill buildings made 18 into 33 and a literal 33 would be the next era's hostage.
    // What this line is FOR is that the disjointness checks below are not vacuous, and a
    // floor is exactly that claim. Duplicating a derivation this file does not own would be
    // a second authority for it, which is the drift the registries are built to avoid.
    expect(skillUrls.length).toBeGreaterThanOrEqual(18);
    // Eight hall urls: era one's three construction stages plus eras two through five and seven's
    // finished re-themes. `buildingAssets.test.ts` owns the same number and moves with it.
    expect(hallUrls).toHaveLength(11);

    const civicSet = new Set(civicUrls);
    const skillSet = new Set(skillUrls);
    expect(civicSet.size).toBe(civicUrls.length);

    // Direction one: no civic file reached the skill glob. Its `!civic-*` exclusion is
    // what does this, and removing that one pattern turns `buildingAssets.test.ts` red at
    // `expected [ …(22) ] to have a length of 18 but got 22` — measured, not assumed.
    for (const url of civicUrls) {
      expect(skillSet.has(url), `${url} leaked into the skill set`).toBe(false);
    }
    // Direction two: no skill or hall file reached THIS glob. A prefix boundary checked
    // only one way lets a future basename be owned twice, which for a basename registry
    // means glob order silently decides which art the city wears.
    for (const url of [...skillUrls, ...hallUrls]) {
      expect(civicSet.has(url), `${url} leaked into the civic set`).toBe(false);
    }
  });
});

describe("the art's divergence from the catalogue is declared, and both ways", () => {
  /**
   * THE DIVERGENCE LIST IS AN EXCEPTION LIST, so it is asserted in BOTH directions.
   *
   * `longhouse` and `water_spring` are drawn under names the catalogue does not use, and a
   * type that genuinely diverges looks identical from outside to one somebody
   * mis-transcribed. Naming them is what tells the two apart — but a list that only grows
   * becomes permanent by neglect, so:
   *
   * - a type whose art and catalogue names AGREE may not sit in the list, or the list
   *   goes on excusing something it has stopped describing;
   * - a type whose names DISAGREE may not be missing from it, or a typo ships as a design
   *   decision.
   *
   * **THE LIST IS NOW EMPTY, and that is why the floor moved.** Both entries closed on the
   * 2026-07-30 forward-merge, in the direction nobody planned: `integration` renamed era
   * one's §3 rows to *The Family Lodge* and *The Spring*, which are the words Evan's art has
   * always used, so the catalogue came to the art rather than the other way round. This
   * guard is what noticed — it failed with `expected [ 'longhouse', 'water_spring' ] to
   * deeply equal []`, which is the "a member adopted the property and did not leave the
   * list" direction firing exactly as designed.
   *
   * **An empty exception list is the state in which set equality holds while measuring
   * nothing**, so the floor cannot sit on `declared` any more. It sits on the POPULATION
   * instead: four types, each with a non-empty name on BOTH sides, so the comparison above
   * genuinely ran four times over real strings rather than zero times over none. Verified by
   * injection rather than by argument — give one type an art name the catalogue does not
   * use and this fails at the set equality.
   */
  it("declares a divergence for exactly the types whose art and catalogue names differ", () => {
    const declared = CIVIC_TYPE_IDS.filter((id) => CIVIC_ART[id].divergence !== null);
    const disagreeing = CIVIC_TYPE_IDS.filter((id) => {
      // "Smokehouse" vs "The Smokehouse" is the catalogue's definite article, not a
      // divergence — the building is the same and so is the word.
      const strip = (s: string) => s.replace(/^The /, "");
      return strip(civicBuildingName(id)) !== strip(CIVIC_ART[id].artName);
    });

    expect([...declared].sort()).toEqual([...disagreeing].sort());
    // THE FLOOR, on the population rather than on the (now empty) exception list: four
    // types, each carrying a real name on both sides. Without this, two empty sets would
    // satisfy the equality above over a `CIVIC_ART` that had lost every entry.
    expect(CIVIC_TYPE_IDS.length).toBeGreaterThanOrEqual(4);
    for (const id of CIVIC_TYPE_IDS) {
      expect(civicBuildingName(id), `${id} catalogue name`).toMatch(/\S/);
      expect(CIVIC_ART[id].artName, `${id} art name`).toMatch(/\S/);
    }
    // Nothing is excused today, because nothing differs. This is an assertion and not an
    // observation: an entry re-appearing without its names having come apart fails the
    // equality above, and a name coming apart without an entry fails it too.
    for (const id of CIVIC_TYPE_IDS) {
      expect(CIVIC_ART[id].divergence, `${id} has nothing left to excuse`).toBeNull();
    }
    // A declared divergence has to name an owner, or it is a shrug in a comment. Vacuous
    // while the list is empty, and kept for the entry that re-opens it.
    for (const id of declared) {
      expect(CIVIC_ART[id].divergence, id).toMatch(/Owner /);
    }
  });

  it("keeps every art note pointed at a slug the source actually has", () => {
    // The art slugs are the source's own roster keys (`_rosters().civic`), which the
    // exporter reads to pick a builder. Distinct, non-empty, and NOT equal to the shipped
    // ids for the two that diverge — the last part is what stops this note quietly
    // becoming a copy of the id and claiming agreement it has not checked.
    const slugs = CIVIC_TYPE_IDS.map((id) => CIVIC_ART[id].artSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z]+$/);
    }
    expect(CIVIC_ART.longhouse.artSlug).toBe("lodge");
    expect(CIVIC_ART.water_spring.artSlug).toBe("spring");
    expect(CIVIC_ART.smokehouse.artSlug).toBe("smoke");
    expect(CIVIC_ART.campfire.artSlug).toBe("campfire");
  });
});
