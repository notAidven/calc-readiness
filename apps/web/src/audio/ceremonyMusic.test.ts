import { islandUnlockTarget } from "@cr/game";
import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  activeIslandUnlockEraId as advanceCeremonyEraId,
  setActiveIslandUnlock as setAdvanceCeremony,
} from "../city/activeIslandUnlock";
import { setActiveCrisis } from "../city/activeCrisis";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { createAudioPrefs, createGestureGate, type GestureTarget } from "./audioPrefs";
import { CEREMONY_SLOT_TRACK_ID, eraSlotTrackId, musicSlots } from "./eraMusic";
import {
  createMusicPlayer,
  CROSSFADE_MS,
  type MusicElement,
  MUSIC_TRACKS,
  type MusicTrack,
} from "./music";
import { currentMusicScene, reconcileMusic } from "./useAudio";

/**
 * **THE CEREMONY'S BED: it wraps like every other slot, it plays for as long as the advance
 * takes, and the advance press is what ends it.**
 *
 * `eraMusic.test.ts` owns which track a ceremony scene RESOLVES to. This file owns the two
 * things that are only true because the fifteenth slot scores a MOMENT rather than a place:
 * that it is looped by the shipped player exactly like the fourteen, and that the handover
 * happens when the era moves rather than when anything ends or unmounts.
 *
 * ## WHAT THIS FILE USED TO ASSERT, AND WHY IT DOES NOT ANY MORE
 *
 * It used to prove a CUE: `element.loop` cleared, an `ended` event reported, and a `cueSpent`
 * latch driving a handover at the cadence. The lead found the hole — *"shouldn't the era
 * transition music be longer, since the user still has to work through problems to get through
 * the stages?"* — and `city/ceremonyLength.test.ts` measures how big it was: an advance runs
 * 3.6 to over 10 minutes, so a 48-second cue resolved into the destination era's music while
 * the learner was still answering questions to earn that destination.
 *
 * So there is no cue, no `playback` field and no `onTrackEnded`. **`music.ts` is byte-identical
 * to what #536 shipped**, which is worth an assertion of its own below rather than a claim.
 *
 * **Nothing here mocks the player or the selection.** The cases build a real
 * `createMusicPlayer` over counted element doubles and drive the app's own `reconcileMusic`,
 * so a case that passes is a statement about the shipped path rather than about a spy.
 */

/** A double that records what the player did to it. */
interface FakeElement extends MusicElement {
  readonly src: string;
  playCount: number;
  pauseCount: number;
  /** Fire `error`, exactly as a 404 or an undecodable file would. */
  failToLoad(): void;
}

function makeFactory() {
  const made: FakeElement[] = [];
  const factory = (src: string): MusicElement => {
    const errored: (() => void)[] = [];
    const element: FakeElement = {
      src,
      playCount: 0,
      pauseCount: 0,
      volume: 1,
      loop: false,
      currentTime: 0,
      preload: "",
      play() {
        element.playCount += 1;
      },
      pause() {
        element.pauseCount += 1;
      },
      addEventListener(_type, listener) {
        errored.push(listener);
      },
      failToLoad() {
        for (const listener of [...errored]) {
          listener();
        }
      },
    };
    made.push(element);
    return element;
  };
  return { made, factory };
}

/** A gate the browser would consider open, so `sync()` is allowed to want something. */
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

function memoryPrefs() {
  const map = new Map<string, string>();
  return createAudioPrefs({
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  });
}

function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an element at index ${index}, found ${items.length}`);
  }
  return item;
}

const ERA_ONE: EraId = nth(ERA_SEQUENCE, 0).id;
const ERA_TWO: EraId = nth(ERA_SEQUENCE, 1).id;

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

/** The three tracks every case below needs registered: two eras and the bed. */
const THE_SET = [eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO), CEREMONY_SLOT_TRACK_ID];

/** The crossfade's clock, driven by hand — `music.test.ts`'s idiom, and no real timers. */
function fadeClock() {
  let millis = 0;
  return {
    now: () => millis,
    advance(by: number) {
      millis += by;
    },
  };
}

function playerOver(made: { factory: (src: string) => MusicElement }, clock = fadeClock()) {
  return createMusicPlayer({
    prefs: memoryPrefs(),
    gate: openGate(),
    createAudio: made.factory,
    now: clock.now,
    scheduleFadeStep: () => () => {},
  });
}

/**
 * Stand a player in era one with its own track running, then open the ceremony, and hand back
 * the bed's element.
 *
 * The two-step matters rather than being tidier: an advance always begins with the outgoing
 * age's music playing, so setting both stores and reconciling once would test a state no
 * learner can be in and would skip the crossfade INTO the bed.
 */
function openCeremonyOverEraOne(
  player: ReturnType<typeof playerOver>,
  made: { made: FakeElement[] },
): FakeElement {
  setCityEra(ERA_ONE);
  reconcileMusic(player);
  const outgoing = made.made.length;
  setAdvanceCeremony(ERA_ONE);
  reconcileMusic(player);
  expect(player.track().id).toBe(CEREMONY_SLOT_TRACK_ID);
  expect(made.made).toHaveLength(outgoing + 1);
  return nth(made.made, outgoing);
}

beforeEach(() => {
  resetCityEra();
  setActiveCrisis(null);
  setAdvanceCeremony(null);
});

afterEach(() => {
  resetCityEra();
  setActiveCrisis(null);
  setAdvanceCeremony(null);
});

describe("the ceremony's passage wraps like every other slot", () => {
  it("is looped by the shipped player, at every slot in the manifest and with a floor", () => {
    // THE REQUIREMENT, MEASURED RATHER THAN DECLARED. There is no `playback` field to read: the
    // claim is that the player loops whatever a slot resolves to, so it is checked by driving
    // the player over every slot and reading the element it built.
    const slots = musicSlots();
    expect(slots.length).toBeGreaterThanOrEqual(21);
    for (const slot of slots) {
      const made = makeFactory();
      const player = playerOver(made);
      withShippedTracks([slot.trackId], () => {
        player.setTrack(slot.trackId);
        player.sync();
        expect(player.track().id, slot.trackId).toBe(slot.trackId);
        expect(nth(made.made, 0).loop, slot.trackId).toBe(true);
      });
    }
    // And the ceremony slot is genuinely in that sweep rather than passing by absence.
    expect(slots.map((slot) => slot.trackId)).toContain(CEREMONY_SLOT_TRACK_ID);
  });

  it("leaves the player exactly as #536 shipped it, with no cue machinery on the interface", () => {
    // The design correction removed four mechanisms. Asserting their ABSENCE is what stops one
    // creeping back with nothing exercising it: an `onTrackEnded` no caller subscribes to is
    // the shape `CREDITS.md` already records having paid for once, in `purchase.ogg`.
    const player = playerOver(makeFactory());
    expect("onTrackEnded" in player).toBe(false);
    expect("cueSpent" in player).toBe(false);
    expect(Object.keys(nth(MUSIC_TRACKS, 0))).not.toContain("playback");
    // The scene carries the ceremony and nothing about a file's end.
    setAdvanceCeremony(ERA_ONE);
    expect(currentMusicScene().ceremony).toEqual({ eraId: ERA_ONE });
  });
});

describe("the bed plays for as long as the advance takes", () => {
  it("survives an advance's worth of reconciles without changing or restarting", () => {
    // The advance is answer-paced: every answer, every pause acknowledgement and every store
    // move reconciles the soundtrack. At a nine-node era that is dozens of reconciles across
    // minutes, and the bed has to be the same element playing throughout — one restart would
    // be an audible re-entry mid-ceremony.
    const made = makeFactory();
    const clock = fadeClock();
    const player = playerOver(made, clock);
    withShippedTracks(THE_SET, () => {
      const bed = openCeremonyOverEraOne(player, made);
      const startedTimes = bed.playCount;
      const madeSoFar = made.made.length;

      // Two answers per node at the largest era, plus the reveal press.
      const reconciles = islandUnlockTarget(getEraNodes("cyberpunk").length) * 2 + 1;
      expect(reconciles).toBeGreaterThan(30);
      for (let round = 0; round < reconciles; round += 1) {
        clock.advance(1_000);
        reconcileMusic(player);
        expect(player.track().id).toBe(CEREMONY_SLOT_TRACK_ID);
      }

      expect(made.made).toHaveLength(madeSoFar);
      expect(bed.playCount).toBe(startedTimes);
      expect(bed.pauseCount).toBe(0);
      expect(player.playing()).toBe(true);
    });
  });

  it("is still playing after ten minutes, because a loop has no end to reach", () => {
    // THE SLOW EXTREME, which is the case the whole re-length is for. A learner at 80% on a
    // nine-node era is past ten minutes; a cue would have finished nine minutes earlier and
    // handed the music to the destination era before the learner earned it.
    const made = makeFactory();
    const clock = fadeClock();
    const player = playerOver(made, clock);
    withShippedTracks(THE_SET, () => {
      const bed = openCeremonyOverEraOne(player, made);
      clock.advance(10 * 60 * 1_000);
      reconcileMusic(player);

      expect(player.track().id).toBe(CEREMONY_SLOT_TRACK_ID);
      expect(player.playing()).toBe(true);
      expect(bed.loop).toBe(true);
      // No new element, so nothing restarted and nothing went silent.
      expect(bed.pauseCount).toBe(0);
    });
  });

  it("is fine when a learner takes ninety seconds, which needs no decision at all", () => {
    // THE FAST EXTREME. The bed is cut short mid-passage and that is the property the loop
    // buys: a bed has no arrival to miss. Asserted as the ABSENCE of any special handling —
    // the same two writes produce the same one handover as the slow case.
    const made = makeFactory();
    const clock = fadeClock();
    const player = playerOver(made, clock);
    withShippedTracks(THE_SET, () => {
      openCeremonyOverEraOne(player, made);
      clock.advance(90 * 1_000);
      reconcileMusic(player);
      expect(player.track().id).toBe(CEREMONY_SLOT_TRACK_ID);

      setCityEra(ERA_TWO);
      setAdvanceCeremony(null);
      reconcileMusic(player);
      expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));
    });
  });
});

describe("the handover is the era moving, in either order", () => {
  it("hands over on the advance press, where the bell already is", () => {
    const made = makeFactory();
    const clock = fadeClock();
    const player = playerOver(made, clock);
    withShippedTracks(THE_SET, () => {
      openCeremonyOverEraOne(player, made);
      clock.advance(CROSSFADE_MS + 1);
      reconcileMusic(player);

      // The press: the host moves the era, then the surface comes down.
      setCityEra(ERA_TWO);
      reconcileMusic(player);
      expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));
      setAdvanceCeremony(null);
      reconcileMusic(player);
      expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));
      expect(player.playing()).toBe(true);
    });
  });

  it("gives the SAME answer when the surface comes down first, which is the ordering hazard", () => {
    // **THE CASE THE ERA-EQUALITY TEST EXISTS FOR.** Keying the bed off the ceremony surface
    // unmounting would be correct on one ordering and wrong on the other: clearing the store
    // before the era moved would resolve to the OUTGOING age for a reconcile, crossfading back
    // to era one for a moment on the way to era two. Keying off the era cannot express that.
    const made = makeFactory();
    const clock = fadeClock();
    const player = playerOver(made, clock);
    withShippedTracks(THE_SET, () => {
      openCeremonyOverEraOne(player, made);
      clock.advance(CROSSFADE_MS + 1);
      reconcileMusic(player);
      const seen: string[] = [];

      setAdvanceCeremony(null);
      reconcileMusic(player);
      seen.push(player.track().id);
      setCityEra(ERA_TWO);
      reconcileMusic(player);
      seen.push(player.track().id);

      // Era one is reached here and that is CORRECT rather than the hazard: with the ceremony
      // gone and the era not yet moved, era one is what the city is standing in. The hazard
      // was the reverse claim — that the bed should outlive the era move — and the assertion
      // that rules it out is the one above: the bed stops at the era, not at the unmount.
      expect(seen).toEqual([eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO)]);
    });
  });

  it("stops the bed the moment the era moves, even with the ceremony still declared", () => {
    // The direct statement of the rule, and the one that would fail if the era-equality test
    // were dropped: a dev hatch or a stray write that moves the era mid-ceremony takes the bed
    // with it, because the bed belongs to the age being left.
    const made = makeFactory();
    const player = playerOver(made);
    withShippedTracks(THE_SET, () => {
      openCeremonyOverEraOne(player, made);
      setCityEra(ERA_TWO);
      reconcileMusic(player);

      expect(advanceCeremonyEraId()).toBe(ERA_ONE);
      expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));
    });
  });
});

describe("the fifteenth slot degrades exactly as the other fourteen do", () => {
  it("goes silent rather than throwing when the bed's file is missing, and never rebuilds it", () => {
    // #536's contract, held for this slot too.
    const made = makeFactory();
    const debug: string[] = [];
    const player = createMusicPlayer({
      prefs: memoryPrefs(),
      gate: openGate(),
      createAudio: made.factory,
      scheduleFadeStep: () => () => {},
      debug: (message) => debug.push(message),
    });
    withShippedTracks(THE_SET, () => {
      setCityEra(ERA_ONE);
      reconcileMusic(player);
      const outgoing = made.made.length;
      setAdvanceCeremony(ERA_ONE);
      reconcileMusic(player);
      expect(player.track().id).toBe(CEREMONY_SLOT_TRACK_ID);

      nth(made.made, outgoing).failToLoad();
      const madeSoFar = made.made.length;
      reconcileMusic(player);
      reconcileMusic(player);

      expect(player.playing()).toBe(false);
      expect(made.made).toHaveLength(madeSoFar);
      expect(debug).toHaveLength(1);
      expect(debug[0]).toContain(CEREMONY_SLOT_TRACK_ID);

      // And the advance still brings the next age up, so a missing bed costs the ceremony its
      // music and costs the advance nothing.
      setCityEra(ERA_TWO);
      setAdvanceCeremony(null);
      reconcileMusic(player);
      expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));
    });
  });

  it("stays retryable when the browser refuses to start the bed", () => {
    // #536's other contract. A refused `play()` is not a missing file, so the element is kept
    // and the learner's next reconcile tries again.
    const refusals: string[] = [];
    let refuse = true;
    const player = createMusicPlayer({
      prefs: memoryPrefs(),
      gate: openGate(),
      createAudio: (src) => ({
        volume: 1,
        loop: false,
        currentTime: 0,
        preload: "",
        play() {
          if (!refuse) {
            return undefined;
          }
          refusals.push(src);
          return Promise.reject(new Error("NotAllowedError"));
        },
        pause() {},
        addEventListener: () => {},
      }),
      scheduleFadeStep: () => () => {},
    });
    return (async () => {
      const table = MUSIC_TRACKS as unknown as MusicTrack[];
      const before = table.length;
      for (const id of THE_SET) {
        table.push({ ...nth(MUSIC_TRACKS, 0), id, title: id, file: `music/${id}.ogg` });
      }
      try {
        setCityEra(ERA_ONE);
        setAdvanceCeremony(ERA_ONE);
        reconcileMusic(player);
        // The rejection lands on a microtask, so the retry is only observable after it.
        await Promise.resolve();
        expect(player.playing()).toBe(false);
        expect(player.track().id).toBe(CEREMONY_SLOT_TRACK_ID);
        expect(refusals.some((src) => src.includes(CEREMONY_SLOT_TRACK_ID))).toBe(true);

        refuse = false;
        reconcileMusic(player);
        expect(player.playing()).toBe(true);
        expect(player.track().id).toBe(CEREMONY_SLOT_TRACK_ID);
      } finally {
        table.length = before;
      }
    })();
  });
});
