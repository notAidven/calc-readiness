import type { EraId } from "@cr/skill-graph";
import { type ReactNode, useRef } from "react";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import {
  type AdvisorMood,
  advisorNameForEra,
  advisorPosesForEra,
  type EraAdvisorPoses,
} from "./eraAdvisor";
import { HintIcon } from "./icons";
import { MakaAdvisorCharacter } from "./MakaAdvisorCharacter";
import { type AdvisorDress, OruAdvisorCharacter } from "./OruAdvisorCharacter";
import { LessonProse, LessonSlideHeading } from "./prose";
import { ScrollMoreCue, useMoreBelowInBubble, useMoreBelowInWell } from "./ScrollMoreCue";

export type { AdvisorMood };

/**
 * THE ERA'S DRAWING, STRIKING THE POSE THAT ERA'S ROW ASKS FOR.
 *
 * **The whole point is that this is a switch over `poses.art` and not over an era id.** Each
 * `case` narrows `poses` to that drawing's row, so `poses.moodPose[mood]` is typed to the pose
 * union of the very component it is being handed to. A row that named a pose its drawing cannot
 * strike would not compile, and neither would a row missing a beat — which is D-ERA28's
 * requirement (*an advance may SHRINK the pose vocabulary*) discharged by the type checker
 * rather than by a convention every future call site has to remember.
 *
 * `advisorPose(eraId, mood)` deliberately is NOT used here: it returns the union of every
 * drawing's poses, which is precisely the coupling this function exists to keep.
 *
 * The `never` arm is what makes a new drawing a compile error here rather than a blank figure
 * on the learning surface.
 */
function AdvisorCharacter({
  poses,
  mood,
  dress,
}: {
  poses: EraAdvisorPoses;
  mood: AdvisorMood;
  dress?: AdvisorDress;
}) {
  switch (poses.art) {
    case "oru":
      return <OruAdvisorCharacter mood={poses.moodPose[mood]} dress={dress} />;
    case "maka":
      // No dress reaches this arm, and that is not an omission: `maka` IS era two's
      // costume, drawn whole rather than parameterised, so a dress on top of it would be
      // a costume over a costume. The drawing that takes clothes is the one above.
      return <MakaAdvisorCharacter mood={poses.moodPose[mood]} />;
    default: {
      const unhandled: never = poses;
      throw new Error(
        `No character is wired for advisor art ${JSON.stringify(unhandled)}, so the ` +
          `learning surface would render an empty figure.`,
      );
    }
  }
}

/**
 * The check's one hint, offered as the advisor's own action.
 *
 * Exported and rendered here rather than written out at each call site because a second
 * surface offers this same hint: the `?dev` stepper's CFU step, where an author looks at a
 * check they have just written. That surface has no advisor to voice the hint, but the
 * control an author is judging has to be the control a learner gets, so the label, the
 * bulb and the two classes have exactly one definition. A copy would have been a copy that
 * drifts, and the drift would land in the view whose whole purpose is showing what ships.
 */
export function ShowHintAction({ onShowHint }: { onShowHint: () => void }): ReactNode {
  return (
    <button
      type="button"
      className="advisor-npc__action advisor-npc__action--hint"
      onClick={onShowHint}
    >
      <HintIcon />
      Show hint
    </button>
  );
}

/**
 * **THE ADVISOR'S CONTROL ROW: Previous/Next while teaching, Show hint / Review lesson /
 * Finish lesson at the check.** Renders nothing when no callback is set.
 *
 * ## Why this is a sibling of the advisor and not a child of the bubble
 *
 * It used to be the last thing inside `.advisor-npc__bubble`, which put the way forward in
 * the same scroll flow as the board. Measured on the learner's own mount at 1024x580
 * (`docs/qa-shell-fit-measurement.md`), that cost the learner the control exactly when they
 * had earned it: finishing a board leaves you at the board's bottom, and the row was 84px to
 * 324px above the top of a well that had scrolled past it.
 *
 * The row is therefore pinned to the foot of the well (`position: sticky; bottom: 0`), and
 * THAT is why it is rendered here rather than in the bubble. A sticky box is constrained to
 * its CONTAINING BLOCK, so a row inside the bubble can only stay on screen for as long as the
 * bubble does, which is the very thing that scrolls away. Its containing block has to be the
 * column that spans the whole scrollable content, i.e. `.advisor-lesson`. Callers render it
 * as that column's LAST child, so it settles at the foot of the content when nothing
 * overflows and pins itself there when something does.
 *
 * It keeps the `.advisor-npc__controls` class and keeps "Next" as its descendant, which is
 * what `city/lessonMountSteps.test.tsx` queries through, and it stays out of the card's
 * action tray, which is outside the scrolling well and belongs to `WorldScene`.
 */
export function AdvisorControls({
  onPrevious,
  previousDisabled = false,
  onNext,
  onShowHint,
  onReview,
  onFinishLesson,
}: {
  /** Teaching: step back one page (omit on the first page). */
  onPrevious?: () => void;
  /**
   * Hold back Previous while a visual on this page is auto-playing. The button stays
   * mounted and merely disables, so the control row does not shift mid-animation.
   */
  previousDisabled?: boolean;
  /** Teaching: advance to the next page / the question. */
  onNext?: () => void;
  /** CFU: reveal the hint in the dialogue (omit once used). */
  onShowHint?: () => void;
  /** CFU: reopen the lesson to re-read it. */
  onReview?: () => void;
  /**
   * CFU (once passed): finish the lesson — the building breaks ground into
   * construction and the graded practice set becomes the next, separately-launched
   * step (opened later from the building's callout, not run inline here).
   */
  onFinishLesson?: () => void;
}): ReactNode {
  const row = useRef<HTMLDivElement | null>(null);
  // The row is pinned to the foot of the well, so it is also the edge the well's content
  // disappears under: the one place a "there is more under here" cue belongs.
  const moreBelow = useMoreBelowInWell(row);
  const hasControls = Boolean(
    onPrevious || onNext || onShowHint || onReview || onFinishLesson,
  );
  if (!hasControls) {
    return null;
  }
  return (
    <div className="advisor-npc__controls" ref={row}>
      {moreBelow && <ScrollMoreCue where="well" />}
      {onPrevious && (
        <button
          type="button"
          className="advisor-npc__action advisor-npc__action--prev"
          disabled={previousDisabled}
          onClick={onPrevious}
        >
          Previous
        </button>
      )}
      {onNext && (
        <button
          type="button"
          className="advisor-npc__action advisor-npc__action--next"
          onClick={onNext}
        >
          Next
        </button>
      )}
      {onShowHint && <ShowHintAction onShowHint={onShowHint} />}
      {onReview && (
        <button type="button" className="advisor-npc__action" onClick={onReview}>
          Review lesson
        </button>
      )}
      {onFinishLesson && (
        <button
          type="button"
          className="advisor-npc__action advisor-npc__action--next"
          onClick={onFinishLesson}
        >
          Finish lesson
        </button>
      )}
    </div>
  );
}

/**
 * The advisor NPC: the ERA's advisor, paired with a speech bubble. Dialogue-first — the art
 * is `aria-hidden` decoration, so every word the advisor says lives in the bubble and never
 * in the character. The bubble renders one markdown line (so `$LaTeX$` and **bold** work).
 * The controls the advisor offers are {@link AdvisorControls}, rendered by the caller at the
 * foot of the lesson column; see its doc for why they are not in the bubble.
 *
 * ## What the words are wrapped in, and why
 *
 * The heading and the line sit in an inner `.advisor-npc__said`, which is the part allowed to
 * scroll when a long slide would otherwise take the whole well. The overflow cannot go on the
 * bubble itself: the bubble draws its speech tail as a `::before` that hangs outside its own
 * box, and a box with `overflow` clips its own pseudo-elements. That is the same shape the
 * era-ceremony advisor already ships (`city/eraCeremony.css`), for the same reason.
 *
 * ## WHO TALKS IS PER-ERA (D-ERA28), AND THE BEAT MAPPING GOES THROUGH A TOTAL TABLE
 *
 * `eraAdvisor.ts` owns both halves: which DRAWING an era renders, and which pose each lesson
 * beat asks that drawing for. (Which advisor an era HAS — the name and the role — is
 * `city/eraDressing.ts`' `ERA_ADVISORS`, read here only through `advisorNameForEra`. Era two's
 * name is under a three-way dispute recorded in `MakaAdvisorCharacter.tsx`; this surface prints
 * whatever that table says and takes no position.) The `ORU_MOOD` literal that used to live
 * here has moved there and is unchanged for era one, so era one's rendering is byte-identical.
 * It moved because D-ERA28 lets a later era's advisor be drawn in FEWER poses, and a beat→pose
 * map that lives beside the component cannot be closed over the advisor actually on screen — a
 * beat with no pose behind it would render no pose change at all, silently, on a correct answer.
 *
 * **The drawing is chosen per era too, and no era draws nothing.** Era one renders `oru` and
 * era two renders `maka`, its own art since 2026-07-31; the eight later eras have no drawing
 * and borrow era one's, marked `artIsOwn: false` so a borrow cannot pass for a finished
 * character. {@link AdvisorCharacter} dispatches through an exhaustive switch with a `never`
 * arm, so a new drawing fails to compile here until it is handled.
 */
export function AdvisorNpc({
  line,
  subtitle,
  mood = "neutral",
  eraId = CURRENT_ERA_ID,
  dress,
}: {
  /** The current line the NPC is speaking (Markdown + $LaTeX$). */
  line: string;
  /**
   * The claim this slide lands on, as a real heading above the line. Teaching phase only:
   * a hint or a result is not a slide and has no subtitle to show.
   */
  subtitle?: string;
  /** Styling hook for later art; does not change behavior. */
  mood?: AdvisorMood;
  /**
   * Which era's advisor narrates (D-ERA28). Defaults to {@link CURRENT_ERA_ID}, so every
   * existing caller keeps Oru with no change; the era-two lesson path passes `neolithic`.
   * A prop rather than a module read for the reason `CitySurface`'s `eraId` is one — it lets
   * a lesson be opened in any era, which is what makes the per-era advisor testable at all.
   */
  eraId?: EraId;
  /**
   * The clothes the advisor is in, from the era the lesson is being taught in. Omitted
   * falls back to era one's, which is what every lesson that ships today is in, so no
   * lesson surface has to learn about eras before one of them is set in a later age.
   *
   * **Separate from `eraId` on purpose, rather than derived from it.** `eraId` picks WHICH
   * DRAWING narrates and which pose each beat asks it for; this picks what the drawing above
   * is WEARING. Deriving one from the other would decide, here, whether era two's lesson
   * shows its own `maka` drawing or Oru in neolithic clothes — and that is a question about
   * which art ships, not a question this component is entitled to answer.
   */
  dress?: AdvisorDress;
}): ReactNode {
  const poses = advisorPosesForEra(eraId);
  const advisorName = advisorNameForEra(eraId);
  const bubble = useRef<HTMLDivElement | null>(null);
  const moreSaid = useMoreBelowInBubble(bubble);

  return (
    <div
      className="advisor-npc"
      data-mood={mood}
      data-advisor={advisorName}
      data-advisor-art={poses.art}
    >
      <div className="advisor-npc__character" aria-hidden="true">
        {/* Two drawings today, dispatched through an exhaustive switch so a new one cannot
            be added without being handled. An era whose own art is unmade borrows a shipped
            drawing rather than rendering an empty box — see `eraAdvisor.ts`. */}
        <AdvisorCharacter poses={poses} mood={mood} dress={dress} />
      </div>

      <div className="advisor-npc__bubble-wrap">
        <div className="advisor-npc__bubble" aria-live="polite" ref={bubble}>
          {/* The scrollable part, held apart from the bubble because a box with `overflow`
              clips its own pseudo-elements and the speech tail hangs outside by design. */}
          <div className="advisor-npc__said">
            <LessonSlideHeading subtitle={subtitle} />
            <LessonProse markdown={line} />
          </div>
          {/* On the bubble rather than inside the words, so the cue does not scroll away with
              the line it is describing. The cap that makes this necessary is the
              short-viewport one; at a comfortable height the bubble is as tall as the slide
              and this never appears. */}
          {moreSaid && <ScrollMoreCue where="bubble" />}
        </div>
      </div>
    </div>
  );
}
