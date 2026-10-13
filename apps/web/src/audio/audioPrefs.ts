import { runtimeStorage } from "../storage/runtimeStorage";

/**
 * The single source of truth for every audio preference in the game: one mute, one
 * volume, one music switch, one gesture gate, one AudioContext.
 *
 * WHY THIS EXISTS. Before this module the app had TWO independent synthesizers with
 * two different rules. `lessons/lessonSound.ts` honoured a `cr.lessonSound.muted`
 * preference and refused to make a sound before the learner had interacted;
 * `city/chime.ts` honoured neither, so a learner who had explicitly muted lesson
 * sounds still heard a chime every time a building completed. Adding a soundtrack and
 * six effects on top of that would have made a third set of rules and a third
 * AudioContext. Instead every sound in the game now asks THIS module whether it is
 * allowed to play and how loud, so "mute" means mute and one slider moves everything.
 *
 * WHY PLAIN `localStorage` AND NOT `devPersistence/`. The stores under
 * `devPersistence/` are gated on {@link isDevPersistenceEnabled} because they hold
 * STUDENT STATE — a wallet, a ledger, a city — which Contracts §3 says only the Lambda
 * may own, so they must go inert the moment the app could be server-backed. An audio
 * preference is not student state; it is a property of the device and the room the
 * learner is sitting in, it is worthless to a server, and it must keep working in
 * exactly the deployment where those stores switch themselves off. So this follows the
 * precedent already set by `lessonSound.ts` — a plain, best-effort `localStorage` key —
 * rather than the dev-session machinery. Every read and write is wrapped: a blocked
 * storage partition (private mode, a hardened classroom profile) costs the learner
 * their saved preference, never the app.
 *
 * The factory/singleton split mirrors `devPersistence/devSession.ts`
 * (`createDevSessionStore` + `devSessionStore`): tests build an instance over a fake
 * storage, and the app shares one process-wide instance.
 */

/** The slice of `Storage` a preference needs. Kept local so this module owes the
 *  dev-persistence layer (and its server-backed gate) nothing. */
export interface PrefStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * The mute key keeps its ORIGINAL, lesson-specific name on purpose. It shipped in
 * `lessonSound.ts` and learners already have it set; renaming it would silently
 * un-mute every one of them, which is the exact failure this feature is supposed to
 * prevent. It now governs all game audio rather than just the lesson chime — a
 * widening of scope that can only ever make the app quieter than the learner asked
 * for, never louder.
 */
export const MUTE_KEY = "cr.lessonSound.muted";
export const VOLUME_KEY = "cr.audio.volume";
export const MUSIC_KEY = "cr.audio.music";

/**
 * Everything is ON by default: the effects and the soundtrack both.
 *
 * An effect is the acknowledgement of something the learner just did — they clicked
 * "Confirm", so a building thuds down. It cannot startle anyone who was not already
 * touching the machine, it is under 250ms, and shipping it silent would quietly
 * regress the lesson chime that is already on by default today.
 *
 * The soundtrack is on because a city-builder is supposed to feel inhabited, and a
 * default nobody ever changes is the one most learners will actually experience. This
 * is a REVERSAL of how this module first shipped (music was opt-in), decided in review
 * on #137.
 *
 * The reason that reversal is safe is that the thing worth worrying about — a maths app
 * blaring into a silent classroom or a shared library — is not actually controlled by
 * this constant. Three other guarantees hold it down, and none of them changed:
 *
 *  1. NOTHING plays before the learner's first interaction ({@link createGestureGate}).
 *     A tab opened in a quiet room and left alone stays silent indefinitely, and the
 *     track is not even fetched until something wants to play it.
 *  2. Music plays at a third of the effect volume ({@link MUSIC_VOLUME_SCALE}), so its
 *     arrival is ambience rather than an event.
 *  3. Turning it off is one click and is remembered forever after, as is muting
 *     everything and dragging the volume to zero.
 *
 * So the honest statement of the trade is: a learner who opens the game and clicks
 * something now hears quiet music, and a learner who does not want that spends one
 * click to never hear it again.
 *
 * This is the LEARNER's default and it is the only one that ships. While working
 * locally the soundtrack starts off instead; see {@link MUSIC_MUTED_IN_DEV}.
 */
export const MUSIC_ENABLED_BY_DEFAULT = true;

/**
 * TEMPORARY, DEV-ONLY: the soundtrack starts OFF under the local dev server. **Flip
 * this to `false` to hear music in dev again — that is the whole revert.**
 *
 * WHY. A dev server reloads on every keystroke, and a 97-second loop that restarts from
 * the top on each reload is the wrong soundtrack for a working day. Nothing about the
 * shipped experience is in question here, which is why this is a switch rather than a
 * change to {@link MUSIC_ENABLED_BY_DEFAULT}.
 *
 * WHAT IT DOES NOT TOUCH. Only the soundtrack. Sound effects read `effectGain()`, which
 * this leaves exactly where it was, so every effect and both chimes still answer a
 * developer's clicks — that is the point of the split, and `musicEnabled()` is the only
 * preference music consumes. Nor does it make anything louder or earlier: the autoplay
 * gate, the mute key, the volume slider and the reduced-motion posture elsewhere are all
 * untouched, and turning a sound OFF cannot regress an accessibility guarantee.
 *
 * IT DEFAULTS THE EXISTING CONTROL rather than adding a second mute. The learner-facing
 * Music switch in `AudioSettings` is what this presets, so a developer who does want the
 * track clicks it on and hears it, exactly as a learner would. The preset applies on
 * every dev page load (it beats a stored `true`), because a mute that only held on a
 * fresh browser profile would be worse than none.
 */
export const MUSIC_MUTED_IN_DEV = true;

/** The slice of `import.meta.env` {@link resolveDevMusicMute} reads. */
export interface BuildEnv {
  /** Vite's dev flag: `true` under `vite dev`, compiled to `false` by `vite build`. */
  readonly DEV: boolean;
  /** `"development"`, `"production"`, or `"test"` under Vitest. */
  readonly MODE: string;
}

/**
 * Whether the dev music mute applies to the process reading this.
 *
 * `import.meta.env.DEV` is the signal because Vite replaces it STATICALLY: a production
 * bundle contains the literal `false`, so a learner's build cannot take the dev branch
 * however the flag above is set. The other candidates were rejected: `?dev` and the dev
 * city session are reachable in a production deployment, which would make this a feature
 * toggle shipped to learners rather than a convenience for whoever is typing.
 *
 * MODE excludes the test runner, which Vitest also reports as `DEV`. The suite has to
 * keep asserting what a LEARNER gets — several tests read the app-wide singleton — so the
 * dev branch is exercised by passing {@link AudioPrefsOptions.muteMusicForDev} explicitly
 * instead of by ambient environment.
 */
export function resolveDevMusicMute(env: BuildEnv): boolean {
  return MUSIC_MUTED_IN_DEV && env.DEV && env.MODE !== "test";
}

/** Mid-scale, so the learner's first act can be to turn it either way. */
export const DEFAULT_VOLUME = 0.7;

/**
 * Music sits at a third of the effect volume at any slider position. Background music
 * that matches its own effects drowns them, and the brief for this soundtrack is that
 * a learner can leave it running through a long study session without it competing
 * with concentration.
 */
export const MUSIC_VOLUME_SCALE = 0.33;

export interface AudioPrefs {
  /** True when the learner has silenced everything. */
  muted(): boolean;
  setMuted(muted: boolean): void;
  /** The master slider, 0..1. Always finite and in range. */
  volume(): number;
  setVolume(volume: number): void;
  /** Whether the learner has opted into the soundtrack. */
  musicEnabled(): boolean;
  setMusicEnabled(enabled: boolean): void;
  /**
   * The gain an EFFECT should play at: the slider, or 0 while muted. Callers
   * multiply, so "muted" needs no separate branch at any call site.
   */
  effectGain(): number;
  /** The gain the SOUNDTRACK should play at: {@link effectGain} scaled down. */
  musicGain(): number;
  /** Run `listener` after any preference changes. Returns the remover. */
  subscribe(listener: () => void): () => void;
}

export interface AudioPrefsOptions {
  /**
   * Start with the soundtrack off, ignoring any stored music preference. Only the
   * app-wide {@link audioPrefs} passes this, and only under the local dev server; see
   * {@link MUSIC_MUTED_IN_DEV}. Every other caller gets the shipped learner default.
   */
  readonly muteMusicForDev?: boolean;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * MEMORY IS THE SOURCE OF TRUTH, storage is only how it survives a reload.
 *
 * The obvious implementation reads the key on every call, and it has a bug worth
 * naming: where `localStorage` is missing or throws — private mode, a partitioned
 * third-party frame, a locked-down school profile — every read returns the default, so
 * pressing "mute" would appear to do nothing at all and the learner would have no way
 * to silence the app. Holding the value in the closure means the control always works
 * for the current session; a failed write costs the learner only the memory of it next
 * time.
 */
export function createAudioPrefs(
  storage: PrefStorage | null,
  options: AudioPrefsOptions = {},
): AudioPrefs {
  const listeners = new Set<() => void>();

  function read(key: string): string | null {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      // Blocked or partitioned storage: fall through to the default.
      return null;
    }
  }

  function write(key: string, value: string): void {
    try {
      storage?.setItem(key, value);
    } catch {
      // Best-effort; the in-memory value above has already taken effect.
    }
  }

  function readVolume(): number {
    const raw = read(VOLUME_KEY);
    if (raw === null) {
      return DEFAULT_VOLUME;
    }
    // `Number("")` is 0, which would read an empty string as silence rather than as a
    // missing preference; treat anything unparseable as absent instead.
    const parsed = raw.trim() === "" ? Number.NaN : Number(raw);
    return Number.isFinite(parsed) ? clampVolume(parsed) : DEFAULT_VOLUME;
  }

  let muted = read(MUTE_KEY) === "true";
  let volume = readVolume();
  const storedMusic = read(MUSIC_KEY);
  // The dev mute presets the switch OFF and outranks the stored value, so every reload
  // starts quiet. `setMusicEnabled` below is untouched by it: the control still works, and
  // still persists, so turning music on in dev is the same one click a learner makes.
  let musicEnabled = options.muteMusicForDev
    ? false
    : storedMusic === null
      ? MUSIC_ENABLED_BY_DEFAULT
      : storedMusic === "true";

  function announce(): void {
    for (const listener of [...listeners]) {
      listener();
    }
  }

  const prefs: AudioPrefs = {
    muted() {
      return muted;
    },
    setMuted(next) {
      muted = next;
      write(MUTE_KEY, next ? "true" : "false");
      announce();
    },
    volume() {
      return volume;
    },
    setVolume(next) {
      volume = clampVolume(next);
      write(VOLUME_KEY, String(volume));
      announce();
    },
    musicEnabled() {
      return musicEnabled;
    },
    setMusicEnabled(next) {
      musicEnabled = next;
      write(MUSIC_KEY, next ? "true" : "false");
      announce();
    },
    effectGain() {
      return muted ? 0 : volume;
    },
    musicGain() {
      return prefs.effectGain() * MUSIC_VOLUME_SCALE;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return prefs;
}

/** `localStorage` when the browser exposes a usable one, else null. */
function defaultPrefStorage(): PrefStorage | null {
  return runtimeStorage();
}

/**
 * The app-wide preferences. Every sound in the game reads these.
 *
 * This is the ONE place the dev music mute enters the app, so a production build differs
 * from today's shipped behaviour in nothing at all.
 */
export const audioPrefs: AudioPrefs = createAudioPrefs(defaultPrefStorage(), {
  muteMusicForDev: resolveDevMusicMute(import.meta.env),
});

/* ------------------------------------------------------------------ gesture gate */

/** The `document`-shaped surface a gate listens on. */
export interface GestureTarget {
  addEventListener(
    type: string,
    listener: () => void,
    options?: { once?: boolean; capture?: boolean; passive?: boolean },
  ): void;
}

export interface GestureGate {
  /** Start listening for the learner's first interaction. Idempotent. */
  arm(): void;
  /** Whether an interaction has happened yet. */
  opened(): boolean;
  /**
   * Run `listener` once the gate is open — immediately if it already is. Returns a
   * remover, so a React effect can drop a pending callback on unmount.
   */
  whenOpen(listener: () => void): () => void;
}

/**
 * The autoplay gate. Browsers already refuse to start audio before a user gesture;
 * this makes the promise explicit rather than relying on the platform, so no build can
 * ever push a sound into a freshly opened tab — and, just as importantly, so nothing
 * ever *attempts* it. An attempt is what produces the `NotAllowedError` console noise
 * that the autoplay policy is famous for; a gate that is asked first produces none.
 *
 * The listeners are capture-phase and `once`, so the flag is set before the handler
 * that reacts to the same click runs — a sound triggered BY the first click still gets
 * to play on that click rather than being swallowed.
 */
export function createGestureGate(target: GestureTarget | null): GestureGate {
  let open = false;
  let armed = false;
  const waiting = new Set<() => void>();

  return {
    arm() {
      if (armed || open || target === null) {
        return;
      }
      armed = true;
      const onGesture = () => {
        if (open) {
          return;
        }
        open = true;
        // Copy before draining: a listener may unsubscribe others.
        for (const listener of [...waiting]) {
          waiting.delete(listener);
          listener();
        }
      };
      for (const type of ["pointerdown", "keydown", "touchstart", "click"]) {
        target.addEventListener(type, onGesture, {
          once: true,
          capture: true,
          passive: true,
        });
      }
    },
    opened() {
      return open;
    },
    whenOpen(listener) {
      if (open) {
        listener();
        return () => {};
      }
      waiting.add(listener);
      return () => {
        waiting.delete(listener);
      };
    },
  };
}

/** The app-wide gate. Armed once, at mount, by the root component. */
export const gestureGate: GestureGate = createGestureGate(
  typeof document === "undefined" ? null : document,
);

/* ---------------------------------------------------------------- audio context */

type AudioCtor = typeof AudioContext;

/**
 * The live context, tagged with the constructor it came from. Re-reading the tag
 * (rather than caching the context alone) means a page — or a test — that swaps
 * `window.AudioContext` gets a context from the CURRENT constructor instead of a stale
 * one. Inherited from `lessonSound.ts`, which is where the two synthesized chimes
 * disagreed: this is the careful version, and it is now the only version.
 */
let live: { ctor: AudioCtor; ctx: AudioContext } | null = null;

/** The shared context for synthesized tones, or null where Web Audio is absent. */
export function sharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const scope = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  if (live?.ctor !== Ctor) {
    try {
      live = { ctor: Ctor, ctx: new Ctor() };
    } catch {
      return null;
    }
  }
  return live.ctx;
}
