/**
 * FEEDBACK ON EVERY CRISIS ANSWER, AND A COMMIT STEP THAT SAYS WHAT IT DOES.
 *
 * Real Chromium with the real stylesheets, because both claims are about rendered DOM and
 * accessible names rather than about state: "the solution is on screen" is a claim about a
 * figure that draws, and "the button says what pressing it will do" is a claim about the
 * name a screen reader speaks. jsdom has neither a cascade nor layout, so it cannot answer
 * either one, and `HardWinterSurface.test.tsx` holds only the compact both-states check.
 *
 * ## Why the correct-answer case is a separate test and not a parameter
 *
 * The requirement is feedback on a miss AND on a hit, and the failure mode it guards is a
 * reveal gated on `!correct`, which is the shape every other surface in this tree ships:
 * `LessonPractice` reveals only after hints are exhausted, and `InfiniteDrill` only on
 * `incorrect` or `skipped`. A suite that only drove a wrong answer would pass against that
 * gate while covering half the requirement, so the two paths are two tests and the
 * injection table below forces the gate and shows exactly one of them red.
 *
 * ## Why the tally and the field are asserted here too
 *
 * Showing the solution is feedback, not a second chance. The three properties that make
 * that true are all rendered: the field is disabled, the Check button is gone, and the
 * running tally has already counted the answer. Asserting the solution without them would
 * be evidence for a fix that had quietly loosened the encounter.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";
import {
  findButton,
  type Harness,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { HardWinterSurface } from "./HardWinterSurface";
import { WINTER_NODE_ORDER, winterBatchFor, winterFrozenItem } from "./hardWinterItems";

import "../styles.css";
import { wrongButReadable } from "../test/wrongButReadable";

/**
 * A learner who has practised every era-one skill, stated rather than assumed.
 *
 * The surface reads the learner's REAL practised set now, so a bare mount would draw from an
 * empty store and refuse the batch. These tests are about the mechanic and not about
 * progress, so each one says which learner it is playing as; the progress rule itself is
 * `crisisQuestionPool.test.ts`'s claim.
 */
const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

let h: Harness | null = null;

/** The game's own camera. The headless default is phone-shaped and never binds the rail. */
const DESKTOP = { width: 1440, height: 960 };
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

/** Round one of encounter one, which is the batch a fresh mount asks. */
function roundOnePrompts(): readonly string[] {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round: 1,
  });
  if (batch.status !== "ready") {
    throw new Error(batch.message);
  }
  return batch.prompts.map((prompt) => prompt.item_version_id);
}

function answerKeyFor(itemVersionId: string): string {
  const key = winterFrozenItem(itemVersionId)?.answer.answer_key;
  if (typeof key !== "string") {
    throw new Error(`no text answer key for ${itemVersionId}`);
  }
  return key;
}

/** Mount, declare a fire on a mid-island cell, and stop on question one. */
async function openFirstQuestion(): Promise<HTMLElement> {
  h = mount(<HardWinterSurface readMasteredNodes={allPractised} />);
  await waitFor(() => document.querySelector(".hw-grid") !== null, "the island renders");
  const shell = query<HTMLElement>(".hw-shell");
  findButton(shell, /Light a fire/).click();
  await waitFor(
    () => document.querySelector('.hw-grid [data-cell="-2,-2"]')?.tagName === "BUTTON",
    "the board takes a fire",
  );
  query<HTMLElement>('.hw-grid [data-cell="-2,-2"]').click();
  await waitFor(() => !findButton(shell, /Commit and face/).disabled, "commit arms");
  findButton(shell, /Commit and face/).click();
  await waitFor(
    () => document.querySelector(".hw-panel input") !== null,
    "question one renders its field",
  );
  return shell;
}

/**
 * Answer the question on screen and wait for it to be graded. `right` decides which: a
 * wrong answer is the real key with a marker appended, so it fails through the REAL checker
 * rather than through a short-circuit this test invented.
 */
async function answer(
  shell: HTMLElement,
  itemVersionId: string,
  right: boolean,
): Promise<void> {
  const key = answerKeyFor(itemVersionId);
  await waitFor(
    () => document.querySelector(".hw-panel input") !== null,
    "the answer field renders",
  );
  setInputValue(
    query<HTMLInputElement>(".hw-panel input"),
    right ? key : wrongButReadable(key),
  );
  await waitFor(() => !findButton(shell, "Check").disabled, "Check arms");
  findButton(shell, "Check").click();
  await waitFor(() => document.querySelector(".hw-verdict") !== null, "it is graded");
}

/**
 * The properties that make one rendered solution a real one: the block is there, it states
 * the answer, and the lesson surfaces' own `WorkedSolution` drew a figure inside it with a
 * caption. Asserted as a shape rather than as a class-name check, because a `<div>` with
 * the right class and nothing in it would satisfy a class-name check.
 */
function assertSolutionRendered(panel: HTMLElement, itemVersionId: string): void {
  const solution = panel.querySelector<HTMLElement>(".hw-solution");
  expect(solution, "no solution block on screen").not.toBeNull();
  if (!solution) {
    return;
  }

  const line = solution.querySelector<HTMLElement>(".hw-solution__answer");
  expect(line, "the solution states no answer").not.toBeNull();
  const key = answerKeyFor(itemVersionId);
  expect(
    Array.from(line?.querySelectorAll("[data-latex]") ?? []).some((node) =>
      (node.getAttribute("data-latex") ?? "").includes(key.replace("/", "}{")),
    ) || hasText(line as HTMLElement, key),
    `the answer line does not carry the key ${key}`,
  ).toBe(true);

  // The shared component, and specifically its figure branch: every template the crisis can
  // draw registers a params-driven SVG worked solution, which the census test below pins.
  const worked = solution.querySelector<HTMLElement>(".worked-solution");
  expect(worked, "the shared WorkedSolution did not render").not.toBeNull();
  expect(
    worked?.querySelector(".lesson-visual svg"),
    "the worked solution drew no figure",
  ).not.toBeNull();
  expect(
    (worked?.querySelector("figcaption")?.textContent ?? "").trim().length,
    "the worked solution's figure has no caption",
  ).toBeGreaterThan(0);
  expect(worked?.textContent ?? "").toContain("Worked solution");

  // It is on screen, not merely in the document: a `display: none` block would satisfy
  // every assertion above.
  const box = (worked as HTMLElement).getBoundingClientRect();
  expect(box.width, "the worked solution has no width").toBeGreaterThan(50);
  expect(box.height, "the worked solution has no height").toBeGreaterThan(20);
}

/* ------------------------------------------- 1. the solution, after a miss and after a hit */

test("a wrong answer shows the solution", async () => {
  const shell = await openFirstQuestion();
  const [first] = roundOnePrompts();
  await answer(shell, first as string, false);

  const verdict = query<HTMLElement>(".hw-verdict");
  expect(verdict.dataset.status).toBe("incorrect");
  expect(verdict.textContent).toContain("Not right.");

  assertSolutionRendered(query<HTMLElement>(".hw-panel"), first as string);
});

/**
 * THE OTHER HALF OF THE REQUIREMENT. A player who got it right still benefits from seeing
 * the solution confirmed, and showing it only on a miss turns the appearance of feedback
 * into an accusation.
 */
test("a correct answer shows the solution too", async () => {
  const shell = await openFirstQuestion();
  const [first] = roundOnePrompts();
  await answer(shell, first as string, true);

  const verdict = query<HTMLElement>(".hw-verdict");
  expect(verdict.dataset.status).toBe("correct");
  expect(verdict.textContent).toContain("Right.");

  assertSolutionRendered(query<HTMLElement>(".hw-panel"), first as string);
});

/**
 * Every hue the solution block could carry, so "it carries no correctness colour" is a claim
 * about the whole block rather than about the one property a reviewer thought of.
 *
 * Read off three elements, because the crisis's own stylesheet dresses the outer block and
 * `styles.css` dresses the shared component inside it, and `--figure` then strips the
 * component's border. A comparison over only one of the three would miss a hue applied to
 * either of the others.
 */
function solutionHues(root: ParentNode): Record<string, string> {
  const properties = [
    "color",
    "background-color",
    "border-top-color",
    "border-left-color",
    "border-left-width",
    "border-left-style",
  ] as const;
  const out: Record<string, string> = {};
  for (const selector of [
    ".hw-solution",
    ".hw-solution .hw-solution__answer",
    ".hw-solution .worked-solution",
  ]) {
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) {
      throw new Error(`nothing matched ${selector}`);
    }
    const style = getComputedStyle(el);
    for (const property of properties) {
      out[`${selector} ${property}`] = style.getPropertyValue(property);
    }
  }
  return out;
}

/**
 * The two states are told apart by a GLYPH and a WORD as well as by a colour, so a player
 * who cannot separate the two hues still reads which one happened. The solution block
 * itself carries neither: it appears in both states, and a hue on it would be a fourth
 * meaning next to CIVIC, BRICK and the standing amber.
 */
test("the verdict carries its state as a mark and a word, not only as a colour", async () => {
  const [first] = roundOnePrompts();

  let shell = await openFirstQuestion();
  await answer(shell, first as string, true);
  const hitMark = query<HTMLElement>(".hw-verdict__mark").textContent;
  const hitWord = query<HTMLElement>(".hw-verdict__word").textContent;
  const hitColour = getComputedStyle(query<HTMLElement>(".hw-verdict p")).color;
  const hitHues = solutionHues(document);

  h?.cleanup();
  h = null;
  shell = await openFirstQuestion();
  await answer(shell, first as string, false);
  const missMark = query<HTMLElement>(".hw-verdict__mark").textContent;
  const missWord = query<HTMLElement>(".hw-verdict__word").textContent;
  const missColour = getComputedStyle(query<HTMLElement>(".hw-verdict p")).color;
  const missHues = solutionHues(document);

  expect(hitMark, "the two verdicts share one mark").not.toBe(missMark);
  expect(hitWord, "the two verdicts share one word").not.toBe(missWord);
  expect(hitMark?.trim()).toBe("\u2713");
  expect(missMark?.trim()).toBe("\u2715");
  // The floor: the colours really do differ, so "not only a colour" is a claim about a
  // surface that does use colour rather than one that uses none.
  expect(hitColour).not.toBe(missColour);
  expect(hitColour).toMatch(/\S/);

  // And no fourth meaning: the solution is dressed identically either way, over a
  // fingerprint with a floor under it so an empty read cannot agree with itself.
  expect(Object.keys(hitHues).length).toBeGreaterThanOrEqual(18);
  expect(
    hitHues,
    "the solution changes colour with the verdict, which is a fourth hue meaning",
  ).toEqual(missHues);
});

/* --------------------------------------------- 2. it is feedback, and not a second chance */

test("the solution is feedback and not a retry: no way back into the answer", async () => {
  const shell = await openFirstQuestion();
  const prompts = roundOnePrompts();
  await answer(shell, prompts[0] as string, false);

  const panel = query<HTMLElement>(".hw-panel");
  expect(query<HTMLInputElement>(".hw-panel input").disabled).toBe(true);
  expect(
    panel.querySelector('button[type="submit"]'),
    "the Check button survived the verdict, so the answer can be resubmitted",
  ).toBeNull();

  /*
   * AND THE MISS IS COUNTED ONCE, read off the ROUND'S OWN SCORE rather than off a running tally.
   *
   * This used to assert *"0 of 1 right so far. 2 still to come."* on `.hw-tally`, and that line is
   * gone: it is a tracker of answers taken, which is what the lead asked to be removed from this
   * screen, and the heading two lines above already said which question this was.
   *
   * What the assertion is actually for is that a graded answer is banked exactly once, so it moves
   * to the place that still reports it and reports it better: the round resolves at 2 of 3 after
   * one miss and two hits. A tally could have been right about the first answer and wrong about
   * the total; this cannot.
   */
  findButton(shell, /Next question/).click();
  await waitFor(
    () => document.querySelector(".hw-verdict") === null,
    "the round moves on from the miss",
  );
  expect(
    questionHeading(),
    "the round did not advance, so nothing here is about a banked answer",
  ).toBe("Question 2 of 3");
  expect(query<HTMLInputElement>(".hw-panel input").disabled).toBe(false);
  expect(query<HTMLInputElement>(".hw-panel input").value).toBe("");

  await answer(shell, prompts[1] as string, true);
  findButton(shell, /Next question/).click();
  await answer(shell, prompts[2] as string, true);
  findButton(shell, /See what you earned/).click();
  await waitFor(
    () => document.querySelector(".hw-magnitude") !== null,
    "the last answer resolves the round",
  );
  expect(query<HTMLElement>(".hw-panel h2").textContent).toContain("2 of 3 right");
});

/** The question panel's own heading, which is where the round's position is stated. */
function questionHeading(): string {
  return query<HTMLElement>(".hw-panel h2").textContent ?? "";
}

/* ------------------------------- 3. there is no commit control, and the commit still happens */

/**
 * THE LEAD'S RULING, AND THE RISK IT CARRIES.
 *
 * The button labelled "Resolve" is gone: the crisis has no resolve PHASE for such a control to
 * belong to, so it promised a step that does not exist and appeared to do nothing.
 *
 * But the diagnosis found it was **not inert** — it was the only thing in the app that sent the
 * engine a `resolve`, which is what applies the declared action at the tier the batch earned. So
 * the whole risk in obeying the ruling is stranding that transition and turning a confusing
 * control into an encounter with no way out of `answering`. This test is that risk, asserted
 * from both ends: no control, and the action applied anyway.
 */
test("the last answer resolves the round, with no commit control anywhere", async () => {
  h = mount(<HardWinterSurface readMasteredNodes={allPractised} />);
  await waitFor(() => document.querySelector(".hw-grid") !== null, "the island renders");
  const shell = query<HTMLElement>(".hw-shell");

  // **A REINFORCE WHERE THIS DECLARED A PULL-BACK.** The pull-back needed no cell, so it was the
  // cheapest declaration to drive and it was the one in the report the lead filed; he ruled the
  // action out on 2026-08-02, so a shield on the island's heart stands in. What is under test is
  // the SOLUTION feedback, so the declaration only has to be a real one.
  findButton(shell, /Reinforce a building/).click();
  // The cell has to become a control before it takes a click: the grid only renders a building's
  // cell as a `<button>` once the mode is armed, and clicking the `<div>` it was would arm nothing.
  await waitFor(
    () => document.querySelector(".hw-grid button[data-node]") !== null,
    "a building becomes a target",
  );
  query<HTMLElement>(".hw-grid button[data-node]").click();
  await waitFor(() => !findButton(shell, /Commit and face/).disabled, "commit arms");
  findButton(shell, /Commit and face/).click();

  const prompts = roundOnePrompts();
  for (const [index, id] of prompts.entries()) {
    await answer(shell, id, false);
    const last = index + 1 >= prompts.length;
    findButton(shell, last ? /See what you earned/ : /Next question/).click();

    if (!last) {
      /*
       * THE MID-BATCH SWEEP IS WHERE THIS CLAIM BITES, and saying so is worth a line, because
       * the sweep after resolution below cannot bite on its own: the "all answered" state the
       * button used to live in no longer exists at all, so a control re-added there would be
       * unreachable and a check that only looked after the fact would pass over it. Injecting a
       * resolve control into the question panel — the one place a regression could now put one
       * and be seen — fails here.
       */
      expect(
        document.querySelector('[data-testid="hw-resolve"]'),
        "a commit control appeared mid-batch",
      ).toBeNull();
      for (const button of Array.from(shell.querySelectorAll("button"))) {
        expect(
          (button.textContent ?? "").toLowerCase(),
          "a button offers to resolve while the batch is still running",
        ).not.toContain("resolve");
      }
    }
  }

  // THE TRANSITION HAPPENED, on the last answer and with nothing else pressed: the resolved
  // panel is the engine's `resolved` phase, and its magnitude line is `applyResolution`'s own
  // output at the tier these three misses earned.
  await waitFor(
    () => document.querySelector(".hw-magnitude") !== null,
    "the last answer resolves the round",
  );
  const panel = query<HTMLElement>(".hw-panel");
  expect(panel.textContent).toContain("0 of 3 right, so this is what you earned");
  expect(panel.textContent).toContain("It does nothing at all.");
  // A miss is still not a dead end: the acknowledgement moved onto this panel with the score.
  expect(panel.textContent).toContain("Each question showed you its solution as you went.");
  // And the round is closable, which is the transition the player does still own.
  expect(findButton(query<HTMLElement>(".hw-shell"), /Let the frost advance/)).toBeTruthy();

  // AND NO CONTROL. Not "no test id": no button anywhere in the shell whose name promises a
  // resolution step, because renaming the button would satisfy a test-id check.
  const wholeShell = query<HTMLElement>(".hw-shell");
  expect(
    wholeShell.querySelector('[data-testid="hw-resolve"]'),
    "the commit control is back",
  ).toBeNull();
  for (const button of Array.from(wholeShell.querySelectorAll("button"))) {
    expect(
      (button.textContent ?? "").toLowerCase(),
      "a button on the surface still offers to resolve",
    ).not.toContain("resolve");
  }
});

/**
 * The same claim on the other declaration shape, because a fire is the one whose magnitude is
 * geometry: the tier decides a radius, and the resolved panel reports the ward the engine
 * actually built. A stranded transition would leave the board with no fire on it.
 */
test("a perfect batch lights the fire on its last answer, at the earned size", async () => {
  const shell = await openFirstQuestion();
  const prompts = roundOnePrompts();
  for (const [index, id] of prompts.entries()) {
    await answer(shell, id, true);
    findButton(
      shell,
      index + 1 >= prompts.length ? /See what you earned/ : /Next question/,
    ).click();
  }

  await waitFor(
    () => document.querySelector(".hw-magnitude") !== null,
    "the last answer resolves the round",
  );
  expect(query<HTMLElement>(".hw-panel").textContent).toContain(
    "3 of 3 right, so this is what you earned",
  );
  const held = /It holds (\d+) cells\./.exec(
    query<HTMLElement>(".hw-magnitude").textContent ?? "",
  )?.[1];
  expect(held, "the fire was never lit").toBeDefined();
  expect(Number(held)).toBeGreaterThan(0);
  // The board agrees with the panel: the engine really applied the action rather than the
  // surface merely printing a sentence about it.
  expect(document.querySelectorAll(".hw-grid .hw-cell--warded")).toHaveLength(Number(held));
});

/* ------------------------------------------------------------- 4. it fits, at four sizes */

/**
 * THE `.coc-card` SHAPE, CHECKED HERE. #303 found the ceremony's card capped at `80vh` with
 * `overflow: visible`, so on a shorter laptop its answer row was drawn outside the card
 * entirely. The crisis has the same ingredients — a tall rail beside a sticky board — and
 * this pass adds the tallest block on that rail, so the question is measured rather than
 * assumed at both heights the report named and both widths the brief did.
 */
for (const viewport of [
  { width: 460, height: 800 },
  { width: 460, height: 720 },
  { width: 920, height: 800 },
  { width: 920, height: 720 },
] as const) {
  test(`the solution stays inside its panel at ${viewport.width}x${viewport.height}`, async () => {
    await page.viewport(viewport.width, viewport.height);
    try {
      const shell = await openFirstQuestion();
      await answer(shell, roundOnePrompts()[0] as string, false);

      const panel = query<HTMLElement>(".hw-panel");
      const solution = query<HTMLElement>(".hw-solution");
      const panelBox = panel.getBoundingClientRect();
      const solutionBox = solution.getBoundingClientRect();

      // Inside the panel it belongs to, on every edge. A block hanging off the bottom is
      // exactly the defect #303 measured, and one hanging off the right is the 460px case.
      expect(
        solutionBox.left,
        "the solution starts left of its panel",
      ).toBeGreaterThanOrEqual(panelBox.left - 1);
      expect(solutionBox.right, "the solution runs past its panel").toBeLessThanOrEqual(
        panelBox.right + 1,
      );
      expect(solutionBox.bottom, "the solution hangs below its panel").toBeLessThanOrEqual(
        panelBox.bottom + 1,
      );

      // And the page itself does not scroll sideways at either width.
      expect(
        document.documentElement.scrollWidth,
        "the shell overflows horizontally",
      ).toBeLessThanOrEqual(viewport.width + 1);
    } finally {
      await page.viewport(DESKTOP.width, DESKTOP.height);
    }
  });
}
