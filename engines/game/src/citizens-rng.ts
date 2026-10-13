/**
 * A small deterministic PRNG for the citizen derivation (pure, framework-free).
 *
 * This exists in the ENGINE on purpose. `apps/web/src/city/three/StarterIsland.tsx`
 * defines a private `mulberry32` and uses three fixed seeds (0x5eed, 0x570e, 0xb17d5)
 * to scatter trees and boulders deterministically — the right precedent for the
 * algorithm, and exactly the wrong thing to import: it is a renderer internal and is
 * not exported. The derivation must not reach into the render layer for its
 * randomness (D-CIT8).
 *
 * `Math.random`, `Date.now`, and map-iteration order are all forbidden in the
 * derivation: two loads of the same state must produce the same city, which is what
 * makes the determinism assertion possible and what lets a citizen keep the same
 * look, home, and route across sessions with nothing saved (D-CIT1).
 */

/** Mulberry32: 32-bit state, uniform in [0, 1), fast and stable across engines. */
export function createSeededRng(seed: number): () => number {
  // Normalise anything a caller might hand over (negative, fractional, zero, NaN)
  // into a usable 32-bit state. A zero state is fine for mulberry32 — the increment
  // moves it on the first call.
  //
  // This line is BELT-AND-BRACES, not the guard: `a |= 0` below performs the same
  // ToInt32 coercion on the first draw, and `(Math.trunc(x) >>> 0) | 0 === x | 0`
  // holds for every number, so removing it changes no stream. It is kept because it
  // states the contract at the boundary, where a reader looks for it.
  let a = Math.trunc(seed) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a sub-seed from a base seed and a small integer salt, so independent streams
 * (looks, gaits, waiting positions) can be drawn without one consuming another's
 * draws. Deterministic, and collision-free over the small salts this feature uses.
 */
export function mixSeed(seed: number, salt: number): number {
  const base = Math.trunc(seed) >>> 0;
  const mixed = Math.imul(base ^ (Math.trunc(salt) >>> 0), 0x9e3779b1);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}
