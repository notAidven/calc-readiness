import { civicCatalogueForEra } from "@cr/economy";
import { ERA_SEQUENCE, type EraId, getEraOfNode, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { lessonByNode } from "../lessons/domains";
import { buildingName } from "./buildingAssets";
import { albumLabel, cityAlbum } from "./cityAlbumView";
import { civicPlacementId, parseCivicPlacementId } from "./civic";
import { buildingSubtitle } from "./eraDressing";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { PlacedTransform } from "./worldLayout";

/**
 * THE RECONSTRUCTION (`cityAlbumView.ts`): which buildings stood at the close of each age.
 *
 * **The Album panel this fed was cut on 2026-08-04 and this file is what keeps the
 * derivation under it honest until the archipelago's revisited island uses it** (#568
 * §8.8). That is the whole reason the module is still here, so it is the reason this suite
 * is: with no surface rendering it, an untested read model is a module nobody would notice
 * rotting, and a rotted one is worth less to stage 3 than nothing at all.
 *
 * Four properties are pinned here and each one is a claim the island will rest on:
 *
 *  1. The record stops at the era the city has reached, so it is not a ten-slot set with
 *     three filled (**BUILD 2**).
 *  2. Past composition is genuinely reconstructed: the set that stood at era N nests
 *     inside era N+1's, and `raised` partitions the placements across the frames exactly
 *     once.
 *  3. **It takes no mastery input**, which is what keeps it from becoming another of the
 *     progress-bookkeeping surfaces the 2026-08-04 cut was made to reduce, and what makes
 *     a score structurally unavailable to it. Enforced by reading the module's own source,
 *     with `eraTimelineView.ts` — the read model that legitimately does take one — as the
 *     positive control that proves the sweep can find what it forbids.
 *  4. No node id can reach a learner, over the whole 62-node registry, with a census that
 *     fails in both directions so the sweep cannot be green because nothing is named.
 */

const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };

/** A placement for a node, at a cell nobody reads: the read model validates no layout. */
function at(nodeId: string, index: number): PlacedTransform {
  return { nodeId, col: index % 7, row: Math.floor(index / 7), rot: index % 4 };
}

/** The first `count` nodes of an era, placed. */
function placeEra(eraId: EraId, count: number, offset = 0): PlacedTransform[] {
  const era = ERA_SEQUENCE.find((candidate) => candidate.id === eraId);
  if (!era) {
    throw new Error(`no such era: ${eraId}`);
  }
  return era.nodes.slice(0, count).map((nodeId, index) => at(nodeId, offset + index));
}

/** Era ids by play position, so a test can name "era five" without a literal slug. */
function eraIdAt(position: number): EraId {
  const era = ERA_SEQUENCE[position - 1];
  if (!era) {
    throw new Error(`ERA_SEQUENCE has no era ${position}`);
  }
  return era.id;
}

/**
 * The first `count` rows of an era's catalogue, bought and placed.
 *
 * Minted through `civicPlacementId`, the real scheme, rather than by writing
 * `civic:<something>:1` by hand: the id is what carries the era here, so a fixture that
 * spelled one itself would be testing the fixture's idea of the format.
 */
function buyEra(eraId: EraId, count: number, offset = 40): PlacedTransform[] {
  return civicCatalogueForEra(eraId)
    .slice(0, count)
    .map((row, index) => at(civicPlacementId(row.id, offset + index), offset + index));
}

describe("the album stops at the era the city has reached", () => {
  it("gives one page per era up to the live era and none beyond it", () => {
    const album = cityAlbum({ placements: [], townHall: HALL, liveEraId: eraIdAt(5) });

    expect(album.frames.map((frame) => frame.era.id)).toEqual(
      ERA_SEQUENCE.slice(0, 5).map((era) => era.id),
    );
    // THE FLOOR THAT MAKES THE ASSERTION ABOVE MEAN SOMETHING. Five pages is only
    // evidence of a bound if the sequence is longer than five; over a three-era sequence
    // "the first five" and "all of them" are the same list, and a model returning every
    // era would pass. Ten today, and the bound is checked against the real length.
    expect(ERA_SEQUENCE.length).toBeGreaterThan(5);
    expect(album.frames).toHaveLength(5);
    expect(album.frames.length).toBeLessThan(ERA_SEQUENCE.length);
  });

  it("marks exactly the last page as the one the city is standing on", () => {
    const album = cityAlbum({ placements: [], townHall: HALL, liveEraId: eraIdAt(4) });
    const live = album.frames.filter((frame) => frame.live);
    expect(live).toHaveLength(1);
    expect(live[0]?.era.id).toBe(eraIdAt(4));
    expect(album.frames[album.frames.length - 1]?.era.id).toBe(eraIdAt(4));
  });

  it("reads an era outside the sequence as era one rather than opening onto nothing", () => {
    // `loadEraId` makes the same departure from fail-loud for the same reason: this value
    // arrives from a persisted store, so the failure it guards is a learner reaching a
    // panel that will not open.
    const album = cityAlbum({
      placements: [],
      townHall: HALL,
      liveEraId: "an-era-nobody-authored" as EraId,
    });
    expect(album.frames).toHaveLength(1);
    expect(album.frames[0]?.era.id).toBe(eraIdAt(1));
  });
});

describe("the past is reconstructed from the placements that survive", () => {
  /**
   * The city a learner in era three has: era one built out, era two part-built, and
   * nothing from era three yet. Three pages, and the middle one is the interesting case.
   */
  const threeEras = [
    ...placeEra(eraIdAt(1), 6, 0),
    ...placeEra(eraIdAt(2), 3, 10),
    ...placeEra(eraIdAt(3), 2, 20),
  ];

  it("nests each page's city inside the next, and the city genuinely grows", () => {
    const album = cityAlbum({
      placements: threeEras,
      townHall: HALL,
      liveEraId: eraIdAt(3),
    });
    expect(album.frames).toHaveLength(3);

    const stood = album.frames.map(
      (frame) => new Set(frame.stood.map((piece) => piece.id)),
    );
    for (const [index, later] of stood.entries()) {
      const earlier = stood[index - 1];
      if (!earlier) {
        continue;
      }
      for (const id of earlier) {
        expect(
          later.has(id),
          `${id} stood in era ${index} and vanished in era ${index + 1}`,
        ).toBe(true);
      }
    }

    // THE FLOOR. Nesting holds trivially over three empty pages, and it holds over three
    // IDENTICAL pages too, which is the shape a model that ignored the era filter would
    // produce. So the pages must be non-empty AND strictly growing: era one's city is
    // smaller than era two's, which is smaller than era three's.
    expect(stood[0]?.size ?? 0).toBeGreaterThan(0);
    expect(stood[1]?.size ?? 0).toBeGreaterThan(stood[0]?.size ?? 0);
    expect(stood[2]?.size ?? 0).toBeGreaterThan(stood[1]?.size ?? 0);
    expect(stood[2]?.size).toBe(threeEras.length + 1);
  });

  it("files every placed building under exactly one era, and files it under its own", () => {
    const album = cityAlbum({
      placements: threeEras,
      townHall: HALL,
      liveEraId: eraIdAt(3),
    });

    const raised = album.frames.flatMap((frame) =>
      frame.raised.map((piece) => ({ id: piece.id, era: frame.era.id })),
    );
    // A partition: every placement exactly once, and each under the era its NODE belongs
    // to. Both halves matter: a model that filed everything under era one would satisfy
    // "exactly once" on its own.
    expect(raised).toHaveLength(threeEras.length);
    expect(new Set(raised.map((entry) => entry.id)).size).toBe(threeEras.length);
    for (const entry of raised) {
      expect(entry.era, `${entry.id} was filed under the wrong era`).toBe(
        getEraOfNode(entry.id)?.id,
      );
    }
    // AND A FLOOR UNDER THE PARTITION, because a partition of the empty set is a
    // partition. Three eras of buildings, so the pages that add something must number
    // three rather than one.
    expect(threeEras.length).toBeGreaterThanOrEqual(6);
    expect(album.frames.filter((frame) => frame.raised.length > 0)).toHaveLength(3);
  });

  it("keeps a page on which nothing was built, rather than skipping the era", () => {
    // An era the learner passed through without raising anything is a true page of their
    // own record, and dropping it would make this disagree with the era sequence about
    // which eras happened. Under the archipelago it is an island they founded and left
    // bare, which is still an island they founded.
    const album = cityAlbum({
      placements: placeEra(eraIdAt(1), 6),
      townHall: HALL,
      liveEraId: eraIdAt(3),
    });
    expect(album.frames).toHaveLength(3);
    expect(album.frames[1]?.raised).toEqual([]);
    expect(album.frames[2]?.raised).toEqual([]);
    // The city did not shrink on those pages: era one's six are still standing on both.
    expect(album.frames[1]?.stood).toHaveLength(7);
    expect(album.frames[2]?.stood).toHaveLength(7);
  });

  it("carries the hub on every page, dressed for that page's era, and never as new", () => {
    const album = cityAlbum({ placements: [], townHall: HALL, liveEraId: eraIdAt(10) });
    expect(album.frames).toHaveLength(ERA_SEQUENCE.length);

    for (const frame of album.frames) {
      const hall = frame.stood.find((piece) => piece.kind === "hall");
      expect(hall, `era ${frame.number} lost the hub`).toBeDefined();
      // The hub is pre-seeded and never placed, so marking it new would read as the
      // learner having built it.
      expect(hall?.arrived).toBe(false);
      expect(frame.raised.some((piece) => piece.kind === "hall")).toBe(false);
      expect(frame.hallLabel).toContain("Town Hall");
    }

    // §11.3's argument is that the hall is the only building whose earlier looks are
    // genuinely lost, which makes this the only record a retired one survives in. So
    // the dressed pages must actually DIFFER, and the count is floored at the two eras
    // that have ratified a hub dressing today rather than left to be zero.
    const dressed = album.frames.filter((frame) => frame.hallDressed);
    expect(dressed.length).toBeGreaterThanOrEqual(2);
    expect(new Set(dressed.map((frame) => frame.hallLabel)).size).toBe(dressed.length);
    // An era with no ratified dressing shows the stable name alone: no placeholder, no
    // borrowed dressing, which is `eraDressing.ts`'s own rule.
    for (const frame of album.frames.filter((frame) => !frame.hallDressed)) {
      expect(frame.hallLabel).toBe("Town Hall");
    }
  });

  it("reports an island with nothing bought or earned as empty, and one with any as not", () => {
    expect(cityAlbum({ placements: [], townHall: HALL, liveEraId: eraIdAt(1) }).empty).toBe(
      true,
    );
    expect(
      cityAlbum({
        placements: placeEra(eraIdAt(1), 1),
        townHall: HALL,
        liveEraId: eraIdAt(1),
      }).empty,
    ).toBe(false);
    // The hub alone does not make a city non-empty: it was given, not built.
    expect(
      cityAlbum({ placements: [], townHall: HALL, liveEraId: eraIdAt(1) }).frames[0]?.stood,
    ).toHaveLength(1);
    // A city that has BOUGHT something and earned nothing is not empty either. It was
    // empty before civic buildings reached this model, which is the whole defect: a
    // learner who had spent an era's stockpile opened their album and read that nothing
    // had been raised on the island.
    expect(
      cityAlbum({
        placements: [],
        civic: buyEra(eraIdAt(1), 2),
        townHall: HALL,
        liveEraId: eraIdAt(1),
      }).empty,
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* The quarters the player BOUGHT, which are the era-dated half of the city    */
/* -------------------------------------------------------------------------- */

/**
 * D-ERA11 freezes a civic building in the era it was bought and makes each era's
 * catalogue exclusive to it, so a bought building is the one class of thing on the
 * island that is DEFINED by an era. That is exactly this surface's subject, and it is
 * also why the era is recoverable without a snapshot: `civicPlacementEra`
 * (`packages/economy/src/civicBuilding.ts`) states the same argument the album's header
 * makes for skill nodes, that *"buildings are era-exclusive and never renovate, so those
 * two facts pin the built era to the id."*
 *
 * The counts below are the reason this matters more than its size suggests. A skill
 * building is one per node and the graph has 62; a civic building is buyable *"as many
 * times as you can afford"*, so in a played city the bought quarters are most of what
 * the learner actually CHOSE. The earned buildings are what the curriculum handed them.
 */
describe("the album shows what the player bought, not only what they earned", () => {
  it("files a bought building under the era whose catalogue sold it", () => {
    const album = cityAlbum({
      placements: [],
      civic: [...buyEra(eraIdAt(1), 2), ...buyEra(eraIdAt(3), 1, 30)],
      townHall: HALL,
      liveEraId: eraIdAt(3),
    });
    expect(album.frames).toHaveLength(3);

    const raised = album.frames.map((frame) => frame.raised.length);
    expect(raised, "the bought buildings did not land on their own eras").toEqual([
      2, 0, 1,
    ]);
    // And they NEST, exactly as earned buildings do: an era-one purchase is still
    // standing on era three's page.
    expect(album.frames[2]?.stood.filter((piece) => piece.kind === "civic")).toHaveLength(
      3,
    );
  });

  it("names a bought building rather than printing its placement id", () => {
    const album = cityAlbum({
      placements: [],
      civic: buyEra(eraIdAt(1), 4),
      townHall: HALL,
      liveEraId: eraIdAt(1),
    });
    const labels = album.frames[0]?.raised.map((piece) => piece.label) ?? [];
    // THE FLOOR FIRST, because "no label is an id" is trivially true of a page that names
    // nothing. Era one sells four rows and all four were bought.
    expect(labels).toHaveLength(4);
    for (const label of labels) {
      expect(label, "a bought building reached the surface unnamed").not.toBeNull();
      expect(label ?? "", "a placement id reached the surface").not.toContain("civic:");
    }
    expect(labels).toContain("The Smokehouse");
  });

  it("drops a placement whose catalogue row no longer exists, rather than guessing", () => {
    // The same failure `civicTypeOf` is written for: a restored snapshot holding an id for
    // a type this build no longer authors must lose that building rather than resolve it
    // to some other row.
    const album = cityAlbum({
      placements: [],
      civic: [{ nodeId: "civic:a_building_nobody_authored:1", col: 2, row: 2, rot: 0 }],
      townHall: HALL,
      liveEraId: eraIdAt(2),
    });
    expect(
      album.frames.flatMap((frame) => frame.raised).map((piece) => piece.id),
      "a placement this build cannot resolve was drawn anyway",
    ).toEqual([]);
    expect(
      album.empty,
      "an unresolvable placement made the album think the city had been built on",
    ).toBe(true);
  });

  /**
   * **`AlbumPiece.eraId` WAS FREE TO BE WRONG, and this is what found it.**
   *
   * Reddening the civic branch by filing a quarter under the frame's era instead of its
   * catalogue's changed nothing: 20 passed. The field is read by no surface and by no
   * other assertion here, and `arrived` and the album's own era filter are both computed
   * from the catalogue row directly rather than from this field, so it could carry any era
   * at all and every other guard stayed green.
   *
   * An unread field on an exported interface is the shape that drifts, so it is pinned
   * rather than deleted: it is the read model's answer to *"which era does this building
   * belong to"*, which is a different question from *"which page am I on"* for every
   * building that is standing rather than new, and that distinction is the album's whole
   * subject.
   */
  it("gives every piece the era it belongs to, which is not the page it is on", () => {
    const album = cityAlbum({
      placements: placeEra(eraIdAt(1), 3),
      civic: [...buyEra(eraIdAt(1), 2), ...buyEra(eraIdAt(2), 2, 60)],
      townHall: HALL,
      liveEraId: eraIdAt(3),
    });

    let judged = 0;
    for (const frame of album.frames) {
      for (const piece of frame.stood) {
        if (piece.kind === "hall") {
          // The hub alone takes the frame's era: it re-themes rather than belonging to one.
          expect(piece.eraId).toBe(frame.era.id);
          continue;
        }
        judged += 1;
        const owned =
          piece.kind === "skill"
            ? getEraOfNode(piece.id)?.id
            : parseCivicPlacementId(piece.id)?.row.era;
        expect(piece.eraId, `${piece.id} claims an era it is not from`).toBe(owned);
        // And the two questions really do come apart, which is what stops this being the
        // same assertion as `arrived`.
        expect(piece.arrived).toBe(piece.eraId === frame.era.id);
      }
    }
    // THE FLOOR, and it has to be more than a count. A page whose pieces are all NEW makes
    // "era it belongs to" and "page it is on" the same value, so the assertion above would
    // hold over a model that simply returned the frame's era. Era three's page carries all
    // seven and raises none of them, so at least one piece is judged where the two differ.
    expect(judged).toBeGreaterThanOrEqual(14);
    const last = album.frames[2];
    expect(last?.raised).toEqual([]);
    expect(last?.stood.filter((piece) => piece.eraId !== last.era.id).length).toBe(7);
  });

  it("tells a bought quarter apart from an earned one on the plan", () => {
    // The plan draws both, and a learner who cannot tell which is which is reading one
    // undifferentiated blob rather than their own city. `kind` is what the surface keys
    // its fill off, so the three kinds must actually be three.
    const album = cityAlbum({
      placements: placeEra(eraIdAt(1), 3),
      civic: buyEra(eraIdAt(1), 2),
      townHall: HALL,
      liveEraId: eraIdAt(1),
    });
    const kinds = album.frames[0]?.stood.map((piece) => piece.kind) ?? [];
    expect(kinds.filter((kind) => kind === "hall")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "skill")).toHaveLength(3);
    expect(kinds.filter((kind) => kind === "civic")).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */
/* It reads no learning state, and the difference from the era read model is   */
/* exactly what it is ALLOWED to read                                          */
/* -------------------------------------------------------------------------- */

/**
 * Both globs held two entries until 2026-08-04, when the cut took `CityAlbum.tsx` and
 * `EraTimeline.tsx`. The claim is unchanged and the sweep is narrower, so the vacuity
 * floor below is asserted as a set equality rather than a count: a glob that stopped
 * matching returns `{}`, and every "no source mentions X" assertion below would pass over
 * nothing.
 */
const CITY_SOURCES = import.meta.glob(["./cityAlbumView.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const TIMELINE_SOURCES = import.meta.glob(["./eraTimelineView.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * The names a learning-state read would have to spell. A mastery cannot be read without
 * one of these appearing: `StudentNodeState` is the only shape that carries it,
 * `nodeStates` is what every caller in the city names the collection, and `mastery` /
 * `completion_status` are the fields themselves.
 */
const LEARNING_STATE = [
  "StudentNodeState",
  "nodeStates",
  "node_states",
  "mastery",
  "completion_status",
];

/** Source with block and line comments stripped, so prose cannot be read as code. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("the reconstruction reads no learning state, by what it may read", () => {
  it("the sweep found both modules, so it is reading something", () => {
    // The vacuity floor for everything below: a glob that has silently stopped matching
    // returns `{}`, and every "no source mentions X" assertion passes over nothing.
    expect(Object.keys(CITY_SOURCES).sort()).toEqual(["./cityAlbumView.ts"]);
    expect(Object.keys(TIMELINE_SOURCES).sort()).toEqual(["./eraTimelineView.ts"]);
    for (const [path, source] of Object.entries({
      ...CITY_SOURCES,
      ...TIMELINE_SOURCES,
    })) {
      expect(code(source).length, `${path} read empty`).toBeGreaterThan(400);
    }
  });

  it("reads no learning state at all, which is why it cannot report a score", () => {
    for (const [path, source] of Object.entries(CITY_SOURCES)) {
      const body = code(source);
      for (const name of LEARNING_STATE) {
        expect(body.includes(name), `${path} reads learning state via \`${name}\``).toBe(
          false,
        );
      }
    }
  });

  it("and the era read model DOES read it, which is the control that proves the sweep works", () => {
    // WITHOUT THIS the test above is a silence assertion over a string that might not be
    // findable in this tree at all. `eraTimelineView.ts` is the module that legitimately
    // reads mastery — it is the whole of what it is for — so finding it there proves the
    // sweep can see what it forbids next door.
    const timeline = Object.values(TIMELINE_SOURCES).map(code).join("\n");
    const found = LEARNING_STATE.filter((name) => timeline.includes(name));
    expect(
      found.length,
      "the era read model stopped reading mastery, so this control is dead",
    ).toBeGreaterThanOrEqual(3);
  });

  it("offers no door into a lesson or a practice set, because that is the Chronicle", () => {
    // §11.2: the Chronicle (layer 2) is *a door back into a skill* and is another owner's.
    // A door added here would be a second one beside it, which is the specific waste that
    // section exists to prevent. When it lands it wants `LessonMenu`, not this file.
    for (const [path, source] of Object.entries(CITY_SOURCES)) {
      const body = code(source);
      for (const route of [
        "LessonMenu",
        "onStartLesson",
        "onReviewLesson",
        "onPractice",
        "onInfinitePractice",
        "resumePractice",
        "lessonHost",
      ]) {
        expect(body.includes(route), `${path} opens a door via \`${route}\``).toBe(false);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* No internal node id can reach a learner                                    */
/* -------------------------------------------------------------------------- */

const PRODUCT_NODE_IDS: readonly string[] = getProductNodes().map((node) => node.id);

/**
 * The three learner-facing name sources a label may draw on, in `albumLabel`'s own order.
 * Derived from the same tables the function reads, so the census below is a statement
 * about the DATA rather than a transcription of the function.
 */
function namedElsewhere(nodeId: string): boolean {
  const era = getEraOfNode(nodeId)?.id;
  if (!era) {
    return false;
  }
  return (
    buildingName(nodeId) !== nodeId ||
    buildingSubtitle(nodeId, era) !== null ||
    lessonByNode[nodeId] !== undefined
  );
}

describe("no internal node id reaches a learner", () => {
  const labels = PRODUCT_NODE_IDS.map((nodeId) => ({
    nodeId,
    label: albumLabel(nodeId, getEraOfNode(nodeId)?.id ?? "prehistoric"),
  }));

  it("sweeps the whole product registry, not a sample of it", () => {
    // The population floor. `buildingName` documents its own fallback as *"or the node id
    // if unmapped"* and 56 of the 62 are unmapped, so a sweep scoped to the six mapped
    // nodes would be green over the exact population that can leak.
    expect(PRODUCT_NODE_IDS.length).toBeGreaterThanOrEqual(62);
    expect(labels).toHaveLength(PRODUCT_NODE_IDS.length);
  });

  it("never labels a building with its own node id", () => {
    for (const { nodeId, label } of labels) {
      expect(label, `${nodeId} was labelled with its own id`).not.toBe(nodeId);
      if (label !== null) {
        expect(label.includes(nodeId), `${nodeId} leaked inside "${label}"`).toBe(false);
      }
    }
  });

  it("names every node that has a name, and only invents one for none", () => {
    // A CENSUS THAT FAILS BOTH WAYS, which is what stops the assertion above being green
    // because every label is `null`. A node with any of the three sources must be named,
    // and a node with none of them must be `null` rather than carry an invented string.
    const named = labels.filter((entry) => entry.label !== null).map((e) => e.nodeId);
    const unnamed = labels.filter((entry) => entry.label === null).map((e) => e.nodeId);
    expect(named.filter((nodeId) => !namedElsewhere(nodeId))).toEqual([]);
    expect(unnamed.filter((nodeId) => namedElsewhere(nodeId))).toEqual([]);
    // The named side carries a floor for the reason it always did: it is what keeps the leak
    // sweep above measuring real strings rather than a page of nulls. It is the whole product
    // now — 39 named and 23 unnamed at the time of writing, and 62 and 0 since every node
    // gained a lesson pack — so the floor is the population.
    expect(named.length).toBe(PRODUCT_NODE_IDS.length);
    expect(named.length).toBeGreaterThanOrEqual(62);
    expect(named.length + unnamed.length).toBe(PRODUCT_NODE_IDS.length);
    // The `null` side is empty, so its arm of the biconditional above is now vacuous, and a
    // floor of one on it would have to be lowered to zero. It is DRIVEN instead, the way the
    // `unauthored` era state is in `eraTimelineView.test.ts`: a node id nothing in the product
    // knows about has no building name, no subtitle and no lesson, so it must come back `null`
    // rather than carrying an invented string. That is a claim about `albumLabel` rather than
    // about today's content, and unlike the floor it cannot be retired by authoring.
    const unknown = "POL.99";
    expect(PRODUCT_NODE_IDS).not.toContain(unknown);
    expect(namedElsewhere(unknown)).toBe(false);
    expect(albumLabel(unknown, eraIdAt(1))).toBeNull();
  });

  it("prefers the city's own building name over the lesson title where both exist", () => {
    // Era one's six have both, and an album shows BUILDINGS, so the building name wins.
    // Asserted because the fallback order is the whole of `albumLabel`'s argument.
    const dwellings = albumLabel("NUM.2", eraIdAt(1));
    expect(dwellings).toBe("Dwellings, Hut Cluster");
    expect(dwellings).not.toBe(lessonByNode["NUM.2"]?.title);
  });

  it("uses the ratified Medieval building names on album pages", () => {
    expect(albumLabel("RAT.1", "medieval")).toBe("Workshop, the Weaver's Shop");
    expect(albumLabel("RAT.2", "medieval")).toBe("Store, the Wool Store");
    expect(albumLabel("RAT.3", "medieval")).toBe("Assembly Hall, the Guild Hall");
    expect(albumLabel("RAT.4", "medieval")).toBe("Tower, the Tower House");
    expect(albumLabel("RAT.6", "medieval")).toBe("Dwellings, the Timber Houses");
  });

  it("records all six Industrial buildings and the Engine House by ratified name", () => {
    const album = cityAlbum({
      placements: placeEra("industrial", 6),
      townHall: HALL,
      liveEraId: "industrial",
    });
    const frame = album.frames.find((candidate) => candidate.era.id === "industrial");
    expect(frame, "the Industrial album page exists").toBeDefined();
    expect(
      frame?.raised.filter((piece) => piece.kind === "skill").map((piece) => piece.label),
    ).toEqual([
      "Assembly Hall, the Spinning Mill",
      "Store, the Cotton Warehouse",
      "Workshop, the Locomotive Shop",
      "Assembly Hall, the Exhibition Hall",
      "Workshop, the Cannon Factory",
      "Tower, the Water Tower",
    ]);
    expect(frame?.hallLabel).toBe("Town Hall, the Engine House");
  });
});
