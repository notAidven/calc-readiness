import {
  HARD_WINTER,
  type HardWinterState,
  WINTER_TIERS,
  type WinterAction,
  type WinterActionTier,
} from "@cr/game";
import { type ReactElement, useState } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import {
  declarationToRepeat,
  runOutTheWinterAtTier,
  skipRoundAtTier,
} from "./devSkipTiers";
import { correctNeededFor } from "./WinterGrid";

import "./winterDevSkip.css";

/**
 * **DEV: RESOLVE A ROUND AT A CHOSEN TIER, INSTEAD OF ANSWERING ITS THREE QUESTIONS.**
 *
 * The lead asked for *"a button to just like progress through the questions so i can skip past the
 * answering questions in dev"*, because every state he wants to photograph — frost advanced,
 * buildings damaged, ruins standing, the outcome screen — sits behind five rounds of three real
 * practice questions, and he was answering fifteen of them per look.
 *
 * ## IT NAMES A TIER, AND THAT IS THE WHOLE POINT
 *
 * A plain "next" would hand back ONE path through the encounter. The round's score picks an action
 * tier, and the tier is what decides how far the declared action reaches: `strong` wards a 13-cell
 * diamond, `weak` wards one cell, `none` wards nothing and still lights a real fire in the log. So
 * the interesting states are not later, they are DIFFERENT, and a control that says "resolve this
 * as 2 of 3" reaches all four. `devSkipTiers.ts` holds the arithmetic and the argument.
 *
 * Both rows speak the ladder's own vocabulary, score and tier name together, which is deliberate:
 * the player-facing surface deliberately dropped the enum names (a learner reads "2 of 3"), and
 * this is the one screen where naming the rung is the useful thing, because `hard-winter-tuning.ts`
 * is keyed on it.
 *
 * ## TWO ROWS, BECAUSE THEY ANSWER TWO DIFFERENT QUESTIONS
 *
 *  - **Resolve this round** is the design point: one round, one tier, and the encounter carries on
 *    normally, so a reviewer can walk a winter tier by tier and read each outcome as it lands.
 *  - **Run out the winter** is the accelerator: the outcome screen is five rounds away and nothing
 *    about rounds two to five is interesting when what you want is the ending. It repeats the
 *    declaration in hand rather than choosing actions of its own, so the board it hands back is the
 *    reviewer's plan played out and not a strategy this file invented.
 *
 * ## WHAT IT DOES NOT SKIP
 *
 * The ROUND. The declared action resolves, the frost advances, damage lands, the round counter
 * moves, the log gains its line. Only the answering goes. The per-round row deliberately stops at
 * `resolved` and leaves "Let the frost advance" to be pressed, because that button is part of the
 * round rather than part of the answering.
 *
 * ## AND IT GRANTS NO LEARNING EVIDENCE
 *
 * The winter's questions were already unscored — `hardWinterItems.ts` explains at length why, and
 * deliberately does not import the module that could write mastery. This component keeps that
 * property by having the same import list: the engine, one tier helper, the dev gate. A skip that
 * quietly recorded fifteen correct answers would be the first thing in the feature to touch the
 * mastery signal, and `winterDevSkipGrantsNoEvidence.test.tsx` plays a whole winter through here
 * and reads the session back byte-identical, on #325's precedent.
 *
 * ## THE GATE IS THE REPO'S, NOT A NEW ONE
 *
 * {@link isDevPersistenceEnabled} — `!isServerBacked(true)`, which is `VITE_DIAGNOSTIC_API_URL`
 * being unset. Three reasons it is the right existing hatch rather than `?winter` or a flag of its
 * own:
 *
 *  - **A real learner cannot reach it.** `docs/Deployment.md` bakes
 *    `VITE_DIAGNOSTIC_API_URL=/api/diagnostic` into the shipped SPA, so on the deployed product the
 *    gate is false and this renders nothing. The condition is exactly "does this browser talk to
 *    the account service", which is the product's own definition of a real learner.
 *  - **Its answer is synchronous from the first frame.** It asks with `hasCognitoAuth = true`, the
 *    strongest auth state, precisely so it never has to wait for the Cognito identity to resolve —
 *    see the docblock on it. A gate that resolved late would flash this control at a learner for a
 *    few frames, which is the failure mode a dev control can least afford.
 *  - **It errs safe.** A deployment with an endpoint and a signed-out user still reports disabled.
 *
 * `?winter` was the alternative and is the wrong one: the frost, the building damage and the
 * outcome screen are wanted over the 3D island, which is the IN-CITY mount, and a query parameter
 * on a route the reviewer is not on would gate the control out of the surface it exists for.
 */

/** The rungs, strongest first, so the eye lands on the best case as it does on the board. */
const LADDER: readonly WinterActionTier[] = [...WINTER_TIERS].reverse();

/** How a tier reads on a button: the score a player would have got, then the rung's own name. */
function rungLabel(tier: WinterActionTier): string {
  return `${correctNeededFor(tier)} of ${HARD_WINTER.batch_size}`;
}

export interface WinterDevSkipProps {
  readonly winter: HardWinterState;
  /**
   * The declaration chosen but not yet committed, which is what a run-out started from the
   * declaring phase repeats. See {@link declarationToRepeat}.
   */
  readonly pending: WinterAction | null;
  /** Hand the surface the state a skip produced. */
  readonly onSkipped: (next: HardWinterState) => void;
  /**
   * Defaults to {@link isDevPersistenceEnabled}, mirroring `devSessionStore`'s own option of the
   * same name. Tests of the SHIPPED behaviour drive the default through the real environment
   * (`vi.stubEnv`) rather than through this, because "it is behind a flag" and "the flag works"
   * are two claims.
   */
  readonly enabled?: boolean;
}

export function WinterDevSkip({
  winter,
  pending,
  onSkipped,
  enabled = isDevPersistenceEnabled(),
}: WinterDevSkipProps): ReactElement | null {
  /**
   * WHY THE LAST PRESS STOPPED WHERE IT DID, and nothing else.
   *
   * Everything a skip DOES is already narrated by the surface it drove: the resolved panel says
   * what the action bought, the conclusion says how the winter ended. What neither can say is why
   * a run-out gave up after two rounds, because a refused repeat leaves the winter looking exactly
   * as it would if the button had never been pressed.
   */
  const [note, setNote] = useState<string | null>(null);
  /**
   * FOLDED AWAY TO A CHIP, so the corner it covers is recoverable.
   *
   * Open by default, which is the trade the request implies: the lead asked for a press, and a
   * control that has to be unfolded first has put a press in front of the press. Folding exists for
   * the other half of the job — photographing the island the panel is sitting over.
   */
  const [open, setOpen] = useState(true);

  if (!enabled || winter.phase === "ended") {
    return null;
  }

  const repeat = declarationToRepeat(winter, pending);

  function resolveNow(tier: WinterActionTier): void {
    const next = skipRoundAtTier(winter, tier);
    // Identity, because that is how the reducer reports a refusal. A skip that silently did
    // nothing is the one outcome this control must not present as success.
    if (next === winter) {
      setNote(`This round is "${winter.phase}", which has nothing to resolve.`);
      return;
    }
    setNote(`Round ${winter.round} resolved as ${rungLabel(tier)}, the ${tier} tier.`);
    onSkipped(next);
  }

  function runOut(tier: WinterActionTier): void {
    const run = runOutTheWinterAtTier(winter, tier, pending);
    const played = `${run.rounds} round${run.rounds === 1 ? "" : "s"} at ${rungLabel(tier)}`;
    setNote(
      run.stopped === null
        ? `Ran ${played}. The winter is over.`
        : `Ran ${played}, then stopped: ${run.stopped}`,
    );
    if (run.winter !== winter) {
      onSkipped(run.winter);
    }
  }

  return (
    <aside className="hw-skip" aria-labelledby="hw-skip-title" data-testid="hw-dev-skip">
      <p className="hw-skip__eyebrow">Dev only, not on the learner build</p>
      <button
        type="button"
        id="hw-skip-title"
        className="hw-skip__title"
        aria-expanded={open}
        data-testid="hw-dev-skip-fold"
        onClick={() => setOpen(!open)}
      >
        Skip the questions
        <span className="hw-skip__fold" aria-hidden="true">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <>
          <RungRow
            id="resolve"
            /*
             * THE LEGEND SAYS WHY THE ROW IS INERT, rather than leaving four dim buttons to be
             * guessed at. Read off a 1024x580 frame of the declare screen, where the whole
             * control is disabled — there is no batch to skip until an action is committed — and
             * nothing on it said so.
             */
            legend={
              winter.phase === "answering"
                ? `Resolve round ${winter.round} as`
                : `Commit an action to resolve round ${winter.round}`
            }
            // Only the answering phase has a batch to skip. The reducer refuses out of phase
            // anyway; this is so the control does not offer a press that would do nothing.
            disabled={winter.phase !== "answering"}
            describe={(tier) =>
              `Resolve this round as ${rungLabel(tier)} right, the ${tier} tier`
            }
            onPick={resolveNow}
          />
          <RungRow
            id="runout"
            legend={
              repeat === null
                ? "Choose an action to run the winter out"
                : "Run every round left, repeating that action, at"
            }
            disabled={repeat === null}
            describe={(tier) =>
              `Run every remaining round at ${rungLabel(tier)} right, the ${tier} tier`
            }
            onPick={runOut}
          />
          {/* `aria-live`, because the note is the one thing here a screen reader could
              otherwise miss: every other consequence of a press is announced by the panel it
              changed. */}
          <p className="hw-skip__note" aria-live="polite">
            {note ?? "Mastery is untouched either way, and no round has been skipped yet."}
          </p>
        </>
      )}
    </aside>
  );
}

/**
 * One row of the ladder, strongest first.
 *
 * A component rather than two copies of the same four buttons, because the two rows differ only in
 * what a press means: the rungs, their order, their labelling and their tinting are one claim about
 * `HARD_WINTER.tiers` and should have one implementation.
 */
function RungRow({
  id,
  legend,
  disabled,
  describe,
  onPick,
}: {
  readonly id: string;
  readonly legend: string;
  readonly disabled: boolean;
  readonly describe: (tier: WinterActionTier) => string;
  readonly onPick: (tier: WinterActionTier) => void;
}): ReactElement {
  return (
    // A real `<fieldset>`/`<legend>`, which is what four buttons under a shared caption are:
    // it names the group for a screen reader with no ARIA at all. Its default chrome is reset
    // in `winterDevSkip.css`.
    <fieldset className="hw-skip__group">
      <legend className="hw-skip__legend">{legend}</legend>
      <div className="hw-skip__row">
        {LADDER.map((tier) => (
          <button
            key={tier}
            type="button"
            className="hw-skip__rung"
            data-tier={tier}
            data-testid={`hw-dev-skip-${id}-${tier}`}
            disabled={disabled}
            aria-label={describe(tier)}
            onClick={() => onPick(tier)}
          >
            <span className="hw-skip__score">{rungLabel(tier)}</span>
            <span className="hw-skip__tier">{tier}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
