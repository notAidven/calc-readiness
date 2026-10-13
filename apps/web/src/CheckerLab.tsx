import {
  configureAnswerChecker,
  createD1AnswerChecker,
  D1_CHECKER_VERSION,
  D1_GOLDEN_CASES,
  D1_SPIKE_ITEMS,
  MathInput,
} from "@cr/components";

const d1Checker = createD1AnswerChecker({ itemVersions: D1_SPIKE_ITEMS });
configureAnswerChecker(d1Checker);

export function CheckerLab() {
  return (
    <section className="checker-lab" aria-labelledby="checker-lab-title">
      <div className="checker-lab__copy">
        <span className="section-index">03</span>
        <p className="micro-label">Live capability probe</p>
        <h2 id="checker-lab-title">Reduce 6/8 to lowest terms.</h2>
        <p>
          This development fixture checks exact value, fraction representation, and
          simplification as separate constraints.
        </p>
        <div className="checker-lab__status">
          <span>{D1_GOLDEN_CASES.length} golden cases</span>
          <span>Node + Chromium parity</span>
        </div>
      </div>
      <MathInput
        itemVersionId="spike:num-f:reduced:v1"
        checkerVersion={D1_CHECKER_VERSION}
        label="Reduced fraction"
        placeholder="For example, 3/4"
        submitLabel="Run check"
      />
    </section>
  );
}
