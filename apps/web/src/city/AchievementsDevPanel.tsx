import { type ReactElement, useState } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { ACHIEVEMENTS } from "./achievements";

/**
 * **DEV: EARN ONE WITHOUT PLAYING TO IT, AND FORGET THEM ALL.**
 *
 * `WinterDevSkip.tsx`'s shape and the request behind it, one feature over: the lead asked
 * for a button *"to just like progress through the questions so i can skip past the
 * answering questions in dev"*, because every state he wanted to photograph sat behind
 * fifteen real practice questions. The same is true here and worse — the recovery
 * achievement sits behind a whole winter, a carry-back and a mastered skill — and a
 * reviewer cannot judge a moment they cannot reach.
 *
 * So: one button per row to fire it, and one to forget the set. Both write the same
 * `cr.achievement.*` keys the real earning path writes, so what a reviewer photographs is
 * the shipped moment and the shipped list rather than a preview of them.
 *
 * ## FIRING ONE CLOSES THE CARD, DELIBERATELY
 *
 * The moment renders over the ISLAND, and this control renders inside the list, which is a
 * modal on top of the island. A fire that left the card open would put the panel in front
 * of the one thing the press exists to show. Forgetting does NOT close, because the thing
 * that press exists to show is this list going back to unearned.
 *
 * ## WHAT IT DOES NOT FAKE
 *
 * **The condition.** It writes the earned flag and nothing else: it cannot move the damage
 * mint, the era or a mastery, so a fired achievement is a fired achievement and the city
 * around it is untouched. That is the honest half and the limited half at once, and it is
 * why the reachability of each row is established by CONSTRUCTING its state in
 * `achievements.test.ts` rather than by this control agreeing that a flag can be set.
 *
 * ## THE GATE IS THE REPO'S, AND THERE IS NO PROP THAT CAN OVERRIDE IT
 *
 * {@link isDevPersistenceEnabled} — `!isServerBacked(true)`, which is
 * `VITE_DIAGNOSTIC_API_URL` being unset. `docs/Deployment.md` bakes that variable into the
 * shipped SPA, so on the deployed product the gate is false and this renders nothing, and
 * its answer is synchronous from the first frame so it cannot flash at a learner.
 *
 * **And it takes no `enabled` prop.** `test/crisisDevSkipOverride.test.ts` exists because
 * an optional `enabled` prop is a control whose visibility a call site can switch on, and
 * every behavioural test of the default stays green while that happens; #492 spent a cycle
 * removing one. A control with no such prop cannot be mounted switched on, which is a
 * stronger property than a guard over its mounts, and it costs only that a test of this
 * component's own rendering has to drive the real environment. That is what
 * `achievementsDevPanelIsGated.test.tsx` does.
 *
 * ## THE STYLES ARE INLINE, on `CatchUpDevSkip`'s measured precedent
 *
 * *"Vite emits an imported stylesheet as an asset whether or not the importing module
 * survives tree-shaking"*, and that file measured 15 dev-only rules shipping to the
 * production stylesheet while its component did not. This one's importer is a learner
 * surface, so nothing here is tree-shaken either way, and an inline `<style>` is still the
 * shape that keeps the dev instrument's rules out of the product's stylesheet. It also buys
 * the look: dark, mono, square, so a reviewer glancing at a frame can tell in one look that
 * the panel is not part of the game.
 */

/** The instrument's own look, and it is deliberately not the city's. */
const INSTRUMENT_CSS = `
.ach-dev {
  box-sizing: border-box;
  margin: 10px 0 0;
  padding: 6px 9px 7px;
  border: 1px solid #f0b429;
  border-radius: 4px;
  background: rgba(16, 22, 30, 0.96);
  color: #e8eef4;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 10.5px;
  line-height: 1.3;
  text-align: left;
}
.ach-dev__eyebrow {
  margin: 0;
  color: #f0b429;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ach-dev__title {
  display: flex;
  gap: 6px;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  margin: 1px 0 5px;
  padding: 0;
  border: 0;
  background: none;
  color: #e8eef4;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.ach-dev__title:hover { color: #ffd77a; }
.ach-dev__fold { color: #9fb0c0; font-size: 9px; font-weight: 400; }
.ach-dev__group { min-width: 0; margin: 0; padding: 0; border: 0; }
.ach-dev__legend { padding: 0; color: #9fb0c0; font-size: 9.5px; }
.ach-dev__row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3px;
  margin: 3px 0 6px;
}
.ach-dev__fire {
  min-width: 0;
  padding: 3px 4px;
  overflow-wrap: anywhere;
  border: 1px solid #46586a;
  border-radius: 3px;
  background: #1d2833;
  color: #e8eef4;
  font: inherit;
  font-size: 9.5px;
  text-align: left;
  cursor: pointer;
}
.ach-dev__fire:hover:not(:disabled) { border-color: #f0b429; background: #2a3946; }
.ach-dev__fire:disabled {
  border-color: #2b3742;
  background: #161f28;
  opacity: 0.34;
  cursor: not-allowed;
}
.ach-dev__forget {
  padding: 3px 8px;
  border: 1px solid #f0b429;
  border-radius: 3px;
  background: #2a2013;
  color: #ffd77a;
  font: inherit;
  font-size: 9.5px;
  cursor: pointer;
}
.ach-dev__note {
  overflow-y: auto;
  max-height: 44px;
  margin: 6px 0 0;
  color: #9fb0c0;
  font-size: 9.5px;
}
`;

export function AchievementsDevPanel({
  earned,
  onFire,
  onForget,
}: {
  /** The ids already earned, so a row that has nothing left to fire says so. */
  readonly earned: ReadonlySet<string>;
  /** Record this id and show its moment. The host closes the card. */
  readonly onFire: (id: string) => void;
  /** Forget every one, leaving the card open on a list of invitations. */
  readonly onForget: () => void;
}): ReactElement | null {
  /**
   * WHAT THE LAST PRESS DID, and nothing else.
   *
   * A fire closes the card, so the note is mostly for the forget: the list going back to
   * unearned looks identical to a list that was never earned, and a reviewer needs to know
   * which of the two they are looking at.
   */
  const [note, setNote] = useState<string | null>(null);
  /** Open by default, on `WinterDevSkip`'s trade: unfolding first is a press before the press. */
  const [open, setOpen] = useState(true);

  if (!isDevPersistenceEnabled()) {
    return null;
  }

  return (
    <aside className="ach-dev" aria-labelledby="ach-dev-title" data-testid="ach-dev">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a module constant of CSS; see
          this file's header for why it is not an imported stylesheet. */}
      <style dangerouslySetInnerHTML={{ __html: INSTRUMENT_CSS }} />
      <p className="ach-dev__eyebrow">Dev only, not on the learner build</p>
      <button
        type="button"
        id="ach-dev-title"
        className="ach-dev__title"
        aria-expanded={open}
        data-testid="ach-dev-fold"
        onClick={() => setOpen(!open)}
      >
        Earn one without playing to it
        <span className="ach-dev__fold" aria-hidden="true">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <>
          <fieldset className="ach-dev__group">
            <legend className="ach-dev__legend">Record one, and show its moment</legend>
            <div className="ach-dev__row">
              {/* Derived from the table, so a row added tomorrow gets its button with no
                  edit here, and a row deleted loses one. */}
              {ACHIEVEMENTS.map((achievement) => (
                <button
                  key={achievement.id}
                  type="button"
                  className="ach-dev__fire"
                  disabled={earned.has(achievement.id)}
                  data-testid={`ach-dev-fire-${achievement.id}`}
                  aria-label={`Record ${achievement.id} and show its moment`}
                  onClick={() => {
                    setNote(`Recorded ${achievement.id}.`);
                    onFire(achievement.id);
                  }}
                >
                  {achievement.id}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="ach-dev__group">
            <legend className="ach-dev__legend">Start over</legend>
            <div>
              <button
                type="button"
                className="ach-dev__forget"
                data-testid="ach-dev-forget"
                onClick={() => {
                  onForget();
                  setNote("Forgot every one. The list above is back to invitations.");
                }}
              >
                Forget them all
              </button>
            </div>
          </fieldset>

          {/* `aria-live`, because a forget changes the list behind this panel and nothing
              else announces it. */}
          <p className="ach-dev__note" aria-live="polite" data-testid="ach-dev-note">
            {note ?? "These write the real earned flags, and no press has landed yet."}
          </p>
        </>
      )}
    </aside>
  );
}
