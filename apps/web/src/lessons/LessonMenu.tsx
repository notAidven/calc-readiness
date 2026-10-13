import type { ReactNode } from "react";

import { type AdvisorMood, AdvisorNpc } from "./AdvisorNpc";

/**
 * The advisor-led revisit menu: the NPC greeting paired with the three lesson
 * entry points (Review the lesson / Practice set / Infinite practice).
 *
 * Lifted out of `AdvisorLesson` so it can be opened directly from TWO places
 * without forking the markup:
 *  - inside the lesson flow, as the phase a practiced skill lands on, and
 *  - from the city, as the popup that opens when a placed building is clicked
 *    (see `CitySurface`), where Practice + Infinite practice are GATED until the
 *    lesson + CFU are finished.
 *
 * Purely presentational: it renders the NPC + cards and calls back on a choice.
 * All routing/gating decisions live with the caller.
 */

/** Default NPC greeting for a skill the learner has already worked through. */
export const LESSON_MENU_LINE =
  "Welcome back! You've already worked through this skill. What would you like to do next?";

/** Decorative line-icon for the "Review the lesson" card (a closed textbook). */
function TextbookIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={10} y={7} width={28} height={34} rx={2.5} />
      <line x1={16} y1={7} x2={16} y2={41} />
      <line x1={21} y1={15} x2={33} y2={15} />
      <line x1={21} y1={21} x2={33} y2={21} />
      <path d="M31 7 v9 l3 -2.5 l3 2.5 V7" />
    </svg>
  );
}

/** Decorative line-icon for the "Practice set" card (a sheet with a pencil). */
function PencilPaperIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 6 h18 l6 6 v9" />
      <path d="M11 6 v36 h13" />
      <line x1={16} y1={16} x2={28} y2={16} />
      <line x1={16} y1={22} x2={26} y2={22} />
      <line x1={16} y1={28} x2={22} y2={28} />
      <path d="M40 24 l4 4 -13 13 -5 1 1 -5 z" />
      <line x1={37} y1={27} x2={41} y2={31} />
    </svg>
  );
}

/** Decorative line-icon for the "Infinite practice" card (a lemniscate). */
function InfinityIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M24 24 C 20 16, 9 16, 9 24 C 9 32, 20 32, 24 24 C 28 16, 39 16, 39 24 C 39 32, 28 32, 24 24 Z" />
    </svg>
  );
}

function LessonMenuCard({
  icon,
  title,
  desc,
  onSelect,
  locked = false,
  lockedBadge,
  describedBy,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  onSelect: () => void;
  /** Disable + dim the card (gated activity), showing the badge + gate hint. */
  locked?: boolean;
  lockedBadge?: string;
  /** id of the shared gate-hint paragraph a locked card is described by. */
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      className="lesson-menu-card"
      data-disabled={locked ? "true" : undefined}
      disabled={locked}
      aria-describedby={locked ? describedBy : undefined}
      onClick={onSelect}
    >
      <span className="lesson-menu-card__icon">{icon}</span>
      <span className="lesson-menu-card__title">{title}</span>
      <span className="lesson-menu-card__desc">{desc}</span>
      {locked && lockedBadge && (
        <span className="lesson-menu-card__badge">{lockedBadge}</span>
      )}
    </button>
  );
}

export function LessonMenu({
  line = LESSON_MENU_LINE,
  mood = "happy",
  lessonLabel = "Review the lesson",
  lessonDesc = "Reread the full mini-lesson.",
  onReviewLesson,
  onPractice,
  onInfinitePractice,
  practiceLocked = false,
  lockedBadge = "Locked",
  lockedHint = "Finish the lesson to unlock practice.",
  menuLabel = "Lesson options",
  gateHintId = "lesson-menu-gate-hint",
  compact = false,
}: {
  /** The NPC's greeting line (Markdown + $LaTeX$). */
  line?: string;
  mood?: AdvisorMood;
  /** Label for the first (always-available) card — e.g. "Start lesson" / "Review lesson". */
  lessonLabel?: string;
  lessonDesc?: string;
  onReviewLesson: () => void;
  onPractice: () => void;
  onInfinitePractice: () => void;
  /** Gate Practice + Infinite practice until the lesson + CFU are finished. */
  practiceLocked?: boolean;
  lockedBadge?: string;
  lockedHint?: string;
  menuLabel?: string;
  gateHintId?: string;
  /**
   * Tighter layout for a space-constrained host (the city's anchored building popup):
   * a smaller advisor and single-column, horizontal option cards. The full lesson
   * flow leaves this false and keeps the roomy 3-across layout.
   */
  compact?: boolean;
}): ReactNode {
  return (
    <div className={compact ? "advisor-lesson advisor-lesson--compact" : "advisor-lesson"}>
      <AdvisorNpc line={line} mood={mood} />
      <section className="advisor-lesson__menu" aria-label={menuLabel}>
        <LessonMenuCard
          icon={<TextbookIcon />}
          title={lessonLabel}
          desc={lessonDesc}
          onSelect={onReviewLesson}
        />
        <LessonMenuCard
          icon={<PencilPaperIcon />}
          title="Practice set"
          desc="Five problems to raise your mastery."
          onSelect={onPractice}
          locked={practiceLocked}
          lockedBadge={lockedBadge}
          describedBy={gateHintId}
        />
        <LessonMenuCard
          icon={<InfinityIcon />}
          title="Infinite practice"
          desc="Endless random problems. Build a streak."
          onSelect={onInfinitePractice}
          locked={practiceLocked}
          lockedBadge={lockedBadge}
          describedBy={gateHintId}
        />
      </section>
      {practiceLocked && (
        <p id={gateHintId} className="advisor-lesson__gate-hint">
          {lockedHint}
        </p>
      )}
    </div>
  );
}
