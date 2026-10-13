import { describe, expect, it } from "vitest";

import { createSeededRng, mixSeed } from "./citizens-rng";

describe("createSeededRng", () => {
  it("returns the same stream for the same seed, forever", () => {
    const a = createSeededRng(0x5eed);
    const b = createSeededRng(0x5eed);
    const first = Array.from({ length: 32 }, () => a());
    const second = Array.from({ length: 32 }, () => b());
    expect(first).toEqual(second);
  });

  it("returns a different stream for a different seed", () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect(a()).not.toBe(b());
  });

  it("stays in [0, 1) over a long run", () => {
    const rng = createSeededRng(0xb17d5);
    for (let i = 0; i < 20000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      // A RANGE check alone cannot catch an off-by-one divisor: the only draw that
      // would reach exactly 1.0 under `/ 4294967295` is the single uint32 0xFFFFFFFF,
      // and a finite run never produces it (2,000,000 draws from this seed top out at
      // 4294965822). So assert the STRUCTURE instead — every draw is an exact uint32
      // scaled by 2^-32, which is what makes `< 1` true for all 2^32 of them rather
      // than for the ones this loop happened to see.
      expect(Number.isInteger(value * 4294967296), `draw ${i}`).toBe(true);
    }
  });

  it("tolerates a negative, fractional, or zero seed without collapsing", () => {
    for (const seed of [0, -1, -99999, 3.7]) {
      const rng = createSeededRng(seed);
      const draws = new Set([rng(), rng(), rng(), rng()]);
      expect(draws.size, `seed ${seed}`).toBe(4);
    }
  });

  it("mixes a salt into a seed deterministically and without collision on small salts", () => {
    expect(mixSeed(7, 3)).toBe(mixSeed(7, 3));
    const mixed = new Set(Array.from({ length: 64 }, (_, i) => mixSeed(7, i)));
    expect(mixed.size).toBe(64);
  });
});
