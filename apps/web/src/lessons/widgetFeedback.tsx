/**
 * The two cross-cutting answer mechanics every mini-lesson widget gets for free.
 *
 * They live here, and are mounted once by `LessonVisual`, so a widget author never
 * reimplements either one and every future widget inherits both:
 *
 *  1. SUCCESS. `useWidgetSuccess()` returns a `correct()` callback. Calling it pops a
 *     check-mark badge over the widget, announces "Correct." on a live region, and plays
 *     a short synthesized chime. One implementation owns the animation, the
 *     reduced-motion opt-out, the mute preference and the announcement.
 *
 *  2. REVEAL. `<WidgetReveal>` renders the "Reveal answer" affordance, and the host below
 *     renders the passage that TEACHES the step: the answer plus the reasoning that
 *     produces it. It is free and un-penalised, because a mini-lesson's job is to teach.
 *     Revealing deliberately does NOT fire the success state: nothing was answered.
 *
 *     The first reveal teaches and then STOPS. It does not open the gate; on a widget that
 *     asks one thing it owes the learner a fresh instance of the exercise, because a reveal
 *     that opened the gate let a learner walk a whole slide without once producing a right
 *     answer. A reveal taken
 *     once the instance HAS been redrawn does open the gate, whatever the widget, which is
 *     the rule that keeps the re-ask from becoming a trap for the learner who still cannot
 *     do it.
 *
 *     A fresh instance is not the only thing a reveal can owe. Where the widget is asking
 *     for several answers at once and the passage explained ONE of them, spending the whole
 *     instance threw away every answer the learner had already got right and left them
 *     unable to finish the one part they had just been taught: one misplaced chip on a
 *     three-slot figure ended the round with two slots still empty. So a reveal on a board
 *     with other answers outstanding (`othersRemain`) offers the instance BACK as well,
 *     with everything on it kept and the explained answer still the learner's to produce.
 *     That control cannot open the gate and cannot be the one that does: it never redraws.
 *
 *     The instance is handed back exactly when handing it back CANNOT hand over the gate,
 *     and there are two ways for that to be true. The second is that the gate is already
 *     open (`gateOpen`), which some widgets reach with a reveal still on offer: a board
 *     that opens on every part being called leaves the part the learner got wrong there to
 *     be explained. Nothing can be won by handing that board back, because an open gate
 *     cannot be opened, and every answer it turned on was the learner's own. Before this,
 *     the only way back to a live board was the redraw, and a redraw calls `onReopen`: so
 *     reading an explanation cost the learner the "Next" they had just earned, which
 *     teaches them not to look. Asking for a fresh question still costs it, because that is
 *     choosing to do more work; reading does not.
 *
 *     The redraw waits for a CLICK. It used to fire in the same handler as the reveal,
 *     which redrew the exercise onto new numbers while the passage explaining the old ones
 *     was still going up: the learner read a correct explanation of the problem they had
 *     just left, sitting above a different problem. So the reveal now teaches and stops.
 *     The instance it explains stays on screen, frozen, until the learner asks for the
 *     next one, and only then do the numbers move.
 *
 *     Frozen means `inert`, on the whole widget subtree. This is what keeps the re-ask
 *     MANDATORY rather than merely offered: left live, the spent instance would take the
 *     revealed answer typed back into it and, on a widget's last round, latch the gate
 *     open on it. `WidgetReveal` stands down over the same window, so a second reveal
 *     cannot be spent on the instance the first one just explained either. The only live
 *     control is the one that deals the new instance.
 *
 *     The passage is rendered HERE, by the host, rather than inside the widget, because a
 *     re-ask remounts the widget body and a passage rendered inside that body would be
 *     torn down by the redraw it is explaining.
 *
 *     The end-of-lesson check runs on this same machine (`cfu.tsx` mounts a host of its
 *     own), so the two surfaces cannot drift: one implementation owns "the first reveal
 *     teaches and re-asks, the second lets them through", the freeze that makes the re-ask
 *     mandatory, and where focus lands. What a surface re-asks WITH is its own business, and
 *     the only thing it may say about that here is the WORDING of the control, because a
 *     check with one authored question cannot promise different numbers.
 *
 * This is the LESSON layer only. Practice and mastery are untouched: a revealed practice
 * slot still scores zero (`Mastery_Scoring_Spec` §4, enforced in `@cr/mastery-service`),
 * and nothing here can reach that path.
 *
 * ONLY COMPONENTS ARE EXPORTED FROM THIS FILE. The hooks and predicates that used to sit
 * beside them are in `widgetMechanics.ts` and `lessonSound.ts`, because a module that
 * mixes the two cannot be Fast Refreshed and every widget edit cost a full page reload.
 */

import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  armGestureListener,
  isLessonSoundMuted,
  playCorrectChime,
  playRevealNote,
  setLessonSoundMuted,
  subscribeToLessonSound,
} from "./lessonSound";
import {
  type ReAskWording,
  type RevealReAsk,
  useReAskPending,
  useWidgetFeedback,
  type WidgetFeedbackApi,
  WidgetFeedbackContext,
  WidgetReAskPendingContext,
  WidgetRevealAnchorContext,
} from "./widgetMechanics";

/* ---------------------------------------------------------------------- mute control */

/** The mute preference plus a setter, kept in sync across every mounted toggle. */
function useLessonSoundMuted(): readonly [boolean, (muted: boolean) => void] {
  const [muted, setMuted] = useState(isLessonSoundMuted);
  useEffect(() => {
    const sync = () => setMuted(isLessonSoundMuted());
    const unsubscribe = subscribeToLessonSound(sync);
    sync();
    return unsubscribe;
  }, []);
  return [muted, setLessonSoundMuted] as const;
}

/**
 * The speaker toggle. Lives in the lesson frame's header, next to the title, so the
 * control that silences the lesson is visible from the first question rather than buried.
 */
export function LessonSoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useLessonSoundMuted();
  return (
    <button
      type="button"
      className={className ?? "lesson-sound-toggle"}
      aria-pressed={muted}
      aria-label={muted ? "Unmute lesson sounds" : "Mute lesson sounds"}
      title={muted ? "Unmute lesson sounds" : "Mute lesson sounds"}
      onClick={() => setMuted(!muted)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
        {muted ? (
          <path d="M16 9.5l4.5 5m0-5l-4.5 5" />
        ) : (
          <path d="M15.8 9a4.2 4.2 0 0 1 0 6M18.4 6.8a7.5 7.5 0 0 1 0 10.4" />
        )}
      </svg>
    </button>
  );
}

/* -------------------------------------------------------------------- feedback host */

/** How long the badge stays up. Long enough to read, short enough not to block the next round. */
const BADGE_MS = 1200;

/**
 * What the learner is told out loud when a reveal teaches and then re-asks. It names the
 * button rather than the new numbers, because the numbers do not move until it is pressed —
 * so it is built from whatever this surface's button actually says.
 */
const reAskAnnouncement = (label: string) =>
  `Answer revealed, with the reasoning behind it. The question stays as it is until you choose ${label}.`;

/** And when the reveal is the one that lets them past. */
const REVEAL_ANNOUNCEMENT = "Answer revealed, with the reasoning behind it.";

/**
 * What the learner is told when the reveal explained one answer of several. It leads with
 * what is NOT being taken away, because the version of this that shipped took the whole
 * board and the learner had no way of telling that from the announcement.
 */
const RESUME_ANNOUNCEMENT =
  "Answer revealed, with the reasoning behind it. Nothing you have already answered is lost: choose Keep going on this question to finish the rest of it yourself.";

/**
 * And when it explained a board the learner had already finished. Same shape, different
 * thing at stake: there is nothing left to answer here, so what the sentence has to say is
 * that reading it has not undone the finishing.
 */
const KEPT_ANNOUNCEMENT =
  "Answer revealed, with the reasoning behind it. You have already finished this one and reading it changes nothing: choose Keep this question as it is to go back to the board.";

/**
 * How a widget's re-ask reads, and the default for every surface that does not say otherwise.
 *
 * The label names what pressing it DOES. "Try one like it" left the learner to guess whether
 * the problem in front of them was coming back, and the one thing they need to know before
 * pressing it is that it does not: the shape is kept and the numbers change. The note is what
 * the reveal button adds while that is what the reveal is about to do, because the board
 * changing under the learner is the whole point of the re-ask and the button that causes it
 * has to admit to it: the label alone read as "you are about to be told the answer", and then
 * the question they were working on vanished.
 */
const WIDGET_RE_ASK: ReAskWording = {
  label: "Try again with different numbers",
  note: ", then try a new set",
};

/**
 * And the label on the control that hands a part-answered instance back.
 *
 * Named the same way round: what it does is keep the question the learner is on, so the one
 * thing they need to know before pressing it is that the numbers do NOT move and their own
 * answers are still there. It sits before the re-ask because on a board with work on it, it
 * is the way forward and starting over is the fallback.
 */
const RESUME_LABEL = "Keep going on this question";

/**
 * And on the same control where the board is FINISHED, so there is nothing to keep going on.
 *
 * "Keep going on this question" would be false there, and falsely discouraging: it reads as
 * more work outstanding on a board the learner has already completed. What they need to know
 * is the same thing either way — the numbers do not move — so the label says that instead.
 */
const KEEP_LABEL = "Keep this question as it is";

/**
 * Why the instance may be handed BACK rather than only replaced. Null is "it may not".
 *
 * The two cases share a control and a guarantee (it never redraws and it never touches the
 * gate) and differ only in what the learner is told, so they are one field rather than two
 * booleans that could disagree.
 */
type HandBack =
  /** Other answers are still outstanding, so the learner has something left to produce. */
  | "unfinished"
  /** The gate on this board is already open, so handing it back hands over nothing. */
  | "earned";

/** The teaching a reveal put on screen, held above the widget so a redraw cannot wipe it. */
interface TaughtPassage {
  answer: ReactNode;
  why: ReactNode;
  /**
   * A block of working to stand under the passage, or nothing.
   *
   * The host renders it rather than the surface, and it has to: the surface is `children`,
   * and `children` is inside the stage this host marks `inert` for exactly as long as a
   * reveal is holding an instance. A solution rendered by the surface would therefore be
   * dropped from the accessibility tree over precisely the window it exists to fill. It sits
   * OUTSIDE the passage as well as outside the stage, because the passage is a `<p>` and the
   * working is a list of steps.
   *
   * Every widget passes nothing and renders nothing extra. Only the end-of-lesson check
   * fills it, with the same `WorkedSolution` the practice card shows.
   */
  solution: ReactNode;
  /**
   * True while this reveal is holding the instance frozen behind it, owing the learner a
   * click on one of the controls below.
   */
  holding: boolean;
  /**
   * How the instance may be handed back, read at the moment of the click and never later.
   *
   * That timing is what separates a reveal that explained one of several answers from one
   * that explained the LAST: on the last one nothing remains, and unless the gate is already
   * open, handing the board back there would be handing over the gate.
   */
  handBack: HandBack | null;
}

/**
 * The control the learner should land on once the exercise has been redrawn under them.
 *
 * "Whatever they answer with, first one in the document" is the right target for all of
 * these widgets, because every one of them leads with the thing being answered. The reveal
 * button is excluded on purpose (landing on the way out is not landing on the question),
 * and so is the reset, which appears only on a finished instance.
 */
const FRESH_INSTANCE_FOCUS = [
  ".lesson-interactive input:not([disabled])",
  ".lesson-interactive select:not([disabled])",
  ".lesson-interactive textarea:not([disabled])",
  ".lesson-interactive button:not([disabled]):not(.lesson-interactive__reveal-button):not(.lesson-interactive__reset)",
  // The end-of-lesson check is the one host that is not a `.lesson-interactive` board. It
  // is a single question with a single field, so that field IS the question, and landing on
  // it is landing on what the learner has just been asked again.
  ".lesson-player__cfu input:not([disabled])",
].join(", ");

/**
 * And where focus goes when the board handed back has nothing answerable left on it.
 *
 * A FINISHED instance handed back is the case: every part of it is called, so every control
 * the selector above looks for is disabled, and without this the learner who dismissed the
 * teaching would be left with focus on the document. The reset is the only live control on
 * such a board, and it is the way on, so landing there is landing on what the board offers.
 * It is excluded above for the same reason it is the answer here — it appears only once the
 * instance is finished — so this is a fallback rather than an addition to that list.
 */
const FINISHED_INSTANCE_FOCUS = ".lesson-interactive__reset:not([disabled])";

/**
 * Wraps one widget and owns its answer feedback. `LessonVisual` mounts this around every
 * registered visual, which is what makes both mechanics uniform rather than per-widget.
 *
 * `reAskWording` is how a surface that is not a parameterized widget says what its own re-ask
 * does; see {@link ReAskWording}. `LessonVisual` passes nothing and every widget therefore
 * reads identically.
 */
export function WidgetFeedbackHost({
  children,
  reAskWording = WIDGET_RE_ASK,
  gateOpen = false,
}: {
  children: ReactNode;
  reAskWording?: ReAskWording;
  /**
   * Whether the gate this surface holds is currently open, i.e. the learner has already
   * finished what it turns on.
   *
   * It comes from the SURFACE and not from the widget, because the surface is what owns the
   * gate: a widget calls `onComplete` and `onReopen` and never learns what they did. False
   * is the safe default and the honest one for a mount with no gate at all (the dev slide
   * viewer), where nothing has been earned and so nothing can be lost.
   */
  gateOpen?: boolean;
}) {
  // Bumped per success so repeated correct answers restart the badge rather than merging.
  const [pulse, setPulse] = useState(0);
  // Carried with a nonce so re-announcing the same words still changes the live region.
  const [announcement, setAnnouncement] = useState({ text: "", nonce: 0 });
  const [passage, setPassage] = useState<TaughtPassage | null>(null);
  // Bumped whenever the learner takes the instance on, redrawn or resumed, and read by the
  // effect that puts focus back on the board.
  const [handBacks, setHandBacks] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const teaching = useRef<HTMLParagraphElement | null>(null);
  const reAsk = useRef<RevealReAsk | null>(null);
  /**
   * Whether this widget has actually DEALT the learner a fresh instance yet.
   *
   * A ref as well as state, because `reveal` has to read it inside an event handler. It is
   * set by the re-ask click and by nothing else, which is what keeps the gate where it was:
   * the reveal that lets the learner past is the one taken on a REDRAWN instance, so a
   * learner who keeps being handed the same board back can read every explanation on it
   * without the gate ever opening on a question they have not answered.
   */
  const redrawn = useRef(false);
  /**
   * Whether the reveal button still carries its warning that a reveal will cost the set.
   *
   * State rather than a ref because it is rendered: a ref alone would not re-label the
   * button. It is the same fact as {@link redrawn} seen from the button's side, and it is
   * spent by the first reveal rather than by the redraw, because from that point the learner
   * has watched what a reveal does and does not need telling.
   */
  const [warnOfReAsk, setWarnOfReAsk] = useState(true);
  const passageId = useId();

  /**
   * A reveal has taught a step and the click it owes has not been taken yet. Derived
   * rather than stored: the passage IS the record of the debt, so the two cannot drift
   * into a state where a control is owed with nothing on screen explaining why.
   */
  const reAskPending = passage?.holding === true;

  /**
   * And whether the instance can be handed BACK rather than only replaced, which it can
   * exactly when handing it back cannot hand over the gate. See {@link HandBack}.
   */
  const handBack = passage?.handBack ?? null;

  /**
   * A passage is up, so whatever it is explaining should be marked on the board.
   *
   * Read off the passage and NOT off `reAskPending`, which is the narrower window: the
   * reveal that lets the learner past prints a passage too, and it needs its anchor just as
   * much. Freezing the widget does not suppress this either, because `inert` blocks
   * interaction rather than rendering, and a frozen instance is precisely the one the
   * learner is reading an explanation of.
   */
  const anchorShowing = passage !== null;

  useEffect(() => {
    armGestureListener();
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  // The click took the question back, either by replacing it or by unfreezing the one that
  // was there, and in both cases it unmounted the button that was pressed. So focus goes to
  // the board rather than falling to the document. Keyed on `handBacks`, which those clicks
  // bump and the reveal itself does not: moving focus into an answer box at reveal time
  // would have pointed the learner at the question the passage above was explaining.
  useEffect(() => {
    if (handBacks === 0) {
      return;
    }
    const board = frame.current;
    const landing =
      board?.querySelector<HTMLElement>(FRESH_INSTANCE_FOCUS) ??
      board?.querySelector<HTMLElement>(FINISHED_INSTANCE_FOCUS);
    landing?.focus();
  }, [handBacks]);

  // Revealing unmounts the button that was clicked and freezes the widget behind it, so
  // without this focus would fall to the document. It lands on the teaching rather than on
  // the re-ask button on purpose: a focused button is an Enter target, and a learner who
  // pressed Enter to submit their last wrong answer would advance past the explanation
  // they just asked for without reading a word of it.
  useEffect(() => {
    if (!reAskPending) {
      return;
    }
    teaching.current?.focus();
  }, [reAskPending]);

  const api = useMemo<WidgetFeedbackApi>(
    () => ({
      correct: () => {
        setPulse((n) => n + 1);
        setAnnouncement((prev) => ({ text: "Correct.", nonce: prev.nonce + 1 }));
        // The teaching has landed, so retire it. A reveal's passage deliberately outlives
        // the redraw it explains, but it was outliving everything: the explanation of a
        // board that is no longer on screen sat above the new one indefinitely, describing
        // terms the learner could no longer see. Revealing never fires this, by contract,
        // so a reveal cannot wipe its own passage.
        setPassage(null);
        playCorrectChime();
        if (timer.current !== null) {
          clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => setPulse(0), BADGE_MS);
      },
      reveal: ({ answer, why, solution = null, resolve, othersRemain }) => {
        const binding = reAsk.current;
        // The shared layer hears exactly two verdicts, `correct` and this one, so this is
        // where a step that did not go the learner's way sounds. A soft plucked note and
        // deliberately not a buzzer: the reveal is the learner asking to be taught, and a
        // sound that scolded them for asking would teach them not to.
        playRevealNote();
        // BEFORE ANY REDRAW: teach it, and stop. The gate stays shut, and the instance is
        // held on screen frozen so that the passage and the exercise it explains are the
        // same problem for as long as they are both up. The widget's own reveal is
        // deliberately not run either: it would fill in and close out an answer the learner
        // is about to be asked for again.
        //
        // What the learner is then owed depends on what is left of the board and on what
        // they have already earned on it. Where taking the instance back cannot hand over
        // the gate they may take it back, and the gate is untouched by that: nothing was
        // resolved and nothing was released. Where it could, the instance is spent and the
        // only way on is the fresh one, exactly as before.
        if (!redrawn.current && binding !== null) {
          // The label's warning has been spent: from here on the learner has seen for
          // themselves what a reveal does, and on a board that can be handed back it does
          // not cost the set at all, so promising one would be the wrong half of the truth.
          setWarnOfReAsk(false);
          const owed: HandBack | null =
            othersRemain === true ? "unfinished" : gateOpen ? "earned" : null;
          setPassage({ answer, why, solution, holding: true, handBack: owed });
          setAnnouncement((prev) => ({
            text:
              owed === "unfinished"
                ? RESUME_ANNOUNCEMENT
                : owed === "earned"
                  ? KEPT_ANNOUNCEMENT
                  : reAskAnnouncement(reAskWording.label),
            nonce: prev.nonce + 1,
          }));
          return;
        }
        // A REVEAL ON A REDRAWN INSTANCE: teach it and let them through. Opening the gate
        // here rather than leaving it to the widget is what makes the re-ask safe to hand to
        // every widget: a learner who cannot do the new one either is never sent round again.
        setPassage({ answer, why, solution, holding: false, handBack: null });
        setAnnouncement((prev) => ({ text: REVEAL_ANNOUNCEMENT, nonce: prev.nonce + 1 }));
        resolve();
        binding?.release();
      },
      bindReAsk: (binding) => {
        reAsk.current = binding;
      },
      // The button may only promise a fresh set where one is actually coming, and on a board
      // whose gate is already open the learner can read the passage and keep it. Promising
      // otherwise is the deterrent in words: it tells a learner who has just finished the
      // board that looking at the working will take the board away.
      willReAsk: warnOfReAsk && !gateOpen,
      reAskNote: reAskWording.note,
      passageId,
    }),
    [passageId, warnOfReAsk, gateOpen, reAskWording],
  );

  /**
   * Spend the re-ask: dismiss the teaching, deal the new instance, send focus to it.
   *
   * The passage goes because it is an explanation of the problem being replaced, and
   * keeping it beside the new one is the defect this whole control exists to fix. Nothing
   * is taken away unasked: the learner reads it for as long as they like and then presses
   * this. If the widget has somehow unbound, the passage stays put rather than clearing
   * with no redraw behind it, which would leave the learner with a shut gate and no
   * question.
   */
  function takeTheReAsk() {
    const binding = reAsk.current;
    if (binding === null) {
      return;
    }
    redrawn.current = true;
    setPassage(null);
    binding.reAsk();
    setHandBacks((n) => n + 1);
  }

  /**
   * Take the instance BACK: dismiss the teaching, lift the freeze, move nothing else.
   *
   * The widget is not told, and that is the whole design. Its state was never spent, so the
   * answers already on the board stand and the one the passage named is still unanswered:
   * the fill that showed it lives on the same flag as the freeze, so it clears in this very
   * commit and the blank goes back to being blank. Every answer this instance gates on is
   * still the learner's to produce, and this control never touches `release`.
   *
   * It never touches `reAsk` either, which is the whole of why it is safe on a board that is
   * already finished: no redraw means no `onReopen`, so the gate the learner earned is where
   * they left it.
   */
  function resumeTheInstance() {
    setPassage(null);
    setHandBacks((n) => n + 1);
  }

  return (
    <WidgetFeedbackContext.Provider value={api}>
      <WidgetReAskPendingContext.Provider value={reAskPending}>
        <WidgetRevealAnchorContext.Provider value={anchorShowing}>
          <div
            ref={frame}
            className="lesson-feedback-host"
            data-correct-pulse={pulse > 0 ? "on" : "off"}
          >
            {/* `display: contents`, so freezing the widget costs no layout change: the
              wrapper exists only to carry `inert` over the whole subtree. */}
            <div className="lesson-feedback-host__stage" inert={reAskPending}>
              {children}
            </div>
            {pulse > 0 && (
              <span key={pulse} className="lesson-feedback-badge">
                {/* Decoration: the live region below is what announces the success. */}
                <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                  <circle className="lesson-feedback-badge__disc" cx={16} cy={16} r={14} />
                  <path
                    className="lesson-feedback-badge__tick"
                    d="M9.5 16.5l4.4 4.4 8.6-9.4"
                  />
                </svg>
              </span>
            )}
            {passage !== null && (
              <p
                ref={teaching}
                // Focusable only programmatically: the effect above lands the learner here
                // when the teaching opens, and it is not an extra stop on the way through.
                tabIndex={-1}
                className="lesson-interactive__reveal"
                id={passageId}
                role="status"
                aria-live="polite"
              >
                {/* "The answer is <x>" stays, and stays even now that the blank is filled
                  in for the learner. A filled blank is a purely visual signal, so this
                  sentence is the only thing carrying the answer to anyone not perceiving
                  it. What went is the sentence that USED to close the passage, "Ready for
                  one like it?": it sat directly above a button that says the same thing,
                  so the passage ended by narrating the control underneath it. */}
                <strong>Answer revealed.</strong> The answer is{" "}
                <span className="lesson-interactive__reveal-answer">{passage.answer}</span>
                <span className="lesson-interactive__reveal-stop">.</span> {passage.why}
              </p>
            )}
            {passage?.solution}
            {reAskPending && (
              /* The ways forward, in one row so that neither reads as the only one. A
                 reveal that offered nothing but "start over" is what took a half-finished
                 board off a learner who had two slots left to name. */
              <div className="lesson-interactive__reveal-controls">
                {handBack !== null && (
                  <button
                    type="button"
                    className="lesson-interactive__resume-button"
                    onClick={resumeTheInstance}
                  >
                    {handBack === "unfinished" ? RESUME_LABEL : KEEP_LABEL}
                  </button>
                )}
                <button
                  type="button"
                  className="lesson-interactive__reask-button"
                  onClick={takeTheReAsk}
                >
                  {reAskWording.label}
                </button>
              </div>
            )}
            <span
              className="visually-hidden lesson-feedback-announce"
              role="status"
              aria-live="polite"
            >
              {announcement.text}
            </span>
          </div>
        </WidgetRevealAnchorContext.Provider>
      </WidgetReAskPendingContext.Provider>
    </WidgetFeedbackContext.Provider>
  );
}

/* --------------------------------------------------------------------------- reveal */

export interface WidgetRevealProps {
  /**
   * Whether the affordance is offered yet. Widgets pass `true` once the learner has
   * actually tried the step, so this unblocks a stuck learner without being a first-click
   * bypass of the teaching.
   */
  available: boolean;
  /** True once revealed; the widget owns this so it can also unlock its own next step. */
  revealed: boolean;
  /** The answer itself, e.g. `<InlineMath latex="x^{-4}" />`. */
  answer: ReactNode;
  /**
   * WHY that is the answer, in a sentence or two. This is the whole point of the
   * mechanic: a reveal that only prints the answer teaches nothing.
   */
  why: ReactNode;
  /**
   * Optional block of working, rendered by the host beneath the passage.
   *
   * Handed to the host rather than rendered here for the reason the host documents on
   * `TaughtPassage.solution`: anything a surface renders lives inside the stage the host
   * freezes while a reveal is holding, and working the learner cannot reach is not working.
   */
  solution?: ReactNode;
  /**
   * The widget's own reveal: fill in the answer and unlock the next step. It is run by
   * the reveal that lets the learner past, and NOT by the one that re-asks, whose whole
   * job is to replace the instance this would have written into.
   */
  onReveal: () => void;
  /** Overrides the button label where "Reveal answer" reads wrong for the step. */
  label?: string;
  /**
   * True when the instance is asking for OTHER answers besides this one.
   *
   * Pass it from wherever the widget already knows what is left: the unnamed slots, the
   * unjoined pairs, the rows still open. It is what lets the learner keep a part-answered
   * board instead of losing it to a reveal on one part of it, and passing it on a reveal
   * that explains the last outstanding answer would hand over the gate with it, so it is a
   * live predicate and never a constant `true`.
   */
  othersRemain?: boolean;
}

/**
 * The lesson-side "Reveal answer" affordance.
 *
 * Authors supply `answer` and `why`; they cannot supply an answer with no explanation,
 * because `why` is required. Both are handed straight to the host, which prints them in
 * the one fixed shape every reveal in every lesson reads in, and which decides whether
 * this reveal teaches and re-asks or teaches and opens the gate.
 *
 * They have to be the answer to the question ON SCREEN, not to the one just revealed: the
 * host reads them at the moment of the click, before anything has moved. `othersRemain` is
 * read then too, and for the same reason: what is left of the board is what decides whether
 * the board can be handed back.
 */
export function WidgetReveal({
  available,
  revealed,
  answer,
  why,
  solution,
  onReveal,
  label = "Reveal answer",
  othersRemain,
}: WidgetRevealProps) {
  const feedback = useWidgetFeedback();
  const reAskPending = useReAskPending();

  // A reveal already taught this instance and is waiting on the click it owes. Offering
  // another one here would be spent on the very instance the passage above is explaining,
  // before the learner has been back to it: they take one of the controls first.
  if (revealed || !available || reAskPending) {
    return null;
  }

  return (
    <button
      type="button"
      className="lesson-interactive__reveal-button"
      aria-controls={feedback.passageId || undefined}
      onClick={() =>
        feedback.reveal({ answer, why, solution, resolve: onReveal, othersRemain })
      }
    >
      {feedback.willReAsk ? `${label}${feedback.reAskNote}` : label}
    </button>
  );
}
