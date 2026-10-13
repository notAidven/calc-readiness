/**
 * D5 classify boards: the gate opens once every row is called, not only on a clean sweep (R29),
 * and the classified expression stays ink rather than correctness-coloured (R26).
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RationalCursedRootClassify } from "./interactive/RationalCursedRootClassify";
import { RationalExclusionClassify } from "./interactive/RationalExclusionClassify";
import { RationalHoleAsymptotePlay } from "./interactive/RationalHoleAsymptotePlay";

const CIVIC = "var(--civic)";
const BRICK = "var(--brick)";
const INK = "var(--ink)";

const BOARDS = [
  ["rational-exclusion-classify", RationalExclusionClassify],
  ["rational-cursed-root-classify", RationalCursedRootClassify],
  ["rational-hole-asymptote-play", RationalHoleAsymptotePlay],
] as const;

interface Played {
  rows: number;
  misses: number;
  /** The inline colour on each row's classified expression, after the row settled. */
  subjectColours: string[];
}

/** Tap the FIRST chip under every row, which is a mixed set of calls on all three boards. */
function playFirstChipEveryRow(host: HTMLElement): Played {
  const rows = [...host.querySelectorAll(".lesson-classify__row")];
  expect(rows.length, "the board offers no rows").toBeGreaterThan(1);
  for (const row of rows) {
    const chip = row.querySelector<HTMLButtonElement>(".lesson-interactive__chip");
    expect(chip, "a row with no chip to tap").not.toBeNull();
    fireEvent.click(chip as HTMLButtonElement);
  }
  const settled = [...host.querySelectorAll(".lesson-classify__row")];
  const glyphs = [...host.querySelectorAll(".lesson-classify__check")].map((n) =>
    (n.textContent ?? "").trim(),
  );
  return {
    rows: settled.length,
    misses: glyphs.filter((g) => g === "\u2717").length,
    subjectColours: settled.map((row) => {
      const subject = row.querySelector<HTMLElement>(
        ".lesson-interactive__step-eq [data-latex]",
      );
      expect(subject, "a row with no classified expression in it").not.toBeNull();
      return (subject as HTMLElement).style.color;
    }),
  };
}

/**
 * Drive one board until a miss is actually recorded, so neither assertion below is made about
 * the all-correct branch. Rotating costs nothing: `onComplete` has not fired if the gate is
 * still shut, which is the whole question.
 */
function playUntilMissed(host: HTMLElement): Played {
  let played = playFirstChipEveryRow(host);
  for (let attempt = 0; attempt < 4 && played.misses === 0; attempt += 1) {
    const again = host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
    expect(again, "a completed board with no way to take another").not.toBeNull();
    fireEvent.click(again as HTMLButtonElement);
    played = playFirstChipEveryRow(host);
  }
  expect(
    played.misses,
    "no miss was produced, so the missed branch went unread",
  ).toBeGreaterThan(0);
  return played;
}

describe("a D5 classify board with one miss on it", () => {
  it.each(BOARDS)(
    "%s: opens its gate once every row has been CALLED (R29)",
    (_id, Widget) => {
      const onComplete = vi.fn();
      const { container } = render(<Widget onComplete={onComplete} />);
      const played = playUntilMissed(container);
      expect(
        container.querySelectorAll(".lesson-classify__check").length,
        "a row was left uncalled, so the board is not complete",
      ).toBe(played.rows);
      expect(
        onComplete,
        "every row was called, one of them wrongly, and the board held its gate shut (R29)",
      ).toHaveBeenCalled();
    },
  );

  it.each(BOARDS)("%s: leaves the classified expression in ink (R26)", (_id, Widget) => {
    const { container } = render(<Widget />);
    const played = playUntilMissed(container);
    expect(
      played.subjectColours.length,
      "no classified expression was read, so the colour claim covers nothing",
    ).toBe(played.rows);
    for (const colour of played.subjectColours) {
      expect(
        colour,
        "the subject of the question is painted with the correctness palette (R26)",
      ).not.toBe(CIVIC);
      expect(
        colour,
        "a miscalled value is painted the same red this board uses for an excluded value (R26)",
      ).not.toBe(BRICK);
      expect(colour, "the classified expression is not in ink (R26)").toBe(INK);
    }
  });
});
