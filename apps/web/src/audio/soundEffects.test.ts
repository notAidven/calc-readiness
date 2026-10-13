import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type AudioPrefs,
  createAudioPrefs,
  createGestureGate,
  type GestureTarget,
  type PrefStorage,
} from "./audioPrefs";
import { createSfxPlayer, SFX_NAMES, type SfxElement } from "./soundEffects";

function memoryStorage(): PrefStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

/** A stand-in for `new Audio()` that records what was asked of it. */
interface FakeElement extends SfxElement {
  readonly src: string;
  readonly plays: number[];
  rejectPlay: boolean;
  throwOnPlay: boolean;
}

function makeFactory() {
  const made: FakeElement[] = [];
  const factory = (src: string): SfxElement => {
    const element: FakeElement = {
      src,
      plays: [],
      rejectPlay: false,
      throwOnPlay: false,
      volume: 1,
      currentTime: 0,
      preload: "",
      play() {
        if (element.throwOnPlay) {
          throw new Error("no media");
        }
        element.plays.push(element.volume);
        return element.rejectPlay
          ? Promise.reject(new Error("NotAllowedError"))
          : undefined;
      },
    };
    made.push(element);
    return element;
  };
  return { made, factory };
}

/** A gate that is already open, i.e. the learner has clicked something. */
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

function playedSounds(made: FakeElement[]): string[] {
  return made.filter((element) => element.plays.length > 0).map((element) => element.src);
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

let prefs: AudioPrefs;

beforeEach(() => {
  prefs = createAudioPrefs(memoryStorage());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createSfxPlayer — the autoplay gate", () => {
  it("plays NOTHING before the learner has interacted", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: closedGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("place-building");

    // Not merely silent — no element was even constructed, so no request was made and
    // no `NotAllowedError` could reach the console.
    expect(made).toHaveLength(0);
  });

  it("plays once the gate is open", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("place-building");

    expect(playedSounds(made)).toHaveLength(1);
    expect(nth(made, 0).src).toContain("place-building.ogg");
  });
});

describe("createSfxPlayer — mute and volume", () => {
  it("plays nothing while muted", () => {
    prefs.setMuted(true);
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("civic-purchase");

    expect(playedSounds(made)).toHaveLength(0);
  });

  it("plays nothing at zero volume", () => {
    prefs.setVolume(0);
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("civic-purchase");

    expect(playedSounds(made)).toHaveLength(0);
  });

  it("scales the element volume by the slider", () => {
    prefs.setVolume(1);
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("place-building");
    const loud = nth(nth(made, 0).plays, 0);

    prefs.setVolume(0.5);
    vi.advanceTimersByTime(1000);
    player.play("place-building");
    const quiet = made.flatMap((element) => element.plays).at(-1) ?? 0;

    expect(quiet).toBeCloseTo(loud / 2);
  });

  it("keeps every effect below full scale, so nothing is harsh on the first click", () => {
    prefs.setVolume(1);
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    // THE WHOLE CATALOG, read off the catalog. This used to be the six names written
    // out here, which is a guard counting its own list: the fourteen effects the city's
    // events added would every one of them have been outside it.
    //
    // 20 until 2026-08-05, when departures were removed as a mechanic and
    // `citizens-depart` went with them. The floor tracks the catalogue DOWN by exactly one
    // rather than being given headroom: it is the vacuity guard for the loop below, so slack
    // in it is slack in the only thing that stops "every effect is quiet" passing over an
    // empty catalogue. Measured rather than argued — dropping one more name out of the union
    // fails here, at 15 against 16.
    expect(SFX_NAMES.length).toBeGreaterThanOrEqual(16);
    for (const name of SFX_NAMES) {
      player.play(name);
    }

    const volumes = made.flatMap((element) => element.plays);
    expect(volumes).toHaveLength(SFX_NAMES.length);
    for (const volume of volumes) {
      expect(volume).toBeGreaterThan(0);
      expect(volume).toBeLessThanOrEqual(0.6);
    }
  });

  it("re-reads the preference on EVERY play, so muting mid-session takes effect at once", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("civic-purchase");
    prefs.setMuted(true);
    vi.advanceTimersByTime(1000);
    player.play("civic-purchase");

    expect(made.flatMap((element) => element.plays)).toHaveLength(1);
  });
});

describe("createSfxPlayer — courtesy on repetition", () => {
  it("drops a retrigger inside the sample's minimum interval", () => {
    // The road sound is the reason this exists: a learner rearranging a street fires it
    // dozens of times, and without a floor a fast sweep machine-guns it.
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("road-lay");
    player.play("road-lay");
    player.play("road-lay");

    expect(made.flatMap((element) => element.plays)).toHaveLength(1);
  });

  it("allows the sample again once the interval has passed", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("road-lay");
    vi.advanceTimersByTime(500);
    player.play("road-lay");

    expect(made.flatMap((element) => element.plays)).toHaveLength(2);
  });

  it("throttles each sample independently", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("road-lay");
    player.play("place-building");

    expect(made.flatMap((element) => element.plays)).toHaveLength(2);
  });

  it("rotates voices so overlapping plays do not cut each other off", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.play("mastery-star");
    vi.advanceTimersByTime(100);
    player.play("mastery-star");

    // Two plays landed on two DIFFERENT elements, not the same one restarted.
    expect(made.filter((element) => element.plays.length > 0)).toHaveLength(2);
  });
});

describe("createSfxPlayer — the hidden tab", () => {
  it("plays nothing while the tab is hidden", () => {
    const { made, factory } = makeFactory();
    let hidden = true;
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => hidden,
    });

    player.play("civic-purchase");
    expect(playedSounds(made)).toHaveLength(0);

    hidden = false;
    vi.advanceTimersByTime(1000);
    player.play("civic-purchase");
    expect(playedSounds(made)).toHaveLength(1);
  });
});

describe("createSfxPlayer — never breaks the interaction", () => {
  it("swallows a rejected play (a blocked autoplay policy)", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: (src) => {
        const element = factory(src) as FakeElement;
        element.rejectPlay = true;
        return element;
      },
      isHidden: () => false,
    });

    expect(() => player.play("civic-purchase")).not.toThrow();
    expect(made).toHaveLength(1);
  });

  it("swallows a THROWN play (no media device)", () => {
    const { factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: (src) => {
        const element = factory(src) as FakeElement;
        element.throwOnPlay = true;
        return element;
      },
      isHidden: () => false,
    });

    expect(() => player.play("civic-purchase")).not.toThrow();
  });

  it("gives up quietly, and permanently, where audio cannot be constructed", () => {
    const create = vi.fn(() => null);
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: create,
      isHidden: () => false,
    });

    expect(() => player.play("civic-purchase")).not.toThrow();
    vi.advanceTimersByTime(1000);
    player.play("civic-purchase");

    // One attempt, then never again — no retrying a failing constructor per click.
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("createSfxPlayer — warm", () => {
  it("preloads the whole catalog when audio is audible", () => {
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.warm();

    expect(made.length).toBeGreaterThanOrEqual(SFX_NAMES.length);
    expect(made.every((element) => element.preload === "auto")).toBe(true);
    // Warming fetches; it must not make a sound.
    expect(playedSounds(made)).toHaveLength(0);
  });

  it("fetches NOTHING while muted, so a muted learner pays no bytes", () => {
    prefs.setMuted(true);
    const { made, factory } = makeFactory();
    const player = createSfxPlayer({
      prefs,
      gate: openGate(),
      createAudio: factory,
      isHidden: () => false,
    });

    player.warm();

    expect(made).toHaveLength(0);
  });
});
