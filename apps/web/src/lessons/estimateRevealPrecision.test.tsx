/**
 * What an `EstimateThenCheck` board says the true value IS, once the round closes.
 *
 * The kind printed `round.value.toFixed(3)` in both of the places a learner reads the answer
 * off — the line drawn beside the marker and the reveal passage — and three decimals is a
 * constant rather than a reading of anything. `turning-points-estimate` is the clearest
 * symptom: the number of times a quintic can change direction is FOUR, a whole count with
 * nothing after the point, and the board answered `4.000`. On a scale that steps in ones,
 * where the learner's own marker prints `4`, that is the board inventing three digits of
 * precision it does not have and cannot have.
 *
 * The rule is the one the slider readout already followed: state the value at the precision
 * the scale steps in, and go finer only where the value genuinely needs it. So this file
 * asserts BOTH directions, because the fix regresses in the opposite direction just as
 * easily. Clamping every board to its scale would take `arctan \frac{8}{15}` from
 * `28.072` to `28`, on a board whose quantity promises three decimals, and a sweep that only
 * checked for missing zeros would call that a pass.
 *
 * ## What is read, and where from
 *
 * The two numbers come out of the DOM rather than out of the round data: the SvgMath the
 * board draws under the axis once a round settles, and the `\approx` line in the reveal
 * passage. Both are found by their quantity, which the board also renders on its own in the
 * quantity lane, so nothing here has to know what any board is asking.
 *
 * ## Population
 *
 * Derived: `visualsBuiltOn("EstimateThenCheck")`, floored, with the board the symptom was
 * measured on asserted by name. Precision is a property of the KIND's formatter and not of a
 * round, so one round per adopter exercises it; what the population buys is the spread of
 * scales and values, and the census below turns that spread into two assertions that fail if
 * the sweep ever stops covering both directions.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { visualsBuiltOn } from "./kindFamily";
import { LessonVisual, type LessonVisualId } from "./visuals";

const ESTIMATE_VISUALS: readonly LessonVisualId[] = visualsBuiltOn("EstimateThenCheck");

/** A floor, not a pin. Five is what the kind carried when this was written. */
const MIN_ADOPTERS = 4;

/** How many digits a decimal string carries after the point. */
function decimalsIn(stated: string): number {
  const point = stated.indexOf(".");
  return point === -1 ? 0 : stated.length - point - 1;
}

/**
 * The precision the SCALE steps in, read off the slider the board mounted. This mirrors the
 * kind's own marker readout, which is the whole point: the learner's mark and the true value
 * have to be quoted on the same footing or the gap between them cannot be read.
 */
function scaleDecimals(step: number): number {
  return step < 1 ? 2 : 0;
}

function latexes(host: HTMLElement, within: string): string[] {
  const scope = within === "" ? host : host.querySelector(within);
  if (!scope) {
    return [];
  }
  return Array.from(scope.querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
}

/** The quantity the round is asking about, as the board renders it on its own. */
function quantityOf(host: HTMLElement): string {
  const [quantity] = latexes(host, '[data-estimate-lane="quantity"]');
  if (quantity === undefined || quantity === "") {
    throw new Error("the board draws no quantity to find its answer by");
  }
  return quantity;
}

/** The number following `relation` in the one latex that restates `quantity`. */
function statedAfter(
  candidates: readonly string[],
  quantity: string,
  relation: string,
): string {
  const head = `${quantity} ${relation} `;
  const line = candidates.find((latex) => latex.startsWith(head));
  if (line === undefined) {
    throw new Error(
      `no line reads "${head}..."; the board offered ${JSON.stringify(candidates)}`,
    );
  }
  return line.slice(head.length).trim();
}

interface Reading {
  readonly id: LessonVisualId;
  readonly quantity: string;
  readonly step: number;
  /** The value as the line under the axis states it. */
  readonly drawn: string;
  /** The value as the reveal passage states it. */
  readonly revealed: string;
}

function range(host: HTMLElement): HTMLInputElement {
  const el = host.querySelector<HTMLInputElement>(".lesson-interactive__range");
  if (!el) {
    throw new Error("the board has no marker slider");
  }
  return el;
}

function button(host: HTMLElement, text: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll("button")).find((candidate) =>
    (candidate.textContent ?? "").includes(text),
  );
  if (!match) {
    throw new Error(`the board offers no "${text}" control`);
  }
  return match;
}

/** Park the marker and press Check, reporting whether the round settled. */
function commit(host: HTMLElement, at: number): boolean {
  fireEvent.change(range(host), { target: { value: String(at) } });
  fireEvent.click(button(host, "Check this spot"));
  return range(host).disabled;
}

/**
 * Settle the round by bisecting the scale on the board's own "too far right" / "too far left"
 * feedback. Nothing here knows any board's answer, which is what makes the value it then reads
 * off the board a statement the board made rather than one the test supplied.
 */
function settle(host: HTMLElement): void {
  const el = range(host);
  const step = Number(el.step);
  let lo = Number(el.min);
  let hi = Number(el.max);
  for (let guard = 0; guard < 64 && lo <= hi; guard += 1) {
    const steps = Math.round((hi - lo) / step);
    const mid = Number((lo + Math.floor(steps / 2) * step).toFixed(6));
    if (commit(host, mid)) {
      return;
    }
    const said = host.querySelector(".lesson-interactive__status")?.textContent ?? "";
    if (said.includes("too far right")) {
      hi = Number((mid - step).toFixed(6));
    } else if (said.includes("too far left")) {
      lo = Number((mid + step).toFixed(6));
    } else {
      throw new Error(`the board said nothing usable at ${mid}: ${said}`);
    }
  }
  throw new Error("no position on the scale settled the round");
}

/**
 * Read back both statements of the true value: the line the board draws under the axis once
 * the round is settled, and the `\approx` line in the reveal passage.
 *
 * They come off two mounts because they are two different endings for one round — settling it
 * and asking to be taught it — and there is no order in which one mount gives up both.
 */
function readAnswer(id: LessonVisualId): Reading {
  const settled = render(<LessonVisual id={id} onComplete={() => {}} />);
  let quantity: string;
  let step: number;
  let drawn: string;
  try {
    quantity = quantityOf(settled.container);
    step = Number(range(settled.container).step);
    settle(settled.container);
    drawn = statedAfter(latexes(settled.container, "svg"), quantity, "=");
  } finally {
    settled.unmount();
  }

  const missed = render(<LessonVisual id={id} onComplete={() => {}} />);
  try {
    const host = missed.container;
    if (quantityOf(host) !== quantity) {
      throw new Error(`${id} dealt a different round on the second mount`);
    }
    // The far end of the scale is a miss on every board on this kind, which is what puts the
    // reveal on offer. A board that settled it would fail at the reveal button below.
    commit(host, Number(range(host).min));
    fireEvent.click(button(host, "Reveal where it lands"));
    const revealed = statedAfter(
      latexes(host, ".lesson-interactive__reveal-answer"),
      quantity,
      "\\approx",
    );
    return { id, quantity, step, drawn, revealed };
  } finally {
    missed.unmount();
  }
}

describe("an estimate board states its true value at the precision it actually has", () => {
  it(`sweeps ${ESTIMATE_VISUALS.length} adopters of the kind`, () => {
    expect(
      ESTIMATE_VISUALS.length,
      "no registered widget is built on EstimateThenCheck, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(MIN_ADOPTERS);
    expect(
      ESTIMATE_VISUALS,
      "turning-points-estimate is the board the 4.000 symptom was measured on and it has left the kind",
    ).toContain("turning-points-estimate");
    expect(
      ESTIMATE_VISUALS,
      "trg-inverse-estimate is the board that proves real decimals survive and it has left the kind",
    ).toContain("trg-inverse-estimate");
  });

  const readings: Reading[] = [];

  it.each(ESTIMATE_VISUALS)(
    "%s quotes the true value on the same footing as the marker",
    (id) => {
      const reading = readAnswer(id);
      readings.push(reading);
      const { drawn, revealed, step } = reading;
      const floor = scaleDecimals(step);

      expect(
        revealed,
        `${id} draws ${drawn} beside the marker and reveals ${revealed}, so the learner is told the value twice and told it differently`,
      ).toBe(drawn);

      expect(
        decimalsIn(drawn),
        `${id} states ${drawn} on a scale stepping in ${step}, which is coarser than the marker's own readout, so the learner cannot read the gap`,
      ).toBeGreaterThanOrEqual(floor);

      if (decimalsIn(drawn) > floor) {
        expect(
          drawn.endsWith("0"),
          `${id} states ${drawn} on a scale stepping in ${step}: the digits past the scale's own precision are padding, and a board that pads is claiming a measurement it never made`,
        ).toBe(false);
      }
    },
    30_000,
  );

  /**
   * The two directions, asserted over what the sweep actually read rather than over a list
   * written here. Either one alone is passed by a broken formatter: pad everything to three
   * decimals and the first fails; clamp everything to the scale and the second does.
   */
  it("read at least one whole value and at least one that needed its decimals", () => {
    expect(
      readings.length,
      "no adopter was read, so both censuses below hold over nothing",
    ).toBeGreaterThanOrEqual(MIN_ADOPTERS);

    const whole = readings.filter((reading) => decimalsIn(reading.drawn) === 0);
    expect(
      whole.map((reading) => `${reading.id} states ${reading.drawn}`),
      "no board on this kind states a whole value as a whole number, so nothing here would notice the padding coming back",
    ).not.toEqual([]);

    const finer = readings.filter(
      (reading) => decimalsIn(reading.drawn) > scaleDecimals(reading.step),
    );
    expect(
      finer.map((reading) => `${reading.id} states ${reading.drawn}`),
      "no board states more decimals than its scale steps in, so a value with real decimals has been rounded away and this sweep would not know",
    ).not.toEqual([]);
  });
});
