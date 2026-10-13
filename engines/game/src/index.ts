/**
 * `@cr/game` — Evan's game-owned domain model (pure, framework-free).
 *
 * NO renderer (three.js/React Three Fiber), NO React, NO DB/network I/O lives here.
 * This is the foundation the city surface imports: the data-driven descriptor model +
 * `resolveNeighborhood` resolver (D1 populated; other domains + the endgame
 * "attack" scene are typed, architected-only slots), fixed plots, construction/
 * blueprint derivation, the storm state machine, the end-of-era trial, era one's
 * mid-era Hard Winter crisis encounter, the durable damage a crisis is ALLOWED to leave
 * (`crisis-damage.ts` — the failure floor as a type), the game-owned checkpoint writer,
 * and the composed city view model.
 *
 * Authority (frozen write-boundary): the game READS mastery/placement/lesson_stage
 * and the registry; the ONLY shared learning-state write is
 * `neighborhood_checkpoint_cleared`, via the game-owned `CheckpointWriter`
 * (Contracts §3) — never an economy service.
 *
 * Economy scope: NOTHING cosmetic. This module shipped a display-only cosmetic PREVIEW
 * (`cosmetic-preview.ts`) derived from mastery, against a day when the ratified Contracts
 * §8 cosmetic economy would land. It was sunset on 2026-08-03 along with the interim shop
 * and XP, so the game lane holds no catalogue, no ownership and no cosmetic projection at
 * all. The era MATERIALS are untouched — they are how civic buildings and roads are paid
 * for — and they live in the economy package, named here by description rather than by
 * specifier: INV-COS-1 is enforced by a deliberately blunt TEXT scan of the learning-path
 * roots, this file is one, and the invariant's whole point is that no edge runs from
 * progression to the economy, not even a rhetorical one.
 */

export * from "./checkpoint";
export * from "./citizens";
export * from "./citizens-population";
export * from "./citizens-rng";
export * from "./citizens-tuning";
export * from "./city-provision";
export * from "./city-roster";
export * from "./city-view-model";
export * from "./city-vitality";
export * from "./city-vitality-tuning";
export * from "./construction";
export * from "./crisis-damage";
export * from "./descriptors";
export * from "./hard-winter";
export * from "./hard-winter-tuning";
export * from "./intrusion-questions";
export * from "./island-unlock-exam";
export * from "./mid-era-crisis";
export * from "./neighborhood";
export * from "./plague";
export * from "./plague-mechanics";
export * from "./plague-questions";
export * from "./plague-tuning";
export * from "./plots";
export * from "./practice-evidence";
export * from "./relay";
export * from "./relay-tuning";
export * from "./storm";
export * from "./storm-battle";
export * from "./succession";
export * from "./succession-mechanics";
export * from "./succession-questions";
export * from "./succession-tuning";
