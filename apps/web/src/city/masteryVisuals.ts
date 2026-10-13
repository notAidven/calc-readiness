import type { BuildStage } from "./palette";

/**
 * Mastery VISUALS shared logic (pure, framework-free — no `three`, no React).
 *
 * A placed building's MASTERY TIER — the same "Mastery X of 3" value the anchored
 * callout shows — drives one cosmetic read: the STARS floating above its roofline
 * (option A): 0–3 filled of 3, gold + celebratory at full mastery (see
 * `three/MasteryStars`). This is the ONLY mastery visual a building carries; there
 * is no "building comes alive" (lit-windows / body-glow) treatment.
 *
 * The stars are gated on the building having TOPPED OUT — its finished model is
 * standing (`built` or `advanced`) — so a site foundation / construction scaffold
 * shows no stars (design: "buildings still under construction show NO stars").
 *
 * Stars REPLACE the retired gold body-tint: mastery is never shown by repainting the
 * building gold, only by earning stars above it. Keeping the tier → stars mapping
 * here (pure) makes it unit-testable without a GPU.
 */

/** Total star slots shown above a topped-out building (mastery is X of 3). */
export const MASTERY_STAR_TOTAL = 3;

/**
 * True once the finished building is standing (its `built` model tops out at the
 * `built` or `advanced` milestone) — the point stars switch on. A `site`/
 * `construction` stage is still under construction and shows none.
 */
export function isToppedOut(stage: BuildStage): boolean {
  return stage === "built" || stage === "advanced";
}

/** Clamp a raw mastery value to a whole 0..3 tier (tolerates NaN / out of range). */
export function masteryTier(mastery: number): number {
  if (!Number.isFinite(mastery)) {
    return 0;
  }
  return Math.max(0, Math.min(MASTERY_STAR_TOTAL, Math.round(mastery)));
}

export interface MasteryStars {
  /** Filled (earned) stars — the mastery tier, 0..3. */
  readonly filled: number;
  /** Total slots (always 3, the "of 3" the callout shows). */
  readonly total: number;
  /** Full mastery (3/3) — render the stars gold + celebratory. */
  readonly celebratory: boolean;
}

/**
 * The stars to float above a building for its mastery tier, or `null` while it is
 * still under construction (site/scaffold) so no stars show. `filled` of `total`
 * are earned; at full mastery the whole set turns gold + celebratory.
 */
export function masteryStarsFor(mastery: number, stage: BuildStage): MasteryStars | null {
  if (!isToppedOut(stage)) {
    return null;
  }
  const filled = masteryTier(mastery);
  return {
    filled,
    total: MASTERY_STAR_TOTAL,
    celebratory: filled >= MASTERY_STAR_TOTAL,
  };
}
