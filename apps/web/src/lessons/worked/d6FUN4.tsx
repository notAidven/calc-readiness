/**
 * Worked-solution figures for D6's FUN.4 practice templates: reading direction, turns and
 * extremes off a graph.
 *
 * These five are the clearest case in the domain for a picture, because the prompt is already a
 * picture described in words: a pen's trace through four or five marks. The answer is read OFF
 * that trace, so a reveal that hands back a column of algebra has changed the question. All five
 * are `D6Chart` strip charts, with the stretch or the mark the answer comes from inked apart from
 * the rest of the run.
 *
 * They are deliberately NOT square. The horizontal axis is hours and the vertical is a reading,
 * so there is no shape here to preserve; what matters is that four hour marks are far enough
 * apart to be told from each other, which is what the full width buys.
 *
 * The `kind` param of the L1 shape does not reach the figure, and cannot: it only steers how the
 * bank draws the two legs the question does not ask about, and the drawn readings themselves are
 * in `params`. So every leg here is the leg the prompt described.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, SIGNAL, SOFT } from "../svgKit";
import { spoken, type WorkedSolutionVisual } from "../workedKit";
import { type ChartPath, D6Chart } from "./d6Kit";

/** A strip chart's window: hours across the full width, readings from just under zero. */
function stripWindow(
  lastHour: number,
  readings: readonly number[],
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const top = Math.max(...readings);
  return {
    xMin: -lastHour * 0.1,
    xMax: lastHour * 1.08,
    yMin: -top * 0.14,
    yMax: top * 1.2,
  };
}

/** The run as legs, each inked by whether the answer comes from it. */
function legs(
  marks: readonly (readonly [number, number])[],
  wanted: (index: number) => boolean,
): ChartPath[] {
  return marks.slice(0, -1).map((mark, index) => ({
    points: [mark, marks[index + 1] as readonly [number, number]],
    color: wanted(index) ? CIVIC : SOFT,
  }));
}

export const FUN4_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** One named stretch of the run, with the reading at each of its ends. */
  "d6.fun4.direction.l1": {
    Svg: (params): JSX.Element => {
      const ask = params.ask ?? 0;
      const x1 = params.x1 ?? 3;
      const x2 = params.x2 ?? 6;
      const x3 = params.x3 ?? 9;
      const y0 = params.y0 ?? 7;
      const y1 = params.y1 ?? 10;
      const y2 = params.y2 ?? 6;
      const y3 = params.y3 ?? 9;
      const marks = [
        [0, y0],
        [x1, y1],
        [x2, y2],
        [x3, y3],
      ] as const;
      const from = ask === 0 ? 0 : ask === 1 ? x1 : x2;
      const to = ask === 0 ? x1 : ask === 1 ? x2 : x3;
      const fromY = ask === 0 ? y0 : ask === 1 ? y1 : y2;
      const toY = ask === 0 ? y1 : ask === 1 ? y2 : y3;
      const verdict = toY > fromY ? "increasing" : toY < fromY ? "decreasing" : "constant";
      return (
        <D6Chart
          {...stripWindow(x3, [y0, y1, y2, y3])}
          paths={legs(marks, (index) => index === ask)}
          spans={[{ from, to, color: CIVIC }]}
          dots={[
            { x: from, y: fromY, color: CIVIC },
            { x: to, y: toY, color: CIVIC },
          ]}
          labels={[
            { x: from, y: fromY, latex: `${fromY}`, color: CIVIC, dx: -1, dy: -1 },
            { x: to, y: toY, latex: `${toY}`, color: CIVIC, dx: 1, dy: -1 },
          ]}
          xTicks={[from, to]}
          yTicks={[]}
          footers={[`\\text{${verdict}}`]}
          title="One stretch of a run, with the reading at each of its ends"
          ariaLabel={`The stretch from hour ${spoken(from)} to hour ${spoken(to)}, where the reading goes from ${spoken(fromY)} to ${spoken(toY)} and so is ${verdict}`}
        />
      );
    },
    caption: (params) => {
      const ask = params.ask ?? 0;
      const fromY =
        ask === 0 ? (params.y0 ?? 7) : ask === 1 ? (params.y1 ?? 10) : (params.y2 ?? 6);
      const toY =
        ask === 0 ? (params.y1 ?? 10) : ask === 1 ? (params.y2 ?? 6) : (params.y3 ?? 9);
      const verdict = toY > fromY ? "increasing" : toY < fromY ? "decreasing" : "constant";
      return `Direction is a comparison of two readings and nothing else: the run is ${verdict} across this stretch because the reading at its right end is $${toY}$ against $${fromY}$ at its left. What the trace does anywhere ELSE on the shift is not part of the question, which is why only one leg is inked.`;
    },
  },

  /** The turn, and the one stretch of the run that goes the asked way. */
  "d6.fun4.rising-interval.l2": {
    Svg: (params): JSX.Element => {
      const peak = params.peak ?? 1;
      const want = params.want ?? 0;
      const xt = params.xt ?? 5;
      const xe = params.xe ?? 9;
      const y0 = params.y0 ?? 3;
      const yt = params.yt ?? 9;
      const ye = params.ye ?? 5;
      const marks = [
        [0, y0],
        [xt, yt],
        [xe, ye],
      ] as const;
      // A high turn climbs first and falls second; a low turn does the reverse.
      const first = (want === 0) === (peak === 1);
      const a = first ? 0 : xt;
      const b = first ? xt : xe;
      return (
        <D6Chart
          {...stripWindow(xe, [y0, yt, ye])}
          paths={legs(marks, (index) => (first ? index === 0 : index === 1))}
          spans={[{ from: a, to: b, color: CIVIC }]}
          dots={[{ x: xt, y: yt, color: SIGNAL }]}
          labels={[
            {
              x: xt,
              y: yt,
              latex: peak === 1 ? "\\text{turns down here}" : "\\text{turns up here}",
              color: SIGNAL,
              dx: 0,
              dy: peak === 1 ? -1 : 1,
            },
          ]}
          xTicks={[a, b]}
          yTicks={[]}
          footers={[`(${a},\\, ${b})`]}
          title="A run that turns once, with the stretch going the asked way inked apart"
          ariaLabel={`A run turning at hour ${spoken(xt)}, ${want === 0 ? "climbing" : "falling"} across the stretch from ${spoken(a)} to ${spoken(b)}`}
        />
      );
    },
    caption: (params) => {
      const want = params.want ?? 0;
      const xt = params.xt ?? 5;
      return `The turn at hour $${xt}$ is where the direction changes, so it is the boundary of both stretches and belongs to neither: the brackets are ROUND, because at the turn itself the run is neither ${want === 0 ? "climbing nor falling" : "falling nor climbing"}. An interval names the stretch of INPUTS, so the answer is built from the hour numbers rather than from the readings.`;
    },
  },

  /** The turn, and the height it reaches, which is the answer rather than where it happens. */
  "d6.fun4.peak-value.l2": {
    Svg: (params): JSX.Element => {
      const high = params.high ?? 1;
      const xt = params.xt ?? 5;
      const xe = params.xe ?? 9;
      const y0 = params.y0 ?? 3;
      const yt = params.yt ?? 10;
      const ye = params.ye ?? 4;
      const marks = [
        [0, y0],
        [xt, yt],
        [xe, ye],
      ] as const;
      return (
        <D6Chart
          {...stripWindow(xe, [y0, yt, ye])}
          paths={[
            ...legs(marks, () => false),
            // Across to the reading axis, so the answer is read as a HEIGHT and not as an hour.
            {
              points: [
                [0, yt],
                [xt, yt],
              ],
              color: CIVIC,
              dashed: true,
            },
          ]}
          dots={[{ x: xt, y: yt, color: CIVIC }]}
          labels={[
            { x: xt, y: yt, latex: `${yt}`, color: CIVIC, dx: 1, dy: high === 1 ? -1 : 1 },
          ]}
          xTicks={[xt]}
          yTicks={[yt]}
          footers={[`\\text{${high === 1 ? "highest" : "lowest"} reading} = ${yt}`]}
          title="The turn of a run, with a dashed rule across to the reading it reaches"
          ariaLabel={`A run turning at hour ${spoken(xt)} where the reading is ${spoken(yt)}, which is its ${high === 1 ? "highest" : "lowest"} reading`}
        />
      );
    },
    caption: (params) => {
      const xt = params.xt ?? 5;
      const yt = params.yt ?? 10;
      const high = params.high ?? 1;
      return `The dashed rule runs sideways for a reason: the question asks for the ${high === 1 ? "highest" : "lowest"} READING, which is $${yt}$, and not for the hour $${xt}$ it happens at. Those are two different numbers on two different axes, and reporting the second is the near miss this shape is built around.`;
    },
  },

  /** A local turn that looks like the answer, and the far end that actually is. */
  "d6.fun4.absolute-extreme.l3": {
    Svg: (params): JSX.Element => {
      const high = params.high ?? 1;
      const x1 = params.x1 ?? 3;
      const x2 = params.x2 ?? 6;
      const x3 = params.x3 ?? 9;
      const y0 = params.y0 ?? 2;
      const y1 = params.y1 ?? 7;
      const y2 = params.y2 ?? 4;
      const y3 = params.y3 ?? 11;
      const marks = [
        [0, y0],
        [x1, y1],
        [x2, y2],
        [x3, y3],
      ] as const;
      return (
        <D6Chart
          {...stripWindow(x3, [y0, y1, y2, y3])}
          paths={[
            ...legs(marks, () => false),
            {
              points: [
                [0, y3],
                [x3, y3],
              ],
              color: CIVIC,
              dashed: true,
            },
          ]}
          dots={[
            { x: x1, y: y1, color: BRICK, hollow: true },
            { x: x3, y: y3, color: CIVIC },
          ]}
          labels={[
            {
              x: x1,
              y: y1,
              latex: "\\text{only a local turn}",
              color: BRICK,
              dx: 0,
              dy: high === 1 ? -1 : 1,
            },
            { x: x3, y: y3, latex: `${y3}`, color: CIVIC, dx: -1, dy: high === 1 ? -1 : 1 },
          ]}
          xTicks={[x1, x3]}
          yTicks={[y1, y3]}
          footers={[
            `\\text{at the turn} \\to ${y1}`,
            `\\text{across the whole run} \\to ${y3}`,
          ]}
          title="A local turn set against the far end, which carries the extreme for the whole run"
          ariaLabel={`A run whose local turn reads ${spoken(y1)} but whose far end reads ${spoken(y3)}, so ${spoken(y3)} is the ${high === 1 ? "highest" : "lowest"} reading anywhere on it`}
        />
      );
    },
    caption: (params) => {
      const high = params.high ?? 1;
      const y1 = params.y1 ?? 7;
      const y3 = params.y3 ?? 11;
      return `The hollow mark is a turn, and a turn is only ever ${high === 1 ? "higher" : "lower"} than the readings NEXT to it. The question asks about the whole run, so every mark on it is a candidate, and the far end at $${y3}$ beats the turn's $${y1}$. An extreme over a closed run is often at an end, where nothing turns at all.`;
    },
  },

  /** Two separate stretches going the same way, which is why the answer needs a union. */
  "d6.fun4.fall-union.l3": {
    Svg: (params): JSX.Element => {
      const want = params.want ?? 0;
      const x1 = params.x1 ?? 3;
      const x2 = params.x2 ?? 6;
      const x3 = params.x3 ?? 9;
      const x4 = params.x4 ?? 12;
      const y0 = params.y0 ?? 4;
      const y1 = params.y1 ?? 8;
      const y2 = params.y2 ?? 5;
      const y3 = params.y3 ?? 9;
      const y4 = params.y4 ?? 6;
      const marks = [
        [0, y0],
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x4, y4],
      ] as const;
      return (
        <D6Chart
          {...stripWindow(x4, [y0, y1, y2, y3, y4])}
          paths={legs(marks, (index) => index === 1 || index === 3)}
          spans={[
            { from: x1, to: x2, color: CIVIC },
            { from: x3, to: x4, color: CIVIC },
          ]}
          dots={[
            { x: x1, y: y1, color: CIVIC },
            { x: x2, y: y2, color: CIVIC },
            { x: x3, y: y3, color: CIVIC },
            { x: x4, y: y4, color: CIVIC },
          ]}
          labels={[]}
          xTicks={[x1, x2, x3, x4]}
          yTicks={[]}
          footers={[`(${x1},\\, ${x2}) \\cup (${x3},\\, ${x4})`]}
          title="The two separate stretches of a run that go the same way"
          ariaLabel={`A run ${want === 0 ? "falling" : "climbing"} from hour ${spoken(x1)} to hour ${spoken(x2)} and again from hour ${spoken(x3)} to hour ${spoken(x4)}`}
        />
      );
    },
    caption: (params) => {
      const want = params.want ?? 0;
      const x2 = params.x2 ?? 6;
      const x3 = params.x3 ?? 9;
      const word = want === 0 ? "falls" : "climbs";
      return `The run ${word} twice, with a stretch going the other way in between, so the answer cannot be one interval: the hours between $${x2}$ and $${x3}$ are not part of it. Two separate stretches joined by a union is the only honest way to say that, and it is why the question asks for EVERY stretch rather than the stretch.`;
    },
  },
};
