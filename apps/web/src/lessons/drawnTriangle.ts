/**
 * Reading a triangle back OFF a rendered figure, so a guard can compare what was drawn with
 * what was printed on it.
 *
 * Two D10 figures wrote a draw's angles onto a hardcoded outline, so all three of the right
 * numbers were on the board and every one of them was in the wrong corner. Nothing in the
 * repo could see that: the labels did not overlap, they sat in their columns, and their LaTeX
 * was correct. What was wrong was the relation between the two, which is only measurable once
 * Chromium has laid both out.
 *
 * So this module reads the PAINTED outline — the `d` of the one closed path, carried to the
 * screen through its own CTM — and the painted labels, pairs each corner with the label
 * nearest to it, and reports the corners whose drawn angle is not the one printed in them.
 * Per-corner rather than per-figure, because "the three numbers are somewhere on the picture"
 * is exactly what the defect satisfied.
 *
 * It lives here rather than inside one test file because two surfaces draw these triangles —
 * `TriangleAnglesWorked` in `worked/d10GEO1.tsx` and `GeoAngleExplore` — and a measurement
 * kept in one of the two guards is a measurement the other one does without.
 */

import { angleAt, type Point } from "./triangleFromAngles";

/** How far a corner's drawn angle may sit from its label, in degrees. */
export const DRAWN_ANGLE_SLACK = 0.5;

/** The three corners of the one closed outline in a figure, in user units and on screen. */
export function outlineCorners(scope: ParentNode): {
  user: Point[];
  screen: Point[];
} {
  const path = Array.from(scope.querySelectorAll<SVGPathElement>("svg path")).find(
    (node) =>
      (node.getAttribute("d") ?? "").endsWith("Z") && node.getAttribute("fill") === "none",
  );
  if (path === undefined) {
    throw new Error("the figure drew no closed outline to measure");
  }
  const d = path.getAttribute("d") ?? "";
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (numbers === undefined || numbers.length !== 6) {
    throw new Error(`the outline is not a triangle: "${d}"`);
  }
  const ctm = path.getScreenCTM();
  if (ctm === null) {
    throw new Error("the outline has no screen CTM");
  }
  const user: Point[] = [];
  const screen: Point[] = [];
  for (let at = 0; at < 6; at += 2) {
    const x = numbers[at] as number;
    const y = numbers[at + 1] as number;
    user.push({ x, y });
    const on = new DOMPoint(x, y).matrixTransform(ctm);
    screen.push({ x: on.x, y: on.y });
  }
  return { user, screen };
}

/**
 * Where one label is READ, on screen.
 *
 * The `.katex` box when there is one, because that is the ink; the `foreignObject`'s own box
 * otherwise. Either is centred on the point the figure placed the label at, and a pairing by
 * nearest corner does not need better than that.
 */
function labelCentre(host: Element): Point | null {
  const box = (host.querySelector(".katex") ?? host).getBoundingClientRect();
  if (box.width < 0.5 || box.height < 0.5) {
    return null;
  }
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

/**
 * Every bare `N^{\circ}` label whose centre lies inside the outline's own box.
 *
 * The box filter is what keeps a degree label belonging to something ELSE out of the pairing:
 * `GeoAngleExplore` draws a crossing of two lines beside its triangle and marks three angles
 * there, and the equations beside a worked figure carry degree marks of their own. The
 * equations are excluded twice over, by the box and by the pattern, since `180^{\circ}` inside
 * a longer string is not a bare label.
 */
export function cornerLabels(
  scope: ParentNode,
  screen: readonly Point[],
): { said: number; at: Point }[] {
  const left = Math.min(...screen.map((p) => p.x)) - 2;
  const right = Math.max(...screen.map((p) => p.x)) + 2;
  const top = Math.min(...screen.map((p) => p.y)) - 2;
  const bottom = Math.max(...screen.map((p) => p.y)) + 2;
  const found: { said: number; at: Point }[] = [];
  for (const node of Array.from(scope.querySelectorAll("svg foreignObject[data-latex]"))) {
    const digits = /^(\d+)\^\{\\circ\}$/.exec(node.getAttribute("data-latex") ?? "");
    if (digits === null) {
      continue;
    }
    const at = labelCentre(node);
    if (at === null || at.x < left || at.x > right || at.y < top || at.y > bottom) {
      continue;
    }
    found.push({ said: Number(digits[1]), at });
  }
  return found;
}

/**
 * The corners of one figure whose drawn angle is not the angle printed in them, each named
 * with both numbers, or one line saying why the pairing could not be made at all.
 *
 * The angle is computed by `angleAt`, a plain arccos over the painted vertices.
 * `triangleFromAngles` builds by the law of sines and never asks what it has drawn, so this
 * is a second opinion rather than the construction agreeing with itself.
 */
export function cornerMismatches(where: string, scope: ParentNode): string[] {
  const { user, screen } = outlineCorners(scope);
  const labels = cornerLabels(scope, screen);
  if (labels.length !== 3) {
    return [
      `${where}: ${labels.length} angle labels sit inside a three-cornered outline, so no corner could be checked`,
    ];
  }
  const wrong: string[] = [];
  const taken = new Set<number>();
  for (let corner = 0; corner < 3; corner += 1) {
    const here = screen[corner] as Point;
    let nearest = -1;
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < labels.length; index += 1) {
      const label = labels[index] as { said: number; at: Point };
      const gap = Math.hypot(label.at.x - here.x, label.at.y - here.y);
      if (gap < best) {
        best = gap;
        nearest = index;
      }
    }
    if (taken.has(nearest)) {
      wrong.push(
        `${where}: two corners are nearest the same label, so the labels do not read one to a corner`,
      );
      continue;
    }
    taken.add(nearest);
    const said = (labels[nearest] as { said: number }).said;
    const drawn = angleAt(
      user[corner] as Point,
      user[(corner + 1) % 3] as Point,
      user[(corner + 2) % 3] as Point,
    );
    if (Math.abs(drawn - said) > DRAWN_ANGLE_SLACK) {
      wrong.push(
        `${where}: the corner labelled ${said} degrees is drawn at ${drawn.toFixed(1)}`,
      );
    }
  }
  return wrong;
}
