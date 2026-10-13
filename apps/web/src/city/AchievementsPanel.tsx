import { type KeyboardEvent, type ReactElement, useEffect, useRef } from "react";
import { AchievementsDevPanel } from "./AchievementsDevPanel";
import { achievementRows } from "./achievements";

import "./achievements.css";

/** Focusable-element selector for the panel's simple focus trap. `HowToPlay`'s. */
const ACHIEVEMENTS_FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * **THE LIST, opened from the ☰ Menu, and it is a list of SENTENCES.**
 *
 * `HowToPlay` is the model, down to the chrome (`.coc-popup` / `.coc-card`), the focus
 * trap and the menu row that opens it: an opt-in reference card that costs nobody anything
 * because nobody has to open it. It generates its rows from {@link achievementRows}, so a
 * row added to the table appears here for free and a reworded line is reworded in both
 * places at once.
 *
 * ## WHAT IS NOT ON IT, AND WHY THAT IS THE WHOLE DESIGN
 *
 * §5.6 of `docs/superpowers/specs/2026-08-01-game-feel-mechanics-backlog.md` argued that
 * collecting the crisis acknowledgements onto one screen would turn four sentences into
 * *"a set with a SIZE, and a set with a size has a completion percentage whether or not
 * anybody renders one"*. **That argument is right, and this panel is built to survive it
 * rather than to dodge it**, because the lead has since asked for a surface:
 *
 *  - **no count anywhere.** No total, no *"two of four"*, no progress bar, no percentage.
 *    A reader of this card cannot work out how many rows exist without counting them
 *    themselves, and nothing invites them to.
 *  - **no tier, no rarity, no order of merit.** The rows are in table order with the
 *    earned ones first, which is a reading order rather than a ranking.
 *  - **no other learner.** Nothing here compares anything to anybody.
 *  - **unearned rows are invitations.** Each row that is not yet earned shows its own
 *    `toEarn` sentence, and every one of those is satisfiable by carrying on rather than
 *    by doing better, so the card has nothing on it that reads as a grade. That is what
 *    makes showing them safe at all: CAREFUL 11's *"'locked' must read as 'not yet,' not
 *    'you failed'"*.
 *
 * `test/achievementsAreNotAScore.test.ts` holds every one of those as an assertion over
 * this file, so the next person to add a row cannot reintroduce the thing the ruling was
 * careful to exclude.
 *
 * A11y: a real modal, labelled by its heading, Tab trapped, `Escape` closes, and the state
 * of each row is carried by REAL TEXT (`Earned` / `Not yet`) beside a decorative mark
 * rather than by the mark alone, so it does not depend on seeing a tick.
 */
export function AchievementsPanel({
  earned,
  onDevFire,
  onDevForget,
  onClose,
}: {
  /** The ids already earned, loaded by the surface. */
  readonly earned: ReadonlySet<string>;
  /**
   * DEV: record one and show its moment. The host owns both the write and the close,
   * because recording is a session-shaped write and this card holds no state of its own.
   */
  readonly onDevFire: (id: string) => void;
  /** DEV: forget every one. The card stays open on the list it just reset. */
  readonly onDevForget: () => void;
  /** Dismiss (corner close / `Esc`). */
  readonly onClose: () => void;
}): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = "achievements-title";
  const rows = achievementRows(earned);

  useEffect(() => {
    closeRef.current?.focus();
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
      dialogRef.current?.querySelectorAll<HTMLElement>(ACHIEVEMENTS_FOCUSABLE) ?? [],
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
      className="coc-popup achievements"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="achievements-panel"
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      <div className="coc-card achievements-card">
        <button
          type="button"
          className="coc-card__close"
          aria-label="Close"
          ref={closeRef}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>

        <header className="coc-card__banner achievements-head">
          <span className="micro-label">Your island</span>
          <h2 id={titleId}>Achievements</h2>
        </header>

        <div className="coc-card__body achievements-body">
          <ul className="achievements-list">
            {rows.map((row) => (
              <li
                className="achievements-row"
                key={row.id}
                data-achievement={row.id}
                data-earned={row.earned}
              >
                {/* The mark is decorative and the WORD carries the state, so the row
                    still says which it is with no colour and no glyph. */}
                <span className="achievements-row__mark" aria-hidden="true">
                  {row.earned ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <circle cx="12" cy="12" r="6" />
                    </svg>
                  )}
                </span>
                <span className="achievements-row__line">{row.line}</span>
                <span className="achievements-row__state">
                  {row.earned ? "Earned" : "Not yet"}
                </span>
              </li>
            ))}
          </ul>

          {/* Renders nothing on a learner's build; the gate is inside it and there is no
              prop here that could switch it on. */}
          <AchievementsDevPanel earned={earned} onFire={onDevFire} onForget={onDevForget} />
        </div>
      </div>
    </div>
  );
}
