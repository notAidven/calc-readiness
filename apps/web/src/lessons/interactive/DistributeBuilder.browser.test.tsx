import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasText,
  inputs,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { DistributeBuilder } from "./DistributeBuilder";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("DistributeBuilder gates only after BOTH the positive and negative rounds", async () => {
  let completed = 0;
  h = mount(<DistributeBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => inputs(host).length === 2, "round 1 inputs mount");

  // Round 1: 2(n + 5) = 2n + 10.
  {
    const [xIn, cIn] = inputs(host);
    if (!xIn || !cIn) {
      throw new Error("expected two round-1 inputs");
    }
    setInputValue(xIn, "2n");
    setInputValue(cIn, "10");
  }
  findButton(host, "Check").click();

  // Finishing round 1 does NOT gate; it offers the negative-term round instead.
  await waitFor(() => hasText(host, "Next round: a negative term"), "round 2 offered");
  expect(completed).toBe(0);

  findButton(host, "Next round").click();
  await waitFor(
    () => inputs(host).length === 2 && (inputs(host)[0]?.value ?? "") === "",
    "round 2 inputs reset",
  );

  // Round 2: 3(n − 4) = 3n − 12 (the sign case).
  {
    const [xIn, cIn] = inputs(host);
    if (!xIn || !cIn) {
      throw new Error("expected two round-2 inputs");
    }
    setInputValue(xIn, "3n");
    setInputValue(cIn, "-12");
  }
  findButton(host, "Check").click();

  await waitFor(() => completed === 1, "gates after the negative round");
  expect(hasText(host, "Distribute to every term inside")).toBe(true);
});

test("DistributeBuilder rejects a sign error on the negative term", async () => {
  let completed = 0;
  h = mount(<DistributeBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => inputs(host).length === 2, "round 1 inputs mount");

  {
    const [xIn, cIn] = inputs(host);
    if (!xIn || !cIn) {
      throw new Error("expected two round-1 inputs");
    }
    setInputValue(xIn, "2n");
    setInputValue(cIn, "10");
  }
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Next round"), "round 2 offered");
  findButton(host, "Next round").click();
  await waitFor(
    () => inputs(host).length === 2 && (inputs(host)[0]?.value ?? "") === "",
    "round 2 inputs reset",
  );

  // Forgetting the sign (12 instead of −12) is rejected.
  {
    const [xIn, cIn] = inputs(host);
    if (!xIn || !cIn) {
      throw new Error("expected two round-2 inputs");
    }
    setInputValue(xIn, "3n");
    setInputValue(cIn, "12");
  }
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "mind the sign"), "sign error nudged");
  expect(completed).toBe(0);
});
