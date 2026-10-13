/**
 * R21 on D5's table widgets: a column heading is a label slot, so it holds the TERM.
 *
 * `FillTable` renders `headings` into `<th scope="col">`, which is both the visible name of the
 * column and the name a screen reader announces for every cell in it. A multi-word phrase built
 * around a verb is a paraphrase rather than the term, and on the one D5 slide that teaches
 * "horizontal asymptote" the column holding the asymptote was headed "settles at".
 *
 * The population is DERIVED from the D5 widget sources rather than written down, because a
 * second table widget added later is exactly the case a hardcoded list would miss. The floor
 * fails if the derivation stops finding anything, so an empty sweep cannot read as a pass.
 */

import { render } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RationalEndBehaviorTable } from "./interactive/RationalEndBehaviorTable";

const WIDGET_DIR = join(__dirname, "interactive");

/** Every D5 widget that hands `FillTable` a set of headings, read off the sources. */
function d5TableWidgets(): string[] {
  return readdirSync(WIDGET_DIR)
    .filter((name) => name.startsWith("Rational") && name.endsWith(".tsx"))
    .filter((name) => /headings=\{/.test(readFileSync(join(WIDGET_DIR, name), "utf8")));
}

/**
 * Glosses that have stood in for a term in a heading here, plus the shapes of the same mistake.
 * Each is a verb phrase, and a verb phrase names an action rather than the thing a column holds.
 */
const VERB_GLOSSES = [
  "settles at",
  "settles on",
  "ends up at",
  "levels off at",
  "levels out at",
  "heads for",
  "goes to",
  "approaches",
  "what happens",
];

describe("R21: D5 table column headings hold terms, not glosses", () => {
  it("finds the D5 table widgets to check", () => {
    const found = d5TableWidgets();
    // A floor, so a derivation that silently matched nothing cannot pass.
    expect(found.length, "no D5 widget passes headings to a table").toBeGreaterThanOrEqual(
      1,
    );
    expect(found).toContain("RationalEndBehaviorTable.tsx");
  });

  it("heads the asymptote column with the term the slide teaches", () => {
    const { container } = render(<RationalEndBehaviorTable />);
    const headings = [...container.querySelectorAll("th[scope='col']")].map((th) =>
      (th.textContent ?? "").trim().toLowerCase(),
    );
    expect(headings.length, "the table rendered no column headings").toBe(3);
    // The column the learner fills is the last one, and it holds a horizontal asymptote.
    expect(
      headings[headings.length - 1],
      `the filled column is headed ${JSON.stringify(headings[headings.length - 1])}`,
    ).toBe("horizontal asymptote");
  });

  it("uses no verb-phrase gloss in any D5 table heading", () => {
    const offences: string[] = [];
    let checked = 0;
    for (const file of d5TableWidgets()) {
      const source = readFileSync(join(WIDGET_DIR, file), "utf8");
      for (const match of source.matchAll(/headings=\{\[([^\]]*)\]\}/g)) {
        const headings = [...(match[1] ?? "").matchAll(/"([^"]*)"/g)].map((m) =>
          (m[1] ?? "").toLowerCase(),
        );
        for (const heading of headings) {
          checked += 1;
          const gloss = VERB_GLOSSES.find((phrase) => heading.includes(phrase));
          if (gloss) {
            offences.push(`${file}: heading "${heading}" is the gloss "${gloss}"`);
          }
        }
      }
    }
    expect(checked, "no heading was read").toBeGreaterThanOrEqual(3);
    expect(offences.join("\n")).toBe("");
  });
});
