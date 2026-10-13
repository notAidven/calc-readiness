import { ERA_SEQUENCE, type EraDefinition, type EraId, eraNumber } from "@cr/skill-graph";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { WorldScene } from "./city/WorldScene";
import { devSessionStore } from "./devPersistence/devSession";
import { AdvisorLesson } from "./lessons/AdvisorLesson";
import { ShowHintAction } from "./lessons/AdvisorNpc";
import { type CfuOutcome, LessonCfu } from "./lessons/cfu";
import { LESSON_DOMAINS } from "./lessons/domains";
import { EraInfinitePractice } from "./lessons/EraInfinitePractice";
import { interleavedSkillIds } from "./lessons/interleavedPool";
import { completedNodeIdsFrom } from "./lessons/lessonProgress";
import { LessonProse, LessonSlideHeading } from "./lessons/prose";
import { sectionLabel, teachingSteps, workedExampleFor } from "./lessons/teachingSections";
import type { LessonCfuSpec, LessonContent } from "./lessons/types";
import { LessonVisual } from "./lessons/visuals";
import { WorkedSolution } from "./lessons/WorkedSolution";

/**
 * DEV ONLY — a full-screen page (reached with `?dev`) that lists every authored
 * lesson of EVERY registered domain so a developer can jump straight into any of them
 * without placing buildings one by one. Selecting a lesson opens it via `AdvisorLesson`
 * with `hasCompletedPractice`, which skips the NPC teaching narration and lands on the
 * options menu (Review the lesson / Practice set / Infinite practice). No city is
 * involved, so nothing is scored into mastery (`onComplete` is omitted).
 *
 * The list is driven by the all-domains registry, so a newly registered domain shows up
 * here the moment its packs land — this view is where an author previews a lesson, and
 * a domain missing from it is a domain nobody can open.
 *
 * The lesson list is DOMAIN-shaped because packs live in `content/lessons/<domain>/` and
 * an unregistered directory is the defect this view catches. The Era practice section
 * below it is ERA-shaped, because that is the unit the interleaved drill mixes over, and
 * the two axes genuinely differ: an era can pull nodes from four domain directories.
 *
 * The Era practice section honours the real completion gate (skills read from the saved
 * dev session), so it shows the same locked panel a learner would see. Each card also
 * carries a bypass button, because a dev with no saved city still has to be able to
 * preview the drill.
 *
 * Every surface opened from here takes `WorldScene size="full"`: the frame fills the
 * viewport rather than floating in it, over a 920px reading column that is the SAME one
 * the in-game lesson window gives a learner. In the city the floating card is right —
 * the village stays visible around it — but `?dev` has no city behind it, so the gutters
 * were dead screen and the 90vh cap cost a scroll on every slide.
 */
const DEV_LESSONS = LESSON_DOMAINS.flatMap((domain) =>
  domain.lessons.map((lesson) => ({ domain, lesson })),
);

/**
 * The findable half of the dev-persistence escape hatch: wipe the saved dev
 * session without opening devtools. (The other half is `?reset` on any app URL —
 * use that one when a bad blob is stopping the city from rendering at all.)
 * Renders nothing when the store is inert, which is every server-backed session.
 */
function DevSessionReset() {
  const [cleared, setCleared] = useState(false);

  if (!devSessionStore.enabled) {
    return null;
  }

  return (
    <section className="lesson-roadmap" aria-labelledby="dev-session-reset-title">
      <div className="lesson-intro">
        <span className="section-index">DEV</span>
        <h2 id="dev-session-reset-title">Saved dev session</h2>
        <p>
          Your city, placements, and mastery are kept in this browser under{" "}
          <code>{devSessionStore.storageKey()}</code> so a refresh does not reset them.
          Clear it to start the next load from an empty island — or add <code>?reset</code>{" "}
          to any app URL to do the same before the page reads it.
        </p>
        <button
          className="primary-action"
          type="button"
          onClick={() => {
            devSessionStore.clear();
            setCleared(true);
          }}
        >
          Clear saved dev session
        </button>
        <p aria-live="polite">
          {cleared ? "Cleared. The next load starts from an empty island." : ""}
        </p>
      </div>
    </section>
  );
}

/** An era drill the dev opened, and whether they asked to skip the completion gate. */
interface ActiveDrill {
  readonly era: EraDefinition;
  readonly bypassGate: boolean;
}

/**
 * How many of an era's nodes the interleaved drill could actually serve, ignoring the
 * completion gate. Derived from the pool the drill itself pools on, so the number this
 * page prints and the drill the button opens cannot disagree.
 *
 * **Most eras are 0 today and that is content state, not breakage.** Six of the ten have
 * no authored packs at all, and Early Modern holds one authored node (`RAT.5`), which
 * is below the two-skill floor interleaving needs. The dev page states the number rather
 * than hiding the era, because an era silently missing from this list is exactly the
 * defect `?dev`'s lesson list exists to catch.
 */
function drillableSkillCount(eraId: EraId): number {
  return interleavedSkillIds(eraId, "all").length;
}

/**
 * DEV ONLY: the authoring view of a pack's CFU, shown as the last step of the slide
 * stepper.
 *
 * The question itself is the REAL `LessonCfu` the learner answers, so typing here runs the
 * same grading the player runs — the shared checker when the pack sets `cfu.check`, the
 * exact-match against `accepted` when it does not. Nothing is stubbed, and `onResult` is
 * the same callback `AdvisorLesson` listens to, so the verdict shown is the verdict the
 * player would act on.
 *
 * What the dev view adds is the half a learner must never see: the accepted-answer list,
 * the hint, and which of the two grading paths this pack takes. That is what an author
 * needs to judge whether the key is complete (a missing equivalent form reads as a wrong
 * answer to the learner), and it is the reason this belongs to `?dev` and not to the
 * player. `showFinishLesson`/`onFinishLesson` are deliberately not passed: there is no
 * lesson to finish here and nothing writes to mastery.
 *
 * The three controls a learner drives the check with are the learner's own, not dev
 * copies. Reveal and re-ask come free, because the card renders them; the hint is
 * `ShowHintAction`, the advisor's button, shared from `AdvisorNpc`. It is placed ABOVE the
 * card because that is where the game puts it, and it is deliberately OUTSIDE the answer-key
 * panel: a control an author is judging cannot sit inside the box marked as the half that
 * never ships.
 */
function DevLessonCfu({ cfu, nodeId }: { cfu: LessonCfuSpec; nodeId: string }) {
  const [verdict, setVerdict] = useState<CfuOutcome | null>(null);
  /**
   * The card withholds its reveal until the hint has been spent, and the hint is the
   * ADVISOR's line. There is no advisor on this page, so without a control here the reveal
   * and everything behind it (the worked solution, the re-asked question) would be
   * unreachable in the one view built for looking at exactly those things.
   *
   * A button rather than a default of `true`, so what an author sees is the sequence a
   * learner meets: no reveal, then a hint, then a reveal.
   */
  const [hintTaken, setHintTaken] = useState(false);
  /**
   * Latched exactly as `AdvisorLesson`'s `cfuPassedOnce` latches, because it gates the same
   * button. Any outcome other than `incorrect` is a pass, `recalled` included.
   */
  const [passedOnce, setPassedOnce] = useState(false);
  /**
   * The second reveal opens the gate WITHOUT an answer, so it reports through `onRelease`
   * and never through `onResult`. Tracked separately for the same reason the player keeps
   * them apart: "released" is not a verdict, and showing the stale one instead would tell an
   * author the surface had stopped responding.
   */
  const [released, setReleased] = useState(false);

  // Mirrors the game's `canShowHint`: one hint, withdrawn once the check is passed. The step
  // unmounts when you leave it, so re-entering the CFU offers the hint again.
  const canShowHint = !hintTaken && !passedOnce;

  return (
    <>
      {canShowHint ? (
        <div className="advisor-npc__controls">
          <ShowHintAction onShowHint={() => setHintTaken(true)} />
        </div>
      ) : (
        hintTaken && (
          // Where the advisor's bubble would carry it. Announced, because in the game the
          // hint arrives as speech and the bubble is a live region.
          <div aria-live="polite">
            <LessonProse markdown={cfu.hint} />
          </div>
        )
      )}

      {/* The outcome is shown as the card reported it, `recalled` included: an author
        checking a key needs to see that the surface can tell a produced answer from one it
        had already printed, because that distinction is what the advisor's line turns on. */}
      <LessonCfu
        cfu={cfu}
        nodeId={nodeId}
        hintTaken={hintTaken}
        onResult={(outcome) => {
          setVerdict(outcome);
          setPassedOnce((passed) => passed || outcome !== "incorrect");
        }}
        onRelease={() => {
          setReleased(true);
          setPassedOnce(true);
        }}
      />

      <aside className="dev-slides__key" aria-labelledby={`${nodeId}-dev-cfu-key`}>
        <span className="section-index">DEV ONLY</span>
        <h3 id={`${nodeId}-dev-cfu-key`}>Answer key (hidden from learners)</h3>

        <p aria-live="polite">
          Last verdict:{" "}
          <code>
            {released
              ? "released by a second reveal, not answered"
              : (verdict ?? "not answered yet")}
          </code>
        </p>

        <p>
          Graded by:{" "}
          <code>
            {cfu.check
              ? `shared checker, ${cfu.check.answer_type}, key ${cfu.check.answer_key}`
              : "exact match against the accepted list"}
          </code>
          {cfu.check
            ? " — equivalent forms pass, so the accepted list below is only the fallback."
            : " — form matters, so anything not listed below is marked wrong."}
        </p>

        <h4>Accepted answers ({cfu.accepted.length})</h4>
        {/* Named, because the worked solution below prints the answer too, and an author
          reading "is this spelling in the key" needs the key rather than the panel. */}
        <ul className="dev-slides__accepted" aria-label="Accepted answers">
          {cfu.accepted.map((answer) => (
            <li key={answer}>
              <code>{answer}</code>
            </li>
          ))}
        </ul>

        {/* Kept here as well as on the button above, because spending the hint is one-way
          and this panel is the reference an author reads without spending anything. */}
        <h4>Hint</h4>
        <LessonProse markdown={cfu.hint} />

        <h4>Worked solution ({cfu.worked_solution?.length ?? 0} steps)</h4>
        {cfu.worked_solution && cfu.worked_solution.length > 0 ? (
          <ol className="dev-slides__accepted" aria-label="Worked solution">
            {cfu.worked_solution.map((step) => (
              <li key={step}>
                <LessonProse markdown={step} />
              </li>
            ))}
          </ol>
        ) : (
          <p>This pack has authored no worked solution, so its reveal shows no steps.</p>
        )}

        <h4>Re-ask</h4>
        <p>
          {cfu.variants
            ? `Draws from ${cfu.variants.template_id}, ${cfu.variants.count} questions in the cycle.`
            : "No generator, so the re-ask serves this same question again."}
        </p>
      </aside>
    </>
  );
}

/**
 * DEV ONLY: step through one lesson's mini-lesson slides without completing anything.
 *
 * `AdvisorLesson` withholds "Next" until every gating widget on the current paragraph
 * calls `onComplete`, which is exactly right for a learner and exactly wrong for QA: to
 * look at slide 4 you first have to solve slides 1 to 3. This view renders one slide at a
 * time and passes NO `onComplete` to the widget, so the gate has nothing to hold and any
 * slide is one click away. It is a separate component reading the same `LessonContent`;
 * `AdvisorLesson`'s gating is untouched and is still the only path a learner ever takes.
 *
 * The pack's CFU is the step AFTER the last paragraph, which is where the real player puts
 * it (`AdvisorLesson` opens the CFU once the narration runs out). Keeping it inside this
 * stepper rather than on a screen of its own is deliberate: an author reviewing a lesson
 * reaches the question the same way the lesson does, and reaching it costs one click from
 * any slide instead of a full gated playthrough.
 *
 * The header names the slide index, the section, and the widget id(s) placed on it, so a QA
 * note can say "RAD.4 slide 2 activity, root-parity-builder" instead of "the bars one".
 *
 * A step here is a SECTION and not a slide, because that is the unit the player advances by
 * (`teachingSections.ts`). Reviewing three-per-slide against a stepper that showed the whole
 * slide at once would review a screen no learner is ever shown.
 */
function DevLessonSlides({ lesson }: { lesson: LessonContent }) {
  const [index, setIndex] = useState(0);

  const slides = lesson.mini_lesson;
  const cfu = lesson.cfu;
  // The player's own walk, so the stepper cannot show a slide in a shape the player never
  // puts it in: one step per SECTION, not one per slide.
  const steps = teachingSteps(lesson);
  const stepCount = steps.length + (cfu ? 1 : 0);
  const lastIndex = Math.max(stepCount - 1, 0);
  const current = Math.min(index, lastIndex);
  const step = steps[current];
  const onCfuStep = cfu !== undefined && current === steps.length;
  const paragraph = step ? slides[step.index] : undefined;
  const workedExample =
    step?.section === "example" ? workedExampleFor(lesson, step.index) : null;
  // Only the activity section renders a widget, so only there is there one to name.
  const visuals =
    step?.section === "activity"
      ? (lesson.visuals ?? []).filter((v) => v.after === step.index)
      : [];
  const widgetSummary =
    step?.section !== "activity"
      ? `no widget in this section (${sectionLabel(step?.section ?? "lecture")})`
      : visuals.length === 0
        ? "no visual placed on this slide"
        : visuals.map((v) => `${v.id}${v.gates ? " (gates)" : " (ungated)"}`).join(", ");

  return (
    <div className="dev-slides">
      <div className="lesson-intro">
        <span className="section-index">DEV</span>
        <h2>
          {step
            ? `${lesson.node_id} slide ${step.index + 1} of ${slides.length} · ${sectionLabel(step.section)}`
            : `${lesson.node_id} check for understanding`}
        </h2>
        {onCfuStep ? (
          <p aria-live="polite">
            Last step of {stepCount}, where the real player opens it. The question below is
            live: it grades through the same checker the player uses.
          </p>
        ) : (
          <p aria-live="polite">
            Widget: <code>{widgetSummary}</code>
          </p>
        )}
        <p className="micro-label">
          Gating is bypassed here: the widget is rendered without `onComplete`, so you can
          jump to any slide without solving the ones before it. Each slide is walked in the
          same sections the player uses, so a numbered chip lands on that slide's lecture
          and its widget is one or two steps on. The real lesson player still gates
          normally.
        </p>
      </div>

      <div className="lesson-interactive__controls dev-slides__nav">
        <button
          type="button"
          className="lesson-interactive__step"
          disabled={current === 0}
          onClick={() => setIndex(Math.max(current - 1, 0))}
        >
          &#8592; Previous step
        </button>
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.slice(0, 32)}
            type="button"
            className="lesson-interactive__chip"
            aria-current={step?.index === slideIndex ? "true" : undefined}
            aria-label={`Go to slide ${slideIndex + 1}`}
            // A slide is several steps now, so the chip lands on the first of them and
            // "Next step" walks the rest; the widget is on the last one.
            onClick={() =>
              setIndex(
                Math.max(
                  steps.findIndex((s) => s.index === slideIndex),
                  0,
                ),
              )
            }
          >
            {slideIndex + 1}
          </button>
        ))}
        {cfu && (
          <button
            type="button"
            className="lesson-interactive__chip"
            aria-current={onCfuStep ? "true" : undefined}
            aria-label="Go to check for understanding"
            onClick={() => setIndex(steps.length)}
          >
            CFU
          </button>
        )}
        <button
          type="button"
          className="lesson-interactive__step"
          disabled={current >= lastIndex}
          onClick={() => setIndex(Math.min(current + 1, lastIndex))}
        >
          Next step &#8594;
        </button>
      </div>

      <div className="lesson-player__prose">
        {onCfuStep && cfu ? (
          <DevLessonCfu cfu={cfu} nodeId={lesson.node_id} />
        ) : paragraph && step ? (
          <>
            <LessonSlideHeading subtitle={lesson.slide_subtitles?.[step.index]} />
            <LessonProse markdown={paragraph} />
          </>
        ) : (
          <p>This pack has no slides.</p>
        )}
        {workedExample && (
          <WorkedSolution
            label="Worked example"
            intro={workedExample.prompt}
            steps={workedExample.steps}
          />
        )}
        {visuals.map((v) => (
          <LessonVisual key={v.id} id={v.id} />
        ))}
      </div>
    </div>
  );
}

export function DevLessons() {
  const [active, setActive] = useState<LessonContent | null>(null);
  const [activeSlides, setActiveSlides] = useState<LessonContent | null>(null);
  const [drill, setDrill] = useState<ActiveDrill | null>(null);

  /**
   * The era drill is gated on completed skills, and the only progress a dev page can
   * see is whatever the city saved to this browser. Read once per mount: `?dev` writes
   * no mastery, so nothing here can go stale while the page is open.
   */
  const completedNodeIds = useMemo(
    () => completedNodeIdsFrom(devSessionStore.load()?.node_states ?? []),
    [],
  );

  /**
   * Where the list was standing when it was left, and which entry was opened from there.
   *
   * Opening a lesson unmounts the list, so coming back rebuilt it scrolled to the top and
   * whoever was working through the fifth domain's fourth pack had to scroll down to it
   * again after every single exit.
   */
  const listBox = useRef<HTMLDivElement | null>(null);
  const resume = useRef<{ scrollTop: number; focusId: string } | null>(null);

  /** Mark the spot, then open what was asked for. */
  function leaveList(focusId: string, open: () => void) {
    resume.current = { scrollTop: listBox.current?.scrollTop ?? 0, focusId };
    open();
  }

  useLayoutEffect(() => {
    // The list is only on screen when nothing has been opened over it.
    if (active !== null || activeSlides !== null || drill !== null) {
      return;
    }
    const box = listBox.current;
    const spot = resume.current;
    if (box === null || spot === null) {
      return;
    }
    resume.current = null;
    // Focus first and keep it from scrolling: the position to land on is the one that was
    // left, not wherever the browser would rather put the button.
    document.getElementById(spot.focusId)?.focus({ preventScroll: true });
    box.scrollTop = spot.scrollTop;
  }, [active, activeSlides, drill]);

  if (activeSlides) {
    return (
      <div className="city-shell">
        <WorldScene
          eyebrow={`${activeSlides.node_id} - dev slides`}
          title={activeSlides.title}
          tone="lesson"
          size="full"
          exitLabel="Back to lessons"
          soundToggle
          onExit={() => setActiveSlides(null)}
        >
          <DevLessonSlides key={activeSlides.node_id} lesson={activeSlides} />
        </WorldScene>
      </div>
    );
  }

  if (drill) {
    return (
      <div className="city-shell">
        <WorldScene
          eyebrow={`${drill.era.name} - dev`}
          title="Interleaved practice"
          tone="lesson"
          size="full"
          exitLabel="Back to lessons"
          onExit={() => setDrill(null)}
        >
          <EraInfinitePractice
            eraId={drill.era.id}
            completedNodeIds={drill.bypassGate ? "all" : completedNodeIds}
            onExit={() => setDrill(null)}
          />
        </WorldScene>
      </div>
    );
  }

  if (active) {
    return (
      <div className="city-shell">
        <WorldScene
          eyebrow={`${active.node_id} - dev`}
          title={active.title}
          tone="lesson"
          size="full"
          exitLabel="Back to lessons"
          onExit={() => setActive(null)}
        >
          <AdvisorLesson content={active} hasCompletedPractice />
        </WorldScene>
      </div>
    );
  }

  return (
    <div className="city-shell dev-lessons" ref={listBox}>
      <section className="lesson-roadmap" aria-labelledby="dev-lessons-title">
        <div className="lesson-intro">
          <span className="section-index">DEV</span>
          <h2 id="dev-lessons-title">All lessons</h2>
          <p>
            Jump straight into any lesson's options menu (review, practice, infinite
            practice) without placing buildings. Nothing here writes to mastery.
          </p>
          <p>
            "Step slides" opens the same lesson one teaching section at a time (the count is
            steps, not slides: a slide is its lecture, its worked example where the pack
            authors one, and its activity), with the widget gates bypassed, so you can
            inspect any slide without solving the ones before it. It names the slide index,
            the section, and the widget id for bug reports, and its last step is the pack's
            check-for-understanding question — live, and shown with its accepted answers and
            hint so you can see whether the key is complete.
          </p>
        </div>

        <div className="lesson-track">
          {DEV_LESSONS.map(({ domain, lesson }, index) => (
            <article className="lesson-stop" key={lesson.node_id}>
              <div className="lesson-rail">
                <span>{index + 1}</span>
              </div>
              <div className="lesson-copy">
                <div className="lesson-heading">
                  <h3>{lesson.node_id}</h3>
                  <span>{domain.label} lesson</span>
                </div>
                <p>{lesson.title}</p>
                <button
                  className="primary-action"
                  type="button"
                  id={`dev-open-${lesson.node_id}`}
                  onClick={() =>
                    leaveList(`dev-open-${lesson.node_id}`, () => setActive(lesson))
                  }
                >
                  Open options
                </button>
                <button
                  className="lesson-interactive__reset"
                  type="button"
                  id={`dev-slides-${lesson.node_id}`}
                  onClick={() =>
                    leaveList(`dev-slides-${lesson.node_id}`, () => setActiveSlides(lesson))
                  }
                >
                  Step slides ({teachingSteps(lesson).length}
                  {lesson.cfu ? " + CFU" : ""})
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lesson-roadmap" aria-labelledby="dev-era-practice-title">
        <div className="lesson-intro">
          <span className="section-index">DEV</span>
          <h2 id="dev-era-practice-title">Era practice</h2>
          <p>
            Endless interleaved drills across the skills of an ERA whose practice set you
            have finished. An era is the chapter a learner plays through, and it does not
            match a domain: three domains span eras, so <code>RAT.5</code> mixes with the
            Early Modern rather than with the other rational-expression nodes. Problems
            rotate through every unlocked node before any skill repeats. Nothing here writes
            to mastery, so the unlocked count comes from whatever the city saved in this
            browser.
          </p>
          <p>
            Every era is listed, including the ones with nothing to mix yet. Interleaving
            needs two skills, so an era showing 0 or 1 drillable skills opens the locked
            panel: that is the era model reporting the content that exists, not a broken
            drill.
          </p>
        </div>

        <div className="lesson-track">
          {ERA_SEQUENCE.map((era) => {
            const drillable = drillableSkillCount(era.id);
            const unlocked = completedNodeIds.filter((nodeId) =>
              era.nodes.includes(nodeId),
            ).length;
            return (
              <article className="lesson-stop" key={era.id}>
                <div className="lesson-rail">
                  <span>{eraNumber(era.id)}</span>
                </div>
                <div className="lesson-copy">
                  <div className="lesson-heading">
                    <h3>{era.name}</h3>
                    <span>Era infinite practice</span>
                  </div>
                  <p>
                    {unlocked} of {drillable} drillable skills unlocked, interleaved each
                    cycle ({era.nodes.length} nodes in the era).
                  </p>
                  <button
                    className="primary-action"
                    type="button"
                    id={`dev-drill-${era.id}`}
                    onClick={() =>
                      leaveList(`dev-drill-${era.id}`, () =>
                        setDrill({ era, bypassGate: false }),
                      )
                    }
                  >
                    Open interleaved drill
                  </button>
                  <button
                    className="advisor-npc__action"
                    type="button"
                    id={`dev-drill-all-${era.id}`}
                    onClick={() =>
                      leaveList(`dev-drill-all-${era.id}`, () =>
                        setDrill({ era, bypassGate: true }),
                      )
                    }
                  >
                    Open all skills (dev)
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <DevSessionReset />
    </div>
  );
}
