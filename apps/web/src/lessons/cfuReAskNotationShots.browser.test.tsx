import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { LessonCfu } from "./cfu";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import { setLessonSoundMuted } from "./lessonSound";
import { type Harness, mount, setInputValue, waitFor } from "./testHarness";
import type { LessonCfuSpec } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE RE-ASKED CHECK, PHOTOGRAPHED WITH THE NOTATION IT NEEDS NAMED UNDER IT.**
 *
 * POL.4's authored question offers "Use / for a fraction: 3/8". Its RE-ASK, whose answer
 * `-4, 2/5` still needs the slash, showed an interval placeholder and no answer column at all:
 * `solutionSetForms` spells the roster `[-4, 2/5]` as well as `{-4, 2/5}`, the square-bracket
 * spelling satisfies `isIntervalAnswerText`, and `cfuNotation` read that alternative as the
 * notation of the whole answer. POL.3 and LIN.5 were misdirected the same way. The dispatch is
 * fixed in `answerFormat.ts` and swept in `answerFormat.test.ts` and `answerKeypad.test.ts`.
 *
 * The INSERT NOTATION strip these frames were first taken for is gone (see
 * `MathAnswerColumn.tsx`); what the non-empty row buys an item now is the persistent notation
 * line and the preview, and those are what is photographed.
 *
 * ## WHY A FRAME AND NOT ONLY THE SWEEPS
 *
 * Because `MathAnswerColumn` renders the line and the preview ONLY when the dispatch hands it a
 * non-empty row, so "the dispatch now returns `solution_set_fraction`" is a claim about a
 * function and not about anything a learner can see. The sweeps establish the state is real —
 * that this is genuinely the re-asked instance, that its answer genuinely carries a bar. What
 * they cannot establish is that the guidance is on the screen and readable, which is spatial and
 * therefore owes a picture somebody looked at.
 *
 * 1024x580, deliberately not a comfortable developer viewport: the line and the preview are
 * stacked BELOW the field, so a short screen is exactly where a third row costs something, and
 * a frame taken at 1440x900 would be reassuring about a screen nobody has.
 *
 * The frame is clipped to the whole window rather than to the column. A crop of the aid is a
 * picture of the one thing nobody doubted; what is being judged is whether the field, its line
 * and the preview all still fit around each other.
 *
 * Gitignored, like every other `__screenshots__` shot in this tree. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/lessons/cfuReAskNotationShots.browser.test.tsx
 */

/** Short and realistic, and the viewport every frame here is named by. */
const SHORT_WINDOW = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
  setLessonSoundMuted(false);
});

function pack(nodeId: string): LessonCfuSpec {
  const lesson = allLessons.find((entry) => entry.node_id === nodeId);
  if (!lesson?.cfu) {
    throw new Error(`no authored check for ${nodeId}`);
  }
  return lesson.cfu;
}

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

function answer(host: HTMLElement, value: string): void {
  setInputValue(field(host), value);
  const submit = card(host).querySelector<HTMLButtonElement>("button[type='submit']");
  if (submit === null) {
    throw new Error("the card has no Check button");
  }
  submit.click();
}

/**
 * Where this test's viewport sits inside the real browser window.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport does not match the window, so a clip written in CSS pixels of the requested viewport
 * lands in the wrong place. Borrowed verbatim from `winterDevSkipShots.browser.test.tsx`, which
 * is where the defect and its fix are documented.
 */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
    scale: box.height / window.innerHeight,
  };
}

/**
 * One frame of the short window, clipped to where that window really is, at its own scale.
 *
 * The scale is ASSERTED: a frame silently captured at 0.63 is not evidence about legibility on
 * a 1024x580 screen, and that is the specific way this kind of evidence went wrong once here.
 */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a 1024x580 screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, SHORT_WINDOW.width),
      height: Math.min(box.height, SHORT_WINDOW.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `apps/web/src/lessons/__screenshots__/cfu-re-ask/${name}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
}

/** Wrong answer, reveal, take the re-ask. Leaves the card showing the computed instance. */
async function walkToTheReAsk(host: HTMLElement): Promise<void> {
  answer(host, "zzz");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered",
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button")?.click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reask-button") !== null,
    "the re-ask is owed",
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button")?.click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") === null,
    "the question comes back",
  );
}

/**
 * Each node, with the answer its re-ask wants and whether that answer needs a key.
 *
 * The expected instance answer is read from `cfuInstances`, not written down, so a generator
 * change cannot leave this file photographing a state it is describing wrongly.
 */
const CASES: readonly { nodeId: string; needsKey: boolean }[] = [
  // The defect's own case: a roster holding a fraction, so the slash has to be named.
  { nodeId: "POL.4", needsKey: true },
  // The two that were misdirected without needing notation. Their answers are whole numbers, so
  // what the fix buys them is the right LINE — a roster's, not an interval's — and the frame is
  // here because "no column" is the correct outcome for them and has to be told apart from the
  // "no column" the defect produced.
  { nodeId: "POL.3", needsKey: false },
  { nodeId: "LIN.5", needsKey: false },
];

test.each(CASES)(
  "$nodeId's re-ask photographs at 1024x580 with the aids its own answer needs",
  async ({ nodeId, needsKey }) => {
    await page.viewport(SHORT_WINDOW.width, SHORT_WINDOW.height);
    setLessonSoundMuted(true);

    h = mount(<LessonCfu cfu={pack(nodeId)} nodeId={nodeId} hintTaken />);
    const host = h.host;
    await waitFor(
      () => host.querySelector(".lesson-player__cfu") !== null,
      `${nodeId} mounts`,
    );
    await walkToTheReAsk(host);

    // The state is real: this is the computed instance, and it is the one the sweeps judged.
    const reAsk = cfuInstances(pack(nodeId))[1];
    if (reAsk === undefined) {
      throw new Error(`${nodeId} resolved no re-ask to photograph`);
    }
    const wants = reAsk.accepted[0] ?? "";
    expect(wants.includes("/"), `${nodeId}'s re-ask answers ${wants}`).toBe(needsKey);

    const shown = field(host).placeholder;
    expect(shown, `${nodeId} still shows an interval line on a roster`).not.toContain(
      "inf",
    );

    const line = host.querySelector<HTMLElement>(".cr-math-notation");
    if (needsKey) {
      // The two things `MathAnswerColumn` renders together, and only when the row is non-empty.
      expect(
        line,
        `${nodeId}: no notation line under an answer of ${wants}`,
      ).not.toBeNull();
      expect(
        host.querySelector(".cr-math-preview"),
        `${nodeId}: the column rendered no preview`,
      ).not.toBeNull();
      // The untouched field first, because the placeholder is the other half of the fix and it
      // is only readable while the field is empty. On the frame below it said "Interval, e.g.
      // (-inf, 2] U (7, inf)".
      await shoot(`${nodeId.toLowerCase().replace(".", "")}-re-ask-empty-1024x580`);

      // Typed, which is now the only route: the line has to take OVER from the placeholder at
      // the first character, so a frame of an empty field cannot show it doing its job.
      setInputValue(field(host), "2/5");
      await waitFor(
        () => (line as HTMLElement).textContent === shown,
        `${nodeId}: the notation line did not carry the field's own guidance`,
      );
      // And the preview is LIVE over what was typed, which is the half a rendered element alone
      // does not establish: an empty preview looks the same whether the parser read the input or
      // refused it.
      await waitFor(
        () =>
          host.querySelector(".cr-math-preview")?.getAttribute("data-empty") === "false",
        `${nodeId}: the preview stayed empty over the fraction the key types`,
      );

      // The full roster is then typed in, and the frame is taken over THAT, because it is what
      // the learner has in the field when they press Check. The preview is deliberately blank
      // there: `previewOf` is a single-expression grammar with no reading for a comma, and its
      // own note says half an expression drawn confidently is worse than none. So the frame
      // shows a live preview area that has correctly declined this input, not a dead one — the
      // assertion above is what tells those two apart.
      setInputValue(field(host), wants);
      await waitFor(
        () => field(host).value === wants,
        `${nodeId}: the field did not take the answer`,
      );
    } else {
      expect(line, `${nodeId}: a notation line over a whole-number roster`).toBeNull();
    }

    await shoot(`${nodeId.toLowerCase().replace(".", "")}-re-ask-1024x580`);
  },
);

/**
 * **AN UNREDUCED ROOT IS GRADED CORRECT ON POL.4'S RE-ASK, THROUGH THE CARD.**
 *
 * `cfuVariants.test.ts` proves the computed list contains the spelling. That is a claim about a
 * Set; this is the claim a learner cares about — that typing it and pressing Check produces
 * "Correct! Nice work." rather than a miss. The two are not the same statement, because the card
 * runs two other gates before it consults the list at all (`isNumericLiteral` for a numeric
 * check, and a `reduced_fraction` short-circuit that would refuse an unreduced answer BEFORE
 * grading it, which is exactly the shape of the defect being fixed).
 *
 * The answer typed is the unreduced spelling of the RE-ASK's own root. POL.4's re-ask wants
 * `-4, 2/5`, so its unreduced form is `-4, 4/10`. `-4, 6/4` is the AUTHORED question's — that one
 * is graded against the pack's hand-written list and no speller change reaches it.
 */
test("POL.4's re-ask grades an unreduced root correct at 1024x580", async () => {
  await page.viewport(SHORT_WINDOW.width, SHORT_WINDOW.height);
  setLessonSoundMuted(true);

  h = mount(<LessonCfu cfu={pack("POL.4")} nodeId="POL.4" hintTaken />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-player__cfu") !== null, "POL.4 mounts");
  await walkToTheReAsk(host);

  // Derived from the instance rather than hardcoded, so a generator change cannot leave this
  // typing a string that is no longer this question's answer.
  const wants = cfuInstances(pack("POL.4"))[1]?.accepted[0] ?? "";
  const unreduced = wants.replace(
    /(\d+)\s*\/\s*(\d+)/g,
    (_whole, over: string, under: string) => `${Number(over) * 2}/${Number(under) * 2}`,
  );
  expect(unreduced, "the re-ask's answer carries no fraction to scale").not.toBe(wants);

  answer(host, unreduced);
  await waitFor(
    () => card(host).querySelector(".lesson-player__feedback") !== null,
    "the answer was graded",
  );
  const feedback = card(host).querySelector<HTMLElement>(".lesson-player__feedback");
  expect(
    feedback?.getAttribute("data-status"),
    `POL.4's re-ask wants ${wants} and marked the same number ${unreduced} wrong`,
  ).toBe("correct");
  expect(feedback?.textContent).toBe("Correct! Nice work.");

  await shoot("pol4-re-ask-unreduced-correct-1024x580");
});

/**
 * **POL.4'S AUTHORED CARD, ON THE LINE ITS OWN ANSWER ASKS FOR.**
 *
 * The ruling this photographs: POL.4's authored question moves from `fraction_bar` to
 * `solution_set_fraction`. Its prompt says *"list both solutions"* and its answer is
 * `{-4, 3/2}` — a solution set with a fractional root — and until now the line above the field
 * read "Use / for a fraction: 3/8", which names the slash and says nothing about there being two
 * roots or how to separate them. Its own RE-ASK was already on the roster line, so the two halves
 * of one card disagreed about what shape the answer is.
 *
 * A dispatch returning a different string is not what a learner meets, and neither is a
 * placeholder read off `cfuPlaceholder`. What is claimed here is that the line, the key and the
 * field are all on the screen together at a short viewport and that the answer grades: the roster
 * line is the LONGER of the two ("Every solution: 7/8 or {2/3, 5}" against "Use / for a fraction:
 * 3/8"), so the whole risk of the ruling is that the field now clips it, and only a picture
 * settles that.
 *
 * The unreduced root is typed here too, which the re-ask frame above could not cover: an authored
 * question is graded by exact match against the pack's own hand-written strings, so this is the
 * only surface where `content/lessons/d4/POL.4.json` carrying `-4, 6/4` can be seen to be true.
 */
test("POL.4's authored card names the roster and the bar, and takes an unreduced root, at 1024x580", async () => {
  await page.viewport(SHORT_WINDOW.width, SHORT_WINDOW.height);
  setLessonSoundMuted(true);

  h = mount(<LessonCfu cfu={pack("POL.4")} nodeId="POL.4" hintTaken />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-player__cfu") !== null, "POL.4 mounts");

  // The authored instance, unwalked: no wrong answer, no reveal, no re-ask.
  const authored = cfuInstances(pack("POL.4"))[0];
  expect(authored?.authored, "the first instance is not the authored one").toBe(true);

  // The line, read off the rendered field rather than off the dispatch.
  const shown = field(host).placeholder;
  expect(shown, "POL.4's card is still on the bare fraction line").toBe(
    "Every solution: 7/8 or {2/3, 5}",
  );

  // And the column survived the move, which is the whole reason this tag exists rather than the
  // aidless `solution_set`: a roster's braces and comma are on a phone keyboard, and the bar the
  // line names is the character a learner would not know belongs in a set.
  expect(
    host.querySelector(".cr-math-notation"),
    "the roster line arrived without an answer column",
  ).not.toBeNull();

  await shoot("pol4-authored-solution-set-fraction-1024x580");

  // Unreduced, and scaled off the pack's own canonical rather than written down.
  const canonical = authored?.accepted[0] ?? "";
  const unreduced = canonical.replace(
    /(\d+)\s*\/\s*(\d+)/g,
    (_whole, over: string, under: string) => `${Number(over) * 2}/${Number(under) * 2}`,
  );
  expect(unreduced, "the authored answer carries no fraction to scale").not.toBe(canonical);

  answer(host, unreduced);
  await waitFor(
    () => card(host).querySelector(".lesson-player__feedback") !== null,
    "the answer was graded",
  );
  const feedback = card(host).querySelector<HTMLElement>(".lesson-player__feedback");
  expect(
    feedback?.getAttribute("data-status"),
    `POL.4's authored card wants ${canonical} and marked the same number ${unreduced} wrong`,
  ).toBe("correct");
  expect(feedback?.textContent).toBe("Correct! Nice work.");

  await shoot("pol4-authored-unreduced-correct-1024x580");
});
