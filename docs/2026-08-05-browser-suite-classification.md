# Does every browser test need a browser?

**All 236 files of `npm run test:browser` classified and priced.** Every runtime figure was
measured against `integration` at **`09c9c5d1`**; the CI figures are re-pulled at
**`2b3a49c3`**, which is the tip as this lands. The only difference between those two commits
is #589 — `invariants.yml`, `test/ciGateAggregation.test.ts` and a work-log entry — so the
test population and the per-file timings are unaffected by it and are not restated at the
newer SHA. The population comes from `vitest list`, the runtimes from vitest's own json
reporter, and the classification from running the same 236 files under the jsdom harness
unedited and reading the per-test verdict.

Method as `docs/2026-08-04-ci-cost-measurement.md` §11: billing is per job attempt,
`max(1, ceil((completed - started) / 60))` at **$0.006/min**, re-derived from the Actions API
rather than read off that document. **That document is not in the tree**: it is #579, and its
`mergedAt` is null, so it lives on `cursor/ci-cost-measurement-and-safe-cuts-c176` at
`ad5828ba`. Every figure quoted from it here was read there.

A finding expires when the tree moves. Re-derive before acting on this if
`vitest.browser.config.ts`, `apps/web/vitest.config.ts` or the suites have moved; §9 is one
command.

**No test is moved, deleted, renamed or weakened by this.** The sample migration in §5 was
performed, measured, verified against injected defects and then reverted, for the reason §7
gives. The only edits that land beside this document are four measurement files under
`scripts/` and two corrected docblocks: `cfuHintGate.browser.test.tsx` and
`cfuVariantRetry.browser.test.tsx` each stated that jsdom could not see what they assert, and
§5 measures that as false.

## The answer, in one table

| | files | tests | measured seconds | share of browser time |
| --- | --- | --- | --- | --- |
| **1. genuinely needs a browser** | **84** | 380 | **520 s** | **55.0%** |
| **2. could be jsdom** | **103** | 1,349 | **97 s** | **10.2%** |
| **3. mixed** | **49** | 995 | **328 s** | **34.7%** |
| total | 236 | 2,724 | 944 s | |

Of category 3's 328 seconds, **264 s is genuinely browser-bound and 64 s is not** (360 of its
995 tests need the browser), split by matching each test's `fullName` between the two runs. So
everything that could move is **97 + 64 = 161 s, 17.0% of the browser suite's measured time**,
carried by 103 whole files and a minority of 49 more.

**Projected saving: $0.00/day, ±$1.18.** That is not a rounding of something larger; it is
the measurement, and §2 is why. The same figure with the reasoning attached:

| | browser job | unit job | billed total |
| --- | --- | --- | --- |
| today (median of 13 post-T2 runs) | 1,460 s → **25 min** | 894 s → **15 min** | **40 min** |
| category 2 moved (10.2%) | 1,320 s → 22 min | 1,041 s → 18 min | **40 min** |
| category 2 + 3 moved (17.0%) | 1,226 s → 21 min | 1,140 s → 19 min | **40 min** |

Both suites are already one job each, so a migration does not remove a job or a rounding; it
moves seconds from one bill to another, at a **1.05x jsdom penalty** measured in §2. Under
per-job minute rounding the two changes cancel. The ±1 minute is where the two jobs land
against the 60-second boundary on the day, worth $1.18/day at 196 runs. (Setup is held fixed
at its measured value and taken out of the proportion first: **79 s** on `test-browser` and
**38 s** on `test-unit`, read off run 30961837600's step timings, where the suite steps
themselves were 1,424 s and 555 s.)

**What it does buy is latency.** The browser job is the run's tail at 1,460 s (24.3 min,
which is the ~24 minutes of feedback the brief names), and it stays the tail after the move,
at 1,225 s. So **feedback goes 24.3 → 20.4 minutes, a 16% cut, for no money.** That is the
honest case for doing this, and §7 weighs it against what it costs.

## 1. The baseline, re-derived, because the suite moved overnight

`docs/2026-08-04-ci-cost-measurement.md` priced `test-browser` at 46.7% of the bill across
three shards. **Both structural changes have now landed**, and both are on `integration`:
T2 (#586, one job per suite) merged at 2026-08-04T23:56Z as `7d467f96`, T1 (#589, the five
light gates folded into one) at 2026-08-05T01:04Z as `2b3a49c3`. That leaves five jobs.
Re-pulled over the **13 post-T2 runs whose browser suite actually executed**
(2026-08-04T23:50Z onward, `filter=all`), with the light gates priced at the two runs that
have the folded job:

| job | median duration | median billed | share of a run |
| --- | --- | --- | --- |
| `test-browser` | **1,460 s** (range 838–1,542) | 25 min | **56.8%** |
| `test-unit` | 894 s (range 597–1,001) | 15 min | 34.1% |
| `light-gates` | 90 s | 2 min | 4.5% |
| `scope` | 31 s | 1 min | 2.3% |
| `code-quality` | 4 s | 1 min | 2.3% |
| **run** | | **44 min** | **$0.264/run** |

The two observed 5-job runs billed 44 and 46 minutes, so the reconstruction checks out. **The
two suites are 90.9% of a run**, and the browser suite alone has gone from 46.7% to **56.8%**
of the bill — *after* both changes that were supposed to cut it. Both did what they measured;
the suite grew past them. At 196 runs/day that is **$51.74/day, of which the browser suite is
$29.40**.

Note the browser job was 961 s on #586's own run last night and is 1,460 s now, +52%, for a
file population that has not changed size. Read the range, not the median: this job's
duration varies 838–1,542 s across 13 consecutive runs, and it now sits at 54% of its
45-minute cap.

## 2. The finding that decides it: jsdom is not cheaper here

This is the load-bearing measurement in the document, so it is made three ways, and every
way of asking gives the same answer.

**The whole population, both harnesses, same box, same worker count.** All 236 files, 7
workers, nothing edited:

| | wall clock | file time | import | environment |
| --- | --- | --- | --- | --- |
| Chromium (`vitest.browser.config.ts`) | **181 s** | 944 s | 142 s | 0 s |
| jsdom (`scripts/jsdom-trial.vitest.config.mjs`) | **202 s** | 1,136 s | 172 s | 62 s |

jsdom is **1.20x** the compute and 1.12x the wall clock. And that is a *floor* on jsdom's
cost, because 107 of the 236 files fail there and a failing test often stops early.

**The like-for-like subset.** Restricted to the 124 files that pass in jsdom, so nothing
short-circuits: **99 s in Chromium against 104 s in jsdom, 1.05x.** These are exactly the
files a migration would move, and moving them makes them 5% dearer.

**A controlled before and after, three runs each.** The four files of §5, alone, same
filter, same box:

| | run 1 | run 2 | run 3 | mean |
| --- | --- | --- | --- | --- |
| `test:browser` (Chromium) | 21.69 s | 21.62 s | 21.73 s | **21.68 s** |
| `test:unit` (jsdom) after the rename | 21.89 s | 21.97 s | 21.89 s | **21.92 s** |

343 tests, all passing, both ways. **1.011x — 0.24 seconds slower.**

Why: a Chromium worker is expensive to *start* and the browser pool starts one per worker
rather than one per file, running each file in an iframe of a page that is already up, so
that cost is amortised over every file the worker takes (118 apiece on the runner's two).
Per file, constructing a jsdom — 62 s across the suite, against Chromium's 0 — and running
React and KaTeX against jsdom's slower DOM costs about what Chromium costs. The browser tax
that the arithmetic "a browser test costs more than a jsdom test" is reaching for is real, but
it is **per job, not per test**: measured on run 30961837600's steps, `test-browser` spends
79 s on setup against `test-unit`'s 38 s, i.e. 41 s once per run, which under per-job rounding
is worth at most $0.80/day and usually nothing — and it does not move when files do.

**So the browser suite is expensive because of what its tests do, not because of where they
run.** The per-test figures say it plainly:

| suite | files | tests | file time | per test |
| --- | --- | --- | --- | --- |
| `test:unit`, whole | 540 | 12,003 | 375 s | **31 ms** |
| `test:unit`, the `apps/web` jsdom project alone | 344 | 8,651 | 257 s | **30 ms** |
| `test:browser` | 236 | 2,724 | 944 s | **347 ms** |

A browser test is 11x a jsdom React test, and the jsdom trial proves the 11x is not the
browser: it survives the move. What the expensive ones do is mount a 3D city, wait for a font
set, drive an orbit camera and capture a frame.

## 3. How the classification was made, and where it is weak

Two independent inputs, because a regex over a test file is not evidence and neither is a
green run.

**The empirical half decides.** `scripts/jsdom-trial.vitest.config.mjs` runs the browser
suite's own population — taken from `vitest list`, not from a glob copied into the script —
under the jsdom harness that `apps/web/vitest.config.ts` defines, unedited. A file whose
every test passes is category 2; some pass and some fail, category 3; all fail, category 1.
The trial is deliberately stricter than the harness in the one place it stands in for it:
`page.viewport` resizes the window, because a jsdom test can do that for itself in three
lines, while `page.screenshot` and `cdp()` **throw**, because nothing in jsdom stands in for
a rendered frame. Making those resolve quietly would have classified all 78 screenshot files
as jsdom-capable, which is the exact false green this exercise is about.

**The static scan explains it, and covers what the run could not.** Each signal in
`scripts/classify-browser-tests.mjs` names the jsdom behaviour that makes it a real
dependency, in four groups: `paint` (frames, WebGL, real input, font metrics, hit-testing,
scrolling, media queries, SVG geometry), `box` (the box-measurement APIs), `cascade`
(`getComputedStyle`), and `harness` (things that are an edit to migrate rather than a reason
to stay). 11 files ran nothing in jsdom and are categorised from the scan alone; every one is
a frame-capture file and every one is category 1.

The two agree on **178 of the 225 files where both spoke**, and the disagreements are the
useful output. `scripts/classify-browser-tests.mjs` prints all 47 of them; the classes are:

- **The scan said 1 and the run said 3 (37 files).** A file that screenshots *somewhere* has
  a `screenshot` signal, and the scan attributes a signal found outside every test body to
  the whole file. Correct as a rule, too coarse here. The run is right and these are mixed.
- **The scan said 3 and the run said 1 (3 files).** The reverse coarseness: the minority the
  scan thought was jsdom-capable turns out not to be.
- **The scan said 2 and the run said 1 or 3 (5 files, of 106 the scan proposed).** The scan's
  real false negatives, and the most instructive is
  `interactive/GeoAngleExplore.browser.test.tsx`: it calls `getScreenCTM` through
  `lessons/drawnTriangle.ts`, an imported helper, so **no scan of the test file could see
  it.** `WorkUpload.browser.test.tsx` needs `DataTransfer`, which jsdom does not define.
  `ceremonyCameraIsThePlayers` is env-gated. `negativeExponentPlay` and `absBranchEquivalent`
  fail on a rendered chip the test names by its LaTeX and cannot find; that one I did not
  chase, because the run's verdict is the conservative direction and the two files are 0.6 s
  between them.
- **The scan said 1 and the run said 2 (2 files).** What is left after the env-gate override
  in §4b moves 21 such files back to category 1.

**Three limits, stated rather than discovered later.**

1. **Passing in jsdom is necessary and not sufficient.** A test can pass there while
   asserting nothing. The only thing that settles it is an injected defect, which is why §5
   exists and why it is four files rather than a table.
2. **`apps/web/vitest.config.ts` sets `css: false`, so the trial loads no stylesheet.** 57 of
   the jsdom failures are of the form *"a filled blank prints a label beside the answer:
   expected '|||' to be ''"* — an element the stylesheet hides being read as text. That is
   the trial's harness failing, not jsdom failing, so those files may be movable and are
   counted as category 1 or 3 here. The error is therefore in the direction of
   **understating** category 2.
3. **A signal reached through an imported helper is invisible to the scan.** Measured, not
   supposed: `GeoAngleExplore` above. The empirical run is what covers this, which is why it
   decides.

## 4. The fourth category, and a fifth nobody asked for

### 4a. Box measurement, where the rule says the measurement is not the evidence

`.cursor/rules/qa-verification.mdc` is explicit that a spatial claim is not discharged by a
passing test — *"a layout test can assert the sheet is 72vw, pass, and say nothing whatever
about whether anything is visible around it"* — and that such a claim owes a rendered frame
somebody looked at. So: how much of the browser suite is paying browser prices to measure a
box, with no frame beside it?

| | files | tests | seconds | share |
| --- | --- | --- | --- | --- |
| measure a box at all | 101 | | 690 s | 73.1% |
| ...and capture a frame in the same file | 62 | | 453 s | 48.0% |
| ...with no frame anywhere in the file | 39 | | 237 s | 25.1% |
| **...and box measurement is the file's ONLY browser dependency** | **12** | **153** | **28 s** | **3.0%** |

**The category exists and it is 3.0% of browser time.** The last row is the only one where
the saving would be free: for the other 27, something else in the file needs Chromium anyway,
so moving the measurement out saves nothing.

**And the premise that it is free does not survive the measurement.** The brief's reasoning
was that the coverage is already notional, so dropping it costs nothing. Tested directly:

> **Zero of the 101 box-measuring files passes in jsdom on a test CI actually runs.** Every
> one fails, and it fails *at its own measurement*. 15 more appear to pass; every one of the
> 15 is env-gated (§4b), so its measurement ran in neither harness.

The failure messages are the argument. `spotWorkCentered`: *"the work list is only 0.0px
wide, so an indent could not show: expected 0 to be greater than or equal to 380"*.
`revealAnswerHighlight`: *"lost-root-spot's revealed answer is only 0.0px tall, so it is not
the case the highlight fails on"*. `widgetQaFixes`: *"rationalize-explore: `\tfrac{1}{\sqrt
{2}}` has no box"*. These are not decorative measurements. They are **floors under a
non-degenerate case**, written in exactly the shape that rule asks for elsewhere, and the
first thing they catch is a figure that rendered at zero height. A test that catches a
zero-height render is worth having whether or not a reviewer would accept its number as
evidence for a layout claim.

So the honest reading of the fourth category is narrower than the brief's: **the rule limits
what a box measurement can be cited FOR, not whether it catches anything.** Realising the
3.0% means deleting assertions that demonstrably fail on a real defect, which the brief
forbids and which I have not done. Reported as a finding, not a saving.

### 4b. The 37 files whose expensive half CI never runs

Found while chasing why fifteen frame-capture files, thirteen of them under `city/three/`,
passed in jsdom in 0.0 seconds.

**37 browser test files hold tests behind an `import.meta.env.VITE_*` flag that CI does not
set, across 25 distinct flags, and 157 of the suite's 2,724 tests do not run on any CI run.**
Five files run nothing at all: `city/carryBackFrames`, `city/three/crisisQaFrames`,
`city/three/era4ClaimPostFitShots`, `city/three/successionRulingShots`,
`city/three/crisis/crisisFrameUnchanged`. `city/three/successionRulingShots` is 11 tests, all
skipped.

This is deliberate and argued: `beatTwoGrowsTheIsland.browser.test.tsx`'s header records the
two CI runs that forced its gate — *"an always-on guard that reddens other people's tests on a
two-core runner is worse than a gated one"* — plus a separate `page.viewport` leak that turned
a neighbour's lesson-column measurement red inside a 1024px page it never asked for, and it
names the ungated tests that hold the same claims. It is recorded here for three reasons. It is
**8.5% of the browser suite's measured time for 56 tests that run**. It means a jsdom verdict
on such a file is a verdict on the wrong population, so those 21 files are moved out of
category 2 by an explicit override in the classifier rather than counted as free. And it is the
shape a reader should expect to meet again: the browser suite's most expensive-looking guards
are, in several cases, already switched off.

### 4c. Where the money actually is

| | share of browser time | tests | cat 1 | cat 2 | cat 3 |
| --- | --- | --- | --- | --- | --- |
| top 10 files | **47.8%** | 125 | 6 | **0** | 4 |
| top 20 files | 66.5% | 610 | 11 | **2** | 7 |
| top 50 files | 90.3% | | | | |

The ten most expensive files are 47.8% of the suite and carry 125 of its 2,724 tests.
**Not one of them is category 2**: six need a browser outright, and the four mixed ones are
**97% browser-bound by time**. They are `classifyChipFit` (77.8 s), `caughtUpVitalityShots`
(75.8 s), `titleBackdropFraming` (54.5 s), `catchUpShots` (52.7 s), `cityFraming` (41.0 s),
`eraTwoField` (40.3 s), `classifyNumericCallOrder` (35.3 s), `matchItemFit` (28.6 s),
`chipPressedState` (22.9 s) and `spotTheErrorPalette` (22.4 s) — font fitting, 3D framing and
frame capture, every one a claim a browser is the only place to make. Of the top 20, exactly
two are category 2, and together they are **3.7% of the suite**.

That is the whole shape of the problem in one paragraph. **Category 2 is 103 files and 10.2%
of the time; the ten files that are half the bill need Chromium.**

## 5. The sample migration, priced

Four files, chosen as the largest category-2 files by measured browser time, spanning
`lessons/` and `lessons/interactive/`:

| file | tests | browser | jsdom |
| --- | --- | --- | --- |
| `lessons/cfuVariantRetry.browser.test.tsx` | 249 | 18.7 s | 18.6 s |
| `lessons/spotTheErrorBoards.browser.test.tsx` | 18 | 10.2 s | 10.3 s |
| `lessons/cfuHintGate.browser.test.tsx` | 69 | 8.9 s | 8.9 s |
| `lessons/interactive/EquationTakeLogWalkthrough.browser.test.tsx` | 7 | 4.8 s | 4.8 s |

### What the migration itself took

**The mechanism is a rename and nothing else.** `git mv foo.browser.test.tsx
foo.test.tsx`; `apps/web/vitest.config.ts` includes `src/**/*.test.{ts,tsx}` and excludes
`src/**/*.browser.test.{ts,tsx}`, so the jsdom project collects the file the moment its name
changes and the browser config stops collecting it. This is exactly how `fec121a6` moved
`widgetVariantPool`, and `test/browserModeModuleMocker.test.ts` names it as the preferred
remedy. **All four files passed in the unit suite with zero content edits**: 343 tests, 4
files, green on the first run.

That is the floor on the cost, and it is low. One of the four,
`spotTheErrorBoards.browser.test.tsx`, imports `../styles.css`, which the jsdom project's
`css: false` turns into a no-op — and it still passed, and still caught its injected defect,
because every assertion in it reads class names and `data-latex` attributes rather than
anything the stylesheet decides. A stylesheet import in a browser test is not by itself
evidence that the cascade is load-bearing.

What is not free:

- **Two of the four headers state, in prose, that Chromium is required, and both statements
  are false.** `cfuHintGate`: *"Chromium rather than jsdom, and this file is the reason the
  distinction is not pedantic: jsdom does not implement `inert`, so the containment
  assertions would hold there whether the fix were present or not."* `cfuVariantRetry` cites
  it. The file's assertions are `stage.hasAttribute("inert")` and `stage.contains(working)`,
  and both are ordinary DOM: jsdom implements no `inert` *behaviour* but an attribute is an
  attribute, and `contains` is structure. The injection below settles it. **A migration
  cannot leave those paragraphs standing**, so every such file owes a re-read and a rewrite
  of its own argument, by someone who can tell a wrong reason from a right one.
- **Across all 103 category-2 files: 73 live references to their filenames** in tracked
  `.ts`/`.tsx`/`.mjs`/`.yml`/`.md` outside `work-log/` and `docs/qa-*`, spread over 24 of
  them, and **17 carry a header that argues about Chromium, jsdom or browser mode.** Every
  one of the 73 goes stale on the rename; every one of the 17 has to be re-argued or the file
  left where it is.
- **Each file owes an injected defect in both harnesses.** That is the constraint and it is
  the right one: two runs per file, and someone has to find the defect first, which means
  reading the product source the file is about. For these four that was `widgetFeedback.tsx`,
  `cfu.tsx`, `interactive/kinds/SpotTheError.tsx` and
  `interactive/EquationTakeLogWalkthrough.tsx`.

### The proof: the same defect, both harnesses

Each defect is the one the file was written for. Applied to the product source, run against
the file at its browser name under `test:browser`, reverted, applied again with the file
renamed and run under `test:unit`:

| defect injected | reported by the browser original | reported by the jsdom migration |
| --- | --- | --- |
| `widgetFeedback.tsx`: `{passage?.solution}` moved inside `.lesson-feedback-host__stage` | **1 failed** | **1 failed** |
| `cfu.tsx`: `cfuAsk(cfu, index)` → `cfuAsk(cfu, 0)` (the re-ask serves the same instance, #224) | **62 failed** | **62 failed** |
| `kinds/SpotTheError.tsx`: the offered repair prints the flagged line itself | **17 failed** | **17 failed** |
| `EquationTakeLogWalkthrough.tsx`: `TOLERANCE` 0.0005 → 0.05 (an under-rounded entry accepted) | **2 failed** | **2 failed** |

Not just the counts. **The set of failing test names is byte-identical in all four cases**,
compared with `diff` over the sorted names. The first row is the interesting one: it is the
defect `cfuHintGate`'s header says jsdom could not see, and jsdom names it —
*"the reveal brings the working, outside the frozen stage and outside the passage"* — in
75 ms where Chromium took 182 ms.

### Extrapolating from that rather than from the count

Per file, for a file in the shape of these four: one `git mv`, zero content edits, one defect
to find in the product source, two verification runs. Across the 103, add 73 stale references
and 17 falsified headers, and expect roughly **1 in 21** to fail on a jsdom gap needing a shim
or a rewrite (5 of the 106 the scan proposed did: `DataTransfer`, `getScreenCTM` through a
helper, an env gate, and two rendered-text mismatches). The 49 mixed files are a different job: splitting
a file means deciding where its shared `beforeEach`, mount helpers and module fixtures go,
and each half then owes its own injected defect. Their prize is 64 s, **6.8% of the browser
suite**, for 49 splits.

`browserMockerCanary.browser.test.tsx`'s warning turned out not to bite, and it is worth
saying why rather than reporting it as luck. The mocker is broken in the *other* direction:
`vi.mock` is silently inert in browser mode and works fine in jsdom, so a migration moves
files **towards** the working mocker, and none of these four mocks anything. The delicacy that
did bite is in browser mode: 37 files gated off (§4b), one of them because `page.viewport`
leaked a 1024px window into a neighbour's lesson-column measurement, which is a browser-mode
failure mode with no jsdom counterpart.

## 6. What was checked and is not in the numbers above

- **The nine `packages/` files are all category 2, and five of them should not be.**
  `d1-answer-checker.browser.test.ts` (41 tests), `product-answer-checker` (142),
  `graph-comparator` (38), `item-bank/graph` (8) and `item-bank/product-golden` (38) assert no
  DOM at all: they run pure checker fixtures in Chromium under the heading *"browser/server
  parity"*, and `d1-answer-checker.test.ts` runs the same fixtures in node. By API usage the
  classifier is right that jsdom would serve. **The claim is that the two ENGINES agree, and a
  jsdom run is the node engine, so moving them deletes the claim while leaving every assertion
  green** — which is the brief's own rule, and by it they are category 1 and the classifier is
  wrong about them. All nine `packages/` files together are 0.8 s of 944, so they move no
  figure above; they are named because a count-based sweep would have moved them and lost
  something no assertion would have reported.
- The 5 files whose every test is `.skip`ped in the browser suite today are counted in
  category 1 with 0 s of measured time, which is what they cost.

## 7. Recommendation: do not do this, and here is the cheaper thing

**Do not migrate the browser suite.** The measured saving is **$0.00/day ±$1.18** against a
$52/day bill, because both suites are already single jobs and jsdom costs 1.05x the browser
for exactly the files that could move. Every file moved has to be re-argued in prose,
re-verified against an injected defect, and have its inbound references repaired: 103 files,
73 references, 17 falsified headers, 49 file splits, and the whole of it two days before a
demo, to move seconds from one bill to another.

**The latency case is real and should be taken later, not now.** 17.0% off the tail is
24.3 → 20.4 minutes of feedback for no money, which is the best latency-per-dollar lever in
either document — re-sharding the browser suite into two jobs would buy a similar cut and
cost about $10/day in sharding tax and rounding, which is why T2 removed it. If anybody wants
the four minutes, the order to take it in is by measured seconds and not by file count:
`cfuVariantRetry` and `widgetRevealReAsk` alone are 3.7% of the suite for two renames, and
they are already proven here.

**One thing here is worth landing on its own, and it is not a migration.** Seventeen
category-2 files argue in prose about why they need a browser, and the two this exercise read
closely were both wrong in the same way — a claim about `inert` that the file's own assertions
do not make. Those two headers are corrected in this change, because a false reason in a
docblock is how the next fifteen get written; the other fifteen are not audited here and are
named as unread rather than as sound.

**What would actually move the bill is none of the above.** The three things this measurement
puts numbers on:

1. **The ten most expensive files are 47.8% of the suite and not one of them is category 2.**
   The lever there is making them cheaper, not moving them: `classifyChipFit` spends 77.8 s
   on 13 tests, `caughtUpVitalityShots` 75.8 s on 4. Whether a font-fitting sweep needs 13
   viewports or 3, and whether a city photograph needs to be taken on every run or on demand
   like the 37 files in §4b, are content decisions with real money behind them and no
   coverage loss implied.
2. **The suites are 90.9% of a run and still growing.** The browser job went 961 s → 1,460 s
   inside a day for the same 236 files. Nothing in configuration reaches that.
3. **42.2% of the day is superseded runs on intermediate pushes** (that document's §2), which
   is larger than every suite-level lever in either file and is untouched.

## 8. Constraints, discharged item by item

- **No test deleted, weakened, moved or added.** The diff against `2b3a49c3` is four
  measurement files under `scripts/`, this document, a work-log entry, and two corrected
  docblocks in test files whose stated reason for being in Chromium §5 measures as false. Not
  one assertion changed; both edited files were re-run (318 tests, green). The §5 renames were
  made, measured, verified and reverted, and `git status` was clean before this was written.
- **Every migrated test asserted exactly what it asserted before**, and is shown failing on
  the same injected defect with a byte-identical set of failing test names (§5).
- **No test was added to make the point.** The measurement is a classifier, a throwaway vitest
  config and its two shims, all reading the tree and two vitest json reports.
- **CI usage:** two runs on this branch. Every figure above was measured locally or pulled
  from the Actions API. The first run's `test-unit` went red on
  `era5ExporterSafety.test.ts` — a real-Chromium GLB export whose bytes are pinned, in a file
  `apps/web/vitest.config.ts` cannot reach from this diff — and run **30969100940** on the same
  tree is green in every job, `code-quality` included. The work-log entry has the argument and
  the four checks behind it.

## 9. Reproducing this

```bash
# 1. the browser suite, with per-file and per-test timings
npx vitest run --config vitest.browser.config.ts \
  --reporter=json --outputFile.json=/tmp/browser-run.json

# 2. the same 236 files under jsdom, unedited
npx vitest run --config scripts/jsdom-trial.vitest.config.mjs \
  --reporter=json --outputFile.json=/tmp/jsdom-trial.json

# 3. the classification, priced
node scripts/classify-browser-tests.mjs \
  --timings /tmp/browser-run.json --jsdom /tmp/jsdom-trial.json --csv /tmp/classify.csv

# one file's parse and the reason behind every signal it tripped
node scripts/classify-browser-tests.mjs --audit apps/web/src/lessons/visuals.browser.test.tsx
```

The four injections of §5 are one line each and are quoted in full in that table, so the
proof is reproducible without shipping a tool whose job is to break the product.

Two cautions if this is re-run. The browser job's duration varies **838–1,542 s across 13
consecutive runs**, so take a median over runs and never a before/after pair. And measure
both harnesses **on the same box at the same worker count**: pinning to two CPUs with
`taskset` to imitate the runner does *not* reproduce it — Chromium thrashes and single files
that take 0.3 s at seven workers took 79 s and 131 s at two, which is a local artefact and
not the runner's behaviour, since the runner completes the whole suite in ~1,460 s.
