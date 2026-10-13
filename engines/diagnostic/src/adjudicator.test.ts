import { describe, expect, it } from "vitest";

import { adjudicate, confirmThresholdFor, type NodeConsequence } from "./adjudicator";

/** A node whose decision cascades far enough to be worth confirming. */
const CONSEQUENTIAL: NodeConsequence = { passClosure: 20, failCone: 20 };
/** A leaf-ish node: a decision about it moves nothing else. */
const ISOLATED: NodeConsequence = { passClosure: 0, failCone: 0 };
/** The threshold the 62-node product scope produces. */
const THRESHOLD = 7;

describe("per-node adjudication (adaptive 2-of-3, asymmetric confirm)", () => {
  it("needs at least two scorable items before deciding a consequential node", () => {
    expect(adjudicate([], CONSEQUENTIAL, THRESHOLD)).toEqual({ done: false });
    expect(adjudicate([true], CONSEQUENTIAL, THRESHOLD)).toEqual({ done: false });
    expect(adjudicate([false], CONSEQUENTIAL, THRESHOLD)).toEqual({ done: false });
  });

  it("passes robustly on two correct in a row (the downward-inference trigger)", () => {
    expect(adjudicate([true, true], CONSEQUENTIAL, THRESHOLD)).toEqual({
      done: true,
      result: "passed",
      robust: true,
      // New: robustness and inference licensing are separate fields now. A clean
      // 2/2 sets both, so this case is unchanged in behaviour.
      infers: true,
      correct_count: 2,
      item_count: 2,
    });
  });

  it("decides an inconsequential node on ONE item, either way", () => {
    // The amendment: a node whose pass would credit nothing and whose failure
    // would prune nothing does not buy a confirming item it cannot cascade.
    expect(adjudicate([true], ISOLATED, THRESHOLD)).toEqual({
      done: true,
      result: "passed",
      robust: false, // not a clean 2/2, so no top city seed
      infers: true, // but it may still credit its (empty) closure
      correct_count: 1,
      item_count: 1,
    });
    expect(adjudicate([false], ISOLATED, THRESHOLD)).toMatchObject({
      done: true,
      result: "failed",
      robust: false,
    });
  });

  it("confirms in proportion to consequence, in each direction independently", () => {
    // A pass here would credit 20 prereqs, so it is confirmed; a failure would
    // prune nothing, so it is not. The two directions are judged separately.
    const bigClosureOnly: NodeConsequence = { passClosure: 20, failCone: 0 };
    expect(adjudicate([true], bigClosureOnly, THRESHOLD)).toEqual({ done: false });
    expect(adjudicate([false], bigClosureOnly, THRESHOLD)).toMatchObject({
      done: true,
      result: "failed",
      item_count: 1,
    });
  });

  it("confirms everything at threshold 0 — the pre-amendment rule", () => {
    // How the live 6-node D1 scope still behaves: `confirmThresholdFor` rounds
    // its scope share down to 0, so nothing decides on a single item.
    expect(confirmThresholdFor(6, 7 / 62)).toBe(0);
    expect(confirmThresholdFor(62, 7 / 62)).toBe(7);
    expect(adjudicate([true], ISOLATED, 0)).toEqual({ done: false });
    expect(adjudicate([false], ISOLATED, 0)).toEqual({ done: false });
  });

  it("never prunes a consequential subtree on a single (or double) miss", () => {
    // A single miss is not even close to done; two misses still defer to a third.
    expect(adjudicate([false, false], CONSEQUENTIAL, THRESHOLD)).toEqual({ done: false });
    expect(adjudicate([true, false], CONSEQUENTIAL, THRESHOLD)).toEqual({ done: false });
    expect(adjudicate([false, true], CONSEQUENTIAL, THRESHOLD)).toEqual({ done: false });
  });

  it("confirms a failure only at 2-of-3 incorrect", () => {
    for (const outcomes of [
      [false, false, false],
      [false, false, true],
      [true, false, false],
    ]) {
      expect(adjudicate(outcomes, CONSEQUENTIAL, THRESHOLD)).toMatchObject({
        done: true,
        result: "failed",
        robust: false,
      });
    }
  });

  it("passes non-robustly on a mixed 2-of-3 correct (a genuine pass: seeds 2, tests out, credits no closure)", () => {
    for (const outcomes of [
      [true, false, true],
      [false, true, true],
    ]) {
      expect(adjudicate(outcomes, CONSEQUENTIAL, THRESHOLD)).toMatchObject({
        done: true,
        result: "passed",
        robust: false,
        // A shaky 2-of-3 still does not credit the closure — unchanged, and the
        // reason `infers` is not simply "did it pass".
        infers: false,
        correct_count: 2,
      });
    }
  });
});
