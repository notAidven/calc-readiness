import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DIAGNOSTIC_DURATION_ESTIMATE,
  TYPICAL_QUESTIONS,
} from "./diagnostic/diagnosticShape";
import { TitleScreen } from "./TitleScreen";

/**
 * **THE START CHOICE: two honest routes into the city, and neither of them lies about the
 * other.**
 *
 * The screen a learner meets once their session exists (and the screen the deliberately
 * public `/demo` route opens on) asks one question: diagnostic first, or straight to Era 1.
 * Both answers are real product paths, so the test is about HONESTY rather than about layout:
 *
 *  - the diagnostic is RECOMMENDED and says how big it is, in the committed figures rather
 *    than in numbers invented for a marketing line;
 *  - Era 1 is offered as a genuine second route, so a demo can start in ten seconds;
 *  - the diagnostic is not sold as a measure of the learner, and the placement is not
 *    promised to be perfect;
 *  - the account promise is made only where an account actually saves anything.
 *
 * The two figures come off `diagnostic/diagnosticShape.ts`, which is the module
 * `diagnosticIntroPromise.test.ts` holds against the published measurement. Quoting the
 * constant rather than the rendered digits is what stops this screen and the diagnostic's own
 * intro card drifting apart, and it is why this file asserts the SHAPE of the sentence and
 * lets that other guard rule on whether the numbers are honest.
 */

afterEach(cleanup);

function renderChoice(over: Partial<Parameters<typeof TitleScreen>[0]> = {}) {
  const onStart = vi.fn();
  const onTakeDiagnostic = vi.fn();
  render(<TitleScreen onStart={onStart} onTakeDiagnostic={onTakeDiagnostic} {...over} />);
  return { onStart, onTakeDiagnostic };
}

/** Every sentence the screen draws, flattened, for the sweeps below. */
function drawnText(): string {
  return document.body.textContent ?? "";
}

describe("the first-run start choice", () => {
  it("offers the diagnostic as the recommended route, sized in the committed figures", () => {
    renderChoice();

    const diagnostic = screen.getByRole("button", {
      name: /take the diagnostic/i,
      description: /recommended/i,
    });
    expect(diagnostic).toBeInTheDocument();

    // RECOMMENDED IN THE CONTROL'S ACCESSIBLE DESCRIPTION, not merely somewhere in the
    // document and not by colour alone. A screen-reader learner who navigates button by
    // button has to hear the status while standing on the route it describes.
    expect(drawnText()).toMatch(/recommended/i);

    // The size of the thing being agreed to, in the numbers the diagnostic itself quotes.
    const shape = drawnText();
    expect(shape).toContain(String(TYPICAL_QUESTIONS));
    expect(shape).toContain(DIAGNOSTIC_DURATION_ESTIMATE);
    expect(diagnostic).toHaveAccessibleDescription(/recommended.*about 15[–-]20 minutes/i);
    expect(shape).not.toMatch(/\b10[ -]minutes?\b|~10\s*min/i);
  });

  it("offers Era 1 as a real second route, and each button does its own thing", async () => {
    const user = userEvent.setup();
    const { onStart, onTakeDiagnostic } = renderChoice();

    const eraOne = screen.getByRole("button", { name: /start at era 1/i });
    await user.click(eraOne);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onTakeDiagnostic).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /take the diagnostic/i }));
    expect(onTakeDiagnostic).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("says the diagnostic is still there later, so Era 1 is not a door that shuts", () => {
    renderChoice();
    expect(drawnText()).toMatch(/menu/i);
    expect(drawnText()).toMatch(/later|any time|whenever/i);
  });

  /**
   * **WHAT THE SCREEN IS NOT ALLOWED TO SAY**, and both halves were named by the brief.
   *
   * A placement walk measures what somebody can currently do on 62 nodes. It is not a
   * measure of the person, and it is not exact. Written as a sweep with the sentence each
   * pattern exists to catch beside it, so a pattern edited into uselessness fails at its own
   * row rather than reporting the absence it caused.
   */
  it("never sells the diagnostic as a measure of the learner, or as exact", () => {
    const FORBIDDEN: readonly { pattern: RegExp; catches: string }[] = [
      { pattern: /\bhow smart\b/i, catches: "It finds out how smart you are." },
      { pattern: /\bintelligen/i, catches: "A quick intelligence check." },
      { pattern: /\bIQ\b/, catches: "Think of it as an IQ test." },
      { pattern: /\b(exact|perfect|precise)(ly)?\b/i, catches: "It places you exactly." },
      {
        pattern: /\bpass(ing)?\b.*\bfail/i,
        catches: "There is a passing and failing mark.",
      },
    ];
    const inert = FORBIDDEN.filter((row) => !row.pattern.test(row.catches));
    expect(
      inert.map((row) => `${row.pattern} no longer catches "${row.catches}"`),
      "a pattern in the forbidden sweep has stopped reading",
    ).toEqual([]);

    const said = drawnText();
    const broken = FORBIDDEN.filter((row) => row.pattern.test(said));
    expect(broken.map((row) => row.catches)).toEqual([]);
  });

  /**
   * **THE CROSS-DEVICE PROMISE IS MADE ONLY WHERE IT IS TRUE.**
   *
   * A signed-in learner's city is mirrored to `POST /api/city` under their Cognito subject, so
   * on that path the sentence is a fact. On `/demo` and on a local dev server the city lives in
   * this browser's `localStorage` and nowhere else, so the same sentence would be a lie. Both
   * directions are asserted, because a promise that quietly became unconditional is exactly
   * what this is here to stop.
   */
  it("promises a saved account only on the account path", () => {
    renderChoice({ accountMode: true });
    expect(drawnText()).toMatch(/saves? to your account|saved to your account/i);
    cleanup();

    renderChoice({ accountMode: false });
    expect(drawnText()).not.toMatch(/saves? to your account|saved to your account/i);
  });

  it("lands keyboard focus on the recommended route", () => {
    renderChoice();
    expect(screen.getByRole("button", { name: /take the diagnostic/i })).toHaveFocus();
  });
});
