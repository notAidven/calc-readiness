import { useEffect, useRef, useState } from "react";

import { AdvisorSpeech, AdvisorStage } from "./AdvisorStage";
import {
  type CrisisBriefing,
  hasReadCrisisBriefing,
  markCrisisBriefingRead,
} from "./crisisCall";

import "./crisisCall.css";

/**
 * THE CRISIS ENTRY SEQUENCE'S TWO VISIBLE BEATS: the notice that the crisis has arrived,
 * and the advisor explaining what it will ask.
 *
 * Both live here because they are one contract. The notice is what stays when the advisor
 * is dismissed, and the advisor is what the notice opens; splitting them across two files
 * would let one be deleted while the other went on pointing at it.
 *
 * ## The advisor SPEAKS, and the rules are a walkthrough underneath him
 *
 * The card used to be one block of prose beside a small advisor icon: nine rules at once,
 * with the character reduced to decoration next to them. The lead's ruling on 2026-07-31:
 * *"instead of one wall of text dumping all the information and a mini advisor icon, it
 * should have an actual speech bubble with the advisor going something like 'Sire! The worst
 * winter we've ever seen is upon us.' … and then some short slides explaining how the game
 * works. Those sub-slides should be small and isolated to one section, to prevent users from
 * being overloaded with information."*
 *
 * So the dialogue has two parts, and they are deliberately unequal.
 *
 *  1. **The speech bubble is the hero.** A full-height figure with a tailed bubble beside
 *     it, and `briefing.lead` at the top of it in shouting type. It is the first thing on
 *     screen and it carries no rule: the hook has to survive being the only thing a player
 *     reads.
 *  2. **The walkthrough is one slide at a time.** `briefing.slides` is four sections and
 *     exactly one of them is mounted, with a Back / Next pair and a "Step 2 of 4" line. The
 *     other three are not on screen in any form, which is the whole point of the change:
 *     "isolated to one section" is a claim about what is VISIBLE, and a collapsed accordion
 *     or a scrolled column would satisfy the layout and not the ask.
 *
 * ## IT IS NO LONGER A CARD, and that is the point of the 2026-07-31 rewrite
 *
 * It WAS one: `.coc-popup` / `.coc-card`, the city's shared message-card chrome, with a
 * title ribbon, a bordered panel, a corner close and a pinned action tray over a dimming
 * full-screen scrim. The lead's verdict on that: *"it doesn't truly look like an advisor
 * pop up. i just want it to be like its literally just the advisor and a giant chat bubble
 * that basically shouts, 'Sire! ....' it shouldn't be contained within a box; it should
 * appear over the actual island screen. right now its modeled too much like a lesson."*
 *
 * So every piece of that chrome is gone and nothing replaced it:
 *
 *  - **No panel.** `.crisis-call-stage` is a transparent full-screen layer. It has no
 *    background, no border and no shadow, so the only things drawn are the character and
 *    the bubble.
 *  - **No scrim.** The island keeps its own light. The one opaque surface is the bubble's
 *    own fill, which is the minimum needed to read dark text over bright snow and is local
 *    to the bubble rather than spread over the scene.
 *  - **No title ribbon and no corner close.** The heading survives as the dialogue's
 *    accessible name (below); the ways out are "Not yet" and `Escape`, both of which were
 *    already there.
 *  - **The advisor is a character, not an avatar chip.** He was 136px beside nine rules;
 *    he is now `clamp(132px, 30vh, 232px)` standing on the island with the bubble beside
 *    his head, and the bubble's tail points back at him.
 *
 * The layer still TAKES pointer events, transparent or not, because `aria-modal` says the
 * city behind it is inert while the advisor is speaking. What changed is what you can see
 * through it, not what you can click.
 *
 * The advisor figure is `OruAdvisorCharacter`, the one character the whole run has (D-ET9),
 * mounted decorative and `aria-hidden`, with the words carrying every bit of the meaning.
 *
 * ## ⚑ THE LAYOUT AND THE DIALOG SEMANTICS MOVED TO `AdvisorStage.tsx`
 *
 * The stage, the figure, the bubble, the byline, the shout, the focus trap and `Escape` are
 * all in `../city/AdvisorStage.tsx` now, and nothing about any of them changed: the DOM this
 * file renders is the same DOM it rendered before, which is what the five suites over
 * `.crisis-call-speech` are evidence of. What moved is WHERE it is written, and the reason is
 * that first-run onboarding is a second caller — `onboarding/OnboardingAdvisor.tsx`, in this
 * same register on the lead's ruling — and two copies of this assembly is how the crisis
 * advisor and the onboarding advisor become two characters who dress alike. Read that file's
 * header for the argument.
 *
 * What is left here is what is actually the crisis's: the briefing's own pagination, the
 * gate, and the two replies.
 *
 * ## Accessibility, and the clockless rule
 *
 * A real modal, unchanged by the chrome coming off, and now the stage's rather than this
 * file's: `role="dialog"` + `aria-modal`, labelled by its heading, the Tab focus trap
 * `BuildingUnlockedPopup` established, `Escape` to dismiss. What stays here is which control
 * focus LANDS on, because that is a question about this surface's own buttons.
 *
 * The walkthrough adds three things on top of that, none of them optional:
 *
 *  - **The step control is a pair of real buttons**, not clickable divs and not a swipe. It
 *    is in the focus trap, it is reached by Tab, and Back / Next disable at the ends rather
 *    than vanishing, so the row does not move under the pointer mid-read.
 *  - **The slide announces itself as it changes.** The panel is an `aria-live="polite"`
 *    region wrapping a `key`ed section, so pressing Next replaces the subtree and a screen
 *    reader reads the new step, heading and lines without focus having to move off Next.
 *  - **No state by colour.** "Step 2 of 4" is a sentence; the dots beside it are
 *    `aria-hidden` decoration that differ in fill AND size, and they borrow no hue from the
 *    correctness palette (green correct, `--brick` wrong, `--signal-deep` standing).
 *
 * **Nothing here advances on a timer** (INV-CRISIS-1): the dialogue waits, the slides wait,
 * and the only ways out are a button or `Escape`. Dismissing never withdraws the call,
 * which is D-CRISIS-10's *"the crisis announces itself, and the player chooses when to
 * answer"* — the notice below is what that choice is made from afterwards.
 */

/**
 * THE STANDING NOTICE — the crisis has been called and has not been answered.
 *
 * It is a `role="status"` rather than an alert: the assertive announcement already fired
 * once when the call landed (`crisisCallMessage`), and a banner that re-interrupts every
 * time the city re-renders would be the interruption D-CRISIS-10 rules out.
 */
export function CrisisCallNotice({
  briefing,
  onExplain,
}: {
  readonly briefing: CrisisBriefing;
  /** Bring the advisor back up. The card is where the crisis is actually entered. */
  readonly onExplain: () => void;
}) {
  return (
    <div className="hud hud-crisis-call">
      <div className="crisis-call-notice" role="status" data-testid="crisis-call-notice">
        <span className="crisis-call-notice__mark" aria-hidden="true">
          {briefing.eraId === "classical" ? "\u2617" : "\u2744"}
        </span>
        <p className="crisis-call-notice__line">
          <strong>{briefing.title}</strong> is waiting. It starts when you say so.
        </p>
        <button
          type="button"
          className="city-action city-action-small"
          data-testid="crisis-call-explain"
          onClick={onExplain}
        >
          {briefing.advisorName ? `Talk to ${briefing.advisorName}` : "What happens"}
        </button>
      </div>
    </div>
  );
}

/**
 * THE ADVISOR MOMENT — the era's advisor speaking, and the terms of the crisis behind him.
 *
 * Every sentence comes from `crisisCall.ts` (`crisisBriefingFor`), which reads its numbers
 * off the engine's tuning table and its action list off the engine's action union. This
 * component chooses the layout and the pagination and nothing else, so a retune, a fourth
 * action or a fifth slide changes what is on screen without this file being touched.
 */
export function CrisisCallAdvisor({
  briefing,
  onFace,
  onLater,
}: {
  readonly briefing: CrisisBriefing;
  /** Answer the call: the crisis opens on the island the learner is standing on. */
  readonly onFace: () => void;
  /** Leave it standing. The notice keeps the way in (D-CRISIS-10). */
  readonly onLater: () => void;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = "crisis-call-title";
  const walkthroughId = "crisis-call-walkthrough";
  const slideHeadingId = "crisis-call-slide-heading";
  const gateId = "crisis-call-gate";

  const slides = briefing.slides;
  const lastStep = slides.length - 1;
  const [step, setStep] = useState(0);
  /**
   * **WHETHER THE WALKTHROUGH HAS BEEN READ TO THE END, which is what "Face the winter" is
   * gated on.**
   *
   * Ruled by the team lead on 2026-08-02: *"dont let the user click face the winter until they
   * go through all the tool tips."*
   *
   * Read from storage ONCE as lazy initial state, so a player who has already walked the four
   * slides on a previous entry is not made to walk them again — the ruling is that a learner
   * meets the rules, not that they meet them every time. The same read decides whether the
   * walkthrough opens expanded, which is why it is one piece of state and not two: those are
   * the same question.
   *
   * It becomes true here only by REACHING THE LAST SLIDE. Collapsing the walkthrough
   * deliberately does not set it, which is a change: `markCrisisBriefingRead` used to be called
   * on collapse as well, on the reasoning that putting it away means *"I do not need this
   * expanded again"*. That was safe while nothing was gated. It is not now, because collapsing
   * on slide one would be the whole gate bypassed in one click.
   */
  const [read, setRead] = useState(() => hasReadCrisisBriefing());
  const [walkthroughOpen, setWalkthroughOpen] = useState(() => !read);
  /**
   * THE GATE. A briefing with no slides gates nothing, which is the one case that must not
   * deadlock: `lastStep` is -1 there, so there is no last slide to reach and no rules to meet.
   */
  const canFace = read || slides.length === 0;
  /**
   * The gate AS THE CARD OPENED, which is a different question from `canFace` and the reason it
   * is held separately: the focus effect below runs once, and re-focusing when the gate opens
   * would take focus out from under a player who is mid-read on the last slide.
   */
  const openedGated = useRef(!canFace);

  useEffect(() => {
    // FOCUS THE CONTROL THE PLAYER CAN ACTUALLY USE. "Face the winter" was focused on open so
    // that Enter answered the call from the first frame; while it is disabled that would land
    // focus on nothing, so the gated card opens on "Next" instead and Enter walks the slides.
    // Either way the dialogue is operable from the keyboard alone from the first frame, which
    // is the property that had to survive the gate.
    (openedGated.current ? nextRef : actionRef).current?.focus();
  }, []);

  const slide = slides[step];

  const goToStep = (next: number) => {
    const clamped = Math.max(0, Math.min(lastStep, next));
    setStep(clamped);
    // Reaching the end IS having read it, and it is now the ONLY thing that is. Facing the
    // winter never was: a player who presses Enter on the first frame has read nothing, and
    // recording that as read is how somebody never meets the rules at all.
    if (clamped === lastStep) {
      setRead(true);
      markCrisisBriefingRead();
    }
  };

  const toggleWalkthrough = () => {
    setWalkthroughOpen(!walkthroughOpen);
  };

  return (
    <AdvisorStage
      title={briefing.title}
      titleId={titleId}
      testId="crisis-call-advisor"
      onEscape={onLater}
    >
      {/* THE ADVISOR AND HIS BUBBLE, over the island and inside no box at all. The dress
          comes off the same `resolveEraAdvisor` call as the byline's name, in
          `crisisBriefingForCity`, so the two cannot disagree. */}
      <AdvisorSpeech
        mood="talk"
        dress={briefing.advisorDress}
        speakerName={briefing.advisorName}
        lead={briefing.lead}
        speechTestId="crisis-call-speech"
        saidTestId="crisis-call-said"
        leadTestId="crisis-call-lead"
      >
        {slide && (
          <button
            type="button"
            className="crisis-call-disclose"
            data-testid="crisis-call-walkthrough-toggle"
            aria-expanded={walkthroughOpen}
            aria-controls={walkthroughId}
            onClick={toggleWalkthrough}
          >
            {walkthroughOpen ? "Hide this" : "How it works"}
          </button>
        )}

        {/* ONE SECTION, AND ONLY ONE. The other slides are not mounted. It sits inside
                the bubble, hairline-separated rather than in a panel of its own: the
                advisor is walking the player through it, so it is still him talking. */}
        {slide && walkthroughOpen && (
          <div className="crisis-call-walkthrough" id={walkthroughId}>
            {/* The live region is the wrapper, which persists; the section inside it
                    is keyed, so Next replaces a subtree inside a region that was already
                    there and the change is announced. */}
            <div aria-live="polite">
              <section
                key={slide.id}
                className="crisis-call-section crisis-call-slide"
                aria-labelledby={slideHeadingId}
                data-slide={slide.id}
                data-testid="crisis-call-slide"
              >
                <p className="crisis-call-slide__step">
                  {`Step ${step + 1} of ${slides.length}`}
                </p>
                <h3 id={slideHeadingId}>{slide.heading}</h3>
                <ul className="crisis-call-terms">
                  {slide.terms.map((term) => (
                    <li key={term.id} data-term={term.id}>
                      {term.text}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="crisis-call-stepper">
              <button
                type="button"
                className="crisis-call-step-button"
                data-testid="crisis-call-back"
                disabled={step === 0}
                onClick={() => goToStep(step - 1)}
              >
                Back
              </button>
              {/* Decoration on top of the sentence above. Fill AND size differ, and
                      the reader is told the step in words either way. */}
              <span className="crisis-call-dots" aria-hidden="true">
                {slides.map((each, index) => (
                  <span
                    key={each.id}
                    className="crisis-call-dot"
                    data-state={
                      index === step ? "current" : index < step ? "read" : "ahead"
                    }
                  />
                ))}
              </span>
              <button
                type="button"
                className="crisis-call-step-button"
                data-testid="crisis-call-next"
                ref={nextRef}
                disabled={step === lastStep}
                onClick={() => goToStep(step + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* THE LAST THING HE SAYS, AND WHAT YOU SAY BACK, on one line. They were two
                rows plus a bordered action tray when this was a card; the tray was the
                last piece of that chrome and the closing line is short enough to sit
                beside the buttons rather than push them another line down a short
                window. */}
        <div className="crisis-call-tray">
          {/*
                WHILE THE GATE IS SHUT THIS ROW SAYS WHY, AND IT REPLACES THE CLOSING LINE RATHER
                THAN JOINING IT. Two reasons, and the second is measured: the advisor's closing line
                is *"Face it when you are ready"*, which is an invitation to press a button the card
                is refusing, so the two cannot both be true at once; and a THIRD item on this row
                costs a line, which `crisisCall.browser.test.tsx` measures at 1280x360 where the
                card has none to give.
              */}
          {canFace ? (
            <p className="crisis-call-closing">{briefing.closing}</p>
          ) : (
            <p className="crisis-call-gate" id={gateId} data-testid="crisis-call-gate">
              {`Read all ${slides.length} steps first.`}
            </p>
          )}
          <div className="crisis-call-actions">
            {/*
                  GATED UNTIL THE WALKTHROUGH HAS BEEN WALKED. `aria-describedby` points at the
                  reason rather than leaving a dimmed button unexplained, which is the same rule
                  the repairs HUD follows for a spend it cannot afford: a disabled control that
                  does not say why is worse than one that is not there.
                */}
            <button
              type="button"
              className="city-action city-action-primary"
              data-testid="crisis-call-face"
              ref={actionRef}
              disabled={!canFace}
              aria-describedby={canFace ? undefined : gateId}
              onClick={onFace}
            >
              {briefing.actionLabel}
            </button>
            {/*
                  NEVER GATED, AND THAT IS ITS OWN RULING: a learner must always be able to
                  leave. D-CRISIS-10 is that the crisis announces itself and the player chooses
                  when to answer, so the way out cannot depend on having read anything, and
                  `Escape` reaches the same handler.
                */}
            <button
              type="button"
              className="city-action city-action-ghost"
              data-testid="crisis-call-later"
              onClick={onLater}
            >
              Not yet
            </button>
          </div>
        </div>
      </AdvisorSpeech>
    </AdvisorStage>
  );
}
