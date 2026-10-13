# Where the GitHub Actions money goes

**Measured over 789 runs, 2026-08-01T00:03Z to 2026-08-04T19:54Z, against `integration` at
`249e11ff`.** Every figure below is derived from the Actions API — the runs endpoint plus
`/runs/{id}/jobs?filter=all` for each of the 789 runs, which yields 4,860 job attempts and
their step timings — rather than estimated, except where a line says **MODELLED**. A finding
expires when the tree moves: re-derive before acting on this if `.github/workflows/invariants.yml`
or the test suites have moved.

The raw pull and the analysis scripts are reproducible from §11.

## The billing model, so every dollar here is reconstructible

GitHub bills **per job, not per run**, from the job's `started_at` to its `completed_at`,
**rounded up to the whole minute**, minimum one minute. Queue time (`created_at` →
`started_at`) is not billed. Every attempt of a re-run bills, which is why jobs are pulled
with `filter=all`.

Every job in this repository runs on `ubuntu-latest` — 4,860 of 4,860 job attempts carried
that single label, no larger runners and no self-hosted. That is the standard 2-core x64
Linux runner, billing SKU `actions_linux`, **$0.006 per minute** on a private repository
([GitHub's runner pricing reference](https://docs.github.com/en/billing/concepts/product-billing/github-actions);
the rate fell ~40% on 2026-01-01 and now includes the $0.002/min Actions cloud-platform
charge). The repository is private, so the minutes are billable rather than free.

**Watch the rate.** At the old $0.008 every figure in this document is a third higher. The
numbers below are all at $0.006.

## The headline: it is worse than $35, and the split is not why

| UTC day | runs | job attempts | real compute | billable min | of which rounding | **cost** |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-01 | 169 | 166 | 1,279 min | 1,374 | 95 | **$8.24** |
| 2026-08-02 | 175 | 162 | 1,887 min | 1,980 | 93 | **$11.88** |
| 2026-08-03 | 249 | 2,012 | 6,526 min | 7,531 | 1,005 | **$45.19** |
| 2026-08-04 | 196 | 2,520 | 7,485 min | 8,772 | 1,287 | **$52.63** |
| **total** | **789** | **4,860** | **17,178 min** | **19,657** | **2,479** | **$117.94** |

**2026-08-04 is incomplete** — the window closes at 19:54Z with four hours of the UTC day
left, and the run rate at that point was ~$5.50/hour. The $52.63 is a floor, not the day.

The reported "$35 in one day" reconciles as a **partial-day reading**. Cumulative spend
crossed $35 at 21:00Z on 08-03 ($35.23) and at 17:00Z on 08-04 ($36.19). Both days then kept
going. So the run rate to plan against is **$45–55/day and rising**, roughly 50% above the
figure that prompted this.

For scale: the included monthly allowance is 2,000 minutes on Free and 3,000 on Pro or Team.
This repository burned **19,657 billable minutes in four days**. Whatever the plan, the month's
allowance was gone inside the first day and everything since is overage — which is the
mechanism behind the 02:56–03:20Z stoppage in §10, not a coincidence beside it.

## 1. Where the minutes go, per job

2026-08-04, all 2,520 job attempts. `test-unit` and `test-browser` are three matrix shards
each, so their attempt counts are ~3x the run count.

| job | attempts | real compute | billable | median | **cost** | share |
| --- | --- | --- | --- | --- | --- | --- |
| `test-browser` (x3) | 573 | 3,808 min | 4,100 | 399 s | **$24.60** | **46.7%** |
| `test-unit` (x3) | 577 | 2,709 min | 2,994 | 299 s | **$17.96** | **34.1%** |
| `infra` | 196 | 209 min | 307 | 62 s | $1.84 | 3.5% |
| `lint` | 196 | 179 min | 249 | 50 s | $1.49 | 2.8% |
| `scope` | 196 | 141 min | 247 | 27 s | $1.48 | 2.8% |
| `typecheck` | 196 | 176 min | 237 | 51 s | $1.42 | 2.7% |
| `build` | 196 | 147 min | 221 | 42 s | $1.33 | 2.5% |
| `content-gates` | 196 | 91 min | 209 | 23 s | $1.25 | 2.4% |
| `code-quality` | 194 | 26 min | 208 | 4 s | $1.25 | 2.4% |
| **total** | **2,520** | **7,485 min** | **8,772** | | **$52.63** | |

**The two test suites are 80.8% of the bill.** The other eleven jobs together are 19.2%, and
the aggregator that carries branch protection is 2.4% — $1.25/day for the required check,
which is the cheapest thing in the file.

By trigger:

| trigger | runs | billable | **cost** | share | min/run |
| --- | --- | --- | --- | --- | --- |
| `pull_request` | 150 | 6,598 | **$39.59** | 75.2% | 44.0 |
| `push` (all on `integration`) | 46 | 2,174 | **$13.04** | 24.8% | 47.3 |

## 2. Merges versus iteration

150 pull-request runs on 2026-08-04 across **60 distinct head branches** — median 2 runs per
branch, mean 2.5, max 15 (`evan/era5-runtime-wiring`, 785 billable min, $4.71 on its own).
49 PRs merged that day and 51 the day before, so the "twenty-five merges" estimate was about
half the real figure.

Splitting each branch's runs into the final one (whose green is what a merge actually needs)
and the superseded earlier ones:

| | runs | billable | **cost** | share of day |
| --- | --- | --- | --- | --- |
| final run per branch | 60 | 2,900 | $17.40 | 33.1% |
| **superseded earlier runs** | **90** | **3,698** | **$22.19** | **42.2%** |
| post-merge trunk runs | 46 | 2,174 | $13.04 | 24.8% |

**So 42.2% of the day is agents re-running full CI on intermediate pushes.** That is the
single largest line in the whole measurement — bigger than the CI split, bigger than the
trunk duplication.

It is also mostly irreducible by cancellation, and that is measured rather than assumed.
`cancel-in-progress` is already true for `pull_request` and it is working: 29 of the 150 PR
runs were cancelled. But of the 90 superseded runs, **61 ran to completion before a successor
existed at all** — the next push arrived after they had already finished, so there was
nothing to cancel. And the 29 that were cancelled still billed a median of 33 minutes of the
46 a full run costs, because all thirteen jobs start within seconds of each other and are
most of the way done by the time the agent pushes again. Cancellation is at its ceiling here.

## 3. The duplication

Every merge runs CI twice — once on the PR at its head, once on `integration` after the
squash. The post-merge half is **46 runs, 2,174 billable minutes, $13.04/day, 24.8% of the
bill**.

That is the real price of the trunk run, and it is not a candidate for removal: §8 records
why. There is no dedup available inside it either. Across all 196 runs on 2026-08-04 there
were 196 distinct `head_sha` values and **zero** repeats, so no run was re-testing a tree
another run had already proven. (A `pull_request` run tests the merge of head into base
anyway, so the same head against a moved base is a different tree; head-SHA equality would
not have been a sound skip condition even if it had occurred.)

## 4. The hypothesis: did the CI split trade money for latency?

PR #478 merged at 2026-08-03T19:35:51Z. The transition is clean in the data — 1 job per run
before, 13 after, first 13-job run at 18:09Z on the PR's own branch — so this is a natural
experiment rather than a reconstruction.

**The hypothesis is directionally right and an order of magnitude too large.** The guess was
"setup is two minutes and there are thirteen jobs, so 26 minutes of pure overhead". Measured
from step timings on jobs whose gates actually ran:

| job | x per run | median overhead | median gate work | overhead/run |
| --- | --- | --- | --- | --- |
| `scope` | 1 | 20 s | 0 s | 20 s |
| `content-gates` | 1 | 18 s | 1 s | 18 s |
| `lint` | 1 | 35 s | 11 s | 35 s |
| `typecheck` | 1 | 34 s | 12 s | 34 s |
| `build` | 1 | 34 s | 4 s | 34 s |
| `infra` | 1 | 34 s | 22 s | 34 s |
| `test-unit` | 3 | 34 s | 236 s | 102 s |
| `test-browser` | 3 | 56 s | 318 s | 168 s |
| `code-quality` | 1 | 0 s | 0 s | 0 s |
| **total** | **13** | | | **445 s = 7.4 min** |

Per-job fixed overhead is **34–56 seconds, not two minutes**, because the caching is already
good (§5). Total overhead is **7.4 minutes of the ~40 minutes of compute in a full run —
20.6%**, not 26 minutes.

### The sharding tax, measured on one day so suite growth cannot confound it

Comparing pre-split and post-split runs across days would blame sharding for something else
entirely (§6). Taken within 2026-08-03 alone, where both shapes ran:

| suite | unsharded, one step | summed over 3 shards | compute multiplier |
| --- | --- | --- | --- |
| `test:unit` | 568 s | 617 s | **1.09x** |
| `test:browser` | 729 s | 934 s | **1.28x** |
| both | 1,297 s | 1,551 s | **1.20x** |
| tail (wall clock) | 729 s | 439 s | **0.60x** |

So sharding costs ~20% extra suite compute and buys a 40% shorter tail. The browser suite
pays more of the tax than the unit suite, and its shards are the more unbalanced of the two
(sum / 3x slowest = 0.76 against the unit suite's 0.90), so a third of the files is not a
third of the work.

### What undoing the split would actually recover

Replaying 2026-08-04's real jobs with the step durations altered and **re-rounded per job**,
which matters enormously: under per-job minute rounding, shaving seconds off a 23-second job
saves nothing at all, and the naive "12 s x 13 jobs" arithmetic is simply wrong.

| shape | $/day | vs today | feedback per run | vs today |
| --- | --- | --- | --- | --- |
| **3 shards per suite (today), 13 jobs** | **$52.63** | — | **9.4 min** (observed median) | — |
| 2 shards per suite, 11 jobs | $51.09 | −$1.54 | ~8.7 min MODELLED | +2.1 min |
| 1 shard per suite, 9 jobs | $45.10 | −$7.53 | ~15.0 min MODELLED | +8.5 min |
| one job, the pre-#478 shape | $41.28 | −$11.35 | ~28.4 min MODELLED | +21.9 min |

The MODELLED wall clocks take the slowest job as the critical path: (suite work ÷ shards) x
the interpolated sharding tax, plus that job's own setup, with suite work and setup at
2026-08-04 medians. The model gives 6.6 min for today's shape against an observed 9.4 min
median, so it understates by ~2.8 min of scheduling and job-start overhead; read the deltas,
not the absolutes.

**So the answer to the hypothesis is: the split accounts for 21.6% of the bill, and undoing
it entirely buys back $11.35/day at the cost of 22 minutes of feedback on every run — about
$0.52/day for each minute of added latency.** It is a real lever and it is not the driver.
The intermediate options are genuinely intermediate: dropping to two shards per suite is
almost free in both currencies and saves almost nothing, while dropping to one shard per
suite captures two-thirds of the money for a third of the latency.

## 5. The cheap wins the brief hoped for are already taken

This is the most useful negative result in the document. All four were checked against real
step timings, and there is no material money in any of them.

**Dependency caching is working.** `actions/setup-node` with `cache: npm` is on all eight
jobs that install, keyed on both lockfiles so they share one cache entry. Across 3,316 `npm
ci` steps on 08-03 and 08-04: **median 12 s, p90 14 s, p99 16 s, and exactly one step over
20 s.** A 510 MB `node_modules` installs in twelve seconds. There is no missing-cache win.

**Caching `node_modules` itself would probably be slower, not faster.** The tree is 510 MB;
a restore of that is not reliably quicker than the 12 s `npm ci` it would replace. Priced at
an optimistic 12 s → 3 s it is worth $1.60/day, and that is the ceiling on a change whose
real effect might be negative. Not recommended.

**Browser binaries are already cached, and the cache is hitting.** The Playwright cache is
keyed on the resolved Playwright version so a bump invalidates it automatically. Over the two
days: **1,063 hits to 42 misses, a 3.8% miss rate, costing 19.8 minutes total — $0.12.**

**Total cost of every cache miss in the repository over two days: $0.13.** There is nothing
here.

**Concurrency cancellation is already on** for `pull_request`, and §2 measures why it cannot
do much more.

### The one cheap win that does exist, and has quietly stopped firing

The scope filter is supposed to make a prose-only change cheap. **Post-split it fires on 4 of
203 completed pull-request runs — 2.0%.** Over the whole four-day window it is 48 of 506, 9.5%.
The workflow's own comment says *"20% of the 302 pull-request runs since 2026-08-01 took that
path"*; measured over that exact window — the first 302 PR runs, ending 2026-08-03T16:40Z — this
pull reads **13.9%**, and post-split it has collapsed to 2.0%. Meanwhile **31 of the 185
first-parent merges in the window (17%) were prose-only by their own diff**, so the content the
filter exists for is still arriving.

**The mechanism, demonstrated on the pull request that carries this document.** The scope step
diffs `pull_request.base.sha`..`head.sha`. GitHub sets `base.sha` to the base branch's tip, not
to the merge base, so when a branch is behind `integration` that diff carries every commit that
landed on `integration` since the branch point, seen in reverse. This PR changes exactly one
file:

```
$ git diff --name-only $(git merge-base $BASE $HEAD) $HEAD
docs/2026-08-04-ci-cost-measurement.md          # 1 file, 0 non-inert

$ git diff --name-only $BASE $HEAD               # what the scope step computes
...86 files, 80 of them non-inert
```

So this documentation-only PR answered `code=true` and billed the full thirteen-job gate set.
Confirmed on the runner, not inferred: run 30948399787's `lint` job ran `format:check` and
`lint` rather than skipping them, and the run billed **54 minutes across 13 jobs, $0.32**, where
the cheap path is 13 minutes and $0.08. A one-file prose change paid 4x.

**Measured across 2026-08-04, and much smaller than that story suggests: 7 of 150 PR runs
(4.7%) had a prose-only own diff and billed the full gate set — 317 minutes, $1.90, 3.6% of the
day. Taking the cheap path they would have billed 91 minutes, so the saving is $1.36/day
(2.6%).** One branch, `cursor/archipelago-arrangement-design-9a2b`, accounts for five of the
seven: its own diff was 11 prose files while the scope step saw between 381 and 696.

**Not landed, and this is the one recommendation here I would most like to make and least like
to act on alone.** Using `git merge-base` is the correct question — it is what GitHub's own
"Files changed" tab shows — and the reasoning that it is safe is sound but subtle: if a PR's own
diff touches no code, the merge of that branch into the base has the base's code exactly, and
the base's own push run is the verdict on it. That reasoning is *precisely* the shape the brief
rules out. It makes the filter skip gates in cases where it currently does not, which is the
false-green direction, on the single most protected mechanism in the repository, two days before
a demo, for 2.6%. It belongs in the trade table (T8) and not in this branch.

### One cache finding that is not about money yet

Cache **storage** is at **9.03 GB across 44 entries** against a 10 GB per-repository
allowance — 97%. Storage is not billed, it is evicted, so this shows up as future cache
misses rather than as a line on the invoice. The occupancy is dominated by scope duplication:
**14 copies of the identical key `ms-playwright-Linux-1.61.1` at 0.255 GB each**, twelve of
them in per-PR `refs/pull/N/merge` scopes, plus **30** `node-cache-Linux-x64-npm-*` entries at
0.147–0.209 GB across five distinct lockfile hashes. A cache written by a PR run is scoped to
that PR and is unreadable by any other branch, but it occupies the allowance until evicted.

The obvious fix does not pay for itself, and the arithmetic is worth spelling out because it is
the same trap as §4's. A `pull_request: closed` workflow deleting that PR's cache entries would
free several GB and could not touch `invariants.yml`, so it is safe — but it is a job, and a job
bills a **whole minute** however few seconds of API calls it makes. At ~50 PRs closed per day
that is 50 billable minutes, **$0.30/day, to recover the $0.065/day** that every cache miss in
the repository currently costs. It would be a net loss of roughly 5x.

So this is recorded as headroom rather than savings: nothing to do at 97%, and the thing to
watch is the miss rate in §5, not the occupancy. If the allowance is ever genuinely exceeded,
the cheap answer is to shrink what is cached rather than to add a job that prunes it.

## 6. The finding nobody was looking for: the suites are growing 40%/day

This is the term that actually explains the bill, and it is not a structural property of CI
at all.

| day | suite seconds per run | growth |
| --- | --- | --- |
| 2026-08-01 | 652 s | — |
| 2026-08-02 | 946 s | +45% |
| 2026-08-03 | 1,297 s | +37% |
| 2026-08-04 | 1,873 s | +44% |

**2.9x in three days.** (Post-split figures sum the three shards, so ~20% of the last two
rows is the sharding tax from §4; net of it the growth is still ~2.4x.) Test execution alone
is 1,873 s x 196 runs = **6,118 minutes/day, $36.71 — 70% of the entire bill just running
the tests.** No amount of caching, cancellation or resharding touches that number.

**This is the suites growing and not the runners slowing down**, which matters because
durations alone cannot tell those apart. Counted off `integration` at midday on each of the
four days, the test files themselves grew with the clock:

| day | `.browser.test.tsx` files | all test files |
| --- | --- | --- |
| 2026-08-01 | 115 | 440 |
| 2026-08-02 | 175 | 497 |
| 2026-08-03 | 192 | 600 |
| 2026-08-04 | 213 | 697 |

Browser test files went **115 → 213 (1.85x)** and all test files **440 → 697 (1.58x)** while
suite compute went 2.9x, so duration outran file count. Newer browser tests are more expensive
per file than older ones — the crisis renders and screenshot atlases arriving this week are
whole-frame captures — which is the second half of the growth and the half that will not slow
down on its own.

Holding run volume and job shape fixed and letting the measured growth rate continue:

| | suite/run | billable/day | **cost/day** |
| --- | --- | --- | --- |
| today | 1,873 s | 8,772 | **$52.63** |
| +1 day at +44% | 2,697 s | 11,145 | **$66.87** |
| +2 days | 3,884 s | 14,546 | **$87.28** |
| +3 days | 5,593 s | 19,463 | **$116.78** |

That is MODELLED, and the growth rate will not hold indefinitely. But it is measured over
four consecutive days and it dwarfs every structural lever in this document. **Undoing the
CI split buys $11.35/day; one more day of suite growth at the observed rate costs $14.24.**
Any decision taken on the basis of the split alone will be overtaken within a day.

Note what this is *not*: it is not an argument for deleting tests. **11,662 unit tests** across
528 collected files (the workflow's comment still says 10,510, which is how fast this is
moving), plus 229 browser test files on this branch, are the reason this repository can merge 49
PRs in a day from ~20 parallel agents at all. It is an argument for knowing the number and
deciding deliberately, because right now the cost per day is being set by whoever adds the next
browser test, and nobody is being told what it costs.

## 7. The safe changes: what was landed, and what turned out to be a trap

**Nothing was landed that changes CI.** Both candidates the brief named — caching and
concurrency cancellation — are already in place and already effective (§5), and the three
remaining candidates were measured and rejected: the two below, plus the scope filter's base ref
in §5, which is the largest of the three at $1.36/day and also the one that touches the most
protected mechanism in the file. Reporting per item:

### 7a. Sparse checkout, excluding `output/` — REJECTED, with a reproduction

The premise measures true. The checkout tree is **754.8 MB in 3,721 files**, of which
`output/` is **520.2 MB (69%)** and `docs/` a further 129.1 MB (121.5 MB of it PNG). Every
one of the thirteen jobs downloads all of it on every run — 196 runs x 13 jobs x 520 MB is
**~1.3 TB/day** of transfer for a directory `biome.json` explicitly excludes. `actions/checkout`
applies `--filter=blob:none` automatically when `sparse-checkout` is set
(`src/git-source-provider.ts:168`), so the saving would be real bandwidth and not just disk
writes. A local sparse clone drops the worktree from ~760 MB to **242 MB**.

The gate-safety checks all passed. Built as a real sparse clone with `git sparse-checkout set
--no-cone '/*' '!/output'` and run there: `format:check`, `lint`, `typecheck`,
`build -w @cr/web`, `check:graph` and `check:lessons` **all exit 0**. `biome check
output/citizens-shot.mjs` reports the path "provided but ignored", so lint provably never
reads it. No `tsconfig.json` reference reaches `output/`; no `apps/web` import reaches it.
`git ls-files` still reports all 3,721 paths including the 782 under `output/`, so
`repoFileCasing.test.ts` is unaffected, and `git diff --name-only A B` returns output byte-
identical to a full checkout, so the scope filter is unaffected.

**Then the unit suite failed: 8 files, 12 tests.**

```
FAIL |repo-hygiene| test/successionPropagation.test.ts > every topology exemption still exists
Error: ENOENT: no such file or directory, open
  '.../output/claude-design/era-01-winter-mechanics/shipped-code/CrisisStatusMarker.tsx'
```

`output/` is not only generated art. It holds **121 tracked code and prose files, 5 of them
`.ts`/`.tsx`**, under `claude-design/*/shipped-code/`. `trackedSources()` in
`successionPropagation.test.ts` is `git ls-files -- '*.ts' '*.tsx'` followed by
`readFileSync` on each result — and since `git ls-files` still lists the sparse-excluded
paths (the property that made `repoFileCasing.test.ts` safe), it hands the reader files that
are not on disk. **Twenty-three files under `test/` derive a population from `git ls-files`**,
and any of them that goes on to open what it lists has the same exposure.

Even restricted to the jobs that provably pass, the change is worth **$1.22–1.75/day
(2.3–3.3%)**, because most of the light gates finish in 23–51 s and bill one minute either
way. The money is only in `infra`, which sits at a 62 s median right against the 60-second
rounding boundary — 109 of 196 `infra` jobs bill two minutes today and a 65% checkout cut
would take 60 of them back to one.

**Rejected: a 2–3% saving is not worth touching every job's view of the tree two days before
a demo, in a directory that turns out to contain source files that repo-wide guards read.**
Recorded here so that the next person to reach for the obvious win has the reproduction
rather than a red suite. If it is ever revisited, the exclusion has to be by extension and
not by directory, and it owes a guard test that derives the gate-input population from source
and fails when a reader appears under an excluded path.

### 7b. Skipping `playwright install-deps` on a cache hit — REJECTED as a trade

`Install Chromium system dependencies (browser restored from cache)` runs on every cache-hit
`test-browser` job — 14 s x 3 shards, worth **$1.39/day** re-rounded. But the step exists so
that a cache-hit run has the same font environment as a cache-miss one, and the browser suite
is full of screenshot and layout assertions. Removing it risks rendering drift in exactly the
tests that would notice, which makes it a trade and not a saving. It would first need a
measurement establishing that `install-deps` is a no-op on the current runner image — which
is a runner experiment, not a code reading. **NOT DONE.**

## 8. What was deliberately not touched

Each of these was priced, and each is left exactly as it is. First, though, both protections
were checked at the current tip rather than taken from the workflow's comment, because a
protection nobody has re-measured is a claim and not a guarantee.

**#436's false-green class is closed, and it was twice as wide as the file records.** The
workflow header enumerates twelve push runs that reported `success` with no gate run, over
2026-08-01T21:12 to 2026-08-03T00:38. Detecting the same signature independently — a push run
whose every gate step reported `skipped` — this pull finds **24**, from 2026-08-01T01:37 to the
same 2026-08-03T00:38, and all twelve named in the header are among them. All 24 concluded
`success`. #436 merged at 2026-08-03T15:20:53Z, and across **all 97 push runs since that last
false green, zero took the cheap path** and zero allocated no jobs. So the class is genuinely
closed, and the header's count is an undercount rather than the whole list.

**No live false green anywhere in the window.** Two runs initially looked like one — a code diff
whose gates did not run — and both turn out to be cancelled runs, where the gate steps never
started rather than being skipped. In both, `code-quality` reported `failure`, which is the
aggregator doing exactly what it was built for. Runs 30874397274 and 30936221582.

**The #430 class is closed too, and it was also wider than recorded.** 24 runs allocated zero
completed jobs. All 24 are `push` runs on `integration` with conclusion `cancelled`, which is
exactly that defect's signature; the workflow header puts it at nineteen. All 24 are on
2026-08-01 and 08-02 and there are none since.

**The scope filter's `code=true` for every push.** Its reasoning — *"a push run on integration
asks whether that tree is green, which no diff can answer"* — is correct and load-bearing,
and the class it closed is the 24 push runs above. Nothing here goes near it, and §5's T8 is
filed as a recommendation for the same reason. The `scope` job also keeps its full checkout
(§7a) even though the sparse change would have been safe there, because it is the one job
that runs `git diff` and the ~$0.30/day was not worth the question.

**The trunk push run.** $13.04/day, 24.8% of the bill, the largest single removable line, and
not removable. It caught `5d039a99` today on a failure in neither side's diff. Verified
present in the tree: *"Era four's remaining assets… (#540)"*.

**Every test.** No test was deleted, skipped or weakened. §6 reports the suites' cost and
growth rate as a finding, which is what a too-slow test is owed.

**The aggregator and its `needs:` list.** `code-quality` is the sole required status check on
`integration`, matched by name. It bills $1.25/day. Folding the five light gates into one job
would save **$6.19/day (11.8%)** with no loss of coverage — every gate would still run, as
`if: always()` steps of a shared job, and the wall-clock cost is nil because the tail is a
browser shard at ~7 minutes and the folded job would take ~90 s. It is listed under trades
rather than landed because it would rewrite the required check's dependency list and
`EXPECTED_GATES` two days before the demo, and it costs per-gate status contexts and the
ability to re-run one gate alone. That is the lead's call, not mine.

**`fail-fast: false` on both matrices.** Deliberate, documented, and its cost is real: a
30-second lint failure does not stop six test shards running for another seven minutes.
Changing it would be a signal trade.

## 9. The trades, priced, for the lead to choose

Dollars are per day at 2026-08-04's volume (196 runs), re-rounded per job against real step
data. Nothing in this table is landed.

| # | change | saves/day | costs | risk |
| --- | --- | --- | --- | --- |
| T1 | Fold the 5 light gates into one job (13 → 8) | **$6.19** (11.8%) | per-gate status contexts; single-gate re-runs | touches the required check's `needs:` list |
| T2 | 1 shard per suite instead of 3 (13 → 9 jobs) | **$7.53** (14.3%) | +8.5 min feedback per run MODELLED | low; shard counts are documented as the lever |
| T3 | Undo the split entirely (one job) | **$11.35** (21.6%) | +21.9 min feedback per run MODELLED; a failed gate hides the rest | reintroduces the sequential-gate behaviour #478 removed |
| T4 | Gate drafts: no CI until marked ready | **$3.43** (6.5%) | a draft nobody has tested cannot merge quickly | medium; changes the agent workflow |
| T5 | 2 shards per suite instead of 3 | $1.54 (2.9%) | +2.1 min feedback MODELLED | very low, and worth very little |
| T6 | Skip `install-deps` on a Playwright cache hit | $1.39 (2.6%) | possible font/rendering drift in the browser suite | see §7b |
| T7 | Sparse checkout on the light gates only | $1.22–1.75 | see §7a | see §7a |
| T8 | Scope filter: diff `merge-base..head`, not `base.sha..head` | **$1.36** (2.6%) | nothing in feedback time | **highest** — makes the scope filter skip gates it currently runs; see §5 |
| — | Drop the trunk push run | $13.04 | **the only verdict on merged trees** | ruled out, §8 |
| — | Drop the browser suite | $24.60 | 229 browser test files | ruled out, §8 |

**On T4 specifically, because the brief asked for it to be thought about rather than
dismissed.** Draft state was reconstructed per run from `ReadyForReviewEvent` /
`ConvertToDraftEvent` timelines rather than from the PRs' current flags, because agents open
as draft and mark ready later. On 2026-08-04, **30 of 150 PR runs fired while their PR was a
draft — 1,232 billable minutes, $7.39, 14.0% of the day.** 14 of the 60 branches never left
draft. But the honest saving is well under that: a PR marked ready with no prior run still
needs a full green run before it can merge, so that run does not disappear, it moves. Only the
**superseded** draft runs are waste — **16 runs, 571 minutes, $3.43/day, 6.5% of the day**,
which is the figure in the table. It is the smallest of the four real levers and the one that
most changes how the agents work, so it is also the one whose second-order effects are hardest
to predict: an agent that cannot see CI on a draft either tests locally or marks ready earlier,
and the second of those recovers nothing.

T1 and T2 are close in value and independent, so they compose: together they are ~$13.70/day
for ~8.5 minutes of added feedback and no coverage change at all. That is the combination
worth looking at first if the answer is not "accept the cost".

## 10. Two reliability findings the cost pull turned up

**The billing outage is visible in the data, and its signature is a false red.** Eleven job
attempts across **seven** runs between 02:56Z and 03:19Z on 2026-08-04 report `failure` having
executed **zero steps** — runs 30873259639, 30873292650, 30873299011, 30873779392, 30873859178,
30873953033, 30873959202, in the `scope` and `code-quality` jobs. All seven were `pull_request`
runs, so no trunk verdict was lost. `work-log/gabe.md` records the same thing happening before,
under its 2026-07-27 heading, from ~16:31Z: *"every run since ~16:31 UTC fails in seconds with
'recent account payments have failed', empty step lists, no logs"*. So this is the second
occurrence, not the first.

Worth knowing that a spending-limit stop is **indistinguishable in the checks UI from a genuine
gate failure**, and the tell is an empty step list. It is also not a coincidence beside the cost
finding but a consequence of it: at 19,657 billable minutes in four days, a 2,000–3,000 minute
monthly allowance is gone inside day one, and everything after that is overage against a
spending limit.

**Two `test-browser` shards hit the 25-minute timeout cap and were cancelled**, on
2026-08-03: run 30855414018 (a **push to `integration`**) and run 30855593473. A job killed
at its cap bills the full 25 minutes and reaches no verdict, and because that one was a push
run, **that trunk commit has no verdict** unless somebody re-ran it. p99 for the job is 15.7
minutes, so the cap is not badly set; this looks like a hang rather than slowness and is
worth a look on its own terms.

Queue delay, incidentally, did not degrade when the concurrent-runner demand went up 13x, and
the workflow's comment flagging that as a risk can be retired: median job queue time is 4 s
both before and after the split, p90 11 s → 12 s. Only the tail moved, p99 15 s → 50 s.

## 11. Reproducing this

```bash
# 1. every run in the window (8 pages of 100)
for p in 1 2 3 4 5 6 7 8; do
  gh api "/repos/<org>/calc-readiness/actions/runs?per_page=100&page=$p&created=>=2026-08-01" \
    --jq '.workflow_runs' > runs_p$p.json
done

# 2. every job attempt of every run -- filter=all, because re-runs bill too
gh api "/repos/<org>/calc-readiness/actions/runs/${id}/jobs?filter=all&per_page=100"

# 3. billable minutes for one job attempt
#    max(1, ceil((completed_at - started_at) / 60))   x   $0.006
```

`/runs/{id}/timing` is **not** usable here: it returns `total_ms: 0` for every job on this
repository, so billable time has to be computed from job timestamps as above.

Four things to keep hold of if this is re-run later, each of which produced a wrong number here
before it produced a right one.

**Round per job before summing.** Otherwise every overhead saving is overstated: "12 s x 13
jobs = 2.6 min" is not a saving at all when eleven of those jobs finish in under a minute either
way. A candidate change has to be replayed against the real per-job durations and re-rounded.

**Compare shapes within a single day.** §6's suite growth is 40%/day, so any before/after that
straddles a day silently attributes it to whatever else changed. The sharding tax in §4 is a
same-day measurement for exactly this reason.

**Do not compute a merge base against today's tip.** §5's first cut did, and got $8.88/day. For
any head that has since merged, head is now an ancestor of `integration`, so the merge base *is*
head, the diff comes back empty, and an empty diff classifies as prose — which made 40 runs look
mis-scoped when 7 were. Resolve the base branch's tip **as of the run's `created_at`** and take
the merge base against that. The corrected figure is $1.36/day, six times smaller.

**Do not read a cancelled run as a skipped one.** A cancelled job's gate steps never started, and
counting that as "the gates were skipped" invents false greens that are not there — it invented
two here. Check the job conclusions before believing a run took the cheap path.

And take the runner rate from GitHub's current pricing reference rather than from this document,
because it moved by 40% seven months ago and this whole file scales linearly with it.
