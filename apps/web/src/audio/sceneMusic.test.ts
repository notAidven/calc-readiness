import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setActiveCrisis } from "../city/activeCrisis";
import { CRISIS_ERAS } from "../city/three/crisis/registry";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import {
  type AudioPrefs,
  createAudioPrefs,
  createGestureGate,
  DEFAULT_VOLUME,
  type GestureTarget,
  type PrefStorage,
} from "./audioPrefs";
import { crisisSlotTrackId, eraSlotTrackId } from "./eraMusic";
import {
  CROSSFADE_MS,
  createMusicPlayer,
  MUSIC_TRACKS,
  type MusicElement,
  type MusicTrack,
} from "./music";
import { reconcileMusic } from "./useAudio";

/**
 * **THE WHOLE SELECTION PATH, END TO END, WITH A PLAYER THAT CAN BE COUNTED.**
 *
 * `reconcileMusic(player)` is the app's own reconciler with the player injected, so these
 * cases exercise the real era store, the real crisis store and the real selection function
 * everything `useGameAudio` does except subscribing, which `eraMusicWiring.test.tsx`
 * covers. Nothing here re-derives which track a scene plays; if the manifest and the
 * wiring disagreed, that disagreement would show up here rather than being asserted away.
 *
 * MOST CASES HERE STILL LAND TRACKS FOR THEIR OWN DURATION, and that is now a fixture choice
 * rather than a necessity. The fourteen era and crisis tracks have shipped, so the shipped
 * table reaches the acquired path on its own; the cases that keep `withShippedTracks` do it to
 * pin exactly two or three ids and leave the other thirteen out of the fixture, which is what
 * makes an element count assertable. The cases that are about the STAND-IN go the other way
 * with {@link withoutShippedTracks}, because no era is unscored any more and a case about an
 * unscored era has to make one.
 *
 * Two cases take neither route and drive the shipped table as it is — *"DOES disturb it on the
 * shipped table"* and *"DOES cut on the shipped table when era one's winter arrives"* — which
 * is what makes the rest of this file a claim about the product rather than about a fixture.
 */

function memoryStorage(): PrefStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

interface FakeElement extends MusicElement {
  readonly src: string;
  playCount: number;
  pauseCount: number;
}

function makeFactory() {
  const made: FakeElement[] = [];
  const factory = (src: string): MusicElement => {
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
    };
    made.push(element);
    return element;
  };
  return { made, factory };
}

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
 * The fourteen have landed, so the stand-in cases in this file — which are about what happens
 * when a slot has NO row — can no longer be reached by leaving the table alone. Restored by
 * index because `trackById` falls back to entry zero and `music.test.ts` reads entries zero
 * and one; throws when an id is absent, so a case cannot pass on a withdrawal that withdrew
 * nothing.
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
  if (taken.length !== ids.length) {
    throw new Error(
      `expected ${ids.length} shipped rows to withdraw, found ${taken.length}: ${ids.join(", ")}`,
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

const ERA_ONE: EraId = nth(ERA_SEQUENCE, 0).id;
const ERA_TWO: EraId = nth(ERA_SEQUENCE, 1).id;

/**
 * An era whose crisis D-CRISIS-33 shelved, derived from the crisis registry's own in-scope
 * list rather than named here — because that list has already moved once, from eras
 * 1 / 4 / 7 / 10 to 1 / 4 / 6 / 9, and a hardcoded era would silently stop being shelved.
 *
 * This is the population the "an unacquired crisis leaves the music alone" case has now that
 * the four in scope all have their own tracks.
 */
const SHELVED_CRISIS_ERA: EraId = (() => {
  // Widened to `EraId[]` deliberately: `CRISIS_ERAS` is typed as the four literals, so
  // `includes` would reject any era that is not already one of them — which is every era this
  // is looking for.
  const inScope: readonly EraId[] = CRISIS_ERAS;
  const found = ERA_SEQUENCE.map((era) => era.id).find((eraId) => !inScope.includes(eraId));
  if (found === undefined) {
    throw new Error(
      "every era's crisis is in scope, so there is no shelved one to measure",
    );
  }
  return found;
})();

/**
 * THE CROSSFADE'S CLOCK, driven by hand, so a scene change can be observed mid-handover
 * and at its end without timers. `settle()` is "the fade has finished", which is the
 * state most of these cases are actually about.
 */
function fadeClock() {
  let millis = 0;
  return {
    now: () => millis,
    advance(ms: number) {
      millis += ms;
    },
    scheduleFadeStep: () => () => {},
  };
}

let prefs: AudioPrefs;
let clock: ReturnType<typeof fadeClock>;

beforeEach(() => {
  prefs = createAudioPrefs(memoryStorage());
  clock = fadeClock();
  resetCityEra();
  setActiveCrisis(null);
});

afterEach(() => {
  resetCityEra();
  setActiveCrisis(null);
});

function playerOver(factory: (src: string) => MusicElement) {
  return createMusicPlayer({
    prefs,
    gate: openGate(),
    createAudio: factory,
    isHidden: () => false,
    ...clock,
  });
}

/** Run the handover to its end and reconcile, which is where a cut used to land at once. */
function settle(player: { sync(): void }): void {
  clock.advance(CROSSFADE_MS);
  player.sync();
}

describe("the era selects the track, and changing era changes the music", () => {
  it("plays the era's own track and swaps when the city advances", () => {
    withShippedTracks([eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO)], () => {
      prefs.setMusicEnabled(true);
      const { made, factory } = makeFactory();
      const player = playerOver(factory);

      reconcileMusic(player);
      expect(nth(made, 0).src).toContain(eraSlotTrackId(ERA_ONE));
      expect(nth(made, 0).playCount).toBe(1);

      setCityEra(ERA_TWO);
      reconcileMusic(player);

      expect(made).toHaveLength(2);
      expect(nth(made, 1).src).toContain(eraSlotTrackId(ERA_TWO));
      expect(nth(made, 1).playCount).toBe(1);
      expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));
      // THE ADVANCE CROSSFADES: era one is still playing, ducking, while era two comes
      // up. A cut would have paused it on the same call that built era two.
      expect(nth(made, 0).pauseCount).toBe(0);
      expect(nth(made, 0).volume).toBeGreaterThan(nth(made, 1).volume);

      settle(player);
      expect(nth(made, 0).pauseCount).toBe(1);
      expect(nth(made, 1).volume).toBeCloseTo(prefs.musicGain());
    });
  });

  it("does not disturb the music when the era advances into an unscored era", () => {
    // **THE STAND-IN'S OWN CASE, WHICH NO ERA IS IN ANY MORE.** All ten era tracks have
    // landed, so both eras below are unscored only because this case withdraws their rows for
    // the duration. That is not a weaker test than it was: the property still ships — it is
    // what a WITHDRAWN row does, and it is what the six shelved crises do — and running it
    // against a table where the rows exist is what proves the rows are the reason the advance
    // is audible at all.
    withoutShippedTracks([eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO)], () => {
      prefs.setMusicEnabled(true);
      const { made, factory } = makeFactory();
      const player = playerOver(factory);

      reconcileMusic(player);
      // The house track, because that is what an era with no row of its own borrows.
      expect(nth(made, 0).src).toContain("town-theme");
      nth(made, 0).currentTime = 30;

      setCityEra(ERA_TWO);
      reconcileMusic(player);

      expect(made).toHaveLength(1);
      expect(nth(made, 0).playCount).toBe(1);
      expect(nth(made, 0).pauseCount).toBe(0);
      expect(nth(made, 0).currentTime).toBe(30);

      // THE DETECTOR, same fixture and same run: land era two's track and the identical
      // advance does swap. Without this, "nothing happened" is satisfied by a reconciler
      // that stopped working.
      withShippedTracks([eraSlotTrackId(ERA_TWO)], () => {
        reconcileMusic(player);
        expect(made).toHaveLength(2);
        expect(nth(made, 1).src).toContain(eraSlotTrackId(ERA_TWO));
      });
    });
  });

  it("DOES disturb it on the shipped table, because both eras have their own track", () => {
    // The same advance with nothing withdrawn, which is what a learner now gets. This is the
    // case above's opposite number and the reason it had to be rewritten rather than deleted:
    // era one's file gives way to era two's over a crossfade, and neither is the house track.
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = playerOver(factory);

    reconcileMusic(player);
    expect(nth(made, 0).src).toContain(`${eraSlotTrackId(ERA_ONE)}.ogg`);

    setCityEra(ERA_TWO);
    reconcileMusic(player);

    expect(made).toHaveLength(2);
    expect(nth(made, 1).src).toContain(`${eraSlotTrackId(ERA_TWO)}.ogg`);
    expect(nth(made, 0).src).not.toContain("town-theme");
    expect(nth(made, 1).src).not.toContain("town-theme");
  });
});

describe("a crisis takes the soundtrack while it runs, and gives it back in place", () => {
  it("cuts to the crisis on entry and RESUMES the era's track on exit", () => {
    withShippedTracks([eraSlotTrackId(ERA_ONE), crisisSlotTrackId(ERA_ONE)], () => {
      prefs.setMusicEnabled(true);
      const { made, factory } = makeFactory();
      const player = playerOver(factory);

      reconcileMusic(player);
      const eraElement = nth(made, 0);
      expect(eraElement.src).toContain(eraSlotTrackId(ERA_ONE));
      eraElement.currentTime = 45;

      // The winter arrives, and takes the soundtrack over a fade rather than a cut.
      setActiveCrisis(ERA_ONE);
      reconcileMusic(player);

      expect(made).toHaveLength(2);
      expect(nth(made, 1).src).toContain(crisisSlotTrackId(ERA_ONE));
      expect(nth(made, 1).playCount).toBe(1);
      expect(eraElement.pauseCount).toBe(0);
      settle(player);
      expect(eraElement.pauseCount).toBe(1);

      // The winter ends.
      setActiveCrisis(null);
      reconcileMusic(player);
      settle(player);

      // RESUME IN PLACE: the same element, at the same position, rather than the era's
      // theme starting over from its opening bar.
      expect(made).toHaveLength(2);
      expect(nth(made, 0)).toBe(eraElement);
      expect(eraElement.currentTime).toBe(45);
      expect(eraElement.playCount).toBe(2);
      expect(nth(made, 1).pauseCount).toBe(1);
      expect(player.track().id).toBe(eraSlotTrackId(ERA_ONE));
    });
  });

  it("does not come back to the chapter it interrupted if the era advanced underneath", () => {
    withShippedTracks(
      [eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO), crisisSlotTrackId(ERA_ONE)],
      () => {
        prefs.setMusicEnabled(true);
        const { made, factory } = makeFactory();
        const player = playerOver(factory);

        reconcileMusic(player);
        nth(made, 0).currentTime = 45;

        setActiveCrisis(ERA_ONE);
        reconcileMusic(player);
        // An advance while the crisis runs changes nothing audible: the crisis outranks
        // the era, so the selection does not move.
        setCityEra(ERA_TWO);
        reconcileMusic(player);
        expect(made).toHaveLength(2);
        expect(player.track().id).toBe(crisisSlotTrackId(ERA_ONE));

        setActiveCrisis(null);
        reconcileMusic(player);

        // Era two's track, from its opening bar. Era one's is evicted rather than resumed.
        expect(made).toHaveLength(3);
        expect(nth(made, 2).src).toContain(eraSlotTrackId(ERA_TWO));
        expect(nth(made, 2).currentTime).toBe(0);
        expect(nth(made, 0).currentTime).toBe(45);
        expect(nth(made, 0).playCount).toBe(1);
      },
    );
  });

  it("scores the crisis the learner is IN, when the board is another era's", () => {
    // `resolveCrisisEra` pins the board to the earliest era with authored land, so a city
    // in era two fights era one's winter. `HardWinterSurface` declares the BOARD's era, so
    // the crisis music is era one's.
    withShippedTracks([crisisSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO)], () => {
      prefs.setMusicEnabled(true);
      const { made, factory } = makeFactory();
      const player = playerOver(factory);
      setCityEra(ERA_TWO);

      reconcileMusic(player);
      expect(nth(made, 0).src).toContain(eraSlotTrackId(ERA_TWO));

      setActiveCrisis(ERA_ONE);
      reconcileMusic(player);

      expect(nth(made, 1).src).toContain(crisisSlotTrackId(ERA_ONE));
    });
  });

  it("changes nothing at a crisis whose own track was never in scope", () => {
    // The stand-in behaviour, measured on the population it still has. `crisis-prehistoric`
    // has landed, so era one is no longer the case this is about; a crisis D-CRISIS-33 shelved
    // is, and it is a REAL member of the shipped table's shortfall rather than a withdrawal.
    // An unacquired crisis stands in on the era's own track, so the crisis arrives and the
    // music carries on.
    const shelved = SHELVED_CRISIS_ERA;
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = playerOver(factory);
    setCityEra(shelved);

    reconcileMusic(player);
    expect(nth(made, 0).src).toContain(`${eraSlotTrackId(shelved)}.ogg`);
    nth(made, 0).currentTime = 12;
    setActiveCrisis(shelved);
    reconcileMusic(player);

    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(1);
    expect(nth(made, 0).currentTime).toBe(12);

    // THE DETECTOR: land that crisis's track and the identical entry does cut.
    withShippedTracks([crisisSlotTrackId(shelved)], () => {
      reconcileMusic(player);
      expect(made).toHaveLength(2);
      expect(nth(made, 1).src).toContain(crisisSlotTrackId(shelved));
    });
  });

  it("DOES cut on the shipped table when era one's winter arrives", () => {
    // The case above's opposite number, and the one a learner can actually reach: the Hard
    // Winter is the only crisis in the product today and its track has landed, so entering it
    // changes the music. Nothing is registered for the duration of this case.
    expect(CRISIS_ERAS).toContain(ERA_ONE);
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = playerOver(factory);

    reconcileMusic(player);
    expect(nth(made, 0).src).toContain(`${eraSlotTrackId(ERA_ONE)}.ogg`);

    setActiveCrisis(ERA_ONE);
    reconcileMusic(player);

    expect(made).toHaveLength(2);
    expect(nth(made, 1).src).toContain(`${crisisSlotTrackId(ERA_ONE)}.ogg`);
    expect(player.track().id).toBe(crisisSlotTrackId(ERA_ONE));
  });
});

describe("with no music files present at all, the game runs exactly as it does today", () => {
  it("survives an era advance and a whole crisis in silence, having thrown nothing", () => {
    // Every row registered and not one file there. **This used to be the state thirteen of
    // the fourteen slots were in**; all fourteen have landed, so it is now the deploy that
    // shipped without its assets, the browser that will not decode Ogg Vorbis, or a file
    // deleted. It is still what lets a track land one at a time, so it is driven through the
    // REAL reconciler over the REAL era and crisis stores rather than against the player alone.
    withShippedTracks(
      [eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO), crisisSlotTrackId(ERA_ONE)],
      () => {
        prefs.setMusicEnabled(true);
        const said: string[] = [];
        const listeners = new Map<MusicElement, (() => void)[]>();
        const { made, factory } = makeFactory();
        const player = createMusicPlayer({
          prefs,
          gate: openGate(),
          isHidden: () => false,
          debug: (message) => said.push(message),
          createAudio: (src) => {
            const element = factory(src);
            listeners.set(element, []);
            return Object.assign(element, {
              addEventListener(_type: "error", listener: () => void) {
                listeners.get(element)?.push(listener);
              },
            });
          },
          ...clock,
        });

        /** Every file the player has asked for turns out not to be there. */
        const nothingIsThere = () => {
          for (const handlers of [...listeners.values()]) {
            for (const handler of [...handlers]) {
              handler();
            }
          }
        };

        expect(() => {
          reconcileMusic(player);
          nothingIsThere();
          setCityEra(ERA_TWO);
          reconcileMusic(player);
          nothingIsThere();
          settle(player);
          setActiveCrisis(ERA_ONE);
          reconcileMusic(player);
          nothingIsThere();
          settle(player);
          setActiveCrisis(null);
          reconcileMusic(player);
          nothingIsThere();
          settle(player);
        }).not.toThrow();

        // Silence, and the selection still followed the scene — which is the whole
        // distinction: the slots are wired, they simply have nothing to play.
        expect(player.playing()).toBe(false);
        expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));
        // One line per track that turned out to be absent, at debug level, and not one
        // per reconcile: three tracks were visited across eight of them.
        expect(said).toHaveLength(3);
        expect(made).toHaveLength(3);

        // THE POSITIVE CONTROL, on a fixture whose files ARE there. Everything above is
        // satisfied by a reconciler that stopped selecting anything, so the identical
        // sequence over a working factory has to play.
        const working = makeFactory();
        const control = playerOver(working.factory);
        reconcileMusic(control);
        expect(working.made).toHaveLength(1);
        expect(nth(working.made, 0).playCount).toBe(1);
        expect(control.playing()).toBe(true);
      },
    );
  });
});

/**
 * **THE REGRESSION THIS FEATURE IS MOST LIKELY TO SHIP: a scene change resurrecting audio
 * the learner turned off.** `music.test.ts` proves it of the player in isolation; this
 * proves it of the whole path, over BOTH dimensions, because an era change and a crisis
 * change reach the player by different routes and only one of them was in the original
 * brief.
 *
 * EVERY CASE CARRIES ITS OWN POSITIVE CONTROL. "Nothing played" is the classic vacuous
 * assertion here: a counter that never moves satisfies it however broken the code is, and
 * this repository has already shipped one such guard green over 43 cases under a fully
 * muted audio context. So each case ends by undoing the silence and requiring the same
 * sequence to produce exactly one element and one `play()`.
 */
describe("a muted learner stays muted through an era change AND a crisis", () => {
  const silencers = [
    {
      name: "muted everything",
      silence: (target: AudioPrefs) => target.setMuted(true),
      restore: (target: AudioPrefs) => target.setMuted(false),
    },
    {
      name: "switched music off",
      silence: (target: AudioPrefs) => target.setMusicEnabled(false),
      restore: (target: AudioPrefs) => target.setMusicEnabled(true),
    },
    {
      name: "dragged the volume to zero",
      silence: (target: AudioPrefs) => target.setVolume(0),
      restore: (target: AudioPrefs) => target.setVolume(DEFAULT_VOLUME),
    },
  ];

  for (const { name, silence, restore } of silencers) {
    it(`stays silent across an era advance and a whole crisis, having ${name}`, () => {
      withShippedTracks(
        [eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO), crisisSlotTrackId(ERA_ONE)],
        () => {
          prefs.setMusicEnabled(true);
          silence(prefs);
          const { made, factory } = makeFactory();
          const player = playerOver(factory);

          reconcileMusic(player);
          // The era advances, a crisis begins, the crisis ends. Three scene changes, three
          // different track ids, and not one of them may make a sound.
          setCityEra(ERA_TWO);
          reconcileMusic(player);
          setActiveCrisis(ERA_ONE);
          reconcileMusic(player);
          setActiveCrisis(null);
          reconcileMusic(player);

          // Not one element, so not one byte of any of those tracks either.
          expect(made).toHaveLength(0);
          expect(player.playing()).toBe(false);
          // The selection DID follow the scene; it simply made no sound, which is the
          // distinction the whole design rests on.
          expect(player.track().id).toBe(eraSlotTrackId(ERA_TWO));

          // THE POSITIVE CONTROL. Undo the one thing the learner asked for and the same
          // reconcile plays. Without it, the three assertions above are satisfied by a
          // factory nobody ever calls.
          restore(prefs);
          reconcileMusic(player);

          expect(made).toHaveLength(1);
          expect(nth(made, 0).playCount).toBe(1);
          expect(nth(made, 0).src).toContain(eraSlotTrackId(ERA_TWO));
        },
      );
    });
  }

  it("does not un-mute a learner who muted DURING the crisis, when the crisis ends", () => {
    // The ordering that catches a reconciler which treats a crisis exit as a reason to
    // start rather than as a reason to re-read the preferences.
    withShippedTracks([eraSlotTrackId(ERA_ONE), crisisSlotTrackId(ERA_ONE)], () => {
      prefs.setMusicEnabled(true);
      const { made, factory } = makeFactory();
      const player = playerOver(factory);

      reconcileMusic(player);
      setActiveCrisis(ERA_ONE);
      reconcileMusic(player);
      expect(made).toHaveLength(2);

      prefs.setMuted(true);
      reconcileMusic(player);
      expect(player.playing()).toBe(false);

      setActiveCrisis(null);
      reconcileMusic(player);

      // The era's track is handed back but nothing plays it.
      expect(made).toHaveLength(2);
      expect(player.playing()).toBe(false);
      expect(nth(made, 0).playCount).toBe(1);

      // Control: unmuting is what starts it, and it starts on the era's track.
      prefs.setMuted(false);
      reconcileMusic(player);
      expect(nth(made, 0).playCount).toBe(2);
      expect(player.playing()).toBe(true);
    });
  });
});
