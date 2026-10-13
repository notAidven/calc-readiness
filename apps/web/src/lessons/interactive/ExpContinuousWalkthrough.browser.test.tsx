import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { ExpContinuousWalkthrough } from "./ExpContinuousWalkthrough";

/**
 * A walkthrough still has to be answered. The splits are stepped through first, and only the
 * last step puts the question on screen, so the gate cannot open on someone who pressed Step
 * until the animation ran out: it opens on the exponent of $e$, which is the rate multiplied
 * by the time rather than either of them alone.
 */
function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("the question is not on screen yet");
  }
  return box;
}

/** Walk to the last stage, where the formula and its blank exponent are laid out. */
async function walkToTheQuestion(host: HTMLElement): Promise<void> {
  for (let step = 0; step < 5; step += 1) {
    findButton(host, "Step").click();
  }
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the question lands",
  );
}

/** Every diagram label whose LaTeX carries `fragment`, in document order. */
function labels(host: HTMLElement, fragment: string): Element[] {
  return Array.from(host.querySelectorAll("foreignObject[data-latex]")).filter((node) =>
    (node.getAttribute("data-latex") ?? "").includes(fragment),
  );
}

/**
 * The vertical band a label's glyphs actually occupy, measured over its text nodes.
 *
 * Three other boxes were tried here first and all three lie about a stacked fraction. The
 * `foreignObject` is three times the font by design, so it overlaps at any pitch. The `.katex`
 * span reports one line-height (18.8px for a row whose glyphs span 46.4px), because the
 * fraction is built from vlists that overflow it, which is how this guard first passed at the
 * very pitch it was written to catch. And the union of the descendant elements picks up KaTeX's
 * `pstrut` spacers, which are zero-width but tall, and reports 83.8px for the same row. A range
 * over the text nodes measures the ink and nothing else.
 */
function inkBand(node: Element): { top: number; bottom: number; height: number } {
  const root = node.querySelector(".katex-html");
  if (!root) {
    throw new Error(`nothing typeset in "${node.getAttribute("data-latex")}"`);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
    if ((text.textContent ?? "").trim() === "") {
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(text);
    const box = range.getBoundingClientRect();
    if (box.height === 0) {
      continue;
    }
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.bottom);
  }
  if (!Number.isFinite(top)) {
    throw new Error(`no glyphs measured in "${node.getAttribute("data-latex")}"`);
  }
  return { top, bottom, height: bottom - top };
}

/** Every `data-latex` on the board, in document order. */
function latexes(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
}

/** The accessible name of the board, which is the only place a screen reader hears the ladder. */
function boardLabel(host: HTMLElement): string {
  const svg = host.querySelector("svg[aria-label]");
  if (!svg) {
    throw new Error("the board carries no accessible name");
  }
  return svg.getAttribute("aria-label") ?? "";
}

/** One rung of the ladder, read back off the row the learner is looking at. */
interface Rung {
  latex: string;
  rate: number;
  times: number;
  /** True where the row claims the value is EXACT rather than rounded. */
  claimsExact: boolean;
  printed: string;
}

const RUNG =
  /^\\left\(1 \+ \\dfrac\{([\d.]+)\}\{(\d+)\}\\right\)\^\{(\d+)\} (=|\\approx) ([\d.]+)$/;
const CEILING = /^\\text\{ceiling: \} e\^\{([\d.]+)\} \\approx ([\d.]+)$/;

/**
 * The same number, written to the precision the board wrote it to.
 *
 * A row printing four decimals is claiming four, so it is compared at four: recomputing to
 * full precision and comparing loosely would accept the digit that is wrong.
 */
function atPrintedPrecision(value: number, printed: string): string {
  return value.toFixed((printed.split(".")[1] ?? "").length);
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpContinuousWalkthrough asks nothing until the splits have been walked", async () => {
  let completed = 0;
  h = mount(<ExpContinuousWalkthrough onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "controls mount");

  expect(
    host.querySelector("input.lesson-interactive__input"),
    "no question on the opening stage",
  ).toBeNull();
  expect(hasText(host, "Press Play or Step")).toBe(true);

  // One split at a time, and each is a coarser version of the same year's growth.
  findButton(host, "Step").click();
  await waitFor(() => hasMath(host, "\\right)^{1}"), "the first split is printed");
  expect(completed, "stepping through an animation is not an answer").toBe(0);

  await walkToTheQuestion(host);
  expect(completed).toBe(0);
});

test("ExpContinuousWalkthrough gates on the exponent of e, not on the rate", async () => {
  let completed = 0;
  h = mount(<ExpContinuousWalkthrough onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "controls mount");
  await walkToTheQuestion(host);

  // The first round is 50 percent a year over 6 years, so the exponent is 3. The rate on its
  // own is the answer a learner gives by reading `e^{rt}` as `e^{r}`.
  setInputValue(entry(host), "0.5");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "rate multiplied by the time"),
    "the bare rate is refused",
  );
  expect(completed).toBe(0);

  setInputValue(entry(host), "3");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "gates on the exponent");
  expect(hasMath(host, "300e^{3}")).toBe(true);
});

/**
 * Each split row is a `\dfrac` inside a `\left(\right)` carrying an exponent, which is taller
 * than a line of algebra. On the fixed 26 pitch the rows shipped with, the exponent of one row
 * was drawn through the denominator of the row above it, all the way down the stack: four
 * readings the slide is entirely about, laid on top of each other.
 *
 * A pitch is a number in the source, so only a browser can say whether it clears the ink it is
 * spacing. The gaps are checked against a row's own height rather than a pixel count, because
 * the SVG is scaled to whatever width its container has and a pixel floor would be an assertion
 * about the viewport instead of the layout.
 */
test("ExpContinuousWalkthrough keeps the split rows clear of one another", async () => {
  h = mount(<ExpContinuousWalkthrough />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "controls mount");
  await walkToTheQuestion(host);
  await waitFor(() => labels(host, "right)^").length >= 4, "every split is typeset");

  const rows = labels(host, "right)^");
  // A floor under the pairwise claim below, which holds trivially over a single row.
  expect(rows.length, "the board lays out four splits").toBeGreaterThanOrEqual(4);

  const bands = rows.map(inkBand);
  for (const [at, band] of bands.entries()) {
    expect(
      band.height,
      `split "${rows[at]?.getAttribute("data-latex")}" measured no ink`,
    ).toBeGreaterThan(0);
  }

  for (let at = 1; at < bands.length; at += 1) {
    const above = bands[at - 1] as { bottom: number; height: number };
    const below = bands[at] as { top: number };
    expect(
      below.top - above.bottom,
      `splits "${rows[at - 1]?.getAttribute("data-latex")}" and "${rows[at]?.getAttribute("data-latex")}" overlap`,
    ).toBeGreaterThan(above.height * 0.05);
  }

  // The ceiling is the reading the whole ladder builds toward, and its divider is drawn just
  // above it, so it has to start below the last split rather than inside it.
  const ceiling = labels(host, "ceiling")[0];
  if (!ceiling) {
    throw new Error("the ceiling is not named once the splits are laid out");
  }
  expect(
    inkBand(ceiling).top - (bands[bands.length - 1] as { bottom: number }).bottom,
    "the ceiling line is drawn into the last split",
  ).toBeGreaterThan(0);
});

/**
 * Every number the ladder prints, recomputed from the parameters printed beside it.
 *
 * The monthly rung of the 50 percent round shipped reading $1.6319$ where
 * $(1 + 0.5/12)^{12}$ is $1.63209413$, so the one row a learner is asked to believe about
 * splitting a year twelve ways was wrong in its last digit. Eleven rungs and both ceilings
 * were right, which is why reading is no defence here: a transcription slip inside a correct
 * convention looks exactly like the rest of the column.
 *
 * So nothing is compared against a written-down expectation. Each row is PARSED for its own
 * rate and its own number of splits, the value is recomputed from those two, and it is
 * compared at the precision the row itself printed to. The relation symbol is checked as the
 * claim it is: a row saying `=` has to be exact and a row saying `\approx` must not be.
 *
 * Both surfaces are read, because the value appears twice and only one of them is on screen:
 * the row a sighted learner reads, and the `aria-label` a screen reader hears. The rounds are
 * both walked, since a mount serves one of them and the wrong digit was in the first.
 */
test("ExpContinuousWalkthrough prints a ladder that recomputes from its own parameters", async () => {
  h = mount(<ExpContinuousWalkthrough />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "controls mount");

  let rungsChecked = 0;
  let ceilingsChecked = 0;
  const ratesSeen: number[] = [];

  for (let round = 0; round < 2; round += 1) {
    await walkToTheQuestion(host);
    await waitFor(
      () => latexes(host).some((latex) => CEILING.test(latex)),
      "the ceiling is named",
    );

    const spoken = boardLabel(host);
    const rungs: Rung[] = [];
    for (const latex of latexes(host)) {
      const parsed = RUNG.exec(latex);
      if (parsed === null) {
        continue;
      }
      rungs.push({
        latex,
        rate: Number(parsed[1]),
        times: Number(parsed[2]),
        claimsExact: parsed[4] === "=",
        printed: parsed[5] as string,
      });
      // The denominator and the exponent are the same split, so a row that lost one of them
      // would be recomputed against the other and agree with itself.
      expect(Number(parsed[2]), `"${latex}" splits and powers by different amounts`).toBe(
        Number(parsed[3]),
      );
    }

    expect(
      rungs.length,
      `round ${round + 1} printed no full ladder`,
    ).toBeGreaterThanOrEqual(4);

    for (const rung of rungs) {
      const value = (1 + rung.rate / rung.times) ** rung.times;
      expect(
        rung.printed,
        `"${rung.latex}" prints ${rung.printed} where (1 + ${rung.rate}/${rung.times})^${rung.times} is ${value}`,
      ).toBe(atPrintedPrecision(value, rung.printed));
      if (rung.claimsExact) {
        expect(Number(rung.printed), `"${rung.latex}" says = for a rounded value`).toBe(
          value,
        );
      } else {
        expect(
          Number(rung.printed),
          `"${rung.latex}" says approximately for an exact value`,
        ).not.toBe(value);
      }
      expect(
        spoken,
        `the board says ${rung.printed} and is announced as "${spoken}"`,
      ).toContain(rung.printed);
      rungsChecked += 1;
    }

    const ceiling = latexes(host)
      .map((latex) => CEILING.exec(latex))
      .find((parsed) => parsed !== null);
    if (!ceiling) {
      throw new Error(`round ${round + 1} named no ceiling`);
    }
    const rate = Number(ceiling[1]);
    const printedCeiling = ceiling[2] as string;
    expect(
      printedCeiling,
      `the ceiling prints ${printedCeiling} where e^${rate} is ${Math.exp(rate)}`,
    ).toBe(atPrintedPrecision(Math.exp(rate), printedCeiling));
    expect(spoken, "the ceiling is not announced").toContain(printedCeiling);
    // Every rung on this board is a split of the SAME rate the ceiling is taken at, so a
    // ladder climbing toward somebody else's ceiling is caught here rather than by eye.
    for (const rung of rungs) {
      expect(rung.rate, `"${rung.latex}" is not a split of the ceiling's rate`).toBe(rate);
    }
    ratesSeen.push(rate);
    ceilingsChecked += 1;

    if (round === 0) {
      // Reach the second round the way a learner does, without knowing its answer: attempt,
      // take the reveal, and start over. The rate has to MOVE, or the loop measured one board
      // twice and the floors below would be satisfied by a single ladder counted again.
      setInputValue(entry(host), "0");
      findButton(host, "Check").click();
      await waitFor(() => host.querySelector("button") !== null, "the attempt lands");
      findButton(host, "Reveal answer").click();
      await waitFor(
        () => host.querySelector(".lesson-interactive__reset") !== null,
        "the round can be restarted",
      );
      findButton(host, "Start over on a different rate").click();
      await waitFor(
        () => host.querySelector("input.lesson-interactive__input") === null,
        "the next round opens on its first stage",
      );
    }
  }

  expect(
    rungsChecked,
    "the sweep measured fewer rungs than one board holds",
  ).toBeGreaterThanOrEqual(8);
  expect(ceilingsChecked, "a ceiling went unchecked").toBe(2);
  expect(new Set(ratesSeen).size, "both rounds ran at the same rate").toBe(2);
});
