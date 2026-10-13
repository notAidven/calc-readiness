import type { Mastery } from "@cr/state-schema";
import type { ReactNode } from "react";

import { skillDisplayName } from "../diagnostic/skillNames";
import type { TeachingSection } from "../lessons/teachingSections";
import { placementLabel } from "./townHall";
import { WorldScene } from "./WorldScene";

/**
 * The in-world lesson-hosting SEAM (MVP: stubbed, Evan-lane only).
 *
 * Entering a building opens a full-bleed in-world scene that STANDS IN for that
 * node's lesson. At MVP this is a clean placeholder behind the `LessonHost`
 * interface — NOT a deep integration of Anthony's lesson engine or Gabe's
 * diagnostic. Deep cross-lane hosting is a future, team-aligned step: swapping in
 * a real `LessonHost` implementation is the only change needed, and nothing about
 * this seam implies or performs a mastery/placement write (the frozen boundary in
 * `citySession.ts` is untouched).
 */
export interface LessonHostContext {
  nodeId: string;
  lessonShell: string | null;
  archetypeLabel: string;
  constructionLabel: string;
  onExit: () => void;
  /**
   * DEV-only stand-in for the mastery/lesson lane advancing mastery after a lesson: the
   * clearly-labelled button that skips the work. NOT a game write (see `citySession.ts`), and
   * NOT how a finished practice set reports itself — that is {@link onPracticeComplete}.
   *
   * The two were one field, and a host could only ask "is there a completion callback here?"
   * when what it meant was "am I allowed to offer a skip?". That held while the only caller
   * that supplied one was the dev panel, and stopped holding the moment a learner's own
   * practice needed somewhere to report to: un-gating that in account mode put *"Simulate
   * completing this lesson (dev only)"* and *"Skip to check (dev only)"* in front of every
   * signed-in learner, over a real practice set. Caught in a rendered frame rather than by any
   * assertion, which is why one now exists (`lessonProgressionIsNotDevGated.test.tsx`).
   */
  onDevComplete?: (mastery?: Mastery) => void;
  /**
   * The practice set finished, with the mastery it evidenced. The learner's own signal, so it
   * is supplied wherever the lesson can be played and never implies a developer affordance.
   */
  onPracticeComplete?: (mastery: Mastery, evidenceId: string) => void | Promise<void>;
  /**
   * The intermediate Foundation→Construction signal: fired when the learner finishes
   * teaching + passes the CFU. Advances the building to the Construction stage. The
   * practice set is a SEPARATE step, so this does NOT run practice. Undefined on the
   * server-backed path (a safe no-op, like `onDevComplete`).
   */
  onLessonTaught?: () => void | Promise<void>;
  /**
   * End the taught lesson and return to the building's select-screen callout — fired
   * together with `onLessonTaught` at CFU-pass, so the learner takes a break and then
   * explicitly launches practice from the (now Construction) building. Distinct from
   * `onExit` (plain "Back to city"), which does not reopen the callout.
   */
  onFinishLesson?: () => void;
  /**
   * Start the lesson directly in the practice set (skip teaching), for RESUMING a
   * building already at the Construction stage ("Continue construction" callout CTA).
   */
  resumePractice?: boolean;
  /**
   * Start the lesson directly in Anthony's endless INFINITE-practice drill, for the
   * building menu's "Infinite practice" action. Reuses the lesson's existing infinite
   * phase (`AdvisorLesson`), not a re-implementation.
   */
  resumeInfinite?: boolean;
  /**
   * Skip the lesson's own revisit MENU on entry and land straight on the content.
   * Set on the "Review lesson" path because the CITY already showed that menu (the
   * building-click popup), so re-showing it inside the lesson would be redundant.
   */
  skipMenu?: boolean;
  /** Reviewer/presenter entry into one real authored teaching section. */
  initialTeachingStep?: { readonly index: number; readonly section: TeachingSection };
  /**
   * The node's current mastery, as context about the building being entered.
   *
   * NOT a switch between lesson surfaces, and specifically not between the taught
   * walkthrough and a combined reread: `d1LessonHost` used to spend it that way and a
   * practiced building's lesson opened as one ungated scroll of every page. The revisit
   * CHOICE belongs to the city's building popup, which runs before this. See
   * `lessonMountSteps.test.tsx`.
   */
  mastery?: Mastery;
}

export interface LessonHost {
  render(context: LessonHostContext): ReactNode;
}

/**
 * **THE STUB SCENE, AND WHY ITS COPY WAS THE WORST IN THE CITY.**
 *
 * It is reachable: `d1LessonHost` falls through to this host for any node it does not serve,
 * so a learner who opens a building outside the authored set lands here. What it used to say
 * was *"This full-screen scene stands in for the `d1-num-2` lesson. Real lesson hosting is
 * deferred behind a clean seam until the team aligns on cross-lane hosting"*, under the title
 * *"Enter the NUM.2 lesson"*, with `NUM.2` again as the value of a "Skill" row.
 *
 * Three of the standing objections at once: it is META-COMMENTARY, describing the team's own
 * integration schedule back at a learner who wanted to study; it leaks a RAW NODE ID twice
 * over, which `announcements.ts` sweeps its whole module to prevent; and it leaks a lesson
 * SHELL id, which is an internal registry key one namespace along. It now names the building
 * and the skill the way every other city surface does, and says the one thing a learner can
 * act on: this lesson is not written yet, and their mastery is untouched.
 */
function StubLessonScene({
  nodeId,
  archetypeLabel,
  constructionLabel,
  onExit,
  onDevComplete,
}: LessonHostContext) {
  const skill = skillDisplayName(nodeId);
  const building = placementLabel(nodeId);
  return (
    <WorldScene
      eyebrow="In-world lesson"
      title={`The ${building} lesson`}
      onExit={onExit}
      tone="lesson"
      size="large"
      actions={
        onDevComplete ? (
          <button
            type="button"
            className="city-action city-action-primary"
            onClick={() => {
              onDevComplete();
              onExit();
            }}
          >
            Simulate completing this lesson (dev only)
          </button>
        ) : undefined
      }
    >
      <p className="world-scene-lede">
        This building is standing and its skill is waiting: the{" "}
        <strong>{skill === nodeId ? building : skill}</strong> lesson is still being
        written. Your mastery here is exactly as you left it.
      </p>
      <dl className="world-scene-facts">
        <div>
          <dt>Skill</dt>
          <dd>{skill === nodeId ? building : skill}</dd>
        </div>
        <div>
          <dt>Building type</dt>
          <dd>{archetypeLabel}</dd>
        </div>
        <div>
          <dt>Right now</dt>
          <dd>{constructionLabel}</dd>
        </div>
      </dl>
      {onDevComplete && (
        <p className="world-scene-note">
          The developer stand-in below simulates the mastery/lesson lane finishing this
          skill so the loop stays demonstrable. It is not a game write.
        </p>
      )}
    </WorldScene>
  );
}

/** The MVP stub host. Swapping this out is the future team-aligned integration. */
export const stubLessonHost: LessonHost = {
  render(context) {
    return <StubLessonScene {...context} />;
  },
};
