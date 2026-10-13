import { CAP } from "./constants";
import { eraCostMultiplier, eraOfMaterial } from "./materials";
import type { MaterialId } from "./types";

/**
 * The anti-grind cap (resource spec §7 layer 4, D-R6) — **PER COMPLETED PRACTICE SET.**
 * It bounds the REPEATABLE source only, interleaved practice (row 2). The one-time
 * lesson grant is never passed through here, so honest first-time progress is never
 * throttled.
 *
 * **IT BOUNDS PROGRESSION, NOT JUST DECORATION.** Before the gold-drop this capped gold,
 * whose only sinks were cosmetics and roads. Practice now pays the era material, which
 * is what buys civic buildings, so this file governs how fast a learner can finish their
 * city. Two of §7's four layers went in the same week — layer 3 with the condition clock
 * — leaving this as the sole explicit volume control on the only repeatable income in
 * the game.
 *
 * ## THIS FILE USED TO READ A CLOCK, AND THAT IS WHAT CHANGED
 *
 * THE RULING (team lead, 2026-07-29, verbatim): *"cap shouldn't be daily - it should be
 * per-practice."*
 *
 * It held a rolling 24-hour window: `capRemaining` summed every interleaved grant whose
 * `created_at` fell inside `[nowMs - windowMs, nowMs]` and returned the remainder. That
 * is a clock. It never called `Date.now()` — it took `nowMs` from its caller and parsed
 * stored `created_at` stamps — which is exactly why the existing clocklessness sweep
 * passed over it: **the sweep banned asking the environment for the instant, and a
 * rolling window does not need to ask.** It only needs two instants it was handed.
 *
 * So the sweep is extended rather than duplicated: `clockless.test.ts` now also forbids
 * a wall-clock DURATION anywhere in the package and asserts that no module derives a
 * decision from a stored instant, with the behavioural half — that K practice sets pay
 * the same total however their instants are spread — asserted there too.
 *
 * ## What is left is a pure function of the resource
 *
 * No ledger, no history, no instant. That is the strongest available statement of the
 * ruling: a per-set bound cannot depend on anything a player could wait for, because it
 * cannot see anything a player could wait for. `sumInterleavedInWindow` is deleted from
 * `ledger.ts` with the window, and with it the last read of a stored `created_at` in the
 * package.
 *
 * A MATERIAL'S CEILING IS ERA-SCALED. `CAP.maxMaterial` is authored at era one's `×1`
 * like every other price in the economy, and is multiplied by the era of the material
 * being capped — recovered from the material id itself, since a ledger row carries
 * nothing else. So the cap is the same fraction of an era's wealth throughout rather
 * than becoming trivially small by era ten.
 */

/**
 * **What one completed practice set may credit of `material`**: the era-one figure,
 * scaled by the era of the material being capped.
 *
 * It used to branch — the authored figure for xp, the era-scaled one for a material —
 * and the xp arm went with the sunset along with `CAP.max`. One resource, one rule.
 *
 * The era scaling here and `eraScaledPrice` in `earn.ts` are the same arithmetic
 * (`round(era-one figure × 2^(N-1))`) applied to the same era-one constant, which is
 * what makes the ceiling exactly one set's payout in every era rather than only in era
 * one. Asserted in `cap.test.ts` over all ten.
 */
export function capMaxFor(material: MaterialId): number {
  return Math.round(CAP.maxMaterial * eraCostMultiplier(eraOfMaterial(material)));
}

/**
 * How much of `resource` one row-2 grant may still credit.
 *
 * Identical to {@link capMaxFor} and kept as its own name because that is the concept
 * `applyGrant` is applying — "what is left of this grant's allowance" — and because the
 * two were genuinely different functions while a window existed. It took a
 * {@link LedgerView} and an instant then; it takes neither now, and the removal of those
 * two parameters IS the ruling.
 */
export function capRemaining(material: MaterialId): number {
  return capMaxFor(material);
}

/** Whether crediting `add` of `material` from row 2 stays within one set's allowance. */
export function withinCap(material: MaterialId, add: number): boolean {
  return add <= capRemaining(material);
}
