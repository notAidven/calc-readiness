/**
 * The end-of-lesson check gets the widgets' teach-then-re-ask reveal, and the same guarantees.
 *
 * The mechanic is shared, so what needs proving here is not the mechanic again: it is that
 * mounting it on a surface that is NOT a `.lesson-interactive` board still closes both of the
 * gating holes it was built to close, on a card that has something no widget has - a real
 * `<form>` with its own Enter handler on the answer box. Left live, a spent check would take
 * the revealed answer on a keypress and close itself out, which turns a mandatory re-ask into
 * an offered one.
 *
 * AND WHAT THE RE-ASK ACTUALLY SERVES, which is the half the shared machine cannot own. A
 * widget re-asks with a fresh instance; this surface has one authored question and re-asks
 * with THAT QUESTION AGAIN. The last two cases below hold both halves of the consequence
 * open: the question is byte-identical and the card says so, and an answer produced after the
 * reveal had printed it is not celebrated as the learner's own work.
 *
 * Run in Chromium rather than jsdom because every claim below is about rendered DOM, real
 * focus, and `inert` - which jsdom does not implement, so a jsdom run of this file would pass
 * with the freeze absent.
 */

import { afterEach, beforeEach, expect, test } from "vitest";

import "../styles.css";
import { type CfuOutcome, LessonCfu } from "./cfu";
import { allLessons } from "./domains";
import { setLessonSoundMuted } from "./lessonSound";
import {
  type AudioProbe,
  type Harness,
  hasText,
  installCountingAudio,
  mount,
  setInputValue,
  waitFor,
} from "./testHarness";
import type { LessonCfuSpec } from "./types";

/**
 * A check with an accepted list and no `check` block, so grading is the exact-match path and
 * no item version has to be registered: the walk below then depends on nothing but this file.
 */
const CFU: LessonCfuSpec = {
  prompt: "A crate holds $12$ bolts. How many bolts are in $4$ crates?",
  accepted: ["48"],
  hint: "One crate is $12$ bolts, so four crates is that count taken four times over. Multiply the bolts in a crate by the number of crates, and keep track of what the answer counts: it is bolts, not crates.",
};

const RIGHT = "48";
const WRONG = "7";

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

/** True when `inner` lies inside `outer`, allowing sub-pixel rounding. */
function within(inner: DOMRect, outer: DOMRect, slack = 1): boolean {
  return (
    inner.top >= outer.top - slack &&
    inner.bottom <= outer.bottom + slack &&
    inner.left >= outer.left - slack &&
    inner.right <= outer.right + slack
  );
}

function field(host: HTMLElement): HTMLInputElement {
  const found = card(host).querySelector<HTMLInputElement>("input");
  if (found === null) {
    throw new Error("the card has no answer field");
  }
  return found;
}

function checkButton(host: HTMLElement): HTMLButtonElement {
  const found = card(host).querySelector<HTMLButtonElement>("button[type='submit']");
  if (found === null) {
    throw new Error("the card has no Check button");
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

/** The wrapper the host freezes while a reveal is being read. */
function stage(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-feedback-host__stage");
  if (found === null) {
    throw new Error("no feedback stage mounted");
  }
  return found;
}

function announcement(host: HTMLElement): string {
  return host.querySelector(".lesson-feedback-announce")?.textContent ?? "";
}

/** Type an answer and submit it, the way the card's own form does. */
function answer(host: HTMLElement, value: string): void {
  setInputValue(field(host), value);
  checkButton(host).click();
}

interface Verdicts {
  results: CfuOutcome[];
  releases: number;
}

function mountCfu(): { host: HTMLElement; seen: Verdicts } {
  const seen: Verdicts = { results: [], releases: 0 };
  h = mount(
    <LessonCfu
      cfu={CFU}
      nodeId="NUM.3"
      // The advisor's hint, already spent. This file is about what the reveal DOES, and the
      // card withholds it until the hint is taken; `cfuHintGate.browser.test.tsx` owns the
      // question of when it is offered.
      hintTaken
      onResult={(outcome) => seen.results.push(outcome)}
      onRelease={() => {
        seen.releases += 1;
      }}
    />,
  );
  return { host: h.host, seen };
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
function sameQuestionNote(host: HTMLElement): string | null {
  return card(host).querySelector(".lesson-player__re-ask-note")?.textContent ?? null;
}

function feedback(host: HTMLElement): HTMLElement | null {
  return card(host).querySelector<HTMLElement>(".lesson-player__feedback");
}

/** Wrong answer, reveal, re-ask: the walk that leaves the question re-asked and unanswered. */
async function walkToTheReAsk(host: HTMLElement): Promise<void> {
  answer(host, WRONG);
  await waitFor(() => revealButton(host) !== null, "the reveal is offered");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => reAskButton(host) !== null, "the re-ask is owed");
  (reAskButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the question comes back");
}

test("the check's reveal teaches, holds the question still, and only the second one lets the learner past", async () => {
  const { host, seen } = mountCfu();
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  // NOT a first-click bypass: the way out is offered to a learner who has tried, exactly as
  // it is on a widget.
  expect(revealButton(host), "a reveal was offered before any attempt").toBeNull();

  answer(host, WRONG);
  await waitFor(
    () => revealButton(host) !== null,
    "a wrong attempt puts the reveal on offer",
  );
  const offer = revealButton(host) as HTMLButtonElement;
  expect(seen.results, "the wrong attempt was graded").toEqual(["incorrect"]);

  // The label admits what pressing it leads to. "then try a new set" is the widgets' promise
  // and this surface cannot keep it: there is one authored question and no numbers to move.
  // Nor may it promise "then answer it yourself", which is the claim the label used to make
  // and the one thing a reveal takes away - so it names what happens instead.
  expect(offer.textContent, "the reveal button says what it will do").toBe(
    "Reveal answer, then the same question again",
  );

  const tonesBeforeReveal = audio?.oscillators() ?? 0;
  offer.click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens");
  const taught = passage(host) as HTMLElement;

  // 1. IT TEACHES: the answer, in the form the learner would type it, AND the reasoning.
  expect(
    hasText(taught, "Answer revealed."),
    "the reveal is announced in the passage",
  ).toBe(true);
  expect(hasText(taught, "The answer is"), "the answer is named in words").toBe(true);
  expect(hasText(taught, RIGHT), "the answer itself is printed").toBe(true);
  // The authored hint IS the reasoning, and it is inside the passage element rather than
  // merely on the page: the host focuses that element and points `aria-controls` at it.
  expect(
    hasText(taught, "it is bolts, not crates"),
    "the reasoning is inside the passage element",
  ).toBe(true);
  expect(taught.textContent?.length ?? 0, "the reasoning is there at all").toBeGreaterThan(
    100,
  );
  // And it is a PHRASE in that sentence rather than a block interrupting it. The passage is
  // one flowing "Answer revealed. The answer is X. <reasoning>"; authored Markdown rendered
  // as a block puts the reasoning on its own line with its own margins, and makes React log a
  // DOM-nesting error on every reveal.
  expect(
    taught.querySelector("p, div, ul, ol, blockquote"),
    "the reasoning is a block, not a phrase in the passage",
  ).toBeNull();

  // 2. IT DOES NOT OPEN THE GATE, and it is not a graded verdict either way.
  expect(seen.releases, "the first reveal opened the gate").toBe(0);
  expect(seen.results, "revealing was reported as an answer").toEqual(["incorrect"]);

  // 3. IT IS SILENT. Nothing was answered, so nothing may sound like it was.
  expect(audio?.oscillators(), "revealing played a tone").toBe(tonesBeforeReveal);
  expect(announcement(host), "the live region names what actually happened").toBe(
    "Answer revealed, with the reasoning behind it. The question stays as it is until you choose Try the question again.",
  );

  // 4. THE SPENT QUESTION IS FROZEN, not merely stale. This is the first of the two holes:
  // the card's own Enter handler would take the revealed answer straight back and close the
  // check out, so the answer box has to be out of play, not just wrong to use.
  expect(stage(host).hasAttribute("inert"), "the spent question is frozen").toBe(true);
  expect(
    stage(host).contains(field(host)),
    "the answer box is outside the region the host freezes, so freezing it does nothing",
  ).toBe(true);
  field(host).focus();
  expect(
    document.activeElement === field(host),
    "the frozen answer box still takes focus, so it can still be typed into",
  ).toBe(false);
  // And what the learner is meant to read and press is OUTSIDE that region. Everything inside
  // an inert subtree is dropped from the accessibility tree, names and all, so teaching put in
  // there would be text that only looks like it is available.
  expect(
    stage(host).contains(taught),
    "the teaching is inside the frozen region, where it is dropped from the a11y tree",
  ).toBe(false);

  // 5. THE REVEAL STANDS DOWN. The second hole: a second reveal taken here would be spent on
  // the very question the passage above is explaining, and would open the gate against it.
  expect(
    revealButton(host),
    "a second reveal is on offer against the explained question",
  ).toBe(null);

  // 6. FOCUS IS ON THE TEACHING, and deliberately not on the control below it. A focused
  // button is an Enter target, and the learner who just pressed Enter to submit a wrong
  // answer would take the re-ask without reading a word of the explanation they asked for.
  expect(document.activeElement, "focus did not land on the teaching").toBe(taught);
  const owed = reAskButton(host);
  expect(owed, "nothing offers the re-ask that is owed").not.toBeNull();
  expect(
    stage(host).contains(owed),
    "the only live control is inside the region that is out of play",
  ).toBe(false);
  expect(document.activeElement === owed, "focus landed on the re-ask button").toBe(false);
  expect(owed?.textContent, "the re-ask control says what it does").toBe(
    "Try the question again",
  );

  // Only the learner's own click takes the question back, and it takes the teaching with it:
  // the answer must be off the screen before they are asked to produce it.
  (owed as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the click clears the teaching");
  expect(stage(host).hasAttribute("inert"), "the re-asked question is still frozen").toBe(
    false,
  );
  expect(field(host).value, "the wrong answer was left in the box").toBe("");
  expect(seen.releases, "taking the re-ask opened the gate").toBe(0);
  // Focus follows the question back, so a learner who cannot see it is not left nowhere.
  expect(document.activeElement, "focus did not follow the question back").toBe(
    field(host),
  );

  // The reveal has to be earned again on the question as re-asked. Without this the learner
  // could reveal, click, and reveal again without going near the question in between.
  expect(revealButton(host), "the re-asked question offered a reveal unearned").toBeNull();
});

test("a correct answer with the answer never shown is celebrated, and is the floor for the silences below", async () => {
  const { host, seen } = mountCfu();
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  const tonesBefore = audio?.oscillators() ?? 0;
  answer(host, RIGHT);
  await waitFor(() => seen.results.length === 1, "the answer was graded");

  expect(seen.results, "independent work was not reported as `correct`").toEqual([
    "correct",
  ]);
  expect(seen.releases, "an answered check was reported as a release").toBe(0);
  expect(feedback(host)?.textContent, "the card did not congratulate them").toBe(
    "Correct! Nice work.",
  );
  // THE FLOOR under every "it stayed silent" in this file, the two below included: the chime
  // and the badge do fire on this surface, so their absence elsewhere is a fact about that
  // path and not about the harness.
  expect(
    audio?.oscillators() ?? 0,
    "a cold correct answer was silent, so silence proves nothing anywhere in this file",
  ).toBeGreaterThan(tonesBefore);
  expect(
    host.querySelector(".lesson-feedback-badge"),
    "no badge on a cold correct answer, so its absence proves nothing below",
  ).not.toBeNull();
  const badge = host.querySelector<HTMLElement>(".lesson-feedback-badge");
  const cfuCard = card(host);
  if (badge === null) {
    throw new Error("no badge to measure");
  }
  // `lesson-feedback-pop` scales the badge up from 0.5, and a rect read mid-pop is a rect
  // shrunk toward its own centre — which reads as contained whatever the offsets say.
  for (const animation of badge.getAnimations()) {
    animation.finish();
  }
  expect(
    within(badge.getBoundingClientRect(), cfuCard.getBoundingClientRect()),
    "the success badge sits outside the CFU card border",
  ).toBe(true);
  // Nothing to be stuck on any more, so the way out is withdrawn.
  expect(revealButton(host), "the reveal is still on offer after a pass").toBeNull();
});

/**
 * WHAT THE RE-ASK SERVES. The mechanic's name promises a second instance to prove it on, and
 * on this surface there is none to serve: a check is one authored `prompt` with a
 * hand-authored accepted list, so the re-ask hands back the question the passage has just
 * explained. That shipped silently, and a learner who took the re-ask got an identical
 * question with nothing on screen to say whether that was the offer or a redraw that failed.
 *
 * Both halves are asserted rather than one: that it IS the same question (so this file fails
 * the day a pack can carry a second one and nobody updates the copy), and that the card says
 * so where the learner is looking.
 */
test("the re-ask serves the same question back, and the card says so on the question", async () => {
  const { host } = mountCfu();
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  const asked = question(host);
  expect(asked.length, "no question was rendered to compare against").toBeGreaterThan(20);
  expect(
    sameQuestionNote(host),
    "the first ask already claims to be a repeat of itself",
  ).toBeNull();

  await walkToTheReAsk(host);

  expect(
    question(host),
    "the re-ask served a different question, so the note below is now a lie",
  ).toBe(asked);
  expect(
    sameQuestionNote(host),
    "an identical question came back with nothing on screen to say it was the offer",
  ).toBe("Same question again, with the answer off the screen. Write it out yourself.");
  // And it goes when the question is done with, rather than sitting under a settled check.
  answer(host, RIGHT);
  await waitFor(() => feedback(host) !== null, "the re-asked question was graded");
  expect(sameQuestionNote(host), "the note outlived the question it was about").toBeNull();
});

/**
 * AND WHAT AN ANSWER TO IT IS WORTH. The same question back means the grader cannot tell a
 * learner who worked it out from one copying the string the passage printed a moment ago, and
 * until this was separated the surface did not try: the chime, the badge and "Correct! Nice
 * work." all fired on the copy, and `AdvisorLesson` said "you applied what we just covered"
 * over the top of it.
 *
 * The gate is deliberately NOT part of the consequence. It opens exactly as it did, because a
 * second reveal opens it anyway and sending the learner round again is the trap this whole
 * mechanic exists to prevent.
 */
test("an answer the reveal had already printed opens the gate without being called the learner's own", async () => {
  const { host, seen } = mountCfu();
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  await walkToTheReAsk(host);

  const tonesBefore = audio?.oscillators() ?? 0;
  answer(host, RIGHT);
  await waitFor(
    () => seen.results.length === 2,
    "the answer to the re-asked question was graded",
  );

  // It counts, and it is told apart from work the learner did unaided.
  expect(seen.results, "a recalled answer was reported as independent work").toEqual([
    "incorrect",
    "recalled",
  ]);
  expect(seen.releases, "an answered check was reported as a release").toBe(0);
  expect(feedback(host)?.textContent, "the card said what actually happened").toBe(
    "That matches the answer you were shown. The practice set is where you work one from scratch.",
  );
  expect(
    feedback(host)?.getAttribute("data-status"),
    "a recalled answer is styled as a plain correct one",
  ).toBe("recalled");

  // Silent and unbadged. Both are how this product says "you did that"; the learner read
  // this answer thirty seconds ago. The floor for both is the cold pass above.
  expect(audio?.oscillators() ?? 0, "the chime fired on a recalled answer").toBe(
    tonesBefore,
  );
  expect(
    host.querySelector(".lesson-feedback-badge"),
    "the success badge popped on a recalled answer",
  ).toBeNull();
  // The third of the three, and the one a learner who cannot see the badge depends on: the
  // shared live region must not announce "Correct." either. What IS announced is the card's
  // own feedback, which carries `aria-live` and says what happened.
  expect(announcement(host), "the live region announced a success").not.toBe("Correct.");

  // THE GATE IS UNTOUCHED: it still closes the question out, so nobody is sent round again.
  expect(
    revealButton(host),
    "the reveal is still on offer after a recalled pass",
  ).toBeNull();
  expect(reAskButton(host), "a re-ask is still owed after a recalled pass").toBeNull();
});

test("a second reveal on the re-asked question lets the learner past without claiming they answered it", async () => {
  const { host, seen } = mountCfu();
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  await walkToTheReAsk(host);

  // Still stuck. The second reveal has to let them through: a learner sent round twice is a
  // learner trapped on the gate, which is the whole defect this mechanic exists to fix.
  answer(host, WRONG);
  await waitFor(() => revealButton(host) !== null, "the reveal is offered again");
  const tonesBefore = audio?.oscillators() ?? 0;
  (revealButton(host) as HTMLButtonElement).click();

  await waitFor(() => seen.releases === 1, "the second reveal did not open the gate");
  // Reported as a release and NOT as a correct answer, so the advisor above cannot
  // congratulate someone who did not answer it.
  expect(seen.results, "a revealed check was reported as a graded verdict").toEqual([
    "incorrect",
    "incorrect",
  ]);
  expect(audio?.oscillators(), "the second reveal played a tone").toBe(tonesBefore);
  expect(hasText(passage(host) as HTMLElement, "The answer is"), "it teaches again").toBe(
    true,
  );
  // Nothing is owed, so nothing is frozen and no re-ask is left behind.
  expect(reAskButton(host), "the gate opened with a re-ask still owed").toBeNull();
  expect(
    stage(host).hasAttribute("inert"),
    "the question is frozen with the gate open",
  ).toBe(false);
});

/**
 * Every authored check can actually teach, on its own hint and with nothing new authored.
 *
 * The design rests on `cfu.hint` already being the reasoning that produces the answer, and
 * that is a claim about every hand-written pack rather than about this code. A pack whose
 * hint is a bare nudge would print an answer with nothing behind it, which is the one thing a
 * reveal must never be.
 */
const AUTHORED = allLessons
  .filter((lesson) => lesson.cfu !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const);

test("the sweep found the authored checks", () => {
  // A floor, not a fingerprint: an empty sweep would make every case below vacuous, and
  // `it.each` over nothing passes. It sits at what the tree holds today (31, since D3's five
  // LIN packs landed after D8's five EL packs) rather than at the 21 it was written against,
  // because a domain losing its checks is worth failing on and a domain gaining some only
  // raises it.
  expect(AUTHORED.length).toBeGreaterThanOrEqual(31);
});

test.each(AUTHORED)(
  "%s: its reveal prints an answer and the reasoning for it",
  async (nodeId, cfu) => {
    h = mount(<LessonCfu cfu={cfu} nodeId={nodeId} hintTaken />);
    const host = h.host;
    await waitFor(
      () => host.querySelector(".lesson-player__cfu") !== null,
      `${nodeId} mounts`,
    );

    answer(host, "zzz");
    await waitFor(() => revealButton(host) !== null, `${nodeId}: the reveal is offered`);
    (revealButton(host) as HTMLButtonElement).click();
    await waitFor(() => passage(host) !== null, `${nodeId}: the passage opens`);
    const taught = passage(host) as HTMLElement;

    const stated = cfu.check?.answer_key ?? cfu.accepted[0] ?? "";
    expect(stated, `${nodeId}: nothing to print as the answer`).not.toBe("");
    expect(hasText(taught, stated), `${nodeId}: the answer is not printed`).toBe(true);
    // The reasoning, measured on the passage element itself and over and above the answer it
    // already carries. The shortest authored hint is 105 characters.
    expect(
      taught.textContent?.length ?? 0,
      `${nodeId}: the passage carries no reasoning`,
    ).toBeGreaterThan(stated.length + 100);
    expect(
      taught.querySelector("p, div, ul, ol, blockquote"),
      `${nodeId}: the hint rendered as a block inside the passage sentence`,
    ).toBeNull();
  },
);
