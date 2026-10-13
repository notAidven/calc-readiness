import { describe, expect, it, vi } from "vitest";

import {
  createAudioPrefs,
  createGestureGate,
  DEFAULT_VOLUME,
  type GestureTarget,
  MUSIC_ENABLED_BY_DEFAULT,
  MUSIC_KEY,
  MUSIC_VOLUME_SCALE,
  MUTE_KEY,
  type PrefStorage,
  resolveDevMusicMute,
  VOLUME_KEY,
} from "./audioPrefs";

/** An in-memory `PrefStorage`, so no test touches the real `localStorage`. */
function fakeStorage(seed: Record<string, string> = {}): PrefStorage & {
  map: Map<string, string>;
} {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("createAudioPrefs — defaults", () => {
  it("starts unmuted, at the default volume, with music ON", () => {
    const prefs = createAudioPrefs(fakeStorage());

    expect(prefs.muted()).toBe(false);
    expect(prefs.volume()).toBe(DEFAULT_VOLUME);
    // Music ships ON (reversed in review on #137). What keeps that safe is NOT this
    // flag but the autoplay gate below: a tab opened in a quiet room and left alone
    // stays silent, because nothing plays before the learner's first interaction.
    expect(prefs.musicEnabled()).toBe(true);
    expect(MUSIC_ENABLED_BY_DEFAULT).toBe(true);
  });

  it("lets a learner turn music off, and remembers it", () => {
    // The counterweight to an on-by-default soundtrack: opting out is one click, and it
    // survives every later reload.
    const storage = fakeStorage();
    createAudioPrefs(storage).setMusicEnabled(false);

    expect(createAudioPrefs(storage).musicEnabled()).toBe(false);
  });

  it("honours a mute preference saved by the OLD lesson-only sound layer", () => {
    // The key predates this module (it shipped in `lessons/lessonSound.ts`) and is
    // deliberately reused rather than renamed. A learner who had muted lesson sounds
    // must still be muted, and must now also get a quiet city.
    const prefs = createAudioPrefs(fakeStorage({ [MUTE_KEY]: "true" }));

    expect(prefs.muted()).toBe(true);
    expect(prefs.effectGain()).toBe(0);
  });

  it("reads saved volume and music preferences", () => {
    const prefs = createAudioPrefs(
      fakeStorage({ [VOLUME_KEY]: "0.25", [MUSIC_KEY]: "true" }),
    );

    expect(prefs.volume()).toBe(0.25);
    expect(prefs.musicEnabled()).toBe(true);
  });
});

describe("resolveDevMusicMute — which environments the dev mute reaches", () => {
  it("is FALSE in a production build, whatever the flag says", () => {
    // The load-bearing assertion of the whole dev mute: `vite build` compiles
    // `import.meta.env` to a literal with `DEV: false`, so a learner's bundle takes this
    // branch and gets the shipped default. Nothing else here is allowed to matter.
    expect(resolveDevMusicMute({ DEV: false, MODE: "production" })).toBe(false);
  });

  it("is TRUE under the local dev server, which is what Evan asked for", () => {
    expect(resolveDevMusicMute({ DEV: true, MODE: "development" })).toBe(true);
  });

  it("is FALSE under the test runner, which is also `DEV`", () => {
    // Vitest reports `DEV: true, MODE: "test"`. If the suite counted as dev, every test
    // that reads the app-wide singleton would be asserting the DEV path while claiming to
    // describe a learner — so the runner keeps the shipped default and the dev path is
    // tested by passing the flag explicitly instead.
    expect(resolveDevMusicMute({ DEV: true, MODE: "test" })).toBe(false);
  });
});

describe("createAudioPrefs — the dev-only music mute", () => {
  it("starts the soundtrack OFF while the dev mute is in force", () => {
    const prefs = createAudioPrefs(fakeStorage(), { muteMusicForDev: true });

    expect(prefs.musicEnabled()).toBe(false);
    // `musicGain()` is deliberately NOT asserted here: it reports how loud music WOULD be
    // at the current slider and is independent of the switch, so it cannot tell these two
    // states apart. What silence rests on is `musicEnabled()`, which the player reads —
    // see the dev-mute case in `music.test.ts`.
  });

  it("beats a STORED music preference, so every dev reload starts quiet", () => {
    // A developer who once clicked Music On has "true" in their profile. A mute that only
    // changed the default would work on a fresh browser profile and silently not on theirs.
    const prefs = createAudioPrefs(fakeStorage({ [MUSIC_KEY]: "true" }), {
      muteMusicForDev: true,
    });

    expect(prefs.musicEnabled()).toBe(false);
  });

  it("leaves the existing switch working, so one click brings music back", () => {
    // It defaults the learner-facing control rather than overriding it: the Music button in
    // `AudioSettings` still turns the soundtrack on for whoever wants to hear it in dev.
    const storage = fakeStorage();
    const prefs = createAudioPrefs(storage, { muteMusicForDev: true });

    prefs.setMusicEnabled(true);

    expect(prefs.musicEnabled()).toBe(true);
    expect(storage.map.get(MUSIC_KEY)).toBe("true");
  });

  it("silences the MUSIC only — effects, mute and volume are untouched", () => {
    // Evan asked for music, and the two are separate all the way down: effects read
    // `effectGain()`, which this must not move.
    const dev = createAudioPrefs(fakeStorage(), { muteMusicForDev: true });
    const shipped = createAudioPrefs(fakeStorage());

    expect(dev.muted()).toBe(shipped.muted());
    expect(dev.volume()).toBe(shipped.volume());
    expect(dev.effectGain()).toBe(shipped.effectGain());
    expect(dev.effectGain()).toBeGreaterThan(0);
    // And the two disagree about exactly one thing.
    expect(dev.musicEnabled()).not.toBe(shipped.musicEnabled());
  });

  it("is off unless asked for, so nothing but the singleton opts in", () => {
    expect(createAudioPrefs(fakeStorage()).musicEnabled()).toBe(MUSIC_ENABLED_BY_DEFAULT);
    expect(createAudioPrefs(fakeStorage(), {}).musicEnabled()).toBe(
      MUSIC_ENABLED_BY_DEFAULT,
    );
    expect(createAudioPrefs(fakeStorage(), { muteMusicForDev: false }).musicEnabled()).toBe(
      MUSIC_ENABLED_BY_DEFAULT,
    );
  });
});

describe("createAudioPrefs — persistence", () => {
  it("writes each preference under its own key", () => {
    const storage = fakeStorage();
    const prefs = createAudioPrefs(storage);

    prefs.setMuted(true);
    prefs.setVolume(0.4);
    prefs.setMusicEnabled(true);

    expect(storage.map.get(MUTE_KEY)).toBe("true");
    expect(storage.map.get(VOLUME_KEY)).toBe("0.4");
    expect(storage.map.get(MUSIC_KEY)).toBe("true");
  });

  it("survives a reload — a second instance over the same bytes agrees", () => {
    const storage = fakeStorage();
    const first = createAudioPrefs(storage);

    first.setMuted(true);
    first.setVolume(0.15);
    first.setMusicEnabled(true);

    // "Reload" is literally re-opening a second instance on the same storage.
    const second = createAudioPrefs(storage);

    expect(second.muted()).toBe(true);
    expect(second.volume()).toBe(0.15);
    expect(second.musicEnabled()).toBe(true);
  });

  it("keeps working when storage THROWS on read and write", () => {
    // Private mode / a partitioned frame. The regression this guards: reading the key
    // on every call would make the mute button silently do nothing here, leaving a
    // learner with no way to silence the app.
    const hostile: PrefStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const prefs = createAudioPrefs(hostile);

    expect(prefs.muted()).toBe(false);
    expect(() => prefs.setMuted(true)).not.toThrow();
    expect(prefs.muted()).toBe(true);
    expect(prefs.effectGain()).toBe(0);

    expect(() => prefs.setVolume(0.3)).not.toThrow();
    expect(prefs.volume()).toBe(0.3);
  });

  it("keeps working with no storage at all", () => {
    const prefs = createAudioPrefs(null);

    prefs.setMusicEnabled(true);
    prefs.setVolume(0.5);

    expect(prefs.musicEnabled()).toBe(true);
    expect(prefs.volume()).toBe(0.5);
  });
});

describe("createAudioPrefs — volume is always a usable number", () => {
  it("clamps out-of-range values on the way in", () => {
    const prefs = createAudioPrefs(fakeStorage());

    prefs.setVolume(9);
    expect(prefs.volume()).toBe(1);

    prefs.setVolume(-4);
    expect(prefs.volume()).toBe(0);
  });

  it("falls back to the default for a non-finite value", () => {
    const prefs = createAudioPrefs(fakeStorage());

    prefs.setVolume(Number.NaN);
    expect(prefs.volume()).toBe(DEFAULT_VOLUME);
  });

  it.each([
    ["garbage", "not-a-number"],
    ["an empty string", ""],
    ["whitespace", "   "],
  ])("falls back to the default for %s in storage", (_label, stored) => {
    // `Number("")` is 0, so a naive parse would read an empty string as SILENCE and
    // the learner would open a mysteriously mute game.
    const prefs = createAudioPrefs(fakeStorage({ [VOLUME_KEY]: stored }));

    expect(prefs.volume()).toBe(DEFAULT_VOLUME);
  });

  it("clamps an out-of-range value that is already in storage", () => {
    const prefs = createAudioPrefs(fakeStorage({ [VOLUME_KEY]: "5" }));

    expect(prefs.volume()).toBe(1);
  });
});

describe("createAudioPrefs — gains", () => {
  it("effectGain follows the slider, and is 0 while muted", () => {
    const prefs = createAudioPrefs(fakeStorage());

    prefs.setVolume(0.8);
    expect(prefs.effectGain()).toBeCloseTo(0.8);

    prefs.setMuted(true);
    expect(prefs.effectGain()).toBe(0);

    // Unmuting restores the slider rather than resetting it.
    prefs.setMuted(false);
    expect(prefs.effectGain()).toBeCloseTo(0.8);
  });

  it("musicGain sits well under the effects at every slider position", () => {
    const prefs = createAudioPrefs(fakeStorage());

    prefs.setVolume(1);
    expect(prefs.musicGain()).toBeCloseTo(MUSIC_VOLUME_SCALE);
    expect(prefs.musicGain()).toBeLessThan(prefs.effectGain());

    prefs.setMuted(true);
    expect(prefs.musicGain()).toBe(0);
  });

  it("a volume of zero silences everything without touching mute", () => {
    const prefs = createAudioPrefs(fakeStorage());

    prefs.setVolume(0);

    expect(prefs.muted()).toBe(false);
    expect(prefs.effectGain()).toBe(0);
    expect(prefs.musicGain()).toBe(0);
  });
});

describe("createAudioPrefs — subscribers", () => {
  it("notifies on every change, so two controls cannot disagree", () => {
    const prefs = createAudioPrefs(fakeStorage());
    const listener = vi.fn();
    prefs.subscribe(listener);

    prefs.setMuted(true);
    prefs.setVolume(0.2);
    prefs.setMusicEnabled(true);

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("stops notifying after the remover runs", () => {
    const prefs = createAudioPrefs(fakeStorage());
    const listener = vi.fn();
    const remove = prefs.subscribe(listener);

    prefs.setMuted(true);
    remove();
    prefs.setMuted(false);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("survives a listener that unsubscribes another during the notification", () => {
    const prefs = createAudioPrefs(fakeStorage());
    const second = vi.fn();
    let removeSecond = () => {};
    prefs.subscribe(() => removeSecond());
    removeSecond = prefs.subscribe(second);

    expect(() => prefs.setMuted(true)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ gesture gate */

/** A `document`-shaped stub that lets a test fire the gesture by hand. */
function fakeTarget(): GestureTarget & { fire(type: string): void; types: string[] } {
  const handlers = new Map<string, (() => void)[]>();
  return {
    types: [],
    addEventListener(type, listener) {
      this.types.push(type);
      const existing = handlers.get(type) ?? [];
      existing.push(listener);
      handlers.set(type, existing);
    },
    fire(type) {
      for (const listener of handlers.get(type) ?? []) {
        listener();
      }
    },
  };
}

describe("createGestureGate — the autoplay gate", () => {
  it("starts closed, so nothing can play into a freshly opened tab", () => {
    const gate = createGestureGate(fakeTarget());
    gate.arm();

    expect(gate.opened()).toBe(false);
  });

  it("stays closed until armed AND gestured", () => {
    const target = fakeTarget();
    const gate = createGestureGate(target);

    // Not armed yet: no listeners, so the click cannot be seen.
    target.fire("pointerdown");
    expect(gate.opened()).toBe(false);

    gate.arm();
    target.fire("pointerdown");
    expect(gate.opened()).toBe(true);
  });

  it.each(["pointerdown", "keydown", "touchstart", "click"])(
    "opens on a %s, so keyboard and touch learners are not left silent",
    (type) => {
      const target = fakeTarget();
      const gate = createGestureGate(target);
      gate.arm();

      target.fire(type);

      expect(gate.opened()).toBe(true);
    },
  );

  it("listens in the CAPTURE phase, so a sound triggered BY the first click still plays", () => {
    const target = fakeTarget();
    const captured: (boolean | undefined)[] = [];
    const spy: GestureTarget = {
      addEventListener: (_type, _listener, options) => {
        captured.push(options?.capture);
      },
    };
    createGestureGate(spy).arm();

    expect(captured.length).toBeGreaterThan(0);
    expect(captured.every((capture) => capture === true)).toBe(true);
    expect(target.types).toEqual([]);
  });

  it("arms only once, however many times it is called", () => {
    const target = fakeTarget();
    const gate = createGestureGate(target);

    gate.arm();
    gate.arm();
    gate.arm();

    // Four event types, registered exactly once each.
    expect(target.types).toHaveLength(4);
  });

  it("runs a waiting listener when the gate opens", () => {
    const target = fakeTarget();
    const gate = createGestureGate(target);
    const listener = vi.fn();
    gate.arm();
    gate.whenOpen(listener);

    expect(listener).not.toHaveBeenCalled();

    target.fire("click");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("runs a listener IMMEDIATELY when the gate is already open", () => {
    const target = fakeTarget();
    const gate = createGestureGate(target);
    gate.arm();
    target.fire("click");

    const listener = vi.fn();
    gate.whenOpen(listener);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not run a listener that was removed before the gesture", () => {
    const target = fakeTarget();
    const gate = createGestureGate(target);
    const listener = vi.fn();
    gate.arm();
    gate.whenOpen(listener)();

    target.fire("click");

    expect(listener).not.toHaveBeenCalled();
  });

  it("opens once and only once, even if several gesture types fire", () => {
    const target = fakeTarget();
    const gate = createGestureGate(target);
    const listener = vi.fn();
    gate.arm();
    gate.whenOpen(listener);

    target.fire("pointerdown");
    target.fire("click");
    target.fire("keydown");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("is inert with no target (a server render), and never throws", () => {
    const gate = createGestureGate(null);

    expect(() => gate.arm()).not.toThrow();
    expect(gate.opened()).toBe(false);
  });
});
