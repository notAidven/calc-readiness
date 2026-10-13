import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type AudioPrefs,
  createAudioPrefs,
  createGestureGate,
  DEFAULT_VOLUME,
  type GestureTarget,
  MUSIC_VOLUME_SCALE,
  type PrefStorage,
} from "./audioPrefs";
import {
  CROSSFADE_MS,
  CROSSFADE_STEP_MS,
  createMusicPlayer,
  DEFAULT_TRACK_ID,
  MUSIC_TRACKS,
  type MusicElement,
  type MusicTrack,
  trackById,
} from "./music";

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
  rejectPlay: boolean;
}

function makeFactory() {
  const made: FakeElement[] = [];
  const factory = (src: string): MusicElement => {
    const element: FakeElement = {
      src,
      playCount: 0,
      pauseCount: 0,
      rejectPlay: false,
      volume: 1,
      loop: false,
      currentTime: 0,
      preload: "",
      play() {
        element.playCount += 1;
        return element.rejectPlay
          ? Promise.reject(new Error("NotAllowedError"))
          : undefined;
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

/**
 * A double that also carries the `error` event, which is how a file that is not there
 * announces itself. `makeFactory` deliberately omits it, so the two together cover both
 * halves of the optional listener: an element that can report a missing asset, and one
 * that never can.
 */
interface ErrorableElement extends FakeElement {
  /** Fire `error`, exactly as a 404 or an undecodable file would. */
  failToLoad(): void;
}

function makeErrorableFactory() {
  const made: ErrorableElement[] = [];
  const factory = (src: string): MusicElement => {
    const listeners: (() => void)[] = [];
    const element: ErrorableElement = {
      src,
      playCount: 0,
      pauseCount: 0,
      rejectPlay: false,
      volume: 1,
      loop: false,
      currentTime: 0,
      preload: "",
      play() {
        element.playCount += 1;
        return element.rejectPlay
          ? Promise.reject(new Error("NotAllowedError"))
          : undefined;
      },
      pause() {
        element.pauseCount += 1;
      },
      addEventListener(_type, listener) {
        listeners.push(listener);
      },
      failToLoad() {
        for (const listener of [...listeners]) {
          listener();
        }
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

function closedGate() {
  const gate = createGestureGate({ addEventListener: () => {} });
  gate.arm();
  return gate;
}

/** A gate that starts shut and can be opened mid-test, so the same fixture can prove both. */
function pendingGate() {
  const handlers: (() => void)[] = [];
  const gate = createGestureGate({
    addEventListener: (_type, listener) => handlers.push(listener),
  });
  gate.arm();
  return {
    gate,
    open: () => {
      handlers[0]?.();
    },
  };
}

/**
 * Indexed access with a real failure. `noUncheckedIndexedAccess` is on and the repo uses
 * no non-null assertions, so tests reach into arrays through this: a missing element
 * fails loudly rather than being coalesced into a passing assertion.
 */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an element at index ${index}, found ${items.length}`);
  }
  return item;
}

/**
 * THE CROSSFADE'S CLOCK, driven by hand.
 *
 * The fade is a function of time rather than a queue of steps, so a case advances the
 * clock and calls `sync()` and gets exactly the state that instant implies. The step
 * scheduler is inert deliberately: no case leaves a real timer pending after it, and
 * nothing here depends on the scheduler's own cadence.
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

beforeEach(() => {
  prefs = createAudioPrefs(memoryStorage());
});

/**
 * Two DIFFERENT shipped tracks, so a swap is a real swap. Read off `MUSIC_TRACKS` rather
 * than written down, because an assertion that the file changed is worthless if the two
 * ids happen to be the same one.
 */
const FIRST_TRACK = nth(MUSIC_TRACKS, 0);
const SECOND_TRACK = nth(MUSIC_TRACKS, 1);

/**
 * Register a third track for the duration of `body`, then restore exactly.
 *
 * Two files ship, and one case needs three distinct ids: an unknown id is not a third
 * track, because `trackById` resolves it to the first. Mutating the shipped table is the
 * same device `packages/economy/src/materials.test.ts` uses to reach a branch the shipped
 * data cannot produce.
 */
function withExtraTrack(id: string, body: () => void): void {
  const table = MUSIC_TRACKS as unknown as MusicTrack[];
  const before = table.length;
  table.push({ ...FIRST_TRACK, id, title: id, file: `music/${id}.mp3` });
  try {
    body();
  } finally {
    table.length = before;
  }
}

describe("the track shortlist", () => {
  it("ships at least two auditionable candidates", () => {
    expect(MUSIC_TRACKS.length).toBeGreaterThanOrEqual(2);
  });

  it("records source, author, and license for every track", () => {
    // A track whose provenance we cannot state is a track we cannot prove we may ship.
    for (const track of MUSIC_TRACKS) {
      expect(track.source).toMatch(/^https:\/\//);
      expect(track.author).not.toBe("");
      expect(track.license).not.toBe("");
      expect(track.file).toMatch(/^music\//);
    }
  });

  it("resolves the configured default", () => {
    expect(trackById(DEFAULT_TRACK_ID).id).toBe(DEFAULT_TRACK_ID);
  });

  it("falls back to the first track for an unknown id, rather than going silent", () => {
    // The default is chosen by editing one string; a typo should cost a different
    // track, not a broken soundtrack.
    expect(trackById("no-such-track").id).toBe(MUSIC_TRACKS[0].id);
  });
});

describe("createMusicPlayer — nothing is fetched until something wants to play", () => {
  it("creates NOTHING before the first gesture, even though music is on by default", () => {
    // THE load-bearing guarantee now that music ships enabled: a tab opened in a quiet
    // room and left alone is silent, and the 1.3MB track is not even requested. This is
    // what makes the on-by-default safe, so it is the test to keep green.
    expect(prefs.musicEnabled()).toBe(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: closedGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.sync();

    expect(made).toHaveLength(0);
    expect(player.playing()).toBe(false);
  });

  it("creates NOTHING while music is switched off, even after a gesture", () => {
    prefs.setMusicEnabled(false);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.sync();

    // A learner who opts out pays no bytes for the track either.
    expect(made).toHaveLength(0);
    expect(player.playing()).toBe(false);
  });

  it("builds the element only on the FIRST want, not at construction", () => {
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: closedGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    // Constructing the player, and syncing it while the gate is shut, fetch nothing.
    player.sync();
    expect(made).toHaveLength(0);

    // The learner interacts; only now does the track exist.
    const openPlayer = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });
    openPlayer.sync();
    expect(made).toHaveLength(1);
  });
});

describe("createMusicPlayer — the dev-only mute reaches the player", () => {
  it("fetches and plays NOTHING in dev, even after a gesture", () => {
    // The end of the chain: the dev mute is a preference, and the player reads it like any
    // other reason not to play, so the 1.3MB track is never even requested while working
    // locally.
    const devPrefs = createAudioPrefs(memoryStorage(), { muteMusicForDev: true });
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs: devPrefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.sync();

    expect(made).toHaveLength(0);
    expect(player.playing()).toBe(false);
    // The effects are NOT silenced along with it.
    expect(devPrefs.effectGain()).toBeGreaterThan(0);
  });

  it("still plays for a developer who clicks the Music switch on", () => {
    // The dev mute is a preset, not an override, so the escape hatch is the control the
    // learner already has. If this went red the mute would be a wall instead of a default.
    const devPrefs = createAudioPrefs(memoryStorage(), { muteMusicForDev: true });
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs: devPrefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    devPrefs.setMusicEnabled(true);
    player.sync();

    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(1);
    expect(player.playing()).toBe(true);
  });
});

describe("createMusicPlayer — playing", () => {
  it("starts, on loop, once enabled and gestured", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.sync();

    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(1);
    expect(nth(made, 0).loop).toBe(true);
    expect(player.playing()).toBe(true);
  });

  it("plays the configured track's file", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: nth(MUSIC_TRACKS, 1).id,
    });

    player.sync();

    expect(nth(made, 0).src).toContain(nth(MUSIC_TRACKS, 1).file);
    expect(player.track().id).toBe(nth(MUSIC_TRACKS, 1).id);
  });

  it("is idempotent — repeated syncs do not restart the track", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.sync();
    player.sync();
    player.sync();

    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(1);
  });

  it("sits well below the effects, so it never competes with them", () => {
    prefs.setMusicEnabled(true);
    prefs.setVolume(1);
    const { made, factory } = makeFactory();
    createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    }).sync();

    expect(nth(made, 0).volume).toBeCloseTo(MUSIC_VOLUME_SCALE);
    expect(nth(made, 0).volume).toBeLessThan(prefs.effectGain());
  });
});

describe("createMusicPlayer — the controls are live", () => {
  it("tracks the volume slider while already playing", () => {
    prefs.setMusicEnabled(true);
    prefs.setVolume(1);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });
    player.sync();
    const before = nth(made, 0).volume;

    prefs.setVolume(0.5);
    player.sync();

    expect(nth(made, 0).volume).toBeCloseTo(before / 2);
    // Changing the volume must not restart the track.
    expect(nth(made, 0).playCount).toBe(1);
  });

  it("pauses on mute and resumes the SAME element on unmute", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });
    player.sync();

    prefs.setMuted(true);
    player.sync();
    expect(nth(made, 0).pauseCount).toBe(1);
    expect(player.playing()).toBe(false);

    prefs.setMuted(false);
    player.sync();
    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(2);
    expect(player.playing()).toBe(true);
  });

  it("pauses when the learner drags the slider to zero", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });
    player.sync();

    prefs.setVolume(0);
    player.sync();

    expect(nth(made, 0).pauseCount).toBe(1);
  });

  it("pauses when the learner turns music off", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });
    player.sync();

    prefs.setMusicEnabled(false);
    player.sync();

    expect(nth(made, 0).pauseCount).toBe(1);
    expect(player.playing()).toBe(false);
  });
});

describe("createMusicPlayer — courtesy when the tab is hidden", () => {
  it("pauses when the tab goes away and resumes when it comes back", () => {
    prefs.setMusicEnabled(true);
    let hidden = false;
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => hidden,
    });
    player.sync();
    expect(player.playing()).toBe(true);

    hidden = true;
    player.sync();
    expect(nth(made, 0).pauseCount).toBe(1);
    expect(player.playing()).toBe(false);

    hidden = false;
    player.sync();
    expect(nth(made, 0).playCount).toBe(2);
    expect(player.playing()).toBe(true);
  });

  it("does NOT resume a learner who muted while the tab was hidden", () => {
    prefs.setMusicEnabled(true);
    let hidden = false;
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => hidden,
    });
    player.sync();

    hidden = true;
    player.sync();
    prefs.setMuted(true);
    hidden = false;
    player.sync();

    // `sync` reads the world rather than remembering what it was doing, so returning
    // to the tab honours the preference as it stands now.
    expect(nth(made, 0).playCount).toBe(1);
    expect(player.playing()).toBe(false);
  });
});

describe("createMusicPlayer — never breaks the app", () => {
  it("recovers from a refused play, so the next click can try again", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: (src) => {
        const element = factory(src) as FakeElement;
        element.rejectPlay = true;
        return element;
      },
      isHidden: () => false,
    });

    player.sync();

    // The rejection resolves on a microtask, so let it settle.
    return Promise.resolve().then(() => {
      expect(player.playing()).toBe(false);
      player.sync();
      expect(nth(made, 0).playCount).toBe(2);
    });
  });

  it("gives up quietly, and permanently, where audio cannot be constructed", () => {
    prefs.setMusicEnabled(true);
    const create = vi.fn(() => null);
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: create,
      isHidden: () => false,
    });

    expect(() => player.sync()).not.toThrow();
    player.sync();

    expect(create).toHaveBeenCalledTimes(1);
    expect(player.playing()).toBe(false);
  });

  it("stops and releases the element", () => {
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });
    player.sync();

    player.stop();

    expect(nth(made, 0).pauseCount).toBe(1);
    expect(player.playing()).toBe(false);
  });
});

/**
 * **THE REQUIREMENT THE WHOLE DROP-IN PIPELINE RESTS ON.**
 *
 * Fourteen tracks land one at a time, so a registry row whose file has not been dropped
 * in yet is the ordinary state and not an incident. What that must cost is silence in
 * that one slot: no throw, no unhandled rejection, no console error, and no retry storm
 * behind the scenes either.
 *
 * The distinction that makes this hard is that a REFUSED autoplay looks the same from
 * outside and must keep retrying on the learner's next click. So the signal is the
 * element's `error` event and never a rejected `play()`, and both are driven here, in
 * the same file, with the rejection case required to stay retryable.
 */
describe("createMusicPlayer: a slot with no asset falls back to silence", () => {
  it("goes quiet instead of throwing, and never rebuilds the missing track", () => {
    prefs.setMusicEnabled(true);
    const said: string[] = [];
    const { made, factory } = makeErrorableFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      debug: (message) => said.push(message),
    });

    player.sync();
    expect(made).toHaveLength(1);
    expect(player.playing()).toBe(true);

    // The file is not there.
    expect(() => nth(made, 0).failToLoad()).not.toThrow();

    expect(player.playing()).toBe(false);
    // Five more reconciles — a volume drag, an era change, a tab return — must not
    // re-request a file that is not there. A retry per sync is the storm this rules out.
    for (let index = 0; index < 5; index += 1) {
      expect(() => player.sync()).not.toThrow();
    }
    expect(made).toHaveLength(1);
    expect(player.playing()).toBe(false);

    // ONE line, at debug level, however many times it reconciled.
    expect(said).toHaveLength(1);
    expect(nth(said, 0)).toContain(FIRST_TRACK.file);
    expect(nth(said, 0)).toContain(FIRST_TRACK.id);

    // THE POSITIVE CONTROL, on the same fixture in the same run. Everything above is
    // satisfied by a player that stopped working, so a DIFFERENT track whose file is
    // fine has to play — which also says the degradation is per slot and not global.
    player.setTrack(SECOND_TRACK.id);
    player.sync();
    expect(made).toHaveLength(2);
    expect(nth(made, 1).playCount).toBe(1);
    expect(player.playing()).toBe(true);
    expect(said).toHaveLength(1);
  });

  it("still retries a track the browser merely REFUSED to autoplay", () => {
    // The distinction the `error` event exists to draw. A rejected `play()` is the
    // autoplay policy, not a missing file, and the learner's next click must try again.
    // Reading a rejection as "no asset" would silence a learner permanently on the first
    // spent gesture, which is the defect this pair of cases separates.
    prefs.setMusicEnabled(true);
    const said: string[] = [];
    const { made, factory } = makeErrorableFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: (src) => {
        const element = factory(src) as ErrorableElement;
        element.rejectPlay = true;
        return element;
      },
      isHidden: () => false,
      debug: (message) => said.push(message),
    });

    player.sync();

    return Promise.resolve().then(() => {
      expect(player.playing()).toBe(false);
      player.sync();
      expect(nth(made, 0).playCount).toBe(2);
      // And nothing was reported as missing, because nothing is.
      expect(said).toEqual([]);
    });
  });

  it("runs with NO music files at all, across every scene change, in silence", () => {
    // Every file absent. **This used to be the state the repository was in for thirteen of
    // the fourteen slots**; all fourteen have landed, so it is now the deploy that shipped
    // without its assets, the browser that will not decode Ogg Vorbis, or a file deleted. The
    // game must reach the end of this sequence having thrown nothing and played nothing, with
    // one debug line per distinct track rather than one per attempt.
    prefs.setMusicEnabled(true);
    const said: string[] = [];
    const clock = fadeClock();
    const { made, factory } = makeErrorableFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
      debug: (message) => said.push(message),
      ...clock,
    });

    const visit = (trackId: string) => {
      player.setTrack(trackId);
      player.sync();
      // Whatever was just built is the file that is not there.
      for (const element of made) {
        element.failToLoad();
      }
      clock.advance(CROSSFADE_MS);
      player.sync();
    };

    expect(() => {
      visit(FIRST_TRACK.id);
      visit(SECOND_TRACK.id);
      visit(FIRST_TRACK.id);
      prefs.setMuted(true);
      player.sync();
      prefs.setMuted(false);
      player.sync();
    }).not.toThrow();

    expect(player.playing()).toBe(false);
    // Two tracks were visited three times and each reported itself once.
    expect(said).toHaveLength(2);
    expect(made).toHaveLength(2);
  });

  it("says nothing at all when the element cannot report, rather than assuming", () => {
    // `makeFactory`'s double omits `addEventListener` entirely, which is also what a
    // narrowed or exotic media element looks like. The player must fall back to the
    // behaviour it had before this feature — keep trying, stay quiet — rather than
    // treating an element it cannot listen to as broken.
    prefs.setMusicEnabled(true);
    const said: string[] = [];
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      debug: (message) => said.push(message),
    });

    player.sync();

    expect(made).toHaveLength(1);
    expect(player.playing()).toBe(true);
    expect(said).toEqual([]);
  });
});

/**
 * THE SCENE'S LEVER. `eraMusic.ts` decides which track a scene plays; this is everything
 * the player owes that decision.
 */
describe("createMusicPlayer: setTrack, the scene's lever", () => {
  it("was handed two genuinely different tracks to test with", () => {
    // Every assertion below about a track CHANGING is vacuous if these are one track.
    expect(FIRST_TRACK.id).not.toBe(SECOND_TRACK.id);
    expect(FIRST_TRACK.file).not.toBe(SECOND_TRACK.file);
  });

  it("does NOTHING for the track already playing, and DOES swap when the id moves", () => {
    // The caller reconciles on every input, not on a change, so most calls arrive with
    // the id that is already set. Restarting the soundtrack on each of them is the easy
    // defect this exists to rule out.
    prefs.setMusicEnabled(true);
    const clock = fadeClock();
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
      ...clock,
    });
    player.sync();
    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(1);

    player.setTrack(FIRST_TRACK.id);
    player.sync();

    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(1);
    expect(nth(made, 0).pauseCount).toBe(0);
    expect(nth(made, 0).currentTime).toBe(0);
    expect(player.playing()).toBe(true);
    expect(player.track().id).toBe(FIRST_TRACK.id);
    // No fade was started, so nothing is in flight for the assertions below to read.
    expect(player.fadeProgress()).toBe(1);

    // THE DETECTOR, PROVED ON THE SAME FIXTURE IN THE SAME RUN. A play counter that
    // never moves satisfies "it did not restart" whatever the code does, so the counters
    // above are only worth reading if a genuine change moves them. This one does.
    player.setTrack(SECOND_TRACK.id);

    // Nothing starts and nothing stops in `setTrack`: the outgoing element is still
    // playing, unpaused, and the incoming one does not exist yet.
    expect(made).toHaveLength(1);
    expect(nth(made, 0).pauseCount).toBe(0);
    expect(player.fadeProgress()).toBe(0);

    player.sync();

    expect(made).toHaveLength(2);
    expect(nth(made, 1).src).toContain(SECOND_TRACK.file);
    expect(nth(made, 1).playCount).toBe(1);
    expect(nth(made, 1).loop).toBe(true);
    expect(player.track().id).toBe(SECOND_TRACK.id);
    expect(player.playing()).toBe(true);
    // THE OVERLAP, which is what makes it a crossfade rather than a cut: both elements
    // have been played and neither has been paused, at opposite ends of the ramp.
    expect(nth(made, 0).playCount).toBe(1);
    expect(nth(made, 0).pauseCount).toBe(0);
    expect(nth(made, 0).volume).toBeGreaterThan(0);
    expect(nth(made, 1).volume).toBe(0);

    // Halfway: the outgoing has come down, the incoming has come up, and on an
    // equal-power curve they meet at the same level rather than dipping.
    clock.advance(CROSSFADE_MS / 2);
    player.sync();
    expect(nth(made, 0).pauseCount).toBe(0);
    expect(nth(made, 1).volume).toBeCloseTo(nth(made, 0).volume);
    expect(nth(made, 1).volume).toBeGreaterThan(0);

    // And the handover completes: the outgoing is paused exactly once, the incoming is
    // at the full slider level, and it was never restarted along the way.
    clock.advance(CROSSFADE_MS / 2);
    player.sync();
    expect(nth(made, 0).pauseCount).toBe(1);
    expect(nth(made, 1).playCount).toBe(1);
    expect(nth(made, 1).volume).toBeCloseTo(prefs.musicGain());
    expect(player.fadeProgress()).toBe(1);
    expect(player.playing()).toBe(true);
  });

  it("PARKS the outgoing track and resumes it in place, which is what a crisis exit is", () => {
    // THE CRISIS ROUND TRIP. The winter interrupts the era's music and then ends, and the
    // question the lead asked is whether the city's track comes back where it was or from
    // its opening bar. It comes back where it was, and this is the assertion that says so:
    // the SAME element, at the SAME position, rather than a third one built from scratch.
    prefs.setMusicEnabled(true);
    withExtraTrack("a-third-track", () => {
      const clock = fadeClock();
      const { made, factory } = makeFactory();
      const player = createMusicPlayer({
        prefs,
        gate: openGate(),
        createAudio: factory,
        isHidden: () => false,
        trackId: FIRST_TRACK.id,
        ...clock,
      });
      player.sync();
      const eraElement = nth(made, 0);
      // Stand in for a minute of listening, so "resumed in place" has a position to be
      // about. A restart would take this back to zero, which is the failure the lead
      // named: *"restarting a two-minute loop every time the winter ends will be
      // noticed."*
      eraElement.currentTime = 61.5;

      // The crisis begins, and the handover runs to its end.
      player.setTrack(SECOND_TRACK.id);
      player.sync();
      clock.advance(CROSSFADE_MS);
      player.sync();
      expect(made).toHaveLength(2);
      expect(nth(made, 1).src).toContain(SECOND_TRACK.file);
      expect(eraElement.pauseCount).toBe(1);

      // The crisis ends.
      player.setTrack(FIRST_TRACK.id);
      player.sync();

      // No third element: the era's own is handed back, still holding its position.
      expect(made).toHaveLength(2);
      expect(nth(made, 0)).toBe(eraElement);
      expect(eraElement.currentTime).toBe(61.5);
      expect(eraElement.playCount).toBe(2);
      expect(player.track().id).toBe(FIRST_TRACK.id);
      expect(player.playing()).toBe(true);
      // It fades back UP from where it was rather than snapping to full, which is the
      // half of "resumes in place" that a `currentTime` assertion cannot see.
      expect(eraElement.volume).toBe(0);
      clock.advance(CROSSFADE_MS);
      player.sync();
      expect(eraElement.volume).toBeCloseTo(prefs.musicGain());
      expect(nth(made, 1).pauseCount).toBe(1);

      // THE DETECTOR, in the same run on the same fixture. "No third element" is also
      // satisfied by a player that has stopped building anything at all, so the factory
      // is made to move by asking for a track that was never parked.
      player.setTrack("a-third-track");
      player.sync();
      expect(made).toHaveLength(3);
      expect(nth(made, 2).currentTime).toBe(0);
      expect(nth(made, 2).playCount).toBe(1);
    });
  });

  it("evicts the parked track when a THIRD arrives, so an advance under a crisis is honoured", () => {
    // An era advance while the crisis is running means the crisis must NOT come back to
    // the chapter it interrupted. The park holds one element, so the third track evicts
    // it and the new era starts from its opening bar. That is the right answer and it
    // falls out of the rule rather than being a special case.
    prefs.setMusicEnabled(true);
    withExtraTrack("next-era-track", () => {
      const clock = fadeClock();
      const { made, factory } = makeFactory();
      const player = createMusicPlayer({
        prefs,
        gate: openGate(),
        createAudio: factory,
        isHidden: () => false,
        trackId: FIRST_TRACK.id,
        ...clock,
      });
      player.sync();
      const oldEra = nth(made, 0);
      oldEra.currentTime = 40;

      // The crisis begins, and the era advances underneath it.
      player.setTrack(SECOND_TRACK.id);
      player.sync();
      clock.advance(CROSSFADE_MS);
      player.sync();
      // The crisis ends into a DIFFERENT era than the one it interrupted.
      player.setTrack("next-era-track");
      player.sync();
      clock.advance(CROSSFADE_MS);
      player.sync();

      expect(made).toHaveLength(3);
      expect(nth(made, 2).src).toContain("next-era-track");
      expect(nth(made, 2).currentTime).toBe(0);
      expect(nth(made, 2).playCount).toBe(1);

      // And the evicted era track is genuinely gone: returning to it builds a FOURTH
      // element rather than resuming the one that was at 40 seconds.
      player.setTrack(FIRST_TRACK.id);
      player.sync();
      clock.advance(CROSSFADE_MS);
      player.sync();
      expect(made).toHaveLength(4);
      expect(nth(made, 3).currentTime).toBe(0);
      expect(oldEra.currentTime).toBe(40);
      expect(oldEra.playCount).toBe(1);
    });
  });

  it("keeps the volume the slider is at, rather than resetting it on the new track", () => {
    prefs.setMusicEnabled(true);
    prefs.setVolume(0.4);
    const clock = fadeClock();
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
      ...clock,
    });
    player.sync();
    const beforeTheChange = nth(made, 0).volume;

    player.setTrack(SECOND_TRACK.id);
    player.sync();
    clock.advance(CROSSFADE_MS);
    player.sync();

    // The fade lands ON the slider rather than on some remembered level, which is the
    // property a ramp is most likely to break: it ends where the outgoing track was.
    expect(nth(made, 1).volume).toBeCloseTo(0.4 * MUSIC_VOLUME_SCALE);
    expect(nth(made, 1).volume).toBeCloseTo(beforeTheChange);
  });

  it("survives an id nobody shipped, rather than going silent", () => {
    prefs.setMusicEnabled(true);
    const clock = fadeClock();
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: SECOND_TRACK.id,
      ...clock,
    });
    player.sync();

    player.setTrack("no-such-track");
    player.sync();

    // Same rule as `trackById`: a typo costs a different track, never a broken
    // soundtrack.
    expect(player.track().id).toBe(FIRST_TRACK.id);
    expect(nth(made, 1).playCount).toBe(1);
    expect(player.playing()).toBe(true);
  });

  it("fetches nothing when the era moves before the learner's first click", () => {
    // The module's load-bearing guarantee is that a tab opened and left alone costs zero
    // audio bytes. A track change is a new way to break it, so it is asserted with the
    // gesture as the only thing that changes between red and green.
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const { gate, open } = pendingGate();
    const player = createMusicPlayer({
      prefs,
      gate,
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
    });
    player.sync();
    player.setTrack(SECOND_TRACK.id);
    player.sync();

    expect(made).toHaveLength(0);
    expect(player.playing()).toBe(false);

    // Control: the gesture is the only thing withheld, and supplying it builds exactly
    // the new era's track.
    open();
    player.sync();

    expect(made).toHaveLength(1);
    expect(nth(made, 0).src).toContain(SECOND_TRACK.file);
  });
});

/**
 * **THE FADE DRIVES ITSELF, WHICH EVERY CASE ABOVE DELIBERATELY HIDES.**
 *
 * `fadeClock`'s scheduler is inert, so those cases advance the handover by calling
 * `sync()` and prove the CURVE while proving nothing about who calls it. In the app
 * nobody does: a scene change is one reconcile, and the twenty-nine after it are the
 * player's own. A fade that never schedules its next step would pass every assertion
 * above and, shipped, would leave the outgoing track playing under the incoming one
 * forever. Both halves are measured here, and the second uses the shipped defaults.
 */
describe("createMusicPlayer: the crossfade runs without anyone driving it", () => {
  it("schedules its own steps until the handover is done, then stops", () => {
    prefs.setMusicEnabled(true);
    let millis = 0;
    let pending: (() => void) | null = null;
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
      now: () => millis,
      scheduleFadeStep: (step) => {
        pending = step;
        return () => {
          pending = null;
        };
      },
    });
    player.sync();
    // Nothing is in flight, so nothing is scheduled: a player that ticked forever would
    // hold a timer open for the life of the page.
    expect(pending).toBeNull();

    player.setTrack(SECOND_TRACK.id);
    player.sync();
    expect(pending).not.toBeNull();

    // Run only the steps the PLAYER asks for, advancing the clock by the interval it
    // asked to be woken after. No `sync()` from outside.
    let steps = 0;
    while (pending !== null && steps < 500) {
      const step: () => void = pending;
      pending = null;
      millis += CROSSFADE_STEP_MS;
      step();
      steps += 1;
    }

    // It terminated on its own, having taken roughly the fade's length in steps.
    expect(pending).toBeNull();
    expect(steps).toBeGreaterThan(1);
    expect(steps).toBeLessThanOrEqual(Math.ceil(CROSSFADE_MS / CROSSFADE_STEP_MS) + 2);
    expect(nth(made, 0).pauseCount).toBe(1);
    expect(nth(made, 1).volume).toBeCloseTo(prefs.musicGain());
    expect(player.fadeProgress()).toBe(1);
    expect(player.playing()).toBe(true);
  });

  it("does it on the SHIPPED clock and scheduler, in real time", async () => {
    // The one case with nothing injected but the audio factory. It is the slowest test in
    // the file by far and it is the only one that says the default `setTimeout` path is
    // wired at all — everything else would be equally green with `scheduleFadeStep`
    // defaulting to a no-op.
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
    });
    player.sync();
    player.setTrack(SECOND_TRACK.id);
    player.sync();
    expect(made).toHaveLength(2);
    expect(nth(made, 0).pauseCount).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, CROSSFADE_MS + 400));

    // Nobody called `sync()` in between.
    expect(nth(made, 0).pauseCount).toBe(1);
    expect(nth(made, 1).volume).toBeCloseTo(prefs.musicGain());
    expect(player.fadeProgress()).toBe(1);

    player.stop();
  });
});

/**
 * **WHAT A MUTE DOES TO A FADE ALREADY IN FLIGHT**, which is the one rule a crossfade
 * adds that a hard cut never had to answer. The learner asked for silence, not for a
 * graceful one, so the handover ends where it stands.
 *
 * This is where a fade is most likely to break the mute guarantee, because it is the one
 * moment two elements are audible and only one of them is the player's `element`.
 */
describe("createMusicPlayer: a mute outranks a crossfade in flight", () => {
  it("silences BOTH sides at once, and unmuting does not restart the handover", () => {
    prefs.setMusicEnabled(true);
    const clock = fadeClock();
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
      ...clock,
    });
    player.sync();

    player.setTrack(SECOND_TRACK.id);
    player.sync();
    clock.advance(CROSSFADE_MS / 3);
    player.sync();
    // Mid-handover: two elements, both audible, which is the state under test.
    expect(made).toHaveLength(2);
    expect(nth(made, 0).volume).toBeGreaterThan(0);
    expect(nth(made, 1).volume).toBeGreaterThan(0);
    expect(player.fadeProgress()).toBeLessThan(1);

    prefs.setMuted(true);
    player.sync();

    // BOTH are paused. The outgoing one is the one a naive fade forgets: it is not the
    // player's current element, so a mute that only pauses `element` leaves a ducking
    // track audible under a learner who asked for silence.
    expect(nth(made, 0).pauseCount).toBe(1);
    expect(nth(made, 1).pauseCount).toBe(1);
    expect(player.playing()).toBe(false);
    expect(player.fadeProgress()).toBe(1);

    // THE POSITIVE CONTROL. Unmuting starts the track the scene selected, at the full
    // slider level rather than at the third of the way up where the fade was frozen,
    // and it does not resurrect the outgoing one.
    prefs.setMuted(false);
    player.sync();

    expect(made).toHaveLength(2);
    expect(nth(made, 1).playCount).toBe(2);
    expect(nth(made, 1).volume).toBeCloseTo(prefs.musicGain());
    expect(nth(made, 0).playCount).toBe(1);
    expect(player.playing()).toBe(true);

    // And the interrupted handover still PARKED the track it was leaving, so a crisis
    // muted halfway through its entry still gives the era's music back in place.
    player.setTrack(FIRST_TRACK.id);
    player.sync();
    expect(made).toHaveLength(2);
    expect(nth(made, 0).playCount).toBe(2);
  });
});

/**
 * **THE REGRESSION THIS FEATURE IS MOST LIKELY TO SHIP: a track change resurrecting
 * audio the learner turned off.**
 *
 * There are three ways to silence the soundtrack and they take three different routes
 * through `sync()`, because `musicEnabled` is its own flag while mute and a zero slider
 * both land on `gain <= 0`. So all three are driven rather than one standing in for the
 * other two.
 *
 * EVERY CASE CARRIES ITS OWN POSITIVE CONTROL, in the same test and on the same fixture.
 * "Nothing played" is the classic vacuous assertion here: a counter that never moves
 * satisfies it however broken the code is, and this repo has already shipped one such
 * guard green over 43 cases under a fully muted audio context. So each case ends by
 * undoing the silence and requiring the very same sequence to produce exactly one
 * element and exactly one `play()`.
 */
describe("createMusicPlayer: a track change never un-silences a learner", () => {
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
    it(`stays silent through an era's track change, having ${name}`, () => {
      prefs.setMusicEnabled(true);
      silence(prefs);
      expect(prefs.musicGain() > 0 && prefs.musicEnabled()).toBe(false);

      const { made, factory } = makeFactory();
      const player = createMusicPlayer({
        prefs,
        gate: openGate(),
        createAudio: factory,
        isHidden: () => false,
        trackId: FIRST_TRACK.id,
      });
      player.sync();
      expect(made).toHaveLength(0);

      player.setTrack(SECOND_TRACK.id);
      player.sync();

      // Not one element, so not one byte of the new track either.
      expect(made).toHaveLength(0);
      expect(player.playing()).toBe(false);
      // The selection DID move; it simply made no sound, which is the distinction the
      // whole design rests on.
      expect(player.track().id).toBe(SECOND_TRACK.id);

      // THE POSITIVE CONTROL. Undo the one thing the learner asked for and the identical
      // sequence plays. Without this, the three assertions above are satisfied by a
      // factory nobody ever calls.
      restore(prefs);
      player.sync();

      expect(made).toHaveLength(1);
      expect(nth(made, 0).playCount).toBe(1);
      expect(nth(made, 0).src).toContain(SECOND_TRACK.file);
      expect(player.playing()).toBe(true);
    });
  }

  it("does not resume a learner who muted BEFORE the era advanced", () => {
    // The harder ordering: the element already exists and is paused, so a change that
    // rebuilt eagerly would have something to restart.
    prefs.setMusicEnabled(true);
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
      trackId: FIRST_TRACK.id,
    });
    player.sync();
    expect(nth(made, 0).playCount).toBe(1);

    prefs.setMuted(true);
    player.sync();
    expect(nth(made, 0).pauseCount).toBe(1);
    expect(player.playing()).toBe(false);

    player.setTrack(SECOND_TRACK.id);
    player.sync();

    expect(made).toHaveLength(1);
    expect(nth(made, 0).playCount).toBe(1);
    expect(player.playing()).toBe(false);

    // Control: unmuting is what starts it, and it starts on the era's NEW track rather
    // than the one that was paused.
    prefs.setMuted(false);
    player.sync();

    expect(made).toHaveLength(2);
    expect(nth(made, 1).src).toContain(SECOND_TRACK.file);
    expect(nth(made, 1).playCount).toBe(1);
  });

  it("does not resume into a hidden tab because the era moved", () => {
    prefs.setMusicEnabled(true);
    let hidden = false;
    const { made, factory } = makeFactory();
    const player = createMusicPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => hidden,
      trackId: FIRST_TRACK.id,
    });
    player.sync();

    hidden = true;
    player.sync();
    player.setTrack(SECOND_TRACK.id);
    player.sync();

    expect(made).toHaveLength(1);
    expect(player.playing()).toBe(false);

    // Control: coming back to the tab is what starts the new track.
    hidden = false;
    player.sync();

    expect(made).toHaveLength(2);
    expect(nth(made, 1).src).toContain(SECOND_TRACK.file);
  });
});
