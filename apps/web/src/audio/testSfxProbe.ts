/**
 * **A PROBE OVER THE REAL PLAYER**, so a test can say which effect a click made without
 * standing in for any of the machinery that decides whether it makes one.
 *
 * `soundEffects.test.ts` builds its own player over injected seams, which is right for
 * testing the player. It is exactly wrong for testing a CALL SITE: a test that swaps
 * `playSfx` for a spy proves the line was reached and proves nothing about the mute, the
 * autoplay gate or the retrigger floor, and "the game still clicks while muted" is a
 * defect that lives entirely in those. So this replaces the one thing underneath all of
 * them — the `Audio` constructor — and leaves the app-wide `sfxPlayer`, the app-wide
 * `audioPrefs` and the app-wide `gestureGate` in the path exactly as a learner has them.
 *
 * The counterpart for the two SYNTHESIZED chimes is `lessons/testHarness.ts`, which does
 * the same thing one layer over: it swaps `AudioContext` for one that counts oscillators.
 * Between them every sound the game can make is observable without any of them being
 * faked.
 *
 * ## Why it moves the clock
 *
 * Every sample carries a `minIntervalMs` floor, and the long ones are seconds — the crowd
 * bed is five, because a crowd overlapping itself is the noise it exists not to be. Vitest
 * isolates modules per FILE, not per test, so the player's `lastPlayedAt` map survives from
 * one `it` to the next and a second test playing the same sample would measure a silence
 * the floor caused rather than the call site. {@link SfxProbe.reset} therefore pushes
 * `Date.now` forward past every floor in the catalogue.
 *
 * It offsets the real clock rather than freezing it, and it is a plain function rather than
 * a fake-timer install, so `userEvent`'s delays and testing-library's `waitFor` keep the
 * ticking clock they need. Nothing in the app reads `Date.now` except this player and the
 * music fader; the hard winter is swept for clock reads by `test/hardWinterClockless.test.ts`
 * and has none.
 */

import { audioPrefs, gestureGate } from "./audioPrefs";
import type { SfxElement } from "./soundEffects";

/** Every play, in order, as the sample's filename. Shared so a re-install keeps history. */
const played: string[] = [];

/** Well past the longest `minIntervalMs` in the catalogue, with room to spare. */
const CLOCK_STEP_MS = 60_000;

let offsetMs = 0;
let realNow: (() => number) | null = null;

class RecordingAudio implements SfxElement {
  volume = 1;
  currentTime = 0;
  preload = "";

  constructor(private readonly src: string) {}

  play(): void {
    played.push(this.src.slice(this.src.lastIndexOf("/") + 1));
  }
}

export interface SfxProbe {
  /** The filenames played since the last {@link SfxProbe.reset}, in order. */
  played(): readonly string[];
  /** How many times this exact file has played since the last reset. */
  countOf(file: string): number;
  /** Clear the record, restore the default preferences, and clear every retrigger floor. */
  reset(): void;
  restore(): void;
}

/**
 * Install the probe and OPEN THE AUTOPLAY GATE, because a mounted component is not a
 * gesture: without this every assertion would read zero for the right reason and the wrong
 * one at once. Tests that want the closed gate should assert it through the player
 * directly, which `soundEffects.test.ts` already does.
 */
export function installSfxProbe(): SfxProbe {
  const scope = globalThis as unknown as { Audio?: unknown };
  const priorAudio = scope.Audio;
  scope.Audio = RecordingAudio;

  if (realNow === null) {
    const original = Date.now.bind(Date);
    realNow = original;
    Date.now = () => original() + offsetMs;
  }

  gestureGate.arm();
  if (typeof document !== "undefined") {
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
  }

  const probe: SfxProbe = {
    played: () => [...played],
    countOf: (file) => played.filter((entry) => entry === file).length,
    reset() {
      played.length = 0;
      audioPrefs.setMuted(false);
      audioPrefs.setVolume(0.7);
      offsetMs += CLOCK_STEP_MS;
    },
    restore() {
      scope.Audio = priorAudio;
      if (realNow !== null) {
        Date.now = realNow;
        realNow = null;
      }
    },
  };
  probe.reset();
  return probe;
}
