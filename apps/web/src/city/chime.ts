/**
 * A soft, synthesized "skill complete" chime (no audio asset, no dependency).
 *
 * MODERATE juice: a gentle two-note major chime, played only on a genuine
 * skill-complete event. It is entirely best-effort and defensive — a no-op in jsdom
 * or any environment without Web Audio — and the caller additionally gates it behind
 * reduced-motion, so a calm learner never gets an unexpected sound.
 *
 * FIXED WHEN THE GAME GOT AUDIO: this chime used to honour NO preference. It kept its
 * own `AudioContext` (a plain module cache, unlike the constructor-tagged one in the
 * lesson layer) and read neither the mute flag nor the gesture gate, so a learner who
 * had deliberately muted lesson sounds still heard a chime every time a building
 * completed, and the context could be created before any interaction. It now shares the
 * one context and asks `audio/audioPrefs.ts` the same two questions every other sound in
 * the game asks: am I allowed, and how loud. The signature is unchanged, so its only
 * caller (`CitySurface`'s newly-complete effect) needed no edit.
 */

import { audioPrefs, gestureGate, sharedAudioContext } from "../audio/audioPrefs";

/** Play a short, soft, two-note chime. Silent + safe where Web Audio is absent. */
export function playSkillChime(): void {
  const gain = audioPrefs.effectGain();
  if (!gestureGate.opened() || gain <= 0) {
    return;
  }
  const ctx = sharedAudioContext();
  if (!ctx) {
    return;
  }
  try {
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const start = ctx.currentTime;
    const notes = [659.25, 987.77]; // E5 → B5, a calm rising fifth
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = start + index * 0.08;
      // 0.11 was the original fixed peak; it is now the ceiling the master volume
      // scales.
      const peak = 0.11 * gain;
      gainNode.gain.setValueAtTime(0, at);
      gainNode.gain.linearRampToValueAtTime(peak, at + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      osc.connect(gainNode).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.55);
    });
  } catch {
    // Best-effort: never let ambience break the app.
  }
}
