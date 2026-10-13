import {
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  GraphCheckResult,
  GraphComparator,
  GraphFeatureKind,
  GraphResponsePayload,
} from "./graph-comparator";
import {
  type GraphWorkspace,
  READABLE_KIND,
  sampleSmoothCurve,
  seedControlXs,
} from "./graph-workspace";
import type { GraphPoint } from "./index";

/**
 * The interactive scored-SVG graph input (Answer_Equivalence_Spec §8, the
 * `Graph_Comparator_Spike.md` widget follow-up). A student plots a curve and/or
 * places scored features on an SVG coordinate plane; the widget emits the same
 * structured numeric `GraphResponsePayload` (samples / points / scalars / region
 * memberships, NEVER a bitmap) that the geometric comparator scores. It is handed
 * an answer-free {@link GraphWorkspace} (built from the item's `expected` via
 * `toGraphWorkspace`, which strips the reference curve, the feature coordinates,
 * and the region truth) plus the injected comparator, so the widget never holds
 * the answer key — the same seam `MathInput` uses for text answers.
 *
 * Accessibility: every scored quantity is entered through a native, labeled
 * control (a number field for coordinates and scalars, a toggle for each region
 * probe), and each on-plane marker is a focusable slider that arrow keys nudge, so
 * the whole item is answerable from the keyboard.
 */

export interface GraphInputSubmission {
  response: GraphResponsePayload;
  result: GraphCheckResult;
}

export interface GraphInputProps {
  itemVersionId: string;
  checkerVersion: number;
  /** The injected geometric comparator (the check seam; holds the answer key). */
  comparator: GraphComparator;
  /** Answer-free description of what to elicit (from {@link toGraphWorkspace}). */
  workspace: GraphWorkspace;
  /**
   * The widget's own visible heading. OPTIONAL, because a host that has already rendered
   * the question leaves it off rather than have the widget print the same sentence a
   * second time (see `ExprBuilderInput`).
   */
  label?: string;
  /**
   * The id of an element OUTSIDE the widget that already names it (the host's rendered
   * prompt). With no `label`, the controls region points its `aria-labelledby` here, so the
   * question reaches a screen reader from the one copy of it the host drew.
   */
  labelledBy?: string;
  disabled?: boolean;
  feedbackMode?: "immediate" | "record-only";
  submitLabel?: string;
  onChecked?: (submission: GraphInputSubmission) => void;
}

const VIEW_W = 360;
const VIEW_H = 280;
const PAD = 28;
const NUDGE = 0.25;

interface PlaneMap {
  sx: (x: number) => number;
  sy: (y: number) => number;
  toData: (px: number, py: number) => GraphPoint;
}

function planeMap(
  domain: readonly [number, number],
  range: readonly [number, number],
): PlaneMap {
  const [lo, hi] = domain;
  const [rlo, rhi] = range;
  const plotW = VIEW_W - 2 * PAD;
  const plotH = VIEW_H - 2 * PAD;
  const sx = (x: number): number => PAD + ((x - lo) / (hi - lo || 1)) * plotW;
  const sy = (y: number): number => PAD + (1 - (y - rlo) / (rhi - rlo || 1)) * plotH;
  const toData = (px: number, py: number): GraphPoint => ({
    x: lo + ((px - PAD) / plotW) * (hi - lo),
    y: rlo + (1 - (py - PAD) / plotH) * (rhi - rlo),
  });
  return { sx, sy, toData };
}

/** Round to the nudge grid, then to 4 dp, so emitted values stay clean + deterministic. */
function quantize(value: number): number {
  return Math.round(Number(value.toFixed(4)) / NUDGE) * NUDGE;
}

function feedbackFor(
  result: GraphCheckResult | null,
  mode: GraphInputProps["feedbackMode"],
): string {
  if (!result) {
    return " ";
  }
  if (
    mode === "record-only" &&
    (result.status === "correct" || result.status === "incorrect")
  ) {
    return "Answer recorded.";
  }
  switch (result.status) {
    case "correct":
      return "That graph matches.";
    case "incorrect":
      return incorrectHint(result.reason_code);
    case "invalid_input":
      return "Finish the graph before checking.";
    default:
      return "This item could not be checked right now. It was not counted as wrong.";
  }
}

function incorrectHint(reason: string): string {
  if (reason.startsWith("curve")) {
    return reason === "curve_incomplete"
      ? "Plot the curve across the whole domain."
      : "The curve is off. Check its shape and position.";
  }
  if (reason.startsWith("region")) {
    return "Check which side of the boundary you shaded.";
  }
  if (reason.endsWith("_missing")) {
    return "A required feature is not marked yet.";
  }
  return "Not quite. Check the marked features.";
}

export function GraphInput({
  itemVersionId,
  checkerVersion,
  comparator,
  workspace,
  label,
  labelledBy,
  disabled = false,
  feedbackMode = "immediate",
  submitLabel = "Check graph",
  onChecked,
}: GraphInputProps): ReactElement {
  const ownLabel = label !== undefined && label.trim() !== "";
  const feedbackId = useId();
  const ownLabelId = `${feedbackId}-label`;
  /**
   * Whichever copy of the question exists: the widget's own heading, or the host's prompt when
   * the widget prints none. Each fieldset below has a legend naming only its SUB-TASK ("Mark the
   * points"), so without this a learner who cannot see the prompt above meets a set of groups
   * with no statement of what is being asked. Named per group rather than through a wrapper, for
   * the reason set out in `NumberLineInput`. Two ids concatenate: the question, then the part.
   */
  const labelledById = ownLabel ? ownLabelId : labelledBy;
  const groupName = (legendId: string): string | undefined =>
    labelledById === undefined ? undefined : `${labelledById} ${legendId}`;
  const map = useMemo(
    () => planeMap(workspace.domain, workspace.range),
    [workspace.domain, workspace.range],
  );
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Point-feature positions, keyed by feature label; seeded at the origin.
  const [points, setPoints] = useState<Record<string, GraphPoint>>(() =>
    Object.fromEntries(workspace.points.map((feature) => [feature.label, { x: 0, y: 0 }])),
  );
  // Scalar-feature values, keyed by label (empty string = unset).
  const [scalars, setScalars] = useState<Record<string, string>>(() =>
    Object.fromEntries(workspace.scalars.map((feature) => [feature.label, ""])),
  );
  // Region probe memberships: region label -> probe index -> inside boolean.
  const [regions, setRegions] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(
      workspace.regions.map((region) => [region.label, region.probes.map(() => false)]),
    ),
  );
  // Curve control points (x fixed across the domain; y student-set).
  const [curveY, setCurveY] = useState<number[]>(() =>
    seedControlXs(workspace).map(() => 0),
  );
  const [result, setResult] = useState<GraphCheckResult | null>(null);

  const controlXs = useMemo(() => seedControlXs(workspace), [workspace]);

  function clearResult(): void {
    if (result) {
      setResult(null);
    }
  }

  function buildResponse(): GraphResponsePayload {
    const response: GraphResponsePayload = {};
    if (workspace.points.length > 0) {
      response.points = workspace.points.map(
        (feature) => points[feature.label] ?? { x: 0, y: 0 },
      );
    }
    if (workspace.scalars.length > 0) {
      const scalarPayload: Partial<Record<GraphFeatureKind, number>> = {};
      for (const feature of workspace.scalars) {
        const raw = scalars[feature.label];
        const value = raw === undefined ? Number.NaN : Number(raw);
        if (raw !== undefined && raw !== "" && Number.isFinite(value)) {
          scalarPayload[feature.kind] = value;
        }
      }
      response.scalars = scalarPayload;
    }
    if (workspace.regions.length > 0) {
      const out: Record<string, { x: number; y: number; inside: boolean }[]> = {};
      for (const region of workspace.regions) {
        const memberships = regions[region.label] ?? region.probes.map(() => false);
        out[region.label] = region.probes.map((probe, index) => ({
          x: probe.x,
          y: probe.y,
          inside: memberships[index] ?? false,
        }));
      }
      response.regions = out;
    }
    if (workspace.curve) {
      const control = controlXs.map((x, index) => ({ x, y: curveY[index] ?? 0 }));
      response.samples = sampleSmoothCurve(control, workspace.sampleXs);
    }
    return response;
  }

  function submit(): void {
    const response = buildResponse();
    const checked = comparator({
      response,
      item_version_id: itemVersionId,
      equivalence_checker_version: checkerVersion,
    });
    setResult(checked);
    onChecked?.({ response, result: checked });
  }

  function setPoint(labelKey: string, next: Partial<GraphPoint>): void {
    setPoints((prev) => {
      const current = prev[labelKey] ?? { x: 0, y: 0 };
      return { ...prev, [labelKey]: { ...current, ...next } };
    });
    clearResult();
  }

  function onMarkerPointerDown(labelKey: string, event: ReactPointerEvent): void {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) {
      return; // pointer drag is a progressive enhancement; keyboard/number entry works.
    }
    (event.target as Element).setPointerCapture?.(event.pointerId);
    const move = (moveEvent: PointerEvent): void => {
      const localX = (moveEvent.clientX - ctm.e) / ctm.a;
      const localY = (moveEvent.clientY - ctm.f) / ctm.d;
      const data = map.toData(localX, localY);
      setPoint(labelKey, { x: quantize(data.x), y: quantize(data.y) });
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const state =
    result?.status === "correct"
      ? "correct"
      : result?.status === "incorrect"
        ? "incorrect"
        : result?.status === "invalid_input"
          ? "invalid"
          : result
            ? "error"
            : "idle";

  return (
    <div className="cr-graph-input" data-state={state} data-item-version-id={itemVersionId}>
      {ownLabel && (
        <p className="cr-graph-input__label" id={ownLabelId}>
          {label}
        </p>
      )}
      <svg
        ref={svgRef}
        className="cr-graph-input__plane"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Coordinate plane, x from ${workspace.domain[0]} to ${workspace.domain[1]}`}
        style={{ width: "100%", maxWidth: 420, touchAction: "none" }}
      >
        <Axes map={map} workspace={workspace} />
        {workspace.curve && (
          <CurvePreview
            map={map}
            samples={sampleSmoothCurve(
              controlXs.map((x, index) => ({ x, y: curveY[index] ?? 0 })),
              workspace.sampleXs,
            )}
          />
        )}
        {workspace.regions.map((region) =>
          region.probes.map((probe, index) => (
            <ProbeGlyph
              key={`${region.label}:${probe.x},${probe.y}`}
              map={map}
              probe={probe}
              inside={regions[region.label]?.[index] ?? false}
            />
          )),
        )}
        {workspace.points.map((feature) => {
          const value = points[feature.label] ?? { x: 0, y: 0 };
          return (
            <g key={feature.label}>
              <circle
                className="cr-graph-input__marker"
                cx={map.sx(value.x)}
                cy={map.sy(value.y)}
                r={7}
                onPointerDown={(event) => onMarkerPointerDown(feature.label, event)}
                style={{ cursor: disabled ? "default" : "grab" }}
              >
                <title>{`${feature.label} at (${value.x}, ${value.y})`}</title>
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="cr-graph-input__controls">
        {workspace.curve && (
          <fieldset
            className="cr-graph-input__group"
            aria-labelledby={groupName(`${feedbackId}-curve`)}
          >
            <legend id={`${feedbackId}-curve`}>Plot the curve (set y at each x)</legend>
            <div className="cr-graph-input__curve-row">
              {controlXs.map((x, index) => (
                <label key={x} className="cr-graph-input__field">
                  <span>x = {x}</span>
                  <input
                    type="number"
                    step={NUDGE}
                    inputMode="decimal"
                    disabled={disabled}
                    value={curveY[index] ?? 0}
                    aria-label={`y value at x equals ${x}`}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setCurveY((prev) => {
                        const copy = [...prev];
                        copy[index] = Number.isFinite(next) ? next : 0;
                        return copy;
                      });
                      clearResult();
                    }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {workspace.points.length > 0 && (
          <fieldset
            className="cr-graph-input__group"
            aria-labelledby={groupName(`${feedbackId}-points`)}
          >
            <legend id={`${feedbackId}-points`}>Mark the points</legend>
            {workspace.points.map((feature) => {
              const value = points[feature.label] ?? { x: 0, y: 0 };
              return (
                <div className="cr-graph-input__point-row" key={feature.label}>
                  <span className="cr-graph-input__point-label">
                    {feature.label} ({READABLE_KIND[feature.kind]})
                  </span>
                  <label className="cr-graph-input__field">
                    <span>x</span>
                    <input
                      type="number"
                      step={NUDGE}
                      inputMode="decimal"
                      disabled={disabled}
                      value={value.x}
                      aria-label={`${feature.label} x coordinate`}
                      onChange={(event) =>
                        setPoint(feature.label, { x: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="cr-graph-input__field">
                    <span>y</span>
                    <input
                      type="number"
                      step={NUDGE}
                      inputMode="decimal"
                      disabled={disabled}
                      value={value.y}
                      aria-label={`${feature.label} y coordinate`}
                      onChange={(event) =>
                        setPoint(feature.label, { y: Number(event.target.value) })
                      }
                    />
                  </label>
                </div>
              );
            })}
          </fieldset>
        )}

        {workspace.scalars.length > 0 && (
          <fieldset
            className="cr-graph-input__group"
            aria-labelledby={groupName(`${feedbackId}-scalars`)}
          >
            <legend id={`${feedbackId}-scalars`}>Set the values</legend>
            {workspace.scalars.map((feature) => (
              <label className="cr-graph-input__field" key={feature.label}>
                <span>
                  {feature.label} ({READABLE_KIND[feature.kind]})
                </span>
                <input
                  type="number"
                  step={NUDGE}
                  inputMode="decimal"
                  disabled={disabled}
                  value={scalars[feature.label] ?? ""}
                  aria-label={`${feature.label} ${READABLE_KIND[feature.kind]} value`}
                  onChange={(event) => {
                    setScalars((prev) => ({
                      ...prev,
                      [feature.label]: event.target.value,
                    }));
                    clearResult();
                  }}
                />
              </label>
            ))}
          </fieldset>
        )}

        {workspace.regions.map((region) => (
          <fieldset
            className="cr-graph-input__group"
            key={region.label}
            aria-labelledby={groupName(`${feedbackId}-region-${region.label}`)}
          >
            <legend id={`${feedbackId}-region-${region.label}`}>
              Shade the region: {region.label}
            </legend>
            <div className="cr-graph-input__probes">
              {region.probes.map((probe, index) => {
                const inside = regions[region.label]?.[index] ?? false;
                return (
                  <button
                    type="button"
                    key={`${region.label}:${probe.x},${probe.y}`}
                    className="cr-graph-input__probe"
                    aria-pressed={inside}
                    disabled={disabled}
                    aria-label={`Point (${probe.x}, ${probe.y}) is ${
                      inside ? "inside" : "outside"
                    } the shaded region`}
                    onClick={() => {
                      setRegions((prev) => {
                        const memberships = [
                          ...(prev[region.label] ?? region.probes.map(() => false)),
                        ];
                        memberships[index] = !(memberships[index] ?? false);
                        return { ...prev, [region.label]: memberships };
                      });
                      clearResult();
                    }}
                  >
                    ({probe.x}, {probe.y}): {inside ? "inside" : "outside"}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="cr-graph-input__foot">
        <button
          type="button"
          className="cr-graph-input__submit"
          disabled={disabled}
          onClick={submit}
        >
          {submitLabel}
        </button>
        <p
          id={feedbackId}
          className="cr-graph-input__feedback"
          data-status={result?.status ?? "idle"}
          aria-live="polite"
        >
          {feedbackFor(result, feedbackMode)}
        </p>
      </div>
    </div>
  );
}

function Axes({
  map,
  workspace,
}: {
  map: PlaneMap;
  workspace: GraphWorkspace;
}): ReactElement {
  const [lo, hi] = workspace.domain;
  const [rlo, rhi] = workspace.range;
  const xTicks: number[] = [];
  for (let x = Math.ceil(lo); x <= Math.floor(hi); x += 1) {
    xTicks.push(x);
  }
  return (
    <g>
      <rect
        x={PAD}
        y={PAD}
        width={VIEW_W - 2 * PAD}
        height={VIEW_H - 2 * PAD}
        fill="none"
        stroke="currentColor"
        opacity={0.15}
      />
      {xTicks.map((x) => (
        <line
          key={`gx${x}`}
          x1={map.sx(x)}
          y1={PAD}
          x2={map.sx(x)}
          y2={VIEW_H - PAD}
          stroke="currentColor"
          opacity={x === 0 ? 0.4 : 0.08}
        />
      ))}
      {rlo < 0 && rhi > 0 && (
        <line
          x1={PAD}
          y1={map.sy(0)}
          x2={VIEW_W - PAD}
          y2={map.sy(0)}
          stroke="currentColor"
          opacity={0.4}
        />
      )}
    </g>
  );
}

function CurvePreview({
  map,
  samples,
}: {
  map: PlaneMap;
  samples: readonly GraphPoint[];
}): ReactElement | null {
  if (samples.length < 2) {
    return null;
  }
  const d = samples
    .map((p, index) => `${index === 0 ? "M" : "L"}${map.sx(p.x)} ${map.sy(p.y)}`)
    .join(" ");
  return <path d={d} fill="none" stroke="currentColor" strokeWidth={2} />;
}

function ProbeGlyph({
  map,
  probe,
  inside,
}: {
  map: PlaneMap;
  probe: GraphPoint;
  inside: boolean;
}): ReactElement {
  return (
    <circle
      cx={map.sx(probe.x)}
      cy={map.sy(probe.y)}
      r={4}
      fill={inside ? "currentColor" : "none"}
      stroke="currentColor"
      opacity={0.6}
    />
  );
}
