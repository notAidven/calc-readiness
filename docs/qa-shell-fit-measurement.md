# The lesson shell's vertical fit, measured on the learner's mount at 1024x580

> **Read §7 with §1.** Sections 1 to 6 are the BEFORE, measured at `da781d1f` with nothing
> changed. Section 7 is the same sweep re-run on the same mount at the same viewport with the
> fix in, and it also corrects one claim in §1 and §3 that turned out to be an assumption
> rather than a measurement: the Town Hall does render an advisor bubble.

**Measurement only. Nothing in this branch changes a rule of layout, a stylesheet or a
component.** The one product file added is a harness,
`apps/web/src/lessons/shellFitMeasure.browser.test.tsx`, which asserts that the surface it
measured is the shipped one and asserts nothing at all about the fit.

- Tree: worktree `wt-held-fit`, branch `anthony/held-fit`, based on `da781d1f`
  ("The audibility sweep lands…", #630). Every file:line below was re-read at that tip.
- Viewport: **1024x580**, on every number and every frame. Named beside each one because the
  quantities are `vh`-denominated and resolve differently on a taller screen.
- Surface: **the learner's**, `d1LessonHost.render(...)` — the real host the city opens, which
  passes `size="large"` (`apps/web/src/city/d1LessonHost.tsx:25`). Never `?dev`.
- Frames: `.qa-frames/fit-2026-08-05/`, confirmed ignored — `git check-ignore -v` reports
  `.gitignore:21:.qa-frames/`. Untracked, so they are not in the commit.
- Command: `npx vitest run --config vitest.browser.config.ts
  apps/web/src/lessons/shellFitMeasure.browser.test.tsx --maxWorkers=1`. 21 tests, all passed,
  135.6s. No worker-start failure and no screenshot timeout, so nothing here is a saturation
  artefact. Run twice (135.6s and 169.2s, the spread being this machine under three concurrent
  agents); the spot-checked readings — D9's sweep and D7's completed board — came back
  **identical to the tenth of a pixel**, so the numbers below are reproducible rather than one
  draw. `npm run typecheck` (`tsc --build`, whole monorepo) exits 0 with the harness in the tree.

## How the surface was reproduced, and why it is the host rather than a facsimile

`reviewCardContainment.browser.test.tsx:97-124` rebuilds the card chain by hand, and it is
explicit that it does so to reach a review scroll. This file mounts `d1LessonHost` instead: the
same component the city lane renders, so the frame classes, the banner, the sound toggle, the
action tray, the advisor and the gate all come from the product. Read back off the mount rather
than assumed:

- `world-scene coc-popup world-scene--large`, with **no** `world-scene--full`;
- computed `max-height` on `.coc-card` = **522px**, which is `90vh` of 580 in force
  (`apps/web/src/styles.css:3907`);
- viewport read back from `window.innerWidth/innerHeight` as `1024x580`.

Those four are asserted on every surface below. If the mount ever drifts to the dev frame, or
to another viewport, the harness fails instead of reporting a number.

**Which board each domain is measured on is derived, not tabled.** The advisor walk cannot step
*past* a gated slide without satisfying its gate, so the only board a learner-faithful walk
reaches unaided is a lesson's **first** gated activity slide. So the harness probes every one of
the 62 lessons' first-gated boards bare in the 920px reading column (`board-heights.json`) and
takes each domain's tallest. A hardcoded list of node ids would have rotted; the rule is stated
and re-derived on every run.

## 1. Per-surface readings, all at 1024x580

Every row: card 522px (the 90vh cap, binding), action tray 70px, card border 2px a side. The
banner is 101px where the lesson title fits one line and **148px where it wraps to two**, which
is why two rows have a 300px well instead of 347px.

| surface | node | board | banner | body usable | body content | advisor bubble | space left for board | board natural | board NOT visible |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|
| D1 | NUM.2 | `pemdas-key-explore` + `pemdas-mnemonic-explore` | 101 | 347 | 856 | 190.7 | 116.3 | 592.9 | **476.6** |
| D2 | RAD.4 | `magnitude-root-play` | 101 | 347 | 652 | 190.7 | 116.3 | 389.2 | **272.8** |
| D3 | LIN.3 | `formula-target-match` | 101 | 347 | 680 | 245.1 | 61.9 | 363.0 | **301.0** |
| D4 | POL.4 | `complete-square-drag` | 148 | 300 | 800 | 245.0 | **15.0** | 483.0 | **468.0** |
| D5 | RAT.5 | `rational-gauge-domain-explore` | 101 | 347 | 771 | 217.9 | 89.1 | 481.1 | **392.0** |
| D6 | CG.1 | `coordinate-plot-stepper` | 101 | 347 | 951 | 245.1 | 61.9 | 633.5 | **571.6** |
| D7 | LF.2 | `linear-line-form-build` | 101 | 347 | 869 | 217.9 | 89.1 | 579.0 | **489.9** |
| D8 | EL.4 | `log-mirror-explore` | 101 | 347 | 920 | 245.1 | 61.9 | 602.7 | **540.7** |
| D9 | TRG.3 | `trg-unitcircle-explore` | 101 | 347 | 1067 | **272.2** | **34.8** | 722.4 | **687.6** |
| D10 | GEO.2 | `geo-paving-classify` | 148 | 300 | 640 | 190.7 | 69.3 | 377.0 | **307.7** |
| Town Hall | era one, interleaved | `EraInfinitePractice` → `InfiniteDrill` | 101 | 347 | 367 | n/a (no bubble) | 178.0 | 166.4 | **0** |

Definitions, so no column is read as something it is not:

- **body usable** = `.coc-card__body.clientHeight`. Of it, 56px is the body's own padding
  (`24px` top / `32px` bottom, `styles.css:3915`) and 16px is the flex gap above the board, so
  the band that holds bubble *and* board is 275px at a 347px well and 228px at a 300px one.
- **space left for board** = body's bottom edge minus the board's top edge at arrival scroll,
  i.e. how much of the board is on screen when the learner gets there.
- **board natural** = the board's own laid-out height (`figure.lesson-visual`, top of the first
  to bottom of the last). The figure is not itself clipped; the body clips it.
- **board NOT visible** = board bottom minus body bottom at arrival scroll.
- The Town Hall's `bubble = n/a` is by construction: the drill is its own board and renders no
  advisor bubble on the interleaved path. **This is wrong — see the correction at the head of
  §7.** It renders a bubble; what it has none of is an advisor control row.

### Where the advance control sits

| surface | control at arrival: visible? | controls row top at arrival | controls row top once scrolled to the board's bottom | visible there? |
|---|---|--:|--:|---|
| D1 | "Next" withheld (gate) | 314.3 | −194.7 | no |
| D2 | withheld | 314.4 | 9.4 | no (well starts at y 130) |
| D3 | withheld | 368.8 | 35.8 | no |
| D4 | withheld | 415.7 | −84.3 | no |
| D5 | withheld | 341.6 | −82.4 | no |
| D6 | withheld | 368.8 | −235.2 | no |
| D7 | withheld | 341.6 | −180.4 | no |
| D8 | withheld | 368.8 | −204.2 | no |
| D9 | withheld | 395.9 | −324.1 | no |
| D10 | withheld | 361.3 | 21.3 | no |
| Town Hall | "Check", visible | 389.4 | 369.4 | **yes** |

"Withheld" is the gate working, not the defect: `AdvisorLesson.tsx:349-354` computes
`gateBlocked` and `:371-373` passes `onNext` only when the slide's gating visuals are all done,
so there is no "Next" in the DOM to be off-screen. That is why the completed-board sweep below
exists. The row measured in its place is `.advisor-npc__controls`, which holds "Previous" — the
same flex row "Next" renders into (`AdvisorNpc.tsx:195-230`).

## 2. Frames (absolute paths, all 1024x580)

Whole-frame captures, clipped to the tester iframe with a scale assertion, so each one shows the
card, the island behind it and the action tray — never a crop of the board.

Arrival, and scrolled to the board's own bottom:

```
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d1-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d1-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d1-3-completed-board-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d2-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d2-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d3-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d3-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d4-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d4-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d5-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d5-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d6-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d6-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d7-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d7-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d8-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d8-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d9-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d9-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d10-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d10-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/town-hall-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/town-hall-2-scrolled-to-board-bottom-1024x580.png
```

Boards the harness genuinely finished, framed at the scroll position the learner is left in:

```
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d1-4-finished-NUM.F-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d3-4-finished-LIN.6-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d4-4-finished-POL.8-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d5-4-finished-RAT.1-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d7-4-finished-LF.3-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d9-4-finished-TRG.7-1024x580.png
```

Raw readings, one JSON a surface, plus `board-heights.json` (the derivation of the
representatives) and `<domain>-finished.json` (every lesson the completion sweep tried and what
it got), in the same directory.

**What the frames show that the numbers do not.** `d9-1-arrival` is the clearest: below a 272px
bubble, the entire visible band of the board is one line of its instruction, cut off
mid-sentence at the fold — 34.8px of a 722.4px board. `d4-1-arrival` is worse in kind: a
two-line title takes the well to 300px and the board is a 15px sliver of empty card edge, so a
learner cannot tell there is a widget there at all.

## 3. Does it reproduce everywhere, and what is the worst case

**On every one of the ten lesson domains, yes.** All ten arrive with the majority of the board
below the fold: the smallest shortfall measured is D2's 272.8px hidden of a 389.2px board (70%),
and nine of the ten hide more than 300px. The advisor bubble takes 190.7px to 272.2px, i.e.
**55% to 82% of the well's usable height** (347px, or 300px where the title wraps to two lines),
before the board gets a pixel — and once the body's own 56px of padding and the 16px flex gap
come off, the band the bubble and the board share is 275px, or 228px on a two-line title, which
is less than the bubble alone on POL.4 and GEO.2.

**The Town Hall does not reproduce it.** Its drill lays out at 166.4px in a 178px band, 0px
hidden, and its "Check" stays on screen at both scroll positions. The reason is structural
rather than lucky: `CitySurface.tsx:4706-4725` mounts `EraInfinitePractice` directly, and the
interleaved path renders no advisor bubble, so nothing is competing for the well. Its body
content (367px) does exceed its well (347px) by 20px, which is the "Back to city" link and
padding, so it scrolls very slightly — worth knowing, not the defect.

**Worst case: D9 / TRG.3 / `trg-unitcircle-explore`.** 1067px of content in a 347px well; a
272.2px bubble leaves 34.8px; 687.6px of a 722.4px board — **95%** — is not visible. Runner-up
by proportion is D4 / POL.4 / `complete-square-drag`, where the two-line title cuts the well to
300px and leaves 15px of board (97% hidden), and by absolute pixels D6 / CG.1 at 571.6px.

## 4. Is "Next" genuinely unreachable on a completed board?

**Not unreachable — invisible where the learner is standing.** Stated precisely, because the
two are different claims and only the second is what I measured.

`.coc-card__body` is `overflow: hidden auto` (`styles.css:3839`), so the well scrolls and
nothing in it is permanently out of reach: a learner who scrolls back up finds "Next". What the
measurement shows is that on a finished board the control is **not on screen at the position
finishing the board leaves you in**, with no indication that it exists or that scrolling up is
what is wanted.

Directly measured on boards the harness actually finished — gate opened, success state on
screen, real "Next" in the DOM, measured at the scroll offset the completion happened at:

| domain | node | board | bubble | scroll offset | "Next" top | well top | visible? |
|---|---|---|--:|--:|--:|--:|---|
| D1 | NUM.2 | `pemdas-key-explore` + `pemdas-mnemonic-explore` | 190.7 | max | **−233.7** | 130 | **no** |
| D1 | NUM.F | `fraction-parts-explore` | 217.8 | 269 | **72.5** | 135 | **no** |
| D3 | LIN.6 | `tolerance-pass-sorter` | 217.8 | 230 | **111.5** | 135 | **no** |
| D5 | RAT.1 | `rational-forbidden-dose-explore` | 190.7 | 244 | **70.4** | 135 | **no** |
| D7 | LF.3 | `linear-model-rate-explore` | 245.1 | 318 | **50.8** | 135 | **no** |
| D4 | POL.8 | `divide-rebuild-builder` | 245.0 | 182 | 186.7 | 135 | yes |
| D9 | TRG.7 | `trg-inverse-order` | 190.7 | 167 | 147.4 | 135 | yes |

A top of 50.8 or 72.5 against a well that starts at y 135 means the button is scrolled up out of
the scrolling well and clipped by it; it is behind the banner plate, not merely small.

`d7-4-finished-LF.3-1024x580.png` is the evidence to look at: the board says "**Built.** The
rate became the coefficient on x…", the success tick is on screen, and there is no advance
control anywhere in the frame. `d1-3-completed-board-1024x580.png` is the same on the tallest
finished board — both PEMDAS boards complete, green tick visible, no "Next".

**So: five of the seven finished boards leave the earned "Next" off-screen, two do not**, and
which way it falls is decided by how far the learner had to scroll, i.e. by the board's height
against the well. The two that keep it are the two shortest boards measured (212.2px and 251.8px
natural height); the five that lose it run 287px to 592.9px, so the turn is somewhere just under
285px — every board taller than that loses the control.

**Where this is NOT measured, and why.** On nine of the ten tallest boards in §1 the blind
completion driver could not open the gate, because those widgets want a correct answer rather
than a click, and this tree has no shared widget-completion driver to borrow. For those nine the
completed-board number is **NOT MEASURED**, and the controls-row figures in §1 are a proxy for
it. The proxy is good but not exact: on D1's NUM.2 board, where both are available, the row
measured −194.7 and the real "Next" measured −233.7, a 39px disagreement (completing the board
changes its own height, which moves the scroll). Both are far off-screen, so the conclusion does
not turn on the 39px — but the number quoted as a measurement is only ever the one in the table
above.

Four domains — **D2, D6, D8, D10** — produced no completable board at all across all of their
lessons (24 lessons tried: 5 in D2, 11 in D6, 6 in D8, 2 in D10; `<domain>-finished.json` has
the per-lesson record with the click count for each), so for those
four the completed-board claim rests on the proxy alone. Said plainly: **NOT DONE** for a
directly measured completed board in D2, D6, D8 and D10.

## 5. Recommended fix, what it costs, and which guards it puts at risk

Two independent causes, and the second is the one that hurts:

1. **The bubble is unbounded.** `.advisor-npc__bubble` (`styles.css:8580-8594`) sets padding and
   `line-height: 1.7` and nothing else, so its height is the length of `mini_lesson[i]`. It is
   taking 55-78% of the well.
2. **The advance control is inside it.** `AdvisorNpc.tsx:194-230` renders
   `.advisor-npc__controls` *inside* `.advisor-npc__bubble`, so "Next" lives in the same scroll
   flow as the board and scrolls away the moment the learner reaches the board's bottom.

### What I would change

- **`AdvisorNpc.tsx:191-232` — wrap the heading and the prose in a `.advisor-npc__said` child,
  leaving `.advisor-npc__controls` a sibling of it inside the bubble.** No prop changes, no
  behaviour change. This is the shape the ceremony advisor already ships
  (`eraCeremony.css:169-184`: `__said` is a flex column with `max-height: min(68vh, …)` and
  `overflow: hidden auto`, and everything else in the bubble is `flex: none`), so it is a
  pattern to copy rather than invent.
- **`styles.css:8580` — `.advisor-npc__bubble` becomes `display: flex; flex-direction: column`
  with a `max-height` on short viewports, and `.advisor-npc__said` takes `min-height: 0;
  overflow: hidden auto`.** Cost: on a long slide the prose scrolls inside the bubble instead of
  pushing the board down. At 580px a cap of `min(34vh, 240px)` recovers 32px on D9 and 5px on
  D8/D6 — real but small, and it is the part that reads as most contentious, because the
  teaching text is the point of the slide.
- **`styles.css:8188` — `.advisor-npc__controls` gets `position: sticky; bottom: 0` (inside the
  bubble, which is now a flex column), or the bubble itself gets `position: sticky; top: 0`
  within `.advisor-lesson`.** This is the change that fixes what §4 measured: the earned advance
  control stops leaving the screen. Cost: it overlays ~40px of whatever is under it, and a
  sticky bubble would cost far more, which is why the controls row rather than the bubble is the
  thing to pin.
- **`styles.css:3913-3916` and `3319-3325` — a `@media (max-height: 700px)` block that drops the
  body's `24px/32px` padding to `16px/16px` and the banner's `clamp(1.6rem, 3.4vw, 2.4rem)`
  title a step.** Pure recovery, ~40px of well at a short viewport and ~47px more on the two
  packs whose title wraps to two lines (POL.4, GEO.2 — the 148px banners). Cost: a smaller title
  on short screens, and it must be keyed on height so no width-pinned guard moves.
- **Do NOT simply raise `max-height: 90vh` (`styles.css:3907`).** Measured, it buys at most
  ~35px going to `96vh` and it spends the popup's scrim gutters, which is the thing that makes
  the card read as a card over the island. Against a 722px board in a 347px well it is not the
  lever.

**Honest limit on all of it.** The content is 590-1067px against 300-347px of well. Trimming
chrome and capping the bubble recovers on the order of 70-110px. **No combination of these
makes a tall board fit**, so the goal has to be "the board is workable and the way forward is
always on screen", not "nothing scrolls". If the team wants tall boards to fit, the structural
option is for the activity section to collapse the bubble to its subtitle plus a "read again"
affordance — a content/UX decision, not a stylesheet one, and outside what a measurement can
settle.

### Guards at risk, checked at `da781d1f`

| guard | verdict | why |
|---|---|---|
| `reviewCardContainment.browser.test.tsx` | **low risk, must be re-run** | Measures at 1440x900, in the review phase (`advisor-lesson--review`), which renders no advisor bubble and no controls row — so the bubble cap and the sticky row are absent from the DOM it measures. Its claims are figure-relative containment and non-overlap with `.lesson-player__prose`. A `@media (max-height: 700px)` block does not apply at 900px. The one live hazard is a sticky element overlapping prose, which cannot arise where the element does not exist. |
| `DevLessons.browser.test.tsx:202-229` | **at risk if the fix shortens the full frame** | It asserts `--full`'s body is taller than the compact card's. A body-padding trim keyed on viewport height applies to both mounts equally and leaves the inequality; a change scoped to `--large` leaves `--full` untouched. It breaks only if the fix reduces the dev frame's well, which it must not — and `DevLessons`' three `size="full"` mounts (`DevLessons.tsx:476, 494, 515`) are exactly the named exception the new guard owes, failing both ways. |
| `labelFigureNarrow.browser.test.tsx` | **at risk through the walk, not the widths** | Every claim in it is a WIDTH (920/894 desktop, 330.8/304.8 phone), so a height fix leaves them. But `advanceToTheFirstFigure` (`:270-292`) finds the control by the literal text `"Next"` in a `<button>`, so relocating the advance control out of the lesson DOM — e.g. into `WorldScene`'s action tray — breaks it. That is a reason to prefer sticky positioning over relocation. |
| `city/advisorBandOverTheIsland.browser.test.tsx` | **unaffected** | It measures `.era-advance-speech` from `eraCeremony.css`, the era-ceremony advisor, not the lesson's `.advisor-npc`. Different component, different stylesheet. It pins the band to 0.5px, so the one way to break it is to touch the shared `--space-*` tokens — which none of the above does, and none of them should. |
| `city/lessonMountSteps.test.tsx:152-154` | **at risk, and it is the tightest constraint** | `advisorControl` queries `.advisor-npc__controls .advisor-npc__action--next`. So the controls row must keep that class and "Next" must stay its descendant. A `__said` wrapper around the prose satisfies this; moving "Next" into the action tray does not. |
| `threeSectionFlow.browser.test.tsx:82-84`, `AdvisorLesson.test.tsx:114-116`, `eraAdvisorArt.test.tsx:347-349` | **unaffected** | All three read `.advisor-npc__bubble`'s `textContent` (a subtree read, so a `__said` wrapper is transparent) or its `aria-live="polite"`, which stays on the bubble. |
| there is no existing vertical-fit guard to break | **the gap itself** | Grepped at this tip: no test in `apps/web/src` measures the learner `--large` mount's height at any viewport. `buildMenuEraAxis.browser.test.tsx:34` and `achievementShots.browser.test.tsx:33` both reason about short viewports for other panels; nothing covers this one. That is why this shipped, and the harness in this branch is the first thing that looks. |

## 6. Anchors in the brief that are wrong at this tip

Confirmed correct, re-read: `styles.css:3907` (`max-height: 90vh` on `.world-scene--large
.coc-card`); `styles.css:3964` (`max-height: none` on `.world-scene--full .coc-card`);
`CitySurface.tsx:4706` (the Town Hall `WorldScene`, `size="large"` at `:4710`);
`AdvisorNpc.tsx:206-213` ("Next" inside `.advisor-npc__controls` inside the bubble);
`AdvisorLesson.tsx:347-373` (the gate, and `onNext` withheld by it); and that the bubble has no
hardcoded height.

Wrong or imprecise:

1. **`d1LessonHost.tsx:21` for `size="large"`** — line 21 is `<WorldScene`; the prop is on
   **line 25**.
2. **`styles.css:8575-8594` for `.advisor-npc__bubble`** — that range opens on
   `.advisor-npc__bubble-wrap` (`:8575-8578`). The bubble rule is **`:8580-8594`**. The
   substance holds: no height, no `min-height`, no `max-height`; padding, border, background,
   `line-height: 1.7`.
3. **`DevLessons.tsx:472, 490, 511` for the three `size="full"` mounts** — they are at
   **476, 494, 515**.
4. **"the 'Next' button can be unreachable"** — measured, it is never *unreachable*, because
   `.coc-card__body` scrolls (`styles.css:3839`). It is *not visible where the learner is left
   standing*, on five of the seven boards this run finished. Section 4 states it that way
   deliberately.
5. Separately, and confirming a note already in the plan: **`readingWidths.ts:16` cites
   `readingWidths.browser.test.tsx`, which does not exist at this tip** (glob returns 0 files).
   The file that measures those widths is `labelFigureNarrow.browser.test.tsx`.

One corroboration worth recording, since `.cursor/rules/qa-verification.mdc` quotes it: the
rule's *"the learner's lesson body is 347px"* reproduces exactly here, independently, at
1024x580 — and it is **300px** on a pack whose title wraps to two lines, which is 14% less than
the figure the rule quotes.

## What was measured and what was not

- **DONE**: all ten lesson domains plus the Town Hall, on the learner mount, at 1024x580, with
  frames of the whole surface at two scroll positions each.
- **DONE**: the completed-board advance-control position, directly, on 7 boards across D1, D3,
  D4, D5, D7 and D9.
- **NOT DONE**: a directly measured completed board in **D2, D6, D8 and D10** — no lesson in
  those four has a first-gated board the blind driver can finish. Proxy only, named as such.
- **NOT DONE**: the completed-board position on the *tallest* board of nine of the ten domains.
  Those boards want a correct answer, so §1's controls-row figures stand in.
- **NOT DONE, out of scope by instruction**: any fix. No stylesheet, layout or component file is
  touched on this branch.
- Not measured: phone width, and any viewport other than 1024x580.

## 7. After the fix, same mount, same 1024x580

The fix is three changes, all in this branch: the advisor's words moved into a
`.advisor-npc__said` that scrolls under a short-viewport cap on the bubble; the advisor's
control row moved out of the bubble to the foot of the lesson column and is pinned there
(`position: sticky`); and a `@media (max-height: 700px)` block trims the banner and the body
padding and clamps the banner title. Re-measured by re-running the same harness, unchanged
except where §7.1 says otherwise.

### A correction §1 owes: the Town Hall DOES have an advisor bubble

§1 records the Town Hall's bubble as `n/a (no bubble)` and §3 gives that as the structural
reason the defect does not reach it. **The first is wrong and the second is wrong as stated.**
`InfiniteDrill.tsx:210` mounts an `AdvisorNpc`, so there is a bubble; the harness had written
`bubbleHeight: 0` as a constant with a note calling it "0 by construction", which is a claim
and not a reading. The new guard mounted the surface and failed on it. The harness now reads
the bubble off the DOM, and it measures **53.2px** at 1024x580 (a one-line encouragement, hence short).

The conclusion survives, with the right reason: what the interleaved surface has none of is an
advisor CONTROL ROW. `InfiniteDrill` passes that `AdvisorNpc` no control callbacks, so there is
no `.advisor-npc__controls` to scroll away, and the way forward is the drill's own "Check"
inside the board. That is the property the guard scopes its population by, precisely because
"renders a bubble" would have swept the Town Hall in.

### 7.1 Per-surface, before and after

**Read the after column as the MERGED tree, not as this branch alone.** While this was being
written, `integration` landed a second short-screen fix from another lane: a
`@media (max-height: 760px)` block that hands the lesson window back the scrim gutter
(`.world-scene--large .coc-card { max-height: calc(100vh - 2 * var(--space-sm)) }`, guarded by
`lessonPanelSceneFit.browser.test.tsx`), which is worth another 42px of card at 580. The two
are complementary and both are kept; the numbers below were re-taken on the merge, because a
reading from before it would be a reading of a tree nobody has.

| surface | node | banner | body usable | advisor bubble | space left for board | board NOT visible |
|---|---|--:|--:|--:|--:|--:|
| D1 | NUM.2 | 101 → **79** | 347 → **411** | 190.7 → **160.3** | 116.3 → **218.7** | 476.6 → **374.3** |
| D2 | RAD.4 | 101 → **79** | 347 → **411** | 190.7 → **160.4** | 116.3 → **218.6** | 272.8 → **170.5** |
| D3 | LIN.3 | 101 → **79** | 347 → **411** | 245.1 → **162.4** | 61.9 → **216.6** | 301.0 → **146.4** |
| D4 | POL.4 | 148 → **79** | 300 → **411** | 245.0 → **162.4** | **15.0 → 216.6** | 468.0 → **266.4** |
| D5 | RAT.5 | 101 → **79** | 347 → **411** | 217.9 → **162.4** | 89.1 → **216.6** | 392.0 → **264.5** |
| D6 | CG.1 | 101 → **79** | 347 → **411** | 245.1 → **162.4** | 61.9 → **216.6** | 571.6 → **416.9** |
| D7 | LF.2 | 101 → **79** | 347 → **411** | 217.9 → **162.4** | 89.1 → **216.6** | 489.9 → **362.3** |
| D8 | EL.4 | 101 → **79** | 347 → **411** | 245.1 → **162.4** | 61.9 → **216.6** | 540.7 → **386.0** |
| D9 | TRG.3 | 101 → **79** | 347 → **411** | **272.2 → 162.4** | **34.8 → 216.6** | 687.6 → **505.8** |
| D10 | GEO.2 | 148 → **79** | 300 → **411** | 190.7 → **160.3** | 69.3 → **218.7** | 307.7 → **158.4** |
| Town Hall | interleaved | 101 → **79** | 347 → **411** | n/a → **53.2** (see above) | 178.0 → **250.0** | 0 → **31.2** |

The two-line banner is gone: the short-viewport title clamp puts POL.4 and GEO.2 on one line,
so they stop being the worst case for being unlucky in their titles, and every domain's well is
now the same 411px. The bubble is capped at 162.4px rather than running to 272.2px, and the
board's opening band is 216.6px to 218.7px everywhere instead of 15px to 116.3px — on the worst
board, D4/POL.4, fourteen times what it was.

Isolating the two fixes on the ten domains: the well goes 347/300 → 369 on this branch's
changes alone (the banner trim and the title clamp), and 369 → 411 with the merged gutter fix
on top. The bubble cap and the pinned row are this branch's alone and the other lane touches
neither.

**The board still does not fit, and was never going to.** Boards run 363px to 722px against
411px of well; §5 said no combination of these recovers that and the after-column agrees. What
changed is that a learner arriving on the board can see 217px of it rather than 15px, and can
always see the way onward.

### 7.2 The way forward, before and after

The well runs from y 89 to y 500 on the merged tree. "Row top" is the top of
`.advisor-npc__controls` with the learner scrolled to the bottom of the board, in viewport
coordinates:

| surface | control row at the board's bottom, before | after | visible now |
|---|--:|--:|---|
| D1 | −194.7 | **446.0** | yes |
| D2 | 9.4 | **445.5** | yes |
| D3 | 35.8 | **446.0** | yes |
| D4 | −84.3 | **446.0** | yes |
| D5 | −82.4 | **445.5** | yes |
| D6 | −235.2 | **445.9** | yes |
| D7 | −180.4 | **446.0** | yes |
| D8 | −204.2 | **446.0** | yes |
| D9 | −324.1 | **445.8** | yes |
| D10 | 21.3 | **446.0** | yes |

Ten of ten, where before it was zero of ten: the three positive numbers in the before column
are rows sitting above the well's top edge at y 130, which is off screen in the other
direction.

On boards the driver genuinely FINISHED, which is where the claim in §4 actually lives, the
real "Next" at the scroll position completion leaves the learner in:

| domain | node | "Next" top before | after | well | visible now |
|---|---|--:|--:|---|---|
| D1 | NUM.F | 72.5 | **459** | 89..500 | yes |
| D3 | LIN.6 | 111.5 | **459** | 89..500 | yes |
| D4 | POL.8 | 186.7 | **459** | 89..500 | yes |
| D5 | RAT.1 | 70.4 | **459** | 89..500 | yes |
| D7 | LF.3 | 50.8 | **459** | 89..500 | yes |
| D9 | TRG.7 | 147.4 | **459** | 89..500 | yes |

"Before" is the y the control sat at with the learner where finishing the board left them.
Four of these six were above the well's top edge (y 130 then, y 89 now) rather than in it, and
POL.8 and TRG.7 were the two that happened to land inside it; §4's "five of seven" counts
D1/NUM.2 as well, which the poker solved on the earlier run and not on this one. Six of six are
on screen now, all at the same y, which is what a pinned row means.

### 7.3 What the pinned row overlays, looked at rather than computed

The row's box is 38px (445.8 to 483.8 on D9), and its fill runs on to the foot of the well at
500, so where it is pinned it takes the bottom **54px** of a 411px well. Frames at 1024x580,
all re-taken on the merged tree, all looked at:

```
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d9-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d9-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d4-1-arrival-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d4-2-scrolled-to-board-bottom-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/d7-4-finished-LF.3-1024x580.png
C:/Users/<user>/Code/work/wt-held-fit/.qa-frames/fit-2026-08-05/town-hall-1-arrival-1024x580.png
```

What the frames show:

- **Nothing a learner needs is hidden where the work happens.** The row is the lesson column's
  last child, so at the bottom of the scroll it settles below the board and overlays nothing.
  `d9-2` is the case to look at, because D9 has the tallest board in the tree: its three
  controls (*Turn counterclockwise*, *Turn clockwise*, *Lock in this heading*) and the caption
  under them are all clear of the bar. `d4-2` is the drag board, and its drop slot, its four
  chips and its caption are likewise clear.
- **Mid-scroll it does overlay the board**, and `d9-1-arrival` shows the board being cut off at
  the bar's rule. Nothing is lost there: the bar cannot cover the END of the content, so
  whatever is behind it is 54px above something a further nudge of the wheel brings into view.
- `d4-1-arrival` is the pack that used to be the worst case, and it is the clearest picture of
  the arrival band: the title is one line, the bubble stops after five, and the board opens
  with its goal line and the top of the figure rather than with 15px of nothing.
- `d7-4-finished-LF.3` is the before/after to read side by side. Before, that frame had the
  "Built." verdict on screen and no advance control anywhere. After, the verdict, the board's
  own *Try another description*, its completion tick, and "←Previous  Next →" are all on screen
  together.

Two things in the bar's styling came out of looking at frames rather than out of reasoning,
and both are recorded in the rule's comment:

1. **It needs an edge.** With a plain fill the pinned band read as the board having been cut
   off mid-panel. A 1px rule and a soft shadow above it make it chrome the board passes behind.
2. **`bottom: 0` does not reach the bottom.** Sticky stops at the scrollport's CONTENT edge, so
   in a padded well the row floated 16px clear of the foot and the board slid through the slot
   underneath it — visible in the first frames of this fix, and now measured: the row's box
   ends at 483.8 against a well ending at 500. A second box-shadow, the same fill offset down
   by the deepest padding any of these wells carries, closes it at no layout cost.

**A frame is only as faithful as its mount.** The first post-fix frames also showed the card
itself transparent, which is not a defect: `--glass-fill-strong` and the other panel tokens are
declared on `.city-shell` (`styles.css:1915`), and a bare `document.body` mount resolves them
to nothing. The harness now mounts inside `.city-shell`, which is the ancestor every real mount
has, so the frames above are painted with the learner's own tokens. This has been added to
`.cursor/rules/qa-verification.mdc`, because the reverse of that trap is the dangerous one: a
genuinely transparent overlay would have looked exactly the same.

### 7.4 The anchors this fix moved

Every line number in §1 to §6 was read at `da781d1f` and is still true of that SHA. Three have
moved in this branch, because the fix inserted rules above them:

| §6 anchor | at `da781d1f` | on this branch |
|---|---|---|
| `max-height: 90vh` on `.world-scene--large .coc-card` | `styles.css:3907` | `3910`, and no longer the operative cap below 760px tall: `integration`'s `calc(100vh - 2 * var(--space-sm))` wins there |
| `max-height: none` on `.world-scene--full .coc-card` | `styles.css:3964` | `styles.css:4043` |
| the *"cost a scroll on every slide"* comment | `styles.css:3938` | `styles.css:4022` |
| "Next" inside `.advisor-npc__controls` | `AdvisorNpc.tsx:206-213` | `AdvisorNpc.tsx:154-162`, and the row is now `AdvisorControls`, a sibling of the bubble |

`.cursor/rules/qa-verification.mdc` quoted the first three and has been updated. Note the first
row: a rule that quotes "the learner is capped at 90vh" is now true only above 760px of
viewport, which is exactly the height nobody was worried about.

### 7.5 What CI caught that none of this did: a HEIGHT trim that moved a WIDTH

The first push of this fix failed `test-browser` on one file out of 255, and it was worth the
run:

```
FAIL  web (chromium)  apps/web/src/lessons/d6Fun4AxisAndProse.browser.test.tsx > FUN.4's extremum report wraps as one sentence on a 390px phone
AssertionError: "After the turn the trace falls to 222 by the e": the number 2 sits 30.4px off
the baseline of the words beside it: expected 30.390625 to be less than or equal to 1
```

30.4px is a line height, so the number had not moved off its baseline: it had wrapped onto the
next line, and the sentence the file exists to keep as one sentence was two.

The cause was the short-screen block, written with `padding` shorthand:
`.world-scene--large .coc-card__body { padding: var(--space-lg) var(--space-xl) }`. The
shorthand sets the inline padding as well, and this block is later in source order than the
phone rule at `@media (max-width: 720px)`, which gives that body `--space-md` gutters. So on any
screen both narrow AND short, the gutters went 12px to 24px and the reading column lost 24px.

Two things are worth writing down about why it got this far. The block's own comment claimed
*"KEYED ON HEIGHT, so nothing width-pinned moves... the width-measuring guards run at 390x844
and 1440x900... none of them sees these rules at all"*, and that was a survey of viewports made
without checking. `d6Fun4AxisAndProse` measures at **390x580** — width-pinned and short, the one
pairing that sees a height-keyed rule at a phone width, and it says so in its own header: the
height is held at 580 because vitest scales a tester iframe it cannot fit. And it did not
reproduce locally on Windows, where the sentence has different metrics and survived the 24px; it
was deterministic on CI's fonts. A local green was not evidence here.

The fix is `padding-block`, in both rules, so the trim touches the block axis only and the
inline gutters stay with the width rules that own them. Injected and measured at 390, on the
learner's own `size="large"` frame:

| | inline padding | reading column |
|---|--:|--:|
| 390x844 (above the breakpoint) | 12px/12px | 330.8px |
| 390x580, `padding` shorthand | **24px/24px** | **306.8px** |
| 390x580, `padding-block` (shipped) | 12px/12px | 330.8px |

The card measures 358.8px wide in all three, so the 24px is the gutter and nothing else.

**At 1024 the after-numbers in §7.1 are untouched by this correction**, which is why they were
not re-taken for it: the base rule already gives that body `--space-xl` inline, so shorthand and
`padding-block` compute the same box at desktop widths, and the same holds for the banner
(`padding-block: var(--space-md) var(--space-sm)` over a base whose inline is `--space-xl`). The
harness was re-run on the final tree anyway.

The new guard now carries the invariant, at the file where the trim lives: at a fixed 390px
width, crossing the 700px breakpoint may move no horizontal measurement of the lesson column.
Re-inject the shorthand and it reports both halves:

```
AssertionError: the body's inline padding is 24px/24px at 390x580 and 12px/12px at 390x844:
a height-keyed rule is rewriting a horizontal gutter, so every width-pinned measurement moves
on a short screen: expected '24px/24px' to be '12px/12px'
AssertionError: the reading column is 306.8px at 390x580 against 330.8px at 390x844, so prose
rewraps when only the height changes ... received difference is 24, but expected 0.5
```

It has a floor under it (the column must measure over 200px at the tall viewport, so two equal
readings of a mount that never laid out cannot satisfy it), and it kills the card's pop-in
`transform: scale` before measuring: read mid-animation, the same card measured 308.6px at one
height and 372.7px at the other, which is the animation and not the stylesheet.

### 7.6 Verification

- `apps/web/src/lessons/lessonShellFit.browser.test.tsx` (the new guard): **red before the fix**
  with 28 failed assertions over the ten domains, green after; 18 passed on the final tree,
  including the width-invariance test above.
- `apps/web/src/lessons/shellFitMeasure.browser.test.tsx` (this report's harness): 21 passed
  before and after.
- `d6Fun4AxisAndProse`, `lessonPanelSceneFit`, `reviewCardContainment`: green on the final tree.
  `reviewCardContainment` and `labelFigureNarrow` time out locally under sibling load and are
  green in CI, where the same commit ran them alongside 253 other files.
