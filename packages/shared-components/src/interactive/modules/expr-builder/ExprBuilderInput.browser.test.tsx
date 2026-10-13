import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ExprBuilderPayload,
  type ExprBuilderSpec,
  toExprBuilderWorkspace,
} from "./comparator";
import { ExprBuilderInput } from "./ExprBuilderInput";

/**
 * Chromium render + interaction tests for the expr_builder input. They drive the
 * widget through its accessible controls (labeled text/number fields) and assert
 * the emitted controlled payload shape, proving the item is answerable end to end
 * from the keyboard alone, over the same value/onChange seam the text input uses,
 * and that the widget never receives or renders the answer key.
 */

afterEach(cleanup);

const powerSpec: ExprBuilderSpec = { kind: "positive_power", base: "x", exp: 3 };
const workspace = toExprBuilderWorkspace(powerSpec);

function lastPayload(spy: ReturnType<typeof vi.fn>): ExprBuilderPayload {
  const calls = spy.mock.calls;
  return calls[calls.length - 1]?.[0] as ExprBuilderPayload;
}

/**
 * The LaTeX the widget handed the host's typesetter. Read as an attribute rather than
 * matched with an attribute SELECTOR, because CSS eats the backslashes: `[data-latex=
 * "\sqrt{2}"]` looks for `sqrt{2}` and quietly matches nothing.
 */
function renderedLatex(): string | null {
  return document.querySelector("[data-latex]")?.getAttribute("data-latex") ?? null;
}

describe("ExprBuilderInput (Chromium): keyboard-answerable, correct payload shape", () => {
  it("renders labeled base + exponent fields and a polite live region", () => {
    render(
      <ExprBuilderInput
        itemVersionId="pw"
        workspace={workspace}
        value={null}
        onChange={() => {}}
        label="Build the positive-exponent form"
      />,
    );
    expect(screen.getByLabelText("Base")).toBeTruthy();
    expect(screen.getByLabelText("Exponent")).toBeTruthy();
    expect(document.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it("shows no answer before the student builds (workspace holds no key)", () => {
    render(
      <ExprBuilderInput
        itemVersionId="pw"
        workspace={workspace}
        value={null}
        onChange={() => {}}
        label="Build it"
      />,
    );
    expect((screen.getByLabelText("Base") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Exponent") as HTMLInputElement).value).toBe("");
    // The layout carries no answer digit anywhere.
    expect(/\d/.test(JSON.stringify(workspace))).toBe(false);
  });

  it("emits the structured payload as the base + exponent are typed (keyboard-only)", () => {
    const onChange = vi.fn();
    render(
      <ExprBuilderInput
        itemVersionId="pw"
        workspace={workspace}
        value={null}
        onChange={onChange}
        label="Build it"
      />,
    );
    fireEvent.change(screen.getByLabelText("Base"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Exponent"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalled();
    expect(lastPayload(onChange)).toEqual({ kind: "positive_power", base: "x", exp: 3 });
  });

  it("narrates the assembled expression in the live region, in words too", () => {
    render(
      <ExprBuilderInput
        itemVersionId="pw"
        workspace={workspace}
        value={{ kind: "positive_power", base: "x", exp: 3 }}
        onChange={() => {}}
        label="Build it"
      />,
    );
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain("x^3");
    // Typeset markup reads badly aloud, so the live region also spells the form out.
    expect(live?.textContent).toContain("x to the 3");
  });

  /*
   * This used to require `workspace.template` on screen, on the reasoning that the shape
   * being filled should be visible. The fields already say it: a group whose two boxes are
   * labelled "Base" and "Exponent" does not also need "base^exponent" printed over it, and
   * printing it puts the notation the learner is here to LEARN in front of them as though
   * it were the instruction. So the requirement is inverted rather than dropped — the same
   * fact is still pinned, in the other direction, and `answerRowChrome.browser.test.tsx`
   * pins it across every served widget rather than only this one.
   */
  it("does not echo the workspace layout template at the learner", () => {
    render(
      <ExprBuilderInput
        itemVersionId="pw"
        workspace={workspace}
        value={null}
        onChange={() => {}}
        label="Build it"
      />,
    );
    expect(workspace.template).not.toBe("");
    expect(document.body.textContent).not.toContain(workspace.template);
  });

  it("disables every control when disabled", () => {
    render(
      <ExprBuilderInput
        itemVersionId="pw"
        workspace={workspace}
        value={null}
        onChange={() => {}}
        label="Build it"
        disabled
      />,
    );
    expect((screen.getByLabelText("Base") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Exponent") as HTMLInputElement).disabled).toBe(true);
  });
});

const coeffRadicalSpec: ExprBuilderSpec = {
  kind: "coeff_radical",
  coeff: 5,
  radicand: 2,
  index: 2,
};
const radicalFormSpec: ExprBuilderSpec = {
  kind: "radical_form",
  base: "x",
  power: 3,
  index: 4,
};
const rationalPowerSpec: ExprBuilderSpec = {
  kind: "rational_power",
  base: "x",
  num: 3,
  den: 4,
};

describe("ExprBuilderInput (Chromium): the RAD radical shapes", () => {
  it("coeff_radical: emits coefficient + radicand + index from the keyboard", () => {
    const onChange = vi.fn();
    render(
      <ExprBuilderInput
        itemVersionId="cr"
        workspace={toExprBuilderWorkspace(coeffRadicalSpec)}
        value={null}
        onChange={onChange}
        label="Build the coefficient radical"
      />,
    );
    fireEvent.change(screen.getByLabelText("Coefficient"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Radicand"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Root index (2 for a square root)"), {
      target: { value: "2" },
    });
    expect(lastPayload(onChange)).toEqual({
      kind: "coeff_radical",
      coeff: 5,
      radicand: 2,
      index: 2,
    });
    // The workspace never carries the answer digits (5 or 2) in its template/ids.
    const ws = toExprBuilderWorkspace(coeffRadicalSpec);
    expect(/\d/.test(JSON.stringify(ws.slots.map((s) => s.id)))).toBe(false);
  });

  it("radical_form: emits base + power (via exp) + index from the keyboard", () => {
    const onChange = vi.fn();
    render(
      <ExprBuilderInput
        itemVersionId="rf"
        workspace={toExprBuilderWorkspace(radicalFormSpec)}
        value={null}
        onChange={onChange}
        label="Build the radical form"
      />,
    );
    fireEvent.change(screen.getByLabelText("Base"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Power (under the root)"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Root index"), { target: { value: "4" } });
    expect(lastPayload(onChange)).toEqual({
      kind: "radical_form",
      base: "x",
      exp: 3,
      index: 4,
    });
  });

  it("rational_power: emits base + numerator + denominator from the keyboard", () => {
    const onChange = vi.fn();
    render(
      <ExprBuilderInput
        itemVersionId="rp"
        workspace={toExprBuilderWorkspace(rationalPowerSpec)}
        value={null}
        onChange={onChange}
        label="Build the rational power"
      />,
    );
    fireEvent.change(screen.getByLabelText("Base"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Exponent numerator"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Exponent denominator"), {
      target: { value: "4" },
    });
    expect(lastPayload(onChange)).toEqual({
      kind: "rational_power",
      base: "x",
      num: 3,
      den: 4,
    });
  });

  it("narrates the assembled radical in the live region", () => {
    render(
      <ExprBuilderInput
        itemVersionId="cr"
        workspace={toExprBuilderWorkspace(coeffRadicalSpec)}
        value={{ kind: "coeff_radical", coeff: 5, radicand: 2, index: 2 }}
        onChange={() => {}}
        label="Build it"
      />,
    );
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain("5*root(2, 2)");
    expect(live?.textContent).toContain("5 times the root of 2");
  });

  /**
   * On RAD.3 the FORM is the answer, so a student converting INTO radical form has to
   * see a radical. When the host supplies a typesetter the widget shows what they built
   * as notation (a square root stays bare, as every lesson draws it); without one it
   * falls back to the readable ASCII form, so the widget still stands alone.
   */
  it("typesets the built expression through the host's renderer when one is given", () => {
    render(
      <ExprBuilderInput
        itemVersionId="rf"
        workspace={toExprBuilderWorkspace(radicalFormSpec)}
        value={{ kind: "radical_form", base: "x", exp: 3, index: 4 }}
        onChange={() => {}}
        label="Build it"
        renderMath={(latex) => <span data-latex={latex} />}
      />,
    );
    expect(renderedLatex()).toBe("\\sqrt[4]{x^{3}}");
  });

  it("writes a square root bare rather than with an explicit index of 2", () => {
    render(
      <ExprBuilderInput
        itemVersionId="cr"
        workspace={toExprBuilderWorkspace(coeffRadicalSpec)}
        value={{ kind: "coeff_radical", coeff: 5, radicand: 2, index: 2 }}
        onChange={() => {}}
        label="Build it"
        renderMath={(latex) => <span data-latex={latex} />}
      />,
    );
    expect(renderedLatex()).toBe("5\\,\\sqrt{2}");
  });

  it("never splices a typed base into LaTeX as a command", () => {
    render(
      <ExprBuilderInput
        itemVersionId="rp"
        workspace={toExprBuilderWorkspace(rationalPowerSpec)}
        value={{ kind: "rational_power", base: "\\frac{1}{0}", num: 3, den: 4 }}
        onChange={() => {}}
        label="Build it"
        renderMath={(latex) => <span data-latex={latex} />}
      />,
    );
    expect(renderedLatex()).toBe("frac10^{\\frac{3}{4}}");
  });
});
