/**
 * The non-visual half of the shared widget mechanics: the feedback channel a widget fires
 * a correct answer or a reveal down, and the variant machinery behind every "start over".
 *
 * It is split from `widgetFeedback.tsx` for the reason set out at the top of
 * `lessonSound.ts`: that file exports React components and is therefore a Fast Refresh
 * boundary, and a boundary may not also export plain functions. Components there, hooks
 * and predicates here.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* ------------------------------------------------------------------- feedback context */

/** One reveal, as the widget hands it to the shared layer. */
export interface RevealPassage {
  /** The answer to the question the learner has in front of them right now. */
  answer: ReactNode;
  /** The reasoning that produces it. Required: an answer on its own teaches nothing. */
  why: ReactNode;
  /**
   * Optional working to stand beneath the passage, as a block.
   *
   * `why` is a phrase inside a `<p>`; this is for a surface whose explanation is a sequence
   * of steps rather than a sentence. It is optional because it is not the mechanic: a reveal
   * still owes `why`, and a surface that supplies steps and no reasoning has not been let
   * off. The end-of-lesson check is the only surface that fills it today.
   */
  solution?: ReactNode;
  /**
   * The widget's own reveal: fill the step in and unlock it. Run only on the reveal that
   * lets the learner past, never on the one that re-asks, because the instance it would
   * be filling in is about to be replaced.
   */
  resolve: () => void;
  /**
   * True when the instance is asking for OTHER answers besides the one being explained.
   *
   * A three-slot figure is not one judgement, and on a board like that a reveal that spent
   * the whole instance took away every slot the learner had already placed correctly and
   * left them the one part they had just been taught to do. So a widget that still has
   * something else outstanding says so here, and the shared layer offers the learner the
   * instance BACK as well as a fresh one.
   *
   * It is read at the moment of the click, and it has to be: on the reveal that explains the
   * LAST outstanding answer it is false, and then handing the instance back would be handing
   * over the gate, so the instance is spent exactly as it always was.
   *
   * Unless the gate is already OPEN, which is the shared layer's business rather than the
   * widget's and is why this flag is not the whole of the question it answers. A board that
   * has been finished has nothing to hand over, so it is handed back whatever this says; see
   * `gateOpen` on `WidgetFeedbackHost`.
   */
  othersRemain?: boolean;
}

/**
 * A widget's redraw and its gate, handed up so the reveal can drive both.
 *
 * Both callbacks already exist in every widget: `reAsk` is the "start over" that deals the
 * next parameter set and closes the gate behind it, and `release` is the latch the widget
 * opens when the learner finishes. The reveal spends them rather than growing its own.
 */
export interface RevealReAsk {
  reAsk: () => void;
  release: () => void;
}

/**
 * What the re-ask DOES on a given surface, in the two places the learner reads it.
 *
 * A host-level setting rather than part of {@link RevealReAsk}, and deliberately so. The
 * binding is the instance's redraw and gate, it is re-lent on every remount, and
 * `revealReAsk.test.ts` matches on its literal text; wording is neither per-instance nor
 * per-render, so it belongs to the surface that mounts the host and is read straight from
 * the prop. That also keeps it clear of the mistake that stranded the first attempt at this:
 * a sentence read AFTER `reAsk()` had run cannot exist now that the redraw waits for a
 * click, whereas a constant the surface declares up front is true at every point in the
 * window.
 *
 * Every widget takes the default, because a widget redraws itself on new parameters and the
 * default says exactly that. The end-of-lesson check has no parameters to redraw on, so
 * "with different numbers" would be a promise its re-ask cannot keep.
 */
export interface ReAskWording {
  /** The label on the control that spends the re-ask. */
  label: string;
  /** What "Reveal answer" adds when this reveal is the one that will re-ask. */
  note: string;
}

export interface WidgetFeedbackApi {
  /** One correct answer. Pops the badge, announces it, plays the tone. */
  correct: () => void;
  /** One revealed step. Teaches it, then either re-asks or lets the learner past. */
  reveal: (passage: RevealPassage) => void;
  /** Hands the shared layer the CURRENT instance's redraw and gate. */
  bindReAsk: (binding: RevealReAsk | null) => void;
  /**
   * Whether the NEXT reveal will redraw the exercise rather than open the gate.
   *
   * Only the host knows this, and the button has to say it: a learner who presses a
   * button labelled "Reveal answer" and watches the whole board change under them was
   * not warned by anything on screen. `WidgetReveal` spends it on the label.
   */
  willReAsk: boolean;
  /** What the reveal button adds while {@link WidgetFeedbackApi.willReAsk} is true. */
  reAskNote: string;
  /** The element id of the passage a reveal opens, for the button's `aria-controls`. */
  passageId: string;
}

const NOOP: WidgetFeedbackApi = {
  correct: () => {},
  // Bare of a host there is nowhere to print the teaching, so at least do not strand the
  // learner on the step: fall back to the plain unlock.
  reveal: (passage) => passage.resolve(),
  bindReAsk: () => {},
  // Nothing redraws without a host, so the button promises nothing it cannot do.
  willReAsk: false,
  reAskNote: "",
  passageId: "",
};

export const WidgetFeedbackContext = createContext<WidgetFeedbackApi>(NOOP);

/**
 * True between the reveal that holds the instance still and the click that takes it on.
 *
 * Named for the re-ask because that was once the only click it could be waiting for. On a
 * board with several answers on it the reveal explains one of them and the learner may take
 * the instance BACK instead, so the window now closes on either control; what it means
 * throughout is that a passage is holding the instance and nothing on the board may be
 * answered until the learner chooses.
 *
 * Carried on its own context rather than on `WidgetFeedbackApi` so the api object keeps
 * a stable identity: it is the dependency of `useRevealReAsk`'s bind effect, and churning
 * it would unbind and rebind every widget's redraw on a flag change.
 */
export const WidgetReAskPendingContext = createContext(false);

/**
 * True for as long as a reveal passage is on screen, whichever reveal put it there.
 *
 * Deliberately NOT the same flag as `WidgetReAskPendingContext`. That one is true only over
 * the re-ask window and is what makes controls stand down; this one is true over BOTH
 * reveals, because the passage needs its anchor on screen every time it is on screen, and a
 * highlight wired to the re-ask flag would vanish on exactly the reveal that lets the
 * learner past.
 */
export const WidgetRevealAnchorContext = createContext(false);

/** The attribute the shared reveal layer highlights. Nothing else may set it. */
export interface RevealAnchorProps {
  "data-reveal-anchor"?: "on";
}

/**
 * Marks the element a reveal passage is TALKING ABOUT, so the teaching has something on the
 * board to point at.
 *
 * A passage reading "x to the 4, all raised to the 3 joins x to the 12" against an unmarked
 * board leaves the learner to work out which of three rows that sentence was about, which is
 * the one thing the passage was supposed to save them. So the highlight is not the widget's
 * to design: the shared layer owns WHEN it shows and what it looks like, and each
 * interaction kind only says WHICH of its elements the current passage is about.
 *
 * Returns a callback rather than the attribute itself because the subject is usually decided
 * inside a `map` over rows or pairs, where a hook cannot be called.
 *
 *     const anchor = useRevealAnchor();
 *     ...
 *     <button {...anchor(pair.id === explaining)} />
 */
export function useRevealAnchor(): (subject: boolean) => RevealAnchorProps {
  const showing = useContext(WidgetRevealAnchorContext);
  return useCallback(
    (subject: boolean) => (showing && subject ? { "data-reveal-anchor": "on" } : {}),
    [showing],
  );
}

/* --------------------------------------------------------------------- reveal fill */

/** The attribute the shared reveal layer puts on a blank it filled. Nothing else may set it. */
export interface RevealFillProps {
  "data-reveal-given"?: "on";
}

/** A value-holding control showing the answer it was handed instead of the learner's own. */
export interface RevealFilledEntry extends RevealFillProps {
  value: string | number;
  readOnly: true;
}

/** What `useRevealFill` hands a widget. See the hook for why it is shaped like this. */
export interface RevealFill {
  /** True while the answer has been handed over and the instance is frozen behind it. */
  readonly given: boolean;
  /**
   * Props for a control that HOLDS a value: a text or number box, or a dial. Spread AFTER
   * the widget's own `value`, because overriding it is the entire point.
   */
  entry: (answer: string | number) => RevealFilledEntry | RevealFillProps;
  /**
   * Marks a blank the shared layer filled, for the surfaces that render their answer as
   * children rather than carrying it in a `value`: a drop slot, a chip, a worked line.
   */
  mark: (subject: boolean) => RevealFillProps;
}

const NOT_GIVEN: RevealFillProps = {};
const MARKED: RevealFillProps = { "data-reveal-given": "on" };

/**
 * Fills the blank in with the answer the reveal just stated, for as long as it is stated.
 *
 * A reveal used to print "the answer is $x^{7}$" directly above a box still holding the
 * learner's $3$, or above an empty dashed slot. The passage and the board disagreed, and
 * the learner was left to carry the answer from one to the other by eye.
 *
 * Written the same way round as `useRevealAnchor`, and for the same reason: the SHARED layer
 * decides WHEN a blank is filled, and each widget only says WHICH of its blanks and WITH
 * WHAT. A widget that owned the timing would have to reimplement the two-reveal rule.
 *
 * Two properties do the safety work, and both come from reading the window off
 * `WidgetReAskPendingContext` rather than storing anything:
 *
 *  - The fill is DISPLAY ONLY. It exists only over the window where the stage carries
 *    `inert`, so the value on screen can never be submitted; it is something to read.
 *  - The fill CANNOT OUTLIVE that window. It is not the widget's state, so there is nothing
 *    to reset: the flag goes false in the same commit as the re-ask, which is also the
 *    commit that remounts the widget body on its new `nonce`. This matters more than the
 *    fill does. `inert` releases at exactly that moment, so a fill that latched would hand
 *    the learner a fresh question with the previous answer sitting in the box, submittable.
 *    It matters on the OTHER control for the same reason and without the remount to help:
 *    taking a part-answered instance back clears the flag and with it every filled blank, so
 *    the answer the passage named goes back to being the learner's to produce.
 */
export function useRevealFill(): RevealFill {
  const given = useContext(WidgetReAskPendingContext);
  return useMemo(
    () => ({
      given,
      entry: (answer) => (given ? { value: answer, readOnly: true, ...MARKED } : NOT_GIVEN),
      mark: (subject) => (given && subject ? MARKED : NOT_GIVEN),
    }),
    [given],
  );
}

/**
 * The callback a widget fires on each correct answer. Safe to call outside a host (it is
 * then a no-op), so a widget can still be rendered bare in a test or a storybook.
 */
export function useWidgetSuccess(): () => void {
  return useContext(WidgetFeedbackContext).correct;
}

/**
 * Whether the learner has been taught a step and still owes the click that follows it.
 * Read by `WidgetReveal`, which stands down while it is true: the instance on screen is
 * the one the passage is explaining, and a second reveal taken against it would be spent on
 * a board the learner has not been back to since.
 */
export function useReAskPending(): boolean {
  return useContext(WidgetReAskPendingContext);
}

/** The channel a reveal runs down. Internal to `WidgetReveal`. */
export function useWidgetFeedback(): WidgetFeedbackApi {
  return useContext(WidgetFeedbackContext);
}

/**
 * Lends the shared reveal machine this instance's redraw and gate.
 *
 * Every widget body calls this once, with the two callbacks it already takes from its
 * variant control. The teach-then-re-ask bookkeeping itself lives in `WidgetFeedbackHost`
 * and NOT here, because a re-ask remounts the body: state kept in the body would be wiped
 * by the very redraw it is meant to be counting.
 */
export function useRevealReAsk(binding: RevealReAsk): void {
  const api = useContext(WidgetFeedbackContext);
  const latest = useRef(binding);
  useEffect(() => {
    latest.current = binding;
  });
  useEffect(() => {
    api.bindReAsk({
      reAsk: () => latest.current.reAsk(),
      release: () => latest.current.release(),
    });
    return () => api.bindReAsk(null);
  }, [api]);
}

/**
 * Bookkeeping for the common widget shape: the learner may reveal only after a real
 * attempt, and revealing must not later be mistaken for a correct answer.
 */
export function useRevealGate(): {
  attempted: boolean;
  revealed: boolean;
  markAttempt: () => void;
  markRevealed: () => void;
  reset: () => void;
} {
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return {
    attempted,
    revealed,
    markAttempt: useCallback(() => setAttempted(true), []),
    markRevealed: useCallback(() => setRevealed(true), []),
    reset: useCallback(() => {
      setAttempted(false);
      setRevealed(false);
    }, []),
  };
}

/* --------------------------------------------------------------------------- variants */

/**
 * What the lesson frame hands every interactive visual.
 *
 * `onReopen` is the counterpart to `onComplete`: it takes the gate back off the latch. A
 * widget calls it when the learner asks for another go, because the instance they are
 * about to be given is not the one they already answered.
 */
export interface LessonWidgetProps {
  /** Called once the learner has produced the value this widget gates on. */
  onComplete?: () => void;
  /** Called when the widget hands out a fresh instance, so the gate closes again. */
  onReopen?: () => void;
  /** Walkthroughs call this while a step animation auto-advances, so the player can hold back navigation. */
  onPlayingChange?: (playing: boolean) => void;
}

export interface WidgetVariantControl {
  /** Which parameter set the body should draw its numbers from. */
  index: number;
  /** Remount key. Changes on every restart, so a body never has to clear its own state. */
  nonce: number;
  /** Latch the gate open. Idempotent, so an effect may call it on every render. */
  latch: () => void;
  /** Hand out the NEXT parameter set and close the gate behind it. */
  restart: () => void;
}

/**
 * The mechanism behind "start over", "new set" and "try again", in one place.
 *
 * A reset that deals the learner back the numbers they have just answered asks them to
 * retype an answer they already know, and a reset that leaves the gate latched lets them
 * walk past it without answering anything at all. So a restart does two things together:
 * it advances to the next parameter set, and it calls `onReopen` so the lesson's Next
 * button disappears until the new instance is finished.
 *
 * The `nonce` is meant to be spent as the body's React `key`. Remounting is what clears
 * the body's state, which is both less code than a hand-written `reset()` per widget and
 * impossible to get half right by forgetting one `useState`.
 */
export function useWidgetVariants(
  count: number,
  { onComplete, onReopen }: LessonWidgetProps,
): WidgetVariantControl {
  const [state, setState] = useState({ index: 0, nonce: 0 });
  const latched = useRef(false);

  // Held in refs so `latch` and `restart` keep a stable identity even though the lesson
  // frame passes fresh inline callbacks on every render.
  const completeRef = useRef(onComplete);
  const reopenRef = useRef(onReopen);
  useEffect(() => {
    completeRef.current = onComplete;
    reopenRef.current = onReopen;
  });

  const latch = useCallback(() => {
    if (latched.current) {
      return;
    }
    latched.current = true;
    completeRef.current?.();
  }, []);

  const restart = useCallback(() => {
    if (latched.current) {
      latched.current = false;
      reopenRef.current?.();
    }
    setState((prev) => ({
      index: count > 0 ? (prev.index + 1) % count : 0,
      nonce: prev.nonce + 1,
    }));
  }, [count]);

  return { index: state.index, nonce: state.nonce, latch, restart };
}
