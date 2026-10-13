import type { EraId } from "@cr/skill-graph";
import { type RefObject, useEffect, useRef, useState } from "react";

import { AdvisorSpeech, AdvisorStage } from "../AdvisorStage";
import type { CoachAnchor } from "../coachmarks/coachMarksCore";
import { FirstBuildingTask, type PlacedBy, type PlacementStage } from "./FirstBuildingTask";
import { OnboardingActionTask } from "./OnboardingActionTask";
import { OnboardingSpotlight } from "./OnboardingSpotlight";
import {
  EMPTY_ONBOARDING_ACTION_VISITS,
  FIRST_BUILDING_TASK,
  isOnboardingActionMoment,
  loadOnboardingAdvisorStep,
  markOnboardingAdvisorSeen,
  NO_EXTRA_SURFACES,
  ONBOARDING_CLOSING_LINE,
  ONBOARDING_GATED_MOMENT,
  ONBOARDING_SKIP_LABEL,
  type OnboardingActionMomentId,
  type OnboardingActionVisits,
  type OnboardingMomentId,
  type OnboardingSurfaces,
  onboardingBriefingFor,
  resumeOnboardingAt,
  saveOnboardingAdvisorStep,
} from "./onboardingScript";

/**
 * **FIRST-RUN ONBOARDING: one mechanic per moment, with real city actions between them.**
 *
 * The presentation is `AdvisorStage` and `AdvisorSpeech`, the same two components the crisis
 * dialogue is built from, and not one line of it is written here. *"Do not invent a second
 * advisor"* is only enforceable if there is nothing here to drift, and
 * `advisorIsTheCrisisRegister.test.tsx` is where that claim can fail.
 *
 * ## ⚑ THE PLACEMENT MOMENT IS REAL NOW, AND IT IS THE BIGGEST THING IN THIS FILE
 *
 * The product lead, on the version that shipped: *"they should actually have to place the
 * building and not just drag a house into a 2d box like what is the point of that bro."*
 *
 * The 2D box existed because of this component: the stage is a full-screen `aria-modal` layer
 * that takes every click, so the island underneath it could not be reached and a gesture had
 * to be simulated inside the bubble. That is now solved at the layer rather than worked
 * around:
 *
 *  1. **The stage stands down** for the gated moment ({@link AdvisorStage}'s `modal={false}`).
 *     No `aria-modal`, no focus trap, and `firstBuildingTask.css` makes the layer
 *     pointer-transparent and shrinks the assembly into the bottom-left corner. The Build
 *     pill, the cards and the island are all live and reachable, by pointer and by Tab.
 *  2. **The gate is driven by the city's own placement event.** `CitySurface` counts
 *     confirmed placements and hands the count down; the tutorial latches on the count going
 *     up, so nothing here has any opinion about how the building got there. A learner who
 *     ignores the panel entirely, opens Build themselves and puts down a Longhouse has
 *     satisfied it.
 *  3. **The panel narrates the real flow** rather than owning it: see {@link FirstBuildingTask}.
 *
 * The lesson, civic, Town Hall, and Bay moments use the same stood-down action grammar. Their
 * callbacks open the host's existing surface; `activeSurface` temporarily hides this layer
 * without unmounting it, so closing that surface resumes the same step and preserves Back,
 * Skip, and the once-only state.
 *
 * **The baseline is taken at the mount, not at zero.** First-run onboarding only opens on an
 * empty island, but the dev replay control and How to play can both open this sequence over a
 * city that already has buildings on it, and a gate that read `count > 0` would already be
 * open there. What is asked for is one MORE skill building than when he started talking.
 *
 * ## THERE IS ALWAYS A WAY FORWARD
 *
 * A real placement is a longer road than a drag between two tiles, so this matters more than
 * it did rather than less:
 *
 *  - **Skip is one press from every advisor frame**, and `Escape` reaches the same handler.
 *    A live surface has its own explicit return, after which the same frame resumes.
 *  - **Back is never gated**, so every action moment can be left in either direction.
 *  - **The gated Next is `aria-disabled`, not `disabled`.** It stays focusable and it stays
 *    clickable, and pressing it says what is still owed and puts the keyboard on the control
 *    that gets it done. A `disabled` button is a dead control that explains nothing.
 *  - **"Place one for me" is in the tray from the FIRST frame of that moment**, beside Skip,
 *    and it performs a REAL placement through the host rather than faking one. Not after a
 *    failure: an escape a learner has to fail to discover is an escape the learner who most
 *    needs it never finds.
 *  - **"Open the Build menu"** is in the panel itself, for the learner who cannot find a gold
 *    pill in the corner from a noun.
 *
 * ## SEQUENCED, RESUMABLE, SKIPPABLE, AND NEVER REPEATED
 *
 * One moment on screen at a time, and the others are not mounted in any form.
 *
 *  - **Sequenced** by `ONBOARDING_MOMENT_ORDER`, the moment record's own key order.
 *  - **Resumable** because the step is written to storage on every advance.
 *    `resumeOnboardingAt` clamps a stored index that has stopped meaning anything, since a
 *    tutorial that opens on nothing cannot be got out of.
 *  - **Skippable instantly**, as above.
 *  - **Never repeated.** Skip and the last moment both set the done flag.
 *
 * **Nothing here advances on a timer** (INV-CRISIS-1), which is also why the placement gate
 * has no time-out that opens it: a learner who is thinking is not a learner who is stuck.
 *
 * ## ACCESSIBILITY
 *
 * `AdvisorStage`'s: a real `role="dialog"` + `aria-modal` labelled by a heading that is
 * announced and not drawn, a Tab focus trap, and `Escape` out. On top of that:
 *
 *  - **The step control is a pair of real buttons**, in the trap, reached by Tab, and
 *    disabled at the ends rather than vanishing so the row does not move mid-read.
 *  - **The moment announces itself as it changes.** The detail is an `aria-live="polite"`
 *    region wrapping a `key`ed section, so pressing Next replaces the subtree and a screen
 *    reader gets the new sentence without focus having to move off Next.
 *  - **No state by colour.** "Step 4 of N" is a sentence; the dots beside it are
 *    `aria-hidden` decoration differing in fill AND size.
 *  - **The spotlight is decoration.** Every moment that lights a control up also NAMES it in
 *    words, so a reader who never sees the ring loses no mechanic.
 *  - **Focus lands on Next**, and a gated press moves it to the action that completes the
 *    current frame.
 *  - **A gated action frame is a `group`, not a `dialog`**, because it genuinely is not modal.
 *    Announcing a modal over a page the learner is expected to use would say the opposite.
 */
export function OnboardingAdvisor({
  eraId,
  surfaces = NO_EXTRA_SURFACES,
  anchors = {},
  reducedMotion = false,
  placementCount = 0,
  buildMenuOpen = false,
  positioningOnIsland = false,
  actionVisits = EMPTY_ONBOARDING_ACTION_VISITS,
  activeSurface = null,
  onOpenBuildMenu,
  onPlaceForMe,
  onOpenAction,
  onMomentReached,
  onDone,
}: {
  /**
   * The era the city is standing in. Passed rather than read from the store, on
   * `CoachMarks`'s precedent: `CitySurface` takes an `eraId` prop that overrides the live era,
   * and copy that read the store directly would name era one's material over an era-five
   * island.
   */
  readonly eraId: EraId;
  /**
   * Which optional surfaces this city actually has, so a moment about one of them is taught
   * only where the learner can go and use it. See `OnboardingSurfaces`; the default teaches
   * nothing optional, which is the safe direction.
   */
  readonly surfaces?: OnboardingSurfaces;
  /**
   * The HUD elements the host already holds refs to, forwarded to the spotlight. Optional and
   * empty by default: the anchor registry covers the controls mounted outside `CitySurface`,
   * and a test that mounts this component alone still gets a working sequence with no rings
   * in it.
   */
  readonly anchors?: Partial<Record<CoachAnchor, RefObject<HTMLElement | null>>>;
  /** The learner's motion preference, as the host resolved it. */
  readonly reducedMotion?: boolean;
  /**
   * **HOW MANY SKILL BUILDINGS THE HOST HAS SEEN CONFIRMED**, ever, this session.
   *
   * A monotone counter rather than a boolean or a callback, for the reason `nudge` is a
   * counter: the interesting event is a CHANGE, and a boolean cannot distinguish "already
   * true when he started" from "became true because of him". The baseline is latched at the
   * mount and the gate wants one more than that.
   *
   * Defaulted so the component still mounts standalone in a test with no host behind it; the
   * gate is then only openable through *"Place one for me"*, which is what that harness sees.
   */
  readonly placementCount?: number;
  /** The real Build menu is open. Narration only. */
  readonly buildMenuOpen?: boolean;
  /** A ghost is on the island waiting to be confirmed. Narration only. */
  readonly positioningOnIsland?: boolean;
  /** Live surfaces visited during this tour run; never learning or city progress. */
  readonly actionVisits?: OnboardingActionVisits;
  /** The live surface currently covering the advisor, kept mounted so the step can resume. */
  readonly activeSurface?: OnboardingActionMomentId | null;
  /** Open the real Build menu. The host's own `openShop`. */
  readonly onOpenBuildMenu?: () => void;
  /**
   * Put a building down for the learner, FOR REAL, through the host's own placement path.
   *
   * Absent in a standalone mount, which is why the button is only offered when it is present:
   * an escape hatch that does nothing is worse than no escape hatch, because the learner
   * presses it and concludes the game is broken.
   */
  readonly onPlaceForMe?: () => void;
  /** Open one of the city's existing surfaces for its guided visit. */
  readonly onOpenAction?: (moment: OnboardingActionMomentId) => void;
  /**
   * Fired on arrival at each moment (keyed on the step changing, not on every render of
   * it) — a narrower signal than `onDone`, for a host that needs to react to REACHING a
   * specific step rather than only to the run finishing or an explicit action click. Its
   * first (and so far only) use: granting the civic-bootstrap top-up the instant the
   * "civic" moment is reached, BEFORE the learner reads that they can spend material on
   * civic buildings, so the claim is already true when they read it. A revisit via Back
   * fires it again, so a host action wired here must be safe to repeat.
   */
  readonly onMomentReached?: (moment: OnboardingMomentId) => void;
  /**
   * The tutorial is over, and HOW it ended, which the host acts on differently.
   *
   * `"walked"` means the last moment was passed, so the learner has been told the things the
   * retired coach-marks used to say and the host retires them. `"skipped"` means Skip or
   * `Escape`, so they have been told nothing and the contextual hints stay as the fallback.
   *
   * Called once per run, whichever route.
   */
  readonly onDone: (outcome: "walked" | "skipped") => void;
}) {
  const briefing = onboardingBriefingFor(eraId, surfaces);
  const moments = briefing.moments;
  const lastStep = moments.length - 1;

  /**
   * WHERE THE LEARNER IS, seeded ONCE from storage as lazy initial state.
   *
   * Lazy rather than an effect, so a resumed sequence paints moment two on its first frame
   * instead of showing moment one and then jumping, which would read as a glitch and would
   * also announce the wrong sentence to a screen reader before correcting itself.
   */
  const [step, setStep] = useState(() =>
    resumeOnboardingAt(loadOnboardingAdvisorStep(), moments.length),
  );
  /**
   * WHAT THE ISLAND HELD WHEN HE STARTED TALKING. See {@link placementCount}: the gate is a
   * DELTA, so a replay over a built city still asks for a building rather than opening on
   * one somebody placed last week.
   */
  const baselinePlacements = useRef(placementCount);
  /**
   * WHO PUT THE FIRST BUILDING DOWN, held here rather than in the panel.
   *
   * The panel unmounts every time the learner walks off its moment, so a gate kept inside it
   * would shut again behind them: press Next, press Back, and the building they placed has
   * been forgotten. Kept per RUN rather than in storage, because a replay from How to play is
   * somebody asking to be shown the whole thing again.
   */
  const [placedBy, setPlacedBy] = useState<PlacedBy | null>(null);
  /**
   * Set by *"Place one for me"* and cleared when the count answers it, so the status line can
   * be honest about which of the two of them put the building down.
   */
  const askedForHelp = useRef(false);
  /** Bumped on each press of a gated Next, so a second press re-announces the reason. */
  const [nudge, setNudge] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = "onboarding-advisor-title";
  const detailId = "onboarding-advisor-detail";

  useEffect(() => {
    // Operable from the keyboard from the first frame: Enter walks the moments.
    nextRef.current?.focus();
  }, []);

  /*
    THE LATCH, AND IT IS THE WHOLE OF THE GATE. One effect, watching one number: the host says
    a skill building went onto the island and the tutorial believes it. Blind to HOW —
    the Build menu, the keyboard, a dev seed or the escape hatch all arrive here identically,
    which makes "the learner placed a skill building" a fact about the city rather than a
    fact about this component's own widget.
  */
  useEffect(() => {
    if (placementCount > baselinePlacements.current) {
      setPlacedBy((current) => current ?? (askedForHelp.current ? "advisor" : "learner"));
      askedForHelp.current = false;
    }
  }, [placementCount]);

  const moment = moments[step];

  // See `onMomentReached`: fired once per arrival at a step (keyed on the moment id
  // changing), not on every render while it is showing. A learner navigating Back to a
  // step they already passed re-fires it, which is fine for an idempotent host action
  // like the civic-bootstrap grant, but this is not itself a once-ever guarantee.
  useEffect(() => {
    if (moment) {
      onMomentReached?.(moment.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment?.id]);

  const actionMoment = moment && isOnboardingActionMoment(moment.id) ? moment.id : null;
  const placementGated = moment?.id === ONBOARDING_GATED_MOMENT && placedBy === null;
  const actionGated = actionMoment !== null && !actionVisits[actionMoment];
  const gated = placementGated || actionGated;
  /*
    THE STAGE STANDS DOWN ONLY WHILE THE GATE IS SHUT. Once the building is down there is
    nothing left to reach past him, so he takes the screen back and the frame the learner
    reads their congratulations on is the full-size one they have been reading all along.
  */
  const standingDown = gated;

  /*
    ⚑ ONE ATTRIBUTE ON `<body>`, AND IT IS THE SMALLEST HANDLE THAT REACHES THE PROBLEM.

    Standing down makes the stage pointer-transparent, which gets the learner's clicks to the
    city. It does not move anything, and one HUD element is genuinely in the way: the
    placement confirm bar (`.hud-placement`) is centred at `bottom: 112px`, which is inside the
    corner the shrunken bubble occupies, and `.hud` is `z-index: 5` against the stage's 30, so
    the bar a learner has to press to finish the placement would be painted BEHIND the panel
    telling them to press it. `firstBuildingTask.css` lifts it and moves it clear for exactly
    as long as this attribute is set.

    Written on `<body>` because the bar is `CitySurface`'s and this component is mounted
    inside it with no ref to it, which is the same reason `OnboardingSpotlight` writes
    `data-spotlit` imperatively. Removed on cleanup, so nothing survives the moment.
  */
  useEffect(() => {
    if (!standingDown || typeof document === "undefined") {
      return;
    }
    document.body.setAttribute("data-ob-stand-down", "true");
    return () => document.body.removeAttribute("data-ob-stand-down");
  }, [standingDown]);

  /*
    THE TOUR BUBBLE'S CEILING, MEASURED RATHER THAN GUESSED. Same technique as
    `--account-chrome-clear` (`AccountBoundary.tsx`): measure the top-left civic
    stack's (Stone / Mastered / City Life) real bottom edge, publish it as a
    `documentElement`-scoped variable, and let `crisisCall.css` cap the bubble's
    natural height against it -- so the one long step can't grow into the stack on a
    short window, without capping every shorter step down to match it.
  */
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const measure = () => {
      const stack = document.querySelector(".hud-top-left");
      const rect = stack?.getBoundingClientRect();
      root.style.setProperty(
        "--hud-top-left-clear",
        rect ? `${Math.ceil(rect.bottom)}px` : "0px",
      );
    };
    measure();
    const stack = document.querySelector(".hud-top-left");
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (stack) {
      resizeObserver?.observe(stack);
    }
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--hud-top-left-clear");
    };
  }, []);


  /**
   * The way out, and there is exactly one of them so that Skip, Escape and finishing cannot
   * come apart on the once-only flag. Every route through this surface ends here, which is
   * what makes "never repeated" a property of the component rather than of the caller
   * remembering.
   */
  const leave = (outcome: "walked" | "skipped") => {
    markOnboardingAdvisorSeen();
    onDone(outcome);
  };

  const goToStep = (next: number) => {
    if (next > lastStep) {
      leave("walked");
      return;
    }
    const clamped = Math.max(0, Math.min(lastStep, next));
    setStep(clamped);
    setNudge(0);
    // Written on the ADVANCE rather than on unmount, because the case this exists for is the
    // tab being closed, and a closing tab runs no cleanup worth relying on.
    saveOnboardingAdvisorStep(clamped);
  };

  const pressNext = () => {
    if (gated) {
      setNudge((count) => count + 1);
      return;
    }
    goToStep(step + 1);
  };

  // A briefing with no moments would leave a dialog with nothing in it and no way to reach the
  // end, so it ends immediately rather than standing there empty. Unreachable while the record
  // has rows, and the one shape that would be a trap if it were not handled.
  if (!moment) {
    return null;
  }

  const onGatedMoment = moment.id === ONBOARDING_GATED_MOMENT;
  const suspended = activeSurface === moment.id;

  const stage: PlacementStage = placedBy
    ? "placed"
    : positioningOnIsland
      ? "positioning"
      : buildMenuOpen
        ? "choosing"
        : "idle";

  return (
    <div hidden={suspended} data-testid="onboarding-advisor-layer">
      {/*
        A SIBLING OF THE STAGE, NOT A CHILD, and the reason is stacking rather than tidiness:
        `.crisis-call-stage` is `position: fixed; z-index: 30`, which makes it a stacking
        context, so a ring rendered inside it can never be painted over the bubble. The whole
        job here is to make a control stand out from what is in front of it.

        IT GOES DARK WHILE THE LEARNER IS ACTUALLY BUILDING. A ring round the Build pill is the
        right thing to draw at the beginning of the placement moment and the wrong thing to
        draw over an open Build menu or a ghost on the grid, where the control it frames is
        covered by the very panel it sent the learner to.
      */}
      <OnboardingSpotlight
        anchor={standingDown && stage !== "idle" ? null : moment.spotlight}
        anchors={anchors}
        reducedMotion={reducedMotion}
        handsBackClicks={standingDown}
      />

      <AdvisorStage
        title={briefing.title}
        titleId={titleId}
        testId="onboarding-advisor"
        beat={moment.id}
        modal={!standingDown}
        onEscape={() => leave("skipped")}
      >
        <AdvisorSpeech
          mood={moment.mood}
          dress={briefing.advisorDress}
          speakerName={briefing.advisorName}
          lead={moment.lead}
          speechTestId="onboarding-advisor-speech"
          saidTestId="onboarding-advisor-said"
          leadTestId="onboarding-advisor-lead"
        >
          {/* ONE MOMENT, AND ONLY ONE. The others are not mounted. Hairline-separated inside
              the bubble rather than in a panel of its own: he is walking the learner through
              it, so it is still him talking. */}
          <div className="crisis-call-walkthrough" id={detailId}>
            {/* The live region is the wrapper, which persists; the section inside it is keyed,
                so Next replaces a subtree inside a region that was already there and the
                change is announced. */}
            <div aria-live="polite">
              <section
                key={moment.id}
                className="crisis-call-section crisis-call-slide crisis-call-slide--prose"
                // NAMED, NOT HEADED. The old on-screen `<h3>` is what made a one-sentence
                // moment look like a specification; a `<section>` with no accessible name is
                // worse, so the name stays in the tree and off the picture.
                aria-label={moment.title}
                data-moment={moment.id}
                data-testid="onboarding-advisor-moment"
              >
                <p className="crisis-call-slide__step">
                  {`Step ${step + 1} of ${moments.length}`}
                </p>
                <p className="crisis-call-line" data-testid="onboarding-advisor-body">
                  {moment.body}
                </p>
                {onGatedMoment && (
                  <FirstBuildingTask
                    stage={stage}
                    placedBy={placedBy}
                    nudge={nudge}
                    onOpenBuild={() => onOpenBuildMenu?.()}
                  />
                )}
                {actionMoment && (
                  <OnboardingActionTask
                    moment={actionMoment}
                    done={actionVisits[actionMoment]}
                    nudge={nudge}
                    onOpen={onOpenAction ? () => onOpenAction(actionMoment) : undefined}
                  />
                )}
              </section>
            </div>

            <div className="crisis-call-stepper">
              <button
                type="button"
                className="crisis-call-step-button crisis-call-step-button--tour"
                data-testid="onboarding-advisor-back"
                disabled={step === 0}
                onClick={() => goToStep(step - 1)}
              >
                Back
              </button>
              {/* Decoration on top of the sentence above. Fill AND size differ, and the reader
                  is told the step in words either way. */}
              <span className="crisis-call-dots" aria-hidden="true">
                {moments.map((each, index) => (
                  <span
                    key={each.id}
                    className="crisis-call-dot"
                    data-state={
                      index === step ? "current" : index < step ? "read" : "ahead"
                    }
                  />
                ))}
              </span>
              {/*
                THE ONE BUTTON THAT WALKS AND THEN ENDS, rather than a Next that disables at
                the last moment beside a separate finish. On the last moment there is nothing
                further to read, so a dimmed Next there would leave the primary action of the
                whole sequence to be guessed at from the ghost beside it.

                `aria-disabled` while the gate is shut, never `disabled`: see the header. It
                keeps its place in the tab order and answers a press with the reason.
              */}
              <button
                type="button"
                className="crisis-call-step-button crisis-call-step-button--tour"
                data-testid="onboarding-advisor-next"
                data-gated={gated}
                ref={nextRef}
                aria-disabled={gated}
                onClick={pressNext}
              >
                {step === lastStep ? "Start building" : "Next"}
              </button>
            </div>
          </div>

          {/*
            HIS CLOSING OFFER AND THE WAY OUT, on one row, in the crisis tray's own box. The
            skip is a ghost rather than a corner cross because a learner has to be able to
            find it in one look: the lead demos this, and a tutorial he cannot get out of
            instantly is worse than no tutorial.
          */}
          <div className="crisis-call-tray">
            <p className="crisis-call-closing">{ONBOARDING_CLOSING_LINE}</p>
            <div className="crisis-call-actions">
              {placementGated && onPlaceForMe && (
                <button
                  type="button"
                  className="city-action city-action-ghost city-action--tour"
                  data-testid="onboarding-advisor-place-for-me"
                  onClick={() => {
                    askedForHelp.current = true;
                    onPlaceForMe();
                  }}
                >
                  {FIRST_BUILDING_TASK.doItForMe}
                </button>
              )}
              <button
                type="button"
                className="city-action city-action-ghost city-action--tour"
                data-testid="onboarding-advisor-skip"
                onClick={() => leave("skipped")}
              >
                {ONBOARDING_SKIP_LABEL}
              </button>
            </div>
          </div>
        </AdvisorSpeech>
      </AdvisorStage>
    </div>
  );
}
