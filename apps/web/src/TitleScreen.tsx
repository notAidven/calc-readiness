import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import { useReducedMotion } from "./city/useReducedMotion";
import { DemoRoutePanel } from "./demo/DemoRoutePanel";
import {
  DIAGNOSTIC_DURATION_ESTIMATE,
  TYPICAL_QUESTIONS,
} from "./diagnostic/diagnosticShape";

/**
 * **THE START CHOICE — the screen between "I have a session" and "I am in the city", and the
 * one question it asks is where to begin.**
 *
 * It is the "Remedial Calculus" title screen, and what changed on 2026-08-09 is that its two
 * buttons stopped being a primary and an afterthought. `Start` / `Take Diagnostic` put the
 * unrecommended route in the gold seat and left the recommended one looking like a detour,
 * with a one-line hint underneath doing all the persuading. Two things are true at once here
 * and the screen has to hold both:
 *
 *  1. **The diagnostic is the better first move for a learner**, because the skills they can
 *     already do are built for them and they start where they actually are. So it is the
 *     recommended route, it is said in words as well as in colour, and it says how big it is.
 *  2. **A deployed demo must be able to enter Era 1 in one press**, with no diagnostic in the
 *     way. So Era 1 is a real second route rather than a link in small type, and taking it
 *     costs nothing later: the diagnostic stays in the city's own ☰ Menu.
 *
 * ## THE FIGURES ARE THE COMMITTED ONES
 *
 * The adaptive question estimate and the `about 15–20 minutes` planning range come from
 * `diagnostic/diagnosticShape.ts`, which is the
 * module `diagnosticIntroPromise.test.ts` holds against
 * `docs/Diagnostic_Coverage_Length_Measurement.md`. This screen quotes the constant rather
 * than a number typed into a sentence, so the promise here and the promise on the
 * diagnostic's own intro card cannot come apart.
 *
 * ## WHAT IT IS NOT ALLOWED TO SAY
 *
 * A placement walk measures what somebody can do on 62 nodes today. It is not a measure of
 * the person and it is not exact, and `startChoice.test.ts` sweeps for both claims. The
 * cross-device sentence is likewise conditional on `accountMode`, because a `/demo` or local
 * city lives in this browser and nowhere else.
 *
 * The living island is a NON-INTERACTIVE 3D backdrop (see `TitleBackdrop`); the panel sits
 * over a legibility scrim in the game's warm panel styling. The backdrop is `React.lazy`-d and
 * WebGL-gated (like the city's `CityCanvasHost`) so `three` never loads for headless tests /
 * no-WebGL, where a static gradient stands in. Reduced motion is honored end-to-end: the
 * ambient orbit + gulls hold still (see `TitleBackdrop`) and the entrance animation is
 * disabled in CSS.
 */

const TitleBackdrop = lazy(() => import("./city/three/TitleBackdrop"));

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

/** Fail-closed boundary: a backdrop render/context error drops to the gradient. */
class BackdropErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function TitleScreen({
  onStart,
  onTakeDiagnostic,
  accountMode = false,
}: {
  /** Enter the city / game at Era 1 (the normal city view, nothing seeded). */
  onStart: () => void;
  /** Enter the diagnostic pretest (which seeds the city on completion). */
  onTakeDiagnostic: () => void;
  /**
   * The learner arrived through the Cognito account boundary, so their city is mirrored to
   * `POST /api/city` under their own subject.
   *
   * It gates ONE sentence and it has to: on `/demo` and on a dev server the city is in this
   * browser's `localStorage` and nowhere else, so promising it follows them to another device
   * would be inventing a backend in a paragraph.
   */
  accountMode?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [webglOk] = useState(canRenderCanvas);
  const diagnosticRef = useRef<HTMLButtonElement>(null);

  // Land keyboard focus on the RECOMMENDED action, so the route we suggest is the one a
  // keyboard learner is already standing on.
  useEffect(() => {
    diagnosticRef.current?.focus();
  }, []);

  const fallback = <div className="title-screen__backdrop-fallback" />;

  return (
    <div className="title-screen" data-reduced-motion={reducedMotion}>
      <div className="title-screen__backdrop" aria-hidden="true">
        {webglOk ? (
          <Suspense fallback={fallback}>
            <BackdropErrorBoundary fallback={fallback}>
              <TitleBackdrop reducedMotion={reducedMotion} />
            </BackdropErrorBoundary>
          </Suspense>
        ) : (
          fallback
        )}
      </div>
      <div className="title-screen__scrim" aria-hidden="true" />

      <main className="title-screen__panel">
        <span className="title-screen__eyebrow">Calculus-readiness city-builder</span>
        <h1 className="title-screen__title">Remedial Calculus</h1>
        <p className="title-screen__tagline">
          Every math skill you master puts a building on your island. Choose where to begin.
        </p>

        {/* TWO ROUTES, STACKED AND RANKED — not a grid of equal tiles. The recommendation
            is carried by the word, by the order and by the gold, in that order of
            importance, so it survives a reader who sees none of the colour. */}
        <div className="start-choice">
          <div className="start-choice__route start-choice__route--recommended">
            <span className="start-choice__tag" id="diagnostic-recommendation">
              Recommended
            </span>
            <button
              type="button"
              className="title-screen__cta title-screen__cta--primary start-choice__cta"
              ref={diagnosticRef}
              aria-describedby="diagnostic-recommendation diagnostic-duration"
              onClick={onTakeDiagnostic}
            >
              Take the diagnostic
            </button>
            <p className="start-choice__meta" id="diagnostic-duration">
              {`About ${TYPICAL_QUESTIONS} questions. Plan for ${DIAGNOSTIC_DURATION_ESTIMATE}.`}
            </p>
            <p className="start-choice__note">
              It finds what you already know, so the skills you have are built for you and
              the rest of the island opens in the right order.
            </p>
          </div>

          <div className="start-choice__route">
            <button
              type="button"
              className="title-screen__cta start-choice__cta"
              onClick={onStart}
            >
              Start at Era 1
            </button>
            <p className="start-choice__note">
              Begin on the bare island and learn every skill in order. Good for a quick
              look, and for anyone who wants the whole journey.
            </p>
          </div>
        </div>

        <p className="title-screen__hint">
          {accountMode
            ? "You can take the diagnostic later from the city's Menu. Your city saves to your account, so it is there on your next device."
            : "You can take the diagnostic later from the city's Menu."}
        </p>
      </main>

      {/* DEV: every era and every crisis, one press each, on the screen a cold load lands on.
          Outside `<main>` deliberately — it is an instrument standing over the product, not
          part of it, and the title card's own landmark should not contain it. It gates itself
          on `isDevPersistenceEnabled()` and takes no prop, so there is nothing to pass here
          and nothing a copied mount could carry onto a learner's build; see the component's
          header for why the gate is that one and not `import.meta.env.DEV`. */}
      <DemoRoutePanel />
    </div>
  );
}
