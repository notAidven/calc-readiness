import { type ReactNode, useEffect, useRef } from "react";

import { LessonSoundToggle } from "../lessons/widgetFeedback";

/**
 * A reusable, full-bleed "in-world scene" frame. Both the stubbed lesson entry
 * and the storm encounter render inside one so entering something in the city
 * feels like stepping into it, not opening a dialog box. It is a real, accessible
 * modal surface: labelled, focus-moved-in on mount, focus-contained, and dismissible
 * with a visible control and Escape. Learning scenes use the full application viewport;
 * their city stays mounted but is hidden and inert until this surface exits.
 */
export type WorldSceneSize = "compact" | "large" | "full";

export interface WorldSceneProps {
  eyebrow: string;
  title: string;
  onExit: () => void;
  exitLabel?: string;
  tone?: "lesson" | "storm";
  /**
   * The frame footprint. `compact` (default) is the ~500px Clash-of-Clans message
   * card shared by the building info popup + the storm encounter; `large` is the
   * immersive full-viewport lesson window (the stepped teaching flow + paired diagram
   * + practice need real room). The started lesson (`d1LessonHost`), the Town Hall drill,
   * and the work checker ask for `large`.
   *
   * `full` is the historical dev alias. It retains `large`'s content column and now has
   * the same viewport footprint learners receive.
   */
  size?: WorldSceneSize;
  children: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  /**
   * Show the lesson sound toggle in the banner. Only the teaching surfaces ask for it:
   * it mutes the correct-answer chime, so it belongs where questions are answered and
   * nowhere else.
   */
  soundToggle?: boolean;
}

/**
 * Frame footprint → the modifier class(es) that shape it.
 *
 * `full` deliberately carries `--large` TOO, so the historical dev alias inherits every
 * content rule the learner gets — the full viewport frame, 920px reading column, and 560px
 * diagram cap. That inheritance is what keeps the dev view from needing `svg` rules of its own:
 * a new descendant selector over
 * `svg` inside `.lesson-visual` / `.lesson-interactive` also matches the tiny `<svg>`
 * KaTeX draws a radical with, which is how every radical once collapsed to a tenth of a
 * pixel (see `lessonVisualSurd.browser.test.tsx`).
 */
const FRAME_CLASS: Record<WorldSceneSize, string> = {
  compact: "",
  large: " world-scene--large",
  full: " world-scene--large world-scene--full",
};

export function WorldScene({
  eyebrow,
  title,
  onExit,
  exitLabel = "Back to city",
  tone = "lesson",
  size = "compact",
  children,
  actions,
  titleId = "world-scene-title",
  soundToggle = false,
}: WorldSceneProps) {
  const exitRef = useRef<HTMLButtonElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Start at the top of the lesson. Focus the exit button for modal focus
    // management, but with preventScroll so the scrollable frame is not scrolled
    // down to reveal the footer button (which opened lessons partway down).
    frameRef.current?.scrollTo({ top: 0 });
    exitRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className={`world-scene coc-popup${FRAME_CLASS[size]}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-tone={tone}
      data-size={size}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onExit();
          return;
        }
        if (event.key === "Tab") {
          const focusable = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = focusable[0];
          const last = focusable.at(-1);
          if (!first || !last) {
            return;
          }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div className="world-scene-frame coc-card" ref={frameRef}>
        <button
          type="button"
          className="coc-card__close"
          aria-label="Close"
          onClick={onExit}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>

        <header className="world-scene-head coc-card__banner">
          <span className="micro-label">{eyebrow}</span>
          <h2 id={titleId}>{title}</h2>
          {soundToggle && <LessonSoundToggle />}
        </header>

        <div className="world-scene-body coc-card__body">{children}</div>

        <footer className="world-scene-actions coc-card__actions">
          {actions}
          <button type="button" className="city-action" onClick={onExit} ref={exitRef}>
            {exitLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
