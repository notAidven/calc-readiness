import type { WinterCellView } from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { cellCenter } from "../../worldLayout";
import { buildWinterGroundGroup, frostFrontMarks, winterCourseTop } from "../WinterGround";
import { FROST_FRONT_NAME } from "../winterFrostFront";
import { HARD_WINTER_PROPAGATION } from "./hardWinter";
import {
  carrierUsesGroundLadder,
  PROPAGATION_JOBS,
  PROPAGATION_READS,
  topologyFields,
} from "./propagation";
import {
  CRISIS_ENTRIES,
  CRISIS_ERAS,
  CRISIS_SEPARATION,
  crisisSeparation,
} from "./registry";

/**
 * **THE FOUR CRISES ARE FOUR DIFFERENT VISUAL JOBS, AND THIS IS THE FILE THAT SAYS SO.**
 *
 * Everything else in this directory shares something. This asserts that the one thing that must
 * NOT be shared has not been, and it is here because a framework's natural pull is toward
 * sameness: the cheapest way to make four crises fit one set of seams is to make them four
 * parameterisations of the first one, and that would destroy the property
 * `crisis-reference-packs/README.md` §4 spent a ruling establishing.
 *
 * ## THE POPULATION IS THE FOUR RESERVED ROWS, NOT THE TWO REGISTERED ENTRIES
 *
 * Scoping this by what is BUILT would scope it by the wrong thing, and the repository's own QA
 * rule names that failure directly: *"define a guard's population by who exhibits the behaviour,
 * not by where the behaviour is implemented"*. The behaviour here is *"a crisis whose propagation
 * a player has to read"*, and there are four of those. Two have code. If the population were the
 * registry, eras six and nine would fall outside it, and they are precisely the pair the two
 * documented collisions are between — era six against era seven's links, and era six against era
 * nine's hidden state. So the sweep runs over `CRISIS_SEPARATION`, which carries all four, and a
 * separate direction checks that everything registered matches its reserved row.
 */

/* -------------------------------------------------------------------------- */
/* The reserved rows: four crises, four different jobs                        */
/* -------------------------------------------------------------------------- */

describe("the separation table covers the four in-scope crises and nothing else", () => {
  it("has exactly one row per crisis era, both directions", () => {
    // A floor AND a census. Containment alone holds trivially over an empty table, and a floor
    // alone constrains size and not shape: four rows of era one would clear a count of four.
    expect(CRISIS_SEPARATION).toHaveLength(4);
    expect(CRISIS_SEPARATION.map((row) => row.eraId)).toEqual([...CRISIS_ERAS]);
    expect(new Set(CRISIS_SEPARATION.map((row) => row.eraId)).size).toBe(4);
  });

  it("spends every one-word read and every job exactly once", () => {
    // THE CLAIM IS A BIJECTION, not a subset. `sort()`ed equality fails both ways: a read used
    // twice fails, and a read no crisis uses fails, so the vocabulary cannot quietly grow a
    // fifth word nor collapse two crises onto one.
    expect(CRISIS_SEPARATION.map((row) => row.read).sort()).toEqual(
      [...PROPAGATION_READS].sort(),
    );
    expect(CRISIS_SEPARATION.map((row) => row.job).sort()).toEqual(
      [...PROPAGATION_JOBS].sort(),
    );
  });

  it("gives each crisis its own topology kind", () => {
    const kinds = CRISIS_SEPARATION.map((row) => row.topology.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

/* -------------------------------------------------------------------------- */
/* Not a parameterised frost                                                  */
/* -------------------------------------------------------------------------- */

describe("no two topologies share a substantive field", () => {
  /**
   * **THE ASSERTION THIS WHOLE PASS TURNS ON.**
   *
   * A shared field is how a parameterised frost would look from here. If era four's tipping and
   * era one's creeping both carried, say, `advance`, then era four's value would be some
   * degenerate reading of era one's — *"advances nowhere"* — and the two mental models the design
   * separated would be two settings of one dial.
   *
   * The discriminant comes out because every variant must have it; `topologyFields` is what drops
   * it, so this measures the fields a topology actually SPENDS.
   */
  it("is pairwise disjoint across all four, registered or not", () => {
    const spent = CRISIS_SEPARATION.map((row) => ({
      eraId: row.eraId,
      fields: topologyFields(row.topology),
    }));
    // A floor, because disjointness over four empty field sets is true and worthless.
    for (const { eraId, fields } of spent) {
      expect(fields.length, `${eraId} spends no topology field`).toBeGreaterThanOrEqual(2);
    }
    const overlaps: string[] = [];
    for (let i = 0; i < spent.length; i += 1) {
      for (let j = i + 1; j < spent.length; j += 1) {
        const a = spent[i] as (typeof spent)[number];
        const b = spent[j] as (typeof spent)[number];
        const shared = a.fields.filter((field) => b.fields.includes(field));
        if (shared.length > 0) {
          overlaps.push(`${a.eraId} and ${b.eraId} both spend ${shared.join(", ")}`);
        }
      }
    }
    expect(overlaps).toEqual([]);
  });

  it("gives the non-spatial crisis no field a frost could recognise", () => {
    // Era four, named rather than swept, because this is the specific claim the brief makes:
    // "nothing spatial at all". A cell, a neighbour, an adjacency, a front or a direction here
    // would be era one's model arriving in era four under another name.
    const succession = crisisSeparation("classical");
    const fields = topologyFields(succession.topology).join(" ");
    for (const spatial of [
      "cell",
      "adjac",
      "neighbour",
      "neighbor",
      "front",
      "edge",
      "direction",
      "advance",
      "spread",
      "radius",
    ]) {
      expect(fields, `era four's topology mentions "${spatial}"`).not.toContain(spatial);
    }
    // And the positive half, so this cannot pass by era four's topology being empty.
    expect(topologyFields(succession.topology)).toEqual(["decidedBy", "decidesPer"]);
  });
});

/* -------------------------------------------------------------------------- */
/* The two collisions the reading exists to prevent                           */
/* -------------------------------------------------------------------------- */

describe("era nine advances one probe over real city buildings", () => {
  it("reserves a mounted city layer rather than an anonymous meter", () => {
    expect(crisisSeparation("information_age").layerKind).toBe("mounted");
    const intrusion = CRISIS_ENTRIES.find((entry) => entry.eraId === "information_age");
    expect(intrusion?.propagation.layer).toMatchObject({
      kind: "mounted",
      carrier: { kind: "standing-object", anchor: "city-route" },
      markName: "intrusion-city-layer",
      componentPath: "apps/web/src/city/three/IntrusionCityLayer.tsx",
    });
  });

  it("keeps the route ordered and non-branching rather than importing era six's graph", () => {
    const intrusion = crisisSeparation("information_age").topology;
    expect(intrusion.kind).toBe("city-route");
    expect(topologyFields(intrusion)).toEqual(["movesWhen", "visits"]);
    expect(topologyFields(intrusion)).not.toContain("endpoints");
    expect(topologyFields(intrusion)).not.toContain("linkRelief");
  });
});

describe("era six reaches along authored inlaid routes", () => {
  it("uses building-pair links that do not require physical contact", () => {
    const plague = crisisSeparation("renaissance");
    expect(plague.topology.kind).toBe("authored-link");
    if (plague.topology.kind !== "authored-link") {
      throw new Error("unreachable");
    }
    expect(plague.topology.endpoints).toBe("building-pair");
    expect(plague.topology.linkRelief).toBe("in-the-floor");
    expect(plague.topology.requiresContact).toBe(false);
    expect(topologyFields(plague.topology)).toEqual([
      "endpoints",
      "linkRelief",
      "requiresContact",
    ]);
    expect(plague.layerKind).toBe("built");
  });
});

/* -------------------------------------------------------------------------- */
/* Registered crises match what was reserved for them                         */
/* -------------------------------------------------------------------------- */

describe("every registered crisis matches its reserved row", () => {
  it("has a reserved row, and agrees with it on read, job and topology", () => {
    // A floor, so this does not pass over an empty registry.
    expect(CRISIS_ENTRIES.length).toBeGreaterThanOrEqual(2);
    for (const entry of CRISIS_ENTRIES) {
      const row = crisisSeparation(entry.eraId);
      expect(entry.propagation.read, entry.eraId).toBe(row.read);
      expect(entry.propagation.job, entry.eraId).toBe(row.job);
      expect(entry.propagation.topology, entry.eraId).toEqual(row.topology);
      expect(entry.propagation.layer.kind, entry.eraId).toBe(row.layerKind);
    }
  });

  it("takes the ground ladder only where the crisis has a ground layer", () => {
    // The starting hypothesis said the decal ladder was shared by every crisis. It is not: era
    // four lays no ground layer at all, so its carrier declines the seam era one leans on hardest.
    const winter = CRISIS_ENTRIES.find((entry) => entry.eraId === "prehistoric");
    const succession = CRISIS_ENTRIES.find((entry) => entry.eraId === "classical");
    if (!winter || !succession) {
      throw new Error("both registered crises are expected");
    }
    if (winter.propagation.layer.kind === "none") {
      throw new Error("era one's layer is built");
    }
    if (succession.propagation.layer.kind === "none") {
      throw new Error("era four's layer is designed, not none");
    }
    expect(carrierUsesGroundLadder(winter.propagation.layer.carrier)).toBe(true);
    expect(carrierUsesGroundLadder(succession.propagation.layer.carrier)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Era one's real layer goes through the seam                                 */
/* -------------------------------------------------------------------------- */

/** One land cell the frost takes when the round closes, with everything else clear. */
function frostNextCell(col: number, row: number): WinterCellView[][] {
  const cell = {
    col,
    row,
    land: true,
    frozen: false,
    frost_line: false,
    frost_next: true,
    warded: false,
    abandoned: false,
    preview_tier: null,
    preview_abandon: false,
    rim_depth: 0,
  } as unknown as WinterCellView;
  return [[cell]];
}

describe("the seam carries era one's own builder, not a copy of it", () => {
  /**
   * **THE FIT, MEASURED AGAINST THE ISLAND RATHER THAN ASSERTED.**
   *
   * A registry entry pointing at a function proves nothing on its own: the entry could point at a
   * lookalike written to suit the framework, and the guard would be green over a second
   * implementation of the frost. So this builds one cell of the front BOTH ways — through
   * `buildWinterGroundGroup`, which is what the island actually mounts and which this pass did
   * not touch, and through the registered seam — and compares the geometry that comes out.
   */
  it("produces the same front geometry the island draws", () => {
    const col = 3;
    const row = 5;
    const rows = frostNextCell(col, row);
    const board = buildWinterGroundGroup(rows, [], { weather: false });
    const shipped = board.getObjectByName(FROST_FRONT_NAME);
    expect(shipped, "the shipped layer drew no front").toBeInstanceOf(THREE.Group);
    if (!(shipped instanceof THREE.Group)) {
      throw new Error("unreachable");
    }

    const layer = HARD_WINTER_PROPAGATION.layer;
    expect(layer.kind).toBe("built");
    if (layer.kind !== "built") {
      throw new Error("unreachable");
    }
    /*
     * **THE SEAM IS HANDED THE ISLAND'S OWN MARK, NOT A MARK THIS FILE MADE UP.**
     *
     * It used to be given a hand-written four-wall approach, which was the right description of
     * a lone `frost_next` cell while the mark stood ON that cell. The front now stands on the
     * ring of ice OUTSIDE it (`frostFrontMarks`, 2026-08-03), so a lone cell produces four marks
     * with three walls each and a literal here would be comparing two different marks and
     * calling the difference a seam failure. Reading the mark off the same function the island
     * builds from is also a better version of the original claim: the only thing left that could
     * differ between the two groups is the BUILDER, which is what this test is about.
     */
    const marks = frostFrontMarks(
      new Set([`${col},${row}`]),
      new Set(),
      new Set([`${col},${row}`]),
    );
    expect(marks.length, "no marks for a lone cell the round is taking").toBeGreaterThan(0);
    const at = marks.find((mark) => {
      const centre = cellCenter(mark.col, mark.row);
      return (
        Math.abs(centre.x - shipped.position.x) < 1e-6 &&
        Math.abs(centre.z - shipped.position.z) < 1e-6
      );
    });
    expect(at, "the shipped mark stands on no cell the ring names").toBeDefined();
    if (!at) {
      throw new Error("unreachable");
    }
    const { x, z } = cellCenter(at.col, at.row);
    const throughTheSeam = layer.build({
      x,
      z,
      topY: shipped.position.y,
      approach: at.approach,
    });

    expect(throughTheSeam.name).toBe(layer.markName);
    expect(shipped.name).toBe(layer.markName);
    // A floor, so matching an empty group against an empty group cannot pass this.
    expect(shipped.children.length).toBeGreaterThan(4);
    expect(throughTheSeam.children).toHaveLength(shipped.children.length);
    expect(throughTheSeam.children.map((child) => child.name)).toEqual(
      shipped.children.map((child) => child.name),
    );
    expect(throughTheSeam.position.toArray()).toEqual(shipped.position.toArray());
    for (const [i, child] of throughTheSeam.children.entries()) {
      const other = shipped.children[i] as THREE.Object3D;
      expect(child.position.toArray(), `child ${i}`).toEqual(other.position.toArray());
    }
  });

  it("stands the front on a rung of the shared ladder and not at a free height", () => {
    const board = buildWinterGroundGroup(frostNextCell(2, 2), [], { weather: false });
    const shipped = board.getObjectByName(FROST_FRONT_NAME);
    if (!shipped) {
      throw new Error("the shipped layer drew no front");
    }
    // Recovered from the geometry rather than restated: the front's Y is some rung of
    // `winterCourseTop`, which is the ladder `ladder.ts` generalises.
    const rungs = Array.from({ length: 24 }, (_, i) => winterCourseTop(i));
    expect(rungs).toContain(shipped.position.y);
  });
});
