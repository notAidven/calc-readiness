/**
 * No widget, in any domain, deals the instance the worked example on its own slide has
 * already solved.
 *
 * The file is named for the PROPERTY and not for a domain, deliberately. It was
 * `d7WorkedExampleReplay.test.ts` while it swept one domain, and a reviewer asking "is
 * anything watching for replays in my domain" would have read that name as no. A guard whose
 * name states a population narrower than its subject invites exactly the scoping mistake
 * `qa-verification.mdc` is about, so the name goes domain-neutral and stays that way as
 * domains join. Two dated records still cite the old name and should keep citing it: they are
 * evidence about the SHA they were written at.
 *
 * A three-section slide is a lecture, then a worked example, then a gated interactive. If the
 * widget deals the same numbers the worked example just finished, section three asks the
 * learner to copy an answer that is on screen above it, and the gate passes without any
 * mathematics happening. Ten instances of this were confirmed across D2, D8 and D10; in D2
 * the first board was clean and the SECOND one, the board "start over" deals, was the
 * replay, so a sweep that reads only the opening instance measures the wrong half.
 *
 * This exists as a guard rather than as a reading because the authoring wave that follows
 * this QA round adds a second board to eight D7 widgets, which is precisely the edit that
 * introduced D2's. A reading pass expires the moment that lands.
 *
 * THE POPULATION WAS INVERTED, AND THIS IS THE CORRECTION.
 *
 * Until 2026-08-08 `POPULATION` was a two-element array naming D7 and D9: 52 pairs, in the
 * two domains holding ZERO confirmed instances, excluding D2, D8 and D10, which hold all of
 * them. The sweep was scoped precisely away from the defect this docblock describes and
 * reported `17 passed` over a D6 widget dealing its own worked example's equation. That is
 * the implementation-scoped population `qa-verification.mdc` documents at length, in its
 * purest form: the domain list was a fact about who had done the work, and the property is a
 * fact about every three-section slide in the tree.
 *
 * The pairing is now derived from `content/lessons/<domain>/*.json` directly rather than
 * from an authored node list, so a pack that exists is swept whether or not any loader's
 * `NODE_ORDER` remembers it. 256 pairs across all ten domains, floored below, with a
 * composition assertion beside the floor: a floor alone is satisfied by the original 52
 * plus 190 of anything, so the count of pairs OUTSIDE the two domains this used to stop at
 * is asserted in its own right.
 *
 * WHAT IT MEASURES, and what it does not:
 *
 *  - It compares against `worked_examples[i].prompt`, not against `mini_lesson[i]` and not
 *    against the widget's header comment. A widget in D2 was guarded against `(x^4)^2`, an
 *    instance that appeared on no slide at all, while its real replay went unnoticed.
 *  - It reads the WHOLE widget source, so every board is in scope and not just the first.
 *  - Comments are NOT stripped, so a header comment that quotes the worked example's
 *    instance fires too. That direction is deliberate: comments are worthless as an
 *    exoneration (they found none of D2's six offenders) but a comment naming the instance
 *    is worth a human look either way.
 *  - It fires on LITERAL signatures: an equation, a trigonometric expression, an unusual
 *    angle, or a set of coordinates all of which the widget holds. A widget that assembles
 *    its instance from numeric fields through a template string is therefore outside its
 *    reach. THIS IS THE LARGEST REMAINING GAP AND IT IS COUNTED RATHER THAN DESCRIBED: see
 *    `UNREACHED_BOARDS` and the uncomparable census below, both floored so that closing the
 *    gap takes an edit here and cannot happen by silence.
 *
 * WHY D9 IS IN SCOPE, AND WHAT IT COST TO GET IT THERE.
 *
 * D9's nine packs carry 36 three-section slides with gating widgets, so the defect is
 * possible on every one of them. All 36 were read by hand at 5bac81f0, board by board, and
 * NONE of them is a replay; this sweep exists to keep that true through the authoring wave,
 * not because it found something. Three separate limits had to be lifted before the
 * extractor could see the shapes D9 writes, and each is unit-tested below:
 *
 *  - `canon` collapsed a doubled backslash to nothing, which was harmless in D7 because D7
 *    widgets write `"x + 2y = 11"` in plain text. Every D9 widget writes LaTeX, where a
 *    source literal is `"\\cos x = \\dfrac{1}{2}"`, so the rule deleted the command name and
 *    the whole widget side of the sweep read as empty. It now collapses to a single
 *    backslash first, so a pack's prompt and a widget's source reduce to one spelling.
 *  - `equationsIn` rejected any run of three letters, which encodes "every variable is a
 *    single letter". That is true of D7 and impossible in D9, where every equation carries a
 *    function name. A letter run is now walked against the names maths actually uses, so
 *    `sintheta=7/25` is an equation and `y=17atx` is still prose.
 *  - a D9 prompt is often not an equation at all. `\cos(x - 60^{\circ})` has no `=`, and a
 *    heading is sometimes the whole instance, so `trigExpressionsIn` and `bareAnglesIn` were
 *    added beside `equationsIn`.
 *
 * A FOURTH LIMIT WAS LIFTED FOR D8, and it is what makes `EL.3` visible.
 *
 * `equationsIn` read neither `\log_{2} 32 = 5` nor `7^{3} = 343`: the first because `_`, `{`
 * and `}` were outside the character class, so the token seen was the four-character `32=5`
 * and the length floor dropped it; the second because the rule required a letter, which is
 * a rule about VARIABLES and says nothing about whether a statement is an instance. A caret
 * now satisfies that test in a letter's place, since `2^{5} = 32` names an instance exactly
 * as `y = 9x + 40` does. Both changes were measured over all 256 pairs before landing, and
 * over the whole tree they add exactly two hits and no false ones: `EL.3` slide 1, which is
 * a confirmed replay this file existed to catch and could not see, and `LIN.3` slide 1,
 * which is declared in `NEAR_REPLAY_ACCEPTED` below.
 *
 * The controls that stop this reporting green while measuring nothing, each failing in a
 * different direction:
 *
 *  - the pairing is derived from the packs on disk and from `visuals.tsx`, and floored, so a
 *    resolution that silently drops slides fails rather than sweeping an empty list;
 *  - the count of pairs outside D7 and D9 is floored separately, so the population cannot
 *    drift back to the two domains it used to stop at while still clearing the total;
 *  - every pair in a HAND-READ domain must yield a comparable signature, or else be named in
 *    `NO_SIGNATURE` with a reason. That list is asserted BOTH ways: an entry that starts
 *    yielding a signature fails, so it cannot sit there exempting nothing, and an unlisted
 *    pair that yields none fails, so a prompt cannot quietly become uncomparable;
 *  - a comparable prompt over a silent widget compares nothing, and containment over an
 *    empty set holds trivially, so the pairs where BOTH sides yield a signature are counted
 *    and floored, per domain as well as in total, and floored again for the domains outside
 *    D7 and D9 so a wide population cannot be carried by two domains' density;
 *  - the extractor is unit-tested against the shapes each domain actually writes, because an
 *    extractor that returns nothing turns the whole sweep into a no-op.
 *
 * Verified by injection rather than argued. Each supported shape was made to fail at a real
 * pair, and reverted:
 *
 *  - equation, single-letter variables: `LinearSystemSubstitutePlay` pointed at LF.4 slide
 *    1's system (`x - 3y = -2`, `2x + y = 10`) fails at that pair;
 *  - equation, function name in the run: `TrigSweepPlay`'s SECOND board, the one "start over"
 *    deals, given TRG.8 slide 0's `\sin x = \dfrac{1}{2}`, fails with `deals "sinx=1/2"`. This
 *    is the injection that shows the letter-run change is load-bearing rather than cosmetic:
 *    with the old `[a-zA-Z]{3,}` rule restored and the injection left in place, the sweep goes
 *    GREEN over a widget dealing its own worked example's equation;
 *  - nested-brace fraction: `TrigRosterSpot`'s first board given TRG.8 slide 2's
 *    `\sin x = \dfrac{\sqrt{3}}{2}` fails with `deals "sinx=sqrt(3)/2"`;
 *  - no-`=` expression: `TrigSumTable`'s cosine board headed with TRG.9 slide 1's
 *    `\cos(x - 60^{\circ})` fails with `writes "cos(x-60deg)"`;
 *  - bare angle: `TrigCoterminalSorter` given TRG.1 slide 2's `100^{\circ}` as a literal fails
 *    with `asks about the heading "100deg"`;
 *  - subscripted equation, no letter needed: restoring EL.3 slide 1's `\log_{2} 32 = 5` to
 *    `LogFormMatch`'s first board fails with `deals "log_{2}32=5"`, and restoring the old
 *    character class with that board left in place takes the sweep GREEN over a widget whose
 *    opening pair is its worked example verbatim.
 *
 * The same exercise measured the limit as well as the reach, and it is worth knowing before
 * trusting a green run: `TrigCoterminalSorter`'s instance is the numeric field `given`, and
 * setting `given: 100` deals TRG.1 slide 2's heading for real, on the opening board, with the
 * widget's own sentence reading "a dish is parked at a heading of 100 degrees". The sweep
 * PASSES on that. Everything in `SILENT_WIDGETS`, everything in `UNREACHED_BOARDS`, and every
 * template-assembled instance anywhere in the population, is invisible in exactly that way.
 */

import { describe, expect, it } from "vitest";

import type { LessonContent } from "./types";

const SOURCES = import.meta.glob(["./visuals.tsx", "./interactive/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * Every authored pack, taken from the tree rather than from a domain list.
 *
 * This is the correction. A `POPULATION` array naming domains is a record of who had done
 * the work, and it stayed at D7 and D9 while five confirmed replays shipped in D2 and D8. A
 * glob over `content/lessons` cannot fall behind an authoring wave, and a pack missing from
 * some loader's `NODE_ORDER` is swept here regardless.
 */
const PACKS = import.meta.glob<LessonContent>("../../../../content/lessons/*/*.json", {
  eager: true,
  import: "default",
});

/**
 * The domains whose pairs have been read BY HAND, board by board.
 *
 * The named exception lists below are claims that somebody looked, so they are scoped to the
 * domains where somebody did: D7 and D9, at 65d7cdbf and 5bac81f0. The other eight domains
 * are swept mechanically and their unread remainder is COUNTED instead, in the census at the
 * end of this file. Widening a named list to 256 pairs without the reading behind it would
 * turn an exemption that means "argued" into one that means "not looked at", which is the
 * failure mode the exception discipline exists to stop.
 */
const HAND_READ: ReadonlySet<string> = new Set(["d7", "d9"]);

/**
 * Prompts in a HAND-READ domain that hold nothing this sweep can compare, each with the
 * reason. Asserted in both directions below, so neither a prompt gaining an equation nor a
 * prompt losing one can leave this list describing something that is no longer true.
 */
const NO_SIGNATURE: readonly { node: string; slide: number; why: string }[] = [
  {
    node: "LF.2",
    slide: 3,
    why: "one coordinate and a bare slope: a single point is too weak a signature to rule on, since widgets share lattice points innocently",
  },
  {
    node: "LF.3",
    slide: 0,
    why: "a description in words, with no equation and no coordinates to match",
  },
  {
    node: "LF.3",
    slide: 1,
    why: "a table given in words, whose 'y = 17 at x = 3' readings are bare value statements the generic filter drops",
  },
  {
    node: "TRG.1",
    slide: 0,
    why: "a sweep given entirely in words, 'three quarters of a full turn', with no maths written down at all",
  },
  {
    node: "TRG.1",
    slide: 1,
    why: "one special angle, 225 degrees, which is stock furniture on any degree-to-radian board: too weak to rule on, by the same reasoning that drops 'x = 3'",
  },
  {
    node: "TRG.2",
    slide: 0,
    why: "two bare leg lengths, 7 and 24, with the triangle itself described in words",
  },
  {
    node: "TRG.2",
    slide: 1,
    why: "three bare side lengths, 5, 12 and 13: the ratios are formed in the steps, not in the prompt",
  },
  {
    node: "TRG.2",
    slide: 2,
    why: "one bare side length, 2, for an equilateral triangle described in words",
  },
  {
    node: "TRG.3",
    slide: 0,
    why: "a single point on the unit circle, and one point is too weak a signature to rule on",
  },
  {
    node: "TRG.5",
    slide: 0,
    why: "two bare meter readings, 12 and 2, with no equation between them",
  },
  {
    node: "TRG.7",
    slide: 1,
    why: "the two ends of the quarter turn either side of zero, which the labelling widget on that slide exists to write down: firing on them would be firing on the slide's subject",
  },
  {
    node: "TRG.7",
    slide: 3,
    why: "two bare pace counts, 5 and 12: the tangent they form is written in the steps, not in the prompt",
  },
];

/**
 * The HAND-READ domains' widgets that write down no instance of their own at all, so the
 * comparison against them is a comparison against an empty set and cannot fail whatever their
 * boards deal. Every one is swept and every one would fire the moment it wrote its instance
 * out whole; what this census says is that a green run is not a reading of these, and a
 * reviewer changing their boards owes them a reading by hand.
 *
 * They are silent for the reason the header names: the instance is assembled out of numeric
 * fields through a template string, so no literal ever holds it. `TrigCoterminalSorter` is the
 * clearest illustration and is NOT on this list — it writes enough elsewhere to be reachable —
 * but its own instance is `given: 100`, a number, and a replay of TRG.1 slide 2 through that
 * field would be as invisible as any of these. Being absent from this list is not a clean bill
 * of health; being on it is a specific one.
 *
 * Asserted as a set equality rather than as containment, so it fails whichever way the list
 * and the tree come apart: a widget that starts writing its instance drops off the census and
 * fails, and a widget that goes silent joins it and fails.
 */
const SILENT_WIDGETS: readonly string[] = [
  // D7. The first three are the template-assembled widgets the header names, hand-checked at
  // 65d7cdbf; `LinearModelWalkthrough` joins them for the same reason.
  "./interactive/LinearModelClaimSpot.tsx",
  "./interactive/LinearModelTableBuild.tsx",
  "./interactive/LinearModelRateExplore.tsx",
  "./interactive/LinearModelWalkthrough.tsx",
  // D9. Six of these sit on pairs already exempt in `NO_SIGNATURE`, so the sweep is blind from
  // both ends there and says so twice; the other seven have a comparable prompt held against
  // nothing, which is the case the exemption count on its own would hide.
  "./interactive/TrigAmplitudeSlider.tsx",
  "./interactive/TrigAsymptoteTable.tsx",
  "./interactive/TrigCombineEstimate.tsx",
  "./interactive/TrigComposeSorter.tsx",
  "./interactive/TrigEvenOddSorter.tsx",
  "./interactive/TrigFeatureLabel.tsx",
  "./interactive/TrigGuyWireLabel.tsx",
  "./interactive/TrigInverseEstimate.tsx",
  "./interactive/TrigQuadrantSorter.tsx",
  "./interactive/TrigRadianMatch.tsx",
  "./interactive/TrigRangeLabel.tsx",
  "./interactive/TrigRatioTable.tsx",
  "./interactive/TrigReferenceTable.tsx",
];

/**
 * Pairs that fire but are ruled a near-replay rather than a replay, each with the reason.
 *
 * Asserted in BOTH directions, like every other exception here: the pair must still be swept,
 * so a renamed or deleted slide cannot leave an entry excusing nothing, and it must still
 * FIRE, so an entry cannot go on excusing a board that has since been changed. When somebody
 * fixes one of these, this list is where the failure will point them.
 */
const NEAR_REPLAY_ACCEPTED: readonly {
  node: string;
  slide: number;
  signature: string;
  why: string;
}[] = [
  {
    node: "LIN.3",
    slide: 1,
    signature: "P=2l+2w",
    why: "the same formula with a different SUBJECT: the worked example isolates w and FormulaSubjectTable's row asks for l, so the move is new even though the formula is not. Worth a human look, which is what this sweep is for, and not a defect on the reading of 2026-08-08",
  },
];

/**
 * Confirmed replays whose instance the literal extractor cannot see, because the widget
 * assembles it out of numeric fields.
 *
 * This is the expensive half of the widening, DEFERRED and counted rather than described. The
 * cheap half was widening the population, and it is done. Teaching the extractor to read a
 * board's numeric fields was measured before it was declined: a rule matching a prompt's
 * integers against a run of consecutive numeric fields fires on 7 of the 256 pairs, of which
 * three are real (the RAD.3 and EL.2 entries here), three are innocent, and one confirmed
 * replay (EXP.1 slide 5) is still missed. The three innocent hits are instructive about why
 * a set of integers is the wrong signature: `RAD.4` slide 3 collides because 8 is the even
 * part of 9, `POL.5` slide 3 because roots and factors carry opposite signs, and `FUN.10`
 * slide 2 because the same three numbers sit in different roles. A rule that fires on more
 * innocent boards than guilty ones is not an error tier, and two of those three innocents are
 * in packs another lane owns.
 *
 * So these four boards are held here instead, as a floored census with the property asserted
 * per board. Each entry fails three ways: if the slide stops being a swept pair, if the pack's
 * worked example stops stating the instance the entry names, or if the widget starts holding
 * the board again.
 */
const UNREACHED_BOARDS: readonly {
  domain: string;
  node: string;
  slide: number;
  widget: string;
  /** A fragment the worked example's prompt must still contain, so the entry cannot rot. */
  promptStates: string;
  /** The field spelling of the board that replayed it. Must not be in the widget source. */
  replayed: RegExp;
  why: string;
}[] = [
  {
    domain: "d2",
    node: "EXP.1",
    slide: 5,
    widget: "./interactive/NegativeExponentEstimate.tsx",
    promptStates: "2^{-1}$ and $2^{-2}",
    replayed: /base:\s*2,\s*exponent:\s*-[12]\b/,
    why: "both rounds of the opening board were the two powers the worked example steps down to, in the same order, so the whole board was answered by the text above it",
  },
  {
    domain: "d2",
    node: "RAD.3",
    slide: 3,
    widget: "./interactive/RadicalFormBuilder.tsx",
    promptStates: "x^{4/3}",
    replayed: /\bp:\s*4,\s*q:\s*3\b/,
    why: "the opening round was the worked example's own fraction exponent, so both boxes were copied off the slide",
  },
  {
    domain: "d2",
    node: "RAD.3",
    slide: 4,
    widget: "./interactive/ExponentFormBuilder.tsx",
    promptStates: "\\sqrt[3]{x^{5}}",
    replayed: /\bp:\s*5,\s*q:\s*3\b/,
    why: "the opening round was the worked example's own radical, so the p/q call and both boxes were on screen above",
  },
  {
    domain: "d8",
    node: "EL.2",
    slide: 2,
    widget: "./interactive/ExpTransformBuilder.tsx",
    promptStates: "y = 5 \\cdot 3^{x}",
    replayed: /\ba:\s*5,\s*b:\s*3\b/,
    why: "the opening board was the worked example's coefficient, base and move together, so the coefficient blank held the answer step one prints",
  },
];

/**
 * A board that shares something with the example above it, read, judged, and deliberately left
 * alone. Recorded here rather than in a comment, so the judgement is a thing that can fail.
 *
 * The entry is asserted in BOTH directions, like every other exception in this file. It rots
 * if the slide stops being a swept pair or the example stops working the fact it names; and it
 * is SPENT the moment the widget stops holding the board, because an acceptance that describes
 * nothing is worse than no acceptance at all. So the correct response to this failing green is
 * to delete the entry, not to restore the board.
 */
const ACCEPTED_PARTIALS: readonly {
  domain: string;
  node: string;
  slide: number;
  widget: string;
  /** A fragment the slide's worked example must still work, in its prompt or in a step. */
  exampleWorks: string;
  /** The board that shares it, which must STILL be in the widget source. */
  shared: RegExp;
  why: string;
}[] = [
  {
    domain: "d8",
    node: "EL.6",
    slide: 0,
    widget: "./interactive/EquationSameBaseStepper.tsx",
    exampleWorks: "32 = 2^{5}",
    shared: /\{\s*base:\s*2,\s*shift:\s*1,\s*target:\s*32,\s*power:\s*5\s*\}/,
    why: "the shift is genuine new work the example never does, and stage two is where the board's answer is, so this is a shared FACT rather than a replayed instance. It is not nothing: the one insight the example supplies, that 32 is 2^5, is stage one of the board. It stays because the cheapest safe rewrite (2^{7} = 128) moves the width of the right side, and this widget pins its layout on that width at EQ_X and TIE_REACH, with a rendered-geometry browser test measuring the anchoring against a right side of exactly 32. That test is not runnable in this lane, and a blind edit to it would trade a partial for an unverifiable spatial claim",
  },
];

/**
 * LaTeX and code spelling reduced to one form, so `\dfrac{2}{3}x` and `2/3x` compare.
 *
 * A pack's prompt arrives from JSON with single backslashes; a widget's source arrives as raw
 * text, where the same command is written `\\cos`. Collapsing the double first is what lets
 * one set of rules read both sides, and getting that wrong is not a small error: the rule
 * that used to delete `\\` outright reduced `"\\cos x = \\dfrac{1}{2}"` to `cosx=dfrac{1}{2}`,
 * which is a signature nothing can match, so every D9 widget read as holding no maths.
 *
 * The fraction and root rules are applied repeatedly rather than once, because a D9 numerator
 * is often itself braced: a single pass over `\dfrac{\sqrt{3}}{2}` cannot match, since the
 * inner braces defeat the `[^{}]*` the outer one needs. Innermost first, it flattens.
 */
function canon(text: string): string {
  let out = text.replace(/\\\\/g, "\\").replace(/\\text\{[^{}]*\}/g, " ");
  for (let pass = 0; pass < 4; pass += 1) {
    out = out.replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)");
  }
  for (let pass = 0; pass < 6; pass += 1) {
    out = out.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2");
  }
  return out
    .replace(/\\(left|right|;|,|!|quad|qquad)/g, "")
    .replace(/\\(cdot|times)/g, "*")
    .replace(/\^\{?\\*circ\}?/g, "deg")
    .replace(/\^\{([^{}]*)\}/g, "^$1")
    .replace(/[$\\]/g, "")
    .replace(/\s+/g, "");
}

/** The trigonometric function names, longest first so `arcsin` is not read as `arc` + `sin`. */
const TRIG_NAME = "arcsin|arccos|arctan|sin|cos|tan|csc|sec|cot";

/** A letter run maths writes: a function name, a Greek letter, a root, a unit. */
const MATH_WORD = new RegExp(`^(?:${TRIG_NAME}|theta|alpha|beta|phi|log|ln|sqrt|deg|pi)`);

/** Anything holding a trigonometric function name at all. */
const HAS_TRIG = new RegExp(TRIG_NAME);

/**
 * True when every long letter run decomposes into names maths actually uses.
 *
 * This replaces a flat "no run of three letters" rule, which encoded "every variable is a
 * single letter". That holds in D7 and cannot hold in D9, where every equation carries a
 * function name: `\sin\theta = \dfrac{7}{25}` canonicalizes to `sintheta=7/25`, an eight
 * letter run. What the old rule was really for is prose glued on by the space-stripping, and
 * that is still caught here, because prose does not decompose: `sintheta` is `sin` + `theta`
 * and spends no loose letters, while `y=17atx` spends three in a row on `a`, `t`, `x`.
 *
 * Two loose letters are allowed, and not three, because a real instance needs a few — `tanx`
 * is `tan` + `x`, `xcos` inside `cos5xcos2x` is `x` + `cos` — and no English word survives
 * the limit. It is a heuristic and it is meant to be: it decides what is worth a human look,
 * and the cost of being wrong in either direction is a reviewer reading one pair.
 */
function proseFree(canonical: string): boolean {
  return (canonical.match(/[a-zA-Z]{3,}/g) ?? []).every((run) => {
    let rest = run;
    let loose = 0;
    while (rest.length > 0) {
      const word = MATH_WORD.exec(rest);
      if (word) {
        loose = 0;
        rest = rest.slice(word[0].length);
        continue;
      }
      loose += 1;
      if (loose > 2) {
        return false;
      }
      rest = rest.slice(1);
    }
    return true;
  });
}

/**
 * The `$...$` runs of a prompt, canonicalized one at a time. Canonicalizing a whole prompt
 * would delete the spaces between its words and glue prose onto the maths: `$y = 17$ at
 * $x = 3$` becomes the equation `y=17atx`, which is not something anything could match.
 */
function mathRuns(prompt: string): string[] {
  return (prompt.match(/\$[^$]+\$/g) ?? []).map(canon);
}

/**
 * An equation is only a usable signature when both sides carry structure. `x = 3` and
 * `y = 17` are dropped: they occur innocently all over a lattice widget, and firing on them
 * would get this file deleted by the next author who met it. A run of three letters means
 * prose has been glued on by the space-stripping, and no D7 equation has one: every variable
 * here is a single letter.
 *
 * `_`, `{` and `}` are inside the character class because a subscript is part of the token:
 * without them `\log_{2} 32 = 5` is read as the four-character `32=5` and dropped by the
 * length floor, which is how EL.3's opening board sat on its own worked example unseen.
 * `proseFree` is asked about the token with that punctuation removed, since `log_{2}` and
 * `log2` are the same letter run.
 *
 * A CARET satisfies the structure test in place of a letter. Requiring a letter encodes
 * "an instance names a variable", which is true of `y = 9x + 40` and false of `2^{5} = 32`:
 * the second states an instance exactly as fully, and dropping it left the sweep blind to
 * every exponential and logarithmic statement D8 is built on. Bare arithmetic without a
 * caret is still dropped, so `12 = 4 + 8` is no more a signature than it was.
 */
function equationsIn(canonical: string): string[] {
  const found = canonical.match(/[-+0-9a-zA-Z/().^*_{}]*=[-+0-9a-zA-Z/().^*_{}]+/g) ?? [];
  return found.filter(
    (eq) =>
      eq.length >= 5 &&
      (/[a-zA-Z]/.test(eq) || eq.includes("^")) &&
      /\d/.test(eq) &&
      proseFree(eq.replace(/[_{}]/g, "")) &&
      !/^[a-zA-Z]=-?[\d./]+$/.test(eq),
  );
}

/**
 * A trigonometric expression standing alone, with no `=` anywhere: `\cos(x - 60^{\circ})`,
 * `\arcsin(\sin 150^{\circ})`, `\cos 5x\cos 2x - \sin 5x\sin 2x`. Seven D9 prompts state their
 * whole instance this way, so without this the sweep is blind on a fifth of the domain.
 *
 * The signature is the WHOLE run, unanchored to nothing: a widget matches it only by writing
 * the same expression end to end in one literal. That is deliberately strict. A substring rule
 * would fire on `\sin x` appearing anywhere, which is every trigonometry widget ever written.
 * The digit and length floors drop the fragments — `\sin\theta`, `\cos x` — that name a
 * function without stating an instance.
 */
function trigExpressionsIn(canonical: string): string[] {
  if (canonical.includes("=") || canonical.length < 8) {
    return [];
  }
  if (!HAS_TRIG.test(canonical) || !/\d/.test(canonical)) {
    return [];
  }
  return proseFree(canonical) ? [canonical] : [];
}

/**
 * Angles common enough on a trigonometry board to be furniture rather than an instance: the
 * quadrantal headings and the special angles, plus their reflections round the circle. A board
 * teaching reference angles or radian conversion writes these whatever its own instance is, so
 * matching on one would fire on an innocent widget. This is the same judgement the equation
 * filter already makes when it drops `x = 3`.
 */
const FURNITURE_ANGLES = new Set([
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360,
]);

/**
 * A heading that is the whole instance: `225^{\circ}`, `\dfrac{4\pi}{9}`. Five D9 prompts are
 * nothing but an angle to be converted, sorted or reduced, so the angle is what a replay would
 * have to repeat.
 *
 * The run must be the angle and NOTHING else, which is what keeps this narrow enough to be
 * worth having: `[-90^{\circ}, 90^{\circ}]` is an interval and not an instance, and a heading
 * quoted inside a longer expression is left to `trigExpressionsIn`.
 */
function bareAnglesIn(canonical: string): string[] {
  const degrees = /^(-?\d+)deg$/.exec(canonical);
  if (degrees) {
    return FURNITURE_ANGLES.has(Math.abs(Number(degrees[1]))) ? [] : [canonical];
  }
  return /^-?\(?\d*pi\)?\/\(?\d+\)?$/.test(canonical) && canonical.includes("pi")
    ? [canonical]
    : [];
}

/** Coordinates written as a pair, e.g. `(2, 5)` or `(-1,-2)`, canonically `2,5`. */
function writtenPoints(canonical: string): string[] {
  const out: string[] = [];
  const re = /\((-?\d+),(-?\d+)\)/g;
  let hit = re.exec(canonical);
  while (hit) {
    out.push(`${hit[1]},${hit[2]}`);
    hit = re.exec(canonical);
  }
  return out;
}

/** Coordinates a widget holds as fields: `{ x: -3, y: -2 }`, `x1: -4, y1: -3`. */
function fieldPoints(source: string): string[] {
  const out: string[] = [];
  const shapes = [
    /\bx:\s*(-?\d+(?:\.\d+)?)\s*,\s*y:\s*(-?\d+(?:\.\d+)?)/g,
    /\bx1:\s*(-?\d+(?:\.\d+)?)\s*,\s*y1:\s*(-?\d+(?:\.\d+)?)/g,
    /\bx2:\s*(-?\d+(?:\.\d+)?)\s*,\s*y2:\s*(-?\d+(?:\.\d+)?)/g,
  ];
  for (const re of shapes) {
    let hit = re.exec(source);
    while (hit) {
      out.push(`${hit[1]},${hit[2]}`);
      hit = re.exec(source);
    }
  }
  return out;
}

interface Signatures {
  equations: Set<string>;
  expressions: Set<string>;
  angles: Set<string>;
  points: Set<string>;
}

/**
 * A template hole is not an instance, so `${...}` is removed before a literal is read.
 *
 * This is the price of putting `{` and `}` in the equation character class for D8's
 * subscripts, and it was found by the silence census rather than argued: with the holes left
 * in, `LinearModelTableBuild` yields `x={x3}` and `b={y1}-{sp(m)}({x1})` and drops off
 * `SILENT_WIDGETS`, so a widget that assembles every instance it has out of numeric fields
 * reads as one that writes its instances down. Nothing could ever match those signatures, so
 * no replay was invented; what was corrupted was the census that records where this sweep is
 * BLIND, which is the reading a reviewer trusts when a green run tells them nothing.
 */
function withoutTemplateHoles(literal: string): string {
  return literal.replace(/\$\{[^{}]*\}/g, " ");
}

/** Everything a widget file writes down, in the same canonical spelling as a prompt. */
function widgetSignatures(source: string): Signatures {
  const equations = new Set<string>();
  const expressions = new Set<string>();
  const angles = new Set<string>();
  const points = new Set<string>();
  for (const point of fieldPoints(source)) {
    points.add(point);
  }
  const literals =
    source.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];
  for (const literal of literals) {
    const canonical = canon(withoutTemplateHoles(literal.slice(1, -1)));
    for (const eq of equationsIn(canonical)) {
      equations.add(eq);
    }
    for (const expression of trigExpressionsIn(canonical)) {
      expressions.add(expression);
    }
    for (const angle of bareAnglesIn(canonical)) {
      angles.add(angle);
    }
    for (const point of writtenPoints(canonical)) {
      points.add(point);
    }
  }
  // Header comments are not quoted, so their instances are picked up here rather than above.
  const bare = canon(source.replace(/"(?:[^"\\\n]|\\.)*"/g, " "));
  for (const point of writtenPoints(bare)) {
    points.add(point);
  }
  return { equations, expressions, angles, points };
}

/** How many distinct instances a widget writes down, for the floor under the comparison. */
function signatureCount(signatures: Signatures): number {
  return (
    signatures.equations.size +
    signatures.expressions.size +
    signatures.angles.size +
    signatures.points.size
  );
}

interface Pair {
  domain: string;
  node: string;
  slide: number;
  widget: string;
  prompt: string;
  equations: string[];
  expressions: string[];
  angles: string[];
  points: string[];
}

/** Whether a pair holds anything at all that could be matched against a widget. */
function isComparable(pair: Pair): boolean {
  return (
    pair.equations.length > 0 ||
    pair.expressions.length > 0 ||
    pair.angles.length > 0 ||
    pair.points.length >= 2
  );
}

/**
 * `"linear-slope-ratio-table": { Svg: LinearSlopeRatioTable }` -> the widget's source path.
 *
 * A handful of visuals are declared inline in `visuals.tsx` rather than in their own file —
 * `pemdas-solver` and `pemdas-solver-ltr` are both defined there — so the fallback is the
 * registry itself, which really is where that widget's source lives. A wide sweep that
 * silently skipped them would be reporting on a population two pairs smaller than it claimed.
 */
function widgetPathFor(visualId: string): string {
  const registry = SOURCES["./visuals.tsx"] ?? "";
  const hit = new RegExp(`"${visualId}":\\s*\\{\\s*Svg:\\s*(\\w+)`).exec(registry);
  if (!hit) {
    throw new Error(`visuals.tsx has no Svg entry for "${visualId}"`);
  }
  const own = `./interactive/${hit[1]}.tsx`;
  return SOURCES[own] ? own : "./visuals.tsx";
}

/** `../../../../content/lessons/d3/LIN.3.json` -> `d3`. */
function domainOf(globKey: string): string {
  const hit = /\/content\/lessons\/([^/]+)\//.exec(globKey);
  if (!hit) {
    throw new Error(`cannot read a domain out of ${globKey}`);
  }
  return hit[1] as string;
}

const PAIRS: Pair[] = [];
for (const [globKey, pack] of Object.entries(PACKS)) {
  const domain = domainOf(globKey);
  const node = pack.node_id;
  const worked = pack.worked_examples ?? [];
  const visuals = pack.visuals ?? [];
  (pack.mini_lesson ?? []).forEach((_section, slide) => {
    const prompt = worked[slide]?.prompt;
    const visual = visuals.find((entry) => entry.after === slide);
    if (!prompt || !visual) {
      return;
    }
    const runs = mathRuns(prompt);
    PAIRS.push({
      domain,
      node,
      slide,
      widget: widgetPathFor(visual.id),
      prompt,
      equations: runs.flatMap(equationsIn),
      expressions: runs.flatMap(trigExpressionsIn),
      angles: runs.flatMap(bareAnglesIn),
      points: runs.flatMap(writtenPoints),
    });
  });
}

const HAND_READ_PAIRS = PAIRS.filter((pair) => HAND_READ.has(pair.domain));
const WIDENED_PAIRS = PAIRS.filter((pair) => !HAND_READ.has(pair.domain));

function liveAtBothEnds(pairs: readonly Pair[]): Pair[] {
  return pairs.filter(
    (pair) =>
      isComparable(pair) &&
      signatureCount(widgetSignatures(SOURCES[pair.widget] ?? "")) > 0,
  );
}

describe("the extractor reads the shapes D7 writes", () => {
  it("canonicalizes LaTeX fractions and spacing to code spelling", () => {
    expect(canon("$y = -\\dfrac{2}{3}x + 4$")).toBe("y=-2/3x+4");
    expect(canon('"x + 2y = 11"')).toBe('"x+2y=11"');
  });

  it("reads a widget source's doubled backslashes as the commands they spell", () => {
    // The shape every D9 widget writes, as it stands in the raw source. Collapsing `\\` to
    // nothing rather than to `\` leaves `cosx=dfrac{1}{2}`, which matches no prompt and so
    // empties the widget side of the sweep without emptying the prompt side.
    expect(canon("\\\\cos x = \\\\dfrac{1}{2}")).toBe("cosx=1/2");
    expect(canon("$\\cos x = \\dfrac{1}{2}$")).toBe("cosx=1/2");
  });

  it("keeps structural equations and drops bare value statements", () => {
    expect(
      mathRuns("The model $y = 9x + 40$ gives the cost.").flatMap(equationsIn),
    ).toEqual(["y=9x+40"]);
    expect(mathRuns("A table gives $y = 17$ at $x = 3$.").flatMap(equationsIn)).toEqual([]);
  });

  it("does not let space-stripping glue prose into an equation", () => {
    expect(equationsIn(canon("$y = 17$ at $x = 3$"))).toEqual([]);
  });

  it("reads coordinates from prose and from widget fields", () => {
    expect(
      mathRuns("A table records $(2, 5)$ and $(4, 13)$.").flatMap(writtenPoints),
    ).toEqual(["2,5", "4,13"]);
    expect(fieldPoints("const ANCHOR = { x: -3, y: -2 };")).toEqual(["-3,-2"]);
    expect(fieldPoints("  x1: -4,\n  y1: -3,")).toEqual(["-4,-3"]);
  });

  it("finds a system a widget declares, so the sweep is not reading an empty set", () => {
    const source = SOURCES["./interactive/LinearSystemSubstitutePlay.tsx"] ?? "";
    expect(source).not.toBe("");
    expect(widgetSignatures(source).equations).toContain("x+2y=11");
  });
});

describe("the extractor reads the shapes D9 writes", () => {
  it("keeps an equation whose variable is a function name", () => {
    expect(
      mathRuns("A meter reads $\\sin\\theta = \\dfrac{7}{25}$.").flatMap(equationsIn),
    ).toEqual(["sintheta=7/25"]);
    expect(mathRuns("Solve $4\\cos x = -2$.").flatMap(equationsIn)).toEqual(["4cosx=-2"]);
  });

  it("still refuses prose that space-stripping has glued into an equation", () => {
    // The check the three-letter rule used to make. `cost` is the trap: it decomposes as
    // `cos` + one loose letter, so the sentence around it is what has to do the refusing.
    expect(equationsIn(canon("$y = 17$ at $x = 3$"))).toEqual([]);
    expect(equationsIn(canon("the running cost is $y = 9x$"))).toEqual([]);
  });

  it("flattens a fraction whose numerator is itself braced", () => {
    expect(canon("$\\cos\\theta = \\dfrac{\\sqrt{3}}{2}$")).toBe("costheta=sqrt(3)/2");
    expect(
      mathRuns("A meter reads $\\cos\\theta = \\dfrac{\\sqrt{3}}{2}$.").flatMap(
        equationsIn,
      ),
    ).toEqual(["costheta=sqrt(3)/2"]);
  });

  it("reads an expression that states its instance with no equals sign", () => {
    expect(mathRuns("Expand $\\cos(x - 60^{\\circ})$.").flatMap(trigExpressionsIn)).toEqual(
      ["cos(x-60deg)"],
    );
    expect(
      mathRuns("Write $\\cos 5x\\cos 2x - \\sin 5x\\sin 2x$ as one function.").flatMap(
        trigExpressionsIn,
      ),
    ).toEqual(["cos5xcos2x-sin5xsin2x"]);
    // A function named without an instance behind it is not a signature.
    expect(mathRuns("the value of $\\sin x$").flatMap(trigExpressionsIn)).toEqual([]);
    expect(mathRuns("a reading $\\sin\\theta = 1$").flatMap(trigExpressionsIn)).toEqual([]);
  });

  it("reads a bare heading, and refuses the ones that are board furniture", () => {
    expect(mathRuns("aimed at $310^{\\circ}$").flatMap(bareAnglesIn)).toEqual(["310deg"]);
    expect(
      mathRuns("a heading of $\\dfrac{4\\pi}{9}$ radians").flatMap(bareAnglesIn),
    ).toEqual(["4pi/9"]);
    expect(
      mathRuns("the special angles $45^{\\circ}$ and $90^{\\circ}$").flatMap(bareAnglesIn),
    ).toEqual([]);
    // An interval is not a heading, so the range of arcsine does not become two signatures.
    expect(bareAnglesIn(canon("$[-90^{\\circ}, 90^{\\circ}]$"))).toEqual([]);
  });

  it("finds the LaTeX instances a D9 widget declares", () => {
    const source = SOURCES["./interactive/TrigSweepPlay.tsx"] ?? "";
    expect(source).not.toBe("");
    const { equations } = widgetSignatures(source);
    expect(equations).toContain("cosx=1/2");
    expect(equations).toContain("sinx=-sqrt(3)/2");
  });
});

describe("the extractor reads the shapes D8 writes", () => {
  it("keeps an equation whose base carries a subscript", () => {
    // Without `_{}` in the character class the token is `32=5`, four characters, which the
    // length floor drops. That is exactly how EL.3's opening board went unseen.
    expect(
      mathRuns("Write $\\log_{2} 32 = 5$ in exponential form.").flatMap(equationsIn),
    ).toEqual(["log_{2}32=5"]);
  });

  it("keeps a purely numeric statement when a caret makes it an instance", () => {
    expect(
      mathRuns("and write $7^{3} = 343$ in logarithmic form.").flatMap(equationsIn),
    ).toEqual(["7^3=343"]);
    expect(mathRuns("Rewrite $2^{5} = 32$.").flatMap(equationsIn)).toEqual(["2^5=32"]);
  });

  it("still refuses arithmetic that states no instance", () => {
    // The letter rule is relaxed by a caret and by nothing else, so a bare sum is no more a
    // signature than it was: every lattice widget writes these.
    expect(mathRuns("since $12 = 4 + 8$").flatMap(equationsIn)).toEqual([]);
    expect(mathRuns("the total $100 = 40 + 60$").flatMap(equationsIn)).toEqual([]);
  });

  it("does not read a template hole as an instance", () => {
    // Demonstrated by the silence census before it was fixed: with `${...}` left in, these
    // two lines take `LinearModelTableBuild` off `SILENT_WIDGETS` and the census reports a
    // template-assembled widget as one that writes its instances down.
    expect(widgetSignatures(`const a = \`x = \${x3}\`;`).equations.size).toBe(0);
    expect(
      widgetSignatures(`const b = \`b = \${y1} - \${sp(m)}(\${x1}) = \${b}\`;`).equations
        .size,
    ).toBe(0);
    // And the subscripts the character class was widened for still read, so the fix is not
    // just the widening undone.
    expect(widgetSignatures('const c = "\\\\log_{2} 64 = 6";').equations).toContain(
      "log_{2}64=6",
    );
  });

  it("finds the logarithmic statements a D8 widget declares", () => {
    const source = SOURCES["./interactive/LogFormMatch.tsx"] ?? "";
    expect(source).not.toBe("");
    const { equations } = widgetSignatures(source);
    // A floor under the reading, so a widget that stopped writing its boards out would not
    // read as clean here.
    expect(equations.size).toBeGreaterThanOrEqual(4);
    expect(equations).toContain("log_{2}64=6");
  });
});

describe("every domain's worked examples against the widgets on their slides", () => {
  it("pairs every three-section slide in the tree with the widget mounted on it", () => {
    // Derived from `content/lessons` rather than from a domain list, and floored, so a
    // resolution that silently dropped slides fails instead of sweeping a short list.
    expect(Object.keys(PACKS).length).toBeGreaterThanOrEqual(60);
    expect(PAIRS.length).toBeGreaterThanOrEqual(240);
    for (const pair of PAIRS) {
      expect(SOURCES[pair.widget], `${pair.widget} is not a readable source`).toBeTruthy();
    }
  });

  /**
   * The composition assertion, and the reason it sits beside the floor rather than inside it.
   *
   * A floor of 240 is satisfied by D7's 16 and D9's 36 plus 188 of anything, so a count alone
   * cannot say that this sweep reaches the domains it used to exclude. The claim being made is
   * about SHAPE: every domain directory on disk is swept, and the pairs outside the two that
   * used to be the whole population are the large majority. Both are asserted, so a population
   * that drifted back to D7 and D9 fails here even while the total held.
   */
  it("reaches every domain, and is not carried by the two it used to stop at", () => {
    const swept = new Set(PAIRS.map((pair) => pair.domain));
    const onDisk = new Set(Object.keys(PACKS).map(domainOf));
    expect(onDisk.size).toBeGreaterThanOrEqual(10);
    expect([...swept].sort()).toEqual([...onDisk].sort());
    // The population this file used to have, and what the widening added beside it.
    expect(HAND_READ_PAIRS.length).toBeGreaterThanOrEqual(52);
    expect(WIDENED_PAIRS.length).toBeGreaterThanOrEqual(190);
    for (const domain of onDisk) {
      expect(
        PAIRS.filter((pair) => pair.domain === domain).length,
        `${domain} contributes no pair, so the sweep is not reaching it`,
      ).toBeGreaterThan(0);
    }
  });

  it("has a comparable signature for every hand-read pair not named as an exception", () => {
    const listed = new Set(NO_SIGNATURE.map((entry) => `${entry.node}/${entry.slide}`));
    const bare: string[] = [];
    for (const pair of HAND_READ_PAIRS) {
      const key = `${pair.node}/${pair.slide}`;
      if (!isComparable(pair) && !listed.has(key)) {
        bare.push(`${key} yields no equation, expression, heading or pair of coordinates`);
      }
      if (isComparable(pair) && listed.has(key)) {
        bare.push(`${key} is listed as having no signature but now yields one`);
      }
    }
    expect(bare).toEqual([]);
    // Every listed exception must be a pair that exists, so a renamed or deleted slide cannot
    // sit here exempting nothing.
    const swept = new Set(HAND_READ_PAIRS.map((pair) => `${pair.node}/${pair.slide}`));
    for (const entry of NO_SIGNATURE) {
      expect(
        swept.has(`${entry.node}/${entry.slide}`),
        `${entry.node}/${entry.slide} is a declared exception that is no longer a swept pair`,
      ).toBe(true);
    }
    expect(HAND_READ_PAIRS.length - NO_SIGNATURE.length).toBeGreaterThanOrEqual(40);
  });

  /**
   * The floor under the comparison itself. A comparable prompt held against a widget that
   * writes nothing compares an instance to an empty set, which cannot fail, so counting the
   * exemptions alone would call a completely blind sweep fully covered.
   *
   * The per-domain floor is not decoration: collapsing `\\` to nothing in `canon` again takes
   * D9 from 20 to 17 and fails here, while the total clears its floor, so a defect confined to
   * the domain that spells its maths in LaTeX is invisible to the total. The floor on the
   * widened domains is the same argument one level up: D7 and D9 hold half the live pairs
   * between them, so a total floor could be met with nothing live outside them at all.
   *
   * These floors carry a little slack, unlike the exemption floor above, and the difference
   * is deliberate: an exemption is a decision somebody makes, so its floor is set flush and
   * moving it should take an edit, whereas a live count moves whenever a widget rephrases a
   * label. What the slack must not cover is a collapse.
   */
  it("holds each instance against a widget that writes instances of its own", () => {
    const live = liveAtBothEnds(PAIRS);
    expect(live.length).toBeGreaterThanOrEqual(52);
    expect(live.filter((pair) => pair.domain === "d9").length).toBeGreaterThanOrEqual(18);
    expect(live.filter((pair) => pair.domain === "d7").length).toBeGreaterThanOrEqual(10);
    expect(
      liveAtBothEnds(WIDENED_PAIRS).length,
      "the widened domains carry no live pair of their own",
    ).toBeGreaterThanOrEqual(24);
  });

  it("names the hand-read widgets that write no instance a literal signature can reach", () => {
    const silent = HAND_READ_PAIRS.filter(
      (pair) => signatureCount(widgetSignatures(SOURCES[pair.widget] ?? "")) === 0,
    ).map((pair) => pair.widget);
    expect(silent.sort()).toEqual([...SILENT_WIDGETS].sort());
    // The census is a record of where the sweep is blind, so it must not be allowed to grow
    // into a description of the whole population.
    expect(silent.length).toBeLessThan(HAND_READ_PAIRS.length / 2);
  });

  it("never deals an instance the worked example above it has already solved", () => {
    const accepted = new Set(
      NEAR_REPLAY_ACCEPTED.map(
        (entry) => `${entry.node}/${entry.slide}/${entry.signature}`,
      ),
    );
    const fired = new Set<string>();
    const replays: string[] = [];
    for (const pair of PAIRS) {
      const source = SOURCES[pair.widget] ?? "";
      const { equations, expressions, angles, points } = widgetSignatures(source);
      const named: { kind: string; held: Set<string>; mine: string[] }[] = [
        { kind: "deals", held: equations, mine: pair.equations },
        { kind: "writes", held: expressions, mine: pair.expressions },
        { kind: "asks about the heading", held: angles, mine: pair.angles },
      ];
      for (const { kind, held, mine } of named) {
        for (const signature of mine) {
          if (!held.has(signature)) {
            continue;
          }
          const key = `${pair.node}/${pair.slide}/${signature}`;
          fired.add(key);
          if (accepted.has(key)) {
            continue;
          }
          replays.push(
            `${pair.node} slide ${pair.slide}: ${pair.widget} ${kind} "${signature}", which its worked example already solves: ${pair.prompt}`,
          );
        }
      }
      if (pair.points.length >= 2 && pair.points.every((point) => points.has(point))) {
        replays.push(
          `${pair.node} slide ${pair.slide}: ${pair.widget} holds every coordinate of its worked example (${pair.points.join(" ")}): ${pair.prompt}`,
        );
      }
    }
    expect(replays).toEqual([]);
    // The other direction of the exception list: an accepted near-replay that has stopped
    // firing is excusing nothing, and the entry has to go rather than sit here forever.
    for (const entry of NEAR_REPLAY_ACCEPTED) {
      expect(
        fired.has(`${entry.node}/${entry.slide}/${entry.signature}`),
        `${entry.node} slide ${entry.slide} no longer deals "${entry.signature}", so its entry in NEAR_REPLAY_ACCEPTED excuses nothing and should be deleted`,
      ).toBe(true);
    }
  });
});

/**
 * The deferred half, counted so it cannot be quietly forgotten.
 *
 * Everything above is a claim about instances written down as literals. The boards below were
 * confirmed replays by hand and are invisible to that, because the instance lives in numeric
 * fields; and behind them sits a much larger set of pairs whose prompt yields no comparable
 * signature at all. Neither is described in a comment, because a comment cannot fail. Both are
 * counted here, with a floor under the count: closing part of this gap takes an edit to this
 * file, which is the point.
 */
describe("what this sweep still cannot see, counted rather than described", () => {
  it("holds each confirmed field-assembled replay against the widget that dealt it", () => {
    // A floor on the record itself, so entries cannot be dropped one at a time until the
    // deferral has quietly become nothing.
    expect(UNREACHED_BOARDS.length).toBeGreaterThanOrEqual(4);
    const stale: string[] = [];
    const held: string[] = [];
    for (const entry of UNREACHED_BOARDS) {
      const pair = PAIRS.find(
        (candidate) =>
          candidate.domain === entry.domain &&
          candidate.node === entry.node &&
          candidate.slide === entry.slide,
      );
      if (!pair) {
        stale.push(`${entry.node} slide ${entry.slide} is no longer a swept pair`);
        continue;
      }
      if (pair.widget !== entry.widget) {
        stale.push(
          `${entry.node} slide ${entry.slide} now mounts ${pair.widget}, not ${entry.widget}`,
        );
        continue;
      }
      // The entry names an instance, so it rots the moment the worked example stops stating
      // it. Without this the regex below could go on passing over a slide about something
      // else entirely.
      if (!pair.prompt.includes(entry.promptStates)) {
        stale.push(
          `${entry.node} slide ${entry.slide} no longer states "${entry.promptStates}": ${pair.prompt}`,
        );
        continue;
      }
      if (entry.replayed.test(SOURCES[entry.widget] ?? "")) {
        held.push(
          `${entry.node} slide ${entry.slide}: ${entry.widget} still holds the board matching ${String(entry.replayed)}, which its worked example already works (${entry.why})`,
        );
      }
    }
    expect(stale).toEqual([]);
    expect(held).toEqual([]);
  });

  it("keeps the partial that was read and judged rather than fixed", () => {
    expect(ACCEPTED_PARTIALS.length).toBeGreaterThanOrEqual(1);
    for (const entry of ACCEPTED_PARTIALS) {
      const pair = PAIRS.find(
        (candidate) =>
          candidate.domain === entry.domain &&
          candidate.node === entry.node &&
          candidate.slide === entry.slide,
      );
      expect(
        pair?.widget,
        `${entry.node} slide ${entry.slide} no longer mounts ${entry.widget}`,
      ).toBe(entry.widget);
      const pack = Object.values(PACKS).find(
        (candidate) => candidate.node_id === entry.node,
      );
      const example = pack?.worked_examples?.[entry.slide];
      const written = [example?.prompt ?? "", ...(example?.steps ?? [])].join(" ");
      expect(
        written,
        `${entry.node} slide ${entry.slide}'s worked example no longer works "${entry.exampleWorks}", so this acceptance is about something else`,
      ).toContain(entry.exampleWorks);
      expect(
        entry.shared.test(SOURCES[entry.widget] ?? ""),
        `${entry.node} slide ${entry.slide}: ${entry.widget} no longer holds the board matching ${String(entry.shared)}, so this acceptance excuses nothing and the entry should be deleted (${entry.why})`,
      ).toBe(true);
    }
  });

  /**
   * The size of the blind spot, floored and capped.
   *
   * The floor is what stops the deferral being forgotten: the day somebody teaches the
   * extractor to read a board's numeric fields, this number drops and the test fails, which
   * forces the new figure to be written down and argued rather than absorbed. The cap is the
   * ordinary direction: the sweep must not go blinder than it is.
   */
  it("counts the pairs whose prompt yields nothing this sweep can compare", () => {
    const uncomparable = PAIRS.filter((pair) => !isComparable(pair));
    expect(uncomparable.length).toBeGreaterThanOrEqual(120);
    expect(uncomparable.length).toBeLessThanOrEqual(170);
    // And the same reading per domain for the two that hold every confirmed replay, since a
    // total this size can absorb one domain going completely blind. D2 already IS completely
    // blind: all 31 of its prompts state the instance in prose or in a figure the literal
    // extractor cannot read, which is why all three of its confirmed replays sit in
    // `UNREACHED_BOARDS` rather than in the sweep above. That is asserted as an equality and
    // not as a cap, because a cap set at the domain's own population cannot fail: the day one
    // D2 prompt becomes readable, this fails and the deferral has to be re-counted rather
    // than quietly shrinking.
    const d2 = PAIRS.filter((pair) => pair.domain === "d2");
    expect(d2.length).toBeGreaterThanOrEqual(31);
    expect(uncomparable.filter((pair) => pair.domain === "d2").length).toBe(d2.length);
    // D8 is partly readable, 14 of its 24 uncomparable when this was measured, so its cap sits
    // below its population where it can fail.
    expect(uncomparable.filter((pair) => pair.domain === "d8").length).toBeLessThanOrEqual(
      16,
    );
  });
});
