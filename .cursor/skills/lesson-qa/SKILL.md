---
name: lesson-qa
description: >-
  Reviews an ALREADY-AUTHORED calc-readiness era of lessons and reports what is wrong
  with it. Pins a SHA, reconciles the prior round's findings into a STILL BROKEN /
  FIXED / NO LONGER APPLICABLE table before reporting anything new, runs the `author`
  skill's validator plus the rendering-artifact sweep, then verifies EMPIRICALLY
  (render and grep, grade every answer key through the real checker, sweep every
  generator from the RENDERED prompt, revert a claimed fix and confirm the test
  fails),   and reports P0 / P1 / P2 findings with file:line evidence and the wrong
  conclusion a learner would draw. Use when asked to QA, review, audit, critique or
  find defects in existing lessons (an era, or the lesson directory of one domain), to
  re-check after a fix round, or to judge whether a lesson pack is shippable. This is
  the REVIEW counterpart to the `author` skill: `author` owns the bar (R1..R34) and how
  to write a lesson, this owns how to find what is wrong with one that already exists.
disable-model-invocation: true
---

# QA an era of lessons

`author` says how to write a lesson. This says how to find what is wrong with one that
exists. The unit of review is the ERA, matching `author`'s unit of delivery, and the
reasoning is unchanged from when that unit was the domain: **review a coherent whole, not
scattered nodes**, because the defects worth the most are the ones only visible across a
chapter (a term introduced twice, a motif that drifts, a subtitle set that reads as a
formula) and none of them can be seen one node at a time.

**An era is a grouping over NODES, so the review crosses directories.** Take the node set
from `getEraNodes(eraId)` in `packages/skill-graph/src/eras.ts`, then map it through
`skill_graph.json`'s `domain` field to the `content/lessons/<domain>/` directories it
lands in: there is no era directory, and an era can reach into four of them. Every
per-directory command below is run once per entry on that list. `author`'s "Which era am I
authoring?" carries the rest. **As of 2026-07-31 no era is jointly owned: all content is
Anthony's** (`docs/Content_Authoring_Split.md` §11), so the split-lane caveat this paragraph
used to carry is gone — every node you review has the same owner, and no finding needs
routing to a second one. **What survives is the distinction between a finding and a fix**:
unless you are the owner or acting on his instruction, a finding is still a report rather
than an edit you make.

**The bar lives in `author`, not here.** `.cursor/skills/author/SKILL.md` states the
teaching-quality rules as **R1..R34** and the locked structural defaults. Read that
section before reviewing. This skill never restates a rule; it cites it by number, and
spends its length on the three things `author` does not cover: the PROCESS that makes a
report worth reading, the VERIFICATION that separates a real defect from an opinion, and
the READING PASS for the rules whose review half is a reviewer's job rather than an
author's.

**Three-section slides (R34) and what a QA pass applies.** A slide is walked in three
sections: section 1 is a short conceptual lecture (`mini_lesson[i]`), section 2 is an
optional read-only worked example (`worked_examples[i]`, a `{ prompt, steps }` object that
names its instance above the moves — see `author/reference.md` §1), and section 3 is the
gated interactive visual (`visuals` with `after === i`). The player advances 1→2→3 within a
slide and validator rule 13 checks the field, so **migration is per PACK**: apply the R34
reading pass to a pack that DECLARES `worked_examples`, and judge one that does not on R1,
R9 and the rest against its combined bubble, since the legacy model stays valid. **Migration
is now COMPLETE, and no pack sits in that second branch: all 62 packs across all ten domains
declare `worked_examples`**, over 264 slides, 251 of them carrying an authored entry and 13
`null` (measured at `ff465269`). So R34 is owed on every pack and N/A is no longer available
at PACK level; the only skip left is the per-slide `null`, which is a judgement to be argued
below rather than an exemption.

**Count the field rather than trusting that sentence, because a carve-out here has now gone
stale three times.** D3 sat in an N/A list while all five of its packs already declared the
field, so its first R34 pass came a round late. D4, D6 and D9 were then named in the sentence
written to replace it, after D6 and D9 had fully migrated, which cost D6 the same round. D6
round 1 corrected that to *"59 of 62, the three holdouts all in D4"* — and
#729 migrated exactly those three
packs the following day, so **the correction was stale within a day of being written**.

**The recurring defect is the carve-out naming domains, not the domains it happened to
name.** It is structural rather than careless: a domain never leaves the list by itself,
because the author migrating a pack has no reason to come here and edit a skill. So run the
command — **its output is the answer, and any number in this file, including the one above,
is a reading at a SHA:**

```bash
node -e "const fs=require('fs'),p=require('path');const b='content/lessons';for(const d of fs.readdirSync(b)){const f=fs.readdirSync(p.join(b,d)).filter(x=>x.endsWith('.json'));const w=f.filter(x=>Array.isArray(JSON.parse(fs.readFileSync(p.join(b,d,x),'utf8')).worked_examples));console.log(d,w.length+'/'+f.length)}"
```

`n/n` on every line means R34 is owed everywhere and N/A nowhere; any line short of its total
names the packs to judge on the legacy model instead. Where a pack is migrated, section 2's
`prompt` is part of the read: it must name
the instance the steps work, in at most 2 sentences, rather than restate the slide.

**What you may CLAIM is governed by `.cursor/rules/qa-verification.mdc`**, which is
always applied and which points back here for the methodology. Read the two together and
do not restate either in the other: that rule owns the evidence a claim owes (a deletion
is proved by a grep, a new behaviour by a test that fails without the change, a bug fix by
a reproduction written FIRST, a rewrite by a human reading it against the objection; a
finding expires when the tree moves; report item by item and never on a summary alone), and
it owns how a guard you write scopes its population and how a legitimate exception to one is
declared. This file owns how to produce that evidence for a lesson pack.

**On theming, the world is one city advancing through ten eras, not ten islands.**
`docs/superpowers/specs/2026-07-27-era-progression-design.md` (#177, merged 2026-07-28)
retired the island model, and `packages/skill-graph/src/eras.ts` (#180, same day) is the
authored era membership. A pack whose prose still frames its domain as a separate place the
learner visits and leaves is stale rather than wrong, and it is a P2 unless the framing has
reached something a learner reads as a claim.

**One thing is NOT settled, so do not report it as an authoring defect:**
- **No landed document names any era's buildings.** The per-era style guides carry
  DRESSINGS (prose descriptions of art), and per **D-ERA29** a learner-facing name is
  `"{stable}, {subtitle}"` where only era one's subtitle row is ratified
  (`apps/web/src/city/eraDressing.ts`). The eight briefs that carried building geometry
  were on PR #140, **closed unmerged on 2026-07-28**. There is nothing to have got wrong.

**How a split domain is themed IS now settled, and it creates one known defect.** Team
lead, 2026-07-29, verbatim: ***"if it's in medeival, it gets medieval themeing."*** A node
takes its ERA's theming, not its domain's. THREE domains span eras (`getEraOfNode` over
their nodes shows it): Polynomials, Functions & Coordinate Geometry, and **Rational
Expressions**, which PR #210 split by moving `RAT.5` into Early Modern while
`RAT.1`-`RAT.4` and `RAT.6` stay Medieval.

- **`RAT.5` is therefore themed to the wrong era**, and it is authored
  (`content/lessons/d5/RAT.5.json`). This is a **known, filed, owner-assigned** item, not a
  finding for you to raise again: it is Anthony's content and it is tracked in
  `docs/Evan_Design_Decisions_Consolidated.md`. **Do not report it, and do not fix it.**
- Do not report the other five D5 packs as defective for reading as one Medieval chapter.
  Medieval is exactly where they belong.
- Where an unauthored split domain is concerned there is nothing to find yet.

`author`'s "Which era am I authoring?" carries the full picture with the measured counts.
**Ownership is no longer per era or per domain: `docs/Content_Authoring_Split.md` §11
(2026-07-31) gives all content to Anthony**, so §9's per-era ownership reading and §9.3's
two jointly held eras are history there. The `RAT.5` item above is unaffected — it is still
his, still filed, still not yours to raise or fix.

Deep references (read on demand, one level deep):
- `reference.md` : which R-rules the validator can and cannot see, the four verification
  techniques with their commands, the frozen-content procedure, the widget contract facts
  a reviewer needs, and a key-file index.
- `examples.md` : a filled-in report, plus weak-versus-strong write-ups of the same
  finding.

## The process

Each step exists because skipping it produced a bad report. Copy this and track it.

```
Era <name> QA round <n>:
- [ ] 0  Take the node set from getEraNodes, map it to its directories
- [ ] 1  Pin the SHA and state it
- [ ] 2  Reconcile the PRIOR round before reporting anything new
- [ ] 3  Run the mechanical checks first
- [ ] 4  Verify empirically, never from reading alone
- [ ] 4b If the packs under review follow the three-section model, run the R34 reading pass; otherwise skip (R34 is N/A on legacy shipped packs)
- [ ] 5  Prioritize by what a learner experiences
- [ ] 6  Write findings with file:line evidence and the quoted text
- [ ] 7  State what was checked and found clean
```

### 0. Take the node set from the data, and map it to directories

```bash
# The scope. Never a typed-out list: membership is authored data and it moves.
node -e 'import("./packages/skill-graph/src/eras.ts")' # or read ERA_SEQUENCE directly
```

Write down the era's nodes and, beside each, the `content/lessons/<domain>/` directory it
lives in. That map is what every per-directory command below is run against, and it is what
the coverage statement in step 7 is written from. A review that silently covered one
directory of a three-directory era has reported a clean era it never read.

### 1. Pin the SHA and state it

`integration` moves several times an hour. A finding with no anchor cannot be
reproduced, and a reviewer who read a different tree than the author is arguing about
nothing.

```bash
git fetch origin
git rev-parse --short origin/integration
```

Put that SHA in the report's first line, with the era and the round number. Re-pin
only deliberately, and say so: a mid-review re-pin invalidates every finding already
written against the old tree.

### 2. Reconcile the PRIOR round before reporting anything new

A round that re-reports what the last round already closed spends a whole review cycle
and the reviewer's credibility on nothing. Before writing one new finding: find the
previous round's report (the work log, the PR body, the prior chat), and check every
item against the pinned SHA.

Open the report with this table, and nothing above it:

```markdown
## Round <n-1> reconciliation, at <sha>

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | `<node>` caption restates the widget prompt | FIXED | caption removed from `visuals.tsx`; the run prints the parsed-and-empty note with the pinned count satisfied, so R8 ran over the reviewed population |
| 2 | `<widget-id>` reset replays the same numbers | STILL BROKEN | `<Widget>.tsx:<line>` still passes a one-entry pool to `useWidgetVariants` |
| 3 | `<widget-id>` has no reveal | NO LONGER APPLICABLE | widget deleted, replaced by `<new-widget-id>` |
```

An anchored version of this table, with real references, is in `examples.md`.

Three statuses only. FIXED needs the evidence that it is fixed, not the claim.
NO LONGER APPLICABLE is for a finding whose subject no longer exists; it is not a
synonym for "I could not reproduce it", which is STILL BROKEN until proven otherwise.

**A report is only useful if its contents are new.** If reconciliation closes
everything and the new sweep finds nothing, the report is the table plus "no new
findings", and that is a good outcome, not a failed review.

### 3. Run the mechanical checks first

Spend human judgement only on what a machine provably cannot check.

**Once per DIRECTORY on your step-0 map**, never once for the era and never over a file
list:

```bash
# The author skill's bar. --strict is mandatory: a reviewed pack has no excuse for a
# warning. Run the DIRECTORY, never a file list, or the domain-level variety rules do
# not run at all.
node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/<domain>

# The rendering-artifact sweep (this skill's script; see "Scripts" below). THREE paths,
# the middle one a DIRECTORY: the file list this used to carry was found short four times
# running, so the shared surface is now named by its tree rather than file by file.
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/<domain> apps/web/src/lessons packages/item-bank/src/<domain>
```

**The baseline is zero and has been since #201: errors and warnings are `0` on all four
shipped domains and `--strict` exits `0` on every one of them.** Measure it at your own SHA
rather than trusting that sentence, but know what it buys you, because it changed what a
run means: there is no longer any inherited noise for a new finding to hide inside, so a
single warning is a real finding and not a line to scroll past. `scripts/check-lesson-packs.sh`
used to carry a comment saying `--strict` would fail three of four domains; that went stale
the day #201 landed and now argues from the tier's design instead of from a count.

Six things about that first command a green exit code will not tell you:
- **The variety figures are the DIRECTORY's, not your era's.** They pool every pack in the
  directory, including nodes belonging to other eras, so a green R11 run is not the R11
  tally. Take that one across the era by hand.
- **R8 is DORMANT, not passing, and the note says which.** #179 removed every widget
  caption (63 to 0), so the rule is gated on a population that is empty by design. #193
  made the three states distinguishable, so read which one you got: *"visuals.tsx parsed
  ... 96 registry entries, 0 of them captioned ... the INTENDED END STATE"* is the live
  one and means R8 had nothing to check; *"was NOT FOUND from here"* and *"was found but
  COULD NOT BE READ"* are the two fail-open tooling states. The emptiness is now asserted
  rather than noted (`EXPECTED_REGISTRY_CAPTIONS` pins 0 and `MIN_REGISTRY_ENTRIES` floors
  the parse at 80), so a caption appearing is an error rather than a silent change, and a
  drifted parse fails instead of reporting nothing. The rule reactivates on the first
  caption anyone adds.
- If it prints `note: skill_graph.json not readable from here`, the **R18 node-id rule
  was skipped**. That one still fails OPEN in the old way. Read the line, every run.
- **R8 catches repetition, not paraphrase.** A caption saying the same thing in different
  words scores under the rule's overlap threshold and passes.
- **R19's aside findings are a SHORTLIST, not a verdict.** The rule matches the shape and
  cannot make either call that matters: whether the aside belongs in parentheses, or
  whether it is load-bearing and belongs absorbed into the sentence instead. Parentheses
  tell the reader a span is skippable, so bracketing something they need to follow the
  next line is the wrong fix and the rule cannot tell you so.
- **R2, R3, R5, R6 and R7 have no validator rule at all**, and neither do R21 to R34.
  `author`'s SKILL.md records the measurements that rejected each candidate proxy for the
  first five: one had zero recall on the real defect, another fired on content that had
  already been praised. R21 to R23, R32 to R34 are judgements about meaning (R34 is the
  exception with a mechanical half: rule 13 checks `worked_examples`'s shape, its prompt and
  its step count, while every judgement about what they SAY is a read), and R24 to
  R31 live in widget TSX, which this script does not parse. Do not re-litigate any of them
  and do not propose a proxy. Check them by READING and by running the browser guards
  named in `author`.

`reference.md` has the full R1..R34 to enforcement map.

### 4. Verify empirically, never from reading alone

This is the difference between the rounds that found real bugs and the rounds that
produced opinions. Four techniques, each of which caught something real. Commands and
detail in `reference.md`.

1. **Render, then grep.** Render every slide, prompt, hint and worked solution and
   search the OUTPUT for artifacts. A half-converted widget is invisible in source and
   obvious in the DOM.
2. **Grade every answer key through the REAL checker**, plus the plausible alternate
   spellings a learner will type (case variants, `sqrt(2)` against `\sqrt{2}`, an
   unreduced fraction, a bare base). Never assume a key is gradable because it looks
   right. An ungradable correct answer is a P0.
3. **Sweep every generator's parameter space, re-deriving the expected answer from the
   RENDERED PROMPT TEXT**, not from `template_params`. Deriving from the params re-uses
   the same numbers the key came from, so it agrees with the key by construction and
   passes over the exact defect it should catch: a reworded prompt that no longer asks
   for its own answer. The repo's own `validateTemplates` checks a key against its spec
   and says so in a comment; prompt-versus-key is nobody's job but the reviewer's.
4. **Break it and watch the named red.** If you claim a fix works, prove the test can fail
   without it; if you ADD an assertion, prove the same thing, because a test written green
   may be asserting nothing. Prefer injecting the defect at the changed lines over
   reverting the whole file: a revert can take the fixture down with the fix, so the red you
   get names a missing locator instead of the property. Quote the failure message, not the
   count. This has caught two tests that passed against the reverted fix and six sweeps that
   were asserting less than they claimed; see the traps below.

### 5. Prioritize by what a learner experiences

| Priority | Means |
|---|---|
| **P0** | Wrong mathematics, a correct answer graded wrong, or a dead end |
| **P1** | The teaching fails: the rule is asserted, the term is undefined, the reveal does not teach |
| **P2** | Everything else |

**Do not pad.** A short list of real problems is worth more than a long list containing
nits, because what a review spends is the reviewer's credibility and it does not come
back. If an item would not change what anyone does, leave it out.

### 6. Write findings with file:line evidence and the quoted text

Every finding carries: the file and line, the offending text quoted verbatim, and
**what a learner would wrongly conclude**. "This line is bad" is not a finding. Name the
R-rule where one applies, so the author can look up the standard rather than argue about
taste. Contrasting write-ups in `examples.md`.

### 7. State what was checked and found clean

Close with the coverage: which nodes of the era, which directories, which surfaces, which
sweeps, how many cases each sweep actually measured. Without it the reader cannot tell a
real pass from a spot check, and a clean area with no coverage statement gets re-reviewed
next round. *(This used to add: on a jointly owned era, say which nodes were reviewed but
are not the author's to fix. **No era is jointly owned as of 2026-07-31** — all content is
Anthony's — so every node you review has one owner and the coverage statement needs no
split. What still belongs in it is the distinction between what you REPORTED and what you
FIXED.)*

**Every number in the report is a MEASUREMENT you took at the pinned SHA, and it is written
as one.** Do not carry a figure over from a brief, a previous round or a work log: several
circulated all day on 2026-07-28 that had expired, in both directions. The validator's
warning baseline was quoted as `23 / 0 / 25 / 17` by four separate rounds after #201 had
cleared it to zero; a reveal pin was quoted at 30 after #205 moved it to 31; a line number
for a quoted string had drifted by six. None of those was wrong when it was written, which
is the point: a measurement is evidence about a tree, it expires exactly the way a finding
does, and re-taking it costs one command. If you cannot re-measure something you want to
cite, say so and cite it as a previous reading with its SHA attached.

## The reading pass: the review halves of R13 to R16

Four rules split cleanly into an authoring half and a review half. `author` states the
rule; what follows is how a REVIEWER finds a violation, which is a different job needing
different tools. (These moved here when `lesson-qa` landed as #130 on 2026-07-27, from a
section in `author` that had been holding them because this skill did not yet exist.)
Nothing here restates a rule: read R13 to R16 in `author` first.

**R13, the two hint leaks that read as innocent.** Neither is visible in one instance,
which is exactly why they shipped. **Generate several instances of the template and put
the hints side by side.**

- *Asserting a property of the learner's own instance.* Read each hint against the values
  it arrived with, and ask whether the sentence would still be true on a different draw.
  A hint that says the bottom number IS a perfect square has done the diagnosis; a hint
  that says to check each half against the perfect squares you know has not.
- *Branching the hint text on the answer.* Sample until you have seen both branches, then
  compare which hint arrived with which key. The leak is not in either wording, it is in
  the CORRESPONDENCE: if only the zero case sends the learner to look up the
  zero-exponent rule, then being sent there announces the answer. Each branch reads
  innocently on its own, so reading one instance can never find this.
- The mechanical half is already done and is not yours: `hint_leaks_answer` in
  `packages/item-bank/src/validate.ts` catches a hint containing the answer key.
  `author` records why the branch-on-the-answer half could not join it.

**R14, whether they are the RIGHT words, and whether the form is right.** The validator
counts the words; only a reader can judge them. Three tests, applied per slide:

- **Could the subtitle be mistaken for the slide's conclusion?** If so it is too long,
  and that is also why a claim is wrong rather than merely wordy.
- **On a discovery slide, does it pre-empt the discovery?** A claim states the very thing
  the learner is meant to notice, so it hands the answer over before they look. The
  halving-ladder slide is *"Negative exponents"*, never *"A negative exponent is a
  reciprocal"*.
- **Is a question the natural thing to say at that point, or is it a statement wearing a
  question mark?** A normal title is the default. The question form earns its place three
  ways and no others: the slide opens a case the previous slide's rule does not obviously
  cover (*"What about unlike roots?"*), it poses a real either/or it then resolves
  (*"Multiply or divide?"*), or its whole job is the noticing and a statement would
  pre-empt it (*"What happens at zero?"*). Read the WHOLE pack's headings in sequence, not
  one at a time: this defect is invisible per slide and obvious as a list, which is how D2
  reached 23 questions in 31 subtitles with each one defensible on its own. Two tells,
  both cheap. A question about a term the slide has not introduced yet asks something the
  learner cannot be holding, so it was manufactured rather than natural. And a repeated
  opening formula is a formula: five *"What about ...?"* in one domain is one question and
  four fillings-in.

**R15, the shortlisting tell for cold openings.** **An opening sentence introducing a term
behind a definite or generic article that the pack has never defined.** It earned its
place by finding the second real instance of the defect, three slides from the first
("A finished answer never leaves a root sitting on the bottom of a fraction"). Use it to
build a shortlist and then read each candidate: plenty of good openings use "the", so a
hit is a slide to read, never a finding to file.

**Know what this tell cannot see, because it has already cost a recurrence.** It keys on an
ARTICLE, so an opening that points with a bare demonstrative instead slips straight through
it: RAD.1's *"That matters because a root splits across a product"* survived a pass driven by
this tell, and the report came back from the user. **That shape is now the validator's**, at
the warning tier, so do not spend the reading pass on it: run the script and read what it
lists. Everything the script lists is still a slide to READ rather than a finding, and its
documented false positive is a referent that is genuinely on screen in the widget or named by
the subtitle above. What the tell above is still for is the article case and the
question-before-claim half, neither of which is gated.

**R16, the leading-hinge sweep.** Walk consecutive sentence PAIRS, not slides, looking for
the two halves of one idea (a rule and its inverse, multiplication and division, adding
and subtracting). For each pair, ask whether the connective LEADS the second sentence or
sits buried inside it. Both wordings contain the hinge, so this cannot be grepped: the
defect is position. Two further things to check while you are there, because both are
ways the fix goes wrong: whether five slides now open on the same connective, which is
its own defect, and whether someone has "fixed" it by splitting the slide, which
discards the symmetry that made the second half memorable.

## Reading the rules that have no mechanical half at all

R21, R22, R23, R32, R33 and R34 are review-only by construction, and each has a procedure worth
doing deliberately rather than by feel.

- **R34, three-section slides.** Every pack owes this pass: all ten domains are migrated, so
  the pack-level N/A this entry used to offer no longer applies to anything. Run the census
  command above rather than trusting that — a carve-out here has already misled three
  rounds. When the pack under review follows the three-section model (`author` R34):
  - **Section 1** (`mini_lesson[i]`): read the lecture and ask whether it is **conceptual**
    only (2-3 sentences including a 1-2 line theme hook, no worked arithmetic, no
    step-by-step instance). A lecture that walks numbers belongs in section 2, not here.
  - **Section 2** (`worked_examples[i]`, when present): read the **prompt** and ask whether
    it names the instance the steps go on to work, in at most 2 sentences, without becoming
    the lecture again or giving the result away. Then read the ordered step list and ask
    whether each step follows from the last, one move per step, last step names the result
    (same bar as `practice-hints`). When the entry is omitted or `null`, ask whether the skip
    is justified (purely definitional slide, or section 3 alone demonstrates the idea).
  - **Section 3** (`visuals` with `after === i`): read the widget and ask whether the
    learner is asked to **produce** a result, not read one passively. Flag verbatim
    duplication of section 2's instance (same defect class as CFU reuse and R8).
  Do not file R34 findings against legacy one-paragraph slides that mix concept and
  arithmetic in `mini_lesson[i]` — that is the old model, not a violation of R34.

- **R21, label slots.** Read every label in every labelling widget, and every column
  heading in every table widget, since a `FillTable` renders `headings` into
  `<th scope="col">` and the announced name is the visible one. A multi-word phrase built
  around a verb is a paraphrase of a term rather than the term, and the labels in a
  labelling widget ARE the vocabulary the lesson teaches, so a paraphrase there teaches
  the wrong word. Not merely odd prose: a P1.
- **R22, sibling option labels.** Write down, in one sentence, the question the PROMPT
  poses. Then read every sibling label against it. This is the step that cannot be
  skipped, because each label is individually well-formed and the defect is only visible
  as a set: two bins named by their radicand and a third named by what the radicand does
  are three accurate labels answering two different questions.
- **R23, invented vocabulary.** For each technical word the era uses, ask whether it
  exists outside this repo. A coinage is untransferable by construction, whatever else is
  true of it: the learner cannot look it up, cannot meet it again, and cannot use it to
  ask anyone a question.
- **R32, unearned real terms.** The opposite failure to R23, and the reading is different:
  a real term is not deleted, it is glossed or avoided. Build the term list from the ERA's
  prose and count occurrences, because the count is most of the judgement. **A term used
  once and never defined is the strong finding** ("parity", once across five packs), since
  nothing downstream needs it and dropping it costs nothing. A term used several times
  splits: check whether any use is CASUAL while the others are technical, which teaches a
  contradicting sense on first meeting ("real number", three uses, one casual). Then ask
  the two questions that decide gloss-versus-avoid, both of which the author owes an answer
  to: does the widget the slide mounts use the word, and would the gloss lean on a second
  term this node's prerequisites do not cover? A sibling node is not an ancestor.
- **R33, copy after a miss.** Read every sentence a learner meets after getting something
  wrong, at the level it is scoped to. The finding is a set-level verdict that opens on the
  cost or coaches about the attempt that is over. **Scope it before you file it**: a HINT is
  supposed to say "check each half against the perfect squares you know" (R13 endorses that
  exact wording), and a per-part note is supposed to explain its own part (R28 requires it).
  A finding that would also condemn either of those is a finding against the wrong thing.

**R24 to R31 are enforced by Chromium guards rather than by reading, so run them rather
than eyeballing them**, and for three of the eight running them is the only way to see the
defect at all:

| Rule | Guard | Why reading cannot substitute |
|---|---|---|
| R24 task order | `widgetTaskOrder.browser.test.tsx` | asserts DOM ORDER, not presence, because presence is what the overwritten status line already had |
| R25 collapsing row · R26 palette | `binaryRowMarks.browser.test.tsx`, `spotTheErrorPalette.browser.test.tsx` | the marks are computed style; the palette guard now derives its population from the kind's sources |
| R27 reveal badge | `widgetRevealFill.browser.test.tsx` | the badge was generated content, invisible to `value` and `textContent`, so all 17 fill tests passed with it in place |
| R28 per-part feedback · R29 the gate | `widgetRevealResume.browser.test.tsx`, `widgetMissedBoardGate.browser.test.tsx` | both are state machines: the wrong behaviour is a predicate read at a click, not a string |
| R30 placeholder + notation note + preview | `answerFormat.test.ts`, `answerKeypad.test.ts`, `answerPlaceholderFit.browser.test.tsx`, `mathAnswerColumn.browser.test.tsx` | a leak check has to GRADE, not string-compare; a width check has to measure the real field; every notation an item is advertised has to be graded through the real checker on that item; and only Chromium shows the note and the preview actually RENDER, which a prop diff does not |
| R31 false statement from a hiding trick | `labelFigureWhole.browser.test.tsx` | KaTeX paints `\phantom` transparent, so the DOM, the text content and the MathML all still carry the digits and only the PAINT is missing |

What a reviewer still owes on top: whether a widget outside those populations has the same
defect. R29 is the live example and the shape to imitate: the survey found **nothing in the
tree is terminal**, so the question worth asking was the narrower one (which widgets read a
recorded miss in their gate), and the answer was exactly 8 carrying an identical
`complete && !missed`. Two are fixed and six are named in `work-log/gabe/`. That is a
counted follow-up with a ruling attached, not a finding per file.

## Recurring defect classes

Each of these surfaced more than once. Sweep the list; the value is that it exists.

**Instructions and tasks**
- Two instructions for one task (R8). The systemic cause is the registry `caption`
  restating the widget's own status line: 21 of 21 in one domain, one structural bug
  wearing 21 costumes.
- A "Your turn" task statement in the lesson prose instead of in the widget (R9).
- A task statement that arrives AFTER the controls, because it was living in the
  `aria-live` status line, which is the widget's last child and which the first wrong
  move overwrites (R24). Reading top to bottom is the test.
- A task asking for a different KIND of thing from what the controls offer: "tap the
  even part of 7" over four chips that are all powers (R24).
- A widget that replays the worked example printed directly above it (R34, when section 2
  exists; on legacy packs the same shape is an R8 / R9 teaching failure).

**Words**
- An internal node id in learner prose (R18). Caught mechanically now; the judgement
  left over is which replacement each instance wants, and the building-name option is
  the one most likely to decay.
- A comma-fenced aside that should be parentheses, or should be absorbed (R19).
- "Letter" for a variable (R20).
- A label slot holding a gloss instead of a term (R21), including a table column heading.
- Sibling option labels answering two different questions (R22).
- A coined word for a real thing (R23).
- A real term used undefined because it sounded standard, and a term used in two senses in
  one pack (R32).
- A set-level line after a miss that opens on what it cost (R33).

**Gates**
- A gate satisfied by activity rather than by producing a value (a Play button, a timer).
- A gate with no escape, so a stuck learner can only guess (R12).
- A reveal that prints the answer without teaching the step (R12).
- A reset that redraws the same numbers, or leaves the gate already satisfied (R10).
- A binary row that collapses to a text verdict once answered, throwing away the
  comparison that was the teaching (R25).
- Green or red on anything but the learner's own pick, a state carried by colour alone,
  or hue spent binding a label to a slot (R26).
- A finished board still gated because one part was missed on the way (R29). Read the
  gate predicate, not the copy: `complete && !missed` is the shape.
- One verdict, button or reveal covering several independently-correct answers (R28), and
  a word beside a reveal-filled blank saying it was given (R27).

**Assessment**
- An answer key no longer matching its prompt after a prose edit.
- A CFU accepting notation its own practice items reject.
- A CFU reveal showing step cards (`.worked-solution__steps`) instead of a figure
  (`figure.lesson-visual`) on either the authored question or a re-asked variant (#357).
  Read the rendered reveal, not the pack JSON; `cfuHintGate.browser.test.tsx` is the guard.
- L3 easier than L2 for the same node.
- One served practice set repeating an answer across its slots.
- A placeholder advertising a shape the served keys do not have, a form the grader
  rejects, or the answer itself (R30). Enumerate served keys per placeholder and GRADE the
  advertised form; a key of `{4}` is not the string `4`.
- An answer carrying notation with **no notation note and no preview** under the field (R30,
  the half that is not about wording). The note and the live preview are rendered together by
  `MathAnswerColumn` and only when the notation dispatch returns a non-empty row, so an
  answer whose spec reaches no tag loses both silently: `1/32`, `{8/3}` and `log(m*a*q)`
  each sat behind a bare "Your answer" while their placeholders read correctly, because the
  type was read instead of the key. **The population is seven pools — the six registered
  domain pools plus the interactive one, 1,120 served items — and all 31 authored lesson
  packs**, which is `SERVED_ITEMS` plus the pack list in `answerKeypad.test.ts`; derive it
  from there rather than from a domain you happen to be reviewing, because the pool list is
  what D3 and D8 were each missing from while every sweep in that file passed. A `*` is the
  case to be careful with: it is optional on 26 templates (re-graded starless through the
  real checker) and load-bearing on three, so the question is whether the answer grades
  without it, not whether it contains one.

**Rendering**
- A Unicode operator reaching KaTeX, a collapsed radical, a literal `[object Object]`,
  and numeral adjacency where an answer ending in a digit runs into reasoning starting
  with one.
- A hidden operand leaving a well-formed FALSE statement on screen (R31). This one is
  invisible to every text sweep, because KaTeX paints `\phantom` transparent and leaves the
  digits in the DOM, the text content and the MathML: run `labelFigureWhole.browser.test.tsx`
  rather than grepping, and if you file it, file it from the paint.

**Interaction**
- A race in pick-and-place widgets: a handler reading the held selection out of ordinary
  state sees it empty when two interactions land in one frame, so the drop does nothing
  and gives no feedback. It presents as "the interface does not work". The shared fix
  keeps the held item in a ref, readable in the tick it was written
  (`apps/web/src/lessons/interactive/pickup.ts`); a widget doing its own `useState`
  pickup has the bug.

## The traps that produce false confidence

Each of these is a check that PASSED while the defect shipped. This is the section worth
re-reading before signing off.

- **A regression test that passes against the reverted fix.** Twice. Once because a CSS
  assertion depended on stylesheet import order: the rules tie on specificity, so
  whichever sheet is injected last wins, and importing in the wrong order made the surd
  render correctly by accident. Once because an arithmetic guard pooled the diagram rows
  and the caption into one haystack, and the caption already contained the value the
  missing row should have shown. **Always revert and confirm failure.**
- **A guard asserting against a string nobody renders.** A worked-solution test checked
  `item.worked_solution` while the UI renders a registered SVG instead, so the array was
  dead code and the test guarded nothing. Assert against RENDERED output.
- **A sweep counting its own list instead of the tree.** The worst instance of the class,
  because it looks like rigour: `spotTheErrorPalette.browser.test.tsx` swept two visual ids
  and asserted underneath that the two WERE the family (`expect(ERROR_TARGET_VISUALS.length)
  .toBe(2)`). Three more widgets joined that kind; the list did not move, the count did not
  move, and nothing failed, so a guard silently stopped having an opinion about three
  fifths of what it claimed to cover. Six sweeps in this repo carried the same shape and
  were rewritten on 2026-07-28, that one having been false for three widgets already. **The
  fix is to DERIVE the population from source** (glob the widget sources, keep the ones
  rendering the kind, resolve each through the visual registry: `kindFamily.ts`) **and to
  floor it rather than pin it**, so growth needs no edit and shrinkage fails loudly. The
  tell to look for: *an assertion that can only fail in one direction, guarding a claim
  that has since become false.* Deriving is necessary and not sufficient, and
  `qa-verification.mdc` owns the rest: #219's guard derived its population from source and
  floored it, and derived the wrong set, because it asked the layer where the mechanic is
  shared rather than every surface that carries it.
- **A sweep that passes vacuously.** Put a floor on how many cases were measured, and print
  the count, because an empty population is the quietest possible green: with nothing to
  iterate, `test.each` emits no tests at all and the file reports `1 passed`. Containment is
  the same trap one level down, and it recurs constantly: `toContain` over an empty haystack
  or with an empty needle passes on anything, so a containment or subset claim needs a count
  under it before it is evidence.
- **A guard whose INPUT silently became empty, which is worse than no guard**, because the
  suite goes on reporting it as passing. R8's caption rule had had nothing to check since
  #179 removed all 63 captions, and the one line standing in for that said
  *"captions not readable from here"*, a sentence about a missing file, printed while the
  registry was found and 32,234 bytes of it were read. It was byte-identical to the message
  a genuinely absent registry produces, so **the two states nobody could tell apart were
  "found nothing" and "could not look."** Separate them, always, and in three ways if the
  code has three: parsed-and-empty, not-found, found-but-unreadable. Then assert the
  emptiness (a pinned expected count) and floor the parse (`MIN_REGISTRY_ENTRIES`), because
  a pin of zero is satisfied by a parse that has drifted off the shape of the thing it
  reads, which is this same defect one level up.
- **A diff that lies in both directions.** A clean auto-merge here has twice produced
  semantically broken code, and separately a diff has shown twenty functions as deleted
  when they had merely been extracted into a new module. Verify by reading the merged
  RESULT and by structural comparison, never by the diff's framing.
- **Attributing a real failure to a known flake.** The `>=1000 samples` case in
  `packages/item-bank/src/product.test.ts` carries a 60s per-test budget and legitimately
  varies by a wide margin with machine load. Report the measured number. Do not dismiss it
  and do not re-pin the budget to make it quiet.

## Frozen content: never move an item hash

Assessment items are frozen. A QA pass reads them and does not move them.

- Every `.snap` under `packages/item-bank/src/__snapshots__/` must stay byte-identical
  across the review. Prove it with `git hash-object`, before and after.
- **`vitest -u` is never run casually.** Re-pinning is a deliberate, reviewed version
  event, never a way to make a red suite green.
- **A moved hash after a PROSE edit is a finding, not a thing to re-pin.** It means the
  edit reached graded content, which is the defect. Report it.
- The one legitimate exception: prompts are inside the hash, so a DELIBERATE prompt
  rewrite necessarily moves the practice-pool hashes. That needs a scoped, reviewed
  re-pin of exactly those snapshots, called out in the report.

Commands in `reference.md`.

## Gates a QA pass runs

```bash
npm run check          # format:check + lint + typecheck + test:unit + test:browser + check:graph
npm run check:graph    # skill-graph invariants, cheap, run it even on a docs-only change
```

- **The Chromium suite is MANDATORY whenever widgets, CSS or rendering are touched.**
  `npm run test:browser`. Layout, stylesheet cascade and real pointer sequencing do not
  exist in jsdom, and the collapsed-surd defect was invisible to every other suite.
- `npx vitest run --project web-reachability` proves the content is not dead code, and it
  is per-directory like everything else: an era whose second directory has no registry
  entry has half of it unreachable.
- Never run `biome check --write` on a directory. Format-check single files.

## The dev viewer: how a reviewer actually reads a lesson

Add `?dev` to the app URL. It replaces the app with a list of every lesson in every
registered domain, so nothing has to be placed in the city and nothing writes to mastery.
Per lesson:

- **Open options** enters the real `AdvisorLesson` at the options menu (review, practice
  set, infinite practice). This is the learner's gated path.
- **Step slides (N + CFU)** is the review affordance. It renders one slide at a time and
  passes NO `onComplete`, so **the gates are bypassed and any slide is one click away**;
  it names the slide index and the widget id for the bug report; and its last step is the
  pack's CFU, live and graded by the real checker, shown with the accepted-answer list,
  the hint, and which of the two grading paths the pack takes.

That last panel is how you check a CFU key by hand: it is the one place the accepted list
is visible next to the question. Below the lesson list, a Domain practice section opens
the interleaved drill, with a dev bypass for the completion gate.

## Anti-patterns of a QA pass (reject on sight)

- A finding with no SHA, no file:line, or no quoted text.
- Re-reporting an item the previous round closed. Reconcile first.
- Reporting from reading when the claim is checkable by running something.
- A padded list: nits mixed in with real defects, so the reader has to sort them.
- Claiming a fix works without breaking it and watching the named red, or adding an
  assertion without one. A test written green may be asserting nothing.
- Proposing a validator rule for R2, R3, R5, R6 or R7. Those were measured and rejected.
  Same for R32 and R33, where the obvious rule fires on the hint wording R13 endorses.
- Reporting a widget's "Read on." as meta-commentary. Two rounds have now raised it and it
  has been ruled on both times, with rendered frames, so the distinction lives here rather
  than getting made a third time. `META_COMMENTARY` bans an instruction to consume more of
  the SURROUNDING EXPOSITION. An instruction naming the learner's next move ON A BOARD is
  task direction, belongs in the widget under R24, and is outside the list: on a
  `SpotTheError` board the sentence is a per-line response that has REPLACED the standing
  instruction at the moment it appears, so it is the only thing on screen telling the
  learner what to do next. There are 13 across `TrigRosterSpot.tsx`,
  `TrigIdentitySpot.tsx` and `SpotTheError.tsx`'s shared default, so a ban would land on
  every domain's spot boards and delete direction learners need. The counter-case is real
  and the phrase alone cannot settle it: a widget status line pointing the learner back at
  the LESSON PROSE rather than at the board WOULD be meta. Read what the sentence points
  at, not which words it uses.
- Filing an R19 aside shortlist as a finding without deciding, per instance, between
  parentheses and absorbing it into the sentence.
- Running `vitest -u`, or re-pinning a snapshot, to clear a failure.
- Judging a merge from the diff instead of from the merged result.
- Restating the R1..R34 rule text in the report. Cite the number.
- Reporting an unnamed era building as an authoring defect. No landed document names
  one, so there is nothing to have got wrong.
- Quoting a count, a warning baseline, a pinned number or a line number from a brief or an
  earlier round instead of re-measuring it at the pinned SHA.
- Pinning a hardcoded population count in a guard you write. Derive it and floor it.
- Scoping that population to where the behaviour is implemented rather than to every surface
  that exhibits it, or excusing a member by leaving it out instead of declaring it.
  `qa-verification.mdc` owns both, with a worked example.
- Reviewing one directory of an era and reporting on the era.
- A clean verdict with no statement of what was covered.

## Scripts

**`scripts/scan-lesson-text.mjs`** (execute it): the rendering-artifact sweep over a
domain's learner-facing prose. Node built-ins only, no dependencies.

**Three paths, and the middle one is a DIRECTORY.** The banned list reaches widget copy,
worked-solution copy, the shared CFU-variant module, the answer-field copy modules, the
lesson shell and the domain's item-bank source as well as its packs, and it reaches only
the paths the invocation names. Every one of those shared surfaces lives under
`apps/web/src/lessons`, so that tree is named once and the invocation is:

```bash
content/lessons/<domain>   apps/web/src/lessons   packages/item-bank/src/<domain>
```

**This file used to name seven paths, five of them files or subdirectories of that one
tree, and the reason it stopped is the history below rather than a preference for brevity.**
That gap is not theoretical, and it was measured four times, by four rounds, each naming a
surface the round before it did not have:

- Two of D10's ledger entries were written against prose whose surface is
  `packages/item-bank/src/d10`, a directory a pack-plus-widgets invocation never opens, so
  were either sentence to come back there the sweep would report OK — a ledger entry
  certifying its own blind spot (D10 round 1, X-6).
- The same was then true of `apps/web/src/lessons/cfuVariants.ts`, which holds the hints and
  worked solutions for EVERY domain's CFU variants and sits beside the widget directory rather
  than inside it: a banned sentence planted there left the three-path invocation exiting `0`
  (D2 round 1, P1-3).
- And of `apps/web/src/lessons/worked`, which holds the worked-solution and CFU figure copy —
  the reveal a learner reads after being marked wrong — and is neither `interactive` nor an
  item-bank sibling, so no invocation this file documented had ever opened it. Measured at
  `68c5aa9a`: 672 prose-shaped runs across 45 files, none of them ever swept by any round. It
  came back clean, which is why that one is a documentation fix rather than a finding (D4
  round 2).
- And of `apps/web/src/lessons/answerFormat.ts` and `apps/web/src/lessons/unreadableAnswer.ts`,
  which hold every answer-field placeholder, notation note and unreadable-answer message —
  copy a learner reads UNDER the box they are typing into, on all three answer surfaces.
  They sit beside the widget directory rather than inside it, exactly as `cfuVariants.ts`
  does, so no invocation this file documented had ever opened either. Proven live rather
  than argued: the two compose one D6 sentence between them, *"We couldn't read that, so
  nothing was counted. Interval, e.g. (-inf, 5] U (7, inf)"*, whose halves come from
  different files. Measured at this round's tip, the five-path form reports 5582 runs over
  349 files and the seven-path form 5621 over 351, so 39 prose-shaped runs had never been
  swept by any round. Clean, so a documentation fix rather than a finding (D6 round 1, F8).

**THE LENGTH OF THAT LIST WAS THE FINDING, NOT ITS CONTENTS.** Three rounds running found the
list short, twice independently and at the same time, each naming DIFFERENT missing paths:
neither reached the other's, and each was written up as though it had closed the question.
That is evidence about the SHAPE of the list rather than about any one path. A set of
directories named one at a time keeps being short, because nothing about having named five
makes the sixth visible — so the answer is not a sixth entry, it is to stop keeping a list.

**Measured at `3e3b2f54`, on the run that made the change.** The remaining gap had been
inventoried as ten root-level files holding 274 prose-shaped runs, the largest
`workedSolutionVisuals.tsx` at 216 — invisible because the list named the
`apps/web/src/lessons/worked` DIRECTORY and this file is that directory's *sibling*, so the
list read as though worked-solution prose were covered. Sweeping the tree instead of the
inventory turned up **307 runs across 23 files**: the inventory was itself thirteen files
short on the day it was written, which is the argument for the directory made one last time
and by the list rather than about it. The seven-path form read 5621 runs over 351 files; the
three-path form reads **5928 over 422** on the same tree, and reports clean. Rule 6 is the
only rule that applies to a `.ts`/`.tsx` source and it has been measured to report zero
findings on ordinary TypeScript (the scanner's header records the sweep over
`apps/web/src`), so the widening costs no false positives — which is what the old argument
for naming `cfuVariants.ts` as a file, that a directory would reach "112 other files
besides", turned on.

`scripts/check-lesson-packs.sh` is where this is enforced rather than remembered, and it
had fallen three paths behind even the seven: `npm run check:lessons` and CI swept
`interactive` alone, so a green CI run was never evidence that the documented sweep passed.
It now passes the same tree, with **floors on the file and run counts** — a directory cannot
report a path that has been renamed out from under it, so the floors are what a missing
`statSync` used to do.

**The directory closes the gap under `apps/web/src/lessons`; it does not close the question.**
Two of the three paths are still named one at a time, so re-ask at your own SHA: *is there a
surface holding learner-facing prose that none of these three trees opens?* Answer it against
the tree rather than against this file. `packages/shared-components` is the obvious candidate
nobody has measured yet, and the standing rule for what to do with the answer is unchanged —
if the surface is a tree, widen to the tree; do not add a file.

```bash
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d6 apps/web/src/lessons packages/item-bank/src/d6
# OK: 456 learner-facing string(s) across 11 pack(s) and 5928 prose-shaped run(s) across
#     422 widget file(s), no rendering artifacts.                          (at 3e3b2f54)

# An era reaching several directories names each of them, and each one's item-bank sibling.
# The shared tree is one path however many domains are swept:
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d1 content/lessons/d2 apps/web/src/lessons \
  packages/item-bank/src/d1 packages/item-bank/src/d2

# THE READINGS BELOW ARE HISTORY, and they are left at the counts they were taken at
# because a count is evidence about a tree rather than about the script. Do not adjust one
# by the difference between two others; re-run it if you need it.
#
# three-path, D10 round 1, 0cbd01ec:
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d10 apps/web/src/lessons/interactive packages/item-bank/src/d10
# OK: 85 learner-facing string(s) across 2 pack(s) and 3713 prose-shaped run(s) across
#     267 widget file(s), no rendering artifacts.
#
# four-path, D2 round 1, adding the CFU-variant module:
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d10 apps/web/src/lessons/interactive packages/item-bank/src/d10 \
  apps/web/src/lessons/cfuVariants.ts
# OK: 85 learner-facing string(s) across 2 pack(s) and 4033 prose-shaped run(s) across
#     268 widget file(s), no rendering artifacts.
#
# four-path, D4 round 2 at 68c5aa9a, adding the worked-solution directory instead. That
# round's tree had five D4 packs; the merged tree above has eight, which is most of the
# difference between 249 strings and 299:
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d4 apps/web/src/lessons/interactive apps/web/src/lessons/worked \
  packages/item-bank/src/d4
# OK: 249 learner-facing string(s) across 5 pack(s) and 4484 prose-shaped run(s) across
#     317 widget file(s), no rendering artifacts.
```

It reports unbalanced `$` delimiters, Unicode operators inside a math span, a collapsed
`\sqrt`, a literal `[object Object]`, numeral adjacency across a full stop, and any sentence
on its **banned list**. It prints the number of strings swept, so a vacuous run is visible.

**The banned list is how a prose objection stops being a memory.** `BANNED_PHRASES` in the
script holds the sentences a reviewer has already had cut, each with the objection that cut
it, matched case- and whitespace-insensitively with markdown emphasis stripped so the phrase
cannot come back reworded around the edges. Removing a sentence and recording that it was
removed are different jobs, and only the first was being done: a phrase quoted verbatim in
one round was reported fixed and was still live in the next. **Adding the entry is the last
step of acting on a prose objection**, after the edit. Ban whole sentences, never fragments;
a fragment bans the words rather than the claim and will eventually fire on prose nobody
objected to, which is how a sweep gets ignored.

**A reword is not a substring, so cutting a sentence from one surface does not cut it from
the others.** The first round of the ledger cut a passage from `d2/EXP.1.json` and left the
same claim, reworded, in the `PowerOfPowerMatch` widget on the same slide, where nothing
looked. So the banned list also runs over the whole `apps/web/src/lessons` tree — widget copy
in `interactive/`, worked-solution and CFU-figure copy in `worked/`, the CFU-variant hints
and worked solutions in `cfuVariants.ts`, the answer-field copy in `answerFormat.ts` and
`unreadableAnswer.ts`, and the shell and reveal copy in the root-level files beside them —
and an objection is only acted on once **every surface
that carries the claim** has been edited and **every wording** has its own entry. D2 round 1's
P1-1 is the case that needed all three: the retired largest-square method was cut from a pack,
from two item-bank nodes and from a CFU variant, and the variant's wording is a separate ledger
entry because a reword is not a substring of the sentence it rewords. D4 round 2's unearned
`trinomial` is the case that needed five surfaces: a pack sentence, a worked-example step, a
figure caption at `worked/d4POL4.tsx`, an ariaLabel at `worked/d4POL3.tsx`, and a fifth copy
in `interactive/CompleteSquareSolver.tsx` that the ledger found by going red rather than a
reader by looking. The other
five rules stay on JSON: they describe `$...$` conventions widget copy does not use, and
measured against the widget sources they produce false positives only (header note).

**What the CFU-variant path buys.** Measured at the tip it was added on, since these are
figures about a tree and not about the script: adding `apps/web/src/lessons/cfuVariants.ts` to
the D2 run takes the swept prose from 3777 runs over 270 files to 4097 over 271, and it reports
clean. One file for 320 runs is the ratio to expect from a module holding every domain's
CFU-variant prose. It was named as a FILE at the time rather than by widening the widget
path to `apps/web/src/lessons`, on the grounds that a directory "would reach it and 112
other files besides, none of which any ledger entry has been written against". **That
argument did not survive.** It weighs a cost that was never measured — the widened tree
reports zero findings, so the 112 files cost nothing — against a benefit that was already
known to be illusory, since the next round found the list short again. The path is now the
directory and this paragraph is kept for the ratio, not for its conclusion.

**What the worked-solution path buys.** Measured at `68c5aa9a`, the tip it was added on:
`apps/web/src/lessons/worked` holds 672 prose-shaped runs across 45 files, and no invocation
this file had ever documented opened one of them. It is the reveal a learner reads AFTER being
marked wrong, which is the surface least likely to be caught by anything else — nothing renders
it in CI, so a claim that comes back there comes back unobserved. It earned itself on the run
that added it: a caption entry added green against `worked/` went red on the widened path list
and named a fifth live copy of an unearned term in `interactive/CompleteSquareSolver.tsx`.

**What the item-bank path buys, and what it does not.** It puts the item bank's AUTHORED
sentences in reach of the ledger — rule 6 over `.ts` sources, matched on quoted literals
exactly as it is matched on widget copy. Measured at `0cbd01ec`, since these are figures
about a tree and not about the script: adding `packages/item-bank/src/d10` to the D10 run
takes the swept prose from 3636 runs over 263 files to 3713 over 267, and a banned sentence
planted in one of those four files fails the run at its file and line, where the invocation
without that path reports OK on the same file. What it does not buy is
a practice prompt, hint or worked-solution step ASSEMBLED at run time from interpolated
parts: that sentence exists in no source file, so nothing here can match it, and that half
stays with the vitest guards (`validateTemplates` for hints and steps, `d8EraProse.test.ts`
for a claim generated into a step, indexed in `reference.md`). The two are not alternatives
and neither covers the other — the item-bank path takes the literals, the guards take the
assembly — which is the same split the script's header note records. Every rule reports zero
findings on all four shipped domains and on the widget corpus, and two candidate rules were
measured and rejected, recorded in the file's header so they are not proposed again.

## Reference skills

`author` (the bar, R1..R34), `interactive-visuals` (the widget contract and gating, and
the implementation side of R24 to R26),
`lesson-katex` (math strings), `practice-templates` / `practice-hints` /
`worked-solution-svg` (the item-bank pipeline), `progress-update` (writing the round up
into the work log).
