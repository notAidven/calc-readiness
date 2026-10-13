# All-domain mechanical baseline, at `3fbe5fcb`

Stream B of the all-domain cross-cutting QA round. **Read-only**: this stream edited nothing
and committed nothing. Its only output is this file.

- **SHA**: `3fbe5fcb0ae9acbaefd9301f86c2252af6a06128` (`git rev-parse HEAD`)
- **Worktree / branch**: `C:/Users/<user>/Code/work/wt-all-domain-qa`, `anthony/all-domain-qa`
- **Date**: 2026-08-08
- **Concurrency**: `--maxWorkers=1` throughout; five agents shared the machine.

Every count below is a measurement taken on this tree at this SHA. Nothing is carried over
from `lesson-qa`'s `SKILL.md`, whose own header says each count in it is a reading at a SHA.

## Tree state when each measurement was taken

Four sibling streams share this worktree and two of them inject defects transiently, so
`git status --porcelain` was printed immediately before and after every measurement.

| Measurement | Tree state |
|---|---|
| Snapshot `git hash-object` baseline | **clean** |
| Validator, 10 runs | **clean** before and after |
| Scanner, 10 runs | **clean** before and after |
| `check:lessons` (run 1) | dirty: `qa-derive.mjs`, `qa-derive2.mjs` before; plus `_qa_extract.json`, `apps/web/src/lessons/qaGradingSweepTmp.test.ts` after |
| `check:lessons` (run 2, reproduction) | dirty: the above plus `qa-grading-raw.json`, `qa-pick.mjs`, `qa-replay-wide.mjs` |
| `check:graph` | dirty: 3 sibling scratch files, unchanged across the run |
| `web-reachability` | dirty: 4 sibling scratch files before, 5 after |

**Why the dirt cannot have moved a number, argued rather than assumed.** Every dirty path is
untracked sibling scratch. All but one sit at the repo root, outside every swept path. The
exception, `apps/web/src/lessons/qaGradingSweepTmp.test.ts`, is inside a tree the scanner
sweeps — but the scanner skips test sources by design (`TEST_SOURCE = /\.(test|spec)\.tsx?$/i`
at `scan-lesson-text.mjs:1200`, documented at line 752: *"`*.test.tsx` and `*.spec.tsx` are
skipped on purpose"*).

That is an argument from the source. The measurement that confirms it is the cross-check in
item 2 below: the ten per-domain scanner readings were taken on a **verified-clean** tree, and
each one equals `check:lessons`'s dirty-tree shared-tree reading of 5491 runs / 408 files plus
that domain's own item-bank contribution — exactly, in all ten. A single extra swept file in
the shared tree would have broken all ten identities at once.

## Census

Verified rather than trusted, by counting `*.json` in each `content/lessons/<domain>`:

| d1 | d2 | d3 | d4 | d5 | d6 | d7 | d8 | d9 | d10 | total |
|---|---|---|---|---|---|---|---|---|---|---|
| 6 | 5 | 5 | 8 | 6 | 11 | 4 | 6 | 9 | 2 | **62** |

Matches the plan's census exactly. Independently corroborated three more times: the validator
reported the same per-domain pack count on all ten runs, `check:lessons` reported the same, and
`web-reachability` emitted exactly 2 tests per pack per domain (item 5).

`check:graph` reports **62 live nodes**, so the pack count and the live-node count agree.

## 1. `validate-lesson-pack.mjs --strict`, once per domain directory

Ten runs, each naming a **directory** and never a file list, so the domain-level variety rules
ran. Confirmed from the source that they did: `validateDomainVariety` is gated on
`dirs.length === 1 && packs.length > 1` (`validate-lesson-pack.mjs:2854`), and every one of the
ten domains has at least 2 packs.

| Domain | Packs | Errors | Warnings | Exit |
|---|---|---|---|---|
| d1 | 6 | 0 | 0 | 0 |
| d2 | 5 | 0 | 0 | 0 |
| d3 | 5 | 0 | 0 | 0 |
| d4 | 8 | 0 | 0 | 0 |
| d5 | 6 | 0 | 0 | 0 |
| d6 | 11 | 0 | 0 | 0 |
| d7 | 4 | 0 | 0 | 0 |
| d8 | 6 | 0 | 0 | 0 |
| d9 | 9 | 0 | 0 | 0 |
| d10 | 2 | 0 | 0 | 0 |

**At baseline: 0 errors and 0 warnings on all ten domains, `--strict` exiting 0 on every one.**
No domain is off zero, so there is no finding here. The per-domain error and warning counts are
quoted from `check:lessons`'s summary block, which prints them explicitly; the ten standalone
runs printed `OK: N lesson pack(s) passed validation` with no finding lines, which is the same
reading.

## 2. `scan-lesson-text.mjs`, current three-path form

Invocation, per domain: `content/lessons/<domain> apps/web/src/lessons packages/item-bank/src/<domain>`.

| Domain | Strings | Packs | Prose-shaped runs | Widget files | Exit |
|---|---|---|---|---|---|
| d1 | 218 | 6 | 5630 | 422 | 0 |
| d2 | 299 | 5 | 5632 | 415 | 0 |
| d3 | 197 | 5 | 5663 | 416 | 0 |
| d4 | 366 | 8 | 5792 | 420 | 0 |
| d5 | 556 | 6 | 5711 | 417 | 0 |
| d6 | 456 | 11 | 5933 | 422 | 0 |
| d7 | 307 | 4 | 5638 | 414 | 0 |
| d8 | 1141 | 6 | 5716 | 416 | 0 |
| d9 | 337 | 9 | 5959 | 419 | 0 |
| d10 | 85 | 2 | 5568 | 412 | 0 |

All ten report `no rendering artifacts` and exit 0. **No finding.**

The run and file counts differ per domain only because the domain's item-bank sibling
contributes to both; the shared `apps/web/src/lessons` tree is the same 5491 runs / 408 files in
every run. That decomposition is the cross-check that validates both measurement paths against
each other, since `check:lessons` sweeps the shared tree once, separately:

| Domain | shared tree | + item-bank sibling | = expected | measured |
|---|---|---|---|---|
| d1 | 5491 / 408 | 139 / 14 | 5630 / 422 | 5630 / 422 |
| d2 | 5491 / 408 | 141 / 7 | 5632 / 415 | 5632 / 415 |
| d3 | 5491 / 408 | 172 / 8 | 5663 / 416 | 5663 / 416 |
| d4 | 5491 / 408 | 301 / 12 | 5792 / 420 | 5792 / 420 |
| d5 | 5491 / 408 | 220 / 9 | 5711 / 417 | 5711 / 417 |
| d6 | 5491 / 408 | 442 / 14 | 5933 / 422 | 5933 / 422 |
| d7 | 5491 / 408 | 147 / 6 | 5638 / 414 | 5638 / 414 |
| d8 | 5491 / 408 | 225 / 8 | 5716 / 416 | 5716 / 416 |
| d9 | 5491 / 408 | 468 / 11 | 5959 / 419 | 5959 / 419 |
| d10 | 5491 / 408 | 77 / 4 | 5568 / 412 | 5568 / 412 |

Ten for ten. Note the structural difference worth knowing when reading a CI log: the documented
three-path invocation hands the shared tree to **each** domain run, whereas
`check-lesson-packs.sh` sweeps each domain against its packs plus its item-bank sibling only and
then sweeps `apps/web/src/lessons` once on its own. The union of files swept is the same; the
per-line counts are not, and confusing the two is how a CI figure gets compared against a
skill-documented one and read as drift.

## 3. `npm run check:lessons`

Exit **0**. 10 domains passed at the error tier; 10 domains and the lesson UI tree passed the
prose sweep; 10 item-bank siblings read. Every domain reported `0 error(s), 0 warning(s)`.

Final summary line, verbatim:

```
check-lesson-packs: 10 domain(s) passed at the error tier; 10 domain(s) and the lesson UI tree passed the prose sweep (10 item-bank sibling(s) read; 5491 prose-shaped run(s) across 408 file(s) under apps/web/src/lessons).
```

**The #735 floors are satisfied, and the counts are extracted rather than defaulted.**

| Floor | Value | Measured | Verdict |
|---|---|---|---|
| `MIN_LESSON_UI_FILES` (`check-lesson-packs.sh:135`) | 380 | **408** | satisfied |
| `MIN_LESSON_UI_RUNS` (`check-lesson-packs.sh:136`) | 5000 | **5491** | satisfied |

Extraction is not assumed. The counts are `sed`-extracted at lines 271-272 and default to `0`
when the extraction yields nothing (lines 273-274). A defaulted `0` fails the floor and exits
non-zero at lines 309 and 313. The run printed `5491` and `408` in two independent places and
exited `0`, so the extraction demonstrably matched — a silent default would have been both
visible as `0` and fatal. Reproduced on a second run: identical `5491 / 408`, exit 0.

## 4. The frozen baseline: `git hash-object` over the item-bank snapshots

Taken on a **clean** tree. This is the anchor the verification phase compares against to prove
no item hash moved. 13 files.

| `git hash-object` | File | Bytes | Pinned hashes |
|---|---|---|---|
| `60ad243b4f3bf13ec70354c6b6b7c495e44387ff` | `d1.test.ts.snap` | 3652 | 30 |
| `27f6375b4d488a98ba8b3252cf0ad836d36e0db1` | `d2.test.ts.snap` | 3287 | 25 |
| `40674d1e4cd75255fc06d18c8a7880ac1aed98d6` | `d3.test.ts.snap` | 3369 | 25 |
| `e74c1f952882ac5dc967e2e498f61cd5bfa2fd62` | `d5.test.ts.snap` | 3886 | 30 |
| `c6e301f2a02b404e3e293bf7cc4da59f774eebe1` | `d6.test.ts.snap` | 7283 | 55 |
| `5b71b580ed16cf96b7b49cab050eb8b277ee8b39` | `d7.test.ts.snap` | 2713 | 20 |
| `d7fb56b44e3cc66bab0eff4113069290e93f1b4a` | `d8.test.ts.snap` | 3961 | 30 |
| `d45660be80a3a74abed4f9a3859cf71486468978` | `d9.test.ts.snap` | 6051 | 45 |
| `530fe49a3ad0131f1e944679a55b1bf97b3c62e5` | `d10.test.ts.snap` | 1511 | 10 |
| `9ce45bf7f79f744a05274d3f1cc156f3f003ccb7` | `interactive.test.ts.snap` | 849 | 5 |
| `c549bba35a8190ceec8e2b5cd5506628c09c6694` | `product.test.ts.snap` | 6432 | 90 |
| `c3a7c3551b9486a7430a72ba59b549398990caa3` | `template.test.ts.snap` | 1769 | 24 |
| `e7e79361a77e322ef4028f62bf93302502ae6315` | `walk.test.ts.snap` | 2654 | 36 |

There is **no `d4.test.ts.snap`**. See F1.

## 5. `check:graph` and `web-reachability`

`npm run check:graph` — exit **0**, `All graph invariants PASS. (87 hard edges over 62 live
nodes)`. Lifecycle: 6 `active_mvp`, 56 `active_post_mvp`, 1 `cut`, 3 `retired`; CORE 62.

One printed figure invites a false finding and is not one: `Lesson shells: MVP 3 / full target
45`, against 62 live nodes. `all_shells` is a **set** of `lesson_shell` values
(`graph_invariants.py:111`), so 45 is the number of *distinct* shells shared across 62 nodes,
not a count of nodes that have one. The invariant that every in-product node has a shell is
asserted separately at lines 127-128 and passed.

`npx vitest run --project web-reachability --maxWorkers=1` — exit **0**, 3 files, **318 tests
passed**.

The brief flags this suite as per-directory, so an omitted domain would be a real finding. It is
not omitted, and this was measured rather than inferred from the green. The population in
`apps/web/src/lessons/lessonDomains.reachability.test.ts` is derived from disk — it globs
`content/lessons/*/*.json` and asserts the `LESSON_DOMAINS` id set **equals** the on-disk folder
set, so a domain cannot be authored and left unregistered. It then emits 2 tests per pack:

| Domain | Packs | Reachability tests | 2 x packs |
|---|---|---|---|
| d1 | 6 | 12 | 12 |
| d2 | 5 | 10 | 10 |
| d3 | 5 | 10 | 10 |
| d4 | 8 | 16 | 16 |
| d5 | 6 | 12 | 12 |
| d6 | 11 | 22 | 22 |
| d7 | 4 | 8 | 8 |
| d8 | 6 | 12 | 12 |
| d9 | 9 | 18 | 18 |
| d10 | 2 | 4 | 4 |

124 tests over all 62 packs, all ten domains present, none unreachable. **No finding.**

## The three things the exit codes did not tell us

### R8 is dormant, and the state is the intended one

The state reported on **all ten** validator runs, and in `check:lessons`, was
**parsed-and-empty — the INTENDED END STATE**. Neither fail-open tooling state occurred: the
`was NOT FOUND from here` branch (`validate-lesson-pack.mjs:1216`) and the `was found but COULD
NOT BE READ` branch (line 1224) did not print on any run.

Verbatim, identical on all ten:

```
note: visuals.tsx parsed from <abs path>/apps/web/src/lessons/visuals.tsx: 266 registry entries, 0 of them captioned. R8 (a widget caption may not restate the task already stated in mini_lesson[after]) therefore has nothing to check, and this is the INTENDED END STATE rather than a tooling fault: #179 removed every widget caption on purpose. The rule is dormant, not dead, and reactivates on the first caption anyone adds; the count is pinned at EXPECTED_REGISTRY_CAPTIONS, so that caption appearing is an error here rather than a silent change.
```

Both assertions behind that note hold at this SHA: **266** registry entries parsed against the
`MIN_REGISTRY_ENTRIES` floor of **80**, and **0** captions against `EXPECTED_REGISTRY_CAPTIONS`
of **0**. So R8 had nothing to check, the emptiness is asserted rather than noted, and the parse
is demonstrably not drifted. `0 of 266 captioned` is the reading; note that `SKILL.md` records
`96 registry entries` from an older tree.

### R18 ran; it was not skipped

The line that would prove a skip is, verbatim from `validate-lesson-pack.mjs:2843`:

```
note: skill_graph.json not readable from here; skipping the node-id rule (R18).
```

**That line did not print on any of the ten runs, nor in `check:lessons`.** Its absence is a
positive reading and not merely an absence of bad news, because the branch is gated on exactly
one condition — `if (nodeIds.size === 0)` at line 2841 — so not printing is equivalent to a
non-empty node-id set. Measured directly through the same parse the validator uses: the graph
holds **66 nodes and 66 distinct node ids**. R18 ran against a populated set on every run.

One observation about that guard's shape, which is not a finding at this SHA (see O1).

### The variety figures are the directory's, not any era's

Noted and **not resolved**, per instruction. Each of the ten runs judged variety over the whole
domain directory, pooling packs that belong to different eras — `validateDomainVariety` receives
the directory's packs (`validate-lesson-pack.mjs:2854-2856`). A green R11 on d4's 8 packs or d6's
11 is therefore not an era-level R11 tally for any era inside them. The era-level tally is a
hand check and is outside this stream.

## Findings

### F1 — d4's 40-item practice pool carries no content hash pin, alone among the ten domains

**Severity: P1.** Not a content defect; a hole in the mechanism the round's own verification
phase depends on.

Every other domain freezes its practice pool's ids and content hashes in a snapshot, under a
uniformly named guard — `describe("D<n> pool content pin (a template edit that changes the pool
must be explicit)") > it("pins the frozen D<n> practice pool ids + content hashes")` — present
in `d1`, `d2`, `d3`, `d5`, `d6`, `d7`, `d8`, `d9`, `d10`, with the same shape in
`interactive.test.ts`, `product.test.ts`, `template.test.ts` and `walk.test.ts`. That is 13
guards and exactly the 13 `.snap` files in item 4.

`d4.test.ts` has no such block. Measured, in both directions:

- `packages/item-bank/src/d4.test.ts` contains **zero** occurrences of `toMatchSnapshot`, while
  the other nine domain test files each contain one. It imports `hashItemDefinition` and uses it
  seven times — for **uniqueness** within the pool and for **isolation** against other pools —
  but never for **stability**.
- `git log --oneline --all -- packages/item-bank/src/__snapshots__/d4.test.ts.snap` returns
  nothing: the file has never existed on any branch. This is an omission from the start, not a
  deletion.
- Every domain's pool length equals its snapshot's pinned-hash count, except d4:

  | | D1 | D2 | D3 | **D4** | D5 | D6 | D7 | D8 | D9 | D10 |
  |---|---|---|---|---|---|---|---|---|---|---|
  | pool items | 30 | 25 | 25 | **40** | 30 | 55 | 20 | 30 | 45 | 10 |
  | hashes pinned | 30 | 25 | 25 | **0** | 30 | 55 | 20 | 30 | 45 | 10 |

- The negative is proven exhaustively rather than by grep shape: all 40 `D4_PRACTICE_POOL`
  `item_version_id`s were extracted and searched against the concatenated text of all 13 `.snap`
  files. **0 of 40 are present.** (A bare `d4.` grep returns 5 hits, all of them `d2.rad4.*` ids
  in `d2.test.ts.snap` — a substring coincidence, and the trap that makes the id-level check the
  right one.)

**Why it matters here specifically.** D4's POL.1/POL.2 *assessment* items are pinned, via
`prod.pol-*` ids in `product.test.ts.snap` (12 entries), which is what makes the gap easy to
miss: d4 looks covered. The 40-item *practice* pool is not covered. Prompts are inside
`hashItemDefinition`, so the round's rule that a prose edit to an item-bank prompt must surface
as a moved snapshot hash — and Phase 4's promise to confirm the frozen hashes byte-identical
against this baseline — are **blind to all 40 D4 practice items**, the largest unpinned pool in
the tree and the second-largest domain by pack count. D4 is also a likely fix lane: `qa-d4-round-3`
is one of the reports Stream A is reconciling.

Not proven by injection, because this stream is read-only and an injection requires an edit. The
structural proof above is complete without one: no snapshot contains any D4 practice id, so no
snapshot can move when a D4 prompt does. Whoever fixes this owes the injected red.

## Observations, offered without being findings

**O1 — R18's readability guard has no population floor, where R8's has one.** R8 was given
`MIN_REGISTRY_ENTRIES` (80) precisely so a drifted parse fails instead of reporting nothing.
R18's equivalent check is `nodeIds.size === 0` (`validate-lesson-pack.mjs:2841`), which is a
floor of 1: a parse that recovered a handful of ids from a changed graph shape would run the
node-id rule over a near-empty set, find nothing, and print no note. **Not live at this SHA** —
66 ids parsed from 66 nodes, and `parseNodeIds` reads both `node_id` and `id` and both array and
`{nodes:[...]}` shapes, so it is not currently fragile. Recorded because it is the same fail-open
class the brief asks R18 to be read for, and because the fix is the one R8 already has.

**O2 — two stale counts in a `d4.test.ts` comment.** Line 425 describes the served pool as *"the
25 frozen slots plus the 150 retry variants"*. Measured: `D4_PRACTICE_POOL` is **40**,
`D4_PRACTICE_VARIANTS` is **240**, `D4_PRACTICE_ITEMS` is **280**. The comment was written when
D4 was 5 nodes; `D4_PRACTICE_NODES` now holds 8. Cosmetic, and it touches the same file as F1, so
it is cheap to correct in that lane.

## Coverage statement

Run at `3fbe5fcb` on the tree, all with `--maxWorkers=1`:

- `validate-lesson-pack.mjs --strict` x 10 directories — **0 errors, 0 warnings, exit 0 on all
  ten**, over all 62 packs, with domain variety live on every run.
- `scan-lesson-text.mjs` three-path x 10 domains — **exit 0, no rendering artifacts on all
  ten**, 3962 learner-facing strings over 62 packs, and the shared `apps/web/src/lessons` tree
  at 5491 prose-shaped runs over 408 files.
- `npm run check:lessons` — **exit 0**, twice, both floors satisfied with extracted counts.
- `git hash-object` over 13 `__snapshots__/*.snap` — recorded above, on a clean tree.
- `npm run check:graph` — **exit 0**, 87 hard edges over 62 live nodes.
- `npx vitest run --project web-reachability` — **exit 0**, 318 tests, all 10 domains and all 62
  packs reached.

Not run by this stream, and not claimed: typecheck, lint, `format:check`, the browser suites, and
every empirical grading, guard-population and prose sweep, which belong to streams C, D and E and
to Phase 4.

**One finding (F1) and two observations. Everything the brief named as a documented baseline is
at that baseline.**
