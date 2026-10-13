import { useCoachAnchor } from "../city/coachmarks/coachAnchorRegistry";
import { MaterialIcon } from "./MaterialIcon";
import type { UseEconomy } from "./useEconomy";

/**
 * The always-on economy HUD (resource spec §9): the ERA MATERIAL stockpile — the one
 * spendable number since the gold-drop. DOM-first and never colour alone: the value
 * carries a word label, so a screen-reader/keyboard user reads the same state the canvas
 * shows. Grants animate as a small reward flash, reduced-motion-aware. There is NO
 * collect affordance and nothing to tap: material appears only as a consequence of
 * learning.
 *
 * ## IT HELD TWO MORE THINGS UNTIL 2026-08-03, AND BOTH ARE GONE
 *
 * An **XP LEVEL meter** (level, rank title, progress-to-next, `N/M XP · T total`) and a
 * **Shop chip** sat beside the stockpile in this strip. Team lead: *"sunset the cosmetic
 * shop and xp systems completely - they dont really have a role in our game. remove it
 * from the interface and it shouldnt really have any implications anywhere."* So the
 * strip is one stat.
 *
 * THE STOCKPILE SITS IN THIS STRIP RATHER THAN IN A PANEL OF ITS OWN, because it is the
 * number the player spends. Era one §6 requires it in the DOM (*"the canvas is
 * `aria-hidden`, so every capacity, shortfall and count lives in the DOM"*), and §1
 * requires it to read as *"a count of worked pieces, not a weight or a currency"* — which
 * is what the unit noun in the announced phrase is for.
 */
export function EconomyHud({ economy }: { economy: UseEconomy; reducedMotion: boolean }) {
  const { wallet, message } = economy;
  // This HUD is `App`'s sibling of `CitySurface`, so the "economy" coach-mark cannot
  // be handed a ref to it — this control registers itself instead.
  const materialAnchorRef = useCoachAnchor("economy");

  if (!wallet) {
    return null;
  }

  const { spendable, spendableMaterial } = wallet;
  // Falls back to a neutral word rather than inventing one: an era whose material
  // nobody has authored has nothing to spend and nothing to call it.
  const materialLabel = spendableMaterial?.display_name ?? "Resource";
  // "120 pieces of Stone" (era one §1), degrading to "120 Resource" in an era whose
  // material nobody has authored — no unit noun is invented where there is no material.
  const materialAnnouncement =
    spendableMaterial === null
      ? `${spendable} ${materialLabel}`
      : `${spendable} ${spendableMaterial.unit_noun} of ${spendableMaterial.display_name}`;

  return (
    <div className="hud economy-hud" data-testid="economy-hud">
      <div className="economy-hud-bar">
        <div
          className="economy-stat"
          data-testid="economy-material"
          ref={materialAnchorRef}
        >
          <span className="economy-stat-icon" aria-hidden="true">
            <MaterialIcon material={spendableMaterial?.id ?? null} />
          </span>
          {/* The era's own word ("Stone"), not a generic one: this is the only currency
              now, and era one §1 wants it read as a count of worked pieces — "120 pieces
              of Stone". The strip has room for a figure and a word, not a phrase, so the
              visible pair and the announced phrase are two renderings of one number.

              THE PHRASE CANNOT BE AN `aria-label` ON THE FIGURE, which is what it was
              until the announced text was actually measured: a bare `<span>` carries the
              GENERIC role, a generic role takes no accessible name, and the attribute was
              therefore dropped by every consumer. The HUD read "Stone 120" and the unit
              was inaudible. Hiding the visible pair and supplying one hidden phrase puts
              the unit in the accessible tree as TEXT, which no role can refuse. See
              `EconomyHud.test.tsx`, which asserts the announced text rather than the
              attribute — a test asserting the attribute would have passed throughout. */}
          <span className="economy-stat-label" aria-hidden="true">
            {materialLabel}
          </span>
          <span
            className="economy-stat-value"
            data-testid="economy-material-value"
            aria-hidden="true"
          >
            {spendable}
          </span>
          <span className="visually-hidden">{materialAnnouncement}</span>
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite" data-testid="economy-live">
        {message}
      </p>
    </div>
  );
}
