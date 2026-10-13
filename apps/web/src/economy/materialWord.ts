import { materialForEra } from "@cr/economy";
import type { EraId } from "@cr/skill-graph";

/**
 * **THE ONE LEARNER-FACING WORD FOR THE ONE CURRENCY, IN THE ERA THE CITY IS STANDING
 * IN.**
 *
 * The gold-drop retired "gold", so every surface that used to say it — the Shop's
 * wallet chip and footnote, the reward announcements, the coach marks, the road
 * builder's copy — has to say the era's material instead. Before this module there were
 * two independent derivations of that word (`useEconomy.ts` and `Shop.tsx`) with
 * different fallbacks and different casing, which is the drift `economyClient.ts`'s
 * `spendable` docblock warns about one layer down: "three surfaces doing that
 * independently is how they drift."
 *
 * READ FROM THE SHIPPED REGISTRY, never hardcoded, so a material rename reaches the
 * copy without anyone grepping for it — which is exactly what the 2026-07-29
 * recognisability ruling did to six of the ten names, and what the gold-drop then did
 * to era five's.
 *
 * ## ⚑ THESE WERE MODULE CONSTANTS PINNED TO ERA ONE, AND EVERY SENTENCE INHERITED IT
 *
 * `MATERIAL_WORD`, `MATERIAL_WORD_CAPITALISED` and `MATERIAL_UNIT` were computed once at
 * import from `CURRENT_ERA_ID` — the static FIRST-era constant — so all 38 sentences
 * built from them said "stone" in all ten eras. PR #309 repointed the WALLET at the live
 * era and named this as the pin worth picking up next, because the fix made the defect
 * more visible rather than less: era two's reward toast read *"Earned 240 stone"* over a
 * grain grant, and the shop charged an era-one price for it.
 *
 * A MODULE CONSTANT CANNOT FOLLOW A STORE, which is why the shape had to change rather
 * than the expression inside it. These are functions of the era for the same reason
 * `economySession`'s `currentEra()` is read on every call: the era moves under a module
 * that was initialised during `App`'s first render.
 *
 * ## The era is a REQUIRED parameter, deliberately
 *
 * Defaulting it to `cityEraId()` would let a component read the era without subscribing
 * to it, so the copy would be right on mount and stale after an advance — the exact
 * failure this is fixing, moved one layer down and made harder to see. Requiring it
 * makes the compiler ask every caller where its era comes from: a component takes
 * `useCityEra()` (or the `eraId` its parent already resolved), and a plain module takes
 * `cityEraId()`.
 *
 * The fallback is deliberately a GENERIC noun rather than era one's. Nine eras have only
 * a proposed material, so `materialForEra` returns null for them, and naming era one's
 * stone in an era that does not mint it would be a confident lie where "resources" is
 * merely vague.
 */

/** Mid-sentence: "Not enough stone", "12 stone". Lower-cased. */
export function materialWord(eraId: EraId): string {
  return (materialForEra(eraId)?.display_name ?? "resources").toLowerCase();
}

/** Sentence-initial or as a heading: "Stone is earned by learning". */
export function materialWordCapitalised(eraId: EraId): string {
  const word = materialWord(eraId);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The unit a stockpile is COUNTED in — era one §1's "count of worked pieces, not a
 * weight or a currency". Distinct from the material's name on purpose: "12 pieces of
 * stone" is the phrasing that reads as a tally rather than as money, which is the whole
 * reason `unit_noun` is a separate field on the registry.
 */
export function materialUnit(eraId: EraId): string {
  return materialForEra(eraId)?.unit_noun ?? "units";
}
