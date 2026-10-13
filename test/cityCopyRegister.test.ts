import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE CITY'S OWN COPY, AGAINST THE REGISTER THE LEAD HAS RULED ON THREE TIMES.**
 *
 * Two of these rules already exist as assertions over ONE corpus: `crisisCall.test.ts`
 * sweeps the crisis briefing for em-dashes and for purchase words. Its own header says why
 * that was never enough — *"every one of them is currently enforced by nothing: the
 * lesson-pack scanner does not read TSX and is not in any CI step, so a `—` in a city
 * component ships"*. It was right, and this is the general case: **the population is every
 * source in Gabe's lanes, not the one module somebody remembered to build a corpus from.**
 *
 * Measured before the pass this file lands with: 50 em-dashes outside comments across those
 * lanes, of which 32 were in strings a learner can read.
 *
 * ## What it checks, and the ruling behind each
 *
 *  - **No em-dash or en-dash.** *"Colon or restructure."* A rule the lead has restated on
 *    the lesson side repeatedly and which the city side had no enforcement for at all.
 *  - **A refusal may not OPEN with a negation.** *"Rephrase this to be a little more
 *    encouraging: something like 'let's try to get it perfect' so that its more positive
 *    reinforcement than negative."* The information about what did not happen is often
 *    load-bearing (a broke player has to know they were not charged), so it is not deleted:
 *    it stops being the first thing read. A sentence starting *"Not enough stone..."* leads
 *    with the shortfall; one starting *"Repairs cost 60 stone, and your stockpile is
 *    untouched"* carries the same two facts in the other order.
 *
 * ## THE POPULATION IS WHAT A LEARNER CAN READ, AND IT USED TO BE THREE DIRECTORIES
 *
 * It was `apps/web/src/city`, `apps/web/src/economy` and `apps/web/src/winter`. That is where
 * the copy this rule was written for happens to live, and `.cursor/rules/qa-verification.mdc`
 * is about exactly that substitution: **define a guard's population by who exhibits the
 * behaviour, not by where the behaviour is implemented.** The behaviour is *"this source can
 * put a sentence in front of a learner"*, and three directories is a narrower claim than that
 * one, in a way whose cost was measurable rather than hypothetical.
 *
 * **Measured at the widening, over the sources those three directories left out: 10 em-dashes
 * in strings a learner reads and one refusal that opened with its own failure.** Among them
 * `TitleScreen.tsx`, which is the FIRST screen in the product, and eight in
 * `diagnostic/DiagnosticRunner.tsx`, which is the placement check every new learner takes
 * before they have seen the city at all. `OWNERS.md:23` is why those are in scope: *"Gabe
 * holds the city and its 3D layer, the crises, the era model and progressions, the economy,
 * persistence, **the diagnostic**, and CI/tooling"*.
 *
 * So the population is now the whole tracked `.ts`/`.tsx` tree under `apps/web/src`, minus
 * tests and minus the named exceptions below. Comments are removed before the scan because
 * this codebase's prose style uses em-dashes heavily in docblocks and that is not a learner
 * surface; exempting them by FILE instead would have exempted the copy beside them.
 *
 * The floors matter more than usual here, because the claim is an absence over a large set
 * and *"we swept 146 files and found nothing"* is also exactly what a broken sweep reports.
 * So the tree is floored, the stripped corpus is floored, and the stripper is asserted
 * against a fixture in both directions: it must remove a docblock em-dash and it must keep a
 * string one. **And the widening has its own floor**, asserted as composition rather than as
 * size: a floor of 140 is satisfied by 140 of anything, so the four surfaces the old
 * population missed are named and required to be IN the sweep, and one lane it must still not
 * reach is named too.
 *
 * ## ⚑ AND THE FILE LIST WAS ONLY HALF OF IT: THE CORPUS WAS STRING LITERALS
 *
 * Widening from three directories to every file fixed WHICH FILES are opened and left
 * untouched WHAT IS READ INSIDE THEM. Both rules below scanned `literals()` — every `"..."`
 * and `` `...` `` in the source — so a sentence written as **JSX text** was not in the
 * population at all, on any of the 146 files. That is the same substitution one layer in:
 * *string literal* is a fact about how the copy is stored, and *a sentence a learner reads*
 * is a fact about the product.
 *
 * **The sentence that exposed it.** Every civic card in the build menu carried
 *
 *     Not enough {materialLabel} yet: you have {materialAvailable}
 *
 * which is the exact shape the ruling above is about — the shortfall read first, before the
 * fact — and this file was green over it on every run, because the sentence is JSX text
 * rather than a literal. A screen-reader snapshot of one of those buttons read *"The Granary
 * 40 Livability 2×1 plot 140 grain Not enough grain yet: you have 0"*.
 *
 * **Learner-visible prose is learner-visible prose whichever shape it arrives in**, so the
 * corpus is now all four: a string literal, a template literal, JSX text, and a literal in a
 * children conditional or a text-bearing attribute like `aria-label`. See {@link ProseKind}
 * and {@link renderedRuns}, and {@link IS_A_SENTENCE} for the SECOND narrowing this found —
 * a punctuation test that was hiding every UI tag in the lanes, the Granary's included.
 *
 * **Measured at this widening: twelve more sentences led with a negation**, over five lanes
 * the old corpus reached every file of and read none of the JSX in — the build menu twice,
 * the plague conclusion twice, the plague surface, the succession conclusion, ledger and
 * surface, the winter's ruin popup, the era door twice and the auth gate. Each is rewritten
 * in this pass. Five prose-shaped strings that no learner reads are named in
 * {@link LEADS_NOTHING_A_LEARNER_READS} instead, with reasons and three-way assertions.
 *
 * ## THE EXCEPTIONS ARE NAMED, WITH REASONS, AND FAIL BOTH WAYS
 *
 * A source that does not owe this rule and a source that forgot it look identical from outside
 * the guard, so quietly filtering the first is how the second ships. Each is listed with why,
 * and each is asserted in both directions: it must still exist and still hold sources, and it
 * must still be the kind of thing the reason describes.
 *
 * Two kinds, and the distinction is the point rather than bookkeeping:
 *
 *  - **`apps/web/src/lessons/` is ANOTHER OWNER'S**, not exempt. `OWNERS.md:15` gives Anthony
 *    the lesson layer, and §6.2 of the backlog costs the audit as *"Lane: split... the city
 *    copy is Gabe's and the lesson copy is Anthony's, so it is two reviews or two changes"*.
 *    Sweeping it here would be this pass ruling on his copy without his review.
 *  - **The rest reach no learner at all**: a retired scaffold, two `?query` developer hatches
 *    and one procurement brief.
 */

const repoRoot = resolveRepoRoot();

/**
 * Everything a learner can read in the web app. Narrowed only by {@link UNREACHABLE}.
 *
 * One root rather than a list of directories, so a surface added tomorrow joins this sweep
 * with no edit. That is the shape that stops a population narrowing back to a sample by
 * neglect, and narrowing is what it had already done.
 */
const LANES = ["apps/web/src"];

/**
 * Paths this rule does not reach, each with its reason.
 *
 * `dir` is matched as a prefix, so an entry may name a directory or a single file. Every one
 * of them is a claim that a whole surface is either somebody else's or unopenable, which is
 * the kind of claim that belongs in a list somebody has to read rather than in a filter.
 */
const UNREACHABLE: readonly { readonly dir: string; readonly why: string }[] = [
  {
    dir: "apps/web/src/lessons/",
    why: "ANOTHER OWNER'S LANE, not an unreachable surface: OWNERS.md gives Anthony the lesson layer, and the backlog costs this audit as a split lane, so sweeping his copy here would be ruling on it without his review",
  },
  {
    dir: "apps/web/src/city/storm/",
    why: "the retired storm scaffold: no non-test importer outside its own directory, so nothing here is on a screen a learner can open",
  },
  {
    dir: "apps/web/src/DevLessons.tsx",
    why: "the ?dev escape hatch, which swaps the whole app for a developer's list of every lesson: its reader is a reviewer looking for a widget, not a learner studying",
  },
  {
    dir: "apps/web/src/diagnostic/GraphProbe.tsx",
    why: "the ?graph escape hatch, same reason: a probe for exercising the graph answer type, reached only by typing the query string",
  },
  {
    dir: "apps/web/src/audio/eraMusic.ts",
    why: "a PROCUREMENT brief rather than copy: its per-era strings say what track to source for each era and are read by whoever goes shopping, never rendered",
  },
];

/**
 * Surfaces the three-directory population missed, required to be in the widened one.
 *
 * The floor below constrains SIZE, and size is not the claim: 140 sources is satisfied by 140
 * of anything, including 140 that leave the title screen out again. These four are the
 * composition, and each one held a real offender when the widening was measured.
 */
const WIDENED_TO: readonly string[] = [
  "apps/web/src/TitleScreen.tsx",
  "apps/web/src/diagnostic/DiagnosticRunner.tsx",
  "apps/web/src/work-upload/WorkUpload.tsx",
  "apps/web/src/auth/AuthGate.tsx",
];

/**
 * The one file whose dashes are NOT this pass's to remove, with the reason.
 *
 * `islandGround.ts` is a VERBATIM transcription of the ten-era ladder table in
 * `docs/superpowers/specs/eras/README.md`, and it says so: *"nothing else is edited,
 * abridged or reworded"*. Three of its `step` sentences carry em-dashes and three of those
 * lines really do reach a learner, on the era-advance ceremony's retheme beat. Rewriting
 * them HERE would put the transcription out of step with the table it quotes, which is the
 * one property that file exists to hold, so the fix belongs in the table and the transcript
 * together and is deferred rather than done.
 *
 * The exemption is asserted in both directions: this file must still declare itself a
 * verbatim transcription of a NAMED source, and it must still actually carry dashes, so an
 * entry that has stopped describing anything fails here rather than sitting on.
 *
 * It deliberately does not READ the source table. `test/ciScopeFilter.test.ts` derives the
 * set of markdown files that executable code opens and requires each to be classified as
 * code in CI, and `eras/README.md` is in its prose sample: opening it here would make every
 * edit to that spec run the whole suite, which is a real cost to buy a third direction on one
 * exemption. The transcript's own docblock names the table instead, so the deferral still
 * records where the fix belongs.
 */
const VERBATIM_TRANSCRIPTION = {
  path: "apps/web/src/city/islandGround.ts",
  namesItsSource: "eras/README.md",
} as const;

/**
 * `MASTERED`, `Buildings`, tokens and identifiers are not sentences. A refusal is judged on
 * the FIRST sentence of a string, and only for strings long enough to be prose.
 *
 * ## WHAT THIS LEAVES OUT, named rather than left to be discovered
 *
 * The ruling is about a REFUSAL, and a floor of 24 is the line between a refusal and a state
 * label. It is also the one boundary of this rule that the widening did not move, so it is
 * worth writing down what sits under it at this tip: `Nothing chosen yet.` on the plague
 * surface (19), `No questions to ask` on the intrusion surface (19), `No batch to ask` on the
 * succession surface (15) and `Not built` on the city roster (9), which is paired with a
 * `Ready to build` that carries the positive beside it.
 *
 * Every one of those opens on a negation and none of them is a sentence a learner is refused
 * with. Raising the floor to reach them would pull in every three-word chip in the lanes and
 * ask for a rewrite of a vocabulary rather than of a refusal, which is a ruling this pass does
 * not have. They are recorded here so the next reader knows the boundary was measured.
 */
const PROSE_FLOOR = 24;

/**
 * An interpolation, standing in a run of prose: something renders here and it is not a
 * word.
 *
 * A distinct character rather than a space, because for this file's one rule the POSITION
 * of an interpolation is the whole question. `{refusal} Nothing was spent, so choose
 * again.` opens with the refusal reason and not with the negation, and a splice that
 * trimmed away would turn that sentence into an offender and this widening into a pass
 * that fires on innocent copy. It plays exactly the part `${...}` already plays for a
 * template literal in {@link IS_A_SENTENCE}: a sentence may open with an interpolation.
 */
const RENDERED_GAP = "\u0001";

/**
 * A run that STARTS something: a capital or an interpolation first.
 *
 * A clause spliced after a label starts nothing, and there is nothing to lead there. The
 * winter's tier ladder reads *"**Weak**: no fire at all, it never catches"* — an honest
 * preview's bottom rung — and its literal opens lower-case, which is what keeps it out.
 *
 * ## ⚑ THIS USED TO REQUIRE TERMINAL PUNCTUATION TOO, AND THAT IS THE SECOND NARROWING
 *
 * `ENDS_A_SENTENCE` (`/[.!?]$/`) stood beside this one, as a proxy for *"a whole sentence
 * rather than a clause"*. It is gone, because a UI TAG HAS NO FULL STOP: the shortfall note
 * on a civic card, a button's label, an empty-state line, an `aria-label` — none of them
 * ends in punctuation, and every one of them is a sentence a learner reads. It cut the
 * judged corpus from 891 literals to 386 and it was doing the same job as reading only
 * string literals, one dimension over: **deciding what counts as copy by a property of how
 * the copy is WRITTEN rather than by whether a learner reads it.**
 *
 * Measured, because the two narrowings compound and either one alone hides the sentence
 * this pass was sent for: with JSX text in the corpus and the punctuation test still in
 * place, *"Not enough grain yet: you have 0"* is still green, because it has no full stop.
 *
 * What the proxy was buying is now bought by naming what it excused:
 * {@link LEADS_NOTHING_A_LEARNER_READS} holds the five strings in the tree it was hiding,
 * each with a reason and each asserted three ways, so the tolerance is a list somebody
 * reads instead of a regex nobody questions.
 */
const IS_A_SENTENCE = new RegExp(`^[A-Z$${RENDERED_GAP}]`);

/** Openers that put the shortfall first. Anchored, so only a LEADING negation matches. */
const LEADS_WITH_A_NEGATION =
  /^\s*(not |no |nothing |never |none |cannot |can't |couldn't |failed |blocked |unable )/i;

/**
 * Sentences that legitimately open with a negation, each with its reason.
 *
 * A member of a correctly scoped population that does not owe the property, and a member
 * that forgot it, look identical from outside a guard — so these are named rather than
 * filtered, and the list is asserted in both directions below: an entry whose sentence has
 * gone fails, and a sentence that stops opening with a negation fails too, so the list
 * cannot go on excusing something it has stopped describing.
 *
 * All three are cases where the ABSENCE is the content. That is the test for this list: not
 * *"the negation reads all right here"* but *"there is no positive form of this claim"*.
 */
const NEGATION_IS_THE_CONTENT: readonly {
  readonly path: string;
  readonly sentence: string;
  readonly why: string;
}[] = [
  {
    path: "apps/web/src/winter/WinterConclusion.tsx",
    sentence: "Nothing came through the winter.",
    why: "the derived VERDICT at the bottom of the range. D-CRISIS-26 lets a winter end with every building in ruins, and a card that would not say so is the game failing to notice what happened to the player",
  },
  {
    path: "apps/web/src/city/crisisCall.ts",
    sentence: "Nothing runs on a timer.",
    why: "the clocklessness promise, and the absence IS the reassurance: INV-ERA-3 is a guarantee about what the winter will never do, so there is no positive form of it",
  },
  {
    path: "apps/web/src/diagnostic/DiagnosticRunner.tsx",
    sentence: "No hints, no retries, no grades along the way.",
    why: "the same shape as the clocklessness promise one surface over: three absences ARE the reassurance, because what makes an adaptive placement check bearable for an anxious learner is precisely that it withholds the three things a test does. A positive form would have to name what it does instead, and what it does instead is ask a question",
  },
];

/*
 * **ONE ENTRY LEFT THIS LIST ON 2026-08-02, AND THE BOTH-DIRECTIONS ASSERTION IS WHAT SAID SO.**
 *
 * It excused `apps/web/src/city/crisisCall.ts`'s *"Nothing in the winter takes damage back off."*
 * — *"the removed mend action said out loud, because a learner who expects an undo holds a
 * scarred building back and loses it"*. That was true while a building could stand scarred. At
 * `HARD_WINTER.damage.ruin_at: 1` there is no damage to take back off, so the briefing line was
 * rewritten to the one thing that still matters — *"A shield is the only thing that stops it, and
 * it has to be up before the frost arrives."* — which is a positive claim and needs no exemption.
 *
 * The entry was not deleted because somebody noticed. The assertion that a listed sentence must
 * still exist in its file failed at *"no longer says … so its exemption excuses nothing"*, which
 * is exactly the direction that stops an exemption outliving the sentence it was written for.
 */

/**
 * Strings that open with a negation and are not a learner leading with anything, each with
 * its reason. **This list is what the retired terminal-punctuation filter used to hide.**
 *
 * `ENDS_A_SENTENCE` excluded 505 literals to keep five of them quiet, and the four hundred
 * and ninety-five it took with them included every UI tag in the lanes. So the tolerance is
 * kept and the blanket is not: these are the strings in the tree at the widening that the
 * filter was excusing, and every one of them is here because a learner never leads with it,
 * not because it happens to lack a full stop.
 *
 * Two kinds, and the distinction is the point:
 *
 *  - **NOBODY READS IT.** A design register consumed by a test, or a developer-facing
 *    invariant message. These are not copy in any sense; they are prose-shaped data that
 *    happens to live in this population's lanes.
 *  - **IT LEADS NOTHING.** A clause spliced into the middle of a built sentence. The
 *    sentence it lands in leads with the count, and rewriting the clause into a positive
 *    would make the built sentence worse rather than better. This is the case
 *    `ENDS_A_SENTENCE` was written for, and the winter tier ladder's own example.
 *
 * Asserted THREE ways below, and the third is the load-bearing one: the string is still
 * there, it still opens with a negation, and it is **still not rendered** — so the day one
 * of these moves into JSX or into an `aria-label`, its exemption fails and somebody has to
 * either rewrite it or argue for it again.
 */
const LEADS_NOTHING_A_LEARNER_READS: readonly {
  readonly path: string;
  readonly sentence: string;
  readonly why: string;
}[] = [
  {
    path: "apps/web/src/city/three/crisis/registry.ts",
    sentence:
      "Nothing spatial at all: a district decides in favour of whoever is strongest",
    why: "NOBODY READS IT: the `along` column of `CRISIS_SEPARATION`, a reserved-topology table whose whole purpose is to hold four crises apart on paper before three of them are built. `crisisPropagationSeparation.test.ts` is its only consumer",
  },
  {
    path: "apps/web/src/winter/crisisEra.ts",
    sentence:
      "No era has both an authored land budget and a winter of its own, so there is no",
    why: "NOBODY READS IT: the message of a thrown `Error`, and one that fires only if every era loses either its land budget or its crisis content. It names `eras.ts` and `CRISIS_CONTENT_ERAS` because its reader is whoever broke that, and a learner who could see it has no surface left to read anything on",
  },
  {
    path: "apps/web/src/winter/liveCityLayout.ts",
    sentence: "Nothing stands on the shoreline, so the opening pull-back costs no building",
    why: "IT LEADS NOTHING: the `exposure` clause of `describeLiveCity`, spliced as the SECOND sentence of a blurb whose first is the building count, so the sentence a reader meets opens on an interpolated building count. Judged on its own it looks exactly like a refusal that leads with the shortfall, which is the winter tier ladder's case one file over",
  },
];

function tracked(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", ...LANES], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  })
    .split("\0")
    .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test\.(ts|tsx)$/.test(path));
}

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/**
 * Tracked files matching one extended-regex pattern.
 *
 * `git grep` exits 1 on NO MATCH, which `execFileSync` raises — and no match is the answer
 * this sweep is hoping for, so a bare call would throw exactly when the tree is clean.
 */
function grepFiles(pattern: string): string[] {
  try {
    return execFileSync(
      "git",
      ["grep", "-l", "-E", pattern, "--", "apps", "packages", "engines"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter((path) => path.length > 0);
  } catch (error: unknown) {
    // Status 1 is "no lines selected". Anything else is a real failure and is re-raised, so
    // a broken invocation cannot read as a clean tree.
    if ((error as { status?: number }).status === 1) {
      return [];
    }
    throw error;
  }
}

/**
 * The source with its comments removed, newlines preserved so line numbers still resolve.
 *
 * A character scan rather than a pair of regexes, and that is a fix for a measured defect
 * rather than fastidiousness: a non-greedy block-comment regex desynchronises the moment a
 * closing comment marker appears inside a string literal earlier in the file, after which
 * the rest of that file's comments come through as copy. It reported two docblocks, in
 * `CitySurface.tsx` and `lessonHost.tsx`, as learner prose that way, and this file's own
 * docblock could not even be written without tripping it. The scan tracks string, template
 * and comment state, so the only thing it can be wrong about is a nested template
 * expression, which this tree's copy does not use inside a comment.
 */
function withoutComments(source: string): string {
  let out = "";
  let index = 0;
  const keepNewlines = (text: string): string =>
    "\n".repeat((text.match(/\n/g) ?? []).length);
  while (index < source.length) {
    const two = source.slice(index, index + 2);
    if (two === "//") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
      continue;
    }
    if (two === "/*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += keepNewlines(source.slice(index, stop));
      index = stop;
      continue;
    }
    /*
      DOUBLE QUOTES AND BACKTICKS ONLY. A single quote is an APOSTROPHE far more often than
      a delimiter in this tree: biome pins `quoteStyle: "double"`, and the lanes swept here
      hold exactly one single-quoted string against dozens of JSX apostrophes. Treating `'`
      as an opener made the scan skip from one apostrophe to the next, swallowing the comment
      markers in between, and it reported fifteen more docblocks as copy than the regex did.
    */
    const quote = source[index];
    if (quote === '"' || quote === "`") {
      let cursor = index + 1;
      while (cursor < source.length) {
        if (source[cursor] === "\\") {
          cursor += 2;
          continue;
        }
        if (source[cursor] === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      out += source.slice(index, cursor);
      index = cursor;
      continue;
    }
    out += source[index];
    index += 1;
  }
  return out;
}

/** Every string and template literal in the stripped source, one per match. */
function literals(source: string): string[] {
  const stripped = withoutComments(source);
  return [
    ...(stripped.match(/"(?:[^"\\\n]|\\.)*"/g) ?? []),
    ...(stripped.match(/`(?:[^`\\]|\\.)*`/g) ?? []),
  ].map((raw) => raw.slice(1, -1));
}

/* -------------------------------------------------------------------------- */
/* THE COPY A COMPONENT RENDERS, which is not the set of copy it STORES.      */
/* -------------------------------------------------------------------------- */

/**
 * Attributes whose value is COPY rather than markup, matched at the `=` so the attribute
 * name is what is tested.
 *
 * These are the surface a screen-reader user actually has wherever the visible thing is a
 * canvas or an icon, which in this lane is most of it. `aria-label` is in the ask for the
 * widening for that reason: it is prose, it is read aloud, and it almost never ends in a
 * full stop, so an aria-label was outside the old sentence test even when it was inside
 * the old corpus.
 */
const SPOKEN_ATTRIBUTE =
  /\b(?:aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext|alt|placeholder|title)\s*=\s*$/;

/** The entity references this tree's JSX text actually uses, so a run reads as prose. */
const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&apos;": "'",
  "&hellip;": "\u2026",
  "&lsquo;": "\u2018",
  "&middot;": "\u00b7",
  "&nbsp;": " ",
  "&quot;": '"',
  "&rsquo;": "\u2019",
  "&times;": "\u00d7",
};

/**
 * Where a run of prose came from. Not decoration: the composition assertions are about
 * exactly this, because a floor on the total is satisfied by a corpus that has quietly
 * gone back to reading only `literal`.
 *
 *  - `literal`: a string or template literal anywhere in the source (the old corpus).
 *  - `text`: JSX text, the shape the Granary's shortfall note was hiding in.
 *  - `child`: a literal in a JSX expression container in CHILDREN position, so the element
 *    renders it (`{locked ? "Nothing authored after this one" : nextEra.name}`).
 *  - `spoken`: a literal in one of the {@link SPOKEN_ATTRIBUTE} attributes.
 */
type ProseKind = "literal" | "text" | "child" | "spoken";

interface Prose {
  readonly kind: ProseKind;
  readonly text: string;
  /** Offset into the source, so a failure can name the line somebody has to open. */
  readonly at: number;
}

/**
 * Whether `source[at]` opens a literal rather than being an apostrophe inside prose.
 *
 * `That's the amount` is JSX TEXT, and reading its apostrophe as a quote runs the scan on
 * to the next quote in the file, which is a MISS rather than a false positive. No
 * JavaScript literal opens directly after a letter or a digit, so that is the whole test.
 * `widgetProseEmDash.test.ts` records the same correction against the same shape.
 */
function opensLiteral(source: string, at: number): boolean {
  const ch = source[at];
  if (ch === '"' || ch === "`") {
    return true;
  }
  if (ch !== "'") {
    return false;
  }
  return !/[A-Za-z0-9]/.test(source[at - 1] ?? "");
}

/** A literal at `source[at]`, as the value a reader sees, with its `${...}` left as gaps. */
function readRenderedLiteral(source: string, at: number): { value: string; end: number } {
  const quote = source[at];
  let value = "";
  let cursor = at + 1;
  while (cursor < source.length) {
    const ch = source[cursor];
    if (ch === "\\") {
      const payload = source[cursor + 1] ?? "";
      const hex = source.slice(cursor + 2, cursor + 6);
      if (payload === "u" && /^[0-9a-fA-F]{4}$/.test(hex)) {
        value += String.fromCharCode(Number.parseInt(hex, 16));
        cursor += 6;
        continue;
      }
      value += payload === "n" || payload === "t" || payload === "r" ? " " : payload;
      cursor += 2;
      continue;
    }
    if (ch === quote) {
      return { value, end: cursor + 1 };
    }
    if (quote === "`" && ch === "$" && source[cursor + 1] === "{") {
      const span = braceSpan(source, cursor + 1);
      if (span === null) {
        return { value, end: source.length };
      }
      value += RENDERED_GAP;
      cursor = span.end;
      continue;
    }
    // An unterminated quoted literal is a desync, not a multi-line string.
    if (quote !== "`" && ch === "\n") {
      return { value, end: cursor };
    }
    value += ch;
    cursor += 1;
  }
  return { value, end: cursor };
}

/** The `{...}` span starting at `source[at]`, brace-balanced with literals respected. */
function braceSpan(source: string, at: number): { inner: string; end: number } | null {
  let depth = 0;
  let cursor = at;
  while (cursor < source.length) {
    if (opensLiteral(source, cursor)) {
      cursor = readRenderedLiteral(source, cursor).end;
      continue;
    }
    if (source[cursor] === "{") {
      depth += 1;
    } else if (source[cursor] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { inner: source.slice(at + 1, cursor), end: cursor + 1 };
      }
    }
    cursor += 1;
  }
  return null;
}

/**
 * Every run of text the elements in a TSX source render, one run per element.
 *
 * ## There is no parser to lean on, and that is a fact about the tree rather than a choice
 *
 * This repository's `typescript` is the native build: it exports `version` and a path to a
 * binary, and no `createSourceFile`. No other JS/TS parser is a dependency, and adding one
 * to a hygiene guard is out of proportion. So this is a character scanner in the shape
 * `.cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs` already uses for the same job,
 * and like `withoutComments` it is asserted against a fixture in BOTH directions rather
 * than trusted: a scanner that quietly stops finding JSX text reports the same green as a
 * clean tree, which is the whole defect this widening exists to close.
 *
 * ## A run is an ELEMENT's own text
 *
 * An element's run is its own JSX text, with a self-closing child (`<InlineMath ... />`)
 * and an interpolation spliced into it as gaps, so a sentence wrapped across source lines
 * comes back as the learner reads it. A child element with children of its OWN starts a
 * new run, because that is where this codebase chunks its copy: the Granary's shortfall is
 * its own `<span>` on its own line with its own testid, and merging it into the button
 * around it would put the building's name in front of the negation and hide it again.
 *
 * The cost of chunking that way is named rather than left to be discovered: a negation
 * wrapped in an inline element (`<strong>Not enough</strong> grain yet`) is seen as its
 * pieces, so a leading clause shorter than {@link PROSE_FLOOR} is not reached. That is the
 * SAME hole the prose floor has always had over literals, where `"Not enough " + "grain"`
 * is two sub-floor fragments, so it is not a hole this widening opens.
 *
 * ## Why only `.tsx`
 *
 * A `.ts` file cannot hold JSX; the compiler rejects it. It CAN hold `<T>(x: T) => x`,
 * which is indistinguishable from an opening tag by eye, and reading one as a tag puts the
 * scanner into children mode over the rest of the file and reports its code as copy.
 * Measured: `citySession.ts` line 883 is exactly that, and it contributed four runs of
 * function signatures before the extension test went in. Literals in a `.ts` file are
 * still swept; it is only the JSX half that has nothing to find there.
 */
function renderedRuns(
  source: string,
  offset: number,
  literalsRender: ProseKind | null,
): Prose[] {
  const runs: Prose[] = [];
  /** One accumulator per open element, innermost last. */
  const open: { at: number; text: string }[] = [];
  let mode: "code" | "tag" | "children" = "code";
  let closing = false;
  let spoken = false;
  let index = 0;

  const addText = (text: string, at: number): void => {
    const frame = open[open.length - 1];
    if (frame === undefined) {
      return;
    }
    // Anchor the run at its first non-blank character, so a failure names the prose.
    if (frame.text.trim().length === 0) {
      frame.at = at;
    }
    frame.text += text;
  };
  const closeElement = (): void => {
    const frame = open.pop();
    if (frame !== undefined && frame.text.trim().length > 0) {
      runs.push({ kind: "text", text: frame.text, at: frame.at });
    }
  };

  while (index < source.length) {
    const two = source.slice(index, index + 2);
    if (mode !== "tag" && two === "//") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
      continue;
    }
    if (mode !== "tag" && two === "/*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    // A bare quote cannot appear in children text, so this only fires in code and in tags.
    if (mode !== "children" && opensLiteral(source, index)) {
      const literal = readRenderedLiteral(source, index);
      const kind = mode === "tag" ? (spoken ? "spoken" : null) : literalsRender;
      if (kind !== null && literal.value.trim().length > 0) {
        runs.push({ kind, text: literal.value, at: offset + index });
      }
      index = literal.end;
      continue;
    }
    if (source[index] === "{") {
      const span = braceSpan(source, index);
      if (span === null) {
        index += 1;
        continue;
      }
      const inChildren = mode === "children";
      if (inChildren) {
        // `{" "}` is the line-wrap idiom and contributes its space; anything else
        // contributes a gap, because SOMETHING renders where it stands.
        const trimmed = span.inner.trim();
        const only =
          opensLiteral(trimmed, 0) && readRenderedLiteral(trimmed, 0).end === trimmed.length
            ? readRenderedLiteral(trimmed, 0).value
            : null;
        addText(only ?? RENDERED_GAP, offset + index);
        if (only !== null) {
          index = span.end;
          continue;
        }
      }
      // The container's own contents are code, and may hold both JSX of their own and
      // literals the container renders in place.
      for (const run of renderedRuns(
        span.inner,
        offset + index + 1,
        inChildren ? "child" : mode === "tag" && spoken ? "spoken" : null,
      )) {
        runs.push(run);
      }
      index = span.end;
      continue;
    }
    /*
      A `<` IS ALWAYS A TAG IN CHILDREN POSITION, because JSX forbids a literal `<` in
      text. In CODE position it is a tag only when nothing identifier-shaped precedes it,
      which is what separates `<div>` from `useState<string>`, `Map<string, Foo>` and
      `Record<K, V>` — a type argument list always follows the name it belongs to.
     */
    if (
      source[index] === "<" &&
      /[A-Za-z>/]/.test(source[index + 1] ?? "") &&
      (mode === "children" || !/[A-Za-z0-9_$)\]]/.test(source[index - 1] ?? " "))
    ) {
      const tag = /^<\/?[A-Za-z][\w.:-]*|^<\/?/.exec(source.slice(index));
      closing = source[index + 1] === "/";
      mode = "tag";
      spoken = false;
      index += tag === null ? 1 : tag[0].length;
      continue;
    }
    if (mode === "tag") {
      if (source[index] === ">") {
        if (closing) {
          closeElement();
        } else if (source[index - 1] === "/") {
          // A self-closing element is a splice inside its parent's sentence.
          addText(" ", offset + index);
        } else {
          open.push({ at: offset + index, text: "" });
        }
        mode = open.length > 0 ? "children" : "code";
        spoken = false;
      } else if (source[index] === "=") {
        spoken = SPOKEN_ATTRIBUTE.test(source.slice(0, index + 1));
      }
      index += 1;
      continue;
    }
    if (mode === "children") {
      const entity = /^&[a-z]+;/.exec(source.slice(index));
      const decoded = entity === null ? undefined : ENTITIES[entity[0]];
      if (entity !== null && decoded !== undefined) {
        addText(decoded, offset + index);
        index += entity[0].length;
        continue;
      }
      addText(source[index] ?? "", offset + index);
    }
    index += 1;
  }
  // An element left open at the end of a recursion is still copy.
  while (open.length > 0) {
    closeElement();
  }
  return runs;
}

/** Consecutive gaps read as one gap: two interpolations in a row render one thing. */
const GAPS = new RegExp(`${RENDERED_GAP}(?:\\s*${RENDERED_GAP})+`, "g");

/** A rendered run as the learner meets it: one line, one space between words. */
function flattenRun(text: string): string {
  return text.replace(/\s+/g, " ").replace(GAPS, RENDERED_GAP).trim();
}

/**
 * Every piece of learner-visible prose in one source, in all four shapes it arrives in.
 *
 * This is the population, and it is derived from the source rather than listed: a surface
 * written tomorrow joins it with no edit here, whichever shape its author reaches for.
 */
function prose(path: string, source: string): Prose[] {
  const found: Prose[] = literals(source).map((text) => ({
    kind: "literal" as const,
    text,
    at: 0,
  }));
  if (!path.endsWith(".tsx")) {
    return found;
  }
  for (const run of renderedRuns(source, 0, null)) {
    found.push({ ...run, text: flattenRun(run.text) });
  }
  return found;
}

/** The line `at` falls on, for a failure somebody has to be able to open. */
function lineOf(source: string, at: number): number {
  return source.slice(0, at).split("\n").length;
}

/** A gap printed as something a reader can see in a failure message. */
function readable(text: string): string {
  return text.replaceAll(RENDERED_GAP, "{\u2026}");
}

function reachable(): { readonly path: string; readonly source: string }[] {
  const excused = UNREACHABLE.map((entry) => entry.dir);
  return tracked()
    .filter((path) => !excused.some((dir) => path.startsWith(dir)))
    .map((path) => ({ path, source: read(path) }));
}

/** Every prose run in the whole population, whichever shape it arrived in. */
function corpus(): (Prose & { readonly path: string; readonly source: string })[] {
  return reachable().flatMap((file) =>
    prose(file.path, file.source).map((run) => ({ ...run, ...file })),
  );
}

/**
 * The runs long enough and self-contained enough to be judged as a sentence, each with the
 * FIRST sentence pulled out of it.
 *
 * The first sentence only, and that is the ruling rather than a shortcut: a refusal may
 * absolutely say what was not spent, and what it may not do is open with it.
 */
function judgedProse(): {
  readonly path: string;
  readonly where: string;
  readonly kind: ProseKind;
  readonly text: string;
  readonly first: string;
}[] {
  const judged = [];
  for (const run of corpus()) {
    if (run.text.length < PROSE_FLOOR || !IS_A_SENTENCE.test(run.text)) {
      continue;
    }
    // A run of nothing but interpolations renders numbers, not prose. `IS_A_SENTENCE`
    // admits it (a sentence may open with an interpolation) and there is no sentence in it.
    if (!/[A-Za-z]/.test(run.text)) {
      continue;
    }
    judged.push({
      path: run.path,
      where: run.at === 0 ? run.path : `${run.path}:${lineOf(run.source, run.at)}`,
      kind: run.kind,
      text: run.text,
      first: (run.text.split(/(?<=[.!?])\s/)[0] ?? run.text).trim(),
    });
  }
  return judged;
}

describe("the city's copy register", () => {
  it("sweeps a real population, and its comment stripper works both ways", () => {
    const all = tracked();
    expect(all.length, "the sweep found no sources at all").toBeGreaterThan(150);
    expect(reachable().length, "every lane got excused").toBeGreaterThan(140);

    // THE STRIPPER, in both directions, against a fixture. Without this the whole file
    // could be passing because it strips everything. The third line is the desynchronising
    // case the regex version got wrong: a `*/` inside a string, before a real docblock.
    const fixture = [
      "/** a docblock \u2014 with an em-dash */",
      'const shown = "a string \u2014 with an em-dash";',
      'const tricky = "a closing */ inside a string";',
      "/* a later docblock \u2014 with another */",
      "// a line comment \u2014 with an em-dash",
      'const also = "kept";',
    ].join("\n");
    const stripped = withoutComments(fixture);
    expect(stripped, "the stripper kept a docblock").not.toContain("a docblock");
    expect(stripped, "the stripper kept a line comment").not.toContain("a line comment");
    expect(stripped, "the stripper desynchronised on a string's */").not.toContain(
      "a later docblock",
    );
    expect(stripped, "the stripper ate a string literal").toContain("a string \u2014");
    expect(stripped, "the stripper ate the tricky string").toContain("a closing */ inside");
    expect(stripped.split("\n").length, "the stripper lost line numbers").toBe(6);

    // And the corpus it feeds is a real corpus.
    const corpus = reachable().flatMap((file) => literals(file.source));
    expect(corpus.length, "no string literals were collected").toBeGreaterThan(500);
    expect(
      corpus.filter((line) => line.length >= PROSE_FLOOR).length,
      "no prose was collected",
    ).toBeGreaterThan(100);
  });

  it("carries no em-dash or en-dash outside a comment", () => {
    const offenders: string[] = [];
    for (const file of reachable()) {
      if (file.path === VERBATIM_TRANSCRIPTION.path) {
        continue;
      }
      for (const [index, line] of withoutComments(file.source).split("\n").entries()) {
        if (/[\u2014\u2013]/.test(line)) {
          offenders.push(`${file.path}:${index + 1}: ${line.trim()}`);
        }
      }
    }
    expect(offenders, `${offenders.length} dashes to colon or restructure`).toEqual([]);
  });

  it("keeps the verbatim transcription's exemption honest, in both directions", () => {
    const transcript = read(VERBATIM_TRANSCRIPTION.path);
    // It is still a transcription, which is the whole of why it is excused.
    expect(
      transcript,
      `${VERBATIM_TRANSCRIPTION.path} no longer claims to be verbatim, so nothing excuses its dashes`,
    ).toMatch(/verbatim/i);
    expect(transcript).toContain("nothing else is edited, abridged or reworded");
    // It still HAS dashes, so the exemption is doing something.
    expect(
      withoutComments(transcript),
      `${VERBATIM_TRANSCRIPTION.path} has no dashes left, so its exemption is decorative`,
    ).toMatch(/[\u2014\u2013]/);
    // And it still names the table it quotes, so the deferral says where the fix belongs
    // rather than becoming a standing licence with no upstream attached.
    expect(
      transcript,
      `${VERBATIM_TRANSCRIPTION.path} no longer names its source, so the deferral points nowhere`,
    ).toContain(VERBATIM_TRANSCRIPTION.namesItsSource);
  });

  it("never leads a sentence with the shortfall", () => {
    const excused = new Set([
      ...NEGATION_IS_THE_CONTENT.map((entry) => `${entry.path}\u0000${entry.sentence}`),
      ...LEADS_NOTHING_A_LEARNER_READS.map(
        (entry) => `${entry.path}\u0000${entry.sentence}`,
      ),
    ]);
    // One entry per offending sentence, keyed by file and sentence, because a rendered
    // literal is legitimately in the corpus twice (as what it is, and as what it renders)
    // and reporting it twice would read as two defects. The line-numbered sighting wins, so
    // the failure names somewhere to open.
    const offending = new Map<string, string>();
    const judged = { literal: 0, text: 0, child: 0, spoken: 0 };
    for (const run of judgedProse()) {
      judged[run.kind] += 1;
      if (!LEADS_WITH_A_NEGATION.test(run.first)) {
        continue;
      }
      const key = `${run.path}\u0000${run.first}`;
      if (excused.has(key) || (offending.has(key) && run.kind === "literal")) {
        continue;
      }
      offending.set(key, `${run.where} [${run.kind}]: ${readable(run.first)}`);
    }
    const offenders = [...offending.values()].sort();
    /*
      THE FLOORS, PER SHAPE, because the total is not the claim. A sentence filter that
      matched nothing would satisfy a total by judging nothing, and a corpus that had
      quietly gone back to reading only string literals would satisfy it too: 891 literals
      alone clears any floor a widened corpus could be given. So each shape the widening
      added carries its own, and the JSX-text one is the shape the Granary's shortfall note
      was hiding in. Measured at the widening: 891 / 167 / 87 / 41.

      The literal floor is set ABOVE 386 deliberately. That is what the corpus judged while
      the terminal-punctuation test was in place, so re-adding it fails here rather than
      quietly halving what this rule reads.
     */
    expect(judged.literal, "no stored prose was judged at all").toBeGreaterThan(500);
    expect(
      judged.text,
      "no JSX TEXT was judged, so this sweep has narrowed back to storage",
    ).toBeGreaterThan(120);
    expect(
      judged.child,
      "no literal in children position was judged, so a rendered conditional is invisible again",
    ).toBeGreaterThan(60);
    expect(
      judged.spoken,
      "no aria-label was judged, so the copy a screen-reader user gets is out of the sweep",
    ).toBeGreaterThan(25);
    expect(
      offenders,
      `${offenders.length} sentences lead with the penalty rather than with what is true:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps every leading negation an argued one, in both directions", () => {
    const bySource = new Map(reachable().map((file) => [file.path, file.source]));
    for (const entry of NEGATION_IS_THE_CONTENT) {
      const source = bySource.get(entry.path);
      expect(source, `${entry.path} is excused and is no longer swept`).not.toBeUndefined();
      // The sentence is still there, so the exemption is about something.
      expect(
        literals(source ?? ""),
        `${entry.path} no longer says "${entry.sentence}", so its exemption excuses nothing`,
      ).toEqual(expect.arrayContaining([expect.stringContaining(entry.sentence)]));
      // And it still opens with a negation, so a sentence that has been rewritten into the
      // positive cannot go on holding a licence it no longer needs.
      expect(
        LEADS_WITH_A_NEGATION.test(entry.sentence),
        `"${entry.sentence}" no longer leads with a negation`,
      ).toBe(true);
      expect(entry.why.length, `${entry.sentence} has no reason recorded`).toBeGreaterThan(
        40,
      );
    }
    /*
      THREE, and each is a case where the absence is the content. A list that grew for any other
      reason would be the rule quietly weakening rather than the copy being argued about, which
      is why this is an exact count and not a ceiling.

      THREE IS THE ARITHMETIC OF TWO CHANGES THAT LANDED SEPARATELY, both of them the assertion
      above doing its job in opposite directions. It was three; #446 widened this sweep from
      three directories to every learner surface and the diagnostic came with it, whose *"No
      hints, no retries, no grades along the way"* is the clocklessness promise's own shape one
      surface over, making four. This branch then removes the mend action, so `crisisCall.ts`
      stops saying *"Nothing in the winter takes damage back off."* and the both-directions
      assertion refuses to let its entry sit here excusing a sentence that has gone.

      So one arrived with a population and one left with its subject, and the pin is still a
      pin: a fourth entry fails here.
     */
    expect(NEGATION_IS_THE_CONTENT.length, "the exemption list has grown").toBe(3);
  });

  it("keeps every string a learner never leads with honest, in three directions", () => {
    const bySource = new Map(reachable().map((file) => [file.path, file.source]));
    const renderedEverywhere = corpus()
      .filter((run) => run.kind !== "literal")
      .map((run) => run.text);
    for (const entry of LEADS_NOTHING_A_LEARNER_READS) {
      const source = bySource.get(entry.path);
      expect(source, `${entry.path} is excused and is no longer swept`).not.toBeUndefined();
      // ONE: the string is still there, so the exemption is about something.
      expect(
        literals(source ?? ""),
        `${entry.path} no longer holds "${entry.sentence}", so its exemption excuses nothing`,
      ).toEqual(expect.arrayContaining([expect.stringContaining(entry.sentence)]));
      // TWO: it still opens with a negation, so an entry cannot sit here holding a licence
      // for a string that has been rewritten into the positive.
      expect(
        LEADS_WITH_A_NEGATION.test(entry.sentence),
        `"${entry.sentence}" no longer leads with a negation`,
      ).toBe(true);
      /*
        THREE, AND THIS IS THE ONE THAT MATTERS. Every reason on this list is a claim that
        no learner reads the string, and the scanner can check exactly that: if any of them
        is moved into JSX text, into a children conditional or into an `aria-label`, it
        joins the rendered corpus and this fails at the entry whose reason has stopped being
        true. Without it the list would be five assertions about the past.
       */
      expect(
        renderedEverywhere.filter((text) => text.includes(entry.sentence)),
        `"${entry.sentence}" is RENDERED now, so "${entry.why.slice(0, 60)}..." is no longer true of it`,
      ).toEqual([]);
      expect(entry.why.length, `${entry.sentence} has no reason recorded`).toBeGreaterThan(
        80,
      );
    }
    // Both lists together, and neither claiming the same sentence: an exemption that could
    // be read off either list is an exemption with two different reasons.
    const argued = NEGATION_IS_THE_CONTENT.map((entry) => entry.sentence);
    const unread = LEADS_NOTHING_A_LEARNER_READS.map((entry) => entry.sentence);
    expect(
      argued.filter((sentence) => unread.includes(sentence)),
      "a sentence is claimed as both argued copy and as something nobody reads",
    ).toEqual([]);
    /*
      THREE, and a pin rather than a ceiling for the same reason the list above is pinned. The
      difference is what a fourth entry would MEAN: this list is the price of dropping the
      terminal-punctuation filter, so it grows only when the tree gains a prose-shaped string
      that nobody reads. If it is growing because copy is being excused instead of rewritten,
      that is the rule weakening, and the entry belongs in NEGATION_IS_THE_CONTENT where it
      has to be argued as a case where the absence is the content.
     */
    expect(
      LEADS_NOTHING_A_LEARNER_READS.length,
      "the unread-string list has changed size",
    ).toBe(3);
  });

  /**
   * **⚑ THE SCANNER IS THE WIDENING, so it is asserted against a fixture in both directions.**
   *
   * Everything above rests on `renderedRuns` finding JSX text. A scanner that finds none
   * reports the same green as a clean tree — that is the whole shape of the defect this
   * file was sent to fix, and it would be a poor joke to close it with a scanner nobody
   * checked. Every case below is a shape this tree actually contains.
   */
  it("reads a rendered sentence out of every shape it is written in", () => {
    const runs = (source: string): string[] =>
      renderedRuns(source, 0, null).map((run) => readable(flattenRun(run.text)));

    // JSX TEXT, wrapped across source lines with an interpolation in it: the Granary's own
    // shape, and the sentence that was invisible before this scanner existed.
    expect(
      runs('<span className="tag">\n  Not enough {label} yet: you have {have}\n</span>'),
      "the shape this widening exists for is not being read",
    ).toEqual(["Not enough {\u2026} yet: you have {\u2026}"]);
    // A LEADING INTERPOLATION IS NOT A NEGATION LEAD. `{refusal} Nothing was spent` opens
    // on the refusal reason; a splice that trimmed away would make it an offender, and the
    // plague and winter surfaces both write exactly this.
    const spliced = runs("<p>{refusal} Nothing was spent, so choose again.</p>")[0] ?? "";
    expect(spliced, "the leading interpolation was dropped").toBe(
      "{\u2026} Nothing was spent, so choose again.",
    );
    expect(
      LEADS_WITH_A_NEGATION.test(spliced.replace("{\u2026}", RENDERED_GAP)),
      "a sentence opening on an interpolation now reads as a negation lead",
    ).toBe(false);
    // A LITERAL IN CHILDREN POSITION renders, and a literal in an attribute expression
    // does not. `{locked ? "..." : x}` is copy; `onClick={() => f("...")}` is a callback.
    expect(
      renderedRuns(
        '<span>{locked ? "Nothing authored after this one" : next}</span>',
        0,
        null,
      )
        .filter((run) => run.kind === "child")
        .map((run) => run.text),
      "a rendered conditional's copy was not read",
    ).toEqual(["Nothing authored after this one"]);
    expect(
      renderedRuns(
        '<button onClick={() => say("Nothing was spent here")}>Go</button>',
        0,
        null,
      )
        .filter((run) => run.kind === "child")
        .map((run) => run.text),
      "a callback's argument was read as rendered copy",
    ).toEqual([]);
    // AN ARIA-LABEL IS SPOKEN COPY; a className is not.
    expect(
      renderedRuns(
        '<p aria-label="No batch to ask about yet" className="no-batch" />',
        0,
        null,
      ).map((run) => `${run.kind}:${run.text}`),
      "the spoken attribute and the markup one are not being told apart",
    ).toEqual(["spoken:No batch to ask about yet"]);
    /*
      AN INLINE SELF-CLOSING CHILD SPLICES, so a sentence written around one stays whole.
      It contributes a SPACE and not a gap, and that asymmetry with `{...}` is deliberate:
      a self-closing element in these lanes is `<HudIcon />` far more often than it is
      copy, and a gap in front of a sentence makes it open with an interpolation. Read
      `<p><HudIcon /> Nothing was spent.</p>` as a gap and the negation stops leading;
      read it as a space and it still does, which is the true reading, because an icon is
      decoration. The cost is a missing gap mid-sentence where the child really is copy,
      and that cannot change which word leads.
     */
    expect(
      runs("<p>Repairs cost 60 <Material /> and your stockpile is untouched.</p>"),
      "a self-closing child broke a sentence in two",
    ).toEqual(["Repairs cost 60 and your stockpile is untouched."]);
    expect(
      runs("<p><HudIcon /> Nothing was spent.</p>"),
      "a decorative icon put an interpolation in front of a negation and hid it",
    ).toEqual(["Nothing was spent."]);
    // AND A CHILD ELEMENT'S OWN COPY IS ITS OWN RUN, which is what keeps the shortfall note
    // from being hidden behind the building name in the button around it.
    expect(
      runs("<button><span>The Granary</span><span>Not enough grain yet</span></button>"),
      "sibling copy was merged, which puts a name in front of a negation",
    ).toEqual(["The Granary", "Not enough grain yet"]);
    // OVER-READING FAILS TOO: an apostrophe in JSX text must not open a literal and run the
    // scan on past the sentence after it.
    expect(
      runs("<p>That's the amount.</p>\n<p>No coins were taken.</p>"),
      "an apostrophe in JSX text swallowed the sentence after it",
    ).toEqual(["That's the amount.", "No coins were taken."]);
    // AND NEITHER A TYPE ARGUMENT LIST NOR A `.ts` FILE HOLDS JSX. `citySession.ts:883`
    // is the measured case: `<T>(write: () => T)` read as a tag reported four runs of
    // function signatures as copy.
    expect(
      runs("const f = useCallback<Handler>((x: Map<string, T>) => x, []);"),
      "a type argument list was read as an opening tag",
    ).toEqual([]);
    expect(
      prose("apps/web/src/x.ts", "const g = <T>(write: () => T): T => write();").filter(
        (run) => run.kind !== "literal",
      ),
      "a .ts file was scanned for JSX, which is where the generic arrow desync came from",
    ).toEqual([]);
  });

  /**
   * **THE WIDENING IS ASSERTED AS COMPOSITION, and the sentinels are named copy.**
   *
   * The per-shape floors in the sweep above catch a corpus that has EMPTIED of one shape.
   * They cannot catch a corpus that still finds a hundred and sixty runs of the wrong
   * thing, so three sentences are named: one per shape, each a live learner surface at this
   * tip, each the shape that used to be invisible. If the scanner drifts, this is where it
   * says so, at a sentence somebody can go and read.
   */
  it("reads the copy a component renders, not only the copy it stores", () => {
    const rendered = corpus().filter((run) => run.kind !== "literal");
    const has = (needle: string): boolean =>
      rendered.some((run) => run.text.includes(needle));
    for (const [needle, what] of [
      ["What it gives the city, for as long as it stands", "JSX text on the civic popup"],
      ["Commit now. Three answers set how strongly it holds.", "JSX text on the Plague"],
      ["Drag over roads to mark them", "a literal rendered from a children conditional"],
      ["Drag to pan and scroll to zoom", "the city canvas's aria-label"],
    ] as const) {
      expect(has(needle), `${what} is not in the rendered corpus: "${needle}"`).toBe(true);
    }
    // And the rendered half is genuinely a widening rather than a relabelling: these runs
    // are not literals, so none of them was reachable before.
    expect(
      rendered.filter((run) => run.kind === "text").length,
      "the sweep found no JSX text at all",
    ).toBeGreaterThan(1000);
  });

  /**
   * **⚑ A PRICE NAMES THE ERA'S MATERIAL AND NEVER THE WORD "MATERIAL".**
   *
   * Ruled by the team lead on 2026-08-02, off a screenshot of the crisis briefing: *"also replace
   * 'material' with 'stone'."* The line he was looking at read *"Damage left at the end of the
   * winter can be repaired on the island. Repairs cost material."*
   *
   * **IT IS NOT ENFORCED AS "SAY STONE", and that is deliberate rather than a softening.** Stone is
   * era ONE's answer; the city already resolves the word per era through
   * `economy/materialWord.ts`, so a rule that pinned the string would be right for era one and
   * wrong for the nine eras above it, and the copy it forced would go stale on the era that ships
   * bronze. What is enforced is the property behind his sentence: a learner is never told a price in
   * a generic noun.
   *
   * ## THE POPULATION IS SCOPED BY THE BEHAVIOUR, not by the winter
   *
   * Every piece of prose in the lanes that quotes a COST — cost, price, pay, spend, buy, afford —
   * and not just the crisis briefing, because the defect is possible anywhere a surface quotes a
   * price and the crisis is merely where he happened to see it. Measured at the tip: **22
   * cost-quoting prose literals across the three lanes**, and the rule holds for all of them.
   *
   * **And prose is prose in every shape**, so it reads the same four-shape corpus the negation rule
   * does rather than string literals alone. It shared that narrowing exactly, for exactly as long,
   * and a price written as JSX text is the same defect as a price written as a constant: measured
   * at the widening, **ten more cost-quoting runs**, none of them naming a generic material. So
   * this rule gained no findings and gained a population, which is the outcome to want from a
   * widening rather than the outcome that proves one worked.
   *
   * Interpolations are resolved to a placeholder before the scan, which is what makes the rule
   * about the COPY rather than about the code: `` `Rebuilding costs ${material}.` `` reads the era's
   * word at runtime and the identifier is not learner copy. Without that step the rule would flag
   * the very fix it exists to require, which was measured: it did, before this line went in.
   *
   * ## AND IT IS NOT A BAN ON THE WORD, which is why it is scoped to a price
   *
   * The era ceremony says *"The new material is arriving. This is what the next age builds with"*
   * and the Shop offers *"Material finishes for a building type"*. In both the generic noun IS the
   * content — the subject is that an era brings a material, not what one costs — so a blanket sweep
   * would have demanded nonsense of them. Both are in the population's lanes and neither quotes a
   * price, so neither is an exception that needs listing.
   */
  it("quotes no price in a generic material", () => {
    const PRICE =
      /\b(cost|costs|price|prices|priced|pay|pays|paid|spend|spends|buy|buys|afford)\b/i;
    const offenders: string[] = [];
    let priced = 0;
    let pricedRendered = 0;
    for (const run of corpus()) {
      if (run.text.length < PROSE_FLOOR || !PRICE.test(run.text)) {
        continue;
      }
      priced += 1;
      if (run.kind !== "literal") {
        pricedRendered += 1;
      }
      // Interpolations resolve at runtime, so they are not the copy: `${material}` is the
      // era's own word and `${materialWord(era)}` is the same thing spelled out.
      if (/\bmaterials?\b/i.test(run.text.replace(/\$\{[^}]*\}/g, "N"))) {
        offenders.push(`${run.path}: ${readable(run.text.trim())}`);
      }
    }
    // A FLOOR ON THE POPULATION, because "no priced line says material" is trivially true of no
    // priced lines. Measured at the tip: 32, of which 10 are rendered. Both are floored, because
    // the stored 22 alone clears any total this rule could be given, so a corpus that had quietly
    // gone back to reading literals would satisfy a single floor while measuring what it did
    // before the widening.
    expect(
      priced,
      "no priced copy was collected, so this rule swept nothing",
    ).toBeGreaterThan(15);
    expect(
      pricedRendered,
      "no priced copy was collected from what a component RENDERS, only from what it stores",
    ).toBeGreaterThan(6);
    expect(
      offenders,
      `${offenders.length} prices in a generic noun: name the era's material through materialWord`,
    ).toEqual([]);
  });

  /**
   * **THE WIDENING IS ASSERTED AS COMPOSITION, not only as a floor.**
   *
   * A floor of 140 constrains size, and size is not what changed: the old population was
   * fifty-odd sources and every one of them is still here, so a sweep that had quietly
   * narrowed back to three directories would fail the floor and nothing else would notice.
   * These four are what the widening was FOR, and one lane is what it must still not reach.
   */
  it("reaches the surfaces three directories left out, and still not another owner's", () => {
    const swept = reachable().map((file) => file.path);
    for (const path of WIDENED_TO) {
      expect(
        swept,
        `${path} is a learner surface this sweep has stopped reading`,
      ).toContain(path);
    }
    // And all three of the original directories are still in it, so widening cannot have
    // replaced the population rather than grown it. The economy witness was `Shop.tsx`
    // until the 2026-08-03 sunset deleted it; `EconomyHud.tsx` is the learner-facing copy
    // that directory still has, so the claim — "this sweep reads the economy lane" — is
    // unchanged and is made against a file that exists.
    for (const kept of [
      "apps/web/src/city/announcements.ts",
      "apps/web/src/economy/EconomyHud.tsx",
      "apps/web/src/winter/WinterConclusion.tsx",
    ]) {
      expect(swept, `${kept} fell out of the widened sweep`).toContain(kept);
    }
    // The lesson lane is Anthony's and must stay out of it, which is a different claim from
    // the floor and the only one that fails if this pass starts ruling on his copy.
    expect(
      swept.filter((path) => path.startsWith("apps/web/src/lessons/")),
      "the lesson lane is in this sweep, so this rule is now ruling on another owner's copy",
    ).toEqual([]);
    // The floor under THAT absence: the lane exists and is large, so its emptiness here is an
    // exclusion rather than a repository that has no lessons in it.
    expect(
      tracked().filter((path) => path.startsWith("apps/web/src/lessons/")).length,
      "there is no lesson lane to exclude, so the exclusion above proves nothing",
    ).toBeGreaterThan(20);
  });

  it("keeps every unreachable path honest, in both directions", () => {
    const paths = tracked();
    const swept = new Set(reachable().map((file) => file.path));
    for (const entry of UNREACHABLE) {
      const inside = paths.filter((path) => path.startsWith(entry.dir));
      // The excused path still exists, so the exemption is about something.
      expect(inside.length, `${entry.dir} is excused and holds no sources`).toBeGreaterThan(
        0,
      );
      // And it really is out of the sweep, so an entry cannot sit here describing a filter
      // that has stopped filtering.
      for (const path of inside) {
        expect(swept.has(path), `${entry.dir} is listed as excused but is swept`).toBe(
          false,
        );
      }
      expect(entry.why.length, `${entry.dir} has no reason recorded`).toBeGreaterThan(20);
    }

    /*
      AND THE STORM SCAFFOLD IS STILL UNMOUNTED, which is the one exemption whose reason is a
      measurable fact about the tree rather than a fact about ownership. Measured rather than
      carried over from §8.3: nothing outside that directory imports it. The day something
      does, this fails and the lane rejoins the sweep instead of shipping excused copy on a
      live surface.
     */
    const storm = "apps/web/src/city/storm/";
    expect(
      UNREACHABLE.map((entry) => entry.dir),
      "the storm scaffold has left the exemption list, so this measurement is about nothing",
    ).toContain(storm);
    const importers = grepFiles('from "[^"]*city/storm/').filter(
      (path) => !path.startsWith(storm),
    );
    expect(
      importers,
      `${storm} is mounted after all, so its copy is a learner surface`,
    ).toEqual([]);

    /*
      AND THE TWO ?query HATCHES ARE STILL HATCHES. Their exemption rests on being reachable
      only by typing a query string, so each must still be mounted behind one. `App.tsx` is
      read rather than trusted: a hatch promoted to a route would be excused copy on a screen
      a learner can navigate to.
     */
    const app = read("apps/web/src/App.tsx");
    for (const [file, query] of [
      ["apps/web/src/DevLessons.tsx", "dev"],
      ["apps/web/src/diagnostic/GraphProbe.tsx", "graph"],
    ] as const) {
      expect(
        UNREACHABLE.map((entry) => entry.dir),
        `${file} has left the exemption list`,
      ).toContain(file);
      expect(
        app,
        `${file} is no longer behind a ?${query} query string, so it is a reachable surface`,
      ).toContain(`.has("${query}")`);
    }

    expect(UNREACHABLE.length, "the exemption list has changed size").toBe(5);
  });
});
