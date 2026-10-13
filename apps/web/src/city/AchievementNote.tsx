import type { ReactElement } from "react";

import "./achievements.css";

/**
 * **THE MOMENT ONE IS EARNED, which matters more than the list.**
 *
 * A row in a table that nobody noticed arriving is a row in a table. So the earning has a
 * surface of its own, and the whole design question is how much surface: too little and it
 * is missed, too much and it is a toast that got in the way of the thing the player was
 * doing when they earned it.
 *
 * ## FOUR DECISIONS, and each one is the smaller half of a choice
 *
 *  1. **It is not a dialog.** Every achievement is earned in the middle of something else:
 *     a repair, a practice set, the last step of the era ceremony. A modal would stop that
 *     to be dismissed, which is the *"extra click"* AVOID 15 is about, and it would put a
 *     focus trap on top of a surface the player is mid-interaction with.
 *  2. **It takes itself away.** `AchievementNote` has no dismiss control, on
 *     `RECOVERY_NOTE_MS`'s precedent in `CitySurface`: a note that asks for a click is
 *     busywork and a note that stays is a panel.
 *  3. **It says the word.** *"Achievement earned"* is the eyebrow, in the micro-label the
 *     city's other cards already use. The alternative was a bare sentence, which reads as
 *     one more announcement in a HUD that makes plenty, and the lead asked for
 *     achievements by name.
 *  4. **It carries NO number.** Not a count, not a total, not *"one of four"*, and no tier
 *     or rarity. See `achievements.ts` for why that is the load-bearing prohibition rather
 *     than a preference.
 *
 * ## MOTION
 *
 * One short rise-and-settle, held still by `data-reduced-motion` and by the stylesheet's
 * own `prefers-reduced-motion` block, on the same footing as every other celebratory beat
 * in the city. `Game_Visual_Design_Brief.md` keeps celebration amplitude low and earned.
 */
export function AchievementNote({
  line,
  reducedMotion,
}: {
  /** The earned sentence, from the table. */
  readonly line: string;
  /** Hold the rise still (also honoured through the reduced-motion media query). */
  readonly reducedMotion: boolean;
}): ReactElement {
  return (
    /*
      `aria-live="polite"` on the element itself rather than routing through the surface's
      shared live region, because this is the one announcement whose TEXT is the whole
      event: everything else the HUD says is a description of something visible, and a
      screen-reader user who missed this line missed the achievement.
    */
    <aside
      className="hud achievement-note"
      data-testid="city-achievement"
      data-reduced-motion={reducedMotion}
      aria-live="polite"
    >
      {/* The list's tick, so the moment and the row it becomes look like one thing. */}
      <span className="achievement-note__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <div>
        <p className="micro-label achievement-note__eyebrow">Achievement earned</p>
        <p className="achievement-note__line">{line}</p>
      </div>
    </aside>
  );
}
