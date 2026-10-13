import { Component, lazy, type ReactNode, Suspense } from "react";

import { useReducedMotion } from "../city/useReducedMotion";
import { useScrollCue } from "../city/useScrollCue";

/**
 * **THE SURFACE EVERY ACCOUNT SCREEN STANDS ON: the island, the sheet's room, and the cue.**
 *
 * ## What this replaced
 *
 * The front door was a translucent 24px-radius card with a 70px drop shadow floating on a
 * radial-green-over-blue gradient. It was the first thing an ordinary visitor met, it was
 * world-less, and it was in nobody's design language: the product draws a tactile civic world
 * and the launch screen one door further in is a parchment charter on a stone edge over a live
 * island. So this is that screen's own composition, reused rather than imitated — the tokens are
 * shared (`--sheet-*`, `--world-*`), and `accountFrontDoor.browser.test.tsx` reads the launch
 * sheet's computed face, edge, radius and lift in the same run and holds this one to them.
 *
 * ## Why the scene is opt-in
 *
 * Four modules draw an account screen: the front door and its five forms (`AuthGate`), the
 * session check and the service-unavailable card (`AccountBoundary`), the two city-read states
 * (`LaunchStatus`), and the fail-closed configuration card (`App`). All four get the world's
 * sky, ground and vignette, which are three declarations and cost nothing. Only the ones a
 * visitor DWELLS on ask for `scene`, because the island is `three` behind a lazy import and a
 * screen that exists for 400ms while a token refreshes should not pull it.
 *
 * ## Why the cue is here rather than in each screen
 *
 * A short window is the constraining case and the fit fixes cannot cover every one of them: at
 * 200% text there is no trim that trades a 975px card for a 580px window. What that owes is not
 * a smaller sheet but an honest one, so the shell says it continues — in words, retired the
 * moment the learner reaches the end, and `pointer-events: none` in CSS so it can never take a
 * press meant for what is under it. `useScrollCue` measures; this draws.
 */

const TitleBackdrop = lazy(() => import("../city/three/TitleBackdrop"));

/** Feature-detect WebGL without throwing in headless environments (e.g. jsdom). */
function canRenderCanvas(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Fail-closed boundary: a backdrop render/context error drops to the flat stand-in. */
class BackdropErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export function AccountShell({
  children,
  scene = false,
  status = false,
  busy = false,
}: {
  readonly children: ReactNode;
  /** Mount the live island. Left off for screens that exist for a moment. */
  readonly scene?: boolean;
  /** A status card rather than a door, which only changes the class the shell carries. */
  readonly status?: boolean;
  readonly busy?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const { ref, more } = useScrollCue<HTMLElement>();
  const showScene = scene && canRenderCanvas();

  return (
    <main
      className={status ? "account-shell account-shell--status" : "account-shell"}
      ref={ref}
      // The cue needs a band of its own at the foot of the window; see `.account-shell__more`.
      data-more={more ? "true" : undefined}
      aria-busy={busy ? "true" : undefined}
    >
      <div className="account-world" aria-hidden="true">
        <div className="account-world__ground" />
        {showScene && (
          <Suspense fallback={null}>
            <BackdropErrorBoundary>
              <TitleBackdrop reducedMotion={reducedMotion} />
            </BackdropErrorBoundary>
          </Suspense>
        )}
        <div className="account-world__veil" />
      </div>
      {children}
      {more && (
        <p className="account-shell__more" aria-hidden="true">
          {/* The words carry the cue; the chevron is decoration on an already-hidden
              paragraph, and everything below the fold is in the DOM a screen reader reads. */}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 10l6 6 6-6" />
          </svg>
          More below
        </p>
      )}
    </main>
  );
}
