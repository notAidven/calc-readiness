import { ERA_SEQUENCE, type EraId, getEraOfNode, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { eraBuildableDiscRadius } from "./islandLand";
import { TOWN_HALL_ID } from "./townHall";
import {
  BUILDABLE_RADIUS,
  DEFAULT_FOOTPRINT,
  type Footprint,
  footprintCells,
  footprintFor,
  GRID_CELL,
  isFootprintInBounds,
  NODE_FOOTPRINTS,
  occupiedCells,
  type PlacedTransform,
  type Transform,
} from "./worldLayout";

/**
 * THE ERA GUIDES' AUTHORED FOOTPRINTS, WIRED — and the guard over which eras owe one.
 *
 * `worldLayout.test.ts` pins era one's six rows. This file is the sweep across the other
 * fifty-six, and it exists because of how the gap was able to last: every footprint
 * assertion in the repo was scoped to era one's six, so `LIN.4`, `GEO.2`, `FUN.2` and
 * `FUN.3` rendered on a plot their own guides had rejected while the suite stayed green.
 * A population of six passing says nothing about fifty-six unchecked.
 *
 * So the population here is DERIVED from `ERA_SEQUENCE` and never written down. What is
 * written down is the two things a derivation cannot supply: the plot each guide DECIDED
 * (a design decision, transcribed and pinned), and which eras decided nothing
 * ({@link DEFERRED_ERAS}).
 *
 * ## Why the population is eras one to seven rather than all sixty-two
 *
 * A footprint is owed by a node whose style guide CLOSED the item. Seven guides did, on
 * 2026-07-29, each in a "footprints for the N new nodes are decided" closure block. Eras
 * eight, nine and ten wrote *"footprints are not yet authored"* and closed nothing, and
 * their image-generation briefs are drawn to the 2×2 default deliberately — era nine's
 * calls it *"a design fact, not a placeholder"*. Wiring a value for one of those 24 nodes
 * would MAKE a decision no guide has made, which is the opposite of what wiring the other
 * 38 does. They are held as a named list that fails BOTH ways: an era that quietly adopts
 * an entry fails, and a listed era that has left the registry fails.
 */

/** An era whose style guide closed its footprint item, so every node of it owes a row. */
const WIRED_ERAS: readonly EraId[] = [
  "prehistoric",
  "neolithic",
  "bronze_age",
  "classical",
  "medieval",
  "renaissance",
  "industrial",
];

/**
 * The eras that owe NOTHING, each with its reason — the named-exception list a sweep
 * needs so "does not owe a footprint" and "forgot its footprint" stop looking identical
 * from outside the guard.
 *
 * There is no land shortfall behind any of these three. The arithmetic runs the other
 * way: every authored plot is 2×2 or 2×1, so wiring only ever FREES cells and leaving an
 * era on the default is the costlier option rather than the safer one. What is missing is
 * a decision, and a decision is the lead's to make and not this file's.
 */
const DEFERRED_ERAS: readonly { readonly era: EraId; readonly why: string }[] = [
  {
    era: "atomic_age",
    why:
      "era-08-atomic/style-guide.md carries no footprint closure item at all; its roster " +
      "says 'footprints are not yet authored for these nine', and its building brief " +
      "flags the gap (⚑3) and briefs all nine as 'footprint unauthored (2×2 today)'.",
  },
  {
    era: "information_age",
    why:
      "era-09-information/style-guide.md likewise closes nothing, and its brief states " +
      "the 2×2 default as the constraint to design to: 'all six of era nine's skill " +
      "plots are 2×2, which is a design fact, not a placeholder'.",
  },
  {
    era: "cyberpunk",
    why:
      "era-10-cyberpunk/style-guide.md likewise closes nothing ('footprints are not yet " +
      "authored for these nine'), and era ten has no building brief written yet.",
  },
];

/**
 * The decided plot for every node of a wired era, transcribed from that era's own closure
 * block. This is the design decision and the only hand-written half of the sweep, so a
 * row moving here is a design change rather than a tune. Era one's six are repeated
 * deliberately: they are the same claim `worldLayout.test.ts` makes, and a census that
 * skipped them could not assert set equality against the registry.
 */
const DECIDED_FOOTPRINTS: Readonly<Record<string, Footprint>> = {
  // Era 1 — era-01-prehistoric/style-guide.md §6, the only copy of era one's table.
  "NUM.S": { w: 2, d: 2 },
  "NUM.F": { w: 2, d: 1 },
  "NUM.2": { w: 2, d: 2 },
  "NUM.3": { w: 1, d: 1 },
  "NUM.4": { w: 1, d: 2 },
  "NUM.5": { w: 2, d: 2 },
  // Era 2 — "EXP.1 (store) takes the long plot; RAD.1 (workshop), RAD.2 (yard),
  // RAD.3 (hall) and RAD.4 (tower) take the square full plot."
  "EXP.1": { w: 2, d: 1 },
  "RAD.1": { w: 2, d: 2 },
  "RAD.2": { w: 2, d: 2 },
  "RAD.3": { w: 2, d: 2 },
  "RAD.4": { w: 2, d: 2 },
  // Era 3 — "LIN.4 (store) takes the long plot; LIN.1 (hall), LIN.3 (workshop),
  // LIN.5 (yard) and LIN.6 (tower) take the square full plot."
  "LIN.1": { w: 2, d: 2 },
  "LIN.3": { w: 2, d: 2 },
  "LIN.4": { w: 2, d: 1 },
  "LIN.5": { w: 2, d: 2 },
  "LIN.6": { w: 2, d: 2 },
  // Era 4 — "POL.1 (workshop) and POL.8 (workshop) both take the square full plot;
  // POL.2 (yard) takes the long plot; POL.3 (hall) takes the square full plot;
  // POL.4 (store) takes the long plot."
  "POL.1": { w: 2, d: 2 },
  "POL.2": { w: 2, d: 1 },
  "POL.3": { w: 2, d: 2 },
  "POL.4": { w: 2, d: 1 },
  "POL.8": { w: 2, d: 2 },
  // Era 5 — "RAT.2 (store) and RAT.6 (dwelling) take the long plot; RAT.1 (workshop),
  // RAT.3 (hall) and RAT.4 (tower) take the square full plot."
  "RAT.1": { w: 2, d: 2 },
  "RAT.2": { w: 2, d: 1 },
  "RAT.3": { w: 2, d: 2 },
  "RAT.4": { w: 2, d: 2 },
  "RAT.6": { w: 2, d: 1 },
  // Era 6 — "All six take the square full plot (2×2), with one exception: GEO.2's
  // Drawing Office takes the long plot (2×1)."
  "GEO.1": { w: 2, d: 2 },
  "GEO.2": { w: 2, d: 1 },
  "CG.1": { w: 2, d: 2 },
  "POL.6": { w: 2, d: 2 },
  "POL.7": { w: 2, d: 2 },
  "RAT.5": { w: 2, d: 2 },
  // Era 7 — "FUN.2 (store) and FUN.3 (workshop) take the long plot; FUN.1 (hall),
  // FUN.7 (hall), FUN.8 (workshop) and POL.5 (tower) take the square full plot."
  "FUN.1": { w: 2, d: 2 },
  "FUN.2": { w: 2, d: 1 },
  "FUN.3": { w: 2, d: 1 },
  "FUN.7": { w: 2, d: 2 },
  "FUN.8": { w: 2, d: 2 },
  "POL.5": { w: 2, d: 2 },
};

/** Every in-product node id, from the registry. 62 of them, per INV-ERA-2. */
const PRODUCT_NODES: readonly string[] = getProductNodes().map((node) => node.id);

/** The era ids the registry actually carries, so a list entry cannot name a ghost. */
const REGISTRY_ERA_IDS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/** Registry-derived: every node sitting in a wired era. Never written down. */
function wiredNodes(): readonly string[] {
  return PRODUCT_NODES.filter((id) => {
    const era = getEraOfNode(id);
    return era !== undefined && WIRED_ERAS.includes(era.id);
  });
}

/** Registry-derived: every node sitting in a deferred era. */
function deferredNodes(): readonly string[] {
  return PRODUCT_NODES.filter((id) => {
    const era = getEraOfNode(id);
    return era !== undefined && DEFERRED_ERAS.some((entry) => entry.era === era.id);
  });
}

const shape = (fp: Footprint): string => `${fp.w}x${fp.d}`;
const cellCount = (fp: Footprint): number => fp.w * fp.d;

describe("the era guides' authored footprints, over a registry-derived population", () => {
  it("covers EVERY node of every wired era, and is not the old six-node population", () => {
    const wired = wiredNodes();
    expect(wired.filter((id) => !(id in NODE_FOOTPRINTS))).toEqual([]);

    // A floor, because containment over an empty or shrunken derivation holds trivially.
    expect(wired.length).toBeGreaterThanOrEqual(38);

    // A floor constrains SIZE, not SHAPE, and the defect this file exists for was a sweep
    // scoped to era one. So assert the COMPOSITION as well: the population with era one
    // removed is itself 32 or more, which is exactly the half that used to go unchecked.
    const beyondEraOne = wired.filter((id) => getEraOfNode(id)?.id !== "prehistoric");
    expect(beyondEraOne.length).toBeGreaterThanOrEqual(32);
    expect(beyondEraOne).not.toContain("NUM.S");
  });

  it("registers the plot each guide decided rather than falling through to the default", () => {
    for (const id of wiredNodes()) {
      expect(DECIDED_FOOTPRINTS[id], `${id} has no transcribed decision`).toBeDefined();
      expect(footprintFor(id), id).toEqual(DECIDED_FOOTPRINTS[id]);
    }

    // The transcription and the derived population must be the SAME SET, both ways: a
    // node added to a wired era fails for want of a decision, and a transcribed id that
    // leaves the wired eras fails as a stale row.
    expect([...wiredNodes()].sort()).toEqual(Object.keys(DECIDED_FOOTPRINTS).sort());
  });

  it("wires the ten long 2×1 plots the guides asked for, by name", () => {
    // The rows that actually move a building: everything else the guides decided is 2×2,
    // which the default already produced. Named individually because these ten are the
    // whole observable content of the change, and a count of shapes would pass with the
    // wrong ten.
    expect(
      wiredNodes()
        .filter((id) => shape(footprintFor(id)) === "2x1")
        .sort(),
    ).toEqual([
      "EXP.1",
      "FUN.2",
      "FUN.3",
      "GEO.2",
      "LIN.4",
      "NUM.F",
      "POL.2",
      "POL.4",
      "RAT.2",
      "RAT.6",
    ]);
  });

  it("registers exactly the wired nodes plus the hub, and nothing else", () => {
    // A census rather than a count: an extra id fails, a missing id fails, and the hub is
    // named rather than tolerated.
    expect([...Object.keys(NODE_FOOTPRINTS)].sort()).toEqual(
      [...wiredNodes(), TOWN_HALL_ID].sort(),
    );
  });
});

describe("the deferred eras — a named list that fails in BOTH directions", () => {
  it("names three eras that still exist in the registry, each with its reason", () => {
    expect(DEFERRED_ERAS.map((entry) => entry.era)).toEqual([
      "atomic_age",
      "information_age",
      "cyberpunk",
    ]);
    for (const { era, why } of DEFERRED_ERAS) {
      // A listed era that has been renamed or removed fails here, rather than sitting in
      // the list forever exempting nothing and hiding that it exempts nothing.
      expect(
        REGISTRY_ERA_IDS,
        `${era} is a declared exception that still exists`,
      ).toContain(era);
      expect(why.length, `${era} states why`).toBeGreaterThan(40);
    }
  });

  it("fails if a deferred era quietly adopts an authored footprint", () => {
    // The other direction: the list stops excusing anything the moment the thing it
    // excuses changes. An entry here means a guide decided something, which means this
    // list is stale and that era belongs in WIRED_ERAS.
    expect(
      deferredNodes().filter((id) => id in NODE_FOOTPRINTS),
      "a deferred era has an entry: move it to WIRED_ERAS",
    ).toEqual([]);

    // And the fallback is what they resolve to, which is the claim the briefs are drawn
    // against.
    for (const id of deferredNodes()) {
      expect(footprintFor(id), id).toEqual(DEFAULT_FOOTPRINT);
    }
    expect(deferredNodes().length).toBeGreaterThanOrEqual(24);
  });

  it("partitions the registry, so no era can fall outside both lists", () => {
    const wired = new Set(wiredNodes());
    const deferred = new Set(deferredNodes());
    expect([...wired].filter((id) => deferred.has(id))).toEqual([]);
    expect(wired.size + deferred.size).toBe(PRODUCT_NODES.length);
    expect([...WIRED_ERAS, ...DEFERRED_ERAS.map((entry) => entry.era)].sort()).toEqual(
      [...REGISTRY_ERA_IDS].sort(),
    );
  });
});

describe("wiring can only free land, and cannot break an already-placed building", () => {
  it("never gives a node a plot LARGER than the default it replaces", () => {
    let strictlySmaller = 0;
    for (const id of wiredNodes()) {
      const fp = footprintFor(id);
      expect(cellCount(fp), id).toBeLessThanOrEqual(cellCount(DEFAULT_FOOTPRINT));
      if (cellCount(fp) < cellCount(DEFAULT_FOOTPRINT)) {
        strictlySmaller += 1;
      }
    }
    // Non-vacuity: the ten 2×1s plus era one's 1×1 and 1×2 are strictly under the
    // default, so this is not a table of 2×2s satisfying a `<=`.
    expect(strictlySmaller).toBeGreaterThanOrEqual(12);
  });

  it("keeps every authored plot a SUBSET of the default's cells, at every rotation", () => {
    // This is the persistence answer. A `PlacedTransform` stores `{nodeId, col, row,
    // rot}` and `occupiedCells` DERIVES the cells from `footprintFor`, so changing a
    // footprint changes which cells a saved placement occupies. Because every authored
    // plot's cells are a subset of the 2×2's at the same transform, a saved placement can
    // only SHRINK: it cannot newly overlap a neighbour (fewer cells) and it cannot newly
    // leave the buildable disc (a subset of in-bounds cells is in bounds). That is why no
    // `DEV_SESSION_SCHEMA_VERSION` bump is owed. The rotations matter on their own: a 2×1
    // becomes 1×2 on an odd quarter-turn, and the subset has to survive the swap or a
    // rotated saved building could escape the cells it used to hold.
    let checked = 0;
    let strictSubsets = 0;
    for (const id of wiredNodes()) {
      for (const rot of [0, 1, 2, 3]) {
        const t = { col: 3, row: -2, rot };
        const authored = new Set(footprintCells(t, footprintFor(id)));
        const fallback = new Set(footprintCells(t, DEFAULT_FOOTPRINT));
        for (const key of authored) {
          expect(fallback.has(key), `${id} rot ${rot} cell ${key}`).toBe(true);
        }
        checked += 1;
        if (authored.size < fallback.size) {
          strictSubsets += 1;
        }
      }
    }
    expect(checked).toBe(wiredNodes().length * 4);
    expect(checked).toBeGreaterThanOrEqual(152);
    expect(strictSubsets).toBeGreaterThanOrEqual(48);
  });

  it("cannot invalidate a placement that was legal at the 2×2 default, on ANY era's disc", () => {
    // The cell-subset claim above, run through the real validity path instead of argued
    // from it — every anchor cell, every wired node, all four rotations.
    // `isFootprintInBounds` is the half of `isPlacementValid` a saved placement could fail
    // on its own, so a legal 2×2 spot must stay legal.
    //
    // ⚑ WIDENED FROM ERA ONE'S DISC TO EVERY ERA'S. It swept `BUILDABLE_RADIUS` alone, which
    // was the only disc the game had; the disc now follows the land, so era one's sweep would
    // have said nothing about the ring of anchors a bigger island adds — and the disc's EDGE is
    // exactly where a subset claim is at risk, because that is the only place a wider plot can
    // fall off. `discs` is derived from `ERA_SEQUENCE` rather than listed, so it widens on its
    // own, and the floor under it is what stops the sweep quietly emptying.
    const discs = ERA_SEQUENCE.map((era) => eraBuildableDiscRadius(era.id));
    expect(new Set(discs).size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...discs)).toBeGreaterThan(BUILDABLE_RADIUS);

    let bothLegal = 0;
    let newlyLegal = 0;
    for (const disc of discs) {
      const reach = Math.ceil(disc / GRID_CELL) + 1;
      const anchors: Transform[] = [];
      for (let col = -reach; col <= reach; col += 1) {
        for (let row = -reach; row <= reach; row += 1) {
          for (const rot of [0, 1, 2, 3]) {
            anchors.push({ col, row, rot });
          }
        }
      }
      for (const id of wiredNodes()) {
        const fp = footprintFor(id);
        for (const t of anchors) {
          const wasLegal = isFootprintInBounds(t, DEFAULT_FOOTPRINT, disc);
          const isLegal = isFootprintInBounds(t, fp, disc);
          if (wasLegal) {
            expect(isLegal, `${id} at ${t.col},${t.row} rot ${t.rot} on disc ${disc}`).toBe(
              true,
            );
            bothLegal += 1;
          } else if (isLegal) {
            newlyLegal += 1;
          }
        }
      }
    }
    // Non-vacuity in both directions: the sweep has real legal spots to preserve, and the
    // ten long plots genuinely legalise anchors the 2×2 could not seat (the disc's edge).
    expect(bothLegal).toBeGreaterThanOrEqual(38 * 4 * discs.length);
    expect(newlyLegal).toBeGreaterThan(0);
  });

  it("shrinks a saved city's occupied cells and never moves one", () => {
    // A saved placement is `{nodeId, col, row, rot}` and `occupiedCells` derives its
    // cells from `footprintFor`, so a restore recomputes them at whatever this table now
    // says. Lay every wired node on its own 2×2 block — the layout a session would have
    // produced while all of them fell through to the default — and compare the two
    // occupancy sets. The blocks are spread over an unbounded grid on purpose: 38 nodes
    // at 2×2 is 152 cells and the shipped island holds 88, which is the land arithmetic
    // the next test is about and not this one.
    const nodes = wiredNodes();
    const saved: PlacedTransform[] = nodes.map((nodeId, index) => ({
      nodeId,
      col: (index % 8) * 2,
      row: Math.floor(index / 8) * 2,
      rot: index % 4,
    }));
    const before = new Set(saved.flatMap((p) => footprintCells(p, DEFAULT_FOOTPRINT)));
    const after = occupiedCells(saved);

    expect([...after].filter((key) => !before.has(key))).toEqual([]);
    expect(after.size).toBeLessThan(before.size);
    expect(before.size).toBe(nodes.length * 4);
    // The collision half of `isPlacementValid`, which is the half a restore could newly
    // fail: freeing cells can only make a neighbour's drop MORE legal, so a layout that
    // did not overlap at 2×2 still does not overlap. (Bounds are the preceding test's;
    // these anchors sit outside the buildable disc on purpose.)
    for (const p of saved) {
      const others = occupiedCells(saved, p.nodeId);
      for (const key of footprintCells(p, footprintFor(p.nodeId))) {
        expect(others.has(key), `${p.nodeId} overlaps at ${key}`).toBe(false);
      }
    }
  });

  it("reduces every wired era's cell demand and raises none", () => {
    // The land-budget half, per era. D-ERA25 authors a buildable radius per era and only
    // era one has one, so "cells available" exists for exactly one era — that denominator
    // question is answered in `civicSolvency.test.ts`, which asserts the other nine
    // THROW. What is answerable for every era is the DELTA, and the delta is what wiring
    // is on the hook for.
    const deltas = WIRED_ERAS.map((eraId) => {
      const nodes = ERA_SEQUENCE.find((era) => era.id === eraId)?.nodes ?? [];
      expect(nodes.length, `${eraId} has nodes`).toBeGreaterThan(0);
      return {
        eraId,
        authored: nodes.reduce((total, id) => total + cellCount(footprintFor(id)), 0),
        fallback: nodes.length * cellCount(DEFAULT_FOOTPRINT),
      };
    });
    for (const { eraId, authored, fallback } of deltas) {
      expect(authored, eraId).toBeLessThanOrEqual(fallback);
    }
    // All seven are strictly cheaper than the all-default city. Era one's 7 saved cells
    // are pre-existing (its rows shipped long ago); the 18 this change frees are eras two
    // to seven's, and 25 is the whole authored saving over the sixty-two-node default.
    expect(
      deltas.filter((row) => row.authored < row.fallback).map((row) => row.eraId),
    ).toEqual([...WIRED_ERAS]);
    expect(deltas.reduce((total, row) => total + (row.fallback - row.authored), 0)).toBe(
      25,
    );
  });
});
