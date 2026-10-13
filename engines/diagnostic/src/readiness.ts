import type { CoverageMeasurementRecord } from "./coverage-measurement";
import type { MeasurementRecord } from "./measurement";

/**
 * The reported pre/post gain, tagged with the metric it was computed under: v1's
 * difficulty-aware ability frontier θ, or v2's depth-weighted readiness coverage.
 * The `model` discriminant lets a single read endpoint + UI serve both the shipped
 * MST and the walk during (and after) the default-instrument flip (Amendment v2 §9
 * step 5b / step 7). Kept here — on the browser-safe metric package — so the server
 * read (`computeStudentReadiness`) and the browser client/UI share ONE shape
 * without the browser importing the server-only Aurora entry.
 */
export type ReadinessMeasurement =
  | { model: "ability"; measurement: MeasurementRecord }
  | { model: "coverage"; measurement: CoverageMeasurementRecord };
