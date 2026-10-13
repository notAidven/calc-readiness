# All-domain QA, round 1

**Anchor: `3fbe5fcb`.** The first review in this project whose unit is the curriculum rather than
a domain. Every one of the ten domains had already had at least one round; this round exists for
the defects a per-domain round cannot see, and it found them — the two headline content defects
are both invisible from inside any single domain, and the guard defects are all cases of a sweep
scoped to a surface rather than to a behaviour.

Five read-only investigation streams ran first, their ledgers are `docs/qa-recon-2026-08-08.md`,
`qa-mechanical-`, `qa-grading-`, `qa-guards-` and `qa-prose-`. Triage, the coordinator's own
verification of what workers could not self-certify, and the full verification run are in
`docs/qa-triage-2026-08-08.md`.

## Reconciliation first

114 documentary claims from 19 prior `qa-*.md` reports and the recent work logs were re-read
against `3fbe5fcb` before any new work started, and the 17 contradictions between documents were
resolved against the tree rather than by letting the later document win.

| Verdict | Count |
|---|---|
| STILL BROKEN | 57 |
| FIXED since being written | 23 |
| NO LONGER APPLICABLE | 7 |
| Unresolved | 5 |
| From the untracked `qa-cfu-swarm-d5-d7.md`, largely obsolete | 22 |

**No P0 existed anywhere in the documentary inventory.** The round's only P0 was found by
measurement, not by reading. Several prior claims were corrected in passing: the "six D2 R34
replays" is three; `GeoCisternPlay` board 0 is not a replay; the worked-example null count is 8,
not 13; `SINGLE_BOARD` *is* asserted both ways, contrary to a prior report; and the "3 of 7
scanner paths" coverage gap had already been closed.

## What was fixed

### The P0: a grading gate ran before the accepted list

`gradeCfuAnswer` consulted `isNumericLiteral` *before* the pack's own accepted list, so a pack
refused answers it advertises. Measured over 36,112 accepted-list forms, exactly 12 failed — all
four `reduced_fraction` packs, all on the computed re-ask. TRG.9 refused its own listed
`-\dfrac{7}{25}` with *"Enter your final answer as a single number (for example, 6), not the
expression."*

This is the same shape #735 fixed for one glyph: folding U+2212 ahead of the gate cured an
instance and left the ordering. **The ordering is what moved**, so the class closed rather than
the instance. Four related grader defects went with it: spaced fractions (`1 / 3`, where
`isNumericLiteral` and `isReducedFraction` twenty lines apart contradicted each other), a trailing
decimal point on 19 integer-key packs, `+3` against a key of `3`, and 25 exact-match packs that
refused with `note: null` and so showed only a generic line.

The trailing-period parity gap ran in both directions across 40 of 54 parity pairs and was settled
as **accept**: refusing would have withdrawn acceptance from 751 practice items, and the refusals
were never a product decision but three unrelated artifacts. On the practice side it is a retry
after refusal rather than a fold at dispatch, because `representation: "decimal"` is the one
profile where the period is load-bearing.

### Two content defects only an era-ordered read could find

**`range` was taught with two incompatible meanings.** `LIN.4` (era 3) used it seven times for the
set of *x*-values an inequality allows; `FUN.2` (era 7) glosses it as every output a rule reaches.
Both are standard, so the fix is disambiguation — but both packs pair the word with **interval
notation**, so a learner met "the range, in interval notation" twice meaning opposite axes and
would answer `FUN.2` with the domain. `FUN.2` names that error without knowing its own curriculum
trained it.

A sixth pack the census missed is the worst instance: **`LF.3` (era 8) is one era *after* the
gloss** and tells the learner a model "has a range of inputs". The casual sense gave the word up
for *stretch*, which is not a coinage — `FUN.4`, `TRG.7`, `LIN.6`, `FUN.3` and `LIN.4`'s own
slides already used it that way.

**`coefficient` was used bare in era 1 and then introduced as new three times**, in eras 2, 3 and
4, with two of those glosses mutually incompatible (`RAD.1`'s "the number standing in front" of a
radical against `LIN.1`'s "the number multiplying the variable"). Five more terms follow the same
shape. It is now earned at `NUM.4` in era 1 and the later three are reminders. 24 banned-phrase
entries were added, each proven to fire on the pre-edit text.

### Five R34 replays, and the guard aimed at the wrong domains

Five interactive boards re-worked the example directly above them, worst at `EXP.1` slide 5 where
*both* rounds of board 0 replayed the two lines above in order. One diagnosis covers all five:
**the boards were checked against the CFU, not against the worked example** —
`ExpTransformBuilder.tsx:56` says as much in its own comment.

`workedExampleReplay.test.ts` swept 52 pairs over D7 and D9, which hold **zero** confirmed
instances, and excluded D2, D8 and D10, which hold all of them. It now sweeps 257 pairs over all
ten domains, with a composition assertion beside the floor.

### Four guards measuring nothing, or the wrong thing

- **`classifyChipPalette`** swept 7 hand-listed D5 ids against 67 chip sources and asserted
  `.toBe(7)` over its own list — so adding a board *failed the census*, and the cheapest way past
  the guard was to leave a board out. Now 81 derived across ten domains, and it immediately named
  **three real defects**, all fixed: `EquivalentFractionPlay`, `CommutativeAssociativePlay` and
  `CommonDenominatorMultiples` painted unpicked options in the correctness green. The worst tinted
  an entire multiples ladder green, and since the answer is a value in both ladders, the board
  highlighted it by construction.
- **`widgetSuccessCoverage`**'s predicate was `/\buseWidgetSuccess\b/`, satisfied by the import
  line. For ~180 widgets that regex was the entire guarantee.
- **`SINGLE_BOARD`** excused four members whose stated reason ("genuinely deals ONE board") is
  untrue of them, since they hand-roll the variant cycle locally.
- **R18** had no population floor where R8 has one.

### A dev fixture and an authoring vocabulary on learner surfaces

`CheckerLab` was on the learner's ☰ Menu showing "This development fixture". Confirmed by frame at
1024x580 before being touched, and the proposed mechanism was **corrected**: gating
`onOpenSurface` would have removed Diagnostic and Lessons too, because `EntryLauncher` returns
`null` without it.

A chip row reading `D6 D7 D8 D9 D10` sat on the learner's HUD. It is **not** a leaked dev
affordance — `StaticCityBackdrop` is the surface served when the 3D canvas cannot mount, so gating
it would leave that learner an empty well. It printed each district's `domain` while the same
object carried a human `label`, and its plots printed raw `node_id`s. Both correct names were
already in the tree. Its frame then caught a defect the fix itself introduced: real names wrap, and
the second line ran under the `STONE` capsule reading `…thmic`.

D4's 40-item pool also gained the content-hash pin its nine siblings already had, derived
independently rather than accepted from a failure message.

## What was deliberately left

Extending prompt-derivation to d2–d9 (the D1/D10 harness landed, 44 templates and 2,640
derivations); teaching the R34 extractor d2/d4/d6 board shapes, declined on a measurement — such a
rule fires on 7 of 257 pairs, three real and three innocent, and still misses `EXP.1`; mapping the
217 non-string practice keys; `EL.6` slide 0's partial replay, held as a named `ACCEPTED_PARTIALS`
entry asserted both ways because the cheap fix would trade a partial for an unverifiable spatial
claim; TRG.3/4/9's lowest-terms strictness, judged correct as it stands; and `stretch`'s own
collision with the transformation sense, which is pre-existing, confined to two subtitles, and
ungraded.

## The recurring lesson

Nine of this round's findings are one defect: **a population scoped to where a mechanic is
implemented rather than to what a learner can experience.** `workedExampleReplay` aimed at two
domains with no instances. `classifyChipPalette` counted its own list. `widgetSuccessCoverage`
matched an import. `learnerMenuHoldsNoDevSurface` — written *during this round* — reports 4 passed
over a screen reading `D2 D3 D4 … D10` despite carrying a `\bD(?:10|[1-9])\b` pattern, because it
is scoped to a popover and never sees the HUD.

Two methodology corrections follow, both carried into `.cursor/skills/lesson-qa/SKILL.md`:

1. **A first-use census misses reversion.** Keying on where a term is first used and first glossed
   is right for finding an unearned term and structurally blind to a pack that reverts to the
   discarded sense afterwards — which is how `LF.3`, the worst `range` instance, was missed.
2. **Floor a population per shape, not over a merged list.** A floor of 100 over domains and nodes
   together is satisfied while one shape goes entirely unswept.

## Coverage

**Read:** all 62 packs across ten domains, era-ordered. 124 CFU instances and every computed
re-ask graded through `gradeCfuAnswer` against 36,112 accepted-list forms plus plausible alternate
spellings; 2,265 practice items graded through `checkAnswer`; 264 worked-example prompts read
against R34; a term census over all 62 packs for R23 and R32; seven cross-domain guards audited,
each gap proven by injecting a defect the guard could not see; `packages/shared-components`
measured at 126 authored strings, ~76 learner-reachable.

**Verified:** `check:lessons` exit 0 at 0 errors / 0 warnings on all ten domains; 13 frozen
item-bank snapshots byte-identical with `d4` newly pinned; `format:check` clean over 2117 files;
`typecheck` exit 0; `lint` exit 0 with 2 pre-existing warnings among 38 changed files; this round's
13 new and changed guard files at 2011 passed; Lane 3's five previously-unrun browser files at 318
passed; `classifyChipPalette` and the two new city browser files at 86 passed.

**Not covered, stated rather than implied:** the full browser suite and `test:unit` are **not
green under load on this machine**, and that is reported as its own fact rather than folded into
the result. Two full browser runs failed 46 and then 54 tests over *non-matching* file sets; every
assertion failure among them was chased to a pass in isolation, and `test:unit`'s 66 failures are
Windows-environment shapes in 19 files, none of them a file this round touched, with three
confirmed failing identically on a clean `3fbe5fcb`.

## CI found a defect the local runs could not, and it was ours

The paragraph above originally ended *"no failure in either suite is attributable to this round"*.
That was true of every failure the local runs produced and **false as a statement about the round**:
CI's `test-unit` passed at 20m34s, vindicating the Windows triage, and `test-browser` failed on
**one** test — `cityWithoutWebglShots.browser.test.tsx`, a file this round added — with
*"the district "Geometry" is drawn under `.hud-top-left`"*.

**It is a real defect in this round's own HUD fix.** The skyline insets itself to clear the
top-left cluster, and the inset was built from `--hud-vitality`'s `min(196px, …)` — the widest
*child* of that cluster — while `.hud-top-left`'s own box is `min(300px, 76vw)`. Measured at
1024x580, the chip column began at **224** against a cluster reaching **316**, so it had been
starting 92px inside the capsule from the moment it shipped.

**Why it passed here and failed there is the point.** A chip is only *drawn under* the capsule once
the row wraps far enough down to reach it vertically, and how far it wraps is a fact about glyph
widths. The original assertion was therefore a measurement of text metrics wearing a geometry
assertion's clothes, and this is precisely the case the QA rule names: where a claim rests on where
text lands, a local pass buys very little and the CI run is the reading.

Fixed by making the two numbers one token, `--hud-left-width`, read by both `.hud-top-left`'s width
and the skyline's inset, with the two breakpoint overrides moved onto the token so the inset
narrows with the cluster. The guard gained the font-independent half of the claim beside the
original: the chip column must clear the cluster, which fails on every machine at once rather than
on whichever one happens to wrap. Shown red at `expected 224 to be greater than or equal to 316`
before the fix, green after, and the frame re-taken and looked at.

**The honest form of the coverage claim is therefore:** every failure the local suites produced was
environmental or pre-existing, and the one failure that was genuinely ours was found by CI, in the
guard written to catch exactly it, one wrap-width away from never being seen.
