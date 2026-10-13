import { getEraOfNode } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";
import { useCallback, useEffect, useState } from "react";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import { AdvisorControls, type AdvisorMood, AdvisorNpc } from "./AdvisorNpc";
import { LessonCfu } from "./cfu";
import { InfinitePractice } from "./InfinitePractice";
import { LessonBody } from "./LessonBody";
import { LessonMenu } from "./LessonMenu";
import { LessonPractice } from "./LessonPractice";
import { sectionsFor, type TeachingSection, workedExampleFor } from "./teachingSections";
import type { LessonContent } from "./types";
import { LessonVisual, type LessonVisualId } from "./visuals";
import { WorkedSolution } from "./WorkedSolution";

/** Generic advisor lines for the interactive check (no per-node authoring yet). */
const IDLE_LINE =
  "You've got the main ideas. Now let's see them in action. Try the question below, and tap **Show hint** if you'd like a nudge.";
const CORRECT_LINE =
  "Yes! That's exactly right, and you applied what we just covered. That's the lesson done. Finish it and your building breaks ground into construction; the practice set is the next step, whenever you're ready to come back to it.";
const INCORRECT_LINE =
  "Not quite yet, and that's okay. Take another look at the question, or review the lesson, and give it another try.";
/**
 * Said when a SECOND reveal opens the gate. It deliberately does not congratulate them: they
 * did not answer it, and telling someone who revealed twice that they got it right is the kind
 * of praise that teaches them the praise means nothing.
 */
const REVEALED_LINE =
  "You've seen the answer and the reasoning behind it, so let's not keep you stuck here. That's the lesson done. Finish it and your building breaks ground into construction; the practice set will give you more of these when you're ready to come back to it.";
/**
 * Said when the learner writes back an answer the reveal had already printed for them.
 *
 * Reached on a check whose re-ask serves the SAME question, which is every pack that does not
 * name a generator for its variants (`CFU_RE_ASK_SAME` in `cfu.tsx`). There, a correct answer
 * after a reveal is indistinguishable from copying, and `CORRECT_LINE`'s "you applied what we
 * just covered" is a claim about work this path cannot tell was done. Same reasoning as
 * {@link REVEALED_LINE}, one step later in the same walk.
 *
 * A converted pack hands over a different question with a different answer, so work on it is
 * reported `correct` and reaches `CORRECT_LINE` instead. The closing promise below is worded
 * for the pack this line is actually said on: "the practice set will hand you fresh numbers"
 * is what an unconverted check has to offer, because it cannot.
 */
const RECALLED_LINE =
  "That's the answer, and writing it back out is worth doing, though it isn't the same as working it out cold. That's the lesson done. Finish it and your building breaks ground into construction; the practice set will hand you fresh numbers whenever you're ready to come back to it.";

const NUM_F_IDLE_LINE =
  "You've got the main ideas. Now let's see them in action. Write every fraction answer in **lowest terms** (for example, `1/3`, not `2/6`). Tap **Show hint** if you'd like a nudge.";
const NUM_F_CORRECT_LINE =
  "Yes! That's exactly right, and nicely simplified. That's the lesson done. Finish it to start construction; the practice set comes next, whenever you're ready. Remember: lowest terms on every fraction answer.";

/** What the in-city lesson footer needs to render "Skip to check (dev only)". */
export type DevSkipOffer = {
  canSkip: boolean;
  skipToCfu: () => void;
};

type Phase =
  | { kind: "menu" }
  /** One slide, one of its sections (see `teachingSections.ts` for what each shows). */
  | { kind: "teaching"; index: number; section: TeachingSection }
  | { kind: "cfu"; line: string; mood: AdvisorMood }
  | { kind: "review" }
  | { kind: "practice" }
  | { kind: "infinite" };

/**
 * Advisor-led lesson flow. The NPC narrates the mini-lesson one line at a time
 * (click to advance), then reveals the check-your-understanding question. During the check
 * the NPC voices the hint on request and congratulates / encourages a retry based on the
 * result.
 *
 * Each line is walked in SECTIONS (`teachingSections.ts`): the line alone, then its worked
 * example where the pack authors one, then its diagram. The bubble says the same thing
 * throughout; what changes is what is under it, so the widget is not sitting there to be
 * poked at while the idea behind it is still being explained.
 *
 * THE CHECK IS THE GATE ON FINISHING THE LESSON. `cfuPassedOnce` is the only thing that puts
 * "Finish lesson" on offer, and `finishLesson` is the only thing that fires the Foundation to
 * Construction transition, so a learner who cannot answer the check cannot finish the lesson.
 * That used to have no way out at all: unlimited tries and one hint, and nothing else. It now
 * has the same way out every widget has, and only that one - the check's own reveal teaches,
 * re-asks, and on a second use lets the learner past (`onRelease`). The gate itself is
 * unchanged: it is still passed by `cfuPassedOnce` and by nothing else.
 */
export function AdvisorLesson({
  content,
  onComplete,
  onEnterPractice,
  onFinishLesson,
  resumeAtPractice = false,
  resumeAtInfinite = false,
  hasCompletedPractice = false,
  skipMenu = false,
  initialTeachingStep,
  devControlsEnabled = false,
  onDevSkipOfferChange,
}: {
  content: LessonContent;
  /** Called when the practice set is scored, with the evidenced mastery (advances the city building). */
  onComplete?: (mastery: Mastery, evidenceId: string) => void | Promise<void>;
  /**
   * The intermediate Foundation→Construction signal, fired when the learner finishes
   * teaching + passes the CFU (see `finishLesson`). Safe no-op if unset (server path).
   */
  onEnterPractice?: () => void;
  /**
   * End the taught lesson and hand back to the city/select screen. Fired together
   * with `onEnterPractice` when the learner finishes teaching + CFU — the lesson and
   * the practice set are two SEPARATE, explicitly-launched steps, with this break
   * (return to the building's callout) between them. Safe no-op if unset.
   */
  onFinishLesson?: () => void;
  /** Enter directly in the practice set (skip teaching), for RESUMING a Construction building. */
  resumeAtPractice?: boolean;
  /**
   * Enter directly in the endless infinite-practice drill (skip teaching + the menu),
   * for the building menu's "Infinite practice" action. "Back to options" then lands
   * on the revisit menu.
   */
  resumeAtInfinite?: boolean;
  /** True once the learner has finished at least one practice set (mastery >= 1). */
  hasCompletedPractice?: boolean;
  /**
   * Presentation/reviewer seam: begin on one real teaching section. Omitted for every learner
   * mount, whose opening remains slide zero's first section.
   */
  initialTeachingStep?: { readonly index: number; readonly section: TeachingSection };
  /**
   * Skip the revisit MENU on entry and land straight on the lesson content. Set by a
   * caller that has ALREADY presented the Review / Practice / Infinite choice itself
   * (the city's building-click menu), so re-showing the identical menu here would be
   * redundant: a practiced skill lands on the reread, an unlearned one on teaching.
   */
  skipMenu?: boolean;
  /**
   * When true, the city host may offer a dev-only jump to the CFU from the lesson
   * footer. Gated the same way as "Simulate completing this lesson (dev only)".
   */
  devControlsEnabled?: boolean;
  /** Syncs whether a skip is available and the handler that performs it. */
  onDevSkipOfferChange?: (offer: DevSkipOffer | null) => void;
}) {
  /**
   * WHICH ADVISOR NARRATES, derived from the lesson's own node (D-ERA28: one advisor per era).
   *
   * Derived here rather than taken as a prop, so every surface that opens a lesson — the city
   * host, the `?dev` list, a resumed practice set — gets the era's advisor with no threading
   * and no chance of one of them being missed. Era membership is static registry data
   * (`getEraOfNode`), so an era-two lesson is narrated in **era two's register** because of
   * what it teaches, not because of who opened it. Under D-ET9 the advisor is the same person
   * in all ten eras, so what the era selects is the dressing and the register, never the name.
   *
   * A node the era model does not place falls back to {@link CURRENT_ERA_ID}, which is where
   * every lesson already was before this existed. `eraAdvisor.ts` makes that a real advisor in
   * all ten eras rather than an `undefined`.
   */
  const eraId = getEraOfNode(content.node_id)?.id ?? CURRENT_ERA_ID;
  const paragraphs = content.mini_lesson;
  const [phase, setPhase] = useState<Phase>(() =>
    initialTeachingStep &&
    paragraphs[initialTeachingStep.index] !== undefined &&
    sectionsFor(content, initialTeachingStep.index).includes(initialTeachingStep.section)
      ? {
          kind: "teaching",
          index: initialTeachingStep.index,
          section: initialTeachingStep.section,
        }
      : resumeAtInfinite
        ? { kind: "infinite" }
        : resumeAtPractice
          ? { kind: "practice" }
          : hasCompletedPractice
            ? skipMenu
              ? { kind: "review" }
              : { kind: "menu" }
            : paragraphs.length > 0
              ? // Derived, not written down again: every other transition in this file asks
                // `sectionsFor` what a slide's sections are, and a literal here would be a
                // SECOND definition of the walk order, free to disagree with the first
                // silently. Opening on a section the walk does not contain strands the
                // learner, because `advanceTeaching` cannot find it to step off it.
                { kind: "teaching", index: 0, section: sectionsFor(content, 0)[0] }
              : { kind: "cfu", line: IDLE_LINE, mood: "neutral" },
  );
  const [hintShown, setHintShown] = useState(false);
  // Latches once true so the "Finish lesson" action remains available after the
  // first pass (a later wrong attempt never hides it).
  const [cfuPassedOnce, setCfuPassedOnce] = useState(false);
  // Visual ids whose gating interactive widget has been completed.
  const [doneVisuals, setDoneVisuals] = useState<ReadonlySet<LessonVisualId>>(
    () => new Set(),
  );
  // Visual ids whose walkthrough is mid auto-play. Stepping back would unmount the
  // animation the learner is watching, so Previous waits until the set empties.
  const [playingVisuals, setPlayingVisuals] = useState<ReadonlySet<LessonVisualId>>(
    () => new Set(),
  );

  /**
   * Forward one SECTION, and only off the slide's last one forward a slide. A slide is
   * three steps where it has a worked example and two where it does not, so a pack that
   * authors none walks exactly as it did with one extra click per slide.
   */
  function advanceTeaching(currentIndex: number, currentSection: TeachingSection) {
    const sections = sectionsFor(content, currentIndex);
    const at = sections.indexOf(currentSection);
    const nextSection = at < 0 ? undefined : sections[at + 1];
    if (nextSection) {
      setPhase({ kind: "teaching", index: currentIndex, section: nextSection });
      return;
    }
    const next = currentIndex + 1;
    if (next < paragraphs.length) {
      setPhase({ kind: "teaching", index: next, section: sectionsFor(content, next)[0] });
    } else {
      setPhase({
        kind: "cfu",
        line: content.node_id === "NUM.F" ? NUM_F_IDLE_LINE : IDLE_LINE,
        mood: "neutral",
      });
    }
  }

  /**
   * Back one section, and off a slide's FIRST section back to the previous slide's LAST
   * one -- what the learner just came through, not the start of it.
   */
  function goPrevious(currentIndex: number, currentSection: TeachingSection) {
    const sections = sectionsFor(content, currentIndex);
    const previousSection = sections[sections.indexOf(currentSection) - 1];
    if (previousSection) {
      setPhase({ kind: "teaching", index: currentIndex, section: previousSection });
      return;
    }
    if (currentIndex > 0) {
      const previous = sectionsFor(content, currentIndex - 1);
      setPhase({
        kind: "teaching",
        index: currentIndex - 1,
        section: previous[previous.length - 1] ?? previous[0],
      });
    }
  }

  function reviewLesson() {
    setPhase({ kind: "review" });
  }

  function backToQuestion() {
    setPhase({
      kind: "cfu",
      line: content.node_id === "NUM.F" ? NUM_F_IDLE_LINE : IDLE_LINE,
      mood: "neutral",
    });
  }

  function backFromReview() {
    if (hasCompletedPractice) {
      setPhase({ kind: "menu" });
    } else {
      backToQuestion();
    }
  }

  // End of the taught lesson (teaching done + CFU passed): fire the Foundation →
  // Construction transition (`onEnterPractice`) AND hand back to the city/select
  // screen (`onFinishLesson`). The practice set is a SEPARATE step the learner
  // launches explicitly from the building's "Continue construction" callout — so we
  // deliberately do NOT switch into the `practice` phase here.
  function finishLesson() {
    onEnterPractice?.();
    onFinishLesson?.();
  }

  // Run the practice set inline. Reached ONLY by an explicit choice on an already-
  // built skill's revisit menu ("Practice set" card); the first-time path breaks to
  // the city after the CFU (see `finishLesson`), and the resume path (a Construction
  // building's callout) enters the `practice` phase directly via `resumeAtPractice`.
  function startPractice() {
    setPhase({ kind: "practice" });
  }

  function revealHint() {
    setHintShown(true);
    setPhase({
      kind: "cfu",
      line: content.cfu?.hint ?? IDLE_LINE,
      mood: "encouraging",
    });
  }

  const skipToCfu = useCallback(() => {
    setHintShown(false);
    setPhase({
      kind: "cfu",
      line: content.node_id === "NUM.F" ? NUM_F_IDLE_LINE : IDLE_LINE,
      mood: "neutral",
    });
  }, [content.node_id]);

  useEffect(() => {
    if (!devControlsEnabled || !onDevSkipOfferChange) {
      return;
    }
    const canSkip = phase.kind === "teaching" && Boolean(content.cfu);
    onDevSkipOfferChange(canSkip ? { canSkip: true, skipToCfu } : null);
    return () => {
      onDevSkipOfferChange(null);
    };
  }, [devControlsEnabled, onDevSkipOfferChange, phase, content.cfu, skipToCfu]);

  if (phase.kind === "menu") {
    return (
      <LessonMenu
        onReviewLesson={() => setPhase({ kind: "review" })}
        onPractice={startPractice}
        onInfinitePractice={() => setPhase({ kind: "infinite" })}
      />
    );
  }

  if (phase.kind === "review") {
    return (
      <div className="advisor-lesson advisor-lesson--review">
        <button
          type="button"
          className="advisor-npc__action advisor-npc__action--prev advisor-lesson__back"
          onClick={backFromReview}
        >
          {hasCompletedPractice ? "Back to options" : "Back to question"}
        </button>
        <LessonBody content={content} />
      </div>
    );
  }

  if (phase.kind === "practice") {
    return <LessonPractice nodeId={content.node_id} onComplete={onComplete} />;
  }

  if (phase.kind === "infinite") {
    return (
      <InfinitePractice
        nodeId={content.node_id}
        onExit={() => setPhase({ kind: "menu" })}
      />
    );
  }

  const activeParagraphIndex = phase.kind === "teaching" ? phase.index : null;
  // The slide whose widgets are on screen: only the activity section renders them, so only
  // there can one hold "Next" back. Lecture and example show prose, and always offer Next.
  const activityIndex =
    phase.kind === "teaching" && phase.section === "activity" ? phase.index : null;
  const workedExample =
    phase.kind === "teaching" && phase.section === "example"
      ? workedExampleFor(content, phase.index)
      : null;
  const line =
    phase.kind === "teaching" ? (paragraphs[phase.index] ?? IDLE_LINE) : phase.line;
  const mood: AdvisorMood = phase.kind === "teaching" ? "neutral" : phase.mood;
  const canShowHint =
    phase.kind === "cfu" && Boolean(content.cfu) && !hintShown && !cfuPassedOnce;
  // Every gating interactive visual on the active paragraph must finish before
  // "Next" appears (a paragraph may hold more than one interactive visual).
  const activeGates =
    activityIndex !== null
      ? (content.visuals?.filter((v) => v.after === activityIndex && v.gates) ?? [])
      : [];
  const gateBlocked = activeGates.some((v) => !doneVisuals.has(v.id));
  const canAdvanceTeaching = phase.kind === "teaching" && !gateBlocked;
  // Absent only on the very first step of the lesson; every later section has one behind it.
  const canGoPrevious =
    phase.kind === "teaching" &&
    (phase.index > 0 || sectionsFor(content, phase.index).indexOf(phase.section) > 0);

  return (
    <div className="advisor-lesson">
      <AdvisorNpc
        line={line}
        subtitle={
          activeParagraphIndex === null
            ? undefined
            : content.slide_subtitles?.[activeParagraphIndex]
        }
        mood={mood}
        eraId={eraId}
      />

      {workedExample && (
        <WorkedSolution
          label="Worked example"
          intro={workedExample.prompt}
          steps={workedExample.steps}
        />
      )}

      {activityIndex !== null &&
        content.visuals
          ?.filter((v) => v.after === activityIndex)
          .map((v) => (
            <LessonVisual
              key={v.id}
              id={v.id}
              onComplete={
                v.gates
                  ? () =>
                      setDoneVisuals((prev) => {
                        const next = new Set(prev);
                        next.add(v.id);
                        return next;
                      })
                  : undefined
              }
              // A widget that hands the learner a fresh instance takes its own gate back
              // off the latch, so "Next" disappears until the new numbers are answered.
              onReopen={
                v.gates
                  ? () =>
                      setDoneVisuals((prev) => {
                        if (!prev.has(v.id)) {
                          return prev;
                        }
                        const next = new Set(prev);
                        next.delete(v.id);
                        return next;
                      })
                  : undefined
              }
              onPlayingChange={(playing) =>
                setPlayingVisuals((prev) => {
                  if (prev.has(v.id) === playing) {
                    return prev;
                  }
                  const next = new Set(prev);
                  if (playing) {
                    next.add(v.id);
                  } else {
                    next.delete(v.id);
                  }
                  return next;
                })
              }
            />
          ))}

      {phase.kind === "cfu" &&
        (content.cfu ? (
          <LessonCfu
            cfu={content.cfu}
            nodeId={content.node_id}
            // The hint is the advisor's line, so its state is here and the card is told.
            // Without this the card's reveal opens on a wrong attempt alone, which puts the
            // answer beside the help meant to precede it.
            hintTaken={hintShown}
            onResult={(outcome) => {
              const correct = outcome !== "incorrect";
              setCfuPassedOnce((passed) => passed || correct);
              if (!correct && cfuPassedOnce) {
                return;
              }
              setPhase({
                kind: "cfu",
                // A `recalled` answer opens the same gate a `correct` one does, and is told
                // apart from it only in what the advisor says: nothing here may congratulate
                // a learner for producing an answer this surface had just printed.
                line:
                  outcome === "recalled"
                    ? RECALLED_LINE
                    : outcome === "correct"
                      ? content.node_id === "NUM.F"
                        ? NUM_F_CORRECT_LINE
                        : CORRECT_LINE
                      : INCORRECT_LINE,
                mood: outcome === "correct" ? "happy" : "encouraging",
              });
            }}
            // The second reveal lets them past without a correct answer. It opens the same
            // gate `onResult(true)` opens, so nobody is trapped on the question, but it
            // arrives separately so the advisor can say what actually happened.
            onRelease={() => {
              setCfuPassedOnce(true);
              setPhase({ kind: "cfu", line: REVEALED_LINE, mood: "encouraging" });
            }}
          />
        ) : (
          <div className="lesson-player__placeholder">
            <span className="micro-label">Check your understanding</span>
            <p>Coming soon - a quick question to check the main idea will go here.</p>
          </div>
        ))}

      {/* LAST, and that placement is the fix rather than a preference. The row is pinned to
          the foot of the well (`position: sticky`), and a sticky box cannot leave its
          containing block, so the way forward is only on screen everywhere the learner can
          scroll if its parent is the column that spans everything they can scroll past. See
          `AdvisorControls`. */}
      <AdvisorControls
        onNext={
          canAdvanceTeaching ? () => advanceTeaching(phase.index, phase.section) : undefined
        }
        onPrevious={
          canGoPrevious ? () => goPrevious(phase.index, phase.section) : undefined
        }
        previousDisabled={playingVisuals.size > 0}
        onShowHint={canShowHint ? revealHint : undefined}
        onReview={phase.kind === "cfu" && paragraphs.length > 0 ? reviewLesson : undefined}
        onFinishLesson={phase.kind === "cfu" && cfuPassedOnce ? finishLesson : undefined}
      />
    </div>
  );
}
