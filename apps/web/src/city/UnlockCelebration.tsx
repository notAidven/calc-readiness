import {
  Component,
  type KeyboardEvent,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type PlacementSeed,
  pretestRostersFromPlacement,
} from "../diagnostic/placementRosters";
import { HudIcon } from "./HudIcon";

/**
 * Live 3D building thumbnail (the same finished-model preview the build menu
 * shows). Lazy + code-split so its R3F canvas only loads when the reward popup
 * actually mounts a live thumbnail — and never in headless tests, which pass
 * `enableThumbnails={false}` and get the static glyph fallback instead.
 */
const BuildingThumb = lazy(() => import("./three/BuildingThumb"));

/**
 * The living island backdrop — the SAME non-interactive island scene the
 * "Remedial Calculus" start menu uses. Lazy + code-split so `three` only loads
 * when the reward actually shows the scene (never in headless tests, which get the
 * static island gradient fallback instead). Auto-orbit holds still under reduced
 * motion (see `TitleBackdrop`).
 */
const TitleBackdrop = lazy(() => import("./three/TitleBackdrop"));

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

/** Focusable-element selector for the reward popup's simple focus trap. */
const CELEBRATION_FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * One building on the island the diagnostic decided something about: its skill-graph
 * node id plus the two learner-facing labels the card shows — the human TOPIC name
 * (from `diagnostic/skillNames.ts`) and the city BUILDING name (from
 * `buildingName()` in `buildingAssets.ts`). Both are resolved by `CitySurface`
 * so the popup stays a dumb, easily-tested presenter.
 */
export interface RewardBuilding {
  readonly nodeId: string;
  /** Human topic name, e.g. "Signed numbers". */
  readonly topic: string;
  /** The STABLE city building name, e.g. "Assembly Hall" (D-ERA29). */
  readonly building: string;
}

/**
 * One reward card: the building's live 3D model + its topic/building names + a
 * badge. BOTH variants render the same `BuildingThumb` model so the learner sees
 * the REAL building either way; the `learn` variant just gets a light
 * desaturate + slight fade in CSS (see `styles.css`) so the building stays clearly
 * RECOGNIZABLE while still reading as "still to learn" (locked) next to the bright
 * "skip" cards — the dashed border, muted surface, and section header carry the
 * locked meaning, not heavy dimming. The `skip` badge pairs a decorative check
 * `HudIcon` SVG with its label; the `learn` badge is TEXT-ONLY (no lesson/book
 * icon at all) — no emoji glyphs anywhere. When thumbnails are off (headless/tests)
 * both variants fall back to the static building glyph.
 */
function BuildingRewardCard({
  item,
  variant,
  enableThumbnails,
}: {
  item: RewardBuilding;
  variant: "skip" | "learn";
  enableThumbnails: boolean;
}) {
  const isSkip = variant === "skip";
  // Both groups mount the real building model when thumbnails are on (~6 total,
  // matching the build menu); the learn cards are only lightly desaturated/faded
  // via CSS (still clearly the real building), not swapped for a glyph or blob.
  // Headless/tests (thumbnails off) fall back to the static building glyph.
  return (
    <li className="reward-card" data-variant={variant} data-node-id={item.nodeId}>
      <div className="reward-card__thumb" aria-hidden="true">
        {enableThumbnails ? (
          <Suspense
            fallback={
              <span className="reward-card__glyph">
                <HudIcon name="building" />
              </span>
            }
          >
            <BuildingThumb nodeId={item.nodeId} />
          </Suspense>
        ) : (
          <span className="reward-card__glyph">
            <HudIcon name="building" />
          </span>
        )}
      </div>
      <div className="reward-card__meta">
        <span className="reward-card__topic">{item.topic}</span>
        <span className="reward-card__building">{item.building}</span>
      </div>
      <span className="reward-card__badge" data-variant={variant}>
        {isSkip && (
          <span className="reward-card__badge-icon" aria-hidden="true">
            <HudIcon name="check" />
          </span>
        )}
        {isSkip ? "No lesson needed" : "Build by finishing its lesson"}
      </span>
    </li>
  );
}

/**
 * The diagnostic-unlock REWARD screen — the distinct, celebratory hand-off shown
 * once when the city opens after a pretest that tested out at least one building.
 *
 * ## IT MAKES TWO CLAIMS OVER TWO DIFFERENT SETS, AND THAT IS DELIBERATE
 *
 * The HEADLINE is about the DIAGNOSTIC. It reports what the instrument administered and
 * how much of it the learner tested out of, and both of those numbers are read from
 * `placement` — the one object the walk handed over — through
 * {@link pretestRostersFromPlacement}. There is no `total` prop to get wrong, which is
 * the fix for the defect this screen shipped: the numerator came from the tested-out list
 * and the denominator from era one's six buildings, so a learner who tested out of 4 of
 * the 20 administered skills was told **"You tested out of 2 of 6 skills!"** — both halves
 * wrong, and invisible for as long as the instrument happened to administer exactly era
 * one's six.
 *
 * The two GRIDS are about the ISLAND, and they are the era's roster rather than the
 * instrument's scope:
 *
 *   1. "Ready to build · skip the lesson" — the island buildings the pretest freed
 *      (`skips`), each a live building thumbnail + a gold "No lesson needed" badge.
 *   2. "Still to learn" — the island's remaining buildings (`learns`), each the SAME live
 *      thumbnail, only lightly desaturated/faded so the building stays recognizable, + a
 *      TEXT-ONLY "Build by finishing its lesson" badge (no icon).
 *
 * **Why the grids are NOT the instrument's twenty nodes.** A card mounts a live
 * `<Canvas>`, and the browser budget is roughly sixteen WebGL contexts a page — measured
 * in this tree, era three's build menu already ran with four contexts force-lost and five
 * cards previewing nothing, which is why `groupEntriesByEra` cuts that row by era. A
 * twenty-card reward would buy the same defect. Twelve of the twenty administered nodes
 * also have no building name at all (`buildingName` hands back the raw node id), so eight
 * cards would read "POL.1" where a building name goes. The learner has already seen every
 * one of the twenty on the diagnostic's own results table; this screen is the CITY's
 * hand-off, so it shows the city's buildings and the sub-line says which island it means.
 *
 * The whole reward sits over the LIVING island backdrop (the same non-interactive
 * scene the start menu uses) behind a soft contrast scrim — a pretty island moment,
 * not a flat dim over the city. An empty section is hidden (all tested out → no
 * "Still to learn"). The single primary CTA "Start building" opens the build menu;
 * the corner close (X) and `Esc` dismiss to the city. Chrome is the shared CoC
 * popup (`.coc-popup` + `.coc-card`).
 *
 * A11y: `role="dialog"` + `aria-modal`, labelled by the headline; the CTA
 * autofocuses; a simple focus trap keeps Tab inside; `Esc` closes; each section is
 * a labelled list; the badges carry real text; a polite live region announces the
 * summary. The island backdrop is decorative (`aria-hidden`). Perf: both grids
 * mount live canvases (one per island building, like the build menu) plus the island
 * scene; `enableThumbnails` is off in headless tests so every card falls back to a glyph
 * and the backdrop drops to a static island gradient. Reduced motion (media query
 * or the `reducedMotion` prop) holds the burst/shine AND the island auto-orbit
 * still.
 */
export function UnlockCelebration({
  placement,
  skips,
  learns,
  enableThumbnails,
  reducedMotion,
  onPlace,
  onClose,
}: {
  /**
   * The completed pretest's per-node placement — THE headline's only source. Its key
   * count is the denominator and its passing entries are the numerator, so the two
   * cannot be taken from different sets (see the header).
   */
  placement: PlacementSeed;
  /** The island buildings the pretest freed — one gold "skip" card each. */
  skips: readonly RewardBuilding[];
  /** The island's remaining buildings — one dimmed "learn" card each; hidden if empty. */
  learns: readonly RewardBuilding[];
  /** Live thumbnails on the skip cards; off in headless tests → glyph fallbacks. */
  enableThumbnails: boolean;
  /** Hold the burst/shine/badge-pop still when true (also honored via CSS media). */
  reducedMotion: boolean;
  /** Primary CTA — dismiss + open the build menu. */
  onPlace: () => void;
  /** Dismiss to the city (corner close / `Esc`). */
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const titleId = "unlock-reward-title";
  // ONE read, so the headline's numerator and denominator are two counts of one object.
  const rosters = pretestRostersFromPlacement(placement);
  const testedOutCount = rosters.testedOut.length;
  const assessedCount = rosters.assessed.length;
  const freeCount = skips.length;
  const learnCount = learns.length;

  // The living island backdrop only mounts its R3F canvas when live thumbnails are
  // on (the app; off in headless tests) AND WebGL is actually available — otherwise
  // a static island gradient stands in (fail-closed, like the title screen).
  const [webglOk] = useState(canRenderCanvas);
  const showBackdrop = enableThumbnails && webglOk;

  // Autofocus the primary CTA so the reward opens ready to act (and keyboard/AT
  // users land inside the dialog).
  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    // Wrap Tab / Shift+Tab inside the dialog (a lightweight focus trap).
    const focusables = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(CELEBRATION_FOCUSABLE) ?? [],
    );
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="coc-popup unlock-reward"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-reduced-motion={reducedMotion}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      {/* Living island backdrop (the start-menu scene) behind the card, so the
          reward moment sits over a pretty island instead of a flat city dim. It is
          purely decorative (the card owns all interaction); WebGL-gated + error-
          bounded, so headless/no-WebGL gets a static island gradient. */}
      <div className="unlock-reward-scene" aria-hidden="true">
        {showBackdrop ? (
          <Suspense fallback={<div className="unlock-reward-scene-fallback" />}>
            <BackdropErrorBoundary
              fallback={<div className="unlock-reward-scene-fallback" />}
            >
              <TitleBackdrop reducedMotion={reducedMotion} />
            </BackdropErrorBoundary>
          </Suspense>
        ) : (
          <div className="unlock-reward-scene-fallback" />
        )}
      </div>
      {/* Soft contrast scrim between the bright island and the card. */}
      <div className="unlock-reward-scrim" aria-hidden="true" />

      <div className="coc-card unlock-reward-card">
        {/* Decorative celebratory burst behind the banner (held still under
            reduced motion by CSS). */}
        <div className="unlock-reward-burst" aria-hidden="true" />

        <button
          type="button"
          className="coc-card__close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>

        <header className="coc-card__banner unlock-reward-head">
          <span className="micro-label">Diagnostic complete</span>
          <h2 id={titleId}>
            You tested out of {testedOutCount} of {assessedCount} skills!
          </h2>
          {/* The sub-line counts the GRIDS below it, which are this island's buildings and
              not the instrument's scope — so it names the island rather than leaving a
              reader to subtract it from the headline's denominator. */}
          <p className="unlock-reward-subline">
            <strong>{freeCount}</strong> buildings free on this island ·{" "}
            <strong>{learnCount}</strong> to learn.
          </p>
        </header>

        <div className="coc-card__body unlock-reward-body">
          {freeCount > 0 && (
            <section className="reward-section" aria-labelledby="reward-skip-title">
              <h3 id="reward-skip-title" className="reward-section__title">
                <span className="reward-section__title-main">Ready to build</span>
                <span className="reward-section__title-sub">skip the lesson</span>
              </h3>
              <ul className="reward-grid" aria-label="Skills ready to build">
                {skips.map((item) => (
                  <BuildingRewardCard
                    key={item.nodeId}
                    item={item}
                    variant="skip"
                    enableThumbnails={enableThumbnails}
                  />
                ))}
              </ul>
            </section>
          )}

          {learnCount > 0 && (
            <section
              className="reward-section reward-section--learn"
              aria-labelledby="reward-learn-title"
            >
              <h3 id="reward-learn-title" className="reward-section__title">
                <span className="reward-section__title-main">Still to learn</span>
              </h3>
              <ul className="reward-grid" aria-label="Skills still to learn">
                {learns.map((item) => (
                  <BuildingRewardCard
                    key={item.nodeId}
                    item={item}
                    variant="learn"
                    enableThumbnails={enableThumbnails}
                  />
                ))}
              </ul>
            </section>
          )}

          <div className="visually-hidden" aria-live="polite">
            {`You tested out of ${testedOutCount} of ${assessedCount} skills. ${freeCount} ${
              freeCount === 1 ? "building" : "buildings"
            } free on this island, ${learnCount} to learn.`}
          </div>
        </div>

        <div className="coc-card__actions unlock-reward-actions">
          <button
            type="button"
            className="city-action city-action-primary"
            ref={actionRef}
            onClick={onPlace}
          >
            Start building
          </button>
        </div>
      </div>
    </div>
  );
}
