import type { EraId } from "@cr/skill-graph";
import { type ReactElement, useState } from "react";

import { isDevPersistenceEnabled } from "../../devPersistence/devSession";
import { type OnboardingMomentId, onboardingBriefingFor } from "./onboardingScript";

import "./onboardingDevReplay.css";

/**
 * **DEV: PLAY THE ONBOARDING ADVISOR AGAIN, FROM THE BEGINNING OR FROM ANY ONE MOMENT.**
 *
 * First-run onboarding runs exactly once per browser by design, which makes it the hardest
 * surface in the game to look at twice: every reading of it, every screenshot of it and every
 * rehearsal of the demo otherwise costs a trip through devtools to delete two keys. This is
 * that trip, as a button.
 *
 * ## IT IS `WinterDevSkip.tsx`'s SHAPE, DELIBERATELY
 *
 * Same gate, same eyebrow, same fold, same instrument look, same `aria-live` note saying what
 * the last press did. That is not imitation for its own sake: a reviewer glancing at a
 * screenshot has to be able to tell in one look which panels are the product and which are
 * scaffolding, and a second dev control drawn a second way costs them that. `winterDevSkip.css`
 * makes the argument at length and this sheet is its sibling.
 *
 * ## TWO ROWS, BECAUSE THEY ANSWER TWO DIFFERENT QUESTIONS
 *
 *  - **From the beginning** is the request: forget everything and run the sequence as a brand
 *    new learner gets it. This is the one anybody demoing needs.
 *  - **Open at** is the working control: jump straight to one moment. The interesting states of
 *    a sequence are not LATER, they are DIFFERENT, and pressing Next twice to reach moment
 *    three is the tax `WinterDevSkip` was written to remove one surface over. It is also what
 *    makes a per-moment frame cheap enough to actually take, which is why the shot list has one
 *    frame per moment rather than one frame of moment one.
 *
 * ## WHAT IT DOES NOT DO
 *
 * It grants nothing and it writes no city. Its whole effect is on the two `cr.onboarding.*`
 * keys, which hold "have you been shown this" and "where did you get to" and nothing else, so
 * there is no path from this control to mastery, to a placement or to a wallet. Its import list
 * is the evidence: the moment table, the dev gate, and React.
 *
 * ## THE GATE IS THE REPO'S, NOT A NEW ONE
 *
 * {@link isDevPersistenceEnabled}, which is `VITE_DIAGNOSTIC_API_URL` being unset, exactly as
 * `WinterDevSkip` uses it. Read that file's docblock for why it is the right existing hatch:
 * a real learner cannot reach it, its answer is synchronous from the first frame so this never
 * flashes at somebody, and it errs safe. `?onboarding` was the alternative and is wrong for the
 * same reason `?winter` was: the thing wanted is the advisor over the live island, which is the
 * in-city mount, and a query parameter on a route nobody is on would gate the control out of
 * the surface it exists for.
 */
export function OnboardingDevReplay({
  eraId,
  onReplay,
  enabled = isDevPersistenceEnabled(),
}: {
  /** The era whose moments are listed, so the rows name what this city would actually say. */
  readonly eraId: EraId;
  /** Run the sequence again, opening on this moment index. */
  readonly onReplay: (fromStep: number) => void;
  /**
   * Defaults to {@link isDevPersistenceEnabled}, mirroring `WinterDevSkipProps`. Tests of the
   * SHIPPED gate drive the default through the real environment (`vi.stubEnv`) rather than
   * through this, because "it is behind a flag" and "the flag works" are two claims.
   */
  readonly enabled?: boolean;
}): ReactElement | null {
  /**
   * WHAT THE LAST PRESS DID, and nothing else.
   *
   * The advisor coming up is its own evidence that a press worked, so this exists for the one
   * thing the surface cannot say: which moment was asked for. Pressing "moment three" and
   * getting moment three looks identical to a control that ignored the argument.
   */
  const [note, setNote] = useState<string | null>(null);
  /**
   * FOLDED AWAY TO A CHIP, so the corner it covers is recoverable. Open by default, on
   * `WinterDevSkip`'s reasoning: a control that has to be unfolded has put a press in front of
   * the press. Folding is for the other half of the job, which is photographing the surface the
   * panel is sitting over.
   */
  const [open, setOpen] = useState(true);

  if (!enabled) {
    return null;
  }

  const moments = onboardingBriefingFor(eraId).moments;

  function replayFrom(step: number, label: string): void {
    setNote(label);
    onReplay(step);
  }

  return (
    <aside
      className="ob-replay"
      aria-labelledby="ob-replay-title"
      data-testid="ob-dev-replay"
    >
      <p className="ob-replay__eyebrow">Dev only, not on the learner build</p>
      <button
        type="button"
        id="ob-replay-title"
        className="ob-replay__title"
        aria-expanded={open}
        data-testid="ob-dev-replay-fold"
        onClick={() => setOpen(!open)}
      >
        Replay onboarding
        <span className="ob-replay__fold" aria-hidden="true">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="ob-replay__restart"
            data-testid="ob-dev-replay-restart"
            onClick={() =>
              replayFrom(0, `Restarted at step 1 of ${moments.length}, as a new learner.`)
            }
          >
            From the beginning
          </button>

          {/* A real `<fieldset>`/`<legend>`, which is what a captioned set of buttons is: it
              names the group for a screen reader with no ARIA at all. Its default chrome is
              reset in the stylesheet. */}
          <fieldset className="ob-replay__group">
            <legend className="ob-replay__legend">Open at</legend>
            <div className="ob-replay__row">
              {moments.map((moment, index) => (
                <button
                  key={moment.id}
                  type="button"
                  className="ob-replay__moment"
                  data-moment={moment.id}
                  data-testid={`ob-dev-replay-${moment.id}`}
                  /* THE MOMENT'S ID, NOT ITS TITLE, and it is the id this panel already
                     prints on the button. A title is a human phrase like "Civic buildings",
                     and putting one in an accessible name here made this DEV panel answer
                     `getByRole("button", { name: /Buildings/ })` in twenty test files that
                     were reaching for the city's building controls. The id is what a developer
                     addresses a moment by in any case. */
                  aria-label={`Replay onboarding, step ${index + 1}: ${moment.id}`}
                  onClick={() =>
                    replayFrom(
                      index,
                      `Opened at step ${index + 1} of ${moments.length}: ${moment.title}.`,
                    )
                  }
                >
                  <span className="ob-replay__step">{index + 1}</span>
                  <span className="ob-replay__moment-id">{moment.id}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* `aria-live`, because the note is the one thing here a screen reader could
              otherwise miss: the advisor announces its own heading, which is what a press
              produced, and never which press produced it. */}
          <p className="ob-replay__note" aria-live="polite">
            {note ?? `${moments.length} moments authored. Nothing has been replayed yet.`}
          </p>
        </>
      )}
    </aside>
  );
}

/** The moment ids this control lists, for a caller that wants to name one. */
export type { OnboardingMomentId };
