/**
 * What a number-line figure is allowed to print under a root it has already marked.
 *
 * `SolutionLineWorked` (`worked/d3Kit.tsx`) draws two label rows: a tick row under the axis,
 * and a bold `CIVIC` row over each marked point. The tick row was built from
 * `[min, ...finite, max]`, where `finite` is every piece bound AND every point value, so a
 * point's own value was printed twice on every draw that has one -- over the axis by the point
 * and under it by the tick. On `d4.pol4.formula.l3` the two spellings even disagreed: the
 * point prints `\tfrac{1}{3}` and the tick under it printed the rounded decimal `0.33`, which
 * is not the root.
 *
 * A piece bound is the opposite case and is why this is not a rule about ticks in general: a
 * span endpoint carries a circle and NO label, so its tick is the only place its value is
 * written and dropping it would take the number off the figure.
 *
 * ## Why the claim is geometric and read off the DOM
 *
 * "Printed twice" is a claim about the rendered figure, so the measurement is the rendered
 * figure: the point marks are found as circles, their own `cy` is taken as the axis, and the
 * question asked is whether any label BELOW that axis sits at the x of a mark. Reading the
 * values out of `template_params` instead would re-derive the tick list from the numbers the
 * component derived it from and agree with it however the component draws.
 *
 * The population is every registered worked visual whose element tree contains a
 * `SolutionLineWorked` carrying points -- resolved by walking the element the registry
 * returns, so a figure that reaches the component through a local helper (`d3LIN5`'s
 * `pairFigure`, four templates) is inside it -- and it is floored and its composition
 * asserted, because a sweep that narrowed back to D4 would leave D3's four LIN.5 figures and
 * the same defect unmeasured.
 */

import { render } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { everyCfuDraw, everyDraw } from "./practiceSweep";
import { SolutionLineWorked } from "./worked/d3Kit";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

/** A draw of a figure that reaches `SolutionLineWorked`, with the props it hands it. */
interface PointDraw {
  templateId: string;
  params: Record<string, number>;
  element: JSX.Element;
  pointCount: number;
}

/**
 * The `SolutionLineWorked` element inside a rendered figure, wherever it sits.
 *
 * Walked rather than compared at the root: `d3LIN5` builds four of its five figures through a
 * local `pairFigure` helper, and `worked/cfuD6.tsx` draws one through the check registry, so a
 * root-only comparison would be scoped to the files that happen to name the component in their
 * own return statement.
 */
function findSolutionLine(node: ReactNode): JSX.Element | undefined {
  if (node === null || node === undefined || typeof node !== "object") {
    return undefined;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findSolutionLine(child as ReactNode);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  const element = node as JSX.Element;
  if (element.type === SolutionLineWorked) {
    return element;
  }
  const children = (element.props as { children?: ReactNode } | undefined)?.children;
  return children === undefined ? undefined : findSolutionLine(children);
}

/** Every draw in the two sweep populations whose figure marks at least one point. */
function pointDraws(): PointDraw[] {
  const draws: PointDraw[] = [];
  const seen = new Set<string>();
  for (const item of [...everyDraw(), ...everyCfuDraw()]) {
    const visual = getWorkedSolutionVisual(item.template_id);
    if (!visual) {
      continue;
    }
    const params = (item.template_params ?? {}) as Record<string, number>;
    const key = `${item.template_id}|${JSON.stringify(params)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const element = visual.Svg(params);
    const line = findSolutionLine(element);
    if (!line) {
      continue;
    }
    const points = (line.props as { points?: readonly unknown[] }).points ?? [];
    if (points.length === 0) {
      continue;
    }
    draws.push({
      templateId: item.template_id,
      params,
      element,
      pointCount: points.length,
    });
  }
  return draws;
}

const POINT_DRAWS = pointDraws();

/** A label's horizontal centre and vertical centre, in the figure's own user units. */
interface Label {
  centreX: number;
  centreY: number;
  text: string;
}

function num(value: string | null): number {
  return value === null ? Number.NaN : Number(value);
}

/**
 * Every label the figure prints, plus the axis the point marks sit on.
 *
 * The axis is read off the marks themselves rather than from a constant, so this measures the
 * figure that rendered rather than the figure this file was written against. A mark is a
 * `circle` of radius 6: a span's endpoint circle is 5.5 and is deliberately excluded, since a
 * piece bound carries no label of its own and its tick is the only place its value appears.
 */
function readFigure(container: HTMLElement): {
  axisY: number;
  markXs: number[];
  labels: Label[];
} {
  const marks = Array.from(container.querySelectorAll("circle")).filter(
    (circle) => num(circle.getAttribute("r")) === 6,
  );
  const axisY = marks.length > 0 ? num(marks[0]?.getAttribute("cy") ?? null) : Number.NaN;
  const labels: Label[] = [];
  for (const text of Array.from(container.querySelectorAll("text"))) {
    labels.push({
      centreX: num(text.getAttribute("x")),
      centreY: num(text.getAttribute("y")),
      text: text.textContent ?? "",
    });
  }
  for (const box of Array.from(container.querySelectorAll("foreignObject[data-latex]"))) {
    const x = num(box.getAttribute("x"));
    const y = num(box.getAttribute("y"));
    labels.push({
      centreX: x + num(box.getAttribute("width")) / 2,
      centreY: y + num(box.getAttribute("height")) / 2,
      text: box.getAttribute("data-latex") ?? "",
    });
  }
  return {
    axisY,
    markXs: marks.map((circle) => num(circle.getAttribute("cx"))),
    labels,
  };
}

describe("a marked root is printed once", () => {
  it("has a population, derived from the registries and reaching past D4", () => {
    const ids = new Set(POINT_DRAWS.map((draw) => draw.templateId));
    const outsideD4 = [...ids].filter((id) => !id.startsWith("d4."));
    expect(POINT_DRAWS.length, "no figure in either sweep marks a point").toBeGreaterThan(
      0,
    );
    // Floors rather than pins, so a new number-line figure needs no edit here and a lost one
    // fails. The composition floor is the load-bearing one: this defect was reported against
    // D4 and lives in a D3 module, and a population that came back as D4's five draws alone
    // would measure the report rather than the component.
    expect(
      outsideD4.length,
      `the sweep has narrowed back to D4: ${[...ids].sort().join(", ")}`,
    ).toBeGreaterThanOrEqual(4);
    expect(POINT_DRAWS.length, "too few point-marking draws").toBeGreaterThanOrEqual(60);
    expect(ids.size, "too few distinct point-marking templates").toBeGreaterThanOrEqual(9);
  });

  it.each(POINT_DRAWS.map((draw, index) => [index, draw.templateId] as const))(
    "%#: %s prints no tick under a root it has already labelled",
    (index) => {
      const draw = POINT_DRAWS[index];
      if (!draw) {
        throw new Error(`draw ${index} left the population mid-run`);
      }
      const { container } = render(draw.element);
      const { axisY, markXs, labels } = readFigure(container);
      expect(markXs.length, `${draw.templateId} rendered no point mark`).toBe(
        draw.pointCount,
      );
      expect(axisY, `${draw.templateId} has no axis to read`).not.toBeNaN();
      const doubled: string[] = [];
      for (const markX of markXs) {
        const under = labels.filter(
          (label) =>
            label.centreY > axisY &&
            Math.abs(label.centreX - markX) < 0.5 &&
            label.text.trim().length > 0,
        );
        const over = labels.filter(
          (label) => label.centreY < axisY && Math.abs(label.centreX - markX) < 0.5,
        );
        if (under.length > 0) {
          doubled.push(
            `x=${markX.toFixed(1)} carries "${over.map((label) => label.text).join(" ")}" over the axis and "${under.map((label) => label.text).join(" ")}" under it`,
          );
        }
      }
      expect(
        doubled.join("\n    "),
        `${draw.templateId} prints ${doubled.length} of its ${markXs.length} marked roots twice, at ${JSON.stringify(draw.params)}`,
      ).toBe("");
    },
  );
}, 120_000);
