import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import { useReducedMotion } from "../city/useReducedMotion";
import { useScrollCue } from "../city/useScrollCue";
import {
  DIAGNOSTIC_DURATION_ESTIMATE,
  TYPICAL_QUESTIONS,
} from "../diagnostic/diagnosticShape";

import "./launch.css";

/**
 * **THE ORDINARY ROUTE'S LAUNCH SCREEN: the one question a signed-in learner is asked, once.**
 *
 * ## Why this is not `TitleScreen`
 *
 * `TitleScreen.tsx` is the screen the exact `/demo` showcase and a local dev server open on, and
 * the demo URL is already out with reviewers. Redesigning that file would change what those
 * people see. So the ordinary account route gets its own surface and `/demo` keeps the screen it
 * shipped with, byte for byte — which is also what makes the isolation provable rather than
 * argued (`demoEntryIsolation.test.tsx`).
 *
 * ## What the screen has to hold
 *
 * Two things are true at once and neither may be sacrificed to the other:
 *
 *  1. **The diagnostic is the better first move**, because the skills a learner already has get
 *     built for them and they start where they actually are. So it leads, it says *Recommended*
 *     in words rather than in colour alone, it says how long it takes before it is agreed to, and
 *     the keyboard lands on it.
 *  2. **Era 1 is a real route, not a consolation.** It gets its own heading, its own sentence and
 *     its own action rather than a link in small type, because a learner who wants to be building
 *     in a minute is not making a mistake.
 *
 * And a third thing the screen must not do: over-claim. A placement walk measures what somebody
 * can do on the authored nodes today. It is not a measure of the person and it is not exact, and
 * `ordinaryLaunch.test.tsx` sweeps the rendered text for both claims.
 *
 * ## The figures are the committed ones
 *
 * The length of the diagnostic comes from `diagnostic/diagnosticShape.ts` — the module
 * `diagnosticIntroPromise.test.ts` holds against the published measurement — rather than from
 * digits typed into a sentence here, so this screen and the diagnostic's own intro card cannot
 * come apart.
 *
 * ## Look
 *
 * A founding charter rather than a dashboard: one opaque parchment sheet with a stone edge, two
 * routes separated by a single hairline, brass used only on the recommendation and the lead
 * action. No translucent panels, no gradient fills, no drift of pills. The island behind it is
 * the same non-interactive scene the title screen uses, WebGL-gated and lazy so `three` never
 * loads for a headless test, with a flat tinted stand-in underneath it.
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

function SurveyGlyph() {
  return (
    <svg className="launch__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
      <path d="M9 15l3-7 3 7" />
    </svg>
  );
}

function FoundationGlyph() {
  return (
    <svg className="launch__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 19h18" />
      <path d="M5.5 19v-4h13v4" />
      <path d="M8 15v-4h8v4" />
      <path d="M12 11V5l4 2.5" />
    </svg>
  );
}

export function LaunchScreen({
  onTakeDiagnostic,
  onStartEraOne,
}: {
  /** Enter the real diagnostic flow (the same overlay the city's Menu opens). */
  readonly onTakeDiagnostic: () => void;
  /** Initialise era one exactly once and enter the real city. */
  readonly onStartEraOne: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [webglOk] = useState(canRenderCanvas);
  const diagnosticRef = useRef<HTMLButtonElement>(null);
  // A window too short for the sheet hides the rest of it behind an overlay scrollbar nothing
  // paints until something moves. See `.launch__more`.
  const { ref: sheetRef, more } = useScrollCue<HTMLElement>();

  // The keyboard lands on the route we recommend, so a keyboard learner is already standing on
  // the one we would have pointed at.
  useEffect(() => {
    diagnosticRef.current?.focus();
  }, []);

  const stand = <div className="launch__ground" />;

  return (
    <div
      className="launch"
      data-reduced-motion={reducedMotion}
      // The cue needs a band of its own at the foot of the screen; see `.launch__more`.
      data-more={more ? "true" : undefined}
      data-testid="ordinary-launch"
    >
      <div className="launch__world" aria-hidden="true">
        {webglOk ? (
          <Suspense fallback={stand}>
            <BackdropErrorBoundary fallback={stand}>
              <TitleBackdrop reducedMotion={reducedMotion} />
            </BackdropErrorBoundary>
          </Suspense>
        ) : (
          stand
        )}
      </div>
      <div className="launch__veil" aria-hidden="true" />

      <main className="launch__sheet" ref={sheetRef} aria-labelledby="launch-title">
        <div className="launch__masthead">
          <span className="launch__eyebrow">Remedial Calculus</span>
          <h1 className="launch__title" id="launch-title">
            Your island is waiting
          </h1>
          <p className="launch__lede">
            Learn a math skill, raise a building. Choose where to begin.
          </p>
        </div>

        <ul className="launch__routes">
          <li className="launch__route launch__route--lead">
            <div className="launch__route-head">
              <SurveyGlyph />
              <span className="launch__tag" id="launch-diagnostic-tag">
                Recommended
              </span>
            </div>
            <h2 className="launch__route-title">Skip ahead with a quick check</h2>
            <p className="launch__route-copy">
              Answer a few questions and we&rsquo;ll build the skills you already know for
              you, so you can jump straight to what&rsquo;s next.
            </p>
            <p className="launch__route-meta">
              {`About ${TYPICAL_QUESTIONS} questions. Plan for ${DIAGNOSTIC_DURATION_ESTIMATE}.`}
            </p>
            <button
              type="button"
              className="launch__action launch__action--lead"
              ref={diagnosticRef}
              aria-describedby="launch-diagnostic-tag"
              onClick={onTakeDiagnostic}
            >
              Take the diagnostic
            </button>
          </li>

          <li className="launch__route">
            <div className="launch__route-head">
              <FoundationGlyph />
            </div>
            <h2 className="launch__route-title">Start from the first skill</h2>
            <p className="launch__route-copy">
              Begin on bare ground and learn every skill in order, from the first one.
            </p>
            <p className="launch__route-meta">You will be building within a minute.</p>
            <button type="button" className="launch__action" onClick={onStartEraOne}>
              Start at Era 1
            </button>
          </li>
        </ul>

        <p className="launch__footnote">
          The diagnostic is always in the city&rsquo;s Menu, and your city saves to your
          account.
        </p>
      </main>

      {more && (
        <p className="launch__more" aria-hidden="true">
          {/* The words carry the cue; the chevron is decoration on an already-hidden
              paragraph, and both routes are in the DOM a screen reader reads. */}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 10l6 6 6-6" />
          </svg>
          More below
        </p>
      )}
    </div>
  );
}
