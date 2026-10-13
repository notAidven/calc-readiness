import {
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useId,
  useMemo,
  useState,
} from "react";
import type { InteractiveInputProps } from "../../types";
import type {
  NumberLineInterval,
  NumberLinePayload,
  NumberLineWorkspace,
} from "./comparator";

/**
 * The interactive `number_line` input — the SECOND scored interactive widget after
 * the graph input. A student places point(s) and/or interval(s) on a 1-D number
 * line and the widget emits the structured {@link NumberLinePayload} the comparator
 * scores. It is CONTROLLED (emits through `value`/`onChange`) and does NOT self-grade
 * in practice mode: the practice surface owns submission through the global
 * `checkAnswer` seam, exactly like the text input.
 *
 * Accessibility: every scored quantity is entered through a native, labeled control
 * — a number field per point and per interval endpoint, plus a toggle per endpoint
 * inclusivity — and each on-axis marker is a focusable slider that arrow keys nudge,
 * so the whole item is answerable from the keyboard. Pointer drag is a progressive
 * enhancement only. Endpoint inclusivity is shown by BOTH a filled/hollow glyph and
 * a text toggle (never color-only). A polite live region narrates the placement.
 */

const VIEW_W = 360;
const VIEW_H = 96;
const PAD = 28;
const AXIS_Y = 52;

function niceNudge(workspace: NumberLineWorkspace): number {
  if (typeof workspace.tick === "number" && workspace.tick > 0) {
    return workspace.tick;
  }
  const [lo, hi] = workspace.domain;
  const span = hi - lo;
  return span > 0 ? Math.max(0.25, Math.round((span / 10) * 100) / 100) : 0.5;
}

/** Round to the nudge grid, then to 4 dp, so emitted values stay clean + deterministic. */
function quantize(value: number, nudge: number): number {
  const snapped = Math.round(Number(value.toFixed(4)) / nudge) * nudge;
  return Number(snapped.toFixed(4));
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function NumberLineInput({
  itemVersionId,
  workspace,
  value,
  onChange,
  label,
  labelledBy,
  disabled = false,
}: InteractiveInputProps<NumberLineWorkspace, NumberLinePayload>): ReactElement {
  // Printed only when the host asks for it. A practice surface already shows the problem
  // typeset, so echoing the prompt here put it on screen twice, as raw LaTeX the second
  // time; those hosts pass `labelledBy` and leave this off. See `ExprBuilderInput`.
  const ownLabel = label !== undefined && label.trim() !== "";
  const feedbackId = useId();
  const ownLabelId = `${feedbackId}-label`;
  /**
   * The question, wherever the one copy of it lives: the widget's own heading if it printed one,
   * otherwise the host's rendered prompt through `labelledBy`.
   *
   * Every field below is separately labelled, which is what made this look unnecessary. Those
   * names say what each BOX is ("Point 1 position") and not one of them says what is being
   * ASKED, which is precisely the sentence this widget stopped printing when the practice
   * surfaces took the prompt back. Without it the number line would be answerable only by
   * someone who could see the question above it.
   *
   * Applied by NAMING EACH GROUP the question followed by its own legend, rather than by adding
   * a wrapper around them: a `<div role="group">` is what `lint/a11y/useSemanticElements`
   * refuses (correctly — the semantic element for it is `<fieldset>`), and a real `<fieldset>`
   * around these would draw a second default border, since none of the `cr-*` classes here
   * carries any CSS. Two ids in the attribute concatenate, so a group reads "place the solution
   * on the number line, place the points" — the question, then which part of it this is.
   */
  const labelledById = ownLabel ? ownLabelId : labelledBy;
  const groupName = (legendId: string): string | undefined =>
    labelledById === undefined ? undefined : `${labelledById} ${legendId}`;
  const [lo, hi] = workspace.domain;
  const nudge = useMemo(() => niceNudge(workspace), [workspace]);
  const mid = quantize((lo + hi) / 2, nudge);

  const [points, setPoints] = useState<number[]>(() =>
    value?.points
      ? [...value.points]
      : Array.from({ length: workspace.pointCount }, () => mid),
  );
  const [intervals, setIntervals] = useState<NumberLineInterval[]>(() =>
    value?.intervals
      ? value.intervals.map((interval) => ({ ...interval }))
      : Array.from({ length: workspace.intervalCount }, () => ({
          lo: quantize(lo + (hi - lo) / 3, nudge),
          hi: quantize(lo + (2 * (hi - lo)) / 3, nudge),
          loClosed: true,
          hiClosed: true,
        })),
  );

  const plotW = VIEW_W - 2 * PAD;
  const sx = (x: number): number => PAD + ((x - lo) / (hi - lo || 1)) * plotW;

  function emit(nextPoints: number[], nextIntervals: NumberLineInterval[]): void {
    const payload: NumberLinePayload = {};
    if (workspace.pointCount > 0) {
      payload.points = nextPoints;
    }
    if (workspace.intervalCount > 0) {
      payload.intervals = nextIntervals;
    }
    onChange(payload);
  }

  function updatePoint(index: number, next: number): void {
    const copy = [...points];
    copy[index] = next;
    setPoints(copy);
    // Emit AFTER queuing our own state (never inside the updater) so we don't call the
    // parent's setState during this component's render (React warns on that).
    emit(copy, intervals);
  }

  function updateInterval(index: number, patch: Partial<NumberLineInterval>): void {
    const copy = intervals.map((interval, i) =>
      i === index ? { ...interval, ...patch } : interval,
    );
    setIntervals(copy);
    emit(points, copy);
  }

  function onMarkerKeyDown(index: number, event: ReactKeyboardEvent): void {
    if (disabled) {
      return;
    }
    const step =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -nudge
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? nudge
          : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    updatePoint(index, quantize(clamp((points[index] ?? mid) + step, lo, hi), nudge));
  }

  function onMarkerPointerDown(
    index: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ): void {
    if (disabled) {
      return;
    }
    const svg = event.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) {
      return; // pointer drag is progressive enhancement; keyboard/number entry works.
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const move = (moveEvent: PointerEvent): void => {
      const localX = (moveEvent.clientX - ctm.e) / ctm.a;
      const dataX = lo + ((localX - PAD) / plotW) * (hi - lo);
      updatePoint(index, quantize(clamp(dataX, lo, hi), nudge));
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const summary = [
    workspace.pointCount > 0
      ? `${points.length} point${points.length === 1 ? "" : "s"} at ${points
          .map((p) => p)
          .join(", ")}`
      : null,
    workspace.intervalCount > 0
      ? intervals
          .map(
            (interval) =>
              `${interval.loClosed ? "[" : "("}${interval.lo}, ${interval.hi}${
                interval.hiClosed ? "]" : ")"
              }`,
          )
          .join(" and ")
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <div
      className="cr-number-line-input"
      data-item-version-id={itemVersionId}
      data-disabled={disabled}
    >
      {ownLabel && (
        <p className="cr-number-line-input__label" id={ownLabelId}>
          {label}
        </p>
      )}

      <svg
        className="cr-number-line-input__axis"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Number line from ${lo} to ${hi}`}
        style={{ width: "100%", maxWidth: 460, touchAction: "none" }}
      >
        <line
          x1={PAD}
          y1={AXIS_Y}
          x2={VIEW_W - PAD}
          y2={AXIS_Y}
          stroke="currentColor"
          opacity={0.5}
        />
        <AxisTicks lo={lo} hi={hi} nudge={nudge} sx={sx} />

        {intervals.map((interval, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: intervals are fixed positional slots (count is authored, order never changes)
          <g key={`iv-${index}-${interval.lo}-${interval.hi}`}>
            <line
              x1={sx(interval.lo)}
              y1={AXIS_Y}
              x2={sx(interval.hi)}
              y2={AXIS_Y}
              stroke="currentColor"
              strokeWidth={4}
              opacity={0.75}
            />
            <EndpointGlyph cx={sx(interval.lo)} closed={interval.loClosed} />
            <EndpointGlyph cx={sx(interval.hi)} closed={interval.hiClosed} />
          </g>
        ))}

        {points.map((point, index) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: points are fixed positional slots (count is authored, order never changes)
            key={`pt-${index}`}
            className="cr-number-line-input__marker"
            cx={sx(clamp(point, lo, hi))}
            cy={AXIS_Y}
            r={7}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Point ${index + 1} marker`}
            aria-valuemin={lo}
            aria-valuemax={hi}
            aria-valuenow={point}
            aria-disabled={disabled}
            onKeyDown={(event) => onMarkerKeyDown(index, event)}
            onPointerDown={(event) => onMarkerPointerDown(index, event)}
            style={{ cursor: disabled ? "default" : "grab" }}
          >
            <title>{`Point ${index + 1} at ${point}`}</title>
          </circle>
        ))}
      </svg>

      <div className="cr-number-line-input__controls">
        {points.length > 0 && (
          <fieldset
            className="cr-number-line-input__group"
            aria-labelledby={groupName(`${feedbackId}-points`)}
          >
            <legend id={`${feedbackId}-points`}>
              Place the point{points.length === 1 ? "" : "s"}
            </legend>
            {points.map((point, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: points are fixed positional slots (count is authored, order never changes)
              <label className="cr-number-line-input__field" key={`pf-${index}`}>
                <span>Point {index + 1}</span>
                <input
                  type="number"
                  step={nudge}
                  inputMode="decimal"
                  disabled={disabled}
                  value={point}
                  aria-label={`Point ${index + 1} position`}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    updatePoint(index, Number.isFinite(next) ? next : 0);
                  }}
                />
              </label>
            ))}
          </fieldset>
        )}

        {intervals.map((interval, index) => (
          <fieldset
            className="cr-number-line-input__group"
            // biome-ignore lint/suspicious/noArrayIndexKey: intervals are fixed positional slots (count is authored, order never changes)
            key={`if-${index}`}
            aria-labelledby={groupName(`${feedbackId}-iv-${index}`)}
          >
            <legend id={`${feedbackId}-iv-${index}`}>Set interval {index + 1}</legend>
            <label className="cr-number-line-input__field">
              <span>Left endpoint</span>
              <input
                type="number"
                step={nudge}
                inputMode="decimal"
                disabled={disabled}
                value={interval.lo}
                aria-label={`Interval ${index + 1} left endpoint`}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  updateInterval(index, { lo: Number.isFinite(next) ? next : 0 });
                }}
              />
            </label>
            <button
              type="button"
              className="cr-number-line-input__toggle"
              aria-pressed={interval.loClosed}
              disabled={disabled}
              aria-label={`Interval ${index + 1} left endpoint is ${
                interval.loClosed ? "closed (included)" : "open (excluded)"
              }`}
              onClick={() => updateInterval(index, { loClosed: !interval.loClosed })}
            >
              Left: {interval.loClosed ? "closed [" : "open ("}
            </button>
            <label className="cr-number-line-input__field">
              <span>Right endpoint</span>
              <input
                type="number"
                step={nudge}
                inputMode="decimal"
                disabled={disabled}
                value={interval.hi}
                aria-label={`Interval ${index + 1} right endpoint`}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  updateInterval(index, { hi: Number.isFinite(next) ? next : 0 });
                }}
              />
            </label>
            <button
              type="button"
              className="cr-number-line-input__toggle"
              aria-pressed={interval.hiClosed}
              disabled={disabled}
              aria-label={`Interval ${index + 1} right endpoint is ${
                interval.hiClosed ? "closed (included)" : "open (excluded)"
              }`}
              onClick={() => updateInterval(index, { hiClosed: !interval.hiClosed })}
            >
              Right: {interval.hiClosed ? "closed ]" : "open )"}
            </button>
          </fieldset>
        ))}
      </div>

      <p id={feedbackId} className="cr-number-line-input__feedback" aria-live="polite">
        {summary ? `Current answer: ${summary}` : "Nothing placed yet."}
      </p>
    </div>
  );
}

function AxisTicks({
  lo,
  hi,
  nudge,
  sx,
}: {
  lo: number;
  hi: number;
  nudge: number;
  sx: (x: number) => number;
}): ReactElement {
  const ticks: number[] = [];
  // Whole-unit ticks keep the axis readable regardless of the (finer) nudge grid.
  const step = Math.max(1, Math.round(nudge));
  for (let x = Math.ceil(lo); x <= Math.floor(hi); x += step) {
    ticks.push(x);
  }
  return (
    <g>
      {ticks.map((x) => (
        <g key={`tick-${x}`}>
          <line
            x1={sx(x)}
            y1={AXIS_Y - 5}
            x2={sx(x)}
            y2={AXIS_Y + 5}
            stroke="currentColor"
            opacity={x === 0 ? 0.6 : 0.25}
          />
          <text
            x={sx(x)}
            y={AXIS_Y + 20}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            opacity={0.6}
          >
            {x}
          </text>
        </g>
      ))}
    </g>
  );
}

function EndpointGlyph({ cx, closed }: { cx: number; closed: boolean }): ReactElement {
  return (
    <circle
      cx={cx}
      cy={AXIS_Y}
      r={5}
      fill={closed ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
    />
  );
}
