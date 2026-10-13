#!/usr/bin/env node
/**
 * validate-lesson-pack.mjs : the DOMAIN-LEVEL QA gate the `author` skill invokes.
 *
 * Node built-ins only (fs, path, url). Given a domain's lesson JSON files (a
 * directory or explicit file paths), it enforces the locked authoring defaults and
 * the mechanically checkable half of the teaching-quality bar (SKILL.md "QA quality
 * bar"). Findings come in two tiers:
 *
 *   ERROR   always fails (exit 1). Every error rule below is proven to fire zero
 *           times across the shipped D1 packs, which are the gold reference.
 *   WARNING printed, but only fails under `--strict`. Each rule here SHORTLISTS for
 *           a human rather than deciding, which is why it cannot gate; a NEW domain
 *           runs `--strict` and must come back clean.
 *
 * The tier split is a property of the RULES and does not move when the findings do.
 * This header used to justify it with a count instead -- "these rules fire on shipped
 * D1/D5 content that predates the bar" -- which #201 falsified on 2026-07-28 by clearing
 * the whole tier to zero on all four domains. Read a tally off a run, never off this
 * file, and note that an empty warning tier is not an argument for promoting it.
 *
 * ERROR rules:
 *   1. every `mini_lesson` index has >= 1 visual with `gates: true` (after === index);
 *   2. only INTERACTIVE visual ids appear (legacy/static ids are rejected);
 *   3. no em-dash (U+2014) in any learner-facing string;
 *   4. `cfu` is present with a prompt, a non-empty `accepted`, and a hint;
 *   5. text density: no `mini_lesson` paragraph runs past MAX_SENTENCES sentences;
 *   6. no meta-commentary about the lesson itself (the ban-list below);
 *   7. no duplicated instruction: a widget's registry caption may not restate the
 *      task sentence of the slide it sits on. DORMANT, not dead: zero captions ship
 *      today, so it has nothing to check until someone adds one, and that emptiness is
 *      asserted rather than noted (see EXPECTED_REGISTRY_CAPTIONS), as is the parser
 *      that measures it (see REGISTRY_PARSE_SELF_CHECKS);
 *   8. no exact visual-id reuse inside one lesson;
 *   9. domain-level interaction variety (directory runs only);
 *  10. a `slide_subtitles` entry that exists runs at most MAX_SUBTITLE_WORDS words (R14);
 *  11. no internal node id in a learner-visible string (R18);
 *  12a. `cfu.variants` is present, names a template and declares a `count` of at least 2;
 *  12c. `cfu.worked_solution` is ordered steps whose last one names the answer;
 *  12d. `cfu.worked_solution_params`, if present, has a template id to be read through and
 *       finite numbers (shape only: whether the figure matches the QUESTION is checked in the
 *       web suite);
 *  12e. `cfu.worked_solution_template`, if present, is a non-empty id, has parameters to drive
 *       it, and differs from `variants.template_id` (which is already the default);
 *  12b. a check is not answerable by GUESSING: a whole-answer choice from two options fails.
 *  12f. `cfu.check`, if present, declares a known `answer_type`, a non-empty `answer_key` that
 *       is also `accepted[0]`, and no field the checker does not read;
 *  13. `worked_examples` (R34's section 2), on the packs that declare it: an array of
 *      `{ prompt, steps }` objects aligned by POSITION with `mini_lesson`, no entry past the
 *      last slide, each entry naming its instance in a prompt of at most
 *      MAX_PROMPT_SENTENCES sentences and running MIN_EXAMPLE_STEPS..MAX_EXAMPLE_STEPS steps
 *      under the same conventions as `cfu.worked_solution`, and that pack's `mini_lesson`
 *      entries held to the MIGRATED lecture budget rather than to MAX_SENTENCES.
 *
 * WARNING rules:
 *   A. a task statement ("Your turn: ...") or widget mechanics ("tap the ...") sitting
 *      in lesson prose instead of inside the widget;
 *   B. a lesson built from fewer than MIN_LESSON_KINDS distinct interaction kinds;
 *   C. a `mini_lesson` paragraph with no `slide_subtitles` entry (R14);
 *   D. a parenthetical aside fenced with commas instead of parentheses (R19), in three
 *      shapes: a bracketed noun phrase, a marked GLOSS, and an aside that is itself a
 *      comma-separated list (see ASIDE_MAX_WORDS onwards);
 *   E. "letter" where the word for the thing is "variable" (R20).
 *   F. a `mini_lesson` entry that OPENS on a bare demonstrative, so the thing it points at
 *      is on the previous slide and nowhere in the entry (R15, see DEMONSTRATIVE_OPENERS).
 *   G. a check whose whole answer is a choice from only THREE options (rule 12b's soft half):
 *      a one-in-three gate is weak, and whether a given three-way call is nonetheless the right
 *      question is a judgement about the mathematics rather than something a count settles.
 *   H. a MIGRATED pack whose `mini_lesson[i]` runs exactly MIGRATED_LECTURE_CEILING sentences:
 *      the ruling is 2 to 3, and the fourth is allowed only where it is genuinely unavoidable,
 *      which is a judgement a sentence count cannot make (rule 13's soft half).
 *
 * SELF-CHECKS (error tier, and not rules about a pack at all): the premises the rules above
 * are read against, asserted so that a rule cannot pass by having nothing left to look at.
 * There are three, and the first two both belong to rule 7 because its population is zero:
 *
 *   - `EXPECTED_REGISTRY_CAPTIONS` and `MIN_REGISTRY_ENTRIES` pin the COUNT R8 reads and put
 *     a floor under the denominator it is read against; `readCaptionRegistry` separates the
 *     three states the registry can be in;
 *   - `REGISTRY_PARSE_SELF_CHECKS` asserts the PARSER, which the two counts above cannot,
 *     since a parser that has stopped recognising captions and a repo that holds none report
 *     the same zero. Added after a measured instance: the parser required `caption` to sit
 *     immediately after `Svg`, so the same duplicate caption failed the run written one way
 *     round and passed it the other.
 *
 * The third belongs to rule 12b, which finds nothing across the shipped packs by design, and
 * whose population is per-domain content rather than one repo file -- so a floor on it would
 * fail every domain that legitimately holds no choice-style check, which today is all of
 * them. `GUESS_SELF_CHECKS` asserts instead that the DETECTOR still classifies, on every run
 * and in every domain, which is what separates "this domain has no guessable check" from
 * "this rule stopped looking".
 *
 * Rule 13 carries BOTH kinds, because it needs both. `WORKED_EXAMPLE_SELF_CHECKS` asserts the
 * classifier on every run the way `GUESS_SELF_CHECKS` does, and `assertMigratedPopulation`
 * puts a floor under the population, which is possible here and was not there: migration is
 * a property of the CONTENT TREE rather than of the domain under validation, so the floor is
 * read across `content/lessons` on every invocation and is the same fact in all nine of them.
 * Both are needed because they fail in different directions -- the cases catch a classifier
 * that has stopped classifying, and the floor catches a correct classifier with nothing left
 * to classify, which is exactly what rule 13 looked like before the first pack migrated.
 *
 * Rule 11 is at the ERROR tier rather than the warning tier, which every other rule added
 * since R14 has taken, and the reason is that it is the one candidate on the list with no
 * false-positive mode at all: it matches the LITERAL node ids in
 * `packages/skill-graph/src/skill_graph.json` and nothing else, so the only string it can
 * fire on is an internal identifier a learner was shown. It is not a proxy for anything.
 * It was measured over every shipped pack before landing, by literal registry match and by
 * the looser `XX.N` shape alike, and found zero, so it costs the packs that are not ours to
 * rewrite nothing. The SIZE of that corpus is deliberately not quoted here: this line read
 * "all sixteen shipped D1/D2/D5/D7 packs" from the day it landed, and sixteen is the
 * D1/D5/D7 count -- the four domains it names already held 21. Run `check-lesson-packs.sh`
 * for the population and the finding count as they stand. Finding the graph fails OPEN, the
 * way finding the caption registry does, and for the same reason: a pack validated outside
 * the repo skips the rule.
 *
 * Rule E, by contrast, is a warning precisely BECAUSE it has a false-positive mode: a
 * figure whose corners are labelled A, B and C is legitimately about letters. It also
 * measured zero across that same corpus, so it is a tripwire rather than a cleanup.
 *
 * R19 is a warning for a third reason again, and the strongest of the three: parentheses are
 * the DEFAULT and not an absolute, so a comma-fenced aside can be the right call. That rule
 * SHORTLISTS, and both of the judgements it hands back (parenthesise or absorb) are recorded
 * at its own definition rather than here.
 *
 * Rule F is R15's first mechanical half, and R15 was on the "cannot be checked" list below
 * until it landed. Only a sliver of R15 has moved: whether an opening MOTIVATES rather than
 * defines is still not checkable, and R15's own shortlisting tell (a term introduced behind a
 * definite article the pack never defined) is still a reviewer's tool and not a gate. What
 * rule F adds is the one shape whose antecedent question has an arithmetic answer instead of
 * a judgement, and the reason it was worth adding is written at DEMONSTRATIVE_OPENERS: the
 * article tell had already read past the reported instance twice, because a bare
 * demonstrative carries no article for it to key on.
 *
 * R14's PRESENCE half is deliberately WARNING-and-not-ERROR, and that is not timidity: the
 * sixteen shipped D1/D5/D7 packs predated the field, so an error tier would have failed
 * every one of them the day it landed, on content that was not this rule's to rewrite. That
 * sentence is HISTORY and no longer describes the tree -- #201 gave every shipped pack
 * subtitles on 2026-07-28, so the presence rule now finds nothing. It is still the reason
 * the rule is a warning, because the reason a tier was chosen does not lapse when the
 * finding count reaches zero. The LENGTH half is an error, and can be, for a reason that
 * never depended on a count: the word cap only runs on a subtitle that EXISTS, so it could
 * not retroactively fail a pack written before the field however many of those there were.
 * What stays a judgement is whether a four-word heading is the RIGHT four words, and that
 * lives in SKILL.md's review pass.
 *
 * What is deliberately NOT checked here, because no mechanical rule separates the
 * good case from the bad without false positives on content that has been praised:
 * whether an opening motivates rather than defines, whether an explanation builds
 * the intuition before stating the rule, whether every technical term is introduced
 * before use, whether a scenario on a later slide flows or is forced, and whether the
 * register is right. Those live in SKILL.md's review checklist for a human pass.
 *
 * Usage:
 *   node .cursor/skills/author/scripts/validate-lesson-pack.mjs content/lessons/<domain>
 *   node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/<domain>
 *   node .cursor/skills/author/scripts/validate-lesson-pack.mjs pack1.json pack2.json
 *
 * Exit code 0 = clean; 1 = one or more failing findings; 2 = bad invocation.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const EM_DASH = "\u2014";

/** Gabe's density guideline: 6 to 7 sentences of contiguous prose, then break it up. */
const MAX_SENTENCES = 7;

/**
 * R34's MIGRATED lecture budget, which is not `MAX_SENTENCES` and does not replace it.
 *
 * `MAX_SENTENCES` stays the global rule, deliberately. The 32 packs outside D1 are
 * one-paragraph slides that carry their arithmetic in the NPC bubble because that is the
 * only place they have to put it, and they are not this rule's to rewrite; an error tier
 * over them would fail content on a structure it does not have. A pack that DECLARES
 * `worked_examples` has somewhere else to put the arithmetic, so its section 1 is
 * conceptual prose and the ruling for it is 2 to 3 sentences.
 *
 * The migrated-ness test is therefore the FIELD and not the domain, which is what lets a
 * domain migrate one pack at a time instead of in one commit.
 *
 * Why the fourth sentence is a warning and the fifth an error: "genuinely unavoidable" is a
 * judgement about the mathematics, and a sentence count cannot make it, so four SHORTLISTS.
 * At five the arithmetic is back in the bubble, which is the defect the three-section split
 * exists to end, and that is detectable rather than arguable.
 */
const MIGRATED_LECTURE_TARGET = 3;
const MIGRATED_LECTURE_CEILING = 4;

/**
 * Rule 13's step band for one `worked_examples[i]` entry.
 *
 * Two is the floor because a one-step "example" walks nothing: it restates the lecture in
 * a card. A slide with no instance to walk says so with an EMPTY entry, which is legal and
 * is the documented way to skip section 2, so the floor costs such a slide nothing.
 *
 * Six is the ceiling `practice-hints` already reads at for the reveal's own walkthrough. An
 * example longer than that is either two ideas on one slide or one move split across three
 * cards, and both are better fixed than tolerated.
 */
const MIN_EXAMPLE_STEPS = 2;
const MAX_EXAMPLE_STEPS = 6;

/**
 * Rule 13's budget for the PROMPT that names the instance above the steps.
 *
 * The prompt exists because step cards on their own are a solution to a question the learner
 * was never shown: they read the moves and reconstruct the problem backwards out of them. So
 * its whole job is to say what is about to be worked, which is one sentence and occasionally
 * two ("Here is a reading of $-11$ metres. Which of the two is further from zero?").
 *
 * Capped rather than merely encouraged, because the failure mode is specific: a prompt that
 * runs on becomes the lecture again, now printed a second time inside the card, and the slide
 * is back to the one-screen wall the three-section split exists to end. Note the sentence
 * count is the ceiling for the prompt alone -- it is deliberately NOT added to the migrated
 * lecture budget, since the two surfaces are read at different moments.
 */
const MAX_PROMPT_SENTENCES = 2;

/**
 * Rule 13's POPULATION FLOOR: what has to be true of the content tree for a green run of the
 * rules above to mean they looked at something.
 *
 * `worked_examples` is optional, and every rule in rule 13 is gated on a pack declaring it.
 * So before the first pack migrated, rule 13 passed every domain while measuring nothing at
 * all -- the ordinary way a guard here goes quiet (`.cursor/rules/qa-verification.mdc`). The
 * floor is read across the whole of `content/lessons` rather than the domain under
 * validation, because migration is a fact about the tree: D1 satisfies this for the D9 run
 * too, and that is correct, since what is being asserted is that these rules have real
 * content somewhere and not that every domain has migrated.
 *
 * THREE numbers, because the pack count alone constrains size and not shape. A pack that
 * declares `worked_examples: [null, null, null]` satisfies the pack floor while carrying no
 * section 2 whatever, and every step rule would still be measuring nothing; the SLIDE floor is
 * what that case fails. Counted as slides whose entry holds at least one non-empty step, which
 * is exactly the population `validateExampleSteps` runs over.
 *
 * The third number is the same argument one field deeper. `prompt` arrived after `steps`, so a
 * tree can satisfy both floors above while no example anywhere names its instance, and
 * `validateExamplePrompt` would then be gated on content that does not exist. `MIGRATED_SLIDE_FLOOR`
 * is reused for it deliberately: every authored entry owes a prompt, so the two counts should
 * move together and a gap between them means examples are shipping without one.
 */
const MIGRATED_PACK_FLOOR = 1;
const MIGRATED_SLIDE_FLOOR = 6;

/** SKILL.md's per-lesson archetype bar. Warning tier: half the D1 packs predate it. */
const MIN_LESSON_KINDS = 3;

/**
 * A slide subtitle labels WHERE the learner is; the slide's prose does the teaching, so
 * four words is the whole budget (R14).
 *
 * Counted in WORDS, not characters, because the rule is about words and a character cap
 * scores by spelling instead. The 80-character cap this replaces passed all 32 of the old
 * D2 subtitles, one of which ran 14 words in 63 characters. Tightening it in characters
 * would not fix that: the shipped set's longest entry is 31 characters, so a cap near
 * there would reject four long words that obey the rule ("Rationalizing a cubic
 * denominator" is four words and 33 characters) while still passing five short ones.
 * Words is the unit the rule is written in, so it is the unit to count. The shipped D2 set
 * runs 2 to 4 words, so 4 is the rule itself rather than headroom above it; there is no
 * floor, because padding a two-word topic name out to three is the defect this prevents.
 */
const MAX_SUBTITLE_WORDS = 4;

/**
 * Domain-level variety floor: well under what a shipped domain already reaches, so it is a
 * floor rather than a stretch. Re-derive before quoting it, because every shipped domain
 * has moved above where this comment first recorded it (it read "D1 ships 9 kinds, D2 7,
 * D5 7", named no D7, and at `3ca8156` on 2026-07-28 the four were 12 / 12 / 11 / 8 over
 * 24 / 31 / 24 / 16 widgets). Raising the floor is a content decision, not a tidy-up: it
 * would gate the next domain on a bar the current ones happen to clear.
 */
const MIN_DOMAIN_KINDS = 5;

/** No single interaction kind may account for this share or more of a domain's widgets. */
const MAX_DOMAIN_KIND_SHARE = 0.6;

/**
 * Caption/prose duplication threshold (Jaccard over content words). The shipped D1
 * packs top out at 0.50; the two genuine verbatim duplicates in the repo score 0.83
 * and 0.86, so 0.7 separates them with margin at both ends.
 */
const DUPLICATE_JACCARD = 0.7;

/**
 * R8's POPULATION, pinned. Zero, and zero on purpose: `#179` removed every widget caption
 * from the visuals registry as a per-domain design decision, taking the repo from 63 to 0,
 * because each widget already states its task on its own status line and the caption only
 * restated it one line below. R8 is gated on `captions.size > 0`, so it has had nothing to
 * check since.
 *
 * That is the intended end state, not a fault. It is pinned anyway because a rule that is
 * SILENT and a rule that is PASSING print the same nothing, and the note that used to stand
 * in for this assertion said the registry was unreadable, which was false. An assertion is
 * the difference between "zero by design" being a reviewed fact and being a sentence nobody
 * reads.
 *
 * RAISE IT when a caption is added. The registry type still carries `caption?: string` and
 * still invites one "only when it says something the widget does not", so a caption is not a
 * defect and this pin is not a veto: R8 runs over the new caption the moment it exists, and
 * the finding below says so and asks for the pin to follow.
 */
const EXPECTED_REGISTRY_CAPTIONS = 0;

/**
 * The FLOOR that makes the pin above mean anything.
 *
 * The registry is read as text, so a moved file, a renamed field or an entry shape the
 * pattern no longer matches all yield zero captions and all satisfy a pin of zero: the
 * assertion would survive precisely the emptiness it was written to rule out, which is the
 * defect this whole file is being corrected for rather than a new one. Counting the registry
 * ENTRIES separates the two states, because a parse that works finds one per member of the
 * `LessonVisualId` union -- which is what `Record<LessonVisualId, ...>` makes TypeScript
 * guarantee -- and a parse that has broken finds none. Re-derive the size before quoting it:
 * this line read 96 until 2026-07-29, when the union measured 137 at `3638629`.
 *
 * A FLOOR and deliberately not a pin, following the same reasoning as the derived-population
 * sweeps in the web suite: growth must not need an edit here, or the number becomes one more
 * thing to remember to bump. 80 leaves room for widgets to be added and retired without
 * touching this line, while the failure it exists to catch lands at or near zero.
 */
const MIN_REGISTRY_ENTRIES = 80;

/**
 * R18's POPULATION FLOOR, which is `MIN_REGISTRY_ENTRIES` for the node-id rule.
 *
 * R18 is the whole set of ids in `skill_graph.json`, so the set IS the rule, and its only
 * gate was `nodeIds.size === 0` — a floor of one. A graph whose shape has moved under
 * `parseNodeIds` (nodes nested a level deeper, `node_id` renamed, an outer wrapper added)
 * does not usually collapse to zero; it recovers a handful and R18 then runs, quietly, over
 * a near-empty set and prints no note. That is the fail-open state R8 was given a floor for,
 * and this is the same floor.
 *
 * 66 nodes at `3fbe5fcb`, all 66 yielding an id, so 40 leaves room for a chapter to be
 * retired without touching this line while landing the failure it exists to catch near zero.
 * A FLOOR and not a pin, for the same reason as R8's: growth must not need an edit here.
 */
const MIN_GRAPH_NODE_IDS = 40;

/**
 * And the SHAPE beside the size, because a floor constrains one and not the other.
 *
 * 40 of 66 is satisfied by one era's worth of nodes plus anything, and one era's worth is
 * exactly what a partial parse recovers when the graph grows a per-era wrapper: the ids that
 * happen to sit at the depth the reader still reaches. So the prefixes are counted too. 12 at
 * `3fbe5fcb` (CG, EL, EXP, FUN, GEO, LF, LIN, NUM, POL, RAD, RAT, TRG) against 10 authored
 * domains, and 8 is the floor, so a parse that comes back holding one or two chapters fails
 * here rather than reporting R18 clean over the packs belonging to the rest.
 */
const MIN_GRAPH_ID_PREFIXES = 8;

/**
 * The interaction SHAPES that exist, which is why the list grows when a new one does:
 * `label`, `match`, `order`, `spot`, `table` and `estimate` name the six archetypes in
 * `apps/web/src/lessons/interactive/kinds/`.
 *
 * This list is a UNION of three versions of this file that diverged on the same line,
 * and it must stay one: dropping an entry silently re-fails packs that already ship,
 * and it does so twice over, because a rejected id also loses its slide the gating
 * visual it does in fact have.
 */
const INTERACTION_KINDS = [
  "explore",
  "play",
  "walkthrough",
  "builder",
  "sorter",
  "slider",
  "classify",
  "multiples",
  "solver",
  "stepper",
  "drag",
  "label",
  "match",
  "order",
  "spot",
  "table",
  "estimate",
];

/**
 * Accepted spellings that are NOT a kind of their own. `-build` ships in D5 `RAT.6`
 * and three D7 packs, all properly gated, so rejecting it is a regression, not a
 * standard: authors reach for either spelling and the shorter one landed first.
 *
 * It resolves to `builder` rather than joining `INTERACTION_KINDS` because the suffix
 * word is also the declared interaction KIND the R11 variety rules count. Admitted as
 * its own kind, `-build` would score one archetype as two and inflate the very spread
 * R11 measures. D5 is the domain that shows it, because it is the one carrying both
 * spellings, and the inflation is exactly one kind there however the counts move (this
 * comment first put it at "8 over 24 widgets where it truly has 7"; at `3ca8156` on
 * 2026-07-28 the same domain reads 12 against 11, over the same 24 widgets).
 */
const KIND_ALIASES = new Map([["build", "builder"]]);

/**
 * An interactive visual id ends in an interactive suffix word, optionally followed
 * by a short variant (e.g. `-ltr`). This is how a finished pack signals a gated,
 * `onComplete`-driven widget rather than a static legacy diagram. Built from the two
 * lists above so the rule and the message it prints cannot drift apart.
 *
 * The kind list names the interaction SHAPES that exist, so it grows when a new one
 * does: `label`, `match`, `order`, `spot`, `table` and `estimate` were added with the
 * six shapes in `apps/web/src/lessons/interactive/kinds/`.
 *
 * `-build` and `-builder` are both accepted: authors reach for either, and rejecting
 * the shorter one flagged shipped packs (D5 `RAT.6`, D7 `LF.2`/`LF.3`/`LF.4`) whose
 * widgets are properly gated. A missing suffix also cascades — the id finding is
 * followed by a "paragraph has no gating visual" finding for the same entry.
 */
const INTERACTIVE_SUFFIX = new RegExp(
  `-(${[...INTERACTION_KINDS, ...KIND_ALIASES.keys()].join("|")})(-[a-z0-9]+)?$`,
);

/** The accepted suffixes as an author reads them, for the rejection message. */
const INTERACTIVE_SUFFIX_HELP = [...INTERACTION_KINDS, ...KIND_ALIASES.keys()]
  .map((k) => `-${k}`)
  .join("/");

/**
 * Narrating the lesson instead of teaching the mathematics. Every phrase here was
 * quoted back to us in review; the register, not just the exact wording, is the thing
 * to avoid. Matched case-insensitively, and only on whole words.
 *
 * ## What this list bans, and what it does not
 *
 * The rule is SEMANTIC, not lexical. What is banned is an instruction to consume more of
 * the SURROUNDING EXPOSITION -- prose telling a reader to keep reading the prose, which
 * spends a sentence on the shape of the lesson instead of on the mathematics. An
 * instruction naming the learner's next move ON A BOARD is a different thing entirely:
 * that is task direction, it belongs in the widget under R24, and it is outside this
 * list.
 *
 * "read on" is where the two look alike, and it has now been raised as a defect by two
 * separate QA rounds, so the ruling is written down here rather than made a third time.
 * Ruled with rendered frames: on a `SpotTheError` board the sentence is a per-line
 * response, and at the moment it appears it has REPLACED the standing instruction, so it
 * is the only thing on screen telling the learner what to do next -- go on to the next
 * line and keep looking. There are 13 of them across `TrigRosterSpot.tsx`,
 * `TrigIdentitySpot.tsx` and `SpotTheError.tsx`'s own shared default, and that default
 * means a ban would land on every domain's spot boards at once and delete direction
 * learners need.
 *
 * The honest counter-case, because a boundary stated without its hard case gets applied
 * mechanically: a widget status line pointing the learner back at the LESSON PROSE rather
 * than at the board would be meta, and squarely what this list is for. The phrase alone
 * cannot tell that apart from the board-directing use. Only what it points AT can, so
 * read the surface before reaching for the list.
 *
 * None of this fires today in either direction, because the validator reads packs and
 * never reads widgets. That is a fact about its reach and not an oversight to close by
 * extending the ban: the same 13 strings would be the first thing it caught.
 *
 * The whole-word match below is a narrower point and a separate one, about spelling
 * accidents rather than about register.
 */
const META_COMMENTARY = [
  "idea of this slide",
  "point of this slide",
  "the whole idea here",
  "on this slide we",
  "in this slide we",
  "follow along",
  "follow it and do not stop",
  "do not stop early",
  "as we will see",
  "as you will see",
  "as we shall see",
  "keep reading",
  "read on",
  "start high and step down",
  "by the end of this lesson",
  "in this lesson you will learn",
];

/**
 * Each banned phrase as a whole-word pattern. A substring test fires inside innocent
 * prose ("the power-of-a-power rule read one way or the other" contains "read on"),
 * and a rule that cries wolf gets the whole gate ignored.
 */
const META_COMMENTARY_RULES = META_COMMENTARY.map((phrase) => ({
  phrase,
  pattern: new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
}));

/** A task statement belongs inside the widget, not in the prose that introduces it. */
const TASK_STATEMENT = /\b(your turn|now you try|have a go|try it below|try this below)\b/i;

/**
 * Prose describing how to operate the widget. The widget's own status line owns this;
 * saying it twice is the duplicated-instruction defect in its most common form.
 */
const WIDGET_MECHANICS =
  /\b(tap|taps|tapping|click|clicks|clicking|drag|drags|dragging|slide the|the slider|below to|the buttons?) \b/i;

/**
 * R20: the symbol standing for an unknown is a VARIABLE. Calling it a letter names its
 * typography instead of its job, and a reader who has been told it is a letter has been
 * told nothing about why it is there.
 *
 * WARNING tier, and it has to be: a figure whose corners are labelled A, B and C really is
 * about letters, and a Geometry domain will write that sentence honestly. So this rule
 * SHORTLISTS. Measured zero across the sixteen shipped packs, which is why it can be added
 * without landing on content nobody is going to rewrite.
 */
const LETTER_FOR_VARIABLE = /\bletters?\b/i;

/**
 * A parenthetical aside fenced with COMMAS instead of parentheses, e.g. "recorded as 9/4
 * square meters, a fraction rather than a whole number, and the builder still needs a side
 * length". Four commas in one sentence can be carrying two different jobs (list items and
 * brackets) with nothing distinguishing which, and the reader has to re-parse to find out.
 *
 * This is almost certainly a side effect of our own em-dash ban: a dash is the other natural
 * aside-bracket, so with it gone and no guidance, commas win. Expect clusters wherever an
 * author wanted a dash.
 *
 * WARNING tier, and honestly so, in all three shapes below: the rule SHORTLISTS, it does not
 * decide. Parentheses are the DEFAULT and not an absolute, so this can never be an error.
 * Two calls it deliberately does not make:
 *   1. not every comma pair is an aside. "Multiply the base, then add the exponents" is a
 *      sequence and parenthesising it is wrong;
 *   2. some asides should be ABSORBED rather than parenthesised. Parentheses signal
 *      "skippable", so a clarification the next clause depends on belongs integrated into
 *      the sentence instead of bracketed out of it.
 *
 * THREE SHAPES are matched, because one filter cannot cover them: shape 1 is a noun phrase
 * and shapes 2 and 3 are not. Shape 1 keeps the walk it shipped with, untouched; shapes 2
 * and 3 share a second, more permissive one.
 */

/**
 * SHAPE 1, the bracketed NOUN PHRASE: no verb, opening with a determiner, between two
 * commas. The reliable half, and the narrow one.
 */
const ASIDE_MAX_WORDS = 8;

/**
 * Words that mean the span between the commas is a CLAUSE, not a bracketed noun phrase.
 * "Multiply the base, then add the exponents" is a sequence and must not be flagged, and
 * neither may anything carrying a finite verb. Deliberately a blocklist rather than a POS
 * tagger: Node built-ins only, and a wrong flag at warning tier still costs a reader's time.
 *
 * This filter is LOAD-BEARING and stays: a comma-fenced clause is very often a legitimate
 * coordinate or subordinate one. RAD.1 slide 0 carries "Two numbers actually pass that test,
 * since $(-6) \cdot (-6) = 36$ as well, so the symbol has to name exactly one", and
 * parenthesising any part of that would be nonsense. Shape 2 exists precisely so that the
 * one clausal case worth flagging does not have to be bought by dropping this.
 */
const ASIDE_CLAUSE_WORDS = new Set(
  (
    "is are was were be been being has have had having do does did doing can will would " +
    "should could may might must shall says say said gives give given comes come came goes " +
    "go went makes make made takes take took leaves leave left needs need needed asks ask " +
    "asked means mean meant lands land landed stays stay stayed then so and but which who " +
    "because if when while unless whether that adds add added put puts multiply divide " +
    "subtract write writes read reads look looks keep keeps"
  ).split(" "),
);

/**
 * SHAPE 2, the GLOSS: an aside that RESTATES or DEFINES the thing before it. Exempt from
 * the clause filter, because a gloss carries a verb by construction and shape 1 therefore
 * cannot see one. The instance that forced this shape is RAD.1's own second slide:
 *
 *   "When the radicand is a perfect square, meaning some whole number times itself lands
 *    exactly on it, the root comes out whole."
 *
 * which shape 1 misses three times over: it does not open with a determiner, it runs ten
 * words past the eight-word cap, and "lands" is in the clause blocklist. It was reported
 * twice by the same reviewer, the second time after the rule shipped, which is what a rule
 * that cannot see the case it was written for costs.
 *
 * A closed MARKER LIST is what makes this safe. Every marker below is structurally incapable
 * of heading a main clause (participle, adverb or abbreviation), so the span it opens can
 * only be attached to what precedes it. Each was measured against all four shipped domains
 * plus the widget sources; the ones that were tried and REJECTED are recorded so they are
 * not proposed again:
 *
 *  - "that is" REJECTED on a measured false positive. `ExponentLawsBuilder` writes "Written
 *    out, that is the base multiplied by itself 2 times and then 3 more, which is 5 copies
 *    in a row": the first comma closes a sentence-initial adverbial and the second opens a
 *    relative clause, so the span between them is the sentence's MAIN clause. "that" can be
 *    a subject, which no other marker here can be, so it is the one that breaks the rule
 *    above rather than a case to tune around.
 *  - "or" REJECTED as overwhelmingly a coordinator in this register. Four hits, three of
 *    them plain disjunction ("either the slope, or both", "the rate, or constant"). Only one
 *    was appositive, so the appositive sense cannot be separated by surface form.
 *  - "which is" / "which are" REJECTED at 21 hits. They PREDICATE something about what
 *    precedes rather than restate it ("the vertical asymptote, which is at $x = 3$"), and a
 *    non-restrictive relative clause is idiomatic with commas: "That keeps both variables
 *    apart, which is right, but it has thrown the minus sign away" is correct as written.
 *    "which means" is kept because it announces a restatement, which is the distinction.
 *  - "e.g." / "for example" / "for instance" / "such as" REJECTED as a different relation:
 *    they EXEMPLIFY rather than restate. Shape 3 covers the one run-on example list in the
 *    corpus, which needs no marker at all.
 *  - "so called" REJECTED as unmotivated: zero hits, and it is attributive ("the so-called
 *    principal root") rather than comma-fenced.
 */
const GLOSS_MARKERS = [
  "meaning",
  "which means",
  "namely",
  "in other words",
  "i.e.",
  // A notation gloss, found twice on D2 content: "a **cube root**, written $\sqrt[3]{8}$,"
  // and "the **absolute value** of $x$, written $|x|$ between two upright bars,".
  "written",
  // Its naming sibling, with zero comma-fenced hits in the corpus. Kept anyway because a
  // past participle cannot head a main clause, so it has no false-positive mode to measure.
  "called",
];

/**
 * Shape 2's own budget, which has to be its own: a gloss carries a full predicate, so it is
 * structurally longer than shape 1's noun phrase and eight words could never have reached
 * the ten-word instance above.
 *
 * 14 because the MARKER is what makes this shape precise, not the length, so the cap is a
 * sanity rail set for recall rather than a discriminator: the longest gloss across the four
 * domains and the widget sources runs 10 words, and 14 leaves room for a slightly longer one
 * instead of missing it silently. It stays below the MEASURED median `mini_lesson` sentence
 * of 16 words (n=376), so a span cannot fill its own sentence and still pass as an aside.
 */
const GLOSS_MAX_WORDS = 14;

/**
 * SHAPE 3, the RUN-ON LIST: the aside is a single math span whose own contents are
 * comma-separated, so the commas inside it and the commas fencing it are indistinguishable.
 * RAD.1 slide 2 is the case, and the only one in the corpus: "Run down the perfect squares
 * you know, $4, 9, 16, 25, 36$, and take the first one that divides $72$" puts five commas
 * in one sentence doing two different jobs, which is the exact ambiguity this rule exists to
 * remove. No marker is available to key on, and none is needed: the shape is the defect.
 *
 * TWO commas inside the span, not one, so an ordered pair or an interval cannot trip it.
 * "$(3, 4)$" carries its own brackets, so its single comma is already visibly enclosed and
 * a two-item span cannot be read as a run-on list in the first place.
 */
const LIST_ASIDE_MIN_COMMAS = 2;

/** A masked math span, the token `maskMath` leaves behind. */
const MASKED_MATH = /^Q\d+Q$/;

/**
 * Whether a span runs past the end of a sentence, i.e. the closing comma belongs to the NEXT
 * sentence and the two commas were never a pair. Same boundary test `splitSentences` uses (a
 * terminator, then whitespace, then an opening character), so the `i.e.` marker above is not
 * read as the end of a sentence.
 *
 * Only shapes 2 and 3 are guarded, because they are the permissive ones: shape 1's
 * determiner-plus-no-verb requirement already makes a span that crosses a full stop
 * unmatchable in practice, and widening its behaviour would move findings on packs that are
 * not this rule's to rewrite.
 */
function crossesSentenceBoundary(span) {
  return /[.!?]\s+[A-Z"'(\u201c]/.test(span);
}

/**
 * Every comma-fenced aside in `paragraph`, as the author wrote it (math restored), each with
 * the note its shape earns in the finding.
 *
 * Overlapping matches are why each walk rewinds `lastIndex` past the closing comma:
 * "A, a b, a c, and d" carries two candidate asides sharing a comma, and a plain global
 * regex would consume the shared one and see only the first.
 */
function commaAsides(paragraph) {
  const { masked, restore } = maskMath(paragraph);
  const flat = stripMarkdown(masked).replace(/\s+/g, " ");
  const found = [];

  // Shape 1. Left exactly as it shipped: the determiner and the 80-character window are
  // inside the pattern, so a second shape gets a second walk rather than a looser regex.
  const nounPhrase = /,\s+((?:a|an|the)\s+[^,;:]{1,80}?),(?=\s)/gi;
  let match = nounPhrase.exec(flat);
  while (match !== null) {
    const phrase = match[1].trim();
    const words = phrase.split(/\s+/);
    const clausal = words.some((w) =>
      ASIDE_CLAUSE_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")),
    );
    if (words.length <= ASIDE_MAX_WORDS && !clausal) {
      found.push({ phrase: restore(phrase), note: "" });
    }
    // Rewind onto the closing comma so it can also open the next candidate.
    nounPhrase.lastIndex = match.index + 1 + match[1].length;
    match = nounPhrase.exec(flat);
  }

  // Shapes 2 and 3, over every comma pair, with no determiner requirement.
  const fenced = /,\s+([^,;:]{1,140}?),(?=\s)/g;
  match = fenced.exec(flat);
  while (match !== null) {
    const phrase = match[1].trim();
    if (!crossesSentenceBoundary(phrase)) {
      const lower = phrase.toLowerCase();
      const marker = GLOSS_MARKERS.find((m) => lower === m || lower.startsWith(`${m} `));
      const restored = restore(phrase);
      if (marker && phrase.split(/\s+/).length <= GLOSS_MAX_WORDS) {
        found.push({
          phrase: restored,
          note: `. This one is a GLOSS: "${marker}" marks it as restating what comes before it, so it is skippable by construction and the parenthetical form is almost always the right one`,
        });
      } else if (
        MASKED_MATH.test(phrase) &&
        restored.split(",").length - 1 >= LIST_ASIDE_MIN_COMMAS
      ) {
        found.push({
          phrase: restored,
          note: ". The aside is itself a comma-separated list, so the commas inside it and the commas fencing it cannot be told apart",
        });
      }
    }
    fenced.lastIndex = match.index + 1 + match[1].length;
    match = fenced.exec(flat);
  }

  return found;
}

/* ------------------------------------------------ R15: a slide that opens by pointing */

/**
 * The demonstratives a slide must not OPEN on, and what each one can be doing there.
 *
 * The instance that forced this rule is `RAD.1` slide 3, reported by Gabe after two passes
 * had read straight past it:
 *
 *   "That matters because a root splits across a product: $\sqrt{a \cdot b} = \sqrt{a} \cdot
 *    \sqrt{b}$, so $\sqrt{72} = \sqrt{4} \cdot \sqrt{18}$."
 *
 * "That" is the perfect square factor found on slide 2, and slide 3 names it nowhere. Note
 * that the subtitle above it does not stand in for one either: "Splitting a root" says what
 * the slide is ABOUT, which is not what the word points at.
 *
 * WHY THIS IS MECHANICAL WHEN R15 AS A WHOLE IS NOT. R15's shortlisting tell in `lesson-qa`
 * is an opening that introduces a term behind a DEFINITE ARTICLE the pack never defined, and
 * that tell is right to stay a reviewer's tool, because it fires on plenty of good openings.
 * It is also exactly how the instance above survived: a bare demonstrative carries no article
 * at all, so a filter keyed on one cannot see it. The shape below has three properties the
 * article tell does not:
 *
 *   - the POSITION is fixed. Token 1 of the entry, not "somewhere near the start";
 *   - the TRIGGER is a closed set of seven words;
 *   - the ANTECEDENT question is not a heuristic here, it is arithmetic. Nothing inside the
 *     entry precedes token 1, so an anaphor in that position necessarily reaches outside the
 *     entry. The entry is the unit, and to the left of token 1 the unit is empty.
 *
 * WARNING tier, and it has to be, because reaching outside the entry is sometimes the right
 * call: the previous slide's widget can still be on screen holding the referent, and a
 * subtitle that names the referent rather than the topic supplies one. Neither is decidable
 * from the pack, so this rule SHORTLISTS and the finding quotes the subtitle for the reader
 * to judge it against. Measured across all sixteen shipped D1/D2/D5/D7 packs before landing:
 * ONE finding, the reported instance above, so it costs the packs that are not ours to
 * rewrite nothing.
 *
 * The three values are the three ways one of these words can behave in first position:
 *   `singular` / `plural`  can also be a DETERMINER heading a noun phrase ("This rule ...",
 *       "Those units are ..."), which NAMES the referent's class and is a different and much
 *       weaker defect, so only the pronoun reading is reported. "This morning it took the
 *       builder ..." is not anaphoric at all, and is the measured case that makes the
 *       determiner exemption necessary rather than theoretical;
 *   `pronoun`  "it" and "they" cannot be determiners, so they are always bare. An EXPLETIVE
 *       "It" ("It turns out that ...", "It is worth noticing that ...") is not anaphoric at
 *       all and is this rule's clearest false positive. An exemption list for it was
 *       considered and REJECTED on the measurement: across the four domains there is not one
 *       sentence-initial expletive "It", and the two extraposed uses that exist ("and it is
 *       easy to miscount" in EXP.1, "where it makes sense" in LF.3) are both mid-sentence.
 *       An exemption list for a population of zero is a list of guesses, so the false
 *       positive is documented here and absorbed by the warning tier instead;
 *   `kindless`  "such" is a determiner, but it means "of the kind just described", so it
 *       still names no referent when a noun follows it ("Such a move only works when ...").
 *       Zero hits in the corpus; a tripwire rather than a cleanup.
 */
const DEMONSTRATIVE_OPENERS = new Map([
  ["that", "singular"],
  ["this", "singular"],
  ["these", "plural"],
  ["those", "plural"],
  ["it", "pronoun"],
  ["they", "pronoun"],
  ["such", "kindless"],
]);

/**
 * Finite verb forms that cannot also head a noun phrase, so a demonstrative sitting in front
 * of one is a PRONOUN. Copulas, auxiliaries and modals, plus the irregular pasts that are not
 * also nouns in this register.
 *
 * A closed list, for the same reason GLOSS_MARKERS is one: it buys precision at the cost of
 * recall, and at warning tier a wrong flag costs a reader's time while a miss costs nothing
 * that was not already missed. The miss is real and is named at isThirdPersonSingular.
 */
const OPENER_FINITE_VERBS = new Set(
  (
    "is are was were has have had do does did can could will would shall should may might " +
    "must came went gave took made meant felt became brought told said grew held kept stood"
  ).split(" "),
);

/**
 * Adverbs that can sit between a demonstrative pronoun and its verb ("That also means ...",
 * "That still leaves ..."). Skipping a run of them is monotone-safe, which is why the list
 * can afford to be loose and to admit any `-ly` word: the test after the skip is a POSITIVE
 * identification of a verb, so a skip that lands on a noun exempts the entry anyway.
 */
const OPENER_ADVERBS = new Set(
  (
    "also still then again already only now just never always actually therefore however " +
    "instead even too"
  ).split(" "),
);

/**
 * A present-tense third-person-singular verb, by MORPHOLOGY rather than by dictionary: it
 * ends in `s`, and the singular nouns that also end in `s` end in `-ss`, `-us` or `-is`
 * ("process", "radius", "basis"), which no `-s` verb form does.
 *
 * Measured against every sentence-initial demonstrative in the four shipped domains (n=23,
 * counted on the corpus that still carried the instance above): it reads "matters", "works",
 * "crosses", "names" and "sits" as verbs and "morning" and "units" as nouns, which is all 23
 * classified correctly.
 *
 * Applied to the SINGULAR demonstratives only, because the parity inverts for the plural
 * pair: after "These"/"Those" it is the NOUN that ends in `s` ("Those units") and the verb
 * that does not ("These are"). So a plural opener is caught only by the closed list above,
 * and a plural bare-form verb outside it ("These split into ...") is a MISS. So is a
 * singular past-tense verb the list does not carry ("That fell out of the pattern"), and so
 * is an opener whose verb slot holds math ("That $4$ divides the radicand"), since
 * `stripMath` has masked it by the time the test runs. Recall, not soundness, is what this
 * rule trades away.
 */
function isThirdPersonSingular(word) {
  return /s$/.test(word) && !/(ss|us|is)$/.test(word);
}

/**
 * The bare demonstrative a `mini_lesson` entry opens on, with the sentence carrying it, or
 * null. The sentence comes back as the author wrote it (math restored) so the finding can
 * quote the slide rather than the masked form the test ran on.
 */
function bareDemonstrativeOpener(paragraph) {
  if (typeof paragraph !== "string") return null;
  const sentences = splitSentences(paragraph);
  if (sentences.length === 0) return null;
  const opening = sentences[0];
  const words = stripMarkdown(stripMath(opening))
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter(Boolean);
  const use = DEMONSTRATIVE_OPENERS.get(words[0]);
  if (use === undefined) return null;

  const found = { opener: words[0], opening };
  if (use === "pronoun" || use === "kindless") return found;

  const next = words.slice(1).find((w) => !OPENER_ADVERBS.has(w) && !/ly$/.test(w));
  if (next === undefined) return found;
  if (OPENER_FINITE_VERBS.has(next)) return found;
  if (use === "singular" && isThirdPersonSingular(next)) return found;
  return null;
}

/**
 * The suffix rule is the whole check now: the legacy static D1 visuals this script used
 * to denylist by name have been deleted from the registry, so referencing one no longer
 * resolves to a component at all.
 */
function isInteractiveId(id) {
  if (typeof id !== "string") return false;
  return INTERACTIVE_SUFFIX.test(id);
}

/** The interaction kind a visual id declares, or null when the id is not interactive. */
function interactionKind(id) {
  if (typeof id !== "string") return null;
  const match = INTERACTIVE_SUFFIX.exec(id);
  if (!match) return null;
  return KIND_ALIASES.get(match[1]) ?? match[1];
}

/* ------------------------------------------------------------------ text utilities */

/** Math is opaque to prose rules: `$3.5$` must not read as a sentence boundary. */
function stripMath(text) {
  return text.replace(/\$[^$]*\$/g, " Q ");
}

/**
 * Same idea as `stripMath`, but reversible, so a finding can quote the sentence the
 * author actually wrote instead of the masked form the splitter worked on.
 */
function maskMath(text) {
  const spans = [];
  // The token stays capital-initial so it behaves exactly like `stripMath`'s " Q " under
  // the sentence-boundary lookahead: a sentence that starts with math still splits.
  const masked = text.replace(/\$[^$]*\$/g, (span) => {
    spans.push(span);
    return ` Q${spans.length - 1}Q `;
  });
  const restore = (s) => s.replace(/Q(\d+)Q/g, (token, i) => spans[Number(i)] ?? token);
  return { masked, restore };
}

function stripMarkdown(text) {
  return text.replace(/\*+/g, "").replace(/`+/g, "");
}

/**
 * Split a paragraph into sentences. Terminator followed by whitespace and an opening
 * character, which keeps decimals, abbreviations inside math, and `e.g.` intact.
 */
function splitSentences(paragraph) {
  const { masked, restore } = maskMath(paragraph);
  const flat = stripMarkdown(masked).replace(/\s+/g, " ").trim();
  if (!flat) return [];
  return flat
    .split(/(?<=[.!?])\s+(?=[A-Z"'(\u201c])/)
    .map((s) => restore(s).trim())
    .filter(Boolean);
}

const STOP_WORDS = new Set(
  (
    "a an the and or of to in on at by for with is are was were be been it its this that these those " +
    "then so you your yours each one two both same into out from as than not no do does did if when " +
    "what which who how why can will would there here they them their we our us he she his her"
  ).split(" "),
);

/** Content words, crudely stemmed, so "combine"/"combining" and "root"/"roots" match. */
function contentWords(text) {
  return new Set(
    stripMarkdown(stripMath(text))
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
      .map((w) => w.replace(/(ing|ies|es|ed|s)$/, "")),
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) {
    if (b.has(word)) shared += 1;
  }
  return shared / (a.size + b.size - shared);
}

/** The sentence that hands the slide over to its widget: the task statement, else the last. */
function taskSentence(paragraph) {
  const sentences = splitSentences(paragraph);
  if (sentences.length === 0) return "";
  return sentences.find((s) => TASK_STATEMENT.test(s)) ?? sentences[sentences.length - 1];
}

/* ------------------------------------------------------- the visual caption registry */

/**
 * Captions live in `apps/web/src/lessons/visuals.tsx`, which this script reads as text
 * rather than importing (Node built-ins only, and the module is TSX). Finding and reading
 * the file fails OPEN: a pack validated outside the repo skips the duplication rule rather
 * than failing on it.
 *
 * What no longer fails open is what the file SAYS once it has been read. See
 * `EXPECTED_REGISTRY_CAPTIONS`: a registry that cannot be found and a registry that is found
 * and holds no captions are different states, one a tooling fault and one a design decision,
 * and collapsing them into one skip is how R8 came to report a missing file it had read.
 */
function findVisualsRegistry(startDir) {
  let dir = resolve(startDir);
  for (let depth = 0; depth < 12; depth += 1) {
    const candidate = join(dir, "apps", "web", "src", "lessons", "visuals.tsx");
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not at the repo root yet.
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/* ------------------------------------------------------------ the node id registry */

/**
 * The node ids, read from `packages/skill-graph/src/skill_graph.json`, for R18.
 *
 * Found by walking up from the pack directory, the same way the caption registry is, and
 * failing OPEN for the same reason: a pack validated outside the repo should skip the rule
 * rather than invent a finding. The set is the whole rule, which is what makes R18 an error
 * and not a shortlist. A SHAPE pattern (`[A-Z]{2,3}\.\w`) would have been easier and would
 * have brought a false-positive mode with it for free, as well as missing `FUN.10`, whose
 * second digit defeats a trailing word boundary.
 */
function findSkillGraph(startDir) {
  let dir = resolve(startDir);
  for (let depth = 0; depth < 12; depth += 1) {
    const candidate = join(dir, "packages", "skill-graph", "src", "skill_graph.json");
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not at the repo root yet.
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** The ids in the graph, or `null` when the file is there and cannot be read or parsed. */
function parseNodeIds(graphPath) {
  try {
    const graph = JSON.parse(readFileSync(graphPath, "utf8"));
    const nodes = Array.isArray(graph) ? graph : (graph.nodes ?? []);
    return new Set(
      nodes.map((n) => n?.node_id ?? n?.id).filter((id) => typeof id === "string"),
    );
  } catch {
    // A registry we cannot parse is a rule we do not run — but it is a DIFFERENT state
    // from a registry we parsed and found nearly empty, and the caller has to tell them
    // apart. Collapsing the two is how R8 came to report a missing file it had read.
    return null;
  }
}

/**
 * What R18 has to work with, in whichever of its four states the graph is actually in.
 *
 * Two of them fail open — the file is absent, or it is present and unreadable — because a
 * pack validated outside the repo should skip the rule rather than invent a finding. The
 * other two do not. A parse that comes back SHORT, or holding a couple of chapters where the
 * graph spans a dozen, is a tooling fault wearing a clean run's clothes: R18 would go on
 * matching every id it did recover and say nothing at all about the ids it lost. That state
 * gets a finding and an empty set, so the rule is off rather than quietly partial.
 */
function readNodeIdRegistry(findings, graphPath) {
  if (graphPath === null) {
    console.log(
      "note: skill_graph.json was NOT FOUND from here, so no node ids could be read and the node-id rule (R18) is skipped. This lookup fails open by design: a pack validated outside the repo skips the rule rather than failing on it.",
    );
    return new Set();
  }

  const nodeIds = parseNodeIds(graphPath);
  if (nodeIds === null) {
    console.log(
      `note: ${graphPath} was found but COULD NOT BE READ OR PARSED, so no node ids could be read and the node-id rule (R18) is skipped. Same fail-open path as a graph that is not there.`,
    );
    return new Set();
  }

  if (nodeIds.size < MIN_GRAPH_NODE_IDS) {
    report(
      findings,
      graphPath,
      `only ${nodeIds.size} node id(s) parsed out of a floor of ${MIN_GRAPH_NODE_IDS}. The node shape has drifted off what parseNodeIds reads, so the ids it did recover are a fragment of the graph and R18 cannot be said to have run: it would go on matching those and say nothing whatever about the ones it lost. Fix parseNodeIds; do not lower the floor, which is what would turn this back into a rule that passes by seeing almost nothing`,
    );
    return new Set();
  }

  const prefixes = new Set(Array.from(nodeIds, (id) => id.split(".")[0]));
  if (prefixes.size < MIN_GRAPH_ID_PREFIXES) {
    report(
      findings,
      graphPath,
      `${nodeIds.size} node id(s) parsed, but they span only ${prefixes.size} chapter prefix(es) (${[...prefixes].sort().join(", ")}) against a floor of ${MIN_GRAPH_ID_PREFIXES}. A count clears when a partial parse recovers one chapter's worth of nodes and loses the rest, so the shape is checked beside the size: R18 is off rather than silently scoped to the chapters that happened to parse`,
    );
    return new Set();
  }

  // Said out loud on a healthy run for the same reason R8's dormancy note is: a rule that is
  // LIVE and a rule that is silently scoped to a fragment print the same nothing otherwise,
  // and the population is the whole of R18.
  console.log(
    `note: skill_graph.json parsed from ${graphPath}: ${nodeIds.size} node ids across ${prefixes.size} chapter prefixes. The node-id rule (R18) runs over all of them.`,
  );
  return nodeIds;
}

/** The registry as text, or null when it is there but cannot be read. */
function readRegistrySource(registryPath) {
  try {
    return readFileSync(registryPath, "utf8");
  } catch {
    return null;
  }
}

/**
 * The object literal opening at `open` (the index of its `{`), as source text, or null when
 * it never closes.
 *
 * Scanned with brace depth and string state rather than matched with a pattern, because a
 * caption is prose the author writes and can contain either. `$\dfrac{x + 2}{x - 6}$` was a
 * real caption on `rational-forbidden-dose-explore`, so a `[^{}]*` body would have ended
 * that entry in the middle of its own math.
 */
function objectLiteralBody(source, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote !== null) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * Every registry entry, as id to the source of its object literal.
 *
 * The entry is found by its HEAD and then read as a body, rather than by one pattern per
 * field, and that is the whole point: a pattern per field also pins the field ORDER, and the
 * order is not the rule. Both functions below used to require `caption` to sit immediately
 * after `Svg`, so the same duplicate caption was caught written one way round and invisible
 * written the other -- measured at `3638629` on 2026-07-29 by injecting `RAT.1`'s duplicate
 * twice, which fails at 83% overlap `Svg`-first and passes "OK: 6 lesson pack(s) passed
 * validation" `caption`-first. A guard a field order can switch off is not a guard.
 *
 * `Svg:` followed by a plain identifier and then a `,` or `}` is what marks a body as an
 * ENTRY rather than the `Record<>` type literal above them, whose own `Svg:` is followed by
 * `React.ComponentType<...>` and so matches neither the dot nor the terminator.
 */
function registryEntries(source) {
  const entries = new Map();
  const head = /["']?([a-z0-9][a-z0-9-]*)["']?:\s*\{/g;
  let match = head.exec(source);
  while (match !== null) {
    const open = match.index + match[0].length - 1;
    const body = objectLiteralBody(source, open);
    if (body !== null && /\bSvg:\s*[A-Za-z0-9_]+\s*[,}]/.test(`${body}}`)) {
      entries.set(match[1], body);
    }
    // Resume just past the `{`, so a nested literal is still its own candidate.
    head.lastIndex = open + 1;
    match = head.exec(source);
  }
  return entries;
}

/**
 * Every id the registry maps to a widget, captioned or not.
 *
 * This is not a rule of its own; it is the denominator the caption count is read against,
 * so that "no captions" can be told apart from "no registry parsed".
 */
function parseEntryIds(source) {
  return new Set(registryEntries(source).keys());
}

/**
 * The captions R8 will judge, plus the entries that declare one it cannot read.
 *
 * The second list is not bookkeeping. A caption whose value is not a plain double-quoted
 * literal -- a template literal, a concatenation, an imported constant -- is a caption this
 * script cannot decode, and silently dropping it from the map would put the entry back in
 * exactly the state this parser was rewritten to end: present in the registry, absent from
 * the population, indistinguishable from clean. So it is REPORTED rather than swallowed.
 */
function parseCaptions(source) {
  const captions = new Map();
  const undecodable = [];
  for (const [id, body] of registryEntries(source)) {
    if (!/\bcaption\s*:/.test(body)) continue;
    const literal = /\bcaption\s*:\s*("(?:[^"\\]|\\.)*")/.exec(body);
    if (literal === null) {
      undecodable.push(id);
      continue;
    }
    try {
      captions.set(id, JSON.parse(literal[1]));
    } catch {
      undecodable.push(id);
    }
  }
  return { captions, undecodable };
}

/**
 * The registry parser's own self-test, run once per invocation.
 *
 * R8's population is zero by design (see `EXPECTED_REGISTRY_CAPTIONS`), so NOTHING in the
 * tree exercises this parser on a real caption. The pin and the entry floor between them
 * catch a parser that finds too little, but neither can catch one that finds the wrong
 * thing while the true answer is also zero: both are satisfied by a parser that has stopped
 * recognising captions altogether, because that is what the repo looks like anyway. These
 * cases are what stands in for the missing population, on every run and in every domain, so
 * "R8 is dormant" keeps meaning "there is nothing to check" rather than "it stopped
 * looking".
 *
 * Case 2 is the one that earned this: `caption`-first was invisible to the previous parser,
 * so an identical duplicate caption failed the run written one way round and passed it the
 * other. Case 6 guards the denominator from the opposite error, since an entry pattern loose
 * enough to swallow the `Record<>` type literal above the entries would inflate the count
 * the floor is read against.
 */
const REGISTRY_PARSE_SELF_CHECKS = [
  {
    what: "a caption written after Svg is read",
    source: `"a-play": { Svg: A, caption: "Cancel the shared factor." },`,
    expect: {
      entries: 1,
      captions: [["a-play", "Cancel the shared factor."]],
      undecodable: [],
    },
  },
  {
    what: "a caption written BEFORE Svg is read the same way",
    source: `"a-play": { caption: "Cancel the shared factor.", Svg: A },`,
    expect: {
      entries: 1,
      captions: [["a-play", "Cancel the shared factor."]],
      undecodable: [],
    },
  },
  {
    what: "a caption carrying KaTeX braces survives intact",
    source: `"a-play": {\n    Svg: A,\n    caption:\n      "Read $\\\\dfrac{x + 2}{x - 6}$ here.",\n  },`,
    expect: {
      entries: 1,
      captions: [["a-play", "Read $\\dfrac{x + 2}{x - 6}$ here."]],
      undecodable: [],
    },
  },
  {
    what: "an uncaptioned entry counts toward the denominator and contributes no caption",
    source: `"a-play": { Svg: A },\n  "b-order": { Svg: B },`,
    expect: { entries: 2, captions: [], undecodable: [] },
  },
  {
    what: "a caption the script cannot decode is reported, not silently dropped",
    source: `"a-play": { Svg: A, caption: CAPTION_TEXT },`,
    expect: { entries: 1, captions: [], undecodable: ["a-play"] },
  },
  {
    what: "a type annotation is not an entry, even when an entry-shaped key reaches it",
    source: `render(entry: {\n    Svg: React.ComponentType<LessonWidgetProps>;\n    caption?: string;\n  });\n  "a-play": { Svg: A },`,
    expect: { entries: 1, captions: [], undecodable: [] },
  },
];

function selfCheckRegistryParser(findings) {
  for (const { what, source, expect } of REGISTRY_PARSE_SELF_CHECKS) {
    const { captions, undecodable } = parseCaptions(source);
    const got = {
      entries: parseEntryIds(source).size,
      captions: [...captions.entries()],
      undecodable,
    };
    if (JSON.stringify(got) === JSON.stringify(expect)) continue;
    report(
      findings,
      "validate-lesson-pack.mjs",
      `SELF-CHECK FAILED for the registry parser (${what}): got ${JSON.stringify(got)} where ${JSON.stringify(expect)} is required. R8 has no captions to run over in this repo, so these cases are the only thing standing between "dormant" and "blind". Fix registryEntries/parseCaptions; do not weaken this case`,
    );
  }
}

/**
 * What R8 has to work with, in whichever of its three states the registry is actually in,
 * each said in its own words. These were one line, and the line was:
 *
 *   note: visuals.tsx captions not readable from here; skipping the caption rule.
 *
 * which is FALSE in the state the repo is in. The registry is found, and 32KB of it is read
 * and parsed; there are simply zero caption entries in it, by `#179`'s design. So the note
 * blamed the tooling for a decision, read as a missing-file fault, and got scrolled past on
 * all four packs. A tooling failure and a designed emptiness are not the same finding and
 * cannot share a sentence.
 *
 * Only the DESIGNED state carries assertions, and it has to be the only one: the other two
 * are the fail-open path, and a pack validated outside the repo must skip R8 rather than
 * fail on a registry it was never going to see.
 */
function readCaptionRegistry(findings, startDir) {
  const registryPath = findVisualsRegistry(startDir);
  if (registryPath === null) {
    console.log(
      "note: apps/web/src/lessons/visuals.tsx was NOT FOUND from here, so no captions could be read and the caption rule (R8) is skipped. This lookup fails open by design: a pack validated outside the repo skips the rule rather than failing on it.",
    );
    return new Map();
  }

  const source = readRegistrySource(registryPath);
  if (source === null) {
    console.log(
      `note: ${registryPath} was found but COULD NOT BE READ, so no captions could be read and the caption rule (R8) is skipped. Same fail-open path as a registry that is not there.`,
    );
    return new Map();
  }

  const entries = parseEntryIds(source);
  const { captions, undecodable } = parseCaptions(source);

  if (entries.size < MIN_REGISTRY_ENTRIES) {
    report(
      findings,
      registryPath,
      `only ${entries.size} registry entries parsed out of a floor of ${MIN_REGISTRY_ENTRIES}, from ${source.length} bytes read. The entry pattern has drifted off the registry's shape, so the caption count taken from the same text means nothing and R8 cannot be said to have run. Fix the pattern in registryEntries; do not lower the floor, which is what would turn this back into a rule that passes by seeing nothing`,
    );
    return captions;
  }

  if (undecodable.length > 0) {
    report(
      findings,
      registryPath,
      `${undecodable.length} registry entr(y/ies) declare a caption whose value this script cannot read (${undecodable.join(", ")}). R8 judges a caption by its TEXT, so one it cannot decode is one it cannot check, and the count below is short by that many rather than clean. Write the caption as a plain double-quoted string literal; do not drop this report, which is the only thing separating an unreadable caption from an absent one`,
    );
  }

  if (captions.size !== EXPECTED_REGISTRY_CAPTIONS) {
    report(
      findings,
      registryPath,
      `${captions.size} caption(s) in the visual registry where this script pins ${EXPECTED_REGISTRY_CAPTIONS} (${[...captions.keys()].join(", ")}). The caption is not the defect: R8 is live again for those widgets and has just run over them. Confirm it came back clean, then set EXPECTED_REGISTRY_CAPTIONS to ${captions.size} so the population R8 checks is the reviewed one`,
    );
    return captions;
  }

  if (captions.size === 0) {
    console.log(
      `note: visuals.tsx parsed from ${registryPath}: ${entries.size} registry entries, ${captions.size} of them captioned. R8 (a widget caption may not restate the task already stated in mini_lesson[after]) therefore has nothing to check, and this is the INTENDED END STATE rather than a tooling fault: #179 removed every widget caption on purpose. The rule is dormant, not dead, and reactivates on the first caption anyone adds; the count is pinned at EXPECTED_REGISTRY_CAPTIONS, so that caption appearing is an error here rather than a silent change.`,
    );
  }

  return captions;
}

/* ------------------------------------------------------------------------ reporting */

function report(findings, file, message, tier = "error") {
  findings.push({ file: basename(file), message, tier });
}

function containsEmDash(value) {
  return typeof value === "string" && value.includes(EM_DASH);
}

/**
 * Plain whitespace word count, the way a reader counts a heading. Deliberately NOT
 * `contentWords`, which drops stop words and would score "What are exponents?" as one.
 */
function countWords(text) {
  const trimmed = stripMarkdown(text).trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/* ---------------------------------------------------------------------- pack checks */

function validatePack(file, findings, captions, nodeIds) {
  let pack;
  try {
    pack = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    report(findings, file, `not valid JSON: ${err.message}`);
    return null;
  }

  const nodeId = typeof pack.node_id === "string" ? pack.node_id : "(no node_id)";
  const prefix = `[${nodeId}]`;

  // --- mini_lesson + every-slide-interactive pairing --------------------------
  const paragraphs = Array.isArray(pack.mini_lesson) ? pack.mini_lesson : null;
  if (!paragraphs || paragraphs.length === 0) {
    report(findings, file, `${prefix} mini_lesson must be a non-empty array`);
  }
  const visuals = Array.isArray(pack.visuals) ? pack.visuals : [];

  // Every visual id must be interactive; every gating placement is meaningful.
  for (const v of visuals) {
    if (!v || typeof v !== "object") {
      report(findings, file, `${prefix} malformed visuals entry`);
      continue;
    }
    if (!isInteractiveId(v.id)) {
      report(
        findings,
        file,
        `${prefix} visual id "${v.id}" is not an interactive id (static/legacy ids are rejected; use one of ${INTERACTIVE_SUFFIX_HELP}, optionally with a short variant like -ltr)`,
      );
    }
  }

  // One widget, one job: the same id twice in one lesson is the same interaction twice.
  const seenIds = new Set();
  for (const v of visuals) {
    if (!v || typeof v.id !== "string") continue;
    if (seenIds.has(v.id)) {
      report(
        findings,
        file,
        `${prefix} visual id "${v.id}" appears twice in this lesson; give the second slide a different interaction rather than the same widget again`,
      );
    }
    seenIds.add(v.id);
  }

  // Interaction variety within the lesson (warning: half the D1 packs predate the bar).
  const lessonKinds = new Set(visuals.map((v) => interactionKind(v?.id)).filter(Boolean));
  if (visuals.length >= MIN_LESSON_KINDS && lessonKinds.size < MIN_LESSON_KINDS) {
    report(
      findings,
      file,
      `${prefix} only ${lessonKinds.size} distinct interaction kind(s) across ${visuals.length} widgets (${[...lessonKinds].join(", ")}); SKILL.md asks for >= ${MIN_LESSON_KINDS} per lesson`,
      "warning",
    );
  }

  // Each mini_lesson index needs >= 1 gating interactive visual placed after it.
  if (paragraphs) {
    for (let i = 0; i < paragraphs.length; i += 1) {
      const gating = visuals.filter(
        (v) => v && v.after === i && v.gates === true && isInteractiveId(v.id),
      );
      if (gating.length === 0) {
        report(
          findings,
          file,
          `${prefix} mini_lesson paragraph index ${i} has no gating interactive visual (needs a visuals entry with after: ${i}, gates: true, and an interactive id)`,
        );
      }
      if (containsEmDash(paragraphs[i])) {
        report(findings, file, `${prefix} em-dash (U+2014) in mini_lesson[${i}]`);
      }
      const subtitle = Array.isArray(pack.slide_subtitles)
        ? pack.slide_subtitles[i]
        : undefined;
      validateParagraphProse(file, findings, prefix, paragraphs[i], i, subtitle);
      validateSlideSubtitle(file, findings, prefix, pack.slide_subtitles, i);
    }
  }

  // --- R34 section 2, on the packs that declare it ----------------------------
  validateWorkedExamples(file, findings, prefix, pack);

  // --- one instruction per task: caption vs the slide's task sentence ---------
  if (paragraphs && captions.size > 0) {
    for (const v of visuals) {
      if (!v || typeof v.id !== "string" || typeof v.after !== "number") continue;
      const caption = captions.get(v.id);
      const paragraph = paragraphs[v.after];
      if (typeof caption !== "string" || caption.trim() === "") continue;
      if (typeof paragraph !== "string") continue;
      const captionWords = contentWords(caption);
      const taskWords = contentWords(taskSentence(paragraph));
      if (captionWords.size < 3 || taskWords.size < 3) continue;
      const overlap = jaccard(captionWords, taskWords);
      if (overlap >= DUPLICATE_JACCARD) {
        report(
          findings,
          file,
          `${prefix} the "${v.id}" caption restates the task already stated in mini_lesson[${v.after}] (${Math.round(overlap * 100)}% content-word overlap); state the task once, inside the widget, and drop or repurpose the caption`,
        );
      }
    }
  }

  // --- em-dash sweep over learner-facing strings ------------------------------
  if (containsEmDash(pack.title)) {
    report(findings, file, `${prefix} em-dash (U+2014) in title`);
  }

  // --- R18 / R20 over every learner-visible string in the pack ----------------
  for (const { where, value } of learnerVisibleStrings(pack)) {
    validateLearnerVocabulary(file, findings, prefix, where, value, nodeIds);
  }

  // --- cfu present with prompt / accepted / hint ------------------------------
  const cfu = pack.cfu;
  if (!cfu || typeof cfu !== "object") {
    report(findings, file, `${prefix} cfu is required (prompt + accepted + hint)`);
  } else {
    if (typeof cfu.prompt !== "string" || cfu.prompt.trim() === "") {
      report(findings, file, `${prefix} cfu.prompt is required`);
    }
    if (!Array.isArray(cfu.accepted) || cfu.accepted.length === 0) {
      report(findings, file, `${prefix} cfu.accepted must be a non-empty array`);
    }
    if (typeof cfu.hint !== "string" || cfu.hint.trim() === "") {
      report(findings, file, `${prefix} cfu.hint is required`);
    }
    if (containsEmDash(cfu.prompt)) {
      report(findings, file, `${prefix} em-dash (U+2014) in cfu.prompt`);
    }
    if (containsEmDash(cfu.hint)) {
      report(findings, file, `${prefix} em-dash (U+2014) in cfu.hint`);
    }
    for (const [field, text] of [
      ["cfu.prompt", cfu.prompt],
      ["cfu.hint", cfu.hint],
    ]) {
      if (typeof text !== "string") continue;
      for (const { phrase, pattern } of META_COMMENTARY_RULES) {
        if (pattern.test(text)) {
          report(findings, file, `${prefix} meta-commentary in cfu text: "${phrase}"`);
        }
      }
      for (const aside of commaAsides(text)) {
        report(
          findings,
          file,
          `${prefix} comma-fenced aside in ${field}: ", ${aside.phrase},". Put it in parentheses so the commas are left doing one job, or absorb it into the sentence if it is load-bearing rather than skippable${aside.note}`,
          "warning",
        );
      }
    }
    if (Array.isArray(cfu.accepted)) {
      for (const a of cfu.accepted) {
        if (containsEmDash(a)) {
          report(findings, file, `${prefix} em-dash (U+2014) in cfu.accepted entry "${a}"`);
        }
      }
    }
    validateCfuCheck(file, findings, prefix, cfu);
    validateCfuVariants(file, findings, prefix, cfu.variants);
    validateCfuWorkedSolution(file, findings, prefix, cfu);
    validateCfuWorkedSolutionParams(file, findings, prefix, cfu);
    validateCfuWorkedSolutionTemplate(file, findings, prefix, cfu);
    validateCfuGuessResistance(file, findings, prefix, cfu);
  }

  return { visuals };
}

/**
 * Rule 12f: a declared `cfu.check` is one the grader can actually read.
 *
 * The field decides HOW the question is graded, and it did not used to be validated at all: a
 * malformed block passed `check:lessons` in silence, which is the worst place for a silence
 * because a check block cannot be wrong quietly. With one the card stops consulting
 * `cfu.accepted` on the authored question entirely and hands the answer to the shared checker
 * (`apps/web/src/lessons/cfuChecker.ts`), so a mistyped `answer_type` does not degrade grading,
 * it replaces it — and a pack whose declared type cannot read its own key grades every learner
 * wrong while looking perfectly well-formed.
 *
 * `accepted[0] === answer_key` is asserted here and not only in the web suite because it is the
 * one an author breaks by hand: the reveal prints `accepted[0]` and the checker grades against
 * `answer_key`, so when they disagree the walkthrough shows a learner a string the grader will
 * refuse from them.
 *
 * What CANNOT be checked from here is whether the checker can read the key under the declared
 * type. That is TypeScript in another package, and `cfuCheckAcceptance.test.ts` owns it by
 * grading every spelling in every checked pack's list through the checker the check routes to.
 */
function validateCfuCheck(file, findings, prefix, cfu) {
  const check = cfu.check;
  if (check === undefined) {
    return;
  }
  if (typeof check !== "object" || check === null || Array.isArray(check)) {
    report(findings, file, `${prefix} cfu.check must be an object`);
    return;
  }
  // The union `LessonCfuAnswerType` declares. Duplicated from TypeScript rather than imported
  // because this script is standalone; `cfuChecker.ts` holds the record that exhausts it, and
  // a type added there without being added here shows up as this rule rejecting a valid pack
  // rather than as a pack grading wrongly.
  const ANSWER_TYPES = [
    "numeric",
    "expression",
    "interval",
    "solution_set",
    "point",
    "equation_form",
  ];
  if (!ANSWER_TYPES.includes(check.answer_type)) {
    report(
      findings,
      file,
      `${prefix} cfu.check.answer_type must be one of ${ANSWER_TYPES.join(", ")} (got ${JSON.stringify(check.answer_type)}): the checker dispatches on it, and an unknown type is graded by nothing`,
    );
  }
  if (typeof check.answer_key !== "string" || check.answer_key.trim() === "") {
    report(
      findings,
      file,
      `${prefix} cfu.check.answer_key must be a non-empty string: it is the answer the checker compares against, and the accepted list is not consulted on the authored question`,
    );
  } else if (Array.isArray(cfu.accepted) && cfu.accepted[0] !== check.answer_key) {
    report(
      findings,
      file,
      `${prefix} cfu.check.answer_key is ${JSON.stringify(check.answer_key)} but cfu.accepted[0] is ${JSON.stringify(cfu.accepted[0])}. The reveal prints accepted[0] and the checker grades against answer_key, so a learner would be shown one string and refused for typing it`,
    );
  }
  if (check.allowed_symbols !== undefined) {
    if (
      !Array.isArray(check.allowed_symbols) ||
      check.allowed_symbols.length === 0 ||
      check.allowed_symbols.some((s) => typeof s !== "string" || s.trim() === "")
    ) {
      report(
        findings,
        file,
        `${prefix} cfu.check.allowed_symbols must be a non-empty array of symbol names: an empty one declares an expression written in nothing, and the field is better omitted than emptied`,
      );
    }
  }
  for (const key of [
    "representation",
    "simplification",
    "required_form",
    "required_notation",
  ]) {
    const value = check[key];
    if (value !== undefined && (typeof value !== "string" || value.trim() === "")) {
      report(findings, file, `${prefix} cfu.check.${key} must be a non-empty string`);
    }
  }
  for (const key of Object.keys(check)) {
    if (
      ![
        "answer_type",
        "answer_key",
        "allowed_symbols",
        "representation",
        "simplification",
        "required_form",
        "required_notation",
      ].includes(key)
    ) {
      report(
        findings,
        file,
        `${prefix} unknown cfu.check field "${key}": the spec is built field by field in cfuChecker.ts, so a field it does not read is silently ignored rather than applied`,
      );
    }
  }
}

/**
 * Rule 12a: a declared `cfu.variants` block is one the surface can actually spend.
 *
 * The field names the item-bank template a check's re-ask draws further instances from (see
 * `apps/web/src/lessons/cfuVariants.ts`). This script cannot resolve a `template_id` -- that is
 * TypeScript in another package, and the resolution is asserted in `cfuVariants.test.ts`
 * instead -- so what is checked here is the half a content author can get wrong on their own:
 * the shape, and a `count` that promises more than one question.
 *
 * A `count` of 1 is the interesting failure and the reason this is not merely a type. The card
 * reads the RESOLVED list to decide what to tell the learner, so a pack declaring one instance
 * gets the unconverted wording and looks fine while its `variants` block does nothing at all.
 *
 * REQUIRED rather than optional, since every pack in the tree carries one. The reveal's whole
 * offer is "here is the answer, now try a different question", and a pack with no variants
 * hands the identical question back: the offer is made and not kept. A check that genuinely
 * cannot be parameterised should fail here and be argued about, rather than shipping the
 * broken promise quietly.
 */
function validateCfuVariants(file, findings, prefix, variants) {
  if (variants === undefined) {
    report(
      findings,
      file,
      `${prefix} cfu.variants is required: without it the reveal's "try a different question" hands the identical question back. Name the item-bank template whose draw supplies further instances, and register a speller for it in apps/web/src/lessons/cfuVariants.ts`,
    );
    return;
  }
  if (typeof variants !== "object" || variants === null || Array.isArray(variants)) {
    report(findings, file, `${prefix} cfu.variants must be an object`);
    return;
  }
  if (typeof variants.template_id !== "string" || variants.template_id.trim() === "") {
    report(
      findings,
      file,
      `${prefix} cfu.variants.template_id is required: name the item-bank template whose draw supplies this check's further instances`,
    );
  }
  if (!Number.isInteger(variants.count) || variants.count < 2) {
    report(
      findings,
      file,
      `${prefix} cfu.variants.count must be an integer of at least 2 (got ${JSON.stringify(variants.count)}): the count includes the authored question, so 1 declares a generator that never serves anything and leaves the re-ask handing the same question back`,
    );
  }
  for (const key of Object.keys(variants)) {
    if (key !== "template_id" && key !== "count") {
      report(findings, file, `${prefix} unknown cfu.variants field "${key}"`);
    }
  }
}

/**
 * Rule 12c: the reveal's worked solution is steps, ending at the answer.
 *
 * `WorkedSolution` renders these as numbered cards beneath the reveal's passage, which is the
 * same component and the same contract the practice card uses, so the rules `validateTemplates`
 * holds every pooled template to apply here too: ordered steps, one per entry, no em dashes, no
 * talking about the exercise instead of working it.
 *
 * The LAST STEP is the one worth a rule of its own. A learner reads the reveal to find out what
 * the answer was, and a walkthrough that stops one move short leaves them to finish it
 * themselves at exactly the moment they have said they cannot. So the final entry has to NAME
 * the answer, matched after stripping the notations that are differences in typesetting rather
 * than in content: the pack writes `\dfrac{1}{3}` in a step and `1/3` in its accepted list, and
 * those are the same answer.
 *
 * Matched against the WHOLE accepted list rather than against `accepted[0]`, because a step
 * legitimately ends on whichever spelling reads best in prose.
 */
function validateCfuWorkedSolution(file, findings, prefix, cfu) {
  const steps = cfu.worked_solution;
  if (!Array.isArray(steps) || steps.length === 0) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution must be a non-empty array of ordered steps: the reveal shows them beneath the answer, and a reveal with none prints a heading over nothing`,
    );
    return;
  }
  for (const [index, step] of steps.entries()) {
    if (typeof step !== "string" || step.trim() === "") {
      report(
        findings,
        file,
        `${prefix} cfu.worked_solution[${index}] must be a non-empty string`,
      );
      continue;
    }
    if (containsEmDash(step)) {
      report(findings, file, `${prefix} em-dash (U+2014) in cfu.worked_solution[${index}]`);
    }
    for (const { phrase, pattern } of META_COMMENTARY_RULES) {
      if (pattern.test(step)) {
        report(
          findings,
          file,
          `${prefix} meta-commentary in cfu.worked_solution[${index}]: "${phrase}"`,
        );
      }
    }
  }

  const last = steps[steps.length - 1];
  if (typeof last !== "string" || !Array.isArray(cfu.accepted)) {
    return;
  }
  const haystack = stripMathNotation(last);
  const named = cfu.accepted.some((form) => {
    const needle = stripMathNotation(form);
    return needle !== "" && haystack.includes(needle);
  });
  if (!named) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution's last step does not name the answer. It reads "${last}", and none of the accepted spellings appears in it. The learner opened the reveal because they could not finish, so the walkthrough has to`,
    );
  }
}

/**
 * Rule 12d: `cfu.worked_solution_params` is the SHAPE of a figure, and only its shape.
 *
 * The field hands the authored question's parameters to a registered visual -- the one belonging
 * to `worked_solution_template` where the pack names one, and to `variants.template_id`
 * otherwise -- so that the first question is explained by a diagram instead of falling through
 * to the step cards. Two things can be checked from here: that there is an id for the parameters
 * to be read through, and that the values are finite numbers, since a visual destructures them
 * and does arithmetic with them.
 *
 * What CANNOT be checked from here is the thing that actually matters, whether the figure those
 * parameters produce describes the authored question or a different one. The registry is React
 * in another package; a params set naming the wrong numbers renders a clean, captioned,
 * correctly typeset diagram with the wrong answer in it. That claim is owned by
 * `apps/web/src/lessons/cfuAuthoredFigure.test.tsx`, which renders each figure and looks for an
 * accepted answer in what it says. Said explicitly because a rule named after a field reads
 * like coverage of that field, and passing this one is not evidence the figure is right.
 */
function validateCfuWorkedSolutionParams(file, findings, prefix, cfu) {
  const params = cfu.worked_solution_params;
  if (params === undefined) {
    return;
  }
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution_params must be an object of parameter names to numbers`,
    );
    return;
  }
  if (cfu.variants === undefined && cfu.worked_solution_template === undefined) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution_params has no template id to be read through: the parameters go to the registered visual of cfu.worked_solution_template, or of variants.template_id when that is absent, so with neither they feed nothing and the reveal still shows the step cards`,
    );
  }
  if (Object.keys(params).length === 0) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution_params is empty: an empty object claims a figure and supplies nothing to draw it with. Remove the field to keep the step cards, or name the visual's parameters`,
    );
  }
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      report(
        findings,
        file,
        `${prefix} cfu.worked_solution_params.${key} must be a finite number (got ${JSON.stringify(value)}): the visual destructures these and computes with them`,
      );
    }
  }
}

/**
 * Rule 12e: `cfu.worked_solution_template` names the figure the AUTHORED question gets, and is
 * only meaningful alongside the parameters that drive it.
 *
 * A pack sets it when the question written for the node and the template chosen to rotate it
 * are different shapes, which happens because the two were decided separately: LIN.1's check
 * puts the variable on both sides while its re-ask draws a one-pile balance word problem, and
 * a different member of the same node's pool explains each.
 *
 * Shape only, again, and the limit is worth naming because this field is more dangerous than
 * 12d: the parameters must be in THIS template's schema rather than the variant template's,
 * and the two can share names while meaning different things by them. A params set in the
 * wrong schema still renders. `cfuAuthoredFigure.test.tsx` owns that, by rendering the figure
 * this field resolves to and looking for the authored answer in it.
 */
function validateCfuWorkedSolutionTemplate(file, findings, prefix, cfu) {
  const named = cfu.worked_solution_template;
  if (named === undefined) {
    return;
  }
  if (typeof named !== "string" || named.trim().length === 0) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution_template must be a non-empty template id (got ${JSON.stringify(named)})`,
    );
    return;
  }
  if (cfu.worked_solution_params === undefined) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution_template names ${named} but there is no cfu.worked_solution_params to drive it: a registered visual is a function of parameters, so an id on its own draws nothing and the reveal still shows the step cards`,
    );
  }
  if (cfu.variants !== undefined && named === cfu.variants.template_id) {
    report(
      findings,
      file,
      `${prefix} cfu.worked_solution_template names ${named}, which is already variants.template_id: that is the default, so the field is claiming a difference there is not. Remove it`,
    );
  }
}

/**
 * An answer reduced to the characters that carry its content, so two spellings of one answer
 * compare equal.
 *
 * What is thrown away is everything that is a fact about TYPESETTING: the `$` and backtick
 * fences, braces, the multiplication star, the parentheses and brackets a spelling may or may
 * not wear, and all whitespace and case. What SURVIVES is the digits, the letters, the signs
 * and the slash, and the last two are the reason this is not a one-line strip.
 *
 * A command NAME is content, not notation. `\log` reduces to `log`, because the accepted list
 * spells the same function `log(8y)` with no backslash in front of it, and dropping the name
 * would leave the step's `\log(8y)` and the answer's `log(8y)` looking like different answers.
 * Only the backslash goes.
 *
 * A FRACTION is the other case, and it has to be rewritten rather than stripped: a step writes
 * $\dfrac{1}{3}$ where the accepted list writes `1/3`, so the division has to survive into the
 * comparison. Rewritten by a brace-balanced scan rather than by a regex, because the second
 * group is routinely nested (`\dfrac{1}{x^{2}}`) and a regex that stops at the first `}` gets
 * that one wrong in the direction that matters, reporting an author's correct final step as a
 * missing answer.
 *
 * Blunt everywhere else, deliberately. The alternative is parsing mathematics in a lint script,
 * and the cost of bluntness is a false PASS on a step that happens to hold the answer's
 * characters in order, which is a step that very probably does name the answer.
 */
function stripMathNotation(value) {
  return expandLatexFractions(String(value).toLowerCase())
    .replace(/\\/g, "")
    .replace(/[$`{}()[\]*\s,]/g, "");
}

/** Rewrite every `\frac{a}{b}` (and `\dfrac`, `\tfrac`) as `a/b`, innermost first. */
function expandLatexFractions(value) {
  let out = value;
  // Bounded rather than `while (true)`: each pass resolves at least the outermost fraction, so
  // a handful of passes covers any nesting a step realistically carries, and a malformed one
  // cannot spin here.
  for (let pass = 0; pass < 8; pass += 1) {
    const at = out.search(/\\[dt]?frac\s*\{/);
    if (at === -1) {
      break;
    }
    const first = readBracedGroup(out, out.indexOf("{", at));
    if (first === null) {
      break;
    }
    const second = readBracedGroup(out, out.indexOf("{", first.end));
    if (second === null || out.slice(first.end, second.start).trim() !== "") {
      break;
    }
    out = `${out.slice(0, at)}${first.body}/${second.body}${out.slice(second.end)}`;
  }
  return out;
}

/** The contents of the balanced `{...}` starting at `open`, or null if it is not balanced. */
function readBracedGroup(value, open) {
  if (open === -1 || value[open] !== "{") {
    return null;
  }
  let depth = 0;
  for (let index = open; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    else if (value[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { body: value.slice(open + 1, index), start: open, end: index + 1 };
      }
    }
  }
  return null;
}

/**
 * Rule 12b: a check for understanding must not be answerable by guessing.
 *
 * THE CHECK IS THE GATE between teaching and practice, and it is the only thing that puts
 * "Finish lesson" on offer. A check with two options is therefore not a weak retry, it is a
 * coin-flip gate: a learner who understood nothing walks through half the time on their first
 * attempt, with no reveal involved at all. That is a worse defect than the one the variants
 * work was for, and it is a property of the check rather than of the mechanic, so it belongs
 * here rather than in a paragraph of the authoring skill nobody has to read.
 *
 * ## What is detected, and why the threshold is where it is
 *
 * There is no options field in the schema, so a choice-style check is authored as a prompt that
 * ENUMERATES its options ("increasing, decreasing, or constant") and grades a word out of that
 * set. That is what {@link enumeratedOptions} finds, and the guess space is then the number of
 * options -- but only when the option IS the whole answer. Where the choice is one part of a
 * composite (LF.1 asks for a slope AND the word), the space is the product and enormous, so the
 * rule must not fire; {@link answerIsOnlyTheChoice} is what separates the two, by asking
 * whether the accepted spellings consist of the option and nothing else.
 *
 * Two options is an ERROR: a coin flip is precisely detectable from the data and there is no
 * pedagogical reading under which it is an acceptable gate. Three is a WARNING, at the tier
 * this script reserves for rules that shortlist rather than decide: a one-in-three gate is
 * weak, and whether a particular three-way call is nonetheless the right question is a
 * judgement about the mathematics, not something a word count settles. Four or more passes.
 *
 * Neither tier fires on any shipped pack today, and that is a measurement rather than a hope:
 * across all 26 checks in the five domains, exactly one enumerates a closed option set (LF.1's
 * three words) and that one is a composite, so it is not a whole-answer choice. A rule with
 * nothing to look at is the way a gate goes quiet, so the DETECTOR is self-tested on every run
 * (see {@link GUESS_SELF_CHECKS}) rather than trusted to still work.
 */
function validateCfuGuessResistance(file, findings, prefix, cfu) {
  const verdict = guessResistanceVerdict(cfu);
  if (verdict === null) {
    return;
  }
  const { count, options } = verdict;
  const listed = options.join(", ");
  if (count <= 2) {
    report(
      findings,
      file,
      `${prefix} the check is answerable by guessing: its whole answer is one of ${count} options (${listed}). THE CHECK IS THE GATE between teaching and practice, so a two-option question lets a learner who understood nothing through half the time on the first attempt, before any reveal. Reshape it: give it enough options that guessing stops being a strategy, or ask it as free response, which is usually the honest form for a one-word answer. Both of those also become rotatable, so the check can then compute variants for its re-ask`,
    );
    return;
  }
  if (count === 3) {
    report(
      findings,
      file,
      `${prefix} the check's whole answer is one of only ${count} options (${listed}), so a learner guesses through this gate one time in ${count}. That may still be the right question -- three-way classifications are real mathematics -- which is why this shortlists rather than fails. Consider a fourth option, a second part (LF.1 pairs its three words with a slope, which is what takes it out of this rule), or free response`,
      "warning",
    );
  }
}

/**
 * The option set a prompt enumerates as "a, b, or c", or null.
 *
 * Matches a run of bare lower-case words closed by "or", with the commas OPTIONAL. The commas
 * being optional is the whole of the two-option case and was missed on the first pass: a binary
 * choice is written "increasing or decreasing" with no comma in it, so a pattern requiring one
 * could only ever see three options or more, which left rule 12b's ERROR tier -- the coin-flip
 * gate, the reason the rule exists -- with a population it could not reach. `GUESS_SELF_CHECKS`
 * is what caught that, before any of this shipped.
 *
 * Loosening it this far means the pattern now also matches ordinary prose ("the product or the
 * difference"), and that is safe only because it is half of the test: nothing is reported unless
 * {@link answerIsOnlyTheChoice} agrees that the accepted list is drawn from the matched words
 * and nothing else. A miss here is a rule that does not fire; a false positive would be a rule
 * that fails a pack over a sentence.
 */
function enumeratedOptions(prompt) {
  if (typeof prompt !== "string") {
    return null;
  }
  const match = /\b([a-z]+(?:,\s*[a-z]+)*)\s*,?\s+or\s+([a-z]+)\b/.exec(prompt);
  if (match === null) {
    return null;
  }
  const options = [...match[1].split(",").map((word) => word.trim()), match[2]];
  return options.length >= 2 ? options : null;
}

/** Strip everything the card ignores when it compares an answer: case and all whitespace. */
function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * True when every accepted spelling is just one of `options`, so the option IS the answer.
 *
 * The composite case is what this exists to exclude, and LF.1 is the worked example: its
 * accepted list reads `-1/2, decreasing`, which CONTAINS an option and is not one, because the
 * learner also has to produce the slope. A trailing full stop is tolerated because four shipped
 * packs accept one.
 */
function answerIsOnlyTheChoice(accepted, options) {
  if (!Array.isArray(accepted) || accepted.length === 0) {
    return false;
  }
  const words = new Set(options.map(normalizeAnswer));
  return accepted.every((entry) => words.has(normalizeAnswer(entry).replace(/\.$/, "")));
}

/** The rule's verdict for one check: `{ count, options }`, or null when it does not apply. */
function guessResistanceVerdict(cfu) {
  if (!cfu || typeof cfu !== "object") {
    return null;
  }
  const options = enumeratedOptions(cfu.prompt);
  if (options === null || !answerIsOnlyTheChoice(cfu.accepted, options)) {
    return null;
  }
  return { count: options.length, options };
}

/**
 * The detector's own self-test, run once per invocation.
 *
 * Rule 12b finds nothing across the shipped packs, which is the intended state and also exactly
 * how a rule dies unnoticed: the population is per-domain content, so a floor on it would fail
 * the four domains that legitimately hold no choice-style check. What CAN be asserted on every
 * run, in every domain, is that the detector still classifies correctly, so these cases stand in
 * for the population. A change that broke the regex or the whole-answer test fails here instead
 * of quietly reporting a clean sweep it never ran.
 *
 * The third case is the one that matters most, and it is LF.1's real shape: a composite whose
 * answer contains an option must NOT be reported, or the rule would fail the one pack in the
 * tree that pairs a three-way word with a computed value.
 */
const GUESS_SELF_CHECKS = [
  {
    what: "a two-option whole-answer choice is an error",
    cfu: { prompt: "Is the line increasing or decreasing?", accepted: ["increasing"] },
    expect: 2,
  },
  {
    what: "a three-option whole-answer choice is a warning",
    cfu: {
      prompt: "Is the line increasing, decreasing, or constant?",
      accepted: ["constant", "constant."],
    },
    expect: 3,
  },
  {
    what: "a composite that merely contains an option is not a choice at all",
    cfu: {
      prompt:
        "Find the slope, then say whether the line is increasing, decreasing, or constant.",
      accepted: ["-1/2, decreasing", "m = -1/2, decreasing"],
    },
    expect: null,
  },
  {
    what: "a four-option whole-answer choice passes",
    cfu: {
      prompt: "Is the function linear, quadratic, exponential, or logarithmic?",
      accepted: ["exponential"],
    },
    expect: 4,
  },
  {
    what: "ordinary prose containing the word or is not a choice",
    cfu: {
      prompt:
        "Evaluate $15 - 2 \\times 3^2$, working the exponent before the product or the difference.",
      accepted: ["-3"],
    },
    expect: null,
  },
];

function selfCheckGuessDetector(findings) {
  for (const { what, cfu, expect } of GUESS_SELF_CHECKS) {
    const verdict = guessResistanceVerdict(cfu);
    const got = verdict === null ? null : verdict.count;
    if (got !== expect) {
      report(
        findings,
        "validate-lesson-pack.mjs",
        `SELF-CHECK FAILED for rule 12b (${what}): the detector returned ${JSON.stringify(got)} where ${JSON.stringify(expect)} is required. The rule reports nothing across the shipped packs, so this case is the only thing standing between "clean" and "not looking". Fix enumeratedOptions/answerIsOnlyTheChoice; do not weaken this case`,
      );
    }
  }
}

/**
 * Rule 13's own self-test, run once per invocation.
 *
 * The population floor below says whether there is any migrated content to look at. These cases
 * say whether the rules would SEE a defect in it, which is the other half and not the same
 * half: a floor is satisfied by content that a broken rule reads and passes. They are written
 * as whole synthetic packs put through {@link validateWorkedExamples} itself rather than as
 * unit tests of a predicate, so a change that moves a check between the shape pass and the step
 * pass, or drops one from the dispatch, fails here rather than passing on a technicality.
 *
 * Case 3 is the one to keep: skipping a slide is LEGAL in both of its spellings, so a rule
 * that hardened alignment into a length equality would fail every honest pack that has a
 * definitional slide, and it would fail it on the error tier.
 *
 * Case 4 is the one that is easy to think redundant. A bare step array is not a shape anyone
 * would choose today, but it is the shape this field shipped with for one PR and the shape any
 * example written from memory of that PR will have, and it fails SILENTLY at runtime rather
 * than loudly: `workedExampleFor` reads `.steps` off an array, gets `undefined`, and reports
 * the slide as having no example, so the slide quietly loses a section. A case for the shape a
 * field used to have is worth its four lines for exactly as long as anyone remembers it.
 *
 * Each `expect` entry is `tier: <a substring of the message>`, matched in order against what the
 * validator reported, so a reworded finding stays green and a MISSING or extra one does not.
 */
const WORKED_EXAMPLE_SELF_CHECKS = [
  {
    what: "a well formed two-slide pack reports nothing",
    pack: {
      mini_lesson: ["A short idea. Two sentences of it.", "One more idea, briefly."],
      worked_examples: [
        { prompt: "Add $2 + 3$.", steps: ["Start from $2 + 3$.", "That is $5$."] },
        null,
      ],
    },
    expect: [],
  },
  {
    what: "an entry past the last slide is misalignment, not an extra example",
    pack: {
      mini_lesson: ["One idea, said once."],
      worked_examples: [
        { prompt: "Add $2 + 3$.", steps: ["Start from $2 + 3$.", "That is $5$."] },
        { prompt: "Orphaned instance.", steps: ["Orphan.", "Step."] },
      ],
    },
    expect: ["error: worked_examples[1] sits past the last slide"],
  },
  {
    what: "both spellings of a skipped slide stay legal",
    pack: {
      mini_lesson: ["One idea.", "Another idea.", "A third idea."],
      worked_examples: [null],
    },
    expect: [],
  },
  {
    what: "the OLD bare-step-array shape is named as the migration it is",
    pack: {
      mini_lesson: ["One idea."],
      worked_examples: [["Start from $2 + 3$.", "That is $5$."]],
    },
    expect: ["error: worked_examples[0] is a bare array of steps"],
  },
  {
    what: "an example with no prompt fails, since the card renders perfectly without one",
    pack: {
      mini_lesson: ["One idea.", "Another idea."],
      worked_examples: [
        { steps: ["Start from $2 + 3$.", "That is $5$."] },
        { prompt: "   ", steps: ["Start from $4 + 1$.", "That is $5$."] },
      ],
    },
    expect: [
      "error: worked_examples[0].prompt is missing or empty",
      "error: worked_examples[1].prompt is missing or empty",
    ],
  },
  {
    what: "a prompt that runs on is the lecture printed twice",
    pack: {
      mini_lesson: ["One idea."],
      worked_examples: [
        {
          prompt: "Here is one. And another thing. And a third thing.",
          steps: ["Start from $2 + 3$.", "That is $5$."],
        },
      ],
    },
    expect: ["error: worked_examples[0].prompt runs 3 sentences"],
  },
  {
    what: "the prose conventions run over the prompt as well as the steps",
    pack: {
      mini_lesson: ["One idea."],
      worked_examples: [
        {
          prompt: "Halve $10$ \u2014 carefully.",
          steps: ["As we will see, halve it.", "That is $5$."],
        },
      ],
    },
    expect: [
      "error: em-dash (U+2014) in worked_examples[0].prompt",
      "error: meta-commentary in worked_examples[0].steps[0]",
    ],
  },
  {
    what: "a one-step example is under the floor and a seven-step one over the ceiling",
    pack: {
      mini_lesson: ["One idea.", "Another idea."],
      worked_examples: [
        { prompt: "Add $2 + 3$.", steps: ["The answer is $5$."] },
        { prompt: "Add $4 + 1$.", steps: ["a", "b", "c", "d", "e", "f", "g"] },
      ],
    },
    expect: [
      "error: worked_examples[0].steps holds 1 step(s)",
      "error: worked_examples[1].steps runs 7 steps",
    ],
  },
  {
    what: "a migrated lecture warns at four sentences and fails at five",
    pack: {
      mini_lesson: [
        "One. Two. Three. Four.",
        "One. Two. Three. Four. Five.",
        "One. Two. Three.",
      ],
      worked_examples: [
        { prompt: "Add $2 + 3$.", steps: ["Start from $2 + 3$.", "That is $5$."] },
      ],
    },
    expect: [
      "error: mini_lesson[1] runs 5 sentences on a pack that declares worked_examples",
      "warning: mini_lesson[0] runs 4 sentences where the migrated target is 3",
    ],
  },
  {
    what: "an unmigrated pack is not held to the migrated budget at all",
    pack: { mini_lesson: ["One. Two. Three. Four. Five. Six."] },
    expect: [],
  },
];

function selfCheckWorkedExamples(findings) {
  for (const { what, pack, expect } of WORKED_EXAMPLE_SELF_CHECKS) {
    const observed = [];
    validateWorkedExamples("self-check", observed, "[self-check]", pack);
    // Errors before warnings, so the order the cases are written in does not depend on the
    // order two tiers happen to be reported in.
    const got = [
      ...observed.filter((f) => f.tier === "error"),
      ...observed.filter((f) => f.tier === "warning"),
    ].map((f) => `${f.tier}: ${f.message.replace("[self-check] ", "")}`);
    const matches =
      got.length === expect.length && expect.every((want, i) => got[i].includes(want));
    if (matches) continue;
    report(
      findings,
      "validate-lesson-pack.mjs",
      `SELF-CHECK FAILED for rule 13 (${what}): the validator reported ${JSON.stringify(got)} where ${JSON.stringify(expect)} is required, matched as substrings in order. Rule 13 is gated on a pack DECLARING worked_examples, so on any domain that has not migrated it is these cases and the population floor, and nothing else, standing between "clean" and "not looking". Fix validateWorkedExamples; do not weaken this case`,
    );
  }
}

/**
 * Rule 13's population floor: at least one shipped pack has migrated, and enough of its slides
 * carry a section 2 that the step rules ran over real content.
 *
 * Read across the whole content tree rather than the domain under validation, because that is
 * where the fact lives: `worked_examples` is optional per pack, so "has anything migrated" is a
 * question about the repository and the answer is the same in all nine domain runs. Found by
 * walking up from the pack directory, and failing OPEN for the reason the caption registry and
 * the skill graph do: a pack validated outside the repo skips the floor rather than failing on
 * a tree it was never going to see.
 *
 * What this is FOR, said plainly: before D1 migrated, every rule in rule 13 passed every domain
 * having examined nothing whatever, because a rule gated on an optional field is silent and
 * passing in the same breath. This is what makes that state a failure instead of a green run.
 */
function findLessonRoot(startDir) {
  let dir = resolve(startDir);
  for (let depth = 0; depth < 12; depth += 1) {
    const candidate = join(dir, "content", "lessons");
    try {
      if (statSync(candidate).isDirectory()) return candidate;
    } catch {
      // Not at the repo root yet.
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Every pack under `lessonRoot` that declares `worked_examples`, the slides carrying steps,
 * and the slides carrying a PROMPT.
 *
 * Prompts are counted separately from steps rather than assumed to travel with them, because
 * they are a later addition to the same field and the whole tree could carry steps without
 * one. Counting only the slides would leave `validateExamplePrompt` in the state rule 13 was
 * in before D1 migrated: correct, gated, and reading nothing.
 */
function migratedPopulation(lessonRoot) {
  const packs = [];
  let slides = 0;
  let prompts = 0;
  let domains;
  try {
    domains = readdirSync(lessonRoot);
  } catch {
    return null;
  }
  for (const domain of domains) {
    const dir = join(lessonRoot, domain);
    let names;
    try {
      if (!statSync(dir).isDirectory()) continue;
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.toLowerCase().endsWith(".json")) continue;
      let pack;
      try {
        pack = JSON.parse(readFileSync(join(dir, name), "utf8"));
      } catch {
        // A pack that does not parse is already an error against its own domain's run.
        continue;
      }
      if (!pack || !Array.isArray(pack.worked_examples)) continue;
      packs.push(`${domain}/${name}`);
      for (const entry of pack.worked_examples) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
        const steps = Array.isArray(entry.steps) ? entry.steps : [];
        if (!steps.some((step) => typeof step === "string" && step.trim() !== "")) continue;
        slides += 1;
        if (typeof entry.prompt === "string" && entry.prompt.trim() !== "") {
          prompts += 1;
        }
      }
    }
  }
  return { packs, slides, prompts };
}

function assertMigratedPopulation(findings, startDir) {
  const lessonRoot = findLessonRoot(startDir);
  if (lessonRoot === null) {
    console.log(
      "note: content/lessons was NOT FOUND from here, so rule 13's population floor is skipped. This lookup fails open by design: a pack validated outside the repo skips the floor rather than failing on a tree it cannot see. The rule's own cases (WORKED_EXAMPLE_SELF_CHECKS) still ran.",
    );
    return;
  }
  const population = migratedPopulation(lessonRoot);
  if (population === null) {
    console.log(
      `note: ${lessonRoot} was found but could not be listed, so rule 13's population floor is skipped. Same fail-open path as a tree that is not there.`,
    );
    return;
  }
  const { packs, slides, prompts } = population;
  if (
    packs.length >= MIGRATED_PACK_FLOOR &&
    slides >= MIGRATED_SLIDE_FLOOR &&
    prompts >= MIGRATED_SLIDE_FLOOR
  ) {
    return;
  }
  report(
    findings,
    "validate-lesson-pack.mjs",
    `POPULATION FLOOR FAILED for rule 13 (R34's worked_examples rules): ${packs.length} pack(s) under ${lessonRoot} declare the field (${packs.join(", ") || "none"}), ${slides} slide(s) carry a non-empty section 2 and ${prompts} of those name their instance in a prompt, where the floor is ${MIGRATED_PACK_FLOOR} pack and ${MIGRATED_SLIDE_FLOOR} of each. Every rule in 13 is gated on a pack declaring worked_examples, so on this tree they examined NOTHING and their green says only that no pack uses the field. Migrate a pack (R34, and the three-section flow in author/reference.md); do not lower the floor, which is what would turn rule 13 back into a rule that passes by seeing nothing`,
  );
}

/**
 * R14: every slide carries a subtitle, and it runs no more than four words.
 *
 * Presence is a WARNING (see the header). Everything an author DOES write is held to the
 * error tier, because a subtitle that is present and a full sentence long, or that carries
 * an em-dash, is a new defect rather than inherited content: the em-dash and
 * meta-commentary rules run over this field the same as over the prose, so the field
 * cannot become a hole in checks the rest of the pack passes.
 */
function validateSlideSubtitle(file, findings, prefix, subtitles, index) {
  if (subtitles !== undefined && !Array.isArray(subtitles)) {
    report(findings, file, `${prefix} slide_subtitles must be an array of strings`);
    return;
  }
  const subtitle = Array.isArray(subtitles) ? subtitles[index] : undefined;

  if (typeof subtitle !== "string" || subtitle.trim() === "") {
    report(
      findings,
      file,
      `${prefix} mini_lesson[${index}] has no slide_subtitles[${index}]; give the slide a heading of at most four words, normally a tight noun phrase naming what the slide is about ("Powers of powers"), and the question form only where a question is the natural thing to say at that point ("What happens at zero?")`,
      "warning",
    );
    return;
  }

  const words = countWords(subtitle);
  if (words > MAX_SUBTITLE_WORDS) {
    report(
      findings,
      file,
      `${prefix} slide_subtitles[${index}] runs ${words} words (ceiling is ${MAX_SUBTITLE_WORDS}): "${subtitle}". A subtitle says where the learner is and stops; the prose teaches. Name the topic in a tight noun phrase ("Powers of powers"), or ask the slide's question where a question is the natural thing to say there ("What happens at zero?"), and do not pad to reach the ceiling`,
    );
  }
  if (containsEmDash(subtitle)) {
    report(findings, file, `${prefix} em-dash (U+2014) in slide_subtitles[${index}]`);
  }
  const prose = stripMarkdown(stripMath(subtitle));
  for (const { phrase, pattern } of META_COMMENTARY_RULES) {
    if (pattern.test(prose)) {
      report(
        findings,
        file,
        `${prefix} meta-commentary in slide_subtitles[${index}]: "${phrase}". A subtitle names the mathematics the learner is on, not the slide`,
      );
    }
  }
}

/**
 * Rule 13 (R34): `worked_examples` is section 2, and it is aligned by POSITION.
 *
 * The field is OPTIONAL and its absence is not a finding: an unmigrated pack teaches from one
 * paragraph per slide and stays valid. Everything below runs only on a pack that declares it,
 * which is also what makes that pack's `mini_lesson` entries migrated content and hands them
 * to {@link validateMigratedLecture} instead of to `MAX_SENTENCES`.
 *
 * ALIGNMENT is the rule worth stating twice, because nothing about the field announces it. The
 * player reads `worked_examples[i]` for slide `i`, so the array is a positional map and not a
 * list of the examples a pack happens to have. An entry past the last slide is therefore not
 * an extra example, it is an example no learner can reach; and where it came from an insertion
 * rather than an append, every entry after that point is now captioning a different slide,
 * which is a defect that renders perfectly and reads as an authoring mistake nobody made.
 *
 * SKIPPING is legal and has to be, in both of its spellings: a shorter array than
 * `mini_lesson`, and an entry that is `null`. A slide that is purely definitional, or whose
 * section-3 widget IS the demonstration, has no instance to walk, and a rule that forced one
 * would buy a card restating the lecture on every such slide. So the only thing checked about
 * a skip is that the entries around it still land on the right slides.
 *
 * A BARE STEP ARRAY is called out by name rather than left to the generic shape message,
 * because it is the shape this field shipped with for one PR and the shape every example
 * written from memory will have. It renders as nothing at all -- `workedExampleFor` reads
 * `.steps`, finds `undefined`, and reports the slide as having no example -- so the slide
 * silently loses a section instead of failing, which is why the error names the fix.
 */
function validateWorkedExamples(file, findings, prefix, pack) {
  const examples = pack.worked_examples;
  if (examples === undefined) {
    return;
  }
  if (!Array.isArray(examples)) {
    report(
      findings,
      file,
      `${prefix} worked_examples must be an array of { prompt, steps } objects, one per mini_lesson index (got ${typeof examples}). Omit the field entirely on a pack that has not been migrated to three sections; do not write it as an object keyed by slide, which the player does not read`,
    );
    return;
  }

  const slides = Array.isArray(pack.mini_lesson) ? pack.mini_lesson.length : 0;
  for (let i = 0; i < examples.length; i += 1) {
    const entry = examples[i];
    if (i >= slides) {
      report(
        findings,
        file,
        `${prefix} worked_examples[${i}] sits past the last slide (mini_lesson holds ${slides}). The field is aligned by POSITION, so this is not an extra example, it is a section 2 nothing renders, and if it arrived by insertion rather than by append then every entry above it is now attached to the wrong slide. Delete it, or author the slide it belongs to`,
      );
      continue;
    }
    if (entry === undefined || entry === null) {
      continue;
    }
    if (Array.isArray(entry)) {
      report(
        findings,
        file,
        `${prefix} worked_examples[${i}] is a bare array of steps, which is the OLD shape and renders as no example at all. Wrap it: { "prompt": "<the instance this walks>", "steps": [...] }. The prompt is not optional, because step cards with no question above them are a solution to something the learner was never shown`,
      );
      continue;
    }
    if (typeof entry !== "object") {
      report(
        findings,
        file,
        `${prefix} worked_examples[${i}] must be a { prompt, steps } object (got ${typeof entry}); write null to say this slide has no worked example`,
      );
      continue;
    }
    validateExamplePrompt(file, findings, prefix, entry.prompt, i);
    if (!Array.isArray(entry.steps)) {
      report(
        findings,
        file,
        `${prefix} worked_examples[${i}].steps must be an array of ordered step strings (got ${typeof entry.steps}); write the entry as null to say this slide has no worked example`,
      );
      continue;
    }
    validateExampleSteps(file, findings, prefix, entry.steps, i);
  }

  if (Array.isArray(pack.mini_lesson)) {
    for (let i = 0; i < pack.mini_lesson.length; i += 1) {
      validateMigratedLecture(file, findings, prefix, pack.mini_lesson[i], i);
    }
  }
}

/**
 * One section-2 entry, held to the step conventions `cfu.worked_solution` already carries.
 *
 * Deliberately the same conventions and not a second set: both surfaces render through
 * `WorkedSolution`, so a step that is wrong in the reveal is wrong here, and an author who has
 * read `practice-hints` has already read this. What is NOT repeated from there is the
 * last-step-names-the-answer rule, and that is a difference in the surface rather than an
 * oversight: a reveal exists to finish a question the learner could not, so its final step owes
 * the answer to an `accepted` list this section has no equivalent of.
 */
function validateExampleSteps(file, findings, prefix, steps, index) {
  if (steps.length < MIN_EXAMPLE_STEPS) {
    report(
      findings,
      file,
      `${prefix} worked_examples[${index}].steps holds ${steps.length} step(s) and a worked example runs at least ${MIN_EXAMPLE_STEPS}: one step walks nothing, it restates the lecture in a card. Write the moves out, or make the whole entry null and let section 3 carry the demonstration`,
    );
  }
  if (steps.length > MAX_EXAMPLE_STEPS) {
    report(
      findings,
      file,
      `${prefix} worked_examples[${index}].steps runs ${steps.length} steps (ceiling is ${MAX_EXAMPLE_STEPS}); section 2 walks ONE instance, so past that the slide is either holding two ideas or splitting one move across several cards`,
    );
  }
  for (const [step_index, step] of steps.entries()) {
    if (typeof step !== "string" || step.trim() === "") {
      report(
        findings,
        file,
        `${prefix} worked_examples[${index}].steps[${step_index}] must be a non-empty string`,
      );
      continue;
    }
    if (containsEmDash(step)) {
      report(
        findings,
        file,
        `${prefix} em-dash (U+2014) in worked_examples[${index}].steps[${step_index}]`,
      );
    }
    for (const { phrase, pattern } of META_COMMENTARY_RULES) {
      if (pattern.test(step)) {
        report(
          findings,
          file,
          `${prefix} meta-commentary in worked_examples[${index}].steps[${step_index}]: "${phrase}". Work the instance; do not narrate the slide the instance is on`,
        );
      }
    }
  }
}

/**
 * The PROMPT above the steps: the instance, named before it is worked.
 *
 * Required on every authored entry, and that is the point of the field rather than a
 * strictness setting. Section 2's whole job is to be a solved instance, and an instance the
 * learner cannot see is a set of moves they have to run backwards to recover the question
 * from. So a missing prompt is an error and not a warning: the card renders perfectly without
 * one, which is exactly why nothing else would ever catch it.
 *
 * Held to the same em-dash and meta-commentary rules as the steps, for the reason those rules
 * are per-field everywhere else in this file: a surface exempted from them becomes where the
 * banned prose goes.
 */
function validateExamplePrompt(file, findings, prefix, prompt, index) {
  if (typeof prompt !== "string" || prompt.trim() === "") {
    report(
      findings,
      file,
      `${prefix} worked_examples[${index}].prompt is missing or empty. Name the instance the steps are about to work ("Simplify $\\dfrac{6}{14}$."), so the card is a solved question rather than a set of moves with no question above them`,
    );
    return;
  }
  const sentences = splitSentences(prompt);
  if (sentences.length > MAX_PROMPT_SENTENCES) {
    report(
      findings,
      file,
      `${prefix} worked_examples[${index}].prompt runs ${sentences.length} sentences (ceiling is ${MAX_PROMPT_SENTENCES}); it says WHICH instance is about to be worked and nothing more. Anything explaining the idea belongs in mini_lesson[${index}], and anything working it belongs in the steps`,
    );
  }
  if (containsEmDash(prompt)) {
    report(
      findings,
      file,
      `${prefix} em-dash (U+2014) in worked_examples[${index}].prompt`,
    );
  }
  for (const { phrase, pattern } of META_COMMENTARY_RULES) {
    if (pattern.test(prompt)) {
      report(
        findings,
        file,
        `${prefix} meta-commentary in worked_examples[${index}].prompt: "${phrase}". State the instance; do not narrate the card it sits on`,
      );
    }
  }
}

/**
 * Rule 13's other half: on a MIGRATED pack, section 1 is a conceptual lecture and is held to
 * `MIGRATED_LECTURE_CEILING` rather than to `MAX_SENTENCES`.
 *
 * The global rule still runs over the same paragraph, and that is not a duplicate: 7 remains
 * the ceiling for the 32 packs that have nowhere else to put their arithmetic, and this is the
 * tighter budget the three-section split pays for. Only the tighter one can fire on a migrated
 * pack, since anything over 7 is over 4 as well, so the finding a reader gets is the one that
 * names the structure they are actually authoring against.
 */
function validateMigratedLecture(file, findings, prefix, paragraph, index) {
  if (typeof paragraph !== "string") {
    return;
  }
  const sentences = splitSentences(paragraph);
  if (sentences.length > MIGRATED_LECTURE_CEILING) {
    report(
      findings,
      file,
      `${prefix} mini_lesson[${index}] runs ${sentences.length} sentences on a pack that declares worked_examples, where the migrated ceiling is ${MIGRATED_LECTURE_CEILING} (target ${MIGRATED_LECTURE_TARGET}). Section 1 is the conceptual lecture and section 2 is where an instance gets worked, so a bubble this long is holding arithmetic that now has a card of its own. Move the worked moves into worked_examples[${index}] and leave the hook plus the idea`,
    );
    return;
  }
  if (sentences.length > MIGRATED_LECTURE_TARGET) {
    report(
      findings,
      file,
      `${prefix} mini_lesson[${index}] runs ${sentences.length} sentences where the migrated target is ${MIGRATED_LECTURE_TARGET} (2 to 3, hook included). A fourth sentence is allowed where it is genuinely unavoidable, which is why this shortlists rather than fails: say in review why this slide needed it, or cut it`,
      "warning",
    );
  }
}

function validateParagraphProse(file, findings, prefix, paragraph, index, subtitle) {
  if (typeof paragraph !== "string") return;

  const sentences = splitSentences(paragraph);
  if (sentences.length > MAX_SENTENCES) {
    report(
      findings,
      file,
      `${prefix} mini_lesson[${index}] runs ${sentences.length} sentences with nothing breaking it up (ceiling is ${MAX_SENTENCES}); split it into another slide, one idea each`,
    );
  }

  const prose = stripMarkdown(stripMath(paragraph));
  for (const { phrase, pattern } of META_COMMENTARY_RULES) {
    if (pattern.test(prose)) {
      report(
        findings,
        file,
        `${prefix} meta-commentary in mini_lesson[${index}]: "${phrase}". Teach the mathematics; do not narrate the lesson or tell the learner how to read the slide`,
      );
    }
  }

  for (const aside of commaAsides(paragraph)) {
    report(
      findings,
      file,
      `${prefix} comma-fenced aside in mini_lesson[${index}]: ", ${aside.phrase},". Put it in parentheses so the commas are left doing one job, or absorb it into the sentence if it is load-bearing rather than skippable${aside.note}`,
      "warning",
    );
  }

  const task = sentences.find((s) => TASK_STATEMENT.test(s));
  if (task) {
    report(
      findings,
      file,
      `${prefix} task statement in mini_lesson[${index}] prose: "${task}". Fold it into the widget so the learner reads the task once, where the work happens`,
      "warning",
    );
  } else {
    const mechanics = sentences.find((s) => WIDGET_MECHANICS.test(s));
    if (mechanics) {
      report(
        findings,
        file,
        `${prefix} widget mechanics described in mini_lesson[${index}] prose: "${mechanics}". The widget's own status line owns how to operate it`,
        "warning",
      );
    }
  }

  const pointing = bareDemonstrativeOpener(paragraph);
  if (pointing) {
    const heading =
      typeof subtitle === "string" && subtitle.trim() !== ""
        ? `"${subtitle.trim()}"`
        : "(none)";
    report(
      findings,
      file,
      `${prefix} mini_lesson[${index}] OPENS on a bare "${pointing.opener}": "${pointing.opening}". Nothing inside this entry comes before that word, so whatever it points at is on the previous slide and a learner arriving at this heading has no antecedent for it (R15). Name the thing rather than pointing at it, so the slide stands on its own. The subtitle above it is ${heading}, which only supplies one if it names the referent rather than the topic. This rule SHORTLISTS: if the referent is on screen in this slide's own widget, or the subtitle does name it, this is the false positive it is documented to have`,
      "warning",
    );
  }
}

/**
 * Every string in a pack that a learner reads, each with a field path for the finding.
 *
 * Enumerated by NAME rather than walked generically, so a new field is a deliberate
 * addition here and an unreached field is visible as an omission rather than as coverage.
 */
function learnerVisibleStrings(pack) {
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
  if (Array.isArray(pack.slide_subtitles)) {
    for (let i = 0; i < pack.slide_subtitles.length; i += 1) {
      push(`slide_subtitles[${i}]`, pack.slide_subtitles[i]);
    }
  }
  // Section 2's prompt and steps (R34). A learner reads these on the way from the lecture to
  // the widget, so R18 and R20 apply to them exactly as they do to the bubble above them.
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
    if (Array.isArray(cfu.accepted)) {
      for (let i = 0; i < cfu.accepted.length; i += 1) {
        push(`cfu.accepted[${i}]`, cfu.accepted[i]);
      }
    }
  }
  return out;
}

/**
 * R18: an internal node id is never learner-visible. R20: the word is "variable".
 *
 * Markdown emphasis is stripped before matching, on the banned-list principle that a rule
 * which can be evaded by bolding one character inside the token is not a rule. Math is NOT
 * stripped: `$\text{RAD.1}$` shows the learner the same identifier that bare prose would.
 */
function validateLearnerVocabulary(file, findings, prefix, where, value, nodeIds) {
  const prose = stripMarkdown(value);

  if (nodeIds.size > 0) {
    for (const id of nodeIds) {
      if (!prose.includes(id)) continue;
      report(
        findings,
        file,
        `${prefix} internal node id "${id}" in ${where}: "${value.trim()}". A learner has never seen a node id and cannot look one up. Name the lesson, name its building, or describe the skill ("back when you pinned down what a square root undoes")`,
      );
    }
  }

  if (LETTER_FOR_VARIABLE.test(prose)) {
    report(
      findings,
      file,
      `${prefix} "letter" in ${where}: "${value.trim()}". A symbol standing for an unknown is a VARIABLE; "letter" names its typography and says nothing about its job. If the slide genuinely is about the letters labelling a figure's corners, this warning is the false positive it is documented to have`,
      "warning",
    );
  }
}

/** Variety across the whole era chapter, at the level Gabe asked for it to be counted. */
function validateDomainVariety(dirLabel, packs, findings) {
  const ids = packs.flatMap((p) => p.visuals.map((v) => v?.id).filter(Boolean));
  const kinds = ids.map(interactionKind).filter(Boolean);
  if (kinds.length === 0) return;

  const counts = new Map();
  for (const kind of kinds) {
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const spread = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (counts.size < MIN_DOMAIN_KINDS) {
    report(
      findings,
      dirLabel,
      `domain uses only ${counts.size} distinct interaction kinds across ${kinds.length} widgets (${spread.map(([k, n]) => `${k}:${n}`).join(", ")}); the floor is ${MIN_DOMAIN_KINDS}, and reusing one archetype in slightly different ways does not count as variety`,
    );
  }

  const [topKind, topCount] = spread[0];
  if (topCount / kinds.length >= MAX_DOMAIN_KIND_SHARE) {
    report(
      findings,
      dirLabel,
      `interaction kind "${topKind}" is ${Math.round((topCount / kinds.length) * 100)}% of this domain's ${kinds.length} widgets (ceiling is ${Math.round(MAX_DOMAIN_KIND_SHARE * 100)}%); mix in other kinds`,
    );
  }
}

/* --------------------------------------------------------------------------- driver */

/** Resolve argv into a flat list of *.json file paths (skip README, non-json). */
function collectFiles(args) {
  const files = [];
  const dirs = [];
  for (const arg of args) {
    let info;
    try {
      info = statSync(arg);
    } catch {
      console.error(`Cannot access path: ${arg}`);
      process.exit(2);
    }
    if (info.isDirectory()) {
      dirs.push(arg);
      for (const name of readdirSync(arg)) {
        if (name.toLowerCase().endsWith(".json")) files.push(join(arg, name));
      }
    } else if (arg.toLowerCase().endsWith(".json")) {
      files.push(arg);
    }
  }
  return { files, dirs };
}

function main() {
  const argv = process.argv.slice(2);
  const strict = argv.includes("--strict");
  const args = argv.filter((a) => a !== "--strict");
  if (args.length === 0) {
    console.error(
      "Usage: node validate-lesson-pack.mjs [--strict] <domain-dir | pack.json ...>",
    );
    process.exit(2);
  }

  const { files, dirs } = collectFiles(args);
  if (files.length === 0) {
    console.error("No .json lesson packs found in the given path(s).");
    process.exit(2);
  }

  const findings = [];

  selfCheckGuessDetector(findings);
  selfCheckRegistryParser(findings);
  selfCheckWorkedExamples(findings);
  assertMigratedPopulation(findings, dirname(files[0]));

  const captions = readCaptionRegistry(findings, dirname(files[0]));

  const nodeIds = readNodeIdRegistry(findings, findSkillGraph(dirname(files[0])));

  const packs = [];
  for (const file of files) {
    const parsed = validatePack(file, findings, captions, nodeIds);
    if (parsed) packs.push(parsed);
  }

  // Variety is a property of the era chapter, so only a whole-directory run can judge it.
  if (dirs.length === 1 && packs.length > 1) {
    validateDomainVariety(dirs[0], packs, findings);
  }

  const errors = findings.filter((f) => f.tier === "error");
  const warnings = findings.filter((f) => f.tier === "warning");

  for (const w of warnings) {
    console.error(`  warning: ${w.file}: ${w.message}`);
  }

  const failing = strict ? findings.length : errors.length;
  if (failing === 0) {
    const suffix =
      warnings.length > 0
        ? ` (${warnings.length} warning(s), not failing without --strict)`
        : "";
    console.log(`OK: ${files.length} lesson pack(s) passed validation.${suffix}`);
    process.exit(0);
  }

  console.error(`FAIL: ${errors.length} error(s) across ${files.length} pack(s):`);
  for (const f of errors) {
    console.error(`  - ${f.file}: ${f.message}`);
  }
  if (strict && warnings.length > 0) {
    console.error(
      `plus ${warnings.length} warning(s), failing because --strict was passed.`,
    );
  }
  process.exit(1);
}

main();
