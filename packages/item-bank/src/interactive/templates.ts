import { type ItemTemplate, numberLineAnswer, type Rng } from "../template";

/**
 * A small pool of `number_line` practice templates — the item-bank surface proving
 * the interactive infrastructure end to end. It is INFRASTRUCTURE, not shipped
 * domain content: these live under a synthetic demo node ({@link INTERACTIVE_DEMO_NODE})
 * and are NEVER injected into a real D1 node's practice pool. Each template renders
 * a prompt, an answer-key spec via `numberLineAnswer`, progressive hints, and a
 * worked solution, so the pool self-validates through `validateTemplates` under the
 * interactive checker (its canonical payload grades correct).
 */

/** The synthetic node the interactive demo pool is authored under (not a shipped D1 node). */
export const INTERACTIVE_DEMO_NODE = "NL.DEMO";

const DOMAIN: readonly [number, number] = [-8, 8];
const TICK = 1;
const TOLERANCE = 0.25;

/** L1 — place a single solution point (equation already solved for x). */
export const nl_point_l1: ItemTemplate = {
  template_id: "int.nl.point.l1",
  node_id: INTERACTIVE_DEMO_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const a = rng.int(-6, 6);
    return {
      prompt: `Place the solution to $x = ${a}$ on the number line.`,
      answer: numberLineAnswer({
        domain: DOMAIN,
        tick: TICK,
        points: [a],
        tolerance: TOLERANCE,
      }),
      params: { a },
      hints: [
        "The equation is already solved for $x$, so the value is right there.",
        "Drag the marker (or type in the field) to land on that value.",
      ],
      worked_solution: [
        `The equation $x = ${a}$ gives the value directly.`,
        `Place one point at $x = ${a}$.`,
      ],
    };
  },
};

/** L2a — graph a closed interval (a compound $\\le$ inequality). */
export const nl_closed_interval_l2: ItemTemplate = {
  template_id: "int.nl.closed.l2",
  node_id: INTERACTIVE_DEMO_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(-6, 0);
    const b = a + rng.int(2, 5);
    return {
      prompt: `Graph the solution set of $${a} \\le x \\le ${b}$ on the number line.`,
      answer: numberLineAnswer({
        domain: DOMAIN,
        tick: TICK,
        intervals: [{ lo: a, hi: b, loClosed: true, hiClosed: true }],
        tolerance: TOLERANCE,
      }),
      params: { a, b },
      hints: [
        "Both endpoints use $\\le$, so both ends are included.",
        "An included endpoint is drawn as a filled (closed) dot.",
        "Set the left and right endpoints, then keep both toggles on closed.",
      ],
      worked_solution: [
        `The inequality $${a} \\le x \\le ${b}$ includes both ends.`,
        `Left endpoint at $${a}$, closed; right endpoint at $${b}$, closed.`,
        "Shade the segment between them.",
      ],
    };
  },
};

/** L2b — place two solution values (the roots of a factored equation). */
export const nl_two_points_l2: ItemTemplate = {
  template_id: "int.nl.two-points.l2",
  node_id: INTERACTIVE_DEMO_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const p = rng.int(-6, -1);
    const q = rng.int(1, 6);
    return {
      prompt: `Place BOTH solutions on the number line: $x = ${p}$ and $x = ${q}$.`,
      answer: numberLineAnswer({
        domain: DOMAIN,
        tick: TICK,
        points: [p, q],
        tolerance: TOLERANCE,
      }),
      params: { p, q },
      hints: [
        "There are two separate solutions, so place a point for each.",
        "The order you place them in does not matter.",
      ],
      worked_solution: [
        `The two solutions are $x = ${p}$ and $x = ${q}$.`,
        `Place one point at $${p}$ and another at $${q}$.`,
      ],
    };
  },
};

/** L3a — half-open interval (strict lower, inclusive upper). */
export const nl_half_open_l3: ItemTemplate = {
  template_id: "int.nl.half-open.l3",
  node_id: INTERACTIVE_DEMO_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(-6, 0);
    const b = a + rng.int(2, 5);
    return {
      prompt: `Graph the solution set of $${a} < x \\le ${b}$ on the number line (mind each end).`,
      answer: numberLineAnswer({
        domain: DOMAIN,
        tick: TICK,
        intervals: [{ lo: a, hi: b, loClosed: false, hiClosed: true }],
        tolerance: TOLERANCE,
      }),
      params: { a, b },
      hints: [
        "One end is strict ($<$) and one is inclusive ($\\le$), and they are drawn differently.",
        "A strict end is an open (hollow) dot; an inclusive end is a closed (filled) dot.",
        "Set the endpoints, then make the left end open and the right end closed.",
      ],
      worked_solution: [
        `$${a} < x$ excludes $${a}$ (open left end).`,
        `$x \\le ${b}$ includes $${b}$ (closed right end).`,
        "Shade the segment between them with those endpoint styles.",
      ],
    };
  },
};

/** L3b — right-open interval (inclusive lower, strict upper). */
export const nl_right_open_l3: ItemTemplate = {
  template_id: "int.nl.right-open.l3",
  node_id: INTERACTIVE_DEMO_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(-6, 0);
    const b = a + rng.int(2, 5);
    return {
      prompt: `Graph the solution set of $${a} \\le x < ${b}$ on the number line.`,
      answer: numberLineAnswer({
        domain: DOMAIN,
        tick: TICK,
        intervals: [{ lo: a, hi: b, loClosed: true, hiClosed: false }],
        tolerance: TOLERANCE,
      }),
      params: { a, b },
      hints: [
        "The lower end is inclusive ($\\le$) and the upper end is strict ($<$).",
        "Closed (filled) dot for the included end, open (hollow) dot for the excluded end.",
        "Make the left end closed and the right end open.",
      ],
      worked_solution: [
        `$${a} \\le x$ includes $${a}$ (closed left end).`,
        `$x < ${b}$ excludes $${b}$ (open right end).`,
        "Shade the segment between them with those endpoint styles.",
      ],
    };
  },
};

/** Every interactive practice template, in stable authoring order. */
export const INTERACTIVE_TEMPLATES: readonly ItemTemplate[] = [
  nl_point_l1,
  nl_closed_interval_l2,
  nl_two_points_l2,
  nl_half_open_l3,
  nl_right_open_l3,
];
