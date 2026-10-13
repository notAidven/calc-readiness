# D9 QA — round 2, reviewed at `5bac81f0`

## Round 1 reconciliation, at `5bac81f0`

Round 1 was reviewed at `24493680` and landed at `2e602b49`; `integration` has moved since.
Every row below was re-read in the tree at `5bac81f0`, and the line numbers are today's rather
than round 1's. Two of the six carry a correction to the citation they were handed forward with.

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | TRG.5 slide 0 says a signal takes "three numbers and nothing else" while slide 3 counts four readings | **STILL BROKEN** | Both sentences are live and unedited. `content/lessons/d9/TRG.5.json:5` (`mini_lesson[0]`): *"an engineer describes a signal with three numbers and nothing else: how strong it is, how often it comes back around, and how far behind the first link a second one is running"* — amplitude, period, phase shift. `:6` (`mini_lesson[1]`) then introduces a fourth in bold: *"That level has a name of its own. It is the **midline**"*. `:8` (`mini_lesson[3]`) opens *"The four readings do not interfere with each other"* and enumerates all four. `slide_subtitles[3]` at `:14` is *"Every reading at once"*. Ruling owed |
| 2 | `TrigConvertSpot.tsx:39` claims no earlier slide used its board's heading, which `TrigCoterminalSorter` shows | **STILL BROKEN** | Docstring unmoved, still at line 39: *"Neither board is a heading the earlier slides used, and neither is a heading the practice"*. `TrigConvertSpot.tsx:44` still deals `{ direction: "toRadians", degrees: 150, top: 5, bottom: 6 }`; `TrigCoterminalSorter.tsx:108` still deals `{ given: 150, headings: [330, 510, 60, -570] }`, and `:120` puts it on screen as the board's objective — *"A dish is parked at a heading of $150^{\circ}$"* — not merely in a reveal. **Correction to the note this was handed forward in**: `TRG.1.json:56-57` mounts `trg-coterminal-sorter` at `after: 2` and `trg-convert-spot` at `after: 3`, so the heading was seen **one** slide earlier, not two. Both widgets draw through `useWidgetVariants(2, props)`, so the collision needs the sorter's board 1 and the spot's board 0 and is not certain on every run. Ruling owed |
| 3 | `TrigIdentitySpot.tsx` ends six `fine` strings with "Read on.", a phrase on the validator's `META_COMMENTARY` ban list | **STILL BROKEN** | Six live instances. **Correction to the line list**: the phrase sits at lines 49, 55, 62, 141, 147 and **157**, not 154 — at the tip 154 is the `fine: (` that opens the sixth entry and the phrase renders three lines down inside its JSX (*"the tangent really is $\dfrac{8}{15}$. Read on."*). `"read on"` is on the ban list at `validate-lesson-pack.mjs:413`, and the header comment at `:397` names it explicitly: *"`read on` is meta"*. Both gates are green over all six: the strict validator over `content/lessons/d9` exits 0 (measured below) because the list is applied only to pack fields, and the five-path sweep exits 0 over 5610 prose-shaped runs across 346 widget files, because `scan-lesson-text.mjs`'s own `BANNED_PHRASES` does not carry the phrase. **That second green is proved non-vacuous rather than assumed**: planting a listed phrase into the `fine` string at line 147 — one of the six — fails the sweep at *"TrigIdentitySpot.tsx line 147: [BANNED_PHRASE]"*, so the file is genuinely in the swept population and the sweep simply has no opinion on this phrase. Reverted, sweep back to exit 0. Ruling owed |
| 4 | `\arcsin`'s guard is weaker than its two siblings' and passes without the sentence it exists to require | **STILL BROKEN** | Measured by injection at the tip, not argued. `d9CrossNodeTerms.test.ts:249-256` asserts `TRG7.mini_lesson.join("\n")` contains each graded notation. `\arccos` and `\arctan` occur only in the slide-0 naming sentence (`TRG.7.json:5`); `\arcsin` occurs there **and** a second time at `TRG.7.json:7` (`mini_lesson[2]`), bare, inside *"$\sin(\arcsin r)$ returns $r$"*. Deleting that naming sentence and running the file: **2 failed \| 11 passed**, red at *"TRG.7 grades on `\arccos` without ever naming it"* and *"... `\arctan` ..."*, while ***"names `\arcsin` in its own slides" passes***. Reverted, 13 passed / 13 |
| 5 | The five P2s from round 1's prose probe | **STILL BROKEN** | Their text is recorded nowhere in the tree, so they are unrecoverable as written and cannot be re-checked. The only two records are counts: `docs/qa-d9-round-1.md:68-69` (*"its remaining five were graded P2 and are **not** actioned this round"*) and `:356` (*"The prose probe's five P2s, which this round did not act on"*). Neither carries a node, a file:line or a quoted string. A sweep of every `*.md` in the worktree for `five P2\|P2s\|remaining five\|prose probe` returns only those two lines plus one hit in `work-log/anthony/2026-08-04-d4-qa-round-2.md`, an unrelated domain; `work-log/anthony/2026-08-04-d9-qa-round-1.md` records the four P1s and not these. Per the skill, unreproduced is STILL BROKEN and not NO LONGER APPLICABLE, so they stand until the prose pass re-derives them |
| 6 | F16's graph edge: TRG.8's `prereqs` does not carry the TRG.4 dependency its item families already encode | **STILL BROKEN** | Unchanged, and still a convention decision rather than an omission. `skill_graph.json:757-763` — TRG.8 is `"prereqs": []` with `"item_family": true`. `_item_family_prereqs` at `:158-173` encodes `TRG.4` under all three of its families (`unit_circle`, `linear_form`, `quadratic_in_form`). `_edge_overrides` at `:76-79` still records the deliberate ruling *"only quadratic-in-form trig items need POL.3; encoded as item-family, not a universal hard edge"*, with the identical shape for `EL.6` at `:81-88`. The guard that hangs on the empty list is live and green: `d9CrossNodeTerms.test.ts:168-173` asserts `getNode("TRG.8")?.prereqs` equals `[]`, so promoting the edge fails that file by name and forces the decision into the open |

### Rulings on the four rows that were handed forward owing one

Round 1 left four of the six rows above marked "ruling owed" rather than broken-and-scoped,
because each turns on a judgement rather than on a measurement. The reasoning is written out
below rather than only the outcome, since a ruling recorded as a verdict gets re-litigated by
the next round and one recorded as an argument does not.

**Row 1 — TRG.5's count: FIX.** This reads as an overstatement and is really a *contradiction*,
which is what settles it. Slide 0 does not merely undercount; it closes the list ("and nothing
else") and then two sentences later, in its own slide, names a fourth reading in bold. The
excluded reading is the midline, which is the one this node's CFU grades — so the pack tells a
learner that a thing it will grade them on is not part of the description. Striking "and nothing
else" is the minimum and costs nothing pedagogically, since an engineer *starting* with three
numbers and then meeting the level they swing about is the better teaching order anyway.

A note handed forward claimed slide 0 was pinned by an assertion and the edit therefore
constrained. **That is wrong and was checked**: `d9CrossNodeTerms.test.ts` resolves
`TRG5_SUMMARY` to `mini_lesson[length - 1]` and reads slide 0 nowhere. The edit is free. A second
surface makes the same closed-list claim with a *different* triple — `TrigFeatureLabel.tsx:184` —
which is how the contradiction survived a reading of either file alone; both are being fixed.

**Row 2 — `TrigConvertSpot`'s docstring: FIX THE SENTENCE, DO NOT DELETE IT.** The docstring makes
two factual claims the board's own data refutes, and the tempting move is to cut it. That is the
wrong trade: a docstring saying what a board is *for* is the only record of the author's intent,
and deleting it converts a false statement into no statement, which is worse for the next reader
than a corrected one. The correction is also cheap — derive the claim from the rows rather than
restating a count, and it cannot go stale the same way. Note the collision is *variant-dependent*:
both widgets draw through `useWidgetVariants(2, props)`, so it needs the sorter's board 1 against
the spot's board 0 and does not occur on every run. That makes the docstring's claim false as
stated but not false on every render, which is precisely why a derived claim beats a written one.

**Row 3 — "Read on.": NOT A DEFECT. Document the boundary; change no content.** The ban's own
header says the objection is to *"narrating the lesson instead of teaching the mathematics"*. What
decides this is the sentence's **referent**. In a `mini_lesson` paragraph, "Read on." points at
the paragraph — the author telling the reader to keep consuming the author's text, which teaches
nothing. On a `SpotTheError` board it points at *the lines of work*, and it is the learner's next
move: the board's mechanic is to read down the work until a line stops following.

That is a claim about a rendered surface, so it was measured rather than argued, at 1024x580 in a
920px lesson column. Before any move the standing instruction holds the status line; after the
learner flags a sound line, `SpotTheError.tsx:384-394` renders `feedback` and suppresses
`findPrompt`, so the instruction is **gone** and the `fine` string is the only thing on screen
telling them what to do next. Cutting it would leave a learner who has just been told their line
is fine with no direction at all — the R24 defect arriving from the other direction.

The population also turns out to be 13 instances across three files, not six in one: six more in
`TrigRosterSpot.tsx` and, decisively, `interactive/kinds/SpotTheError.tsx:215`, the kind's shared
default for any board supplying no `fine`. So a ban extended on a one-file reading would land on
every domain's spot boards. And `META_COMMENTARY_RULES` was deliberately narrowed to word
boundaries at `validate-lesson-pack.mjs:421-423` on the reasoning that *"a rule that cries wolf
gets the whole gate ignored"* — firing on thirteen instances of task direction is how that
happens. What this owes is documentation: the validator's one-line gloss (*"`read on` is meta"*)
reads as lexical when the rule is semantic, and two rounds have now flagged it for that reason.

**Row 6 — the TRG.8 graph edge: NO CHANGE, and the guard stays.** This is a convention decision
that was already made and recorded, not an omission. `_edge_overrides` states the ruling in the
graph itself, `EL.6` carries the identical shape, and the dependency *is* encoded — under
`_item_family_prereqs`, which is where a dependency that binds some item families and not all of
them belongs. Promoting it to a universal hard edge would assert something false about the
`unit_circle` family. The assertion at `d9CrossNodeTerms.test.ts:168-173` pinning
`TRG.8.prereqs === []` is doing exactly the right job: it makes any future promotion fail a named
test rather than land quietly, which forces the convention decision back into the open instead of
letting it be settled by whoever edits the graph next.

**Row 5 — the five unrecorded P2s: SUPERSEDED, not carried a third time.** They were recorded only
as a count, with no node, file:line or quoted string, so they are unrecoverable as written. Rather
than carry an unreproducible row forward indefinitely, this round's prose pass re-read every D9
prose surface from scratch — all nine packs, 34 widgets, every worked module and every item-bank
node — and its findings replace them. Whatever those five were, a full re-derivation either found
them again under new citations or they were not there.

### One ruling raised during the fix wave: TRG.6's worked example is CLOSED, not a partial fix

Cutting the two base periods out of TRG.6's lecture left `TRG.6.json:47,49` — the worked example
one section lower — still saying *"the length it starts from is $\pi$"* and *"...is $2\pi$
instead"*, and `TrigCycleMatch` grades `\tan\theta \to \pi` and `\csc\theta \to 2\pi` as two of the
four pairs on each of its boards. That was reported as a residual leak. Read against the board's
data it is not one, and the reasoning is worth recording because it is the mirror image of the
ordering-board finding this round overturned things on.

The lecture was enumerating the values as a list directly above the board; the worked example
states them *inside a derivation*, where the learner watches `\pi` get divided by 4. That is the
instance-versus-method test working as intended, and the difference is visible in the board's own
design: `\pi` is simultaneously `\tan\theta`'s answer **and** the base that `\tan(2\theta)`
divides, so knowing the number settles nothing. The widget's docstring says so — *"every period on
the right is somebody's correct answer, so a learner who reaches for $2\pi$ because it is
[familiar]"* — the trap is which row a value belongs to, not what the value is.

The decisive argument is what cutting it would cost. A base period is a definition, not a derived
result, and `\tan(4x)` cannot be worked without it. Removing it would leave the pack grading two
readings that no slide anywhere explains — which is precisely the defect the TRG.5 summary guard
exists to catch, arriving by our own hand. **No further edit; item 8 is complete.**

### A defect class D9 was never swept for, now measured: zero instances

D9 had no coverage for the worked-example replay defect — a section-three widget dealing the
instance the section-two worked example has already solved, so the gate opens with no mathematics
happening. It was confirmed ten times across D2, D8 and D10, and the guard written for it swept D7
alone.

**Read by hand, all 36 of D9's three-section pairs, every board rather than the opening one: zero
replays.** Reading every board matters because in D2 the first board was clean and the *second* —
the one "start over" deals — was the replay, so a sweep of opening instances measures the wrong
half. Four pairs deal the same *archetype* as their worked example with a different value or sign,
which is the intended relationship between sections two and three rather than a defect. One is
worth a human's eye: TRG.7 slide 1's widget takes the interval its worked example argues about as
its subject, but asks the opposite question, so nothing can be lifted.

This is authoring discipline rather than luck. Several widgets carry docstrings recording that
their boards were chosen *against* the worked example and the item bank; `TrigSweepPlay` names the
six of eight candidate equations it avoided.

The sweep was extended to D9 anyway, on a separate branch, because a reading pass expires the
moment the next authoring wave adds boards. It landed at **52 pairs with 12 exemptions**, against
the 52-with-38 that widening the population alone would have produced — the outcome an earlier
lane correctly declined to ship. Two things surfaced while measuring that are worth recording:

- **The shipped extractor was blind on D9, not merely narrow.** Its `canon` collapsed `\\` to
  nothing, which is harmless over D7's plain-text literals and fatal over a source literal like
  `"\\cos x = \\dfrac{1}{2}"` — the command name is deleted, so the entire widget side of D9 read
  as empty. Exemption counts alone would have called a completely blind sweep fully covered, which
  is why the widened version floors the number of pairs live at **both** ends (31 of 52).
- **The honest limit is named and derived, not argued.** A widget assembling its instance from
  numeric fields stays invisible: setting `TrigCoterminalSorter`'s `given: 100` deals a real replay
  and the sweep passes. `SILENT_WIDGETS` censuses the 17 widgets that write no reachable instance,
  as a set equality so it fails whichever way it drifts. A first hand-written version of that list
  had 9 entries; derived from the tree it is 17.

### Found in D9, but not D9's to fix — carried out of the round rather than dropped

Both surfaced from the exact-value grading sweep. Neither is scoped to D9 and neither is fixed
here, so each is recorded with the measurement that makes it actionable by whoever owns it.

**C1 · P2 — `combined_polynomial` gives 181 items across six domains a miss note that names no
fix.** The round added named branches for the two radical profiles, which were D9's; this is the
largest remaining profile and it spans D1, D4, D6, D7, D8 and D10. Changing learner-facing copy in
six domains nobody in this round owns is not a call this round should make. It is not merely noted
prose, though: it sits in `NAMED_GAP_CARRIED_FORWARD` in `answerFormat.test.ts`, asserted both
ways, so the day it acquires a note the guard fails and the entry has to go. A gap held as a
failing-both-ways fact cannot rot the way a TODO can.

**C2 · P2 — the square-free rule only fires on a literal radicand, so writing the factorisation
out longhand defeats it.** `product-answer-checker.ts:364-371` gates the check on
`radicandNode?.type === "ConstantNode"`. Measured through the production checker against
`d9.trg3.exact-value-circle.l3`, key `sqrt(3)/2`: `sqrt(12)/4` is refused `not_simplified`, and
`sqrt(4*3)/4` — the same value, the same perfect square under the same root, merely unmultiplied —
grades **correct**. A learner can pass the canonical-form rule by doing less simplification, which
inverts what the rule is for.

Graded P2 rather than higher because it errs toward accepting: nobody is marked wrong for a
correct answer, which is the direction that matters. It also does not weaken this round's prompt
fix — the prompts now state the rule, and the checker enforcing it in one spelling and not another
is a separate defect in `shared-components`, outside every lane in this round.

### Not re-litigated, and why

- **X1** (`secant-defined.l2` case folding) stays closed: measured in round 1 as a false positive
  because `normalizeTextSubmission` folds case for `multiple_choice` in all three production
  surfaces. **X3** (the CFU checker / enumeration split) stays closed: it cannot be closed in
  general, since an equivalence class is infinite and a list is finite.
- **F11 elsewhere** (ten domains still drawing a retry by item id alone) is open but is not this
  branch's: it is owned by the second lane on `anthony/retry-by-answer-sweep`.

## Findings

Every row below was fixed on `anthony/d9-qa-round-2` unless its status says otherwise. "Repro"
means a test that failed before the fix and whose failure text is quoted in the work-log entry.

### P0 — a learner is shown something false

| # | Where | What a learner saw | Evidence |
|---|---|---|---|
| 1 | `TrigRosterSpot.tsx:174-177` | The sentence sent to **correct** their error taught the negation backwards: it said reflecting across the horizontal axis leaves the *sine* alone and flips the *cosine*. It is the other way round. The widget's own grading was right, so only the explanation was wrong — which is the worst case, because a learner who accepts it has been mistaught by the repair | Repro on the second board's `b-fix-mirror` miss, red first. Wording cross-checked against `TRG.4.json:7`, which states the rule correctly |
| 2 | `TrigRadianMatch.tsx:114` | A rule the board itself disproves: "a bigger number underneath is a smaller sweep" holds only when the numerator is 1, and **both** boards serve pairs that break it (`π/2` vs `2π/3`; `π/3` vs `3π/4`) | Repro red first. The corrected sentence now **derives** its counterexample from the board's own headings. The browser assertion pinning the old wording was re-pinned and then proven to still bite by re-injecting the false rule |
| 3 | `d9TRG3.tsx:333-347` | The Quadrant III reference-angle figure printed `6π/6 − 7π/6 = π/6`, whose left side is `−π/6`, and the caption repeated it. The item bank branched three ways; the figure branched on `quadrant === 4` alone, so Quadrant III got Quadrant II's row with the operands reversed. **One third of that template's draws** | Red quoted first, then 3 passed. The caption now calls the same helper as the row, so the two cannot diverge again |
| 4 | `d9TRG5.tsx:773` | The caption named the **dashed** trace as the one that moved. The dashed path is the unshifted reference (`stroke=SOFT`); the solid one is the shifted answer (`stroke=CIVIC`). It inverts the picture's direction reading on the node whose whole L3 tier is sign-of-the-shift, at **100% of `d9.trg5.phase-shift.l3` reveals** — the phrase has no branch | Read off the stroke definitions at `:584-596`, not inferred. Escalated from P1 on review, for parity with row 1: same species, and this round grades them the same |

### P1

**Lecture leaks — five slides stated the verdict their gated widget was built to make the learner
produce.** The migration that created these slides cut seven such leaks and accepted three as
judgement calls on an instance-versus-method test. **That test is wrong on ordering boards**, where
the method *is* the answer key, and D9 mounts four of them with three sitting under a lecture that
gives away their order. `TrigShortenOrder` is the counterexample proving it avoidable — it teaches
two habits without ever sequencing its board. Fixed at `TRG.3.json:8`, `TRG.7.json:5`,
`TRG.8.json:6`, `TRG.6.json:5`, `TRG.8.json:8`. Two of those were among the three the migration
accepted; two more were never flagged at all and are worse than either.

**Four templates graded by a rule their prompt never stated.** `d9.trg2.special-exact.l2`,
`d9.trg3.exact-value-circle.l3`, `d9.trg6.reciprocal-exact.l3` and `d9.trg9.sum-exact.l1` refused
an *equal-valued* answer that obeyed every printed instruction — `sqrt(12)/4` against a key of
`sqrt(3)/2`. The rule was square-free radicands, enforced and unstated. Population measured through
the production checker rather than filtered by profile string: 14 templates across three domains
refuse it, and exactly these four printed nothing about it. Prompts fixed; four snapshot rows
re-pinned by hand, never `vitest -u`.

**Two simplification profiles gave a refusal no fix.** `simplified_radical` (97 items) and
`canonical_exact_trig_value` (83) fell through to the generic miss note, against `missNote`'s own
contract.

**Figures contradicting the item bank or their own board.** The `d9TRG9` pattern board rang a row
the learner could not have matched on two of eight shapes, and its caption re-asserted an ambiguity
the node's prompt was reworded to settle (measured at 23.3% of draws). `d9TRG6:463` labelled a ray
lying up the vertical axis "reference 90°", on exactly the two headings that figure exists for.
`d9TRG1:418` labelled loops in radians on a degree board. `TrigSpecialMatch:202` promised three
values over a board serving four. `TrigConvertSpot:39` made two claims its own data refutes.

### Guards that were green over the defect they name

Both in `d9CrossNodeTerms.test.ts`, both the same mechanism — **the needle survives for a second
reason**, so deleting the teaching does not move the guard.

- The notation guard required `\arcsin` to appear somewhere in TRG.7's slides. Drop only its naming
  clause, leaving the bare use inside `$\sin(\arcsin r)$`, and the file was **13 passed / 13**.
  Rewritten to check the **first** mention and to require the naming phrase *before* the symbol.
- The readings guard required three words in TRG.5's summary; all three occur twice in one
  sentence, so cutting the clause that teaches them left it **13 passed / 13**. Rewritten to assert
  the arithmetic per graded reading.

Each is proven red on the injection the shipped one was green over, and green on revert. A third
injection nobody asked for — rewording so the symbol precedes its naming rather than deleting
anything — is caught by the new guard and not the old.

### P2

Ten widget docstrings corrected against their files' current data, and **three claims judged
already accurate and left alone**. Three further docstring claims about other lanes' files were
declined for certification by the lane that found them and verified separately: all three true, and
one (`TrigCofunctionSpot`'s) is actively maintained — `COFUNCTION_EXCLUDED` names the widget's own
boards as its reason. Also: `TRG.9.json:5` miscounted an expression's cost, `TRG.6.json:8` handed
over two of four pairs, six worked examples closed on a coda instead of naming the result, and
`d9TRG2.tsx` carried three pieces of dead residue from a retired shape (removed; before/after
frames byte-identical, proving nothing was mis-drawn).

## Coverage, measured

What was actually read or run, so a later round can tell what this one did not look at.

| Sweep | Population | Result |
|---|---|---|
| R34 three-section reading | 36 of 36 slides | 5 P1, 2 P2, no P0, no section-1 arithmetic, no verbatim replays in section 3 |
| Prose | all 9 packs, 34 widgets, every worked module, every item-bank node | 4 P0, and the rulings above |
| Prompt-vs-key | 19,600 comparisons over 49 templates | 0 mismatches, injection-proven non-blind (49/49 on key perturbation, 48/49 on prompt, the 49th exempt for a proven structural reason) |
| Served keys through the production path | 327 | 327 grade correct |
| D9 guards | 48 files, 2,206 tests, plus 4 injections | 2 guards found green over their own defect |
| Worked-example replay | 36 of 36 pairs, **every board** | 0 replays |
| D9 figure arithmetic (new this round) | 925 renders, 150 stated subtractions over 6 templates | 7 false, all one branch, all fixed |

**Not covered, and owed by a later round:** the whole `apps/web` jsdom suite could not be brought
to a clean baseline on this machine (saturation timeouts, `Failed to start forks worker`), so
"the wider web suite is unaffected" is **claimed but unverified**; what is verified is each scope
named above. A replay assembled from a widget's numeric fields is still invisible to the widened
sweep — `SILENT_WIDGETS` censuses the 17 widgets that write no reachable instance. And the
three-section structure's own guard population still excludes 24 of D9's 36 pairs.

## Baselines at `5bac81f0`

Measured in `../wt-d9-qa2` after `npm install`, before anything was touched.

| Baseline | Reading |
|---|---|
| Strict validator, `content/lessons/d9` | **exit 0, 9 packs, 0 errors, 0 warnings.** R8 dormant over **266** registry entries, 0 captioned — the intended end state (round 1 read 254 here) |
| Five-path artifact sweep | **exit 0**: 340 learner-facing strings across 9 packs, and 5610 prose-shaped runs across 346 widget files, no rendering artifacts |

Sweep invocation, all five paths in one run: `content/lessons/d9`,
`apps/web/src/lessons/interactive`, `apps/web/src/lessons/worked`,
`apps/web/src/lessons/cfuVariants.ts`, `packages/item-bank/src/d9`.

### Frozen item hashes

`git hash-object` over all **13** `.snap` files under `packages/item-bank/src/__snapshots__/`.
Every one of these must be byte-identical at the end of the round; a move is a finding.

| File | Hash at `5bac81f0` |
|---|---|
| `d1.test.ts.snap` | `60ad243b4f3bf13ec70354c6b6b7c495e44387ff` |
| `d10.test.ts.snap` | `530fe49a3ad0131f1e944679a55b1bf97b3c62e5` |
| `d2.test.ts.snap` | `27f6375b4d488a98ba8b3252cf0ad836d36e0db1` |
| `d3.test.ts.snap` | `40674d1e4cd75255fc06d18c8a7880ac1aed98d6` |
| `d5.test.ts.snap` | `e74c1f952882ac5dc967e2e498f61cd5bfa2fd62` |
| `d6.test.ts.snap` | `8802f3c8dc2eb145114b65b9e66965cb27320b27` |
| `d7.test.ts.snap` | `5b71b580ed16cf96b7b49cab050eb8b277ee8b39` |
| `d8.test.ts.snap` | `d7fb56b44e3cc66bab0eff4113069290e93f1b4a` |
| `d9.test.ts.snap` | `320f37ced830892811ad1eda61dfc048252a06cd` |
| `interactive.test.ts.snap` | `9ce45bf7f79f744a05274d3f1cc156f3f003ccb7` |
| `product.test.ts.snap` | `c549bba35a8190ceec8e2b5cd5506628c09c6694` |
| `template.test.ts.snap` | `c3a7c3551b9486a7430a72ba59b549398990caa3` |
| `walk.test.ts.snap` | `e7e79361a77e322ef4028f62bf93302502ae6315` |

`d9.test.ts.snap` is at `320f37ce`, and round 1 reported finishing on `bb7ebe7d`
(`docs/qa-d9-round-1.md:29` — a previous reading at that round's tip, quoted rather than
re-measured, since the tree it was taken on is gone). That difference is a measurement of this
tree rather than a finding about it: `integration` has moved under D9 since round 1 merged. The
baseline round 2 is held to is the table above.

### Unit and browser counts

**NOT MEASURED.** The `--maxWorkers=4` unit and browser counts the `worktree` todo also calls for
were deliberately not taken: this run was scoped to the setup and the reconciliation, and told not
to run the full gate suite. They are still owed, and they are owed **before** the `gates` todo
reads anything into a red run, because without a baseline there is nothing to read a later red
against. A second lane was also running suites in another worktree during this run, so whoever
takes them should take them alone — the machine note carried forward from round 1 still holds, and
a red at full parallelism here is unmeasured rather than failing.

The two suites that were run for this reconciliation ran alone, and their exact counts are quoted
in rows 3 and 4 above.
