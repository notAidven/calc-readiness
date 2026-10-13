import {
  createGraphComparator,
  GRAPH_COMPARATOR_VERSION,
  GraphInput,
  type GraphInputSubmission,
  toGraphWorkspace,
} from "@cr/components";
import { GRAPH_ITEM_SLICES, toGraphItemVersions } from "@cr/item-bank";
import { useMemo, useState } from "react";

import "./diagnostic-demo.css";

/**
 * A live diagnostic surface for GRAPH-answer items (Answer_Equivalence_Spec §8).
 * It renders an authored graph slice with the scored-SVG {@link GraphInput} and
 * grades the emitted numeric payload through the REAL geometric comparator, over
 * the SAME seam the text diagnostic uses: an injected checker keyed by an immutable
 * `item_version_id` + `equivalence_checker_version`, with an `onChecked` callback
 * recording the client verdict (`feedbackMode="record-only"`, exactly as
 * `DiagnosticRunner` records `MathInput` submissions). This proves a graph-type
 * item can be answered and graded inside the diagnostic flow. Reached with `?graph`.
 */
export function GraphProbe() {
  // The comparator holds the answer keys; the widget only ever gets the answer-free
  // workspace, so grading uses the same checker the authoritative scorer would.
  const comparator = useMemo(
    () => createGraphComparator({ itemVersions: toGraphItemVersions(GRAPH_ITEM_SLICES) }),
    [],
  );
  const [activeId, setActiveId] = useState(GRAPH_ITEM_SLICES[0]?.item_version_id ?? "");
  const [verdicts, setVerdicts] = useState<
    Record<string, { status: string; reason: string }>
  >({});

  const slice = GRAPH_ITEM_SLICES.find((entry) => entry.item_version_id === activeId);
  const workspace = useMemo(
    () => (slice ? toGraphWorkspace(slice.expected) : null),
    [slice],
  );

  function record(submission: GraphInputSubmission): void {
    setVerdicts((prev) => ({
      ...prev,
      [activeId]: {
        status: submission.result.status,
        reason: submission.result.reason_code,
      },
    }));
  }

  const verdict = verdicts[activeId];

  return (
    <section className="diagnostic-demo" aria-labelledby="graph-probe-title">
      <div className="dgx-probe__head">
        <span className="dgx-eyebrow">Capability probe · Graph answers (§8)</span>
        <h2 id="graph-probe-title" className="dgx-probe__title">
          Answer a graph item — plot the curve and mark its features
        </h2>
        <p className="dgx-lede">
          The scored-SVG widget emits a structured numeric response (samples, points,
          scalars, region membership — never a bitmap) that the geometric comparator grades,
          over the same injected-checker seam the text diagnostic uses.
        </p>
      </div>

      <div className="dgx-probe__meter" role="tablist" aria-label="Graph slices">
        {GRAPH_ITEM_SLICES.map((entry) => (
          <button
            key={entry.item_version_id}
            type="button"
            role="tab"
            aria-selected={entry.item_version_id === activeId}
            className="dgx-btn dgx-btn--ghost"
            data-active={entry.item_version_id === activeId}
            onClick={() => setActiveId(entry.item_version_id)}
          >
            {entry.node_id}
          </button>
        ))}
      </div>

      {slice && workspace ? (
        <div className="dgx-item" data-item-version-id={slice.item_version_id}>
          <div className="dgx-item__meta">
            <span className="dgx-item__node">{slice.node_id}</span>
            {verdict && (
              <span className="dgx-item__answered" data-status={verdict.status}>
                Recorded: {verdict.status}
                {verdict.status !== "correct" ? ` (${verdict.reason})` : ""}
              </span>
            )}
          </div>
          <p className="dgx-item__prompt-text">{slice.prompt}</p>
          <GraphInput
            key={slice.item_version_id}
            itemVersionId={slice.item_version_id}
            checkerVersion={GRAPH_COMPARATOR_VERSION}
            comparator={comparator}
            workspace={workspace}
            feedbackMode="record-only"
            label={`Your graph for ${slice.node_id}`}
            submitLabel="Record graph answer"
            onChecked={record}
          />
        </div>
      ) : (
        <p className="dgx-empty">No graph slice selected.</p>
      )}
    </section>
  );
}
