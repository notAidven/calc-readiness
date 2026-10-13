/**
 * POL.5's two authored widgets, on the copy a learner reads while operating them.
 *
 * Both guards are about a sentence the board prints, so both read the RENDERED text rather
 * than the source string: a prop is not evidence that anything reached the status line, and
 * on `MatchPairs` the prompt only reaches it at all because this adopter supplies an
 * `objective` (`kinds/MatchPairs.tsx`, the `objective === undefined ? null : prompt` fallback).
 *
 * ## Why the direction assertion is tied to the DOM and not just pinned as a string
 *
 * `MatchPairs` makes the LEFT column the draggable side and the RIGHT column the drop target,
 * and `joinTo` returns silently on a null hold, so a learner who picks up a right-hand item
 * first gets no join, no refusal and no feedback. Which column is which is therefore the fact
 * the prompt has to agree with, and it is read off the rendered board here rather than assumed:
 * if the shared kind ever flips its affordances, this file fails at the adopter whose sentence
 * has silently gone backwards, instead of going on pinning a now-wrong string.
 *
 * ## Scope
 *
 * These are POL.5's two adopters, which is the lane this round owns. The direction defect is a
 * property of every `MatchPairs` adopter (16 files import the kind at this SHA), and that whole
 * population is swept by `matchPairsDragDirection.test.ts`, written once this lane had stopped
 * editing several of its members. The two files answer different questions and both are worth
 * keeping: that one requires the sentence to name a side, or else to carry a declared read of
 * which noun the left column holds; this one drives the board and proves what the sentence
 * describes actually happens.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InterceptRouteMatch } from "./interactive/InterceptRouteMatch";
import { VertexFormReadTable } from "./interactive/VertexFormReadTable";

/** The two `.lesson-match__side` columns, in source order: draggable side first. */
function matchColumns(container: HTMLElement): {
  left: HTMLButtonElement[];
  right: HTMLButtonElement[];
} {
  const sides = Array.from(container.querySelectorAll<HTMLElement>(".lesson-match__side"));
  expect(sides.length, "a matching board has two columns").toBe(2);
  const [first, second] = sides;
  if (!first || !second) {
    throw new Error("MatchPairs rendered fewer than two columns");
  }
  return {
    left: Array.from(first.querySelectorAll<HTMLButtonElement>("button")),
    right: Array.from(second.querySelectorAll<HTMLButtonElement>("button")),
  };
}

function statusText(container: HTMLElement): string {
  return container.querySelector(".lesson-interactive__status")?.textContent ?? "";
}

/** Every KaTeX expression in a node, as the LaTeX it was authored from. */
function latexIn(node: Element | null): string[] {
  if (node === null) {
    return [];
  }
  return Array.from(node.querySelectorAll<HTMLElement>("[data-latex]")).map(
    (span) => span.dataset.latex ?? "",
  );
}

function chip(container: HTMLElement, spoken: string): HTMLButtonElement {
  const button = container.querySelector(`button[aria-label="${spoken}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`no tray chip called "${spoken}"`);
  }
  return button;
}

function slot(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector(".lesson-table__slot");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("the table has no open slot");
  }
  return button;
}

describe("POL.5 intercept-route-match: the prompt names the direction the board accepts", () => {
  it("gives the learner nothing when the value is tapped before the feature", () => {
    const { container, unmount } = render(<InterceptRouteMatch />);
    try {
      const { left, right } = matchColumns(container);
      const value = right[0];
      const feature = left[0];
      if (!value || !feature) {
        throw new Error("the board dealt an empty column");
      }

      // The order the shipped sentence asked for: the value, then the feature.
      fireEvent.click(value);
      fireEvent.click(feature);

      const joined = Array.from(
        container.querySelectorAll<HTMLElement>('.lesson-match__item[data-state="joined"]'),
      );
      expect(joined.length, "tapping the value first joins nothing").toBe(0);
      expect(
        container.querySelector(".lesson-interactive__status")?.getAttribute("data-state"),
        "and it is not even refused, so the board looks dead",
      ).toBe("prompt");
    } finally {
      unmount();
    }
  });

  it("joins when the feature is tapped before the value", () => {
    const { container, unmount } = render(<InterceptRouteMatch />);
    try {
      const { left, right } = matchColumns(container);
      const feature = left[0];
      if (!feature) {
        throw new Error("the board dealt an empty left column");
      }
      // Which right-hand item is this feature's partner is the board's business, not the
      // copy's, so every drop target is offered in turn: one of them lands, the rest are
      // refused and named, and the feature is picked back up after each refusal.
      for (const target of right) {
        fireEvent.click(feature);
        fireEvent.click(target);
        if (container.querySelector('.lesson-match__item[data-state="joined"]')) {
          break;
        }
      }
      expect(
        container.querySelectorAll('.lesson-match__item[data-state="joined"]').length,
        "picking the feature up first lands a join",
      ).toBeGreaterThan(0);
    } finally {
      unmount();
    }
  });

  it("states that direction in the status line", () => {
    const { container, unmount } = render(<InterceptRouteMatch />);
    try {
      const { left, right } = matchColumns(container);
      // Which column is draggable is the fact the sentence has to agree with.
      expect(
        left.every((button) => button.draggable),
        "the left column is the one that can be picked up",
      ).toBe(true);
      expect(
        right.some((button) => button.draggable),
        "the right column is the drop target, not a source",
      ).toBe(false);
      // And which column holds which noun: features on the left, values on the right.
      expect(left[0]?.textContent ?? "", "the left column holds the features").toContain(
        "Where the graph crosses the vertical axis",
      );
      expect(latexIn(right[0] ?? null).join(" "), "the right column holds values").toMatch(
        /^[xy] = /,
      );

      const status = statusText(container);
      expect(status, "the prompt reaches the status line at all").toContain("Drag");
      expect(status, "drag clause names the draggable column first").toMatch(
        /Drag a feature onto the value/,
      );
      expect(status, "tap clause names the draggable column first").toMatch(
        /tap the feature and then the value/,
      );
    } finally {
      unmount();
    }
  });
});

describe("POL.5 vertex-form-read-table: the conclusion cites the board on screen", () => {
  it("cites board 0's own bracket", () => {
    const { container, unmount } = render(<VertexFormReadTable />);
    try {
      fireEvent.click(chip(container, "the point -6, 2"));
      fireEvent.click(slot(container));
      const status = container.querySelector(".lesson-interactive__status");
      expect(status?.getAttribute("data-state"), "board 0 is solved").toBe("solved");
      const math = latexIn(status);
      expect(math, "board 0's blank row is a(x + 6)^2 + k").toContain(
        "\\left(x + 6\\right)^{2}",
      );
      expect(math, "and it turns at x = -6").toContain("x = -6");
    } finally {
      unmount();
    }
  });

  it("cites board 1's own bracket, not board 0's", () => {
    const { container, unmount } = render(<VertexFormReadTable />);
    try {
      fireEvent.click(chip(container, "the point -6, 2"));
      fireEvent.click(slot(container));
      const restart = container.querySelector(".lesson-interactive__reset");
      if (!(restart instanceof HTMLButtonElement)) {
        throw new Error("a solved table offers no restart");
      }
      fireEvent.click(restart);

      fireEvent.click(chip(container, "the point -3, -8"));
      fireEvent.click(slot(container));
      const status = container.querySelector(".lesson-interactive__status");
      expect(status?.getAttribute("data-state"), "board 1 is solved").toBe("solved");
      const math = latexIn(status);
      // A floor: an empty conclusion would satisfy the two negatives below on its own.
      expect(math.length, "the conclusion typesets its own bracket").toBeGreaterThanOrEqual(
        2,
      );
      expect(math, "board 1's blank row is 4(x + 3)^2 - 8").toContain(
        "\\left(x + 3\\right)^{2}",
      );
      expect(math, "and it turns at x = -3").toContain("x = -3");
      expect(math, "board 0's bracket was never on this screen").not.toContain(
        "\\left(x + 6\\right)^{2}",
      );
      expect(math, "nor was board 0's turning point").not.toContain("x = -6");
    } finally {
      unmount();
    }
  });
});
