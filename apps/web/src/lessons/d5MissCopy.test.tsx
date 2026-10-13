/**
 * D5 classify boards: after a miss, the set-level line teaches rather than scolding (R33),
 * and a per-part note still reaches the learner (R28).
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RationalCursedRootClassify } from "./interactive/RationalCursedRootClassify";
import { RationalExclusionClassify } from "./interactive/RationalExclusionClassify";
import { RationalHoleAsymptotePlay } from "./interactive/RationalHoleAsymptotePlay";

/** The chip a learner is left reading after the board is complete, plus how it went. */
interface Outcome {
  status: string;
  misses: number;
  lastRowMissed: boolean;
}

function playOneBoard(host: HTMLElement): Outcome {
  const rows = [...host.querySelectorAll(".lesson-classify__row")];
  expect(rows.length, "the board offers no rows").toBeGreaterThan(1);
  for (const row of rows) {
    const chip = row.querySelector<HTMLButtonElement>(".lesson-interactive__chip");
    expect(chip, "a row with no chip to tap").not.toBeNull();
    fireEvent.click(chip as HTMLButtonElement);
  }
  const glyphs = [...host.querySelectorAll(".lesson-classify__check")].map((n) =>
    (n.textContent ?? "").trim(),
  );
  const status = (
    host.querySelector(".lesson-interactive__status")?.textContent ?? ""
  ).trim();
  return {
    status,
    misses: glyphs.filter((g) => g === "\u2717").length,
    lastRowMissed: glyphs[glyphs.length - 1] === "\u2717",
  };
}

const BOARDS = [
  ["rational-exclusion-classify", RationalExclusionClassify, "excluded value is any value"],
  [
    "rational-cursed-root-classify",
    RationalCursedRootClassify,
    "candidate is extraneous exactly",
  ],
  ["rational-hole-asymptote-play", RationalHoleAsymptotePlay, "cancels and leaves a hole"],
] as const;

describe("what a completed D5 classify board says about a miss", () => {
  it.each(BOARDS)("%s", (_id, Widget, taughtOpening) => {
    const { container } = render(<Widget />);
    let outcome = playOneBoard(container);
    // Some boards can be all-correct on a fixed chip choice; rotate to a fresh one until a
    // miss actually happens, or the assertions below would pass over the branch under test.
    for (let attempt = 0; attempt < 4 && outcome.misses === 0; attempt += 1) {
      const again = container.querySelector<HTMLButtonElement>(
        ".lesson-interactive__reset",
      );
      expect(again, "a completed board with no way to take another").not.toBeNull();
      fireEvent.click(again as HTMLButtonElement);
      outcome = playOneBoard(container);
    }
    expect(
      outcome.misses,
      "no miss was produced, so the miss branch went unread",
    ).toBeGreaterThan(0);

    expect(
      outcome.status,
      "the completed board opens on what the miss cost (R33)",
    ).not.toMatch(/A clean problem is every call right/);
    expect(
      outcome.status,
      "the completed board coaches an attempt that is already over (R33)",
    ).not.toMatch(/and try (a new|again|a fresh)/i);

    if (outcome.lastRowMissed) {
      expect(
        outcome.status,
        "completing the board threw away the note explaining the row just missed (R28)",
      ).toMatch(/Row locked as a miss/);
    } else {
      expect(
        outcome.status,
        "the completed board does not teach the distinction it just tested",
      ).toContain(taughtOpening);
    }
  });
});
