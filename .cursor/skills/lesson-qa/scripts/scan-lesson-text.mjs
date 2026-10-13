#!/usr/bin/env node
/**
 * scan-lesson-text.mjs : the RENDERING-ARTIFACT sweep a QA pass runs over a domain's
 * lesson packs.
 *
 * It is the companion to `.cursor/skills/author/scripts/validate-lesson-pack.mjs`, not a
 * replacement. That script judges STRUCTURE and TEACHING REGISTER (gating, interactive
 * ids, em-dashes, density, meta-commentary, captions, cfu presence). This one judges
 * whether the strings a learner reads will RENDER, which is a different failure mode: the
 * pack is well formed, the prose is good, and the slide still shows `[object Object]` or a
 * radical with nothing under it.
 *
 * Every rule here is a defect class that shipped at least once and that no other check in
 * the repo covers for lesson prose:
 *
 *   1. UNBALANCED_MATH   an odd number of unescaped `$`, so one span never closes and the
 *                        rest of the sentence renders as run-on math.
 *   2. UNICODE_OPERATOR  a Unicode operator inside `$...$`. KaTeX passes `×` and `·`
 *                        straight through, so the slide looks almost right and the LaTeX
 *                        is wrong. Use `\times`, `\cdot`, `\div`, `-`.
 *   3. COLLAPSED_RADICAL `\sqrt` with no radicand, or a bare `√`. A radical with nothing
 *                        under it is a different and false statement.
 *   4. OBJECT_LITERAL    the string `[object Object]`, i.e. an object interpolated into a
 *                        template literal somewhere upstream.
 *   5. NUMERAL_ADJACENCY a math span ending on a digit, a full stop, then a math span
 *                        opening on a digit, which reads as one number with a decimal
 *                        point in it (`= $8$. $8 \cdot 8 = 64$` reads as "8.8").
 *   6. BANNED_PHRASE     a sentence a reviewer has already rejected, reintroduced. This is
 *                        the one rule whose findings are not a rendering fault: it exists
 *                        because a phrase cut in one round has come back in a later one,
 *                        and prose that is only wrong in a reviewer's memory is not
 *                        enforced at all. See BANNED_PHRASES.
 *
 * TWO SURFACES, stated so neither gap is mistaken for coverage.
 *
 * Lesson pack JSON gets all six rules. Every string a pack holds is a field this script
 * reads by name, so the sweep over a pack is exhaustive.
 *
 * THAT SENTENCE WAS FALSE UNTIL 2026-08-01, in two fields, and how it was caught matters more
 * than that it was. `learnerStrings` read `title`, `mini_lesson`, per-visual captions,
 * `cfu.prompt`, `cfu.hint` and `cfu.accepted`, and read neither `slide_subtitles` nor
 * `cfu.worked_solution`. Nothing reported that, because a field nobody reads produces no
 * findings and that is indistinguishable from a clean one. It surfaced only because era nine's
 * fix lane added four ledger entries quoting `cfu.worked_solution` and INJECTED them: six of ten
 * new entries fired and those four matched nothing. Both fields are read now, and the widened
 * surface was measured over all 8 lesson directories, 39 packs, 1883 strings where the old
 * surface saw 1552: rules 1 to 5 report zero new findings, so the only thing the gap was hiding
 * was the ledger's own reach. `cfu.worked_solution` is also the copy a learner reads after a
 * miss, which is the surface R33 is entirely about, so it was the worst of the two to be blind
 * to. The general lesson: a ledger entry is not evidence until it has been watched to fire.
 *
 * `worked_examples[i][j]` was added on 2026-08-02, in the same change that made R34's section 2
 * authorable, so that this field is the first one here NOT added after a ledger entry silently
 * matched nothing. It is prose a learner reads between the lecture bubble and the widget, so all
 * six rules apply to it exactly as they do to `cfu.worked_solution`, which it shares a renderer
 * with.
 *
 * WIDGET COPY in TSX gets rule 6 and nothing else, and only where a path to it is passed
 * (`apps/web/src/lessons/interactive`). Rule 6 alone because rules 1 to 5 all describe
 * `$...$` prose conventions that widget copy does not use: widget math goes through
 * `<InlineMath latex="..." />`, not through math spans. MEASURED, rather than assumed, and
 * re-measured on 2026-07-28 at `3ca8156`: rules 1 to 5 over the widget corpus (105 files)
 * report 9 findings, EVERY one of them UNBALANCED_MATH and every one a regex literal's end
 * anchor (`/^-?\d+(?:\.\d+)?$/`) counted as an unclosed math delimiter. All false positives
 * and no true ones, so they are scoped out rather than tuned around, on the same grounds as
 * the two rejected rules recorded below. What has to hold is that the findings are ALL of
 * that one shape; the tally is not the claim and moves as widgets land (this line read "4
 * findings over the 104 widget sources" when it was written). To re-take it: copy this file
 * and call `scanString` instead of `scanBannedPhrases` inside `scanWidget`.
 *
 * Rule 6 needs none of that machinery. Its shortest entry is 53 characters over 9 words,
 * and identifiers, imports, class names and test ids hold no spaces at all, so they cannot
 * contain one. Measured rather than argued, and re-measured at the same tip: the sweep over
 * `apps/web/src` (248 files, 1634 prose-shaped runs) and over `packages` and `engines`
 * reports ZERO findings, so the rule does not fire on ordinary TypeScript.
 *
 * The ZERO is the claim. The file counts are not, and the `packages`/`engines` one is not
 * even a property of the tree: it reads **144 files on a clean checkout and 367 after
 * `tsc --build`**, because this script walks the emitted `.d.ts` under each package's
 * `dist/` exactly as it walks source. So SAY WHICH STATE YOU MEASURED IN. This line first
 * recorded 346 files there and the obvious reading -- that it had gone stale -- is wrong:
 * 346 is a BUILT-tree figure, and calling it an error is the mistake the ambiguity invites.
 *
 * The widget half exists because the ledger was JSON-only while the same rejected sentence
 * was live, reworded, in the widget on the same slide (`PowerOfPowerMatch`), so the guard
 * was blind to exactly the surface the objection was about.
 *
 * Practice PROMPTS, HINTS and WORKED SOLUTIONS are computed by `generate()` in TypeScript,
 * and the SENTENCE a learner reads is assembled at run time from interpolated parts. That
 * sentence exists in no source file and cannot be reached from a Node-only script, so it is
 * swept by the vitest guards instead (`apps/web/src/lessons/visualsMath.test.tsx` for what
 * the diagrams render, `validateTemplates` for hints and steps). See the skill's
 * `reference.md`.
 *
 * The LITERAL half of that prose is a different matter, and reading the paragraph above as
 * covering it is what would let a banned sentence sit live in `packages/item-bank/src/d10`
 * while a clean sweep was reported (D10 round 1, X-6, measured there by injecting each of
 * that round's new entries into its own surface). Any sentence authored whole as a quoted
 * literal in an item-bank source is `.ts` under a path this script walks, so rule 6 reaches
 * it on exactly the terms it reaches widget copy — but only where that path is PASSED, which
 * `content/lessons/<domain>` alone never is. The skill's documented invocation therefore
 * names `packages/item-bank/src/<domain>` as a third path. Guards and third path are not
 * alternatives: the guards own the assembly, the third path owns the literals.
 *
 * The same argument reaches one file that is neither a pack, a widget nor an item-bank
 * source. `apps/web/src/lessons/cfuVariants.ts` holds the hints and worked solutions for
 * EVERY domain's CFU variants, authored whole as quoted literals, and it sits beside the
 * widget directory rather than inside it, so the widget path never opens it (D2 round 1,
 * P1-3, measured by planting a banned sentence there and watching the three-path invocation
 * report OK on it). It was named as a fourth path for that reason, and as a FILE rather than
 * by widening the widget path to `apps/web/src/lessons`, on the grounds that the directory
 * would pull in 112 further files that no ledger entry had been written against. That last
 * clause is the part that did not hold, and the note below records why.
 *
 * And it reaches one directory more: `apps/web/src/lessons/worked`, the worked-solution and
 * CFU figure copy a learner reads AFTER being marked wrong, which is neither `interactive`
 * nor an item-bank sibling and so was opened by no documented invocation until D4 round 2
 * (672 prose-shaped runs across 45 files at `68c5aa9a`).
 *
 * THE LIST WENT SHORT FOUR TIMES AND IS NOW A DIRECTORY. Every surface named in the four
 * paragraphs above lives under `apps/web/src/lessons`, and each was added one at a time,
 * by a round that wrote itself up as having closed the question; the round after it named a
 * different missing one. Nothing about having named five makes the sixth visible, so the
 * documented invocation stopped enumerating them: the shared surface is the TREE, swept
 * recursively, and the sixth file is covered the day it lands. Measured at `3e3b2f54`, the
 * five-path form read 5621 prose-shaped runs over 351 files and the tree reads 5928 over
 * 422 — 307 runs across 23 root-level files that no named path had ever opened, the largest
 * `workedSolutionVisuals.tsx` at 216, hidden precisely because the list named `worked/` and
 * that file is its SIBLING. All clean, so coverage rather than a defect. The widening is
 * free of false positives for the reason recorded above: rule 6 is the only rule that runs
 * over a `.ts`/`.tsx` source and it reports zero findings on ordinary TypeScript.
 *
 * Methodology note, the same one the `author` validator records: every rule below was
 * measured against all four shipped domains (d1, d2, d5, d7) and reports zero findings on
 * them. A rule that cries wolf gets the whole sweep ignored, so a rule with a false
 * positive is removed rather than tuned around.
 *
 * TWO CANDIDATE RULES WERE MEASURED AND REJECTED, recorded so they are not proposed again:
 *  - A slash-fraction rule (`3/4` inside a math span, where `\dfrac` belongs) fires 14
 *    times on D2 `RAD.3`, every hit a rational EXPONENT (`8^{1/3}`, `x^{5/3}`), which is
 *    the conventional way to write one and is content that has passed review. The rule is
 *    right for a standalone diagram row, which is why `visualsMath.test.tsx` keeps it, and
 *    wrong for prose, where a superscript is the common case.
 *  - Digit adjacency across ANY separator fires on `$30$: $0.2 \times 30$` (D1 `NUM.5`)
 *    and `powers of $2$: $2^{3} = 8$` (D2 `EXP.1`). A colon separates the two numbers
 *    perfectly well; only a full stop can be misread as a decimal point, so rule 5 is
 *    narrowed to that.
 *
 * Usage. The DOCUMENTED shape is the three-path one, and the others below are spot checks
 * rather than a review's invocation:
 *   node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
 *     content/lessons/<domain> apps/web/src/lessons packages/item-bank/src/<domain>
 *   node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs content/lessons/d1 content/lessons/d2
 *   node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs pack.json
 *   node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs apps/web/src/lessons/cfuVariants.ts
 *
 * Exit code 0 = clean; 1 = one or more findings; 2 = bad invocation.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Unicode notation that must never reach KaTeX. Same list as the `NOT_LATEX` guard in
 * `apps/web/src/lessons/visualsMath.test.tsx`, applied to authored prose rather than to
 * rendered diagram output, because the two surfaces are authored in different files and
 * only the diagrams had a guard.
 */
const UNICODE_OPERATORS = [
  { glyph: "\u00d7", write: "\\times" },
  { glyph: "\u00f7", write: "\\div" },
  { glyph: "\u00b7", write: "\\cdot" },
  { glyph: "\u2212", write: "-" },
  { glyph: "\u221a", write: "\\sqrt{...}" },
  { glyph: "\u221b", write: "\\sqrt[3]{...}" },
  { glyph: "\u221c", write: "\\sqrt[4]{...}" },
  { glyph: "\u2264", write: "\\le" },
  { glyph: "\u2265", write: "\\ge" },
  { glyph: "\u2260", write: "\\ne" },
];

/**
 * `\sqrt` whose radicand is missing. The optional `[n]` index is allowed to sit between,
 * so `\sqrt[3]{8}` passes and `\sqrt[3]` alone does not.
 */
const COLLAPSED_SQRT = /\\sqrt\s*(\[[^\]]*\]\s*)?(\{\s*\}|$|[^{[])/;

/**
 * A digit closing one math span, a full stop, then a digit opening the next.
 *
 * Only the full stop, deliberately: it is the one separator that doubles as a decimal
 * point, so it is the one that makes `= $8$. $8 \cdot 8 = 64$` read as "8.8". A colon or a
 * comma between the same two numbers is unambiguous, and treating those as findings put
 * this rule on shipped D1 and D2 content that reads perfectly well.
 */
const NUMERAL_ADJACENCY = /\d\$\.\s*\$-?\d/;

/**
 * Sentences a reviewer has rejected, which must not come back.
 *
 * Every other rule in this file describes a defect class. This one is a LEDGER: each entry
 * is a specific string that was cut from shipped content on a specific objection, and the
 * rule's only job is to make the cut permanent. It is here because removing a sentence and
 * remembering that it was removed are different things, and only the first of them was ever
 * being done: a phrase quoted verbatim in one review round was reported fixed and was still
 * live in the next.
 *
 * ADDING TO THIS LIST is the last step of acting on a prose objection, after the edit. Give
 * the whole sentence rather than a fragment: a fragment bans the words instead of the claim
 * and will eventually fire on prose nobody objected to, which is how a sweep gets ignored.
 * `why` is printed with the finding, so whoever trips it learns the objection rather than
 * just being told no.
 *
 * ONE CLASS OF OBJECTION CANNOT BE RECORDED HERE, and it is worth knowing before you write the
 * entry rather than after: an objection to EMPHASIS ALONE. `normalizeProse` drops every `*`, on
 * purpose, so that bolding one word inside a banned sentence does not evade the ban. The cost of
 * that is exact: where the whole fix WAS the emphasis, the banned wording and the shipped
 * correction normalize to the same string and the entry fires on the corrected prose. Measured at
 * `ff465269` on D4 round 3, which is why POL.7 mini_lesson[2] has no entry: it was cut for bolding
 * **degree** a second time, promising an introduction that never arrives (the term is earned via
 * the POL.6 prerequisite, so the word itself stays). The fix removed four asterisks and no other
 * character -- 446 bytes to 442, identical once asterisks are dropped -- so the entry went red on
 * the FIXED pack, which is the TRG.3 warning below about banning a true sentence, arrived at from
 * the other direction. Leave such an objection to a guard that reads the raw string, and do not
 * "fix" it by shortening the needle or by teaching `normalizeProse` to keep asterisks: every
 * entry above that quotes a bolded term depends on them being dropped.
 */
const BANNED_PHRASES = [
  {
    phrase: "The two descriptions do not disagree with each other.",
    why: "reassures the learner that two framings do not conflict, rebutting an objection they never raised, and so invites the doubt it tries to settle. Run both routes on a concrete example and let the agreement be visible instead",
  },
  {
    phrase:
      "Copying and adding is what is actually happening, and multiplying is the shortcut that gets to the same place in one step.",
    why: "the second half of the same rejected passage: it narrates the relationship between the two routes rather than showing them landing on the same answer",
  },
  {
    phrase: "Nobody chose those answers; carrying on halving is what produced them.",
    why: "tells the learner what the worked lines already showed them; the halving is on screen doing exactly this",
  },
  {
    phrase:
      "Writing the copies out and adding is what is actually happening; multiplying the two exponents is the shortcut that lands in the same place in one step.",
    why: "the same rejected claim as the entry above, reworded, in the PowerOfPowerMatch widget on the same slide the JSON version was cut from. It survived the round that cut the JSON because the ledger was JSON-only and because a reword is not a substring of the sentence it rewords: an entry bans one sentence, not the claim, so the surface has to be swept and the reword has to be listed",
  },
  {
    phrase:
      "One answer for two different starting numbers means the root kept how far each one sat from zero and dropped the sign, which is all that squaring had left for it to read.",
    why: "the observation is load-bearing and the trailing clause is not. It restates a point the pack already makes twice, at the close of the previous slide ('squaring threw the minus sign away, and the root had no way of knowing it had ever been there') and again as this slide's closing payoff ('they record the sign that squaring threw away'), so the reader meets the idea first in its hardest form. It also stacks two personifications the lesson never sets up, squaring LEAVING something and the root READING it, and its 'it' can be read as the root, the sign or the 49. Keep the observation, which is the bridge from the two concrete tests to the definition of absolute value, and let the mechanism land once at the end",
  },
  {
    phrase:
      "Parity also settles what a root will accept: nothing real squared gives $-49$, so **$\\sqrt{-49}$ is not a real number**, while $\\sqrt[3]{-64} = -4$ is perfectly ordinary.",
    why: "'parity' is a real term the domain never earned: one use in learner prose across all five D2 packs, defined nowhere, and RootParityBuilder, the widget this very slide mounts, argues in 'the index is odd' and 'the index is even' without ever saying the word. Glossing it would also lean on 'index', which only RAD.3 defines and which RAD.4 does not have as a prerequisite. Name the two kinds instead of the property ('Odd and even roots also differ in what they will accept'). Whatever the framing, the even-root domain fact after the colon has to survive, because d2.rad4.realroot.l2 is a live L2 template that grades it",
  },
  {
    phrase:
      "The number being raised to the power is what the amount is multiplied by at every step, which is the growth factor.",
    why: "false of the rule it is printed beside. ExpFeatureLabel's two boards both carry a vertical shift ($y = a \\cdot b^{x} + k$), and on the first the outputs run 7, 11, 23, where $7 \\times 3$ is 21 and not 11. What the base multiplies is the DISTANCE FROM THE ASYMPTOTE, not the amount. This is the text shown after a miss, so the learner's takeaway from getting it wrong was EL.1 slide 2's 'divide any value by the one before it' transplanted onto exactly the rule where that procedure stops working. Say what the factor multiplies, and show the distances",
  },
  {
    phrase:
      "Every output of $y = ab^{x}$ gains the same constant when the rule becomes $y = ab^{x} + k$, so every point on the graph moves the same distance up or down and the curve keeps its shape exactly.",
    why: "R15: EL.2 slide 2 opened on a claim, reaching back to nothing and posing no question, while EL.1 opens all three of its non-opening slides the other way ('Doubling was handed over in words, but...'). Reach back to the asymptote slide 1 left the learner with and ask what a constant on the end does to it",
  },
  {
    phrase:
      "Multiplying the whole rule by $-1$ turns every output into its opposite, so a point sitting $8$ above the axis now sits $8$ below it and the curve becomes a mirror image of itself across the $x$-axis.",
    why: "R15, the same defect as the entry above on EL.2 slide 3: the mirror is asserted before the learner has been given any reason to wonder about it. Reach back to the shift that moved the curve without reshaping it, then ask what a minus sign in front does",
  },
  {
    phrase:
      "A graph of $y = ab^{x} + k$ hands over three readings with no power to evaluate.",
    why: "R15, the same defect on EL.2 slide 4. The count is the interesting part and it arrives as an assertion; asked instead ('Which three readings can be taken off ... with no power to evaluate?') it is the question the slide then answers",
  },
  {
    phrase: "Test that on a real number before trusting it.",
    why: "spends 'real number' on the CASUAL sense, meaning an ordinary value you can pick, two slides before the same pack uses it technically ('$\\sqrt{-49}$ is not a real number'), so the first meeting teaches a sense the second one contradicts. The technical uses stay, because the term is assumed prior knowledge, recurs across the curriculum, and is the phrasing d2.rad4.realroot.l2 grades against; it is the loose use that is free to give up, since 'an actual number' does its whole job",
  },
  {
    phrase: "The intensities behind those two readings are a trillion times apart.",
    why: "the arithmetic is wrong and the slide's own two numbers say so: EL.4's hook puts the weakest reading near $10^{-3}$ and the strongest near $10^{3}$, and $10^{3} / 10^{-3}$ is $10^{6}$, a MILLION. A learner who trusts the sentence learns that six steps of exponent are twelve orders of magnitude, which is the exact misreading the whole slide exists to prevent. The exponents were kept, because they are the ones slide 2 walks ($\\log 0.001 = -3$), and the word was corrected",
  },
  {
    phrase: "Pull the largest perfect square out of the top.",
    why: "the method RAD.1 retired in #127 and then kept teaching on three other surfaces. The node's own slides say the opposite twice - 'taking the first one that divides in is enough, since nothing says the factor has to be the biggest' (slide 2) and 'Missing the biggest factor on the first pass costs nothing but another pass' (slide 4) - and spotting the largest factor is the hard part of the job as well as not being how anyone works. Say 'Take a perfect square out of the top', which is the loop the slides teach: take out what you can see, then look again",
  },
  {
    phrase:
      "A piece is finished once no perfect square is left inside it, so look for the LARGEST perfect square dividing the number under each root before pulling anything out.",
    why: "the same retired method in RAD.1's CFU VARIANT hint, banned separately because a reword is not a substring and because this surface is not the one above: it lives in `apps/web/src/lessons/cfuVariants.ts`, which the three-path invocation in the skill does not open. The first half of the sentence is the correct definition and survives; it is the instruction after the comma, which contradicts the slide the learner just read, that was cut",
  },
  {
    phrase:
      "What squeezes a trillion-fold spread down to one axis is a logarithm, which hands back an exponent, and exponents creep up while their powers race away.",
    why: "the second of the two consecutive sentences carrying the same wrong figure, banned separately because the ledger bans sentences rather than claims: correcting the first alone would leave 'a trillion-fold spread' standing in the next line. Everything after the comma survives in the rewrite and is not what was objected to",
  },
  {
    phrase:
      "An argument below always gives a negative logarithm, because reaching it takes a negative number of factors of the base.",
    why: "a count of minus three factors is not a thing, so the remedy explains a true rule with a false mechanism, on the board whose whole subject is the dropped minus sign (R33). EL.3's own slide 4 already carries the honest reason - a reciprocal is the same power with a negative exponent - and LogNaturalSpot's second board states it correctly, so the pack contradicted itself two boards apart. Quoted as the SCANNER sees it, with the `<InlineMath latex=\"1\" />` after 'below' elided: the widget half of this sweep reads prose runs with tags removed, so an entry carrying the math would match nothing",
  },
  {
    phrase:
      "An $\\ln$ is the **natural logarithm**, whose base is $e$, so it undoes continuous growth: $\\ln e^{7} = 7$.",
    why: "R16. The slide announces a pair ('Two bases come up so often that their logarithms are written with no base at all') and the second half arrives with no hinge at all, so the natural logarithm reads as a third fact rather than as the other member of the declared pair. Not buried, absent. Fixed by leading the sentence with the hinge and NOT by splitting the slide, which would discard the symmetry that makes the second half memorable",
  },
  {
    phrase:
      "The apron capacity review reports that aircraft on the flight line double every quarter, stands at one squadron now, and that the hangar holds $32$ airframes.",
    why: "EL.6's opening scenario could not produce the equation the slide then solves. The UNITS were the load-bearing fault: the slide asserts $2^{t} = 32$, which needs the start and the limit in the SAME unit with the start equal to 1, and a squadron is a formation of many aircraft, so a learner who modeled it faithfully got $S \\cdot 2^{t} = 32$ and never reached $t = 5$ -- their correct modeling read as wrong on the node's first equation. The GRAMMAR was the second fault: the three coordinated clauses are 'that aircraft ... double', 'stands at one squadron now' and 'that the hangar holds 32 airframes', and the middle one has neither a subject nor a 'that', so the sentence says the review stands at one squadron. Both are fixed by starting at one aircraft and giving the middle clause its own subject; 'airframes' went with it, so the count is in one unit across both slides that state a hangar limit",
  },
  {
    phrase:
      "Nobody in the briefing is asking how many planes will eventually stack up; they are asking *when* the hangar reaches its limit, and that question puts the unknown in a place arithmetic cannot reach it: $2^{t} = 32$, with $t$ upstairs in the exponent.",
    why: "'a place arithmetic cannot reach it' carries a resumptive pronoun: the relative clause already has its object in 'a place', so the trailing 'it' re-states it and the sentence has to be re-read. It ends at 'reach'. The same edit drops 'planes', which was a third word for the thing the sentence beside it calls aircraft",
  },
  {
    phrase: "The same factor comes back, so the queue drains geometrically.",
    why: "R32. Sole learner-facing use of `geometric*` anywhere in era nine, undefined, and it lands in the copy a learner reads AFTER getting EL.1's CFU wrong (R33). The clause before it already carries the whole meaning, and the two steps after it apply the factor, so the sentence ends at 'comes back'. The same claim was live in a second place the ledger cannot reach, d8.el1.decay-value.l2's first worked-solution step ('so the sample decays geometrically'), which is generated in TypeScript; that wording is guarded by the `geometrically` entry in apps/web/src/lessons/d8EraProse.test.ts instead",
  },
  {
    phrase:
      "Rewriting the request in terms of a base the calculator does have settles it: $\\log_{b} N = \\dfrac{\\log N}{\\log b}$, and the identity holds with $\\ln$ used on both parts of the fraction instead.",
    why: "R32. 'the identity' is the sole use of the word in era nine, behind a definite article, defined nowhere, and it is doing no work: 'and it holds just as well with $\\ln$' says the same thing and owes the learner nothing. The rule itself and the $\\ln$ half both survive the rewrite, which is why the whole sentence is banned rather than the clause",
  },
  {
    phrase:
      "Give the horizontal asymptote of the new graph and the point the anchor $(0, 1)$ has moved to.",
    why: "R32, and the strongest instance of it in the era: 'the anchor' named the point $(0, 1)$ only where the learner is GRADED and never where they are taught. EL.2's mini_lesson says 'The one point that can always be named exactly is where the curve crosses the $y$-axis' and never uses the word. It was not glossed because it is not a term a learner can look up (R23), and the avoid answer was already proven available by the node's own practice template, which renders 'The point $(0, 1)$ lies on the graph'. The prompt now asks for 'the new position of the point $(0, 1)$'",
  },
  {
    phrase:
      "Mirroring over the $x$-axis leaves the asymptote where it already is and turns the anchor's height into its opposite, and the shift then carries the asymptote and the anchor the same distance up.",
    why: "the same objection as the entry above, in EL.2's hint. Listed separately because the ledger bans sentences rather than claims, and this wording shares no sentence with the prompt's",
  },
  {
    phrase:
      "Start from what $y = 4^{x}$ already has: a horizontal asymptote at $y = 0$ and the anchor at $(0, 1)$.",
    why: "the same objection, in EL.2's first worked-solution step. Three of the five wordings the term reached in the pack sit in the worked solution, which is the copy a learner reads after taking the reveal, so each needs its own entry",
  },
  {
    phrase:
      "Zero is its own opposite, so the asymptote stays at $y = 0$, while the anchor drops to $(0, -1)$.",
    why: "the same objection, in EL.2's second worked-solution step. Quoted from 'Zero' rather than from the start of the step, because the sentence before it ('Reflecting over the $x$-axis negates every height.') is unobjectionable and survives verbatim",
  },
  {
    phrase:
      "Shifting $5$ up adds $5$ to both heights: the asymptote rises to $y = 5$ and the anchor to $(0, 4)$.",
    why: "the same objection, in EL.2's third worked-solution step. The arithmetic is right and is unchanged; only the name for the point moved",
  },
  {
    phrase:
      "Move the hangar limit to $40$ aircraft and the same method stops dead, because $40$ is not a power of $2$: it sits between $2^{5}$ and $2^{6}$, so there is no exponent to read off.",
    why: "R2. All 24 slide openings in era nine were checked and this was the only place a scenario leaked past slide 0: every other pack keeps its scenario on slide 0 and lets the mathematics carry slides 1 to 3. Slide 1 now reaches back to what slide 0 established and asks the question it answers ('Matching bases worked only because the number on the right was itself a power of $2$'). Quoted with 'aircraft' rather than the 'airframes' an earlier lane in this round respelled, because the phrase is a verbatim record of the text that was removed",
  },
  {
    phrase: "Two growth curves on one dashboard panel both open at the same $400$ reading.",
    why: "four of the era's six openings were one device, a readout displaying a number, and two nouns were reused across them: 'panel' in EL.1 and EL.2, 'dashboard' in EL.2 and EL.4. EL.2 was the node in both collisions, so rewriting it alone clears both. It now opens on a comparison rather than a display and keeps every number, factor and downstream referent",
  },
  {
    phrase:
      "A meter reports one reading of $\\log 100$ for a signal that two separate stages produced, and the record has to list the stages on their own.",
    why: "the barest instance of the readout device named in the entry above, and the second of exactly two openings changed. EL.4 was left on its dashboard deliberately, having been rewritten earlier in the same round for a wrong order-of-magnitude claim, and EL.1 keeps its panel because it carries the era's signature doubling scenario. Two of six is a coincidence rather than a template",
  },
  {
    phrase:
      "A leading coefficient changes only how many pairs there are to test, not the reasoning.",
    why: "false, and false about the two conditions the same paragraph just stated. POL.2 slide 2 teaches that the pair multiplies to $c$ and adds to $b$, then this sentence tells the learner a leading coefficient leaves that reasoning intact. It does not: for $2x^{2} + 5x + 3$ no pair multiplies to $3$ and adds to $5$, so a learner who trusts the sentence concludes the trinomial does not factor, when it is $(2x + 3)(x + 1)$. Say what actually changes: the pair multiplies to the constant times the leading coefficient, and it splits the middle term for grouping",
  },
  {
    phrase:
      "The largest such common divisor is the **greatest common factor**, and taking it out first leaves $3x$ multiplied by the smaller polynomial $2x + 5$.",
    why: "R32 name drift. One paragraph of POL.2 gives the same idea three names: 'the measure every term already shares', 'common divisor' and 'the common measure', with only 'greatest common factor' bolded as the term, and 'common measure' is then the phrase slide 3 and the CFU hint both use and the phrase the widget id carries. Naming the bolded term off 'common measure' ties the working phrase to the term the item bank grades against, and costs one word",
  },
  {
    phrase:
      "Missing it is not merely untidy: a trinomial with a common factor still buried inside it will not split into whole-number sides, and the search that follows will look impossible when it is only premature.",
    why: "R32: 'trinomial' arrives here undefined and is used ten times across POL.2, POL.3 and POL.4, defined nowhere in any pack in the tree. The gloss is owed rather than the avoidance, because five D4 widgets speak the word (FactorPairStepper, PerfectSquareSorter, CommonMeasureClassify, CompleteSquareSolver, SolveQuadraticOrder), and it costs nothing, because it leans only on 'term', which POL.1 defines",
  },
  {
    phrase:
      "A **difference of two squares** is a subtraction of one square quantity from another, and the same sum with a plus sign in front of the $36$ does not factor over the whole numbers at all.",
    why: "the sentence defines the shape as a SUBTRACTION and then calls it 'the same sum' six words later, so the one sentence that names the term contradicts itself about what the term names. 'The same expression' loses nothing",
  },
  {
    phrase:
      "Every term here is divisible by the same number, and the common measure comes out before any pair is hunted for.",
    why: "R13, asserting a property of the learner's own instance: POL.2's CFU asks for $2x^{2} + 2x - 24$ factored COMPLETELY, so noticing that a common measure exists is the step being assessed, and the hint does it for them. Point at the check instead ('check every term for a measure they all share')",
  },
  {
    phrase:
      "The order of the four moves is fixed rather than preferred: gather at zero, factor, split into conditions, solve each, and then read which solutions the job admits.",
    why: "the sentence promises four moves and lists five. The widget the slide mounts, solve-quadratic-order, offers exactly four ordered steps (zero, factor, split, read), so a learner counting the prose against the board is one short. Reading which solutions the job admits is the thing that comes after the four, not the fourth",
  },
  {
    phrase:
      "What that produces is right as far as it goes and it is not the whole answer, because $x = 0$ also satisfies the original equation.",
    why: "R16: the two halves of one idea, what the move gets right and what it destroys, joined by a bare 'and' in the middle of a sentence, so the turn reads as one more fact rather than as a signal to re-orient. The hinge leads now ('That much is right as far as it goes. But it is not the whole answer, because ...')",
  },
  {
    phrase:
      "The equation is being asked for every solution rather than only the one that measures ground.",
    why: "the hint carried the question's own scope, and it is ungrammatical besides (an equation is not asked for anything). POL.3's whole slide 3 teaches reading which solutions the job admits, so a learner who does not take the hint plausibly answers $5$ and is marked wrong on a question they answered as asked. The same template's re-ask already puts the scope in the PROMPT, which is where it belongs",
  },
  {
    phrase:
      "The divisor has the shape $x - r$, so the coefficients on their own carry the whole division and the value of $r$ comes with the sign the divisor gives it.",
    why: "'the sign the divisor gives it' reads as the sign on the page, so a learner dividing by $x - 3$ takes $r = -3$ and runs the row to $x^{2} - 7x + 22$ remainder $-60$. The pack's own worked solution says it correctly ('The divisor $x - 3$ is zero at $x = 3$') and so does the same template's re-ask hint ('the value used is the one that makes the divisor zero'), so this wording was the only one of the three that could mislead",
  },
  {
    phrase:
      "Every power of the dividend is present here, so no empty column has to be inserted.",
    why: "R13, in the second half of the same hint: checking the dividend for a missing power is one of the two habits POL.8 slide 3 exists to teach, and the hint performs it. Point at the check instead",
  },
  {
    phrase:
      "The dividend goes down in standard form with every power present, so $x^{3} - 7x + 6$ is written $x^{3} + 0x^{2} - 7x + 6$, and the empty $x^{2}$ column keeps every later subtraction under the terms it belongs to.",
    why: "'standard form with every power present' reads as one requirement, and POL.1 defines standard form as highest power first with each power appearing once, which does not ask for the missing ones. A learner joining the two concludes $x^{3} - 7x + 6$ is not in standard form. The zero placeholder is a bookkeeping habit for the division and is now stated as a second thing the writing does, which also gives the first habit the label the second one already had",
  },
  {
    phrase:
      "The same four-product rule holds when a side carries a coefficient, so $(2x + 3)(x + 4)$ gives $2x^{2}$, $8x$, $3x$ and $12$, coming to $2x^{2} + 11x + 12$.",
    why: "R19, decided as absorb rather than parenthesise: four commas in one sentence doing two jobs, three separating a list of four products and the fourth opening a trailing summary, so 'coming to' can be read for a moment as a fifth product. The summary is load-bearing and is the slide's payoff, so bracketing it would be the wrong call; it is its own sentence now",
  },
  {
    phrase:
      "Written with a union and read left to right that is $(-\\infty, 58) \\cup (62, \\infty)$, and a sign pointing away from the bars always produces this two-piece shape.",
    why: "R16. LIN.6 splits its central inverse pair across slides 1 and 2, which is the sanctioned split because each half mounts its own gated widget, but the two halves did not land the same way: slide 1 closes on a full sentence for the towards rule ('A sign pointing towards the bars, $<$ or $\\le$, always produces one single band, because sitting close to the standard is one condition and not two') while slide 2 tacked the away rule onto the tail of a sentence about notation. Read that way the away rule is a remark about how to write a union rather than the matching half of a rule. The notation clause survives; the away rule now has its own closing sentence, built to the same shape as slide 1's",
  },
  {
    phrase:
      "A rule handed over with a coefficient inside the bars needs the same two decisions in the same order.",
    why: "R15. 'The same two decisions' is a definite back-reference to an enumeration that appears nowhere in the three slides before it; the nearest candidate is 'the two SHAPES' on slide 0, which is one of the decisions and not both. The slide did eventually name them, in its LAST sentence, which is R15's question-before-claim ordering exactly inverted. The opening now names the pair and asks the slide's question, and the closing sentence still lands the claim",
  },
  {
    phrase:
      "What gets negated is the whole quantity inside the bars and never the solutions that come out of it, so the answer is $\\{-3, 4\\}$ rather than $\\{-4, 3\\}$.",
    why: "LIN.5's pack and the widget on the slide before it stated opposite rules about where the negation lands, and a learner meets the widget first. AbsBranchBuilder says 'the quantity inside them keeps its own form in both branches and only the number on the right changes sign'; this sentence says the inside is what gets negated. The pack's sentence is also refuted by its own worked line one sentence earlier, $2x - 1 = -7$, in which the inside is untouched. Both spellings are the same branch, so the pack now says that and keeps the load-bearing half, which is that the SOLUTIONS are never what changes sign",
  },
  {
    phrase:
      "Two solutions is the usual outcome rather than a guarantee, and two kinds of right-hand side break the pattern.",
    why: "R15, and the second half of the same defect as the subtitle over it. LIN.5's last slide was titled 'Not always two', which is the slide's conclusion rather than its topic, and then its opening sentence delivered that same conclusion before either of the two cases that earn it. Everything the slide is for was settled before the learner read a symbol, which is what disarms its own closing line ('Both traps are the same trap'). The slide now opens on the question the two cases answer, and the subtitle names the thing you read rather than what reading it tells you",
  },
  {
    phrase:
      "A **term** is one of the separate pieces an expression is added out of, so there are two variable terms here and two plain numbers, spread across both pans.",
    why: "R32. 'Expression' occurs exactly once in the 110 sentences of D3's prose, is defined nowhere, and is load-bearing here because it is the noun the definition of a BOLDED term rests on. LIN.1's only prerequisite is NUM.4, which uses the word once in a hint and never defines it either, so the gloss route had nothing to lean on and the term was avoided instead. The wrong conclusion it invited was that an expression is the whole equation, in which case the rest of the sentence does not parse and the learner counts terms across the equals sign",
  },
  {
    phrase:
      "The $2$ then multiplies $w$, so dividing both sides by $2$ leaves $w = \\dfrac{P - 2l}{2}$.",
    why: "R16. This and the sentence before it are the two halves of one idea, undo the addition and then undo the multiplication, and the hinge ('then') sat inside the subject rather than leading, so the second move reads as one more fact about the formula rather than as the second of a matched pair. The evidence that this was a slip and not the pack's register is one slide later, where the identical move gets its hinge in the leading position ('Now $h$ multiplies the whole group, so ...'). Fixed by leading the hinge and NOT by splitting the slide. The comma-fenced first attempt ('With that subtraction done, the $2$ multiplies $w$, so ...') tripped the validator's aside rule, so the hinge carries no comma",
  },
  {
    phrase: "the squeeze it unpacks into",
    why: "R21, and the visible tip of a wider substitution. This headed the middle column of AbsBandTable, a FillTable, whose headings render into `<th scope=\"col\">` so the announced column name is the visible one. It is a multi-word phrase built around a verb, which is R21's detection rule, and the term it paraphrases is already earned: LIN.4 bolds **compound inequality** and LIN.6's own prose, CFU hint and worked solution all use it. Quoted whole rather than as a sentence because the heading IS the whole authored string, not a fragment of one",
  },
  {
    phrase:
      "A table of at-most absolute-value rules, each unpacked into a squeeze, with the interval to complete",
    why: "the same objection as the heading above, in the same widget's accessible name, listed separately because the ledger bans sentences rather than claims and a screen-reader user meets this one instead of the heading",
  },
  {
    phrase:
      "Both ends are taken in, because the sign was the at-most kind on both sides of the squeeze.",
    why: "the same objection, in AbsBandTable's per-row explanation. Twelve learner-visible noun uses of 'squeeze' stood against the pack's own vocabulary for the same object, so the heading alone was not the fix: the pack's CFU said 'compound inequality' and every surface a learner reached from the same node said 'squeeze'",
  },
  {
    phrase: "the squeeze between the negative and positive tolerance",
    why: "the same objection, in AbsInequalityOrder's spoken form of the unpacked line, which is what a screen reader announces for the rung. Quoted whole because the spoken form is the whole authored string",
  },
  {
    phrase:
      "This is what the shape decision commits to: one squeeze, because a quantity within the tolerance of zero is above the negative one and below the positive one at the same time.",
    why: "the same objection, in AbsInequalityOrder's reason for the towards-the-bars rung. The word survives as a VERB in LIN.6's prose ('the quantity inside the bars is squeezed between $-2$ and $2$'), which is plain description of what happens and is not what was objected to; what is banned is the noun standing in for the term",
  },
  {
    phrase:
      "Goal: write the two pieces of this rule's answer, one for each way a weight can fail.",
    why: "R24, first half. AbsUnionBuilder's task used one word for two different things two sentences apart: 'the two pieces' here are the two SLOTS, and 'the piece that belongs in it' in the next sentence is a CHIP, an inequality the control row offers. The word that distinguished them was 'ray', which the pack had not earned at the time. R24's placement half passed, since the task sits first in the DOM in a WidgetTask; what failed is the half requiring the task to ask for the same KIND of thing the controls offer",
  },
  {
    phrase: "Pick a ray, then pick the piece that belongs in it.",
    why: "R24, second half of the task above, banned separately because a reword is not a substring and this is the sentence in which 'piece' means the chip. The wrong conclusion was that a ray and a piece are two different components of the answer and the task is asking for three things, when it is asking for two intervals in two slots",
  },
  {
    phrase: "square, because the sign takes its boundary in",
    why: "R32. It is one arm of a ternary whose other arm reads 'round, because the sign is strict', so one value of a single property was NAMED and the other DESCRIBED, teaching that strict and the at-least kind are two different properties rather than the two values of one. It also leans on 'boundary', which occurs once in the era's prose and is undefined there. 'Strict' is now earned, glossed beside **closed** and **open** in LIN.4, and both arms name their sign kind",
  },
  {
    phrase:
      "Interval notation joins two pieces with a union symbol, written with a space either side of it.",
    why: "the grader's whitespace delimiter taught as if it were part of the notation. The space either side of the union is a rule of THIS ANSWER FIELD, which splits a submission on a spaced ` U `; interval notation itself says nothing about spacing, and LIN.4 is the node that bolds **interval notation** and exists to teach what it does say. So the false half of the claim was delivered by the one surface whose job is the notation, with nothing to tell a learner which half the field was actually enforcing. Same class as GeoCisternPlay's entry below, a claim about INPUT CONVENTION, which is the kind that comes back the moment anyone rewords a hint standing next to a grader. ONE entry for TWO surfaces: `d3.lin6.union.l2` and `d3.lin4.compound-or.l3` carried this sentence byte-identically and only the sentence before it differed, so the per-surface rule has nothing to separate here. It asks for an entry per WORDING and there is one wording, which is why the red for this entry was taken in both files. The replacement on both nodes gives the reading to the field: 'Interval notation joins the two pieces with a union symbol, and this answer field reads that symbol with a space either side of it'",
  },
  {
    phrase: "Then isolate the variable right across that squeeze.",
    why: "R21, the same objection as the five squeeze entries above, on the surface not one of them reaches. Round 1 cut 'squeeze' as a paraphrase of **compound inequality** from every surface a learner reached from LIN.6 and recorded five entries doing it, all of them widget copy. Measured at `3eef444b^` rather than argued: the three-path sweep fires all fourteen D3 entries there and NONE of them inside `packages/item-bank/src/d3`, where five more learner-visible noun uses had been rewritten in place with nothing recording it, so the ledger's D3 coverage stopped at the pack and widget boundary. This is `d3.lin6.band.l1`'s second hint, which is copy a learner reaches after a miss. Shortest entry in the list at 52 characters and still a whole sentence rather than a fragment: what is banned is the NOUN, and the verb survives three lines below it in the same template's worked solution ('the quantity inside is squeezed'), which is plain description of what happens and was never the objection",
  },
  {
    phrase:
      "That gives two separate statements rather than a squeeze, so solve each one on its own.",
    why: "the same objection, in `d3.lin6.union.l2`'s second hint. Listed separately from the entry above because the ledger bans sentences rather than claims, and separately from the interval-notation entry because these are the two halves of ONE hint carrying two different objections: this half paraphrases the term, the half after it misattributes the field's delimiter. Either one could be repaired alone and leave the other standing",
  },
  {
    phrase:
      "Every move on a squeeze applies right across all three of its parts, including the division by the coefficient.",
    why: "the same objection, in `d3.lin6.scaled-band.l2`'s second hint. This is the use with the most teaching weight on it, because the three-part shape is exactly what the term names and the sentence is counting its parts while declining to call it by the pack's own word for it",
  },
  {
    phrase:
      "A sign pointing away from the bars gives two separate inequalities rather than a squeeze.",
    why: "the same objection, in `d3.lin6.scaled-union.l3`'s second hint, and a reword of the union.l2 hint above rather than a copy of it, which is the reason both are here: the claim is the same, the sentence is not, and a substring match on one would never have reached the other",
  },
  {
    phrase:
      "Set-builder notation names the variable and then states the condition on it, which here is the single squeeze.",
    why: "the same objection, in `d3.lin6.set-builder.l3`'s worked solution. It is the last of the item bank's five and the only one outside a hint: the step is what a learner reads after taking the reveal on the node's hardest shape, where the graded skill IS writing the form, so the paraphrase stood at the one place the term had to be exact. Authored as a template literal with no interpolation in it, so the whole sentence is a source string the sweep can read",
  },
  {
    phrase:
      "What the bars leave free is the SIGN of , so the quantity inside them keeps its own form in both branches and only the number on the right changes sign.",
    why: "the sentence that LIN.5's pack entry above quotes as its own EVIDENCE, cut in the same commit and left unbanned, which is the ledger's founding failure repeated inside the ledger: a claim was corrected on one surface, the entry recording it quoted the second surface verbatim, and the second surface got no entry of its own. AbsBranchBuilder is the widget on the slide before the pack's, so this is where a learner meets the rule FIRST. 'Only the number on the right changes sign' makes the standard second branch the only branch, and $-(w - 34) = 5$ is the same statement with the free sign taken on the left: it lands on the same weight, and it was a graded distractor until `absBranchEquivalent.browser.test.tsx`. That test guards the GRADING and not the prose, so nothing else in the tree would notice this sentence coming back reworded over a checker that now accepts both spellings. QUOTED WITH A GAP where `<InlineMath latex={board.inside} />` sits, one space between 'of' and the comma, because an element is elided to a space and this is the whole sentence as the sweep reads the run rather than as the learner reads the slide. An entry written around an elision is exactly the kind that matches nothing silently, which is why this one was watched red on the pre-fix source",
  },
  {
    phrase:
      "What gets negated is the number on the right, and is written exactly as it stands.",
    why: "the same objection, in the same widget's reveal for the negative branch, banned separately because a reword is not a substring and because the two fire in different states: the note above appears on a wrong answer, this one only after the reveal is taken. It is also the more categorical of the two, since 'what gets negated' names the rule rather than describing this board. Gapped for the same reason as the entry above, between 'and' and 'is written'",
  },
  {
    phrase:
      "Multiply any length on the smaller figure by the scale factor and you land on the matching length of the larger one, so a length measured on a model tells you the real length it stands for.",
    why: "GEO.1 defined the scale factor one-directionally, smaller to larger, and the same pack's CFU worked solution twenty-two lines later multiplies by a scale factor of $\\dfrac{1}{10}$ to run it the other way. A learner who took the definition at its word had been told that multiplying by the scale factor makes things bigger, and was then shown one making things smaller with no sentence reconciling the two, so the likely conclusion is that they have misunderstood the CFU rather than that the prose is too narrow. The node's own L3 template deals a factor of $0.5$ on purpose, for exactly the reason the prose denied. The rewrite makes the direction part of what the factor means and keeps the payoff about a model",
  },
  {
    phrase:
      "Sides that satisfy the theorem force a right angle, so the corner between the two shorter sides is square.",
    why: "R21. GeoCordTable is placed after mini_lesson[0], so it is the first exercise after the paragraph that introduces legs and hypotenuse as bolded terms, and it restated both as a recipe (the two shorter sides, the longest side) at the one place the new vocabulary would have been earned by use. The terms now land in the row where the theorem HOLDS, which is the only place in this table they are true. The column headings deliberately keep the longest side, because a heading spans the settings that have no right angle in them and calling their longest side a hypotenuse would teach that every triangle has one",
  },
  {
    phrase:
      "Angles that together fill a straight line are supplementary, and their measures add to a half turn.",
    why: "R32. Half turn appeared exactly twice anywhere in content/lessons, packages/item-bank/src or apps/web/src/lessons, and both uses were inside this one hint of d10.geo1.angle-third.l2. It is defined nowhere: GEO.1's prose says 180 degrees throughout and never once says turn. A term whose only appearance is inside a HINT is the strong case for avoiding rather than glossing, because that surface is the one a stuck learner reaches for and is not where a definition can be introduced. The hint now says the number the node's prompts, prose and worked solutions already say. NOTE ON REACH: this sentence lives in packages/item-bank/src, outside the pack directory, and it is the entry the skill's documented invocation was widened for on 2026-08-03: that line now names packages/item-bank/src/<domain> as a third path, so this entry is swept rather than merely noted",
  },
  {
    phrase: "The three angles of any triangle add to that same half turn.",
    why: "the second half of the same hint, banned separately because the ledger bans sentences rather than claims: correcting the first alone would leave that same half turn standing in the next sentence, referring back to nothing",
  },
  {
    phrase:
      "Type the whole number that multiplies pi, and leave the pi itself to the label beside the box.",
    why: "GeoCisternPlay is the gated teaching surface for exact-pi volume, and this sentence taught the OPPOSITE input convention from the item it prepares. `d10.geo2.cylinder-volume-exact.l3` grades `588*pi`, with the symbol typed and an explicit star; a learner who did what this sentence says enters `588` and is marked wrong. The widget's printed pi is a local arrangement of its equation row and it stays, because the row reads `\\pi \\times 3^{2} = [ ]\\pi` and a typed `9*pi` would render beside a second one. What could not stay is the sentence generalizing that arrangement into a rule about how an exact answer is entered. Banned rather than merely rewritten because it is a claim about INPUT CONVENTION, the one kind of claim that reappears reworded the moment anyone else touches a pi-carrying widget, and because it fires only after a miss, so nothing renders it in CI and nobody would see the reword. The replacement names the printed pi as this box's own arrangement and points at `3*pi`, which is the spelling the item's own prompt gives",
  },
  {
    phrase:
      "Before hunting for sides, look for the measure every term already shares: the largest amount that divides all of them is the **greatest common factor**.",
    why: "R32 name drift, RETURNED. The entry above it cut POL.2's original for naming the bolded term off 'common divisor' instead of 'common measure', and its fix read 'The largest such common measure is the **greatest common factor**'. The three-section migration rewrote the whole paragraph and dropped the tie again: the bolded term is now named off 'the largest amount that divides all of them', while 'common measure' is used six times across POL.2's learner-facing text (mini_lesson[1] x2, mini_lesson[2], subtitle[1], worked_examples[1].prompt, cfu.hint) and the widget the slide mounts is `common-measure-classify`. So the paragraph bolds one name for the idea and then works in another that nothing connects to it. Naming the bolded term off 'common measure' again costs one clause. Listed separately from the entry above because the ledger bans sentences rather than claims, and a rewrite that reintroduces an objection shares no sentence with the wording that first carried it",
  },
  {
    phrase:
      "A repaving contract comes down from the yard with the courts and the strips written out separately, because nobody has fixed the side length yet.",
    why: "the three-section migration cut POL.1 slide 0's two masons out of the lecture along with the arithmetic, and left three surfaces still pointing at them: subtitle[0] is 'Two masons, one contract', worked_examples[0].prompt opens 'The first mason's part of the contract', and worked_examples[1] totals a second amount the pack no longer says belongs to anybody. A learner reading the lecture meets one contract from one yard and is then asked about the first mason's part of it. The two parts are restored to the opening sentence without the arithmetic, which is what section 2 now holds",
  },
  {
    phrase:
      "So every term inside it comes off, and taking off a term that was itself a deduction leaves more behind than there was before.",
    why: "R16, and a regression the migration introduced: the surprising half of the pair, that removing a deduction makes the count go UP, is a trailing clause after a bare 'and', so the reversal reads as one more fact rather than as a signal to re-orient. The round-1 text had it as its own sentence with the claim leading ('Taking off a $-5x$ leaves more $x$ behind than there was before, because removing something that was itself a deduction is a gain'), and merging it into a clause is exactly the shape the POL.3 entry above was cut for. Not fixed by splitting the slide: the hinge now leads its own sentence and the sentence that followed it is absorbed as that sentence's tail, so the sentence count is unchanged",
  },
  {
    phrase:
      "A polynomial written with its highest power first and each power appearing once is in **standard form**, which is how an order is read out at the yard and how two orders are compared.",
    why: "R32. 'leading' as a technical modifier is used 10 times in learner-facing D4 text and glossed nowhere: 'leading coefficient' 3 times (POL.2 mini_lesson[2] x2, POL.4 mini_lesson[2]) and 'leading term' 7 times in POL.8. The gloss is owed rather than the avoidance, because `long-division-stepper`, the widget POL.8 slide 1 mounts, says 'leading term' six times in its own copy and `worked/d4POL8.tsx:102` titles a reveal figure 'Two steps, two leading terms cleared'. It goes here rather than at either first use because POL.1 is the only common ancestor of the three packs that use it (POL.2 and POL.4 take POL.1 directly, POL.8 takes POL.2), and a sibling is not an ancestor. It leans on nothing unearned: 'coefficient' is defined on POL.1 slide 0 and 'highest power' is this sentence's own. What the rewrite gives up is the trailing 'and how two orders are compared', which was the least load-bearing clause on the slide",
  },
  {
    phrase: "Total the contract: $(x^{2} + 5x) + (x^{2} + 2x)$.",
    why: "R34, the same migration defect as the 'repaving contract' entry above, in section 2: the prompt names an instance whose second amount has no owner and no source anywhere in the pack, because the lecture that introduced the second mason's $x^{2} + 2x$ was cut. A worked-example prompt states the instance the steps work, and the steps here speak of 'both courts' and 'both strips' as though two amounts had been handed over. The prompt now names the second mason's part before totalling",
  },
  {
    phrase:
      "Knowing a remainder can be quicker than earning it, and the agreement is forced rather than lucky.",
    why: "R15. 'the agreement' is a definite back-reference to nothing: it is the slide's first use of the word, POL.8 has not said that two routes to a remainder exist, and the learner arriving at the heading 'The remainder, by substitution' has nothing to resolve it against. Same shape as the LIN.5 entry above whose 'the same two decisions' pointed at an enumeration that appeared nowhere. The opening now names what agrees with what ('the shortcut agrees with the long way'), which costs three words and leaves the slide's question where it was",
  },
  {
    phrase:
      "Measure $17$ paces with a rod of $5$, then divide $x^{2} + 7x + 12$ by $x + 2$.",
    why: "R34: the prompt names an instance the steps never work. It says 'divide', and no step of the worked example divides anything; step 3 states the quotient and the remainder as a finished result, on the pack's first slide, before POL.8 has taught either method. The slide's actual subject is the four quantities a division records and the rebuild that audits them, which is also what its gated widget `divide-rebuild-builder` asks for, so the prompt now asks for the audit and the steps earn the rebuild",
  },
  {
    phrase:
      "Dividing $x^{2} + 7x + 12$ by $x + 2$ gives a quotient of $x + 5$ and a remainder of $2$.",
    why: "the step the entry above was written against, banned separately because the ledger bans sentences rather than claims: rewriting the prompt alone would leave a step that makes one move too large, namely none. The claim is true, and that is not the objection; the objection is that it is asserted where the step array is supposed to make one move that follows from the last. The quotient and the remainder are now given in the prompt as a report to be checked, and the steps rebuild the dividend from them",
  },
  {
    phrase:
      "It holds for zero and for no other number, which is why a factored form hands over its conditions directly while a product equal to $12$ says nothing at all about its factors.",
    why: "R32, and the term census has to be run over the skill GRAPH rather than over the domain to see it. POL.3's prereqs array is empty, so it has no ancestors at all, and 'factor' is bolded in POL.2 and RAT.1, neither of which a learner reaching POL.3 is guaranteed to have met. POL.3 is titled 'Solve quadratics by factoring and the square-root property' and uses the word as a verb in slide 2's four-move list and as 'factored form' and 'factors' here, all of it undefined. Glossed rather than avoided, because the next interaction uses it: `zero-product-play` and `solve-quadratic-order` both argue in factored forms, and R32 drops a term only where the interaction declines to use it. The gloss is one clause, 'an equation written as a product', and it earns slide 2's list without spending a fourth sentence",
  },
  {
    phrase: "The trinomial factors as $(x + 9)(x - 6) = 0$.",
    why: "R32, avoided rather than glossed, and the same graph gap as the entry above: 'trinomial' is bolded only in POL.2, which is not an ancestor of POL.3. Avoidance is the right branch here and glossing is not, because the step needs no word for a three-term polynomial to make its move, and the pack's own cfu.worked_solution[2] already makes the identical move without one ('That factors as $(x + 7)(x - 5) = 0$'). So the term was carrying nothing but the risk. Named as 'the left side' rather than with a bare demonstrative, since step 1 has just put the gathered polynomial on the left of an equals sign",
  },
  {
    phrase:
      "Nothing in that run needs the trinomial to factor, which is the whole point of the method, since it works on every quadratic rather than only on the ones that happen to split.",
    why: "R32. POL.4 takes POL.1 and RAD.1, so its ancestors are POL.1, RAD.1 and five NUM nodes, and 'trinomial' is bolded in POL.2, which is a SIBLING of POL.1 rather than an ancestor of POL.4. The sentence is also where the objection bites hardest, because the whole point it is making is that this method does not need factoring, and it makes that point in vocabulary the learner may never have been given. Avoided rather than glossed: 'the quadratic' is the pack's own subject word, present in its title and in the $ax^{2} + bx + c = 0$ of slide 3, and 'split into two brackets' is the plain description R32 prefers to a gloss where the term is not otherwise needed. The trailing 'the ones that happen to split' becomes 'the ones that do', which also stops the sentence saying 'split' twice",
  },
  {
    phrase:
      "So the solutions are $1$ and $-7$, and nothing in that run needed the trinomial to factor.",
    why: "the section-2 half of the entry above, banned separately because the ledger bans sentences rather than claims and this one is a worked-example step rather than a lecture sentence. A third copy of the same unearned term lived OUTSIDE this ledger's reach, in the figure caption at `apps/web/src/lessons/worked/d4POL4.tsx:206`, and is now fixed to the pack's own wording; a fourth, the ariaLabel at `worked/d4POL3.tsx:99`, went the same way. Both are banned below so the ledger reaches them, but note that no invocation of this scanner in the round-2 plan sweeps their directory: `apps/web/src/lessons/worked` is a sibling of the `interactive` path and holds 672 prose-shaped runs across 45 files, so these two entries are load-bearing only for whoever passes that path in",
  },
  {
    phrase: "Nothing here needed the trinomial to factor.",
    why: "R32, the figure half of the two entries above. `worked/d4POL4.tsx:206`'s caption made POL.4's point about not needing to factor in exactly the vocabulary POL.4's prerequisites do not reach, one sentence after the pack had stopped doing so. Rewritten to the pack's own words, 'Nothing here needed the quadratic to split into two brackets', and re-rendered rather than read off the source. This entry then earned itself: added green against `worked/`, it went RED on its first run over the widened path list and named a copy nobody had found, `interactive/CompleteSquareSolver.tsx:337`, in the settled status line POL.4 slide 2's own widget prints. Five live copies of one unearned term, and the fifth was found by the ledger rather than by a reader",
  },
  {
    phrase: "A trinomial at zero, factored and split into two conditions",
    why: "R32, and the reason a figure sweep over prose alone is not enough: this is an ariaLabel at `worked/d4POL3.tsx:99`, so the unearned term was read aloud to exactly the learners least able to skip it. POL.3 has an empty `prereqs` array and reaches no gloss of 'trinomial' at all. Now 'A quadratic at zero', which the pack's own slide 0 bolds as **quadratic equation**",
  },
  {
    phrase:
      "Interval notation joins the two pieces with a union symbol, and this answer field reads that symbol with a space either side of it.",
    why: "the SUCCESSOR to the interval-notation entry above rather than a duplicate of it, and wrong in the same place rather than merely incomplete. That round moved the space rule off interval notation and onto the answer field; the field does not have it either, so the correction relocated a false claim instead of retiring it. Measured through the product checker over all 14 served LIN.6 union items: the authored spaced key, the same key with no space either side of the `U`, and the same key with every space removed all grade `correct/match` on 14 of 14, so the sentence sends a learner hunting for a formatting fault in an answer that was already accepted, which is worse than saying nothing. What the field DOES enforce went unsaid, on the one surface a stuck learner reaches: `oo`, a standard textbook spelling of infinity, grades `invalid_input/parse_error` on 14 of 14, while `inf` and `infinity` both grade `correct/match`. The replacement gives the field the rule it actually has: 'Interval notation joins the two pieces with a union symbol, and an unbounded end is typed inf in this answer field, never oo'. TWO SURFACES CARRY THIS WORDING AND ONLY ONE IS CUT: `d3.lin6.union.l2` is fixed, and `d3.lin4.compound-or.l3` holds it byte-identically at `LIN.4/index.ts:346`, so this entry FIRES THERE until that hint is rewritten the same way. That red is the point of landing the entry rather than filing a note. A THIRD wording is out of its reach: `d3.lin4.compound-or.l2` at `LIN.4/index.ts:245` drops the `the` before `two pieces`, so it needs an entry of its own once it is cut, exactly as the ledger's one-entry-per-wording rule requires",
  },
  {
    phrase:
      "Interval notation joins two pieces with a union symbol, and this answer field reads that symbol with a space either side of it.",
    why: "the THIRD wording of the space-either-side claim, and the one neither entry above can reach: it drops the `the` before `two pieces`, so it is not a substring of the successor entry and the ledger's one-entry-per-wording rule gives it its own line. It shipped on `d3.lin4.compound-or.l2`, a template APPENDED to LIN.4 after the round that cut the other two, which is exactly how a claim outlives a sweep that closed its predecessors: the entry that fired on the byte-identical copy at `compound-or.l3` reported OK on this one, four hint lines away in the same file. Re-measured at this tip through the product checker over all 13 served LIN.4 union items, which is a different population from the 14 LIN.6 items the successor entry measured and could not have covered, this shape not having existed then: the authored spaced key, the same key closed up around the `U`, and the same key with every space removed all grade `correct/match` on 13 of 13, while the `oo` spelling of infinity grades `invalid_input/parse_error` on 13 of 13. So the field does not enforce the space and does refuse `oo`, and the hint spent a stuck learner's attention on a formatting fault that cannot exist while leaving the one input rule the field really has unsaid. Cut to the wording the successor entry already fixed LIN.6 to, rather than to a fourth phrasing, so all three surfaces now read one sentence: 'Interval notation joins the two pieces with a union symbol, and an unbounded end is typed inf in this answer field, never oo'. Both LIN.4 sites are clear as of this round, so this entry and the one above now fire on nothing in the tree and stand as the record that neither wording is to come back",
  },
  {
    phrase:
      "So the horizontal reach is the cosine and the vertical reach is the sine, and the radius never changes: what a turn changes is only how the one unit of reach is shared between the two, and which way each of them is measured.",
    why: "TRG.3 slide 0 said the one unit of reach is SHARED BETWEEN the horizontal reach and the vertical reach, which is an additive claim and reads as $\\cos\\theta + \\sin\\theta = 1$ on the very slide that defines both. It is also the slide whose CFU grades a single reach, so the learner carries that reading into every later node: at $240^{\\circ}$ they would expect the two reaches to account for one unit between them. What is fixed at one is the DISTANCE OUT TO THE TIP, so the replacement says that and states the trade-off as a trade-off ('neither of them is ever more than one and a turn that lengthens one shortens the other') rather than as a split. The vocabulary is unchanged: 'horizontal reach' and 'vertical reach' were standardised across the widget, this pack, its CFU, cfuVariants.ts and the item bank, and the older 'along/across the pad' metaphor must not come back with the rewrite. The widget mounted on this same slide carried the claim reworded and has since been cleared; its sentence is the entry below",
  },
  {
    phrase:
      "The radius never changes, so what a turn changes is only how the one unit of reach is shared between the horizontal reach and the vertical reach, and which way each of them is measured.",
    why: "the same additive claim as the entry above, in TrigUnitCircleExplore's solved status line - and this is the copy that mattered more, because the widget is what `trg-unitcircle-explore` mounts ON that slide, so a learner met the corrected sentence and the uncorrected one on one screen. It is here as a separate entry rather than folded into the one above because the two are separate surfaces with separate owners: a lesson pack is edited by whoever holds the domain and a widget by whoever holds the interactive lane, and an entry quoting a sentence its owner cannot reach turns the sweep red on a file they may not touch. The replacement says what is actually fixed at one unit - the distance out to the tip - and states the trade-off as a trade-off. Do NOT ban a flat 'the two never add to one': that is false at the axis headings, where cos 0 + sin 0 = 1, and a ledger entry banning a true sentence is how a sweep gets ignored",
  },
  {
    phrase: "Two of them are copied straight out of the rule, and one is not.",
    why: "TRG.5's summary tallied THREE of its four features against a total of three. The next sentence names four (amplitude, midline, phase shift, period) and reads three of them off the rule, so the count contradicted its own following sentence. Two are genuinely copied out (the coefficient in front and the constant on the end) and two are not: the period is always worked out, and the phase shift is only readable once the inside is factored, which is what slide 2 spends a sentence on",
  },
  {
    phrase:
      "The number out front is the amplitude, the constant on the end is the midline, the shift inside is the lag, and the period is the only one you have to work for, since it is $2\\pi$ shared out by the coefficient beside $x$.",
    why: "two false claims about what TRG.5 itself serves. 'The shift inside is the lag' and 'the period is the only one you have to work for' both contradict slide 2, which says a rule written $\\sin(bx - k)$ has to be factored into $\\sin(b(x - k/b))$ before $c$ can be read off, and they contradict `d9.trg5.phase-shift.l3`, which multiplies the inside out on a third of its draws and whose own worked solution says 'the shift cannot be copied straight out of that'. A learner who trusted the summary answers $bc$ instead of $c$ on those draws and is marked wrong by the node's own L3 item. 'The number out front is the amplitude' is the third, smaller error: `d9.trg5.amplitude.l1` draws a negative leading coefficient about half the time and grades its SIZE. The replacement gives the amplitude as the size of that number and makes the factoring a precondition of reading the shift, in the wording the served hint already uses ('outside a bracket holding $x$ and one constant')",
  },
  {
    phrase:
      "A fraction flipped but never negated fails that product, and a horizontal line paired with a vertical one is the one perpendicular pair the product cannot test at all, because a vertical line has no slope.",
    why: "LF.2 slide 2's lecture handed over two of the four answers the widget mounted on that same slide then asks for. `LinearLinePairClassify`'s Pair 2 is $\\dfrac{2}{3}$ against $\\dfrac{3}{2}$, a flip with no sign change, and its Pair 4 is $y = 3$ against $x = -2$, exactly the horizontal-and-vertical case; the widget's own header comment names both as the traps the board exists for. Stating the RULE (negative reciprocal, product $-1$) is what a lecture owes and it survives; stating the VERDICT for a shape leaves the learner nothing to derive. The vertical caveat survives as a precondition on the product test, so Pair 4 is still answerable without being answered",
  },
  {
    phrase:
      "Substituting back into the **same** equation you rearranged is the common trap: it is true for every pair on that line and so confirms nothing.",
    why: "LF.4 slide 1 forbade the step the sentence before it had just instructed. The preceding sentence says to back-substitute to recover the partner coordinate, and the rearranged equation is exactly where that is done, which is also what the pack's own worked example step 4 does ($x = 3(2) - 2 = 4$). The real trap is substituting the isolated EXPRESSION back into its source equation, which cancels the variable and collapses to an identity; as written, the distinction was never drawn, so the two sentences contradicted each other and the correct next step read as forbidden",
  },
  {
    phrase:
      "**Vertex form** is $a(x - h)^{2} + k$, and a square is never negative, so the squared part contributes nothing at exactly one input and something positive everywhere else.",
    why: "false on the reading it invites. 'The squared part' of a two-term rule reads as $a(x - h)^{2}$, the whole first summand, and that summand is NEGATIVE everywhere except $x = h$ whenever $a < 0$. Not a corner case, measured on the surfaces this slide owns: both boards `VertexFormReadTable` draws on this very slide carry a negative $a$ ($-3$ on the first board's blank row, $-1$ on the second's middle row), and `d4.pol5.y-intercept-vertex-form.l2` draws its $a$ from $[-3, -2, -1, 1, 2, 3]$, so half of that pool opens downward. A learner who takes the sentence at face value has been told $k$ is a minimum on every parabola, which is the exact error POL.5 slide 0 spends its closing clause preventing ('negative and they both fall, so the vertex is the highest point'). Name the BRACKET rather than 'the squared part', so the claim is about $(x - h)^{2}$ and is true, and put the sign of $a$ beside the claim about which extreme the vertex is",
  },
  {
    phrase:
      "Drag a value onto the feature it belongs to, or tap the value and then the feature.",
    why: "states the `MatchPairs` interaction backward on both of its clauses, in the one line that tells the learner how to work the board. The kind makes the LEFT column the draggable one (`draggable={!done}`, `onDragStart` holding the pair, `onClick` toggling it) and the RIGHT column the drop target (`onDrop` and `onClick` both calling `joinTo`), and on `InterceptRouteMatch` the left items are the features and the right ones the values. Worse than merely inverted: `joinTo` opens on `const leftId = pickup.take()` and returns on a null hold with no feedback set, so a learner who obeys the sentence and taps a value first gets no join AND no refusal, and reads the board as dead rather than as misinstructed. Name the draggable column's noun first in both clauses",
  },
  {
    phrase:
      "so the board shows which of them come from setting the input to zero and which from setting the output to zero.",
    why: "R22: a two-way partition posed over four siblings, three of which fit it. The fourth pair on the board is the axis of symmetry, which comes from neither zero -- it is the midpoint of the two crossings, `(p + q) / 2` in the widget, and the header comment names that as the reason it is on the board at all. So a learner sorting the four values into the two buckets the task names has nowhere to put one of them, on a board whose gate needs all four joined. Pose a question every option on the board answers",
  },
  {
    phrase:
      "At $x = 10$ the leading term is $1000$ while the other two come to $2000 + 300 = 2300$, so it is the smallest part of the rule.",
    why: "simply false, and false about the three numbers it has just printed: the parts are $1000$, $2000$ and $300$, so the smallest is $300$ and the leading term is the middle one. The intended claim is that it is smaller than everything else PUT TOGETHER, which is the comparison the rest of the example turns on and which `LeadingTermDominanceTable`, the widget mounted on this same slide, already states correctly in its own column heading ('everything else, together'). The step is one clause from right, and the pack said the false version while the board beside it said the true one",
  },
  {
    phrase:
      "That exponent is odd, and its parity is the whole of what this question turns on.",
    why: "R32. 'Parity' is a real term rather than a paraphrase and it is load-bearing, but it arrives undefined and it never stops arriving: censused over D4's learner-facing text at this tip, this was the FIRST use and nine more follow it, three in the packs (POL.6 mini_lesson[3], POL.7 mini_lesson[1] and mini_lesson[3]) and six across the three widgets that speak it (`EndBehaviorParitySorter` in its prompt and conclusion, `EndBehaviorDescribeOrder` three times, `MultiplicityCrossSorter` in its conclusion). Nothing anywhere in the repo glosses it. Glossed rather than avoided, because R32 only drops a term the interaction declines to use and this one is the whole subject of the board on the slide; the gloss costs one clause, 'whether a number is odd or even'",
  },
  {
    phrase:
      "What a graph does at its far LEFT and far RIGHT is its **end behavior**, and the term of highest degree (the **leading term**) is the only part of a polynomial that decides it.",
    why: "spends 'degree' on slide 0 to define a bolded term, one slide before **degree** is itself defined: POL.6 mini_lesson[1] is where 'The **degree** of a polynomial is the largest exponent on the variable anywhere in it' lands. So the sentence introducing the leading term rests on a word the learner has not been given, and the parenthesis around **leading term** makes it read as though the supporting definition had already happened. 'The term carrying the largest exponent' says the same thing in slide 0's own vocabulary and leaves slide 1's definition its job",
  },
  {
    phrase:
      "So a long run is costed by $x^{3}$ alone, and that term of highest degree is the one deciding the ends of the graph.",
    why: "the worked-example copy of the premature 'degree' banned in the entry above, listed separately because the ledger bans sentences rather than claims and because this one is `worked_examples[0].steps[3]`, on the same slide 0 and BELOW the lecture paragraph, so repairing the paragraph alone would leave the unearned word standing four lines further down the slide the learner is still on. Same repair, the term with the largest exponent",
  },
  {
    phrase:
      "All of it runs backwards as well, and running it backwards is the test of whether the correspondence is really held.",
    why: "R15, twice in one opening sentence: two definite pointers with nothing to resolve them against. 'All of it' reaches back at three slides without naming what is being run backwards, and 'the correspondence' names something POL.7 has never called that -- the word appears in no learner-facing string of the pack, only in the header comments of widgets the learner does not read. Same shape as the POL.8 entry above whose 'the agreement' pointed at an enumeration that appeared nowhere. Name the direction the pack has travelled so far and then the one being added ('Every reading so far has gone from a factored form to its graph, and each of them runs the other way as well')",
  },
  {
    phrase: "The degrees of the two brackets add, so the product is a cubic.",
    why: "R32, on the worst surface for it. 'Cubic' is undefined anywhere in D4's learner-facing text -- the word occurs only in the item bank's identifiers, comments and template ids -- and this is a row `note` in `EndBehaviorParitySorter`, which `BinaryRowSort` prints under the row ONLY on a wrong call and splices into the reveal's `why`. So the term is introduced to precisely the learner who has already missed the row (R33), and nothing renders it in a passing CI run. 'Degree three' carries the identical content, in the vocabulary the rest of the same board already argues in",
  },
  {
    phrase:
      "a learner who wrote every factor once would have a cubic here, whose ends disagree.",
    why: "the same objection as the entry above, in `BuildFromGraphOrder`'s reasoning for its final step, and worse for having 'quartic' beside it in the surrounding sentence ('so this is a quartic, and a quartic with a ... leading coefficient'): two undefined degree names in one short passage, on a board whose entire subject is reading a degree off a sum of exponents. Listed separately because the ledger bans sentences rather than claims. QUOTED FROM 'a learner' rather than from the head of the passage because everything before it crosses an `<InlineMath />` and a `{lead < 0 ? ... : ...}` conditional, and a needle spanning a conditional matches nothing at all: the conditional ends the prose run, so the passage reaches this sweep as pieces. This clause is the longest stretch of it sitting in one uninterrupted run, which is what makes it the only bannable wording in the passage. Rewritten to 'would be at degree three, and an odd degree makes the two ends disagree'",
  },
  {
    phrase:
      "A solved inequality still has to be written where a clerk can read it, and **interval notation** is the standard short form: the two ends of the range in order, separated by a comma, wrapped in brackets that say whether each end is part of it.",
    why: "R32, and the collision is exact rather than approximate. Read in ERA order (`packages/skill-graph/src/eras.ts`), LIN.4 is era three and FUN.2 is era seven, and the two use 'range' for opposite axes: here it is the set of x-values an inequality allows, there it is 'every output the rule can reach'. What makes it worse than an ordinary early-use case is that BOTH pair the word with the SAME notation -- FUN.2's CFU asks for 'the range ... in interval notation', and interval notation is exactly what this slide teaches while calling its contents the range -- so a learner meets 'the range, in interval notation' twice, meaning x first and y second, and answers FUN.2 with the domain. FUN.2 even names that error ('Reading one off when the question asked for the other is the easiest mistake to make here') without knowing its own curriculum trained it. Both senses are standard mathematics, so the fix is disambiguation and not deletion: the TECHNICAL sense is the one that recurs downstream (FUN.2, FUN.10, TRG.7) and the one a graded item asks for, so it keeps the word, and this pack gives it up for 'stretch', which is the pack's own word two slides earlier ('an inequality names a whole stretch of the scale')",
  },
  {
    phrase:
      "Each of those two numbers is an **endpoint**, and whether one is **closed** (inside the range) or **open** (outside it) is decided by the sign that produced it: $\\ge$ and $\\le$ take their endpoint in, while a **strict** sign like $>$ or $<$ leaves it out.",
    why: "the same objection as the entry above, in the next sentence of the same slide, banned separately because the ledger bans sentences rather than claims and a reword is not a substring. This is the use that most explicitly equates the word with the x-set, since 'inside the range' is glossing what a CLOSED endpoint is. Everything except the two parenthetical words survives the rewrite",
  },
  {
    phrase:
      "A range with no limit on one side carries the infinity symbol $\\infty$ there, typed out as $\\text{inf}$, and infinity is never a number so it is never taken in.",
    why: "the third and last use of the word in LIN.4 mini_lesson[2], banned separately for the same reason as the entry above: repairing the first two sentences alone would leave the wrong sense standing in the line under them. Rewritten with 'stretch'; the infinity rule and the `inf` spelling both survive and are not what was objected to",
  },
  {
    phrase:
      "The bracket at the end still carries real weight, and the algebra stops at the range, while a clerk would also note that a count of ingots cannot run below zero, which is true of the goods and not of the inequality.",
    why: "the same objection two slides later, in LIN.4 mini_lesson[4], which is the sentence a reader reaches LAST and so the one most likely to be missed by a repair aimed at the slide that teaches the notation. 'The algebra stops at the range' means the algebra stops at the solution set, so 'the interval' is both the accurate word and the one this slide is about",
  },
  {
    phrase:
      "Nothing limits the range above, so it runs to $\\infty$, which is never taken in: the interval is $[40, \\infty)$.",
    why: "the same objection in LIN.4 worked_examples[2].steps[3], banned separately because this is section 2 rather than the lecture: repairing the paragraph alone would leave the wrong sense standing in the worked example on the same slide, which is where a learner sees the word attached to a concrete interval for the first time",
  },
  {
    phrase:
      "Nothing in the inequality bounds the count from below, so the range opens at $-\\infty$, which is never taken in.",
    why: "the same objection in LIN.4 worked_examples[4].steps[2]. Note that the pack's own CFU worked_solution already said 'the interval opens at $-\\infty$' in the matching step, so the pack disagreed with itself about the word two screens apart, and the correction is the wording the pack had already chosen",
  },
  {
    phrase:
      "A model also has a range of inputs where it makes sense, and a negative count of hours sits outside it.",
    why: "R32, the same 'range' collision as the LIN.4 entries above and STRICTLY WORSE, because LF.3 is era EIGHT and so lands one era AFTER FUN.2 has defined the range as the outputs. A learner who has just been taught that the range is what a rule can hand back is now told a model 'has a range of inputs', which is the domain. This was not in the census that found the LIN.4 pair -- it surfaced only on re-reading the term in era order across all sixty-two packs -- and it is the reason the repair could not stop at era three. Rewritten to 'a stretch of inputs'",
  },
  {
    phrase:
      "A prediction inside the range of inputs the model came from is an **interpolation** and is usually safe, while one outside that range is an **extrapolation**, and the further out you reach the less the model can promise.",
    why: "the same objection in the next slide of the same pack, two uses in one sentence, banned separately because the ledger bans sentences rather than claims. The interpolation and extrapolation definitions are correct and survive the rewrite untouched; it is the word carrying them that moves to 'stretch'",
  },
  {
    phrase:
      "The units also fix the range: $x = -2$ hours means nothing here, so the model speaks only for $x \\ge 0$.",
    why: "the same objection in LF.3 worked_examples[2].steps[3]. Rewritten to 'The units also fix which inputs make sense', which says what the step is actually doing and needs no word for the set at all",
  },
  {
    phrase:
      "$5$ lies between $2$ and $8$, inside the range the readings covered, so that prediction is an interpolation.",
    why: "the same objection in LF.3 worked_examples[3].steps[1], banned separately because a reword is not a substring and because this step and the one below it are where a learner watches the word get applied to a pair of x-values",
  },
  {
    phrase:
      "$20$ sits far outside the range from $2$ to $8$, so that one is an extrapolation, and nothing in the readings promises the rate still holds there.",
    why: "the same objection in LF.3 worked_examples[3].steps[3], the fifth and last use in the pack. Repairing the four above and leaving this one would put the wrong sense in the final step of the final worked example, which is the last thing a learner reads before the CFU",
  },
  {
    phrase:
      "The perfect square piece collapses to a whole number and steps out in front of the radical, where the number standing in front is called the **coefficient**.",
    why: "R32, and the first of three re-introductions of a word era ONE already spent. Read in era order, `coefficient` is used bare six times in NUM.4 (era 1, 'Adding the coefficients' as a slide subtitle, and a worked step that assumes 'whose coefficient of $1$ is written by leaving it off') and is then introduced as new in RAD.1 (era 2), LIN.1 (era 3) and POL.1 (era 4), in three different domains. This gloss is also the one that does not survive contact with the others: 'the number standing in front' of a RADICAL says nothing about multiplying a variable, so a learner meeting LIN.1's 'the number multiplying the variable' next has two definitions and no reason to think they are the same word. Fixed by earning the term where it is first used -- NUM.4 mini_lesson[1] now opens 'A term's coefficient is the number in front of it' -- and by making this sentence a USE rather than a definition, tied back to the general role ('the same number-in-front role a coefficient plays in a term like $5x$'). NUM.4's own sentence has no entry here and cannot have one: the fix there was to add a gloss ahead of it and drop the bold from 'add the coefficients', and `normalizeProse` strips emphasis, so the objected wording and the shipped correction normalize to the same string",
  },
  {
    phrase:
      "Undoing each of those with the move that reverses it is what an **inverse operation** is, and the number multiplying the variable is its **coefficient**.",
    why: "the second re-introduction of `coefficient`, in LIN.1 (era 3), banned separately because a reword is not a substring and because this is a different domain from the entry above. The definition itself is the correct general one, which is why it is now the one NUM.4 carries; what is banned is its arrival here as an INTRODUCTION two eras after the word was first spent. The **inverse operation** gloss in the first half is untouched by the objection and survives verbatim in the rewrite, which also uses the slide's own need for the word ('dividing by it is the move that undoes it') instead of merely naming it",
  },
  {
    phrase:
      "Each separate piece of a written amount is a **term**, the number in front of a term is its **coefficient**, and a sum of terms built from one variable raised to whole-number powers is a **polynomial**.",
    why: "the third re-introduction of `coefficient`, in POL.1 (era 4). **term** and **polynomial** are genuinely new here and both keep their bold in the rewrite; it is the middle clause, presenting a word from era one as the third of three first meetings, that was cut to 'carrying its coefficient in front of it'. POL.1 slide 4's **leading coefficient** is a real compound term and is untouched",
  },
  {
    phrase:
      "A coefficient is the number in front of a term, so the coefficient of $5x$ is $5$.",
    why: "the section-2 copy of the entry above, in POL.1 worked_examples[0].steps[1], banned separately because the ledger bans sentences rather than claims and because a definition in a worked step is read as an introduction just as a lecture sentence is. Rewritten as a reading rather than a definition ('The number in front of $5x$ is $5$, so that is its coefficient'), which is what the step is for",
  },
  {
    phrase:
      "The denominator cannot be zero, so an input that empties it has no point above it on the chart, and the **domain** is the set of every other input, written in set-builder form as $\\{x \\mid x \\ne c\\}$.",
    why: "R32. RAT.5 is era six and hands over both the NAME and the SYMBOLS of set-builder notation with no account of either, then writes an answer in it in the same slide's worked example. The braces and the bar are explained only in EL.4, era NINE and two domains later. A learner would read `\\mid` as a division or absolute-value bar, both of which they have met and this one is not, and read the whole thing as an expression to evaluate rather than as a description of a set; the cost is comprehension of the worked example rather than a grading dead end, since RAT.5's CFU does not require typing it. Fixed where the notation is first used, by glossing the two symbols in place",
  },
  {
    phrase:
      "**Set-builder notation** writes the two cases as $\\{x \\mid x > h\\}$ and $\\{x \\mid x < h\\}$, where the braces say the collection of all values of $x$ for which the condition after the bar holds.",
    why: "the far end of the entry above: once RAT.5 explains the notation where it is first used, EL.4's bolded arrival three eras later is a second first meeting. The sentence is correct and its two cases are the point of the slide, so both survive; what is cut is the introduction ('each naming every $x$ for which the condition after the bar holds' now reads as a reminder). Do not restore this without also removing the gloss from RAT.5, or the notation goes back to being used three eras before it is explained",
  },
  {
    phrase:
      "A simplified expression and the one it came from can therefore disagree at exactly one input, and the excluded value is what records the disagreement.",
    why: "R32. RAT.1 is era five and FUN.1, which glosses **function**, **input** and **output**, is era seven, so all three are used in their precise technical sense two eras before a learner is given any of them. Cheap to avoid and that is what makes it a finding rather than a nit: 'exactly one value of $x$' loses nothing at all here. RAT.5 (era six) keeps its uses of the same three words and is deliberately not repaired -- it is a graph-reading node titled 'Graph and analyze rational functions', so the word is unavoidable, and its opening slide glosses the other two operationally in place ('with output on the vertical axis and input on the horizontal axis')",
  },
  {
    phrase:
      "Report only the expression and the answer is incomplete, because a rational expression is not the same function as its reduced form until the restrictions travel with it.",
    why: "the same objection in RAT.1's last slide and the strongest instance of it, banned separately because the ledger bans sentences rather than claims. 'Not the same function' is doing the WHOLE work of the slide's closing claim, and 'function' is the word the learner has not been given, so the sentence lands as nothing at all. Rewritten to say the same thing in values ('the reduced form accepts a value the original never did unless the restrictions travel with it'), which is also more concrete than what it replaces",
  },
  {
    phrase:
      "The product and its simplified form are the same function everywhere except at those values, which is exactly why they have to be listed.",
    why: "the same objection in RAT.2, the neighbouring era-five pack, banned separately because a reword is not a substring and because a per-domain round reading D5 alone cannot see that FUN.1 is two eras downstream. 'Agree everywhere except at those values' carries the identical claim without the term",
  },
  {
    phrase:
      "So the yard reports the plain distance and throws the sign away, which is what the **absolute value** of a number is: its distance from zero, written between two upright bars.",
    why: "R32's repetition half rather than its unearned half: `absolute value` is introduced as new FOUR times, in NUM.S (era 1), RAD.4 (era 2), LIN.5 (era 3) and FUN.10 (era 8). RAD.4 earns its re-introduction by adding the $|x|$ notation to era one's concept; the last two restate concept and notation together and add nothing, so each spends a slide opening on ground the learner already holds. LIN.5's own new idea is distance from a STANDARD rather than from zero, and the rewrite reaches it a sentence earlier",
  },
  {
    phrase:
      "**Absolute value** is that rule written down: $\\lvert 7 \\rvert = 7$ and $\\lvert -7 \\rvert = 7$, because the output is the distance from zero with the sign discarded.",
    why: "the fourth introduction of `absolute value`, in FUN.10 (era 8), banned separately from the LIN.5 entry above because a reword is not a substring. The two worked values are kept, since naming the rule on a concrete pair is how the slide starts; the trailing clause restating the definition for the fourth time is what was cut, leaving the slide to get to its actual subject, the graph of $y = \\lvert x \\rvert$",
  },
  {
    phrase:
      "The set of inputs a function accepts is its **domain**, so a logarithm's domain is whatever keeps its argument above zero.",
    why: "R32's repetition half again: `domain` is introduced as new three times, in RAT.5 (era 6), FUN.2 (era 7) and EL.4 (era 9). Note the ordering the era view exposes and a per-domain round cannot -- the canonical introduction in the functions pack arrives SECOND, because RAT.5 reaches it an era earlier in play. FUN.2 keeps its gloss because the pairing of domain against range is that node's entire subject and neither half can be stated without the other; EL.4's is the one that is pure repetition, and it is now a parenthetical reminder",
  },
  {
    phrase:
      "A **vertical asymptote** is a heading like that one: the function has no value there at all, and its values run away without bound on the way in.",
    why: "R32's repetition half, and the longest gap in the set: `vertical asymptote` is introduced in RAT.5 (era 6), again in EL.4 (era 9), and defined from scratch here in TRG.6 (era 10), four eras after the first. The dish-yard hook this sentence closes is genuinely new and is untouched -- it is the trig instance of the idea -- so the fix is the sentence's SHAPE rather than its content: 'A heading like that one is a vertical asymptote' classifies the instance the slide just built, where 'A vertical asymptote is a heading like that one' announces a first meeting. EL.4's third use is not banned, because there the repair was to drop a bold from a sentence that identifies THIS graph's asymptote rather than defining the term, and `normalizeProse` cannot tell a de-emphasis from the original",
  },
  {
    phrase:
      "Getting the order right is most of the skill here, and it is the same order for every polynomial rule.",
    why: "R34's null half: FUN.6 slide 3 asserted that the ordering is the skill while carrying no mathematics at all, because its worked_examples entry was null, so the claim WAS the slide. Seven of the tree's eight nulls are defensible definition slides and this one was not, for exactly that reason. The slide now works the difference quotient of $f(x) = x^{2} + 6x$ with each step naming the dependency that forces its position, which is the same claim demonstrated rather than announced. The surviving sentence keeps the durable half ('The same chain of dependencies holds for every polynomial rule'), so what is banned is the self-assessment in front of it -- telling a learner which part is most of the skill is the pack grading its own difficulty, and it reads as filler on a slide that has since stopped being empty",
  },
];

/**
 * Prose, flattened to the form the banned list is matched against: case folded, markdown
 * emphasis dropped and whitespace collapsed. Without this a ban is evaded by re-wrapping a
 * line, changing a capital, or bolding one word inside the sentence, none of which change
 * what the learner reads.
 */
function normalizeProse(text) {
  return text.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

const BANNED_NORMALIZED = BANNED_PHRASES.map((entry) => ({
  ...entry,
  needle: normalizeProse(entry.phrase),
}));

/* ------------------------------------------------------------------------------------- *
 * WIDGET COPY. Pulling learner-visible prose out of TSX, and what that cannot reach.
 *
 * There is no parser to lean on: this repo's `typescript` is the native build, which
 * exports `version` and nothing else (no `createSourceFile`), and no other JS/TS parser is
 * a dependency. Adding one for a QA script is out of proportion, so what follows is a
 * deliberately small character scanner. It is NOT a parser and does not pretend to be one.
 *
 * It emits PROSE RUNS. A run is a stretch of learner-visible text: either one quoted
 * literal, or a stretch of JSX text with element tags and interpolations elided. Elements
 * are elided rather than ended, so `at <InlineMath ... />, never` stays one run, which is
 * how the learner reads it. `{" "}` contributes its space and a `{value}` contributes a
 * gap, so a sentence wrapped across source lines stays one run.
 *
 * WHAT THIS CANNOT CATCH, so the sweep is not read as full coverage:
 *  - A banned sentence broken by anything other than a tag, `{" "}` or a bare `{value}`.
 *    A conditional (`{flag ? "half a sentence" : ...}`) ends the run, so a sentence
 *    assembled across a conditional is seen as its pieces and not as the sentence.
 *  - A sentence assembled at RUN TIME from parts (`${verb} the copies out`) or read from
 *    data outside these files. Only source text is visible here.
 *  - Copy outside the paths passed in. The documented invocation now names the whole
 *    `apps/web/src/lessons` tree, so `widgetFeedback.tsx`, `workedSolutionVisuals.tsx` and
 *    the rest of the lesson shell are inside the ledger's reach; the REST of `apps/web`, and
 *    `packages/shared-components`, are not swept unless named and nobody has measured what
 *    learner prose lives there.
 *  - `*.test.tsx` and `*.spec.tsx` are skipped on purpose: a test may quote a banned
 *    sentence in order to assert it is gone, and firing on that would be a false positive.
 *  - Backslashes inside quoted literals are unwrapped as if every literal were a JS string,
 *    which mangles LaTeX in JSX attributes (`latex="\right"`). Prose has no backslashes, so
 *    rule 6 is unaffected; do not build a LaTeX rule on these runs.
 * ------------------------------------------------------------------------------------- */

const TSX_QUOTES = new Set(['"', "'", "`"]);

/**
 * Whether `src[i]` opens a literal rather than being an apostrophe inside prose.
 *
 * `That's the amount at` is JSX text, and reading its apostrophe as a quote swallows the
 * rest of the line and can split a sentence in two, which is a MISS. No JavaScript literal
 * opens directly after a letter or a digit, so that is the whole test.
 */
function opensLiteral(src, i) {
  if (!TSX_QUOTES.has(src[i])) return false;
  if (src[i] !== "'") return true;
  return !/[A-Za-z0-9]/.test(src[i - 1] ?? "");
}

/** A `{...}` span starting at `src[i]`, brace-balanced with quotes respected. */
function braceSpan(src, i) {
  let depth = 0;
  let j = i;
  while (j < src.length) {
    const ch = src[j];
    if (opensLiteral(src, j)) {
      j = readLiteral(src, j).end;
      continue;
    }
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { inner: src.slice(i + 1, j), end: j + 1 };
    }
    j += 1;
  }
  return null;
}

/**
 * A quoted literal starting at `src[i]`, as the value a reader would see: escapes unwrapped
 * to their payload, `\n` and friends flattened to a space, and a template literal's `${...}`
 * left as a gap.
 */
function readLiteral(src, i) {
  const quote = src[i];
  let value = "";
  let j = i + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === "\\") {
      const payload = src[j + 1] ?? "";
      value += payload === "n" || payload === "t" || payload === "r" ? " " : payload;
      j += 2;
      continue;
    }
    if (ch === quote) return { value, end: j + 1 };
    if (quote === "`" && ch === "$" && src[j + 1] === "{") {
      const span = braceSpan(src, j + 1);
      if (span === null) return { value, end: src.length };
      value += " ";
      j = span.end;
      continue;
    }
    // An unterminated single- or double-quoted literal is a desync, not a multi-line string.
    if (quote !== "`" && ch === "\n") return { value, end: j };
    value += ch;
    j += 1;
  }
  return { value, end: j };
}

/** A member path, so `{outer}` and `{variant.nonce}` are gaps in a sentence, not code. */
const SIMPLE_INTERPOLATION = /^[A-Za-z_$][\w.$]*$/;

/**
 * What a JSX `{...}` contributes to the run around it, or `null` when it is code and ends
 * the run. Only the two forms that appear MID-SENTENCE are spliced: a bare string literal
 * (the `{" "}` line-wrap idiom) and a plain value. Anything holding a conditional or a call
 * is left to be scanned as code, so the literals inside it are still reached.
 */
function interpolationText(inner) {
  const trimmed = inner.trim();
  if (TSX_QUOTES.has(trimmed[0])) {
    const literal = readLiteral(trimmed, 0);
    if (literal.end === trimmed.length) return literal.value;
  }
  return SIMPLE_INTERPOLATION.test(trimmed) ? " " : null;
}

/** The prose runs in a TSX source, each with the offset it starts at. */
function proseRuns(src, offset = 0) {
  const runs = [];
  let bare = "";
  let bareAt = offset;

  const flush = () => {
    if (bare.trim().length > 0) runs.push({ at: bareAt, value: bare });
    bare = "";
  };
  /** Anchor the run at its first non-blank character, so the reported line is the prose. */
  const open = (i) => {
    if (bare.trim().length === 0) bareAt = offset + i;
  };

  /** `true` between `<name` and the `>` that closes it: attribute list, not children. */
  let inTag = false;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    const pair = src.slice(i, i + 2);

    if (!inTag && pair === "//") {
      flush();
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (!inTag && pair === "/*") {
      flush();
      const close = src.indexOf("*/", i + 2);
      i = close === -1 ? src.length : close + 2;
      continue;
    }
    if (opensLiteral(src, i)) {
      const literal = readLiteral(src, i);
      // An attribute's value is its own string; JSX text around it keeps running.
      if (!inTag) flush();
      if (literal.value.trim().length > 0)
        runs.push({ at: offset + i, value: literal.value });
      i = literal.end;
      continue;
    }
    if (ch === "{") {
      const span = braceSpan(src, i);
      const spliced = span === null ? null : interpolationText(span.inner);
      if (span !== null && spliced !== null) {
        open(i);
        bare += spliced;
        i = span.end;
        continue;
      }
      flush();
      if (span === null) {
        i += 1;
        continue;
      }
      runs.push(...proseRuns(span.inner, offset + i + 1));
      i = span.end;
      continue;
    }
    if (ch === "<" && /[A-Za-z>/]/.test(src[i + 1] ?? "")) {
      const tag = /^<\/?[A-Za-z][\w.:-]*|^<\/?/.exec(src.slice(i));
      open(i);
      bare += " ";
      inTag = true;
      i += tag === null ? 1 : tag[0].length;
      continue;
    }
    if (inTag) {
      if (ch === ">") inTag = false;
      i += 1;
      continue;
    }
    if (ch === "}") {
      flush();
      i += 1;
      continue;
    }
    open(i);
    bare += ch;
    i += 1;
  }

  flush();
  return runs;
}

/**
 * Words common enough that any English sentence of this length has one, and rare enough in
 * TypeScript that a type body does not. Used only to keep the printed COUNT meaningful.
 */
const PROSE_MARKERS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "each",
  "every",
  "for",
  "in",
  "is",
  "it",
  "not",
  "of",
  "on",
  "one",
  "or",
  "so",
  "that",
  "the",
  "then",
  "this",
  "to",
  "two",
  "with",
  "you",
  "your",
]);

/**
 * Whether a run reads as a sentence rather than as code: four or more space-separated
 * English-shaped words in a row, at least one of them a common function word. A chunk
 * ending in a colon breaks the chain, which is what keeps `id: string; latex: string` out.
 *
 * This decides the COUNT ONLY. Every run is matched against the banned list whatever this
 * returns, so a filter that is too strict can never hide a finding.
 */
function looksLikeProse(text) {
  let chain = 0;
  let longest = 0;
  let marker = false;
  for (const chunk of text.trim().split(/\s+/)) {
    if (!/^[A-Za-z][a-z']*[.,;!?)]?$/.test(chunk)) {
      chain = 0;
      continue;
    }
    chain += 1;
    if (chain > longest) longest = chain;
    if (PROSE_MARKERS.has(chunk.replace(/[^A-Za-z']/g, "").toLowerCase())) marker = true;
  }
  return longest >= 4 && marker;
}

/** The learner-facing strings a lesson pack holds, each with a path for the finding. */
function learnerStrings(pack) {
  const out = [];
  const push = (where, value) => {
    if (typeof value === "string" && value.length > 0) out.push({ where, value });
  };

  push("title", pack.title);
  if (Array.isArray(pack.mini_lesson)) {
    for (let i = 0; i < pack.mini_lesson.length; i += 1) {
      push(`mini_lesson[${i}]`, pack.mini_lesson[i]);
    }
  }
  // The heading over each slide. Added 2026-08-01: it was the one learner-visible pack field
  // with no rule here at all, and era nine's `compound*` census turned on it -- the word
  // appeared exactly once across six packs and that once was a subtitle, so a ledger entry
  // quoting a subtitle could never have fired.
  if (Array.isArray(pack.slide_subtitles)) {
    for (let i = 0; i < pack.slide_subtitles.length; i += 1) {
      push(`slide_subtitles[${i}]`, pack.slide_subtitles[i]);
    }
  }
  // Section 2's prompt and steps (R34's `worked_examples`), read from the day the field became
  // authorable rather than after a ledger entry had already failed to fire on it: the two fields
  // above are both here because they were added late, and the whole lesson of that was that a
  // field this script does not read reports the same nothing as a clean one. Aligned by position
  // with `mini_lesson`, and an entry may legitimately be absent or `null` where a slide has no
  // example. The PROMPT is read as well as the steps, and for the same reason one field along:
  // it is the newest string on the surface, so it is the one a sweep is likeliest to be blind to.
  if (Array.isArray(pack.worked_examples)) {
    for (let i = 0; i < pack.worked_examples.length; i += 1) {
      const example = pack.worked_examples[i];
      if (!example || typeof example !== "object" || Array.isArray(example)) continue;
      push(`worked_examples[${i}].prompt`, example.prompt);
      if (!Array.isArray(example.steps)) continue;
      for (let j = 0; j < example.steps.length; j += 1) {
        push(`worked_examples[${i}].steps[${j}]`, example.steps[j]);
      }
    }
  }
  // A pack may carry a per-placement caption of its own, distinct from the registry's.
  if (Array.isArray(pack.visuals)) {
    for (let i = 0; i < pack.visuals.length; i += 1) {
      push(`visuals[${i}].caption`, pack.visuals[i]?.caption);
    }
  }
  const cfu = pack.cfu;
  if (cfu && typeof cfu === "object") {
    push("cfu.prompt", cfu.prompt);
    push("cfu.hint", cfu.hint);
    // The reveal's steps: the copy a learner reads AFTER getting the check wrong, which is
    // exactly the surface R33 is about. Added 2026-08-01, on measurement rather than on
    // principle: four ledger entries written for era nine quoted sentences from this field and
    // every one of them silently matched nothing, because the header's claim that "every string
    // a pack holds is a field this script reads by name" was false of this one.
    if (Array.isArray(cfu.worked_solution)) {
      for (let i = 0; i < cfu.worked_solution.length; i += 1) {
        push(`cfu.worked_solution[${i}]`, cfu.worked_solution[i]);
      }
    }
    if (Array.isArray(cfu.accepted)) {
      for (let i = 0; i < cfu.accepted.length; i += 1) {
        push(`cfu.accepted[${i}]`, cfu.accepted[i]);
      }
    }
  }
  return out;
}

/**
 * The `$...$` spans in a string. A dollar amount is authored `\$`, so only an unescaped
 * `$` delimits math, and an unclosed span yields nothing rather than swallowing the tail
 * (rule 1 reports that case on its own).
 */
function mathSpans(text) {
  return Array.from(text.matchAll(/(?<!\\)\$([^$]*)(?<!\\)\$/g), (m) => m[1] ?? "");
}

/** Unescaped `$` count. Odd means a span never closes. */
function delimiterCount(text) {
  return text.replace(/\\\$/g, "").split("$").length - 1;
}

/** One finding, quoting enough of the string that the reader can find it by eye. */
function report(findings, file, where, code, detail, quote) {
  findings.push({
    file: basename(file),
    where,
    code,
    detail,
    quote: quote.length > 120 ? `${quote.slice(0, 117)}...` : quote,
  });
}

/** Rule 6 on its own, because it is the one rule that reaches both surfaces. */
function scanBannedPhrases(findings, file, where, text) {
  const prose = normalizeProse(text);
  for (const { phrase, why, needle } of BANNED_NORMALIZED) {
    if (prose.includes(needle)) {
      report(
        findings,
        file,
        where,
        "BANNED_PHRASE",
        `a sentence a reviewer already had removed is back: "${phrase}" ${why}`,
        text,
      );
    }
  }
}

function scanString(findings, file, where, text) {
  if (delimiterCount(text) % 2 !== 0) {
    report(
      findings,
      file,
      where,
      "UNBALANCED_MATH",
      "odd number of unescaped $, so a math span never closes and the rest of the string renders as run-on math (author a literal dollar amount as \\$)",
      text,
    );
  }

  if (text.includes("[object Object]")) {
    report(
      findings,
      file,
      where,
      "OBJECT_LITERAL",
      "the literal string [object Object]: an object was interpolated where a value was meant",
      text,
    );
  }

  scanBannedPhrases(findings, file, where, text);

  if (NUMERAL_ADJACENCY.test(text)) {
    report(
      findings,
      file,
      where,
      "NUMERAL_ADJACENCY",
      "a math span ends on a digit, a full stop, then a math span opens on a digit, so the two read as one number with a decimal point in it; put a word between them",
      text,
    );
  }

  for (const span of mathSpans(text)) {
    for (const { glyph, write } of UNICODE_OPERATORS) {
      if (span.includes(glyph)) {
        report(
          findings,
          file,
          where,
          "UNICODE_OPERATOR",
          `Unicode "${glyph}" inside a math span; KaTeX passes it through unchanged, so write ${write}`,
          span,
        );
      }
    }
    if (COLLAPSED_SQRT.test(span)) {
      report(
        findings,
        file,
        where,
        "COLLAPSED_RADICAL",
        "\\sqrt with no radicand; a radical with nothing under it is a different statement",
        span,
      );
    }
  }
}

function scanPack(file, findings) {
  let pack;
  try {
    pack = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    report(findings, file, "(file)", "INVALID_JSON", err.message, "");
    return;
  }
  const nodeId = typeof pack.node_id === "string" ? pack.node_id : "(no node_id)";
  for (const { where, value } of learnerStrings(pack)) {
    scanString(findings, file, `${nodeId} ${where}`, value);
  }
}

/**
 * One widget source. Returns the runs so the caller can count them; only rule 6 applies,
 * for the reasons in the scope note at the top of the file.
 */
function scanWidget(file, findings) {
  const src = readFileSync(file, "utf8");
  const runs = proseRuns(src);
  for (const run of runs) {
    const line = src.slice(0, run.at).split("\n").length;
    scanBannedPhrases(
      findings,
      file,
      `line ${line}`,
      run.value.replace(/\s+/g, " ").trim(),
    );
  }
  return runs;
}

const WIDGET_SOURCE = /\.tsx?$/i;
/** A test may quote a banned sentence to assert it is gone; that is not shipped copy. */
const TEST_SOURCE = /\.(test|spec)\.tsx?$/i;

/** Widget sources under a directory, recursively. */
function collectWidgets(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      found.push(...collectWidgets(path));
    } else if (WIDGET_SOURCE.test(name) && !TEST_SOURCE.test(name)) {
      found.push(path);
    }
  }
  return found;
}

/**
 * Resolve argv into lesson packs and widget sources. A directory yields its `*.json` packs
 * exactly as before, non-recursively, plus any widget sources beneath it, so passing a
 * domain directory behaves identically to before this file learned about TSX.
 */
function collectFiles(args) {
  const packs = [];
  const widgets = [];
  for (const arg of args) {
    let info;
    try {
      info = statSync(arg);
    } catch {
      console.error(`Cannot access path: ${arg}`);
      process.exit(2);
    }
    if (info.isDirectory()) {
      for (const name of readdirSync(arg)) {
        if (name.toLowerCase().endsWith(".json")) packs.push(join(arg, name));
      }
      widgets.push(...collectWidgets(arg));
    } else if (arg.toLowerCase().endsWith(".json")) {
      packs.push(arg);
    } else if (WIDGET_SOURCE.test(arg) && !TEST_SOURCE.test(arg)) {
      widgets.push(arg);
    }
  }
  return { packs, widgets };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node scan-lesson-text.mjs <domain-dir | pack.json ...>");
    process.exit(2);
  }

  const { packs, widgets } = collectFiles(args);
  if (packs.length === 0 && widgets.length === 0) {
    console.error("No .json lesson packs or widget sources found in the given path(s).");
    process.exit(2);
  }

  const findings = [];
  for (const file of packs) {
    scanPack(file, findings);
  }

  // Counts, so a run that swept nothing cannot be mistaken for a run that found nothing.
  const strings = packs.reduce((total, file) => {
    try {
      return total + learnerStrings(JSON.parse(readFileSync(file, "utf8"))).length;
    } catch {
      return total;
    }
  }, 0);

  let runs = 0;
  for (const file of widgets) {
    for (const run of scanWidget(file, findings)) {
      if (looksLikeProse(run.value)) runs += 1;
    }
  }

  const swept =
    widgets.length === 0
      ? `${strings} learner-facing string(s) across ${packs.length} pack(s)`
      : `${strings} learner-facing string(s) across ${packs.length} pack(s) and ${runs} prose-shaped run(s) across ${widgets.length} widget file(s)`;

  if (findings.length === 0) {
    console.log(`OK: ${swept}, no rendering artifacts.`);
    process.exit(0);
  }

  console.error(`FAIL: ${findings.length} finding(s) over ${swept}:`);
  for (const f of findings) {
    console.error(`  - ${f.file} ${f.where}: [${f.code}] ${f.detail}`);
    if (f.quote) console.error(`      ${f.quote}`);
  }
  process.exit(1);
}

main();
