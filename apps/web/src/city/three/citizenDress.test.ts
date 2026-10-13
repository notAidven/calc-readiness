import { type CitizenNodeInput, deriveCitizenRoster } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  CITIZEN_SKIN,
  CLOTH_SHADE,
  citizenDress,
  ERA_CITIZEN_DRESS,
  hasAuthoredCitizenDress,
  shadeCloth,
  UNAUTHORED_CITIZEN_DRESS,
} from "../citizenDress";
import { mix } from "../palette";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "../worldLayout";
import { buildCitizenRig, type CitizenRig } from "./Citizens";
import { citizenPlaces } from "./citizenPlaces";

/**
 * **THE CROWD CARRIES THE ERA — read out of the built rig, era by era.**
 *
 * THE DEFECT THIS PINS: `Citizens.tsx` had no era concept at all. Its palette was a single
 * `CITIZEN` constant of era-one hex and its geometry was era one's hide tunic, so a Bronze Age
 * city was populated by people in prehistoric hide. That is the borrowed-dressing defect at
 * its most vivid, because the citizens are the only thing on the island that moves — and it is
 * the same defect `islandEra.test.ts` was written for one surface down.
 *
 * **Every assertion below reads MATERIAL AND INSTANCE COLOURS, MESH COUNTS AND GEOMETRY off
 * the rig `buildCitizenRig` actually produced, never off `citizenDress.ts`'s table.** A cloth
 * that is declared and never worn, a cut that is named and never built, or an ornament gated
 * out of a row but still drawn must not be able to satisfy this.
 *
 * ## The population is `ERA_SEQUENCE`, and both verdicts carry a floor AND a composition
 *
 * Not a written-down list of the seven unauthored eras: a hardcoded population passes while
 * covering a fraction of reality, which is the recurring failure mode in this tree. And a
 * floor is not sufficient on its own, because a floor constrains SIZE and not SHAPE — three
 * rows are satisfied by era one plus any two. So the authored set is also asserted to be
 * genuinely wider than the ONE era that shipped before this change, which is where "the table
 * quietly shrank back to era one" can fail.
 */

const SEED = 0x5eed;
const HUB = TOWN_HALL_CENTER_TRANSFORM;
const HUB_PLACEMENT: PlacedTransform = { ...HUB, nodeId: TOWN_HALL_ID };
const SKILL_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;

/** The mastery accent, reserved in every era: a body is never gold. */
const RESERVED_GOLD = 0xffb703;

/** The era the crowd shipped in, derived rather than written: era one is `ERA_SEQUENCE[0]`. */
const FIRST_ERA: EraId = ERA_SEQUENCE[0]?.id ?? "prehistoric";

const ROLES: Readonly<Record<string, CitizenNodeInput["citizen_role"]>> = {
  "NUM.2": "residence",
  "NUM.3": "school",
};

function masteredNode(nodeId: string): CitizenNodeInput {
  return {
    node_id: nodeId,
    citizen_role: ROLES[nodeId] ?? "civic",
    placed: true,
    mastery: 2,
    lesson_stage: "done",
    placement_estimate: 0,
  };
}

/** The settled island's roster — the same people in every era, so only the clothes move. */
function rosterFor() {
  return deriveCitizenRoster({ nodes: SKILL_NODES.map(masteredNode), seed: SEED });
}

/** A settled island's crowd, dressed for one era. */
function rigFor(eraId: EraId): CitizenRig {
  const placements = defaultPlacements([...SKILL_NODES], [HUB_PLACEMENT], BUILDABLE_RADIUS);
  const roster = rosterFor();
  const places = citizenPlaces({ roster, placements, hub: HUB, seed: SEED });
  return buildCitizenRig({
    roster,
    places,
    placements: [...placements, HUB_PLACEMENT],
    eraId,
  });
}

/**
 * The colours one instanced mesh actually uploaded, in instance order, read back out of the
 * buffer through the same sRGB round trip the renderer wrote them with.
 */
function instanceColors(mesh: THREE.InstancedMesh): number[] {
  const buffer = mesh.instanceColor;
  if (!buffer) {
    return [];
  }
  const colour = new THREE.Color();
  const out: number[] = [];
  for (let i = 0; i < mesh.count; i += 1) {
    colour.fromArray(buffer.array as unknown as number[], i * 3);
    out.push(colour.getHex());
  }
  return out;
}

/**
 * What the crowd's cloth SHOULD be in one era, computed independently of the renderer: the
 * era's row mixed by each citizen's own seeded `shirt_tone`.
 *
 * Re-deriving beats looking for the row's two endpoints in the buffer, and the first version
 * of this file made exactly that mistake: `mix` lands on an endpoint only where a seeded tone
 * is exactly 0 or 1, so *"the era's own cloth is on somebody"* was false in every era while
 * every citizen was correctly dressed.
 */
function expectedCloth(eraId: EraId): number[] {
  const row = citizenDress(eraId);
  const reference = new THREE.Color();
  return rosterFor().citizens.map((citizen) =>
    reference.setHex(mix(row.cloth, row.clothDeep, citizen.look.shirt_tone)).getHex(),
  );
}

/** How many instanced meshes one era's crowd draws. */
function instancedDraws(rig: CitizenRig): { instanced: number; plain: number } {
  let instanced = 0;
  let plain = 0;
  rig.root.traverse((child) => {
    const mesh = child as { isInstancedMesh?: boolean; isMesh?: boolean };
    if (mesh.isInstancedMesh === true) {
      instanced += 1;
    } else if (mesh.isMesh === true) {
      plain += 1;
    }
  });
  return { instanced, plain };
}

/** The body outline as the camera sees it: the merged geometry's own bounding box. */
function bodyBox(rig: CitizenRig): THREE.Box3 {
  const geometry = rig.bodies.geometry;
  geometry.computeBoundingBox();
  return (geometry.boundingBox as THREE.Box3).clone();
}

/**
 * Relative luminance (WCAG), which is the channel a citizen keeps at full zoom-out when it is
 * a few pixels wide and hue and detail are both gone.
 */
function luminance(hex: number): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((hex >> 16) & 0xff) +
    0.7152 * channel((hex >> 8) & 0xff) +
    0.0722 * channel(hex & 0xff)
  );
}

describe("the crowd is dressed per era (D-ERA28 extended; see citizenDress.ts)", () => {
  it("dresses an era with no authored crowd in the fallback, never a previous era's clothes", () => {
    const authored: EraId[] = [];
    const unauthored: EraId[] = [];
    const wornPerEra = new Map<EraId, number[]>();

    for (const era of ERA_SEQUENCE) {
      const rig = rigFor(era.id);
      const worn = instanceColors(rig.bodies);
      wornPerEra.set(era.id, worn);
      // Somebody is always drawn and always coloured, whichever era it is: the total
      // contract `citizenDress` shares with `islandGround` and `roadSurfacing`.
      expect(rig.bodies.count, era.id).toBeGreaterThan(0);
      expect(worn.length, era.id).toBe(rig.bodies.count);
      expect(new Set(worn).size, era.id).toBeGreaterThan(2);

      // The crowd is wearing THIS era's row and no other, measured against the row mixed
      // by each citizen's own seeded tone rather than against the row's endpoints.
      expect(worn, era.id).toEqual(expectedCloth(era.id));

      const row = citizenDress(era.id);
      if (hasAuthoredCitizenDress(era.id)) {
        authored.push(era.id);
        expect(row.art, era.id).toBe("authored");
      } else {
        unauthored.push(era.id);
        expect(row.art, era.id).toBe("unauthored");
      }
    }

    // THE ASSERTION THE WHOLE CHANGE IS FOR, and it is a comparison between eras rather
    // than a lookup: the same forty-four people, seeded identically, are wearing DIFFERENT
    // clothes in eras that authored different ones. Before this axis existed every era's
    // array was identical to era one's, which is what "the advance did nothing" looked
    // like on the only thing on the island that moves.
    for (const era of ERA_SEQUENCE) {
      for (const other of ERA_SEQUENCE) {
        if (era.id === other.id) {
          continue;
        }
        const sameRow = citizenDress(era.id).cloth === citizenDress(other.id).cloth;
        const overlap = (wornPerEra.get(era.id) ?? []).filter((hex, index) =>
          sameRow ? false : hex === (wornPerEra.get(other.id) ?? [])[index],
        );
        if (sameRow) {
          // Two unauthored eras share the fallback, and that is the point of a fallback.
          expect(wornPerEra.get(era.id), `${era.id} vs ${other.id}`).toEqual(
            wornPerEra.get(other.id),
          );
        } else {
          // Not one citizen out of forty-four is wearing the other era's cloth.
          expect(overlap, `${era.id} wears ${other.id}'s clothes`).toEqual([]);
        }
      }
    }

    // FLOORS, on both verdicts and on the sequence itself, derived from the table rather
    // than written down — so authoring era four moves the split rather than failing here.
    expect(authored.length + unauthored.length).toBe(ERA_SEQUENCE.length);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(authored).toEqual(Object.keys(ERA_CITIZEN_DRESS));
    expect(authored.length).toBeGreaterThanOrEqual(3);
    expect(unauthored.length).toBeGreaterThanOrEqual(6);

    // COMPOSITION, because a floor constrains size and not shape. Two claims about SHAPE
    // that three-of-ten does not imply:
    //
    //  1. The table is genuinely wider than the ONE era that shipped before this change.
    //  2. **The authored crowds are a PREFIX of the run**, so the fallback is somewhere a
    //     learner ARRIVES at and never something they pass back through. Dress eras one and
    //     three and leave era two out and the learner watches the crowd regress to the
    //     placeholder at one advance and un-regress at the next, which reads as a bug in a
    //     way that reaching unauthored country does not. Every floor above is satisfied by
    //     exactly that gap; this is where it fails.
    expect(authored).toContain(FIRST_ERA);
    expect(authored.filter((era) => era !== FIRST_ERA).length).toBeGreaterThanOrEqual(2);
    expect(authored).toEqual(ERA_SEQUENCE.slice(0, authored.length).map((era) => era.id));
  });

  it("keeps era one's crowd byte-for-byte as it shipped", () => {
    // Era one's citizens are shipped, measured and approved art, and giving them an era
    // axis must not have re-tinted them. Pinned against literals rather than against the
    // table, because a transcription is exactly where a mistyped digit hides.
    const row = citizenDress(FIRST_ERA);
    expect(row.cloth).toBe(0x9c7a52);
    expect(row.clothDeep).toBe(0x6b5238);
    expect(row.cut).toBe("tunic");
    expect(row.crown).toBe("round");
    expect(row.ornament).toBeNull();
    expect(CITIZEN_SKIN.warm).toBe(0xc08a5a);
    expect(CITIZEN_SKIN.deep).toBe(0xa8734a);

    // And they are WORN, so this is not a pin over a table nobody reads: every citizen's
    // cloth lies inside the shipped pair, and somebody is close to each end of it.
    const worn = instanceColors(rigFor(FIRST_ERA).bodies);
    expect(worn.length).toBeGreaterThan(8);
    const values = worn.map(luminance);
    const low = luminance(0x6b5238);
    const high = luminance(0x9c7a52);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(low - 1e-6);
      expect(value).toBeLessThanOrEqual(high + 1e-6);
    }
    expect(Math.min(...values)).toBeLessThan(low + (high - low) * 0.15);
    expect(Math.max(...values)).toBeGreaterThan(high - (high - low) * 0.15);
  });

  /**
   * The shade rule with its ONE named exception, asserted in both directions so the list can
   * neither go on excusing something it has stopped describing nor quietly swallow the rule.
   *
   * Forcing era one onto the rule fails at the first expectation; putting a second era into
   * `SHADE_EXEMPT` without changing its row fails at the second.
   */
  it("derives every authored era's deep cloth from the rule, except the one era that may not move", () => {
    const SHADE_EXEMPT: readonly EraId[] = [FIRST_ERA];

    for (const era of SHADE_EXEMPT) {
      const row = ERA_CITIZEN_DRESS[era];
      // A declared exception that still exists, and still needs excusing.
      expect(row, `${era} is a declared exception that still has a row`).toBeDefined();
      expect(
        row?.clothDeep,
        `${era} is exempt from CLOTH_SHADE and must keep its shipped literal`,
      ).not.toBe(shadeCloth(row?.cloth ?? 0));
    }

    const onTheRule = (Object.keys(ERA_CITIZEN_DRESS) as EraId[]).filter(
      (era) => !SHADE_EXEMPT.includes(era),
    );
    // A floor, because the loop below holds trivially over an empty set.
    expect(onTheRule.length).toBeGreaterThanOrEqual(2);
    for (const era of onTheRule) {
      const row = ERA_CITIZEN_DRESS[era];
      expect(row?.clothDeep, `${era} has not quietly left CLOTH_SHADE`).toBe(
        shadeCloth(row?.cloth ?? 0),
      );
    }

    // The rule is the relation era one already holds, to within the rounding that is the
    // reason era one is exempt at all.
    const first = ERA_CITIZEN_DRESS[FIRST_ERA];
    const measured = ((first?.clothDeep ?? 0) >> 16) / ((first?.cloth ?? 1) >> 16 || 1);
    expect(Math.abs(measured - CLOTH_SHADE)).toBeLessThan(0.02);
    expect(UNAUTHORED_CITIZEN_DRESS.clothDeep).toBe(
      shadeCloth(UNAUTHORED_CITIZEN_DRESS.cloth),
    );
  });

  /**
   * **THE CROSS-ERA READ, in the one channel that survives full zoom-out.** At a few pixels
   * a citizen has no hue, no detail and no ornament — only a value against the ground. So the
   * authored cloths are asserted to be separated by LUMINANCE and not merely to be different
   * numbers, which two indistinguishable browns would also satisfy.
   */
  it("separates every authored era's cloth by value, not merely by hex", () => {
    const rows = Object.entries(ERA_CITIZEN_DRESS) as [EraId, { cloth: number }][];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(new Set(rows.map(([, row]) => row.cloth)).size).toBe(rows.length);

    const values = rows
      .map(([era, row]) => ({ era, l: luminance(row.cloth) }))
      .sort((a, b) => a.l - b.l);
    for (let i = 1; i < values.length; i += 1) {
      const lower = values[i - 1];
      const upper = values[i];
      // A real step, not a rounding difference: each era's crowd is visibly lighter or
      // darker than its neighbour's rather than a different shade of the same value.
      expect(
        (upper?.l ?? 0) - (lower?.l ?? 0),
        `${lower?.era} and ${upper?.era} are the same value`,
      ).toBeGreaterThan(0.12);
    }

    // The fallback is off the authored ladder entirely, so a fallback crowd cannot be
    // mistaken for an authored one at any zoom.
    for (const { era, l } of values) {
      expect(
        Math.abs(l - luminance(UNAUTHORED_CITIZEN_DRESS.cloth)),
        `${era} is the same value as the fallback`,
      ).toBeGreaterThan(0.05);
    }
  });

  /**
   * The SILHOUETTE half, read off the merged body geometry rather than off the `cut` string —
   * a cut named in the table and never built would satisfy a string comparison perfectly.
   */
  it("builds a different outline for every authored cut, at the same standing height", () => {
    const boxes = new Map<EraId, THREE.Box3>();
    for (const era of Object.keys(ERA_CITIZEN_DRESS) as EraId[]) {
      boxes.set(era, bodyBox(rigFor(era)));
    }
    expect(boxes.size).toBeGreaterThanOrEqual(3);

    const cuts = new Set(Object.values(ERA_CITIZEN_DRESS).map((row) => row.cut));
    // Every authored cut is a different cut: three rows sharing one cut would make the
    // silhouette claim vacuous while every colour assertion above still passed.
    expect(cuts.size).toBe(Object.keys(ERA_CITIZEN_DRESS).length);

    // The outlines really differ — measured as the hem's own width, which is what the cuts
    // are about — and no two eras' bodies occupy the same box.
    const signatures = new Set(
      [...boxes.values()].map((box) =>
        [box.min.x, box.max.x, box.min.y, box.max.y, box.min.z, box.max.z]
          .map((n) => n.toFixed(4))
          .join(","),
      ),
    );
    expect(signatures.size).toBe(boxes.size);

    // AND THE HEIGHT DID NOT MOVE, which is what keeps the derived scale against the
    // Dwellings and the near-plane claim true in ten eras rather than in one.
    const heights = new Set(ERA_SEQUENCE.map((era) => rigFor(era.id).height));
    expect(heights.size).toBe(1);
    for (const box of boxes.values()) {
      expect(box.min.y).toBeCloseTo(0, 6);
    }
  });

  /**
   * The ORNAMENT population, with its exceptions named and failing both ways. Era one and the
   * fallback are the entries that genuinely do not owe one, each for a stated reason, and a
   * member that stops qualifying or quietly adopts one fails here.
   */
  it("puts the era's one note on a person only where a guide authors one", () => {
    // Era one has neither metal nor weaving; era two's guide dates its own bead as "its
    // first appearance on a character", which would be false if era one's people wore one.
    const NO_ORNAMENT: readonly EraId[] = [FIRST_ERA];

    for (const era of NO_ORNAMENT) {
      const row = ERA_CITIZEN_DRESS[era];
      expect(row, `${era} is a declared exception that still has a row`).toBeDefined();
      expect(row?.ornament, `${era} has not quietly gained an ornament`).toBeNull();
      expect(rigFor(era).ornaments, `${era} draws no ornament mesh`).toBeNull();
    }
    expect(UNAUTHORED_CITIZEN_DRESS.ornament).toBeNull();

    const ornamented = (Object.keys(ERA_CITIZEN_DRESS) as EraId[]).filter(
      (era) => !NO_ORNAMENT.includes(era),
    );
    expect(ornamented.length).toBeGreaterThanOrEqual(2);

    const ids = new Set<string>();
    const places = new Set<string>();
    for (const era of ornamented) {
      const row = ERA_CITIZEN_DRESS[era];
      expect(row?.ornament, `${era} owes an ornament and has none`).not.toBeNull();
      ids.add(row?.ornament?.id ?? "");
      places.add(row?.ornament?.at ?? "");
      // And it is DRAWN, on every citizen, riding the same transform as the body.
      const rig = rigFor(era);
      const ornaments = rig.ornaments;
      // Narrowed rather than optional-chained through, so a missing draw fails by NAME here
      // instead of throwing a TypeError off `undefined.color` two lines down.
      if (!ornaments) {
        throw new Error(`${era} declares an ornament and draws none`);
      }
      expect(ornaments.count, era).toBe(rig.bodies.count);
      expect((ornaments.material as THREE.MeshStandardMaterial).color.getHex(), era).toBe(
        row?.ornament?.color,
      );
    }
    // Two eras' notes are two different notes, in two different places on the figure — so
    // the eras differ in outline as well as in hue, from every angle of the orbiting camera.
    expect(ids.size).toBe(ornamented.length);
    expect(places.size).toBe(ornamented.length);
  });

  /**
   * **THE ORNAMENT HAS TO CLEAR THE HEAD, and this is the guard for a defect that shipped.**
   *
   * The first version of this change put era two's bead at the throat, where its guide's
   * dressing puts it, and drew a whole extra instanced mesh of nothing: a citizen is
   * deliberately head-heavy (the head is 41.5% of standing height) and the camera is fixed at
   * about 49 degrees, so the head occludes the entire front of the body at every angle of the
   * orbit. `output/citizens-per-era/SHEET-4-figure.png` is the frame that showed it — the same
   * four citizens in all three eras, with no bead anywhere in the picture.
   *
   * So the property is geometric and is checked as such: a note must sit either ABOVE the
   * head's top or OUTBOARD of its half-width, which are the two places this camera can see.
   * Moving era three's pin back inboard to the body's own radius fails here.
   */
  it("puts the era's note somewhere this camera can actually see it", () => {
    for (const era of Object.keys(ERA_CITIZEN_DRESS) as EraId[]) {
      const rig = rigFor(era);
      if (!rig.ornaments) {
        continue;
      }
      const note = rig.ornaments.geometry;
      const head = rig.heads.geometry;
      note.computeBoundingBox();
      head.computeBoundingBox();
      const n = note.boundingBox as THREE.Box3;
      const h = head.boundingBox as THREE.Box3;

      // PROTRUSION, not containment: a note flush with a surface reads as a fleck, which is
      // what the throat bead was. It has to stand proud of the head in one of the two
      // directions this camera can see — up out of the crown, or out past its side.
      const proudOfTheCrown = n.max.y > h.max.y;
      const outboard = n.min.x < h.min.x || n.max.x > h.max.x;
      expect(
        proudOfTheCrown || outboard,
        `${era}'s note sits inside the head's own silhouette (note x ${n.min.x.toFixed(3)}..` +
          `${n.max.x.toFixed(3)} y ${n.min.y.toFixed(3)}..${n.max.y.toFixed(3)}; head x ` +
          `${h.min.x.toFixed(3)}..${h.max.x.toFixed(3)} y ${h.min.y.toFixed(3)}..` +
          `${h.max.y.toFixed(3)}), so it is an instanced draw of nothing`,
      ).toBe(true);
      // And it does not push the figure taller than the height every other claim is pinned to.
      expect(n.max.y, era).toBeLessThanOrEqual(rig.height + 1e-6);
    }
  });

  /**
   * The draw budget, per era. D-CIT9's claim is that a throng costs roughly what a handful
   * does, and this axis may not spend it: an ornament is ONE extra instanced draw, uniform
   * coloured with no per-instance colour buffer, and absent rather than empty where no era
   * authors one — so an unornamented era costs exactly what it did before this change.
   */
  it("keeps the whole crowd in two instanced draws, plus at most one for the era's note", () => {
    let withOrnament = 0;
    let without = 0;
    for (const era of ERA_SEQUENCE) {
      const rig = rigFor(era.id);
      const { instanced, plain } = instancedDraws(rig);
      const expected = rig.dress.ornament ? 3 : 2;
      expect(instanced, era.id).toBe(expected);
      expect(plain, era.id).toBe(0);
      if (rig.dress.ornament) {
        withOrnament += 1;
        // The ornament carries no per-instance colour buffer: it is the era's note, not
        // the person's, so there is nothing per-citizen to upload.
        expect(rig.ornaments?.instanceColor, era.id).toBeNull();
      } else {
        without += 1;
      }
    }
    // Floors under both branches, because "at most three" is satisfied by a scene in which
    // no era has an ornament and by one in which every era does.
    expect(withOrnament).toBeGreaterThanOrEqual(2);
    expect(without).toBeGreaterThanOrEqual(7);
  });

  it("never dresses anybody in the reserved mastery gold, in any era", () => {
    // `#FFB703` is the mastery accent and may never be a material — all three authored
    // guides restate it. Compared through `THREE.Color` because three linearises on
    // `setHex`, so a raw sRGB threshold would let a literal gold through.
    const gold = new THREE.Color().setHex(RESERVED_GOLD);
    const sample = new THREE.Color();
    for (const era of ERA_SEQUENCE) {
      const rig = rigFor(era.id);
      expect(rig.bodies.count, era.id).toBeGreaterThan(0);
      for (const mesh of [rig.bodies, rig.heads]) {
        const buffer = mesh.instanceColor;
        expect(buffer, era.id).not.toBeNull();
        for (let i = 0; i < mesh.count; i += 1) {
          sample.fromArray(buffer?.array as unknown as number[], i * 3);
          expect(
            Math.hypot(sample.r - gold.r, sample.g - gold.g, sample.b - gold.b),
            `${era.id} instance ${i} is the reserved gold`,
          ).toBeGreaterThan(0.15);
        }
      }
      if (rig.ornaments) {
        const note = (rig.ornaments.material as THREE.MeshStandardMaterial).color;
        expect(
          Math.hypot(note.r - gold.r, note.g - gold.g, note.b - gold.b),
          `${era.id}'s ornament is the reserved gold`,
        ).toBeGreaterThan(0.15);
      }
    }
  });

  /**
   * Skin does NOT move with the era, and all three authored guides say so in the same words:
   * *"Skin and hair are the only notes outside it."* Under D-ET9 the ten costumes are worn by
   * one person, so this is the one thing on a citizen an advance must not touch.
   */
  it("keeps skin off the era axis, because every guide puts it outside the palette", () => {
    const skins: Set<number>[] = [];
    for (const era of ERA_SEQUENCE) {
      const rig = rigFor(era.id);
      const worn = new Set<number>();
      const colour = new THREE.Color();
      const buffer = rig.heads.instanceColor;
      for (let i = 0; i < rig.heads.count; i += 1) {
        colour.fromArray(buffer?.array as unknown as number[], i * 3);
        worn.add(colour.getHex());
      }
      expect(worn.size, era.id).toBeGreaterThan(1);
      skins.push(worn);
    }
    const first = skins[0] as Set<number>;
    for (let i = 1; i < skins.length; i += 1) {
      expect([...(skins[i] as Set<number>)].sort(), ERA_SEQUENCE[i]?.id).toEqual(
        [...first].sort(),
      );
    }
  });

  /**
   * Every row cites the guide passage it was transcribed from, so a reader can check it
   * rather than take the colour on trust — and so a row authored by taste rather than from a
   * guide is visibly missing something.
   */
  it("makes every row say which guide passage dressed it", () => {
    const rows = Object.entries(ERA_CITIZEN_DRESS);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const [era, row] of rows) {
      expect(row.source.length, era).toBeGreaterThan(60);
      expect(row.source, era).toContain("style-guide.md");
      // The guide it cites is its OWN era's, so a row cannot be justified by a neighbour's
      // passage. Padded off the sequence position rather than written down, so era ten's
      // `era-10-cyberpunk` matches as readily as era one's `era-01-prehistoric`.
      const ordinal = String(ERA_SEQUENCE.findIndex((e) => e.id === era) + 1).padStart(
        2,
        "0",
      );
      expect(row.source, era).toContain(`era-${ordinal}`);
    }
    // The fallback is the one row with no guide behind it, and says so instead of citing one.
    expect(UNAUTHORED_CITIZEN_DRESS.source).not.toContain("style-guide.md");
    expect(UNAUTHORED_CITIZEN_DRESS.source.length).toBeGreaterThan(60);
  });
});
