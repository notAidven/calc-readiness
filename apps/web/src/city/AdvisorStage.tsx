import { type KeyboardEvent, type ReactNode, useRef } from "react";

import {
  type AdvisorDress,
  OruAdvisorCharacter,
  type OruMood,
} from "../lessons/OruAdvisorCharacter";

import "./crisisCall.css";

/**
 * **THE ADVISOR, LARGE, OVER THE ISLAND, IN A GIANT SPEECH BUBBLE — the presentation, held
 * apart from anything he happens to be saying.**
 *
 * This is the register the lead ruled for on 2026-07-31 and has asked for twice since: *"i
 * just want it to be like its literally just the advisor and a giant chat bubble that
 * basically shouts, 'Sire! ....' it shouldn't be contained within a box; it should appear
 * over the actual island screen."* His reason for it, on the winter: during a crisis the
 * advisor takes up a large portion of the screen and **"it actually looks interactive"**, as
 * against an in-text display.
 *
 * ## WHY IT IS A MODULE AND NOT A PATTERN
 *
 * It shipped inside `CrisisCallAdvisor.tsx`, where it was the only caller and belonged. It
 * has a second caller now — `onboarding/OnboardingAdvisor.tsx`, the first-run moments that
 * replaced the reel's caption bar — and the brief for that work was explicit: *"do not invent
 * a second advisor."*
 *
 * Two components with the same twelve lines of JSX is exactly how a second advisor gets
 * invented, one commit at a time: a padding fix on the crisis bubble that the onboarding one
 * does not get, a figure clamp raised on one surface and not the other, and after a month
 * they are two characters who dress alike. So the presentation is ONE implementation with two
 * callers, and *"he is presented the way he is during a crisis"* is true by construction
 * rather than by inspection. `onboarding/advisorIsTheCrisisRegister.test.tsx` is what holds
 * that line where it can fail.
 *
 * ## THE CLASS NAMES ARE STILL `crisis-call-*`, AND THAT IS A DEFERRAL RATHER THAN AN OVERSIGHT
 *
 * `crisisCall.css` is the stylesheet this presentation was designed in and every selector
 * here is its, unchanged. Renaming the prefix to something surface-neutral would touch that
 * sheet plus five test files plus a work log, for no change in what anybody sees, and two of
 * those rules win on SOURCE ORDER rather than on specificity (`.crisis-call-walkthrough`
 * against `.crisis-call-speech__said > *`), so splitting the sheet in the same pass would put
 * a real layout regression behind a cosmetic diff. Read the prefix as provenance: it names
 * where the presentation comes from, which is the whole point of reusing it.
 *
 * ## WHAT THE STAGE DRAWS, WHICH IS NOTHING
 *
 * No panel, no border, no shadow, no scrim. `.crisis-call-stage` is a transparent full-screen
 * layer, so the only things painted are the character and his bubble and everything else on
 * screen is the live island. The layer still TAKES pointer events, because `aria-modal` says
 * the city behind it is inert while he is speaking: what is see-through is the picture, not
 * the reachability.
 *
 * ## ACCESSIBILITY IS THE STAGE'S, NOT THE CALLER'S
 *
 * A real modal: `role="dialog"` + `aria-modal`, labelled by a heading that is present in the
 * accessibility tree and absent from the picture (a speech bubble with no title ribbon would
 * otherwise leave the dialog unnamed), the Tab focus trap `BuildingUnlockedPopup`
 * established, and `Escape` out. It is here rather than in each caller for the same reason
 * the layout is: two copies of a focus trap is one focus trap that will be fixed once.
 *
 * **Initial focus is deliberately NOT here.** Which control should be under the keyboard on
 * the first frame is a question about the caller's own buttons — the crisis opens on "Next"
 * while its gate is shut and on "Face the winter" once it is not — so each caller focuses its
 * own ref in its own effect. What the stage guarantees is that whatever they focus is inside
 * a trap with a way out.
 *
 * ## ⚑ IT CAN STAND DOWN, AND THAT IS THE ONE THING THAT IS NOT MODAL
 *
 * {@link AdvisorStage.modal} defaults to `true` and the crisis never passes it, so the surface
 * the ruling was made about is untouched. Onboarding passes `false` for exactly one moment:
 * the product lead asked that the learner place their first building *on the actual island*,
 * and a dialogue that holds the whole screen inert is the reason the first attempt built a toy
 * board inside the bubble instead. Standing down is what makes the real thing possible.
 *
 * What changes when it is false, and nothing else does: no `aria-modal`, `role="group"` rather
 * than `dialog` (an unmodal dialog over a live page is a lie to a screen reader), and no Tab
 * trap, because the whole point is that Tab reaches the Build menu. `Escape` still leaves, and
 * the layer's pointer-transparency is `firstBuildingTask.css`'s, keyed on the `data` attribute
 * this sets. The caller stays responsible for saying so in words: the moment that stands the
 * stage down is also the moment whose copy tells the learner to go and use the city.
 */

/** Focusable-element selector for the focus trap (the `BuildingUnlockedPopup` set). */
const ADVISOR_FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The trap's ends, with the controls that cannot take focus left out.
 *
 * **A DISABLED BUTTON IS NOT A BOUNDARY, and taking it for one breaks the wrap.** Both advisor
 * surfaces hold "Back" back at the first step rather than removing it, so on the step everybody
 * opens on the FIRST match of the selector above is a control that refuses `.focus()`. Tab off
 * the last control then called `first?.focus()` on it, nothing happened, and focus sat where it
 * was: the dialogue never leaked, it simply stopped cycling.
 *
 * Reproduced before it was fixed, in `onboarding/OnboardingAdvisor.test.tsx`'s *"traps Tab
 * inside the dialogue"*: with the filter removed, Tab off Skip on moment one leaves focus on
 * Skip instead of moving to Back. The crisis dialogue had the same defect for the same reason
 * and is fixed by the same line, which is one of the things extracting the trap bought.
 *
 * `aria-disabled` is filtered too. Nothing here uses it today, and a control that says it is
 * disabled while remaining technically focusable is exactly the case a selector-only version
 * would get wrong next.
 */
function trapBoundary(root: HTMLElement | null): readonly HTMLElement[] {
  return Array.from(root?.querySelectorAll<HTMLElement>(ADVISOR_FOCUSABLE) ?? []).filter(
    (element) =>
      !(element as HTMLElement & { disabled?: boolean }).disabled &&
      element.getAttribute("aria-disabled") !== "true",
  );
}

/**
 * The full-screen layer, the dialog semantics and the way out. Draws nothing itself.
 */
export function AdvisorStage({
  title,
  titleId,
  testId,
  beat,
  modal = true,
  onEscape,
  children,
}: {
  /** The dialogue's accessible name. Announced, never drawn. */
  readonly title: string;
  /** The id `aria-labelledby` points at. Unique per surface, so two can never collide. */
  readonly titleId: string;
  readonly testId: string;
  /**
   * Which beat of a sequence is on screen, as a `data-beat` hook for CSS and for a test that
   * wants to name the frame it is looking at. Omitted by the crisis, which has one beat.
   */
  readonly beat?: string;
  /**
   * Whether the city behind him is inert. See the header: `false` hands the screen back, and
   * onboarding's placement moment is the only caller that asks for it.
   */
  readonly modal?: boolean;
  /** `Escape`. Every advisor surface has a way out, and this is it. */
  readonly onEscape: () => void;
  readonly children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      onEscape();
      return;
    }
    // A stood-down stage traps nothing, or Tab could never leave it for the Build menu the
    // moment is telling the learner to open.
    if (event.key !== "Tab" || !modal) {
      return;
    }
    const focusables = trapBoundary(dialogRef.current);
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

  return (
    /*
      BOTH SUPPRESSIONS BELOW ARE THE SAME BLIND SPOT, and neither is a licence.

      The element carries a REAL role on both branches — `dialog` while it is modal, `group`
      once the placement moment has stood it down — and `aria-modal` is set on exactly the
      branch that is a dialog and left off the one that is not, which is what the second rule
      asks for. What biome cannot do is read a ternary, so it sees a `<div>` with no static
      role and an `aria-modal` it cannot attribute to one.
    */
    // biome-ignore lint/a11y/noStaticElementInteractions: the role is real on both branches, see above
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-modal rides the dialog branch only, see above
    <div
      className="crisis-call-stage"
      role={modal ? "dialog" : "group"}
      aria-modal={modal ? "true" : undefined}
      aria-labelledby={titleId}
      data-beat={beat}
      data-standing-down={modal ? undefined : "true"}
      data-testid={testId}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      {/* THE DIALOGUE'S NAME, AND THE ONLY THING LEFT OF THE TITLE RIBBON. Nothing draws
          it, everything that reads the page still gets it: "The Hard Winter, dialog". */}
      <h2 id={titleId} className="visually-hidden">
        {title}
      </h2>
      {children}
    </div>
  );
}

/**
 * THE FIGURE AND THE BUBBLE: a full-height advisor with a tailed bubble beside his head, the
 * shout at the top of it, and whatever the caller puts underneath.
 *
 * The character is `aria-hidden` and wordless. His NAME rides the byline inside the bubble,
 * so a listener is told who is speaking without the drawing being described, and the words
 * carry every bit of the meaning.
 */
export function AdvisorSpeech({
  mood,
  dress,
  speakerName,
  lead,
  speechTestId,
  saidTestId,
  leadTestId,
  children,
}: {
  readonly mood: OruMood;
  /**
   * THE LIVE ERA'S CLOTHES (D-ET8, D-ET9). This is where he is largest on screen, so it is
   * the surface a wrong costume shows up on first.
   */
  readonly dress: AdvisorDress;
  /** Who is talking, in words. Null suppresses the byline rather than printing an empty one. */
  readonly speakerName: string | null;
  /** The shout. One or two sentences, in character, and it carries no rule. */
  readonly lead: string;
  readonly speechTestId: string;
  readonly saidTestId: string;
  readonly leadTestId: string;
  /** The detail he goes on to give, and the controls. Sits under a hairline, in the bubble. */
  readonly children: ReactNode;
}) {
  return (
    <div className="crisis-call-speech" data-testid={speechTestId}>
      {/* Decorative. See the byline for who is speaking. */}
      <div className="crisis-call-speech__figure" aria-hidden="true">
        <OruAdvisorCharacter mood={mood} dress={dress} />
      </div>

      {/* TWO ELEMENTS, AND THE SECOND IS NOT DECORATION. The bubble draws the shape and
          the tail; `__said` is the scroll box. They cannot be one, because a box with
          `overflow` clips its own pseudo-elements, and the tail hangs outside the bubble
          by design: with the two merged the tail simply never drew. */}
      <div className="crisis-call-speech__bubble">
        <div className="crisis-call-speech__said" data-testid={saidTestId}>
          {speakerName && <p className="crisis-call-byline">{speakerName} says:</p>}
          <p className="crisis-call-lede" data-testid={leadTestId}>
            {lead}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
