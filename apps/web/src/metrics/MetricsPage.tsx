import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";

import "./metrics.css";

export interface BetaMetrics {
  registered_users: number;
  students_with_progress: number;
  active_last_7_days: number;
  diagnostics_started: number;
  diagnostics_completed: number;
  mastery_evidence_recorded: number;
  generated_at: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; metrics: BetaMetrics }
  | { status: "error" };

const number = new Intl.NumberFormat("en-US");

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

function FunnelRow(props: {
  label: string;
  value: number;
  denominator: number;
  note: string;
}): ReactElement {
  const share = percent(props.value, props.denominator);
  return (
    <div className="metrics-funnel__row">
      <div className="metrics-funnel__copy">
        <span className="metrics-funnel__label">{props.label}</span>
        <strong>{number.format(props.value)}</strong>
      </div>
      <div className="metrics-funnel__track" aria-hidden="true">
        <span
          className="metrics-funnel__fill"
          style={{ "--metrics-fill": `${share}%` } as CSSProperties}
        />
      </div>
      <span className="metrics-funnel__note">{props.note}</span>
    </div>
  );
}

function Snapshot({ metrics }: { metrics: BetaMetrics }): ReactElement {
  const completionRate = percent(
    metrics.diagnostics_completed,
    metrics.diagnostics_started,
  );
  const generated = new Date(metrics.generated_at);
  const updated = Number.isNaN(generated.valueOf())
    ? "just now"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(generated);

  return (
    <>
      <section className="metrics-lead" aria-labelledby="metrics-headline">
        <p className="metrics-kicker">Beta pulse</p>
        <h1 id="metrics-headline">
          <span className="metrics-lead__number">
            {number.format(metrics.registered_users)}
          </span>{" "}
          learners have joined Calc Readiness.
        </h1>
        <p className="metrics-lead__note">Live aggregate activity · updated {updated}</p>
      </section>

      <section className="metrics-funnel" aria-labelledby="metrics-funnel-title">
        <div className="metrics-section-heading">
          <div>
            <p className="metrics-kicker">Participation</p>
            <h2 id="metrics-funnel-title">From signup to a finished diagnostic</h2>
          </div>
          <p>{completionRate}% of started diagnostics are complete.</p>
        </div>
        <div className="metrics-funnel__rows">
          <FunnelRow
            label="Registered accounts"
            value={metrics.registered_users}
            denominator={metrics.registered_users}
            note="Joined the beta"
          />
          <FunnelRow
            label="Started a diagnostic"
            value={metrics.diagnostics_started}
            denominator={metrics.registered_users}
            note="Learners who began"
          />
          <FunnelRow
            label="Completed a diagnostic"
            value={metrics.diagnostics_completed}
            denominator={metrics.registered_users}
            note={`${completionRate}% of starts`}
          />
        </div>
      </section>

      <section className="metrics-details" aria-label="Engagement details">
        <div>
          <span className="metrics-details__label">Active this week</span>
          <strong>{number.format(metrics.active_last_7_days)}</strong>
          <p>Learners who answered at least one question in the last seven days.</p>
        </div>
        <div>
          <span className="metrics-details__label">Building progress</span>
          <strong>{number.format(metrics.students_with_progress)}</strong>
          <p>Learners with saved progress in their city.</p>
        </div>
        <div>
          <span className="metrics-details__label">Mastery signals</span>
          <strong>{number.format(metrics.mastery_evidence_recorded)}</strong>
          <p>Practice results recorded across the beta.</p>
        </div>
      </section>
    </>
  );
}

export function MetricsPage(): ReactElement {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const loadMetrics = useCallback((signal?: AbortSignal) => {
    setState({ status: "loading" });
    fetch("/api/metrics", { signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`metrics request failed: ${response.status}`);
        return (await response.json()) as BetaMetrics;
      })
      .then((metrics) => setState({ status: "ready", metrics }))
      .catch(() => {
        if (signal?.aborted) return;
        setState({ status: "error" });
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadMetrics(controller.signal);
    return () => controller.abort();
  }, [loadMetrics]);

  return (
    <main className="metrics-page">
      <header className="metrics-nav">
        <a href="/" className="metrics-brand" aria-label="Calc Readiness home">
          <span aria-hidden="true" className="metrics-brand__mark">
            CR
          </span>
          <span>Calc Readiness</span>
        </a>
        <a href="/" className="metrics-nav__beta">
          Try the beta
        </a>
      </header>

      <div className="metrics-page__content" aria-live="polite">
        {state.status === "loading" && (
          <div className="metrics-state" role="status">
            <span className="metrics-state__loader" aria-hidden="true" />
            Reading the latest beta activity…
          </div>
        )}
        {state.status === "error" && (
          <div className="metrics-state" role="alert">
            <h1>Metrics are taking a moment.</h1>
            <p>No student data was affected. Try the snapshot again.</p>
            <button type="button" onClick={() => loadMetrics()}>
              Retry
            </button>
          </div>
        )}
        {state.status === "ready" && <Snapshot metrics={state.metrics} />}
      </div>

      <footer className="metrics-footer">
        <p>Aggregate counts only. No names, emails, answers, or individual records.</p>
        <a href="/">Open Calc Readiness</a>
      </footer>
    </main>
  );
}
