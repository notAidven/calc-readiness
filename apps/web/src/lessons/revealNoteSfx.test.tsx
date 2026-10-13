import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { audioPrefs } from "../audio/audioPrefs";
import { installSfxProbe } from "../audio/testSfxProbe";
import {
  findButton,
  type Harness,
  inputs,
  installCountingAudio,
  mount,
  setInputValue,
  waitFor,
} from "./testHarness";
import { LessonVisual } from "./visuals";

/**
 * **THE LESSON LAYER'S OTHER VERDICT NOW HAS A SOUND, AND IT IS NOT A BUZZER.**
 *
 * The shared feedback layer hears exactly two things about an answer — `correct`, which
 * has chimed since the layer existed, and `reveal`, which was silent. A learner working
 * through a board therefore got an audible acknowledgement when they were right and
 * nothing at all when they were not, which reads as the game noticing only the wins.
 *
 * What is added is a soft plucked note: warm, decaying over about 1.8 s, and deliberately
 * chosen against a buzzer. A reveal is the learner ASKING to be taught, and a sound that
 * scolded them for asking would teach them not to ask.
 *
 * ## Two channels, and the assertions have to separate them
 *
 * The correct-answer chime is SYNTHESIZED and is counted in oscillators; the reveal note is
 * a SAMPLE and is counted in plays. Every test below reads both, because "the reveal now
 * makes a sound" and "the reveal did not become a success" are two different claims and it
 * is the second one a wrong wiring would break.
 */

let harness: Harness | null = null;
const probe = installSfxProbe();

afterAll(() => probe.restore());

beforeEach(() => {
  probe.reset();
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
  audioPrefs.setMuted(false);
});

/** Answer round 1 of the exponent-laws builder. The combined exponent is 7. */
function answerFirstRound(host: HTMLElement, value: string): void {
  const [box] = inputs(host);
  setInputValue(box as HTMLInputElement, value);
  findButton(host, "Check").click();
}

async function openOnAWrongAttempt(): Promise<HTMLElement> {
  harness = mount(<LessonVisual id="exponent-laws-builder" />);
  const { host } = harness;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");
  answerFirstRound(host, "12");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered after a real attempt",
  );
  return host;
}

describe("revealing a step", () => {
  it("plays the note once, on the reveal itself", async () => {
    const host = await openOnAWrongAttempt();
    probe.reset();

    findButton(host, "Reveal answer").click();
    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal") !== null,
      "the reveal passage opens",
    );

    expect(probe.played()).toEqual(["answer-missed.ogg"]);
  });

  it("does not chime, because nothing was answered correctly", async () => {
    const audio = installCountingAudio();
    try {
      const host = await openOnAWrongAttempt();
      audio.reset();
      probe.reset();

      findButton(host, "Reveal answer").click();
      await waitFor(
        () => host.querySelector(".lesson-interactive__reveal") !== null,
        "the reveal passage opens",
      );

      // The check mark is the synthesized channel and stays where it was. A reveal that
      // chimed would be the game congratulating a learner for asking for the answer.
      expect(audio.oscillators()).toBe(0);
      expect(probe.countOf("answer-missed.ogg")).toBe(1);
    } finally {
      audio.restore();
    }
  });

  it("is silent while the attempt is still open, so only the reveal makes it", async () => {
    harness = mount(<LessonVisual id="exponent-laws-builder" />);
    const { host } = harness;
    await waitFor(() => inputs(host).length > 0, "the widget mounts");
    probe.reset();

    // A wrong attempt is not a reveal. The learner still has the question.
    answerFirstRound(host, "12");
    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal-button") !== null,
      "the reveal is offered after a real attempt",
    );

    expect(probe.played()).toEqual([]);
  });

  it("stays silent while muted", async () => {
    const host = await openOnAWrongAttempt();
    probe.reset();
    audioPrefs.setMuted(true);

    findButton(host, "Reveal answer").click();
    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal") !== null,
      "the reveal passage opens",
    );

    expect(probe.played()).toEqual([]);
  });
});
