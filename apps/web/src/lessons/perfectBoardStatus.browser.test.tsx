/**
 * A BOARD ANSWERED PERFECTLY SAYS SO IN THE COLOUR IT KEEPS FOR THAT.
 *
 * `BothPansBuilder` is the one board in LIN.1's pack whose two parts are separately winnable,
 * and its conclusion line was rendered as
 * `data-state={settled && !called ? "solved" : "prompt"}`, with
 * `called = gatheredVerdict !== null && answerVerdict !== null` and
 * `settled = gatheredDone && answerDone`. Both parts finish only by taking a verdict — `right`
 * on a correct check, `wrong` on a reveal — so `settled` implies `called` on every path and
 * `settled && !called` is never true. A learner who got both parts right first time read their
 * conclusion in the neutral prompt colour, and the solved state was unreachable code.
 *
 * The term that was meant is the miss: `!missed`. Its siblings all say
 * `data-state={solved ? "solved" : ...}` — `AbsUnionBuilder`, `AbsBranchBuilder`,
 * `InequalityEndpointDrag` — and on a board where a part can be finished by a reveal, the
 * question "was any of it handed over" is exactly what separates the two colours.
 *
 * ## Both directions, because one of them is what makes the other mean anything
 *
 * A test that only asked for `solved` on a perfect board would pass on the constant `"solved"`,
 * which would then paint a board that was half revealed in the success colour. So the reveal
 * path is driven beside it and must NOT come back solved.
 *
 * ## The frame
 *
 * The claim is about what a learner sees, so a computed colour is asserted AND a frame is
 * written out at 1024x580 — a short, realistic reviewer's window rather than a tall developer
 * monitor — and looked at. The colour assertion is on the two states being DIFFERENT and on the
 * solved one matching the token the stylesheet reserves for it, neither of which a hue edit
 * elsewhere can quietly satisfy.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport the frame below is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * Board one is $7x - 4 = 2x + 11$: seven ingots against two leaves five, and the five weigh
 * $11 - (-4) = 15$ between them, so one weighs three.
 */
const GATHERED = "5";
const ONE_INGOT = "3";

let h: Harness | null = null;

beforeAll(async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function widget(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    throw new Error("no widget mounted");
  }
  return found;
}

function partRow(host: HTMLElement, part: string): HTMLElement {
  const found = widget(host).querySelector<HTMLElement>(`[data-part-row="${part}"]`);
  if (found === null) {
    throw new Error(`no "${part}" row on the board`);
  }
  return found;
}

function status(host: HTMLElement): HTMLElement {
  const found = widget(host).querySelector<HTMLElement>(".lesson-interactive__status");
  if (found === null) {
    throw new Error("the board prints no status line");
  }
  return found;
}

function verdictOf(host: HTMLElement, part: string): string | null {
  return (
    partRow(host, part).querySelector("[data-verdict]")?.getAttribute("data-verdict") ??
    null
  );
}

/** Type into one part's box and check it. */
async function answer(host: HTMLElement, part: string, value: string) {
  const box = partRow(host, part).querySelector<HTMLInputElement>("input");
  if (box === null) {
    throw new Error(`the "${part}" row has no box`);
  }
  setInputValue(box, value);
  const check = partRow(host, part).querySelector<HTMLButtonElement>(
    ".lesson-interactive__check",
  );
  if (check === null) {
    throw new Error(`the "${part}" row has no check control`);
  }
  check.click();
  await waitFor(() => verdictOf(host, part) !== null, `the "${part}" row was never judged`);
}

async function board(width: string): Promise<HTMLElement> {
  h = mount(
    <div style={{ width, margin: "12px auto" }}>
      <LessonVisual id="both-pans-builder" onComplete={() => {}} onReopen={() => {}} />
    </div>,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );
  const typeset = Array.from(widget(host).querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  expect(typeset, "board one is not the weighing this test was written against").toContain(
    "7x - 4 = 2x + 11",
  );
  return host;
}

test("both-pans-builder: a board answered right on both parts prints its conclusion solved", async () => {
  const host = await board("620px");

  // The prompt state, read before anything is answered, so the comparison below is against a
  // colour this board really does use rather than against a constant written down here.
  const promptColour = getComputedStyle(status(host)).color;
  expect(
    status(host).getAttribute("data-state"),
    "an untouched board is not prompting",
  ).toBe("prompt");

  await answer(host, "ingots left", GATHERED);
  expect(verdictOf(host, "ingots left"), "the gathered count was refused").toBe("right");
  await answer(host, "one ingot", ONE_INGOT);
  expect(verdictOf(host, "one ingot"), "the ingot weight was refused").toBe("right");

  await waitFor(
    () => (status(host).textContent ?? "").includes("finishes at"),
    "the finished board never printed its conclusion",
  );

  // THE CLAIM.
  expect(
    status(host).getAttribute("data-state"),
    "a board answered right on both parts prints its conclusion in the prompt state",
  ).toBe("solved");

  // And the state is not decorative: it is carried in a colour, and it is a different colour.
  const solvedColour = getComputedStyle(status(host)).color;
  expect(
    solvedColour,
    "the solved conclusion is painted in the same colour as the standing prompt",
  ).not.toBe(promptColour);
  expect(
    solvedColour,
    "the solved conclusion is not in the token the stylesheet reserves for it",
  ).toBe(
    getComputedStyle(document.documentElement).getPropertyValue("--civic-dark").trim(),
  );
});

/**
 * Board two is $6x + 5 = 2x + 29$: four ingots left, weighing $24$ between them, so one weighs
 * six. It is where the reveal can actually finish a part, because the FIRST reveal on any
 * board teaches and re-asks by contract and only a reveal on a REDRAWN instance runs the
 * widget's own `revealGathered`.
 */
const BOARD_TWO_ONE_INGOT = "6";

test("both-pans-builder: a board with a part handed over does not print solved", async () => {
  const host = await board("620px");
  const reveal = () =>
    host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
  const passage = () => host.querySelector(".lesson-interactive__reveal");

  // Instance one exists only to spend the first reveal, which teaches and re-asks.
  await answer(host, "ingots left", "9");
  expect(verdictOf(host, "ingots left"), "a wrong gathered count was accepted").toBe(
    "wrong",
  );
  await waitFor(() => reveal() !== null, "the missed part offers no working to read");
  (reveal() as HTMLButtonElement).click();
  await waitFor(() => passage() !== null, "the first reveal opens");
  (host.querySelector(".lesson-interactive__reask-button") as HTMLButtonElement).click();
  await waitFor(
    () =>
      Array.from(widget(host).querySelectorAll("[data-latex]"))
        .map((node) => node.getAttribute("data-latex") ?? "")
        .includes("6x + 5 = 2x + 29"),
    "a fresh weighing is dealt",
  );

  // On the redrawn board, miss the gathered count again and take the reveal that RESOLVES it:
  // the part is now finished, and finished by the reveal rather than by the learner.
  await answer(host, "ingots left", "9");
  await waitFor(() => reveal() !== null, "the missed part offers no working to read");
  (reveal() as HTMLButtonElement).click();
  await waitFor(() => passage() !== null, "the second reveal opens");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reask-button") === null,
    "the reveal on the redrawn instance is still holding the board",
  );
  await waitFor(
    () => partRow(host, "ingots left").querySelector("input")?.readOnly === true,
    "the reveal never finished the part it explained",
  );
  expect(
    verdictOf(host, "ingots left"),
    "a handed-over part is recorded as the learner's",
  ).toBe("wrong");

  // The learner finishes the rest themselves, which is exactly the case that must NOT read as
  // a clean run: one of the two answers on this board was given to them.
  await answer(host, "one ingot", BOARD_TWO_ONE_INGOT);
  expect(verdictOf(host, "one ingot"), "the ingot weight was refused").toBe("right");
  await waitFor(
    () => (status(host).textContent ?? "").includes("finishes at"),
    "the finished board never printed its conclusion",
  );
  expect(
    status(host).getAttribute("data-state"),
    "a board with a part handed to the learner still reports a clean run",
  ).not.toBe("solved");
});

/* --------------------------------------------------------------------------- the frame */

/**
 * Where this test's viewport sits inside the real browser window. Vitest scales its tester
 * iframe when the requested viewport does not match the window, so a clip written in the
 * requested viewport's pixels lands somewhere else on the real screen.
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

/** One frame of the whole viewport, captured over CDP and clipped to where that viewport is. */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.png`, shot.data, { encoding: "base64" });
  }
}

test("both-pans-builder: a frame of the perfectly answered board, at 1024x580", async () => {
  const host = await board("620px");
  await answer(host, "ingots left", GATHERED);
  await answer(host, "one ingot", ONE_INGOT);
  await waitFor(
    () => status(host).getAttribute("data-state") === "solved",
    "the frame was taken before the board reached the state it is about",
  );
  await shoot(`d3-both-pans-solved-${VIEWPORT.width}x${VIEWPORT.height}`);
});
