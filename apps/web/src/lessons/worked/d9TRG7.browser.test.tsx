import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../testHarness";
import { TRG7_WORKED_SOLUTIONS } from "./d9TRG7";

/**
 * Every TRG.7 worked figure, drawn from the parameters its own template emits.
 *
 * A worked visual is authored against `template_params` and rendered by the shared registry,
 * so until that wiring lands centrally nothing in the tree ever draws one of these: a figure
 * that throws on a negative heading, or on the one row whose reference angle is a right angle,
 * would surface for the first time in front of a learner. So each of the five is mounted here
 * over the spread of draws its template can produce, including the awkward ones.
 *
 * The assertion is that the figure MOUNTS and typesets: `mount` swallows nothing, so a throw
 * inside a component fails the case, and waiting on a `.katex` node proves the diagram's math
 * reached KaTeX rather than sitting in a raw `<text>`. Whether it is well laid out is a
 * question about pixels that a mount cannot answer, and this file does not claim it.
 */
const CASES: readonly { name: string; id: string; params: Record<string, number> }[] = [
  // arcsin: the two signs, and the end of the range where the ray lies on the axis.
  { name: "arcsin 30", id: "d9.trg7.arcsin-degree.l1", params: { deg: 30 } },
  { name: "arcsin -45", id: "d9.trg7.arcsin-degree.l1", params: { deg: -45 } },
  { name: "arcsin 90", id: "d9.trg7.arcsin-degree.l1", params: { deg: 90 } },
  { name: "arcsin 0", id: "d9.trg7.arcsin-degree.l1", params: { deg: 0 } },

  // arccos into radians: a unit numerator and a non-unit one, and an obtuse heading.
  {
    name: "arccos 60 to pi/3",
    id: "d9.trg7.arccos-radian.l2",
    params: { deg: 60, num: 1, den: 3 },
  },
  {
    name: "arccos 135 to 3pi/4",
    id: "d9.trg7.arccos-radian.l2",
    params: { deg: 135, num: 3, den: 4 },
  },
  {
    name: "arccos 90 to pi/2",
    id: "d9.trg7.arccos-radian.l2",
    params: { deg: 90, num: 1, den: 2 },
  },

  // The three ranges, including the open one whose ends are excluded.
  {
    name: "range arcsin closed",
    id: "d9.trg7.range-interval.l2",
    params: { fn: 0, asked: 0, lo: -90, hi: 90, closed: 1 },
  },
  {
    name: "range arccos closed",
    id: "d9.trg7.range-interval.l2",
    params: { fn: 1, asked: 1, lo: 0, hi: 180, closed: 1 },
  },
  {
    name: "range arctan open",
    id: "d9.trg7.range-interval.l2",
    params: { fn: 2, asked: 0, lo: -90, hi: 90, closed: 0 },
  },

  // Compositions: one per function, and both directions of reflection.
  {
    name: "compose arcsin 150 to 30",
    id: "d9.trg7.compose-principal.l3",
    params: { fn: 0, inner: 150, principal: 30, reference: 30 },
  },
  {
    name: "compose arcsin 210 to -30",
    id: "d9.trg7.compose-principal.l3",
    params: { fn: 0, inner: 210, principal: -30, reference: 30 },
  },
  {
    name: "compose arccos -120 to 120",
    id: "d9.trg7.compose-principal.l3",
    params: { fn: 1, inner: -120, principal: 120, reference: 60 },
  },
  {
    name: "compose arctan 240 to 60",
    id: "d9.trg7.compose-principal.l3",
    params: { fn: 2, inner: 240, principal: 60, reference: 60 },
  },

  // The bearing triangle, at its shallowest and steepest offsets.
  {
    name: "bearing 4 by 3",
    id: "d9.trg7.arctan-round.l3",
    params: { across: 4, along: 3, deg: 36.87 },
  },
  {
    name: "bearing 24 by 7",
    id: "d9.trg7.arctan-round.l3",
    params: { across: 24, along: 7, deg: 16.26 },
  },
  {
    name: "bearing 2 by 5",
    id: "d9.trg7.arctan-round.l3",
    params: { across: 2, along: 5, deg: 68.2 },
  },
  // The two authored shapes, each drawn at both values of its `fn` flag, because the flag is
  // what decides which band the figure names and a case that only ever ran at one value would
  // leave the other band's wording unrendered.
  {
    name: "arccosine in degrees, second quadrant",
    id: "d9.trg7.principal-degree.l2",
    params: { fn: 0, deg: 150 },
  },
  {
    name: "arctangent in degrees, below zero",
    id: "d9.trg7.principal-degree.l2",
    params: { fn: 1, deg: -45 },
  },
  {
    name: "arcsine in radians, negative",
    id: "d9.trg7.signed-radian.l2",
    params: { fn: 0, num: 1, den: 3, neg: 1 },
  },
  {
    name: "arctangent in radians, positive",
    id: "d9.trg7.signed-radian.l2",
    params: { fn: 1, num: 1, den: 4, neg: 0 },
  },
];

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("every TRG.7 template has a registered worked visual, and no more", () => {
  // Seven, not five: the node gained two authored L2 shapes so that the diagnostic could serve
  // it at all, and a reveal with no registered figure falls back to a step list nobody designed
  // the reveal around. `principal-degree` and `signed-radian` are the shared reduction column
  // rather than a picture, because what they turn on is which BAND the answer comes from, and a
  // band is an interval a row can name where a circle would have to draw it and then still name
  // the ratio, the heading and the conversion around it.
  expect(Object.keys(TRG7_WORKED_SOLUTIONS).sort()).toEqual([
    "d9.trg7.arccos-radian.l2",
    "d9.trg7.arcsin-degree.l1",
    "d9.trg7.arctan-round.l3",
    "d9.trg7.compose-principal.l3",
    "d9.trg7.principal-degree.l2",
    "d9.trg7.range-interval.l2",
    "d9.trg7.signed-radian.l2",
  ]);
});

test.each(CASES)("$name draws and typesets", async ({ id, params }) => {
  const visual = TRG7_WORKED_SOLUTIONS[id];
  if (!visual) {
    throw new Error(`no worked visual registered for ${id}`);
  }
  h = mount(<visual.Svg {...params} />);
  await waitFor(
    () => h?.host.querySelector(".katex") !== null,
    `${id} typesets its labels`,
  );

  const caption = visual.caption(params);
  expect(caption.length, `${id} says nothing under the figure`).toBeGreaterThan(20);
  expect(caption.includes("\u2014"), `${id} caption carries an em dash`).toBe(false);
});
