import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MathText, parsePrompt, toLatex } from "./MathText";

describe("parsePrompt", () => {
  it("splits a labelled expression into an instruction label + body", () => {
    expect(parsePrompt("Evaluate: (-5) + 3 × (-4)")).toEqual({
      label: "Evaluate",
      body: "(-5) + 3 × (-4)",
      isExpression: true,
    });
  });

  it("classifies a bare expression (no label) as an expression", () => {
    const parsed = parsePrompt("1/3 + 1/5");
    expect(parsed.isExpression).toBe(true);
    expect(parsed.label).toBeNull();
  });

  it("treats a word problem as prose, not an expression", () => {
    const parsed = parsePrompt("What is 20% of 60?");
    expect(parsed.isExpression).toBe(false);
    expect(parsed.label).toBeNull();
  });
});

describe("toLatex", () => {
  it("maps the walk pack's plain-text math notation to LaTeX", () => {
    expect(toLatex("3 × 4")).toBe("3 \\times 4");
    expect(toLatex("1/3 + 1/5")).toBe("\\dfrac{1}{3} + \\dfrac{1}{5}");
    expect(toLatex("20%")).toBe("20\\%");
  });
});

describe("MathText", () => {
  it("typesets a labelled expression as a kicker plus a KaTeX equation", () => {
    const { container } = render(<MathText prompt="Expand: 3(2x + 4)" />);
    expect(container.querySelector(".dgx-prompt__kicker")?.textContent).toBe("Expand");
    // KaTeX mounts imperatively into the block host once the effect runs.
    expect(container.querySelector(".dgx-math--block .katex")).not.toBeNull();
  });

  it("renders a word problem as prose with its numbers typeset inline", () => {
    const { container } = render(<MathText prompt="What is 20% of 60?" />);
    expect(container.textContent).toContain("What is");
    expect(container.textContent).toContain("of");
    expect(container.querySelectorAll(".dgx-math--inline .katex").length).toBeGreaterThan(
      0,
    );
  });
});
