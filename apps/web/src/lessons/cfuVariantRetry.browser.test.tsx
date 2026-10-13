/**
 * The check's retry serves a GENUINELY DIFFERENT instance, and an answer to it is work.
 *
 * `cfuRevealReAsk.browser.test.tsx` holds the mechanic open: the reveal teaches, freezes the
 * spent question, and only the second one lets the learner past. What it could not hold open
 * was WHAT the re-ask serves, because at #224 the answer was "the same question", and its
 * tripwire case says so in as many words.
 *
 * This file is the other half, and it is deliberately driven against REAL AUTHORED CONTENT
 * rather than a fixture. The claim is not that a variant mechanism exists; it is that a
 * learner on a converted pack is handed something they have to work out. A fixture would
 * prove the first and quietly leave the second to the packs.
 *
 * ## What counts as a different instance here
 *
 * Not a different-LOOKING question. Rotating `(x^2)^3 * x^-8` to another exponent pair that
 * still lands on `1/x^2` produces a fresh prompt whose revealed answer is still copyable,
 * which is #224's defect wearing a disguise. So the assertion each case below leans on is
 * the ANSWER: after the re-ask, the string the reveal printed a moment ago is submitted, and
 * it has to be graded WRONG. That is checkable, it is what makes the retry a test rather
 * than a recall, and it is the property that licenses the surface to stop calling a
 * post-reveal answer `recalled` (see `answerSeen` in `cfu.tsx`).
 *
 * It is in Chromium, and the reason this header used to give was wrong: it cited the sibling
 * file's claim that jsdom does not implement the `inert` freeze the walk goes through. jsdom
 * implements no `inert` behaviour, but nothing here asserts the behaviour -- the walk reads
 * attributes and DOM structure, both of which hold in either environment. Measured at
 * `09c9c5d1`: with `cfuAsk(cfu, index)` forced to `cfuAsk(cfu, 0)` in `cfu.tsx`, which is
 * #224's defect, the same 62 cases fail under jsdom as under Chromium, by name. See
 * `cfuHintGate.browser.test.tsx`'s header and
 * `docs/2026-08-05-browser-suite-classification.md` §5. The file stays here because moving it
 * saves nothing measurable, not because Chromium sees something jsdom cannot.
 */

import { afterEach, beforeEach, expect, test } from "vitest";

import { wrongButReadable } from "../test/wrongButReadable";
import { type CfuOutcome, LessonCfu } from "./cfu";
import { gradeCfuAnswer } from "./cfuChecker";
import { cfuAsk, cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import { setLessonSoundMuted } from "./lessonSound";
import {
  type AudioProbe,
  type Harness,
  installCountingAudio,
  mount,
  setInputValue,
  waitFor,
} from "./testHarness";
import type { LessonCfuSpec } from "./types";

/** A converted pack, by node id. Fails loudly rather than skipping if it stops existing. */
function pack(nodeId: string): LessonCfuSpec {
  const lesson = allLessons.find((entry) => entry.node_id === nodeId);
  if (!lesson?.cfu) {
    throw new Error(`no authored check for ${nodeId}`);
  }
  return lesson.cfu;
}

let h: Harness | null = null;
let audio: AudioProbe | null = null;

beforeEach(() => {
  audio = installCountingAudio();
  setLessonSoundMuted(false);
});

afterEach(() => {
  h?.cleanup();
  h = null;
  audio?.restore();
  audio = null;
  setLessonSoundMuted(false);
});

function card(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-player__cfu");
  if (found === null) {
    throw new Error("no check-for-understanding card mounted");
  }
  return found;
}

function field(host: HTMLElement): HTMLInputElement {
  const found = card(host).querySelector<HTMLInputElement>("input");
  if (found === null) {
    throw new Error("the card has no answer field");
  }
  return found;
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

function reAskButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button");
}

function passage(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".lesson-interactive__reveal");
}

/** The answer the reveal printed, as the learner would type it. */
function revealedAnswer(host: HTMLElement): string {
  const found = host.querySelector(".lesson-interactive__reveal-answer");
  if (found === null) {
    throw new Error("the passage printed no answer");
  }
  return found.textContent ?? "";
}

/** The question as the learner reads it: the label the answer box is named by. */
function question(host: HTMLElement): string {
  const label = card(host).querySelector("label");
  if (label === null) {
    throw new Error("the card has no question");
  }
  return label.textContent ?? "";
}

/** The line the card prints on the re-asked question, or null when it is not printing one. */
function reAskNote(host: HTMLElement): string | null {
  return card(host).querySelector(".lesson-player__re-ask-note")?.textContent ?? null;
}

function feedback(host: HTMLElement): HTMLElement | null {
  return card(host).querySelector<HTMLElement>(".lesson-player__feedback");
}

function answer(host: HTMLElement, value: string): void {
  setInputValue(field(host), value);
  const submit = card(host).querySelector<HTMLButtonElement>("button[type='submit']");
  if (submit === null) {
    throw new Error("the card has no Check button");
  }
  submit.click();
}

interface Verdicts {
  results: CfuOutcome[];
  releases: number;
}

function mountCfu(nodeId: string): { host: HTMLElement; seen: Verdicts } {
  const seen: Verdicts = { results: [], releases: 0 };
  h = mount(
    <LessonCfu
      cfu={pack(nodeId)}
      nodeId={nodeId}
      // The advisor's hint, already spent. Every claim in this file is about what happens
      // AFTER a reveal, and the card withholds the reveal until the hint has been taken, so
      // without this the walk stops at a button that is never rendered. `cfuHintGate
      // .browser.test.tsx` is where the gate itself is asserted.
      hintTaken
      onResult={(outcome) => seen.results.push(outcome)}
      onRelease={() => {
        seen.releases += 1;
      }}
    />,
  );
  return { host: h.host, seen };
}

/**
 * A WRONG ANSWER THE CARD CAN READ, for the two places these cases need one.
 *
 * `"zzz"` was the fabricated miss, and on FUN.6, TRG.1 and TRG.6 the grammar cannot read it
 * (`unknown_symbol`). That used to be indistinguishable from a miss, so it produced a verdict and
 * these cases counted it; the card now refuses to invent a verdict for an answer nobody read, so a
 * case built on `"zzz"` gets no result at all and hangs. Derived per node rather than replaced with
 * another literal, because what is readable depends on the check's own grammar.
 */
function readableMiss(nodeId: string, index: number): string {
  const cfu = pack(nodeId);
  const candidateFromKey = wrongButReadable(cfuAsk(cfu, index).answerKey);
  for (const candidate of [candidateFromKey, "999999", "zzz", "0", "-987654"]) {
    const graded = gradeCfuAnswer({ nodeId, cfu, index, value: candidate });
    if (graded.unreadable === null && !graded.correct) {
      return candidate;
    }
  }
  throw new Error(
    `${nodeId}: no candidate is both readable and wrong on instance ${index}`,
  );
}

/**
 * Wrong answer, reveal, read the answer, take the re-ask. Returns the question and the
 * answer the learner was shown, so the case can hold the new instance against them.
 */
async function walkToTheReAsk(
  host: HTMLElement,
  nodeId: string,
): Promise<{ asked: string; shown: string }> {
  const asked = question(host);
  answer(host, readableMiss(nodeId, 0));
  await waitFor(() => revealButton(host) !== null, "the reveal is offered");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the passage opens");
  const shown = revealedAnswer(host);
  await waitFor(() => reAskButton(host) !== null, "the re-ask is owed");
  (reAskButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the question comes back");
  return { asked, shown };
}

/**
 * The packs converted to computed variants. Read off the content rather than written down,
 * so a pack converted later is swept with no edit here, and floored so the sweep cannot go
 * quiet by finding none.
 */
const CONVERTED = allLessons
  .filter((lesson) => lesson.cfu?.variants !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const);

test("the sweep found the converted packs", () => {
  // A floor, not a fingerprint: five packs are converted today (NUM.S, NUM.3, NUM.5, LF.1,
  // LF.4), and a sixth only raises it. It sits here because `test.each` over an empty list
  // passes, so without it every case below would go green the day the resolver stopped
  // resolving anything.
  // 31, which is every check in the tree, rather than the 5 this was floored at while the
  // rollout was in flight. A floor of 5 would have gone on passing over a tree that had lost
  // 26 of them, which is the whole population this file is about.
  expect(
    CONVERTED.length,
    "a pack has lost its variants, so a check somewhere re-asks the identical question",
  ).toBeGreaterThanOrEqual(31);
});

test.each(CONVERTED.map(([nodeId]) => nodeId))(
  "%s: the re-ask serves an instance whose answer the reveal did not print",
  async (nodeId) => {
    const { host } = mountCfu(nodeId);
    await waitFor(
      () => host.querySelector(".lesson-player__cfu") !== null,
      `${nodeId} mounts`,
    );

    const { asked, shown } = await walkToTheReAsk(host, nodeId);
    expect(asked.length, `${nodeId}: no question to compare against`).toBeGreaterThan(20);
    expect(
      shown.length,
      `${nodeId}: no answer was printed to compare against`,
    ).toBeGreaterThan(0);

    // 1. A different question. This is the assertion #224 could only record as a tripwire.
    expect(
      question(host),
      `${nodeId}: the re-ask served the question back byte-identical`,
    ).not.toBe(asked);

    // 2. And a different ANSWER, which is the half that makes it a test rather than a
    //    recall: the string on screen thirty seconds ago is now wrong.
    answer(host, shown);
    await waitFor(() => feedback(host) !== null, `${nodeId}: the old answer was graded`);
    expect(
      feedback(host)?.getAttribute("data-status"),
      `${nodeId}: the answer the reveal printed still passes, so the retry is copyable`,
    ).toBe("incorrect");
  },
);

test.each(CONVERTED.map(([nodeId]) => nodeId))(
  "%s: the copy says a new question is coming, not that the same one is",
  async (nodeId) => {
    const { host } = mountCfu(nodeId);
    await waitFor(
      () => host.querySelector(".lesson-player__cfu") !== null,
      `${nodeId} mounts`,
    );

    expect(
      reAskNote(host),
      `${nodeId}: the first ask already claims to be a repeat`,
    ).toBeNull();

    answer(host, readableMiss(nodeId, 0));
    await waitFor(() => revealButton(host) !== null, `${nodeId}: the reveal is offered`);
    // #224's note promised the same question back. On a pack with variants that is false,
    // and it is the sentence a learner reads BEFORE deciding to take the reveal.
    expect(
      revealButton(host)?.textContent,
      `${nodeId}: the reveal button promises the same question back`,
    ).toBe("Reveal answer, then a different question to work");

    (revealButton(host) as HTMLButtonElement).click();
    await waitFor(() => reAskButton(host) !== null, `${nodeId}: the re-ask is owed`);
    expect(
      reAskButton(host)?.textContent,
      `${nodeId}: the re-ask control promises the same question back`,
    ).toBe("Try a different question");

    (reAskButton(host) as HTMLButtonElement).click();
    await waitFor(() => passage(host) === null, `${nodeId}: the question comes back`);
    expect(
      reAskNote(host),
      `${nodeId}: the card still says the answer is merely off the screen`,
    ).toBe("A different question of the same kind. Work this one out.");
  },
);

test.each(CONVERTED.map(([nodeId]) => nodeId))(
  "%s: answering the new instance is independent work, not recall",
  async (nodeId) => {
    const { host, seen } = mountCfu(nodeId);
    await waitFor(
      () => host.querySelector(".lesson-player__cfu") !== null,
      `${nodeId} mounts`,
    );

    await walkToTheReAsk(host, nodeId);

    // The answer to THIS question has never been on screen, so producing it is the
    // learner's own work and the surface says so: chime, badge, "Correct! Nice work.".
    // That is the whole point of serving a different instance, and the reason `recalled`
    // is keyed on the instance in hand rather than latched for the rest of the card's life.
    //
    // The answer comes from the SAME resolver the card cycles, not from a second copy of
    // the arithmetic: a duplicate could agree with a wrong generator. So this case also
    // pins that the card is grading the instance the resolver says it is showing.
    const second = cfuInstances(pack(nodeId))[1];
    if (second === undefined) {
      throw new Error(`${nodeId} declares variants but resolved fewer than two instances`);
    }
    const tonesBefore = audio?.oscillators() ?? 0;
    /*
     * THE FIRST ACCEPTED SPELLING THE CARD CAN ACTUALLY GRADE, which on three nodes is not
     * `accepted[0]`.
     *
     * FUN.6, TRG.1 and TRG.6 spell their re-ask's canonical answer in a form the versioned checker
     * cannot READ, so a learner typing exactly the answer they were just shown used to be marked
     * wrong for it. This case did not notice, because it only waited for a second result and a
     * silent miss produced one. It is a CONTENT defect rather than this file's, and it now shows up
     * as a named skip here instead of as a pass: `gradeCfuAnswer` refuses to invent a verdict for
     * an answer nobody read, so an unreadable spelling produces no result at all.
     */
    const gradable = second.accepted.find(
      (form) =>
        gradeCfuAnswer({ nodeId, cfu: pack(nodeId), index: 1, value: form }).unreadable ===
        null,
    );
    expect(
      gradable,
      `${nodeId}: every accepted spelling of the re-ask is unreadable by the grader, so a learner typing the answer they were shown gets "we couldn't read that"`,
    ).toBeDefined();
    answer(host, gradable as string);
    await waitFor(() => seen.results.length === 2, `${nodeId}: the answer was graded`);

    expect(seen.results, `${nodeId}: work on a fresh instance was called recall`).toEqual([
      "incorrect",
      "correct",
    ]);
    expect(feedback(host)?.textContent, `${nodeId}: the card withheld the verdict`).toBe(
      "Correct! Nice work.",
    );
    expect(
      audio?.oscillators() ?? 0,
      `${nodeId}: the chime was withheld on independent work`,
    ).toBeGreaterThan(tonesBefore);
  },
);

/**
 * A converted pack declares exactly the instances the surface can reach, and no more.
 *
 * `WidgetFeedbackHost` grants ONE re-ask per card: `redrawn.current` is a one-way latch, so the
 * first reveal re-asks and every reveal after it opens the gate instead. A learner therefore
 * sees the authored question and one computed one, and a pack declaring a third would be
 * drawing an instance nothing can serve. Declaring a rotation the surface cannot reach is the
 * same kind of over-claim as promising the same question and handing over a different one, so
 * it is asserted rather than left to the reader of `count`.
 */
test.each(CONVERTED.map(([nodeId]) => nodeId))(
  "%s declares only the instances one re-ask can reach",
  (nodeId) => {
    const cfu = pack(nodeId);
    expect(
      cfu.variants?.count,
      `${nodeId} declares ${cfu.variants?.count} instances, and the host grants one re-ask`,
    ).toBe(2);
    expect(cfuInstances(cfu).length, `${nodeId} resolved fewer than it declares`).toBe(2);
  },
);
