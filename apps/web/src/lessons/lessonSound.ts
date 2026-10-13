/**
 * The lesson layer's audible check mark, and the preference that silences it.
 *
 * This lives apart from `widgetFeedback.tsx` because that file is a React Fast Refresh
 * boundary and this file is not. Fast Refresh accepts a module only when every one of its
 * runtime exports is either a component or unchanged by the edit, and a plain function
 * gets a fresh identity on every re-evaluation. With `isLessonSoundMuted` and friends
 * sitting beside the components, Vite logged
 *
 *   hmr invalidate /src/lessons/widgetFeedback.tsx
 *   Could not Fast Refresh ("isLessonSoundMuted" export is incompatible)
 *
 * and fell back to a full reload that invalidated 23 modules on every widget edit. The
 * components stay in `widgetFeedback.tsx`; the predicates live here.
 *
 * WHAT CHANGED WHEN THE GAME GOT AUDIO. The mute preference, the subscriber set, and the
 * autoplay gesture gate that this file introduced are no longer lesson-private — the
 * soundtrack and the city's six effects need exactly the same three things, and a second
 * copy of them would mean "mute" had two meanings. They now live in `audio/audioPrefs.ts`
 * and this module DELEGATES to them.
 *
 * Every export below keeps its original name and signature on purpose, so
 * `widgetFeedback.tsx` and the two browser suites that drive it needed no edit: the
 * lesson layer still asks the questions it always asked, and something larger now answers.
 * The storage key is unchanged too (`cr.lessonSound.muted`, defined there), so a learner
 * who had already muted lesson sounds stays muted — and now gets a quiet city as well.
 */

import { audioPrefs, gestureGate, sharedAudioContext } from "../audio/audioPrefs";
import { playSfx } from "../audio/soundEffects";

export function isLessonSoundMuted(): boolean {
  return audioPrefs.muted();
}

export function setLessonSoundMuted(muted: boolean): void {
  audioPrefs.setMuted(muted);
}

/** Register a listener that runs whenever the preference changes. Returns the remover. */
export function subscribeToLessonSound(listener: () => void): () => void {
  return audioPrefs.subscribe(listener);
}

export function armGestureListener(): void {
  gestureGate.arm();
}

/**
 * A short, bright two-note tick: the audible check mark. Synthesized rather than shipped
 * as an asset, so it costs no bytes and no fetch — the one sound in the game that stays
 * synthesized for that reason, now that the rest are samples. Entirely best-effort:
 * silent wherever Web Audio is missing (jsdom, older Safari), silent until the learner
 * has interacted, and silent while muted or at zero volume.
 */
export function playCorrectChime(): void {
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
    // A5 -> E6, the rising pair a check mark sounds like. Short, so it lands and leaves.
    [880, 1318.51].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const at = start + index * 0.06;
      // 0.09 was the original fixed peak; it is now the ceiling the master volume
      // scales, so the slider moves this chime along with everything else.
      const peak = 0.09 * gain;
      gainNode.gain.setValueAtTime(0, at);
      gainNode.gain.linearRampToValueAtTime(peak, at + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gainNode).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.26);
    });
  } catch {
    // Never let a missing or throttled audio device break the interaction.
  }
}

/**
 * The other half of the check mark: one soft plucked note, for a step that did not go
 * the learner's way.
 *
 * It is a SAMPLE rather than a synthesized tone, which is the one place this module's
 * two sounds differ in kind. The check mark is two sine partials and could be nothing
 * else; "warm, not a buzzer" is a timbre, and the shortest way to a warm timbre is a
 * recording of something warm. `playSfx` asks the same two questions this file's chime
 * asks — am I allowed, and how loud — so the mute, the slider and the gesture gate reach
 * it by exactly the route they reach everything else.
 *
 * It lives here rather than beside its caller for the reason the whole file exists: a
 * plain function exported from `widgetFeedback.tsx` costs that module Fast Refresh.
 */
export function playRevealNote(): void {
  playSfx("answer-missed");
}
