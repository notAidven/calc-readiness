import type { EraId } from "@cr/skill-graph";
import { type KeyboardEvent, useEffect, useRef } from "react";

import {
  COACH_GROUP_ORDER,
  COACH_MARKS,
  type CoachGroup,
  coachGroupLabel,
  coachMarkReference,
} from "../coachmarks/coachMarksCore";
import {
  NO_EXTRA_SURFACES,
  onboardingBriefingFor,
  type OnboardingSurfaces,
} from "./onboardingScript";

/** Focusable-element selector for the panel's simple focus trap. */
const HOW_TO_PLAY_FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * "How to play" — the opt-in reference card, opened from the ☰ Menu.
 *
 * WHY IT EXISTS. The tutorial is deliberately split into a sequence of advisor moments
 * that plays once and a set of one-line hints that arrive as each feature becomes
 * usable. Both are skippable, which is the point — but a skippable tutorial with no
 * second chance means a learner who hit Skip in their first ten seconds can never find
 * out that Roads is a tab inside Build. This panel is that second chance, and it is the
 * only surface where the whole game is described in one place. It is OPT-IN precisely so
 * that being complete costs nobody anything: a reference card nobody has to read is the
 * honest way to make a dozen features discoverable without lecturing the learner who
 * just wants to do some math.
 *
 * ## EVERY LIST HERE IS GENERATED, AND THAT IS WHAT KEEPS THE CARD TRUE
 *
 * The tips come from `COACH_MARKS`, grouped by each hint's `group`, and the loop comes
 * from `onboardingBriefingFor`'s moments. So this panel cannot drift from what the game
 * actually says: adding a hint or a moment adds a line here for free, and rewording one
 * rewords both. A hint whose in-context wording would read wrong as a static rule
 * ("Music is playing") carries a `reference` phrasing that the card uses instead — see
 * `coachMarkReference`.
 *
 * **The loop used to be the reel's four captions** (`DEMO_NARRATION`), which were four
 * mouse gestures and are now the advisor's own moments with the gestures inside them. The
 * reel is still reachable from the tray below; what changed is which of the two the card
 * quotes, and it quotes the one a learner is actually taught by.
 *
 * ## THREE ROUTES BACK, and they are three different offers
 *
 * "Talk to Oru again" replays the moments, which is the tutorial itself and is what the
 * advisor's own closing line promises. "Watch the intro again" plays the montage of a
 * building going up, which is the one thing a standing advisor cannot show. "Show tips
 * again" un-retires the contextual hints. A learner who wants the whole thing back
 * presses all three, and none of them is a worse version of another.
 *
 * A11y: a real modal — `role="dialog"` + `aria-modal`, labelled by its heading, a Tab
 * focus trap (the `BuildingUnlockedPopup` pattern), `Escape` closes, and `CitySurface`
 * returns focus to the Menu button that opened it. The tips are list markup under real
 * headings rather than one wall of prose, so a screen-reader user can skim sections the
 * way a sighted one skims the card.
 */
export function HowToPlay({
  eraId,
  surfaces = NO_EXTRA_SURFACES,
  onTalkToAdvisor,
  onWatchIntro,
  onShowTips,
  onClose,
}: {
  /** The era the city is standing in — the section heading and two tips name it. */
  eraId: EraId;
  /**
   * Which optional surfaces this city has, so the loop list quotes the tour this learner is
   * actually given rather than every moment the table can produce.
   */
  surfaces?: OnboardingSurfaces;
  /**
   * Replay the advisor's onboarding moments (closes this panel first).
   *
   * This is the route the advisor's own last line promises: *"Ask me again from the menu
   * whenever you like."* A closing line that pointed at nothing would be the one sentence
   * in the tutorial that was false.
   */
  onTalkToAdvisor: () => void;
  /** Replay the onboarding reel (closes this panel first). */
  onWatchIntro: () => void;
  /** Forget every hint + the skip-all opt-out, so the tips come back. */
  onShowTips: () => void;
  /** Dismiss (corner close / `Esc`). */
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const titleId = "how-to-play-title";

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
      dialogRef.current?.querySelectorAll<HTMLElement>(HOW_TO_PLAY_FOCUSABLE) ?? [],
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

  // The advisor's own briefing, for the loop sections and for his name on the replay
  // button. Derived rather than written as "Oru": the name comes off `resolveEraAdvisor`
  // through the same call the sequence itself uses, so a rename of the character reaches
  // this button instead of leaving it inviting a conversation with somebody who left.
  const briefing = onboardingBriefingFor(eraId, surfaces);

  // Only render a section that has hints, so deleting the last hint of a group cannot
  // leave an empty heading behind.
  const sections = COACH_GROUP_ORDER.map((group: CoachGroup) => ({
    group,
    marks: COACH_MARKS.filter((mark) => mark.group === group),
  })).filter((section) => section.marks.length > 0);

  return (
    <div
      className="coc-popup how-to-play"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="how-to-play"
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      <div className="coc-card how-to-play-card">
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

        <header className="coc-card__banner how-to-play-head">
          <span className="micro-label">Your island</span>
          <h2 id={titleId}>How to play</h2>
        </header>

        <div className="coc-card__body how-to-play-body">
          {/* THE LOOP, in the advisor's own words: one row per moment, its name beside the
              two sentences he says about it.

              A REFERENCE CARD IS THE ONE PLACE THIS MAY BE A LIST. The sequence itself
              dropped its bullets in the 2026-08-04 review because a moment is somebody
              talking to you; this is the thing you come back to when you have forgotten
              which control does what, and scanning is the whole of what it is for. It reads
              the same table, so a moment added to the sequence appears here with no edit. */}
          <section className="how-to-play-section" data-testid="how-to-play-loop">
            <h3>The loop</h3>
            <ul className="how-to-play-loop">
              {briefing.moments.map((moment) => (
                <li key={moment.id} data-moment={moment.id}>
                  <strong>{moment.title}. </strong>
                  {`${moment.lead} ${moment.body}`}
                </li>
              ))}
            </ul>
          </section>

          {sections.map(({ group, marks }) => (
            <section className="how-to-play-section" key={group}>
              <h3>{coachGroupLabel(group, eraId)}</h3>
              <ul className="how-to-play-tips">
                {marks.map((mark) => (
                  <li key={mark.id} data-tip={mark.id}>
                    {coachMarkReference(mark, eraId)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="coc-card__actions how-to-play-actions">
          <button
            type="button"
            className="city-action city-action-primary"
            data-testid="how-to-play-advisor"
            ref={actionRef}
            onClick={onTalkToAdvisor}
          >
            {`Talk to ${briefing.advisorName} again`}
          </button>
          <button
            type="button"
            className="city-action city-action-ghost"
            data-testid="how-to-play-watch"
            onClick={onWatchIntro}
          >
            Watch the intro again
          </button>
          <button
            type="button"
            className="city-action city-action-ghost"
            data-testid="how-to-play-tips"
            onClick={onShowTips}
          >
            Show tips again
          </button>
        </div>
      </div>
    </div>
  );
}
