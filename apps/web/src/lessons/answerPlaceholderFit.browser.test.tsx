/**
 * A placeholder that teaches input syntax has to be READABLE to teach it.
 *
 * PR #164 found a RAD.4 widget field giving 126px to a placeholder needing 132px, which ate the
 * closing `|` of `e.g. m^2 or |m|` and would have taught learners to type an unbalanced
 * expression. `widgetPlaceholderFit.browser.test.tsx` guards that one widget. This guards the
 * OTHER family, which nobody had measured: the shared answer-format placeholders that
 * `practicePlaceholder` / `cfuPlaceholder` hand to the three answer-entry surfaces.
 *
 * Two of them were clipped. In the real 460px card the field resolves to 312.8px of content
 * box, and `POSITIVE_EXPONENT_PLACEHOLDER` needed 393.8px while `VARIABLE_RADICAL_PLACEHOLDER`
 * needed 471.9px — the latter losing the `abs(x) or |x|` tail it exists to teach, on both the
 * RAD.4 practice field and the RAD.4 CFU. So the guard measures painted text against the box
 * that has to hold it rather than pinning a width, and it runs over EVERY placeholder in the
 * module, so a new one cannot be added without being measured.
 *
 * It measures with HEADROOM rather than to the edge, and that is the half of this guard that
 * was learned the hard way. Its first version asserted `needed <= available` and passed on the
 * machine it was written on at 278px against 313px — then failed on the first CI run it ever
 * had, at 310px against 309px, on two strings nobody had changed. Same strings, same
 * stylesheet, different `system-ui`. An assertion sitting on the boundary of a quantity that
 * moves 19% between font fallbacks is a coin toss, so {@link FIT_HEADROOM} moves the bound off
 * the boundary and the control below pins that the margin is real.
 *
 * Real Chromium and the real stylesheet are both required: jsdom has no layout, and the font
 * and padding for these fields live in `styles.css`.
 */

import { expect, test } from "vitest";
import { page } from "vitest/browser";

import * as answerFormat from "./answerFormat";
import { GENERIC_PLACEHOLDER, POSITIVE_EXPONENT_PLACEHOLDER } from "./answerFormat";
import { LessonCfu } from "./cfu";
import { d2LessonByNode } from "./d2";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { mount, waitFor } from "./testHarness";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * How much of the field a placeholder has to leave EMPTY. Fitting is not enough, because the
 * width of a placeholder is not a property of the string: it is a property of the string and
 * the machine, and this suite gates on a different machine from the one it is written on.
 *
 * `styles.css` ships no `@font-face`, so `--font-body` falls all the way through
 * `"Nunito Variable"` and `Nunito` to whatever the machine's `system-ui` resolves. These two
 * strings were measured in every family a desktop plausibly lands on, all at 16px/400:
 *
 *                   INTERVAL   MULTIPLE_CHOICE
 *   DejaVu Sans        310.0        311.0    <- ubuntu-latest, i.e. THIS suite on CI
 *   Inter              288.8        291.4
 *   Noto Sans          278.4        291.6    <- a Linux dev box
 *   Liberation / Arimo 268.5        272.2
 *   Cantarell          261.5        273.5
 *   FreeSans           260.1        261.2
 *
 * The fallbacks span **+19.2%** and **+19.1%** end to end, which is where the 20% comes from,
 * and the field itself shrinks 4px as the font grows (it is `flex: 1` beside a Check button
 * that grows with it) so the two quantities move against each other. A placeholder inside this
 * budget on any fallback fits outright on all of them.
 *
 * What it does NOT cover, stated because a margin claiming more than it does is worse than a
 * named gap: **Nunito itself** is narrower again (254.6 / 247.5), so a machine that really has
 * the intended font sits up to 25.7% below the CI runner, and no budget these strings can meet
 * closes that — `VARIABLE_RADICAL_PLACEHOLDER` at 245.1px is already nothing but the three
 * literals it has to advertise. The run of this suite on the widest fallback is what covers
 * the residual, which is the reason a local pass is not the evidence here.
 *
 * This is a floor and not a target. Raising it is the same mistake as widening the field:
 * if a placeholder does not fit, shorten the placeholder.
 */
const FIT_HEADROOM = 0.2;

/** The width a placeholder must come in under, given the field it has to sit in. */
function budgetFor(available: number): number {
  return available / (1 + FIT_HEADROOM);
}

/** The width the browser would paint `text` at, in the font the element actually resolved. */
function paintedWidth(el: HTMLElement, text: string): number {
  const style = getComputedStyle(el);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no 2d context to measure text with");
  }
  // Built from the resolved longhands rather than `style.font`, which some engines leave
  // empty when the shorthand was never authored.
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText(text).width;
}

/** The space inside the borders and padding: what the placeholder actually gets. */
function contentWidth(el: HTMLElement): number {
  const style = getComputedStyle(el);
  return (
    el.getBoundingClientRect().width -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight) -
    Number.parseFloat(style.borderLeftWidth) -
    Number.parseFloat(style.borderRightWidth)
  );
}

async function field(host: HTMLElement): Promise<HTMLInputElement> {
  await waitFor(
    () => host.querySelector("input[type='text']") !== null,
    "the answer field mounts",
  );
  const input = host.querySelector<HTMLInputElement>("input[type='text']");
  if (!input) {
    throw new Error("no answer field");
  }
  return input;
}

/** The real EXP.1 check-your-understanding card, at the real card width. */
async function exp1Card() {
  const cfu = d2LessonByNode["EXP.1"]?.cfu;
  if (!cfu) {
    throw new Error("the D2 pack has no EXP.1 CFU");
  }
  // No padding on the wrapper: `max-width: 460px` IS the card box, so anything added here
  // would measure a narrower field than the learner gets.
  const harness = mount(
    <div style={{ width: FIGURE_CONTENT_CAP, background: "#fff" }}>
      <LessonCfu cfu={cfu} nodeId="EXP.1" />
    </div>,
  );
  return { harness, input: await field(harness.host) };
}

/**
 * Every placeholder a text answer field can be handed, DERIVED from the module rather than
 * listed here, so a new one cannot be added without its width being measured.
 *
 * It was a hand-written list of twenty until the dispatch grew four more lines, and a list is
 * the wrong shape for the claim in the header: "it runs over EVERY placeholder in the module"
 * was true only for as long as someone remembered to type the next one in. Reading the module's
 * own exports makes that sentence self-enforcing — the naming convention is the contract, and
 * the census below fails if it stops holding.
 *
 * The two `rational_answer` fields are in here for a second reason worth keeping: they SHARE
 * one row with the Check button, which makes theirs the narrowest box of the lot.
 */
const PLACEHOLDERS: readonly (readonly [string, string])[] = Object.entries(
  answerFormat as Record<string, unknown>,
)
  .flatMap(([name, value]) =>
    name.endsWith("_PLACEHOLDER") && typeof value === "string"
      ? [[name, value] as const]
      : [],
  )
  .sort(([left], [right]) => left.localeCompare(right));

test("measures every placeholder the module exports", () => {
  // A floor, because the filter above returns [] just as quietly if the convention changes.
  expect(PLACEHOLDERS.length).toBeGreaterThan(19);
  // And a shape check, because a floor cannot tell 24 placeholders from 24 of something else.
  for (const [name, text] of PLACEHOLDERS) {
    expect(text.length, `${name} is empty`).toBeGreaterThan(0);
  }
  // The five lines the key-derived tags added, named so the derivation cannot lose them
  // silently the way the hand-written list would have.
  expect(PLACEHOLDERS.map(([name]) => name)).toEqual(
    expect.arrayContaining([
      "EXPONENT_NOTATION_PLACEHOLDER",
      "FRACTION_BAR_PLACEHOLDER",
      "IMPLICIT_PRODUCT_PLACEHOLDER",
      "RATIONAL_POLYNOMIAL_PLACEHOLDER",
      "SOLUTION_SET_FRACTION_PLACEHOLDER",
    ]),
  );
});

test("every answer-format placeholder fits the field that has to hold it at 460px", async () => {
  const { harness, input } = await exp1Card();
  const available = contentWidth(input);
  expect(
    available,
    "the field measured as nothing, so the comparison proves nothing",
  ).toBeGreaterThan(0);
  const budget = budgetFor(available);

  const clipped: string[] = [];
  const tight: string[] = [];
  for (const [name, text] of PLACEHOLDERS) {
    const needed = paintedWidth(input, text);
    expect(needed, `${name} measured as nothing`).toBeGreaterThan(0);
    if (needed > available) {
      clipped.push(`${name} needs ${needed.toFixed(1)}px`);
    } else if (needed > budget) {
      tight.push(`${name} needs ${needed.toFixed(1)}px`);
    }
  }
  // Non-empty, so the sweep above cannot pass by measuring nothing at all.
  expect(PLACEHOLDERS.length).toBeGreaterThan(10);
  expect(
    clipped.join("; "),
    `the field gives ${available.toFixed(1)}px; these are clipped`,
  ).toBe("");
  // Reported separately from the clipped list because they are a different problem with the
  // same cause: these fit THIS machine's font and are the ones a font change would clip.
  expect(
    tight.join("; "),
    `the field gives ${available.toFixed(1)}px, so with ${FIT_HEADROOM * 100}% headroom a placeholder gets ${budget.toFixed(1)}px; these fit here and would clip on a wider font`,
  ).toBe("");

  harness.cleanup();
});

/**
 * The negative control for the budget above. A margin nobody can trip is not a margin, and a
 * bound that only rejects what the plain field width already rejected has added nothing.
 *
 * So this takes the widest placeholder there IS, lengthens it a character at a time, and
 * pins that the first length the budget refuses is still comfortably inside the field. That
 * band — refused here, accepted by `needed > available` — is the entire margin, and it has to
 * be non-empty for the sweep above to be measuring anything the old assertion did not.
 */
test("the headroom budget refuses a lengthened placeholder the field would still hold", async () => {
  const { harness, input } = await exp1Card();
  const available = contentWidth(input);
  const budget = budgetFor(available);

  // The widest placeholder the budget ALLOWS, so the band is measured from its own top edge
  // and the control keeps working while the sweep above is red for some other reason.
  const allowed = PLACEHOLDERS.filter(([, text]) => paintedWidth(input, text) <= budget);
  expect(allowed.length, "no placeholder is inside the budget to lengthen").toBeGreaterThan(
    0,
  );
  const widest = allowed.reduce((longest, entry) =>
    paintedWidth(input, entry[1]) >= paintedWidth(input, longest[1]) ? entry : longest,
  );
  let lengthened = widest[1];
  while (paintedWidth(input, lengthened) <= budget) {
    lengthened += "x";
  }

  const needed = paintedWidth(input, lengthened);
  expect(lengthened.length).toBeGreaterThan(widest[1].length);
  expect(needed, "the budget accepted a string it was supposed to refuse").toBeGreaterThan(
    budget,
  );
  expect(
    needed,
    `lengthening ${widest[0]} clipped the field before it broke the budget, so the budget is not a margin`,
  ).toBeLessThan(available);

  harness.cleanup();
});

/**
 * The reported screenshot, at the width the learner sees it. Both halves matter: the field has
 * to CARRY the guidance, and the guidance has to FIT — a clipped `1/a^5` would teach a broken
 * fraction the same way a clipped `|m` taught an unbalanced bar.
 */
test("the EXP.1 CFU field carries its exponent guidance, unclipped, at 460px", async () => {
  const { harness, input } = await exp1Card();

  expect(input.placeholder).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
  const needed = paintedWidth(input, input.placeholder);
  const available = contentWidth(input);
  expect(needed).toBeGreaterThan(0);
  expect(
    budgetFor(available),
    `the field gives ${available.toFixed(1)}px to a placeholder needing ${needed.toFixed(1)}px, which is inside the field but not inside the ${FIT_HEADROOM * 100}% headroom, so a wider font clips its tail`,
  ).toBeGreaterThanOrEqual(needed);

  const card = harness.host.querySelector<HTMLElement>(".lesson-player__cfu");
  if (!card) {
    throw new Error("no CFU card to photograph");
  }
  // The default iframe viewport is narrower than a 460px card, which crops the photograph
  // (not the layout: the measurement above is taken on the full-width box either way).
  await page.viewport(560, 420);
  // Into the gitignored screenshot directory: this is evidence for the review, not an asset.
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      element: card,
      path: "__screenshots__/exp1-cfu-placeholder.png",
    });
  }

  harness.cleanup();
});

/**
 * The three surfaces must keep the SAME answer-row geometry. A placeholder measured against
 * the CFU box and rendered into a narrower practice box would be clipped on one screen only,
 * which is the divergence this whole change exists to prevent.
 */
test("the CFU panel and the practice card give a placeholder the same width", async () => {
  const cfu = await exp1Card();
  const practice = mount(
    <div style={{ width: FIGURE_CONTENT_CAP }}>
      <section className="lesson-practice">
        <form className="lesson-player__row">
          <input type="text" placeholder={GENERIC_PLACEHOLDER} />
          <button type="submit">Check</button>
        </form>
      </section>
    </div>,
  );
  const practiceInput = await field(practice.host);
  expect(contentWidth(practiceInput)).toBeCloseTo(contentWidth(cfu.input), 1);
  cfu.harness.cleanup();
  practice.cleanup();
});
