/**
 * **A COMMENT THAT NAMES THE WINTER'S LENGTH HAS TO NAME THE LENGTH THE WINTER HAS.**
 *
 * The behaviour, stated before the population is written down: *a source that describes
 * the hard winter as an encounter of so many rounds.* `HARD_WINTER.rounds` went from six
 * to five on 2026-07-30, its own docblock records the change with the measurement behind
 * it, and four sentences elsewhere were left describing the winter that no longer exists.
 * They were found by hand, one of them twice, which is the argument for a sweep: a stale
 * round count is invisible to every other test in the tree, because no assertion anywhere
 * reads prose.
 *
 * ## Why the population is the phrase and not a directory
 *
 * The obvious scoping is "the winter's own files", and it is wrong in the way
 * `.cursor/rules/qa-verification.mdc` warns about: it scopes by where the mechanic is
 * IMPLEMENTED where the claim is about what a sentence CLAIMS. Measured on the four stale
 * sites, the two scopings disagree. Two were in `engines/game/src`, one of them in a test;
 * one was in `apps/web/src/winter`; and one was in `apps/web/src/city/three`, a directory
 * `test/hardWinterClockless.test.ts`'s winter-source derivation deliberately does not
 * reach. Any directory list short enough to write down would have missed at least one.
 *
 * So the population is **every tracked `.ts`/`.tsx` file in the repository**, and the
 * PHRASE does the selecting. A file that never describes the winter's length contributes
 * nothing and cannot fail; a file that describes it is in the sweep wherever it lives,
 * including one nobody has written yet.
 *
 * ## What the phrase is, and the three things it deliberately does not match
 *
 * The adjectival form modifying the encounter — *"a five-round winter"*, *"a stateful
 * five-round encounter"*. A general sweep for "N rounds" is not available: 76 such phrases
 * are in the winter's sources today and almost all of them are about something other than
 * the encounter's length, so that guard would be an exemption list with a regex attached,
 * which is the shape `#187` failed as. This one has no exemption list at all, because the
 * grammar excludes the three kinds of sentence that would need excusing:
 *
 *  - a DURATION — *"held for the two rounds a fire then burned"*, *"three rounds of spread"*;
 *  - a POLICY DEPTH — *"one-round lookahead"*, which is the adjectival form over a noun
 *    that is not the encounter;
 *  - a HISTORICAL CLAUSE — *"Six rounds gave the island's heart exactly two cold rounds"*,
 *    *"the old six-round plans"*. These are the sentences that must go on saying six, and
 *    they are already phrased as statements about what changed rather than as a name for
 *    the encounter.
 *
 * If a future historical clause does need the adjectival form, it needs a named exception
 * list asserted in both directions, and not a loosened pattern.
 *
 * ## WHAT THIS DOES NOT REACH, said plainly, because two of the four were outside it
 *
 * **This guard would have caught two of the four stale sentences, not four.** Both of the
 * others said six in a shape the grammar cannot read — *"a six-round stateful play"*, where
 * the noun after the number is not the encounter, and *"held for the two rounds a fire then
 * burned, out of six"*, where the count is not attached to a noun at all. Neither was
 * rescued by widening the pattern; each was REWRITTEN into the phrase, which is the trade
 * this design makes: the sweep is worth having because it has no exemption list, and the
 * price of that is that a sentence has to be phrased in the one form to be covered.
 *
 * The pairs are asserted below in both directions — the old shape reads as nothing, the new
 * shape reads as five — so the normalisation is recorded rather than assumed, and so a
 * revert to either old wording is visible as a claim this file stops making.
 *
 * Lives in `test/` for the reason `hardWinterClockless.test.ts` does: the subject spans two
 * workspaces, an engine-lane test reaching into `apps/web` would invert the dependency
 * direction, and the web lane's jsdom harness cannot read source with `node:fs`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { HARD_WINTER } from "@cr/game";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

/** Number words this guard can read, index 0 unused so the index IS the value. */
const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

/**
 * `<number>-round <encounter noun>`, case-insensitive.
 *
 * The hyphen is load-bearing and so is the noun. Together they are what separates a NAME
 * for the encounter from a measurement of something inside it, which is the whole reason
 * this can be a pattern rather than a pattern plus a list of excuses.
 */
const ENCOUNTER_LENGTH =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)-round (winter|encounter|crisis)\b/gi;

interface Claim {
  readonly path: string;
  readonly line: number;
  readonly said: number;
  readonly text: string;
}

function trackedSources(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "*.ts", "*.tsx"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.length > 0);
}

/** Every sentence in `source` that names the encounter's length, with the number it names. */
function lengthClaims(path: string, source: string): Claim[] {
  const found: Claim[] = [];
  source.split("\n").forEach((text, index) => {
    // A fresh lastIndex per line: the pattern is global so it can find two on one line.
    ENCOUNTER_LENGTH.lastIndex = 0;
    let match = ENCOUNTER_LENGTH.exec(text);
    while (match !== null) {
      const word = (match[1] as string).toLowerCase();
      found.push({
        path,
        line: index + 1,
        said: NUMBER_WORDS.indexOf(word as (typeof NUMBER_WORDS)[number]),
        text: text.trim(),
      });
      match = ENCOUNTER_LENGTH.exec(text);
    }
  });
  return found;
}

function sweep(): Claim[] {
  const found: Claim[] = [];
  for (const path of trackedSources()) {
    // This file names the wrong count on purpose, in its own fixtures and its own prose.
    if (path === "test/hardWinterRoundCount.test.ts") {
      continue;
    }
    found.push(...lengthClaims(path, readFileSync(posix.join(repoRoot, path), "utf8")));
  }
  return found;
}

describe("a source that names the hard winter's length names the length it has", () => {
  it("sweeps a real population, spanning both the engine and the web lane", () => {
    const claims = sweep();

    // A FLOOR, because "every claim agrees with the constant" holds trivially over none.
    // Five is the count after the 2026-07-30 sweep; it is a floor and not a pin, so
    // describing the winter somewhere new joins the population rather than failing here.
    expect(
      claims.length,
      `only ${claims.length} sources name the winter's length: ${JSON.stringify(claims)}`,
    ).toBeGreaterThanOrEqual(5);
    expect(new Set(claims.map((c) => c.path)).size).toBeGreaterThanOrEqual(3);

    // AND THE COMPOSITION, not only the size. A floor constrains how many claims were
    // swept, never WHICH: six claims inside `engines/game/src` would clear it while the
    // web lane — where one of the four stale sentences actually was — went unswept.
    const lanes = new Set(claims.map((c) => c.path.split("/")[0] as string));
    expect(lanes, `lanes swept: ${[...lanes].join(", ")}`).toContain("engines");
    expect(lanes).toContain("apps");
    // And past the winter's own name filter, which is what missed the fourth site: the
    // one in `apps/web/src/city/three` is in no file called `hard-winter-anything`.
    expect(
      claims.filter((c) => !/hard-winter/.test(posix.basename(c.path))).length,
      `every claim is in a hard-winter-named file: ${JSON.stringify(claims.map((c) => c.path))}`,
    ).toBeGreaterThanOrEqual(1);
  });

  it("finds none that disagrees with the tuning table", () => {
    const wrong = sweep().filter((claim) => claim.said !== HARD_WINTER.rounds);

    expect(
      wrong.map((c) => `${c.path}:${c.line} says ${c.said} — ${c.text}`),
      `the winter is ${HARD_WINTER.rounds} rounds long (\`HARD_WINTER.rounds\`)`,
    ).toEqual([]);
  });

  /**
   * The two assertions above pass by finding nothing wrong, which is also exactly how they
   * would look if the reader had been broken into returning `[]`. This pins the reader
   * against the shape of the defect, in both directions, on the real sentences — every
   * fixture below is quoted from this tree rather than invented.
   */
  it("reads a claim about the encounter, and not a measurement inside it", () => {
    // THE TWO STALE SENTENCES THIS GRAMMAR READS AS WRITTEN, quoted from the tree as they
    // stood before the fix, and each with the fixed form beside it.
    for (const line of [
      " * / 100 material, `EARN.interleaved` 12 XP / 10-40 gold): a whole six-round winter",
      " * and that a running winter is untouched — driven by playing a whole six-round winter",
    ]) {
      const [stale] = lengthClaims("fixture.ts", line);
      expect(stale, `not read as a length claim: ${line}`).toBeDefined();
      expect(stale?.said, line).toBe(6);
      const [fixed] = lengthClaims("fixture.ts", line.replace("six-round", "five-round"));
      expect(fixed?.said, line).toBe(5);
    }

    // AND THE TWO IT DOES NOT, which is the caveat the header owes. Each is the sentence as
    // it stood, followed by the rewrite that brought it inside the grammar — so the pair is
    // what makes the normalisation checkable, and a revert to the left-hand form fails here
    // as a claim this file has stopped making.
    for (const [outside, rewritten] of [
      [
        " * six-round stateful play that the lead is going to want to compare across tuning",
        " * stateful five-round encounter that the lead is going to want to compare across",
      ],
      [
        " * action**, held for the two rounds a fire then burned, out of six. The square is",
        " * action**, held for the two rounds a fire then burned, out of a five-round winter.",
      ],
    ] as const) {
      expect(
        lengthClaims("fixture.ts", outside),
        `the grammar reaches this after all, so the header's caveat is stale: ${outside}`,
      ).toEqual([]);
      expect(lengthClaims("fixture.ts", rewritten)[0]?.said, rewritten).toBe(5);
    }

    // Case is not a hiding place: the layouts file shouts this one, and the grammar reads it
    // whichever count it names.
    expect(
      lengthClaims(
        "f.ts",
        " * ALL THREE WERE RE-AUTHORED FOR THE FIVE-ROUND WINTER on 2026-07-30, and",
      )[0]?.said,
    ).toBe(5);
    expect(
      lengthClaims(
        "f.ts",
        " * ALL THREE WERE RE-AUTHORED FOR THE FOUR-ROUND WINTER, and",
      )[0]?.said,
    ).toBe(4);

    /*
     * AND THE THREE KINDS OF SENTENCE THAT MUST GO ON SAYING WHAT THEY SAY. Each is a real
     * line in this tree; if any of them started matching, this guard would need the exception
     * list its header says it does not have.
     *
     * **ONE FIXTURE WAS REMOVED FROM THIS LIST ON 2026-08-01, and it is worth recording why,
     * because it is this file's own version of the defect it exists for.** The list carried
     * *"ALL THREE WERE RE-AUTHORED FOR THE FIVE-ROUND WINTER, and the old six-round plans
     * could"*, filed under historical clauses, and it passed for two days. It was never
     * innocent: the grammar reads it, correctly, as a claim that the encounter is five rounds
     * long, and the assertion below only tolerated it because it filters on
     * `said !== HARD_WINTER.rounds` and the constant happened to be 5. A `rounds: 4` ruling
     * exposed it immediately, and the reversal of that ruling would have hidden it again. The
     * lesson is in the filter rather than the fixture: **an "innocent" line that agrees with
     * the current constant proves nothing about the grammar**, so every fixture kept below is
     * one the grammar must not match AT ALL, whatever the constant reads, and that is what is
     * asserted. The sentence itself is checked as a length claim above, where it belongs.
     */
    for (const innocent of [
      // a duration
      " * The lead asked for a fire that is visible for two rounds AFTER the round it was",
      " * Against that, the 5x5 square at the two rounds a fire then burned was 50 cell-rounds,",
      "  // assertion here vacuous, and three rounds of spread is what puts frost on the board.",
      // a policy depth
      " * A COMPETENT PLAYER, modelled as one-round lookahead over the recovery bill, with the",
      " * a one-round-lookahead policy maximising survivors opens exactly this, saves all six,",
      // a historical clause, which has to keep saying six
      " * the assertion that moved. Six rounds gave the island's heart exactly two cold rounds,",
      " * not simply be shortened: each was length-checked against `HARD_WINTER.rounds`, and",
      // a historical clause about a count that is not the current one, in the shape the
      // 2026-08-01 rewrites use, so those rewrites are pinned as sentences this grammar
      // deliberately does not read
      " * spends the last ring on the round that ends the winter, leaving no round to be",
      " * count went to four, where 440 cell-rounds became 352 and every share below rose",
    ]) {
      expect(
        lengthClaims("fixture.ts", innocent),
        `flagged a sentence that is not a claim about the encounter's length: ${innocent}`,
      ).toEqual([]);
    }

    // Two on one line are both read, so a global pattern cannot stop at the first.
    expect(
      lengthClaims("f.ts", "a six-round winter and a four-round encounter").map(
        (c) => c.said,
      ),
    ).toEqual([6, 4]);
  });
});
