import { getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { cityModelUrls, MODEL_STAGES, nodeFilePrefix } from "./buildingAssets";
import { TOWN_HALL_DESCRIPTORS, townHallModelUrls } from "./townHall";

/**
 * ERA ONE'S EXPORTER AND ERA ONE'S TREE, HELD IN STEP — `scripts/export-era1-skill-models.mjs`
 * writes down a slug → node table it cannot derive, and this is where that table is compared
 * with the two things it has to agree with: the skill graph's era-one node set, and the 21
 * basenames the registries actually load.
 *
 * ## WHY THIS FILE IS NOT PART OF `era2SkillModels.test.ts`
 *
 * That file owns the ERA COVERAGE question — which eras have exported skill art at all — and
 * its era-one row predates this exporter by a long way: era one's models were adopted in
 * `be9f00b6` from an uncommitted module, so "era one has art" and "era one has an exporter"
 * have always been separate facts. This file is about the second, and it deliberately does not
 * restate the first.
 *
 * ## WHAT IT DOES *NOT* CLAIM, WHICH IS THE POINT WORTH READING
 *
 * **It does not claim the exporter reproduces the committed bytes, because it does not.**
 * Every colour in the tree is the exporter's colour lifted 18% toward white and the meshes are
 * merged per material; the exporter's header carries the measurement and its `--check` asserts
 * the divergence in both directions at run time. A vitest file cannot launch Chromium, so the
 * byte question stays where it can actually be answered. What is checkable here is that the
 * exporter is aimed at the right seven buildings under the right 21 names — which is the half
 * that rots silently when a node is renamed.
 */

/** The exporter, read through Vite's `?raw` glob — the precedent `era2SkillModels.test.ts` sets. */
const EXPORTER_SOURCES = import.meta.glob(
  "../../../../scripts/export-era1-skill-models.mjs",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

function exporterSource(): string {
  // A FLOOR ON THE GLOB ITSELF. A moved or renamed exporter would otherwise leave every
  // assertion below matching against an empty string, and an empty string matches nothing.
  const paths = Object.keys(EXPORTER_SOURCES);
  expect(paths).toHaveLength(1);
  const source = EXPORTER_SOURCES[paths[0] as string] as string;
  expect(source.length).toBeGreaterThan(4000);
  return source;
}

/** Basename of a bundled url, which is the key both registries are actually keyed by. */
function basenames(urls: readonly string[]): string[] {
  return urls.map((url) => (url.split("?")[0] ?? url).split("/").pop() as string).sort();
}

describe("era one's skill exporter is aimed at the buildings era one ships", () => {
  it("keeps the exporter's node column equal to the era the skill graph ships", () => {
    const source = exporterSource();
    const declared = [...source.matchAll(/\{ node: "([^"]+)", art: "([^"]+)"/g)].map(
      (m) => m[1],
    );
    // A floor, because an empty match list would make the equality vacuous — which is
    // exactly what reformatting that table would produce.
    expect(declared).toHaveLength(6);
    expect(declared).toEqual([...getEraNodes("prehistoric")]);
  });

  it("names every art slug the source's core roster offers, and no other", () => {
    const source = exporterSource();
    const slugs = [...source.matchAll(/\{ node: "[^"]+", art: "([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(slugs).toHaveLength(6);
    // The seven `_rosters().core` buildings, less the hub's. Written out because this test's
    // whole job is to be a second copy of the pairing: deriving it from the exporter would
    // make the comparison agree with itself. The `.dc.html` is 1.4 MB of packed bundle and is
    // excluded from the glob patterns this suite can read, so the source side of the pairing
    // is checked by the exporter's own `--check-mapping`, which measures it against the
    // committed GLBs' footprints rather than trusting either list.
    expect(slugs).toEqual(["round", "store", "shelters", "teaching", "cleared", "lookout"]);
    // AND THE HUB IS NOT IN THAT TABLE, because it has no node and so no node-derived
    // basename. It is exported beside the six, into `townhall/`, under its own declaration.
    expect(source).not.toMatch(/\{ node: "[^"]*", art: "hearth"/);
    expect(source).toMatch(/const HUB = \{ basename: "townhall", art: "hearth"/);
  });

  it("covers all 21 era-one basenames, split across the two registries that load them", () => {
    const nodes = getEraNodes("prehistoric");
    // The floor that makes this test about ERA ONE rather than about any era passing again.
    expect(nodes).toHaveLength(6);
    expect(nodes).toEqual(["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"]);

    const skillFiles = nodes.flatMap((node) =>
      MODEL_STAGES.map((stage) => `${nodeFilePrefix(node)}-${stage}.glb`),
    );
    expect(skillFiles).toHaveLength(18);

    // DIRECTION ONE: everything the exporter writes is a file some registry loads. The two
    // registries are checked SEPARATELY, because the hub's three live behind `townHall.ts`'s
    // own glob and a single combined count would let three skill files go missing while three
    // hub files covered for them.
    const bundled = new Set(basenames(cityModelUrls()));
    expect(bundled.size).toBeGreaterThanOrEqual(33);
    for (const file of skillFiles) {
      expect(bundled.has(file), `${file} is bundled by buildingAssets.ts`).toBe(true);
    }
    const hallFiles = TOWN_HALL_DESCRIPTORS.D1?.stage_models ?? [];
    expect(hallFiles).toHaveLength(3);
    const hallBundled = new Set(basenames(townHallModelUrls()));
    expect(hallBundled.size).toBeGreaterThanOrEqual(3);
    for (const file of hallFiles) {
      expect(hallBundled.has(file), `${file} is bundled by townHall.ts`).toBe(true);
    }

    // DIRECTION TWO: everything those registries load for era one is something the exporter
    // writes. The exporter's 21 output names are REBUILT from its own declarations — the node
    // column, the hub basename and its `STAGES` list — and compared for SET EQUALITY, so a
    // stage dropped from `STAGES` or a row deleted from `CORE` fails here rather than quietly
    // narrowing what has a source. Containment either way would miss half of that.
    const source = exporterSource();
    const stages = [...source.matchAll(/const STAGES = \[([^\]]+)\]/g)].flatMap((m) =>
      [...(m[1] as string).matchAll(/"([^"]+)"/g)].map((s) => s[1] as string),
    );
    expect(stages).toEqual([...MODEL_STAGES]);
    const declaredNodes = [...source.matchAll(/\{ node: "([^"]+)", art: "[^"]+"/g)].map(
      (m) => m[1] as string,
    );
    const hubBasename = /const HUB = \{ basename: "([^"]+)"/.exec(source)?.[1];
    expect(hubBasename).toBe("townhall");
    const exporterWrites = [
      ...declaredNodes.flatMap((node) =>
        stages.map((stage) => `${nodeFilePrefix(node)}-${stage}.glb`),
      ),
      ...stages.map((stage) => `${hubBasename}-${stage}.glb`),
    ].sort();
    expect(exporterWrites).toHaveLength(21);
    expect(exporterWrites).toEqual([...skillFiles, ...hallFiles].sort());
  });

  it("declares all 21 outputs as diverging from the tree, with the reason on the record", () => {
    const source = exporterSource();
    // The exporter's `--check` asserts this divergence in both directions at run time; what
    // is checkable without Chromium is that the declaration and its reason still exist, so a
    // future re-adoption cannot delete the record and leave a green `--check` meaning
    // something else. `be9f00b6` is the commit that made the tree's bytes what they are.
    expect(source).toContain("DIFFERS_FROM_TREE");
    expect(source).toContain("be9f00b6");
    expect(source).toContain("era1-prehistoric.js");
    // And the guard that stops a bare run restyling the city. Without a named flag, `--out`
    // at the live model directory must refuse.
    expect(source).toContain("--replace-shipped-art");
    expect(source).toMatch(/refusing to write into/);
  });
});
