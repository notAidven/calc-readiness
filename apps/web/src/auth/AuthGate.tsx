import { type FormEvent, useEffect, useRef, useState } from "react";

import { AccountShell } from "./AccountShell";
import { consumePostAuthTarget, rememberIntendedRoute } from "./returnTo";
import { type AuthActionResult, useSession } from "./session";

/**
 * **THE FRONT DOOR AND THE FORMS BEHIND IT.**
 *
 * `welcome` is the screen a production visitor with no session lands on, and it is the whole
 * of what changed here on 2026-08-09. This component used to open on `sign-in` for every
 * unrecognised path, which is the correct screen for somebody who already has an account and
 * the wrong one for the audience the product is for: a first-time learner was asked to
 * remember a password they had never set, with the route to creating one in a text link under
 * the button. The default intent is now a concise start screen that leads with Google when
 * OAuth is configured and keeps the existing email account forms as a fallback.
 *
 * Nothing behind the door changed. Every form below is the same real Cognito call it was —
 * sign-up, sign-in, forgot/reset — and `AccountBoundary.test.tsx` still walks them against the
 * service. Sign-up no longer waits on an emailed confirmation code: the PreSignUp Lambda trigger
 * (`infra/lib/calc-readiness-stack.ts`) auto-confirms and auto-verifies every Cognito-native
 * sign-up, so `signUp` now signs the learner straight in.
 *
 * ⚑ **An EXPIRED session does not get the welcome.** That learner has an account and was
 * using it a moment ago; pitching the product to them would be the one screen in the flow
 * that tells them something they already know. `AccountBoundary` passes `expired`, and this
 * opens on `sign-in` when it is set.
 */
type Intent = "welcome" | "sign-in" | "sign-up" | "forgot" | "reset";

const PATHS: Record<Intent, string> = {
  welcome: "/",
  "sign-in": "/sign-in",
  "sign-up": "/create-account",
  forgot: "/forgot-password",
  reset: "/reset-password",
};

/**
 * **THE PASSWORD RULE, IN THE WORDS THE POOL ACTUALLY ENFORCES.**
 *
 * `infra/lib/calc-readiness-stack.ts` sets `minLength: 8`, `requireLowercase`, `requireDigits`,
 * and explicitly NOT uppercase or symbols. Guidance that over-states a policy turns learners
 * away for nothing, and guidance that under-states it hands them a Cognito rejection instead
 * of a rule, so `accountEntry.test.tsx` reads the CDK stack and holds this sentence against it
 * in both directions.
 *
 * Exported so that guard measures the shipped string rather than a copy of it.
 */
export const PASSWORD_GUIDANCE =
  "At least 8 characters, including a lowercase letter and a number.";

export function authIntentForPath(pathname: string): Intent {
  const entry = Object.entries(PATHS).find(([, path]) => path === pathname);
  return (entry?.[0] as Intent | undefined) ?? "welcome";
}

function navigate(intent: Intent, replace = false): void {
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", PATHS[intent]);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function AuthGate({ expired = false }: { readonly expired?: boolean }) {
  const session = useSession();
  const [intent, setIntent] = useState<Intent>(() =>
    // See the module header: a session that just ended opens on the way back in, never on
    // the pitch.
    expired ? "sign-in" : authIntentForPath(window.location.pathname),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    expired ? "Your session ended. Sign in again to continue." : null,
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const sync = () => {
      setIntent(authIntentForPath(window.location.pathname));
      setError(null);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  /*
    Park wherever this visit was aimed at BEFORE the first `navigate()` overwrites the
    address with an account screen. Only a same-origin in-app path survives validation; see
    `returnTo.ts` for why a redirect target from a URL is never taken on trust.
  */
  useEffect(() => {
    rememberIntendedRoute();
  }, []);

  // Forms focus their first field. The welcome screen does not steal focus or paint a focus
  // ring before the learner has interacted.
  useEffect(() => {
    if (intent === "welcome") {
      return;
    }
    emailRef.current?.focus();
  }, [intent]);

  /*
    Announce a NEW or CHANGED error once. This used to live in an inline callback ref; because
    that callback is a new function on every render, React detached and reattached it on every
    controlled-input keystroke and the alert stole focus back from the field after each one.
  */
  useEffect(() => {
    if (error !== null) {
      errorRef.current?.focus();
    }
  }, [error]);

  function switchTo(next: Intent) {
    setError(null);
    setNotice(null);
    navigate(next);
  }

  async function startGoogleSignIn() {
    if (!session.startGoogleSignIn) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await session.startGoogleSignIn();
    if (!result.ok) {
      setBusy(false);
      setError(result.error ?? "Google sign-in could not be opened. Try email instead.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    let result: AuthActionResult;
    if (intent === "sign-up") {
      result = await session.signUp(email.trim(), password);
      if (result.ok) {
        result = await session.signInWithPassword(email.trim(), password);
      }
    } else if (intent === "forgot") {
      result = await session.forgotPassword(email.trim());
      if (result.ok) {
        navigate("reset");
        setNotice("We sent a password reset code to your email.");
        setBusy(false);
        return;
      }
    } else if (intent === "reset") {
      result = await session.confirmForgotPassword(email.trim(), code.trim(), password);
      if (result.ok) {
        navigate("sign-in", true);
        setPassword("");
        setCode("");
        setNotice("Password reset. Sign in with your new password.");
        setBusy(false);
        return;
      }
    } else {
      result = await session.signInWithPassword(email.trim(), password);
    }

    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "The account service could not complete that request.");
      return;
    }
    // The address the learner was aimed at, re-validated on the way out, or `/`. Never the
    // raw value from the URL — see `returnTo.ts`.
    window.history.replaceState(null, "", consumePostAuthTarget());
  }

  const title: Record<Intent, string> = {
    welcome: "Welcome to Calculus Readiness!",
    "sign-in": "Sign in to your account",
    "sign-up": "Create your account",
    forgot: "Reset your password",
    reset: "Choose a new password",
  };
  const submit: Record<Intent, string> = {
    welcome: "Sign in",
    "sign-in": "Sign in",
    "sign-up": "Create account",
    forgot: "Send reset code",
    reset: "Save new password",
  };

  if (intent === "welcome") {
    return (
      <AccountShell scene>
        <section
          className="auth-gate auth-welcome"
          aria-labelledby="auth-gate-title"
          data-testid="account-welcome"
        >
          <span className="auth-gate__eyebrow">Calc Readiness</span>
          <h1 id="auth-gate-title">{title.welcome}</h1>
          <p>Learn, practice, and watch your city grow.</p>

          <div className="auth-welcome__actions">
            {session.startGoogleSignIn ? (
              <>
                <button
                  type="button"
                  className="auth-google"
                  disabled={busy}
                  onClick={() => void startGoogleSignIn()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      fill="#4285f4"
                      d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
                    />
                    <path
                      fill="#34a853"
                      d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
                    />
                    <path
                      fill="#fbbc05"
                      d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.64.39 3.19 1.04 4.55l3.35-2.62Z"
                    />
                    <path
                      fill="#ea4335"
                      d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
                    />
                  </svg>
                  {busy ? "Opening Google…" : "Continue with Google"}
                </button>
                <button
                  type="button"
                  className="auth-welcome__email"
                  onClick={() => switchTo("sign-in")}
                >
                  Use email instead
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-action auth-gate__submit"
                  onClick={() => switchTo("sign-in")}
                >
                  {submit.welcome}
                </button>
                <button
                  type="button"
                  className="auth-welcome__email"
                  onClick={() => switchTo("sign-up")}
                >
                  Create account
                </button>
              </>
            )}
          </div>
          {error && (
            <p className="auth-gate__error" role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </p>
          )}
        </section>
      </AccountShell>
    );
  }

  return (
    <AccountShell scene>
      <section className="auth-gate" aria-labelledby="auth-gate-title">
        <span className="auth-gate__eyebrow">Calc Readiness</span>
        <h1 id="auth-gate-title">{title[intent]}</h1>
        <p>
          {intent === "sign-up"
            ? "Create an account with your email."
            : intent === "forgot" || intent === "reset"
              ? "We’ll send a reset code to your email."
              : "Use your email and password."}
        </p>

        {intent === "sign-up" ? (
          <aside className="auth-gate__privacy" aria-label="Beta privacy notice">
            <strong>Before you continue</strong>
            <p>
              Ages 13+. We save your email and progress. Don’t include school or class
              details in bug reports.
            </p>
          </aside>
        ) : null}

        <form className="auth-gate__form" onSubmit={handleSubmit}>
          <label className="auth-gate__field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              ref={emailRef}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {intent === "reset" && (
            <label className="auth-gate__field">
              <span>Reset code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
          )}

          {(intent === "sign-in" || intent === "sign-up" || intent === "reset") && (
            <div className="auth-gate__group">
              <label className="auth-gate__field">
                <span>{intent === "reset" ? "New password" : "Password"}</span>
                <input
                  type="password"
                  autoComplete={intent === "sign-in" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  aria-describedby={
                    intent === "sign-in" ? undefined : "auth-password-guidance"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {/* The rule BEFORE the rejection, and only where a password is being CHOSEN:
                  telling somebody signing in what their password should have looked like is
                  advice they cannot act on. A SIBLING of the label rather than a child of
                  it, so the field's accessible name stays "Password" and the rule arrives
                  as its description. See {@link PASSWORD_GUIDANCE}. */}
              {intent !== "sign-in" && (
                <p className="auth-gate__guidance" id="auth-password-guidance">
                  {PASSWORD_GUIDANCE}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="auth-gate__error" role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </p>
          )}
          {notice && (
            <p className="auth-gate__notice" role="status">
              {notice}
            </p>
          )}
          <button
            className="primary-action auth-gate__submit"
            type="submit"
            disabled={busy}
          >
            {busy ? "Working…" : submit[intent]}
          </button>
        </form>

        <nav className="auth-gate__nav" aria-label="Account help">
          {intent === "sign-in" && (
            <>
              <button type="button" onClick={() => switchTo("sign-up")}>
                Create an account
              </button>
              <button type="button" onClick={() => switchTo("forgot")}>
                Forgot password?
              </button>
              {!expired && (
                <button type="button" onClick={() => switchTo("welcome")}>
                  Back
                </button>
              )}
            </>
          )}
          {intent === "sign-up" && (
            <>
              <button type="button" onClick={() => switchTo("sign-in")}>
                Already have an account? Sign in
              </button>
              <button type="button" onClick={() => switchTo("welcome")}>
                Back
              </button>
            </>
          )}
          {(intent === "forgot" || intent === "reset") && (
            <button type="button" onClick={() => switchTo("sign-in")}>
              Back to sign in
            </button>
          )}
        </nav>
      </section>
    </AccountShell>
  );
}
