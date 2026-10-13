import { type FormEvent, useCallback, useEffect, useId, useState } from "react";

import { cfuKeypad, cfuPlaceholder, cfuPreview } from "./answerFormat";
import { gradeCfuAnswer } from "./cfuChecker";
import { cfuAsk, cfuInstances } from "./cfuVariants";
import { MathAnswerColumn } from "./MathAnswerColumn";
import { LessonProse, LessonProseInline } from "./prose";
import type { LessonCfuSpec } from "./types";
import { UnreadableAnswerNote } from "./UnreadableAnswerNote";
import { WorkedSolution } from "./WorkedSolution";
import { WidgetFeedbackHost, WidgetReveal } from "./widgetFeedback";
import {
  type ReAskWording,
  useReAskPending,
  useRevealReAsk,
  useWidgetSuccess,
} from "./widgetMechanics";

/**
 * What an ANSWERED check came to. A reveal never reports through here.
 *
 * `recalled` is a correct answer produced AFTER the reveal had printed it, and it is a
 * separate outcome rather than a flag on `correct` so that no caller can congratulate a
 * learner for reciting an answer by ignoring an argument. It is the same reasoning that
 * split `onRelease` out of `onResult`, applied one step later in the same walk: the type
 * makes every caller decide, and the compiler names the ones that have not.
 */
export type CfuOutcome =
  /** Right, with the answer never on screen. Independent work. */
  | "correct"
  /** Right, but the reveal had already shown it. Recall, not independent work. */
  | "recalled"
  /** Wrong. */
  | "incorrect";

type Status = "idle" | "correct" | "recalled" | "incorrect";

/**
 * What this surface's re-ask does, in the two states a pack can be in.
 *
 * A widget re-asks by redrawing itself on the next parameter set. A check used to have no
 * parameters to redraw on, so its re-ask was THAT QUESTION AGAIN with the answer taken off
 * the screen, and #224's copy said so in as many words. A pack that names a generator
 * (`cfu.variants`) now genuinely does hand over a different instance, so the same sentences
 * would be false on it. BOTH STATES EXIST AND WILL FOR A WHILE: five packs are converted and
 * the rest are not, so the wording is chosen per pack from what the resolver actually
 * returned, never from the declaration and never from a hardcoded assumption about the
 * rollout.
 *
 * What neither state may say is ", then answer it yourself", which is the one thing a reveal
 * takes away: the answer has just been printed. The converted wording promises a DIFFERENT
 * question rather than fresh numbers, because a composite check can rotate a word rather
 * than a number (LF.1 re-asks a rising line where the learner was shown a falling one) and
 * "different numbers" would be the wrong promise there.
 */
const CFU_RE_ASK_SAME: ReAskWording = {
  label: "Try the question again",
  note: ", then the same question again",
};

const CFU_RE_ASK_FRESH: ReAskWording = {
  label: "Try a different question",
  note: ", then a different question to work",
};

/**
 * What the re-asked question says about itself, on the question rather than in the announcement.
 *
 * The learner who takes the re-ask sees a button and then a question with an empty box, and
 * on an unconverted pack that question is identical to the one they just left. Read literally
 * that is exactly what was offered, and read as the widgets' re-ask it looks like a redraw
 * that failed. Nothing on screen distinguished the two, so the surface says which it is at
 * the point the learner is looking.
 *
 * Two sentences because there are two facts to state. On an unconverted pack the honest
 * version of the exercise is that the answer is off the screen and writing it back is worth
 * doing even though it is not the same as working it out. On a converted one the answer is
 * not merely hidden, it is no longer the answer, and the learner needs to know that before
 * they type what they remember.
 */
const SAME_QUESTION_NOTE =
  "Same question again, with the answer off the screen. Write it out yourself.";

const NEW_QUESTION_NOTE = "A different question of the same kind. Work this one out.";

/**
 * The verdict on an answer the reveal had already given away.
 *
 * It is not "Correct! Nice work.", and the difference is the whole point: the learner read
 * this answer a moment ago, so praising it as their own is the kind of praise that teaches
 * them the praise means nothing. It is not a rebuke either, because writing a taught answer
 * back is worth doing. It says what happened and where the real thing is.
 */
const RECALLED_FEEDBACK =
  "That matches the answer you were shown. The practice set is where you work one from scratch.";

/** What the card needs, and what it reports back. Shared by the host and the card itself. */
interface LessonCfuProps {
  cfu: LessonCfuSpec;
  nodeId: string;
  /** The verdict on an ANSWERED question. A reveal never reports through here. */
  onResult?: (outcome: CfuOutcome) => void;
  /**
   * The gate opened WITHOUT a correct answer, because the learner revealed a second time.
   * Kept separate from `onResult` so a caller does not congratulate them for it.
   */
  onRelease?: () => void;
  /**
   * Whether the learner has already spent this check's one hint.
   *
   * The hint is voiced by the advisor rather than by this card, so the card cannot observe
   * it and the parent has to say. It gates the reveal because the two are a sequence and not
   * a menu: the hint is the help that leaves the learner something to do, and a reveal
   * offered beside it is the shorter of two paths to the same screen. Defaults to `false`,
   * which withholds the reveal, and that is the right default for a surface that has not
   * been wired: an unreachable way out is recoverable, and one reachable before the help it
   * is meant to follow is the thing being fixed.
   */
  hintTaken?: boolean;
}

/**
 * End-of-lesson check-your-understanding card. Form-independent (`cfu.check`) answers
 * are graded by the shared D1 answer checker (equivalent numeric forms pass), on the
 * re-asked question as much as on the authored one, but a numeric answer must be a single
 * evaluated number - the raw expression is rejected so "Evaluate/compute" prompts require
 * the computed result. Form-dependent answers fall back to an exact match against
 * `accepted`. The decision itself is `gradeCfuAnswer` in `cfuChecker.ts`, which owns why
 * those are the paths. Tries are unlimited. The hint is owned by the advisor NPC (parent),
 * not rendered here. Teaching only: no mastery write.
 *
 * ## The reveal, on the widgets' own machine so the two surfaces cannot diverge
 *
 * THIS CHECK IS THE GATE ON FINISHING THE LESSON: `cfuPassedOnce` in `AdvisorLesson` is the
 * only thing that puts "Finish lesson" on offer, and that is the only thing that fires the
 * Foundation to Construction transition. Until this reveal existed the gate had no way out at
 * all - unlimited tries, one hint voiced by the advisor, and nothing else - so a learner who
 * could not answer the check could not finish the lesson and the building never broke ground.
 *
 * The mechanic is not reimplemented here. The card mounts a `WidgetFeedbackHost` and lends it
 * `useRevealReAsk`, so all four parts of the shape `widgetFeedback.tsx` was forced into come
 * with it rather than being reinvented:
 *
 *  1. The re-ask waits for a click. Redrawing in the reveal handler put a correct
 *     explanation of the problem the learner had just left above a different problem.
 *  2. The spent instance is FROZEN, not merely stale, and the reveal affordance stands
 *     down over the same window. Left live, the instance takes the revealed answer typed
 *     back into it and closes itself out, which turns a mandatory re-ask into an offered
 *     one. It is `inert` on the host's stage plus `useReAskPending()`, and BOTH matter more
 *     here than on a widget: the form below has its own Enter handler, so a live spent
 *     instance would take the revealed answer on a keypress.
 *  3. The second reveal opens the gate unconditionally, so the re-ask can never trap. It is
 *     keyed on the RE-ASK HAVING BEEN TAKEN, not on the reveal having happened, so reading
 *     the explanation twice without going back to the question does not let anyone past.
 *  4. Focus goes to the teaching, NOT to the re-ask button, and no focus moves until the
 *     click. THIS FILE HAS A HAZARD THE WIDGETS DO NOT: the answer box below lives in a
 *     real `<form>` with a `type="submit"` button. A re-ask control added inside that form
 *     without an explicit `type="button"` becomes an implicit-submit target, so Enter in
 *     the answer box would deal a new question instead of checking the answer. The widgets
 *     are safe from this only because they have no form at all. Both of this card's own
 *     reveal controls therefore sit OUTSIDE the form, and the host's are outside the card.
 *
 * What is left for this file is the two things the machine cannot know: what the re-ask asks
 * (see {@link CFU_RE_ASK_SAME} and {@link CFU_RE_ASK_FRESH}) and where the teaching comes from
 * (the instance's own hint, which every pack already writes as the reasoning that produces the
 * answer without stating it, and which a computed instance takes from its template's
 * progressive hints, so no pack has to author anything new either way).
 *
 * ## What the re-ask serves, which is now two different things
 *
 * A widget re-asks by redrawing itself on the next parameter set. A check had no parameters, so
 * at #224 its re-ask handed the SAME question back and everything the learner read had to say
 * so. A pack may now name a generator instead (`cfu.variants`, resolved by `cfuVariants.ts`),
 * and then the re-ask genuinely does hand over a different question with a different answer.
 *
 * Both states are live and will be for a while, so nothing here assumes either. The instance in
 * hand comes from `cfuAsk`, the wording comes from the length of the resolved list, and a pack
 * that declares a generator which drew nothing behaves exactly as an unconverted one: it reads
 * the list, never the declaration.
 *
 * ## And what a post-reveal answer is worth, which is this file's alone
 *
 * A widget's re-ask hands over a DIFFERENT instance, so an answer to it is work. An unconverted
 * check hands the same question back, so an answer to it may be work or may be the string the
 * passage printed thirty seconds earlier, and from the grader the two are identical. Until this
 * was separated the surface treated them as identical too: the chime, the badge and "Correct!
 * Nice work." all fired on a copied answer, and the advisor said "you applied what we just
 * covered" over the top of it.
 *
 * So the card remembers which instances have had their answer ON SCREEN (`seenAnswers`), and a
 * correct answer to one of those is reported as `recalled`. It still opens the gate, because a
 * second reveal opens it anyway and trapping the learner is the defect this whole mechanic
 * exists to fix, and it still clears the question. What it does not do is claim they produced
 * it. The gate is untouched in both directions: nothing new opens it, and nothing that opened
 * it before has stopped.
 *
 * `recalled` is per-INSTANCE and not a latch, which is what lets a converted pack report a
 * learner's work on a fresh question as their own. On a converted pack it is close to
 * unreachable in practice -- the reveal freezes the answer box, so the only way to answer after
 * seeing an answer is to take the re-ask, which moves the question on -- and it stays because
 * the 21 unconverted packs reach it on every reveal.
 *
 * The reveal reaches NO evidence path. It reports `onRelease` rather than `onResult`, so a
 * revealed check is never a graded verdict, and nothing on this surface writes a response:
 * `hints_used` and the `revealed` flag that zeroes a practice slot belong to `@cr/lesson` and
 * `@cr/mastery-service`, which the practice session reaches and this card does not.
 * `revealScope.test.ts` holds that open.
 */
export function LessonCfu(props: LessonCfuProps) {
  // Read off the RESOLVED list rather than off `cfu.variants`, so a declaration whose
  // generator drew nothing usable cannot leave the learner reading a promise of a different
  // question in front of the same one.
  const serves = cfuInstances(props.cfu).length > 1;
  return (
    <WidgetFeedbackHost reAskWording={serves ? CFU_RE_ASK_FRESH : CFU_RE_ASK_SAME}>
      <CfuCard {...props} />
    </WidgetFeedbackHost>
  );
}

/**
 * The card itself, mounted INSIDE the feedback host so it can spend the shared reveal
 * machine. Split out for that reason alone: `useRevealReAsk` and `useWidgetSuccess` read the
 * host's context, which a component rendering the host cannot yet see.
 */
function CfuCard({ cfu, nodeId, onResult, onRelease, hintTaken = false }: LessonCfuProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [attempts, setAttempts] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  /** Held apart from `note`, which is a MISS note the card paints as a verdict. */
  const [unreadable, setUnreadable] = useState<string | null>(null);
  /**
   * The learner is through: they answered it, or a second reveal let them past. Either way
   * there is nothing left to be stuck on, so the way out is withdrawn. One flag rather than
   * two states, because nothing reads WHICH of the two it was - the advisor is told that
   * separately, by `onResult` or by `onRelease`.
   */
  const [settled, setSettled] = useState(false);
  /**
   * The questions this check can ask, the pack's own first. One entry unless the pack names a
   * generator; see `cfuVariants.ts` for what the further entries are and what they guarantee.
   */
  const instances = cfuInstances(cfu);
  /**
   * Which one is in front of the learner. Advanced by the re-ask below, modulo the list, which
   * is `useWidgetVariants`'s own rule: a widget advances `(index + 1) % count` and wraps rather
   * than running out. The wrap is not reachable here today, because `WidgetFeedbackHost` grants
   * exactly one re-ask per card (`redrawn.current` latches, and every later reveal opens the
   * gate instead), so the packs declare the two instances that can actually be served. Written
   * as the shared rule anyway: the alternative is an off-by-one waiting for the day the reveal
   * budget changes.
   */
  const [index, setIndex] = useState(0);
  const asked = cfuAsk(cfu, index);
  /**
   * The instances whose answer has been PRINTED, by index.
   *
   * A set rather than a latch or a flag cleared on advance, and only one of those two reasons
   * is exercised today. The load-bearing one: it has to be PER-INSTANCE, because once the
   * re-ask hands over a different question, a latch would report a learner's genuine work on
   * that question as recall. The defensive one: it also has to persist per instance, because
   * the cycle wraps, and a flag cleared on advance would forget on the way round and
   * congratulate a learner for writing back an answer it had shown them. That second case is
   * unreachable while the host grants one re-ask, and costs a `Set` to be right about anyway.
   *
   * Filled from BOTH of the reveal's two shapes, because the host splits them and each one
   * alone leaves a hole:
   *
   *  - the reveal that HOLDS the instance runs no `resolve()` at all, so it is caught by the
   *    effect below on the shared "a passage is holding this instance" flag;
   *  - the reveal that RELEASES runs `resolve()` and sets nothing holding, so it is caught by
   *    `onReveal`. It used to be caught by neither. That left a learner who revealed a second
   *    time able to type the string still on their screen and be told "Correct! Nice work.",
   *    which is precisely the credit-for-recall this set exists to withhold.
   */
  const [seenAnswers, setSeenAnswers] = useState<ReadonlySet<number>>(() => new Set());
  const revealHolding = useReAskPending();
  const markAnswerSeen = useCallback((shown: number) => {
    setSeenAnswers((seen) => (seen.has(shown) ? seen : new Set(seen).add(shown)));
  }, []);
  useEffect(() => {
    if (revealHolding) {
      markAnswerSeen(index);
    }
  }, [revealHolding, index, markAnswerSeen]);
  /**
   * The answer to the question in hand has been on screen, so nothing the learner types
   * against it can be told apart from copying it.
   *
   * On a converted pack this goes false again when the re-ask hands over a different
   * instance, and it is `cfuVariants.ts`'s disjointness constraint that makes that sound: no
   * spelling accepted by the new instance is accepted by the old one, so the string the
   * passage printed cannot be what the learner is about to type. Without that constraint a
   * rotation that preserved the answer would clear this flag and hand back #224's defect.
   */
  const answerSeen = seenAnswers.has(index);
  /**
   * The learner has been round this check once and is being asked again.
   *
   * True only while the re-asked question is still unanswered, because that is exactly when
   * they need telling WHICH of the two things they were offered is on screen.
   */
  const reAsked = seenAnswers.size > 0 && !revealHolding && !settled;
  const inputId = useId();
  const feedbackId = useId();
  const success = useWidgetSuccess();

  /**
   * The re-ask: the next question in the cycle, with the learner's wrong answer and the
   * verdict on it cleared away. On a pack with no generator the cycle is one long, so the
   * next question is the same question, which is what this did before and still does there.
   * Named for the shared binding rather than for what it does here, because
   * `revealReAsk.test.ts` matches the binding below on its literal text.
   *
   * The attempt count goes back to zero with it, so the reveal has to be earned again on the
   * question as re-asked: the learner cannot reveal, take the re-ask and immediately reveal a
   * second time without going near the question in between.
   */
  const total = instances.length;
  const onRestart = useCallback(() => {
    setValue("");
    setStatus("idle");
    setNote(null);
    setAttempts(0);
    setIndex((current) => (total > 0 ? (current + 1) % total : 0));
  }, [total]);

  /**
   * The second reveal, which lets them past. Nobody is sent round twice, whatever they can or
   * cannot do. Reported separately from a correct answer, and it never fires the success
   * state: nothing was answered.
   */
  const onSolved = useCallback(() => {
    setSettled(true);
    onRelease?.();
  }, [onRelease]);

  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  // Both derived by the SHARED helpers, off one dispatch, so this card and the two
  // practice surfaces cannot give a learner different syntax advice for the same node —
  // and so the line under the field cannot name a notation the line inside it does not.
  //
  // Read off the instance in hand rather than the pack, so a computed question advertises the
  // notation ITS answer is written in. The dispatch keys on `accepted[0]`, and a generator
  // that drew a whole-number slope where the authored one was a fraction would otherwise
  // leave the field promising a notation the answer does not use.
  const placeholder = cfuPlaceholder(cfu.check, asked.accepted);
  const keys = cfuKeypad(cfu.check, asked.accepted);
  const preview = cfuPreview(cfu.check, asked.accepted);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The grading decision itself lives in `cfuChecker.ts`, beside the item versions it reads,
    // so that the question the learner is on and the question a sweep grades cannot drift
    // apart: `cfuVariantGrading.test.ts` calls this same function rather than a copy of it.
    const {
      correct: isCorrect,
      note: verdictNote,
      unreadable,
    } = gradeCfuAnswer({
      nodeId,
      cfu,
      index,
      value,
    });
    /*
     * THE READER COULD NOT READ IT, so the card says so and stops. It does not set `status`, which
     * is what paints the miss and what `feedback` reads to say *"Not quite"* — a verdict on an
     * answer nobody graded, and the harshest instance of this defect in the app.
     *
     * THE ATTEMPT IS STILL COUNTED, and that is a deliberate reversal of the first draft. Not
     * counting it reads better — an attempt the grader refused to read is not one the learner
     * spent — and it strands the learner it is meant to protect: `attempts` is what opens the
     * reveal (`available={hintTaken && attempts > 0 && !settled}`), so a learner whose every try
     * comes back unreadable would have no way out of the question at all.
     * `cfuGradingParity.test.tsx` is what said so, going red on three nodes whose own revealed
     * spelling the grammar cannot read. Pressing Check IS an attempt; what it is not is a miss.
     */
    setAttempts((count) => count + 1);
    if (unreadable) {
      setUnreadable(unreadable);
      return;
    }
    setUnreadable(null);
    setNote(verdictNote);
    const outcome: CfuOutcome = !isCorrect
      ? "incorrect"
      : answerSeen
        ? "recalled"
        : "correct";
    setStatus(outcome);
    if (isCorrect) {
      // The shared success state, for the same reason the reveal is shared: one
      // implementation owns the badge, the chime and the announcement, so the two surfaces
      // cannot tell a learner they were right in two different ways. It also retires any
      // teaching still on screen, which a revealed answer must never do - and cannot, because
      // revealing never routes through here.
      //
      // Withheld on a RECALLED answer, which is the whole of what that outcome buys: the
      // chime, the badge and the "Correct." announcement are this product's way of saying
      // "you did that", and the learner read this answer a moment ago. The gate is not
      // withheld with it - `settled` is set either way - because a second reveal opens it
      // regardless and being sent round again is the trap the mechanic exists to prevent.
      if (outcome === "correct") {
        success();
      }
      setSettled(true);
    }
    onResult?.(outcome);
  }

  const feedback =
    status === "correct"
      ? "Correct! Nice work."
      : status === "recalled"
        ? RECALLED_FEEDBACK
        : status === "incorrect"
          ? (note ?? "Not quite. Try again, or reveal the hint.")
          : null;

  return (
    <section className="lesson-player__cfu" aria-labelledby={inputId}>
      <span className="micro-label">Check your understanding</span>
      <label id={inputId} htmlFor={`${inputId}-field`}>
        <LessonProse markdown={asked.prompt} />
      </label>

      {/*
        Above the answer box and below the question, because it is about the question rather
        than about the answer. See {@link SAME_QUESTION_NOTE}: without it, taking the re-ask
        puts a question back on screen with nothing to distinguish "this is what you were
        offered" from "the redraw did not work" -- and on a converted pack, nothing to tell
        the learner that the answer they were shown has stopped being the answer.
      */}
      {reAsked && (
        <p className="lesson-player__re-ask-note">
          {total > 1 ? NEW_QUESTION_NOTE : SAME_QUESTION_NOTE}
        </p>
      )}

      <form className="lesson-player__row" onSubmit={handleSubmit}>
        {/* `keys` is read for its LENGTH: a non-empty notation row is what earns this field
            its persistent notation line. `preview` is the separate question of whether the
            reading is drawn back. See `MathAnswerColumn`. */}
        <MathAnswerColumn keys={keys} preview={preview} value={value} hint={placeholder}>
          <input
            id={`${inputId}-field`}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={status === "incorrect"}
            aria-describedby={feedback ? feedbackId : undefined}
            autoComplete="off"
            // A mobile keyboard capitalizes the first character of an empty text field,
            // and a capitalized variable reaches the checker as an unknown symbol. Same
            // reason autocorrect and the spellchecker are off over `6*sqrt(2)/5`.
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={placeholder}
          />
        </MathAnswerColumn>
        <button type="submit">Check</button>
      </form>

      <UnreadableAnswerNote note={unreadable} />

      {feedback && (
        <p
          id={feedbackId}
          className="lesson-player__feedback"
          data-status={status}
          aria-live="polite"
        >
          {feedback}
          {status === "incorrect" && attempts > 1 ? ` (${attempts} tries)` : ""}
        </p>
      )}

      {/*
        OUTSIDE the form above, so no keypress in the answer box can reach it (see part 4 of
        the note on this component). Offered only after a real attempt, exactly as on a
        widget: this is the way out for a learner who is stuck, not a first-click bypass of
        the question.

        The answer is printed as the learner would TYPE it - the pack's canonical accepted
        form - rather than as typeset math, because the re-ask asks them to produce that
        string and because the accepted list is itself the statement of what notation reads.

        Gated on the HINT as well as on an attempt. The two are a sequence: one hint, then
        the answer if that was not enough. Offered beside the hint instead, the reveal is
        simply the faster way to the same screen, and the help written to leave the learner
        something to do goes unread.

        The working goes to the host through `solution` rather than being rendered here, and
        that is not a style choice: this card is the host's `children`, and the host marks
        them `inert` for exactly as long as the first reveal holds. See
        `TaughtPassage.solution`.

        `onReveal` is the widget's own fill-in, and there is nothing here to fill: the answer
        the passage prints IS the answer, and pre-filling the box would put it inside the
        frozen region, where a screen reader is told to ignore it. What it does instead is
        the bookkeeping the holding reveal's effect cannot reach; see `seenAnswers`.
      */}
      <WidgetReveal
        available={hintTaken && attempts > 0 && !settled}
        revealed={settled}
        answer={asked.answerKey}
        why={<LessonProseInline markdown={asked.hint} />}
        solution={
          <WorkedSolution
            templateId={asked.templateId}
            params={asked.params}
            steps={asked.workedSolution}
          />
        }
        onReveal={() => markAnswerSeen(index)}
      />
    </section>
  );
}
