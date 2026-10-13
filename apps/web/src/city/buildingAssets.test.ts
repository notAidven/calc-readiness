import { deriveConstructionState } from "@cr/game";
import { getEraNodes, skillGraph } from "@cr/skill-graph";
import type { LessonStage, Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";
import {
  buildingName,
  cityModelUrls,
  D1_NODE_BUILDINGS,
  D1_SKILL_IDS,
  MODEL_STAGES,
  modelStageForBuildStage,
  nodeFilePrefix,
  nodeModelUrls,
  resolveBuildingModel,
  SKILL_MODEL_NODES,
} from "./buildingAssets";
import {
  CIVIC_BUNDLED_STAGES,
  CIVIC_MODEL_TYPE_IDS,
  CIVIC_TYPE_IDS,
  civicModelUrls,
} from "./civicBuildings";
import type { BuildStage } from "./palette";
import { buildStageFor } from "./palette";
import { townHallModelUrls } from "./townHall";

const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;
const MILESTONES: readonly BuildStage[] = ["site", "construction", "built", "advanced"];

describe("node → GLB building registry", () => {
  it("maps each of the six D1 skills to a distinct Gridwork building", () => {
    expect(Object.keys(D1_NODE_BUILDINGS).sort()).toEqual([...D1_NODES].sort());
    expect(D1_SKILL_IDS).toHaveLength(6);
    const names = Object.values(D1_NODE_BUILDINGS).map((b) => b.building);
    expect(new Set(names).size).toBe(6);
  });

  it("gives every registry node a UNIQUE model basename, so one flat directory is safe", () => {
    // This registry is keyed by BASENAME, not by path, so the argument for dropping a
    // later era's GLBs alongside D1's in `art/models/` rests entirely on node-derived
    // prefixes being collision-free. That is a fact about the whole registry, not about
    // D1, so the population is every node the registry holds — including `excluded`
    // ones, since an id that comes back into product must not collide either.
    const nodeIds = skillGraph.nodes.map((node) => node.id);
    expect(nodeIds.length).toBeGreaterThanOrEqual(62);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);

    const prefixes = nodeIds.map(nodeFilePrefix);
    // The collapse `.`→`-` is only injective while no id already contains a dash; an id
    // like `RAD-1` would collide with `RAD.1`. Assert the premise, not just the result.
    expect(nodeIds.filter((id) => id.includes("-"))).toEqual([]);
    expect(new Set(prefixes).size).toBe(prefixes.length);

    // Era two specifically: its five prefixes share no basename with era one's six.
    const eraTwo = ["EXP.1", "RAD.1", "RAD.2", "RAD.3", "RAD.4"].map(nodeFilePrefix);
    const eraOne = D1_SKILL_IDS.map(nodeFilePrefix);
    expect(eraTwo).toHaveLength(5);
    expect(eraOne).toHaveLength(6);
    expect(eraTwo.filter((prefix) => eraOne.includes(prefix))).toEqual([]);
  });

  it("collapses the milestone stages onto the three model stages", () => {
    expect(MODEL_STAGES).toEqual(["site", "construction", "built"]);
    expect(modelStageForBuildStage("site")).toBe("site");
    expect(modelStageForBuildStage("construction")).toBe("construction");
    expect(modelStageForBuildStage("built")).toBe("built");
    expect(modelStageForBuildStage("advanced")).toBe("built");
  });

  it("resolves a renderable descriptor for every D1 node across every milestone stage", () => {
    for (const node of D1_NODES) {
      for (const stage of MILESTONES) {
        const resolved = resolveBuildingModel(node, stage);
        expect(resolved, `${node}/${stage}`).not.toBeNull();
        // Every phase now loads the node's OWN GLB — a site foundation, a
        // construction scaffold, and the built model — so a node builds up as itself.
        expect(resolved?.kind, `${node}/${stage}`).toBe("glb");
        expect(typeof resolved?.url).toBe("string");
        expect((resolved?.url ?? "").length).toBeGreaterThan(0);
      }
    }
  });

  it("derives advanced from the built model with no gold pass", () => {
    for (const node of D1_NODES) {
      const site = resolveBuildingModel(node, "site");
      const construction = resolveBuildingModel(node, "construction");
      const built = resolveBuildingModel(node, "built");
      const advanced = resolveBuildingModel(node, "advanced");

      // advanced reuses the built model (no extra export, no gold tint).
      expect(advanced?.url).toBe(built?.url);
      // Every phase is the node's OWN GLB, and the three model stages are distinct
      // files (site foundation ≠ construction scaffold ≠ built model).
      expect(site?.kind).toBe("glb");
      expect(construction?.kind).toBe("glb");
      expect(built?.kind).toBe("glb");
      expect((site?.url ?? "").length).toBeGreaterThan(0);
      expect((construction?.url ?? "").length).toBeGreaterThan(0);
      expect((built?.url ?? "").length).toBeGreaterThan(0);
      expect(site?.url).not.toBe(construction?.url);
      expect(site?.url).not.toBe(built?.url);
      expect(construction?.url).not.toBe(built?.url);
    }
  });

  it("falls an unmapped node CLOSED to the shared procedural template, never to nothing", () => {
    // **THIS TEST USED TO ASSERT `null`, DOCUMENTED AS "an empty pad".** That was
    // survivable only while an unmapped node could not be placed: the city's roster was a
    // domain's six `mvp` nodes, so the only placeable nodes were the ones mapped here. The
    // roster is the era's now, so all 62 are placeable and `null` would have drawn an
    // invisible, unclickable building (see the module docblock, and
    // `three/unmappedBuilding.test.ts` for the population and the geometry).
    for (const stage of MILESTONES) {
      const resolved = resolveBuildingModel("NO.SUCH.NODE", stage);
      expect(resolved.url, stage).toBeNull();
      expect(resolved.kind, stage).toBe(modelStageForBuildStage(stage));
    }
    // The finished phases in particular, which are the ones that used to resolve to null.
    expect(resolveBuildingModel("NO.SUCH.NODE", "built").kind).toBe("built");
    expect(resolveBuildingModel("NO.SUCH.NODE", "advanced").kind).toBe("built");

    expect(buildingName("NUM.S")).toBe("Assembly Hall");
    expect(buildingName("NO.SUCH.NODE")).toBe("NO.SUCH.NODE");
  });

  it("lists every distinct GLB url for preloading (three phases per building)", () => {
    const urls = cityModelUrls();
    // All three per-node phases are bundled now (site + construction + built), for every
    // era whose skill art has been exported — era one's six, eras two through five, and era seven.
    // Derived from `SKILL_MODEL_NODES` rather than from `D1_NODES` alone, because this
    // glob is not era one's: it is every node-derived skill basename in the directory.
    expect(urls).toHaveLength(SKILL_MODEL_NODES.length * MODEL_STAGES.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.length).toBeGreaterThan(0);
    }
    for (const node of D1_NODES) {
      expect(nodeModelUrls(node)).toEqual([
        resolveBuildingModel(node, "site")?.url,
        resolveBuildingModel(node, "construction")?.url,
        resolveBuildingModel(node, "built")?.url,
      ]);
    }
  });

  it("keeps the SKILL-node glob at exactly the node-derived basenames — the Town Hall's and the civic models are additional, not part of it", () => {
    // The skill-node glob is non-recursive (`art/models/*.glb`) AND prefix-excluding
    // (`!civic-*.glb`), so it bundles EXACTLY the skill nodes × 3 stages and NOTHING
    // else. The three Town Hall stage GLBs live in the `art/models/townhall/`
    // SUBDIRECTORY on purpose; era one's four civic GLBs sit FLAT in the same directory
    // behind the `civic-` prefix. Both are picked up by their OWN registries
    // (`townHallModelUrls`, `civicModelUrls`), never this glob.
    //
    // THIS USED TO PIN THE LITERAL 18, AND THE NUMBER WAS NOT THE CLAIM. Era two's five
    // skill buildings landed in this directory as fifteen more node-derived basenames
    // (`exp-1-*`, `rad-1-*` … `rad-4-*`), so a literal 18 would have had to become a
    // literal 33, then 48, 63, 78 and 96 — numbers no smaller a hostage to the next era. What the assertion is
    // for is that the glob resolves the node-derived set and nothing else, so it now
    // asserts the SET, derived from the eras whose art exists, with the count following
    // from it. A later era's drop moves `SKILL_MODEL_NODES`, not only a digit here.
    const skillUrls = cityModelUrls();
    expect(skillUrls).toHaveLength(SKILL_MODEL_NODES.length * MODEL_STAGES.length);
    expect(skillUrls).toHaveLength(168);

    // COMPOSITION, NOT JUST SIZE, because 96 is satisfied by era one's eighteen plus
    // seventy-eight of anything. Every era slice is named and floored, so a drift that swapped
    // one era's files for another's still fails even at an unchanged total.
    const skillBasenames = new Set(
      skillUrls.map((url) => (url.split("?")[0] ?? url).split("/").pop() as string),
    );
    expect(skillBasenames.size).toBe(skillUrls.length);
    const expected = SKILL_MODEL_NODES.flatMap((node) =>
      MODEL_STAGES.map((stage) => `${nodeFilePrefix(node)}-${stage}.glb`),
    );
    expect([...skillBasenames].sort()).toEqual([...expected].sort());
    const filesFor = (nodes: readonly string[]): string[] => {
      const expectedForNodes = new Set(
        nodes.flatMap((node) =>
          MODEL_STAGES.map((stage) => `${nodeFilePrefix(node)}-${stage}.glb`),
        ),
      );
      return [...skillBasenames].filter((file) => expectedForNodes.has(file));
    };
    const eraOneFiles = filesFor(D1_NODES);
    const eraTwoFiles = filesFor(getEraNodes("neolithic"));
    const eraThreeFiles = filesFor(getEraNodes("bronze_age"));
    const eraFourFiles = filesFor(getEraNodes("classical"));
    const eraFiveFiles = filesFor(getEraNodes("medieval"));
    const eraSevenFiles = filesFor(getEraNodes("industrial"));
    const eraEightFiles = filesFor(getEraNodes("atomic_age"));
    const eraNineFiles = filesFor(getEraNodes("information_age"));
    const eraTenFiles = filesFor(getEraNodes("cyberpunk"));
    expect(eraOneFiles).toHaveLength(18);
    expect(eraTwoFiles).toHaveLength(15);
    expect(eraThreeFiles).toHaveLength(15);
    expect(eraFourFiles).toHaveLength(15);
    expect(eraFiveFiles).toHaveLength(15);
    expect(eraSevenFiles).toHaveLength(18);
    expect(eraEightFiles).toHaveLength(27);
    expect(eraNineFiles).toHaveLength(18);
    expect(eraTenFiles).toHaveLength(27);
    // And the six authored era slices account for the whole glob, so an undeclared prefix cannot
    // arrive unnoticed inside a total that still adds up.
    expect(
      eraOneFiles.length +
        eraTwoFiles.length +
        eraThreeFiles.length +
        eraFourFiles.length +
        eraFiveFiles.length +
        eraSevenFiles.length +
        eraEightFiles.length +
        eraNineFiles.length +
        eraTenFiles.length,
    ).toBe(skillUrls.length);

    // The hall's stage models are their own, distinct set: era one's
    // `[site, construction, built]` plus eras two through five and seven's finished re-themes. The hub
    // is the one building that re-themes per era (`townHall.ts`'s `TOWN_HALL_ERA_MODELS`),
    // and only its `built` is committed because D-TH4 was reversed and `built` is the only
    // stage resolved. Measured red on the old value before it moved: `expected [ …(4) ] to
    // have a length of 3 but got 4`.
    const hallUrls = townHallModelUrls();
    expect(hallUrls).toHaveLength(11);
    expect(new Set(hallUrls).size).toBe(11);
    for (const url of hallUrls) {
      expect(url.length).toBeGreaterThan(0);
    }

    // The two sets are DISJOINT — the subdirectory kept the hall out of the 18, so
    // the skill-node count stays meaningful (this is the boundary the subdir enforces).
    const skillSet = new Set(skillUrls);
    for (const url of hallUrls) {
      expect(skillSet.has(url)).toBe(false);
    }
    // And no skill URL is a town-hall model by basename.
    for (const url of skillUrls) {
      expect(url).not.toMatch(/townhall-/);
    }

    // THE CIVIC SET IS THE HARDER CASE, because it is not behind a subdirectory: the
    // four `civic-*.glb` files are FLAT alongside the eighteen, and only the glob's
    // `!./art/models/civic-*.glb` exclusion keeps the count above meaningful. Measured
    // by removing that one pattern: this file reports `expected [ …(22) ] to have a
    // length of 18 but got 22`, in this test and in the preload test above. So the
    // exclusion is load-bearing rather than decorative, and a future flat drop that
    // forgets its own registry lands here rather than silently in the skill set.
    const civicUrls = civicModelUrls();
    // The FLOOR first — disjointness from an empty set is free, and an empty civic set
    // is exactly what a broken glob (a `civic/` subdirectory, say) would produce. One
    // file per type: only `built` is committed (`CIVIC_UNBUNDLED_STAGES`).
    //
    // TWENTY TYPES NOW, NOT FOUR: four later four-row eras joined era one as their civic
    // art landed, so the population is `CIVIC_MODEL_TYPE_IDS` (all five art eras) rather than
    // `CIVIC_TYPE_IDS` (era one's buyable four, which stays pinned at 4 beside it so the
    // widening cannot hide era one's set shrinking). Measured red on the old value first:
    // `expected [ …(8) ] to have a length of 4 but got 8`.
    expect(CIVIC_TYPE_IDS).toHaveLength(4);
    expect(CIVIC_MODEL_TYPE_IDS.length).toBeGreaterThanOrEqual(20);
    expect(civicUrls).toHaveLength(
      CIVIC_MODEL_TYPE_IDS.length * CIVIC_BUNDLED_STAGES.length,
    );
    expect(new Set(civicUrls).size).toBe(civicUrls.length);
    for (const url of civicUrls) {
      expect(skillSet.has(url)).toBe(false);
    }
    for (const url of skillUrls) {
      expect(url).not.toMatch(/\/civic-|civic-[a-z]+-(site|construction|built)/);
    }
  });
});

/**
 * The full node-state → visible-model chain the learn→build loop depends on, wired
 * end-to-end (design 3-step): `deriveConstructionState` (engines/game) →
 * `buildStageFor` (palette) → `resolveBuildingModel` (this file). This is the guard
 * for the reported "finishing the lesson + CFU doesn't turn the building into
 * scaffolding" bug: the moment the CFU pass writes `lesson_stage: "practice"`, the
 * SAME model resolution the live scene runs (`CitySurface` `scenePlaced`) must land
 * on the node's OWN construction/scaffold GLB — never its site foundation or its
 * built model. Every link is unit-tested in isolation elsewhere; this locks them
 * together so a regression in any single step is caught as a wrong rendered model.
 */
describe("node-state → visible build model (the learn→build render chain)", () => {
  /** Resolve exactly as the live scene does: state → construction state → stage → model. */
  function modelForState(nodeId: string, mastery: Mastery, lessonStage: LessonStage) {
    const state = deriveConstructionState({
      mastery,
      lesson_stage: lessonStage,
      placement_estimate: 0,
    });
    return resolveBuildingModel(nodeId, buildStageFor(state));
  }

  it("place → Foundation → finish lesson+CFU → SCAFFOLD → finish practice → Complete", () => {
    for (const node of D1_NODES) {
      const site = resolveBuildingModel(node, "site");
      const construction = resolveBuildingModel(node, "construction");
      const built = resolveBuildingModel(node, "built");

      // Foundation: a freshly placed skill (not_started) draws the SITE foundation.
      const foundation = modelForState(node, 0, "not_started");
      expect(foundation?.modelStage, `${node} foundation`).toBe("site");
      expect(foundation?.url).toBe(site?.url);

      // The teaching + CFU segment stays a Foundation site — it has NOT scaffolded yet.
      expect(modelForState(node, 0, "teaching")?.modelStage, `${node} teaching`).toBe(
        "site",
      );

      // THE FIX'S CONTRACT: finishing the lesson + CFU writes lesson_stage "practice",
      // which must derive Construction and render the node's OWN scaffold GLB — not the
      // site foundation and not the finished building.
      const scaffold = modelForState(node, 0, "practice");
      expect(scaffold?.kind, `${node} scaffold kind`).toBe("glb");
      expect(scaffold?.modelStage, `${node} scaffold stage`).toBe("construction");
      expect(scaffold?.url, `${node} scaffold url`).toBe(construction?.url);
      expect(scaffold?.url, `${node} scaffold != site`).not.toBe(site?.url);
      expect(scaffold?.url, `${node} scaffold != built`).not.toBe(built?.url);

      // Finishing the practice set (lesson_stage "done") tops the building out to Complete
      // (built), regardless of the score — even a below-bar 0/1 finish.
      expect(modelForState(node, 0, "done")?.url, `${node} complete`).toBe(built?.url);
      // A mastered / tested-out node (mastery >= 2) also reads Complete (built).
      expect(modelForState(node, 2, "done")?.url, `${node} mastered`).toBe(built?.url);
    }
  });
});
