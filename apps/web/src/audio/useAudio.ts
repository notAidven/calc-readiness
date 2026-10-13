/**
 * React bindings for the audio layer.
 *
 * Hooks live here rather than beside `AudioSettings.tsx` for the same Fast Refresh
 * reason `lessons/lessonSound.ts` documents: a module that exports both a component and
 * a plain function is not a valid Refresh boundary, so Vite would fall back to a full
 * reload on every edit to the panel.
 */

import { useEffect, useSyncExternalStore } from "react";

import {
  activeIslandUnlockEraId,
  subscribeActiveIslandUnlock,
} from "../city/activeIslandUnlock";
import { activeCrisisEraId, subscribeActiveCrisis } from "../city/activeCrisis";
import { cityEraId, subscribeCityEra } from "../city/useCityEra";
import { audioPrefs, gestureGate } from "./audioPrefs";
import { type MusicScene, trackIdForScene } from "./eraMusic";
import { type MusicPlayer, musicPlayer } from "./music";
import { sfxPlayer } from "./soundEffects";

/**
 * WHAT THE CITY IS SHOWING RIGHT NOW, read from the three stores that answer it: the era
 * (`city/useCityEra`), whether a crisis is running (`city/activeCrisis`) and whether an
 * an island unlock is running (`city/activeIslandUnlock`).
 *
 * Exported so a test can compose the REAL scene read with a player it can count, rather
 * than re-deriving the scene and then asserting against its own derivation.
 */
export function currentMusicScene(): MusicScene {
  const ceremonyEraId = activeIslandUnlockEraId();
  return {
    eraId: cityEraId(),
    crisisEraId: activeCrisisEraId(),
    ceremony: ceremonyEraId === null ? null : { eraId: ceremonyEraId },
  };
}

/**
 * **THE RECONCILER. One function, called by every input, and the only path to `play()`.**
 *
 * `setTrack` selects and cannot start anything; `sync` reads the preferences, the gesture
 * gate and the tab visibility and decides whether a sound is allowed. Keeping them in that
 * order and in one place is what makes "a scene change never un-silences a learner" a
 * property of the structure rather than of four call sites remembering.
 *
 * Takes the player so the wiring can be driven in a test without a media stack; the app
 * always uses the singleton.
 */
export function reconcileMusic(player: MusicPlayer = musicPlayer): void {
  player.setTrack(trackIdForScene(currentMusicScene()));
  player.sync();
}

/**
 * Subscribe to the audio preferences.
 *
 * Each value is read through its own {@link useSyncExternalStore} because the snapshot
 * has to be referentially stable between changes — returning one object literal for all
 * three would allocate a new identity on every render and spin. Primitives cost nothing
 * and compare correctly.
 */
export function useAudioMuted(): boolean {
  return useSyncExternalStore(
    audioPrefs.subscribe,
    () => audioPrefs.muted(),
    () => audioPrefs.muted(),
  );
}

export function useAudioVolume(): number {
  return useSyncExternalStore(
    audioPrefs.subscribe,
    () => audioPrefs.volume(),
    () => audioPrefs.volume(),
  );
}

export function useMusicEnabled(): boolean {
  return useSyncExternalStore(
    audioPrefs.subscribe,
    () => audioPrefs.musicEnabled(),
    () => audioPrefs.musicEnabled(),
  );
}

/**
 * Drive the app's audio for as long as the root component is mounted: arm the autoplay
 * gate, keep the soundtrack in step with the preferences, with the era the city is
 * standing in and with whether a crisis is running, and stop making noise into a tab
 * nobody is looking at.
 *
 * Call once, from the root.
 */
export function useGameAudio(): void {
  useEffect(() => {
    // Arm first: everything else is gated on this, and it is idempotent.
    gestureGate.arm();

    // THE SCENE SELECTS THE TRACK: the era, the crisis that outranks it while it runs,
    // and the era-advance ceremony that outranks both. The player then decides whether
    // anything may be heard. See `reconcileMusic`.
    const sync = () => reconcileMusic();

    // Six independent inputs, one reconciler. `sync()` reads the world rather than
    // being told what changed, so none of these has to know about the others.
    //
    // The era-advance ceremony is the third store and it is also, indirectly, the ceremony's
    // HANDOVER: the bed plays while the city stands in the age the ceremony belongs to, so
    // the era subscription above is what ends it. Nothing here has to know that, which is
    // the property that made keying off the era the right choice — see `eraMusic.ts`.
    const unsubscribePrefs = audioPrefs.subscribe(sync);
    const unsubscribeEra = subscribeCityEra(sync);
    const unsubscribeCrisis = subscribeActiveCrisis(sync);
    const unsubscribeCeremony = subscribeActiveIslandUnlock(sync);
    const cancelGesture = gestureGate.whenOpen(() => {
      // The learner has interacted, so the browser will now allow audio. Warm the
      // effect samples (a no-op while muted) and start the track if it is enabled.
      sfxPlayer.warm();
      sync();
    });

    const onVisibility = () => {
      // COURTESY: pause when the tab goes away rather than serenading a background
      // window, and resume on return only if the preferences still say so — which
      // `sync()` decides, so a learner who muted while away comes back to silence.
      sync();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    // Reconcile once on mount, for a reload that arrives with music already enabled
    // and a gesture already spent (the gate re-opens on the learner's next click).
    sync();

    return () => {
      unsubscribePrefs();
      unsubscribeEra();
      unsubscribeCrisis();
      unsubscribeCeremony();
      cancelGesture();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      // Deliberately NOT stopping the track here. The root component's lifetime is the
      // page's lifetime, so there is nothing to clean up in practice, while StrictMode's
      // double-invoked effects would make a stop/start flap audible in development.
    };
  }, []);
}
