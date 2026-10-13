import type { UUID } from "@cr/state-schema";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { AccountRuntimeConfig } from "../runtimeMode";
import { AccountShell } from "./AccountShell";
import { AuthGate } from "./AuthGate";
import type { CognitoAuthService } from "./cognitoClient";
import { consumePostAuthTarget, isAuthScreenPath } from "./returnTo";
import { AccountSessionProvider } from "./SessionContext";
import { useScreenTakeover } from "./screenTakeover";
import { useSession } from "./session";

export interface AuthenticatedAccount {
  readonly studentId: UUID;
  readonly getAccessToken: (forceRefresh?: boolean) => Promise<string | null>;
}

/**
 * The clear gap (px) every surface reserves BELOW the account chrome's own painted bottom
 * edge, on top of the chrome's own `top: 10px`. Matches the chrome's own visual rhythm
 * (`--space-sm`) rather than inventing a second number for the same idea.
 */
const ACCOUNT_CHROME_GAP_PX = 8;

/**
 * The CSS custom property every top-of-viewport surface reads to stay clear of the fixed
 * Signed in / Sign out chrome. Set on `documentElement` (not a component-scoped variable)
 * because the chrome and the surfaces it can cover are SIBLINGS with no shared ancestor
 * short of the document — `AccountBoundaryContent` renders the nav AFTER `children`, so a
 * CSS variable declared on a wrapper around both would still have to be `:root`-scoped to
 * reach a `position: fixed` descendant that escapes ordinary containment anyway.
 */
export const ACCOUNT_CHROME_CLEAR_PROPERTY = "--account-chrome-clear";

function AccountBoundaryContent({
  children,
}: {
  readonly children: (account: AuthenticatedAccount) => ReactNode;
}) {
  const session = useSession();
  const takeover = useScreenTakeover();
  const authenticated = session.status === "authenticated" && Boolean(session.studentId);
  const chromeRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  /**
   * ⚑ **THE IDENTITY IS ONE OBJECT PER SESSION, AND A RE-RENDER OF THIS BOUNDARY MUST NOT COST
   * A CITY READ.**
   *
   * `children` used to be handed a fresh `{ studentId, getAccessToken }` literal on every render.
   * `App`'s `apiCityBundle` memo is keyed on exactly that object, so anything that re-rendered
   * this component invalidated the bundle, re-ran `GET /api/city`, and rebuilt the authenticated
   * city session under a mounted city. Nothing re-rendered it before, so the fragility was
   * invisible; `useScreenTakeover` above re-renders it twice per takeover, and
   * `diagnosticCanonicalHandoff.test.tsx` went from 2 city reads to 4 the moment it did. Both
   * halves of the identity are already stable (`studentId` is state, `getAccessToken` is a
   * `useCallback` in `SessionContext`), so memoising on them is exact rather than a papered join.
   */
  const account = useMemo<AuthenticatedAccount>(
    () => ({
      studentId: session.studentId as UUID,
      getAccessToken: session.getAccessToken,
    }),
    [session.studentId, session.getAccessToken],
  );

  /*
    NORMALISE THE ADDRESS ONCE A SESSION EXISTS. A learner who reloads on `/sign-in` with a
    valid Cognito session is signed in, so leaving `/sign-in` in the address bar means every
    bookmark, share and back-button they produce from here points at a form they do not need
    — and it is the URL an "am I signed in?" screenshot would show. `replaceState` rather
    than a push, so the account screen does not become a history entry to go back to.
  */
  useEffect(() => {
    if (!authenticated || typeof window === "undefined") {
      return;
    }
    if (!isAuthScreenPath(window.location.pathname)) {
      return;
    }
    window.history.replaceState(null, "", consumePostAuthTarget());
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [authenticated]);

  /*
    RESERVE SPACE FOR THE CHROME, MEASURED RATHER THAN GUESSED. `.account-chrome` is
    `position: fixed` at the top centre — the one lane every full-bleed surface (the launch
    masthead, the Bay's island banner, the Stone HUD) also reaches for — and it renders as a
    SIBLING of whatever screen is showing, after it, so nothing under it can push it out of
    the way through ordinary layout. This is the other direction: publish the chrome's own
    painted bottom edge (plus a gap) as a `documentElement`-scoped variable, so those surfaces
    can pull their own top edge down to clear it instead.

    Read with a `var(..., 0px)` fallback everywhere it is consumed, so a mount that never
    reaches this effect (unauthenticated, `/demo`, `/sign-in`) sees the property simply
    absent and every consumer's ORIGINAL, unreserved position — this is how the reservation
    stays out of `/demo` (`accountChromeReservation.browser.test.tsx`'s own isolation case)
    without a second stylesheet.
  */
  useEffect(() => {
    if (!authenticated || typeof window === "undefined") {
      return;
    }
    const root = document.documentElement;
    const measure = () => {
      const rect = chromeRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      root.style.setProperty(
        ACCOUNT_CHROME_CLEAR_PROPERTY,
        `${Math.ceil(rect.bottom + ACCOUNT_CHROME_GAP_PX)}px`,
      );
    };
    measure();
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (chromeRef.current) {
      resizeObserver?.observe(chromeRef.current);
    }
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty(ACCOUNT_CHROME_CLEAR_PROPERTY);
    };
  }, [authenticated]);

  if (session.status === "loading") {
    return (
      <AccountShell status busy>
        <section className="account-status" aria-live="polite">
          <div className="account-status__spinner" aria-hidden="true" />
          <h1>Checking your session…</h1>
          <p>Your city stays closed until account verification finishes.</p>
        </section>
      </AccountShell>
    );
  }

  if (session.status === "error") {
    return (
      <AccountShell status>
        <section className="account-status" role="alert">
          <h1>Account service unavailable</h1>
          <p>
            We could not check your session. Account access remains closed while you retry.
          </p>
          <button type="button" className="primary-action" onClick={session.restoreSession}>
            Retry
          </button>
        </section>
      </AccountShell>
    );
  }

  if (session.status !== "authenticated" || !session.studentId) {
    return <AuthGate expired={session.status === "expired"} />;
  }

  /*
    THE CHROME COMES FIRST, AND IT STANDS DOWN UNDER A TAKEOVER. Two defects, one line of
    composition, and both were measured on the ordinary account mount:

     1. this pill was rendered AFTER `children`, so a control fixed to the top centre of the
        screen — the first thing on it — was stop 16 of 16 in the tab order, behind every HUD
        control in the city. Reading order now matches where it is drawn.
     2. it is `z-index: 95` and the diagnostic takeover is `z-index: 30`, so it painted over an
        `aria-modal` dialog and stayed pressable inside it. `screenTakeover.ts` is how the
        surface that owns the screen says so; `inert` is what takes this out of the pointer and
        focus order, and the stylesheet hides it for the same reason.

    Held by `accountChromeReach.test.tsx` in both directions, including that Sign out comes back
    when the takeover closes.
  */
  return (
    <>
      <nav
        className="account-chrome"
        aria-label="Account controls"
        inert={takeover ? true : undefined}
        ref={(element) => {
          chromeRef.current = element;
        }}
      >
        <div className="account-chrome__menu" ref={menuRef}>
          <button
            type="button"
            className="account-chrome__trigger"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="8.5" r="3.4" fill="currentColor" />
              <path
                d="M4.5 20c1.3-4 4.2-6 7.5-6s6.2 2 7.5 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="visually-hidden">Account menu</span>
          </button>
          {menuOpen && (
            <div className="account-chrome__panel" role="menu">
              <p className="account-chrome__status">Signed in</p>
              <button
                type="button"
                role="menuitem"
                className="account-chrome__item"
                onClick={() => {
                  setMenuOpen(false);
                  void session.signOut().then(() => {
                    window.history.replaceState(null, "", "/");
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  });
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
      {children(account)}
    </>
  );
}

export function AccountBoundary({
  config,
  service,
  children,
}: {
  readonly config: AccountRuntimeConfig;
  readonly service?: CognitoAuthService;
  readonly children: (account: AuthenticatedAccount) => ReactNode;
}) {
  return (
    <AccountSessionProvider config={config} service={service}>
      <AccountBoundaryContent>{children}</AccountBoundaryContent>
    </AccountSessionProvider>
  );
}
