import type { CrisisSeedPlan } from "./crisisSeed";

import "./crisisCall.css";

/**
 * DEV: one press that puts the city into the state this era's crisis fires from.
 *
 * ## Where it lives, and why that is the marking
 *
 * Inside the ☰ Menu's "Developer stand-in" panel rather than beside it, which is this
 * repo's only convention for a hatch that ships. That section is titled *"Developer
 * stand-in"* and *"Simulate lessons (dev only)"*, and it is rendered exactly when the
 * mastery stand-ins are, which `App.tsx` supplies only where
 * `isDevPersistenceEnabled()` is true. There is no production build split to hide behind
 * here (`import.meta.env.DEV` guards the `?dev` and `?mock` ROUTES, not this panel), so the
 * control is marked as loudly as its neighbours instead of pretending to a split the city
 * does not have.
 *
 * ## WHICH GATE, AND WHY IT IS NOT AUTH
 *
 * `isDevPersistenceEnabled()` is `!isServerBacked(true)`, i.e. `VITE_DIAGNOSTIC_API_URL`
 * unset: the DEPLOYMENT SHAPE, not who is signed in.
 *
 * This sentence used to name the live auth state (`authedCity`) as the gate, and that was
 * true when it was written. Sign-in is now required before play (ruling 2026-07-31), so
 * `authedCity` is non-null for everybody, and the auth-keyed version of those three props
 * would have withheld them from the TEAM — this control included, since the panel renders
 * only when `onSeedCrisis && crisisSeedPlan` and `crisisSeedPlan` is built only when
 * `onPlaceSkill && onDevAdvanceMastery`. The whole Developer panel would have disappeared
 * on the day the wall shipped, silently, to a line in `App.tsx` nobody would have thought
 * to look at.
 *
 * The deployment shape preserves the original intent exactly (production withholds, local
 * and CI show) and puts these controls on the same predicate as the dev persistence they
 * drive, which is the coherence `devPersistence/devSession.ts` asks for. Guarded by
 * `city/devControlsAreNotAuthGated.test.tsx`, which fails if a dev control is keyed on auth
 * state again and if any comment in this lane starts describing the gate that way.
 *
 * ## What the note says, and why it says it in numbers
 *
 * The figures are read off the plan, so a reviewer can see the trigger is derived before
 * pressing anything: era one reads "first 3 skills" and an era of nine would read 5. The
 * last sentence is the architectural claim in one line, because it is the thing a reviewer
 * is entitled to doubt: the button writes state and stops, and the notice and the advisor
 * after it are the game's.
 *
 * When the era's nodes have no buildings on this island the control is DISABLED and names
 * them. Nine of the ten eras are in that position, and a half-seeded city that never fires
 * looks exactly like a broken trigger.
 */
export function CrisisSeedControl({
  plan,
  onSeed,
}: {
  readonly plan: CrisisSeedPlan;
  readonly onSeed: () => void;
}) {
  const blocked = plan.unavailable.length > 0;
  const alreadyThere = plan.toPlace.length + plan.toMaster.length === 0;
  return (
    <div className="city-devtools-crisis">
      <button
        type="button"
        className="city-action city-action-small"
        data-testid="dev-seed-crisis"
        disabled={blocked}
        onClick={onSeed}
      >
        Seed the mid-era crisis
      </button>
      <p className="city-devtools-note">
        {blocked
          ? `This island has no building for ${plan.unavailable.join(", ")}, so the crisis cannot be reached here yet.`
          : alreadyThere
            ? `Already at the trigger: ${plan.nodeIds.length} of this era's skills are placed and mastered.`
            : `Places and masters this era's first ${plan.nodeIds.length} skills (${plan.nodeIds.join(", ")}), which is where the crisis fires. It then hands off: the notice and the advisor come from the game, not from this button.`}
      </p>
    </div>
  );
}
