import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { apiBaseUrl, apiPostJsonAuthenticated } from "../api";
import type { AuthenticatedAccount } from "../auth/AccountBoundary";
import { HudIcon } from "../city/HudIcon";

function browserName(): string {
  const agent = navigator.userAgent;
  if (/Edg\//.test(agent)) return "Edge";
  if (/Firefox\//.test(agent)) return "Firefox";
  if (/Chrome\//.test(agent)) return "Chrome";
  if (/Safari\//.test(agent)) return "Safari";
  return "Other browser";
}

export function BugReportButton({ account }: { readonly account: AuthenticatedAccount }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [attemptedAction, setAttemptedAction] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    if (status === "sending") return;
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, [status]);

  function openReport() {
    setDescription("");
    setAttemptedAction("");
    setStatus("idle");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    (
      descriptionRef.current ??
      dialogRef.current?.querySelector<HTMLButtonElement>("button")
    )?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), textarea:not([disabled]), input:not([disabled])",
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  async function submit() {
    const base = apiBaseUrl();
    if (!base) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      await apiPostJsonAuthenticated(`${base}/bug-report`, account.getAccessToken, {
        description,
        attempted_action: attemptedAction || null,
        // Path only: query strings and hashes can contain private or transient data.
        page_path: window.location.pathname,
        browser_name: browserName(),
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="bug-report-backdrop" role="presentation">
            <section
              ref={dialogRef}
              className="bug-report-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bug-report-title"
            >
              {status === "sent" ? (
                <div className="bug-report-success" aria-live="polite">
                  <span aria-hidden="true">OK</span>
                  <h2 id="bug-report-title">Report received</h2>
                  <p>Thank you. The beta team can now investigate it.</p>
                  <button type="button" className="primary-action" onClick={close}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <header className="bug-report-heading">
                    <div>
                      <p className="bug-report-kicker">Beta feedback</p>
                      <h2 id="bug-report-title">Report a bug</h2>
                    </div>
                    <button
                      type="button"
                      className="bug-report-close"
                      aria-label="Close bug report"
                      disabled={status === "sending"}
                      onClick={close}
                    >
                      X
                    </button>
                  </header>
                  <p className="bug-report-intro">
                    Tell us what went wrong. Please don't include your name, email, school,
                    or class information.
                  </p>
                  <label>
                    What happened?
                    <textarea
                      ref={descriptionRef}
                      value={description}
                      minLength={10}
                      maxLength={2000}
                      required
                      placeholder="Example: I tapped Build, but the menu did not open."
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </label>
                  <label>
                    What were you trying to do? <span>(optional)</span>
                    <input
                      value={attemptedAction}
                      maxLength={500}
                      placeholder="Example: Place the Store"
                      onChange={(event) => setAttemptedAction(event.target.value)}
                    />
                  </label>
                  <p className="bug-report-privacy">
                    This report is linked to your account and includes this page, browser
                    type, and screen size. It does not include your answers or browsing
                    history.
                  </p>
                  {status === "error" ? (
                    <p className="bug-report-error" role="alert">
                      We couldn't send that report. Check your connection and try again.
                    </p>
                  ) : null}
                  <div className="bug-report-actions">
                    <button type="button" disabled={status === "sending"} onClick={close}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="primary-action"
                      disabled={description.trim().length < 10 || status === "sending"}
                      onClick={() => void submit()}
                    >
                      {status === "sending" ? "Sending..." : "Send report"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="city-action city-action-ghost menu-report-bug"
        data-testid="menu-report-bug"
        onClick={openReport}
      >
        <HudIcon name="alert" />
        Report a bug
      </button>
      {modal}
    </>
  );
}
