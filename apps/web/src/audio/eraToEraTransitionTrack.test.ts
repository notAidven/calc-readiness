import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  CEREMONY_MUSIC,
  CEREMONY_SLOT_TRACK_ID,
  crisisSlotTrackId,
  eraSlotTrackId,
  type MusicScene,
  musicSlots,
  trackIdForScene,
} from "./eraMusic";
import { MUSIC_TRACKS, type MusicTrack } from "./musicRegistry";

/**
 * **THE ERA-TO-ERA TRANSITION HAS A TRACK OF ITS OWN, AT EVERY SEAM, AND IT IS NEITHER
 * AGE'S MUSIC.**
 *
 * This file exists because the decision it pins was cancelled once and then reversed. #556
 * added the fifteenth slot and merged. #605 took it back out on a ruling that the ceremony
 * should simply keep playing the era's own track, and while that PR was still an open draft
 * the lead reversed himself: *"also i take back what i said about there not being a specific
 * era transition song - there should be for the era-to-era transitions for better feel."*
 * #605 was closed unmerged, so nothing of the removal ever reached `integration` — but the
 * removal is written down in two open branches, and a decision that has already flipped once
 * is exactly the kind that gets flipped back by a merge nobody reads closely.
 *
 * So the ruling is asserted rather than remembered. **A third reversal is now a test to
 * delete rather than a slot to quietly drop**, and the failure message names whose ruling it
 * is breaking.
 *
 * ## THE POPULATION IS THE SEAMS, NOT THE ERAS
 *
 * `eraMusic.test.ts` and `musicSlots.test.ts` already walk the ten ERAS and check that a
 * ceremony declared over each of them resolves to the bed. That is the right check for "the
 * slot is wired", and it is not the thing the lead asked for. He asked for **era-to-era
 * transitions**, of which there are nine, and a transition has two ends: the age being left
 * and the age being entered. A guard scoped to single eras cannot see the second end at all,
 * so it would stay green over a bed that happened to resolve to the incoming era's track —
 * which is one of the two ways this feature can be wrong and is the way the prompt sheet's
 * period-neutrality requirement exists to prevent.
 *
 * The nine seams are derived from `ERA_SEQUENCE` in play order rather than written down, and
 * both the size and the SHAPE of that derivation are asserted below: a floor alone would be
 * satisfied by nine copies of the same pair.
 *
 * ## THE BED HAS LANDED, AND THAT CHANGES WHAT THESE CASES ARE WORTH
 *
 * When this file was written the take did not exist, so the nine seam cases below each
 * register the bed into the manifest for the duration of the case (`withShippedTracks`).
 * That was the only way to state the ruling at the time, and it has a limit worth naming:
 * **a synthesised row means those nine cases pass whether or not the bed really ships.**
 * They are statements about the selection function, not about a sound anything plays.
 *
 * `ceremony-advance` was generated on 2026-08-05 and registered, so the missing half is now
 * obtainable and is the last `describe` in this file: the same nine seams measured over the
 * **shipped** manifest with nothing synthesised. The nine original cases are kept as they
 * are — they would still be the right shape if the row were ever withdrawn — and the new
 * one is what says a learner actually hears the bed.
 */

function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an element at index ${index}, found ${items.length}`);
  }
  return item;
}

/** One era-to-era transition: the age being left, and the age being entered. */
interface Seam {
  readonly from: EraId;
  readonly to: EraId;
}

/**
 * EVERY SEAM THE ERA SEQUENCE ACTUALLY HAS, in play order and derived from it.
 *
 * `ERA_SEQUENCE` is what `setCityEra` accepts and what the ceremony advances through, so an
 * eleventh era arriving adds its seam here on the same run rather than leaving this file
 * measuring nine of ten.
 */
const SEAMS: readonly Seam[] = ERA_SEQUENCE.slice(0, -1).map((era, index) => ({
  from: era.id,
  to: nth(ERA_SEQUENCE, index + 1).id,
}));

/** Register ids as shipped for the duration of `body`, then restore exactly. */
function withShippedTracks(ids: readonly string[], body: () => void): void {
  const table = MUSIC_TRACKS as unknown as MusicTrack[];
  const before = table.length;
  for (const id of ids) {
    table.push({ ...nth(MUSIC_TRACKS, 0), id, title: id, file: `music/${id}.ogg` });
  }
  try {
    body();
  } finally {
    table.length = before;
  }
}

/** The city standing in `eraId`, with `eraId`'s own advance ceremony running over it. */
function ceremonyScene(eraId: EraId): MusicScene {
  return { eraId, crisisEraId: null, ceremony: { eraId } };
}

/** The three ids a seam needs registered: both ages' tracks and the bed between them. */
function tracksFor(seam: Seam): readonly string[] {
  return [eraSlotTrackId(seam.from), eraSlotTrackId(seam.to), CEREMONY_SLOT_TRACK_ID];
}

describe("the nine era-to-era seams, derived rather than listed", () => {
  it("is every consecutive pair in the era sequence, by shape and not only by count", () => {
    // A floor constrains size, not shape: nine copies of the prehistoric-to-neolithic pair
    // would clear `toBeGreaterThanOrEqual(9)` and measure one seam nine times. So the
    // composition is asserted too — every era but the last opens a seam, every era but the
    // first closes one, and no seam is a self-transition.
    expect(SEAMS.length).toBeGreaterThanOrEqual(9);
    expect(SEAMS).toHaveLength(ERA_SEQUENCE.length - 1);
    expect(SEAMS.map((seam) => seam.from)).toEqual(
      ERA_SEQUENCE.slice(0, -1).map((era) => era.id),
    );
    expect(SEAMS.map((seam) => seam.to)).toEqual(
      ERA_SEQUENCE.slice(1).map((era) => era.id),
    );
    for (const seam of SEAMS) {
      expect(seam.from, `${seam.from} -> ${seam.to}`).not.toBe(seam.to);
    }
  });
});

describe("what plays while the city crosses from one age to the next", () => {
  it("is the ceremony's own bed at every seam, and neither age's track", () => {
    // THE LEAD'S RULING, MEASURED AT ALL NINE SEAMS: *"there should be [a specific era
    // transition song] for the era-to-era transitions for better feel."* Both ends are
    // checked because a transition has two, and a bed that resolved to either of them would
    // be the cancelled design wearing the reinstated one's name.
    for (const seam of SEAMS) {
      const where = `${seam.from} -> ${seam.to}`;
      withShippedTracks(tracksFor(seam), () => {
        const playing = trackIdForScene(ceremonyScene(seam.from));
        expect(playing, where).toBe(CEREMONY_SLOT_TRACK_ID);
        expect(playing, `${where}: plays the age being LEFT`).not.toBe(
          eraSlotTrackId(seam.from),
        );
        expect(playing, `${where}: plays the age being ENTERED`).not.toBe(
          eraSlotTrackId(seam.to),
        );
      });
    }
  });

  it("is the SAME bed at every seam, because it is one ritual and not nine", () => {
    // Period-neutrality, as far as the selection can state it. The prompt sheet asks for one
    // passage that sits between stone-age hand percussion and a synthetic city; the code's
    // half of that is that all nine seams resolve to one id. Ten variants would be a
    // different feature and would show up here as a set of nine.
    const resolved = new Set(
      SEAMS.map((seam) => {
        let playing = "";
        withShippedTracks(tracksFor(seam), () => {
          playing = trackIdForScene(ceremonyScene(seam.from));
        });
        return playing;
      }),
    );
    expect(resolved.size, [...resolved].join(", ")).toBe(1);
    expect([...resolved]).toEqual([CEREMONY_SLOT_TRACK_ID]);
  });

  it("hands the incoming age its own track at the press, and not before", () => {
    // The other half of "era-to-era": the bed is a bridge with a far side. The advance press
    // moves the era while the ceremony surface is still declared, and that is the moment the
    // incoming age arrives — so a bed that outlived the press would be the destination era
    // scored by the previous era's ceremony.
    for (const seam of SEAMS) {
      const where = `${seam.from} -> ${seam.to}`;
      withShippedTracks(tracksFor(seam), () => {
        const afterPress: MusicScene = {
          eraId: seam.to,
          crisisEraId: null,
          ceremony: { eraId: seam.from },
        };
        expect(trackIdForScene(afterPress), where).toBe(eraSlotTrackId(seam.to));
      });
    }
  });
});

describe("the bed is a slot of its own and cannot be folded into an era's", () => {
  it("names an id no era and no crisis derives", () => {
    // "Its OWN dedicated track" is a claim about the id space before it is a claim about a
    // file. Both derived families are enumerated over the whole sequence with their shape
    // asserted, so this cannot pass by comparing against an empty set.
    const derived = [
      ...ERA_SEQUENCE.map((era) => eraSlotTrackId(era.id)),
      ...ERA_SEQUENCE.map((era) => crisisSlotTrackId(era.id)),
    ];
    expect(derived).toHaveLength(ERA_SEQUENCE.length * 2);
    expect(derived.length).toBeGreaterThanOrEqual(20);
    expect(new Set(derived).size).toBe(derived.length);
    expect(derived).not.toContain(CEREMONY_SLOT_TRACK_ID);
  });

  it("is exactly one slot in the shipped manifest, carried by no era", () => {
    const ceremonies = musicSlots().filter((slot) => slot.kind === "ceremony");
    expect(ceremonies).toHaveLength(1);
    expect(nth(ceremonies, 0).trackId).toBe(CEREMONY_SLOT_TRACK_ID);
    // `eraId: null` is what makes it the slot no era owns. An era id here would make the
    // census read as if the other nine advances were missing a track.
    expect(nth(ceremonies, 0).eraId).toBeNull();
    expect(nth(ceremonies, 0).slot).toBe(CEREMONY_MUSIC);
  });
});

/**
 * **THE SAME NINE SEAMS, OVER THE SHIPPED MANIFEST, WITH NOTHING SYNTHESISED.**
 *
 * Every case above wraps itself in `withShippedTracks`, which pushes a `ceremony-advance`
 * row into `MUSIC_TRACKS` for the duration of the case. That was unavoidable while the take
 * did not exist, and it means those cases cannot tell a registered bed from an unregistered
 * one: strip the real row and they all still pass.
 *
 * This block is the half that could not be written until 2026-08-05. It calls the same
 * selection function on the same nine seams and never touches the manifest, so it fails the
 * moment the registry row is removed — which is exactly what the two open slot-removing
 * branches (#607, #609) would do, both written against a tree where removing it was right.
 */
describe("the shipped manifest really resolves every seam to the bed", () => {
  it("has a genuine ceremony-advance row, not a synthesised one", () => {
    // The premise the rest of this block rests on, asserted before it is used. Exactly one
    // row, so a duplicate pushed by a leaked `withShippedTracks` would fail here rather than
    // silently satisfy the seam cases below.
    const rows = MUSIC_TRACKS.filter((track) => track.id === CEREMONY_SLOT_TRACK_ID);
    expect(rows, "the ceremony bed has no row in the shipped manifest").toHaveLength(1);
    expect(nth(rows, 0).file).toBe(`music/${CEREMONY_SLOT_TRACK_ID}.ogg`);
    // A take of its own rather than one of the fourteen re-pointed, which was the original
    // defect and is still the cheapest way to make this block pass without a file.
    const otherFiles = MUSIC_TRACKS.filter(
      (track) => track.id !== CEREMONY_SLOT_TRACK_ID,
    ).map((track) => track.file);
    expect(otherFiles).not.toContain(nth(rows, 0).file);
    expect(otherFiles.length).toBeGreaterThanOrEqual(16);
  });

  it("plays the bed at all nine seams, and neither adjacent age's track", () => {
    // THE LEAD'S RULING AS A FACT ABOUT THE SHIPPED GAME rather than about the selection
    // function in isolation. Both ends of every seam, because a transition has two and a bed
    // that resolved to either would be the cancelled design wearing the reinstated one's
    // name.
    let measured = 0;
    for (const seam of SEAMS) {
      const where = `${seam.from} -> ${seam.to}`;
      const playing = trackIdForScene(ceremonyScene(seam.from));
      expect(playing, where).toBe(CEREMONY_SLOT_TRACK_ID);
      expect(playing, `${where}: plays the age being LEFT`).not.toBe(
        eraSlotTrackId(seam.from),
      );
      expect(playing, `${where}: plays the age being ENTERED`).not.toBe(
        eraSlotTrackId(seam.to),
      );
      measured += 1;
    }
    // The floor, because a loop over an empty SEAMS would make all three assertions
    // unanimous over nothing.
    expect(measured).toBe(9);
  });

  it("is the SAME bed at all nine, over the manifest the game ships", () => {
    const resolved = new Set(
      SEAMS.map((seam) => trackIdForScene(ceremonyScene(seam.from))),
    );
    expect(resolved.size, [...resolved].join(", ")).toBe(1);
    expect([...resolved]).toEqual([CEREMONY_SLOT_TRACK_ID]);
    expect(SEAMS).toHaveLength(9);
  });
});
