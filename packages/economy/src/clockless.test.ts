import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { capRemaining } from "./cap";
import { DRILL_PAID_SETS_PER_ERA, EARN } from "./constants";
import { drillSetsRemaining, interleavedGrant } from "./earn";
import { applyGrant } from "./grant";
import { appendEntries, countInterleavedGrants, sumInterleavedGrants } from "./ledger";
import { EMPTY_LEDGER_VIEW } from "./types";

/**
 * **THE CLOCKLESSNESS SWEEP: no module in this package may read a clock — ambient OR
 * STORED — and no magnitude in it may be denominated in time.**
 *
 * The no-generation ruling (`docs/superpowers/specs/2026-07-29-era-resource-model-design.md`
 * §5) says every unit is earned by completing a lesson or a practice set, and the
 * condition-clock sunset (§5.3) removed the last mechanic that scaled a payout by
 * time away. Both are prohibitions on FUTURE code, which prose cannot enforce — so
 * the property is stated here instead: **nothing in `@cr/economy` may ask what time
 * it is.**
 *
 * ## THE SWEEP WAS TOO NARROW BY ONE MECHANIC, AND THE MECHANIC WAS LIVE
 *
 * This file banned "asking the environment for the current instant" and passed, on a
 * tree whose practice cap was a rolling 24-HOUR WINDOW. That is not a gap in the
 * implementation, it is a gap in the property: `capRemaining` summed the interleaved
 * grants whose stored `created_at` fell inside `[nowMs - windowMs, nowMs]` and **never
 * asked the environment for anything.** It took `nowMs` from its caller and parsed
 * instants off rows. Every regex below was satisfied.
 *
 * So a payout that depended on when you last played sat inside a file arguing that no
 * payout could. It is the shape `.cursor/rules/qa-verification.mdc` warns about read at
 * the level of the property rather than the population: *"scope a guard by the
 * behaviour, not by the implementation."* Reading `Date.now()` is an implementation of
 * "the payout depends on time". A rolling window is another one, and this sweep was
 * scoped to the first.
 *
 * The cap is per completed practice set now (team lead, 2026-07-29: *"cap shouldn't be
 * daily - it should be per-practice"*), and the sweep is widened to the behaviour in
 * three ways it was not before, each with its own injection:
 *
 *  - **No module NAMES A DURATION.** A window needs a millisecond magnitude to be a
 *    window; there is none, and no `windowMs`-shaped identifier either.
 *  - **`created_at` IS WRITTEN AND NEVER READ.** It appears only as an object-literal
 *    key, never as a property access. That is what makes a stored instant a record
 *    rather than an input, and it is exactly the line the window crossed.
 *  - **BEHAVIOURALLY: the same practice pays the same total, however its instants are
 *    spread.** Thirty sets at one instant, one per day, and one per year all pay
 *    identically. Under the retired window the first paid 200 and the others 300.
 *
 * ## Why the ban can be stated outright, and why that is the dangerous shape
 *
 * The design record recommended this sweep with a two-way exception list naming
 * `condition.ts` (a deliberate clock reader) beside the `created_at` stamping. That
 * list has one fewer entry than it was written with: `condition.ts` is deleted, and
 * with it the only ambient read in the package. **The exception list for ambient
 * reads is therefore empty**, which is a stronger result and also exactly the shape
 * `.cursor/rules/qa-verification.mdc` warns about — a guard that bans nothing and a
 * guard that passes look identical from outside.
 *
 * Three things stop that here, none of them an argument:
 *
 *  - **The population is derived from disk, not written down**, and floored. A file
 *    added to `src/` is swept without anyone remembering to list it.
 *  - **Every file must be non-empty and readable**, so a sweep over unreadable or
 *    empty sources fails rather than passing over nothing.
 *  - **A SECOND census runs in the other direction, and it is not empty.** Three
 *    modules stamp `created_at` from a **passed-in** `nowMs`, and each is named and
 *    must still do so. That is what makes `new Date(input.nowMs)` provably
 *    DISTINGUISHED from `new Date()` rather than merely unbanned: if the distinction
 *    ever stopped being drawn, the second census would fail even though the first
 *    still passed.
 *
 * ## What counts as reading a clock, and what does not
 *
 * BANNED — the process asks the environment for the current instant:
 *   `Date.now()`, `performance.now()`, `new Date()` with no argument.
 *
 * BANNED AS OF THE PER-PRACTICE RULING — the process compares two instants:
 *   `Date.parse(row.created_at)`, and any read of `.created_at` at all.
 *   Any wall-clock DURATION magnitude, however it is spelled.
 *
 * ALLOWED, and asserted below rather than assumed:
 *   `new Date(someTimestamp)` in a `created_at:` position — stamping a caller-supplied
 *   instant onto a row it will never read back.
 *
 * `Date.parse(row.created_at)` was on the allowed list until 2026-07-29 and is the one
 * entry that moved. Reading a stored instant looks harmless next to asking the
 * environment for one, and it is not: two instants are all a window needs, and the
 * caller supplying one of them does not make the mechanic replayable.
 *
 * The line is not "does the word Date appear". It is **whether the payout can depend on
 * WHEN.** A pure function handed `nowMs` and stamping it onto a row cannot; one that
 * subtracts that `nowMs` from a stored stamp can, and so can one that calls
 * `Date.now()`. Every mechanic this package has withdrawn — passive generation, offline
 * accrual, the repair multiplier, the daily cap — needed one of those two.
 */

const SRC_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Every shipped module in the package: derived from the directory, never listed.
 * Tests are excluded because a test may legitimately stub or read a clock (several
 * assert clocklessness BY calling `Date.now`), and a sweep that failed on its own
 * fixtures would be quietly weakened to nothing.
 */
function sourceFiles(): string[] {
  return readdirSync(SRC_DIR)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .sort();
}

function read(name: string): string {
  return readFileSync(join(SRC_DIR, name), "utf8");
}

/**
 * Comment-stripped source. Without this the sweep is unrunnable in practice: the
 * modules that explain WHY they are clockless say "no `Date.now`" in prose, and a
 * naive scan would fail on the documentation of the very property it is checking.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const AMBIENT_CLOCK_READS: readonly { readonly label: string; readonly re: RegExp }[] = [
  { label: "Date.now()", re: /\bDate\s*\.\s*now\s*\(/ },
  { label: "performance.now()", re: /\bperformance\s*\.\s*now\s*\(/ },
  // `new Date()` with nothing between the parens. `new Date(input.nowMs)` does not
  // match, which is the whole distinction this sweep turns on.
  { label: "new Date()", re: /\bnew\s+Date\s*\(\s*\)/ },
];

/**
 * The shapes a TIME-DENOMINATED MECHANIC needs, none of which asks the environment for
 * anything. This list is the widening: every entry below was legal on the tree where the
 * rolling cap shipped, and the cap used two of them.
 */
const TIME_DENOMINATED_SHAPES: readonly {
  readonly label: string;
  readonly re: RegExp;
}[] = [
  // A window's own name, and any duration variable spelled like one.
  { label: "a `window`-named magnitude", re: /\b\w*[Ww]indow(Ms|Millis|Seconds)?\b/ },
  // Reading a stored instant back. `created_at` is the only stored instant in the
  // package, and `Date.parse` is the only way to turn it into a number.
  { label: "Date.parse()", re: /\bDate\s*\.\s*parse\s*\(/ },
  // A read of `created_at` in ANY form other than an object-literal key. `created_at:`
  // (the stamping position) does not match; `entry.created_at` and `{ created_at }` do.
  { label: "a read of created_at", re: /created_at(?!\s*:)/ },
  // How every millisecond duration in this repo is spelled: a chain of at least three
  // numeric factors. `24 * 60 * 60 * 1000` matches; a two-factor scale does not.
  {
    label: "a milliseconds-shaped numeric product",
    re: /\b[\d_]+\s*\*\s*[\d_]+\s*\*\s*[\d_]+/,
  },
];

/**
 * The modules that stamp a row's `created_at` from a CALLER-SUPPLIED `nowMs`.
 *
 * A named list rather than a derived one, because this is the claim that the
 * allowed shape is genuinely in use and genuinely different from the banned one.
 * Asserted in BOTH directions below, so it can neither rot into a list of files
 * that stopped stamping nor silently stop covering a module that starts.
 *
 * **IT WAS THREE UNTIL 2026-08-03**: `spend.ts`, the atomic cosmetic purchase, was the
 * third stamper and went out with the shop. Two is still a real population — the floor
 * below moves with it rather than being left at a number the tree cannot reach, which
 * would fail every run and get "fixed" by deleting the floor.
 */
const STAMPS_A_PASSED_IN_INSTANT: readonly string[] = ["grant.ts", "materialSpend.ts"];

/**
 * The one module that DECLARES `created_at` without writing or reading it.
 *
 * A named exception with a reason, because a type declaration and a read are
 * indistinguishable to a text sweep and only one of them is the defect. Asserted both
 * ways below: the listed module must still carry the `readonly` declaration and must NOT
 * stamp, and no unlisted module may mention the field at all.
 */
const DECLARES_CREATED_AT: readonly string[] = ["types.ts"];

describe("the economy core is CLOCKLESS (no-generation ruling §5, §5.3)", () => {
  const files = sourceFiles();

  it("sweeps every shipped module, and none of them is empty", () => {
    // Floors. The package held 14 non-test modules the moment the condition clock
    // was deleted, and 16 once the civic catalogue landed. The floor sits under both
    // so an unrelated deletion does not fail here, while a sweep that suddenly reads
    // two files does.
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const name of files) {
      expect(read(name).length, `${name} is empty`).toBeGreaterThan(0);
    }
    // The deleted module by name — the one file this sweep exists because of. If it
    // ever comes back it must come back deliberately, with this line changed.
    expect(files).not.toContain("condition.ts");
  });

  it.each(sourceFiles())("%s asks the environment for no instant", (name) => {
    const source = code(read(name));
    for (const { label, re } of AMBIENT_CLOCK_READS) {
      expect(re.test(source), `${name} reads ${label}`).toBe(false);
    }
  });

  it.each(sourceFiles())("%s denominates nothing in TIME", (name) => {
    // The widening. Every shape here was legal on the tree where the rolling cap
    // shipped, and `cap.ts` plus `ledger.ts` used two of them between them: a `windowMs`
    // magnitude and `Date.parse(entry.created_at)`.
    const source = code(read(name));
    for (const { label, re } of TIME_DENOMINATED_SHAPES) {
      expect(re.test(source), `${name} contains ${label}`).toBe(false);
    }
  });

  it("still WRITES created_at, so banning the read is not banning the field", () => {
    // The other direction, and it is what stops the `created_at` ban above from being a
    // ban on a field nothing uses. Every module mentioning the field at all must be
    // either one of the three STAMPERS or the one module that DECLARES it — a partition,
    // so a fourth module touching the field in some other way fails here.
    const mentions = files.filter((name) => /created_at/.test(code(read(name))));
    expect([...mentions].sort()).toEqual(
      [...STAMPS_A_PASSED_IN_INSTANT, ...DECLARES_CREATED_AT].sort(),
    );
    // Disjoint: the declaring module must not also stamp, or "declares" would be an
    // excuse the stampers could hide behind.
    for (const name of DECLARES_CREATED_AT) {
      expect(STAMPS_A_PASSED_IN_INSTANT, `${name} is on both lists`).not.toContain(name);
      expect(/readonly\s+created_at\s*:/.test(code(read(name)))).toBe(true);
      expect(/created_at:\s*new Date/.test(code(read(name)))).toBe(false);
    }
    // Floors under both halves, so they cannot drain to nothing together. Three since
    // the shop sunset took `spend.ts`, where it was four.
    expect(mentions.length).toBeGreaterThanOrEqual(3);
    expect(DECLARES_CREATED_AT).toHaveLength(1);
  });

  it("still stamps rows from a PASSED-IN instant, so the exemption is load-bearing", () => {
    // The other direction. An empty or stale list here would mean the sweep above
    // is banning a shape nothing uses, which is indistinguishable from banning
    // nothing at all.
    expect(STAMPS_A_PASSED_IN_INSTANT.length).toBeGreaterThanOrEqual(2);
    for (const name of STAMPS_A_PASSED_IN_INSTANT) {
      expect(files, `${name} is listed but no longer exists`).toContain(name);
      expect(
        /created_at:\s*new Date\(\s*input\.nowMs\s*\)/.test(code(read(name))),
        `${name} is listed as stamping a passed-in instant and no longer does`,
      ).toBe(true);
    }
  });

  it("names every module that touches Date at all, listed or not", () => {
    // The census that makes the lists a PARTITION rather than overlapping claims: every
    // file mentioning `Date` must be one of the three stampers. A new file touching
    // `Date` in some fourth way fails here even if it dodges every regex above.
    //
    // `ledger.ts` WAS on this list, as "the one module that parses a stored stamp back",
    // and it came off with the rolling window. That is the strongest single line in this
    // file: the exception list for reading an instant is now empty because there is
    // nothing left to except, and the write-side census above is what stops that emptiness
    // being indistinguishable from a sweep that measures nothing.
    const touchesDate = files.filter(
      (name) =>
        /\bDate\s*\./.test(code(read(name))) || /\bnew\s+Date\b/.test(code(read(name))),
    );
    expect([...touchesDate].sort()).toEqual([...STAMPS_A_PASSED_IN_INSTANT].sort());
    expect(touchesDate).not.toContain("ledger.ts");
  });
});

/**
 * **THE BEHAVIOURAL HALF.** Everything above reads source text, which can only ever say
 * that a shape is absent. This says what the shapes were for: *the same practice pays the
 * same total, however its instants are spread.*
 *
 * That is the defect a rolling window IS, stated as an equality rather than as an
 * absence — an absence is what a re-added window under a different spelling would still
 * satisfy. It is also the single assertion that makes "a patient player cannot out-earn
 * an engaged one" checkable, which is the reason the lead gave for the ruling.
 *
 * ## IT NOW RUNS THROUGH THE DRILL BOUND, WHICH IS THE POINT
 *
 * `DRILL_PAID_SETS_PER_ERA` is a NEW ceiling on how many sets pay at all, and a ceiling
 * is exactly the kind of mechanic that gets keyed on time by accident — "ten a day" is
 * the same sentence as "ten an era" with one word changed, and it is the word that
 * decides whether the bound costs effort or costs waiting. So the loop below drives the
 * bound off the real ledger count rather than passing a constant zero, and the equality
 * is asserted ACROSS the boundary: thirty sets pay ten sets' worth of material at one
 * instant, one a day, and one a year alike.
 */
describe("practice income is bounded by EFFORT, never by elapsed time", () => {
  const STUDENT = "s1";
  const START = Date.UTC(2026, 6, 1);
  const SETS = 30;

  /** Total credited over `SETS` practice sets, one every `gapMs`. */
  function totalOverSets(gapMs: number): { stone: number } {
    let view = EMPTY_LEDGER_VIEW;
    for (let index = 0; index < SETS; index += 1) {
      const result = applyGrant(
        view,
        interleavedGrant({
          studentId: STUDENT,
          sessionId: `set-${index}`,
          currentEra: "prehistoric",
          nowMs: START + index * gapMs,
          // THE BOUND'S ONLY INPUT, read the way the adapter reads it. Passing a
          // constant here would take the new ceiling straight back out of this sweep.
          priorPaidSets: countInterleavedGrants(view, "stone"),
        }),
      );
      view = appendEntries(view, result.rows);
    }
    return { stone: sumInterleavedGrants(view, "stone") };
  }

  const MINUTE = 60_000;
  const DAY = 24 * MINUTE * 60;

  it("pays the same for thirty sets at one instant, one a day, and one a year", () => {
    const atOnce = totalOverSets(0);
    const daily = totalOverSets(DAY);
    const yearly = totalOverSets(365 * DAY);
    expect(daily).toEqual(atOnce);
    expect(yearly).toEqual(atOnce);
    // The expected total, so this cannot pass by all three being zero — and it is where
    // the bound shows up: the material stops at ten sets' worth. It used to carry an XP
    // term beside it that kept climbing past the bound, which is how a set worked past
    // the allowance was still paid something; the XP sunset removed that, so a set past
    // the bound now credits nothing and the streak is what it leaves behind.
    expect(atOnce).toEqual({
      stone: DRILL_PAID_SETS_PER_ERA * EARN.interleaved.material,
    });
    // And the bound really did bite over this population, so the equality above is not
    // being satisfied by thirty sets that all paid.
    expect(SETS).toBeGreaterThan(DRILL_PAID_SETS_PER_ERA);
    expect(atOnce.stone).toBeLessThan(SETS * EARN.interleaved.material);
  });

  it("would have differed under the retired window, which is why it is asserted", () => {
    // The measurement that makes the equality above a real claim rather than a
    // restatement of the implementation. The retired ceiling was 200 per 24h at era-one
    // scale, so thirty sets at ONE instant were clamped to 200 while thirty spread a day
    // apart paid the full 600. Those are the two numbers the assertion above now finds
    // equal.
    const RETIRED_DAILY_CEILING = 200;
    const unbounded = SETS * EARN.interleaved.material;
    expect(unbounded).toBe(SETS * 20);
    expect(unbounded).toBe(600);
    expect(unbounded).toBeGreaterThan(RETIRED_DAILY_CEILING);

    // **THE TWO CEILINGS HAPPEN TO MEET AT 200 AT ERA ONE, AND THEY ARE NOT THE SAME
    // MECHANIC.** Ten paid sets at 20 is 200, which is exactly what the retired window
    // let through in a day. That coincidence is worth naming rather than leaving for
    // someone to notice and mistake for a re-added window: the retired ceiling was per
    // 24 HOURS, so spreading the same thirty sets over thirty days lifted the total to
    // 600 and a patient player out-earned an engaged one. This one is per ERA, so the
    // spread cannot move it at all — which is precisely what the equality above measures
    // and what a window could never satisfy.
    const bounded = DRILL_PAID_SETS_PER_ERA * EARN.interleaved.material;
    expect(bounded).toBe(RETIRED_DAILY_CEILING);
    expect(totalOverSets(0).stone).toBe(bounded);
    expect(totalOverSets(365 * DAY).stone).toBe(bounded);
    // The bound's own function takes ONE argument and it is a count, not an instant.
    expect(drillSetsRemaining.length).toBe(1);
    expect(drillSetsRemaining(0)).toBe(DRILL_PAID_SETS_PER_ERA);
    expect(drillSetsRemaining(DRILL_PAID_SETS_PER_ERA + 5)).toBe(0);
    // And the per-set cap that survives cannot produce a spread-dependent gap either,
    // because it sees no instant.
    expect(capRemaining("stone")).toBe(EARN.interleaved.material);
    expect(capRemaining.length).toBe(1);
  });
});
