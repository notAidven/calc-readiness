import { Component, lazy, type ReactNode, Suspense, useEffect, useState } from "react";

import { buildingName, resolveBuildingModel } from "../buildingAssets";
import type { BuildStage } from "../palette";
import { GhostCursor } from "./GhostCursor";
import { DEMO_NODE_ID, DEMO_UNLOCK_NODE_ID, type DemoBeat } from "./useDemoScript";

/**
 * The reel "screen" — the montage stage the framed `DemoReel` plays. It shows the
 * REAL demo-building model at the current beat's build stage over an island backdrop,
 * plus the per-beat flourishes (a ghost cursor on Place/Learn, a lesson card on
 * Learn, a mastery star once built, an unlock chip on Unlock). The building is the
 * live Gridwork GLB when WebGL is available; headless/no-WebGL (and the jsdom suite)
 * fall back to a static building silhouette that still steps its `data-stage` so the
 * montage reads and is assertable.
 *
 * All screen content is decorative (`aria-hidden`) — the DemoReel caption's aria-live
 * region carries the meaning. Under reduced motion the ghost cursor is not rendered
 * and the Build beat jumps straight to the topped-out model (no scaffold cross-fade).
 */

/** The live R3F building model — lazy + code-split so three only loads with WebGL. */
const ReelBuilding = lazy(() => import("./ReelBuilding"));

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

/** Fail-closed boundary: a model render/context error drops to the static silhouette. */
class ReelModelBoundary extends Component<
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

/** How long the Build beat holds at the scaffold before topping out (ms). */
const TOP_OUT_DELAY_MS = 2600;

/** The model build stage a beat renders (Build tops out mid-beat via `topped`). */
function stageForBeat(beat: DemoBeat, topped: boolean): BuildStage {
  if (beat === "unlock") {
    return "built";
  }
  if (beat === "build") {
    return topped ? "built" : "construction";
  }
  // place + learn stay a bare foundation site.
  return "site";
}

/** A simple, attractive building silhouette that reads its build stage (no WebGL). */
function ReelSilhouette({ stage }: { stage: BuildStage }) {
  const built = stage === "built";
  const scaffold = stage === "construction";
  return (
    <svg
      className="demo-reel__silhouette"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      {/* plot pad */}
      <ellipse cx="60" cy="98" rx="40" ry="12" className="demo-reel__pad" />
      {/* foundation footprint (always) */}
      <rect x="40" y="80" width="40" height="16" rx="3" className="demo-reel__foundation" />
      {/* rising body — taller once built, mid-height under construction */}
      {(scaffold || built) && (
        <rect
          x="44"
          y={built ? 34 : 58}
          width="32"
          height={built ? 46 : 22}
          rx="3"
          className="demo-reel__body"
        />
      )}
      {/* scaffold poles while under construction */}
      {scaffold && (
        <g className="demo-reel__scaffold">
          <line x1="42" y1="58" x2="42" y2="82" />
          <line x1="78" y1="58" x2="78" y2="82" />
          <line x1="42" y1="64" x2="78" y2="64" />
          <line x1="42" y1="74" x2="78" y2="74" />
        </g>
      )}
      {/* windows + roof flourish once topped out */}
      {built && (
        <g className="demo-reel__windows">
          <rect x="50" y="44" width="7" height="9" rx="1.2" />
          <rect x="63" y="44" width="7" height="9" rx="1.2" />
          <rect x="50" y="58" width="7" height="9" rx="1.2" />
          <rect x="63" y="58" width="7" height="9" rx="1.2" />
          <path d="M44 34 L60 22 L76 34 Z" className="demo-reel__roof" />
        </g>
      )}
    </svg>
  );
}

export function ReelStage({
  beat,
  enableCanvas,
  reducedMotion,
}: {
  beat: DemoBeat;
  /** Mount the live R3F model (off in headless tests → static silhouette). */
  enableCanvas: boolean;
  /** Hold the cursor/topping-out still (jump straight to built on Build). */
  reducedMotion: boolean;
}) {
  // Build beat sub-phase: scaffold → topped out. Reduced motion starts topped.
  const [topped, setTopped] = useState(reducedMotion);
  useEffect(() => {
    if (beat !== "build") {
      setTopped(false);
      return;
    }
    if (reducedMotion) {
      setTopped(true);
      return;
    }
    setTopped(false);
    const timer = window.setTimeout(() => setTopped(true), TOP_OUT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [beat, reducedMotion]);

  const stage = stageForBeat(beat, topped);
  const model = resolveBuildingModel(DEMO_NODE_ID, stage);
  const url = model?.kind === "glb" ? model.url : null;
  const showStar = beat === "unlock" || (beat === "build" && topped);

  // WebGL is probed once; the live model only mounts when it is available AND the
  // host enabled the canvas — otherwise the static silhouette stands in.
  const [webglOk] = useState(canRenderCanvas);
  const showModel = enableCanvas && webglOk && Boolean(url);

  return (
    <div
      className="demo-reel__screen"
      data-beat={beat}
      data-stage={stage}
      data-testid="demo-reel-screen"
    >
      <div className="demo-reel__backdrop" aria-hidden="true" />

      <div className="demo-reel__building" aria-hidden="true">
        {showModel && url ? (
          <Suspense fallback={<ReelSilhouette stage={stage} />}>
            <ReelModelBoundary fallback={<ReelSilhouette stage={stage} />}>
              <ReelBuilding url={url} />
            </ReelModelBoundary>
          </Suspense>
        ) : (
          <ReelSilhouette stage={stage} />
        )}

        {showStar && (
          <span className="demo-reel__star" data-testid="demo-reel-star" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </span>
        )}
      </div>

      {!reducedMotion && (beat === "place" || beat === "learn") && <GhostCursor />}

      {beat === "learn" && (
        <div className="demo-reel__lesson-card" aria-hidden="true">
          <span className="micro-label">Lesson</span>
          <strong>{buildingName(DEMO_NODE_ID)}</strong>
          <p>A short mini-lesson, then a quick check.</p>
        </div>
      )}

      {beat === "unlock" && (
        <div className="demo-reel__unlock" aria-hidden="true">
          <span className="demo-reel__unlock-flash" />
          <span className="demo-reel__unlock-label">
            New building unlocked: {buildingName(DEMO_UNLOCK_NODE_ID)}
          </span>
        </div>
      )}
    </div>
  );
}
