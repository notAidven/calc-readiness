import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { CRISIS_ERAS } from "../city/three/crisis/registry";
import { hasPlayableCrisis } from "../city/crisisCall";
import {
  CEREMONY_MUSIC,
  CEREMONY_SLOT_TRACK_ID,
  CRISIS_MUSIC,
  crisisSlotTrackId,
  ERA_MUSIC,
  eraScene,
  eraSlotTrackId,
  isShippedTrack,
  type MusicScene,
  musicSlots,
  standingInSlots,
  type TrackSlot,
  trackForScene,
  trackIdForEra,
  trackIdForScene,
} from "./eraMusic";
import { DEFAULT_TRACK_ID, MUSIC_TRACKS, type MusicTrack } from "./music";
import { SUNO_PRO_LICENCE, SUNO_PRO_LICENCE_2026_08_05 } from "./musicRegistry";

/**
 * THE POPULATION IS `ERA_SEQUENCE`, and that is a claim worth arguing rather than
 * assuming, because a guard scoped to the wrong set is the ordinary way a guard fails in
 * this tree.
 *
 * The defect is *the city is showing something and the soundtrack has no answer for it*.
 * The set of eras the city can stand in is exactly `ERA_SEQUENCE`: `setCityEra` takes an
 * `EraId`, and `loadEraId` refuses a stored value that `isEraId`, itself derived from
 * `ERA_SEQUENCE`, does not recognise. The set of crises is one per era, so the same
 * sequence is the population for both dimensions. There is no second place either can come
 * from, so this is scoping by behaviour and not merely by where the mechanic is
 * implemented.
 *
 * Both records are additionally total `Record<EraId, …>`, so an eleventh era is a compile
 * error. That is the stronger guarantee and it is NOT what these assertions are for: a
 * compile error is not something a test run reports, `vitest` transpiles without
 * typechecking, and a `Partial<>` or a cast retires the compiler's answer in one word. The
 * censuses below are what stay true through that, and they matter more now that the
 * mapping is one-to-one than they did when it was grouped: twenty rows is a wider surface
 * for one omission than two.
 */

/** Indexed access with a real failure, the idiom `music.test.ts` uses. */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an element at index ${index}, found ${items.length}`);
  }
  return item;
}

const ERA_ORDER: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

describe("the manifest covers every era, in both dimensions", () => {
  it("maps every era in ERA_SEQUENCE to a track, by set equality and not by count", () => {
    // Both directions, so an era added to the sequence with no row fails HERE and a row
    // for an era that has been renamed or removed fails here too. A count of ten would
    // have been satisfied by the wrong ten.
    expect(Object.keys(ERA_MUSIC).sort()).toEqual([...ERA_ORDER].sort());
    // The floor under the equality, because two empty sets are also equal.
    expect(ERA_ORDER.length).toBeGreaterThanOrEqual(10);
  });

  it("maps every era's CRISIS to a track too, by the same census", () => {
    expect(Object.keys(CRISIS_MUSIC).sort()).toEqual([...ERA_ORDER].sort());
    expect(ERA_ORDER.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every slot its own track id, one to one, with nothing shared", () => {
    // THE SHAPE OF THE MAPPING, which is the lead's ruling and not an implementation
    // detail: each era has its own track and each crisis has its own. Distinctness over
    // the whole manifest is what says no two slots have been quietly folded together.
    const slots = musicSlots();
    const ids = slots.map((entry) => entry.trackId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(slots).toHaveLength(ERA_ORDER.length * 2 + 1);
    expect(slots).toHaveLength(21);
    // Derived rather than written down, so there is no id in the manifest to misspell
    // into a stand-in nobody notices.
    for (const eraId of ERA_ORDER) {
      expect(eraSlotTrackId(eraId)).toBe(`era-${eraId}`);
      expect(crisisSlotTrackId(eraId)).toBe(`crisis-${eraId}`);
    }
    // THE ONE SLOT THAT IS NOT PER-ERA, in both directions: exactly one row carries no era,
    // and it is the ceremony's. A count of twenty-one is satisfied by an eleventh era.
    const ceremonies = slots.filter((entry) => entry.kind === "ceremony");
    expect(ceremonies.map((entry) => entry.trackId)).toEqual([CEREMONY_SLOT_TRACK_ID]);
    expect(slots.filter((entry) => entry.eraId === null)).toEqual(ceremonies);
    expect(slots.filter((entry) => entry.kind === "era")).toHaveLength(10);
    expect(slots.filter((entry) => entry.kind === "crisis")).toHaveLength(10);
  });

  it("gives every slot a sourcing brief, so the manifest IS the procurement order", () => {
    for (const entry of musicSlots()) {
      expect(entry.slot.brief.length, `${entry.kind}:${entry.eraId}`).toBeGreaterThan(20);
    }
    expect(musicSlots()).toHaveLength(21);
  });

  it("never lets an ERA slot stand in on 'the era's track', which has nothing to resolve to", () => {
    // The `{ to: "era" }` stand-in is the crisis's, and an era slot carrying it would be
    // circular. The resolver falls back to the house track rather than recursing; this
    // rules the case out at the data so the resolver's guard is a belt and not the belt.
    for (const eraId of ERA_ORDER) {
      expect(ERA_MUSIC[eraId].standIn.to, eraId).toBe("track");
    }
    expect(ERA_ORDER).toHaveLength(10);
  });
});

/**
 * **FOURTEEN OF THE FIFTEEN OWED SLOTS HAVE LANDED, AND THE SEVEN THAT ARE STILL BORROWING
 * ARE NAMED BY COMPOSITION RATHER THAN COUNTED.**
 *
 * This block used to assert the opposite premise — that none of the twenty-one had been
 * acquired and every scene therefore resolved to the house track — and it was true when it
 * was written. It is re-derived rather than deleted, because the property worth guarding was
 * never "nothing has landed": it was that {@link standingInSlots} reads `MUSIC_TRACKS`
 * instead of a status field, so whichever state the tree is in, the shortfall is a
 * measurement. That is what makes the same guard usable from either side of the drop-in.
 *
 * **The composition matters more than the count now, not less.** A floor of seven is
 * satisfied by any seven, including the wrong seven — nine eras plus the ceremony would clear
 * it while nine eras played somebody else's music. So the seven are required to be exactly
 * the six shelved crises plus the ceremony bed, derived from the crisis registry's own
 * in-scope list rather than from a list written here.
 */
describe("fourteen landed, and the seven still borrowing are the seven owed nothing", () => {
  /**
   * The eras whose crisis is in scope, from the crisis lane's own registry rather than from a
   * list here. `musicSlots.test.ts` reads the same source, which is what stops this file
   * becoming a second copy of a scope decision that has already moved once.
   */
  const IN_SCOPE = new Set<EraId>(CRISIS_ERAS);

  it("still borrows at exactly the six shelved crises, and nothing else", () => {
    // The shortfall, derived from `MUSIC_TRACKS` and not from a status field, so it CANNOT
    // go stale in either direction: a file that lands leaves this list on the run it is
    // registered, and a file withdrawn rejoins it. That is why the exception needs no
    // maintained list — and why the same assertion reads correctly from either premise.
    // It went 7 -> 6 on 2026-08-05 by that mechanism alone, when the ceremony bed landed.
    const borrowing = standingInSlots();
    expect(borrowing).toHaveLength(6);
    // THE COMPOSITION, because six of the wrong slots also numbers six. Six shelved
    // crises, no era at all, and no ceremony.
    expect(borrowing.filter((entry) => entry.kind === "era")).toEqual([]);
    // The ceremony bed stopped borrowing on 2026-08-05, when its take landed. This used to
    // read `.toEqual([CEREMONY_SLOT_TRACK_ID])` and the empty array is the feature.
    expect(borrowing.filter((entry) => entry.kind === "ceremony")).toEqual([]);
    const shelved = borrowing.filter((entry) => entry.kind === "crisis");
    expect(shelved).toHaveLength(6);
    expect(shelved.map((entry) => entry.eraId).sort()).toEqual(
      ERA_ORDER.filter((eraId) => !IN_SCOPE.has(eraId)).sort(),
    );
    // And the other direction over the whole manifest: every slot that IS owed a track,
    // which is the ten eras, the four crises in scope and now the ceremony bed, has one.
    const owed = musicSlots().filter(
      (entry) =>
        entry.kind === "era" ||
        entry.kind === "ceremony" ||
        IN_SCOPE.has(entry.eraId as EraId),
    );
    expect(owed).toHaveLength(15);
    for (const entry of owed) {
      expect(isShippedTrack(entry.trackId), `${entry.trackId} does not ship`).toBe(true);
    }
    // THE ONE SLOT THAT USED TO BE EMPTY, AND IS NOW THE ONE THAT MUST NOT BE EMPTIED.
    // `ceremony-advance` was generated on 2026-08-05, so this asserts `true` where it used
    // to assert `false`. The defect it guards has inverted with it: the tempting tidy-up is
    // no longer filling the slot from the fourteen but dropping it, which two open branches
    // (#607, #609) would do. Asserted here too, where the count that tempts it is.
    expect(isShippedTrack(CEREMONY_SLOT_TRACK_ID)).toBe(true);
  });

  it("ships seventeen rows: the two house tracks, the fourteen and the bed, named", () => {
    // Named rather than counted, because seventeen is satisfied by seventeen of anything,
    // and because the day an eighteenth is added is the day somebody owes a re-read of the
    // manifest. The two house tracks stay FIRST, which `music.test.ts` reads off as its two
    // known-good tracks and `trackById` falls back to; the bed goes LAST, belonging to no
    // era and no crisis.
    expect(MUSIC_TRACKS.map((track) => track.id)).toEqual([
      "town-theme",
      "a-new-town",
      ...ERA_ORDER.map((eraId) => eraSlotTrackId(eraId)),
      ...ERA_ORDER.filter((eraId) => IN_SCOPE.has(eraId)).map((eraId) =>
        crisisSlotTrackId(eraId),
      ),
      CEREMONY_SLOT_TRACK_ID,
    ]);
    expect(MUSIC_TRACKS).toHaveLength(17);
    // Every generated row carries a licence whose plan and date establish it, so a row
    // copied from one of these arrives with the two warnings attached.
    const generated = MUSIC_TRACKS.filter((track) => track.author === "Suno (generated)");
    expect(generated).toHaveLength(15);
    for (const track of generated) {
      expect(track.file, track.id).toBe(`music/${track.id}.ogg`);
      expect(track.seconds, track.id).toBeGreaterThan(90);
    }
    // **THE LICENCE SPLITS BY GENERATION DATE, AND THAT IS ASSERTED AS A PARTITION.** The
    // fourteen were generated 2026-08-04 and the bed 2026-08-05, and the registry's own rule
    // is that a different day needs its own constant rather than an edit to the shared one.
    // Written as two named sets rather than "most of them use the shared string", so a
    // sixteenth row that quietly reuses the wrong date fails here.
    const onSharedLicence = generated.filter((t) => t.license === SUNO_PRO_LICENCE);
    const onOwnLicence = generated.filter((t) => t.license === SUNO_PRO_LICENCE_2026_08_05);
    expect(onOwnLicence.map((t) => t.id)).toEqual([CEREMONY_SLOT_TRACK_ID]);
    expect(onSharedLicence).toHaveLength(14);
    expect(onSharedLicence.length + onOwnLicence.length).toBe(generated.length);
    expect(SUNO_PRO_LICENCE).toContain("2026-08-04");
    expect(SUNO_PRO_LICENCE_2026_08_05).toContain("2026-08-05");
  });

  it("plays each era's OWN track, and the ceremony bed through its advance", () => {
    // The audible consequence, stated where the old "nothing a learner hears has changed"
    // assertion was. Every era plays its own file; a crisis in scope plays its own; and an
    // advance plays THE BED, which is the change of 2026-08-05: this last assertion read
    // `.toBe(eraSlotTrackId(eraId))` for as long as the fifteenth slot was empty and the
    // stand-in handed a ceremony the age being left.
    for (const eraId of ERA_ORDER) {
      expect(trackIdForEra(eraId), eraId).toBe(eraSlotTrackId(eraId));
      expect(trackIdForScene(eraScene(eraId)), eraId).toBe(eraSlotTrackId(eraId));
      expect(trackIdForScene({ eraId, crisisEraId: eraId, ceremony: null }), eraId).toBe(
        IN_SCOPE.has(eraId) ? crisisSlotTrackId(eraId) : eraSlotTrackId(eraId),
      );
      expect(
        trackIdForScene({ eraId, crisisEraId: null, ceremony: { eraId } }),
        `${eraId}: the advance no longer plays the bed`,
      ).toBe(CEREMONY_SLOT_TRACK_ID);
      expect(
        trackIdForScene({ eraId, crisisEraId: null, ceremony: { eraId } }),
        `${eraId}: the advance is back on the age being left`,
      ).not.toBe(eraSlotTrackId(eraId));
    }
    expect(ERA_ORDER).toHaveLength(10);
    // NOT the house track any more, at any era. This is the assertion that inverted, and it
    // is kept pointing the other way rather than dropped: the default still has to resolve,
    // because it is the safety net for a WITHDRAWN row.
    expect(ERA_ORDER.map((eraId) => trackIdForEra(eraId))).not.toContain(DEFAULT_TRACK_ID);
    expect(isShippedTrack(DEFAULT_TRACK_ID)).toBe(true);
  });

  it("resolves every scene to a track that actually ships", () => {
    // The stand-in has to be real or the soundtrack is silent. Checked against the shipped
    // id set directly rather than through `trackById`, whose own fallback would hide it.
    const shipped = new Set(MUSIC_TRACKS.map((track) => track.id));
    // Every combination of the three inputs, including a ceremony declared for an era the city
    // is NOT standing in — which is the state the advance press passes through, and the one the
    // selection function's era-equality test is there to answer.
    const ceremonies: readonly (MusicScene["ceremony"] | null)[] = [
      null,
      ...ERA_ORDER.map((eraId) => ({ eraId })),
    ];
    for (const eraId of ERA_ORDER) {
      for (const crisisEraId of [null, ...ERA_ORDER]) {
        for (const ceremony of ceremonies) {
          const scene: MusicScene = { eraId, crisisEraId, ceremony };
          const where = `${eraId}/${crisisEraId}/${ceremony?.eraId}`;
          expect(shipped.has(trackIdForScene(scene)), where).toBe(true);
          expect(trackForScene(scene).id).toBe(trackIdForScene(scene));
        }
      }
    }
    expect(shipped.size).toBeGreaterThanOrEqual(2);
    expect(ceremonies).toHaveLength(11);
  });
});

/**
 * THE MECHANISM, READ FROM BOTH SIDES OF THE DROP-IN.
 *
 * This block used to only ADD rows, because the shipped manifest resolved everything to one
 * track and could not demonstrate that landing a row was picked up. Fourteen rows have
 * landed, so most of these cases now read the shipped table directly — which is strictly
 * better evidence, since a synthetic row proves the selection and a shipped row proves the
 * product.
 *
 * **The one thing a shipped table cannot show is that the ROW is what does it**, and that is
 * what {@link withoutShippedTracks} is for: withdraw one row and the slot falls back, restore
 * it and the slot plays again. A registry row is not evidence that a track plays; a row whose
 * removal changes what plays is. `materials.test.ts` mutates its own shipped data the same
 * way to reach a branch the data cannot otherwise produce.
 */
describe("what a procurement PR turns on, proved by withdrawing and restoring rows", () => {
  /** Register ids as shipped for the duration of `body`, then restore exactly. */
  function withShippedTracks(ids: readonly string[], body: () => void): void {
    const table = MUSIC_TRACKS as unknown as MusicTrack[];
    const before = table.length;
    for (const id of ids) {
      table.push({ ...nth(MUSIC_TRACKS, 0), id, title: id, file: `music/${id}.mp3` });
    }
    try {
      body();
    } finally {
      table.length = before;
    }
  }

  /**
   * UN-register ids for the duration of `body`, then put them back at their own indices.
   *
   * Restored by index rather than by re-pushing, because the order of `MUSIC_TRACKS` is
   * load-bearing: `trackById` falls back to entry zero and `music.test.ts` reads entries zero
   * and one, so a helper that appended the rows back would silently reorder the table for
   * every case after it.
   */
  function withoutShippedTracks(ids: readonly string[], body: () => void): void {
    const table = MUSIC_TRACKS as unknown as MusicTrack[];
    const taken: [number, MusicTrack][] = [];
    for (let index = table.length - 1; index >= 0; index -= 1) {
      const row = table[index];
      if (row !== undefined && ids.includes(row.id)) {
        taken.push([index, row]);
        table.splice(index, 1);
      }
    }
    // The withdrawal really happened, so a case below cannot pass because the id was already
    // absent and nothing moved.
    if (taken.length !== ids.length) {
      throw new Error(
        `expected ${ids.length} shipped rows to withdraw, found ${taken.length}`,
      );
    }
    try {
      body();
    } finally {
      for (const [index, row] of [...taken].reverse()) {
        table.splice(index, 0, row);
      }
    }
  }

  it("plays an era's own track BECAUSE of its one row, and falls back without it", () => {
    // **THE ROW IS LOAD-BEARING, WHICH IS THE CLAIM A TABLE CANNOT MAKE ABOUT ITSELF.** The
    // era plays its own file; withdraw that single row and the same era falls back to the
    // house track with nothing else moved; restore it and the era is back. No manifest row
    // edited, no flag flipped, no wiring touched, in either direction.
    const era = nth(ERA_ORDER, 1);
    const neighbour = nth(ERA_ORDER, 2);
    expect(trackIdForEra(era)).toBe(eraSlotTrackId(era));
    expect(standingInSlots()).toHaveLength(6);

    withoutShippedTracks([eraSlotTrackId(era)], () => {
      expect(trackIdForEra(era)).toBe(DEFAULT_TRACK_ID);
      expect(trackIdForScene(eraScene(era))).toBe(DEFAULT_TRACK_ID);
      // And only that era: its neighbour still has its own.
      expect(trackIdForEra(neighbour)).toBe(eraSlotTrackId(neighbour));
      expect(standingInSlots()).toHaveLength(7);
    });

    expect(trackIdForEra(era)).toBe(eraSlotTrackId(era));
    expect(trackIdForScene(eraScene(era))).toBe(eraSlotTrackId(era));
    expect(standingInSlots()).toHaveLength(6);
    // The table is back exactly as it was, order included, because `music.test.ts` reads
    // entries zero and one and `trackById` falls back to entry zero.
    expect(nth(MUSIC_TRACKS, 0).id).toBe(DEFAULT_TRACK_ID);
  });

  it("lets the crisis outrank the era, and only while the crisis runs", () => {
    // THE SELECTION FUNCTION, stated as behaviour: `crisis ?? era`. Over the SHIPPED table
    // now — era one and its winter both have their own files — so this is a statement about
    // what a learner hears rather than about a synthetic manifest.
    const era = nth(ERA_ORDER, 0);
    expect(isShippedTrack(crisisSlotTrackId(era))).toBe(true);
    expect(trackIdForScene({ eraId: era, crisisEraId: null, ceremony: null })).toBe(
      eraSlotTrackId(era),
    );
    expect(trackIdForScene({ eraId: era, crisisEraId: era, ceremony: null })).toBe(
      crisisSlotTrackId(era),
    );
  });

  it("scores the crisis by the BOARD's era, not the era the city is standing in", () => {
    // `resolveCrisisEra` pins the board to the earliest era with authored land (D-ERA25),
    // so a city in a later era can be fighting era one's winter. The music follows the board
    // it is scoring. Both eras chosen from the four crises in scope, so the choice between
    // two REAL crisis tracks is what is being measured.
    const boardEra = nth(ERA_ORDER, 0);
    const liveEra = nth(ERA_ORDER, 5);
    expect(isShippedTrack(crisisSlotTrackId(boardEra))).toBe(true);
    expect(isShippedTrack(crisisSlotTrackId(liveEra))).toBe(true);
    expect(trackIdForScene({ eraId: liveEra, crisisEraId: boardEra, ceremony: null })).toBe(
      crisisSlotTrackId(boardEra),
    );
  });

  it("expresses ONE crisis track for all four just as easily as one each", () => {
    // The lead's sentence was ambiguous between the two readings; one-per-crisis is what was
    // assumed and what shipped. This is still the proof the other reading needs no change of
    // shape, and landing the four made it a two-step rather than a one-step: the four rows
    // come out, the stand-ins point at one shared track, and every crisis plays it.
    const shared = "crisis-shared";
    withoutShippedTracks(
      CRISIS_ERAS.map((eraId) => crisisSlotTrackId(eraId)),
      () => {
        withShippedTracks([shared], () => {
          const saved: [EraId, TrackSlot][] = ERA_ORDER.map((eraId) => [
            eraId,
            CRISIS_MUSIC[eraId],
          ]);
          try {
            for (const [eraId, row] of saved) {
              CRISIS_MUSIC[eraId] = {
                standIn: { to: "track", trackId: shared },
                brief: row.brief,
              };
            }
            for (const eraId of ERA_ORDER) {
              expect(
                trackIdForScene({ eraId, crisisEraId: eraId, ceremony: null }),
                eraId,
              ).toBe(shared);
            }
            // Still the era's own track when no crisis is running, so the shared crisis track
            // has not swallowed the other dimension.
            expect(trackIdForScene(eraScene(nth(ERA_ORDER, 0)))).toBe(
              eraSlotTrackId(nth(ERA_ORDER, 0)),
            );
          } finally {
            for (const [eraId, row] of saved) {
              CRISIS_MUSIC[eraId] = row;
            }
          }
        });
      },
    );
    expect(CRISIS_MUSIC.prehistoric.standIn.to).toBe("era");
    // And the shipped reading is back: era one's winter plays its own track, not a shared one.
    expect(
      trackIdForScene({
        eraId: nth(ERA_ORDER, 0),
        crisisEraId: nth(ERA_ORDER, 0),
        ceremony: null,
      }),
    ).toBe(crisisSlotTrackId(nth(ERA_ORDER, 0)));
  });

  it("leaves the music alone at a crisis with no track of its own", () => {
    // The stand-in rule, stated as the behaviour it produces rather than as the data that
    // produces it. Measured at a SHELVED crisis era, which is the population the rule still
    // has: the four in scope all have their own tracks now, so era one is no longer the case
    // this is about.
    const era = nth(ERA_ORDER, 1);
    expect(CRISIS_ERAS).not.toContain(era);
    expect(isShippedTrack(crisisSlotTrackId(era))).toBe(false);
    expect(trackIdForScene({ eraId: era, crisisEraId: era, ceremony: null })).toBe(
      eraSlotTrackId(era),
    );
    expect(trackIdForScene({ eraId: era, crisisEraId: era, ceremony: null })).toBe(
      trackIdForScene(eraScene(era)),
    );
  });
});

/**
 * **THE FIFTEENTH SLOT'S SELECTION, which is the half `ceremonyMusic.test.ts` does not
 * own.** That file is about the passage as a FILE — that the player loops it, and that the
 * handover survives either ordering of the advance press. This is about which track a
 * ceremony scene resolves to, in the same shape and in the same file as the crisis's own
 * selection cases, because it is the same function and the interesting cases are the
 * interactions.
 */
describe("the era-advance ceremony's bed, over a manifest with tracks in it", () => {
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

  const ERA_ONE = nth(ERA_ORDER, 0);
  const ERA_TWO = nth(ERA_ORDER, 1);
  const ERA_TEN = nth(ERA_ORDER, 9);

  /** The city standing in `eraId` with `eraId`'s own advance ceremony running. */
  function ceremonyScene(eraId: EraId): MusicScene {
    return { eraId, crisisEraId: null, ceremony: { eraId } };
  }

  it("plays the acquired bed at every advance, where it used to change nothing", () => {
    // THE STATE THIS TREE SHIPS IN, stated as behaviour over the SHIPPED table. This case
    // used to assert the opposite of every line below: while the slot was registered and
    // EMPTY, an advance kept playing the outgoing era's own track, which is what an advance
    // did before the slot existed at all. The take landed on 2026-08-05, so the stand-in is
    // no longer reached and an advance has music of its own.
    expect(isShippedTrack(CEREMONY_SLOT_TRACK_ID)).toBe(true);
    for (const eraId of ERA_ORDER) {
      expect(trackIdForScene(ceremonyScene(eraId)), eraId).toBe(CEREMONY_SLOT_TRACK_ID);
      // And it is NO LONGER the same answer the plain era scene gives, which is the whole
      // of what changed: these two were equal at every era until the take landed.
      expect(trackIdForScene(ceremonyScene(eraId)), eraId).not.toBe(
        trackIdForScene(eraScene(eraId)),
      );
    }
    // The stand-in is kept pointed at the ERA rather than the house track even though it is
    // no longer reached, because it is the answer if this row is ever WITHDRAWN:
    // `HOUSE_STAND_IN` here would drop a scored era to a generic town theme for the length
    // of its own ceremony, and every era is scored.
    expect(CEREMONY_MUSIC.standIn.to).toBe("era");
    expect(ERA_ORDER.map((eraId) => trackIdForScene(ceremonyScene(eraId)))) //
      .not.toContain(DEFAULT_TRACK_ID);
  });

  it("plays the bed while a ceremony runs, and only while one runs", () => {
    withShippedTracks([eraSlotTrackId(ERA_ONE), CEREMONY_SLOT_TRACK_ID], () => {
      expect(trackIdForScene(ceremonyScene(ERA_ONE))).toBe(CEREMONY_SLOT_TRACK_ID);
      expect(trackIdForScene(eraScene(ERA_ONE))).toBe(`era-${ERA_ONE}`);
    });
  });

  it("stops the bed the moment the city's era moves, which is the advance press", () => {
    // **THE HANDOVER, AND THE WHOLE OF ITS MECHANISM.** The bed belongs to the age being left,
    // so a scene whose era has already moved past the ceremony's resolves to the new age even
    // with the ceremony still declared. That is what makes the press the handover without any
    // notification, latch or unmount hook, and what keeps the two writes on that press
    // order-independent.
    withShippedTracks(
      [eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO), CEREMONY_SLOT_TRACK_ID],
      () => {
        expect(trackIdForScene(ceremonyScene(ERA_ONE))).toBe(CEREMONY_SLOT_TRACK_ID);
        // The era has moved and the ceremony surface has not come down yet.
        expect(
          trackIdForScene({
            eraId: ERA_TWO,
            crisisEraId: null,
            ceremony: { eraId: ERA_ONE },
          }),
        ).toBe(`era-${ERA_TWO}`);
        // And it is the SAME id a quiet city in era two resolves to, so the ceremony clearing
        // afterwards is not a second handover.
        expect(
          trackIdForScene({
            eraId: ERA_TWO,
            crisisEraId: null,
            ceremony: { eraId: ERA_ONE },
          }),
        ).toBe(trackIdForScene(eraScene(ERA_TWO)));
      },
    );
  });

  it("needs no special case at the end of the sequence", () => {
    // Era ten has no era after it, and under the old cue design that was an edge worth naming
    // because the handover had to pick a destination. Keying off the era removes the question:
    // era ten's advance moves nothing, so the bed plays until the surface comes down.
    withShippedTracks([eraSlotTrackId(ERA_TEN), CEREMONY_SLOT_TRACK_ID], () => {
      expect(trackIdForScene(ceremonyScene(ERA_TEN))).toBe(CEREMONY_SLOT_TRACK_ID);
      expect(trackIdForScene(eraScene(ERA_TEN))).toBe(`era-${ERA_TEN}`);
    });
  });

  it("outranks a crisis while the ceremony runs, and hands the crisis back afterwards", () => {
    // The precedence ruling, stated as behaviour. Nothing in the product puts an advance and
    // a crisis together today, so this is the answer for the day something does rather than
    // a case a learner can reach.
    withShippedTracks(
      [eraSlotTrackId(ERA_ONE), crisisSlotTrackId(ERA_ONE), CEREMONY_SLOT_TRACK_ID],
      () => {
        expect(
          trackIdForScene({
            eraId: ERA_ONE,
            crisisEraId: ERA_ONE,
            ceremony: { eraId: ERA_ONE },
          }),
        ).toBe(CEREMONY_SLOT_TRACK_ID);
        // A crisis with no ceremony over it still wins over the era, unchanged.
        expect(
          trackIdForScene({ eraId: ERA_ONE, crisisEraId: ERA_ONE, ceremony: null }),
        ).toBe(`crisis-${ERA_ONE}`);
      },
    );
  });

  it("is ONE passage for all ten advances rather than ten, and that is checked at every era", () => {
    // The design decision, as a measurement: one registry row scores every seam. Ten rows
    // would also pass a test that only looked at era one.
    withShippedTracks([CEREMONY_SLOT_TRACK_ID], () => {
      for (const eraId of ERA_ORDER) {
        expect(trackIdForScene(ceremonyScene(eraId)), eraId).toBe(CEREMONY_SLOT_TRACK_ID);
      }
    });
    expect(ERA_ORDER).toHaveLength(10);
    // And exactly one slot in the whole manifest is the ceremony's, so nothing has quietly
    // grown a per-era variant behind the single id.
    expect(musicSlots().filter((entry) => entry.kind === "ceremony")).toHaveLength(1);
  });
});

describe("the crisis population, derived from the crisis lane's own predicate", () => {
  it("derives all four enterable crises, so each owes the soundtrack declaration", () => {
    // NOT a list written here. `hasPlayableCrisis` is `city/crisisCall.ts`'s own answer to
    // *"does this era's crisis exist as something to walk into"*, and it is the predicate
    // the music wiring depends on: `HardWinterSurface` is the single surface that declares
    // a crisis to the soundtrack, and it is the only crisis a learner can reach.
    //
    // Four crises are in scope (eras 1, 4, 6 and 9, per D-CRISIS-33), and all four now have
    // enterable surfaces. A fifth surface that failed to declare itself would silently keep
    // fair-weather music; this census is what fails on that day.
    const enterable = ERA_ORDER.filter((eraId) => hasPlayableCrisis(eraId));
    expect(enterable).toEqual([
      "prehistoric",
      "classical",
      "renaissance",
      "information_age",
    ]);
    expect(enterable.length).toBeGreaterThanOrEqual(1);
    // The other direction, so a crisis that stops being enterable also fails.
    expect(ERA_ORDER.filter((eraId) => !hasPlayableCrisis(eraId))).toHaveLength(6);
  });

  it("holds a named brief for each of the four crises in scope, and says the other six are shelved", () => {
    // The four are a scope decision from another document that has already moved once
    // (eras 1 / 4 / 7 / 10 became 1 / 4 / 6 / 9). Asserted BOTH ways so neither the four
    // nor the six can drift here unnoticed: a shelved row that gains a real brief fails,
    // and an in-scope row that loses one fails.
    const inScope: readonly EraId[] = [
      "prehistoric",
      "classical",
      "renaissance",
      "information_age",
    ];
    const shelvedMarker = /No crisis in scope for this era/;
    for (const eraId of ERA_ORDER) {
      const brief = CRISIS_MUSIC[eraId].brief;
      expect(shelvedMarker.test(brief), `${eraId} brief`).toBe(!inScope.includes(eraId));
    }
    expect(inScope).toHaveLength(4);
    expect(
      ERA_ORDER.filter((eraId) => shelvedMarker.test(CRISIS_MUSIC[eraId].brief)),
    ).toHaveLength(6);
  });
});

/**
 * Every `.ts`/`.tsx` under `apps/web/src`, read as text. `import.meta.glob` rather than
 * `node:fs` is the house style for a source sweep in this app and it is not a preference:
 * this project has no node types, so a `readFileSync` version does not typecheck
 * (`economy/interleavedPayers.test.ts` says the same).
 */
const SOURCES = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * This file's own directory under `apps/web/src`, derived from its module URL rather than
 * written down, because Vite reports a SIBLING as `./x.ts` and everything else as
 * `../dir/x.ts`, so folding the two forms needs to know which directory `./` means, and a
 * hardcoded answer would silently mislabel every sibling if this file ever moved. The
 * siblings are exactly the files this sweep is about, so getting it wrong would pass every
 * assertion below against the wrong names. `economy/interleavedPayers.test.ts` carries the
 * same note for the same reason.
 */
const SELF_DIR = import.meta.url
  .replace(/\/[^/]*$/, "")
  .replace(/^.*\/apps\/web\/src\/?/, "");

/** `../city/CitySurface.tsx` → `city/CitySurface.tsx`; `./useAudio.ts` → `audio/useAudio.ts`. */
function relativeToSrc(globPath: string): string {
  return globPath.startsWith("../")
    ? globPath.slice("../".length)
    : `${SELF_DIR}/${globPath.replace(/^\.\//, "")}`;
}

const SWEPT = Object.entries(SOURCES).map(([path, text]) => ({
  path: relativeToSrc(path),
  text,
}));
const SOURCE_PATHS = SWEPT.map((file) => file.path);

function sourceOf(path: string): string {
  const found = SWEPT.find((file) => file.path === path);
  if (found === undefined) {
    throw new Error(`${path} no longer exists, so what is claimed about it below is void`);
  }
  return found.text;
}

describe("INV-COS-1: the scene chooses the music and nothing reads the music back", () => {
  it("swept the whole app rather than a convenient subset", () => {
    // A sweep reading nothing is how a census passes while measuring nothing, so the
    // denominator is asserted before anything is claimed over it.
    expect(SOURCE_PATHS.length).toBeGreaterThan(200);
    expect(SOURCE_PATHS).toContain("App.tsx");
    // THE `./` NORMALISATION, PROVEN RATHER THAN ASSUMED. Vite hands a sibling back in the
    // `./` form, and every file this sweep cares about is a sibling, so a wrong `SELF_DIR`
    // would file them all under names no assertion below matches, and the negative
    // assertion ("nothing outside audio/") passes against a wrong name.
    expect(SOURCE_PATHS).toContain("audio/eraMusic.ts");
    expect(SOURCE_PATHS).toContain("audio/useAudio.ts");
    expect(SOURCE_PATHS).toContain("city/activeCrisis.ts");
  });

  it("is imported only from inside the audio layer", () => {
    // The invariant is that music gates nothing. Its mechanical half is the direction of
    // the dependency edge: this module reads the era and the crisis to pick a filename,
    // and no progression, economy or lesson surface may read the answer.
    //
    // `apps/web/src` is the WHOLE population and not a convenient subset: nothing under
    // `packages/`, `engines/` or `services/` may import `apps/` at all (`eras.ts` records
    // that `tsc --build` fails it with TS6059), so a file outside this sweep cannot import
    // this module even if somebody wanted it to.
    const importers = SWEPT.filter((file) => file.path !== "audio/eraMusic.ts")
      .filter((file) => /from\s+"[./\w-]*eraMusic"/.test(file.text))
      .map((file) => file.path);

    for (const path of importers) {
      expect(path.startsWith("audio/"), `${path} reads which track a scene plays`).toBe(
        true,
      );
    }
    // Containment holds trivially over an empty set, so the match needs a floor and the
    // two known importers need naming: if the regex stopped matching, every assertion
    // above would pass against nothing.
    expect(importers).toContain("audio/useAudio.ts");
    expect(importers).toContain("audio/AudioSettings.tsx");
    expect(importers.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the crisis declaration on the component whose MOUNT is the crisis", () => {
    // One caller, and it is the surface both doors mount. Asserted at the source because
    // deleting the call is a one-line edit that no other test in this file would notice:
    // the store would simply never move, and every "a crisis changes the music" case runs
    // against the store directly.
    expect(sourceOf("winter/HardWinterSurface.tsx")).toMatch(/useDeclareActiveCrisis\(/);
    const declarers = SOURCE_PATHS.filter(
      (path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"),
    ).filter((path) => /useDeclareActiveCrisis\(/.test(sourceOf(path)));
    // The hook's own module plus every crisis surface. A new one appearing here is fine and
    // expected; a crisis surface appearing that is NOT here is the defect, and the
    // enterable-crisis census above is what catches that.
    //
    // Era six's surface declares `PLAGUE_ERA` rather than the era the city is standing in, on
    // the same rule era one's mount follows: the declaration is whose crisis is running, and a
    // city in a later age can be playing an earlier one's.
    expect(sourceOf("plague/PlagueSurface.tsx")).toMatch(/useDeclareActiveCrisis\(/);
    expect(sourceOf("relay/RelaySurface.tsx")).toMatch(/useDeclareActiveCrisis\(/);
    expect(sourceOf("succession/SuccessionSurface.tsx")).toMatch(
      /useDeclareActiveCrisis\(/,
    );
    expect(declarers.sort()).toEqual([
      "city/activeCrisis.ts",
      "plague/PlagueSurface.tsx",
      "relay/RelaySurface.tsx",
      "succession/SuccessionSurface.tsx",
      "winter/HardWinterSurface.tsx",
    ]);
  });
});
