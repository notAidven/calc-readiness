/**
 * The background soundtrack: one looping track at a time, on by default, quiet, and
 * pausable.
 *
 * WHICH TRACK PLAYS IS SOMEBODY ELSE'S CALL, AND THIS FILE DOES NOT KNOW WHAT AN ERA OR A
 * CRISIS IS. `eraMusic.ts` resolves a scene to a track id and reaches the player through
 * {@link MusicPlayer.setTrack}, which `useAudio.ts` calls every time it reconciles.
 * `musicRegistry.ts` maps that id to a file. This module's whole contribution is what to
 * do with the id: the same id is a no-op, a different id CROSSFADES, and the track being
 * left is PARKED rather than discarded so that coming back to it resumes where it was.
 *
 * WHY A PLAIN `<audio>` ELEMENT AND NOT WEB AUDIO. The synthesized chimes need Web
 * Audio because they have no asset to play. Music has the opposite shape: one long
 * file that wants streaming, native looping, and codec handling the platform already
 * does better than we would. An `HTMLAudioElement` streams from the first bytes rather
 * than waiting to decode a megabyte, and `loop = true` is a seamless native loop for a
 * codec that can loop seamlessly at all — which is why the pipeline doc rules MP3 out
 * for new tracks. It also keeps the autoplay story simple: one `play()` that may reject,
 * one place to swallow it.
 *
 * The element is NEVER put in the DOM. It is constructed with `new Audio()` and lives
 * only in this closure, which means there is no media node for a screen reader to land
 * on, nothing in the tab order, and no browser-native controls competing with the
 * game's own mute button.
 *
 * ## THE CROSSFADE, WHICH REPLACES A HARD CUT THIS MODULE USED TO ARGUE FOR
 *
 * A scene change ramps the outgoing track down and the incoming one up over
 * {@link CROSSFADE_MS}, on an equal-power curve so two uncorrelated ambient beds do not
 * dip in the middle the way a linear pair would. The two costs the hard cut was chosen to
 * avoid are both real and both are answered here rather than denied:
 *
 *  - **`sync()` re-applies `volume` from the live slider on every call, so a ramp and a
 *    reconcile would fight over one property.** They do not fight because there is only
 *    one writer: `sync()` multiplies the slider by the fade factor it derives from the
 *    clock. The fade is a function of time, not a queue of steps, so an extra reconcile
 *    in the middle of one is idempotent and a missed one is self-correcting.
 *  - **The second `play()` can be refused on its own**, because the autoplay policy
 *    answers per element. That failure mode is unchanged from a cut: the outgoing track
 *    completes its fade and is parked, the incoming stays silent, and the learner's next
 *    click retries it.
 *
 * **A MUTE OUTRANKS A FADE IN FLIGHT** — the rule the old header asked for before this
 * was written. Silencing the player ends the crossfade at once and parks the outgoing
 * track where it had got to, rather than continuing a ramp nobody can hear. That keeps
 * `sync()`'s memorylessness intact: silence is still decided by reading the preferences,
 * never by remembering what we meant to do, which is what makes "a muted learner stays
 * muted" cheap to hold. Read the mute guards in `music.test.ts` before touching it.
 *
 * A crisis EXIT still resumes the era's track in place (see {@link MusicPlayer.setTrack}),
 * so the fade back has no opening bar and no "here comes the theme again" downbeat.
 *
 * ## A SLOT WHOSE FILE IS NOT THERE GOES SILENT, AND SAYS SO ONCE AT DEBUG LEVEL
 *
 * The fourteen era and crisis tracks land one at a time, so a registry row pointing at a
 * file that has not been dropped in yet is the expected state, not an incident. The
 * element's `error` event marks that track unplayable, the player stops rebuilding it,
 * and one {@link MusicPlayerOptions.debug} line is emitted per track id. No throw, no
 * unhandled rejection, no console error, and no retry storm: the failure mode is silence.
 */

import { type AudioPrefs, audioPrefs, type GestureGate, gestureGate } from "./audioPrefs";
import {
  DEFAULT_TRACK_ID,
  MUSIC_TRACKS,
  type MusicTrack,
  trackById,
} from "./musicRegistry";
import { audioAssetUrl } from "./soundEffects";

export { DEFAULT_TRACK_ID, MUSIC_TRACKS, type MusicTrack, trackById };

/**
 * How long a scene change takes to hand the soundtrack over, in milliseconds.
 *
 * 1.5s, in the middle of the one-to-two-second band that reads as a deliberate handover
 * rather than either a glitch or a scene transition of its own. It is bounded below by
 * the shortest fade a listener does not hear as a cut (about 300ms) and above by the
 * point at which two beds are audibly playing together, which on tracks this sustained
 * arrives somewhere past two seconds.
 */
export const CROSSFADE_MS = 1_500;

/**
 * How often the fade re-reads the clock. 50ms is 30 steps across the fade: fine enough
 * that no step is an audible jump on a bed with a 1.7 LU loudness range, and coarse
 * enough to cost nothing. It is a step interval and not a step COUNT, so a throttled
 * background timer stretches the wall time without distorting the curve.
 */
export const CROSSFADE_STEP_MS = 50;

/** A `new Audio()`-shaped element, narrowed to what this module touches. */
export interface MusicElement {
  volume: number;
  loop: boolean;
  currentTime: number;
  preload: string;
  play(): Promise<void> | void;
  pause(): void;
  /**
   * `HTMLMediaElement`'s error event, which is how a missing file announces itself.
   * OPTIONAL so a test double may narrow it away: a double that omits it is simply a
   * track that never reports a missing asset.
   */
  addEventListener?(type: "error", listener: () => void): void;
}

export interface MusicPlayerOptions {
  prefs?: AudioPrefs;
  gate?: GestureGate;
  /** Defaults to `new Audio(src)`. Injected so tests need no media stack. */
  createAudio?: (src: string) => MusicElement | null;
  /** Defaults to `document.visibilityState === "hidden"`. */
  isHidden?: () => boolean;
  /** Defaults to {@link DEFAULT_TRACK_ID}. */
  trackId?: string;
  /** The crossfade's clock, in milliseconds. Defaults to `Date.now`. */
  now?: () => number;
  /**
   * Schedule the crossfade's next step and return a canceller. Defaults to `setTimeout`.
   * Injected so a test can drive a fade by advancing {@link MusicPlayerOptions.now} and
   * calling `sync()`, with no timers and nothing left pending after the case.
   */
  scheduleFadeStep?: (step: () => void, delayMs: number) => () => void;
  /**
   * Where a slot with no playable asset reports itself. **Debug level and once per track
   * id**, because thirteen of the fourteen slots having no file yet is the expected
   * state. Defaults to `console.debug`.
   */
  debug?: (message: string) => void;
}

export interface MusicPlayer {
  /**
   * Reconcile what is playing with what the preferences, the gesture gate, and the tab
   * visibility currently allow, and advance any crossfade to where the clock says it
   * should be. Idempotent and cheap, so every input can simply call it rather than
   * reasoning about transitions.
   */
  sync(): void;
  /**
   * Select the track. **The scene's lever**, called by `useAudio.ts` with
   * `trackIdForScene(...)` before every reconcile.
   *
   * THREE PROPERTIES, AND ALL THREE ARE LOAD-BEARING.
   *
   * **An unchanged id does nothing whatsoever.** Not a pause, not a rebuild, not a
   * `currentTime` reset, and not a fade. The caller reconciles on every input, so most
   * calls arrive with the id that is already set, and the music a learner has had running
   * keeps running across them. This is what makes it safe for the caller to be
   * unconditional.
   *
   * **The outgoing track FADES OUT and is then PARKED, and coming back resumes it in
   * place.** At most one parked element is held and at most one is fading, so the memory
   * cost is bounded at two: the one playing and the one to come back to. `pause()`
   * preserves `currentTime`, so a `setTrack` back to a parked id hands the same element
   * to the next `sync()` and it continues from where it stopped. **This is the whole
   * answer to what a crisis exit sounds like**: the winter ends and the city's own music
   * fades back up from where the winter interrupted it, rather than restarting a
   * hundred-second loop from its opening bar every time. Going to a THIRD track evicts
   * the parked one, which is what an era advance during a crisis correctly does, because
   * that chapter's music should not be resumed. A second change arriving while a fade is
   * still running cuts that fade short rather than holding three elements.
   *
   * **It cannot start audio.** There is no path from here to `play()`. Building,
   * resuming and fading all belong to {@link sync}, which is the one function that reads
   * the preferences. So a track change arriving while the learner has music muted,
   * switched off, or the volume at zero produces exactly what it produced before the
   * change: silence, no fade, and no fetch of the new file either. `music.test.ts` proves
   * that over all three ways of silencing it, each with its un-silenced control in the
   * same run.
   *
   * An unknown id resolves through `trackById`'s fallback rather than throwing.
   */
  setTrack(trackId: string): void;
  /** The track this player is configured to play. */
  track(): MusicTrack;
  /** True while the element exists and has been started. */
  playing(): boolean;
  /**
   * How far the crossfade has run, 0 at the handover and 1 when there is none in
   * flight. Exposed so a test can assert the ramp rather than infer it from a volume.
   */
  fadeProgress(): number;
  /** Drop the element. Used on teardown. */
  stop(): void;
}

function defaultCreateAudio(src: string): MusicElement | null {
  if (typeof Audio !== "function") {
    return null;
  }
  try {
    return new Audio(src);
  } catch {
    return null;
  }
}

function defaultScheduleFadeStep(step: () => void, delayMs: number): () => void {
  if (typeof setTimeout !== "function") {
    return () => {};
  }
  const handle = setTimeout(step, delayMs);
  return () => {
    clearTimeout(handle);
  };
}

/** Equal power, so two uncorrelated beds hold a constant sum through the handover. */
function fadeInGain(progress: number): number {
  return Math.sin((progress * Math.PI) / 2);
}

function fadeOutGain(progress: number): number {
  return Math.cos((progress * Math.PI) / 2);
}

export function createMusicPlayer(options: MusicPlayerOptions = {}): MusicPlayer {
  const prefs = options.prefs ?? audioPrefs;
  const gate = options.gate ?? gestureGate;
  const createAudio = options.createAudio ?? defaultCreateAudio;
  const isHidden =
    options.isHidden ??
    (() => typeof document !== "undefined" && document.visibilityState === "hidden");
  const now = options.now ?? (() => Date.now());
  const scheduleStep = options.scheduleFadeStep ?? defaultScheduleFadeStep;
  const debug =
    options.debug ??
    ((message: string) => {
      if (typeof console !== "undefined") {
        console.debug(message);
      }
    });
  let track = trackById(options.trackId ?? DEFAULT_TRACK_ID);

  let element: MusicElement | null = null;
  let started = false;
  /** Set once the element could not be created, so we stop retrying every sync. */
  let unavailable = false;
  /**
   * The track we most recently left, kept paused so returning to it resumes in place.
   * **At most one**, so the element budget is two: a crisis parks the era's track, and an
   * era advance during a crisis evicts it. Never populated by anything that has not
   * already been built and played, so it cannot cost a learner a byte they were not
   * already spending.
   */
  let parked: { trackId: string; element: MusicElement } | null = null;
  /**
   * The handover in flight: when it started, and the element ducking out of it. `out` is
   * null only for a fade into silence, which nothing currently produces.
   */
  let crossfade: {
    startedAt: number;
    out: { trackId: string; element: MusicElement };
  } | null = null;
  let cancelStep: (() => void) | null = null;
  /**
   * Track ids whose file could not be played. **Derived from the element's own error
   * event, never declared**, so a file that is dropped in later needs no flag cleared —
   * it simply never enters this set on the next load.
   */
  const missingAssets = new Set<string>();

  /** Pause, best-effort. A pause that throws on a dead element has already given us the
   *  silence it was asked for, exactly as in `stop()`. */
  function quiet(target: MusicElement): void {
    try {
      target.pause();
    } catch {
      // Nothing to recover.
    }
  }

  function applyVolume(target: MusicElement, level: number): void {
    try {
      target.volume = Math.min(1, Math.max(0, level));
    } catch {
      // A read-only volume (some embedded webviews) is not worth abandoning
      // playback over.
    }
  }

  /** 0 at the handover, 1 once the fade is over or when there is none. */
  function progress(): number {
    if (crossfade === null) {
      return 1;
    }
    const elapsed = now() - crossfade.startedAt;
    if (!Number.isFinite(elapsed) || elapsed >= CROSSFADE_MS) {
      return 1;
    }
    return elapsed <= 0 ? 0 : elapsed / CROSSFADE_MS;
  }

  /**
   * End the handover wherever it has got to: the outgoing element is paused and becomes
   * the parked one, which is exactly where a hard cut used to leave it. Called both when
   * the fade completes and when the learner silences the player mid-fade.
   */
  function endCrossfade(): void {
    cancelStep?.();
    cancelStep = null;
    if (crossfade === null) {
      return;
    }
    const out = crossfade.out;
    crossfade = null;
    quiet(out.element);
    parked = out;
  }

  function scheduleNextStep(): void {
    cancelStep?.();
    cancelStep = null;
    if (crossfade === null) {
      return;
    }
    cancelStep = scheduleStep(() => {
      cancelStep = null;
      player.sync();
    }, CROSSFADE_STEP_MS);
  }

  /**
   * Listen for the one event that distinguishes "the file is not there" from "the
   * browser refused to autoplay". The second must keep retrying on the learner's next
   * click, which is why a rejected `play()` cannot be the signal.
   */
  function watchForMissingAsset(target: MusicElement, forTrack: MusicTrack): void {
    if (typeof target.addEventListener !== "function") {
      return;
    }
    try {
      target.addEventListener("error", () => {
        if (missingAssets.has(forTrack.id)) {
          return;
        }
        missingAssets.add(forTrack.id);
        debug(
          `music: no playable asset at "${forTrack.file}" for slot "${forTrack.id}"; ` +
            "that slot falls back to silence",
        );
        if (track.id !== forTrack.id) {
          return;
        }
        if (element !== null && started) {
          quiet(element);
        }
        element = null;
        started = false;
      });
    } catch {
      // An element that will not take a listener simply never reports a missing asset,
      // which is the same place a narrowed test double lands.
    }
  }

  const player: MusicPlayer = {
    sync() {
      const gain = prefs.musicGain();
      // Four independent reasons not to be playing. Muting and dragging the slider to
      // zero both land on `gain <= 0`, so silence has one meaning here.
      const wanted = prefs.musicEnabled() && gain > 0 && gate.opened() && !isHidden();

      if (!wanted) {
        // A MUTE OUTRANKS A FADE IN FLIGHT: the learner asked for silence, not for a
        // graceful one.
        endCrossfade();
        if (element !== null && started) {
          try {
            element.pause();
          } catch {
            // Nothing to recover: we wanted silence and silence is what a failed
            // pause on a dead element already gives us.
          }
          started = false;
        }
        return;
      }

      // THE OUTGOING HALF, first and unconditionally, so a track that turns out to have
      // no asset cannot leave the previous one ducking at half volume forever.
      const fade = progress();
      if (crossfade !== null) {
        if (fade >= 1) {
          endCrossfade();
        } else {
          applyVolume(crossfade.out.element, gain * fadeOutGain(fade));
        }
      }

      if (element === null) {
        if (unavailable || missingAssets.has(track.id)) {
          // Silence, and no rebuild. The fade still has to be stepped to its end, or the
          // track being left would go on playing under a slot that has nothing to play.
          scheduleNextStep();
          return;
        }
        // Built on FIRST WANT, not at module load. This matters MORE now that music is
        // on by default: `wanted` above is false until the learner has interacted, so a
        // tab opened and left alone never constructs the element and never requests the
        // track. Page load therefore costs zero audio bytes regardless of the
        // preference, and a learner who switches music off never pays for it at all.
        element = createAudio(audioAssetUrl(track.file));
        if (element === null) {
          unavailable = true;
          scheduleNextStep();
          return;
        }
        element.loop = true;
        element.preload = "auto";
        watchForMissingAsset(element, track);
      }

      // Volume is re-applied on every sync, which is what makes the slider live while
      // the track is already running. Multiplying by the fade factor rather than
      // remembering a ramp is what keeps the two from fighting over one property.
      applyVolume(element, gain * fadeInGain(fade));

      if (!started) {
        try {
          const play = element.play();
          started = true;
          if (play && typeof play.then === "function") {
            void play.catch(() => {
              // The autoplay policy can still refuse even after a gesture (a gesture
              // the browser considers spent, an iframe without the right permission).
              // Reset so the next sync — the learner's next click — tries again, and
              // keep it out of the console either way.
              started = false;
            });
          }
        } catch {
          started = false;
        }
      }

      scheduleNextStep();
    },
    setTrack(trackId) {
      const next = trackById(trackId);
      if (next.id === track.id) {
        // The common case by far, because the caller reconciles on every input rather
        // than on a change. Returning before touching anything is what keeps the music
        // continuous through everything that is not a scene change.
        return;
      }

      // Anything already fading out has finished fading. There is room for one outgoing
      // element, and two scene changes inside a second and a half is rare enough that
      // cutting the first handover short beats holding three tracks in memory.
      endCrossfade();

      const outgoing = element === null ? null : { trackId: track.id, element };
      // Coming back to the track we parked? Hand `sync()` the same element, still holding
      // its position, and it fades back up rather than restarting.
      const resumed = parked !== null && parked.trackId === next.id ? parked.element : null;

      if (outgoing !== null && started) {
        // THE CROSSFADE. Nothing starts here and nothing stops: `sync()` owns both
        // volumes, and the fade ends by parking the outgoing exactly where a cut did.
        crossfade = { startedAt: now(), out: outgoing };
        parked = null;
      } else {
        // Nothing was audible, so there is nothing to fade. The outgoing element is
        // parked as a cut would park it, and the parked one it displaces is evicted.
        crossfade = null;
        parked = outgoing;
      }
      element = resumed;
      started = false;
      track = next;
    },
    track() {
      return track;
    },
    playing() {
      return started;
    },
    fadeProgress() {
      return progress();
    },
    stop() {
      // Silence everything and let go of it, without deciding whether anything should be
      // playing, because that decision is `sync()`'s alone. Dropping the reference is not
      // enough on its own: an `HTMLAudioElement` that is playing goes on playing after
      // the last reference to it is gone, so the pause has to be explicit.
      endCrossfade();
      if (element !== null && started) {
        quiet(element);
      }
      element = null;
      started = false;
      parked = null;
    },
  };

  return player;
}

/** The app-wide soundtrack. */
export const musicPlayer: MusicPlayer = createMusicPlayer();
