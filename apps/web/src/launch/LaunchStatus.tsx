/**
 * **WHAT THE ORDINARY ROUTE SHOWS WHILE IT DOES NOT YET KNOW.**
 *
 * The launch decision needs the account's own city, and until that read lands there is exactly
 * one honest thing to draw. This is deliberately the same shell the account boundary's
 * "Checking your session…" and "Account service unavailable" screens use, so a learner sees one
 * continuous surface from the front door to their island rather than three different products.
 *
 * ⚑ **Neither state falls through to a city.** A read that failed is not evidence that the
 * account is empty, and *Start at Era 1* offered to a learner who is four eras in is the exact
 * "my progress reset" defect this path exists to prevent. So the failure gets Retry and nothing
 * else, per §6 of the production-backend plan: query failures show retry and never substitute
 * local state.
 */
import { AccountShell } from "../auth/AccountShell";

export function LaunchStatus({
  kind,
  message,
  onRetry,
}: {
  readonly kind: "loading" | "error";
  readonly message?: string;
  readonly onRetry?: () => void;
}) {
  if (kind === "loading") {
    return (
      <AccountShell status busy>
        <section className="account-status" aria-live="polite" data-testid="launch-loading">
          <div className="account-status__spinner" aria-hidden="true" />
          <h1>Opening your city…</h1>
        </section>
      </AccountShell>
    );
  }

  return (
    <AccountShell status>
      <section className="account-status" role="alert" data-testid="launch-error">
        <h1>We could not reach your city</h1>
        <p>
          Your progress is safe on your account. We are not opening a city until we can read
          it, so nothing here can overwrite what is already there.
        </p>
        {message && <p className="account-status__code">{message}</p>}
        <button type="button" className="primary-action" onClick={onRetry}>
          Try again
        </button>
      </section>
    </AccountShell>
  );
}
