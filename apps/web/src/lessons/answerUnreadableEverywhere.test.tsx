import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { UNREADABLE_LEAD, unreadableAnswer } from "./unreadableAnswer";

/**
 * EVERY SURFACE THAT GRADES A TYPED ANSWER TELLS THE LEARNER WHEN IT COULD NOT READ ONE.
 *
 * ## The defect, and why its population is not "the diagnostic"
 *
 * `invalid_input` is the checker saying it could not read the characters. Ten surfaces in this
 * app grade free-text mathematics, and every one of them read `client_correct` off the result and
 * threw the `status` away, so an unreadable answer was indistinguishable from a wrong one. The
 * owner's report came from the diagnostic and then widened: *"the answer format rejecting
 * behavior is bad across all problem types."*
 *
 * A fix scoped to where the diagnostic implements its input would have left nine surfaces
 * standing. `.cursor/rules/qa-verification.mdc` is explicit about this shape and gives the worked
 * example: a guard scoped to a shared abstraction while nineteen surfaces reimplemented the
 * mechanic privately, green over eighteen broken boards. Here the mechanic is four words —
 * `.client_correct` — and it was written out ten times.
 *
 * ## The population is derived from the behaviour, and the filter IS the mechanic
 *
 * A member is any tracked source under `apps/web/src` that CALLS a verdict producer — the
 * versioned checkers, the four crisis graders, the CFU grader, a lesson session's `submitAnswer`.
 * Calling one is the behaviour: it means this source has a learner's answer in its hands and a
 * learner in front of it, and the swallow is what it does next.
 *
 * The first draft of this file filtered on the string `client_correct`, which was a filter over
 * the BROKEN implementation rather than over the behaviour. It measured 8 members on the fixed
 * tree against 15 on the unfixed one, because the surfaces stop mentioning the boolean as they
 * are repaired — a population that empties as the fix lands, and would have gone green over
 * whatever was left. That is the trap the rule names as deriving the wrong set rather than
 * failing to derive one, and it is recorded here because the two filters look equally principled
 * from the outside.
 *
 * Every member must either consult the shared decision (`unreadableAnswer` / `gradeCrisisAnswer`,
 * both of which branch on `status`) or be a NAMED exception with a reason, asserted in both
 * directions below.
 *
 * ## What is measured, at this tip
 *
 * ```
 * sources that grade a typed answer: 18
 *   reach the shared decision:        15   (the answer surfaces and their graders)
 *   declared exceptions:               3   (see NOT_AN_ANSWER_SURFACE)
 * ```
 *
 * Those numbers are a reading of one tree and go stale the moment it moves, which is why the
 * assertions below are floors and a census rather than the counts themselves. This block said
 * 17/14/3 while the tree it was committed to already held 18, so read it as orientation and
 * the assertions as the guard.
 *
 * The floors are what stop the sweep passing over an empty tree, and the set-equality census is
 * what stops the two halves drifting: a member that stops grading and a member that starts both
 * fail.
 *
 * ## WHAT THIS FILE CANNOT SEE, stated so nobody reads it as more than it is
 *
 * It is a SOURCE sweep, so it proves REACH and not behaviour: every member imports the shared
 * decision. Gut the branch inside one of them and this file stays green — measured, by gutting
 * four of them at once, which left this suite 9/9 while `unreadableEverySurface.test.tsx` went to
 * 4 failed. So the two are a pair and neither is redundant: this one is what a NEW surface cannot
 * slip past (forcing a freshly written surface that reads `.client_correct` into the tree fails
 * here at *"these surfaces grade a typed answer without ever asking whether it was READABLE"*),
 * and the driven suite is what says the surfaces that reach the decision actually act on it.
 */

/** Tracked, non-test sources under `apps/web/src`, from git rather than from a glob. */
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function trackedWebSources(): string[] {
  const out = execFileSync("git", ["ls-files", "apps/web/src"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter((path) => /\.tsx?$/.test(path))
    .filter((path) => !/\.test\.tsx?$/.test(path));
}

function sourceOf(repoPath: string): string {
  return readFileSync(join(REPO_ROOT, repoPath), "utf8");
}

/**
 * Comments are stripped before the mechanic is looked for, because half the mentions of
 * `client_correct` in this tree are docblocks explaining the boundary — including the ones in
 * `browserRuntime.ts` and `work-upload/types.ts`, which would otherwise have to be excused as
 * exceptions for saying the right thing about a field they never read.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * The population: every source that CALLS something which turns a learner's typed answer into a
 * verdict. One filter, over the enumerated verdict producers this app has.
 *
 * Calling one is the behaviour. A source that does it has an answer in its hands and a learner in
 * front of it, and the swallow is what it does next; a source that does not cannot exhibit the
 * defect however much it knows about grading. That is why the filter is the CALL and not, as this
 * file first had it, the string `client_correct` — which was a filter over the old broken
 * implementation, so it emptied as the surfaces were fixed and would have gone green by measuring
 * a shrinking population.
 */
const VERDICT_PRODUCERS =
  /practiceChecker\(|cfuChecker\(|diagnosticAnswerChecker\(|checkAnswer\(|grade[A-Z][A-Za-z]*Answer\(|gradeCrisisAnswer\(|\.submitAnswer\(/;

const VERDICT_READERS: readonly string[] = trackedWebSources().filter((path) =>
  VERDICT_PRODUCERS.test(stripComments(sourceOf(path))),
);

/**
 * What a member has to do about it: reach one of the three shared symbols. `unreadableAnswer` is
 * the decision (it branches on `status`), `gradeCrisisAnswer` is the one wrapper the four crisis
 * pools share, and `UnreadableAnswerNote` is the element the learner reads. A surface that grades
 * and renders will have the note; a module that only grades will have one of the first two.
 */
const CONSULTS_THE_STATUS = /unreadableAnswer|gradeCrisisAnswer|UnreadableAnswerNote/;

/**
 * MEMBERS THAT READ `client_correct` AND ARE NOT ANSWER SURFACES, each with its reason.
 *
 * Named rather than filtered out, because a module that does not owe the property and a module
 * that forgot it look identical from outside the guard. Asserted both ways below: an entry that
 * stops reading `client_correct` fails, and an entry that starts consulting the status fails
 * (which would mean it has become an answer surface and should leave this list).
 */
const NOT_AN_ANSWER_SURFACE: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "apps/web/src/lessons/practiceSession.ts",
    why: "`recomputeCorrectness` is the authoritative server-side recompute stand-in. It only ever sees responses the lesson engine already RESOLVED, and `isResolvingStatus` admits exactly correct and incorrect, so an unreadable answer cannot reach it and there is no learner in front of it to tell.",
  },
  {
    path: "apps/web/src/city/storm/useStormBattle.ts",
    why: "Its `checkAnswer` is a StormAnswerChecker, the storm's own prompt grader with a fail-closed default. It is a different function that happens to share a name; no versioned math checker and no typed math answer are involved, so `invalid_input` is not a verdict it can receive.",
  },
  {
    path: "apps/web/src/lessons/interactive/BothPansBuilder.tsx",
    why: "`checkAnswer` here is a LOCAL function on the balance widget, matched by name only. A widget emits a structured payload and its comparator has its own reason codes; there is no typed string for the reader to fail to read.",
  },
];

const EXCEPTED = new Set(NOT_AN_ANSWER_SURFACE.map((entry) => entry.path));

describe("no answer surface swallows input the checker could not read", () => {
  it("sweeps a real population, derived from the mechanic rather than written down", () => {
    expect(
      trackedWebSources().length,
      "the tracked web sources resolved to nothing",
    ).toBeGreaterThan(300);
    expect(
      VERDICT_READERS.length,
      "no source grades a typed answer, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(14);
    // The population is genuinely wider than one lane: the swallow reached the diagnostic, the
    // lesson lane, the city's ceremony and all four crisis surfaces.
    const lanes = new Set(
      VERDICT_READERS.map((path) => path.replace("apps/web/src/", "").split("/")[0]),
    );
    expect(
      lanes.size,
      `the population is confined to ${[...lanes].join(", ")}, so it has been scoped to one lane`,
    ).toBeGreaterThanOrEqual(5);
  });

  it("every answer surface consults the checker's status, not just its grade", () => {
    const surfaces = VERDICT_READERS.filter((path) => !EXCEPTED.has(path));
    expect(
      surfaces.length,
      "every verdict reader is excused, so nothing is being required of anything",
    ).toBeGreaterThanOrEqual(11);

    const swallowing = surfaces.filter(
      (path) => !CONSULTS_THE_STATUS.test(stripComments(sourceOf(path))),
    );
    expect(
      swallowing,
      "these surfaces grade a typed answer without ever asking whether it was READABLE, so an unparseable answer is treated as a wrong one",
    ).toEqual([]);
  });

  it("keeps every exception honest, in both directions", () => {
    for (const entry of NOT_AN_ANSWER_SURFACE) {
      // BACKWARD: an entry that no longer reads client_correct is excusing nothing, and a
      // renamed or deleted file cannot sit here forever.
      expect(
        VERDICT_READERS,
        `${entry.path} is a declared exception that no longer grades an answer at all`,
      ).toContain(entry.path);
      expect(entry.why.length, `${entry.path} has no reason`).toBeGreaterThan(120);
      // FORWARD: an entry that starts consulting the status has become an answer surface and
      // should leave this list rather than go on being excused by it.
      expect(
        CONSULTS_THE_STATUS.test(stripComments(sourceOf(entry.path))),
        `${entry.path} now consults the answer status, so it is an answer surface and must come off the exception list`,
      ).toBe(false);
    }
    // And the census: the two halves partition the population exactly.
    const surfaces = VERDICT_READERS.filter((path) => !EXCEPTED.has(path));
    expect(new Set([...surfaces, ...EXCEPTED]).size).toBe(VERDICT_READERS.length);
    for (const path of EXCEPTED) {
      expect(VERDICT_READERS, `${path} is excused but not in the population`).toContain(
        path,
      );
    }
  });

  /**
   * THE SURFACES, NAMED. The derivation above cannot say which lanes SHOULD be in it, so the
   * ones the report and the sweep found are pinned by name: a refactor that quietly stops one of
   * them from grading typed answers is a change worth failing on.
   */
  it("covers the surfaces this defect was found on, by name", () => {
    for (const path of [
      "apps/web/src/diagnostic/DiagnosticAnswer.tsx",
      "apps/web/src/lessons/LessonPractice.tsx",
      "apps/web/src/lessons/cfuChecker.ts",
      "apps/web/src/lessons/InfiniteDrill.tsx",
      "apps/web/src/city/IslandUnlockExam.tsx",
      "apps/web/src/winter/hardWinterItems.ts",
      "apps/web/src/plague/plagueItems.ts",
      "apps/web/src/succession/successionItems.ts",
      "apps/web/src/intrusion/intrusionItems.ts",
    ]) {
      expect(VERDICT_READERS, `${path} left the population`).toContain(path);
      expect(
        CONSULTS_THE_STATUS.test(stripComments(sourceOf(path))),
        `${path} does not consult the answer status`,
      ).toBe(true);
    }
  });

  /**
   * THE ONE SENTENCE, from one place. Ten surfaces saying it ten ways is the state this replaced,
   * and the two strings the tree used to carry are named so they cannot come back.
   */
  it("says it in one voice, and the old wordings are gone", () => {
    const notes = VERDICT_READERS.map((path) => stripComments(sourceOf(path)));
    const inventing = VERDICT_READERS.filter((path, index) =>
      /couldn't read|could not read|cannot be read/i.test(notes[index] ?? ""),
    );
    expect(
      inventing,
      "a surface is wording the refusal itself rather than taking it from `unreadableAnswer`",
    ).toEqual([]);
    expect(UNREADABLE_LEAD).toMatch(/couldn't read that/i);
  });
});

describe("the shared decision", () => {
  const readable = { status: "incorrect" as const, reason_code: "value_mismatch" };
  const unreadable = { status: "invalid_input" as const, reason_code: "unknown_symbol" };

  it("is silent for every verdict the instrument can score", () => {
    for (const status of ["correct", "incorrect"] as const) {
      expect(unreadableAnswer({ status, reason_code: "match" }, "a")).toBeNull();
    }
    expect(unreadableAnswer(readable, "a")).toBeNull();
    // The two FAULT statuses are deliberately out: a learner cannot rewrite past one, so a
    // surface that refused them would strand them mid-instrument.
    expect(
      unreadableAnswer({ status: "unsupported_expression", reason_code: "x" }, "a"),
    ).toBeNull();
    expect(unreadableAnswer({ status: "scoring_error", reason_code: "x" }, "a")).toBeNull();
    expect(unreadableAnswer(null, "a")).toBeNull();
  });

  it("teaches the grammar it cannot read, and never the mathematics", () => {
    // A glyph the grammar has no reading for gets its ASCII spelling. Each of these is true of
    // the field whatever the right answer is, which is what makes it safe to say.
    expect(unreadableAnswer(unreadable, "5√2")?.fix).toContain("sqrt(");
    expect(unreadableAnswer(unreadable, "3π")?.fix).toContain("pi");
    expect(unreadableAnswer(unreadable, "3×x")?.fix).toContain("*");
    expect(unreadableAnswer(unreadable, "3÷4")?.fix).toContain("/");
    expect(unreadableAnswer(unreadable, "\\frac{1}{2}")?.fix).toMatch(/plain text/i);
    expect(unreadableAnswer(unreadable, "x²")?.fix).toContain("^");

    // Letters run together read as ONE symbol, so the fix is about the spacing of characters.
    expect(
      unreadableAnswer(unreadable, "log(maq)", { allowedSymbols: ["m", "a", "q"] })?.fix,
    ).toContain("*");

    // Otherwise it quotes the field's own notation line, which the leak sweep in
    // `answerFormat.test.ts` has already graded against every item it is shown to. VERBATIM,
    // because those lines are already sentences: a lead-in produced "Write it like this: Use ^
    // for a power: a^2 + 3a", two colons deep, which the rendered frame showed and the unit
    // test did not.
    expect(
      unreadableAnswer(unreadable, "a", { notationLine: "Use ^ for a power: a^2 + 3a" })
        ?.fix,
    ).toBe("Use ^ for a power: a^2 + 3a");

    // And with nothing to quote, the grammar.
    expect(unreadableAnswer(unreadable, "a")?.fix).toMatch(/\* for multiply/);
    // The generic placeholder is not advice and is never quoted as such.
    expect(unreadableAnswer(unreadable, "a", { notationLine: "Your answer" })?.fix).toMatch(
      /\* for multiply/,
    );
  });

  it("reads the text out of a two-field payload, so the D5 shape gets advice too", () => {
    expect(
      unreadableAnswer(unreadable, { expression: "5√2", excluded_values: "-2, 3" })?.fix,
    ).toContain("sqrt(");
  });

  it("names what it cost, in one sentence, on every surface", () => {
    const note = unreadableAnswer(unreadable, "a", {
      notationLine: "Use ^ for a power: a^2 + 3a",
    });
    expect(note?.lead).toBe(UNREADABLE_LEAD);
    expect(note?.message).toBe(`${UNREADABLE_LEAD} ${note?.fix}`);
    // Never a verdict, on any reason code the checker can produce for unreadable input.
    for (const reason of [
      "unknown_symbol",
      "unsupported_syntax",
      "parse_error",
      "empty_answer",
      "input_too_long",
      "expression_too_complex",
      "number_too_large",
      "unsupported_exponent",
      "unsupported_symbolic_denominator",
      "non_numeric_answer",
      "invalid_rational_answer",
      "wrong_notation",
      "wrong_input_type",
    ]) {
      const line = unreadableAnswer({ status: "invalid_input", reason_code: reason }, "a", {
        // A real placeholder from the dispatch, so the floor below is measured against a string
        // the product actually shows rather than a short stand-in.
        notationLine: "Use ^ for a power: a^2 + 3a",
      });
      expect(line, `no advice for ${reason}`).not.toBeNull();
      expect(line?.fix.length, `${reason} got an empty fix`).toBeGreaterThan(20);
      expect(line?.message, `${reason} says something about being wrong`).not.toMatch(
        /wrong|incorrect|not quite|try harder/i,
      );
    }
  });
});
