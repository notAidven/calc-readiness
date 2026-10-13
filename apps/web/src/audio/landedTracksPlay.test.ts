import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setActiveIslandUnlock as setAdvanceCeremony } from "../city/activeIslandUnlock";
import { setActiveCrisis } from "../city/activeCrisis";
import { CRISIS_ERAS } from "../city/three/crisis/registry";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import {
  type AudioPrefs,
  createAudioPrefs,
  createGestureGate,
  type GestureTarget,
  type PrefStorage,
} from "./audioPrefs";
import {
  CEREMONY_SLOT_TRACK_ID,
  crisisSlotTrackId,
  eraSlotTrackId,
  isShippedTrack,
  musicSlots,
  standingInSlots,
} from "./eraMusic";
import { createMusicPlayer, type MusicElement, MUSIC_TRACKS } from "./music";
import { reconcileMusic } from "./useAudio";

/**
 * **THE FOURTEEN GENERATED TRACKS ARE REACHED, AND A REGISTRY ROW IS NOT EVIDENCE OF THAT.**
 *
 * Every other guard in this directory stops one step short of the thing that was actually
 * broken. `musicSlots.test.ts` compares the registry's ids against the prompt sheet, which a
 * registry with no slot rows satisfies vacuously. `eraMusic.test.ts` resolves ids through the
 * selection function, which is a claim about a string. `music.test.ts` counts elements over
 * synthetic rows. **None of them would have failed on the state the fourteen actually sat in
 * for a day**: converted, normalised, committed to `public/audio/music/`, and inert, because
 * nothing pointed at them.
 *
 * So this file asserts the whole chain, end to end, with nothing registered for the duration
 * of any case:
 *
 *  1. **The scene**, from the real `useCityEra`, `activeCrisis` and `activeCeremony` stores.
 *  2. **The selection**, through the app's own `reconcileMusic` rather than a re-derivation.
 *  3. **The player**, a real `createMusicPlayer` over a counted element double, so what is
 *     measured is the URL the browser would be asked for.
 *  4. **The file**, matched against the real `public/audio/music/` directory listing, so a
 *     row naming a file nobody committed cannot pass.
 *
 * **Read step 4 as the one that makes the rest mean anything.** Steps 1 to 3 are satisfied by
 * a registry pointing at `music/made-up.ogg`; it is the listing that turns "the player asks
 * for this URL" into "the player asks for a file that is there".
 *
 * ## THE FIFTEENTH SLOT IS ASSERTED **FULL** HERE, AND IT USED TO BE ASSERTED EMPTY
 *
 * `ceremony-advance` was generated on 2026-08-05 and the last case now pins the feature: the
 * bed has a file, a row, and an advance plays IT rather than the age being left. That case
 * previously asserted every one of those the other way round, which was correct for as long
 * as the take did not exist.
 *
 * The temptation the file still creates is the reverse of the old one — making the cases
 * uniform by dropping the ceremony back to the era's own track, which is what the two open
 * slot-removing branches (#607, #609) would do. The lead cancelled this slot and then
 * reversed the cancellation, so removing it is a product decision — see
 * `eraToEraTransitionTrack.test.ts`, which walks all nine seams, and
 * `test/eraTransitionTrackLedger.test.ts`, which fails whenever the tree and the runbook
 * disagree about whether the take exists.
 */

/**
 * The music directory as it really is, through Vite's `?url` glob — the house idiom for a test
 * under `apps/web`'s DOM-only `lib`, where `node:fs` is not declared (`musicSlots.test.ts`
 * carries the same note for its `?raw` read of the prompt sheet).
 *
 * `public/` is not part of Vite's module graph, so this is a filesystem listing rather than a
 * bundle: exactly what is wanted, since the subject is which files were committed.
 */
const ON_DISK_GLOB = import.meta.glob("../../public/audio/music/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Basename to glob key, so a case can ask "is this file there" of the directory. */
const ON_DISK = new Map<string, string>(
  Object.keys(ON_DISK_GLOB).map((key) => [key.slice(key.lastIndexOf("/") + 1), key]),
);

/** The file a slot's committed take is under, or a failure naming the slot. */
function fileOnDisk(slot: string): string {
  const name = `${slot}.ogg`;
  if (!ON_DISK.has(name)) {
    throw new Error(
      `apps/web/public/audio/music/${name} is not committed, so ${slot} cannot play`,
    );
  }
  return name;
}

const ERA_ORDER: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/** The ten era slots and the four crisis slots in scope: the fourteen that landed. */
const LANDED_SLOTS: readonly string[] = [
  ...ERA_ORDER.map((eraId) => eraSlotTrackId(eraId)),
  ...CRISIS_ERAS.map((eraId) => crisisSlotTrackId(eraId)),
];

interface FakeElement extends MusicElement {
  readonly src: string;
  playCount: number;
}

function makeFactory() {
  const made: FakeElement[] = [];
  const factory = (src: string): MusicElement => {
    const element: FakeElement = {
      src,
      playCount: 0,
      volume: 1,
      loop: false,
      currentTime: 0,
      preload: "",
      play() {
        element.playCount += 1;
      },
      pause() {},
      addEventListener: () => {},
    };
    made.push(element);
    return element;
  };
  return { made, factory };
}

function memoryStorage(): PrefStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

/** A gate the browser would consider open, so the player is allowed to want a file. */
function openGate() {
  const handlers: (() => void)[] = [];
  const target: GestureTarget = {
    addEventListener: (_type, listener) => handlers.push(listener),
  };
  const gate = createGestureGate(target);
  gate.arm();
  handlers[0]?.();
  return gate;
}

function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an element at index ${index}, found ${items.length}`);
  }
  return item;
}

let prefs: AudioPrefs;

beforeEach(() => {
  prefs = createAudioPrefs(memoryStorage());
  prefs.setMusicEnabled(true);
  resetCityEra();
  setActiveCrisis(null);
  setAdvanceCeremony(null);
});

afterEach(() => {
  resetCityEra();
  setActiveCrisis(null);
  setAdvanceCeremony(null);
});

/** A real player over a counted factory, with the fade scheduler inert. */
function playerOver(factory: (src: string) => MusicElement) {
  let millis = 0;
  return createMusicPlayer({
    prefs,
    gate: openGate(),
    createAudio: factory,
    isHidden: () => false,
    now: () => {
      millis += 1;
      return millis;
    },
    scheduleFadeStep: () => () => {},
  });
}

describe("the fourteen generated takes are committed under the ids the slots derive", () => {
  it("listed a real directory, and every landed slot has a file in it", () => {
    // THE FLOOR, because every comparison below is over this listing and an empty glob would
    // make each of them unanimous over nothing.
    expect(ON_DISK.size).toBeGreaterThanOrEqual(16);
    expect(ON_DISK.has("town-theme.mp3")).toBe(true);
    expect(LANDED_SLOTS).toHaveLength(14);

    // Set equality against the `.ogg` files, in BOTH directions: a slot with no take fails,
    // and a take committed under a name no slot derives fails too. The second is the one that
    // let `era-atomic` be a plausible typo.
    const oggs = [...ON_DISK.keys()].filter((name) => name.endsWith(".ogg")).sort();
    expect(oggs).toEqual(
      [...LANDED_SLOTS, CEREMONY_SLOT_TRACK_ID].map((slot) => `${slot}.ogg`).sort(),
    );
    // And a take for the fifteenth slot, which landed 2026-08-05. Named separately from the
    // equality above because it is the one an open branch would remove.
    expect(ON_DISK.has(`${CEREMONY_SLOT_TRACK_ID}.ogg`)).toBe(true);
  });
});

describe("every era fetches its own committed file, through the real reconciler", () => {
  it("plays era-<eraId>.ogg at all ten eras, and never a house track", () => {
    // **THE CASE THAT WAS RED BEFORE THE FOURTEEN WERE REGISTERED**, and the reason this file
    // exists: with the files committed and no registry rows, every one of these ten resolved
    // to `town-theme.mp3` and every other audio guard in the tree stayed green.
    const { made, factory } = makeFactory();
    const player = playerOver(factory);
    const fetched: string[] = [];

    for (const eraId of ERA_ORDER) {
      setCityEra(eraId);
      reconcileMusic(player);
      // The reconciler selected the era's own slot...
      expect(player.track().id, eraId).toBe(eraSlotTrackId(eraId));
      // ...the player built an element for it...
      const element = nth(made, made.length - 1);
      expect(element.playCount, eraId).toBe(1);
      // ...and the URL it asked for names the file that is really on disk.
      expect(element.src, eraId).toContain(
        `/audio/music/${fileOnDisk(eraSlotTrackId(eraId))}`,
      );
      fetched.push(element.src);
    }

    // Ten eras, ten DIFFERENT files. A single shared track would satisfy every assertion
    // above at each era in turn while giving all ten the same soundtrack, which is the exact
    // shape of what shipped before this change.
    expect(fetched).toHaveLength(10);
    expect(new Set(fetched).size).toBe(10);
    expect(fetched.filter((src) => src.includes("town-theme"))).toEqual([]);
    expect(fetched.filter((src) => src.includes("a-new-town"))).toEqual([]);
  });
});

describe("every crisis in scope fetches its own committed file", () => {
  it("cuts to crisis-<eraId>.ogg for each of the four, and back to the era's own", () => {
    for (const eraId of CRISIS_ERAS) {
      const { made, factory } = makeFactory();
      const player = playerOver(factory);
      setCityEra(eraId);
      reconcileMusic(player);
      expect(nth(made, 0).src, eraId).toContain(
        `/audio/music/${fileOnDisk(eraSlotTrackId(eraId))}`,
      );

      setActiveCrisis(eraId);
      reconcileMusic(player);

      expect(player.track().id, eraId).toBe(crisisSlotTrackId(eraId));
      expect(nth(made, 1).src, eraId).toContain(
        `/audio/music/${fileOnDisk(crisisSlotTrackId(eraId))}`,
      );
      expect(nth(made, 1).playCount, eraId).toBe(1);
      // The crisis's file is not the era's, which is what makes the two dimensions two.
      expect(nth(made, 1).src, eraId).not.toBe(nth(made, 0).src);

      setActiveCrisis(null);
      reconcileMusic(player);
      expect(player.track().id, eraId).toBe(eraSlotTrackId(eraId));
    }
    expect(CRISIS_ERAS).toHaveLength(4);
  });
});

describe("no scene a learner can reach falls back to a house track", () => {
  it("sweeps every era, every crisis and every advance and finds none", () => {
    // The census the two cases above cannot make: they walk the scenes a slot is FOR, so a
    // combination that fell through to the stand-in — a crisis the four in scope do not cover,
    // an advance, an era with a crisis running underneath — would not be in either population.
    const resolved: string[] = [];
    for (const eraId of ERA_ORDER) {
      for (const crisisEraId of [null, ...ERA_ORDER]) {
        for (const ceremony of [false, true]) {
          const { made, factory } = makeFactory();
          const player = playerOver(factory);
          setCityEra(eraId);
          setActiveCrisis(crisisEraId);
          setAdvanceCeremony(ceremony ? eraId : null);
          reconcileMusic(player);
          resolved.push(nth(made, 0).src);
        }
      }
    }
    // The floor, because "none of them is a house track" is free over an empty sweep.
    expect(resolved).toHaveLength(ERA_ORDER.length * (ERA_ORDER.length + 1) * 2);
    expect(resolved).toHaveLength(220);
    expect(resolved.filter((src) => src.includes("town-theme"))).toEqual([]);
    expect(resolved.filter((src) => src.includes("a-new-town"))).toEqual([]);
    // Every one of them is a file that exists, which is the step a URL assertion skips.
    for (const src of new Set(resolved)) {
      const name = src.slice(src.lastIndexOf("/") + 1);
      expect(ON_DISK.has(name), `${name} is not committed`).toBe(true);
    }
    // And the sweep really did visit more than one file, so it is not a set of one passing
    // fifteen assertions. Fifteen rather than fourteen since the bed landed: the 110 advance
    // combinations in this sweep now resolve to it instead of to the outgoing era's track.
    expect(new Set(resolved).size).toBe(15);
    expect(
      resolved.filter((src) => src.includes(`${CEREMONY_SLOT_TRACK_ID}.ogg`)),
    ).toHaveLength(110);
  });
});

describe("the ceremony bed has landed, and an advance plays it rather than the age being left", () => {
  it("has a file and a row, and hands EVERY advance the bed instead of the outgoing era", () => {
    // **THIS CASE USED TO ASSERT THE OPPOSITE, AND THE TAKE ARRIVING IS WHY.** Until
    // 2026-08-05 the bed had no file, so an advance fell through `ERA_STAND_IN` to the
    // outgoing age's own track and this case pinned that as the recorded gap. The lead
    // generated the take, so the gap is closed and the assertion has to describe the
    // feature instead — otherwise it would fail on the tree that finally has the thing it
    // was waiting for.
    //
    // What it must NOT become is uniform-by-deletion. The slot was cancelled once and the
    // cancellation reversed, and two open branches (#607, #609) still carry the removal, so
    // every property the old case protected is kept and pointed the other way: the slot
    // exists, it is exactly one, it has a row, and the row names a file that is really in
    // the directory.
    expect(musicSlots().filter((slot) => slot.kind === "ceremony")).toHaveLength(1);
    expect(isShippedTrack(CEREMONY_SLOT_TRACK_ID)).toBe(true);
    expect(MUSIC_TRACKS.map((track) => track.id)).toContain(CEREMONY_SLOT_TRACK_ID);
    expect(ON_DISK.has(`${CEREMONY_SLOT_TRACK_ID}.ogg`)).toBe(true);
    // And it has stopped borrowing, which is the same fact read off the other side.
    expect(standingInSlots().map((slot) => slot.trackId)).not.toContain(
      CEREMONY_SLOT_TRACK_ID,
    );

    // **THE AUDIBLE CHANGE, at every era rather than at one**, because there is one cue for
    // all ten advances and "it works at era one" is the claim a single case would make. The
    // player is driven through the real reconciler and the URL it asks for is matched
    // against the real directory listing, so this is the browser's request and not a
    // re-derivation of the selection.
    for (const eraId of ERA_ORDER) {
      const { made, factory } = makeFactory();
      const player = playerOver(factory);
      setCityEra(eraId);
      setAdvanceCeremony(eraId);
      reconcileMusic(player);
      expect(player.track().id, eraId).toBe(CEREMONY_SLOT_TRACK_ID);
      // Named in the negative too: the defect this replaces is the advance quietly going
      // back to the age being left, which is what a re-emptied slot does.
      expect(player.track().id, `${eraId}: back on the age being LEFT`).not.toBe(
        eraSlotTrackId(eraId),
      );
      expect(nth(made, 0).src, eraId).toContain(
        `/audio/music/${fileOnDisk(CEREMONY_SLOT_TRACK_ID)}`,
      );
    }
    expect(ERA_ORDER).toHaveLength(10);
  });
});
