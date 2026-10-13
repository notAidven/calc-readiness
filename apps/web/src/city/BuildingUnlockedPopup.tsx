import { type KeyboardEvent, lazy, Suspense, useEffect, useRef } from "react";

import { HudIcon } from "./HudIcon";
import type { RewardBuilding } from "./UnlockCelebration";

/**
 * Live 3D building thumbnail (the same finished-model preview the build menu and
 * the diagnostic reward popup show). Lazy + code-split so its R3F canvas only
 * loads when this popup actually mounts — and never in headless tests, which pass
 * `enableThumbnails={false}` and get the static glyph fallback instead.
 */
const BuildingThumb = lazy(() => import("./three/BuildingThumb"));

/** Focusable-element selector for the popup's simple focus trap. */
const UNLOCK_FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The IN-PLAY "new building unlocked" moment: shown when finishing a building
 * completes the prerequisites of one or more still-locked buildings, so the newly
 * buildable ones are announced instead of quietly appearing in the build menu.
 *
 * This is deliberately the SMALLER sibling of `UnlockCelebration` (the once-only
 * diagnostic test-out reward). Same Clash-of-Clans chrome (`.coc-popup` +
 * `.coc-card`) and the same live `BuildingThumb` card visuals (it reuses the
 * `reward-card` / `reward-grid` classes so the two moments look like one family),
 * but it is a compact, mid-game interruption over the live city: no island
 * backdrop, one tight grid, and a single "Build it" call to action.
 *
 * Multiple buildings can unlock at once (one completion can satisfy several
 * prerequisite edges), so it takes a LIST and pluralizes.
 *
 * A11y: `role="dialog"` + `aria-modal`, labelled by the headline; the CTA
 * autofocuses; a lightweight focus trap wraps Tab; `Esc` closes; a polite live
 * region announces the unlock. Thumbnails are decorative; the names carry the
 * meaning, and the keyboard-navigable Buildings roster stays the source of truth.
 */
export function BuildingUnlockedPopup({
  buildings,
  enableThumbnails,
  reducedMotion,
  onBuild,
  onClose,
}: {
  /** The buildings whose prerequisites were just satisfied (teaching order). */
  buildings: readonly RewardBuilding[];
  /** Live thumbnails; off in headless tests → static glyph fallbacks. */
  enableThumbnails: boolean;
  /** Hold the celebratory burst still when true (also honored via CSS media). */
  reducedMotion: boolean;
  /** Primary CTA — dismiss + open the build menu so it can be placed now. */
  onBuild: () => void;
  /** Dismiss to the city (corner close / `Esc`). */
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const titleId = "building-unlocked-title";
  const count = buildings.length;
  const plural = count === 1 ? "building" : "buildings";

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
    const focusables = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(UNLOCK_FOCUSABLE) ?? [],
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
      className="coc-popup building-unlocked"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-reduced-motion={reducedMotion}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      <div className="coc-card building-unlocked-card">
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

        <header className="coc-card__banner building-unlocked-head">
          <span className="micro-label">Unlocked</span>
          <h2 id={titleId}>
            {count === 1 ? "New building unlocked!" : `${count} new buildings unlocked!`}
          </h2>
        </header>

        <div className="coc-card__body building-unlocked-body">
          <ul className="reward-grid" aria-label={`Newly unlocked ${plural}`}>
            {buildings.map((item) => (
              <li
                key={item.nodeId}
                className="reward-card"
                data-variant="skip"
                data-node-id={item.nodeId}
              >
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
                  <span className="reward-card__building">{item.building}</span>
                  <span className="reward-card__topic">{item.topic}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="visually-hidden" aria-live="polite">
            {`${count} new ${plural} unlocked: ${buildings
              .map((item) => item.building)
              .join(", ")}.`}
          </div>
        </div>

        <div className="coc-card__actions building-unlocked-actions">
          <button
            type="button"
            className="city-action city-action-primary"
            ref={actionRef}
            onClick={onBuild}
          >
            {count === 1 ? "Build it" : "Build them"}
          </button>
        </div>
      </div>
    </div>
  );
}
