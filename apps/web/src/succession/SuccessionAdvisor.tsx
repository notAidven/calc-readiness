import { type ReactElement, useEffect, useRef, useState } from "react";

import { AdvisorSpeech, AdvisorStage } from "../city/AdvisorStage";
import {
  type SuccessionBriefing,
  successionBriefing as buildBriefing,
} from "./successionBriefing";

import "../city/crisisCall.css";

/**
 * **THE SUCCESSION'S ADVISOR: era four's crisis explained by the character, in the register
 * the lead ruled for.**
 *
 * The play-test verdict on this crisis was *"need a lot more instructions in the advisor pop up
 * style as before"* and *"nothing is really clear"*. Both are the same gap: every word of
 * explanation the Succession had lived in a dense right-hand panel of ward rows and counts,
 * which assumes the player already knows what a district, a claimant, a hold, a strength and a
 * suspension are — and which is the *"one wall of text"* the winter's card was rewritten out of
 * on 2026-07-31.
 *
 * ## IT IS THE WINTER'S PRESENTATION AND NOT A SECOND ONE LIKE IT
 *
 * `AdvisorStage.tsx` owns the layer, the figure, the bubble, the byline, the shout, the focus
 * trap and `Escape`, and it exists as a module precisely so a third caller does not become a
 * third advisor. `onboarding/advisorIsTheCrisisRegister.test.tsx` derives every surface in this
 * register from the sources and requires each one to be driven and to render the same skeleton
 * element for element, so this file is in that population by construction rather than by
 * intention. Nothing here writes a `crisis-call-*` element of its own.
 *
 * What is genuinely this crisis's, and so is here rather than in the stage, is the pagination,
 * the gate and the two replies.
 *
 * ## WHY THE WALKTHROUGH IS FIVE SLIDES AND NOT ONE PANEL
 *
 * The lead's own ruling: *"those sub-slides should be small and isolated to one section, to
 * prevent users from being overloaded with information."* Exactly one slide is MOUNTED at a
 * time — an accordion or a scrolled column would satisfy the layout and not the ask — and the
 * split is by idea, so no slide needs another to be true.
 *
 * Era four needs the fifth slide that era one does not, and the reason is the conceptual load
 * `SuccessionRoute` records: **a Succession district has no position.** A frost is a thing you
 * watch move across ground you know; an allegiance tipping on a global comparison is not
 * available to be looked at, so the words have to carry it.
 *
 * ## AND THE WAY IN IS GATED ON HAVING READ IT
 *
 * The same ruling era one's card carries — *"dont let the user click face the winter until they
 * go through all the tool tips"* — for the same reason and with the same escape: the way OUT is
 * never gated, because a learner must always be able to leave, and `Escape` reaches it.
 *
 * **The gate is per mount rather than remembered**, which is where this differs from the
 * winter's, and it is a deliberate difference rather than an oversight. `hasReadCrisisBriefing`
 * stores one flag for the crisis briefing, and era one's card is what wrote it: a learner who
 * walked the winter's four slides last week would arrive here with era four's five slides
 * already counted as read, having never seen one of them. One flag for two different crises is
 * a bug waiting on whoever adds the third, and `?succession` is a dev route opened cold, so
 * there is no repeat visit for the flag to spare.
 */

export interface SuccessionAdvisorProps {
  /** Defaults to the authored briefing. Injected by tests and by the frame harness. */
  readonly briefing?: SuccessionBriefing;
  /** Take the dialogue away and leave the player on the board it was describing. */
  readonly onBegin: () => void;
  /** The way out, which is never gated. `Escape` reaches the same handler. */
  readonly onLater: () => void;
}

export function SuccessionAdvisor({
  briefing = buildBriefing(),
  onBegin,
  onLater,
}: SuccessionAdvisorProps): ReactElement {
  const actionRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = "sx-advisor-title";
  const walkthroughId = "sx-advisor-walkthrough";
  const slideHeadingId = "sx-advisor-slide-heading";
  const gateId = "sx-advisor-gate";

  const slides = briefing.slides;
  const lastStep = slides.length - 1;
  const [step, setStep] = useState(0);
  const [read, setRead] = useState(slides.length === 0);
  const slide = slides[step];

  useEffect(() => {
    // FOCUS THE CONTROL THE PLAYER CAN ACTUALLY USE, which is era one's finding: with the
    // primary action disabled, focusing it lands focus on nothing, so a gated dialogue opens on
    // "Next" and Enter walks the slides. Either way it is operable from the keyboard on the
    // first frame, which is the property that had to survive the gate.
    (slides.length === 0 ? actionRef : nextRef).current?.focus();
  }, [slides.length]);

  const goToStep = (next: number): void => {
    const clamped = Math.max(0, Math.min(lastStep, next));
    setStep(clamped);
    // Reaching the end IS having read it, and it is the only thing that is. Pressing the
    // primary action never was: a player who presses Enter on the first frame has read nothing.
    if (clamped === lastStep) {
      setRead(true);
    }
  };

  return (
    <AdvisorStage
      title={briefing.title}
      titleId={titleId}
      testId="sx-advisor"
      beat={slide?.id}
      onEscape={onLater}
    >
      <AdvisorSpeech
        mood="talk"
        dress={briefing.advisorDress}
        speakerName={briefing.advisorName}
        lead={briefing.lead}
        speechTestId="sx-advisor-speech"
        saidTestId="sx-advisor-said"
        leadTestId="sx-advisor-lead"
      >
        {slide && (
          <div className="crisis-call-walkthrough" id={walkthroughId}>
            {/* The live region is the wrapper, which persists; the section inside it is
                keyed, so Next replaces a subtree inside a region that was already there and
                a screen reader is told what changed without focus having to move. */}
            <div aria-live="polite">
              <section
                key={slide.id}
                className="crisis-call-section crisis-call-slide"
                aria-labelledby={slideHeadingId}
                data-slide={slide.id}
                data-testid="sx-advisor-slide"
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
                data-testid="sx-advisor-back"
                disabled={step === 0}
                onClick={() => goToStep(step - 1)}
              >
                Back
              </button>
              {/* Decoration on top of the sentence above. Fill AND size differ, and the
                  reader is told the step in words either way. */}
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
                data-testid="sx-advisor-next"
                ref={nextRef}
                disabled={step === lastStep}
                onClick={() => goToStep(step + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="crisis-call-tray">
          {/* WHILE THE GATE IS SHUT THIS ROW SAYS WHY, AND IT REPLACES THE CLOSING LINE
              RATHER THAN JOINING IT. The closing line invites a press the dialogue is
              refusing, so the two cannot both be true at once, and a third item on this row
              costs a line the short window has nothing to give. */}
          {read ? (
            <p className="crisis-call-closing">{briefing.closing}</p>
          ) : (
            <p className="crisis-call-gate" id={gateId} data-testid="sx-advisor-gate">
              {`Read all ${slides.length} steps first.`}
            </p>
          )}
          <div className="crisis-call-actions">
            <button
              type="button"
              className="city-action city-action-primary"
              data-testid="sx-advisor-begin"
              ref={actionRef}
              disabled={!read}
              aria-describedby={read ? undefined : gateId}
              onClick={onBegin}
            >
              Look at the board
            </button>
            {/* NEVER GATED, AND THAT IS ITS OWN RULING: a learner must always be able to
                leave, so the way out cannot depend on having read anything. */}
            <button
              type="button"
              className="city-action city-action-ghost"
              data-testid="sx-advisor-later"
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

export default SuccessionAdvisor;
